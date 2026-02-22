import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";
import { EXAM_GRADING_PROMPT } from "@/lib/study-prompts";
import type { ExamQuestion } from "@/types/study";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: examId } = await params;
  const { answers } = await req.json();

  // Fetch exam
  const { data: exam } = await supabase
    .from("practice_exams")
    .select("*")
    .eq("id", examId)
    .single();

  if (!exam)
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  const questions = exam.questions as unknown as ExamQuestion[];

  // Grade deterministic questions (MC, T/F)
  const questionResults: {
    questionIndex: number;
    correct: boolean;
    studentAnswer: string;
    correctAnswer: string;
    feedback: string;
  }[] = [];

  const shortAnswerQuestions: {
    index: number;
    question: string;
    correctAnswer: string;
    studentAnswer: string;
  }[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const studentAnswer = answers[i] || "";

    if (q.type === "multiple_choice" || q.type === "true_false") {
      const isCorrect =
        studentAnswer.trim().toLowerCase() ===
        q.correctAnswer.trim().toLowerCase();
      questionResults.push({
        questionIndex: i,
        correct: isCorrect,
        studentAnswer,
        correctAnswer: q.correctAnswer,
        feedback: isCorrect
          ? "Correct!"
          : `Incorrect. The correct answer is: ${q.correctAnswer}`,
      });
    } else {
      // Short answer — needs AI grading
      shortAnswerQuestions.push({
        index: i,
        question: q.question,
        correctAnswer: q.correctAnswer,
        studentAnswer,
      });
    }
  }

  // AI-grade short answer questions
  if (shortAnswerQuestions.length > 0) {
    try {
      const gradingInput = shortAnswerQuestions.map((sa) => ({
        question: sa.question,
        correctAnswer: sa.correctAnswer,
        studentAnswer: sa.studentAnswer,
      }));

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: EXAM_GRADING_PROMPT },
          {
            role: "user",
            content: JSON.stringify(gradingInput),
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const gradingText = completion.choices[0]?.message?.content || "{}";
      const gradingResult = JSON.parse(gradingText);

      if (Array.isArray(gradingResult.results)) {
        for (let j = 0; j < shortAnswerQuestions.length; j++) {
          const sa = shortAnswerQuestions[j];
          const gr = gradingResult.results[j] || {
            correct: false,
            feedback: "Unable to grade",
          };
          questionResults.push({
            questionIndex: sa.index,
            correct: gr.correct,
            studentAnswer: sa.studentAnswer,
            correctAnswer: sa.correctAnswer,
            feedback: gr.feedback || (gr.correct ? "Correct!" : "Incorrect."),
          });
        }
      }
    } catch (err) {
      console.error("Grading error:", err);
      // Fall back to simple comparison
      for (const sa of shortAnswerQuestions) {
        questionResults.push({
          questionIndex: sa.index,
          correct: false,
          studentAnswer: sa.studentAnswer,
          correctAnswer: sa.correctAnswer,
          feedback: "Unable to grade automatically. Compare with correct answer above.",
        });
      }
    }
  }

  // Sort by question index
  questionResults.sort((a, b) => a.questionIndex - b.questionIndex);

  const totalCorrect = questionResults.filter((r) => r.correct).length;
  const score =
    questions.length > 0
      ? Math.round((totalCorrect / questions.length) * 100)
      : 0;

  // Save attempt
  const { data: attempt, error: attemptError } = await supabase
    .from("exam_attempts")
    .insert({
      exam_id: examId,
      user_id: user.id,
      answers,
      score,
      feedback: { results: questionResults, totalCorrect, total: questions.length },
    })
    .select()
    .single();

  if (attemptError) {
    return NextResponse.json(
      { error: "Failed to save attempt" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    attempt,
    score,
    results: questionResults,
    totalCorrect,
    total: questions.length,
  });
}

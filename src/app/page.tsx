"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import KnowledgeGarden from "@/components/KnowledgeGarden";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowRight, MessageCircle, Sprout, GitFork, Zap } from "lucide-react";

const gentle = { type: "spring" as const, stiffness: 200, damping: 20, mass: 1 };

export default function LandingPage() {
  const { scrollY } = useScroll();

  // Watermelon-style navbar scroll animation
  const navTextOpacity = useSpring(useTransform(scrollY, [0, 80], [1, 0]), {
    stiffness: 300,
    damping: 30,
  });
  const navTextX = useSpring(useTransform(scrollY, [0, 80], [0, -20]), {
    stiffness: 300,
    damping: 30,
  });
  const navTextWidth = useSpring(useTransform(scrollY, [0, 80], [100, 0]), {
    stiffness: 300,
    damping: 30,
  });


  const scrollToHow = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById("how");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      window.history.pushState(null, "", "#how");
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Vertical guide lines (desktop) */}
      <div className="fixed inset-0 pointer-events-none z-[60] hidden lg:block">
        <div className="max-w-5xl mx-auto h-full relative">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-border/40" />
          <div className="absolute right-0 top-0 bottom-0 w-px bg-border/40" />
        </div>
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 md:px-12 h-14">
          <Link href="/" className="flex items-center gap-0 overflow-hidden">
            <div className="shrink-0">
              <Image
                src="/bloomlogo.png"
                alt="bloom"
                width={24}
                height={24}
                className="rounded-md"
              />
            </div>
            <motion.span
              className="font-outfit font-semibold text-sm text-foreground whitespace-nowrap overflow-hidden"
              style={{
                opacity: navTextOpacity,
                x: navTextX,
                width: navTextWidth,
                marginLeft: 8,
              }}
            >
              bloom
            </motion.span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs h-8" asChild>
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button size="sm" className="text-xs h-8" asChild>
              <Link href="/auth/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 pt-20 sm:pt-32 pb-16 sm:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={gentle}
          >
            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-6">
              Learn by teaching
            </p>
            <h1 className="font-outfit text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.08] mb-6 max-w-2xl">
              The best way to learn is to teach.
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed mb-10">
              Bloom pretends to be your student. Explain any concept, and it
              asks the questions that reveal what you actually know — and what
              you don&apos;t.
            </p>
            <div className="flex items-center gap-3">
              <Button size="lg" className="h-11 px-6 text-sm" asChild>
                <Link href="/auth/signup">
                  Start teaching
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-11 px-6 text-sm" asChild>
                <Link href="#how" onClick={scrollToHow}>
                  How it works
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works (Sticky Scroll) */}
      <section id="how" className="relative z-10 border-b border-border scroll-mt-14">
        <StickyHowItWorks />
      </section>

      {/* Features */}
      <section className="relative z-10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={gentle}
          >
            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">
              Features
            </p>
            <h2 className="font-outfit text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-12 max-w-lg">
              Built for real understanding, not memorization
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: MessageCircle,
                title: "Socratic questioning",
                desc: "bloom asks 'why?' and 'what if?' until you've explored every corner. It never accepts surface-level answers.",
              },
              {
                icon: Sprout,
                title: "Knowledge garden",
                desc: "A living visualization. Each concept is a flower that grows from seed to full bloom as your mastery increases.",
              },
              {
                icon: Zap,
                title: "Gap detection",
                desc: "When you hand-wave, skip steps, or say 'basically' — bloom catches it. It pushes you to fill the gaps.",
              },
              {
                icon: GitFork,
                title: "Concept mapping",
                desc: "See how ideas connect with a force-directed graph. Prerequisites, dependencies, the full picture.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="group p-5 rounded-xl border border-border hover:border-primary/20 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...gentle, delay: i * 0.08 }}
              >
                <feature.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
                <h3 className="font-outfit font-semibold text-sm text-foreground mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-20 sm:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={gentle}
          >
            <h2 className="font-outfit text-2xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
              Ready to teach?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              Discover what you truly know. Start your first session.
            </p>
            <Button size="lg" className="h-11 px-8 text-sm" asChild>
              <Link href="/auth/signup">
                Get started — it&apos;s free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-6 md:px-12 pb-8 pt-12">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/bloomlogo.png"
              alt="bloom"
              width={22}
              height={22}
              className="rounded-md"
            />
            <span className="font-outfit font-semibold text-sm text-foreground/80">
              bloom
            </span>
          </Link>
          <p className="text-xs text-muted-foreground/50 text-center max-w-xs">
            The best way to learn is to teach.
          </p>
          <div className="w-12 h-px bg-border" />
          <ThemeToggle />
        </div>
      </footer>
    </div>
  );
}

function StickyHowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Sharper transitions: each stays until the next is roughly centered
  const topicOpacity = useTransform(smoothProgress, [0, 0.25, 0.33], [1, 1, 0]);
  const chatOpacity = useTransform(smoothProgress, [0.33, 0.45, 0.66], [0, 1, 0]);
  const gardenOpacity = useTransform(smoothProgress, [0.66, 0.75, 1], [0, 1, 1]);

  const steps = [
    {
      num: "01",
      title: "Choose a topic",
      desc: "Pick anything — biology, algorithms, history. Bloom adapts to any subject and complexity level. Just tell it what you want to teach.",
    },
    {
      num: "02",
      title: "Explain it",
      desc: "Teach the concept in your own words. Bloom asks probing questions, makes wrong inferences, and exposes gaps in your logic.",
    },
    {
      num: "03",
      title: "Watch it grow",
      desc: "Each concept becomes a flower in your garden. Seeds sprout as understanding deepens. Mastery makes them bloom into your knowledge garden.",
    },
  ];

  return (
    <div ref={containerRef} className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 relative h-[160vh]">
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 relative h-full">
        {/* Left Column - Narratives */}
        <div className="flex-1">
          {steps.map((step, i) => (
            <div key={i} className="h-[50vh] flex flex-col justify-center">
              <motion.div
                initial={{ opacity: 0.3, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ margin: "-20% 0px -20% 0px" }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-[10px] font-mono mb-6">
                  {step.num}
                </div>
                <h2 className="font-outfit text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-6">
                  {step.title}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-sm">
                  {step.desc}
                </p>
              </motion.div>
            </div>
          ))}
          {/* Dead space to allow Step 3 to center */}
          <div className="h-[50vh]" />
        </div>

        {/* Right Column - Locked Stage */}
        <div className="hidden lg:block flex-1 sticky top-0 h-screen">
          <div className="h-full flex items-center py-20">
            <div className="relative w-full aspect-[4/5] max-h-[580px] rounded-[3rem] bg-card border border-border/50 overflow-hidden">
              {/* Stage lighting */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-50" />

              <div className="relative w-full h-full">
                <motion.div style={{ opacity: topicOpacity }} className="absolute inset-0 flex items-center justify-center p-12">
                  <TopicVisual />
                </motion.div>
                <motion.div style={{ opacity: chatOpacity }} className="absolute inset-0 flex items-center justify-center p-12">
                  <ChatVisual />
                </motion.div>
                <motion.div style={{ opacity: gardenOpacity }} className="absolute inset-0 flex items-center justify-center p-12">
                  <GardenVisual />
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Visual (Fallback) */}
        <div className="lg:hidden w-full h-64 rounded-3xl bg-card border border-border/50 overflow-hidden shadow-xl mb-24 relative">
          <motion.div style={{ opacity: topicOpacity }} className="absolute inset-0 flex items-center justify-center p-6"><TopicVisual /></motion.div>
          <motion.div style={{ opacity: chatOpacity }} className="absolute inset-0 flex items-center justify-center p-6"><ChatVisual /></motion.div>
          <motion.div style={{ opacity: gardenOpacity }} className="absolute inset-0 flex items-center justify-center p-6"><GardenVisual /></motion.div>
        </div>
      </div>
    </div>
  );
}

function TopicVisual() {
  return (
    <div className="w-full max-w-[280px] space-y-5">
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="p-5 rounded-2xl bg-background border border-border/50 shadow-2xl backdrop-blur-md"
      >
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-medium">Subject</p>
        <p className="text-base font-semibold text-foreground">Quantum Entanglement</p>
      </motion.div>
      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="p-5 rounded-2xl bg-primary/20 border border-primary/20 shadow-2xl backdrop-blur-md"
      >
        <p className="text-[10px] text-primary uppercase tracking-widest mb-2 font-medium">Complexity</p>
        <p className="text-base font-semibold text-primary">Post-graduate</p>
      </motion.div>
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="p-5 rounded-2xl bg-background border border-border/50 shadow-xl"
      >
        <div className="h-2 w-32 bg-muted rounded-full mb-4" />
        <div className="space-y-3">
          <div className="h-1.5 w-full bg-muted/40 rounded-full" />
          <div className="h-1.5 w-4/5 bg-muted/40 rounded-full" />
        </div>
      </motion.div>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="w-full max-w-[320px] space-y-8">
      <div className="bg-muted/30 p-5 rounded-[1.5rem] rounded-tr-none ml-auto border border-border/20 shadow-sm backdrop-blur-sm">
        <p className="text-sm text-foreground/70 leading-relaxed italic">"So, the particles stay connected even across galaxies?"</p>
      </div>
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="bg-primary/10 p-5 rounded-[1.5rem] rounded-tl-none mr-auto border border-primary/20 relative shadow-md backdrop-blur-md"
      >
        <div className="absolute -top-7 left-0 flex items-center gap-2">
          <Image src="/bloomlogo.png" alt="bloom" width={18} height={18} className="rounded-md shadow-sm" />
          <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Bloom</span>
        </div>
        <p className="text-sm text-primary font-medium leading-relaxed">Exactly. But if I measure one particle, what happens instantly to the other?</p>
      </motion.div>
      <div className="bg-muted/10 p-4 rounded-[1.2rem] rounded-tr-none ml-auto max-w-[85%] border border-border/10 opacity-40 blur-[0.5px]">
        <p className="text-xs text-muted-foreground">"Thinking... is it related to the wave function collapse?"</p>
      </div>
    </div>
  );
}

function GardenVisual() {
  const mockConcepts = [
    {
      id: 1,
      session_id: "demo",
      name: "Non-locality",
      mastery_score: 92,
      status: "mastered",
      parent_concept: null,
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      session_id: "demo",
      name: "Superposition",
      mastery_score: 88,
      status: "mastered",
      parent_concept: null,
      updated_at: new Date().toISOString()
    },
  ];

  return (
    <div className="w-full flex items-center justify-center h-full">
      <div className="relative w-full max-w-[300px] aspect-[3/4.5] rounded-[3rem] border border-border/40 bg-card shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
        {/* Top Status Bar */}
        <div className="p-6 pb-2 border-b border-border/20">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-widest">Garden Live</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">MAR 2026</span>
          </div>

          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="bg-primary/5 border border-primary/20 rounded-2xl p-4 backdrop-blur-md"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-foreground">Quantum Physics</span>
                <span className="text-xs font-bold text-primary">85% Avg.</span>
              </div>
              <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "85%" }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-primary shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-px bg-border/10">
          <div className="p-4 flex flex-col items-center border-r border-border/10">
            <span className="text-[10px] text-muted-foreground uppercase mb-1">Concepts</span>
            <span className="text-lg font-outfit font-bold">12</span>
          </div>
          <div className="p-4 flex flex-col items-center">
            <span className="text-[10px] text-muted-foreground uppercase mb-1">Blooms</span>
            <span className="text-lg font-outfit font-bold text-primary">8</span>
          </div>
        </div>

        {/* Integrated Garden Window */}
        <div className="flex-1 relative mt-auto">
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none h-24 bottom-0" />
          <div className="absolute inset-0 transform scale-150 translate-y-8 origin-bottom">
            <KnowledgeGarden concepts={mockConcepts} subjectArea="physics" />
          </div>

          {/* Floating Labels */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-12 left-12 z-20 bg-background/80 border border-border/50 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg"
          >
            <span className="text-[9px] font-bold text-foreground">Entanglement</span>
          </motion.div>
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-24 right-10 z-20 bg-background/80 border border-border/50 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg"
          >
            <span className="text-[9px] font-bold text-foreground">Wave Collapse</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

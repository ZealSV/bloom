"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  GraduationCap,
  Loader2,
  Plus,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CanvasSetupForm from "@/components/canvas/CanvasSetupForm";
import { useCanvasSync } from "@/hooks/useCanvasSync";

type UserType = "personal" | "student" | "professional";

const USER_TYPES: {
  value: UserType;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { value: "personal", label: "Personal", icon: User },
  { value: "student", label: "Student", icon: GraduationCap },
  { value: "professional", label: "Professional", icon: Briefcase },
];

const ONBOARDING_BUCKET_COLORS = [
  "blue",
  "green",
  "purple",
  "orange",
  "pink",
  "cyan",
  "red",
  "yellow",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"intro" | "profile" | "canvas" | "categories" | "confirm">(
    "intro"
  );
  const [userType, setUserType] = useState<UserType | null>(null);
  const [canvasConnected, setCanvasConnected] = useState(false);
  const canvas = useCanvasSync();
  const [categoryInput, setCategoryInput] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const hasCategories = categories.length > 0;
  const [setupRunId, setSetupRunId] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState(
    "Setting up your workspace..."
  );
  const setupStartedRef = useRef(false);
  const categoryLabelPlural = userType === "student" ? "Classes" : "Categories";
  const categoryLabelPluralLower =
    userType === "student" ? "classes" : "categories";
  const categoryLabelSingular =
    userType === "student" ? "class" : "category";

  const addCategory = () => {
    const value = categoryInput.trim();
    if (!value) return;
    const alreadyExists = categories.some(
      (category) => category.toLowerCase() === value.toLowerCase()
    );
    if (alreadyExists) {
      setCategoryInput("");
      return;
    }
    setCategories((prev) => [...prev, value]);
    setCategoryInput("");
  };

  const removeCategory = (categoryToRemove: string) => {
    setCategories((prev) =>
      prev.filter((category) => category !== categoryToRemove)
    );
  };

  const handleFinish = () => {
    if (!userType) return;
    setSetupError(null);
    setupStartedRef.current = false;
    setSetupRunId((prev) => prev + 1);
    setStep("confirm");
  };

  useEffect(() => {
    if (step !== "confirm") return;
    if (setupStartedRef.current) return;
    setupStartedRef.current = true;

    let cancelled = false;

    const runSetup = async () => {
      const startedAt = Date.now();
      localStorage.setItem("bloom_user_type", userType ?? "");
      localStorage.setItem("bloom_categories", JSON.stringify(categories));

      try {
        setSetupMessage("Creating your buckets...");

        const existingRes = await fetch("/api/subjects");
        const existingNames = new Set<string>();

        if (existingRes.ok) {
          const existingSubjects = (await existingRes.json()) as {
            name?: string;
          }[];
          for (const subject of existingSubjects) {
            const name = subject.name?.trim().toLowerCase();
            if (name) existingNames.add(name);
          }
        }

        const newCategories = categories.filter(
          (category) => !existingNames.has(category.trim().toLowerCase())
        );

        await Promise.all(
          newCategories.map((category, index) =>
            fetch("/api/subjects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: category,
                color:
                  ONBOARDING_BUCKET_COLORS[
                    index % ONBOARDING_BUCKET_COLORS.length
                  ],
              }),
            })
          )
        );
      } catch {
        // Continue to app even if setup partially fails.
      }

      // If Canvas credentials were provided, sync courses + files
      if (canvasConnected) {
        try {
          setSetupMessage("Syncing your Canvas courses...");
          await fetch("/api/canvas/sync", { method: "POST" });
        } catch {
          // Non-blocking — user can re-sync later from settings
        }
      }

      try {
        setSetupMessage("Finalizing your onboarding...");
        const onboardingRes = await fetch("/api/onboarding", { method: "PATCH" });
        if (!onboardingRes.ok) {
          throw new Error("Unable to complete onboarding.");
        }
      } catch {
        if (!cancelled) {
          setSetupError("Couldn't finish setup. Please retry.");
          setSetupMessage("Could not finish setup.");
          setupStartedRef.current = false;
        }
        return;
      }

      const elapsed = Date.now() - startedAt;
      const minDisplayTime = 1400;
      if (elapsed < minDisplayTime) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, minDisplayTime - elapsed)
        );
      }

      if (!cancelled) {
        router.push("/app");
      }
    };

    runSetup();

    return () => {
      cancelled = true;
    };
  }, [step, router, userType, categories, canvasConnected, setupRunId]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.section
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {step !== "intro" && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-70" />
        )}

        <AnimatePresence mode="wait">
          {step === "intro" ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <motion.div
                className="relative mx-auto mb-6 h-20 w-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18 }}
                >
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{
                      duration: 3.2,
                      repeat: Infinity,
                      repeatType: "loop",
                      ease: "easeInOut",
                      delay: 0.7,
                    }}
                  >
                    <Image
                      src="/bloomlogo.png"
                      alt="bloom logo"
                      width={80}
                      height={80}
                      className="rounded-2xl"
                      priority
                    />
                  </motion.div>
                </motion.div>
              </motion.div>

              <motion.h1
                className="font-outfit text-2xl font-semibold text-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 }}
              >
                Welcome to bloom
              </motion.h1>
              <motion.p
                className="mt-2 text-sm text-muted-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.3 }}
              >
                The best way to learn is to teach.
              </motion.p>

              <motion.div
                className="mt-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.4 }}
              >
                <Button className="h-10 px-5" onClick={() => setStep("profile")}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>
          ) : step === "profile" ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <motion.div
                className="mx-auto mb-5 h-10 w-10 rounded-xl border border-primary/30 bg-primary/10 p-2"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <Image
                  src="/bloomlogo.png"
                  alt="bloom logo"
                  width={24}
                  height={24}
                  className="rounded-md"
                />
              </motion.div>

              <h1 className="font-outfit text-2xl font-semibold text-foreground">
                What best describes you?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose the option that fits best right now.
              </p>

              <div className="mt-6 space-y-2.5">
                {USER_TYPES.map((option, index) => {
                  const Icon = option.icon;
                  const selected = userType === option.value;
                  return (
                    <motion.button
                      key={option.value}
                      type="button"
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                        selected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-background/70 hover:border-primary/30 hover:bg-primary/5"
                      }`}
                      onClick={() => setUserType(option.value)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.07 }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-lg border p-2 ${
                            selected
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-foreground">
                          {option.label}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  className="h-10 px-4"
                  onClick={() => setStep("intro")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  className="h-10 px-5"
                  disabled={!userType}
                  onClick={() => setStep(userType === "student" ? "canvas" : "categories")}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ) : step === "canvas" ? (
            <motion.div
              key="canvas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <motion.div
                className="mx-auto mb-5 h-10 w-10 rounded-xl border border-primary/30 bg-primary/10 p-2"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <Image
                  src="/bloomlogo.png"
                  alt="bloom logo"
                  width={24}
                  height={24}
                  className="rounded-md"
                />
              </motion.div>

              <h1 className="font-outfit text-2xl font-semibold text-foreground">
                Connect Canvas LMS
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Import your courses and files automatically.
              </p>

              <div className="mt-6 text-left">
                <CanvasSetupForm
                  saveCredentials={canvas.saveCredentials}
                  loading={canvas.loading}
                  error={canvas.error}
                  onSuccess={() => setCanvasConnected(true)}
                />
              </div>

              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  className="h-10 px-4"
                  onClick={() => setStep("profile")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  variant={canvasConnected ? "default" : "outline"}
                  className="h-10 px-5"
                  onClick={() => setStep("categories")}
                >
                  {canvasConnected ? "Continue" : "Skip"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ) : step === "categories" ? (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <motion.div
                className="mx-auto mb-5 h-10 w-10 rounded-xl border border-primary/30 bg-primary/10 p-2"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <Image
                  src="/bloomlogo.png"
                  alt="bloom logo"
                  width={24}
                  height={24}
                  className="rounded-md"
                />
              </motion.div>

              <h1 className="font-outfit text-2xl font-semibold text-foreground">
                Add {categoryLabelPluralLower}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Add {categoryLabelSingular} names to organize your workspace.
              </p>

              <div className="mt-6 rounded-xl border border-border/70 bg-background/70 p-3">
                <p className="mb-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {categoryLabelPlural}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCategory();
                      }
                    }}
                    placeholder={`Type a ${categoryLabelSingular} name`}
                    className="h-10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-3"
                    onClick={addCategory}
                    disabled={!categoryInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 min-h-12 rounded-xl border border-dashed border-border/70 bg-muted/20 p-3">
                {categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No {categoryLabelPluralLower} added yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <span
                        key={category}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                      >
                        {category}
                        <button
                          type="button"
                          onClick={() => removeCategory(category)}
                          className="rounded-full p-0.5 text-primary/80 hover:bg-primary/15 hover:text-primary"
                          aria-label={`Remove ${category}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  className="h-10 px-4"
                  onClick={() => setStep(userType === "student" ? "canvas" : "profile")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div className="min-w-[118px]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={hasCategories ? "continue" : "skip"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14, ease: "linear" }}
                    >
                      <Button
                        variant={hasCategories ? "default" : "outline"}
                        className="h-10 w-full px-5 transition-none"
                        onClick={handleFinish}
                      >
                        {hasCategories ? "Continue" : "Skip"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="relative py-2"
            >
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                <Image
                  src="/bloomlogo.png"
                  alt="bloom logo"
                  width={22}
                  height={22}
                  className="rounded-md"
                />
              </div>
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <h1 className="font-outfit text-lg font-semibold text-foreground">
                  {setupMessage}
                </h1>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                This will only take a moment.
              </p>
              {setupError && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-destructive">{setupError}</p>
                  <Button
                    variant="outline"
                    className="h-9 px-4"
                    onClick={() => {
                      setSetupError(null);
                      setSetupMessage("Retrying setup...");
                      setupStartedRef.current = false;
                      setSetupRunId((prev) => prev + 1);
                    }}
                  >
                    Retry
                  </Button>
                </div>
              )}
              <div className="mx-auto mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </main>
  );
}

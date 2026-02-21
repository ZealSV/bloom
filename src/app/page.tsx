"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
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
              bloom pretends to be your student. Explain any concept, and it
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
                <Link href="#how">How it works</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={gentle}
          >
            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">
              How it works
            </p>
            <h2 className="font-outfit text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-12 max-w-md">
              Three steps to deeper understanding
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden">
            {[
              {
                num: "01",
                title: "Choose a topic",
                desc: "Pick anything — biology, algorithms, history. bloom adapts to any subject and complexity level.",
              },
              {
                num: "02",
                title: "Explain it",
                desc: "Teach the concept in your own words. bloom asks probing questions, makes wrong inferences, and exposes gaps.",
              },
              {
                num: "03",
                title: "Watch it grow",
                desc: "Each concept becomes a flower in your garden. Seeds sprout as understanding deepens. Mastery makes them bloom.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                className="bg-background p-6 sm:p-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...gentle, delay: i * 0.1 }}
              >
                <span className="text-[10px] font-mono text-muted-foreground/50">
                  {step.num}
                </span>
                <h3 className="font-outfit font-semibold text-foreground mt-3 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
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

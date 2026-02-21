"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { motion, useScroll, useTransform, useSpring, AnimatePresence, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Concept } from "@/hooks/useSession";
import { ArrowRight, MessageCircle, Sprout, GitFork, Zap } from "lucide-react";

const gentle = { type: "spring" as const, stiffness: 200, damping: 20, mass: 1 };

export default function LandingPage() {
  const { scrollY } = useScroll();

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
      <div className="fixed inset-0 pointer-events-none z-[60] hidden lg:block">
        <div className="max-w-5xl mx-auto h-full relative">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-border/40" />
          <div className="absolute right-0 top-0 bottom-0 w-px bg-border/40" />
        </div>
      </div>

      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 md:px-12 h-14">
          <Link href="/" className="flex items-center gap-0 overflow-hidden">
            <div className="shrink-0">
              <Image src="/bloomlogo.png" alt="bloom" width={24} height={24} className="rounded-md" />
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

      <section className="relative z-10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 pt-20 sm:pt-32 pb-16 sm:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={gentle}
          >
            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-6">Learn by teaching</p>
            <h1 className="font-outfit text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.08] mb-6 max-w-2xl">
              The best way to learn is to teach.
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed mb-10">
              Bloom pretends to be your student. Explain any concept, and it asks the questions that reveal what you actually know — and what you don&apos;t.
            </p>
            <div className="flex items-center gap-3">
              <Button size="lg" className="h-11 px-6 text-sm" asChild>
                <Link href="/auth/signup">
                  Start teaching
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-11 px-6 text-sm" asChild>
                <Link href="#how" onClick={scrollToHow}>How it works</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="how" className="relative z-10 border-b border-border scroll-mt-14">
        <StickyHowItWorks />
      </section>

      <section className="relative z-10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-16 sm:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={gentle}>
            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">Features</p>
            <h2 className="font-outfit text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-12 max-w-lg">
              Built for real understanding, not memorization
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: MessageCircle, title: "Socratic questioning", desc: "Bloom asks 'why?' and 'what if?' until you've explored every corner. It never accepts surface-level answers." },
              { icon: Sprout, title: "Knowledge garden", desc: "A living visualization. Each concept is a flower that grows from seed to full bloom as your mastery increases." },
              { icon: Zap, title: "Gap detection", desc: "When you hand-wave, skip steps, or say 'basically' — bloom catches it. It pushes you to fill the gaps." },
              { icon: GitFork, title: "Concept mapping", desc: "See how ideas connect with a force-directed graph. Prerequisites, dependencies, the full picture." },
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
                <h3 className="font-outfit font-semibold text-sm text-foreground mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-20 sm:py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={gentle}>
            <h2 className="font-outfit text-2xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">Ready to teach?</h2>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">Discover what you truly know. Start your first session.</p>
            <Button size="lg" className="h-11 px-8 text-sm" asChild>
              <Link href="/auth/signup">Get started — it&apos;s free<ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <footer className="relative z-10 px-4 sm:px-6 md:px-12 pb-8 pt-12">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/bloomlogo.png" alt="bloom" width={22} height={22} className="rounded-md" />
            <span className="font-outfit font-semibold text-sm text-foreground/80">bloom</span>
          </Link>
          <p className="text-xs text-muted-foreground/50 text-center max-w-xs">The best way to learn is to teach.</p>
          <div className="w-12 h-px bg-border" />
          <ThemeToggle />
        </div>
      </footer>
    </div>
  );
}

function StickyHowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 60, damping: 25, restDelta: 0.001 });

  const topicOpacity = useTransform(smoothProgress, [0, 0.3, 0.45], [1, 1, 0]);
  const chatOpacity = useTransform(smoothProgress, [0.25, 0.45, 0.65, 0.8], [0, 1, 1, 0]);
  const gardenOpacity = useTransform(smoothProgress, [0.65, 0.8, 1], [0, 1, 1]);

  const topicX = useTransform(smoothProgress, [0.3, 0.45], [0, -20]);
  const chatX = useTransform(smoothProgress, [0.25, 0.45, 0.65, 0.8], [20, 0, 0, -20]);
  const gardenX = useTransform(smoothProgress, [0.65, 0.8], [20, 0]);

  const stageScale = useTransform(smoothProgress, [0, 0.4, 0.7, 1], [1, 0.98, 0.98, 1]);

  const steps = [
    { num: "01", title: "Choose a topic", desc: "Pick anything — biology, algorithms, history. Bloom adapts to any subject and complexity level. Just tell it what you want to teach." },
    { num: "02", title: "Explain it", desc: "Teach the concept in your own words. Bloom asks probing questions, makes wrong inferences, and exposes gaps in your logic." },
    { num: "03", title: "Watch it grow", desc: "Each concept becomes a flower in your garden. Seeds sprout as understanding deepens. Mastery makes them bloom into your knowledge garden." },
  ];

  return (
    <div ref={containerRef} className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 relative h-[300vh]">
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 relative h-full">
        <div className="flex-1">
          {steps.map((step, i) => (
            <div key={i} className="h-screen flex flex-col justify-center">
              <motion.div initial={{ opacity: 0.3, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ margin: "-20% 0px -20% 0px" }} transition={{ duration: 0.8 }}>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-[10px] font-mono mb-6">{step.num}</div>
                <h2 className="font-outfit text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-6">{step.title}</h2>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-sm">{step.desc}</p>
              </motion.div>
            </div>
          ))}
          <div className="h-[80vh]" />
        </div>

        <div className="hidden lg:block flex-1 sticky top-0 h-screen">
          <div className="h-full flex items-center py-20">
            <div className="relative w-full aspect-[4/5] max-h-[580px] rounded-[3rem] bg-card border border-border/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-50" />
              <motion.div style={{ scale: stageScale }} className="relative w-full h-full">
                <motion.div style={{ opacity: topicOpacity, x: topicX }} className="absolute inset-0 flex items-center justify-center p-12"><TopicVisual /></motion.div>
                <motion.div style={{ opacity: chatOpacity, x: chatX }} className="absolute inset-0 flex items-center justify-center p-12"><ChatVisual /></motion.div>
                <motion.div style={{ opacity: gardenOpacity, x: gardenX }} className="absolute inset-0 flex items-center justify-center p-12"><GardenVisual /></motion.div>
              </motion.div>
            </div>
          </div>
        </div>

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
      <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="p-5 rounded-2xl bg-background border border-border/50 shadow-2xl backdrop-blur-md">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-medium">Subject</p>
        <p className="text-base font-semibold text-foreground">Quantum Entanglement</p>
      </motion.div>
      <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }} className="p-5 rounded-2xl bg-primary/20 border border-primary/20 shadow-2xl backdrop-blur-md">
        <p className="text-[10px] text-primary uppercase tracking-widest mb-2 font-medium">Complexity</p>
        <p className="text-base font-semibold text-primary">Post-graduate</p>
      </motion.div>
      <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="p-5 rounded-2xl bg-background border border-border/50 shadow-xl">
        <div className="h-2 w-32 bg-muted rounded-full mb-4" />
        <div className="space-y-3"><div className="h-1.5 w-full bg-muted/40 rounded-full" /><div className="h-1.5 w-4/5 bg-muted/40 rounded-full" /></div>
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
      <motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="bg-primary/10 p-5 rounded-[1.5rem] rounded-tl-none mr-auto border border-primary/20 relative shadow-md backdrop-blur-md">
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

function DiscoveryPlant({ concepts, subjectArea }: { concepts: Concept[]; subjectArea: string | null }) {
  const [mastery, setMastery] = useState(0);
  const width = 400;
  const height = 400;
  const groundY = 350;

  useEffect(() => {
    const totalMastery = concepts.length > 0 ? concepts.reduce((acc, c) => acc + c.mastery_score, 0) / concepts.length : 85;
    let current = 0;
    const interval = setInterval(() => { if (current < totalMastery) { current += 1; setMastery(current); } else { clearInterval(interval); } }, 30);
    return () => clearInterval(interval);
  }, [concepts]);

  return (
    <div className="w-full relative aspect-square max-w-[400px] mx-auto overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-primary/5 to-primary/10 border border-primary/20 shadow-2xl">
      <div className="absolute top-6 left-6 z-20">
        <div className="bg-background/40 backdrop-blur-md border border-primary/20 px-4 py-2 rounded-2xl shadow-lg">
          <p className="text-[10px] font-mono text-primary font-bold uppercase tracking-widest mb-1">Mastery Index</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-outfit font-black text-foreground">{Math.round(mastery)}</span>
            <span className="text-sm font-bold text-primary">%</span>
          </div>
          <motion.div className="h-1 bg-primary/20 rounded-full mt-2 overflow-hidden" initial={{ width: 0 }} animate={{ width: "100%" }}>
            <motion.div className="h-full bg-primary" animate={{ width: `${mastery}%` }} transition={{ duration: 0.5 }} />
          </motion.div>
        </div>
      </div>
      <div className="absolute top-6 right-6 z-20">
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider bg-background/20 px-3 py-1 rounded-full border border-border/10 backdrop-blur-sm">{subjectArea || "Core Concepts"}</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <radialGradient id="bloomHighlight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g>
          <motion.path d={`M ${width / 2} ${groundY} Q ${width / 2 - 10} ${groundY - 100} ${width / 2 + 5} ${groundY - 200}`} fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 0.8 }} transition={{ duration: 2, ease: "easeOut" }} />
          <motion.path d={`M ${width / 2 - 4} ${groundY - 120} Q ${width / 2 - 50} ${groundY - 150} ${width / 2 - 80} ${groundY - 180}`} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 0.6 }} transition={{ duration: 1.5, delay: 1, ease: "easeOut" }} />
          <motion.path d={`M ${width / 2 + 3} ${groundY - 160} Q ${width / 2 + 60} ${groundY - 180} ${width / 2 + 90} ${groundY - 220}`} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 0.5 }} transition={{ duration: 1.5, delay: 1.8, ease: "easeOut" }} />
          <g transform={`translate(${width / 2 + 5}, ${groundY - 200})`}>
            {[0, 72, 144, 216, 288].map((angle, i) => (
              <motion.path key={i} d="M 0 0 Q 15 -25 30 0 Q 15 25 0 0" fill="var(--primary)" initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 0.9 }} transition={{ delay: 2.2 + i * 0.1, type: "spring" }} style={{ transform: `rotate(${angle}deg)`, transformOrigin: '0 0' }} />
            ))}
            <motion.circle r="8" fill="white" initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ delay: 2.8 }} />
          </g>
        </g>
      </svg>
    </div>
  );
}

function GardenVisual() {
  const mockConcepts = [
    { id: 1, session_id: "demo", name: "Non-locality", mastery_score: 92, status: "mastered", parent_concept: null, updated_at: new Date().toISOString() },
    { id: 2, session_id: "demo", name: "Wave Collapse", mastery_score: 85, status: "mastered", parent_concept: null, updated_at: new Date().toISOString() },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.1)_0%,transparent_65%)] pointer-events-none" />
      <div className="relative z-10 w-full max-w-[320px]">
        <DiscoveryPlant concepts={mockConcepts} subjectArea="Quantum Physics" />
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 1 }} className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
        </motion.div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div key={i} className="absolute w-2 h-2 rounded-full bg-primary/10 blur-xl" animate={{ y: [0, -100, 0], x: [0, Math.random() * 50 - 25, 0], opacity: [0, 0.5, 0] }} transition={{ duration: 10 + Math.random() * 5, repeat: Infinity, delay: i * 2 }} style={{ left: `${20 + i * 15}%`, top: "60%" }} />
      ))}
    </div>
  );
}

"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowRight, MessageCircle, Sprout, GitFork, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

const gentle = { type: "spring" as const, stiffness: 200, damping: 20, mass: 1 };

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setIsLoggedIn(true);
    });
  }, []);

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
          <div className="absolute left-0 top-0 bottom-0 w-[1.5px] bg-border/60" />
          <div className="absolute right-0 top-0 bottom-0 w-[1.5px] bg-border/60" />
        </div>
      </div>

      <nav className="sticky top-0 z-50 border-b-[1.5px] border-border bg-background/80 backdrop-blur-md">
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
            {isLoggedIn ? (
              <Button size="sm" className="text-xs h-8" asChild>
                <Link href="/app">Enter<ArrowRight className="ml-1.5 h-3 w-3" /></Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-xs h-8" asChild>
                  <Link href="/auth/login">Log in</Link>
                </Button>
                <Button size="sm" className="text-xs h-8" asChild>
                  <Link href="/auth/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="relative z-10 border-b-[1.5px] border-border">
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
                <Link href={isLoggedIn ? "/app" : "/auth/signup"}>
                  {isLoggedIn ? "Enter" : "Start teaching"}
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

      <section id="how" className="relative z-10 border-b-[1.5px] border-border scroll-mt-14">
        <StickyHowItWorks />
      </section>

      <section className="relative z-10 border-b-[1.5px] border-border">
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

      <section className="relative z-10 border-b-[1.5px] border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-20 sm:py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={gentle}>
            <h2 className="font-outfit text-2xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">Ready to teach?</h2>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">Discover what you truly know. Start your first session.</p>
            <Button size="lg" className="h-11 px-8 text-sm" asChild>
              <Link href={isLoggedIn ? "/app" : "/auth/signup"}>
                {isLoggedIn ? "Enter" : "Get started"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
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
        </div>

        <div className="hidden lg:block flex-1 sticky top-14 h-[calc(100vh-3.5rem)]">
          <div className="h-full flex items-center py-16">
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
      <div className="pt-3">
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: "transform" }}
          className="origin-top-left bg-primary/10 p-5 rounded-[1.5rem] rounded-tl-none mr-auto border border-primary/20 relative shadow-md backdrop-blur-md"
        >
          <div className="absolute -top-7 left-0 flex items-center gap-2">
            <Image src="/bloomlogo.png" alt="bloom" width={18} height={18} className="rounded-md shadow-sm" />
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Bloom</span>
          </div>
          <p className="text-sm text-primary font-medium leading-relaxed">Exactly. But if I measure one particle, what happens instantly to the other?</p>
        </motion.div>
      </div>
      <div className="bg-muted/10 p-4 rounded-[1.2rem] rounded-tr-none ml-auto max-w-[85%] border border-border/10 opacity-40 blur-[0.5px]">
        <p className="text-xs text-muted-foreground">"Thinking... is it related to the wave function collapse?"</p>
      </div>
    </div>
  );
}


function GardenVisual() {
  const width = 320;
  const height = 260;
  const groundY = 210;

  const flowers = [
    { name: "Sprout", mastery: 15, x: 45 },
    { name: "Seedling", mastery: 35, x: 105 },
    { name: "Budding", mastery: 55, x: 165 },
    { name: "Flowering", mastery: 78, x: 225 },
    { name: "Ripening", mastery: 95, x: 285 },
  ];

  const petal = "#4ade80";
  const center = "#fbbf24";
  const stem = "#22c55e";

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[320px]" style={{ overflow: "visible" }}>
        {/* Subtle ground line */}
        <line x1={20} y1={groundY} x2={width - 20} y2={groundY} className="stroke-border" strokeWidth={1} strokeLinecap="round" />

        {/* Flowers at different stages */}
        {flowers.map((f, i) => {
          const stage = f.mastery <= 20 ? "seed" : f.mastery <= 40 ? "sprout" : f.mastery <= 60 ? "growing" : f.mastery <= 80 ? "blooming" : "full";

          return (
            <g key={f.name}>
              {/* Seed */}
              {stage === "seed" && (
                <motion.ellipse
                  cx={f.x} cy={groundY + 4} rx={4} ry={3} fill={stem}
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: i * 0.15 }}
                />
              )}

              {/* Sprout */}
              {stage === "sprout" && (
                <g>
                  <motion.line x1={f.x} y1={groundY} x2={f.x} y2={groundY - 22}
                    stroke={stem} strokeWidth={2} strokeLinecap="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, delay: i * 0.15 }}
                  />
                  <motion.ellipse cx={f.x + 5} cy={groundY - 18} rx={4} ry={2.5}
                    fill={stem} opacity={0.7}
                    initial={{ scale: 0 }} animate={{ scale: 1, rotate: -30 }}
                    transition={{ delay: 0.3 + i * 0.15 }}
                    style={{ transformOrigin: `${f.x}px ${groundY - 18}px` }}
                  />
                </g>
              )}

              {/* Growing */}
              {stage === "growing" && (
                <g>
                  <motion.line x1={f.x} y1={groundY} x2={f.x} y2={groundY - 42}
                    stroke={stem} strokeWidth={2.5} strokeLinecap="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, delay: i * 0.15 }}
                  />
                  <motion.ellipse cx={f.x + 7} cy={groundY - 22} rx={6} ry={3}
                    fill={stem} opacity={0.7}
                    initial={{ scale: 0 }} animate={{ scale: 1, rotate: -25 }}
                    transition={{ delay: 0.3 + i * 0.15 }}
                    style={{ transformOrigin: `${f.x}px ${groundY - 22}px` }}
                  />
                  <motion.ellipse cx={f.x - 7} cy={groundY - 30} rx={6} ry={3}
                    fill={stem} opacity={0.7}
                    initial={{ scale: 0 }} animate={{ scale: 1, rotate: 25 }}
                    transition={{ delay: 0.4 + i * 0.15 }}
                    style={{ transformOrigin: `${f.x}px ${groundY - 30}px` }}
                  />
                  <motion.circle cx={f.x} cy={groundY - 44} r={4}
                    fill={petal} opacity={0.6}
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.15, type: "spring" }}
                  />
                </g>
              )}

              {/* Blooming */}
              {stage === "blooming" && (
                <g>
                  <motion.line x1={f.x} y1={groundY} x2={f.x} y2={groundY - 55}
                    stroke={stem} strokeWidth={2.5} strokeLinecap="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  />
                  <motion.ellipse cx={f.x + 8} cy={groundY - 26} rx={7} ry={3.5}
                    fill={stem} opacity={0.8}
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    style={{ transformOrigin: `${f.x}px ${groundY - 26}px`, rotate: -25 }}
                  />
                  <motion.ellipse cx={f.x - 8} cy={groundY - 36} rx={7} ry={3.5}
                    fill={stem} opacity={0.8}
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    style={{ transformOrigin: `${f.x}px ${groundY - 36}px`, rotate: 25 }}
                  />
                  {[0, 60, 120, 180, 240, 300].map((angle) => {
                    const rad = (angle * Math.PI) / 180;
                    const radM20 = ((angle - 20) * Math.PI) / 180;
                    const radP20 = ((angle + 20) * Math.PI) / 180;
                    const x1 = (f.x + Math.cos(radM20) * 12).toFixed(3);
                    const y1 = (groundY - 58 + Math.sin(radM20) * 12).toFixed(3);
                    const x2 = (f.x + Math.cos(rad) * 16).toFixed(3);
                    const y2 = (groundY - 58 + Math.sin(rad) * 16).toFixed(3);
                    const x3 = (f.x + Math.cos(radP20) * 12).toFixed(3);
                    const y3 = (groundY - 58 + Math.sin(radP20) * 12).toFixed(3);

                    return (
                      <motion.path
                        key={angle}
                        d={`M ${f.x} ${groundY - 58} Q ${x1} ${y1} ${x2} ${y2} Q ${x3} ${y3} ${f.x} ${groundY - 58}`}
                        fill={petal}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 0.8 }}
                        transition={{ delay: 0.3 + (angle / 360) * 0.3, type: "spring", stiffness: 100 }}
                        style={{ transformOrigin: `${f.x}px ${groundY - 58}px` }}
                      />
                    );
                  })}
                  <motion.circle cx={f.x} cy={groundY - 58} r={5} fill={center}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </g>
              )}

              {/* Full bloom */}
              {stage === "full" && (
                <g>
                  <motion.circle cx={f.x} cy={groundY - 72} r={20} fill={petal}
                    animate={{ opacity: [0.05, 0.12, 0.05] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                  <motion.g
                    animate={{ rotate: [-1.5, 1.5, -1.5] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    style={{ transformOrigin: `${f.x}px ${groundY}px` }}
                  >
                    <line x1={f.x} y1={groundY} x2={f.x} y2={groundY - 68}
                      stroke={stem} strokeWidth={3} strokeLinecap="round"
                    />
                    <ellipse cx={f.x + 10} cy={groundY - 28} rx={10} ry={4}
                      fill={stem} opacity={0.9}
                      transform={`rotate(-20, ${f.x + 10}, ${groundY - 28})`}
                    />
                    <ellipse cx={f.x - 10} cy={groundY - 40} rx={10} ry={4}
                      fill={stem} opacity={0.9}
                      transform={`rotate(20, ${f.x - 10}, ${groundY - 40})`}
                    />
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                      const rad = (angle * Math.PI) / 180;
                      const radM22 = ((angle - 22) * Math.PI) / 180;
                      const radP22 = ((angle + 22) * Math.PI) / 180;
                      const x1 = (f.x + Math.cos(radM22) * 18).toFixed(3);
                      const y1 = (groundY - 72 + Math.sin(radM22) * 18).toFixed(3);
                      const x2 = (f.x + Math.cos(rad) * 24).toFixed(3);
                      const y2 = (groundY - 72 + Math.sin(rad) * 24).toFixed(3);
                      const x3 = (f.x + Math.cos(radP22) * 18).toFixed(3);
                      const y3 = (groundY - 72 + Math.sin(radP22) * 18).toFixed(3);

                      return (
                        <motion.path
                          key={angle}
                          d={`M ${f.x} ${groundY - 72} Q ${x1} ${y1} ${x2} ${y2} Q ${x3} ${y3} ${f.x} ${groundY - 72}`}
                          fill={petal}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 0.9 }}
                          transition={{ delay: (angle / 360) * 0.4, type: "spring" }}
                          style={{ transformOrigin: `${f.x}px ${groundY - 72}px` }}
                        />
                      );
                    })}
                    <motion.circle cx={f.x} cy={groundY - 72} r={7} fill={center}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                    {/* Particles */}
                    {[0, 1, 2].map((pi) => (
                      <motion.circle
                        key={`p-${pi}`}
                        cx={f.x + (pi - 1) * 15}
                        cy={groundY - 72 + (pi - 1) * 10}
                        r={1}
                        fill={petal}
                        opacity={0.5}
                        animate={{ y: [0, -18, -36], opacity: [0, 0.6, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: pi * 0.7 }}
                      />
                    ))}
                  </motion.g>
                </g>
              )}

              {/* Labels */}
              <text
                x={f.x}
                y={groundY + 18}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={7}
                fontFamily="Inter, sans-serif"
              >
                {f.name}
              </text>
              <text
                x={f.x}
                y={groundY + 27}
                textAnchor="middle"
                fill={petal}
                fontSize={6}
                fontWeight="600"
                fontFamily="Inter, sans-serif"
                opacity={0.6}
              >
                {f.mastery}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

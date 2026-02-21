"use client";

import { motion } from "framer-motion";

export default function Header() {
  return (
    <header className="h-14 border-b border-bloom-border bg-bloom-bg/80 backdrop-blur-sm flex items-center px-4 shrink-0">
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bloom-green to-emerald-600 flex items-center justify-center text-lg">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-bloom-bg"
          >
            <path d="M12 2L12 22" />
            <path d="M12 8C12 8 8 4 4 8C0 12 4 16 8 14C10 13 12 11 12 8Z" />
            <path d="M12 8C12 8 16 4 20 8C24 12 20 16 16 14C14 13 12 11 12 8Z" />
          </svg>
        </div>
        <h1 className="font-outfit font-semibold text-lg text-bloom-green">
          bloom
        </h1>
        <span className="text-xs text-slate-500 mt-0.5">teach to learn</span>
      </motion.div>
    </header>
  );
}

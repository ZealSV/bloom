"use client";

import { ReactNode, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface LayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  panel: ReactNode;
  panelTab: string;
  onPanelTabChange: (tab: string) => void;
  user?: any;
  onSignOut?: () => void;
}

const TABS = [
  { id: "garden", label: "Garden", icon: "🌱" },
  { id: "mastery", label: "Mastery", icon: "📊" },
  { id: "graph", label: "Map", icon: "🔗" },
];

export default function Layout({
  sidebar,
  main,
  panel,
  panelTab,
  onPanelTabChange,
  user,
  onSignOut,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "?";

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-12 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-3 shrink-0 z-10">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground mr-2"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <Image
              src="/bloomlogo.png"
              alt="bloom"
              width={28}
              height={28}
              className="rounded-lg"
            />
            <h1 className="font-outfit font-semibold text-base text-primary">
              bloom
            </h1>
          </div>
        </div>

        {/* User menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground hidden sm:inline max-w-[120px] truncate">
                  {user.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={onSignOut}
                className="text-destructive focus:text-destructive"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="mr-2"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              className="w-56 border-r border-border bg-card/30 shrink-0 overflow-hidden"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 224, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {sidebar}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">{main}</div>

          {/* Right panel */}
          <div className="w-80 border-l border-border bg-card/30 shrink-0 flex flex-col overflow-hidden hidden xl:flex">
            <div className="flex border-b border-border shrink-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onPanelTabChange(tab.id)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${
                    panelTab === tab.id
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="mr-1">{tab.icon}</span>
                  {tab.label}
                  {panelTab === tab.id && (
                    <motion.div
                      layoutId="panelTab"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3">{panel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

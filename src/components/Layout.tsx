"use client";

import { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  user?: any;
  onSignOut?: () => void;
  onLogoClick?: () => void;
}

export default function Layout({
  sidebar,
  main,
  user,
  onSignOut,
  onLogoClick,
}: LayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setSidebarOpen(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const email = typeof user?.email === "string" ? user.email : "";
  const displayName = email.includes("@") ? email.split("@")[0] : email;
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : "?";

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-12 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-3 shrink-0 z-10">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground mr-2"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={onLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
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
          </button>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />

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
                    {displayName || user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push("/app/settings")}>
                  <Settings className="h-3.5 w-3.5 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              className="w-56 border-r border-border bg-card/95 backdrop-blur-lg overflow-hidden fixed inset-y-12 left-0 z-40 lg:static lg:inset-auto"
              initial={{ x: -224, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -224, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                onClick={() => {
                  if (window.matchMedia("(min-width: 1024px)").matches) return;
                  setSidebarOpen(false);
                }}
              >
                {sidebar}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {sidebarOpen && (
            <motion.button
              type="button"
              className="fixed inset-0 top-12 bg-black/40 z-30 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            />
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">{main}</div>
      </div>
    </div>
  );
}

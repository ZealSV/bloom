"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DelelteConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onYes: () => void;
}

export default function DelelteConfirm({
  open,
  onOpenChange,
  onYes,
}: DelelteConfirmProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm overflow-hidden rounded-2xl border-border/80 p-0">
        <div className="border-b border-border/70 bg-card/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-destructive/25 bg-destructive/10 text-destructive">
              <Trash2 className="h-4 w-4" />
            </div>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="font-outfit text-base">
                Are you sure you want to delete?
              </DialogTitle>
              <DialogDescription className="text-xs">
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <DialogFooter className="bg-card px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-9 min-w-[88px]"
            onClick={() => onOpenChange(false)}
          >
            No
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-9 min-w-[88px]"
            onClick={onYes}
          >
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

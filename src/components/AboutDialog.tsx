'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Layers, Clock, ShieldCheck } from 'lucide-react';

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0f111a] border border-white/10 text-white shadow-2xl rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
              ∞
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">About Deto</DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                A personal study tracker built for long-term retention.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs text-zinc-300 leading-relaxed">
          <div className="p-3 rounded-xl border border-white/5 bg-zinc-900/50 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
              <Layers className="w-3.5 h-3.5" />
              <span>FIFO Queue View</span>
            </div>
            <p className="text-zinc-400">
              The first item is today&apos;s topic. Marking it done sends it to the back of the line so your topics cycle continuously. Drag and drop rows to prioritize topics.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-white/5 bg-zinc-900/50 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300">
              <Clock className="w-3.5 h-3.5" />
              <span>Spaced Repetition (Due View)</span>
            </div>
            <p className="text-zinc-400">
              Reviews are prompted at scientifically proven intervals:
              <span className="font-mono text-zinc-200 ml-1">1 → 3 → 7 → 14 → 30 days</span> (repeating every 30 days indefinitely).
            </p>
          </div>

          <div className="p-3 rounded-xl border border-white/5 bg-zinc-900/50 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Access &amp; Security</span>
            </div>
            <p className="text-zinc-400">
              Public visitors can read notes, links, and documents. Only the verified owner can create, edit, mark done, or delete topics.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-white/10 hover:bg-white/15 text-white text-xs rounded-lg"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login, ApiError } from '@/lib/api';
import { Lock } from 'lucide-react';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LoginDialog({ open, onOpenChange, onSuccess }: LoginDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      setUsername('');
      setPassword('');
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] sm:max-w-[400px] bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl shadow-2xl p-4 sm:p-6">
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
            <Lock className="w-5 h-5" />
          </div>
          <DialogTitle className="text-slate-900 dark:text-white text-lg font-bold">Owner Login</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-zinc-400 text-xs">
            Authenticate to manage topics, revise notes, and reorder the queue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 text-xs text-red-600 dark:text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="username" className="text-xs font-medium text-slate-700 dark:text-zinc-300">
              Username
            </label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              placeholder="Username"
              className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium text-slate-700 dark:text-zinc-300">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••••"
              className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/80 dark:border-white/5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !username || !password}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/30"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

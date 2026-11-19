'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center gap-2 rounded-xl transition-all duration-200 p-2 text-xs font-medium cursor-pointer select-none active:scale-95 ${
        isDark
          ? 'text-zinc-400 hover:text-amber-300 hover:bg-white/5 border border-white/5'
          : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200 bg-white/70 shadow-xs'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 rotate-0 scale-100 transition-all duration-200" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 rotate-0 scale-100 transition-all duration-200" />
        )}
      </div>

      {showLabel && (
        <span className="truncate">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}

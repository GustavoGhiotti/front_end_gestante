import { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Quando true aplica borda e foco vermelhos */
  error?: boolean;
}

export function Input({ className = '', error, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400',
        'bg-white transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        error
          ? 'border-red-400 focus:ring-red-400'
          : 'border-slate-300 hover:border-slate-400 focus:border-brand-500 focus:ring-brand-500/30',
        'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  );
}

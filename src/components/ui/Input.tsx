import { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`border border-slate-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-sky-500 ${className}`}
      {...props}
    />
  );
}

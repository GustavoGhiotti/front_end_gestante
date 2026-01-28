import { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded bg-sky-600 text-white font-medium hover:bg-sky-700 disabled:opacity-60 transition ${className}`}
      {...props}
    />
  );
}

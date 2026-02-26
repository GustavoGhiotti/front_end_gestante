import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Adiciona efeito hover */
  hoverable?: boolean;
  as?: 'div' | 'article' | 'section';
}

export function Card({ children, className, hoverable, as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      className={cn(
        'bg-white rounded-xl shadow-card border border-slate-100',
        hoverable && 'transition-shadow duration-150 hover:shadow-card-md',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}
export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('px-5 pt-5 pb-3 flex items-center justify-between', className)}>
      {children}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}
export function CardBody({ children, className }: CardBodyProps) {
  return (
    <div className={cn('px-5 pb-5', className)}>
      {children}
    </div>
  );
}

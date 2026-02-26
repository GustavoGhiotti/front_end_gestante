import { UserRole } from '../../types/domain';
import { cn } from '../../lib/utils';

// ─── Ícones ───────────────────────────────────────────────────────────────────
function IconStethoscope({ className }: { className?: string }) {
  return (
    <svg className={cn('w-4 h-4', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
    </svg>
  );
}
function IconHeart({ className }: { className?: string }) {
  return (
    <svg className={cn('w-4 h-4', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ProfileToggleProps {
  value: UserRole;
  onChange: (value: UserRole) => void;
  className?: string;
}

interface OptionConfig {
  value: UserRole;
  label: string;
  description: string;
  icon: (p: { className?: string }) => JSX.Element;
}

const OPTIONS: OptionConfig[] = [
  {
    value: 'medico',
    label: 'Médico',
    description: 'Acesso ao painel clínico',
    icon: IconStethoscope,
  },
  {
    value: 'gestante',
    label: 'Gestante',
    description: 'Acompanhamento da gestação',
    icon: IconHeart,
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────
export function ProfileToggle({ value, onChange, className }: ProfileToggleProps) {
  return (
    <div
      role="group"
      aria-label="Selecionar perfil de acesso"
      className={cn('grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl', className)}
    >
      {OPTIONS.map(opt => {
        const isActive = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
              isActive
                ? 'bg-white shadow-card text-brand-700'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50',
            )}
          >
            <Icon className={isActive ? 'text-brand-600' : 'text-slate-400'} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

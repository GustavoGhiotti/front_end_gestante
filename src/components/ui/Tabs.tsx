import {
  createContext,
  useContext,
  type ReactNode,
  useRef,
} from 'react';
import { cn } from '../../lib/utils';

// ─── Context ──────────────────────────────────────────────────────────────────
interface TabsCtx {
  active: string;
  onChange: (id: string) => void;
}
const TabsContext = createContext<TabsCtx | null>(null);
function useTabsCtx() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used inside <Tabs>');
  return ctx;
}

// ─── Root ─────────────────────────────────────────────────────────────────────
interface TabsProps {
  value: string;
  onValueChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}
export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ active: value, onChange: onValueChange }}>
      <div className={cn('flex flex-col', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────
interface TabsListProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}
export function TabsList({ children, className, 'aria-label': ariaLabel }: TabsListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  /** Navegação por teclado: ← → Home End (ARIA tabs pattern) */
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const tabs = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    if (!tabs?.length) return;
    const arr = Array.from(tabs);
    const current = document.activeElement;
    const idx = arr.indexOf(current as HTMLButtonElement);
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % arr.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + arr.length) % arr.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = arr.length - 1;
    else return;
    e.preventDefault();
    arr[next].focus();
    arr[next].click();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex gap-1 border-b border-slate-200 overflow-x-auto scrollbar-thin',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── Tab trigger ─────────────────────────────────────────────────────────────
interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}
export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const { active, onChange } = useTabsCtx();
  const isActive = active === value;

  return (
    <button
      type="button"
      role="tab"
      id={`tab-${value}`}
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onChange(value)}
      className={cn(
        'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
        isActive
          ? 'border-brand-600 text-brand-700'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
        className,
      )}
    >
      {children}
    </button>
  );
}

// ─── Tab panel ───────────────────────────────────────────────────────────────
interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}
export function TabsContent({ value, children, className }: TabsContentProps) {
  const { active } = useTabsCtx();
  if (active !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={cn('outline-none pt-6', className)}
    >
      {children}
    </div>
  );
}

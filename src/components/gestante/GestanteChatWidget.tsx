import { useState } from 'react';
import { GestanteChatBox } from './GestanteChatBox';

export function GestanteChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-2 right-2 z-40 sm:bottom-5 sm:right-5">
      {isOpen ? (
        <div className="flex h-[min(82dvh,720px)] w-[min(calc(100vw-1rem),380px)] flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_26px_60px_-30px_rgba(15,23,42,0.55)] sm:h-[78vh] sm:w-[min(92vw,380px)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Assistente IA</p>
              <p className="text-xs text-slate-500">Atendimento virtual</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fechar chat"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
          <GestanteChatBox compact className="min-h-0 flex-1 rounded-none border-0" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_18px_36px_-14px_rgba(20,184,166,0.95)] transition hover:bg-brand-600"
          aria-label="Abrir chat da assistente IA"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75h6.75m-6.75 3h4.5M9 18.075A9 9 0 103.75 9.75c0 1.578.406 3.06 1.12 4.35L3.75 18.75 9 18.075z" />
          </svg>
        </button>
      )}
    </div>
  );
}

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { useAuth } from '../../contexts/AuthContext';
import { cn, formatDate, formatTime } from '../../lib/utils';
import {
  askGestanteChat,
  createGestanteChatThread,
  getGestanteChatHistory,
  getGestanteChatStatus,
  getGestanteChatThreads,
  type ChatGestanteMessage,
  type ChatGestanteThread,
} from '../../services/gestanteChatService';

interface GestanteChatBoxProps {
  compact?: boolean;
  className?: string;
}

function urgencyLabel(level?: ChatGestanteMessage['urgencyLevel']) {
  switch (level) {
    case 'rotina':
      return { label: 'Rotina', variant: 'success' as const };
    case 'proxima_consulta':
      return { label: 'Proxima consulta', variant: 'warning' as const };
    case 'mesmo_dia':
      return { label: 'Mesmo dia', variant: 'danger' as const };
    case 'pronto_socorro':
      return { label: 'Pronto socorro', variant: 'danger' as const };
    case 'sem_base':
      return { label: 'Sem base suficiente', variant: 'neutral' as const };
    default:
      return null;
  }
}

function MessageBubble({ message }: { message: ChatGestanteMessage }) {
  const isAssistant = message.role === 'assistant';
  const urgency = urgencyLabel(message.urgencyLevel);
  const [showReferences, setShowReferences] = useState(false);
  const hasReferences = isAssistant && message.citations.length > 0;

  return (
    <div className={cn('flex', isAssistant ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[88%] rounded-[20px] px-4 py-3 shadow-sm',
          isAssistant
            ? 'border border-slate-200 bg-white text-slate-700'
            : 'bg-brand-600 text-white',
        )}
      >
        <div className="mb-2 flex items-center gap-2 text-[11px]">
          <span className={cn('font-semibold', isAssistant ? 'text-slate-700' : 'text-white/90')}>
            {isAssistant ? 'Assistente IA' : 'Voce'}
          </span>
          <span className={cn(isAssistant ? 'text-slate-400' : 'text-white/70')}>
            {formatDate(message.createdAt, { day: '2-digit', month: '2-digit' })} · {formatTime(message.createdAt)}
          </span>
          {urgency && isAssistant && <Badge variant={urgency.variant}>{urgency.label}</Badge>}
        </div>

        <p className={cn('whitespace-pre-wrap text-sm leading-6', isAssistant ? 'text-slate-700' : 'text-white')}>
          {message.content}
        </p>

        {hasReferences && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowReferences((current) => !current)}
              className="text-xs font-semibold text-brand-700 transition hover:text-brand-800"
            >
              {showReferences ? 'Ocultar referencias' : 'Ver referencias'}
            </button>

            {showReferences && (
              <div className="mt-2 space-y-2">
                {message.citations.map((citation, index) => (
                  <div key={`${message.id}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">
                      {citation.title}
                      {citation.page ? ` · p. ${citation.page}` : ''}
                    </p>
                    {citation.excerpt && <p className="mt-1 leading-5">{citation.excerpt}</p>}
                    {citation.url && (
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-xs font-medium text-brand-700 hover:text-brand-800"
                      >
                        Abrir referencia
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function GestanteChatBox({ compact = false, className }: GestanteChatBoxProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatGestanteMessage[]>([]);
  const [threads, setThreads] = useState<ChatGestanteThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [showThreadList, setShowThreadList] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const welcomeName = useMemo(() => user?.nomeCompleto?.split(' ')[0] ?? 'gestante', [user]);
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null;

  useEffect(() => {
    Promise.all([getGestanteChatThreads(), getGestanteChatStatus()])
      .then(async ([threadList]) => {
        setThreads(threadList);
        const firstThread = threadList[0]?.id ?? null;
        setActiveThreadId(firstThread);
        setMessages(firstThread ? await getGestanteChatHistory(firstThread) : []);
      })
      .catch(() => setError('Nao foi possivel carregar o chat agora.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSelectThread(threadId: string) {
    if (threadId === activeThreadId || sending) return;
    setShowThreadList(false);
    setActiveThreadId(threadId);
    setLoading(true);
    setError(null);
    try {
      setMessages(await getGestanteChatHistory(threadId));
    } catch {
      setError('Nao foi possivel carregar esta conversa.');
    } finally {
      setLoading(false);
    }
  }

  async function handleNewThread() {
    if (sending) return;
    setError(null);
    try {
      const thread = await createGestanteChatThread();
      setThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)]);
      setActiveThreadId(thread.id);
      setMessages([]);
      setShowThreadList(false);
    } catch {
      setError('Nao foi possivel iniciar uma nova conversa.');
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (trimmed.length < 3 || sending) return;

    setSending(true);
    setError(null);

    try {
      const response = await askGestanteChat(trimmed, activeThreadId);
      setActiveThreadId(response.threadId);
      setMessages((current) => [...current, response.userMessage, response.assistantMessage]);
      setThreads((current) => {
        const title = trimmed.length > 48 ? `${trimmed.slice(0, 45)}...` : trimmed;
        const existing = current.find((item) => item.id === response.threadId);
        const updated = {
          id: response.threadId,
          title: existing?.title && existing.messageCount > 0 ? existing.title : title,
          updatedAt: response.assistantMessage.createdAt,
          messageCount: (existing?.messageCount ?? 0) + 2,
        };
        return [updated, ...current.filter((item) => item.id !== response.threadId)];
      });
      setInput('');
    } catch {
      setError('Nao foi possivel enviar sua pergunta. Tente novamente.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={cn('flex h-full min-h-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white', className)}>
      {!compact && (
        <aside className="hidden w-64 shrink-0 border-r border-slate-100 bg-slate-50/80 p-3 md:block">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase text-slate-500">Conversas</p>
            <button
              type="button"
              onClick={handleNewThread}
              className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              Novo chat
            </button>
          </div>
          <div className="space-y-2">
            {threads.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                Inicie uma conversa.
              </p>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => handleSelectThread(thread.id)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2 text-left text-xs transition',
                    activeThreadId === thread.id
                      ? 'border-brand-200 bg-white text-brand-800 shadow-sm'
                      : 'border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white',
                  )}
                >
                  <span className="line-clamp-2 font-medium">{thread.title}</span>
                  <span className="mt-1 block text-[11px] text-slate-400">{thread.messageCount} mensagens</span>
                </button>
              ))
            )}
          </div>
        </aside>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {compact && (
        <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowThreadList((current) => !current)}
              className="flex min-w-0 flex-1 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 transition hover:border-slate-300"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">
                  {activeThread?.title || 'Nova conversa'}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {activeThread ? `${activeThread.messageCount} mensagens` : 'Sem mensagens ainda'}
                </p>
              </div>
              <svg
                className={cn('h-4 w-4 flex-shrink-0 text-slate-400 transition-transform', showThreadList && 'rotate-180')}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleNewThread}
              disabled={sending}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              Novo
            </button>
          </div>

          {showThreadList && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
              {threads.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500">
                  Inicie uma conversa.
                </p>
              ) : (
                <div className="space-y-2">
                  {threads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => handleSelectThread(thread.id)}
                      className={cn(
                        'w-full rounded-xl border px-3 py-2 text-left text-xs transition',
                        activeThreadId === thread.id
                          ? 'border-brand-200 bg-brand-50 text-brand-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                      )}
                    >
                      <span className="line-clamp-2 font-medium">{thread.title}</span>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {thread.messageCount} mensagens
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className={cn('min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,_rgba(248,250,252,0.82)_0%,_rgba(255,255,255,1)_100%)]', compact ? 'px-3 py-3' : 'px-4 py-5')}>
        {loading ? (
          <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-slate-500">
            <Spinner size="sm" label="Carregando conversa..." />
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-white/85 px-4 py-5 text-sm text-slate-500">
            <p className="font-semibold text-slate-800">Oi, {welcomeName}.</p>
            <p className="mt-2 leading-6">Pode mandar sua pergunta e eu te respondo com foco em orientacao para gestacao.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}

        {sending && (
          <div className="mt-4 flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
              <Spinner size="sm" label="Gerando..." />
              Gerando resposta...
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className={cn('shrink-0 border-t border-slate-100 bg-white', compact ? 'p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]' : 'p-4')}>
        {!compact && (
          <div className="mb-3 flex justify-end md:hidden">
            <button
              type="button"
              onClick={handleNewThread}
              className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              Novo chat
            </button>
          </div>
        )}
        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Digite sua mensagem..."
            className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={sending || input.trim().length < 3}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Enviar mensagem"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h14m0 0-4-4m4 4-4 4" />
            </svg>
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}

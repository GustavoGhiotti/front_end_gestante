import { useEffect, useMemo, useState } from 'react';
import { GestanteLayout } from '../../components/layout/GestanteLayout';
import { Badge } from '../../components/ui/Badge';
import { Card, CardBody } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';
import { getMedicamentosGestanteService, updateMedicamentoControleGestante } from '../../services/gestanteService';
import {
  enablePushNotifications,
  getNotificationPermission,
  getPushSupportStatus,
  isPushSupported,
  sendMedicationPushTest,
  sendPushTestNotification,
  syncPushSubscription,
} from '../../services/notifications';
import type { Medicamento } from '../../types/domain';

type MedicationControlState = {
  remindersEnabled: boolean;
  reminderTime?: string;
  takenToday: boolean;
  lastTakenAt?: string;
};

function MedicationIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  );
}

interface MedCardProps {
  med: Medicamento;
  control: MedicationControlState;
  onOpen: (med: Medicamento) => void;
  onQuickToggleTaken: (med: Medicamento) => void;
}

function MedCard({ med, control, onOpen, onQuickToggleTaken }: MedCardProps) {
  return (
      <article className="flex h-full items-start gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-md">
      <button
        type="button"
        onClick={() => onOpen(med)}
        className="flex min-w-0 flex-1 items-start gap-4 text-left"
        aria-label={`Abrir detalhes de ${med.nome}`}
      >
        <div className="flex-shrink-0 rounded-xl bg-brand-50 p-3 text-brand-700" aria-hidden="true">
          <MedicationIcon />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-900">{med.nome}</h3>
              <p className="mt-1 text-xs text-slate-400">
                {med.ativo ? 'Prescricao ativa do seu acompanhamento.' : 'Medicamento encerrado, mantido no historico.'}
              </p>
            </div>
            <Badge variant={med.ativo ? 'success' : 'neutral'}>
              {med.ativo ? 'Em uso' : 'Encerrado'}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <span className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">Dose:</span> {med.dosagem}
            </span>
            <span className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">Frequencia:</span> {med.frequencia}
            </span>
            {(med.dataPrescricao ?? med.dataInicio) && (
              <span className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">Desde:</span>{' '}
                {formatDate(med.dataPrescricao ?? med.dataInicio!)}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {control.remindersEnabled && <Badge variant="info">Lembrete ativo</Badge>}
            {control.takenToday && <Badge variant="success">Dose marcada hoje</Badge>}
            {!control.remindersEnabled && !control.takenToday && (
              <span className="text-xs font-medium text-slate-400">Toque para ver detalhes e ativar controle</span>
            )}
          </div>
        </div>
      </button>
      {med.ativo && (
        <button
          type="button"
          onClick={() => onQuickToggleTaken(med)}
          aria-pressed={control.takenToday}
          className={`ml-2 inline-flex flex-shrink-0 items-center rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
            control.takenToday
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'bg-slate-100 text-slate-700 hover:bg-brand-100 hover:text-brand-700'
          }`}
        >
          {control.takenToday ? 'Tomado hoje' : 'Marcar tomado'}
        </button>
      )}
    </article>
  );
}

interface DetailsModalProps {
  med: Medicamento;
  control: MedicationControlState;
  onClose: () => void;
  onToggleReminder: (checked: boolean) => void;
  onReminderTimeChange: (value: string) => void;
  onSendTest: () => void;
  notificationReady: boolean;
  testingNotification: boolean;
}

function MedicationDetailsModal({
  med,
  control,
  onClose,
  onToggleReminder,
  onReminderTimeChange,
  onSendTest,
  notificationReady,
  testingNotification,
}: DetailsModalProps) {
  const startedAt = med.dataPrescricao ?? med.dataInicio;

  return (
    <Modal isOpen onClose={onClose} title="Detalhes do medicamento" maxWidth="max-w-2xl">
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-brand-50 p-3 text-brand-700">
                <MedicationIcon />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{med.nome}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Acompanhe a prescricao e use os controles abaixo apenas se quiser organizar sua rotina.
                </p>
              </div>
            </div>
            <Badge variant={med.ativo ? 'success' : 'neutral'}>
              {med.ativo ? 'Em uso' : 'Encerrado'}
            </Badge>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dose</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{med.dosagem}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Frequencia</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{med.frequencia}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inicio</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{startedAt ? formatDate(startedAt) : 'Nao informado'}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Termino</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{med.dataFim ? formatDate(med.dataFim) : 'Sem data final'}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-800">Controle opcional da gestante</h4>
            <p className="mt-1 text-sm text-slate-500">
              Esses marcadores sao pessoais e servem para voce acompanhar melhor a rotina. Nao alteram a prescricao medica.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start justify-between gap-4 rounded-xl border border-white/80 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Quero receber lembrete deste remedio</p>
                <p className="mt-1 text-xs text-slate-500">
                  Ative se quiser visualizar esse remedio como prioridade no seu controle diario.
                </p>
              </div>
              <input
                type="checkbox"
                checked={control.remindersEnabled}
                onChange={(event) => onToggleReminder(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </label>
            <label className="flex items-start justify-between gap-4 rounded-xl border border-white/80 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Horario do lembrete</p>
                <p className="mt-1 text-xs text-slate-500">
                  Quando o backend estiver online, esse horario pode disparar notificacao neste dispositivo.
                </p>
              </div>
              <input
                type="time"
                value={control.reminderTime ?? ''}
                onChange={(event) => onReminderTimeChange(event.target.value)}
                disabled={!control.remindersEnabled}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-700 disabled:bg-slate-100"
              />
            </label>
            <button
              type="button"
              onClick={onSendTest}
              disabled={!notificationReady || testingNotification}
              className="w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-left text-sm text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {testingNotification ? 'Enviando teste...' : 'Enviar notificacao de teste para este medicamento'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-800">Orientacao importante</h4>
          <p className="mt-2 text-sm text-slate-500">
            Em caso de duvida, efeito adverso ou dificuldade para manter o uso, fale com seu medico antes de interromper ou mudar a dose.
          </p>
        </section>
      </div>
    </Modal>
  );
}

export function GestanteMedicamentos() {
  const { user } = useAuth();
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMed, setSelectedMed] = useState<Medicamento | null>(null);
  const [controls, setControls] = useState<Record<string, MedicationControlState>>({});
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(getNotificationPermission());
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [testingNotification, setTestingNotification] = useState(false);
  const pushSupportStatus = getPushSupportStatus();

  function loadMeds() {
    if (!user) return;
    setLoading(true);
    setError(null);

    getMedicamentosGestanteService(user.id)
      .then(setMedicamentos)
      .catch(() => setError('Nao foi possivel carregar os medicamentos. Tente novamente.'))
      .finally(() => setLoading(false));
  }

  useEffect(loadMeds, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const nextControls: Record<string, MedicationControlState> = {};
    for (const med of medicamentos) {
      nextControls[med.id] = {
        remindersEnabled: med.lembreteAtivo ?? false,
        reminderTime: med.horarioLembrete,
        takenToday: med.tomadoHoje ?? false,
        lastTakenAt: med.tomadoHojeEm,
      };
    }
    setControls(nextControls);
  }, [medicamentos]);

  async function updateMedicationControl(medId: string, nextState: MedicationControlState) {
    const saved = await updateMedicamentoControleGestante(medId, {
      lembreteAtivo: nextState.remindersEnabled,
      horarioLembrete: nextState.reminderTime,
      tomadoHoje: nextState.takenToday,
    });
    setControls((current) => ({
      ...current,
      [medId]: {
        remindersEnabled: saved.lembreteAtivo,
        takenToday: saved.tomadoHoje,
        lastTakenAt: saved.tomadoHojeEm,
      },
    }));
    setMedicamentos((current) => current.map((med) => (
      med.id === medId
        ? {
            ...med,
            lembreteAtivo: saved.lembreteAtivo,
            horarioLembrete: saved.horarioLembrete,
            tomadoHoje: saved.tomadoHoje,
            tomadoHojeEm: saved.tomadoHojeEm,
          }
        : med
    )));
  }

  async function handleQuickToggleTaken(med: Medicamento) {
    const current = controls[med.id] ?? { remindersEnabled: false, takenToday: false };
    await updateMedicationControl(med.id, {
      ...current,
      takenToday: !current.takenToday,
    });
  }

  async function handleEnableNotifications() {
    try {
      const granted = await enablePushNotifications();
      const nextPermission = getNotificationPermission();
      setNotificationPermission(nextPermission);

      if (granted) {
        setNotificationMessage('Notificacoes habilitadas neste dispositivo.');
        return;
      }

      if (nextPermission === 'granted') {
        setNotificationMessage('A permissao foi concedida, mas a assinatura push nao foi registrada. Verifique se o backend esta acessivel neste dispositivo.');
        return;
      }

      setNotificationMessage('Permissao de notificacao nao concedida.');
    } catch {
      setNotificationPermission(getNotificationPermission());
      setNotificationMessage('Nao foi possivel registrar este dispositivo para notificacoes. Verifique a conexao com o backend.');
    }
  }

  async function handleSendGeneralTest() {
    setTestingNotification(true);
    try {
      await syncPushSubscription({ forceRefresh: true });
      const result = await sendPushTestNotification();
      setNotificationMessage(result.detail);
    } catch {
      setNotificationMessage('Falha ao enviar o teste. Este dispositivo pode estar sem assinatura push valida.');
    } finally {
      setTestingNotification(false);
    }
  }

  async function handleSendMedicationTest(med: Medicamento) {
    setTestingNotification(true);
    try {
      await syncPushSubscription({ forceRefresh: true });
      const result = await sendMedicationPushTest(med.id);
      setNotificationMessage(result.detail);
    } catch {
      setNotificationMessage('Falha ao enviar o teste do medicamento. Este dispositivo pode estar sem assinatura push valida.');
    } finally {
      setTestingNotification(false);
    }
  }

  const ativos = useMemo(() => medicamentos.filter((med) => med.ativo), [medicamentos]);
  const historico = useMemo(() => medicamentos.filter((med) => !med.ativo), [medicamentos]);
  const remindersCount = useMemo(
    () => ativos.filter((med) => controls[med.id]?.remindersEnabled).length,
    [ativos, controls],
  );
  const takenTodayCount = useMemo(
    () => ativos.filter((med) => controls[med.id]?.takenToday).length,
    [ativos, controls],
  );

  const selectedControl = selectedMed
    ? controls[selectedMed.id] ?? { remindersEnabled: false, takenToday: false }
    : { remindersEnabled: false, takenToday: false };
  const notificationReady = notificationPermission === 'granted';

  return (
    <GestanteLayout>
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 px-6 py-3 backdrop-blur">
        <h1 className="text-base font-semibold text-slate-900">Medicamentos</h1>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Meus medicamentos</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Visualize detalhes da prescricao e, se quiser, ative um controle pessoal de uso.
          </p>
        </div>

        {loading ? (
          <PageSpinner label="Carregando medicamentos..." />
        ) : error ? (
          <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <span>{error}</span>
            <button type="button" onClick={loadMeds} className="ml-4 text-xs font-semibold underline">
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-500">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <span>As prescricoes sao definidas pelo seu medico. Os lembretes e marcacoes abaixo sao opcionais e servem apenas para sua organizacao pessoal.</span>
              </div>
              <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Notificacoes neste dispositivo</p>
                <p className="mt-1 text-sm text-slate-500">
                  Status atual: {notificationPermission === 'unsupported' ? 'nao suportado neste navegador' : notificationPermission}.
                </p>
                {pushSupportStatus === 'insecure_context' ? (
                  <p className="mt-2 text-xs text-amber-700">
                    No celular, notificacoes web exigem acesso seguro por HTTPS ou ambiente equivalente de app instalado.
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {isPushSupported() && notificationPermission !== 'granted' ? (
                    <button type="button" onClick={handleEnableNotifications} className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700">
                      Ativar notificacoes
                    </button>
                  ) : null}
                  {notificationPermission === 'granted' ? (
                    <button type="button" onClick={handleSendGeneralTest} className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100">
                      Enviar teste geral
                    </button>
                  ) : null}
                </div>
                {notificationMessage ? <p className="mt-3 text-xs text-slate-500">{notificationMessage}</p> : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-card">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lembretes ativos</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{remindersCount}</p>
                  <p className="mt-1 text-xs text-slate-400">Medicamentos com controle ativado.</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-card">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Doses marcadas hoje</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{takenTodayCount}</p>
                  <p className="mt-1 text-xs text-slate-400">Somente dos medicamentos em uso.</p>
                </div>
              </div>
            </section>

            <section aria-label="Medicamentos em uso" className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">
                Em uso
                <span className="ml-2 text-sm font-normal text-slate-400">({ativos.length})</span>
              </h2>
              {ativos.length === 0 ? (
                <Card>
                  <CardBody className="py-12 text-center text-slate-400">
                    <p className="text-sm">Nenhum medicamento ativo no momento.</p>
                  </CardBody>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {ativos.map((med) => (
                    <MedCard
                      key={med.id}
                      med={med}
                      control={controls[med.id] ?? { remindersEnabled: false, takenToday: false }}
                      onOpen={setSelectedMed}
                      onQuickToggleTaken={handleQuickToggleTaken}
                    />
                  ))}
                </div>
              )}
            </section>

            {historico.length > 0 && (
              <section aria-label="Historico de medicamentos">
                <h2 className="mb-4 text-lg font-semibold text-slate-800">
                  Historico
                  <span className="ml-2 text-sm font-normal text-slate-400">({historico.length})</span>
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {historico.map((med) => (
                    <MedCard
                      key={med.id}
                      med={med}
                      control={controls[med.id] ?? { remindersEnabled: false, takenToday: false }}
                      onOpen={setSelectedMed}
                      onQuickToggleTaken={handleQuickToggleTaken}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {selectedMed && (
        <MedicationDetailsModal
          med={selectedMed}
          control={selectedControl}
          onClose={() => setSelectedMed(null)}
          onToggleReminder={(checked) =>
            updateMedicationControl(selectedMed.id, {
              ...selectedControl,
              remindersEnabled: checked,
            })
          }
          onReminderTimeChange={(value) =>
            updateMedicationControl(selectedMed.id, {
              ...selectedControl,
              reminderTime: value,
            })
          }
          onSendTest={() => handleSendMedicationTest(selectedMed)}
          notificationReady={notificationReady}
          testingNotification={testingNotification}
        />
      )}
    </GestanteLayout>
  );
}

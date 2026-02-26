import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mockLogin, AuthError } from '../lib/auth';
import { ProfileToggle } from '../components/auth/ProfileToggle';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { UserRole } from '../types/domain';
import { cn } from '../lib/utils';

// ─── Ícones ───────────────────────────────────────────────────────────────────
function IconEye({ className }: { className?: string }) {
  return (
    <svg className={cn('w-[18px] h-[18px]', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconEyeOff({ className }: { className?: string }) {
  return (
    <svg className={cn('w-[18px] h-[18px]', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

// ─── Feature bullets (painel esquerdo desktop) ────────────────────────────────
const FEATURES = [
  'Monitoramento de sinais vitais em tempo real',
  'Alertas clínicos inteligentes com triagem automática',
  'Comunicação segura entre médico e gestante',
];

// ─── Validação ────────────────────────────────────────────────────────────────
interface FormErrors {
  email?: string;
  senha?: string;
}

function validateEmail(v: string): string | undefined {
  if (!v.trim()) return 'Informe seu e-mail';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Informe um e-mail válido';
}

function validateSenha(v: string): string | undefined {
  if (!v) return 'Informe sua senha';
  if (v.length < 6) return 'A senha deve ter no mínimo 6 caracteres';
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function Login() {
  const navigate   = useNavigate();
  const { setUser } = useAuth();

  const [perfil,    setPerfil]    = useState<UserRole>('medico');
  const [email,     setEmail]     = useState('');
  const [senha,     setSenha]     = useState('');
  const [lembrar,   setLembrar]   = useState(false);
  const [showPwd,   setShowPwd]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [erro,      setErro]      = useState<string | null>(null);
  const [errors,    setErrors]    = useState<FormErrors>({});
  const [forgotMsg, setForgotMsg] = useState(false);

  function handleEmailChange(v: string) {
    setEmail(v);
    if (errors.email) setErrors(e => ({ ...e, email: undefined }));
    if (erro) setErro(null);
  }
  function handleSenhaChange(v: string) {
    setSenha(v);
    if (errors.senha) setErrors(e => ({ ...e, senha: undefined }));
    if (erro) setErro(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setForgotMsg(false);

    const emailErr = validateEmail(email);
    const senhaErr = validateSenha(senha);
    if (emailErr || senhaErr) {
      setErrors({ email: emailErr, senha: senhaErr });
      return;
    }

    setErro(null);
    setLoading(true);

    try {
      const user = await mockLogin(email, senha, perfil);
      setUser(user);
      navigate(user.role === 'medico' ? '/doctor' : '/gestante/dashboard');
    } catch (err) {
      setErro(err instanceof AuthError ? err.message : 'Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    setForgotMsg(true);
    setTimeout(() => setForgotMsg(false), 4000);
  }

  return (
    <>
      {/* Skip link acessibilidade */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-brand-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Ir para o conteúdo principal
      </a>

      <div className="flex min-h-screen font-sans">

        {/* ── Painel esquerdo: branding (apenas desktop) ─────────────────────── */}
        <aside
          className="hidden lg:flex lg:w-5/12 xl:w-[420px] flex-shrink-0 flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-700 to-brand-900 p-10 xl:p-14"
          aria-hidden="true"
        >
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none">GestaCare</p>
                <p className="text-brand-200 text-xs mt-0.5">Sistema de Monitoramento</p>
              </div>
            </div>

            <h2 className="text-white text-3xl font-bold leading-snug mb-4">
              Monitoramento inteligente para uma gestação mais segura.
            </h2>
            <p className="text-brand-200 text-base leading-relaxed mb-10">
              Tecnologia a serviço da saúde materna — acompanhamento contínuo, alertas precisos e comunicação segura.
            </p>

            <ul className="space-y-4">
              {FEATURES.map(f => (
                <li key={f} className="flex items-start gap-3 text-brand-100 text-sm leading-relaxed">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-brand-400 text-xs">
            TCC 2026 · Universidade São Caetano do Sul
          </p>
        </aside>

        {/* ── Painel direito: formulário ─────────────────────────────────────── */}
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center bg-slate-100 px-5 py-10"
        >
          <div className="w-full max-w-[420px]">

            {/* Logo (somente mobile) */}
            <div className="lg:hidden flex flex-col items-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center mb-3 shadow-card-md">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              </div>
              <p className="text-slate-800 font-bold text-xl leading-none">GestaCare</p>
              <p className="text-slate-400 text-xs mt-1">Sistema de Monitoramento</p>
            </div>

            {/* ── Card branco com o formulário ── */}
            <div className="bg-white rounded-2xl shadow-modal border border-slate-200/60 px-8 py-8">

              {/* Cabeçalho */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                  Acesse sua conta
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Selecione seu perfil e faça login para continuar.
                </p>
              </div>

              {/* Seletor de perfil */}
              <ProfileToggle
                value={perfil}
                onChange={v => { setPerfil(v); setErro(null); }}
                className="mb-6"
              />

              {/* Hint de credenciais (demo) */}
              <div className="mb-5 px-3 py-2.5 bg-brand-50 border border-brand-200 rounded-lg text-xs text-brand-700">
                <span className="font-semibold">Demo:</span>
                {perfil === 'medico'
                  ? ' doctor@gestacare.com · senha: 123456'
                  : ' patient@gestacare.com · senha: 123456'}
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} noValidate aria-label="Formulário de login">

                {/* Campo: e-mail */}
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    E-mail
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={perfil === 'medico' ? 'doctor@gestacare.com' : 'patient@gestacare.com'}
                    value={email}
                    onChange={e => handleEmailChange(e.target.value)}
                    onBlur={() => {
                      const err = validateEmail(email);
                      if (err) setErrors(e => ({ ...e, email: err }));
                    }}
                    error={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    aria-invalid={!!errors.email}
                    disabled={loading}
                  />
                  {errors.email && (
                    <p id="email-error" role="alert" aria-live="polite" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Campo: senha */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="senha" className="text-sm font-medium text-slate-700">
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 rounded"
                    >
                      Esqueci minha senha
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      id="senha"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••"
                      value={senha}
                      onChange={e => handleSenhaChange(e.target.value)}
                      onBlur={() => {
                        const err = validateSenha(senha);
                        if (err) setErrors(e => ({ ...e, senha: err }));
                      }}
                      error={!!errors.senha}
                      aria-describedby={errors.senha ? 'senha-error' : undefined}
                      aria-invalid={!!errors.senha}
                      className="pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(p => !p)}
                      aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                    >
                      {showPwd ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>

                  {errors.senha && (
                    <p id="senha-error" role="alert" aria-live="polite" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      {errors.senha}
                    </p>
                  )}
                </div>

                {/* Lembrar-me */}
                <div className="flex items-center gap-2 mb-5">
                  <input
                    id="lembrar"
                    type="checkbox"
                    checked={lembrar}
                    onChange={e => setLembrar(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
                  />
                  <label htmlFor="lembrar" className="text-sm text-slate-600 select-none cursor-pointer">
                    Lembrar-me neste dispositivo
                  </label>
                </div>

                {/* Alert: recuperar senha */}
                {forgotMsg && (
                  <div role="status" aria-live="polite" className="mb-4 flex items-start gap-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 text-sm">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                    </svg>
                    Funcionalidade de recuperação de senha em breve.
                  </div>
                )}

                {/* Alert: erro de login */}
                {erro && (
                  <div role="alert" aria-live="assertive" className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    {erro}
                  </div>
                )}

                {/* Botão Entrar */}
                <Button type="submit" variant="brand" size="lg" disabled={loading} className="w-full mt-1">
                  {loading && <Spinner size="sm" />}
                  {loading ? 'Entrando…' : 'Entrar'}
                </Button>
              </form>
            </div>

            {/* Rodapé */}
            <p className="mt-6 text-center text-xs text-slate-400">
              Sistema de Monitoramento de Gestantes · TCC 2026 · USCS
            </p>
          </div>
        </main>
      </div>
    </>
  );
}

export default Login;

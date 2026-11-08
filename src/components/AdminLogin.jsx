import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AdminLogin({ onBack, onSuccess }) {
  const { loginAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await loginAdmin(email, password);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    onSuccess();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-100 via-[#fbf8f2] to-[#efe5dc] px-4 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-xl shadow-stone-900/10">
        <div className="bg-primary px-6 py-8 text-white sm:px-8">
          <button type="button" onClick={onBack} className="mb-7 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Voltar ao site
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12"><ShieldCheck className="h-6 w-6" /></span>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/65">Salencar</p><h1 className="mt-0.5 text-xl font-bold">Painel administrativo</h1></div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/75">Entre com a conta autorizada no Supabase para gerenciar a operação.</p>
        </div>

        <form onSubmit={submit} className="space-y-5 px-6 py-7 sm:px-8 sm:py-8">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-stone-700">E-mail</span>
            <span className="relative block"><Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-sm text-stone-800 outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10" placeholder="seu@email.com" /></span>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-stone-700">Senha</span>
            <span className="relative block"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-12 text-sm text-stone-800 outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10" placeholder="Sua senha" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"><span className="sr-only">{showPassword ? 'Ocultar senha' : 'Mostrar senha'}</span>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span>
          </label>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-800">{error}</p>}
          <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-wait disabled:opacity-60">{busy ? 'Verificando acesso…' : <><ShieldCheck className="h-4 w-4" />Entrar no painel</>}</button>
          <p className="text-center text-[11px] leading-relaxed text-stone-400">A autorização administrativa é validada pelo Supabase e protegida pelas políticas do banco.</p>
        </form>
      </section>
    </main>
  );
}

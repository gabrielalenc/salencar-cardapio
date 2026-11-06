import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, LockKeyhole, LogIn, LogOut, Mail, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

const inputClass = 'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-primary/50 focus:ring-2 focus:ring-primary/10';

export function AccountModal({ isOpen, onClose, onOpenAdminPanel, initialMode = 'login' }) {
  const { currentUser, users, orders, login, register, logout } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(currentUser?.role === 'customer' ? 'profile' : initialMode);
      setForm({ name: '', email: '', password: '' });
      setError('');
      setNotice('');
    }
  }, [isOpen, currentUser?.id, currentUser?.role, initialMode]);

  const customerOrders = useMemo(() => currentUser?.role === 'customer'
    ? orders.filter((order) => order.customerId === currentUser.id)
    : [], [orders, currentUser]);

  if (!isOpen) return null;

  const submit = (event) => {
    event.preventDefault();
    setError('');
    if (mode === 'register') {
      if (form.name.trim().length < 2) return setError('Informe seu nome completo.');
      if (form.password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
      const result = register(form);
      if (!result.ok) return setError(result.error);
      setNotice('Conta criada. Você já está conectado.');
      return onClose();
    }
    const result = login(form.email, form.password, mode === 'admin' ? 'admin' : 'customer');
    if (!result.ok) return setError(result.error);
    if (mode === 'admin') {
      onClose();
      onOpenAdminPanel();
    } else {
      setMode('profile');
      setNotice('Login realizado com sucesso.');
      setForm({ name: '', email: '', password: '' });
    }
  };

  const handleLogout = () => {
    logout();
    setMode('login');
    setNotice('Você saiu da sua conta.');
    setError('');
  };

  const setField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-stone-950/55 p-3 backdrop-blur-sm" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="account-title" className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-elevated" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Salencar</p>
            <h2 id="account-title" className="mt-0.5 text-lg font-bold text-stone-900">
              {mode === 'profile' ? 'Minha conta' : mode === 'register' ? 'Criar conta' : mode === 'admin' ? 'Acesso administrativo' : 'Acesse sua conta'}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </header>

        <div className="p-5 sm:p-6">
          {mode === 'profile' && currentUser?.role === 'customer' ? (
            <div className="space-y-5">
              <div className="rounded-xl bg-surface-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white"><UserRound className="h-5 w-5" /></span>
                  <div className="min-w-0"><p className="truncate font-semibold text-stone-900">{currentUser.name}</p><p className="truncate text-xs text-stone-500">{currentUser.email}</p></div>
                </div>
                <p className="mt-3 border-t border-stone-200 pt-3 text-xs text-stone-600">WhatsApp: {users.find((user) => user.id === currentUser.id)?.phone || currentUser.phone || 'Adicione no seu próximo pedido'}</p>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold text-stone-900">Meus pedidos</h3><span className="text-xs text-stone-500">{customerOrders.length}</span></div>
                {customerOrders.length ? <div className="max-h-52 space-y-2 overflow-y-auto">{customerOrders.slice(0, 8).map((order) => <div key={order.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-100 p-3"><div><p className="text-xs font-semibold text-stone-800">{order.id}</p><p className="text-[11px] text-stone-500">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p></div><span className="text-xs font-semibold text-primary">{formatCurrency(order.total)}</span></div>)}</div> : <p className="rounded-lg bg-stone-50 p-3 text-xs text-stone-500">Seus pedidos aparecerão aqui após a primeira compra.</p>}
              </div>
              {notice && <p role="status" className="text-xs text-primary">{notice}</p>}
              <button type="button" onClick={handleLogout} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"><LogOut className="h-4 w-4" />Sair da conta</button>
              <p className="text-center text-[10px] text-stone-400">Conta demonstrativa salva neste navegador.</p>
            </div>
          ) : (
            <>
              <div className="mb-5 grid grid-cols-2 rounded-xl bg-stone-100 p-1">
                <button type="button" onClick={() => { setMode('login'); setError(''); }} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${mode !== 'admin' ? 'bg-white text-primary shadow-subtle' : 'text-stone-500'}`}>Cliente</button>
                <button type="button" onClick={() => { setMode('admin'); setError(''); }} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${mode === 'admin' ? 'bg-white text-primary shadow-subtle' : 'text-stone-500'}`}>Administrador</button>
              </div>

              <form onSubmit={submit} className="space-y-3.5">
                {mode === 'register' && <label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Nome completo</span><input autoComplete="name" required value={form.name} onChange={(event) => setField('name', event.target.value)} className={inputClass} placeholder="Seu nome" /></label>}
                <label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">E-mail</span><span className="relative block"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input type="email" autoComplete="email" required value={form.email} onChange={(event) => setField('email', event.target.value)} className={`${inputClass} pl-10`} placeholder="voce@email.com" /></span></label>
                <label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Senha</span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required value={form.password} onChange={(event) => setField('password', event.target.value)} className={`${inputClass} pl-10`} placeholder={mode === 'register' ? 'Mínimo de 6 caracteres' : 'Sua senha'} /></span></label>
                {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
                {notice && <p role="status" className="inline-flex items-center gap-1.5 text-xs text-primary"><CheckCircle2 className="h-4 w-4" />{notice}</p>}
                <button type="submit" className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"><LogIn className="h-4 w-4" />{mode === 'register' ? 'Criar conta' : 'Entrar'}</button>
              </form>

              {mode === 'admin' ? (
                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">Acesso de demonstração. As credenciais administrativas estão definidas em `src/config/adminConfig.js`.</p>
              ) : (
                <p className="mt-4 text-center text-xs text-stone-500">{mode === 'register' ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}<button type="button" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }} className="font-semibold text-primary hover:underline">{mode === 'register' ? 'Fazer login' : 'Cadastre-se'}</button></p>
              )}
              <p className="mt-4 text-center text-[10px] text-stone-400">Demonstração local: os dados ficam salvos apenas neste navegador.</p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

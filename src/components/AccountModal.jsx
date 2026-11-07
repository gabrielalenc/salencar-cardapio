import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ContactRound, History, LockKeyhole, LogIn, LogOut, Mail, Settings2, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { CUSTOMER_ORDER_STATUS, getCustomerOrders } from '../utils/orders';

const inputClass = 'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-primary/50 focus:ring-2 focus:ring-primary/10';
export function AccountModal({ isOpen, onClose, onOpenAdminPanel, initialMode = 'login' }) {
  const { currentUser, users, orders, login, register, logout, updateCustomerProfile, changeCustomerPassword } = useAuth();
  const [mode, setMode] = useState('login');
  const [view, setView] = useState('account');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', address: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const userRecord = users.find((user) => user.id === currentUser?.id);

  useEffect(() => {
    if (!isOpen) return;
    setMode(currentUser?.role === 'customer' ? 'profile' : initialMode);
    setView('account');
    setForm({ name: '', email: '', password: '' });
    setProfile({ name: currentUser?.name || '', email: currentUser?.email || '', phone: userRecord?.phone || currentUser?.phone || '', address: userRecord?.address || currentUser?.address || '' });
    setPasswordForm({ current: '', next: '' });
    setError('');
    setNotice('');
  }, [isOpen, currentUser?.id, currentUser?.role, initialMode]);

  const customerOrders = useMemo(() => getCustomerOrders(orders, currentUser), [orders, currentUser]);

  if (!isOpen) return null;

  const submit = (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (mode === 'register') {
      if (form.name.trim().length < 2) return setError('Informe seu nome completo.');
      if (form.password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
      const result = register(form);
      if (!result.ok) return setError(result.error);
      onClose();
      return;
    }
    const result = login(form.email, form.password);
    if (!result.ok) return setError(result.error);
    if (result.user.role === 'admin') {
      onClose();
      onOpenAdminPanel();
      return;
    }
    setMode('profile');
    setView('account');
    setNotice('Login realizado com sucesso.');
    setForm({ name: '', email: '', password: '' });
  };

  const handleLogout = () => {
    if (!window.confirm('Deseja sair da sua conta?')) return;
    logout();
    setMode('login');
    setView('account');
    setNotice('Você saiu da sua conta.');
    setError('');
  };

  const saveProfile = (event) => {
    event.preventDefault();
    setError('');
    const result = updateCustomerProfile(profile);
    if (!result.ok) return setError(result.error);
    setNotice('Seus dados foram atualizados neste navegador.');
  };

  const savePassword = (event) => {
    event.preventDefault();
    setError('');
    if (passwordForm.next.length < 6) return setError('A nova senha deve ter pelo menos 6 caracteres.');
    const result = changeCustomerPassword(passwordForm.current, passwordForm.next);
    if (!result.ok) return setError(result.error);
    setPasswordForm({ current: '', next: '' });
    setNotice('Senha atualizada neste navegador.');
  };

  const setField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  const setProfileField = (field, value) => setProfile((previous) => ({ ...previous, [field]: value }));
  const menu = [
    ['account', 'Minha conta', UserRound], ['data', 'Meus dados', ContactRound],
    ['settings', 'Configurações', Settings2], ['history', 'Histórico de pedidos', History],
  ];

  return <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-stone-950/55 p-3 backdrop-blur-sm" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="account-title" className="my-auto max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-elevated" onClick={(event) => event.stopPropagation()}>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-100 bg-white px-5 py-4">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Salencar</p><h2 id="account-title" className="mt-0.5 text-lg font-bold text-stone-900">{mode === 'profile' ? 'Conta do cliente' : mode === 'register' ? 'Criar conta' : 'Acesse sua conta'}</h2></div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="min-h-10 min-w-10 rounded-full p-2 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button>
      </header>

      <div className="p-4 sm:p-6">
        {mode === 'profile' && currentUser?.role === 'customer' ? <div className="space-y-5">
          <nav aria-label="Opções da conta" className="grid grid-cols-2 gap-2 sm:grid-cols-4">{menu.map(([id, label, Icon]) => <button key={id} type="button" onClick={() => { setView(id); setError(''); setNotice(''); }} aria-current={view === id ? 'page' : undefined} className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold sm:text-xs ${view === id ? 'bg-primary-light text-primary' : 'border border-stone-200 text-stone-600 hover:bg-stone-50'}`}><Icon className="h-4 w-4 shrink-0" />{label}</button>)}</nav>
          {view === 'account' && <section className="rounded-2xl bg-surface-50 p-5"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white"><UserRound className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate text-base font-bold text-stone-900">{currentUser.name}</p><p className="truncate text-xs text-stone-500">{currentUser.email}</p></div></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-stone-200 pt-4 text-xs"><span className="text-stone-500">Telefone</span><span className="text-right text-stone-700">{userRecord?.phone || currentUser.phone || 'Não informado'}</span><span className="text-stone-500">Pedidos registrados</span><span className="text-right font-semibold text-stone-900">{customerOrders.length}</span></div></section>}
          {view === 'data' && <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-stone-200 p-4 sm:p-5"><div><h3 className="text-sm font-bold text-stone-900">Meus dados</h3><p className="mt-1 text-xs text-stone-500">Atualize as informações usadas nos próximos pedidos.</p></div><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Nome</span><input required minLength={2} autoComplete="name" value={profile.name} onChange={(event) => setProfileField('name', event.target.value)} className={inputClass} /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">E-mail</span><input required type="email" autoComplete="email" value={profile.email} onChange={(event) => setProfileField('email', event.target.value)} className={inputClass} /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Telefone</span><input type="tel" autoComplete="tel" value={profile.phone} onChange={(event) => setProfileField('phone', event.target.value)} className={inputClass} /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Endereço (opcional)</span><textarea rows={2} autoComplete="street-address" value={profile.address} onChange={(event) => setProfileField('address', event.target.value)} className={inputClass} /></label><button type="submit" className="min-h-11 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">Salvar meus dados</button></form>}
          {view === 'settings' && <form onSubmit={savePassword} className="space-y-4 rounded-2xl border border-stone-200 p-4 sm:p-5"><div><h3 className="text-sm font-bold text-stone-900">Configurações da conta</h3><p className="mt-1 text-xs text-stone-500">Altere a senha usada para entrar na sua conta.</p></div><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Senha atual</span><input required type="password" autoComplete="current-password" value={passwordForm.current} onChange={(event) => setPasswordForm((previous) => ({ ...previous, current: event.target.value }))} className={inputClass} /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Nova senha</span><input required minLength={6} type="password" autoComplete="new-password" value={passwordForm.next} onChange={(event) => setPasswordForm((previous) => ({ ...previous, next: event.target.value }))} className={inputClass} /></label><button type="submit" className="min-h-11 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">Atualizar senha</button></form>}
          {view === 'history' && <section className="space-y-3"><div><h3 className="text-sm font-bold text-stone-900">Histórico de pedidos</h3><p className="mt-1 text-xs text-stone-500">Pedidos anteriores desta conta.</p></div>{customerOrders.length ? customerOrders.map((order) => <article key={order.id || order.createdAt} className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-stone-200 p-3"><div className="min-w-0"><p className="break-all text-xs font-bold text-stone-800">{order.id || 'Pedido'}</p><p className="mt-1 text-[11px] text-stone-500">{order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</p><p className="mt-1 text-[11px] font-medium text-stone-600">{CUSTOMER_ORDER_STATUS[order.status] || 'Status atualizado'}</p></div><span className="shrink-0 text-xs font-semibold text-primary">{formatCurrency(order.total)}</span></article>) : <p className="rounded-xl bg-stone-50 p-4 text-xs text-stone-500">Você ainda não realizou pedidos.</p>}</section>}
          {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p>}
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <button type="button" onClick={handleLogout} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"><LogOut className="h-4 w-4" />Sair da conta</button>
        </div> : <div className="mx-auto max-w-md">
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-stone-100 p-1"><button type="button" onClick={() => { setMode('login'); setError(''); }} className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'login' ? 'bg-white text-primary shadow-subtle' : 'text-stone-500'}`}>Login</button><button type="button" onClick={() => { setMode('register'); setError(''); }} className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'register' ? 'bg-white text-primary shadow-subtle' : 'text-stone-500'}`}>Registro</button></div>
          <form onSubmit={submit} className="space-y-3.5">{mode === 'register' && <label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Nome completo</span><input autoComplete="name" required value={form.name} onChange={(event) => setField('name', event.target.value)} className={inputClass} placeholder="Seu nome" /></label>}<label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">E-mail</span><span className="relative block"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input type="email" autoComplete="email" required value={form.email} onChange={(event) => setField('email', event.target.value)} className={`${inputClass} pl-10`} placeholder="voce@email.com" /></span></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Senha</span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required value={form.password} onChange={(event) => setField('password', event.target.value)} className={`${inputClass} pl-10`} placeholder={mode === 'register' ? 'Mínimo de 6 caracteres' : 'Sua senha'} /></span></label>{error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}{notice && <p role="status" className="inline-flex items-center gap-1.5 text-xs text-primary"><CheckCircle2 className="h-4 w-4" />{notice}</p>}<button type="submit" className="mt-1 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover"><LogIn className="h-4 w-4" />{mode === 'register' ? 'Criar conta' : 'Entrar'}</button></form>
          <p className="mt-4 text-center text-xs text-stone-500">{mode === 'register' ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}<button type="button" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }} className="font-semibold text-primary hover:underline">{mode === 'register' ? 'Fazer login' : 'Cadastre-se'}</button></p><p className="mt-4 text-center text-[10px] text-stone-400">Demonstração local: os dados ficam salvos apenas neste navegador.</p>
        </div>}
      </div>
    </section>
  </div>;
}

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ContactRound, History, LockKeyhole, LogIn, LogOut, Mail, Settings2, UserRound, X, Trash2, Plus, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { CUSTOMER_ORDER_STATUS, getCustomerOrders } from '../utils/orders';

const inputClass = 'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-primary/50 focus:ring-2 focus:ring-primary/10';
export function AccountModal({ isOpen, onClose, onOpenAdminPanel, initialMode = 'login' }) {
  const { currentUser, users, orders, addresses, login, register, loginWithGoogle, resetPassword, logout, updateCustomerProfile, changeCustomerPassword, saveAddress, deleteAddress } = useAuth();
  const [mode, setMode] = useState('login');
  const [view, setView] = useState('account');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', address: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [addressDraft, setAddressDraft] = useState(null);
  const userRecord = users.find((user) => user.id === currentUser?.id);

  useEffect(() => {
    if (!isOpen) return;
    setMode(currentUser?.role === 'customer' ? 'profile' : initialMode);
    setView(initialMode === 'password-reset' ? 'settings' : 'account');
    setForm({ name: '', email: '', password: '' });
    setProfile({ name: currentUser?.name || '', email: currentUser?.email || '', phone: userRecord?.phone || currentUser?.phone || '', address: userRecord?.address || currentUser?.address || '' });
    setPasswordForm({ current: '', next: '' });
    setError('');
    setNotice('');
  }, [isOpen, currentUser?.id, currentUser?.role, initialMode]);

  const customerOrders = useMemo(() => getCustomerOrders(orders, currentUser), [orders, currentUser]);

  if (!isOpen) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    if (mode === 'register') {
      if (form.name.trim().length < 2) { setError('Informe seu nome completo.'); setBusy(false); return; }
      if (form.password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); setBusy(false); return; }
      const result = await register(form);
      if (!result.ok) { setError(result.error); setBusy(false); return; }
      if (result.confirmationRequired) { setNotice('Conta criada. Confirme seu e-mail pelo link enviado antes de entrar.'); setMode('login'); setForm((previous) => ({ ...previous, password: '' })); setBusy(false); return; }
      onClose(); setBusy(false); return;
    }
    if (mode === 'recovery') {
      const result = await resetPassword(form.email);
      if (!result.ok) setError(result.error); else setNotice('Enviamos um link de recuperação para seu e-mail.');
      setBusy(false); return;
    }
    const result = await login(form.email, form.password);
    if (!result.ok) { setError(result.error); setBusy(false); return; }
    if (result.user.role === 'admin') {
      onClose();
      onOpenAdminPanel();
      setBusy(false);
      return;
    }
    setMode('profile');
    setView('account');
    setNotice('Login realizado com sucesso.');
    setForm({ name: '', email: '', password: '' });
    setBusy(false);
  };

  const handleGoogleLogin = async () => {
    setError(''); setBusy(true);
    const result = await loginWithGoogle();
    if (!result.ok) { setError(result.error); setBusy(false); }
  };

  const handleLogout = async () => {
    if (!window.confirm('Deseja sair da sua conta?')) return;
    const result = await logout();
    if (!result.ok) { setError(result.error); return; }
    setMode('login');
    setView('account');
    setNotice('Você saiu da sua conta.');
    setError('');
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setError('');
    const result = await updateCustomerProfile(profile);
    if (!result.ok) return setError(result.error);
    setNotice('Seus dados foram atualizados com segurança.');
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setError('');
    if (passwordForm.next.length < 6) return setError('A nova senha deve ter pelo menos 6 caracteres.');
    const result = await changeCustomerPassword(passwordForm.current, passwordForm.next);
    if (!result.ok) return setError(result.error);
    setPasswordForm({ current: '', next: '' });
    setNotice('Senha atualizada com segurança.');
  };

  const submitAddress = async (event) => {
    event.preventDefault(); setError('');
    const result = await saveAddress(addressDraft);
    if (!result.ok) { setError(result.error); return; }
    setAddressDraft(null); setNotice('Endereço salvo na sua conta.');
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
          {view === 'data' && <div className="space-y-4">
            <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-stone-200 p-4 sm:p-5"><div><h3 className="text-sm font-bold text-stone-900">Meus dados</h3><p className="mt-1 text-xs text-stone-500">Atualize as informações pessoais vinculadas à sua conta.</p></div><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Nome</span><input required minLength={2} autoComplete="name" value={profile.name} onChange={(event) => setProfileField('name', event.target.value)} className={inputClass} /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">E-mail da conta</span><input type="email" value={currentUser.email} readOnly className={`${inputClass} bg-stone-50 text-stone-500`} /><span className="mt-1 block text-[10px] text-stone-400">O e-mail é gerenciado pela autenticação e não pode ser alterado aqui.</span></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Telefone</span><input type="tel" autoComplete="tel" value={profile.phone} onChange={(event) => setProfileField('phone', event.target.value)} className={inputClass} /></label><button type="submit" className="min-h-11 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">Salvar meus dados</button></form>
            <section className="space-y-3 rounded-2xl border border-stone-200 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-stone-900">Endereços salvos</h3><p className="mt-1 text-xs text-stone-500">Use seus endereços nos próximos pedidos.</p></div><button type="button" onClick={() => setAddressDraft({ label: 'Principal', recipient_name: currentUser.name, phone: currentUser.phone || '', street: '', number: '', complement: '', neighborhood: '', city: '', postal_code: '', reference: '', is_default: addresses.length === 0 })} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg bg-primary-light px-3 text-xs font-semibold text-primary"><Plus className="h-4 w-4" />Adicionar</button></div>
              {addresses.map((address) => <article key={address.id} className="flex items-start justify-between gap-3 rounded-xl bg-stone-50 p-3"><div className="min-w-0"><p className="flex items-center gap-1.5 text-xs font-bold text-stone-800"><MapPin className="h-3.5 w-3.5 text-primary" />{address.label || 'Endereço'}{address.is_default && <span className="rounded-full bg-primary-light px-2 py-0.5 text-[9px] uppercase text-primary">Padrão</span>}</p><p className="mt-1 break-words text-xs text-stone-600">{[`${address.street}, ${address.number}`, address.complement, address.neighborhood, address.city, address.postal_code].filter(Boolean).join(' · ')}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => setAddressDraft({ ...address, is_default: Boolean(address.is_default) })} aria-label="Editar endereço" className="min-h-9 rounded-lg px-2 text-[10px] font-semibold text-primary hover:bg-white">Editar</button><button type="button" onClick={async () => { const result = await deleteAddress(address.id); if (!result.ok) setError(result.error); else setNotice('Endereço removido.'); }} aria-label="Excluir endereço" className="min-h-9 min-w-9 rounded-lg text-stone-400 hover:bg-white hover:text-rose-600"><Trash2 className="mx-auto h-4 w-4" /></button></div></article>)}
              {!addresses.length && <p className="rounded-xl bg-stone-50 p-4 text-xs text-stone-500">Nenhum endereço salvo. Cadastre um endereço para agilizar o checkout.</p>}
              {addressDraft && <form onSubmit={submitAddress} className="space-y-3 rounded-xl border border-primary/20 bg-primary-light/30 p-4"><div className="grid gap-3 sm:grid-cols-2">{[['label','Identificação'],['recipient_name','Nome para entrega'],['phone','Telefone'],['street','Rua'],['number','Número'],['complement','Complemento'],['neighborhood','Bairro'],['city','Cidade'],['postal_code','CEP'],['reference','Referência']].map(([key,label]) => <label key={key} className={`block ${['street','reference'].includes(key) ? 'sm:col-span-2' : ''}`}><span className="mb-1 block text-[11px] font-medium text-stone-600">{label}</span><input required={!['label','complement','reference'].includes(key)} value={addressDraft[key] || ''} onChange={(event) => setAddressDraft((previous) => ({ ...previous, [key]: event.target.value }))} className="min-h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm" /></label>)}</div><label className="flex min-h-10 items-center gap-2 text-xs font-medium text-stone-700"><input type="checkbox" checked={Boolean(addressDraft.is_default)} onChange={(event) => setAddressDraft((previous) => ({ ...previous, is_default: event.target.checked }))} />Definir como endereço padrão</label><div className="flex gap-2"><button type="submit" className="min-h-10 flex-1 rounded-lg bg-primary px-3 text-xs font-semibold text-white">Salvar endereço</button><button type="button" onClick={() => setAddressDraft(null)} className="min-h-10 rounded-lg border border-stone-200 px-4 text-xs font-semibold text-stone-600">Cancelar</button></div></form>}
            </section>
          </div>}
          {view === 'settings' && <form onSubmit={savePassword} className="space-y-4 rounded-2xl border border-stone-200 p-4 sm:p-5"><div><h3 className="text-sm font-bold text-stone-900">Configurações da conta</h3><p className="mt-1 text-xs text-stone-500">Defina uma nova senha para entrar na sua conta.</p></div><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Nova senha</span><input required minLength={6} type="password" autoComplete="new-password" value={passwordForm.next} onChange={(event) => setPasswordForm((previous) => ({ ...previous, next: event.target.value }))} className={inputClass} /></label><button type="submit" className="min-h-11 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">Atualizar senha</button></form>}
          {view === 'history' && <section className="space-y-3"><div><h3 className="text-sm font-bold text-stone-900">Histórico de pedidos</h3><p className="mt-1 text-xs text-stone-500">Pedidos anteriores desta conta.</p></div>{customerOrders.length ? customerOrders.map((order) => <article key={order.id || order.createdAt} className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-stone-200 p-3"><div className="min-w-0"><p className="break-all text-xs font-bold text-stone-800">{order.id || 'Pedido'}</p><p className="mt-1 text-[11px] text-stone-500">{order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</p><p className="mt-1 text-[11px] font-medium text-stone-600">{CUSTOMER_ORDER_STATUS[order.status] || 'Status atualizado'}</p></div><span className="shrink-0 text-xs font-semibold text-primary">{formatCurrency(order.total)}</span></article>) : <p className="rounded-xl bg-stone-50 p-4 text-xs text-stone-500">Você ainda não realizou pedidos.</p>}</section>}
          {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p>}
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <button type="button" onClick={handleLogout} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"><LogOut className="h-4 w-4" />Sair da conta</button>
        </div> : <div className="mx-auto max-w-md">
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-stone-100 p-1"><button type="button" onClick={() => { setMode('login'); setError(''); setNotice(''); }} className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold ${mode !== 'register' ? 'bg-white text-primary shadow-subtle' : 'text-stone-500'}`}>Login</button><button type="button" onClick={() => { setMode('register'); setError(''); setNotice(''); }} className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'register' ? 'bg-white text-primary shadow-subtle' : 'text-stone-500'}`}>Registro</button></div>
          {mode !== 'recovery' && <button type="button" disabled={busy} onClick={handleGoogleLogin} className="mb-4 flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"><svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.98 46.98 31.8 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>Entrar com Google</button>}
          {mode !== 'recovery' && <div className="mb-4 flex items-center gap-3 text-[10px] uppercase tracking-wide text-stone-400"><span className="h-px flex-1 bg-stone-200" />ou com e-mail<span className="h-px flex-1 bg-stone-200" /></div>}
          <form onSubmit={submit} className="space-y-3.5">{mode === 'register' && <label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Nome completo</span><input autoComplete="name" required value={form.name} onChange={(event) => setField('name', event.target.value)} className={inputClass} placeholder="Seu nome" /></label>}<label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">E-mail</span><span className="relative block"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input type="email" autoComplete="email" required value={form.email} onChange={(event) => setField('email', event.target.value)} className={`${inputClass} pl-10`} placeholder="voce@email.com" /></span></label>{mode !== 'recovery' && <label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Senha</span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required value={form.password} onChange={(event) => setField('password', event.target.value)} className={`${inputClass} pl-10`} placeholder={mode === 'register' ? 'Mínimo de 6 caracteres' : 'Sua senha'} /></span></label>}{error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}{notice && <p role="status" className="inline-flex items-center gap-1.5 text-xs text-primary"><CheckCircle2 className="h-4 w-4" />{notice}</p>}<button type="submit" disabled={busy} className="mt-1 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">{busy ? <span className="animate-pulse">Aguarde…</span> : <><LogIn className="h-4 w-4" />{mode === 'register' ? 'Criar conta' : mode === 'recovery' ? 'Enviar link de recuperação' : 'Entrar'}</>}</button></form>
          <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-2 text-center text-xs text-stone-500">{mode === 'login' && <button type="button" onClick={() => { setMode('recovery'); setError(''); setNotice(''); }} className="font-semibold text-primary hover:underline">Esqueci minha senha</button>}<span>{mode === 'register' ? 'Já tem uma conta?' : mode === 'recovery' ? 'Lembrou a senha?' : 'Ainda não tem conta?'}</span><button type="button" onClick={() => { setMode(mode === 'register' || mode === 'recovery' ? 'login' : 'register'); setError(''); setNotice(''); }} className="font-semibold text-primary hover:underline">{mode === 'register' || mode === 'recovery' ? 'Fazer login' : 'Cadastre-se'}</button></div>
        </div>}
      </div>
    </section>
  </div>;
}

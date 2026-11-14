import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogIn, LogOut, Mail, PackageCheck, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from './Notifications';

function ProfileAvatar({ user, className = 'h-9 w-9' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = user?.avatarUrl || '';
  useEffect(() => setImageFailed(false), [avatarUrl]);
  if (avatarUrl && !imageFailed) return <img src={avatarUrl} alt="" aria-hidden="true" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className={`${className} shrink-0 rounded-full border border-primary/20 bg-primary-light object-cover object-[50%_40%] shadow-sm`} />;
  const initial = user?.name?.trim()?.charAt(0)?.toLocaleUpperCase('pt-BR');
  return <span aria-hidden="true" className={`${className} flex shrink-0 items-center justify-center rounded-full border border-primary/20 bg-gradient-to-br from-primary-light to-surface-100 font-semibold text-primary shadow-sm`}>{initial || <UserRound className="h-4 w-4" />}</span>;
}

function AccountMenuPanel({ user, onOpenAccount, onOpenOrders, onLogout, mobile = false }) {
  return (
    <div role="menu" className={mobile ? 'mt-2 space-y-1 rounded-xl border border-stone-200 bg-white p-2 shadow-subtle' : 'absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-stone-200 bg-white p-2.5 shadow-elevated'}>
      <div className="border-b border-stone-100 px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-stone-900">{user.name || 'Conta do cliente'}</p>
        {user.email && <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-stone-500"><Mail className="h-3.5 w-3.5 shrink-0" />{user.email}</p>}
      </div>
      <button role="menuitem" type="button" onClick={onOpenAccount} className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-xs font-semibold text-stone-700 transition hover:bg-stone-50 hover:text-primary"><UserRound className="h-4 w-4 text-primary" />Minha conta</button>
      <button role="menuitem" type="button" onClick={onOpenOrders} className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-xs font-semibold text-stone-700 transition hover:bg-stone-50 hover:text-primary"><ShoppingBag className="h-4 w-4 text-primary" />Meus pedidos</button>
      <button role="menuitem" type="button" onClick={onLogout} className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-xs font-semibold text-stone-600 transition hover:bg-rose-50 hover:text-rose-700"><LogOut className="h-4 w-4" />Sair da conta</button>
    </div>
  );
}

export function Header({ onOpenAccount, onOpenOrders, onOpenTracking, onOpenAdminPanel }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const mobileMenuRegionRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const desktopAccountMenuRef = useRef(null);
  const mobileAccountMenuRef = useRef(null);
  const { totalCount, openCart } = useCart();
  const { currentUser, authLoading, settings, logout, orders = [] } = useAuth();
  const { confirm, notify } = useNotifications();
  const hasActiveOrders = currentUser?.role === 'customer' && orders.some((order) => order.customerId === currentUser.id && (
    !['completed', 'cancelled', 'quote_rejected'].includes(order.status)
    || (order.status === 'completed' && order.completedAt && Date.now() < new Date(order.completedAt).getTime() + 5 * 60 * 1000)
  ));

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const handleOutsidePointer = (event) => {
      if (!mobileMenuRegionRef.current?.contains(event.target)) setMobileMenuOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const handleOutsidePointer = (event) => {
      if (!desktopAccountMenuRef.current?.contains(event.target) && !mobileAccountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    };
    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [accountMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const confirmLogout = async () => {
    const accepted = await confirm({ title: 'Sair da sua conta?', message: 'Você precisará entrar novamente para acompanhar seus pedidos.', confirmLabel: 'Sair', destructive: true });
    if (accepted) {
      setAccountMenuOpen(false);
      const result = await logout();
      if (!result.ok) notify({ type: 'error', title: 'Não foi possível sair', message: result.error });
    }
    closeMobileMenu();
  };
  const openAccount = () => {
    closeMobileMenu();
    setAccountMenuOpen(false);
    if (authLoading) return;
    if (currentUser?.role === 'admin') {
      onOpenAdminPanel?.();
      return;
    }
    onOpenAccount?.();
  };
  const openTracking = () => {
    closeMobileMenu();
    setAccountMenuOpen(false);
    onOpenTracking?.();
  };
  const openOrders = () => {
    closeMobileMenu();
    setAccountMenuOpen(false);
    onOpenOrders?.();
  };
  const openAdminPanel = () => {
    closeMobileMenu();
    onOpenAdminPanel?.();
  };

  return (
    <header data-aos="fade-down" className="site-header sticky top-0 z-30 border-b border-stone-200/80 bg-white shadow-subtle">
      {/* Desktop navbar */}
      <div className="mx-auto hidden max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-5 lg:flex lg:gap-5 lg:px-6">
        <button
          type="button"
          className="flex shrink-0 select-none items-center gap-2.5 text-left sm:gap-3"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao início"
        >
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-stone-200 bg-stone-50 sm:h-11 sm:w-11">
            <img src="/images/logo.jpg" alt="Salencar Batidas" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="max-w-[130px] truncate font-display text-base font-black leading-tight tracking-tight text-stone-900 sm:max-w-[220px] sm:text-xl">{settings.name}</div>
            <p className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-wider text-stone-500 sm:block">Batidas Artesanais</p>
          </div>
        </button>

        <nav aria-label="Navegação principal" className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-1 rounded-2xl bg-stone-50 p-1 text-xs font-semibold text-stone-700 xl:text-sm">
            <a href="#cardapio" className="rounded-xl px-3 py-2.5 transition-colors hover:bg-white hover:text-primary hover:shadow-subtle xl:px-4">Cardápio</a>
            <a href="#localizacao" className="rounded-xl px-3 py-2.5 transition-colors hover:bg-white hover:text-primary hover:shadow-subtle xl:px-4">Localização</a>
            {currentUser?.role !== 'admin' && <button type="button" disabled={authLoading} onClick={openTracking} className="rounded-xl px-3 py-2.5 text-primary transition-colors hover:bg-white hover:shadow-subtle disabled:cursor-wait disabled:opacity-50 xl:px-4">Acompanhar pedido</button>}
            {currentUser?.role === 'admin' && <button type="button" onClick={onOpenAdminPanel} className="rounded-xl px-3 py-2.5 text-primary transition-colors hover:bg-white hover:shadow-subtle xl:px-4">Administrador</button>}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:border-l lg:border-stone-200 lg:pl-4 xl:gap-3">
          {authLoading ? <button type="button" disabled className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-400" aria-label="Verificando sessão"><span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-primary" />Verificando</button> : currentUser?.role === 'customer' ? <div ref={desktopAccountMenuRef} className="relative">
            <button type="button" onClick={() => setAccountMenuOpen((open) => !open)} aria-expanded={accountMenuOpen} aria-haspopup="menu" aria-label="Abrir menu da conta" className="inline-flex min-h-11 max-w-52 items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 hover:text-primary">
              <ProfileAvatar user={currentUser} /><span className="max-w-32 truncate">{currentUser.name || 'Minha conta'}</span><ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {accountMenuOpen && <AccountMenuPanel user={currentUser} onOpenAccount={openAccount} onOpenOrders={openOrders} onLogout={confirmLogout} />}
          </div> : <button type="button" onClick={currentUser?.role === 'admin' ? onOpenAdminPanel : openAccount} className="inline-flex max-w-36 items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 hover:text-primary sm:max-w-48 sm:px-3" aria-label={currentUser?.role === 'admin' ? 'Abrir painel administrativo' : 'Entrar ou criar uma conta'}>
            {currentUser?.role === 'admin' ? <ShieldCheck className="h-4 w-4 shrink-0" /> : <LogIn className="h-4 w-4 shrink-0" />}
            <span className="truncate">{currentUser?.role === 'admin' ? 'Painel' : 'Entrar'}</span>
          </button>}

          <button
            type="button"
            onClick={openCart}
            className="group flex shrink-0 items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-2 py-2 text-xs font-bold text-stone-800 shadow-subtle transition-all hover:border-primary/30 hover:bg-stone-50 hover:shadow-card active:scale-95 sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm xl:gap-3"
            aria-label={`Abrir carrinho de compras${totalCount ? `, ${totalCount} ${totalCount === 1 ? 'produto' : 'produtos'}` : ', vazio'}`}
          >
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors group-hover:bg-primary-hover sm:h-10 sm:w-10">
              <ShoppingBag className="h-5 w-5" />
              {totalCount > 0 && <span key={totalCount} className="cart-count-pop absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-accent px-0.5 text-[10px] font-bold text-white shadow-xs">{totalCount}</span>}
            </span>
            <span className="min-w-0 text-left text-xs font-bold sm:text-sm xl:min-w-24">
              <span className="block leading-tight"><span className="sm:hidden">Sacola</span><span className="hidden sm:inline">Meu Carrinho</span></span>
              <span className="mt-0.5 hidden text-[11px] font-medium text-stone-500 xl:block">{totalCount === 0 ? 'Sua sacola está vazia' : `${totalCount} ${totalCount === 1 ? 'produto' : 'produtos'}`}</span>
            </span>
          </button>
        </div>
      </div>

      {/* Mobile and tablet navbar */}
      <div ref={mobileMenuRegionRef} className="lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao início"
        >
          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-stone-200 bg-stone-50">
            <img src="/images/logo.jpg" alt="" className="h-full w-full object-cover" />
          </span>
          <span className="min-w-0 max-w-[150px] whitespace-normal break-words font-display text-xs font-black leading-tight tracking-tight text-stone-900 sm:max-w-[260px] sm:text-sm">
            {settings.name}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={openAccount}
            aria-label="Entrar ou abrir opções da conta"
            title="Entrar ou abrir conta"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 shadow-subtle transition hover:border-primary/30 hover:bg-stone-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <UserRound className="h-5 w-5" />
          </button>
          {currentUser?.role !== 'admin' && <button type="button" disabled={authLoading} onClick={openTracking} aria-label="Pedidos" title="Pedidos" className="relative inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2 text-primary shadow-subtle transition hover:border-primary/30 hover:bg-primary-light/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"><PackageCheck className="h-5 w-5" /><span className="text-[10px] font-semibold">Pedidos</span>{hasActiveOrders && <span aria-hidden="true" className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />}</button>}
          <button
            type="button"
            onClick={openCart}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-800 shadow-subtle transition hover:border-primary/30 hover:bg-stone-50"
            aria-label={`Abrir carrinho${totalCount ? `, ${totalCount} ${totalCount === 1 ? 'produto' : 'produtos'}` : ', vazio'}`}
          >
            <ShoppingBag className="h-5 w-5" />
            {totalCount > 0 && <span key={totalCount} className="cart-count-pop absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-accent px-0.5 text-[10px] font-bold text-white">{totalCount}</span>}
          </button>
          <button
            type="button"
            ref={mobileMenuButtonRef}
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-menu"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white transition-colors duration-300 ease-in-out hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="relative flex h-5 w-5 items-center justify-center" aria-hidden="true">
              <span className={`absolute h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-y-0 rotate-45' : '-translate-y-1.5 rotate-0'}`} />
              <span className={`absolute h-0.5 w-5 rounded-full bg-current transition-[opacity,transform] duration-200 ease-in-out ${mobileMenuOpen ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`} />
              <span className={`absolute h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-y-0 -rotate-45' : 'translate-y-1.5 rotate-0'}`} />
            </span>
          </button>
        </div>
      </div>

      <div
        id="mobile-navigation-menu"
        aria-hidden={!mobileMenuOpen}
        inert={!mobileMenuOpen}
        className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out ${mobileMenuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className={`min-h-0 overflow-y-auto transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-y-0' : '-translate-y-2'}`}>
          <div className="mx-auto max-h-[calc(100dvh-4rem)] max-w-7xl space-y-4 border-t border-stone-100 px-4 py-4 sm:px-6">
            <nav aria-label="Navegação principal mobile" className="grid gap-1">
              <a href="#cardapio" onClick={closeMobileMenu} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 hover:text-primary">Cardápio</a>
              <a href="#localizacao" onClick={closeMobileMenu} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 hover:text-primary">Localização</a>
              {currentUser?.role === 'admin' && <button type="button" onClick={openAdminPanel} className="flex min-h-11 items-center rounded-xl px-3 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary-light/50">Administrador</button>}
            </nav>

            <div className="border-t border-stone-100 pt-4">
              {currentUser?.role === 'customer' ? (
                <div ref={mobileAccountMenuRef} className="space-y-2">
                  <button type="button" onClick={() => setAccountMenuOpen((open) => !open)} aria-expanded={accountMenuOpen} className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-stone-50 p-3 text-left">
                    <ProfileAvatar user={currentUser} className="h-10 w-10" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-stone-500">Conta do cliente</p>
                      <p className="mt-0.5 truncate text-sm font-bold leading-snug text-stone-900">{currentUser.name || 'Minha conta'}</p>
                    </div>
                    <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-stone-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {accountMenuOpen && <AccountMenuPanel mobile user={currentUser} onOpenAccount={openAccount} onOpenOrders={openOrders} onLogout={confirmLogout} />}
                </div>
              ) : currentUser?.role === 'admin' ? (
                <div className="space-y-2">
                  <div className="flex min-h-12 items-center gap-3 rounded-xl bg-primary-light/60 p-3"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-xs font-medium text-stone-500">Conta administrativa</p><p className="truncate text-sm font-bold text-stone-900">{currentUser.name}</p></div></div>
                  <button type="button" onClick={openAdminPanel} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-stone-200 px-3 text-sm font-semibold text-primary transition hover:bg-primary-light/50"><ShieldCheck className="h-4 w-4" />Painel administrativo</button>
                  <button type="button" onClick={confirmLogout} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-stone-200 px-3 text-sm font-semibold text-stone-600 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-700"><LogOut className="h-4 w-4" />Sair da conta</button>
                </div>
              ) : (
                <button type="button" onClick={openAccount} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover"><LogIn className="h-4 w-4" />Entrar ou criar uma conta</button>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </header>
  );
}

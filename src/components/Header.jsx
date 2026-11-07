import React, { useEffect, useRef, useState } from 'react';
import { LogIn, LogOut, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export function Header({ onOpenAccount, onOpenTracking, onOpenAdminPanel }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRegionRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const { totalCount, openCart } = useCart();
  const { currentUser, settings, logout } = useAuth();

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

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const confirmLogout = () => {
    if (window.confirm('Deseja sair da sua conta?')) logout();
    closeMobileMenu();
  };
  const openAccount = () => {
    closeMobileMenu();
    onOpenAccount?.();
  };
  const openTracking = () => {
    closeMobileMenu();
    onOpenTracking?.();
  };
  const openAdminPanel = () => {
    closeMobileMenu();
    onOpenAdminPanel?.();
  };

  return (
    <header data-aos="fade-down" className="sticky top-0 z-30 border-b border-stone-200/80 bg-white shadow-subtle">
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
            {currentUser?.role === 'customer' && <button type="button" onClick={onOpenTracking} className="rounded-xl px-3 py-2.5 text-primary transition-colors hover:bg-white hover:shadow-subtle xl:px-4">Acompanhar pedido</button>}
            {currentUser?.role === 'admin' && <button type="button" onClick={onOpenAdminPanel} className="rounded-xl px-3 py-2.5 text-primary transition-colors hover:bg-white hover:shadow-subtle xl:px-4">Administrador</button>}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:border-l lg:border-stone-200 lg:pl-4 xl:gap-3">
          {currentUser?.role === 'customer' ? <div className="flex min-w-0 items-center gap-0.5">
            <button type="button" onClick={onOpenAccount} className="inline-flex min-w-0 max-w-[105px] items-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-semibold text-stone-600 transition hover:bg-stone-50 hover:text-primary sm:max-w-48 sm:gap-1.5 sm:px-2 sm:text-xs lg:max-w-36 xl:max-w-48" aria-label="Abrir opções da conta">
              <UserRound className="h-4 w-4 shrink-0" /><span className="truncate">Olá, {currentUser.name}</span>
            </button>
            <button type="button" onClick={() => { if (window.confirm('Deseja sair da sua conta?')) logout(); }} aria-label="Sair da conta" title="Sair da conta" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-500 transition hover:bg-rose-50 hover:text-rose-700 sm:h-10 sm:w-10"><LogOut className="h-4 w-4" /></button>
          </div> : <button type="button" onClick={currentUser?.role === 'admin' ? onOpenAdminPanel : onOpenAccount} className="inline-flex max-w-36 items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 hover:text-primary sm:max-w-48 sm:px-3" aria-label={currentUser?.role === 'admin' ? 'Abrir painel administrativo' : 'Entrar ou criar uma conta'}>
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
              {totalCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-accent px-0.5 text-[10px] font-bold text-white shadow-xs">{totalCount}</span>}
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
          <button
            type="button"
            onClick={openCart}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-800 shadow-subtle transition hover:border-primary/30 hover:bg-stone-50"
            aria-label={`Abrir carrinho${totalCount ? `, ${totalCount} ${totalCount === 1 ? 'produto' : 'produtos'}` : ', vazio'}`}
          >
            <ShoppingBag className="h-5 w-5" />
            {totalCount > 0 && <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-accent px-0.5 text-[10px] font-bold text-white">{totalCount}</span>}
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
              {currentUser?.role === 'customer' && <button type="button" onClick={openTracking} className="flex min-h-11 items-center rounded-xl px-3 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary-light/50">Acompanhar pedido</button>}
              {currentUser?.role === 'admin' && <button type="button" onClick={openAdminPanel} className="flex min-h-11 items-center rounded-xl px-3 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary-light/50">Administrador</button>}
            </nav>

            <div className="border-t border-stone-100 pt-4">
              {currentUser ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-3">
                    {currentUser.role === 'admin' ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-stone-500">{currentUser.role === 'admin' ? 'Conta administrativa' : 'Conta do cliente'}</p>
                      <p className="mt-0.5 whitespace-normal break-words text-sm font-bold leading-snug text-stone-900">Olá, {currentUser.name}</p>
                    </div>
                  </div>
                  {currentUser.role === 'customer' && <button type="button" onClick={openAccount} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-stone-200 px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"><UserRound className="h-4 w-4" />Minha conta</button>}
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

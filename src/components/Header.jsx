import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

export function Header() {
  const { totalCount, openCart } = useCart();

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white shadow-subtle">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div
          className="flex cursor-pointer select-none items-center gap-3"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-stone-200 bg-stone-50 sm:h-11 sm:w-11">
            <img src="/images/logo.jpg" alt="Salencar Batidas" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="font-display text-lg font-black leading-none tracking-tight text-stone-900 sm:text-xl">SALENCAR</div>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500">Batidas Artesanais</p>
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-stone-700 md:flex">
          <a href="#cardapio" className="py-1 transition-colors hover:text-primary">Cardápio</a>
          <a href="#localizacao" className="py-1 transition-colors hover:text-primary">Localização & Contato</a>
        </nav>

        <button
          onClick={openCart}
          className="group flex shrink-0 items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-2 py-2 text-xs font-bold text-stone-800 shadow-subtle transition-all hover:border-primary/30 hover:bg-stone-50 hover:shadow-card active:scale-95 sm:gap-3 sm:px-3 sm:py-2.5 sm:text-sm"
          aria-label={`Abrir carrinho de compras${totalCount ? `, ${totalCount} ${totalCount === 1 ? 'produto' : 'produtos'}` : ', vazio'}`}
        >
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors group-hover:bg-primary-hover sm:h-10 sm:w-10">
            <ShoppingBag className="h-5 w-5" />
            {totalCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-accent px-0.5 text-[10px] font-bold text-white shadow-xs">
                {totalCount}
              </span>
            )}
          </span>
          <span className="min-w-0 text-left text-xs font-bold sm:min-w-24 sm:text-sm">
            <span className="block leading-tight"><span className="sm:hidden">Sacola</span><span className="hidden sm:inline">Meu Carrinho</span></span>
            <span className="mt-0.5 hidden text-[11px] font-medium text-stone-500 sm:block">
              {totalCount === 0 ? 'Sua sacola está vazia' : `${totalCount} ${totalCount === 1 ? 'produto' : 'produtos'}`}
            </span>
          </span>
        </button>
      </div>
    </header>
  );
}

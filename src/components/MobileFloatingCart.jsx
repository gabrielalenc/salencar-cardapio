import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/formatters';

export function MobileFloatingCart() {
  const { totalCount, total, openCart } = useCart();

  if (totalCount === 0) return null;

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
      <button
        onClick={openCart}
        className="w-full bg-primary hover:bg-primary-hover text-white py-3 px-4 rounded-xl shadow-elevated flex items-center justify-between transition-colors active:scale-[0.98] border border-primary-hover"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-emerald-200" />
            <span className="absolute -top-1.5 -right-1.5 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {totalCount}
            </span>
          </div>

          <div className="text-left">
            <span className="text-[11px] text-emerald-200 block leading-none font-medium">
              Ver sacola
            </span>
            <span className="text-sm font-bold text-white leading-tight">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 font-semibold text-xs text-white">
          <span>Avançar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </button>
    </div>
  );
}

import React, { useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { AnimatedText } from './AnimatedText';

export function ProductCard({ product, onSelect, onAddToCart, onBuyNow, animationDelay = 0 }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      onClick={() => onSelect(product)}
      data-aos="fade-up"
      data-aos-delay={animationDelay}
      className="product-card bg-white rounded-2xl p-3 sm:p-3.5 border border-stone-200/80 hover:border-primary/40 shadow-subtle hover:shadow-card flex flex-col justify-between cursor-pointer group"
    >
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 border border-stone-100">
        <img
          src={product.image}
          alt={product.name}
          loading="eager"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 ease-out"
        />

        {product.tag && (
          <div className="absolute top-2 left-2 pointer-events-none">
            <span className="bg-white/95 backdrop-blur-xs text-stone-700 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md border border-stone-200/80 shadow-subtle">
              {product.tag}
            </span>
          </div>
        )}

        {product.volume && (
          <div className="absolute bottom-2 right-2 pointer-events-none">
            <span className="bg-stone-900/80 text-white text-[10px] font-medium px-2 py-0.5 rounded-md backdrop-blur-xs">
              {product.volume}
            </span>
          </div>
        )}
      </div>

      <div className="pt-3 pb-1 text-center flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-stone-900 text-sm sm:text-base group-hover:text-primary transition-colors leading-snug line-clamp-1">
            <AnimatedText>{product.name}</AnimatedText>
          </h3>

          <p data-aos="fade" data-aos-delay={Math.min(animationDelay + 100, 300)} className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="mt-3 pt-2 border-t border-stone-100 flex flex-col items-center">
          <span className="text-base sm:text-lg font-bold text-primary">
            {formatCurrency(product.price)}
          </span>

          <div className="mt-2 grid w-full gap-2">
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onAddToCart(product); }}
              aria-label={`Adicionar ${product.name} ao carrinho`}
              className="interactive-hover flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:border-primary/50 hover:bg-stone-50 active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Adicionar ao carrinho</span>
            </button>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onBuyNow(product); }}
              className="interactive-hover flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover active:scale-[0.98]"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Comprar agora</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

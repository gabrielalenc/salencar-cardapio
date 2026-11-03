import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Layers, Snowflake, Sparkles, Wine } from 'lucide-react';
import { CATEGORIES } from '../data/products';

const iconMap = { Sparkles, Wine, Layers, Snowflake };

export function CategoryNav({ activeCategory, onSelectCategory }) {
  const categoriesRef = useRef(null);

  const scrollCategories = (direction) => {
    if (!categoriesRef.current) return;
    categoriesRef.current.scrollBy({
      left: direction * categoriesRef.current.clientWidth * 0.8,
      behavior: 'smooth',
    });
  };

  const renderCategories = () => CATEGORIES.map((category) => {
    const Icon = iconMap[category.icon] || Sparkles;
    const isActive = activeCategory === category.id;

    return (
      <button
        key={category.id}
        type="button"
        onClick={() => onSelectCategory(category.id)}
        className={`flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-2xl px-5 py-2.5 text-xs font-bold shadow-subtle transition-all duration-200 hover:-translate-y-0.5 sm:text-sm ${
          isActive
            ? 'scale-[1.02] bg-primary text-white'
            : 'border border-stone-200/90 bg-white text-stone-700 hover:bg-stone-50'
        }`}
      >
        <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
        <span>{category.name}</span>
      </button>
    );
  });

  return (
    <div className="py-2 reveal-item">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-2 py-2 md:hidden">
          <button
            type="button"
            onClick={() => scrollCategories(-1)}
            aria-label="Ver categorias anteriores"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-subtle active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div ref={categoriesRef} className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory items-center gap-3 overflow-x-auto scroll-smooth py-1">
            {renderCategories()}
          </div>
          <button
            type="button"
            onClick={() => scrollCategories(1)}
            aria-label="Ver próximas categorias"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-subtle active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="hidden items-center justify-center gap-3 overflow-x-auto py-2 no-scrollbar md:flex">
          {renderCategories()}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { MapPin, Phone } from 'lucide-react';
import { STORE_CONFIG } from '../config/storeConfig';

function InstagramIcon({ className = 'h-4 w-4' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>;
}

export function HeroBanner({ onExploreClick }) {
  return (
    <section className="overflow-hidden border-b border-stone-200/80 bg-white py-8 sm:py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="space-y-5 text-center lg:col-span-6 lg:text-left">
            <h1 className="font-display text-3xl font-black leading-[1.15] tracking-tight text-stone-900 sm:text-4xl lg:text-5xl">
              Escolha sua <span className="text-primary">Batida Artesanal</span> da forma que preferir.
            </h1>
            <p className="mx-auto max-w-lg text-sm font-normal leading-relaxed text-stone-600 sm:text-base lg:mx-0">
              Aproveite nosso cardápio! Escolha o que desejar e receba no conforto da sua casa.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 lg:justify-start">
              <a href={STORE_CONFIG.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-700 shadow-subtle transition-all hover:bg-stone-50 hover:text-primary active:scale-95" title="Instagram Salencar" aria-label="Instagram Salencar">
                <InstagramIcon className="h-5 w-5" />
              </a>
              <a href="#localizacao" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-700 shadow-subtle transition-all hover:bg-stone-50 hover:text-primary active:scale-95" title="Onde estamos" aria-label="Onde estamos">
                <MapPin className="h-5 w-5" />
              </a>
              <a href={`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de fazer um pedido na Salencar.')}`} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-700 shadow-subtle transition-all hover:bg-stone-50 hover:text-emerald-600 active:scale-95" title="Chamar no WhatsApp" aria-label="Chamar no WhatsApp">
                <Phone className="h-5 w-5" />
              </a>
              <button onClick={onExploreClick} className="ml-1 cursor-pointer rounded-2xl bg-primary px-7 py-3 text-sm font-bold text-white shadow-subtle transition-all hover:bg-primary-hover active:scale-95">
                Ver cardápio
              </button>
            </div>
          </div>

          <div className="flex justify-center lg:col-span-6">
            <div className="w-full max-w-2xl">
              <img
                src="/images/header-batidas.png"
                alt="Três batidas artesanais Salencar de frutas tropicais"
                className="block h-auto w-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import React from 'react';
import { STORE_CONFIG } from '../config/storeConfig';
import { Phone, Clock, MapPin } from 'lucide-react';

function InstagramIcon({ className = 'h-4 w-4' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>;
}

export function Footer() {
  return (
    <footer id="contato" data-aos="fade-up" className="bg-primary-hover text-stone-200 pt-10 pb-20 md:pb-10 border-t border-primary">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-primary">
          
          {/* Logo e Descrição */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-primary bg-primary">
                <img
                  src="/images/logo.jpg"
                  alt="Salencar Batidas"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  SALENCAR
                </h3>
                <p className="text-xs text-stone-400">
                  Batidas Artesanais • {STORE_CONFIG.tagline}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
              Batidas artesanais e cremosas preparadas com frutas frescas e ingredientes selecionados. Entrega rápida no conforto da sua casa.
            </p>
          </div>

          {/* Horários */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-xs text-white uppercase tracking-wider">
              Funcionamento
            </h4>
            <div className="space-y-1.5 text-xs text-stone-400">
              <div className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                <span>{STORE_CONFIG.status.hours}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                <span>{STORE_CONFIG.pickupAddress}</span>
              </div>
            </div>
          </div>

          {/* Contato & Redes */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-xs text-white uppercase tracking-wider">
              Atendimento
            </h4>
            <div className="space-y-2">
              <a
                href={`https://wa.me/${STORE_CONFIG.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-stone-300 hover:text-white transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{STORE_CONFIG.whatsappFormatted}</span>
              </a>

              <div>
                <a
                  href={STORE_CONFIG.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-stone-400 hover:text-white transition-colors"
                >
                  <InstagramIcon className="w-3.5 h-3.5" />
                  <span>{STORE_CONFIG.instagram}</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Rodapé Inferior */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} Salencar Batidas Artesanais. Todos os direitos reservados.</p>
          <p className="text-[11px] text-stone-500">
            Cardápio Online & Delivery
          </p>
        </div>
      </div>
    </footer>
  );
}

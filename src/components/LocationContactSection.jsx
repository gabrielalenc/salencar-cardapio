import React from 'react';
import { MapPin, Clock, Phone, Navigation, ExternalLink, Eye } from 'lucide-react';
import { AnimatedText } from './AnimatedText';
import { useAuth } from '../context/AuthContext';

function InstagramIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

export function LocationContactSection() {
  const { settings } = useAuth();
  const destinationQuery = encodeURIComponent(`${settings.name}, ${settings.pickupAddress}`);
  const googleMapsRouteUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}`;
  const streetViewUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.pickupAddress)}`;

  return (
    <section id="localizacao" className="py-12 sm:py-16 bg-surface-50 border-t border-stone-200/80">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
          <span className="text-xs font-black text-primary uppercase tracking-widest block mb-1">
            Localização & Contato
          </span>
          <h2 data-aos="fade-down" className="font-display font-black text-2xl sm:text-3xl text-stone-900 tracking-tight">
            <AnimatedText>Venha nos visitar ou faça seu pedido</AnimatedText>
          </h2>
          <p data-aos="fade" data-aos-delay="100" className="text-xs sm:text-sm text-stone-500 mt-1">
            <AnimatedText>Veja a fachada e o local no Street View, trace sua rota ou solicite entrega rápida.</AnimatedText>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          <div data-aos="fade-right" className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-card overflow-hidden flex-1 flex flex-col">
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-transparent overflow-hidden flex-1 group">
                <iframe
                  title="Google Street View - Rua do Estabelecimento Salencar"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(settings.pickupAddress)}&t=m&z=17&ie=UTF8&iwloc=&output=embed`}
                  className="w-full h-full border-0 filter contrast-[1.05]"
                  loading="lazy"
                  allowFullScreen
                ></iframe>

                <div className="absolute top-3 left-3 bg-stone-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-white/20 shadow-lg text-xs pointer-events-none">
                  <div className="font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-accent" />
                    <span>{settings.pickupAddress}</span>
                  </div>
                  <span className="text-[10px] text-stone-300 block">Fachada & Acesso Salencar</span>
                </div>

                <div className="absolute bottom-3 right-3 z-10">
                  <a
                    href={streetViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-white/95 hover:bg-white text-stone-900 font-bold px-3.5 py-2 rounded-xl text-xs shadow-card border border-stone-200 transition-all active:scale-95 hover:text-primary"
                  >
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    <span>Ver no Street View 360°</span>
                    <ExternalLink className="w-3 h-3 text-stone-400" />
                  </a>
                </div>
              </div>

              <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
                <span>Rua asfaltada, bem iluminada e de fácil acesso.</span>
                <span className="font-semibold text-primary">Estacionamento em frente</span>
              </div>
            </div>
          </div>

          <div data-aos="fade-left" className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div data-aos="zoom-in" className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/90 shadow-card">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                    Endereço Completo
                  </span>
                  <h3 className="font-bold text-base sm:text-lg text-stone-900 leading-snug mt-0.5">
                    {settings.pickupAddress}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Balcão para retirada rápida de pedidos no local, sem custo de entrega.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-stone-100">
                <a
                  href={googleMapsRouteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-bold transition-all shadow-subtle active:scale-[0.98]"
                >
                  <Navigation className="w-4 h-4 text-emerald-200" />
                  <span>Traçar Rota no Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>
            </div>

            <div data-aos="zoom-in" data-aos-delay="100" className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-card">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-accent-light text-accent-hover flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-accent-hover uppercase tracking-wider block">
                    Horário de Funcionamento
                  </span>
                  <ul className="mt-2 space-y-1.5" aria-label="Horários por dia da semana">
                    {settings.status.hours.map(({ day, time }) => (
                      <li key={day} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                        <span className="font-medium text-stone-600">{day}</span>
                        <span className={`text-right font-semibold ${time === 'Fechado' ? 'text-stone-400' : 'text-stone-900'}`}>{time}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Tempo médio de entrega: {settings.estimatedDeliveryTime}
                  </p>
                </div>
              </div>
            </div>

            <div data-aos="zoom-in" data-aos-delay="200" className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                      WhatsApp Comercial
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-stone-900">
                      {settings.whatsappFormatted}
                    </span>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de fazer um pedido ou tirar uma dúvida.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-subtle active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Conversar</span>
                </a>
              </div>
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 border-t border-stone-100 pt-3 text-xs font-medium text-stone-600 transition-colors hover:text-primary"
                aria-label={`Instagram ${settings.instagram}`}
              >
                <InstagramIcon className="w-4 h-4" />
                <span>Acompanhe {settings.instagram}</span>
                <ExternalLink className="w-3 h-3 text-stone-400" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

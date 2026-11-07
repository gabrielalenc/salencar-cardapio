import React, { useEffect, useState } from 'react';
import { Clock, ExternalLink, MapPin } from 'lucide-react';
import { AnimatedText } from './AnimatedText';
import { useAuth } from '../context/AuthContext';

export function LocationContactSection() {
  const { settings } = useAuth();
  const address = settings.pickupAddress || 'Passagem Marima, 56, Conceição, Diadema - SP';
  const streetViewUrl = 'https://maps.app.goo.gl/EAG9Jgv2ExH9jN1J9';
  const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const streetViewEmbedUrl = `https://maps.google.com/maps?layer=c&q=${encodeURIComponent(address)}&output=svembed`;
  const [streetViewLoaded, setStreetViewLoaded] = useState(false);
  const [streetViewFailed, setStreetViewFailed] = useState(false);
  const todayIndex = (new Date().getDay() + 6) % 7;
  const today = settings.status.hours[todayIndex]?.day;

  useEffect(() => {
    if (streetViewLoaded) return undefined;
    const timeout = window.setTimeout(() => setStreetViewFailed(true), 12000);
    return () => window.clearTimeout(timeout);
  }, [streetViewLoaded]);

  return (
    <section id="localizacao" className="border-t border-stone-200/80 bg-surface-50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto mb-8 max-w-xl text-center sm:mb-10">
          <span className="mb-1 block text-xs font-black uppercase tracking-widest text-primary">Localização</span>
          <h2 data-aos="fade-down" className="font-display text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">
            <AnimatedText>Encontre a Salencar</AnimatedText>
          </h2>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.95fr)] lg:gap-6">
          <article data-aos="fade-right" className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-card">
            <div className="flex items-start gap-3 p-5 sm:p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">Nosso endereço</h3>
                <p className="mt-1 break-words text-base font-bold leading-snug text-stone-900 sm:text-lg">{address}</p>
              </div>
            </div>

            <div className="relative isolate aspect-[16/10] min-h-[200px] max-h-[300px] overflow-hidden bg-stone-100 sm:aspect-[2/1] lg:aspect-[12/5]">
              {!streetViewLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-stone-100 to-primary-light/50 p-6 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-subtle"><MapPin className="h-6 w-6" /></span>
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{streetViewFailed ? 'Street View indisponível neste momento' : 'Carregando Street View…'}</p>
                    <p className="mt-1 text-xs text-stone-500">Veja a localização da Salencar no Google Maps.</p>
                  </div>
                  <a href={streetViewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-primary shadow-subtle transition hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                    Abrir Street View no Google Maps <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
              <iframe
                title={`Google Street View: ${address}`}
                src={streetViewEmbedUrl}
                className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${streetViewLoaded ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => setStreetViewLoaded(true)}
                onError={() => setStreetViewFailed(true)}
              />
            </div>

            <div className="flex flex-col gap-2 p-3 sm:flex-row sm:p-4">
              <a href={streetViewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white shadow-subtle transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                Abrir Street View <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </a>
              <a href={mapSearchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:border-primary/30 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                Ver endereço no mapa <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
              </a>
            </div>
          </article>

          <article data-aos="fade-left" className="flex flex-col rounded-2xl border border-stone-200/90 bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent-hover">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-stone-800 sm:text-base">Horário de funcionamento</h3>
                <p className="mt-0.5 text-xs text-stone-500">Confira quando estamos abertos</p>
              </div>
            </div>
            <ul className="mt-3 flex flex-1 flex-col justify-evenly" aria-label="Horários de funcionamento por dia da semana">
              {settings.status.hours.map(({ day, time }) => {
                const isToday = day === today;
                const isClosed = time.trim().toLocaleLowerCase('pt-BR') === 'fechado';
                return (
                  <li key={day} aria-current={isToday ? 'date' : undefined} className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${isToday ? 'bg-primary-light/70' : 'border-b border-stone-100 last:border-0'}`}>
                    <span className={`min-w-0 ${isToday ? 'font-bold text-stone-900' : 'font-medium text-stone-600'}`}>
                      {day}{isToday && <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Hoje</span>}
                    </span>
                    <span className={`shrink-0 text-right ${isClosed ? 'font-medium text-stone-400' : isToday ? 'font-bold text-primary' : 'font-semibold text-stone-800'}`}>{time}</span>
                  </li>
                );
              })}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

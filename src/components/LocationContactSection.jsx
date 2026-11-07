import React from 'react';
import { Clock, ExternalLink, MapPin } from 'lucide-react';
import { AnimatedText } from './AnimatedText';
import { useAuth } from '../context/AuthContext';

export function LocationContactSection() {
  const { settings } = useAuth();
  const streetViewUrl = 'https://maps.app.goo.gl/EAG9Jgv2ExH9jN1J9';
  const todayIndex = (new Date().getDay() + 6) % 7;
  const today = settings.status.hours[todayIndex]?.day;

  return (
    <section id="localizacao" className="border-t border-stone-200/80 bg-surface-50 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-8 max-w-xl text-center sm:mb-10">
          <span className="mb-1 block text-xs font-black uppercase tracking-widest text-primary">Localização</span>
          <h2 data-aos="fade-down" className="font-display text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">
            <AnimatedText>Encontre a Salencar</AnimatedText>
          </h2>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 lg:gap-7">
          <article data-aos="fade-right" className="flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 shadow-card sm:p-7">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-stone-500">Endereço</h3>
                <p className="mt-1 break-words text-base font-bold leading-relaxed text-stone-900 sm:text-lg">{settings.pickupAddress}</p>
              </div>
            </div>
            <a href={streetViewUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-subtle transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.99]">
              Abrir Street View no Google Maps
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>
          </article>

          <article data-aos="fade-left" className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-card sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent-hover">
                <Clock className="h-5 w-5" />
              </span>
              <h3 className="text-sm font-bold text-stone-800 sm:text-base">Horário de funcionamento</h3>
            </div>
            <ul className="mt-4 space-y-1" aria-label="Horários de funcionamento por dia da semana">
              {settings.status.hours.map(({ day, time }) => {
                const isToday = day === today;
                const isClosed = time.trim().toLocaleLowerCase('pt-BR') === 'fechado';
                return (
                  <li key={day} aria-current={isToday ? 'date' : undefined} className={`flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${isToday ? 'bg-primary-light/70' : ''}`}>
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

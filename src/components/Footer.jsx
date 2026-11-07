import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const developerInstagram = 'https://www.instagram.com/bielalencarr_/';
const linkClass = 'inline-flex min-h-10 items-center gap-2 rounded-lg text-sm text-stone-300 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

function InstagramIcon({ className = 'h-4 w-4' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>;
}

export function Footer({ onOpenTracking, onOpenAdminPanel }) {
  const { currentUser, settings } = useAuth();

  return (
    <footer data-aos="fade-up" className="border-t border-white/10 bg-primary-hover pb-20 pt-12 text-stone-200 md:pb-10">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid grid-cols-1 gap-8 pb-9 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          <section className="sm:col-span-2 lg:col-span-1" aria-labelledby="footer-about-title">
            <div className="flex items-center gap-3">
              <img src="/images/logo.jpg" alt="Logo Salencar" className="h-12 w-12 rounded-full border border-white/20 object-cover shadow-sm" />
              <h2 id="footer-about-title" className="font-display text-base font-bold tracking-wide text-white">Sobre a Salencar</h2>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-stone-300">
              A Salencar cultiva uma identidade própria, com um jeito descontraído de celebrar.
            </p>
          </section>

          <nav aria-labelledby="footer-navigation-title">
            <h2 id="footer-navigation-title" className="text-sm font-bold text-white">Navegação</h2>
            <ul className="mt-3 space-y-1">
              <li><a className={linkClass} href="#cardapio">Cardápio <ArrowUpRight className="h-3.5 w-3.5 opacity-60" /></a></li>
              <li><a className={linkClass} href="#localizacao">Localização <ArrowUpRight className="h-3.5 w-3.5 opacity-60" /></a></li>
              {currentUser?.role === 'customer' && <li><button type="button" onClick={onOpenTracking} className={linkClass}>Acompanhar pedido <ArrowUpRight className="h-3.5 w-3.5 opacity-60" /></button></li>}
              {currentUser?.role === 'admin' && <li><button type="button" onClick={onOpenAdminPanel} className={linkClass}>Administrador <ArrowUpRight className="h-3.5 w-3.5 opacity-60" /></button></li>}
            </ul>
          </nav>

          <section aria-labelledby="footer-social-title">
            <h2 id="footer-social-title" className="text-sm font-bold text-white">Salencar nas redes</h2>
            <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className={`${linkClass} mt-3`} aria-label="Instagram comercial da Salencar">
              <InstagramIcon className="h-4 w-4" />
              Instagram comercial
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
            </a>
          </section>
        </div>

        <div className="border-t border-white/10 pt-5">
          <div className="flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div>
              <p className="text-xs text-stone-300">© 2026 Salencar. Todos os direitos reservados.</p>
            </div>
            <a href={developerInstagram} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 self-center rounded-lg px-2 text-xs text-stone-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:self-auto" aria-label="Instagram de Gabriel Alencar, desenvolvedor do site">
              <span>Desenvolvido por <span className="font-medium text-stone-300">Gabriel Alencar</span></span>
              <InstagramIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

import React from 'react';

export function StartupSplash({ phase = 'loading', onTransitionEnd }) {
  return (
    <div
      className={`startup-splash${phase === 'exiting' ? ' startup-splash--exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Preparando o site Salencar"
      onTransitionEnd={phase === 'exiting' ? onTransitionEnd : undefined}
    >
      <div className="startup-splash__content">
        <img className="startup-splash__logo" src="/images/logo.jpg" alt="Salencar Batidas Artesanais" fetchPriority="high" />
        <p className="startup-splash__message">Preparando sua experiência...</p>
        <span className="startup-splash__progress" aria-hidden="true"><span /></span>
      </div>
    </div>
  );
}

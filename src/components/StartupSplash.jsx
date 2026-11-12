import React from 'react';

export function StartupSplash({ phase = 'loading', onTransitionEnd, onRetry, onContinue }) {
  const hasError = phase === 'error';

  return (
    <div
      className={`startup-splash${phase === 'exiting' ? ' startup-splash--exiting' : ''}`}
      role={hasError ? 'alert' : 'status'}
      aria-live={hasError ? 'assertive' : 'polite'}
      aria-label={hasError ? 'Falha ao iniciar o site Salencar' : 'Preparando o site Salencar'}
      onTransitionEnd={phase === 'exiting' ? onTransitionEnd : undefined}
    >
      <div className="startup-splash__content">
        <img className="startup-splash__logo" src="/images/logo.jpg" alt="Salencar Batidas Artesanais" fetchPriority="high" />
        {hasError ? (
          <>
            <p className="startup-splash__error">A inicialização está demorando mais que o esperado. Você pode tentar novamente ou continuar para o site.</p>
            <div className="startup-splash__actions">
              <button type="button" className="startup-splash__button startup-splash__button--primary" onClick={onRetry}>Tentar novamente</button>
              <button type="button" className="startup-splash__button" onClick={onContinue}>Continuar para o site</button>
            </div>
          </>
        ) : (
          <>
            <p className="startup-splash__message">Preparando sua experiência...</p>
            <span className="startup-splash__progress" aria-hidden="true"><span /></span>
          </>
        )}
      </div>
    </div>
  );
}

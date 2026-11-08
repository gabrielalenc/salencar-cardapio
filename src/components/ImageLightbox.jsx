import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!src) return null;
  return createPortal(<div className="image-lightbox fixed inset-0 z-[160] flex items-center justify-center bg-stone-950/90 p-3 backdrop-blur-sm sm:p-8" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <button type="button" onClick={onClose} aria-label="Fechar imagem ampliada" className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-stone-900/60 text-white transition hover:bg-stone-800 sm:right-6 sm:top-6"><X className="h-5 w-5" /></button>
    <img src={src} alt={alt} className="max-h-[88dvh] max-w-full rounded-xl object-contain shadow-2xl" />
  </div>, document.body);
}

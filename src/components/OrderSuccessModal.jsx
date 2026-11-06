import React, { useState } from 'react';
import { CheckCircle2, MessageSquare, Copy, Check, ExternalLink, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export function OrderSuccessModal({ orderData, onClose }) {
  const [copied, setCopied] = useState(false);
  const { settings } = useAuth();

  if (!orderData) return null;

  const handleCopy = () => {
    if (orderData.message) {
      navigator.clipboard.writeText(orderData.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-elevated overflow-hidden p-6 text-center border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ícone Discreto */}
        <div className="w-14 h-14 rounded-full bg-primary-light text-primary flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-7 h-7 stroke-[2]" />
        </div>

        <h2 className="font-display font-bold text-xl text-stone-900">
          Pedido gerado com sucesso!
        </h2>

        <p className="text-xs sm:text-sm text-stone-600 mt-2 max-w-sm mx-auto leading-relaxed">
          Abrimos a conversa no WhatsApp oficial da Salencar com os detalhes do seu pedido. Caso não tenha aberto automaticamente, clique no botão abaixo:
        </p>

        {/* Botão de Envio WhatsApp */}
        <div className="mt-5 space-y-2">
          <a
            href={orderData.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-subtle transition-colors text-xs sm:text-sm"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Enviar no WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>

          <button
            onClick={handleCopy}
            className="w-full bg-surface-50 hover:bg-stone-100 text-stone-700 font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors border border-stone-200"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary font-semibold">Texto copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>Copiar texto do pedido</span>
              </>
            )}
          </button>
        </div>

        {/* Resumo */}
        <div className="mt-5 pt-4 border-t border-stone-100 grid grid-cols-2 gap-3 text-left">
          <div className="bg-surface-50 p-2.5 rounded-lg border border-stone-200/60">
            <span className="text-[10px] font-bold text-stone-500 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-primary" />
              Tempo Estimado
            </span>
            <p className="text-xs font-semibold text-stone-900 mt-0.5">
              {settings.estimatedDeliveryTime}
            </p>
          </div>

          <div className="bg-surface-50 p-2.5 rounded-lg border border-stone-200/60">
            <span className="text-[10px] font-bold text-stone-500 uppercase">
              Total do Pedido
            </span>
            <p className="text-xs font-semibold text-primary mt-0.5">
              {formatCurrency(orderData.total)}
            </p>
          </div>
        </div>

        {/* Fechar */}
        <div className="mt-5">
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-800 text-xs font-medium underline underline-offset-4"
          >
            Voltar ao cardápio
          </button>
        </div>
      </div>
    </div>
  );
}

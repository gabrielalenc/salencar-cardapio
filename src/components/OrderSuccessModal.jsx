import React, { useState } from 'react';
import { CheckCircle2, MessageSquare, Copy, Check, ExternalLink } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export function OrderSuccessModal({ orderData, onClose }) {
  const [copied, setCopied] = useState(false);
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
          Pedido registrado!
        </h2>

        <p className="text-xs sm:text-sm text-stone-600 mt-2 max-w-sm mx-auto leading-relaxed">{orderData.deliveryType === 'delivery' ? 'A entrega ainda será cotada pela loja. Você receberá o valor final para aprovar antes da confirmação do pedido.' : 'Seu pedido foi registrado para retirada no local.'} A conversa no WhatsApp permite compartilhar os dados do pedido com a loja.</p>

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
        <div className="mt-5 space-y-2 border-t border-stone-100 pt-4 text-left">
          <div className="flex items-center justify-between text-xs text-stone-600"><span>Subtotal dos produtos</span><strong className="text-stone-900">{formatCurrency(orderData.subtotal ?? orderData.total)}</strong></div>
          {orderData.deliveryType === 'delivery' ? <div className="rounded-lg bg-primary-light/70 px-3 py-2 text-xs leading-relaxed text-primary">Entrega a cotar. O total final ainda não está confirmado.</div> : <div className="flex items-center justify-between text-xs font-bold text-stone-900"><span>Total</span><span>{formatCurrency(orderData.total)}</span></div>}
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

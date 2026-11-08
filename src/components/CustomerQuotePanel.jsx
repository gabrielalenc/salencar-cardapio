import React, { useState } from 'react';
import { Check, LoaderCircle, MessageCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from './Notifications';
import { formatCurrency } from '../utils/formatters';
import { CUSTOMER_ORDER_STATUS } from '../utils/orders';

export function CustomerQuotePanel({ order }) {
  const { respondToDeliveryQuote } = useAuth();
  const { confirm, notify } = useNotifications();
  const [busy, setBusy] = useState(false);
  if (order.deliveryType !== 'delivery') return null;

  const respond = async (accept) => {
    const approved = await confirm({
      title: accept ? 'Confirmar este pedido?' : 'Recusar a cotação?',
      message: accept ? `O total final será ${formatCurrency(order.subtotal + order.deliveryQuote)}.` : 'O pedido será marcado como cotação recusada.',
      confirmLabel: accept ? 'Aceitar e confirmar' : 'Recusar cotação',
      destructive: !accept,
    });
    if (!approved) return;
    setBusy(true);
    const result = await respondToDeliveryQuote(order.databaseId, accept);
    setBusy(false);
    if (!result.ok) notify({ type: 'error', title: 'Não foi possível registrar sua resposta', message: result.error });
    else notify({ type: 'success', title: accept ? 'Pedido confirmado' : 'Cotação recusada', message: accept ? 'A loja já pode preparar seu pedido.' : 'A loja foi informada da sua decisão.' });
  };

  if (order.status === 'awaiting_delivery_quote') return <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><p className="font-semibold">Entrega aguardando cotação</p><p className="mt-1">A loja calculará o valor e enviará para você aprovar. O subtotal atual não inclui a entrega.</p></div>;
  if (order.deliveryQuote == null) return null;

  const pending = order.status === 'awaiting_customer_approval';
  return <section className="mt-3 rounded-xl border border-primary/15 bg-primary-light/45 p-3.5">
    <div className="flex items-center gap-2 text-xs font-bold text-primary"><MessageCircle className="h-4 w-4" />CotaÃ§Ã£o de entrega</div>
    <dl className="mt-3 space-y-1.5 text-xs"><div className="flex justify-between gap-3 text-stone-600"><dt>Produtos</dt><dd>{formatCurrency(order.subtotal)}</dd></div><div className="flex justify-between gap-3 text-stone-600"><dt>Entrega</dt><dd>{formatCurrency(order.deliveryQuote)}</dd></div><div className="flex justify-between gap-3 border-t border-primary/10 pt-2 font-bold text-stone-900"><dt>Total final</dt><dd className="text-primary">{formatCurrency(order.total)}</dd></div></dl>
    <p className="mt-2 text-[11px] font-semibold text-stone-700">{pending ? 'Aguardando sua aprovação' : CUSTOMER_ORDER_STATUS[order.status] || 'Resposta registrada'}</p>
    {pending && <div className="mt-3 grid gap-2 min-[400px]:grid-cols-2"><button type="button" disabled={busy} onClick={() => respond(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-white transition hover:bg-primary-hover disabled:opacity-60">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Aceitar e confirmar</button><button type="button" disabled={busy} onClick={() => respond(false)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"><X className="h-4 w-4" />Não aceitar</button></div>}
  </section>;
}

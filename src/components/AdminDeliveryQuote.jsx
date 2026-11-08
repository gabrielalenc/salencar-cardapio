import React, { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, MessageCircle, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, parseBrazilianCurrency } from '../utils/formatters';
import { useNotifications } from './Notifications';

const digits = (value) => String(value || '').replace(/\D/g, '');

export function AdminDeliveryQuote({ order }) {
  const { currentUser, settings, saveDeliveryQuote } = useAuth();
  const { notify } = useNotifications();
  const [value, setValue] = useState(order.deliveryQuote == null ? '' : formatCurrency(order.deliveryQuote));
  const [busy, setBusy] = useState(false);
  useEffect(() => setValue(order.deliveryQuote == null ? '' : formatCurrency(order.deliveryQuote)), [order.databaseId, order.deliveryQuote]);

  const parsedQuote = parseBrazilianCurrency(value);
  const valid = Number.isFinite(parsedQuote) && parsedQuote >= 0;
  const canEdit = ['awaiting_delivery_quote', 'awaiting_customer_approval'].includes(order.status);
  const message = useMemo(() => {
    if (order.deliveryQuote == null) return '';
    return `Olá! Temos uma atualização sobre seu pedido na Salencar!\n\nSeus produtos: ${formatCurrency(order.subtotal)}\nValor da entrega: ${formatCurrency(order.deliveryQuote)}\nTotal do pedido: ${formatCurrency(order.total)}\n\nOrigem: ${settings.deliveryOrigin}\n\nPodemos confirmar seu pedido?`;
  }, [order.deliveryQuote, order.subtotal, order.total, settings.deliveryOrigin]);
  const phone = digits(order.phone);
  const whatsappUrl = phone && order.deliveryQuote != null ? `https://wa.me/${phone.startsWith('55') ? phone : `55${phone}`}?text=${encodeURIComponent(message)}` : '';

  const save = async (event) => {
    event.preventDefault();
    if (!canEdit || !valid || busy) return;
    setBusy(true);
    const result = await saveDeliveryQuote(order.databaseId, parsedQuote);
    setBusy(false);
    if (!result.ok) notify({ type: 'error', title: 'Cotação não salva', message: result.error });
    else notify({ type: 'success', title: 'Cotação salva', message: 'O cliente já pode aprovar ou recusar o valor na conta.' });
  };

  if (order.deliveryType !== 'delivery') return <section className="rounded-xl bg-stone-50 p-3 text-xs text-stone-600">Pedido para retirada; não requer cotação de entrega.</section>;

  return <section className="space-y-3 rounded-2xl border border-primary/15 bg-primary-light/30 p-4 sm:p-5">
    <div><h3 className="text-sm font-bold text-stone-900">Cotação de entrega</h3><p className="mt-1 text-xs leading-relaxed text-stone-600">Consulte manualmente o valor da corrida e salve a cotação para enviar ao cliente.</p></div>
    <div className="rounded-xl bg-white p-3 text-xs"><p className="font-semibold text-stone-500">Destino</p><p className="mt-1 break-words text-stone-800">{order.address || 'Endereço não informado'}</p><p className="mt-2 text-stone-500">Origem: {settings.deliveryOrigin}</p></div>
    <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-semibold uppercase text-stone-500">Produtos</p><p className="mt-1 text-sm font-bold text-stone-800">{formatCurrency(order.subtotal)}</p></div>
        <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase text-stone-500">Valor da entrega</span><span className="relative block"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">R$</span><input type="text" inputMode="decimal" autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} disabled={!canEdit || busy} placeholder="8,50" className="min-h-12 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-sm font-semibold tabular-nums text-stone-900 outline-none focus:border-primary/40 disabled:bg-stone-100" /></span></label>
        <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-semibold uppercase text-stone-500">Total final</p><p className="mt-1 text-sm font-bold text-primary">{valid ? formatCurrency(order.subtotal + parsedQuote) : order.deliveryQuote == null ? 'Aguardando cotação' : formatCurrency(order.subtotal + order.deliveryQuote)}</p></div>
      </div>
      {!valid && value !== '' && <p className="text-xs text-rose-700">Informe um valor válido, como R$ 8,50.</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        {canEdit && <button type="submit" disabled={!valid || busy} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{order.deliveryQuote == null ? 'Salvar cotação' : 'Atualizar cotação'}</button>}
        {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"><MessageCircle className="h-4 w-4" />Abrir WhatsApp para enviar</a>}
      </div>
    </form>
    <p className="text-[10px] leading-relaxed text-stone-500">O WhatsApp abrirá com a mensagem preenchida. O envio depende de você tocar em Enviar no aplicativo.</p>
  </section>;
}

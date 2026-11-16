import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clipboard, ExternalLink, LoaderCircle, MessageCircle, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, parseBrazilianCurrency } from '../utils/formatters';
import { buildDeliveryQuoteMessage, buildDeliveryQuoteWhatsAppUrl, calculateDeliveryTotal } from '../utils/deliveryQuote';
import { useNotifications } from './Notifications';

export function AdminDeliveryQuote({ order }) {
  const { settings, saveDeliveryQuote, markDeliveryQuoteSent } = useAuth();
  const { notify } = useNotifications();
  const [value, setValue] = useState(order.deliveryQuote == null ? '' : formatCurrency(order.deliveryQuote));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendingConfirmation, setSendingConfirmation] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => setValue(order.deliveryQuote == null ? '' : formatCurrency(order.deliveryQuote)), [order.databaseId, order.deliveryQuote]);
  useEffect(() => {
    let active = true;
    if (!order.databaseId || !supabase) return undefined;
    setHistory([]);
    setHistoryError('');
    (async () => {
      const { data, error } = await supabase.from('order_delivery_quote_history')
        .select('id, subtotal, delivery_quote, total, quoted_at, quoted_by, status, sent_at, sent_by')
        .eq('order_id', order.databaseId)
        .order('quoted_at', { ascending: false });
      if (error) throw error;
      const adminIds = [...new Set((data || []).flatMap((entry) => [entry.quoted_by, entry.sent_by]).filter(Boolean))];
      const adminsResult = adminIds.length
        ? await supabase.from('profiles').select('id, full_name').in('id', adminIds)
        : { data: [], error: null };
      if (adminsResult.error) throw adminsResult.error;
      const admins = new Map((adminsResult.data || []).map((admin) => [admin.id, admin.full_name || 'Administrador']));
      if (active) {
        setHistory((data || []).map((entry) => ({
          ...entry,
          quotedByName: admins.get(entry.quoted_by) || 'Administrador',
          sentByName: admins.get(entry.sent_by) || '',
        })));
      }
    })().catch((error) => {
        if (!active) return;
        setHistoryError('Histórico de cotações indisponível. Aplique a migration 20261115120000_delivery_quote_send_confirmation.sql.');
        console.error('Delivery quote history load failed:', { code: error.code, message: error.message });
      });
    return () => { active = false; };
  }, [order.databaseId, order.deliveryQuoteAt, order.deliveryQuoteSentAt, order.deliveryQuoteResponse, order.status]);

  const parsedQuote = parseBrazilianCurrency(value);
  const valid = Number.isFinite(parsedQuote) && parsedQuote >= 0 && parsedQuote <= 100000;
  const draftTotal = calculateDeliveryTotal(order.subtotal, parsedQuote);
  const canEdit = ['awaiting_delivery_quote', 'delivery_quote_ready', 'awaiting_customer_approval'].includes(order.status);
  const generatedMessage = useMemo(() => {
    if (order.deliveryQuote == null) return '';
    return buildDeliveryQuoteMessage(order);
  }, [order]);

  useEffect(() => setMessage(generatedMessage), [generatedMessage]);

  const whatsappUrl = buildDeliveryQuoteWhatsAppUrl(order.phone, message || generatedMessage);

  const save = async (event) => {
    event.preventDefault();
    if (!canEdit || !valid || busy) return;
    setBusy(true);
    try {
      const result = await saveDeliveryQuote(order.databaseId, parsedQuote);
      if (!result.ok) notify({ type: 'error', title: 'Cotação não salva', message: result.error });
      else notify({ type: 'success', title: 'Cotação realizada', message: 'O valor foi salvo. Revise a mensagem e confirme o envio depois de encaminhá-la.' });
    } catch (error) {
      notify({ type: 'error', title: 'Cotação não salva', message: error.message || 'Confira a conexão e tente novamente.' });
    } finally { setBusy(false); }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message || generatedMessage);
      notify({ type: 'success', title: 'Mensagem copiada', message: 'A cotação está pronta para colar.' });
    } catch {
      notify({ type: 'error', title: 'Não foi possível copiar', message: 'Selecione e copie o texto da mensagem manualmente.' });
    }
  };

  const confirmSent = async () => {
    setSendingConfirmation(true);
    try {
      const result = await markDeliveryQuoteSent(order.databaseId);
      if (!result.ok) notify({ type: 'error', title: 'Envio não confirmado', message: result.error });
      else notify({ type: 'success', title: 'Envio confirmado', message: 'O pedido agora aguarda a resposta do cliente.' });
    } catch (error) {
      notify({ type: 'error', title: 'Envio não confirmado', message: error.message || 'Confira a conexão e tente novamente.' });
    } finally { setSendingConfirmation(false); }
  };

  if (order.deliveryType !== 'delivery') return <section className="rounded-xl bg-stone-50 p-3 text-xs text-stone-600">Pedido para retirada; não requer cotação de entrega.</section>;

  return <section className="space-y-4 rounded-2xl border border-primary/15 bg-primary-light/30 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h3 className="text-sm font-bold text-stone-900">Cotação de entrega</h3><p className="mt-1 text-xs leading-relaxed text-stone-600">Consulte o valor manualmente, revise a mensagem e confirme o envio depois de encaminhá-la.</p></div>
      {order.deliveryQuoteSentAt && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">Cotação enviada · aguardando cliente</span>}
      {!order.deliveryQuoteSentAt && order.deliveryQuote != null && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">Cotação realizada · envio pendente</span>}
    </div>

    <div className="grid gap-2 rounded-xl bg-white p-3 text-xs sm:grid-cols-2">
      <div><p className="font-semibold text-stone-500">Cliente</p><p className="mt-1 break-words text-stone-800">{order.customerName || 'Nome não informado'}</p><p className="mt-0.5 break-all text-stone-600">{order.phone || 'Telefone não informado'}</p></div>
      <div><p className="font-semibold text-stone-500">Endereço de entrega</p><p className="mt-1 whitespace-pre-line break-words text-stone-800">{order.address || 'Endereço não informado'}</p></div>
      <div className="sm:col-span-2"><p className="font-semibold text-stone-500">Endereço de origem da loja</p><p className="mt-1 break-words text-stone-800">{settings.deliveryOrigin || settings.pickupAddress}</p></div>
    </div>

    <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-semibold uppercase text-stone-500">Subtotal dos produtos</p><p className="mt-1 text-sm font-bold text-stone-800">{formatCurrency(order.subtotal)}</p></div>
        <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase text-stone-500">Valor da entrega</span><span className="relative block"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">R$</span><input type="text" inputMode="decimal" autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} disabled={!canEdit || busy} placeholder="8,50" aria-label="Valor da entrega" className="min-h-12 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-sm font-semibold tabular-nums text-stone-900 outline-none focus:border-primary/40 disabled:bg-stone-100" /></span></label>
        <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-semibold uppercase text-stone-500">Total final</p><p className="mt-1 text-sm font-bold text-primary">{valid && value !== '' ? formatCurrency(draftTotal) : order.deliveryQuote == null ? 'Aguardando cotação' : formatCurrency(order.total)}</p></div>
      </div>
      {!valid && value !== '' && <p role="alert" className="text-xs text-rose-700">Informe um valor entre R$ 0,00 e R$ 100.000,00.</p>}
      {canEdit && <button type="submit" disabled={!valid || value === '' || busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{order.deliveryQuote == null ? 'Salvar cotação' : 'Salvar e atualizar cotação'}</button>}
    </form>

    {order.deliveryQuote != null && <div className="space-y-2 border-t border-primary/10 pt-4">
      <label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Mensagem da cotação (pode revisar e editar)</span><textarea rows={8} value={message || generatedMessage} onChange={(event) => setMessage(event.target.value)} className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-stone-700 outline-none focus:border-primary/50" /></label>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={copyMessage} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"><Clipboard className="h-4 w-4" />Copiar mensagem</button>
        {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"><MessageCircle className="h-4 w-4" />Abrir WhatsApp para revisar e enviar<ExternalLink className="h-3.5 w-3.5" /></a> : <button type="button" disabled className="min-h-11 rounded-xl bg-stone-200 px-3 text-xs font-semibold text-stone-500">Telefone não informado</button>}
      </div>
      {!order.deliveryQuoteSentAt && <button type="button" disabled={sendingConfirmation} onClick={confirmSent} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50">{sendingConfirmation ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Confirmar que enviei a cotação</button>}
      <p className="text-[10px] leading-relaxed text-stone-500">Abrir o WhatsApp não altera o status. Confirme o envio somente depois de enviar a mensagem ao cliente.</p>
    </div>}
    {!!history.length && <div className="border-t border-primary/10 pt-3"><h4 className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Histórico de cotações</h4><ul className="mt-2 space-y-2">{history.map((entry) => <li key={entry.id} className="rounded-xl bg-white p-3 text-[11px] text-stone-600"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-stone-800">{({ quoted: 'Cotação realizada', sent: 'Enviada · aguardando cliente', accepted: 'Pedido confirmado', rejected: 'Recusada' })[entry.status] || 'Cotação registrada'}</span><span>{new Date(entry.quoted_at).toLocaleString('pt-BR')}</span></div><div className="mt-2 grid grid-cols-3 gap-2"><span>Produtos<strong className="mt-0.5 block text-stone-800">{formatCurrency(entry.subtotal)}</strong></span><span>Frete<strong className="mt-0.5 block text-stone-800">{formatCurrency(entry.delivery_quote)}</strong></span><span>Total<strong className="mt-0.5 block text-stone-800">{formatCurrency(entry.total)}</strong></span></div><p className="mt-2">Cotada por: {entry.quotedByName}{entry.sent_at ? ` · Enviada por: ${entry.sentByName || 'Administrador'}` : ''}</p></li>)}</ul></div>}
    {historyError && <p role="alert" className="text-[10px] text-amber-800">{historyError}</p>}
  </section>;
}

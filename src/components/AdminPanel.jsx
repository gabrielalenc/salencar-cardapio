import React, { useMemo, useState } from 'react';
import { ClipboardList, ExternalLink, Eye, Filter, LogOut, Mail, Phone, Search, ShieldCheck, X, LoaderCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { AdminDeliveryQuote } from './AdminDeliveryQuote';
import { useNotifications } from './Notifications';

const STATUSES = [
  { id: 'awaiting_delivery_quote', label: 'Aguardando cotação de entrega' },
  { id: 'awaiting_customer_approval', label: 'Aguardando aprovação do cliente' },
  { id: 'confirmed', label: 'Pedido confirmado' },
  { id: 'preparing', label: 'Em preparação' },
  { id: 'out_for_delivery', label: 'Saiu para entrega' },
  { id: 'completed', label: 'Concluído' },
  { id: 'quote_rejected', label: 'Cotação recusada' },
  { id: 'cancelled', label: 'Cancelado' },
  { id: 'new', label: 'Pedido legado' },
];
const STATUS_STYLE = {
  awaiting_delivery_quote: 'bg-amber-50 text-amber-800',
  awaiting_customer_approval: 'bg-sky-50 text-sky-800',
  confirmed: 'bg-emerald-50 text-emerald-700',
  new: 'bg-stone-100 text-stone-700',
  preparing: 'bg-amber-50 text-amber-700',
  out_for_delivery: 'bg-violet-50 text-violet-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-700',
  quote_rejected: 'bg-rose-50 text-rose-700',
};
const MESSAGE_TEMPLATES = [
  'Olá! Estamos entrando em contato sobre seu pedido na Salencar.',
  'Seu pedido está sendo preparado!',
  'Seu pedido já saiu para entrega!',
  'Precisamos confirmar algumas informações sobre seu pedido.',
  'Infelizmente, precisamos cancelar seu pedido. Pedimos desculpas pelo inconveniente.',
];
const money = (value) => formatCurrency(Number(value) || 0);
const dateTime = (value) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const digits = (value) => String(value || '').replace(/\D/g, '');
const whatsappPhone = (value) => digits(value).startsWith('55') ? digits(value) : `55${digits(value)}`;

function StatusBadge({ status }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLE[status] || 'bg-stone-100 text-stone-600'}`}>{STATUSES.find((item) => item.id === status)?.label || status}</span>;
}

function OrderItems({ items = [] }) {
  return <div className="space-y-2">{items.map((item, index) => <div key={`${item.productId || item.productName}-${index}`} className="flex items-start justify-between gap-3 rounded-lg bg-stone-50 p-3"><div className="min-w-0"><p className="break-words text-xs font-semibold text-stone-800">{item.quantity}× {item.productName || item.product?.name}</p>{item.option && <p className="mt-0.5 text-[11px] text-stone-500">{item.option}</p>}{item.extras?.length > 0 && <p className="mt-0.5 text-[10px] text-stone-500">Adicionais: {item.extras.map((extra) => typeof extra === 'string' ? extra : extra.name).filter(Boolean).join(', ')}</p>}</div><span className="shrink-0 text-xs font-semibold text-stone-700">{money(item.totalPrice ?? item.quantity * item.unitPrice)}</span></div>)}</div>;
}

export function AdminPanel({ onClose }) {
  const { currentUser, logout, orders, ordersLoading, ordersError, refreshOrders, updateOrderStatus } = useAuth();
  const { notify } = useNotifications();
  const [orderFilter, setOrderFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [messageText, setMessageText] = useState(MESSAGE_TEMPLATES[0]);
  const [feedback, setFeedback] = useState('');
  const [busyOrderId, setBusyOrderId] = useState('');

  const visibleOrders = useMemo(() => orders.filter((order) => {
    const statusMatches = orderFilter === 'all' || order.status === orderFilter;
    const term = query.trim().toLowerCase();
    const searchMatches = !term || `${order.id} ${order.customerName} ${order.customerEmail} ${order.phone}`.toLowerCase().includes(term);
    return statusMatches && searchMatches;
  }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [orders, orderFilter, query]);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;

  const setOrderStatus = async (order, status) => {
    if (busyOrderId === order.id) return;
    setBusyOrderId(order.id);
    const result = await updateOrderStatus(order.id, status);
    setBusyOrderId('');
    setFeedback(result?.ok ? 'Status atualizado.' : result?.error || 'Não foi possível atualizar o status.');
    if (!result?.ok) notify({ type: 'error', title: 'Status não atualizado', message: result?.error || 'Tente novamente.' });
    else notify({ type: 'success', title: 'Status atualizado' });
    window.setTimeout(() => setFeedback(''), 3200);
  };

  const sendContact = () => {
    if (!selectedOrder) return;
    const body = `${messageText}\n\nPedido: ${selectedOrder.id}`;
    const phone = digits(selectedOrder.phone);
    if (phone) window.open(`https://wa.me/${whatsappPhone(phone)}?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
    else if (selectedOrder.customerEmail) window.open(`mailto:${selectedOrder.customerEmail}?subject=${encodeURIComponent(`Pedido ${selectedOrder.id} — Salencar`)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
  };

  const logoutAdmin = async () => {
    const result = await logout();
    if (result?.ok) onClose();
    else { setFeedback(result?.error || 'Não foi possível encerrar a sessão.'); notify({ type: 'error', title: 'Não foi possível sair', message: result?.error }); }
  };

  if (currentUser?.role !== 'admin') return null;

  return <div className="admin-panel fixed inset-0 z-[90] flex flex-col overflow-y-auto overscroll-y-contain bg-stone-50 text-stone-800">
    <header className="sticky top-0 z-20 flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary"><ShieldCheck className="h-5 w-5" /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Salencar</p><h1 className="truncate text-base font-bold text-stone-900 sm:text-lg">Pedidos</h1></div></div>
      <div className="flex shrink-0 items-center gap-2"><span className="hidden max-w-48 truncate text-xs font-medium text-stone-500 sm:block">{currentUser.name}</span><button type="button" onClick={onClose} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-50"><X className="h-4 w-4" /><span className="hidden sm:inline">Voltar ao site</span></button><button type="button" onClick={logoutAdmin} aria-label="Sair da conta" title="Sair da conta" className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-hover"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sair</span></button></div>
    </header>

    <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-3 pb-8 sm:p-5 lg:p-8">
      <section className="flex flex-col justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle sm:flex-row sm:items-end sm:p-5">
        <div><h2 className="text-lg font-bold text-stone-900">Pedidos recebidos</h2><p className="mt-1 text-xs text-stone-500">Pedidos carregados da conta administrativa no Supabase.</p><p className="mt-2 text-xs font-semibold text-primary">{orders.length} {orders.length === 1 ? 'pedido real' : 'pedidos reais'}</p></div>
        <div className="grid gap-2 sm:min-w-[380px] sm:grid-cols-[minmax(0,1fr)_auto]"><label className="relative"><span className="sr-only">Buscar pedidos</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente ou pedido" className="min-h-11 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-primary/40" /></label><label className="relative"><span className="sr-only">Filtrar por status</span><Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)} className="min-h-11 w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-8 text-xs font-semibold text-stone-700 outline-none sm:w-auto"><option value="all">Todos os status</option>{STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div>
      </section>

      {feedback && <p role="status" className="rounded-xl border border-primary/15 bg-primary-light px-3 py-2 text-xs font-semibold text-primary">{feedback}</p>}

      {ordersLoading ? <section role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-14 text-sm text-stone-500"><LoaderCircle className="h-4 w-4 animate-spin text-primary" />Carregando pedidos do Supabase…</section> : ordersError ? <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><p className="font-semibold">Não foi possível carregar os pedidos.</p><p className="mt-1 text-xs">{ordersError}</p><button type="button" onClick={refreshOrders} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"><RotateCcw className="h-3.5 w-3.5" />Tentar novamente</button></section> : orders.length === 0 ? <section className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400"><ClipboardList className="h-6 w-6" /></span><h2 className="mt-4 text-sm font-bold text-stone-800">Nenhum pedido recebido até o momento.</h2><p className="mt-1 text-xs text-stone-500">Os pedidos reais aparecerão aqui quando forem registrados.</p></section> : visibleOrders.length === 0 ? <p className="rounded-xl bg-white p-8 text-center text-xs text-stone-500">Nenhum pedido corresponde aos filtros.</p> : <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-subtle">
        <div className="hidden overflow-x-auto lg:block"><table className="min-w-[900px] w-full text-left text-xs"><thead className="bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500"><tr><th className="px-4 py-3">Pedido / Data</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Contato</th><th className="px-4 py-3">Produtos</th><th className="px-4 py-3">Subtotal</th><th className="px-4 py-3">Entrega</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Detalhes</th></tr></thead><tbody className="divide-y divide-stone-100">{visibleOrders.map((order) => <tr key={order.id} className="hover:bg-stone-50/70"><td className="px-4 py-3"><p className="font-bold text-stone-800">{order.id}</p><p className="mt-1 text-[10px] text-stone-500">{dateTime(order.createdAt)}</p></td><td className="px-4 py-3"><p className="font-semibold text-stone-800">{order.customerName}</p><p className="mt-1 text-[10px] text-stone-500">{order.customerEmail || '—'}</p></td><td className="px-4 py-3 text-stone-600">{order.phone || '—'}</td><td className="max-w-60 px-4 py-3 text-stone-600">{(order.items || []).map((item) => `${item.quantity}× ${item.productName || item.product?.name}`).join(', ')}</td><td className="px-4 py-3 font-semibold text-stone-700">{money(order.subtotal)}</td><td className="px-4 py-3 text-stone-600">{order.deliveryType === 'delivery' && order.deliveryQuote == null ? 'A cotar' : money(order.deliveryFee)}</td><td className="px-4 py-3 font-bold text-stone-800">{order.deliveryType === 'delivery' && order.deliveryQuote == null ? 'Pendente' : money(order.total)}</td><td className="px-4 py-3"><select disabled={busyOrderId === order.id} value={order.status} onChange={(event) => setOrderStatus(order, event.target.value)} aria-label={`Status do pedido ${order.id}`} className="max-w-40 rounded-lg border border-stone-200 bg-white px-2 py-2 text-[10px] font-semibold text-stone-700 disabled:opacity-50">{STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></td><td className="px-4 py-3"><button type="button" onClick={() => { setSelectedOrderId(order.id); setMessageText(MESSAGE_TEMPLATES[0]); }} aria-label={`Ver pedido ${order.id}`} className="rounded-lg p-2 text-primary hover:bg-primary-light"><Eye className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
        <div className="space-y-3 p-3 lg:hidden">{visibleOrders.map((order) => <article key={order.id} className="rounded-xl border border-stone-200 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-all text-xs font-bold text-stone-900">{order.id}</p><p className="mt-1 text-[11px] text-stone-500">{dateTime(order.createdAt)}</p></div><span className="shrink-0 text-right text-sm font-bold text-primary">{order.deliveryType === 'delivery' && order.deliveryQuote == null ? 'Pendente' : money(order.total)}</span></div><p className="mt-3 break-words text-xs font-semibold text-stone-800">{order.customerName}</p><p className="mt-0.5 break-all text-[11px] text-stone-500">{order.customerEmail || '—'} · {order.phone || 'Sem telefone'}</p><p className="mt-2 break-words text-xs leading-relaxed text-stone-600">{(order.items || []).map((item) => `${item.quantity}× ${item.productName || item.product?.name}`).join(', ')}</p><div className="mt-3 flex items-center gap-2"><select disabled={busyOrderId === order.id} value={order.status} onChange={(event) => setOrderStatus(order, event.target.value)} aria-label={`Status do pedido ${order.id}`} className="min-h-11 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 text-xs font-semibold disabled:opacity-50">{STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button type="button" onClick={() => { setSelectedOrderId(order.id); setMessageText(MESSAGE_TEMPLATES[0]); }} aria-label={`Ver pedido ${order.id}`} className="min-h-11 min-w-11 rounded-lg bg-primary-light p-2 text-primary"><Eye className="h-4 w-4" /></button></div></article>)}</div>
      </section>}
    </main>

    {selectedOrder && <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-y-contain bg-stone-950/55 p-3 backdrop-blur-sm sm:items-center" onClick={() => setSelectedOrderId(null)}><section role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-elevated" onClick={(event) => event.stopPropagation()}><header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-primary">Pedido real</p><h2 id="order-detail-title" className="mt-0.5 text-lg font-bold text-stone-900">{selectedOrder.id}</h2></div><button type="button" onClick={() => setSelectedOrderId(null)} aria-label="Fechar detalhes" className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button></header><div className="space-y-5 p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-2"><section className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] font-bold uppercase text-stone-400">Cliente</p><p className="mt-1 text-sm font-semibold text-stone-800">{selectedOrder.customerName}</p><p className="break-all text-xs text-stone-500">{selectedOrder.customerEmail || 'E-mail não informado'}</p><p className="mt-1 text-xs text-stone-500">{selectedOrder.phone || 'Telefone não informado'}</p></section><section className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] font-bold uppercase text-stone-400">Pedido</p><p className="mt-1 text-xs text-stone-700">{dateTime(selectedOrder.createdAt)}</p><p className="mt-2"><StatusBadge status={selectedOrder.status} /></p><p className="mt-2 text-xs text-stone-500">Pagamento: {selectedOrder.paymentMethod || '—'}</p></section></div><section><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">Produtos e quantidades</h3><OrderItems items={selectedOrder.items} /></section><AdminDeliveryQuote order={selectedOrder} /><div className="grid gap-3 sm:grid-cols-2"><section className="rounded-xl border border-stone-100 p-3"><p className="text-[10px] font-bold uppercase text-stone-400">Entrega</p><p className="mt-1 whitespace-pre-line break-words text-xs text-stone-700">{selectedOrder.deliveryType === 'pickup' ? 'Retirada no balcão' : selectedOrder.address || 'Endereço não informado'}</p></section><section className="rounded-xl border border-stone-100 p-3"><div className="flex justify-between text-xs text-stone-500"><span>Subtotal</span><span>{money(selectedOrder.subtotal)}</span></div><div className="mt-1 flex justify-between text-xs text-stone-500"><span>Entrega</span><span>{money(selectedOrder.deliveryFee)}</span></div><div className="mt-2 flex justify-between border-t border-stone-100 pt-2 text-sm font-bold text-stone-900"><span>Total</span><span className="text-primary">{money(selectedOrder.total)}</span></div></section></div>{selectedOrder.orderNotes && <section className="rounded-xl bg-amber-50 p-3"><p className="text-[10px] font-bold uppercase text-amber-700">Observações</p><p className="mt-1 break-words text-xs text-amber-900">{selectedOrder.orderNotes}</p></section>}<section><label className="mb-1.5 block text-xs font-semibold text-stone-700">Mensagem de contato</label><select onChange={(event) => setMessageText(event.target.value)} value={messageText} className="mb-2 min-h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-xs text-stone-700">{MESSAGE_TEMPLATES.map((message) => <option key={message} value={message}>{message}</option>)}</select><textarea rows={3} value={messageText} onChange={(event) => setMessageText(event.target.value)} className="w-full resize-y rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-primary/50" /><button type="button" onClick={sendContact} disabled={!digits(selectedOrder.phone) && !selectedOrder.customerEmail} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{digits(selectedOrder.phone) ? <Phone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}{digits(selectedOrder.phone) ? 'Abrir WhatsApp' : selectedOrder.customerEmail ? 'Abrir e-mail' : 'Sem contato'}<ExternalLink className="h-3.5 w-3.5" /></button></section><label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Atualizar status</span><select disabled={busyOrderId === selectedOrder.id} value={selectedOrder.status} onChange={(event) => setOrderStatus(selectedOrder, event.target.value)} className="min-h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-700 disabled:opacity-50">{STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label></div></section></div>}
  </div>;
}

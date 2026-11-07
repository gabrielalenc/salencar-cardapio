import React, { useMemo } from 'react';
import { Check, CheckCircle2, CookingPot, MapPin, PackageCheck, Truck, X, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { customerOrderStatus, getCustomerOrders, splitCustomerOrders } from '../utils/orders';

const STEPS = [
  { id: 'confirmed', label: 'Pedido recebido', detail: 'Recebemos os dados do seu pedido.', icon: PackageCheck },
  { id: 'preparing', label: 'Em preparação', detail: 'O estabelecimento está preparando seu pedido.', icon: CookingPot },
  { id: 'out_for_delivery', label: 'Saiu para entrega', detail: 'Seu pedido está a caminho!', icon: Truck },
  { id: 'completed', label: 'Concluído', detail: 'Pedido entregue ou retirado. Obrigado!', icon: CheckCircle2 },
];

const dateTime = (value) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function TrackingCard({ order }) {
  const cancelled = order.status === 'cancelled';
  const stage = ({ confirmed: 0, preparing: 1, out_for_delivery: 2, completed: 3 })[order.status] ?? -1;
  const statusLabel = customerOrderStatus(order.status);
  const statusMessage = cancelled ? 'Este pedido foi cancelado.' : order.status === 'new' ? 'Seu pedido foi registrado e aguarda confirmação.' : STEPS[stage]?.detail || 'Consulte esta página para acompanhar as próximas etapas.';

  return <article className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle sm:p-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h3 className="break-all text-sm font-bold text-stone-900">Pedido {order.id}</h3><p className="mt-1 text-[11px] text-stone-500">{dateTime(order.createdAt)}</p></div>
      <span className={`inline-flex min-h-8 items-center rounded-full px-3 py-1 text-[11px] font-bold ${cancelled ? 'bg-rose-50 text-rose-700' : order.status === 'new' ? 'bg-amber-50 text-amber-800' : order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-primary-light text-primary'}`}>{statusLabel}</span>
    </header>

    <section className="mt-4 rounded-xl bg-stone-50 p-3">
      <h4 className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Itens do pedido</h4>
      <ul className="mt-2 space-y-2">{(order.items || []).map((item, index) => <li key={`${item.productId || item.productName || 'item'}-${index}`} className="flex min-w-0 items-start justify-between gap-3 text-xs"><span className="min-w-0 break-words text-stone-700"><strong>{item.quantity}×</strong> {item.productName || item.product?.name || 'Produto'}{(item.option || item.base?.name) && <span className="block text-[11px] text-stone-500">Sabor: {item.option || item.base?.name}</span>}</span><span className="shrink-0 font-semibold text-stone-700">{formatCurrency(item.totalPrice ?? Number(item.unitPrice || 0) * Number(item.quantity || 0))}</span></li>)}</ul>
    </section>

    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><dt className="text-stone-500">Pagamento</dt><dd className="break-words text-right font-medium text-stone-700">{order.paymentMethod || '—'}</dd><dt className="text-stone-500">Total</dt><dd className="text-right font-bold text-stone-900">{formatCurrency(order.total)}</dd>{order.deliveryType === 'delivery' && <><dt className="flex items-center gap-1 text-stone-500"><MapPin className="h-3.5 w-3.5" />Entrega</dt><dd className="break-words text-right text-stone-700">{order.address || 'Endereço não informado'}</dd></>}</dl>

    {cancelled ? <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs leading-relaxed text-rose-800"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{statusMessage}</span></div> : <>
      <p className="mt-4 text-xs font-semibold text-primary">{statusMessage}</p>
      <ol aria-label={`Etapas do pedido ${order.id}`} className="mt-4 space-y-0">{STEPS.map(({ id, label, icon: Icon }, index) => {
        const done = stage >= 0 && (index < stage || order.status === 'completed');
        const current = index === stage && order.status !== 'completed';
        return <li key={id} className="relative flex min-h-12 gap-3 pb-3 last:pb-0"><span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done ? 'bg-emerald-100 text-emerald-700' : current ? 'bg-primary text-white' : 'bg-stone-100 text-stone-400'} ${current ? 'animate-pulse' : ''}`}>{done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span>{index < STEPS.length - 1 && <span aria-hidden="true" className={`absolute left-[15px] top-8 h-[calc(100%-12px)] w-0.5 ${done ? 'bg-emerald-300' : 'bg-stone-200'}`} />}<span className={`min-w-0 pt-1 text-xs ${current ? 'font-bold text-primary' : done ? 'font-medium text-stone-700' : 'text-stone-400'}`}>{label}{current && <span className="ml-2 rounded-full bg-primary-light px-2 py-0.5 text-[9px] font-bold">Agora</span>}</span></li>;
      })}</ol>
    </>}
  </article>;
}

export function OrderTrackingModal({ isOpen, onClose }) {
  const { currentUser, orders } = useAuth();
  const customerOrders = useMemo(() => getCustomerOrders(orders, currentUser), [orders, currentUser]);
  const { active: activeOrders, past: pastOrders } = useMemo(() => splitCustomerOrders(customerOrders), [customerOrders]);

  if (!isOpen || currentUser?.role !== 'customer') return null;

  return <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-stone-950/55 p-3 backdrop-blur-sm" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="tracking-title" className="my-auto max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-elevated" onClick={(event) => event.stopPropagation()}>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-100 bg-white px-4 py-4 sm:px-6"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Salencar</p><h2 id="tracking-title" className="mt-0.5 text-lg font-bold text-stone-900">Acompanhar pedido</h2><p className="text-xs text-stone-500">Olá, {currentUser.name}. Aqui estão seus pedidos.</p></div><button type="button" onClick={onClose} aria-label="Fechar acompanhamento" className="min-h-10 min-w-10 rounded-full p-2 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button></header>
      <div className="space-y-5 p-4 sm:p-6">{!customerOrders.length ? <div className="rounded-2xl bg-stone-50 px-5 py-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary"><PackageCheck className="h-6 w-6" /></span><h3 className="mt-3 text-sm font-bold text-stone-900">Ainda não há pedidos</h3><p className="mt-1 text-xs leading-relaxed text-stone-500">Quando fizer um pedido, poderá acompanhar cada etapa por aqui.</p><button type="button" onClick={() => { onClose(); window.location.hash = '#cardapio'; }} className="mt-4 min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">Voltar ao cardápio</button></div> : <>
        {!!activeOrders.length && <section className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-stone-900">Em andamento</h3><span className="rounded-full bg-primary-light px-2.5 py-1 text-[10px] font-bold text-primary">{activeOrders.length}</span></div>{activeOrders.map((order) => <TrackingCard key={order.id || order.createdAt} order={order} />)}</section>}
        {!!pastOrders.length && <section className="space-y-3"><h3 className="text-sm font-bold text-stone-700">Histórico</h3>{pastOrders.map((order) => <TrackingCard key={order.id || order.createdAt} order={order} />)}</section>}
      </>}</div>
    </section>
  </div>;
}

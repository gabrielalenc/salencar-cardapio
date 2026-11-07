import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowUpRight, BarChart3, Boxes, CalendarDays, Check,
  CircleDollarSign, ClipboardList, ExternalLink, Eye, Filter, LayoutDashboard,
  LogOut, Mail, Package, Phone, Search, Settings2, ShieldCheck, ShoppingBag, Trash2, UserRound, Users, X,
} from 'lucide-react';
import { PRODUCTS } from '../data/products';
import { useAuth, STOCK_FLAVORS } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Pedidos', icon: ClipboardList },
  { id: 'customers', label: 'Clientes', icon: Users },
  { id: 'products', label: 'Produtos', icon: Package },
  { id: 'inventory', label: 'Estoque', icon: Boxes },
  { id: 'settings', label: 'Configurações', icon: Settings2 },
];
const PERIODS = [
  { id: 'today', label: 'Hoje', days: 1 }, { id: 'week', label: '1 semana', days: 7 },
  { id: 'month', label: '1 mês', days: 30 }, { id: '3m', label: '3 meses', days: 90 },
  { id: '6m', label: '6 meses', days: 180 }, { id: 'year', label: '1 ano', days: 365 },
];
const STATUSES = [
  { id: 'confirmed', label: 'Pedido recebido' },
  { id: 'new', label: 'Aguardando confirmação' }, { id: 'preparing', label: 'Em preparação' },
  { id: 'out_for_delivery', label: 'Saiu para entrega' }, { id: 'completed', label: 'Concluído' },
  { id: 'cancelled', label: 'Cancelado' },
];
const STATUS_STYLE = {
  confirmed: 'bg-emerald-50 text-emerald-700',
  new: 'bg-sky-50 text-sky-700', preparing: 'bg-amber-50 text-amber-700',
  out_for_delivery: 'bg-violet-50 text-violet-700', completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-700',
};
const MESSAGE_TEMPLATES = [
  'Olá! Estamos entrando em contato sobre seu pedido na Salencar.',
  'Infelizmente, precisamos cancelar seu pedido. Pedimos desculpas pelo inconveniente.',
  'Seu pedido está sendo preparado!',
  'Seu pedido já saiu para entrega!',
  'Precisamos confirmar algumas informações sobre seu pedido.',
];
const money = (value) => formatCurrency(Number(value) || 0);
const dateTime = (value) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const dateOnly = (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '—';
const digits = (value) => String(value || '').replace(/\D/g, '');
const whatsappPhone = (value) => {
  const phone = digits(value);
  return phone.startsWith('55') ? phone : `55${phone}`;
};
const isCancelled = (order) => order.status === 'cancelled';

function StatusBadge({ status }) {
  const label = STATUSES.find((item) => item.id === status)?.label || status;
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLE[status] || 'bg-stone-100 text-stone-600'}`}>{label}</span>;
}

function MetricCard({ label, value, note, icon: Icon, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-light text-primary', emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700',
    blue: 'bg-sky-50 text-sky-700', violet: 'bg-violet-50 text-violet-700',
  };
  return <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-stone-500">{label}</p><p className="mt-2 text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">{value}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span></div>{note && <p className="mt-2 text-[11px] text-stone-400">{note}</p>}</article>;
}

function PanelCard({ title, subtitle, action, children, className = '' }) {
  return <section className={`rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle sm:p-5 ${className}`}><div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-stone-900">{title}</h3>{subtitle && <p className="mt-1 text-xs text-stone-500">{subtitle}</p>}</div>{action}</div>{children}</section>;
}

function SourceToggle({ value, onChange }) {
  return <div className="inline-flex rounded-xl border border-stone-200 bg-stone-50 p-1"><button type="button" onClick={() => onChange('real')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${value === 'real' ? 'bg-white text-primary shadow-subtle' : 'text-stone-500'}`}>Pedidos reais</button><button type="button" onClick={() => onChange('demo')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${value === 'demo' ? 'bg-white text-amber-700 shadow-subtle' : 'text-stone-500'}`}>Demonstração</button></div>;
}

function BarList({ items, valueFormatter = (value) => String(value), color = 'bg-primary' }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (!items.length) return <p className="py-8 text-center text-xs text-stone-400">Sem dados para este período.</p>;
  return <div className="space-y-3">{items.slice(0, 6).map((item) => <div key={item.label}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate font-medium text-stone-700">{item.label}</span><span className="shrink-0 font-semibold text-stone-500">{valueFormatter(item.value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, (item.value / max) * 100)}%` }} /></div></div>)}</div>;
}

const CHART_COLORS = ['#70283F', '#B84E64', '#D58A68', '#4D87A5', '#7E9C63', '#E3B34A', '#8E6BA8', '#477E70'];
function PieChart({ items, valueFormatter = (value) => String(value) }) {
  const visible = items.filter((item) => item.value > 0).slice(0, 8);
  const total = visible.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <p className="py-8 text-center text-xs text-stone-400">Sem dados para este período.</p>;
  let angle = -Math.PI / 2;
  const slices = visible.map((item, index) => {
    const portion = item.value / total; const next = angle + portion * Math.PI * 2;
    const x1 = 100 + 90 * Math.cos(angle); const y1 = 100 + 90 * Math.sin(angle);
    const x2 = 100 + 90 * Math.cos(next); const y2 = 100 + 90 * Math.sin(next);
    const path = portion > .999 ? 'M 100 10 A 90 90 0 1 1 99.99 10 Z' : `M 100 100 L ${x1} ${y1} A 90 90 0 ${portion > .5 ? 1 : 0} 1 ${x2} ${y2} Z`;
    angle = next;
    return { ...item, path, color: CHART_COLORS[index], percent: Math.round(portion * 100) };
  });
  return <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row"><svg viewBox="0 0 200 200" role="img" aria-label={`Gráfico de participação, total ${valueFormatter(total)}`} className="h-40 w-40 max-w-full shrink-0"><circle cx="100" cy="100" r="91" fill="#f5f5f4" />{slices.map((slice) => <path key={slice.label} d={slice.path} fill={slice.color} stroke="white" strokeWidth="2"><title>{`${slice.label}: ${valueFormatter(slice.value)} (${slice.percent}%)`}</title></path>)}<circle cx="100" cy="100" r="49" fill="white" /><text x="100" y="96" textAnchor="middle" fontSize="10" fill="#78716c">Total</text><text x="100" y="114" textAnchor="middle" fontSize="13" fontWeight="700" fill="#292524">{valueFormatter(total)}</text></svg><ul className="w-full min-w-0 space-y-2">{slices.map((slice) => <li key={slice.label} className="flex min-w-0 items-start gap-2 text-[11px]"><span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: slice.color }} /><span className="min-w-0 flex-1 break-words text-stone-600">{slice.label}<span className="ml-1 text-stone-400">{slice.percent}%</span></span><span className="shrink-0 font-semibold text-stone-700">{valueFormatter(slice.value)}</span></li>)}</ul></div>;
}

function RevenueChart({ items }) {
  if (!items.length) return <p className="py-10 text-center text-xs text-stone-400">Sem faturamento neste período.</p>;
  const width = 640; const height = 190; const pad = { left: 12, right: 12, top: 15, bottom: 30 };
  const max = Math.max(1, ...items.map((item) => item.value));
  const points = items.map((item, index) => ({
    x: pad.left + (items.length === 1 ? (width - pad.left - pad.right) / 2 : index * (width - pad.left - pad.right) / (items.length - 1)),
    y: pad.top + (height - pad.top - pad.bottom) * (1 - item.value / max),
  }));
  const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${points.at(-1).x} ${height - pad.bottom} L ${points[0].x} ${height - pad.bottom} Z`;
  const labelEvery = Math.max(1, Math.ceil(items.length / 6));
  return <div><div className="mb-2 flex justify-between text-[10px] text-stone-400"><span>{money(max)} máximo</span><span>{money(0)}</span></div><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico do faturamento ao longo do período" className="h-44 w-full overflow-visible"><defs><linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#70283F" stopOpacity=".22" /><stop offset="100%" stopColor="#70283F" stopOpacity="0" /></linearGradient></defs><path d={area} fill="url(#revenue-fill)" /><path d={line} fill="none" stroke="#70283F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{points.map((point, index) => <g key={`${items[index].label}-${index}`}><circle cx={point.x} cy={point.y} r="3.5" fill="#fff" stroke="#70283F" strokeWidth="2" /><title>{`${items[index].label}: ${money(items[index].value)}`}</title>{(index % labelEvery === 0 || index === items.length - 1) && <text x={point.x} y={height - 7} textAnchor="middle" fontSize="10" fill="#88766B">{items[index].label}</text>}</g>)}</svg></div>;
}

function DailyOrdersChart({ items }) {
  const totalOrders = items.reduce((sum, item) => sum + item.value, 0);
  if (!totalOrders) return <p className="py-8 text-center text-xs text-stone-400">Sem pedidos não cancelados neste período.</p>;
  const width = Math.max(620, items.length * 22); const height = 170; const pad = { left: 8, right: 8, top: 12, bottom: 28 };
  const max = Math.max(1, ...items.map((item) => item.value));
  const step = Math.max(1, Math.ceil(items.length / 8));
  return <div className="overflow-x-auto pb-2"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Quantidade diária de pedidos não cancelados" className="h-40" style={{ width }}><line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} stroke="#E7D9CC" />{items.map((item, index) => {
    const barHeight = (item.value / max) * (height - pad.top - pad.bottom);
    const x = pad.left + index * ((width - pad.left - pad.right) / items.length);
    return <g key={item.fullDate}><rect x={x + 4} y={height - pad.bottom - barHeight} width="12" height={barHeight} rx="4" fill="#4D87A5" opacity={item.value ? '.9' : '.12'}><title>{`${item.fullDate}: ${item.value} pedidos`}</title></rect>{index % step === 0 && <text x={x + 10} y={height - 8} textAnchor="middle" fontSize="9" fill="#88766B">{item.label}</text>}</g>;
  })}</svg></div>;
}

function OrderItems({ items = [] }) {
  return <div className="space-y-2">{items.map((item, index) => <div key={`${item.productId || item.productName}-${index}`} className="flex items-start justify-between gap-3 rounded-lg bg-stone-50 p-3"><div className="min-w-0"><p className="text-xs font-semibold text-stone-800">{item.quantity}× {item.productName || item.product?.name}</p>{(item.option || item.base?.name) && <p className="mt-0.5 text-[11px] text-stone-500">{item.option || item.base?.name}</p>}{item.extras?.length > 0 && <p className="mt-0.5 text-[10px] text-stone-400">Adicionais: {item.extras.join(', ')}</p>}</div><span className="shrink-0 text-xs font-semibold text-stone-700">{money(item.totalPrice ?? item.quantity * item.unitPrice)}</span></div>)}</div>;
}

export function AdminPanel({ onClose }) {
  const {
    currentUser, logout, orders, demoOrders, updateOrderStatus, users,
    productSettings, updateProductSetting, settings, updateStoreSettings, clearDemoOrders,
    inventory, updateInventorySettings, updateFlavorStock,
  } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [period, setPeriod] = useState('month');
  const [source, setSource] = useState('demo');
  const [orderFilter, setOrderFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [messageText, setMessageText] = useState(MESSAGE_TEMPLATES[0]);
  const [feedback, setFeedback] = useState('');
  const activeOrders = source === 'demo' ? demoOrders : orders;
  const currentPeriod = PERIODS.find((item) => item.id === period) || PERIODS[2];
  const cutoffDate = new Date(); cutoffDate.setHours(0, 0, 0, 0); cutoffDate.setDate(cutoffDate.getDate() - currentPeriod.days + 1);
  const cutoff = cutoffDate.getTime();

  const periodOrders = useMemo(() => activeOrders.filter((order) => new Date(order.createdAt).getTime() >= cutoff), [activeOrders, cutoff]);
  const revenueOrders = periodOrders.filter((order) => !isCancelled(order));
  const totalRevenue = revenueOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const cancelledCount = periodOrders.filter(isCancelled).length;
  const averageTicket = revenueOrders.length ? totalRevenue / revenueOrders.length : 0;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const todayRevenue = revenueOrders.filter((order) => new Date(order.createdAt) >= todayStart).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const monthRevenue = revenueOrders.filter((order) => new Date(order.createdAt) >= monthStart).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const hasAllCosts = revenueOrders.every((order) => (order.items || []).every((item) => {
    const cost = productSettings[item.productId]?.cost;
    return cost !== '' && cost !== null && cost !== undefined && Number.isFinite(Number(cost));
  }));
  const estimatedProfit = hasAllCosts && revenueOrders.length
    ? revenueOrders.reduce((sum, order) => sum + Number(order.total || 0) - (order.items || []).reduce((costSum, item) => costSum + Number(productSettings[item.productId].cost) * Number(item.quantity || 0), 0), 0)
    : null;

  const bucketed = useMemo(() => {
    const longRange = currentPeriod.days > 45;
    const values = new Map();
    for (const order of revenueOrders) {
      const date = new Date(order.createdAt);
      const key = longRange ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const label = longRange ? date.toLocaleDateString('pt-BR', { month: 'short' }) : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const bucket = values.get(key) || { label, value: 0, orders: 0 };
      bucket.value += Number(order.total || 0); bucket.orders += 1; values.set(key, bucket);
    }
    return [...values.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-18).map(([, value]) => value);
  }, [revenueOrders, currentPeriod.days]);

  const dailyOrderSeries = useMemo(() => {
    const counts = new Map();
    for (const order of revenueOrders) {
      const date = new Date(order.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const series = [];
    const end = new Date(); end.setHours(0, 0, 0, 0);
    for (const date = new Date(cutoff); date <= end; date.setDate(date.getDate() + 1)) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      series.push({ fullDate: date.toLocaleDateString('pt-BR'), label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: counts.get(key) || 0 });
    }
    return series;
  }, [revenueOrders, cutoff]);

  const bestProducts = useMemo(() => {
    const values = new Map();
    for (const order of revenueOrders) for (const item of order.items || []) {
      const label = item.productName || item.product?.name || 'Produto';
      values.set(label, (values.get(label) || 0) + Number(item.quantity || 0));
    }
    return [...values].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [revenueOrders]);

  const bestFlavors = useMemo(() => {
    const values = new Map();
    for (const order of revenueOrders) for (const item of order.items || []) {
      const pair = (item.baseId || '').match(/^dupla-(.+)--(.+)$/);
      if (pair) {
        for (const flavorId of [pair[1], pair[2]]) {
          const label = STOCK_FLAVORS.find((flavor) => flavor.id === flavorId)?.name || flavorId;
          values.set(label, (values.get(label) || 0) + Number(item.quantity || 0));
        }
        continue;
      }
      const label = item.option || item.base?.name || item.productName || item.product?.name || 'Sabor';
      values.set(label, (values.get(label) || 0) + Number(item.quantity || 0));
    }
    return [...values].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [revenueOrders]);

  const productRevenue = useMemo(() => {
    const values = new Map();
    for (const order of revenueOrders) for (const item of order.items || []) {
      const label = item.productName || item.product?.name || 'Produto';
      values.set(label, (values.get(label) || 0) + Number(item.totalPrice ?? Number(item.unitPrice || 0) * Number(item.quantity || 0)));
    }
    return [...values].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [revenueOrders]);
  const orderDistribution = useMemo(() => {
    const counts = new Map(STATUSES.map(({ id, label }) => [label, 0]));
    for (const order of periodOrders) {
      const label = STATUSES.find((status) => status.id === order.status)?.label || order.status;
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    return [...counts].filter(([, value]) => value).map(([label, value]) => ({ label, value }));
  }, [periodOrders]);

  const comparison = useMemo(() => {
    const previousCutoff = cutoff - currentPeriod.days * 86400000;
    return activeOrders.filter((order) => !isCancelled(order) && new Date(order.createdAt).getTime() >= previousCutoff && new Date(order.createdAt).getTime() < cutoff).reduce((sum, order) => sum + Number(order.total || 0), 0);
  }, [activeOrders, cutoff, currentPeriod.days]);

  const setOrderStatus = (order, status) => {
    const result = updateOrderStatus(order.id, status, Boolean(order.isDemo));
    if (!result?.ok) { setFeedback(result?.error || 'Não foi possível atualizar o pedido.'); window.setTimeout(() => setFeedback(''), 3200); return; }
    if (selectedOrder?.id === order.id) setSelectedOrder({ ...order, status });
    setFeedback('Status do pedido atualizado.');
    window.setTimeout(() => setFeedback(''), 2600);
  };

  const visibleOrders = activeOrders.filter((order) => {
    const statusMatches = orderFilter === 'all' || order.status === orderFilter;
    const search = query.trim().toLowerCase();
    const searchMatches = !search || `${order.id} ${order.customerName} ${order.customerEmail} ${order.phone}`.toLowerCase().includes(search);
    return statusMatches && searchMatches;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const sendContact = () => {
    if (!selectedOrder) return;
    const phone = digits(selectedOrder.phone);
    if (phone) window.open(`https://wa.me/${whatsappPhone(phone)}?text=${encodeURIComponent(messageText)}`, '_blank', 'noopener,noreferrer');
    else if (selectedOrder.customerEmail) window.open(`mailto:${selectedOrder.customerEmail}?subject=${encodeURIComponent(`Pedido ${selectedOrder.id} — Salencar`)}&body=${encodeURIComponent(messageText)}`, '_blank', 'noopener,noreferrer');
  };

  const saveSettings = (event) => {
    event.preventDefault();
    updateStoreSettings(settingsDraft);
    setFeedback('Configurações salvas neste navegador.');
    window.setTimeout(() => setFeedback(''), 2600);
  };

  const saveProductSetting = (productId, changes) => {
    updateProductSetting(productId, changes);
    setFeedback('Alteração de produto salva neste navegador.');
    window.setTimeout(() => setFeedback(''), 2200);
  };

  const [settingsDraft, setSettingsDraft] = useState(() => ({
    name: settings.name, whatsappFormatted: settings.whatsappFormatted, whatsappNumber: settings.whatsappNumber,
    pickupAddress: settings.pickupAddress, instagram: settings.instagram, instagramUrl: settings.instagramUrl,
    pix: { ...settings.pix }, status: { ...settings.status, hours: [...settings.status.hours] },
  }));

  const customerRows = useMemo(() => {
    if (source === 'real') return users.map((user) => {
      const customerOrders = orders.filter((order) => order.customerId === user.id);
      return { ...user, orderCount: customerOrders.length, spent: customerOrders.filter((order) => !isCancelled(order)).reduce((sum, order) => sum + Number(order.total || 0), 0), customerOrders, isDemo: false };
    });
    const customers = new Map();
    for (const order of demoOrders) {
      const key = order.customerEmail;
      const customer = customers.get(key) || { id: key, name: order.customerName, email: key, phone: order.phone, createdAt: order.createdAt, orderCount: 0, spent: 0, customerOrders: [], isDemo: true };
      customer.orderCount += 1; customer.customerOrders.push(order);
      if (!isCancelled(order)) customer.spent += Number(order.total || 0);
      customers.set(key, customer);
    }
    return [...customers.values()];
  }, [source, users, orders, demoOrders]);

  if (currentUser?.role !== 'admin') return null;

  const changeSettings = (field, value) => setSettingsDraft((previous) => ({ ...previous, [field]: value }));
  const changeHour = (index, time) => setSettingsDraft((previous) => ({ ...previous, status: { ...previous.status, hours: previous.status.hours.map((entry, entryIndex) => entryIndex === index ? { ...entry, time } : entry) } }));
  const logoutAdmin = () => { logout(); onClose(); };

  return (
    <div className="fixed inset-0 z-[90] flex bg-stone-50 text-stone-800">
      <aside className="hidden w-64 shrink-0 flex-col bg-primary-hover p-4 text-white md:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-2 pb-5 pt-2"><img src="/images/logo.jpg" alt="" className="h-10 w-10 rounded-full border border-white/20 object-cover" /><div><p className="font-display text-sm font-black tracking-wide">SALENCAR</p><p className="text-[10px] text-white/60">Painel administrativo</p></div></div>
        <nav aria-label="Navegação administrativa" className="mt-6 space-y-1">{NAV.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${tab === id ? 'bg-white text-primary shadow-subtle' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>
        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3"><div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="h-4 w-4 text-emerald-300" />{currentUser.name}</div><p className="mt-1 text-[10px] leading-relaxed text-white/55">Modo demonstrativo. As alterações ficam salvas neste navegador.</p><div className="mt-4 space-y-2"><button type="button" onClick={onClose} className="inline-flex min-h-11 w-full items-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-semibold text-white hover:bg-white/10"><LayoutDashboard className="h-4 w-4" />Sair do painel</button><button type="button" onClick={logoutAdmin} className="inline-flex min-h-11 w-full items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white/80 hover:bg-white/15"><LogOut className="h-4 w-4" />Sair da conta</button></div></div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary md:hidden"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary md:hidden">Salencar Admin</p><h1 className="truncate text-base font-bold text-stone-900 sm:text-lg">{NAV.find((item) => item.id === tab)?.label}</h1></div></div>
          <div className="flex items-center gap-2"><div className="hidden rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-800 sm:block">Demonstração local</div><button type="button" onClick={onClose} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-stone-200 px-2 text-[9px] font-semibold text-primary"><LayoutDashboard className="h-3.5 w-3.5" />Sair do painel</button><button type="button" onClick={logoutAdmin} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-stone-200 px-2 text-[9px] font-semibold text-stone-600"><LogOut className="h-3.5 w-3.5" />Sair da conta</button><button type="button" onClick={onClose} aria-label="Voltar ao cardápio" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button></div>
        </header>

        <div className="grid grid-cols-3 gap-1 border-b border-stone-200 bg-white p-2 md:hidden">{NAV.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex min-h-11 items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[10px] font-semibold ${tab === id ? 'bg-primary-light text-primary' : 'text-stone-500 hover:bg-stone-50'}`}><Icon className="h-3.5 w-3.5 shrink-0" />{label}</button>)}</div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {feedback && <div role="status" className="mb-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><Check className="h-4 w-4" />{feedback}</div>}

          {tab === 'dashboard' && <div className="space-y-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-bold text-stone-900">Visão geral</h2><p className="mt-1 text-xs text-stone-500">Indicadores e vendas do período selecionado.</p></div><div className="flex flex-wrap items-center gap-2"><SourceToggle value={source} onChange={setSource} /><label className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold text-stone-700 outline-none focus:border-primary/40">{PERIODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div></div>
            {source === 'demo' && <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-relaxed text-amber-900"><strong>Dados fictícios de demonstração.</strong> Estão armazenados separadamente e não se misturam aos pedidos dos clientes.</p><button type="button" onClick={() => { if (window.confirm('Limpar os pedidos fictícios de demonstração?')) clearDemoOrders(); }} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" />Limpar demonstração</button></div>}
            {source === 'real' && !orders.length && <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">Ainda não há pedidos reais. Os dados de demonstração ficam em uma aba separada.</div>}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3"><MetricCard label="Faturamento hoje" value={money(todayRevenue)} note="Pedidos não cancelados" icon={CircleDollarSign} tone="emerald" /><MetricCard label="Faturamento do mês" value={money(monthRevenue)} note="Pedidos não cancelados" icon={BarChart3} /><MetricCard label="Lucro estimado" value={estimatedProfit === null ? '—' : money(estimatedProfit)} note={estimatedProfit === null ? 'Cadastre os custos dos produtos para calcular.' : 'Receita menos custo cadastrado'} icon={ArrowUpRight} tone="violet" /><MetricCard label="Pedidos no período" value={periodOrders.length} note={currentPeriod.label} icon={ShoppingBag} tone="blue" /><MetricCard label="Ticket médio" value={money(averageTicket)} note="Sem pedidos cancelados" icon={ArrowDownRight} tone="amber" /><MetricCard label="Pedidos cancelados" value={cancelledCount} note={currentPeriod.label} icon={X} tone="rose" /></div>
            <div className="grid gap-4 xl:grid-cols-5"><PanelCard title="Faturamento ao longo do período" subtitle={currentPeriod.label} className="xl:col-span-3"><RevenueChart items={bucketed} /></PanelCard><PanelCard title="Resumo financeiro" subtitle="Cancelamentos excluídos do faturamento"><dl className="space-y-3 text-xs"><div className="flex justify-between gap-3"><dt className="text-stone-500">Receita válida</dt><dd className="font-semibold text-stone-900">{money(totalRevenue)}</dd></div><div className="flex justify-between gap-3"><dt className="text-stone-500">Pedidos considerados</dt><dd className="font-semibold text-stone-900">{revenueOrders.length}</dd></div><div className="flex justify-between gap-3"><dt className="text-stone-500">Comparação com período anterior</dt><dd className="font-semibold text-stone-900">{money(comparison)}</dd></div><div className="border-t border-stone-100 pt-3"><dt className="text-stone-500">Lucro estimado</dt><dd className="mt-1 font-bold text-primary">{estimatedProfit === null ? 'Indisponível: configure os custos dos produtos.' : money(estimatedProfit)}</dd></div></dl></PanelCard></div>
            <div className="grid min-w-0 gap-4 lg:grid-cols-2"><PanelCard title="Distribuição dos pedidos" subtitle="Pedidos por status no período"><PieChart items={orderDistribution} /></PanelCard><PanelCard title="Produtos mais vendidos" subtitle="Unidades em pedidos não cancelados"><PieChart items={bestProducts} /></PanelCard><PanelCard title="Sabores mais vendidos" subtitle="Opções escolhidas nos pedidos"><PieChart items={bestFlavors} /><p className="mt-3 text-[10px] text-stone-400">Pedidos antigos sem opção registrada aparecem pelo nome do produto.</p></PanelCard><PanelCard title="Participação no faturamento" subtitle="Receita por produto nos pedidos não cancelados"><PieChart items={productRevenue} valueFormatter={money} /></PanelCard><PanelCard title="Comparação de faturamento" subtitle={`Período atual versus período anterior (${currentPeriod.label})`}><BarList items={[{ label: 'Período atual', value: totalRevenue }, { label: 'Período anterior', value: comparison }]} valueFormatter={money} color="bg-primary" /></PanelCard></div>
          </div>}

          {tab === 'orders' && <div className="space-y-4">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end"><div><h2 className="text-xl font-bold text-stone-900">Pedidos</h2><p className="mt-1 text-xs text-stone-500">Consulte detalhes, atualize status e entre em contato.</p></div><div className="flex flex-wrap gap-2"><SourceToggle value={source} onChange={setSource} /><label className="relative min-w-48 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente ou pedido" className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-primary/40" /></label><label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)} className="rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-8 text-xs font-semibold text-stone-700 outline-none"><option value="all">Todos os status</option>{STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div></div>
            {source === 'demo' && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">Lista fictícia de demonstração — pedidos reais permanecem separados.</p>}
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-subtle"><div className="hidden overflow-x-auto md:block"><table className="min-w-[900px] w-full text-left text-xs"><thead className="bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500"><tr><th className="px-4 py-3">Pedido / Data</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Contato</th><th className="px-4 py-3">Itens</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Detalhes</th></tr></thead><tbody className="divide-y divide-stone-100">{visibleOrders.map((order) => <tr key={order.id} className="hover:bg-stone-50/70"><td className="px-4 py-3"><p className="font-bold text-stone-800">{order.id}</p><p className="mt-1 text-[10px] text-stone-500">{dateTime(order.createdAt)}</p>{order.isDemo && <span className="mt-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">DEMO</span>}</td><td className="px-4 py-3"><p className="font-semibold text-stone-800">{order.customerName}</p><p className="mt-1 text-[10px] text-stone-500">{order.customerEmail || '—'}</p></td><td className="px-4 py-3 text-stone-600">{order.phone || '—'}</td><td className="max-w-52 px-4 py-3 text-stone-600">{(order.items || []).map((item) => `${item.quantity}× ${item.productName || item.product?.name}${item.option || item.base?.name ? ` (${item.option || item.base?.name})` : ''}`).join(', ')}</td><td className="px-4 py-3 font-bold text-stone-800">{money(order.total)}</td><td className="px-4 py-3"><select value={order.status} onChange={(event) => setOrderStatus(order, event.target.value)} aria-label={`Status do pedido ${order.id}`} className="max-w-36 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-stone-700">{STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></td><td className="px-4 py-3"><button type="button" onClick={() => { setSelectedOrder(order); setMessageText(MESSAGE_TEMPLATES[0]); }} aria-label={`Ver pedido ${order.id}`} className="rounded-lg p-2 text-primary hover:bg-primary-light"><Eye className="h-4 w-4" /></button></td></tr>)}{!visibleOrders.length && <tr><td colSpan="7" className="px-4 py-12 text-center text-stone-400">Nenhum pedido corresponde aos filtros.</td></tr>}</tbody></table></div><div className="space-y-3 p-3 md:hidden">{visibleOrders.map((order) => <article key={order.id} className="rounded-xl border border-stone-200 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-all text-xs font-bold text-stone-900">{order.id}</p><p className="mt-1 text-[11px] text-stone-500">{dateTime(order.createdAt)}</p></div><span className="shrink-0 text-sm font-bold text-primary">{money(order.total)}</span></div><p className="mt-3 break-words text-xs font-semibold text-stone-800">{order.customerName}</p><p className="mt-0.5 break-all text-[11px] text-stone-500">{order.customerEmail || '—'} · {order.phone || 'Sem telefone'}</p><p className="mt-2 break-words text-xs leading-relaxed text-stone-600">{(order.items || []).map((item) => `${item.quantity}× ${item.productName || item.product?.name}${item.option || item.base?.name ? ` (${item.option || item.base?.name})` : ''}`).join(', ')}</p><div className="mt-3 flex items-center gap-2"><select value={order.status} onChange={(event) => setOrderStatus(order, event.target.value)} aria-label={`Status do pedido ${order.id}`} className="min-h-11 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 text-xs font-semibold">{STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button type="button" onClick={() => { setSelectedOrder(order); setMessageText(MESSAGE_TEMPLATES[0]); }} aria-label={`Ver pedido ${order.id}`} className="min-h-11 min-w-11 rounded-lg bg-primary-light p-2 text-primary"><Eye className="h-4 w-4" /></button></div></article>)}{!visibleOrders.length && <p className="py-8 text-center text-xs text-stone-400">Nenhum pedido corresponde aos filtros.</p>}</div></div>
          </div>}

          {tab === 'customers' && <div className="space-y-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-bold text-stone-900">Clientes</h2><p className="mt-1 text-xs text-stone-500">Contas e histórico associados à origem selecionada.</p></div><SourceToggle value={source} onChange={setSource} /></div>{source === 'demo' && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">Clientes fictícios derivados apenas dos pedidos de demonstração.</p>}<div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-subtle"><div className="hidden overflow-x-auto md:block"><table className="min-w-[760px] w-full text-left text-xs"><thead className="bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500"><tr><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Telefone</th><th className="px-4 py-3">Cadastro</th><th className="px-4 py-3">Pedidos</th><th className="px-4 py-3">Total gasto</th><th className="px-4 py-3">Histórico</th></tr></thead><tbody className="divide-y divide-stone-100">{customerRows.map((customer) => <tr key={customer.id} className="hover:bg-stone-50/70"><td className="px-4 py-3"><p className="font-semibold text-stone-800">{customer.name}{customer.isDemo && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] text-amber-700">DEMO</span>}</p><p className="mt-1 text-[10px] text-stone-500">{customer.email}</p></td><td className="px-4 py-3 text-stone-600">{customer.phone || '—'}</td><td className="px-4 py-3 text-stone-600">{dateOnly(customer.createdAt)}</td><td className="px-4 py-3 text-stone-700">{customer.orderCount}</td><td className="px-4 py-3 font-semibold text-stone-800">{money(customer.spent)}</td><td className="px-4 py-3"><button type="button" onClick={() => setSelectedCustomer(customer)} className="rounded-lg p-2 text-primary hover:bg-primary-light" aria-label={`Histórico de ${customer.name}`}><Eye className="h-4 w-4" /></button></td></tr>)}{!customerRows.length && <tr><td colSpan="6" className="px-4 py-12 text-center text-stone-400">Nenhum cliente nesta origem.</td></tr>}</tbody></table></div><div className="space-y-3 p-3 md:hidden">{customerRows.map((customer) => <article key={customer.id} className="rounded-xl border border-stone-200 p-3"><p className="break-words text-sm font-semibold text-stone-900">{customer.name}</p><p className="mt-1 break-all text-[11px] text-stone-500">{customer.email}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><span className="text-stone-500">Telefone</span><span className="break-words text-right text-stone-700">{customer.phone || '—'}</span><span className="text-stone-500">Cadastro</span><span className="text-right text-stone-700">{dateOnly(customer.createdAt)}</span><span className="text-stone-500">Pedidos</span><span className="text-right text-stone-700">{customer.orderCount}</span><span className="text-stone-500">Total gasto</span><span className="text-right font-semibold text-stone-900">{money(customer.spent)}</span></div><button type="button" onClick={() => setSelectedCustomer(customer)} className="mt-3 min-h-11 w-full rounded-lg bg-primary-light text-xs font-semibold text-primary">Ver histórico</button></article>)}{!customerRows.length && <p className="py-8 text-center text-xs text-stone-400">Nenhum cliente nesta origem.</p>}</div></div></div>}

          {tab === 'inventory' && <div className="mx-auto max-w-5xl space-y-4">
            {(() => {
              const total = STOCK_FLAVORS.reduce((sum, flavor) => { const stock = inventory.flavors[flavor.id]; return sum + (inventory.mode !== 'manual' || stock.manualAvailable ? stock.quantity : 0); }, 0);
              const low = STOCK_FLAVORS.filter((flavor) => inventory.flavors[flavor.id].quantity > 0 && inventory.flavors[flavor.id].quantity <= inventory.lowStockLimit).length;
              const empty = STOCK_FLAVORS.filter((flavor) => inventory.flavors[flavor.id].quantity === 0).length;
              return <><div><h2 className="text-xl font-bold text-stone-900">Estoque de batidas</h2><p className="mt-1 text-xs text-stone-500">A baixa ocorre ao confirmar o pedido. Cancelamentos devolvem as unidades uma única vez.</p></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><MetricCard label="Unidades disponíveis" value={total} icon={Boxes} tone="blue"/><MetricCard label="Estoque baixo" value={low} note={`Até ${inventory.lowStockLimit} unidades`} icon={ArrowDownRight} tone="amber"/><MetricCard label="Esgotados" value={empty} icon={X} tone="rose"/></div>
                <PanelCard title="Modo e alertas"><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-medium">Gerenciamento</span><select value={inventory.mode} onChange={(event) => updateInventorySettings({mode:event.target.value})} className="min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"><option value="automatic">Automático pelo saldo</option><option value="manual">Manual por sabor</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-medium">Aviso de estoque baixo</span><input type="number" min="0" value={inventory.lowStockLimit} onChange={(event) => updateInventorySettings({lowStockLimit:event.target.value})} className="min-h-11 w-full rounded-xl border border-stone-200 px-3 text-sm"/></label></div></PanelCard>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{STOCK_FLAVORS.map((flavor) => {const stock=inventory.flavors[flavor.id];const available=stock.quantity>0&&(inventory.mode!=='manual'||stock.manualAvailable);const isLow=stock.quantity>0&&stock.quantity<=inventory.lowStockLimit;return <article key={flavor.id} className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words text-sm font-bold">{flavor.name}</h3><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${!available?'bg-rose-50 text-rose-700':isLow?'bg-amber-50 text-amber-800':'bg-emerald-50 text-emerald-700'}`}>{!available?'Esgotado / pausado':isLow?'Estoque baixo':'Disponível'}</span></div><span className="shrink-0 text-2xl font-bold text-primary">{stock.quantity}</span></div><label className="mt-4 block"><span className="mb-1 block text-[11px] text-stone-500">Quantidade disponível</span><input aria-label={`Estoque de ${flavor.name}`} type="number" min="0" value={stock.quantity} onChange={(event)=>updateFlavorStock(flavor.id,{quantity:event.target.value})} className="min-h-11 w-full rounded-xl border border-stone-200 px-3 text-sm"/></label>{inventory.mode==='manual'&&<button type="button" onClick={()=>updateFlavorStock(flavor.id,{manualAvailable:!stock.manualAvailable})} className={`mt-3 min-h-11 w-full rounded-xl px-3 text-xs font-semibold ${stock.manualAvailable?'border border-stone-200 text-stone-600':'bg-primary text-white'}`}>{stock.manualAvailable?'Marcar indisponível':'Marcar disponível'}</button>}</article>})}</div>
              </>;
            })()}
          </div>}
          {tab === 'products' && <div className="space-y-4"><div><h2 className="text-xl font-bold text-stone-900">Produtos do cardápio</h2><p className="mt-1 text-xs text-stone-500">Preço, visibilidade e custo são salvos neste navegador. Os custos começam vazios.</p></div><div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-subtle"><div className="hidden overflow-x-auto md:block"><table className="min-w-[850px] w-full text-left text-xs"><thead className="bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500"><tr><th className="px-4 py-3">Produto</th><th className="px-4 py-3">Preço (R$)</th><th className="px-4 py-3">Custo unitário (R$)</th><th className="px-4 py-3">Ativo</th><th className="px-4 py-3">Disponível</th></tr></thead><tbody className="divide-y divide-stone-100">{PRODUCTS.map((product) => { const override = productSettings[product.id] || {}; return <tr key={product.id} className="hover:bg-stone-50/70"><td className="px-4 py-3"><div className="flex items-center gap-3"><img src={product.image} alt="" className="h-11 w-11 rounded-lg border border-stone-200 object-cover" /><div><p className="font-semibold text-stone-800">{product.name}</p><p className="mt-0.5 text-[10px] text-stone-500">{product.category}</p></div></div></td><td className="px-4 py-3"><label className="sr-only" htmlFor={`price-${product.id}`}>Preço de {product.name}</label><input id={`price-${product.id}`} type="number" min="0" step="0.01" value={override.price ?? product.price} onChange={(event) => saveProductSetting(product.id, { price: event.target.value === '' ? product.price : Number(event.target.value) })} className="w-28 rounded-lg border border-stone-200 px-2.5 py-2 text-xs outline-none focus:border-primary/50" /></td><td className="px-4 py-3"><label className="sr-only" htmlFor={`cost-${product.id}`}>Custo de {product.name}</label><input id={`cost-${product.id}`} type="number" min="0" step="0.01" placeholder="Não informado" value={override.cost ?? ''} onChange={(event) => saveProductSetting(product.id, { cost: event.target.value === '' ? '' : Number(event.target.value) })} className="w-32 rounded-lg border border-stone-200 px-2.5 py-2 text-xs outline-none focus:border-primary/50" /></td><td className="px-4 py-3"><button type="button" onClick={() => saveProductSetting(product.id, { active: !(override.active ?? true) })} className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${override.active === false ? 'bg-stone-100 text-stone-500' : 'bg-emerald-50 text-emerald-700'}`}>{override.active === false ? 'Desativado' : 'Ativo'}</button></td><td className="px-4 py-3"><button type="button" onClick={() => saveProductSetting(product.id, { available: !(override.available ?? true) })} className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${override.available === false ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{override.available === false ? 'Indisponível' : 'Disponível'}</button></td></tr>; })}</tbody></table></div><div className="space-y-3 p-3 md:hidden">{PRODUCTS.map((product) => {const override=productSettings[product.id]||{};return <article key={product.id} className="rounded-xl border border-stone-200 p-3"><div className="flex items-center gap-3"><img src={product.image} alt="" className="h-12 w-12 rounded-lg object-cover"/><div className="min-w-0"><h3 className="break-words text-sm font-semibold text-stone-900">{product.name}</h3><p className="text-[10px] text-stone-500">{product.category}</p></div></div><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-[11px] text-stone-500">Preço (R$)<input type="number" min="0" step="0.01" value={override.price??product.price} onChange={(event)=>saveProductSetting(product.id,{price:event.target.value===''?product.price:Number(event.target.value)})} className="mt-1 min-h-11 w-full rounded-lg border border-stone-200 px-2 text-sm text-stone-800"/></label><label className="text-[11px] text-stone-500">Custo (R$)<input type="number" min="0" step="0.01" value={override.cost??''} onChange={(event)=>saveProductSetting(product.id,{cost:event.target.value===''?'':Number(event.target.value)})} className="mt-1 min-h-11 w-full rounded-lg border border-stone-200 px-2 text-sm text-stone-800"/></label></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>saveProductSetting(product.id,{active:!(override.active??true)})} className="min-h-11 rounded-lg border border-stone-200 px-2 text-[11px] font-semibold">{override.active===false?'Ativar':'Desativar'}</button><button type="button" onClick={()=>saveProductSetting(product.id,{available:!(override.available??true)})} className="min-h-11 rounded-lg border border-stone-200 px-2 text-[11px] font-semibold">{override.available===false?'Marcar disponível':'Marcar indisponível'}</button></div></article>})}</div><p className="border-t border-stone-100 px-4 py-3 text-[10px] text-stone-400">Alterações aplicadas ao cardápio conforme são feitas. O painel mantém custos não informados em branco.</p></div></div>}

          {tab === 'settings' && <div className="mx-auto max-w-3xl space-y-4"><div><h2 className="text-xl font-bold text-stone-900">Configurações da loja</h2><p className="mt-1 text-xs text-stone-500">Atualizações demonstrativas aplicadas localmente ao site.</p></div><form onSubmit={saveSettings} className="space-y-5"><PanelCard title="Dados do estabelecimento" subtitle="Nome, endereço e contatos públicos"><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Nome do estabelecimento</span><input value={settingsDraft.name} onChange={(event) => changeSettings('name', event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-primary/50" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Telefone formatado</span><input value={settingsDraft.whatsappFormatted} onChange={(event) => changeSettings('whatsappFormatted', event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-primary/50" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">WhatsApp internacional (somente números)</span><input value={settingsDraft.whatsappNumber} onChange={(event) => changeSettings('whatsappNumber', event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-primary/50" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Endereço</span><input value={settingsDraft.pickupAddress} onChange={(event) => changeSettings('pickupAddress', event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-primary/50" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Instagram</span><input value={settingsDraft.instagram} onChange={(event) => changeSettings('instagram', event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-primary/50" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">URL do Instagram</span><input value={settingsDraft.instagramUrl} onChange={(event) => changeSettings('instagramUrl', event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-primary/50" /></label><label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-medium text-stone-700">Chave Pix</span><input value={settingsDraft.pix.key} onChange={(event) => setSettingsDraft((previous) => ({ ...previous, pix: { ...previous.pix, key: event.target.value } }))} className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-primary/50" /></label></div></PanelCard><PanelCard title="Horários de funcionamento" subtitle="Edite o horário de cada dia"><div className="space-y-2">{settingsDraft.status.hours.map((hour, index) => <label key={hour.day} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3 rounded-lg bg-stone-50 px-3 py-2"><span className="text-xs font-medium text-stone-700">{hour.day}</span><input value={hour.time} onChange={(event) => changeHour(index, event.target.value)} className="min-w-0 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-primary/50" /></label>)}</div></PanelCard><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover"><Check className="h-4 w-4" />Salvar configurações</button></form></div>}
        </div>
      </main>

      {selectedOrder && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/55 p-3 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}><section role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-elevated" onClick={(event) => event.stopPropagation()}><header className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-white px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-primary">{selectedOrder.isDemo ? 'Pedido fictício' : 'Pedido'}</p><h2 id="order-detail-title" className="mt-0.5 text-lg font-bold text-stone-900">{selectedOrder.id}</h2></div><button type="button" onClick={() => setSelectedOrder(null)} aria-label="Fechar detalhes" className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button></header><div className="space-y-5 p-5"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] font-bold uppercase text-stone-400">Cliente</p><p className="mt-1 text-sm font-semibold text-stone-800">{selectedOrder.customerName}</p><p className="text-xs text-stone-500">{selectedOrder.customerEmail || 'E-mail não informado'}</p><p className="mt-1 text-xs text-stone-500">{selectedOrder.phone || 'Telefone não informado'}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] font-bold uppercase text-stone-400">Pedido</p><p className="mt-1 text-xs text-stone-700">{dateTime(selectedOrder.createdAt)}</p><p className="mt-1"><StatusBadge status={selectedOrder.status} /></p><p className="mt-1 text-xs text-stone-500">Pagamento: {selectedOrder.paymentMethod || '—'}</p></div></div><div><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">Produtos e sabores</h3><OrderItems items={selectedOrder.items} /></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-stone-100 p-3"><p className="text-[10px] font-bold uppercase text-stone-400">Entrega</p><p className="mt-1 whitespace-pre-line text-xs text-stone-700">{selectedOrder.deliveryType === 'pickup' ? 'Retirada no balcão' : selectedOrder.address || 'Endereço não informado'}</p></div><div className="rounded-xl border border-stone-100 p-3"><div className="flex justify-between text-xs text-stone-500"><span>Subtotal</span><span>{money(selectedOrder.subtotal)}</span></div><div className="mt-1 flex justify-between text-xs text-stone-500"><span>Entrega</span><span>{money(selectedOrder.deliveryFee)}</span></div><div className="mt-2 flex justify-between border-t border-stone-100 pt-2 text-sm font-bold text-stone-900"><span>Total</span><span className="text-primary">{money(selectedOrder.total)}</span></div></div></div>{selectedOrder.orderNotes && <div className="rounded-xl bg-amber-50 p-3"><p className="text-[10px] font-bold uppercase text-amber-700">Observações do pedido</p><p className="mt-1 text-xs text-amber-900">{selectedOrder.orderNotes}</p></div>}<div><label className="mb-1.5 block text-xs font-semibold text-stone-700">Mensagem de contato (edite antes de abrir o canal)</label><select onChange={(event) => setMessageText(event.target.value)} defaultValue="" className="mb-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs text-stone-700"><option value="" disabled>Escolha uma mensagem pronta…</option>{MESSAGE_TEMPLATES.map((message) => <option key={message} value={message}>{message}</option>)}</select><textarea rows={3} value={messageText} onChange={(event) => setMessageText(event.target.value)} className="w-full resize-y rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-primary/50" /><button type="button" onClick={sendContact} disabled={!digits(selectedOrder.phone) && !selectedOrder.customerEmail} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{digits(selectedOrder.phone) ? <Phone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}{digits(selectedOrder.phone) ? 'Abrir WhatsApp' : selectedOrder.customerEmail ? 'Abrir e-mail' : 'Sem canal de contato'}<ExternalLink className="h-3.5 w-3.5" /></button>{!selectedOrder.phone && !selectedOrder.customerEmail && <p className="mt-2 text-xs text-rose-600">Este cliente não possui telefone ou e-mail cadastrado.</p>}</div><label className="block"><span className="mb-1.5 block text-xs font-semibold text-stone-700">Atualizar status</span><select value={selectedOrder.status} onChange={(event) => setOrderStatus(selectedOrder, event.target.value)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700">{STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label></div></section></div>}

      {selectedCustomer && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/55 p-3 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)}><section role="dialog" aria-modal="true" aria-labelledby="customer-history-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-elevated" onClick={(event) => event.stopPropagation()}><header className="flex items-center justify-between border-b border-stone-100 p-4"><div><h2 id="customer-history-title" className="font-bold text-stone-900">Histórico de {selectedCustomer.name}</h2><p className="text-xs text-stone-500">{selectedCustomer.email}</p></div><button type="button" onClick={() => setSelectedCustomer(null)} aria-label="Fechar histórico" className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button></header><div className="space-y-2 p-4">{selectedCustomer.customerOrders.map((order) => <div key={order.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 p-3"><div><p className="text-xs font-bold text-stone-800">{order.id} {order.isDemo && <span className="text-amber-700">· DEMO</span>}</p><p className="mt-1 text-[11px] text-stone-500">{dateTime(order.createdAt)} · {STATUSES.find((status) => status.id === order.status)?.label}</p></div><span className="text-xs font-semibold text-stone-700">{money(order.total)}</span></div>)}{!selectedCustomer.customerOrders.length && <p className="py-8 text-center text-xs text-stone-400">Este cliente ainda não possui pedidos.</p>}</div></section></div>}
    </div>
  );
}

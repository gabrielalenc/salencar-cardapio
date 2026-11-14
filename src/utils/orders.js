export const CUSTOMER_ORDER_STATUS = {
  new: 'Pedido legado',
  awaiting_delivery_quote: 'Aguardando cotação de entrega',
  awaiting_customer_approval: 'Aguardando aprovação do cliente',
  confirmed: 'Pedido confirmado',
  preparing: 'Em preparação',
  out_for_delivery: 'Saiu para entrega',
  completed: 'Pedido concluído',
  quote_rejected: 'Cotação recusada',
  cancelled: 'Cancelado',
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const updatedAt = (order) => new Date(order?.updatedAt || order?.createdAt || 0).getTime() || 0;

export function dedupeOrders(orders) {
  const byId = new Map();
  (Array.isArray(orders) ? orders : []).forEach((order, index) => {
    const key = order.id || `legacy-${order.customerId || order.customerEmail || 'unknown'}-${order.createdAt || index}-${index}`;
    const previous = byId.get(key);
    if (!previous || updatedAt(order) >= updatedAt(previous)) byId.set(key, order);
  });
  return [...byId.values()];
}

export function belongsToCustomer(order, customer) {
  if (!customer?.id) return false;
  if (order.customerId) return order.customerId === customer.id;
  return normalizeEmail(order.customerEmail) === normalizeEmail(customer.email);
}

export function getCustomerOrders(orders, customer) {
  return dedupeOrders((Array.isArray(orders) ? orders : []).filter((order) => belongsToCustomer(order, customer)))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export const CUSTOMER_COMPLETED_TRACKING_MS = 5 * 60 * 1000;

export function splitCustomerOrders(orders, now = Date.now()) {
  const all = dedupeOrders(orders);
  const isRecentlyCompleted = (order) => {
    if (order.status !== 'completed' || !order.completedAt) return false;
    const completedAt = new Date(order.completedAt).getTime();
    return Number.isFinite(completedAt) && now < completedAt + CUSTOMER_COMPLETED_TRACKING_MS;
  };
  return {
    active: all.filter((order) => !['completed', 'cancelled'].includes(order.status) || isRecentlyCompleted(order)),
    past: all.filter((order) => ['completed', 'quote_rejected', 'cancelled'].includes(order.status) && !isRecentlyCompleted(order)),
  };
}

export function customerOrderStatus(status) {
  return CUSTOMER_ORDER_STATUS[status] || 'Status atualizado';
}

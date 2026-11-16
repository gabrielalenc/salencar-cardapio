import { formatCurrency } from './formatters.js';

export function calculateDeliveryTotal(subtotal, deliveryQuote) {
  const productAmount = Number(subtotal);
  const deliveryAmount = Number(deliveryQuote);
  if (!Number.isFinite(productAmount) || productAmount < 0 || !Number.isFinite(deliveryAmount) || deliveryAmount < 0) return NaN;
  return Math.round((productAmount + deliveryAmount) * 100) / 100;
}

export function buildDeliveryQuoteMessage(order) {
  const customerName = String(order.customerName || 'Cliente').trim();
  const total = calculateDeliveryTotal(order.subtotal, order.deliveryQuote);
  return `Olá, ${customerName}! Tudo bem? 😊\n\nEntramos em contato sobre o seu pedido realizado em nossa loja.\n\nO valor total do seu pedido, já incluindo o frete, ficou em:\n\n🛒 Produtos: ${formatCurrency(order.subtotal)}\n\n🚚 Frete: ${formatCurrency(order.deliveryQuote)}\n\n💰 Total do pedido: ${formatCurrency(total)}\n\nSe estiver tudo certo, pedimos que confirme para darmos continuidade ao seu pedido.\n\nAgradecemos pela preferência! ❤️`;
}

export function buildDeliveryQuoteWhatsAppUrl(phoneNumber, message) {
  let phone = String(phoneNumber || '').replace(/\D/g, '');
  if (phone.startsWith('0') && !phone.startsWith('55')) phone = phone.slice(1);
  if (phone && !phone.startsWith('55')) phone = `55${phone}`;
  if (!/^55\d{10,11}$/.test(phone) || !message) return '';
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

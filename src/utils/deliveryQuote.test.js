import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeliveryQuoteMessage, buildDeliveryQuoteWhatsAppUrl, calculateDeliveryTotal } from './deliveryQuote.js';

test('delivery total adds the saved delivery quote to the product subtotal', () => {
  assert.equal(calculateDeliveryTotal(75, 12), 87);
  assert.equal(calculateDeliveryTotal(75.25, 12.5), 87.75);
  assert.equal(Number.isNaN(calculateDeliveryTotal(-1, 12)), true);
});

test('delivery quote message follows the approved template and uses the order name and amounts', () => {
  const message = buildDeliveryQuoteMessage({
    customerName: 'Ana',
    subtotal: 75,
    deliveryQuote: 12,
  });

  assert.match(message, /Olá, Ana! Tudo bem\?/);
  assert.match(message, /Entramos em contato sobre o seu pedido realizado em nossa loja\./);
  assert.match(message, /R\$\s*75,00/);
  assert.match(message, /R\$\s*12,00/);
  assert.match(message, /R\$\s*87,00/);
});

test('WhatsApp link normalizes Brazilian phones and encodes the message', () => {
  const url = buildDeliveryQuoteWhatsAppUrl('(11) 98765-4321', 'Olá! frete R$ 12,00 😊');
  assert.equal(url, `https://wa.me/5511987654321?text=${encodeURIComponent('Olá! frete R$ 12,00 😊')}`);
  assert.equal(buildDeliveryQuoteWhatsAppUrl('123', 'Mensagem'), '');
});

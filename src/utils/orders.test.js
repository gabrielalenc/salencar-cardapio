import test from 'node:test';
import assert from 'node:assert/strict';
import { customerOrderStatus, dedupeOrders, getCustomerOrders, splitCustomerOrders } from './orders.js';

test('customer order list uses the account id and only falls back to email for legacy records', () => {
  const customer = { id: 'user-a', email: 'a@example.com' };
  const orders = [
    { id: 'own', customerId: 'user-a', customerEmail: 'other@example.com' },
    { id: 'other', customerId: 'user-b', customerEmail: 'a@example.com' },
    { id: 'legacy', customerEmail: ' A@EXAMPLE.COM ' },
  ];

  assert.deepEqual(getCustomerOrders(orders, customer).map((order) => order.id), ['own', 'legacy']);
});

test('duplicate order ids retain the latest saved status', () => {
  const orders = dedupeOrders([
    { id: 'SAL-1', status: 'new', createdAt: '2026-01-01T10:00:00Z' },
    { id: 'SAL-1', status: 'preparing', createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:05:00Z' },
  ]);

  assert.equal(orders.length, 1);
  assert.equal(orders[0].status, 'preparing');
});

test('cancelled and completed orders are kept out of the active list', () => {
  const groups = splitCustomerOrders([
    { id: 'new', status: 'new' }, { id: 'preparing', status: 'preparing' },
    { id: 'done', status: 'completed' }, { id: 'cancelled', status: 'cancelled' },
  ]);

  assert.deepEqual(groups.active.map((order) => order.id), ['new', 'preparing']);
  assert.deepEqual(groups.past.map((order) => order.id), ['done', 'cancelled']);
});

test('customer status labels match the shared order statuses', () => {
  assert.equal(customerOrderStatus('confirmed'), 'Pedido recebido');
  assert.equal(customerOrderStatus('out_for_delivery'), 'Saiu para entrega');
  assert.equal(customerOrderStatus('cancelled'), 'Cancelado');
});

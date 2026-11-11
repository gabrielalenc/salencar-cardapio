import test from 'node:test';
import assert from 'node:assert/strict';
import { CART_TTL_MS, getCartStorageKey, isCartExpired, readCustomerCart, writeCustomerCart } from './cartStorage.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  };
}

test('a cart stays active before five hours and expires at five hours', () => {
  const startedAt = 10_000;
  const snapshot = { items: [{ cartKey: 'item-1' }], startedAt };
  assert.equal(isCartExpired(snapshot, startedAt + CART_TTL_MS - 1), false);
  assert.equal(isCartExpired(snapshot, startedAt + CART_TTL_MS), true);
});

test('adding more items does not change the original expiration time', () => {
  const storage = createStorage();
  const startedAt = 50_000;
  const key = getCartStorageKey('customer-a');
  writeCustomerCart(storage, 'customer-a', [{ id: 1 }, { id: 2 }], startedAt);
  const saved = JSON.parse(storage.getItem(key));
  assert.equal(saved.startedAt, startedAt);
  assert.equal(readCustomerCart(storage, 'customer-a', startedAt + CART_TTL_MS - 1).items.length, 2);
});

test('a persisted cart survives a reload and is cleared when expired', () => {
  const storage = createStorage();
  const startedAt = 80_000;
  writeCustomerCart(storage, 'customer-a', [{ id: 'drink', quantity: 2 }], startedAt);
  assert.deepEqual(readCustomerCart(storage, 'customer-a', startedAt + 4 * 60 * 60 * 1000).items, [{ id: 'drink', quantity: 2 }]);
  assert.deepEqual(readCustomerCart(storage, 'customer-a', startedAt + CART_TTL_MS).items, []);
  assert.equal(storage.has(getCartStorageKey('customer-a')), false);
});

test('customer carts use separate storage keys', () => {
  const storage = createStorage();
  writeCustomerCart(storage, 'customer-a', [{ id: 'a' }], 100_000);
  writeCustomerCart(storage, 'customer-b', [{ id: 'b' }], 100_000);
  assert.deepEqual(readCustomerCart(storage, 'customer-a', 101_000).items, [{ id: 'a' }]);
  assert.deepEqual(readCustomerCart(storage, 'customer-b', 101_000).items, [{ id: 'b' }]);
});

test('emptying a cart removes only cart data, leaving unrelated order data untouched', () => {
  const storage = createStorage();
  storage.setItem('salencar_order_history', 'preserved');
  writeCustomerCart(storage, 'customer-a', [{ id: 'drink' }], 100_000);
  writeCustomerCart(storage, 'customer-a', [], null);
  assert.equal(storage.has(getCartStorageKey('customer-a')), false);
  assert.equal(storage.getItem('salencar_order_history'), 'preserved');
});

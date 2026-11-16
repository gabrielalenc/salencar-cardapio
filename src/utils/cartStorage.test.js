import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  CART_TTL_MS, clearCustomerCart, getCartStorageKey, isCartExpired, readCustomerCart, writeCustomerCart,
  emptyCartSnapshot, mergeCartSnapshots, serializeCartItems,
} from './cartStorage.js';
import { isAuthenticatedCartOwner } from './cartAccess.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  };
}

test('cart expires thirty days after its last activity', () => {
  const lastActivityAt = 10_000;
  const snapshot = { items: [{ cartKey: 'item-1' }], lastActivityAt };
  assert.equal(CART_TTL_MS, 30 * 24 * 60 * 60 * 1000);
  assert.equal(isCartExpired(snapshot, lastActivityAt + CART_TTL_MS - 1), false);
  assert.equal(isCartExpired(snapshot, lastActivityAt + CART_TTL_MS), true);
});

test('unauthenticated users cannot address or write a local cart cache', () => {
  const storage = createStorage();
  assert.throws(() => getCartStorageKey(null), TypeError);
  assert.deepEqual(readCustomerCart(storage, null).items, []);
  assert.throws(() => writeCustomerCart(storage, null, emptyCartSnapshot()), TypeError);
  assert.equal(storage.has('salencar_delivery_cart_v2:guest'), false);
});

test('only the authenticated customer who owns a cart can modify it', () => {
  assert.equal(isAuthenticatedCartOwner(null, null), false);
  assert.equal(isAuthenticatedCartOwner({ id: 'customer-a', role: 'customer' }, 'customer-a'), true);
  assert.equal(isAuthenticatedCartOwner({ id: 'customer-a', role: 'customer' }, 'customer-a', true), false);
  assert.equal(isAuthenticatedCartOwner({ id: 'customer-a', role: 'admin' }, 'customer-a'), false);
  assert.equal(isAuthenticatedCartOwner({ id: 'customer-a', role: 'customer' }, 'customer-b'), false);
});

test('different authenticated customers use isolated caches', () => {
  assert.notEqual(getCartStorageKey('customer-a'), getCartStorageKey('customer-b'));
});

test('logout clears only that customer local cache and preserves other customer cache', () => {
  const storage = createStorage();
  writeCustomerCart(storage, 'customer-a', { ...emptyCartSnapshot(10), items: [{ id: 'a' }] });
  writeCustomerCart(storage, 'customer-b', { ...emptyCartSnapshot(10), items: [{ id: 'b' }] });
  assert.equal(clearCustomerCart(storage, 'customer-a'), true);
  assert.equal(storage.has(getCartStorageKey('customer-a')), false);
  assert.equal(readCustomerCart(storage, 'customer-b', 20).items[0].id, 'b');
  assert.equal(clearCustomerCart(storage, null), false);
});

test('cart cache survives reload and retains sync metadata', () => {
  const storage = createStorage();
  const now = 80_000;
  const snapshot = { ...emptyCartSnapshot(now), items: [{ cartKey: 'drink', quantity: 2 }], dirty: true };
  writeCustomerCart(storage, 'customer-a', snapshot);
  const saved = readCustomerCart(storage, 'customer-a', now + 4 * 60 * 60 * 1000);
  assert.deepEqual(saved.items, snapshot.items);
  assert.equal(saved.dirty, true);
  assert.equal(saved.lastActivityAt, now);
  assert.deepEqual(readCustomerCart(storage, 'customer-a', now + CART_TTL_MS).items, []);
  assert.equal(storage.has(getCartStorageKey('customer-a')), false);
});

test('emptying a cart only removes cart data without sync tombstones', () => {
  const storage = createStorage();
  storage.setItem('salencar_order_history', 'preserved');
  writeCustomerCart(storage, 'customer-a', { ...emptyCartSnapshot(100_000), items: [{ id: 'drink' }] });
  writeCustomerCart(storage, 'customer-a', emptyCartSnapshot(101_000));
  assert.equal(storage.has(getCartStorageKey('customer-a')), false);
  assert.equal(storage.getItem('salencar_order_history'), 'preserved');
});

test('snapshot merge keeps the newest item version and respects newer deletions', () => {
  const merged = mergeCartSnapshots(
    { items: [{ cartKey: 'kept', updatedAt: 20 }, { cartKey: 'deleted', updatedAt: 10 }], tombstones: { deleted: 15 }, lastActivityAt: 20, createdAt: 1, revision: 2 },
    { items: [{ cart_key: 'kept', updated_at: 15 }, { cart_key: 'deleted', updated_at: 12 }], tombstones: {}, lastActivityAt: 10, createdAt: 1, revision: 3 },
    30,
  );
  assert.deepEqual(merged.items.map((item) => item.cartKey), ['kept']);
  assert.equal(merged.items[0].updatedAt, 20);
  assert.equal(merged.revision, 3);
  assert.equal(merged.dirty, true);
});

test('Supabase serialization stores only cart identifiers and selections', () => {
  const dto = serializeCartItems([{ cartKey: 'x', product: { id: 'drink' }, base: { id: 'base' }, extras: [{ id: 'extra' }], notes: 'sem gelo', quantity: 2, unitPrice: 99 }])[0];
  assert.deepEqual(dto, { cart_key: 'x', product_id: 'drink', base_id: 'base', extras: ['extra'], notes: 'sem gelo', quantity: 2, updated_at: dto.updated_at });
  assert.equal('unitPrice' in dto, false);
});

test('Supabase cart migration keeps writes behind authenticated customer RPCs and RLS', async () => {
  const migrationPath = new URL('../../supabase/migrations/20261115130000_customer_cart_sync.sql', import.meta.url);
  const sql = await readFile(fileURLToPath(migrationPath), 'utf8');
  assert.match(sql, /alter table public\.customer_carts enable row level security/i);
  assert.match(sql, /for select to authenticated using \(user_id = \(select auth\.uid\(\)\)\)/i);
  assert.match(sql, /revoke all on public\.customer_carts from public, anon, authenticated/i);
  assert.match(sql, /revoke all on function public\.save_customer_cart\(jsonb, jsonb, integer\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.save_customer_cart\(jsonb, jsonb, integer\) to authenticated/i);
  assert.match(sql, /p\.role = 'customer'/i);
});

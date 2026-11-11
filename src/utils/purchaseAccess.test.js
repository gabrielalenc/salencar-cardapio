import test from 'node:test';
import assert from 'node:assert/strict';
import { createPurchaseIntent, createSelectionIntent, hasVerifiedCustomerSession, requiresCustomerAccount } from './purchaseAccess.js';

test('every purchase requires a customer session', () => {
  assert.equal(requiresCustomerAccount(null), true);
  assert.equal(requiresCustomerAccount({ role: 'admin' }), true);
  assert.equal(requiresCustomerAccount({ role: 'customer' }), false);
});

test('opening flavor selection requires the verified Supabase customer session', () => {
  const customer = { id: 'user-1', role: 'customer' };
  assert.equal(hasVerifiedCustomerSession(null, { ok: true, userId: 'user-1' }), false);
  assert.equal(hasVerifiedCustomerSession({ id: 'admin-1', role: 'admin' }, { ok: true, userId: 'admin-1' }), false);
  assert.equal(hasVerifiedCustomerSession(customer, { ok: false, userId: 'user-1' }), false);
  assert.equal(hasVerifiedCustomerSession(customer, { ok: true, userId: 'user-1' }), true);
});

test('a purchase intent preserves the product customization through login', () => {
  const intent = createPurchaseIntent(
    { id: 'combo-2-batidas-alcoolicas' },
    'checkout',
    { id: 'dupla-morango--limao', price: 0 },
    [{ id: 'extra-1' }],
    'Pouco gelo',
    2,
  );
  assert.deepEqual(intent, {
    flow: 'purchase',
    productId: 'combo-2-batidas-alcoolicas',
    action: 'checkout',
    baseId: 'dupla-morango--limao',
    extraIds: ['extra-1'],
    notes: 'Pouco gelo',
    quantity: 2,
  });
});

test('a flavor selection intent preserves the product to reopen after authentication', () => {
  assert.deepEqual(createSelectionIntent({ id: 'combo-2-batidas-alcoolicas' }), {
    flow: 'select-flavors',
    productId: 'combo-2-batidas-alcoolicas',
  });
});

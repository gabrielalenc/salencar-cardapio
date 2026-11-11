export const PENDING_PURCHASE_KEY = 'salencar_pending_purchase_v1';
export const PENDING_SELECTION_KEY = 'salencar_pending_selection_v1';

export function requiresCustomerAccount(user) {
  return user?.role !== 'customer';
}

export function hasVerifiedCustomerSession(user, session) {
  return user?.role === 'customer' && session?.ok === true && session.userId === user.id;
}

export function createPurchaseIntent(product, action = 'cart', base = null, extras = [], notes = '', quantity = 1) {
  return {
    flow: 'purchase',
    productId: product.id,
    action: action === 'checkout' ? 'checkout' : 'cart',
    baseId: base?.id || null,
    extraIds: (extras || []).map((extra) => extra.id),
    notes: String(notes || ''),
    quantity: Math.max(1, Number(quantity) || 1),
  };
}

export function createSelectionIntent(product) {
  return { flow: 'select-flavors', productId: product.id };
}

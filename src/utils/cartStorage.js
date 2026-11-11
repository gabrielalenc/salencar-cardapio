export const CART_TTL_MS = 5 * 60 * 60 * 1000;
const CART_STORAGE_PREFIX = 'salencar_delivery_cart_v2:';

export function getCartStorageKey(userId) {
  return `${CART_STORAGE_PREFIX}${encodeURIComponent(userId)}`;
}

export function isCartExpired(snapshot, now = Date.now()) {
  if (!Array.isArray(snapshot?.items) || snapshot.items.length === 0) return false;
  const startedAt = Number(snapshot.startedAt);
  return !Number.isFinite(startedAt) || startedAt <= 0 || now - startedAt >= CART_TTL_MS;
}

export function readCustomerCart(storage, userId, now = Date.now()) {
  const key = getCartStorageKey(userId);
  try {
    const serialized = storage.getItem(key);
    if (!serialized) return { items: [], startedAt: null };
    const snapshot = JSON.parse(serialized);
    if (!snapshot || !Array.isArray(snapshot.items) || isCartExpired(snapshot, now)) {
      storage.removeItem(key);
      return { items: [], startedAt: null };
    }
    if (snapshot.items.length === 0) {
      storage.removeItem(key);
      return { items: [], startedAt: null };
    }
    return { items: snapshot.items, startedAt: Number(snapshot.startedAt) };
  } catch {
    storage.removeItem(key);
    return { items: [], startedAt: null };
  }
}

export function writeCustomerCart(storage, userId, items, startedAt) {
  const key = getCartStorageKey(userId);
  if (!items.length || !startedAt) {
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, JSON.stringify({ items, startedAt }));
}

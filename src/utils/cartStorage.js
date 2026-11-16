export const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const CART_SYNC_DEBOUNCE_MS = 450;
const CART_STORAGE_PREFIX = 'salencar_delivery_cart_v2:';

export function getCartStorageKey(userId) {
  if (typeof userId !== 'string' || !userId.trim()) throw new TypeError('An authenticated user ID is required to access a cart cache');
  return `${CART_STORAGE_PREFIX}${encodeURIComponent(userId)}`;
}

export function isCartExpired(snapshot, now = Date.now()) {
  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  const tombstones = snapshot?.tombstones && typeof snapshot.tombstones === 'object' ? snapshot.tombstones : {};
  if (!items.length && !Object.keys(tombstones).length) return false;
  const expiresAt = Number(snapshot?.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt > 0) return now >= expiresAt;
  const lastActivityAt = Number(snapshot?.lastActivityAt ?? snapshot?.startedAt);
  return !Number.isFinite(lastActivityAt) || lastActivityAt <= 0 || now - lastActivityAt >= CART_TTL_MS;
}

export function emptyCartSnapshot(now = Date.now()) {
  return { items: [], tombstones: {}, createdAt: now, lastActivityAt: now, expiresAt: now + CART_TTL_MS, revision: 0, dirty: false };
}

export function readCustomerCart(storage, userId, now = Date.now()) {
  if (typeof userId !== 'string' || !userId.trim()) return emptyCartSnapshot(now);
  const key = getCartStorageKey(userId);
  try {
    const serialized = storage.getItem(key);
    if (!serialized) return emptyCartSnapshot(now);
    const saved = JSON.parse(serialized);
    if (!saved || !Array.isArray(saved.items) || isCartExpired(saved, now)) {
      storage.removeItem(key);
      return emptyCartSnapshot(now);
    }
    const lastActivityAt = Number(saved.lastActivityAt ?? saved.startedAt ?? saved.createdAt ?? now);
    return {
      ...saved,
      items: saved.items,
      tombstones: saved.tombstones && typeof saved.tombstones === 'object' && !Array.isArray(saved.tombstones) ? saved.tombstones : {},
      createdAt: Number(saved.createdAt ?? saved.startedAt ?? lastActivityAt),
      lastActivityAt,
      expiresAt: Number(saved.expiresAt) || lastActivityAt + CART_TTL_MS,
      revision: Math.max(0, Number(saved.revision) || 0),
      dirty: Boolean(saved.dirty),
    };
  } catch {
    try { storage.removeItem(key); } catch { /* storage may be unavailable */ }
    return emptyCartSnapshot(now);
  }
}

export function writeCustomerCart(storage, userId, snapshot) {
  if (typeof userId !== 'string' || !userId.trim()) throw new TypeError('An authenticated user ID is required to write a cart cache');
  const key = getCartStorageKey(userId);
  if (!snapshot || !Array.isArray(snapshot.items)) throw new TypeError('Invalid cart snapshot');
  if (!snapshot.items.length && !Object.keys(snapshot.tombstones || {}).length && !snapshot.revision) {
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, JSON.stringify(snapshot));
}

export function clearCustomerCart(storage, userId) {
  if (typeof userId !== 'string' || !userId.trim()) return false;
  storage.removeItem(getCartStorageKey(userId));
  return true;
}

export function serializeCartItems(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    cart_key: item.cartKey,
    product_id: item.product?.id,
    base_id: item.base?.id || '',
    extras: (item.extras || []).map((extra) => extra.id),
    notes: String(item.notes || ''),
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    updated_at: Number(item.updatedAt) || Date.now(),
  }));
}

export function mergeCartSnapshots(local, remote, now = Date.now()) {
  const tombstones = { ...(remote?.tombstones || {}) };
  Object.entries(local?.tombstones || {}).forEach(([key, deletedAt]) => {
    tombstones[key] = Math.max(Number(tombstones[key]) || 0, Number(deletedAt) || 0);
  });

  const byKey = new Map();
  [...(remote?.items || []), ...(local?.items || [])].forEach((item) => {
    const key = item.cartKey || item.cart_key;
    if (!key) return;
    const previous = byKey.get(key);
    if (!previous || (Number(item.updatedAt ?? item.updated_at) || 0) >= (Number(previous.updatedAt ?? previous.updated_at) || 0)) {
      byKey.set(key, item);
    }
  });

  const items = [...byKey.entries()]
    .filter(([key, item]) => (Number(tombstones[key]) || 0) < (Number(item.updatedAt ?? item.updated_at) || 0))
    .map(([, item]) => item);
  const lastActivityAt = Math.max(Number(local?.lastActivityAt) || 0, Number(remote?.lastActivityAt) || 0, now);
  return {
    items,
    tombstones,
    createdAt: Math.min(Number(local?.createdAt) || now, Number(remote?.createdAt) || now),
    lastActivityAt,
    expiresAt: lastActivityAt + CART_TTL_MS,
    revision: Number(remote?.revision) || 0,
    dirty: true,
  };
}

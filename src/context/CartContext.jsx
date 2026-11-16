import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PRODUCTS } from '../data/products';
import { useAuth } from './AuthContext';
import { useNotifications } from '../components/Notifications';
import { CART_TTL_MS, CART_SYNC_DEBOUNCE_MS, clearCustomerCart, emptyCartSnapshot, isCartExpired, mergeCartSnapshots, readCustomerCart, serializeCartItems, writeCustomerCart } from '../utils/cartStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isAuthenticatedCartOwner } from '../utils/cartAccess';

const CartContext = createContext();

const LEGACY_CART_STORAGE_KEY = 'salencar_delivery_cart_v1';
const ANONYMOUS_CART_STORAGE_KEY = 'salencar_delivery_cart_v2:guest';
const activeProductsById = new Map(PRODUCTS.map((product) => [product.id, product]));

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function sanitizeCartItems(savedItems, productSettings = {}) {
  if (!Array.isArray(savedItems)) return [];

  return savedItems.flatMap((item) => {
    const baseProduct = activeProductsById.get(item?.product?.id);
    if (!baseProduct) return [];
    const override = productSettings[baseProduct.id] || {};
    if (override.active === false || override.available === false) return [];
    const product = { ...baseProduct, ...(override.price !== undefined && override.price !== '' ? { price: Number(override.price) } : {}) };

    const base = item.base
      ? product.bases?.find((option) => option.id === item.base.id)
        || (product.pairOptions ? product.bases?.find((option) => option.name === item.base.name) : null)
      : product.bases?.length === 1 ? product.bases[0] : null;
    if (item.base && !base) return [];

    const allowedExtras = new Map((product.extras || []).map((extra) => [extra.id, extra]));
    const extras = (item.extras || []).map((extra) => allowedExtras.get(extra.id)).filter(Boolean);
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = product.price + (base?.price || 0) + extras.reduce((sum, extra) => sum + (extra.price || 0), 0);

    return [{
      ...item,
      product,
      base: base || null,
      extras,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
    }];
  });
}

export function CartProvider({ children }) {
  const { productSettings, inventory, stockAvailability, authLoading, currentUser } = useAuth();
  const { notify } = useNotifications();
  // Inicialização com localStorage
  const [items, setItems] = useState([]);
  const [cartStartedAt, setCartStartedAt] = useState(null);
  const [lastActivityAt, setLastActivityAt] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [tombstones, setTombstones] = useState({});
  const [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const syncTimerRef = useRef(null);
  const latestSnapshotRef = useRef(null);
  const [cartOwnerId, setCartOwnerId] = useState(undefined);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deliveryType, setDeliveryType] = useState('delivery'); // 'delivery' ou 'pickup'

  // Salvar no localStorage a cada alteração
  const customerId = currentUser?.role === 'customer' ? currentUser.id : null;
  const cartReady = isAuthenticatedCartOwner(currentUser, cartOwnerId, authLoading);

  useEffect(() => {
    try { localStorage.removeItem(LEGACY_CART_STORAGE_KEY); } catch (error) {
      console.error('Nao foi possÃ­vel remover o carrinho antigo:', error);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!customerId) {
      try {
        if (cartOwnerId) clearCustomerCart(localStorage, cartOwnerId);
        localStorage.removeItem(ANONYMOUS_CART_STORAGE_KEY);
      } catch (error) { console.error('Não foi possível limpar o cache do carrinho:', error); }
      setItems([]);
      setCartStartedAt(null);
      setLastActivityAt(null);
      setExpiresAt(null);
      setTombstones({});
      setRevision(0);
      setDirty(false);
      latestSnapshotRef.current = null;
      setCartOwnerId(null);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
      setSelectedProduct(null);
      return;
    }
    if (cartOwnerId && cartOwnerId !== customerId) {
      try { clearCustomerCart(localStorage, cartOwnerId); } catch { /* owner cache is best effort cleanup */ }
    }
    try { localStorage.removeItem(ANONYMOUS_CART_STORAGE_KEY); } catch { /* remove legacy anonymous cart cache */ }
    const snapshot = readCustomerCart(localStorage, customerId);
    setItems(sanitizeCartItems(snapshot.items, productSettings));
    setCartStartedAt(snapshot.createdAt || null);
    setLastActivityAt(snapshot.lastActivityAt || null);
    setExpiresAt(snapshot.expiresAt || null);
    setTombstones(snapshot.tombstones || {});
    setRevision(snapshot.revision || 0);
    setDirty(Boolean(snapshot.dirty));
    latestSnapshotRef.current = snapshot;
    setCartOwnerId(customerId);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    setSelectedProduct(null);
  }, [authLoading, customerId]);

  useEffect(() => {
    if (authLoading || !customerId || cartOwnerId !== customerId) return;
    const snapshot = { items, createdAt: cartStartedAt, lastActivityAt, expiresAt, tombstones, revision, dirty };
    latestSnapshotRef.current = snapshot;
    try {
      writeCustomerCart(localStorage, customerId, snapshot);
    } catch (error) {
      console.error('Erro ao salvar carrinho do cliente:', error);
    }
  }, [items, cartStartedAt, lastActivityAt, expiresAt, tombstones, revision, dirty, authLoading, cartOwnerId, customerId]);

  const applyRemoteSnapshot = useCallback((remote, shouldMerge = false) => {
    const now = Date.now();
    const remoteItems = (remote?.items || []).flatMap((entry) => {
      const product = activeProductsById.get(entry.product_id || entry.product?.id);
      if (!product) return [];
      const base = product.bases?.find((option) => option.id === (entry.base_id || entry.base?.id)) || null;
      const extras = (entry.extras || []).map((value) => product.extras?.find((extra) => extra.id === (typeof value === 'string' ? value : value.id))).filter(Boolean);
      const notes = String(entry.notes || '');
      const cartKey = entry.cart_key || entry.cartKey || `${product.id}-${base?.id || 'default'}-${extras.map((extra) => extra.id).sort().join('_')}-${notes.trim().toLowerCase()}`;
      const quantity = Math.max(1, Math.floor(Number(entry.quantity) || 1));
      const unitPrice = product.price + (base?.price || 0) + extras.reduce((sum, extra) => sum + (extra.price || 0), 0);
      return [{ cartKey, product, base, extras, notes, quantity, unitPrice, totalPrice: quantity * unitPrice, updatedAt: Number(entry.updated_at || entry.updatedAt) || now }];
    });
    const local = latestSnapshotRef.current || emptyCartSnapshot(now);
    const normalizedRemote = { ...remote, items: remoteItems };
    const combined = shouldMerge ? mergeCartSnapshots(local, normalizedRemote, now) : { ...local, ...normalizedRemote, items: remoteItems, tombstones: remote?.tombstones || {}, dirty: false };
    setItems(sanitizeCartItems(combined.items, productSettings));
    setCartStartedAt(combined.createdAt || now);
    setLastActivityAt(combined.lastActivityAt || now);
    setExpiresAt(combined.expiresAt || now + CART_TTL_MS);
    setTombstones(combined.tombstones || {});
    setRevision(Number(combined.revision) || 0);
    setDirty(Boolean(combined.dirty));
    latestSnapshotRef.current = combined;
  }, [productSettings]);

  useEffect(() => {
    if (authLoading || !customerId || cartOwnerId !== customerId || !isSupabaseConfigured) return undefined;
    let alive = true;
    supabase.rpc('get_customer_cart').then(({ data, error }) => {
      if (!alive) return;
      if (error) { console.error('Não foi possível sincronizar o carrinho:', error.message); return; }
      const remote = data?.cart || data;
      const merge = Boolean(latestSnapshotRef.current?.dirty);
      applyRemoteSnapshot(remote, merge);
      if (merge) setDirty(true);
    });
    const channel = supabase.channel(`customer-cart:${customerId}`).on('postgres_changes', {
      event: '*', schema: 'public', table: 'customer_carts', filter: `user_id=eq.${customerId}`,
    }, ({ new: row }) => {
      if (row?.user_id === customerId) {
        const localIsDirty = Boolean(latestSnapshotRef.current?.dirty);
        applyRemoteSnapshot({
          items: row.items, tombstones: row.tombstones, createdAt: Date.parse(row.created_at),
          lastActivityAt: Date.parse(row.last_activity_at), expiresAt: Date.parse(row.expires_at), revision: row.revision,
        }, localIsDirty);
      }
    }).subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [authLoading, customerId, cartOwnerId, applyRemoteSnapshot]);

  useEffect(() => {
    if (!cartReady || !dirty || !customerId || !isSupabaseConfigured) return undefined;
    window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(async () => {
      const snapshot = latestSnapshotRef.current;
      if (!snapshot) return;
      const sentItems = serializeCartItems(snapshot.items);
      const sentTombstones = snapshot.tombstones || {};
      const { data, error } = await supabase.rpc('save_customer_cart', {
        p_items: sentItems, p_tombstones: sentTombstones, p_expected_revision: snapshot.revision || 0,
      });
      if (error) { console.error('Não foi possível salvar o carrinho no Supabase:', error.message); return; }
      if (data?.conflict && data.cart) { applyRemoteSnapshot(data.cart, true); return; }
      const savedRevision = Number(data?.revision) || snapshot.revision || 0;
      const current = latestSnapshotRef.current || snapshot;
      const unchanged = JSON.stringify(serializeCartItems(current.items)) === JSON.stringify(sentItems)
        && JSON.stringify(current.tombstones || {}) === JSON.stringify(sentTombstones);
      latestSnapshotRef.current = { ...current, revision: savedRevision, dirty: !unchanged };
      setRevision(savedRevision);
      setDirty(!unchanged);
    }, CART_SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(syncTimerRef.current);
  }, [cartReady, dirty, customerId, applyRemoteSnapshot]);

  useEffect(() => {
    if (authLoading || !customerId || cartOwnerId !== customerId || !expiresAt || !items.length) return undefined;
    const expireIfNeeded = () => {
      if (!isCartExpired({ items, lastActivityAt, expiresAt })) return;
      setItems([]);
      setTombstones({});
      setDirty(Boolean(customerId));
      setCartStartedAt(null);
      setLastActivityAt(null);
      setExpiresAt(null);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
    };
    const timeout = window.setTimeout(expireIfNeeded, Math.max(0, expiresAt - Date.now()));
    window.addEventListener('pageshow', expireIfNeeded);
    document.addEventListener('visibilitychange', expireIfNeeded);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('pageshow', expireIfNeeded);
      document.removeEventListener('visibilitychange', expireIfNeeded);
    };
  }, [items, lastActivityAt, expiresAt, authLoading, customerId, cartOwnerId]);

  // Gerar chave única para itens com diferentes personalizações
  const generateCartKey = (productId, baseId, extras, notes) => {
    const sortedExtras = (extras || []).map(e => e.id).sort().join('_');
    const cleanNotes = (notes || '').trim().toLowerCase();
    return `${productId}-${baseId || 'default'}-${sortedExtras}-${cleanNotes}`;
  };

  const markActivity = (now = Date.now()) => {
    if (!customerId) return;
    setCartStartedAt((created) => created || now);
    setLastActivityAt(now);
    setExpiresAt(now + CART_TTL_MS);
    if (customerId) setDirty(true);
  };

  // Adicionar produto com personalizações
  const addToCart = (product, base, extras = [], notes = '', quantity = 1, showToast = true) => {
    if (!isAuthenticatedCartOwner(currentUser, cartOwnerId, authLoading)) return false;
    const now = Date.now();
    markActivity(now);
    const basePrice = (base && base.price) ? base.price : 0;
    const extrasTotal = (extras || []).reduce((acc, curr) => acc + (curr.price || 0), 0);
    const unitPrice = product.price + basePrice + extrasTotal;

    const cartKey = generateCartKey(product.id, base?.id, extras, notes);
    setTombstones((previous) => { const next = { ...previous }; delete next[cartKey]; return next; });

    if (showToast) {
      notify({ type: 'success', title: 'Adicionado à sacola', message: product.name, duration: 2600 });
    }

    setItems(prevItems => {
      const existingIndex = prevItems.findIndex(item => item.cartKey === cartKey);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          unitPrice,
          quantity: newQty,
          totalPrice: newQty * unitPrice,
          updatedAt: now,
        };
        return updated;
      } else {
        return [
          ...prevItems,
          {
            cartKey,
            product,
            base: base || null,
            extras: extras || [],
            notes: notes ? notes.trim() : '',
            unitPrice,
            quantity,
            totalPrice: unitPrice * quantity,
            updatedAt: now,
          }
        ];
      }
    });

    // Fecha modal de detalhes se estiver aberto
    setSelectedProduct(null);
    return true;
  };

  const addOrderToCart = (order) => {
    const unavailable = [];
    if (!cartReady) return { addedCount: 0, unavailable: ['Entre na conta do cliente antes de adicionar itens.'] };
    const reservedStock = new Map();
    let addedCount = 0;
    for (const item of order?.items || []) {
      const productId = item.productId || item.product?.id;
      const sourceProduct = activeProductsById.get(productId);
      const override = productSettings[productId] || {};
      const quantity = Math.floor(Number(item.quantity));
      if (!sourceProduct || override.active === false || override.available === false || !Number.isFinite(quantity) || quantity < 1) {
        unavailable.push(item.productName || sourceProduct?.name || 'Um produto do pedido');
        continue;
      }

      const currentPrice = override.price !== undefined && override.price !== '' ? Number(override.price) : sourceProduct.price;
      if (!Number.isFinite(currentPrice) || currentPrice < 0) {
        unavailable.push(sourceProduct.name);
        continue;
      }
      const product = { ...sourceProduct, price: currentPrice };
      const savedBaseId = item.baseId || item.base?.id;
      const savedBaseName = item.option || item.base?.name;
      const base = savedBaseId
        ? product.bases?.find((option) => option.id === savedBaseId) || product.bases?.find((option) => normalizeText(option.name) === normalizeText(savedBaseName))
        : savedBaseName
          ? product.bases?.find((option) => normalizeText(option.name) === normalizeText(savedBaseName))
          : product.bases?.length === 1 ? product.bases[0] : null;
      if ((savedBaseId || savedBaseName || product.pairOptions?.length || (product.bases?.length || 0) > 1) && !base) {
        unavailable.push(`${product.name} (opção indisponível)`);
        continue;
      }

      const savedExtras = Array.isArray(item.extras) ? item.extras : [];
      const extras = savedExtras.map((savedExtra) => {
        const savedName = typeof savedExtra === 'string' ? savedExtra : savedExtra?.name;
        return product.extras?.find((extra) => extra.id === savedExtra?.id || normalizeText(extra.name) === normalizeText(savedName));
      });
      if (extras.some((extra) => !extra)) {
        unavailable.push(`${product.name} (adicional indisponível)`);
        continue;
      }

      const requiredStock = {};
      if (product.pairOptions?.length) {
        const flavorIds = base?.id?.match(/^dupla-(.+)--(.+)$/)?.slice(1) || [];
        if (flavorIds.length !== 2) {
          unavailable.push(`${product.name} (opção indisponível)`);
          continue;
        }
        flavorIds.forEach((flavorId) => { requiredStock[flavorId] = (requiredStock[flavorId] || 0) + quantity; });
      } else if (inventory.flavors?.[product.id]) {
        requiredStock[product.id] = quantity;
      }
      const available = Object.entries(requiredStock).every(([flavorId, count]) => stockAvailability(flavorId, (reservedStock.get(flavorId) || 0) + count));
      if (!available) {
        unavailable.push(product.name);
        continue;
      }

      Object.entries(requiredStock).forEach(([flavorId, count]) => reservedStock.set(flavorId, (reservedStock.get(flavorId) || 0) + count));
      addToCart(product, base || null, extras, item.notes || '', quantity, false);
      addedCount += 1;
    }
    return { addedCount, unavailable };
  };

  // Alterar quantidade
  const updateQuantity = (cartKey, delta) => {
    if (!isAuthenticatedCartOwner(currentUser, cartOwnerId, authLoading)) return false;
    const item = items.find((entry) => entry.cartKey === cartKey);
    const now = Date.now();
    if (item) markActivity(now);
    if (item && item.quantity + delta <= 0) setTombstones((previous) => ({ ...previous, [cartKey]: now }));
    setItems(prevItems => {
      return prevItems
        .map(item => {
          if (item.cartKey === cartKey) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              totalPrice: newQty * item.unitPrice,
              updatedAt: now,
            };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  // Remover item
  const removeFromCart = (cartKey) => {
    if (!isAuthenticatedCartOwner(currentUser, cartOwnerId, authLoading)) return false;
    const now = Date.now();
    markActivity(now);
    setTombstones((previous) => ({ ...previous, [cartKey]: now }));
    setItems(prevItems => prevItems.filter(item => item.cartKey !== cartKey));
  };

  // Limpar carrinho
  const clearCart = async () => {
    if (!isAuthenticatedCartOwner(currentUser, cartOwnerId, authLoading)) return;
    const now = Date.now();
    const nextTombstones = { ...tombstones, ...Object.fromEntries(items.map((item) => [item.cartKey, now])) };
    setTombstones(nextTombstones);
    setLastActivityAt(now);
    setExpiresAt(now + CART_TTL_MS);
    setItems([]);
    setCartStartedAt(null);
    if (customerId) {
      setDirty(true);
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.rpc('save_customer_cart', {
            p_items: [], p_tombstones: nextTombstones, p_expected_revision: revision,
          });
          if (!error && !data?.conflict) {
            setRevision(Number(data?.revision) || revision);
            setDirty(false);
            return;
          }
          if (error) console.error('Falha ao sincronizar carrinho finalizado:', error.message);
        } catch (error) {
          console.error('Falha ao sincronizar carrinho finalizado:', error);
        }
      }
    }
  };

  useEffect(() => {
    if (!cartReady || !items.length) return undefined;
    let lastRecorded = Number(lastActivityAt) || 0;
    const recordActivity = () => {
      const now = Date.now();
      if (now - lastRecorded < 5 * 60 * 1000) return;
      lastRecorded = now;
      markActivity(now);
    };
    window.addEventListener('pointerdown', recordActivity, { passive: true });
    window.addEventListener('keydown', recordActivity);
    window.addEventListener('scroll', recordActivity, { passive: true });
    window.addEventListener('touchstart', recordActivity, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', recordActivity);
      window.removeEventListener('keydown', recordActivity);
      window.removeEventListener('scroll', recordActivity);
      window.removeEventListener('touchstart', recordActivity);
    };
  }, [cartReady, items.length, lastActivityAt]);

  // Totais calculados
  const { subtotal, totalCount } = useMemo(() => {
    return (cartReady ? items : []).reduce(
      (acc, item) => {
        acc.subtotal += item.totalPrice;
        acc.totalCount += item.quantity;
        return acc;
      },
      { subtotal: 0, totalCount: 0 }
    );
  }, [items, cartReady]);

  const total = subtotal;

  return (
    <CartContext.Provider
      value={{
        items: cartReady ? items : [],
        cartStartedAt: cartReady ? cartStartedAt : null,
        cartOwnerId,
        addToCart,
        addOrderToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        subtotal,
        totalCount,
        deliveryType,
        setDeliveryType,
        total,
        isCartOpen,
        setIsCartOpen,
        openCart: () => { markActivity(); setIsCartOpen(true); },
        closeCart: () => setIsCartOpen(false),
        isCheckoutOpen,
        setIsCheckoutOpen,
        openCheckout: () => {
          markActivity();
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        },
        closeCheckout: () => setIsCheckoutOpen(false),
        selectedProduct,
        openProductDetails: (product) => setSelectedProduct(product),
        closeProductDetails: () => setSelectedProduct(null),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de um CartProvider');
  }
  return context;
}


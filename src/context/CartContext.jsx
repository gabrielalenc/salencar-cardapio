import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { PRODUCTS } from '../data/products';
import { useAuth } from './AuthContext';
import { useNotifications } from '../components/Notifications';
import { CART_TTL_MS, isCartExpired, readCustomerCart, writeCustomerCart } from '../utils/cartStorage';

const CartContext = createContext();

const LEGACY_CART_STORAGE_KEY = 'salencar_delivery_cart_v1';
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
  const [cartOwnerId, setCartOwnerId] = useState(undefined);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deliveryType, setDeliveryType] = useState('delivery'); // 'delivery' ou 'pickup'

  // Salvar no localStorage a cada alteração
  const customerId = currentUser?.role === 'customer' ? currentUser.id : null;
  const cartReady = !authLoading && Boolean(customerId) && cartOwnerId === customerId;

  useEffect(() => {
    try { localStorage.removeItem(LEGACY_CART_STORAGE_KEY); } catch (error) {
      console.error('Nao foi possÃ­vel remover o carrinho antigo:', error);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const snapshot = customerId ? readCustomerCart(localStorage, customerId) : { items: [], startedAt: null };
    setItems(sanitizeCartItems(snapshot.items, productSettings));
    setCartStartedAt(snapshot.startedAt);
    setCartOwnerId(customerId);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
  }, [authLoading, customerId]);

  useEffect(() => {
    if (authLoading || !customerId || cartOwnerId !== customerId) return;
    try { writeCustomerCart(localStorage, customerId, items, cartStartedAt); } catch (error) {
      console.error('Erro ao salvar carrinho do cliente:', error);
    }
  }, [items, cartStartedAt, authLoading, customerId, cartOwnerId]);

  useEffect(() => {
    if (authLoading || !customerId || cartOwnerId !== customerId || !cartStartedAt || !items.length) return undefined;
    const expireIfNeeded = () => {
      if (!isCartExpired({ items, startedAt: cartStartedAt })) return;
      setItems([]);
      setCartStartedAt(null);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
    };
    const timeout = window.setTimeout(expireIfNeeded, Math.max(0, cartStartedAt + CART_TTL_MS - Date.now()));
    window.addEventListener('pageshow', expireIfNeeded);
    document.addEventListener('visibilitychange', expireIfNeeded);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('pageshow', expireIfNeeded);
      document.removeEventListener('visibilitychange', expireIfNeeded);
    };
  }, [items, cartStartedAt, authLoading, customerId, cartOwnerId]);

  // Gerar chave única para itens com diferentes personalizações
  const generateCartKey = (productId, baseId, extras, notes) => {
    const sortedExtras = (extras || []).map(e => e.id).sort().join('_');
    const cleanNotes = (notes || '').trim().toLowerCase();
    return `${productId}-${baseId || 'default'}-${sortedExtras}-${cleanNotes}`;
  };

  // Adicionar produto com personalizações
  const addToCart = (product, base, extras = [], notes = '', quantity = 1, showToast = true) => {
    if (currentUser?.role !== 'customer' || cartOwnerId !== currentUser.id || authLoading) return false;
    if (items.length === 0) setCartStartedAt((startedAt) => startedAt || Date.now());
    const basePrice = (base && base.price) ? base.price : 0;
    const extrasTotal = (extras || []).reduce((acc, curr) => acc + (curr.price || 0), 0);
    const unitPrice = product.price + basePrice + extrasTotal;

    const cartKey = generateCartKey(product.id, base?.id, extras, notes);

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
          totalPrice: newQty * unitPrice
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
            totalPrice: unitPrice * quantity
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
    const item = items.find((entry) => entry.cartKey === cartKey);
    if (item && item.quantity + delta <= 0 && items.length === 1) setCartStartedAt(null);
    setItems(prevItems => {
      return prevItems
        .map(item => {
          if (item.cartKey === cartKey) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              totalPrice: newQty * item.unitPrice
            };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  // Remover item
  const removeFromCart = (cartKey) => {
    if (items.length === 1 && items[0].cartKey === cartKey) setCartStartedAt(null);
    setItems(prevItems => prevItems.filter(item => item.cartKey !== cartKey));
  };

  // Limpar carrinho
  const clearCart = () => {
    setItems([]);
    setCartStartedAt(null);
  };

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
  }, [items]);

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
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        isCheckoutOpen,
        setIsCheckoutOpen,
        openCheckout: () => {
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


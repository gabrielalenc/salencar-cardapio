import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { STORE_CONFIG } from '../config/storeConfig';

const CartContext = createContext();

const CART_STORAGE_KEY = 'salencar_delivery_cart_v1';

export function CartProvider({ children }) {
  // Inicialização com localStorage
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Erro ao recuperar carrinho do localStorage:', e);
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deliveryType, setDeliveryType] = useState('delivery'); // 'delivery' ou 'pickup'
  const [addedProductName, setAddedProductName] = useState('');
  const addedToastTimer = useRef(null);

  // Salvar no localStorage a cada alteração
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Erro ao salvar carrinho no localStorage:', e);
    }
  }, [items]);

  useEffect(() => () => window.clearTimeout(addedToastTimer.current), []);

  // Gerar chave única para itens com diferentes personalizações
  const generateCartKey = (productId, baseId, extras, notes) => {
    const sortedExtras = (extras || []).map(e => e.id).sort().join('_');
    const cleanNotes = (notes || '').trim().toLowerCase();
    return `${productId}-${baseId || 'default'}-${sortedExtras}-${cleanNotes}`;
  };

  // Adicionar produto com personalizações
  const addToCart = (product, base, extras = [], notes = '', quantity = 1, showToast = true) => {
    const basePrice = (base && base.price) ? base.price : 0;
    const extrasTotal = (extras || []).reduce((acc, curr) => acc + (curr.price || 0), 0);
    const unitPrice = product.price + basePrice + extrasTotal;

    const cartKey = generateCartKey(product.id, base?.id, extras, notes);

    if (showToast) {
      setAddedProductName(product.name);
      window.clearTimeout(addedToastTimer.current);
      addedToastTimer.current = window.setTimeout(() => setAddedProductName(''), 2800);
    }

    setItems(prevItems => {
      const existingIndex = prevItems.findIndex(item => item.cartKey === cartKey);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
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
  };

  // Alterar quantidade
  const updateQuantity = (cartKey, delta) => {
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
    setItems(prevItems => prevItems.filter(item => item.cartKey !== cartKey));
  };

  // Limpar carrinho
  const clearCart = () => {
    setItems([]);
  };

  // Totais calculados
  const { subtotal, totalCount } = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.subtotal += item.totalPrice;
        acc.totalCount += item.quantity;
        return acc;
      },
      { subtotal: 0, totalCount: 0 }
    );
  }, [items]);

  const isFreeDelivery = subtotal >= STORE_CONFIG.freeDeliveryThreshold;
  const deliveryFee = deliveryType === 'pickup' ? 0 : (isFreeDelivery ? 0 : STORE_CONFIG.deliveryFee);
  const total = subtotal + deliveryFee;
  const amountToFreeDelivery = Math.max(0, STORE_CONFIG.freeDeliveryThreshold - subtotal);
  const freeDeliveryProgress = Math.min(100, Math.round((subtotal / STORE_CONFIG.freeDeliveryThreshold) * 100));

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        addedProductName,
        updateQuantity,
        removeFromCart,
        clearCart,
        subtotal,
        totalCount,
        deliveryFee,
        deliveryType,
        setDeliveryType,
        isFreeDelivery,
        amountToFreeDelivery,
        freeDeliveryProgress,
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


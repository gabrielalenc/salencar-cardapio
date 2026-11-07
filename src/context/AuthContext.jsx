import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PRODUCTS } from '../data/products';
import { STORE_CONFIG } from '../config/storeConfig';
import { ADMIN_CREDENTIALS } from '../config/adminConfig';
import { dedupeOrders } from '../utils/orders';

const AuthContext = createContext(null);
const KEYS = {
  users: 'salencar_demo_users_v1',
  session: 'salencar_demo_session_v1',
  orders: 'salencar_real_orders_v1',
  demoOrders: 'salencar_demo_orders_v1',
  products: 'salencar_admin_products_v1',
  settings: 'salencar_admin_settings_v1',
  inventory: 'salencar_inventory_v1',
};

export const STOCK_FLAVORS = [
  ['morango-com-alcool', 'Morango'],
  ['maracuja-com-alcool', 'Maracujá'],
  ['limao-com-alcool', 'Limão'],
  ['morango-creme-avela', 'Morango com creme de avelã'],
  ['maracuja-creme-avela', 'Maracujá com creme de avelã'],
  ['limao-creme-avela', 'Limão com creme de avelã'],
].map(([id, name]) => ({ id, name }));
const INITIAL_STOCK = {
  'morango-com-alcool': 15, 'maracuja-com-alcool': 20, 'limao-com-alcool': 10,
  'morango-creme-avela': 8, 'maracuja-creme-avela': 10, 'limao-creme-avela': 12,
};

function createInventory(saved = {}) {
  const flavors = Object.fromEntries(STOCK_FLAVORS.map(({ id }) => [id, {
    quantity: Math.max(0, Number(saved.flavors?.[id]?.quantity ?? INITIAL_STOCK[id])),
    manualAvailable: saved.flavors?.[id]?.manualAvailable !== false,
  }]));
  return { mode: saved.mode === 'manual' ? 'manual' : 'automatic', lowStockLimit: Math.max(0, Number(saved.lowStockLimit ?? 5)), flavors };
}

function itemStockRequirements(item) {
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const baseId = item.baseId || item.base?.id || '';
  const pair = baseId.match(/^dupla-(.+)--(.+)$/);
  if (pair) return [[pair[1], quantity], [pair[2], quantity]];
  if (item.productId === 'combo-2-batidas-alcoolicas' && item.option) {
    const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const names = item.option.replace(/^2x\s*/i, '').split(/\s+\+\s+/).map(normalize);
    const ids = names.map((name) => STOCK_FLAVORS.find((flavor) => normalize(flavor.name) === name)?.id);
    if (ids.length === 2 && ids.every(Boolean)) return ids.map((id) => [id, quantity]);
    if (names.length === 1) {
      const id = STOCK_FLAVORS.find((flavor) => normalize(flavor.name) === names[0])?.id;
      if (id) return [[id, quantity * 2]];
    }
  }
  const id = item.productId;
  return STOCK_FLAVORS.some((flavor) => flavor.id === id) ? [[id, quantity]] : [];
}

function stockNeeds(order) {
  const needs = {};
  for (const item of order.items || []) for (const [id, quantity] of itemStockRequirements(item)) needs[id] = (needs[id] || 0) + quantity;
  return needs;
}

function confirmedStatuses() { return ['confirmed', 'preparing', 'out_for_delivery', 'completed']; }

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {
    console.error(`Não foi possível salvar ${key}:`, error);
  }
}

function createDemoOrders() {
  const now = Date.now();
  const samples = [
    ['Marina Demonstração', 'marina.demo@example.com', '11987654321', 0, 'new', 'morango-com-alcool', 2, 30],
    ['Rafael Exemplo', 'rafael.demo@example.com', '11976543210', 0, 'preparing', 'combo-2-batidas-alcoolicas', 1, 25],
    ['Lívia Exemplo', 'livia.demo@example.com', '11965432109', 1, 'out_for_delivery', 'maracuja-creme-avela', 2, 30],
    ['Caio Demonstração', 'caio.demo@example.com', '', 2, 'completed', 'batida-espanhola', 1, 19.9],
    ['Bia Exemplo', 'bia.demo@example.com', '11954321098', 4, 'completed', 'limao-com-alcool', 3, 45],
    ['Pedro Demonstração', 'pedro.demo@example.com', '11943210987', 8, 'cancelled', 'morango-creme-avela', 1, 15],
    ['Nina Exemplo', 'nina.demo@example.com', '11932109876', 34, 'completed', 'maracuja-com-alcool', 2, 30],
    ['Tomás Demonstração', 'tomas.demo@example.com', '11921098765', 75, 'completed', 'combo-2-batidas-alcoolicas', 1, 25],
  ];

  return samples.map(([customerName, customerEmail, phone, daysAgo, status, productId, quantity, unitPrice], index) => {
    const product = PRODUCTS.find((item) => item.id === productId);
    const createdAt = new Date(now - daysAgo * 86400000 - index * 3600000).toISOString();
    return {
      id: `DEMO-${String(index + 1).padStart(4, '0')}`,
      customerName, customerEmail, phone, createdAt, status,
      items: [{ productId, productName: product?.name || 'Produto de demonstração', quantity, unitPrice, totalPrice: quantity * unitPrice, option: productId === 'combo-2-batidas-alcoolicas' ? 'Morango + Maracujá' : '' }],
      subtotal: quantity * unitPrice,
      deliveryFee: 0,
      total: quantity * unitPrice,
      deliveryType: 'pickup',
      address: '',
      paymentMethod: 'pix',
      isDemo: true,
    };
  });
}

function readOrSeedDemoOrders() {
  const existing = readStorage(KEYS.demoOrders, null);
  if (Array.isArray(existing)) return existing;
  const initial = createDemoOrders();
  writeStorage(KEYS.demoOrders, initial);
  return initial;
}

function readStoreSettings() {
  const saved = readStorage(KEYS.settings, {}) || {};
  const previousDefaultAddress = 'Rua das Palmeiras, 250 - Centro';
  const pickupAddress = saved.pickupAddress && saved.pickupAddress !== previousDefaultAddress
    ? saved.pickupAddress
    : STORE_CONFIG.pickupAddress;
  const previousDefaultWhatsapp = '5511948648947';
  const whatsappNumber = saved.whatsappNumber && saved.whatsappNumber !== previousDefaultWhatsapp
    ? saved.whatsappNumber
    : STORE_CONFIG.whatsappNumber;
  const previousDefaultWhatsappFormatted = '(11) 94864-8947';
  const whatsappFormatted = saved.whatsappFormatted && saved.whatsappFormatted !== previousDefaultWhatsappFormatted
    ? saved.whatsappFormatted
    : STORE_CONFIG.whatsappFormatted;
  return {
    ...STORE_CONFIG,
    ...saved,
    pickupAddress,
    whatsappNumber,
    whatsappFormatted,
    pix: { ...STORE_CONFIG.pix, ...(saved.pix || {}) },
    status: { ...STORE_CONFIG.status, ...(saved.status || {}) },
  };
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => {
    const saved = readStorage(KEYS.users, []);
    return Array.isArray(saved) ? saved : [];
  });
  const [currentUser, setCurrentUser] = useState(() => readStorage(KEYS.session, null));
  const [orders, setOrders] = useState(() => {
    const saved = readStorage(KEYS.orders, []);
    return dedupeOrders(saved);
  });
  const [demoOrders, setDemoOrders] = useState(readOrSeedDemoOrders);
  const [productSettings, setProductSettings] = useState(() => readStorage(KEYS.products, {}) || {});
  const [inventory, setInventory] = useState(() => createInventory(readStorage(KEYS.inventory, {})));
  const [settings, setSettings] = useState(readStoreSettings);

  useEffect(() => writeStorage(KEYS.users, users), [users]);
  useEffect(() => writeStorage(KEYS.session, currentUser), [currentUser]);
  useEffect(() => writeStorage(KEYS.orders, orders), [orders]);
  useEffect(() => writeStorage(KEYS.demoOrders, demoOrders), [demoOrders]);
  useEffect(() => writeStorage(KEYS.products, productSettings), [productSettings]);
  useEffect(() => writeStorage(KEYS.inventory, inventory), [inventory]);
  useEffect(() => {
    const { deliveryFee, freeDeliveryThreshold, estimatedDeliveryTime, minimumOrder, ...publicSettings } = settings;
    writeStorage(KEYS.settings, publicSettings);
  }, [settings]);

  useEffect(() => {
    const syncOrders = (event) => {
      if (event.key !== KEYS.orders) return;
      try {
        const savedOrders = event.newValue ? JSON.parse(event.newValue) : [];
        if (Array.isArray(savedOrders)) setOrders(dedupeOrders(savedOrders));
      } catch {
        // Ignore malformed values and keep the current in-memory orders.
      }
    };
    window.addEventListener('storage', syncOrders);
    return () => window.removeEventListener('storage', syncOrders);
  }, []);

  const login = useCallback((email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === ADMIN_CREDENTIALS.email) {
      if (password !== ADMIN_CREDENTIALS.password) return { ok: false, error: 'E-mail ou senha incorretos.' };
      const admin = { id: 'salencar-admin', name: 'Administrador', email: ADMIN_CREDENTIALS.email, role: 'admin' };
      setCurrentUser(admin);
      return { ok: true, user: admin };
    }
    const user = users.find((entry) => entry.email.toLowerCase() === normalizedEmail && entry.password === password);
    if (!user) return { ok: false, error: 'E-mail ou senha incorretos.' };
    const session = { id: user.id, name: user.name, email: user.email, phone: user.phone || '', role: 'customer' };
    setCurrentUser(session);
    return { ok: true, user: session };
  }, [users]);

  const register = useCallback(({ name, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === ADMIN_CREDENTIALS.email) return { ok: false, error: 'Este e-mail está reservado para administração.' };
    if (users.some((entry) => entry.email.toLowerCase() === normalizedEmail)) return { ok: false, error: 'Já existe uma conta com este e-mail.' };
    const user = {
      id: `USR-${Date.now().toString(36).toUpperCase()}`,
      name: name.trim(), email: normalizedEmail, password, phone: '', createdAt: new Date().toISOString(),
    };
    setUsers((previous) => [...previous, user]);
    const session = { id: user.id, name: user.name, email: user.email, phone: '', role: 'customer' };
    setCurrentUser(session);
    return { ok: true, user: session };
  }, [users]);

  const logout = useCallback(() => setCurrentUser(null), []);

  const updateCustomerPhone = useCallback((phone) => {
    if (!currentUser || currentUser.role !== 'customer') return;
    setUsers((previous) => previous.map((user) => user.id === currentUser.id ? { ...user, phone } : user));
    setCurrentUser((previous) => previous ? { ...previous, phone } : previous);
  }, [currentUser]);

  const updateCustomerProfile = useCallback((changes) => {
    if (!currentUser || currentUser.role !== 'customer') return { ok: false, error: 'Entre na sua conta para editar os dados.' };
    const email = changes.email?.trim().toLowerCase() || currentUser.email;
    if (email === ADMIN_CREDENTIALS.email) return { ok: false, error: 'Este e-mail é reservado para a administração.' };
    if (users.some((user) => user.id !== currentUser.id && user.email.toLowerCase() === email)) return { ok: false, error: 'Já existe uma conta com este e-mail.' };
    const profile = {
      name: changes.name?.trim() ?? currentUser.name,
      email,
      phone: changes.phone?.trim() ?? currentUser.phone ?? '',
      address: changes.address?.trim() ?? users.find((user) => user.id === currentUser.id)?.address ?? '',
    };
    if (profile.name.length < 2) return { ok: false, error: 'Informe seu nome completo.' };
    setUsers((previous) => previous.map((user) => user.id === currentUser.id ? { ...user, ...profile } : user));
    setCurrentUser((previous) => previous?.id === currentUser.id ? { ...previous, ...profile } : previous);
    return { ok: true, user: profile };
  }, [currentUser, users]);

  const changeCustomerPassword = useCallback((currentPassword, nextPassword) => {
    if (!currentUser || currentUser.role !== 'customer') return { ok: false, error: 'Entre na sua conta para alterar a senha.' };
    const user = users.find((entry) => entry.id === currentUser.id);
    if (!user || user.password !== currentPassword) return { ok: false, error: 'A senha atual está incorreta.' };
    if (String(nextPassword || '').length < 6) return { ok: false, error: 'A nova senha deve ter pelo menos 6 caracteres.' };
    setUsers((previous) => previous.map((entry) => entry.id === currentUser.id ? { ...entry, password: nextPassword } : entry));
    return { ok: true };
  }, [currentUser, users]);

  const recordOrder = useCallback((order) => {
    if (!currentUser || currentUser.role !== 'customer') return null;
    const savedOrder = {
      ...order,
      id: `SAL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      customerId: currentUser.id,
      customerName: order.customerName || currentUser.name,
      customerEmail: currentUser.email,
      createdAt: new Date().toISOString(),
      status: 'new',
      isDemo: false,
    };
    setOrders((previous) => dedupeOrders([savedOrder, ...previous]));
    updateCustomerProfile({ phone: order.phone, address: order.deliveryType === 'delivery' ? order.address : undefined });
    return savedOrder;
  }, [currentUser, updateCustomerProfile]);

  const updateOrderStatus = useCallback((id, status, isDemo = false) => {
    if (isDemo) {
      setDemoOrders((previous) => previous.map((order) => order.id === id ? { ...order, status, updatedAt: new Date().toISOString() } : order));
      return { ok: true };
    }
    const order = orders.find((entry) => entry.id === id);
    if (!order || order.status === status) return { ok: Boolean(order) };
    const needs = stockNeeds(order);
    let nextInventory = inventory;
    const wasConfirmed = confirmedStatuses().includes(order.status);
    const becomesConfirmed = confirmedStatuses().includes(status);
    if (!wasConfirmed && becomesConfirmed && (!order.stockDeducted || order.stockRestored)) {
      const unavailable = Object.entries(needs).find(([flavorId, count]) => (inventory.flavors[flavorId]?.quantity || 0) < count);
      if (unavailable) return { ok: false, error: `Estoque insuficiente para ${STOCK_FLAVORS.find((flavor) => flavor.id === unavailable[0])?.name || unavailable[0]}.` };
      nextInventory = { ...inventory, flavors: { ...inventory.flavors } };
      for (const [flavorId, count] of Object.entries(needs)) nextInventory.flavors[flavorId] = { ...nextInventory.flavors[flavorId], quantity: nextInventory.flavors[flavorId].quantity - count };
    }
    if (status === 'cancelled' && order.stockDeducted && !order.stockRestored) {
      nextInventory = { ...inventory, flavors: { ...inventory.flavors } };
      for (const [flavorId, count] of Object.entries(needs)) nextInventory.flavors[flavorId] = { ...nextInventory.flavors[flavorId], quantity: nextInventory.flavors[flavorId].quantity + count };
    }
    if (nextInventory !== inventory) setInventory(nextInventory);
    setOrders((previous) => previous.map((entry) => entry.id === id ? {
      ...entry, status, updatedAt: new Date().toISOString(),
      stockDeducted: entry.stockDeducted || (!wasConfirmed && becomesConfirmed),
      stockRestored: !wasConfirmed && becomesConfirmed
        ? false
        : status === 'cancelled' && entry.stockDeducted ? true : entry.stockRestored,
    } : entry));
    return { ok: true };
  }, [orders, inventory]);

  const updateInventorySettings = useCallback((changes) => {
    setInventory((previous) => createInventory({ ...previous, ...changes, flavors: { ...previous.flavors, ...(changes.flavors || {}) } }));
  }, []);

  const updateFlavorStock = useCallback((flavorId, changes) => {
    setInventory((previous) => createInventory({ ...previous, flavors: { ...previous.flavors, [flavorId]: { ...previous.flavors[flavorId], ...changes } } }));
  }, []);

  const stockAvailability = useCallback((flavorId, quantity = 1) => {
    const flavor = inventory.flavors[flavorId];
    return Boolean(flavor && flavor.quantity >= quantity && (inventory.mode !== 'manual' || flavor.manualAvailable));
  }, [inventory]);

  const canFulfillItems = useCallback((items) => {
    const needs = stockNeeds({ items: (items || []).map((item) => ({
      productId: item.productId || item.product?.id,
      baseId: item.baseId || item.base?.id,
      quantity: item.quantity,
    })) });
    const unavailable = Object.entries(needs).find(([flavorId, count]) => !stockAvailability(flavorId, count));
    return unavailable ? { ok: false, error: `Estoque insuficiente ou sabor indisponível: ${STOCK_FLAVORS.find((flavor) => flavor.id === unavailable[0])?.name || unavailable[0]}.` } : { ok: true };
  }, [stockAvailability]);

  const updateProductSetting = useCallback((productId, changes) => {
    setProductSettings((previous) => ({ ...previous, [productId]: { ...previous[productId], ...changes } }));
  }, []);

  const updateStoreSettings = useCallback((changes) => {
    setSettings((previous) => ({
      ...previous,
      ...changes,
      pix: changes.pix ? { ...previous.pix, ...changes.pix } : previous.pix,
      status: changes.status ? { ...previous.status, ...changes.status } : previous.status,
    }));
  }, []);

  const clearDemoOrders = useCallback(() => setDemoOrders([]), []);

  const value = useMemo(() => ({
    users, currentUser, orders, demoOrders, productSettings, settings, inventory,
    login, register, logout, updateCustomerPhone, recordOrder, updateOrderStatus,
    updateProductSetting, updateStoreSettings, clearDemoOrders, updateInventorySettings, updateFlavorStock, stockAvailability, canFulfillItems, updateCustomerProfile, changeCustomerPassword,
  }), [users, currentUser, orders, demoOrders, productSettings, settings, inventory, login, register, logout, updateCustomerPhone, updateCustomerProfile, changeCustomerPassword, recordOrder, updateOrderStatus, updateProductSetting, updateStoreSettings, clearDemoOrders, updateInventorySettings, updateFlavorStock, stockAvailability, canFulfillItems]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}

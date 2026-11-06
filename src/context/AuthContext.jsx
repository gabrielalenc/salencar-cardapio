import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PRODUCTS } from '../data/products';
import { STORE_CONFIG } from '../config/storeConfig';
import { ADMIN_CREDENTIALS } from '../config/adminConfig';

const AuthContext = createContext(null);
const KEYS = {
  users: 'salencar_demo_users_v1',
  session: 'salencar_demo_session_v1',
  orders: 'salencar_real_orders_v1',
  demoOrders: 'salencar_demo_orders_v1',
  products: 'salencar_admin_products_v1',
  settings: 'salencar_admin_settings_v1',
};

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
  return {
    ...STORE_CONFIG,
    ...saved,
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
    return Array.isArray(saved) ? saved : [];
  });
  const [demoOrders, setDemoOrders] = useState(readOrSeedDemoOrders);
  const [productSettings, setProductSettings] = useState(() => readStorage(KEYS.products, {}) || {});
  const [settings, setSettings] = useState(readStoreSettings);

  useEffect(() => writeStorage(KEYS.users, users), [users]);
  useEffect(() => writeStorage(KEYS.session, currentUser), [currentUser]);
  useEffect(() => writeStorage(KEYS.orders, orders), [orders]);
  useEffect(() => writeStorage(KEYS.demoOrders, demoOrders), [demoOrders]);
  useEffect(() => writeStorage(KEYS.products, productSettings), [productSettings]);
  useEffect(() => {
    const { deliveryFee, freeDeliveryThreshold, estimatedDeliveryTime, minimumOrder, ...publicSettings } = settings;
    writeStorage(KEYS.settings, publicSettings);
  }, [settings]);

  const login = useCallback((email, password, role = 'customer') => {
    const normalizedEmail = email.trim().toLowerCase();
    if (role === 'admin') {
      if (normalizedEmail !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
        return { ok: false, error: 'E-mail ou senha administrativa incorretos.' };
      }
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

  const recordOrder = useCallback((order) => {
    if (!currentUser || currentUser.role !== 'customer') return null;
    const savedOrder = {
      ...order,
      id: `SAL-${Date.now().toString(36).toUpperCase()}`,
      customerId: currentUser.id,
      customerName: order.customerName || currentUser.name,
      customerEmail: currentUser.email,
      createdAt: new Date().toISOString(),
      status: 'new',
      isDemo: false,
    };
    setOrders((previous) => [savedOrder, ...previous]);
    if (order.phone) updateCustomerPhone(order.phone);
    return savedOrder;
  }, [currentUser, updateCustomerPhone]);

  const updateOrderStatus = useCallback((id, status, isDemo = false) => {
    const update = (previous) => previous.map((order) => order.id === id ? { ...order, status, updatedAt: new Date().toISOString() } : order);
    if (isDemo) setDemoOrders(update);
    else setOrders(update);
  }, []);

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
    users, currentUser, orders, demoOrders, productSettings, settings,
    login, register, logout, updateCustomerPhone, recordOrder, updateOrderStatus,
    updateProductSetting, updateStoreSettings, clearDemoOrders,
  }), [users, currentUser, orders, demoOrders, productSettings, settings, login, register, logout, updateCustomerPhone, recordOrder, updateOrderStatus, updateProductSetting, updateStoreSettings, clearDemoOrders]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}

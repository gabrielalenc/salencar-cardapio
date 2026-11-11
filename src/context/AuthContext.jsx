import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STORE_CONFIG } from '../config/storeConfig';
import { dedupeOrders } from '../utils/orders';
import { getSupabaseConfigError, isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const KEYS = {
  session: 'salencar_demo_session_v1',
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

function readStoreSettings() {
  const saved = readStorage(KEYS.settings, {}) || {};
  const publicSaved = Object.fromEntries(Object.entries(saved).filter(([key]) => !['deliveryFee', 'freeDeliveryThreshold', 'estimatedDeliveryTime', 'minimumOrder'].includes(key)));
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
    ...publicSaved,
    pickupAddress,
    whatsappNumber,
    whatsappFormatted,
    pix: { ...STORE_CONFIG.pix, ...(saved.pix || {}) },
    status: { ...STORE_CONFIG.status, ...(saved.status || {}) },
  };
}

function paymentLabel(method) { return ({ pix: 'Pix', money: 'Dinheiro', credit: 'Cartão de crédito', debit: 'Cartão de débito' })[method] || method || ''; }
function formatAddress(address = {}) {
  if (typeof address === 'string') return address;
  const street = [address.street, address.number].filter(Boolean).join(', ');
  const extra = [address.complement, address.neighborhood, address.city].filter(Boolean).join(', ');
  return [street, extra, address.postal_code ? `CEP ${address.postal_code}` : '', address.reference ? `Ref.: ${address.reference}` : ''].filter(Boolean).join(' — ');
}
function mapOrder(row) {
  return { id: row.order_number, databaseId: row.id, customerId: row.customer_id, customerName: row.customer_name, customerEmail: row.customer_email, phone: row.phone, status: row.status, subtotal: Number(row.subtotal), deliveryFee: Number(row.delivery_fee), deliveryQuote: row.delivery_quote == null ? null : Number(row.delivery_quote), deliveryQuoteAt: row.delivery_quote_at, deliveryQuoteBy: row.delivery_quote_by, deliveryQuoteResponse: row.delivery_quote_response, deliveryQuoteRespondedAt: row.delivery_quote_responded_at, total: Number(row.total), deliveryType: row.delivery_type, address: formatAddress(row.address_snapshot), addressSnapshot: row.address_snapshot, paymentMethod: paymentLabel(row.payment_method), paymentMethodId: row.payment_method, orderNotes: row.order_notes, createdAt: row.created_at, updatedAt: row.updated_at, items: (row.order_items || []).map((item) => ({ productId: item.product_id, productName: item.product_name, productImage: item.product_image, baseId: item.base_id, option: item.option, extras: item.extras || [], quantity: item.quantity, unitPrice: Number(item.unit_price), totalPrice: Number(item.total_price) })) };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false);
  const [users, setUsers] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [paymentPreference, setPaymentPreference] = useState('pix');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [productSettings, setProductSettings] = useState({});
  const [inventory, setInventory] = useState(() => createInventory(readStorage(KEYS.inventory, {})));
  const [settings, setSettings] = useState(readStoreSettings);
  useEffect(() => { try { localStorage.removeItem(KEYS.session); } catch { /* localStorage não é necessário para autenticação */ } }, []);
  useEffect(() => { try { localStorage.removeItem('salencar_demo_orders_v1'); } catch { /* remove pedidos fictícios antigos sem tocar nos pedidos do Supabase */ } }, []);
  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.from('catalog_products').select('product_id,price,active').then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error('Não foi possível carregar o catálogo seguro:', error.code || error.name || 'erro');
        return;
      }
      setProductSettings(Object.fromEntries((data || []).map((product) => [product.product_id, { price: Number(product.price), active: product.active }])));
    });
    return () => { active = false; };
  }, []);
  useEffect(() => writeStorage(KEYS.inventory, inventory), [inventory]);
  useEffect(() => {
    const publicSettings = Object.fromEntries(Object.entries(settings).filter(([key]) => !['deliveryFee', 'freeDeliveryThreshold', 'estimatedDeliveryTime', 'minimumOrder'].includes(key)));
    writeStorage(KEYS.settings, publicSettings);
  }, [settings]);

  const loadAccountData = useCallback(async (authUser) => {
    if (!authUser || !supabase) { setCurrentUser(null); setAddresses([]); setOrders([]); setOrdersLoading(false); setOrdersError(''); setUsers([]); return null; }
    // OAuth can return a valid Auth user even when an older/missing DB trigger
    // failed to create its profile. This idempotent RPC uses auth.uid() server-side.
    const { error: ensureProfileError } = await supabase.rpc('ensure_customer_profile');
    // Existing deployments can still load profiles while the follow-up migration
    // is being applied; a missing profile below remains an actionable error.
    if (ensureProfileError && ensureProfileError.code !== 'PGRST202') throw ensureProfileError;
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile) throw new Error('Não foi possível criar o perfil da conta. Aplique as migrations atuais do Supabase e tente novamente.');
    const user = { id: authUser.id, name: profile.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || '', email: profile.email || authUser.email || '', phone: profile.phone || '', role: profile.role, createdAt: profile.created_at, avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '' };
    setCurrentUser(user);
    setOrdersLoading(true);
    setOrdersError('');
    const [addressResult, preferenceResult, orderResult] = await Promise.all([
      user.role === 'customer' ? supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false }).order('created_at') : Promise.resolve({ data: [], error: null }),
      supabase.from('customer_preferences').select('payment_method').eq('user_id', user.id).maybeSingle(),
      supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
    ]);
    setOrdersLoading(false);
    if (orderResult.error) { setOrders([]); setOrdersError(orderResult.error.message); }
    else setOrders(dedupeOrders((orderResult.data || []).map(mapOrder)));
    for (const result of [addressResult, preferenceResult]) if (result.error) throw result.error;
    setAddresses(addressResult.data || []); setPaymentPreference(preferenceResult.data?.payment_method || 'pix');
    if (user.role === 'admin') {
      const { data, error } = await supabase.from('profiles').select('id,full_name,email,phone,created_at,role').eq('role', 'customer').order('created_at', { ascending: false });
      if (error) throw error;
      setUsers((data || []).map((person) => ({ id: person.id, name: person.full_name, email: person.email, phone: person.phone, createdAt: person.created_at, role: person.role })));
    } else setUsers([]);
    return user;
  }, []);

  const refreshOrders = useCallback(async () => {
    if (!currentUser || !supabase) return;
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const { data, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(dedupeOrders((data || []).map(mapOrder)));
    } catch (error) {
      setOrdersError(error.message || 'Não foi possível carregar os pedidos.');
    } finally {
      setOrdersLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) { setAuthLoading(false); return undefined; }
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) throw error;
      if (data.session && active) await loadAccountData(data.session.user);
    }).catch((error) => console.error('Falha ao recuperar sessão/perfil Supabase:', error?.code || error?.name || 'erro')).finally(() => { if (active) setAuthLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setPasswordRecoveryPending(true);
      if (!session) { setCurrentUser(null); setAddresses([]); setOrders([]); setOrdersLoading(false); setOrdersError(''); setUsers([]); setPasswordRecoveryPending(false); setAuthLoading(false); return; }
      setAuthLoading(true);
      window.setTimeout(() => loadAccountData(session.user).catch((error) => console.error(`Falha ao processar autenticação Supabase (${event}):`, error?.code || error?.name || 'erro')).finally(() => { if (active) setAuthLoading(false); }), 0);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [loadAccountData]);

  useEffect(() => {
    if (!currentUser || !supabase) return undefined;
    const channel = supabase.channel(`salencar-orders-${currentUser.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refreshOrders).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, refreshOrders]);

  const login = useCallback(async (email, password) => {
    if (!supabase) return { ok: false, error: getSupabaseConfigError() };
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { ok: false, error: error.message };
    try { return { ok: true, user: await loadAccountData(data.user) }; } catch (cause) { await supabase.auth.signOut(); return { ok: false, error: cause.message }; }
  }, [loadAccountData]);
  const verifyAdminAuthorization = useCallback(async () => {
    if (!supabase) return { ok: false, error: getSupabaseConfigError() };
    const { data, error } = await supabase.rpc('is_admin');
    if (error) return { ok: false, error: error.message };
    return { ok: data === true };
  }, []);
  const verifyCustomerSession = useCallback(async () => {
    if (!supabase || currentUser?.role !== 'customer') return { ok: false };
    const { data, error } = await supabase.auth.getUser();
    return { ok: !error && data.user?.id === currentUser.id, userId: data.user?.id || null };
  }, [currentUser]);
  const loginAdmin = useCallback(async (email, password) => {
    const result = await login(email, password);
    if (!result.ok) {
      const invalidCredentials = /invalid login credentials|email not confirmed/i.test(result.error || '');
      return { ok: false, error: invalidCredentials ? 'E-mail ou senha incorretos. Confira os dados e tente novamente.' : result.error };
    }
    const authorization = await verifyAdminAuthorization();
    if (!authorization.ok || result.user?.role !== 'admin') {
      await supabase.auth.signOut();
      return { ok: false, error: authorization.error || 'Esta conta não tem permissão para acessar o painel administrativo.' };
    }
    return result;
  }, [login, verifyAdminAuthorization]);
  const register = useCallback(async ({ name, email, password }) => {
    if (!supabase) return { ok: false, error: getSupabaseConfigError() };
    const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin } });
    if (error) return { ok: false, error: error.message };
    if (!data.session) return { ok: true, confirmationRequired: true };
    try { return { ok: true, user: await loadAccountData(data.user) }; } catch (cause) { return { ok: false, error: cause.message }; }
  }, [loadAccountData]);
  const loginWithGoogle = useCallback(async () => {
    if (!supabase) return { ok: false, error: getSupabaseConfigError() };
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, []);
  const resetPassword = useCallback(async (email) => {
    if (!supabase) return { ok: false, error: getSupabaseConfigError() };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: window.location.origin });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, []);
  const changeCustomerPassword = useCallback(async (_current, next) => {
    if (!currentUser || currentUser.role !== 'customer') return { ok: false, error: 'Entre na sua conta para alterar a senha.' };
    if (String(next || '').length < 8) return { ok: false, error: 'A nova senha deve ter pelo menos 8 caracteres.' };
    const { error } = await supabase.auth.updateUser({ password: next });
    if (!error) setPasswordRecoveryPending(false);
    return error ? { ok: false, error: error.message } : { ok: true };
  }, [currentUser]);
  const logout = useCallback(async () => {
    if (!supabase) return { ok: false, error: getSupabaseConfigError() };
    const { error } = await supabase.auth.signOut();
    return error ? { ok: false, error: error.message } : { ok: true };
  }, []);

  const saveAddress = useCallback(async (address) => {
    if (!currentUser || currentUser.role !== 'customer') return { ok: false, error: 'Entre na sua conta para salvar endereços.' };
    const payload = { ...address, user_id: currentUser.id };
    if (payload.is_default) {
      const { error } = await supabase.from('addresses').update({ is_default: false }).eq('user_id', currentUser.id).eq('is_default', true);
      if (error) return { ok: false, error: error.message };
    }
    const query = payload.id ? supabase.from('addresses').update(payload).eq('id', payload.id).eq('user_id', currentUser.id).select().single() : supabase.from('addresses').insert(payload).select().single();
    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };
    setAddresses((previous) => [...previous.filter((item) => item.id !== data.id && (!data.is_default || !item.is_default)), data].sort((a, b) => Number(b.is_default) - Number(a.is_default)));
    return { ok: true, address: data };
  }, [currentUser]);
  const deleteAddress = useCallback(async (id) => {
    const { error } = await supabase.from('addresses').delete().eq('id', id).eq('user_id', currentUser?.id);
    if (error) return { ok: false, error: error.message };
    setAddresses((previous) => previous.filter((address) => address.id !== id)); return { ok: true };
  }, [currentUser?.id]);
  const savePaymentPreference = useCallback(async (method) => {
    if (!currentUser || !['pix', 'money', 'credit', 'debit'].includes(method)) return { ok: false, error: 'Forma de pagamento inválida.' };
    const { error } = await supabase.from('customer_preferences').upsert({ user_id: currentUser.id, payment_method: method });
    if (error) return { ok: false, error: error.message };
    setPaymentPreference(method); return { ok: true };
  }, [currentUser?.id]);
  const updateCustomerProfile = useCallback(async (changes) => {
    if (!currentUser || currentUser.role !== 'customer') return { ok: false, error: 'Entre na sua conta para editar os dados.' };
    const profile = { full_name: changes.name?.trim() ?? currentUser.name, phone: changes.phone?.trim() ?? currentUser.phone ?? '' };
    if (profile.full_name.length < 2) return { ok: false, error: 'Informe seu nome completo.' };
    const { error } = await supabase.from('profiles').update(profile).eq('id', currentUser.id);
    if (error) return { ok: false, error: error.message };
    setCurrentUser((previous) => previous?.id === currentUser.id ? { ...previous, name: profile.full_name, phone: profile.phone } : previous);
    return { ok: true, user: { ...currentUser, name: profile.full_name, phone: profile.phone } };
  }, [currentUser]);

  const recordOrder = useCallback(async (order) => {
    if (!currentUser || currentUser.role !== 'customer') return { ok: false, error: 'Entre em uma conta de cliente para registrar o pedido.' };
    if (!supabase) return { ok: false, error: getSupabaseConfigError() };
    const { data: catalog, error: catalogError } = await supabase.from('catalog_products').select('product_id').limit(1);
    if (catalogError || !catalog?.length) return { ok: false, error: 'O catálogo seguro ainda não está configurado no Supabase. Aplique as migrations atuais antes de receber pedidos.' };
    const paymentId = order.paymentMethodId || ({ Pix: 'pix', Dinheiro: 'money', 'Cartão de crédito': 'credit', 'Cartão de débito': 'debit' })[order.paymentMethod];
    const profileResult = await updateCustomerProfile({ name: order.customerName || currentUser.name, phone: order.phone });
    if (!profileResult.ok) return profileResult;
    if (order.deliveryType === 'delivery' && order.saveAddress) {
      const addressResult = await saveAddress({ ...order.addressSnapshot, recipient_name: order.customerName || currentUser.name, phone: order.phone, is_default: order.makeDefaultAddress || addresses.length === 0 });
      if (!addressResult.ok) return addressResult;
    }
    const preferenceResult = await savePaymentPreference(paymentId);
    if (!preferenceResult.ok) return preferenceResult;
    const { data, error } = await supabase.rpc('create_customer_order', {
      p_order: { customer_name: order.customerName || currentUser.name, phone: order.phone, subtotal: order.subtotal, delivery_fee: order.deliveryFee, total: order.total, delivery_type: order.deliveryType, address_snapshot: order.addressSnapshot || {}, payment_method: paymentId, order_notes: order.orderNotes || '' },
      p_items: order.items.map((item) => ({ product_id: item.productId, product_name: item.productName, product_image: item.productImage || '', base_id: item.baseId || '', option: item.option || '', extras: item.extras || [], quantity: item.quantity, unit_price: item.unitPrice, total_price: item.totalPrice })),
    });
    if (error) return { ok: false, error: error.code === 'P0001' ? error.message : 'Não foi possível registrar o pedido agora. Verifique os dados e tente novamente.' };
    const savedOrder = { ...order, id: data.order_number, databaseId: data.id, customerId: currentUser.id, customerName: order.customerName || currentUser.name, customerEmail: currentUser.email, createdAt: data.created_at, status: data.status, address: formatAddress(order.addressSnapshot), addressSnapshot: order.addressSnapshot || {}, paymentMethodId: paymentId };
    setOrders((previous) => dedupeOrders([savedOrder, ...previous]));
    return { ok: true, order: savedOrder };
  }, [currentUser, updateCustomerProfile, saveAddress, savePaymentPreference, addresses.length]);

  const saveDeliveryQuote = useCallback(async (orderId, deliveryQuote) => {
    if (!currentUser || currentUser.role !== 'admin') return { ok: false, error: 'Somente administradores podem salvar cotações.' };
    const { data, error } = await supabase.rpc('save_delivery_quote', { p_order_id: orderId, p_delivery_quote: deliveryQuote });
    if (error) return { ok: false, error: error.message };
    await refreshOrders();
    return { ok: true, quote: data };
  }, [currentUser?.id, refreshOrders]);

  const respondToDeliveryQuote = useCallback(async (orderId, accept) => {
    if (!currentUser || currentUser.role !== 'customer') return { ok: false, error: 'Entre na conta do cliente que realizou este pedido.' };
    const { error } = await supabase.rpc('respond_to_delivery_quote', { p_order_id: orderId, p_accept: accept });
    if (error) return { ok: false, error: error.message };
    await refreshOrders();
    return { ok: true };
  }, [currentUser?.id, refreshOrders]);

  const updateOrderStatus = useCallback(async (id, status) => {
    const order = orders.find((entry) => entry.id === id);
    if (!order || order.status === status) return { ok: Boolean(order) };
    const wasConfirmed = confirmedStatuses().includes(order.status), becomesConfirmed = confirmedStatuses().includes(status), needs = stockNeeds(order);
    if (!wasConfirmed && becomesConfirmed) {
      const unavailable = Object.entries(needs).find(([flavorId, count]) => (inventory.flavors[flavorId]?.quantity || 0) < count);
      if (unavailable) return { ok: false, error: `Estoque insuficiente para ${STOCK_FLAVORS.find((flavor) => flavor.id === unavailable[0])?.name || unavailable[0]}.` };
    }
    const { error } = await supabase.from('orders').update({ status }).eq('order_number', id);
    if (error) return { ok: false, error: error.message };
    let nextInventory = inventory;
    if (!wasConfirmed && becomesConfirmed) {
      nextInventory = { ...inventory, flavors: { ...inventory.flavors } };
      for (const [flavorId, count] of Object.entries(needs)) nextInventory.flavors[flavorId] = { ...nextInventory.flavors[flavorId], quantity: nextInventory.flavors[flavorId].quantity - count };
    }
    if (status === 'cancelled' && order.stockDeducted && !order.stockRestored) {
      nextInventory = { ...inventory, flavors: { ...inventory.flavors } };
      for (const [flavorId, count] of Object.entries(needs)) nextInventory.flavors[flavorId] = { ...nextInventory.flavors[flavorId], quantity: nextInventory.flavors[flavorId].quantity + count };
    }
    if (nextInventory !== inventory) setInventory(nextInventory);
    setOrders((previous) => previous.map((entry) => entry.id === id ? { ...entry, status, updatedAt: new Date().toISOString(), stockDeducted: entry.stockDeducted || (!wasConfirmed && becomesConfirmed), stockRestored: status === 'cancelled' && entry.stockDeducted ? true : false } : entry));
    return { ok: true };
  }, [orders, inventory]);

  const updateInventorySettings = useCallback((changes) => setInventory((previous) => createInventory({ ...previous, ...changes, flavors: { ...previous.flavors, ...(changes.flavors || {}) } })), []);
  const updateFlavorStock = useCallback((flavorId, changes) => setInventory((previous) => createInventory({ ...previous, flavors: { ...previous.flavors, [flavorId]: { ...previous.flavors[flavorId], ...changes } } })), []);
  const stockAvailability = useCallback((flavorId, quantity = 1) => { const flavor = inventory.flavors[flavorId]; return Boolean(flavor && flavor.quantity >= quantity && (inventory.mode !== 'manual' || flavor.manualAvailable)); }, [inventory]);
  const canFulfillItems = useCallback((items) => {
    const needs = stockNeeds({ items: (items || []).map((item) => ({ productId: item.productId || item.product?.id, baseId: item.baseId || item.base?.id, quantity: item.quantity })) });
    const unavailable = Object.entries(needs).find(([flavorId, count]) => !stockAvailability(flavorId, count));
    return unavailable ? { ok: false, error: `Estoque insuficiente ou sabor indisponível: ${STOCK_FLAVORS.find((flavor) => flavor.id === unavailable[0])?.name || unavailable[0]}.` } : { ok: true };
  }, [stockAvailability]);
  const updateProductSetting = useCallback(async (productId, changes) => {
    if (currentUser?.role !== 'admin' || !supabase) return { ok: false, error: 'Somente um administrador pode alterar o catálogo.' };
    const update = {};
    if (changes.price !== undefined) {
      const price = Number(changes.price);
      if (!Number.isFinite(price) || price < 0 || price > 100000) return { ok: false, error: 'Informe um preço válido.' };
      update.price = price;
    }
    if (changes.active !== undefined) {
      if (typeof changes.active !== 'boolean') return { ok: false, error: 'O status do produto é inválido.' };
      update.active = changes.active;
    }
    if (!Object.keys(update).length) return { ok: true };
    const { data, error } = await supabase.from('catalog_products').update(update).eq('product_id', productId).select('product_id,price,active').maybeSingle();
    if (error || !data) return { ok: false, error: error?.message || 'Produto não encontrado no catálogo.' };
    setProductSettings((previous) => ({ ...previous, [data.product_id]: { price: Number(data.price), active: data.active } }));
    return { ok: true };
  }, [currentUser?.role]);
  const updateStoreSettings = useCallback((changes) => setSettings((previous) => ({ ...previous, ...changes, pix: changes.pix ? { ...previous.pix, ...changes.pix } : previous.pix, status: changes.status ? { ...previous.status, ...changes.status } : previous.status })), []);
  const value = useMemo(() => ({ users, currentUser, authLoading, passwordRecoveryPending, addresses, paymentPreference, orders, ordersLoading, ordersError, refreshOrders, productSettings, settings, inventory, login, loginAdmin, verifyAdminAuthorization, verifyCustomerSession, register, loginWithGoogle, resetPassword, logout, recordOrder, updateOrderStatus, saveDeliveryQuote, respondToDeliveryQuote, updateProductSetting, updateStoreSettings, updateInventorySettings, updateFlavorStock, stockAvailability, canFulfillItems, updateCustomerProfile, changeCustomerPassword, saveAddress, deleteAddress, savePaymentPreference }), [users, currentUser, authLoading, passwordRecoveryPending, addresses, paymentPreference, orders, ordersLoading, ordersError, refreshOrders, productSettings, settings, inventory, login, loginAdmin, verifyAdminAuthorization, verifyCustomerSession, register, loginWithGoogle, resetPassword, logout, recordOrder, updateOrderStatus, saveDeliveryQuote, respondToDeliveryQuote, updateProductSetting, updateStoreSettings, updateInventorySettings, updateFlavorStock, stockAvailability, canFulfillItems, updateCustomerProfile, changeCustomerPassword, saveAddress, deleteAddress, savePaymentPreference]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}

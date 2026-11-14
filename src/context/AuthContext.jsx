import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STORE_CONFIG } from '../config/storeConfig';
import { dedupeOrders } from '../utils/orders';
import { getSupabaseConfigError, isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const SUPABASE_REQUEST_TIMEOUT_MS = 10000;
function withTimeout(request, message, timeoutMs = SUPABASE_REQUEST_TIMEOUT_MS) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([Promise.resolve(request), timeout]).finally(() => clearTimeout(timeoutId));
}
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
  ['batida-espanhola', 'Batida Espanhola'],
].map(([id, name]) => ({ id, name }));

function createInventory(saved = {}) {
  const flavors = Object.fromEntries(STOCK_FLAVORS.map(({ id }) => [id, {
    quantity: Math.max(0, Number(saved.flavors?.[id]?.quantity ?? 0)),
    manualAvailable: saved.flavors?.[id]?.manualAvailable !== false,
  }]));
  return { mode: saved.automaticControl ? 'automatic' : 'manual', lowStockLimit: Math.max(0, Number(saved.lowStockLimit ?? 5)), flavors };
}

const STOCK_ALIASES = { morango: 'morango-com-alcool', maracuja: 'maracuja-com-alcool', limao: 'limao-com-alcool' };
const stockItemId = (id) => STOCK_ALIASES[id] || id;

function itemStockRequirements(item) {
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const baseId = item.baseId || item.base?.id || '';
  const pair = baseId.match(/^dupla-(.+)--(.+)$/);
  if (pair) return [[stockItemId(pair[1]), quantity], [stockItemId(pair[2]), quantity]];
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
  return STOCK_FLAVORS.some((flavor) => flavor.id === id) ? [[stockItemId(id), quantity]] : [];
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
  return { id: row.order_number, databaseId: row.id, customerId: row.customer_id, customerName: row.customer_name, customerEmail: row.customer_email, phone: row.phone, status: row.status, completedAt: row.completed_at || null, subtotal: Number(row.subtotal), deliveryFee: Number(row.delivery_fee), deliveryQuote: row.delivery_quote == null ? null : Number(row.delivery_quote), deliveryQuoteAt: row.delivery_quote_at, deliveryQuoteBy: row.delivery_quote_by, deliveryQuoteResponse: row.delivery_quote_response, deliveryQuoteRespondedAt: row.delivery_quote_responded_at, total: Number(row.total), deliveryType: row.delivery_type, address: formatAddress(row.address_snapshot), addressSnapshot: row.address_snapshot, paymentMethod: paymentLabel(row.payment_method), paymentMethodId: row.payment_method, orderNotes: row.order_notes, createdAt: row.created_at, updatedAt: row.updated_at, items: (row.order_items || []).map((item) => ({ productId: item.product_id, productName: item.product_name, productImage: item.product_image, baseId: item.base_id, option: item.option, extras: item.extras || [], quantity: item.quantity, unitPrice: Number(item.unit_price), totalPrice: Number(item.total_price) })) };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [needsDisplayNameSetup, setNeedsDisplayNameSetup] = useState(false);
  const [displayNameSuggestion, setDisplayNameSuggestion] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false);
  const [users, setUsers] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [paymentPreference, setPaymentPreference] = useState('pix');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState('');
  const [productSettings, setProductSettings] = useState({});
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [costsError, setCostsError] = useState('');
  const [inventory, setInventory] = useState(() => createInventory());
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState('');
  const [publicInventory, setPublicInventory] = useState({});
  const [settings, setSettings] = useState(readStoreSettings);
  useEffect(() => { try { localStorage.removeItem(KEYS.session); } catch { /* localStorage não é necessário para autenticação */ } }, []);
  useEffect(() => { try { localStorage.removeItem('salencar_demo_orders_v1'); } catch { /* remove pedidos fictícios antigos sem tocar nos pedidos do Supabase */ } }, []);
  const refreshCatalog = useCallback(async () => {
    if (!supabase) {
      setCatalogError(getSupabaseConfigError());
      setCatalogLoading(false);
      return { ok: false, error: getSupabaseConfigError() };
    }
    setCatalogLoading(true);
    setCatalogError('');
    setCostsError('');
    try {
      const catalogResult = await withTimeout(
        supabase.from('catalog_products').select('product_id,price,active,available'),
        'A consulta do catálogo excedeu o tempo limite.'
      );
      if (catalogResult.error) throw catalogResult.error;
      let costs = {};
      if (currentUser?.role === 'admin') {
        try {
          const costResult = await withTimeout(supabase.rpc('admin_list_catalog_costs'), 'A consulta dos custos excedeu o tempo limite.');
          if (costResult.error) throw costResult.error;
          costs = Object.fromEntries((costResult.data || []).map((item) => [item.product_id, item.unit_cost == null ? '' : Number(item.unit_cost)]));
        } catch (error) {
          setCostsError('Não foi possível carregar os custos dos produtos. O lucro ficará indisponível até tentar novamente.');
          console.error('Supabase catalog costs load failed:', { message: error.message, code: error.code });
        }
      }
      setProductSettings(Object.fromEntries((catalogResult.data || []).map((product) => [product.product_id, { price: Number(product.price), active: product.active, available: product.available, cost: costs[product.product_id] ?? '' }])));
      return { ok: true };
    } catch (error) {
      setCatalogError('Não foi possível carregar os produtos do Supabase. Verifique a conexão e tente novamente.');
      console.error('Supabase catalog load failed:', { message: error.message, code: error.code });
      return { ok: false, error: error.message };
    } finally {
      setCatalogLoading(false);
    }
  }, [currentUser?.role]);

  useEffect(() => { refreshCatalog(); }, [refreshCatalog]);
  useEffect(() => {
    const publicSettings = Object.fromEntries(Object.entries(settings).filter(([key]) => !['deliveryFee', 'freeDeliveryThreshold', 'estimatedDeliveryTime', 'minimumOrder'].includes(key)));
    writeStorage(KEYS.settings, publicSettings);
  }, [settings]);

  const refreshPublicInventory = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc('get_public_inventory_availability');
    if (error) {
      console.error('Supabase public inventory availability failed:', { code: error.code, message: error.message });
      return;
    }
    setPublicInventory(Object.fromEntries((data || []).map((item) => [item.stock_item_id, item.available === true])));
  }, []);

  const refreshAdminInventory = useCallback(async () => {
    if (currentUser?.role !== 'admin' || !supabase) return { ok: false };
    setInventoryLoading(true);
    setInventoryError('');
    try {
      const [settingsResult, itemsResult] = await Promise.all([
        withTimeout(supabase.from('inventory_settings').select('automatic_control,low_stock_limit').eq('id', 1).maybeSingle(), 'A consulta das configurações de estoque excedeu o tempo limite.'),
        withTimeout(supabase.from('inventory_items').select('stock_item_id,name,quantity,manual_available'), 'A consulta do estoque excedeu o tempo limite.'),
      ]);
      const error = settingsResult.error || itemsResult.error;
      if (error) throw error;
      const flavors = Object.fromEntries((itemsResult.data || []).map((item) => [item.stock_item_id, { quantity: Number(item.quantity), manualAvailable: item.manual_available, name: item.name }]));
      setInventory(createInventory({ automaticControl: settingsResult.data?.automatic_control, lowStockLimit: settingsResult.data?.low_stock_limit, flavors }));
      return { ok: true };
    } catch (error) {
      setInventoryError('Não foi possível carregar o estoque do Supabase. Verifique a migration e tente novamente.');
      console.error('Supabase admin inventory load failed:', { code: error.code, message: error.message });
      return { ok: false, error: error.message };
    } finally {
      setInventoryLoading(false);
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    refreshPublicInventory();
    const timer = window.setInterval(refreshPublicInventory, 30000);
    return () => window.clearInterval(timer);
  }, [refreshPublicInventory]);

  useEffect(() => {
    if (currentUser?.role === 'admin') refreshAdminInventory();
    else setInventory(createInventory());
  }, [currentUser?.id, currentUser?.role, refreshAdminInventory]);

  const refreshCustomers = useCallback(async () => {
    if (currentUser?.role !== 'admin' || !supabase) return { ok: false, error: 'Somente administradores podem consultar clientes.' };
    setCustomersLoading(true);
    setCustomersError('');
    try {
      const result = await withTimeout(
        supabase.from('profiles').select('id,full_name,display_name,email,phone,created_at,role').eq('role', 'customer').order('created_at', { ascending: false }),
        'A consulta de clientes excedeu o tempo limite.'
      );
      if (result.error) throw result.error;
      setUsers((result.data || []).map((person) => ({ id: person.id, name: person.display_name || person.full_name, email: person.email, phone: person.phone, createdAt: person.created_at, role: person.role })));
      return { ok: true };
    } catch (error) {
      setCustomersError('Não foi possível carregar os clientes do Supabase. Verifique a conexão e tente novamente.');
      console.error('Supabase customers load failed:', { code: error.code, message: error.message });
      return { ok: false, error: error.message };
    } finally {
      setCustomersLoading(false);
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role === 'admin') refreshCustomers();
    else { setUsers([]); setCustomersError(''); setCustomersLoading(false); }
  }, [currentUser?.id, currentUser?.role, refreshCustomers]);

  const loadAccountData = useCallback(async (authUser, canCommit = () => true) => {
    if (!authUser || !supabase) {
      if (canCommit()) { setCurrentUser(null); setNeedsDisplayNameSetup(false); setDisplayNameSuggestion(''); setAddresses([]); setOrders([]); setOrdersLoading(false); setOrdersError(''); setUsers([]); }
      return null;
    }
    // OAuth can return a valid Auth user even when an older/missing DB trigger
    // failed to create its profile. This idempotent RPC uses auth.uid() server-side.
    const { error: ensureProfileError } = await withTimeout(supabase.rpc('ensure_customer_profile'), 'A verificação do perfil excedeu o tempo limite.');
    // Existing deployments can still load profiles while the follow-up migration
    // is being applied; a missing profile below remains an actionable error.
    if (ensureProfileError && ensureProfileError.code !== 'PGRST202') throw ensureProfileError;
    const { data: profile, error: profileError } = await withTimeout(supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(), 'A consulta do perfil excedeu o tempo limite.');
    if (profileError) throw profileError;
    if (!profile) throw new Error('Não foi possível criar o perfil da conta. Aplique as migrations atuais do Supabase e tente novamente.');
    const displayName = String(profile.display_name || '').trim();
    const googleSuggestion = String(authUser.user_metadata?.full_name || authUser.user_metadata?.name || '').trim();
    const isGoogleCustomer = profile.role === 'customer' && (authUser.app_metadata?.provider === 'google' || authUser.identities?.some((identity) => identity.provider === 'google'));
    const user = { id: authUser.id, name: displayName || profile.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || authUser.phone || '', displayName, email: profile.email || authUser.email || '', phone: profile.phone || authUser.phone || '', role: profile.role, createdAt: profile.created_at, avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '' };
    if (!canCommit()) return user;
    setCurrentUser(user);
    setNeedsDisplayNameSetup(Boolean(isGoogleCustomer && !displayName));
    setDisplayNameSuggestion(googleSuggestion);
    setAuthError('');
    // A valid session and role are enough to render the protected shell. Orders,
    // preferences and other sections load independently and have their own errors.
    setAuthLoading(false);
    setOrdersLoading(true);
    setOrdersError('');
    const safeQuery = (query, label) => withTimeout(query, label).catch((error) => ({ data: null, error }));
    const [addressResult, preferenceResult, orderResult] = await Promise.all([
      user.role === 'customer' ? safeQuery(supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false }).order('created_at'), 'A consulta de endereços excedeu o tempo limite.') : Promise.resolve({ data: [], error: null }),
      safeQuery(supabase.from('customer_preferences').select('payment_method').eq('user_id', user.id).maybeSingle(), 'A consulta de preferências excedeu o tempo limite.'),
      safeQuery(supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }), 'A consulta de pedidos excedeu o tempo limite.'),
    ]);
    if (!canCommit()) return user;
    if (orderResult.error) {
      setOrders([]);
      setOrdersError('Não foi possível carregar pedidos do Supabase. Verifique a conexão e tente novamente.');
      console.error('Supabase orders load failed:', { code: orderResult.error.code, message: orderResult.error.message });
    } else {
      setOrders(dedupeOrders((orderResult.data || []).map(mapOrder)));
      setOrdersError('');
    }
    setOrdersLoading(false);
    setAddresses(addressResult.data || []);
    setPaymentPreference(preferenceResult.data?.payment_method || 'pix');
    return user;
  }, []);

  const refreshOrders = useCallback(async () => {
    if (!currentUser || !supabase) return;
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const { data, error } = await withTimeout(supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }), 'A consulta de pedidos excedeu o tempo limite.');
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
    let authEventVersion = 0;
    if (!isSupabaseConfigured) { setAuthLoading(false); return undefined; }
    const initialVersion = authEventVersion;
    withTimeout(supabase.auth.getSession(), 'A sessão do Supabase demorou demais para responder.')
      .then(async ({ data, error }) => {
      if (error) throw error;
      // Auth events may arrive while getSession is resolving. The newest event
      // owns the state so an older initial result cannot overwrite it.
      if (!active || initialVersion !== authEventVersion) return;
      setAuthError('');
      if (data.session && active) await loadAccountData(data.session.user, () => active && initialVersion === authEventVersion);
    }).catch((error) => {
      console.error('Falha ao recuperar sessão/perfil Supabase:', error?.code || error?.message || error?.name || 'erro');
      if (active && initialVersion === authEventVersion) setAuthError('Não foi possível verificar sua sessão no Supabase. Tente novamente ou entre pela tela de login.');
    }).finally(() => { if (active && initialVersion === authEventVersion) setAuthLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      // INITIAL_SESSION is covered by getSession above. Processing both caused
      // duplicate profile loads and could expose a temporary logged-out state.
      if (event === 'INITIAL_SESSION') return;
      if (event === 'PASSWORD_RECOVERY') setPasswordRecoveryPending(true);
      const eventVersion = ++authEventVersion;
      if (!session) { setCurrentUser(null); setNeedsDisplayNameSetup(false); setDisplayNameSuggestion(''); setAddresses([]); setOrders([]); setOrdersLoading(false); setOrdersError(''); setUsers([]); setCustomersError(''); setPasswordRecoveryPending(false); setAuthError(''); setAuthLoading(false); return; }
      setAuthError('');
      setAuthLoading(true);
      window.setTimeout(() => loadAccountData(session.user, () => active && eventVersion === authEventVersion).catch((error) => {
        console.error(`Falha ao processar autenticação Supabase (${event}):`, error?.code || error?.name || 'erro');
        if (active && eventVersion === authEventVersion) setAuthError('Não foi possível carregar o perfil da sessão. Tente entrar novamente.');
      }).finally(() => { if (active && eventVersion === authEventVersion) setAuthLoading(false); }), 0);
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
    let response;
    try { response = await withTimeout(supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }), 'A autenticação excedeu o tempo limite. Confira a conexão e tente novamente.'); }
    catch (error) { return { ok: false, error: error.message }; }
    const { data, error } = response;
    if (error) return { ok: false, error: error.message };
    try { return { ok: true, user: await loadAccountData(data.user) }; } catch (cause) { await supabase.auth.signOut(); return { ok: false, error: cause.message }; }
  }, [loadAccountData]);
  const verifyAdminAuthorization = useCallback(async () => {
    if (!supabase) return { ok: false, error: getSupabaseConfigError() };
    let result;
    try { result = await withTimeout(supabase.rpc('is_admin'), 'A verificação administrativa excedeu o tempo limite.'); }
    catch (error) { return { ok: false, error: error.message }; }
    const { data, error } = result;
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
    try {
      const { data, error } = await withTimeout(supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: name.trim() } },
      }), 'O cadastro excedeu o tempo limite. Tente novamente.');
      if (error) return { ok: false, error: error.message };
      if (data.session) {
        await supabase.auth.signOut();
        return { ok: false, error: 'A confirmação por e-mail está desativada no Supabase. Ative-a para exigir o código OTP antes do acesso.' };
      }
      return { ok: true, confirmationRequired: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);
  const verifyEmailCode = useCallback(async (email, token) => {
    if (!supabase) return { ok: false, error: getSupabaseConfigError() };
    try {
      const { data, error } = await withTimeout(supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: String(token).trim(), type: 'signup' }), 'A confirmação do código de e-mail excedeu o tempo limite.');
      if (error) return { ok: false, error: error.message };
      if (!data.user || !data.session) return { ok: false, error: 'O código foi aceito, mas a sessão não foi iniciada. Solicite uma nova confirmação.' };
      return { ok: true, user: await loadAccountData(data.user) };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, [loadAccountData]);
  const resendSignupCode = useCallback(async (email) => {
    if (!supabase) return { ok: false, error: getSupabaseConfigError() };
    try {
      const { error } = await withTimeout(supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() }), 'O reenvio do código excedeu o tempo limite.');
      return error ? { ok: false, error: error.message } : { ok: true };
    } catch (error) { return { ok: false, error: error.message }; }
  }, []);
  const resetPassword = useCallback(async (email) => {
    if (!supabase) return { ok: false, error: getSupabaseConfigError() };
    try {
      const { error } = await withTimeout(supabase.auth.resetPasswordForEmail(email.trim().toLowerCase()), 'O envio do código de recuperação excedeu o tempo limite.');
      return error ? { ok: false, error: error.message } : { ok: true };
    } catch (error) { return { ok: false, error: error.message }; }
  }, []);
  const verifyRecoveryCode = useCallback(async (email, token) => {
    if (!supabase) return { ok: false, error: getSupabaseConfigError() };
    try {
      const { data, error } = await withTimeout(supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: String(token).trim(), type: 'recovery' }), 'A validação do código de recuperação excedeu o tempo limite.');
      if (error) return { ok: false, error: error.message };
      if (!data.user || !data.session) return { ok: false, error: 'O código foi aceito, mas a sessão de recuperação não foi iniciada.' };
      return { ok: true, user: await loadAccountData(data.user) };
    } catch (error) { return { ok: false, error: error.message }; }
  }, [loadAccountData]);
  const updatePassword = useCallback(async (password) => {
    if (!supabase || !currentUser) return { ok: false, error: 'Valide sua identidade antes de alterar a senha.' };
    if (String(password || '').length < 8) return { ok: false, error: 'A senha deve ter pelo menos 8 caracteres.' };
    try {
      const { error } = await withTimeout(supabase.auth.updateUser({ password }), 'A atualização da senha excedeu o tempo limite.');
      if (!error) setPasswordRecoveryPending(false);
      return error ? { ok: false, error: error.message } : { ok: true };
    } catch (error) { return { ok: false, error: error.message }; }
  }, [currentUser]);
  const loginWithGoogle = useCallback(async () => {
    if (!supabase) return { ok: false, error: getSupabaseConfigError() };
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, []);
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
    const displayName = String(changes.name ?? currentUser.displayName ?? currentUser.name ?? '').trim();
    const profile = { display_name: displayName, full_name: displayName, phone: changes.phone?.trim() ?? currentUser.phone ?? '' };
    if (!displayName) return { ok: false, error: 'Informe como devemos chamar você.' };
    if (displayName.length > 80) return { ok: false, error: 'O nome deve ter no máximo 80 caracteres.' };
    const { error } = await supabase.from('profiles').update(profile).eq('id', currentUser.id);
    if (error) {
      console.error('Supabase customer profile update failed:', { code: error.code, message: error.message });
      const migrationMissing = ['42703', 'PGRST204'].includes(error.code);
      return { ok: false, error: migrationMissing ? 'O banco precisa da migration de nome de exibição. Aplique 20261113130000_customer_display_name.sql e tente novamente.' : 'Não foi possível salvar seu nome. Confira sua conexão e tente novamente.' };
    }
    const updatedUser = { ...currentUser, name: displayName, displayName, phone: profile.phone };
    setCurrentUser((previous) => previous?.id === currentUser.id ? updatedUser : previous);
    setNeedsDisplayNameSetup(false);
    setDisplayNameSuggestion('');
    return { ok: true, user: updatedUser };
  }, [currentUser]);

  const recordOrder = useCallback(async (order) => {
    if (!currentUser || currentUser.role !== 'customer') return { ok: false, error: 'Entre em uma conta de cliente para registrar o pedido.' };
    if (needsDisplayNameSetup) return { ok: false, error: 'Confirme seu nome de exibição para continuar com o pedido.' };
    if (!supabase) return { ok: false, error: getSupabaseConfigError() };
    const { data: catalog, error: catalogError } = await supabase.from('catalog_products').select('product_id').limit(1);
    if (catalogError) {
      console.error('Supabase catalog preflight failed:', { code: catalogError.code, message: catalogError.message, status: catalogError.status });
      if (['42P01', 'PGRST205', 'PGRST204'].includes(catalogError.code)) {
        return { ok: false, error: 'O cat\u00e1logo seguro ainda n\u00e3o est\u00e1 dispon\u00edvel. A loja precisa aplicar a migration mais recente do Supabase.' };
      }
      return { ok: false, error: 'N\u00e3o foi poss\u00edvel verificar o cat\u00e1logo agora. Tente novamente em instantes.' };
    }
    if (!catalog?.length) {
      console.error('Supabase catalog preflight returned no rows.');
      return { ok: false, error: 'O cat\u00e1logo da loja est\u00e1 vazio. A loja precisa revisar a configura\u00e7\u00e3o do card\u00e1pio no Supabase.' };
    }
    const paymentId = order.paymentMethodId || ({ Pix: 'pix', Dinheiro: 'money', 'Cartão de crédito': 'credit', 'Cartão de débito': 'debit' })[order.paymentMethod];
    const customerName = String(currentUser.displayName || currentUser.name || '').trim();
    if (!customerName) return { ok: false, error: 'Salve seu nome de exibição antes de finalizar o pedido.' };
    const profileResult = await updateCustomerProfile({ name: customerName, phone: order.phone });
    if (!profileResult.ok) return profileResult;
    if (order.deliveryType === 'delivery' && order.saveAddress) {
      const addressResult = await saveAddress({ ...order.addressSnapshot, recipient_name: order.customerName || currentUser.name, phone: order.phone, is_default: order.makeDefaultAddress || addresses.length === 0 });
      if (!addressResult.ok) return addressResult;
    }
    const preferenceResult = await savePaymentPreference(paymentId);
    if (!preferenceResult.ok) return preferenceResult;
    const { data, error } = await supabase.rpc('create_customer_order_idempotent', {
      p_order: { customer_name: customerName, phone: order.phone, subtotal: order.subtotal, delivery_fee: order.deliveryFee, total: order.total, delivery_type: order.deliveryType, address_snapshot: order.addressSnapshot || {}, payment_method: paymentId, order_notes: order.orderNotes || '' },
      p_items: order.items.map((item) => ({ product_id: item.productId, product_name: item.productName, product_image: item.productImage || '', base_id: item.baseId || '', option: item.option || '', extras: item.extras || [], quantity: item.quantity, unit_price: item.unitPrice, total_price: item.totalPrice })),
      p_idempotency_key: order.idempotencyKey,
    });
    if (error) {
      console.error('Supabase create_customer_order failed:', { code: error.code, message: error.message, status: error.status });
      const migrationMissing = ['PGRST202', '42883', '42P01', 'PGRST205'].includes(error.code);
      return {
        ok: false,
        error: migrationMissing
          ? 'O banco ainda não tem as migrations de catálogo e pedidos necessárias. Aplique as migrations pendentes no Supabase e tente novamente.'
          : ['P0001', '22023', '23514'].includes(error.code)
          ? error.message
          : 'N\u00e3o foi poss\u00edvel registrar o pedido agora. Confira sua conex\u00e3o e tente novamente.',
      };
    }
    const savedOrder = { ...order, id: data.order_number, databaseId: data.id, customerId: currentUser.id, customerName: data.customer_name || customerName, customerEmail: currentUser.email, createdAt: data.created_at, status: data.status, address: formatAddress(order.addressSnapshot), addressSnapshot: order.addressSnapshot || {}, paymentMethodId: paymentId };
    setOrders((previous) => dedupeOrders([savedOrder, ...previous]));
    return { ok: true, order: savedOrder };
  }, [currentUser, needsDisplayNameSetup, updateCustomerProfile, saveAddress, savePaymentPreference, addresses.length]);

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
    if (currentUser?.role !== 'admin' || !supabase) return { ok: false, error: 'Somente administradores podem atualizar pedidos.' };
    const { error } = await supabase.rpc('admin_update_order_status', { p_order_id: order.databaseId, p_status: status });
    if (error) {
      console.error('Supabase admin_update_order_status failed:', { code: error.code, message: error.message });
      return { ok: false, error: error.code === 'P0001' ? error.message : 'Não foi possível atualizar o pedido.' };
    }
    await Promise.all([refreshOrders(), refreshAdminInventory(), refreshPublicInventory()]);
    return { ok: true };
  }, [currentUser?.role, orders, refreshOrders, refreshAdminInventory, refreshPublicInventory]);

  const updateInventorySettings = useCallback(async (changes) => {
    if (currentUser?.role !== 'admin' || !supabase) return { ok: false, error: 'Somente administradores podem alterar o estoque.' };
    const automaticControl = changes.mode === undefined ? inventory.mode === 'automatic' : changes.mode === 'automatic';
    const lowStockLimit = Number(changes.lowStockLimit ?? inventory.lowStockLimit);
    if (!Number.isInteger(lowStockLimit) || lowStockLimit < 0) return { ok: false, error: 'Informe um limite de estoque válido.' };
    const { error } = await supabase.rpc('admin_set_inventory_settings', { p_automatic_control: automaticControl, p_low_stock_limit: lowStockLimit });
    if (error) {
      console.error('Supabase admin_set_inventory_settings failed:', { code: error.code, message: error.message });
      return { ok: false, error: 'Não foi possível salvar as configurações de estoque.' };
    }
    await Promise.all([refreshAdminInventory(), refreshPublicInventory()]);
    return { ok: true };
  }, [currentUser?.role, inventory.mode, inventory.lowStockLimit, refreshAdminInventory, refreshPublicInventory]);

  const updateFlavorStock = useCallback(async (flavorId, changes) => {
    if (currentUser?.role !== 'admin' || !supabase) return { ok: false, error: 'Somente administradores podem alterar o estoque.' };
    const item = inventory.flavors[flavorId];
    const quantity = Number(changes.quantity ?? item?.quantity);
    const manualAvailable = changes.manualAvailable ?? item?.manualAvailable ?? true;
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1000000) return { ok: false, error: 'Informe uma quantidade inteira válida.' };
    const { error } = await supabase.rpc('admin_set_inventory_item', { p_stock_item_id: stockItemId(flavorId), p_quantity: quantity, p_manual_available: manualAvailable });
    if (error) {
      console.error('Supabase admin_set_inventory_item failed:', { code: error.code, message: error.message });
      return { ok: false, error: 'Não foi possível salvar este item do estoque.' };
    }
    await Promise.all([refreshAdminInventory(), refreshPublicInventory()]);
    return { ok: true };
  }, [currentUser?.role, inventory.flavors, refreshAdminInventory, refreshPublicInventory]);

  const stockAvailability = useCallback((flavorId) => publicInventory[stockItemId(flavorId)] !== false, [publicInventory]);
  const canFulfillItems = useCallback((items) => {
    const needs = stockNeeds({ items: (items || []).map((item) => ({ productId: item.productId || item.product?.id, baseId: item.baseId || item.base?.id, quantity: item.quantity })) });
    const unavailable = Object.keys(needs).find((flavorId) => !stockAvailability(flavorId));
    return unavailable ? { ok: false, error: `Estoque insuficiente ou sabor indisponível: ${STOCK_FLAVORS.find((flavor) => flavor.id === unavailable)?.name || unavailable}.` } : { ok: true };
  }, [stockAvailability]);
const updateProductSetting = useCallback(async (productId, changes) => {
    if (currentUser?.role !== 'admin' || !supabase) return { ok: false, error: 'Somente um administrador pode alterar o catálogo.' };
    const update = {};
    if (changes.price !== undefined) {
      const price = Number(changes.price);
      if (!Number.isFinite(price) || price < 0 || price > 100000) return { ok: false, error: 'Informe um preço válido.' };
      update.price = price;
    }
    if (changes.active !== undefined) update.active = Boolean(changes.active);
    if (changes.available !== undefined) update.available = Boolean(changes.available);
    if (changes.cost !== undefined) {
      const cost = changes.cost === '' || changes.cost === null ? null : Number(changes.cost);
      if (cost !== null && (!Number.isFinite(cost) || cost < 0 || cost > 100000)) return { ok: false, error: 'Informe um custo válido.' };
      update.unit_cost = cost;
    }
    if (!Object.keys(update).length) return { ok: true };
    const { data, error } = await supabase.rpc('admin_update_catalog_product', { p_product_id: productId, p_changes: update });
    if (error || !data) {
      console.error('Supabase admin catalog product update failed:', { code: error?.code, message: error?.message });
      return { ok: false, error: error?.code === 'P0001' ? error.message : 'Não foi possível salvar o produto.' };
    }
    setProductSettings((previous) => ({ ...previous, [data.product_id]: { price: Number(data.price), active: data.active, available: data.available, cost: data.unit_cost == null ? '' : Number(data.unit_cost) } }));
    return { ok: true };
  }, [currentUser?.role]);
const updateStoreSettings = useCallback((changes) => setSettings((previous) => ({ ...previous, ...changes, pix: changes.pix ? { ...previous.pix, ...changes.pix } : previous.pix, status: changes.status ? { ...previous.status, ...changes.status } : previous.status })), []);
  const value = useMemo(() => ({ users, currentUser, needsDisplayNameSetup, displayNameSuggestion, authLoading, authError, passwordRecoveryPending, addresses, paymentPreference, orders, ordersLoading, ordersError, refreshOrders, customersLoading, customersError, refreshCustomers, productSettings, catalogLoading, catalogError, costsError, refreshCatalog, settings, inventory, inventoryLoading, inventoryError, refreshAdminInventory, login, loginAdmin, verifyAdminAuthorization, verifyCustomerSession, register, verifyEmailCode, resendSignupCode, resetPassword, verifyRecoveryCode, updatePassword, loginWithGoogle, logout, recordOrder, updateOrderStatus, saveDeliveryQuote, respondToDeliveryQuote, updateProductSetting, updateStoreSettings, updateInventorySettings, updateFlavorStock, stockAvailability, canFulfillItems, updateCustomerProfile, saveAddress, deleteAddress, savePaymentPreference }), [users, currentUser, needsDisplayNameSetup, displayNameSuggestion, authLoading, authError, passwordRecoveryPending, addresses, paymentPreference, orders, ordersLoading, ordersError, refreshOrders, customersLoading, customersError, refreshCustomers, productSettings, catalogLoading, catalogError, costsError, refreshCatalog, settings, inventory, inventoryLoading, inventoryError, refreshAdminInventory, login, loginAdmin, verifyAdminAuthorization, verifyCustomerSession, register, verifyEmailCode, resendSignupCode, resetPassword, verifyRecoveryCode, updatePassword, loginWithGoogle, logout, recordOrder, updateOrderStatus, saveDeliveryQuote, respondToDeliveryQuote, updateProductSetting, updateStoreSettings, updateInventorySettings, updateFlavorStock, stockAvailability, canFulfillItems, updateCustomerProfile, saveAddress, deleteAddress, savePaymentPreference]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}

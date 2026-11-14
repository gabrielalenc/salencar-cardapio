import React, { lazy, Suspense, useState, useMemo, useRef, useEffect, useCallback } from 'react';
import AOS from 'aos';
import { CartProvider, useCart } from './context/CartContext';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryNav } from './components/CategoryNav';
import { ProductCard } from './components/ProductCard';
import { LocationContactSection } from './components/LocationContactSection';
const ProductModal = lazy(() => import('./components/ProductModal').then((module) => ({ default: module.ProductModal })));
const CartDrawer = lazy(() => import('./components/CartDrawer').then((module) => ({ default: module.CartDrawer })));
const CheckoutModal = lazy(() => import('./components/CheckoutModal').then((module) => ({ default: module.CheckoutModal })));
const OrderSuccessModal = lazy(() => import('./components/OrderSuccessModal').then((module) => ({ default: module.OrderSuccessModal })));
import { MobileFloatingCart } from './components/MobileFloatingCart';
import { Footer } from './components/Footer';
import { PRODUCTS, CATEGORIES } from './data/products';
import { Search, X } from 'lucide-react';
import { AnimatedText } from './components/AnimatedText';
import { AuthProvider, useAuth } from './context/AuthContext';
const AccountModal = lazy(() => import('./components/AccountModal').then((module) => ({ default: module.AccountModal })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then((module) => ({ default: module.AdminPanel })));
const AdminLogin = lazy(() => import('./components/AdminLogin').then((module) => ({ default: module.AdminLogin })));
const OrderTrackingModal = lazy(() => import('./components/OrderTrackingModal').then((module) => ({ default: module.OrderTrackingModal })));
import { NotificationProvider, useNotifications } from './components/Notifications';
import { createPurchaseIntent, createSelectionIntent, hasVerifiedCustomerSession, PENDING_PURCHASE_KEY, PENDING_SELECTION_KEY, requiresCustomerAccount } from './utils/purchaseAccess';
import { StartupSplash } from './components/StartupSplash';

let aosInitialized = false;
const STARTUP_SPLASH_MAX_MS = 2900;

class AdminPanelErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Admin panel render failed:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fbf8f2] px-4 text-center"><section role="alert" className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-sm"><h1 className="text-lg font-bold text-stone-900">O painel encontrou um erro</h1><p className="mt-2 text-sm text-stone-600">Atualize o painel para tentar carregar novamente. Sua sessão administrativa continua protegida.</p><div className="mt-5 flex justify-center gap-2"><button type="button" onClick={() => this.setState({ hasError: false })} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white">Tentar novamente</button><button type="button" onClick={this.props.onClose} className="min-h-11 rounded-xl border border-stone-200 px-4 text-sm font-semibold text-stone-700">Voltar ao site</button></div></section></main>;
  }
}

function AdminAccessRoute({ path, navigate }) {
  const { currentUser, authLoading, authError, verifyAdminAuthorization } = useAuth();
  const [accessState, setAccessState] = useState('checking');
  const [accessError, setAccessError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    if (authLoading) { setAccessState('checking'); return () => { active = false; }; }
    if (!currentUser || currentUser.role !== 'admin') {
      setAccessState('denied');
      if (path === '/admin') navigate('/admin/login', { replace: true });
      return () => { active = false; };
    }

    setAccessState('checking');
    setAccessError('');
    verifyAdminAuthorization().then((result) => {
      if (!active) return;
      if (result.error) {
        setAccessError(result.error);
        setAccessState('error');
        return;
      }
      if (result.ok) {
        setAccessState('authorized');
        if (path === '/admin/login') navigate('/admin', { replace: true });
      } else {
        setAccessState('denied');
        if (path === '/admin') navigate('/admin/login', { replace: true });
      }
    }).catch((error) => {
      if (!active) return;
      setAccessError(error?.message || 'Não foi possível verificar as permissões administrativas.');
      setAccessState('error');
    });
    return () => { active = false; };
  }, [path, currentUser?.id, currentUser?.role, authLoading, retryCount, verifyAdminAuthorization, navigate]);

  if (authLoading || accessState === 'checking') return <main className="flex min-h-screen items-center justify-center bg-[#fbf8f2] px-4 text-sm font-medium text-stone-500"><span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-primary" />Verificando acesso seguro…</main>;
  if (accessState === 'error') return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fbf8f2] px-4 text-center"><section role="alert" className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-sm"><h1 className="text-lg font-bold text-stone-900">Não foi possível verificar o acesso</h1><p className="mt-2 text-sm text-stone-600">{authError || accessError}</p><div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row"><button type="button" onClick={() => setRetryCount((count) => count + 1)} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white">Tentar novamente</button><button type="button" onClick={() => navigate('/admin/login', { replace: true })} className="min-h-11 rounded-xl border border-stone-200 px-4 text-sm font-semibold text-stone-700">Ir para o login</button></div></section></main>;
  if (path === '/admin' && accessState === 'authorized') return <AdminPanelErrorBoundary onClose={() => navigate('/')}><Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#fbf8f2] px-4 text-sm text-stone-500"><span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-primary" />Carregando painel…</main>}><AdminPanel onClose={() => navigate('/')} /></Suspense></AdminPanelErrorBoundary>;
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#fbf8f2] px-4 text-sm text-stone-500">Carregando acesso…</main>}><AdminLogin onBack={() => navigate('/')} onSuccess={() => navigate('/admin')} /></Suspense>;
}

function DeliveryApp() {
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSuccessData, setOrderSuccessData] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMode, setAccountMode] = useState('login');
  const [accountInitialView, setAccountInitialView] = useState('account');
  const [pendingSelection, setPendingSelection] = useState(null);
  const [pathname, setPathname] = useState(() => window.location.pathname.replace(/\/+$/, '') || '/');
  const [trackingOpen, setTrackingOpen] = useState(false);
  const { selectedProduct, isCartOpen, isCheckoutOpen, openProductDetails, closeProductDetails, addToCart, openCheckout, cartOwnerId } = useCart();
  const { currentUser, authLoading, passwordRecoveryPending, productSettings, inventory, stockAvailability, verifyCustomerSession } = useAuth();
  const { notify } = useNotifications();
  const menuSectionRef = useRef(null);

  const navigate = useCallback((path, { replace = false } = {}) => {
    if (replace) window.history.replaceState({}, '', path);
    else window.history.pushState({}, '', path);
    setPathname(path);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const openAdminPanel = useCallback(() => navigate('/admin'), [navigate]);
  const closeAccountModal = useCallback(() => setAccountOpen(false), []);
  const openAccountFromHeader = useCallback(() => {
    if (authLoading) return;
    if (currentUser?.role === 'admin') { navigate('/admin'); return; }
    setAccountMode(currentUser?.role === 'customer' ? 'profile' : 'login');
    setAccountInitialView('account');
    setAccountOpen(true);
  }, [authLoading, currentUser?.role, navigate]);
  const openOrdersFromHeader = useCallback(() => {
    if (authLoading || currentUser?.role !== 'customer') return;
    setAccountMode('profile');
    setAccountInitialView('history');
    setAccountOpen(true);
  }, [authLoading, currentUser?.role]);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname.replace(/\/+$/, '') || '/');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!passwordRecoveryPending) return;
    setAccountMode('password-reset');
    setAccountOpen(true);
  }, [passwordRecoveryPending]);

  const activeProducts = useMemo(() => PRODUCTS
    .filter((product) => productSettings[product.id]?.active !== false)
    .map((product) => ({
      ...product,
      price: productSettings[product.id]?.price !== undefined && Number.isFinite(Number(productSettings[product.id].price))
        ? Number(productSettings[product.id].price)
        : product.price,
      available: productSettings[product.id]?.available !== false,
      ...(product.id === 'combo-2-batidas-alcoolicas' ? {
        stockAvailability: (id, quantity = 1) => stockAvailability(id, quantity),
        available: productSettings[product.id]?.available !== false && product.bases.some((pair) => {
          const ids = pair.id.replace('dupla-', '').split('--');
          return ids.every((id) => stockAvailability(id));
        }),
      } : product.id in inventory.flavors ? { available: productSettings[product.id]?.available !== false && stockAvailability(product.id) } : {}),
    })), [productSettings, inventory, stockAvailability]);

  const openProductSelection = useCallback(async (product) => {
    if (!product.pairOptions?.length) {
      openProductDetails(product);
      return true;
    }
    if (!authLoading) {
      try {
        const session = await verifyCustomerSession();
        if (hasVerifiedCustomerSession(currentUser, session)) {
          openProductDetails(product);
          return true;
        }
      } catch { /* an invalid or expired session must go through authentication */ }
    }
    const intent = createSelectionIntent(product);
    setPendingSelection(intent);
    try { sessionStorage.setItem(PENDING_SELECTION_KEY, JSON.stringify(intent)); } catch { /* retain the selection in memory */ }
    setAccountMode('login');
    setAccountOpen(true);
    return false;
  }, [authLoading, currentUser?.id, currentUser?.role, verifyCustomerSession, openProductDetails]);

  useEffect(() => {
    if (authLoading) return undefined;
    let active = true;
    const resumeSelection = async () => {
      let intent = pendingSelection;
      if (!intent) {
        try {
          const serialized = sessionStorage.getItem(PENDING_SELECTION_KEY);
          if (!serialized) return;
          intent = JSON.parse(serialized);
          setPendingSelection(intent);
          return;
        } catch {
          try { sessionStorage.removeItem(PENDING_SELECTION_KEY); } catch { /* storage may be disabled */ }
          return;
        }
      }
      if (currentUser?.role !== 'customer') {
        setAccountMode('login');
        setAccountOpen(true);
        return;
      }
      if (typeof intent.productId !== 'string') {
        setPendingSelection(null);
        try { sessionStorage.removeItem(PENDING_SELECTION_KEY); } catch { /* storage may be disabled */ }
        return;
      }
      const product = activeProducts.find((item) => item.id === intent.productId);
      if (!product) {
        setPendingSelection(null);
        try { sessionStorage.removeItem(PENDING_SELECTION_KEY); } catch { /* storage may be disabled */ }
        notify({ type: 'error', title: 'Produto nao encontrado', message: 'Selecione outro produto no cardapio.' });
        return;
      }
      let session;
      try { session = await verifyCustomerSession(); } catch { session = { ok: false }; }
      if (!active) return;
      if (!hasVerifiedCustomerSession(currentUser, session)) {
        setAccountMode('login');
        setAccountOpen(true);
        return;
      }
      setPendingSelection(null);
      try { sessionStorage.removeItem(PENDING_SELECTION_KEY); } catch { /* storage may be disabled */ }
      setAccountOpen(false);
      openProductDetails(product);
    };
    resumeSelection();
    return () => { active = false; };
  }, [authLoading, currentUser?.id, currentUser?.role, pendingSelection, activeProducts, verifyCustomerSession, openProductDetails, notify]);

  useEffect(() => {
    if (!selectedProduct?.pairOptions?.length || authLoading) return undefined;
    let active = true;
    const revalidateOpenSelection = async () => {
      let session;
      try { session = await verifyCustomerSession(); } catch { session = { ok: false }; }
      if (!active || hasVerifiedCustomerSession(currentUser, session)) return;
      closeProductDetails();
      const intent = createSelectionIntent(selectedProduct);
      setPendingSelection(intent);
      try { sessionStorage.setItem(PENDING_SELECTION_KEY, JSON.stringify(intent)); } catch { /* retain the selection in memory */ }
      setAccountMode('login');
      setAccountOpen(true);
    };
    revalidateOpenSelection();
    return () => { active = false; };
  }, [selectedProduct?.id, selectedProduct?.pairOptions, authLoading, currentUser?.id, currentUser?.role, verifyCustomerSession, closeProductDetails]);

  const cancelAuthenticationFlow = () => {
    setPendingSelection(null);
    try {
      sessionStorage.removeItem(PENDING_SELECTION_KEY);
      sessionStorage.removeItem(PENDING_PURCHASE_KEY);
    } catch { /* storage may be disabled */ }
    setAccountOpen(false);
  };

  const completePurchase = useCallback((intent) => {
    if (requiresCustomerAccount(currentUser) || cartOwnerId !== currentUser.id) return false;
    const product = activeProducts.find((item) => item.id === intent.productId);
    if (!product || product.available === false) {
      notify({ type: 'error', title: 'Produto indisponível', message: 'Confira o cardápio e tente novamente.' });
      return false;
    }
    const base = intent.baseId ? product.bases?.find((item) => item.id === intent.baseId) : product.bases?.[0] || null;
    if (intent.baseId && !base) {
      notify({ type: 'error', title: 'Opção indisponível', message: 'Selecione novamente as opções do produto.' });
      return false;
    }
    const extras = (intent.extraIds || []).map((id) => product.extras?.find((item) => item.id === id)).filter(Boolean);
    const quantity = Math.max(1, Number(intent.quantity) || 1);
    const requiredFlavors = product.pairOptions?.length
      ? (base?.id?.match(/^dupla-(.+)--(.+)$/)?.slice(1) || []).reduce((counts, id) => {
        counts.set(id, (counts.get(id) || 0) + quantity);
        return counts;
      }, new Map())
      : product.id in inventory.flavors ? new Map([[product.id, quantity]]) : new Map();
    if ([...requiredFlavors].some(([id, count]) => !stockAvailability(id, count))) {
      notify({ type: 'error', title: 'Estoque insuficiente', message: 'Uma das opções escolhidas ficou indisponível. Revise o produto e tente novamente.' });
      return false;
    }
    if (!addToCart(product, base, extras, intent.notes || '', quantity, true)) return false;
    setAccountOpen(false);
    if (intent.action === 'checkout') openCheckout();
    return true;
  }, [currentUser, cartOwnerId, activeProducts, inventory, stockAvailability, addToCart, openCheckout, notify]);

  const requestPurchase = (product, action = 'cart', base = null, extras = [], notes = '', quantity = 1) => {
    const intent = createPurchaseIntent(product, action, base, extras, notes, quantity);
    if (!requiresCustomerAccount(currentUser) && cartOwnerId === currentUser.id) {
      completePurchase(intent);
      return;
    }
    try { sessionStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify(intent)); } catch {
      notify({ type: 'error', title: 'Nao foi possÃ­vel continuar', message: 'Ative o armazenamento da sessao e tente novamente.' });
      return;
    }
    setAccountMode('login');
    setAccountOpen(true);
  };

  useEffect(() => {
    if (authLoading || currentUser?.role !== 'customer' || cartOwnerId !== currentUser.id) return;
    let intent;
    try {
      const serialized = sessionStorage.getItem(PENDING_PURCHASE_KEY);
      if (!serialized) return;
      intent = JSON.parse(serialized);
      sessionStorage.removeItem(PENDING_PURCHASE_KEY);
    } catch {
      sessionStorage.removeItem(PENDING_PURCHASE_KEY);
      notify({ type: 'error', title: 'Nao foi possÃ­vel recuperar o produto', message: 'Selecione o produto novamente.' });
      return;
    }
    if (!intent || typeof intent.productId !== 'string') {
      notify({ type: 'error', title: 'Produto nao recuperado', message: 'Selecione o produto novamente.' });
      return;
    }
    completePurchase(intent);
  }, [authLoading, currentUser?.id, currentUser?.role, cartOwnerId, completePurchase, notify]);

  const handleAddToCart = (product) => {
    if (product.requiresCustomization) {
      openProductSelection(product);
      return;
    }
    requestPurchase(product, 'cart', product.bases?.[0] || null);
  };

  const scrollToMenu = () => {
    menuSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const countsByCategory = useMemo(() => {
    const counts = { todos: activeProducts.length };
    CATEGORIES.forEach((cat) => {
      if (cat.id !== 'todos') {
        counts[cat.id] = activeProducts.filter((p) => p.category === cat.id).length;
      }
    });
    return counts;
  }, [activeProducts]);

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((product) => {
      const matchCategory =
        activeCategory === 'todos' || product.category === activeCategory;
      const matchSearch =
        searchTerm.trim() === '' ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.ingredients && product.ingredients.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchTerm, activeProducts]);

  useEffect(() => {
    if (!aosInitialized) {
      try {
        AOS.init({
          duration: 750,
          easing: 'ease-out-cubic',
          offset: 70,
          once: true,
          mirror: false,
        });
        document.documentElement.classList.add('aos-enabled');
        aosInitialized = true;
        if (document.readyState === 'complete') {
          AOS.refreshHard();
        } else {
          window.addEventListener('load', AOS.refreshHard, { once: true });
        }
      } catch {
        document.documentElement.classList.remove('aos-enabled');
      }
    }
  }, []);

  useEffect(() => {
    if (aosInitialized) AOS.refreshHard();
  }, [filteredProducts]);

  if (pathname === '/admin' || pathname === '/admin/login') return <AdminAccessRoute path={pathname} navigate={navigate} />;

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 text-ink font-sans selection:bg-primary selection:text-white">
      {/* Cabeçalho */}
      <Header onOpenAccount={openAccountFromHeader} onOpenOrders={openOrdersFromHeader} onOpenTracking={() => setTrackingOpen(true)} onOpenAdminPanel={openAdminPanel} />

      {/* Banner Principal com Selo Integrado Junto à Imagem */}
      <HeroBanner onExploreClick={scrollToMenu} />

      {/* Seção do Cardápio */}
      <section id="cardapio" ref={menuSectionRef} className="py-10 sm:py-16">
        
        <div className="max-w-6xl mx-auto px-4 text-center mb-6">
          <span className="text-xs font-black text-primary uppercase tracking-widest block mb-1">
            Cardápio
          </span>
          <h2 data-aos="fade-down" className="font-display font-black text-2xl sm:text-3xl text-stone-900 tracking-tight">
            <AnimatedText>Conheça o nosso cardápio</AnimatedText>
          </h2>
        </div>

        {/* Abas Centralizadas */}
        <CategoryNav
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          countsByCategory={countsByCategory}
        />

        {/* Grid de Produtos */}
        <div className="max-w-6xl mx-auto px-4 pt-6 sm:pt-8">
          <div data-aos="fade" className="mb-5 flex justify-center">
            <div className="relative w-full max-w-2xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="O que você está procurando?"
                aria-label="Pesquisar produtos do cardápio"
                className="w-full appearance-none rounded-2xl border border-stone-200 bg-white py-3.5 pl-12 pr-12 text-sm text-stone-800 shadow-subtle outline-none transition placeholder:text-stone-400 focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveCategory('todos');
                  }}
                  aria-label="Limpar pesquisa e mostrar todos os produtos"
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          {searchTerm && (
            <div data-aos="fade" className="text-xs text-stone-600 mb-6 bg-surface-50 px-3 py-2 rounded-xl border border-stone-200 inline-block">
              Buscando por: <strong className="text-stone-900 font-bold">"{searchTerm}"</strong>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div data-aos="fade-up" className="bg-surface-50 rounded-2xl p-8 sm:p-12 text-center border border-stone-200 max-w-md mx-auto my-6">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="font-bold text-base text-stone-800">
                Nenhum produto encontrado
              </h3>
              <p className="text-xs text-stone-500 mt-1 mb-4">
                Não localizamos produtos correspondentes a "{searchTerm}".
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setActiveCategory('todos');
                }}
                className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-hover transition-colors"
              >
                Ver todos os produtos
              </button>
            </div>
          ) : (
            <div className="product-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  animationDelay={(index % 4) * 50}
                  onSelect={openProductSelection}
                  onAddToCart={handleAddToCart}
                  onBuyNow={(item) => {
                    if (item.requiresCustomization) {
                      openProductSelection(item);
                      return;
                    }
                    requestPurchase(item, 'checkout', item.bases?.[0] || null);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Nova Seção de Localização e Contato */}
      <LocationContactSection />

      {/* Rodapé */}
      <Footer onOpenTracking={() => setTrackingOpen(true)} onOpenAdminPanel={() => navigate('/admin')} />

      {/* Modais e Drawers Funcionais */}
      {selectedProduct && <Suspense fallback={null}><ProductModal onAddToCart={(product, base, extras, notes, quantity) => requestPurchase(product, 'cart', base, extras, notes, quantity)} /></Suspense>}
      {isCartOpen && <Suspense fallback={null}><CartDrawer /></Suspense>}
      {isCheckoutOpen && <Suspense fallback={null}><CheckoutModal onOrderSuccess={(data) => setOrderSuccessData(data)} onRequestAuth={(mode) => { setAccountMode(mode); setAccountOpen(true); }} /></Suspense>}
      {orderSuccessData && <Suspense fallback={null}><OrderSuccessModal orderData={orderSuccessData} onClose={() => setOrderSuccessData(null)} /></Suspense>}

      {/* Barra de Sacola Flutuante para Celular */}
      <MobileFloatingCart />

      {accountOpen && <Suspense fallback={null}><AccountModal isOpen={accountOpen} initialMode={accountMode} initialView={accountInitialView} onClose={closeAccountModal} onDismiss={cancelAuthenticationFlow} onOpenAdminPanel={openAdminPanel} /></Suspense>}
      {trackingOpen && <Suspense fallback={null}><OrderTrackingModal isOpen={trackingOpen} onClose={() => setTrackingOpen(false)} /></Suspense>}

    </div>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <CartProvider>
          <StartupGate />
        </CartProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

function StartupGate() {
  const [phase, setPhase] = useState('loading');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const startedAt = Number(window.__salencarSplashStartedAt) || performance.now();
    const elapsed = Math.max(0, performance.now() - startedAt);
    if (elapsed >= STARTUP_SPLASH_MAX_MS - 420) {
      setComplete(true);
      return undefined;
    }
    const beforeFade = Math.max(0, STARTUP_SPLASH_MAX_MS - elapsed - 420);
    const hideTimer = window.setTimeout(() => setPhase('exiting'), beforeFade);
    return () => window.clearTimeout(hideTimer);
  }, []);

  useEffect(() => {
    if (phase !== 'exiting') return undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setComplete(true);
      return undefined;
    }
    // Safety fallback for browsers that do not dispatch transitionend.
    const fallback = window.setTimeout(() => setComplete(true), 450);
    return () => window.clearTimeout(fallback);
  }, [phase]);

  return (
    <>
      <DeliveryApp />
      {!complete && <StartupSplash phase={phase} onTransitionEnd={() => setComplete(true)} />}
    </>
  );
}

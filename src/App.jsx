import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import AOS from 'aos';
import { CartProvider, useCart } from './context/CartContext';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryNav } from './components/CategoryNav';
import { ProductCard } from './components/ProductCard';
import { LocationContactSection } from './components/LocationContactSection';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { MobileFloatingCart } from './components/MobileFloatingCart';
import { Footer } from './components/Footer';
import { PRODUCTS, CATEGORIES } from './data/products';
import { Search, X } from 'lucide-react';
import { AnimatedText } from './components/AnimatedText';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccountModal } from './components/AccountModal';
import { AdminPanel } from './components/AdminPanel';
import { AdminLogin } from './components/AdminLogin';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { NotificationProvider } from './components/Notifications';

let aosInitialized = false;

function AdminAccessRoute({ path, navigate }) {
  const { currentUser, authLoading, verifyAdminAuthorization } = useAuth();
  const [accessState, setAccessState] = useState('checking');

  useEffect(() => {
    let active = true;
    if (authLoading) { setAccessState('checking'); return () => { active = false; }; }
    if (!currentUser || currentUser.role !== 'admin') {
      setAccessState('denied');
      if (path === '/admin') navigate('/admin/login', { replace: true });
      return () => { active = false; };
    }

    setAccessState('checking');
    verifyAdminAuthorization().then((result) => {
      if (!active) return;
      if (result.ok) {
        setAccessState('authorized');
        if (path === '/admin/login') navigate('/admin', { replace: true });
      } else {
        setAccessState('denied');
        if (path === '/admin') navigate('/admin/login', { replace: true });
      }
    }).catch(() => {
      if (!active) return;
      setAccessState('denied');
      if (path === '/admin') navigate('/admin/login', { replace: true });
    });
    return () => { active = false; };
  }, [path, currentUser?.id, currentUser?.role, authLoading, verifyAdminAuthorization, navigate]);

  if (authLoading || accessState === 'checking') return <main className="flex min-h-screen items-center justify-center bg-[#fbf8f2] px-4 text-sm font-medium text-stone-500">Verificando acesso seguro…</main>;
  if (path === '/admin' && accessState === 'authorized') return <AdminPanel onClose={() => navigate('/')} />;
  return <AdminLogin onBack={() => navigate('/')} onSuccess={() => navigate('/admin')} />;
}

function DeliveryApp() {
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSuccessData, setOrderSuccessData] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMode, setAccountMode] = useState('login');
  const [pathname, setPathname] = useState(() => window.location.pathname.replace(/\/+$/, '') || '/');
  const [trackingOpen, setTrackingOpen] = useState(false);
  const { openProductDetails, addToCart, openCheckout } = useCart();
  const { currentUser, productSettings, inventory, stockAvailability, passwordRecoveryPending } = useAuth();
  const menuSectionRef = useRef(null);

  const navigate = useCallback((path, { replace = false } = {}) => {
    if (replace) window.history.replaceState({}, '', path);
    else window.history.pushState({}, '', path);
    setPathname(path);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

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
        available: product.bases.some((pair) => {
          const ids = pair.id.replace('dupla-', '').split('--');
          return ids.every((id) => stockAvailability(id));
        }),
      } : product.id in inventory.flavors ? { available: stockAvailability(product.id) } : {}),
    })), [productSettings, inventory, stockAvailability]);

  const handleAddToCart = (product) => {
    if (product.requiresCustomization) {
      openProductDetails(product);
      return;
    }
    addToCart(product, product.bases?.[0] || null);
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
      <Header onOpenAccount={() => { setAccountMode('login'); setAccountOpen(true); }} onOpenTracking={() => setTrackingOpen(true)} onOpenAdminPanel={() => navigate('/admin')} />

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
                  onSelect={openProductDetails}
                  onAddToCart={handleAddToCart}
                  onBuyNow={(item) => {
                    if (item.requiresCustomization) {
                      openProductDetails(item);
                      return;
                    }
                    addToCart(item, item.bases?.[0] || null, [], '', 1, false);
                    openCheckout();
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
      <ProductModal />
      <CartDrawer />
      <CheckoutModal onOrderSuccess={(data) => setOrderSuccessData(data)} onRequestAuth={(mode) => { setAccountMode(mode); setAccountOpen(true); }} />
      <OrderSuccessModal
        orderData={orderSuccessData}
        onClose={() => setOrderSuccessData(null)}
      />

      {/* Barra de Sacola Flutuante para Celular */}
      <MobileFloatingCart />

      <AccountModal isOpen={accountOpen} initialMode={accountMode} onClose={() => setAccountOpen(false)} onOpenAdminPanel={() => { setAccountOpen(false); navigate('/admin'); }} />
      <OrderTrackingModal isOpen={trackingOpen} onClose={() => setTrackingOpen(false)} />

    </div>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <CartProvider>
          <DeliveryApp />
        </CartProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

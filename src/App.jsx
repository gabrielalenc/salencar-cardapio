import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { CheckCircle2, Search, X } from 'lucide-react';
import { AnimatedText } from './components/AnimatedText';

let aosInitialized = false;

function DeliveryApp() {
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSuccessData, setOrderSuccessData] = useState(null);
  const { openProductDetails, addToCart, openCheckout, addedProductName } = useCart();
  const menuSectionRef = useRef(null);

  const handleAddToCart = (product) => {
    addToCart(product, product.bases?.[0] || null);
  };

  const scrollToMenu = () => {
    menuSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const countsByCategory = useMemo(() => {
    const counts = { todos: PRODUCTS.length };
    CATEGORIES.forEach((cat) => {
      if (cat.id !== 'todos') {
        counts[cat.id] = PRODUCTS.filter((p) => p.category === cat.id).length;
      }
    });
    return counts;
  }, []);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      const matchCategory =
        activeCategory === 'todos' || product.category === activeCategory;
      const matchSearch =
        searchTerm.trim() === '' ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.ingredients && product.ingredients.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchTerm]);

  useEffect(() => {
    if (!aosInitialized) {
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      try {
        AOS.init({
          duration: 750,
          easing: 'ease-out-cubic',
          offset: 70,
          once: true,
          mirror: false,
          disable: reduceMotion,
        });
        if (!reduceMotion) document.documentElement.classList.add('aos-enabled');
        aosInitialized = true;
      } catch {
        document.documentElement.classList.remove('aos-enabled');
      }
    }
  }, []);

  useEffect(() => {
    if (aosInitialized) AOS.refreshHard();
  }, [filteredProducts]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 text-ink font-sans selection:bg-primary selection:text-white">
      {/* Cabeçalho */}
      <Header />

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
      <Footer />

      {/* Modais e Drawers Funcionais */}
      <ProductModal />
      <CartDrawer />
      <CheckoutModal onOrderSuccess={(data) => setOrderSuccessData(data)} />
      <OrderSuccessModal
        orderData={orderSuccessData}
        onClose={() => setOrderSuccessData(null)}
      />

      {/* Barra de Sacola Flutuante para Celular */}
      <MobileFloatingCart />

      {addedProductName && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-4 right-4 top-4 z-[70] flex items-center gap-3 rounded-xl border border-primary/20 bg-surface-50 px-4 py-3 text-sm text-stone-800 shadow-lg sm:left-auto sm:right-6 sm:top-6 sm:max-w-sm"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
          <span><strong className="font-semibold">{addedProductName}</strong> adicionado à sacola.</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <CartProvider>
      <DeliveryApp />
    </CartProvider>
  );
}

import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/formatters';
import { useNotifications } from './Notifications';

export function CartDrawer() {
  const {
    isCartOpen,
    closeCart,
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    total,
    openCheckout
  } = useCart();
  const { confirm } = useNotifications();

  const confirmRemove = async (item) => {
    const accepted = await confirm({ title: 'Remover produto?', message: `Deseja remover ${item.product.name} da sacola?`, confirmLabel: 'Remover', destructive: true });
    if (accepted) removeFromCart(item.cartKey);
  };
  const confirmClear = async () => {
    const accepted = await confirm({ title: 'Limpar a sacola?', message: 'Todos os produtos adicionados serão removidos.', confirmLabel: 'Limpar sacola', destructive: true });
    if (accepted) clearCart();
  };

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity duration-200"
      />

      <div className="fixed inset-y-0 right-0 flex w-full max-w-md">
        <div className="flex min-w-0 w-full flex-col bg-white shadow-elevated">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <div>
                <h2 className="font-display font-bold text-base sm:text-lg text-stone-900 leading-tight">
                  Seu Carrinho
                </h2>
                <span className="text-xs text-stone-500 font-medium">
                  {items.length === 0 ? 'Carrinho vazio' : `${items.length} ${items.length === 1 ? 'item' : 'itens'}`}
                </span>
              </div>
            </div>

            <button
              onClick={closeCart}
              className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
              aria-label="Fechar carrinho"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lista de Itens */}
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-stone-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800 text-base">
                    Seu carrinho está vazio
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-xs">
                    Navegue pelo cardápio e adicione suas batidas ou combos favoritos.
                  </p>
                </div>
                <button
                  onClick={closeCart}
                  className="bg-primary text-white font-medium text-xs px-5 py-2.5 rounded-lg hover:bg-primary-hover transition-colors shadow-subtle"
                >
                  Ver Cardápio
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.cartKey} className="py-3.5 flex gap-3 group">
                  {/* Foto Miniatura */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Informações */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-xs sm:text-sm text-stone-900 leading-tight truncate">
                        {item.product.name}
                      </h4>
                      <button
                        onClick={() => confirmRemove(item)}
                        className="text-stone-400 hover:text-rose-600 transition-colors p-0.5"
                        title="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {item.base && (
                      <p className="text-[11px] text-stone-600 font-medium mt-0.5">
                        Opção: {item.base.name}
                      </p>
                    )}

                    {item.extras && item.extras.length > 0 && (
                      <div className="text-[11px] text-stone-500 mt-0.5 space-y-0.5">
                        {item.extras.map((extra) => (
                          <div key={extra.id} className="flex items-center gap-1">
                            <span>+ {extra.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {item.notes && (
                      <p className="text-[11px] text-stone-500 mt-1 italic">
                        Obs: "{item.notes}"
                      </p>
                    )}

                    {/* Quantidade e Valor */}
                    <div className="flex items-center justify-between mt-2 pt-1">
                      <div className="flex items-center bg-stone-100 rounded border border-stone-200">
                        <button
                          onClick={() => updateQuantity(item.cartKey, -1)}
                          className="w-6 h-6 flex items-center justify-center text-stone-600 hover:bg-white transition-colors"
                          aria-label="Diminuir"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cartKey, 1)}
                          className="w-6 h-6 flex items-center justify-center text-stone-600 hover:bg-white transition-colors"
                          aria-label="Aumentar"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs sm:text-sm font-bold text-stone-900">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-stone-200 bg-surface-50 space-y-3">
              <div className="space-y-1 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-800">{formatCurrency(subtotal)}</span>
                </div>
                <div className="rounded-lg border border-primary/10 bg-white px-3 py-2 text-[11px] leading-relaxed text-stone-600">
                  A entrega será cotada pela loja depois que você enviar o pedido. Você poderá aprovar o valor antes da confirmação.
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline text-sm">
                  <span className="font-bold text-stone-900">Subtotal dos produtos</span>
                  <span className="font-bold text-base text-primary">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={openCheckout}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3 px-4 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-subtle transition-colors duration-150 active:scale-[0.99]"
                >
                  <span>Avançar para Entrega</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between pt-1 text-xs text-stone-500">
                  <button
                    onClick={closeCart}
                    className="hover:text-stone-800 underline underline-offset-2"
                  >
                    Continuar comprando
                  </button>
                  <button
                    onClick={confirmClear}
                    className="hover:text-rose-600 transition-colors"
                  >
                    Limpar carrinho
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/formatters';

export function ProductModal() {
  const { selectedProduct, closeProductDetails, addToCart, openCart } = useCart();

  const [selectedBase, setSelectedBase] = useState(null);
  const [pairSelections, setPairSelections] = useState(['', '']);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (selectedProduct) {
      setSelectedBase(selectedProduct.bases?.[0] || null);
      setPairSelections(['', '']);
      setSelectedExtras([]);
      setNotes('');
      setQuantity(1);
    }
  }, [selectedProduct]);

  if (!selectedProduct) return null;

  const toggleExtra = (extra) => {
    setSelectedExtras((prev) => {
      const exists = prev.some((e) => e.id === extra.id);
      if (exists) {
        return prev.filter((e) => e.id !== extra.id);
      } else {
        return [...prev, extra];
      }
    });
  };

  const pairOptions = selectedProduct.pairOptions || [];
  const selectedPairOptions = pairSelections.map((id) => pairOptions.find((option) => option.id === id) || null);
  const pairReady = selectedPairOptions.every(Boolean);
  const orderedPairIds = pairReady
    ? [...pairSelections].sort((first, second) => pairOptions.findIndex((option) => option.id === first) - pairOptions.findIndex((option) => option.id === second))
    : [];
  const selectedPairBase = pairReady
    ? selectedProduct.bases.find((base) => base.id === `dupla-${orderedPairIds[0]}--${orderedPairIds[1]}`)
    : null;
  const cartBase = pairOptions.length ? selectedPairBase : selectedBase;
  const basePrice = cartBase?.price || 0;
  const extrasTotal = selectedExtras.reduce((acc, curr) => acc + (curr.price || 0), 0);
  const unitPrice = selectedProduct.price + basePrice + extrasTotal;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    if (selectedProduct.available === false) return;
    if (pairOptions.length && !selectedPairBase) return;
    addToCart(selectedProduct, cartBase, selectedExtras, notes, quantity);
    openCart();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={closeProductDetails}
    >
      {/* Container do Modal */}
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-elevated overflow-hidden flex flex-col max-h-[90vh] border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          onClick={closeProductDetails}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-stone-700 flex items-center justify-center transition-colors shadow-subtle border border-stone-200"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Conteúdo com Scroll */}
        <div className="overflow-y-auto flex-1 pb-24">
          
          {/* Imagem do Produto */}
          <div className="relative aspect-[16/10] bg-stone-100 overflow-hidden border-b border-stone-100">
            <img
              src={selectedProduct.image}
              alt={selectedProduct.name}
              className="w-full h-full object-cover object-center"
            />
            {selectedProduct.volume && (
              <span className="absolute bottom-3 left-3 bg-stone-900/80 text-white text-xs font-medium px-2.5 py-1 rounded backdrop-blur-xs">
                {selectedProduct.volume}
              </span>
            )}
          </div>

          {/* Informações Principais */}
          <div className="p-5 space-y-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display font-bold text-xl text-stone-900 leading-tight">
                  {selectedProduct.name}
                </h2>
                <div className="text-right whitespace-nowrap">
                  <span className="text-xl font-bold text-stone-900">
                    {formatCurrency(unitPrice)}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                {selectedProduct.description}
              </p>

              {selectedProduct.available === false && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Este produto está indisponível no momento.</p>}

              {selectedProduct.ingredients && (
                <div className="mt-3 p-3 bg-surface-50 rounded-lg border border-stone-200/80 text-xs text-stone-600">
                  <strong className="text-stone-800 font-semibold">Composição: </strong>
                  {selectedProduct.ingredients}
                </div>
              )}
            </div>

            {/* Seleção de Base */}
            {pairOptions.length > 0 && (
              <div className="pt-2 border-t border-stone-100">
                <div className="mb-2.5 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wide text-stone-800">Monte sua dupla</label>
                  <span className="text-[11px] font-medium text-stone-500">Escolha 2 batidas</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {pairSelections.map((selection, index) => (
                    <label key={index} className="block min-w-0">
                      <span className="mb-1.5 block text-xs font-medium text-stone-700">Batida {index + 1}</span>
                      <select
                        value={selection}
                        onChange={(event) => setPairSelections((previous) => previous.map((value, pairIndex) => pairIndex === index ? event.target.value : value))}
                        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs text-stone-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                        aria-label={`Escolha a batida ${index + 1} da dupla`}
                      >
                        <option value="">Selecione um sabor</option>
                        {pairOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                {pairReady && (
                  <div className="mt-3 rounded-xl border border-primary/20 bg-primary-light/60 p-3">
                    <p className="text-xs font-semibold text-stone-800">
                      Dupla escolhida: {pairSelections[0] === pairSelections[1]
                        ? `2x ${selectedPairOptions[0].name}`
                        : `${selectedPairOptions[0].name} + ${selectedPairOptions[1].name}`}
                    </p>
                    <div className="mt-2 flex gap-2">
                      {selectedPairOptions.map((option, index) => (
                        <img key={`${option.id}-${index}`} src={option.image} alt={option.name} className="h-12 w-12 rounded-lg border border-white object-cover shadow-subtle" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {pairOptions.length === 0 && selectedProduct.bases && selectedProduct.bases.length > 1 && (
              <div className="pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                    Escolha a opção
                  </label>
                  <span className="text-[11px] text-stone-500 font-medium">1 opção obrigatória</span>
                </div>

                <div className="space-y-2">
                  {selectedProduct.bases.map((base) => {
                    const isSelected = selectedBase?.id === base.id;
                    return (
                      <label
                        key={base.id}
                        onClick={() => setSelectedBase(base)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary-light border-primary'
                            : 'bg-white border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-stone-400 bg-white'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                          </div>
                          <span className={`text-xs sm:text-sm ${isSelected ? 'text-stone-900 font-semibold' : 'text-stone-700'}`}>
                            {base.name}
                          </span>
                        </div>
                        {base.price > 0 && (
                          <span className="text-xs font-semibold text-primary">
                            +{formatCurrency(base.price)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Adicionais */}
            {selectedProduct.extras && selectedProduct.extras.length > 0 && (
              <div className="pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                    Adicionais
                  </label>
                  <span className="text-[11px] text-stone-500 font-medium">Opcional</span>
                </div>

                <div className="space-y-2">
                  {selectedProduct.extras.map((extra) => {
                    const isChecked = selectedExtras.some((e) => e.id === extra.id);
                    return (
                      <label
                        key={extra.id}
                        onClick={() => toggleExtra(extra)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-surface-50 border-stone-400'
                            : 'bg-white border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isChecked
                                ? 'border-primary bg-primary text-white'
                                : 'border-stone-400 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className={`text-xs sm:text-sm ${isChecked ? 'font-semibold text-stone-900' : 'text-stone-700'}`}>
                            {extra.name}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-stone-700">
                          +{formatCurrency(extra.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="pt-2 border-t border-stone-100">
              <label htmlFor="notes" className="block text-xs font-bold text-stone-800 uppercase tracking-wide mb-1.5">
                Observações do Pedido
              </label>
              <textarea
                id="notes"
                rows={2}
                maxLength={200}
                placeholder="Ex: pouco açúcar, enviar copo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-stone-400 resize-none bg-surface-50"
              />
            </div>

          </div>
        </div>

        {/* Rodapé Fixo */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-white border-t border-stone-200 flex items-center gap-3">
          {/* Contador de Quantidade */}
          <div className="flex items-center bg-stone-100 rounded-lg p-1 border border-stone-200">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded bg-white flex items-center justify-center text-stone-700 hover:bg-stone-200 disabled:opacity-40 transition-colors shadow-subtle"
              aria-label="Diminuir quantidade"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center font-bold text-xs sm:text-sm text-stone-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded bg-white flex items-center justify-center text-stone-700 hover:bg-stone-200 transition-colors shadow-subtle"
              aria-label="Aumentar quantidade"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botão de Confirmação */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={selectedProduct.available === false || (pairOptions.length > 0 && (!pairReady || !selectedPairBase))}
            className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 px-4 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-between shadow-subtle transition-colors duration-150 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>{selectedProduct.available === false ? 'Indisponível' : 'Adicionar ao Carrinho'}</span>
            <span className="font-bold">
              {formatCurrency(totalPrice)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

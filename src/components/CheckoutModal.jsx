import React, { useState } from 'react';
import {
  ArrowLeft, ArrowRight, Banknote, Check, CreditCard, Loader2, MapPin,
  QrCode, Send, Store, Truck, X,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { STORE_CONFIG } from '../config/storeConfig';
import { formatCurrency, formatPhone, formatCEP, fetchAddressByCEP } from '../utils/formatters';

const steps = ['Endereço', 'Pagamento', 'Revisão'];

function CheckoutField({ label, field, optional, type = 'text', value, onChange, error, inputClass, ...props }) {
  const handleChange = (event) => {
    const rawValue = event.target.value;
    onChange(field === 'phone' ? formatPhone(rawValue) : rawValue);
  };

  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-stone-700">{label}{optional && <span className="ml-1 text-stone-400">(opcional)</span>}</span>
      <input {...props} type={type} value={value} onChange={handleChange} className={inputClass} />
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}

function PaymentOption({ value, label, icon: Icon, selected, onSelect }) {
  return (
    <button type="button" onClick={() => onSelect(value)} aria-pressed={selected} className={`flex min-h-16 items-center gap-3 rounded-xl border px-3 text-left transition ${selected ? 'border-primary bg-primary/5 text-primary' : 'border-stone-200 text-stone-700 hover:bg-stone-50'}`}>
      <Icon className="h-5 w-5 shrink-0" /> <span className="text-sm font-medium">{label}</span>
      {selected && <Check className="ml-auto h-4 w-4" />}
    </button>
  );
}

export function CheckoutModal({ onOrderSuccess }) {
  const {
    isCheckoutOpen, closeCheckout, items, subtotal, deliveryFee, total,
    deliveryType, setDeliveryType, clearCart,
  } = useCart();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', phone: '', cep: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', reference: '', paymentMethod: 'pix',
    needsChange: 'nao', changeFor: '', orderNotes: '',
  });
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [cepError, setCepError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCheckoutOpen) return null;

  const change = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleCEPBlur = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setLoadingCEP(true);
    setCepError('');
    try {
      const address = await fetchAddressByCEP(cep);
      setFormData((prev) => ({ ...prev, street: address.street || prev.street, neighborhood: address.neighborhood || prev.neighborhood, city: address.city || prev.city }));
    } catch (err) {
      setCepError(err.message || 'Não foi possível localizar o CEP. Você pode preencher o endereço manualmente.');
    } finally {
      setLoadingCEP(false);
    }
  };

  const validateAddress = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Informe seu nome.';
    if (formData.phone.replace(/\D/g, '').length < 10) errors.phone = 'Informe um WhatsApp válido com DDD.';
    if (deliveryType === 'delivery') {
      if (formData.cep.replace(/\D/g, '').length !== 8) errors.cep = 'Informe um CEP válido.';
      if (!formData.street.trim()) errors.street = 'Informe a rua.';
      if (!formData.number.trim()) errors.number = 'Informe o número.';
      if (!formData.neighborhood.trim()) errors.neighborhood = 'Informe o bairro.';
      if (!formData.city.trim()) errors.city = 'Informe a cidade.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePayment = () => {
    const errors = {};
    if (formData.paymentMethod === 'money' && formData.needsChange === 'sim') {
      const amount = Number(formData.changeFor.replace(',', '.'));
      if (!Number.isFinite(amount) || amount <= total) errors.changeFor = `Informe um valor acima do total (${formatCurrency(total)}).`;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    if (step === 1 && validateAddress()) setStep(2);
    if (step === 2 && validatePayment()) setStep(3);
  };

  const paymentLabel = { pix: 'Pix', money: 'Dinheiro', credit: 'Cartão de crédito', debit: 'Cartão de débito' }[formData.paymentMethod];
  const buildWhatsAppMessage = () => {
    const products = items.map((item) => {
      const details = [item.base?.name, ...(item.extras || []).map((extra) => `Adicional: ${extra.name}`)].filter(Boolean);
      return `• ${item.quantity}x ${item.product.name}${details.length ? ` (${details.join(', ')})` : ''}\n  ${formatCurrency(item.totalPrice)}${item.notes ? `\n  Obs.: ${item.notes}` : ''}`;
    }).join('\n');
    const address = deliveryType === 'delivery'
      ? `${formData.street}, ${formData.number}${formData.complement ? `, ${formData.complement}` : ''}\n${formData.neighborhood}, ${formData.city} — CEP ${formData.cep}${formData.reference ? `\nReferência: ${formData.reference}` : ''}`
      : `Retirada no balcão — ${STORE_CONFIG.pickupAddress}`;
    const changeInfo = formData.paymentMethod !== 'money'
      ? ''
      : formData.needsChange === 'sim'
        ? `\nTroco para ${formatCurrency(Number(formData.changeFor.replace(',', '.')))} (troco estimado: ${formatCurrency(Number(formData.changeFor.replace(',', '.')) - total)})`
        : '\nSem necessidade de troco (valor exato)';
    const itemNotes = formData.orderNotes.trim() ? `\nObservações do pedido: ${formData.orderNotes.trim()}` : '';
    return `NOVO PEDIDO — ${STORE_CONFIG.name}\n\nCliente: ${formData.name.trim()}\nWhatsApp: ${formData.phone.trim()}\n\nENDEREÇO\n${address}\n\nITENS\n${products}\n\nSubtotal: ${formatCurrency(subtotal)}\nEntrega: ${deliveryType === 'pickup' ? 'Retirada sem taxa' : deliveryFee === 0 ? 'Grátis' : formatCurrency(deliveryFee)}\nTOTAL: ${formatCurrency(total)}\n\nPagamento: ${paymentLabel}${changeInfo}${formData.paymentMethod === 'pix' ? `\nChave Pix: ${STORE_CONFIG.pix.key}` : ''}${itemNotes}\n\nAgradeço pela preferência!`;
  };

  const handleFinishOrder = (event) => {
    event.preventDefault();
    if (!validateAddress() || !validatePayment()) {
      if (!validateAddress()) setStep(1);
      else setStep(2);
      return;
    }
    setIsSubmitting(true);
    try {
      const message = buildWhatsAppMessage();
      const whatsappUrl = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      onOrderSuccess?.({ customer: formData.name, phone: formData.phone, items: [...items], total, whatsappUrl, message, paymentMethod: formData.paymentMethod });
      clearCart();
      closeCheckout();
    } catch (err) {
      console.error('Erro ao finalizar pedido:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field) => `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-stone-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 ${formErrors[field] ? 'border-rose-400' : 'border-stone-200'}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/50 p-0 sm:p-4" onClick={closeCheckout}>
      <section role="dialog" aria-modal="true" aria-labelledby="checkout-title" className="flex max-h-[100dvh] min-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-white sm:min-h-0 sm:max-h-[92vh] sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-stone-100 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            {step > 1 ? <button type="button" onClick={() => setStep((current) => current - 1)} className="rounded-full p-2 text-stone-500 hover:bg-stone-100" aria-label="Voltar uma etapa"><ArrowLeft className="h-5 w-5" /></button> : <span className="rounded-full bg-stone-100 p-2 text-stone-600"><MapPin className="h-5 w-5" /></span>}
            <div><h2 id="checkout-title" className="text-lg font-semibold text-stone-900">Finalizar pedido</h2><p className="text-xs text-stone-500">Etapa {step} de 3</p></div>
          </div>
          <button type="button" onClick={closeCheckout} className="rounded-full p-2 text-stone-500 hover:bg-stone-100" aria-label="Fechar checkout"><X className="h-5 w-5" /></button>
        </header>

        <nav aria-label="Progresso do pedido" className="border-b border-stone-100 px-4 py-4 sm:px-8">
          <ol className="grid grid-cols-3 gap-2">
            {steps.map((label, index) => {
              const number = index + 1;
              const active = number === step;
              const complete = number < step;
              return <li key={label} className={`flex items-center gap-2 text-xs sm:text-sm ${active ? 'font-semibold text-stone-900' : complete ? 'text-primary' : 'text-stone-400'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${active ? 'bg-primary text-white' : complete ? 'bg-primary/10 text-primary' : 'bg-stone-100'}`}>{complete ? <Check className="h-4 w-4" /> : number}</span>{label}</li>;
            })}
          </ol>
        </nav>

        <form onSubmit={step === 3 ? handleFinishOrder : (event) => { event.preventDefault(); goNext(); }} className="flex min-h-0 flex-1 flex-col">
          <main className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
            {step === 1 && <>
              <section className="space-y-4">
                <div><h3 className="font-semibold text-stone-900">Como vamos receber o pedido?</h3><p className="mt-1 text-sm text-stone-500">Escolha entrega ou retirada no local.</p></div>
                <div className="grid grid-cols-2 gap-3">
                  {[['delivery', 'Entrega', Truck, deliveryFee === 0 ? 'Grátis' : formatCurrency(deliveryFee)], ['pickup', 'Retirada', Store, 'Sem taxa']].map(([value, label, Icon, detail]) => <button key={value} type="button" onClick={() => setDeliveryType(value)} className={`flex items-center gap-3 rounded-xl border p-3 text-left ${deliveryType === value ? 'border-primary bg-primary/5' : 'border-stone-200 hover:bg-stone-50'}`}><Icon className={`h-5 w-5 ${deliveryType === value ? 'text-primary' : 'text-stone-500'}`} /><span><span className="block text-sm font-medium text-stone-800">{label}</span><span className="text-xs text-stone-500">{detail}</span></span></button>)}
                </div>
              </section>
              <section className="space-y-4 border-t border-stone-100 pt-5">
                <h3 className="font-semibold text-stone-900">Seus dados</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <CheckoutField label="Nome completo *" field="name" value={formData.name} onChange={(value) => change('name', value)} error={formErrors.name} inputClass={inputClass('name')} autoComplete="name" placeholder="Seu nome" />
                  <CheckoutField label="Telefone / WhatsApp *" field="phone" type="tel" value={formData.phone} onChange={(value) => change('phone', value)} error={formErrors.phone} inputClass={inputClass('phone')} autoComplete="tel" placeholder="(11) 99999-9999" />
                </div>
              </section>
              {deliveryType === 'delivery' && <section className="space-y-4 border-t border-stone-100 pt-5">
                <div><h3 className="font-semibold text-stone-900">Endereço de entrega</h3><p className="mt-1 text-sm text-stone-500">Informe seu CEP para preencher o endereço automaticamente.</p></div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">CEP *</span><span className="relative block"><input value={formData.cep} maxLength={9} inputMode="numeric" placeholder="00000-000" onBlur={handleCEPBlur} onChange={(event) => change('cep', formatCEP(event.target.value))} className={inputClass('cep')} />{loadingCEP && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-stone-500" />}</span>{formErrors.cep && <span className="mt-1 block text-xs text-rose-600">{formErrors.cep}</span>}</label>
                  <div className="flex items-end"><button type="button" onClick={handleCEPBlur} disabled={loadingCEP} className="h-[42px] w-full rounded-lg border border-stone-200 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50">Buscar CEP</button></div>
                  <div className="hidden sm:block" />
                </div>
                {cepError && <p className="text-xs text-amber-700">{cepError}</p>}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2"><CheckoutField label="Rua *" field="street" value={formData.street} onChange={(value) => change('street', value)} error={formErrors.street} inputClass={inputClass('street')} autoComplete="address-line1" placeholder="Nome da rua" /></div>
                  <CheckoutField label="Número *" field="number" value={formData.number} onChange={(value) => change('number', value)} error={formErrors.number} inputClass={inputClass('number')} placeholder="Número" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <CheckoutField label="Bairro *" field="neighborhood" value={formData.neighborhood} onChange={(value) => change('neighborhood', value)} error={formErrors.neighborhood} inputClass={inputClass('neighborhood')} autoComplete="address-level3" placeholder="Bairro" />
                  <CheckoutField label="Cidade *" field="city" value={formData.city} onChange={(value) => change('city', value)} error={formErrors.city} inputClass={inputClass('city')} autoComplete="address-level2" placeholder="Cidade" />
                </div>
                <CheckoutField label="Complemento" optional field="complement" value={formData.complement} onChange={(value) => change('complement', value)} error={formErrors.complement} inputClass={inputClass('complement')} autoComplete="address-line2" placeholder="Apto, bloco..." />
                <CheckoutField label="Referência" optional field="reference" value={formData.reference} onChange={(value) => change('reference', value)} error={formErrors.reference} inputClass={inputClass('reference')} placeholder="Ponto de referência" />
              </section>}
              <section className="rounded-xl bg-stone-50 p-4"><div className="flex items-center justify-between"><h3 className="font-medium text-stone-800">Seu pedido</h3><span className="text-sm text-stone-500">{items.reduce((sum, item) => sum + item.quantity, 0)} itens</span></div><div className="mt-3 space-y-2">{items.map((item) => <div key={item.cartKey} className="flex justify-between gap-3 text-sm"><span className="text-stone-600">{item.quantity}x {item.product.name}</span><span className="shrink-0 text-stone-700">{formatCurrency(item.totalPrice)}</span></div>)}</div><div className="mt-3 border-t border-stone-200 pt-3 text-sm"><div className="flex justify-between text-stone-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div><div className="mt-1 flex justify-between text-stone-500"><span>Entrega</span><span>{deliveryType === 'pickup' ? 'Retirada' : deliveryFee === 0 ? 'Grátis' : formatCurrency(deliveryFee)}</span></div><div className="mt-2 flex justify-between font-semibold text-stone-900"><span>Total</span><span>{formatCurrency(total)}</span></div></div></section>
            </>}

            {step === 2 && <>
              <div><h3 className="font-semibold text-stone-900">Como deseja pagar?</h3><p className="mt-1 text-sm text-stone-500">O pagamento será combinado na entrega ou retirada.</p></div>
              <div className="grid gap-3 sm:grid-cols-2"><PaymentOption value="money" label="Dinheiro" icon={Banknote} selected={formData.paymentMethod === 'money'} onSelect={(value) => change('paymentMethod', value)} /><PaymentOption value="pix" label="Pix" icon={QrCode} selected={formData.paymentMethod === 'pix'} onSelect={(value) => change('paymentMethod', value)} /><PaymentOption value="credit" label="Cartão de crédito" icon={CreditCard} /><PaymentOption value="debit" label="Cartão de débito" icon={CreditCard} /></div>
              {formData.paymentMethod === 'money' && <section className="space-y-4 rounded-xl bg-stone-50 p-4"><h4 className="text-sm font-semibold text-stone-800">Precisa de troco?</h4><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => change('needsChange', 'nao')} aria-pressed={formData.needsChange === 'nao'} className={`rounded-lg border px-3 py-3 text-sm ${formData.needsChange === 'nao' ? 'border-primary bg-white text-primary' : 'border-stone-200 bg-white text-stone-600'}`}>Não, valor exato</button><button type="button" onClick={() => change('needsChange', 'sim')} aria-pressed={formData.needsChange === 'sim'} className={`rounded-lg border px-3 py-3 text-sm ${formData.needsChange === 'sim' ? 'border-primary bg-white text-primary' : 'border-stone-200 bg-white text-stone-600'}`}>Sim, preciso</button></div>{formData.needsChange === 'sim' && <label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Troco para quanto?</span><span className="flex items-center gap-2"><span className="text-sm text-stone-500">R$</span><input inputMode="decimal" value={formData.changeFor} onChange={(event) => change('changeFor', event.target.value)} placeholder="50,00" className={inputClass('changeFor')} /></span>{formErrors.changeFor && <span className="mt-1 block text-xs text-rose-600">{formErrors.changeFor}</span>}</label>}</section>}
              {formData.paymentMethod === 'pix' && <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600">A chave Pix ({STORE_CONFIG.pix.key}) será enviada junto com os dados do pedido.</p>}
              {(formData.paymentMethod === 'credit' || formData.paymentMethod === 'debit') && <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600">O entregador levará a maquininha no momento da entrega.</p>}
              <section className="rounded-xl border border-stone-200 p-4"><div className="flex justify-between text-sm text-stone-500"><span>Total do pedido</span><span className="font-semibold text-stone-900">{formatCurrency(total)}</span></div></section>
            </>}

            {step === 3 && <>
              <div><h3 className="font-semibold text-stone-900">Confira seu pedido</h3><p className="mt-1 text-sm text-stone-500">Revise os dados antes de enviar pelo WhatsApp.</p></div>
              <section className="space-y-3 rounded-xl bg-stone-50 p-4"><div><h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Cliente</h4><p className="mt-1 text-sm text-stone-800">{formData.name} · {formData.phone}</p></div><div className="border-t border-stone-200 pt-3"><h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{deliveryType === 'delivery' ? 'Endereço' : 'Retirada'}</h4><p className="mt-1 whitespace-pre-line text-sm text-stone-800">{deliveryType === 'delivery' ? `${formData.street}, ${formData.number}${formData.complement ? `, ${formData.complement}` : ''}\n${formData.neighborhood}, ${formData.city} — CEP ${formData.cep}${formData.reference ? `\nReferência: ${formData.reference}` : ''}` : STORE_CONFIG.pickupAddress}</p></div><div className="border-t border-stone-200 pt-3"><h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Pagamento</h4><p className="mt-1 text-sm text-stone-800">{paymentLabel}{formData.paymentMethod === 'money' ? formData.needsChange === 'sim' ? ` · Troco para ${formatCurrency(Number(formData.changeFor.replace(',', '.')))} (devolver ${formatCurrency(Number(formData.changeFor.replace(',', '.')) - total)})` : ' · Valor exato' : ''}</p></div></section>
              <section className="rounded-xl border border-stone-200 p-4"><h4 className="mb-3 text-sm font-semibold text-stone-800">Produtos</h4><div className="space-y-4">{items.map((item) => <div key={item.cartKey} className="flex justify-between gap-3 text-sm"><div><p className="font-medium text-stone-800">{item.quantity}x {item.product.name}{item.base ? ` — ${item.base.name}` : ''}</p>{item.extras?.length > 0 && <p className="mt-1 text-xs text-stone-500">Adicionais: {item.extras.map((extra) => extra.name).join(', ')}</p>}{item.notes && <p className="mt-1 text-xs text-stone-500">Observação: {item.notes}</p>}</div><span className="shrink-0 font-medium text-stone-700">{formatCurrency(item.totalPrice)}</span></div>)}</div><label className="mt-4 block border-t border-stone-100 pt-4"><span className="mb-1.5 block text-xs font-medium text-stone-700">Observação para o pedido (opcional)</span><textarea rows={2} value={formData.orderNotes} onChange={(event) => change('orderNotes', event.target.value)} placeholder="Instruções para a entrega..." className={inputClass('orderNotes')} /></label><div className="mt-4 space-y-2 border-t border-stone-100 pt-3 text-sm"><div className="flex justify-between text-stone-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-stone-500"><span>Entrega</span><span>{deliveryType === 'pickup' ? 'Retirada sem taxa' : deliveryFee === 0 ? 'Grátis' : formatCurrency(deliveryFee)}</span></div><div className="flex justify-between border-t border-stone-100 pt-3 text-base font-semibold text-stone-900"><span>Total</span><span>{formatCurrency(total)}</span></div></div></section>
            </>}
          </main>
          <footer className="flex gap-3 border-t border-stone-100 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8">
            {step > 1 && <button type="button" onClick={() => setStep((current) => current - 1)} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50"><ArrowLeft className="h-4 w-4" />Voltar</button>}
            {step < 3 ? <button type="submit" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">Continuar<ArrowRight className="h-4 w-4" /></button> : <button type="submit" disabled={isSubmitting} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"><Send className="h-4 w-4" />{isSubmitting ? 'Enviando...' : 'Confirmar e enviar pelo WhatsApp'}</button>}
          </footer>
        </form>
      </section>
    </div>
  );
}

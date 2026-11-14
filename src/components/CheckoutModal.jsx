import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Banknote, Check, CreditCard, Loader2, MapPin,
  LogIn, QrCode, Send, Store, Truck, X,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency, formatPhone, formatCEP, fetchAddressByCEP } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from './Notifications';

const steps = ['Endereço', 'Pagamento', 'Revisão'];

function checkoutIdempotency(orderItems, customerId) {
  const fingerprint = JSON.stringify(orderItems.map((item) => ({
    productId: item.product.id,
    baseId: item.base?.id || '',
    extras: (item.extras || []).map((extra) => extra.id).sort(),
    quantity: item.quantity,
  })));
  const storageKey = `salencar_order_attempt:${customerId}:${fingerprint}`;
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return { key: existing, storageKey };
  } catch { /* use an in-memory attempt key when storage is unavailable */ }
  const key = crypto.randomUUID();
  try { sessionStorage.setItem(storageKey, key); } catch { /* server still enforces each submitted key */ }
  return { key, storageKey };
}

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

export function CheckoutModal({ onOrderSuccess, onRequestAuth }) {
  const {
    isCheckoutOpen, closeCheckout, items, subtotal, total,
    deliveryType, setDeliveryType, clearCart,
  } = useCart();
  const { currentUser, authLoading, recordOrder, settings, canFulfillItems, addresses, paymentPreference } = useAuth();
  const { notify } = useNotifications();
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
  const submitLockRef = useRef(false);
  const [orderError, setOrderError] = useState('');
  const [profilePrefilledFor, setProfilePrefilledFor] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('new');
  const [saveAddressForNext, setSaveAddressForNext] = useState(false);

  useEffect(() => {
    if (!authLoading && currentUser?.role === 'customer' && profilePrefilledFor !== currentUser.id) {
      const primaryAddress = addresses.find((address) => address.is_default) || addresses[0];
      setFormData((previous) => ({
        ...previous,
        name: currentUser.name || previous.name,
        phone: currentUser.phone ? formatPhone(currentUser.phone) : previous.phone,
        paymentMethod: paymentPreference || 'pix',
        ...(primaryAddress ? { cep: primaryAddress.postal_code || '', street: primaryAddress.street || '', number: primaryAddress.number || '', complement: primaryAddress.complement || '', neighborhood: primaryAddress.neighborhood || '', city: primaryAddress.city || '', reference: primaryAddress.reference || '' } : {}),
      }));
      setSelectedAddressId(primaryAddress?.id || 'new');
      setSaveAddressForNext(!addresses.length);
      setProfilePrefilledFor(currentUser.id);
    }
  }, [currentUser, authLoading, addresses, paymentPreference, profilePrefilledFor]);

  if (!isCheckoutOpen) return null;

  if (authLoading && !currentUser) return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/55 p-3 backdrop-blur-sm">
      <div role="status" className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-medium text-stone-700 shadow-elevated"><Loader2 className="h-5 w-5 animate-spin text-primary" />Carregando sua sessão segura…</div>
    </div>
  );

  if (currentUser?.role !== 'customer') return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/55 p-3 backdrop-blur-sm" onClick={closeCheckout}>
      <section role="dialog" aria-modal="true" aria-labelledby="checkout-auth-title" className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-elevated" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary"><LogIn className="h-5 w-5" /></div>
        <h2 id="checkout-auth-title" className="mt-4 text-lg font-bold text-stone-900">Entre para finalizar seu pedido</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">Sua conta permite acompanhar o histórico e ajuda a identificar o pedido no painel da Salencar.</p>
        <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => onRequestAuth('login')} className="rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-white hover:bg-primary-hover">Entrar</button><button type="button" onClick={() => onRequestAuth('register')} className="rounded-xl border border-stone-200 px-3 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50">Criar conta</button></div>
        <button type="button" onClick={closeCheckout} className="mt-4 text-xs font-medium text-stone-400 hover:text-stone-700">Voltar ao carrinho</button>
      </section>
    </div>
  );

  const change = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const selectSavedAddress = (id) => {
    setSelectedAddressId(id);
    if (id === 'new') {
      setSaveAddressForNext(!addresses.length);
      setFormData((previous) => ({ ...previous, cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', reference: '' }));
      return;
    }
    const address = addresses.find((entry) => entry.id === id);
    if (!address) return;
    setFormData((previous) => ({ ...previous, phone: address.phone ? formatPhone(address.phone) : previous.phone, cep: address.postal_code || '', street: address.street || '', number: address.number || '', complement: address.complement || '', neighborhood: address.neighborhood || '', city: address.city || '', reference: address.reference || '' }));
    setSaveAddressForNext(false);
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
      if (!Number.isFinite(amount) || amount <= subtotal) errors.changeFor = `Informe um valor acima do subtotal (${formatCurrency(subtotal)}). O total final incluirá a cotação da entrega.`;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    if (step === 1 && validateAddress()) setStep(2);
    if (step === 2 && validatePayment()) setStep(3);
  };

  const paymentLabel = { pix: 'Pix', money: 'Dinheiro', credit: 'Cartão de crédito', debit: 'Cartão de débito' }[formData.paymentMethod];
  const buildWhatsAppMessage = (orderId, displayName = formData.name) => {
    const products = items.map((item) => {
      const details = [item.base?.name, ...(item.extras || []).map((extra) => `Adicional: ${extra.name}`)].filter(Boolean);
      return `• ${item.quantity}x ${item.product.name}${details.length ? ` (${details.join(', ')})` : ''}\n  ${formatCurrency(item.totalPrice)}${item.notes ? `\n  Obs.: ${item.notes}` : ''}`;
    }).join('\n');
    const address = deliveryType === 'delivery'
      ? `${formData.street}, ${formData.number}${formData.complement ? `, ${formData.complement}` : ''}\n${formData.neighborhood}, ${formData.city} — CEP ${formData.cep}${formData.reference ? `\nReferência: ${formData.reference}` : ''}`
      : `Retirada no balcão — ${settings.pickupAddress}`;
    const changeInfo = formData.paymentMethod !== 'money'
      ? ''
      : formData.needsChange === 'sim'
        ? `\nTroco para ${formatCurrency(Number(formData.changeFor.replace(',', '.')))} (o total final depende da cotação da entrega)`
        : '\nSem necessidade de troco (valor exato)';
    const itemNotes = formData.orderNotes.trim() ? `\nObservações do pedido: ${formData.orderNotes.trim()}` : '';
    return `NOVO PEDIDO — ${settings.name}\n${orderId ? `Pedido: ${orderId}\n` : ''}\nCliente: ${displayName.trim()}\nE-mail: ${currentUser.email}\nWhatsApp: ${formData.phone.trim()}\n\nENDEREÇO\n${address}\n\nITENS\n${products}\n\nSubtotal dos produtos: ${formatCurrency(subtotal)}\nEntrega: ${deliveryType === 'pickup' ? 'Retirada no local' : 'Aguardando cotação da loja'}\n${deliveryType === 'delivery' ? 'Total final: será informado após a cotação e enviado para aprovação.' : `Total: ${formatCurrency(subtotal)}`}\n\nPagamento: ${paymentLabel}${changeInfo}${formData.paymentMethod === 'pix' ? `\nChave Pix: ${settings.pix.key}` : ''}${itemNotes}\n\nAgradeço pela preferência!`;
  };

  const handleFinishOrder = async (event) => {
    event.preventDefault();
    if (submitLockRef.current) return;
    if (!validateAddress() || !validatePayment()) {
      if (!validateAddress()) setStep(1);
      else setStep(2);
      return;
    }
    submitLockRef.current = true;
    const idempotency = checkoutIdempotency(items, currentUser.id);
    const whatsappWindow = window.open('about:blank', '_blank');
    if (whatsappWindow) whatsappWindow.opener = null;
    setIsSubmitting(true);
    setOrderError('');
    try {
      const stockCheck = canFulfillItems(items);
      if (!stockCheck.ok) throw new Error(stockCheck.error);
      const addressSnapshot = deliveryType === 'delivery' ? {
        street: formData.street.trim(), number: formData.number.trim(), complement: formData.complement.trim(),
        neighborhood: formData.neighborhood.trim(), city: formData.city.trim(), postal_code: formData.cep.trim(), reference: formData.reference.trim(),
      } : {};
      const result = await recordOrder({
        idempotencyKey: idempotency.key,
        customerName: formData.name.trim(),
        phone: formData.phone.trim(),
        items: items.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          productImage: item.product.image,
          baseId: item.base?.id || '',
          option: item.base?.name || '',
          extras: (item.extras || []).map((extra) => ({ id: extra.id, name: extra.name, price: extra.price })),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        subtotal,
        deliveryFee: 0,
        total: subtotal,
        deliveryType,
        address: deliveryType === 'delivery' ? `${formData.street}, ${formData.number}${formData.complement ? `, ${formData.complement}` : ''}; ${formData.neighborhood}, ${formData.city}; CEP ${formData.cep}${formData.reference ? `; Referência: ${formData.reference}` : ''}` : settings.pickupAddress,
        addressSnapshot,
        paymentMethodId: formData.paymentMethod,
        saveAddress: saveAddressForNext || !addresses.length,
        makeDefaultAddress: !addresses.length,
        paymentMethod: paymentLabel,
        orderNotes: formData.orderNotes.trim(),
      });
      if (!result?.ok) throw new Error(result?.error || 'Não foi possível registrar o pedido.');
      const savedOrder = result.order;
      try { sessionStorage.removeItem(idempotency.storageKey); } catch { /* order was saved; storage cleanup is optional */ }
      const message = buildWhatsAppMessage(savedOrder.id, savedOrder.customerName);
      const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(message)}`;
      if (whatsappWindow) whatsappWindow.location.href = whatsappUrl;
      onOrderSuccess?.({ customer: savedOrder.customerName, phone: formData.phone, items: [...items], subtotal, total, deliveryType, whatsappUrl, message, paymentMethod: formData.paymentMethod, orderId: savedOrder.id });
      notify({ type: 'success', title: 'Pedido registrado', message: deliveryType === 'delivery' ? 'A loja vai calcular a entrega e enviar o valor para sua aprovação.' : 'Seu pedido foi enviado para a loja.' });
      clearCart();
      closeCheckout();
    } catch (err) {
      whatsappWindow?.close();
      setOrderError(err.message || 'Não foi possível registrar o pedido.');
      notify({ type: 'error', title: 'Não foi possível registrar o pedido', message: err.message || 'Revise os dados e tente novamente.' });
      console.error('Erro ao finalizar pedido:', err?.code || err?.name || 'erro');
    } finally {
      submitLockRef.current = false;
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
            {orderError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-3 text-sm font-medium text-rose-700">{orderError}</p>}
            {step === 1 && <>
              <section className="space-y-4">
                <div><h3 className="font-semibold text-stone-900">Como vamos receber o pedido?</h3><p className="mt-1 text-sm text-stone-500">Escolha entrega ou retirada no local.</p></div>
                <div className="grid grid-cols-2 gap-3">
                  {[['delivery', 'Entrega', Truck, 'Valor a cotar após o pedido'], ['pickup', 'Retirada', Store, 'Sem cobrança de entrega']].map(([value, label, Icon, detail]) => <button key={value} type="button" onClick={() => setDeliveryType(value)} className={`flex items-center gap-3 rounded-xl border p-3 text-left ${deliveryType === value ? 'border-primary bg-primary/5' : 'border-stone-200 hover:bg-stone-50'}`}><Icon className={`h-5 w-5 ${deliveryType === value ? 'text-primary' : 'text-stone-500'}`} /><span><span className="block text-sm font-medium text-stone-800">{label}</span><span className="text-xs text-stone-500">{detail}</span></span></button>)}
                </div>
              </section>
              <section className="space-y-4 border-t border-stone-100 pt-5">
                <h3 className="font-semibold text-stone-900">Seus dados</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <CheckoutField label="Nome de exibição" field="name" value={formData.name} onChange={(value) => change('name', value)} error={formErrors.name} inputClass={`${inputClass('name')} bg-stone-50`} autoComplete="name" readOnly placeholder="Seu nome" />
                  <CheckoutField label="Telefone / WhatsApp *" field="phone" type="tel" value={formData.phone} onChange={(value) => change('phone', value)} error={formErrors.phone} inputClass={inputClass('phone')} autoComplete="tel" placeholder="(11) 99999-9999" />
                </div>
              </section>
              {deliveryType === 'delivery' && <section className="space-y-4 border-t border-stone-100 pt-5">
                <div><h3 className="font-semibold text-stone-900">Endereço de entrega</h3><p className="mt-1 text-sm text-stone-500">Escolha um endereço salvo ou informe outro. </p></div>
                {addresses.length > 0 && <label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Usar endereço salvo</span><select value={selectedAddressId} onChange={(event) => selectSavedAddress(event.target.value)} className="min-h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-800"><option value="new">Informar outro endereço</option>{addresses.map((address) => <option key={address.id} value={address.id}>{address.label || 'Endereço'} — {address.street}, {address.number} · {address.neighborhood}</option>)}</select></label>}
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">CEP *</span><span className="relative block"><input value={formData.cep} maxLength={9} inputMode="numeric" placeholder="00000-000" onBlur={handleCEPBlur} onChange={(event) => change('cep', formatCEP(event.target.value))} className={inputClass('cep')} />{loadingCEP && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-stone-500" />}</span>{formErrors.cep && <span className="mt-1 block text-xs text-rose-600">{formErrors.cep}</span>}</label>
                  <div className="flex items-end"><button type="button" onClick={handleCEPBlur} disabled={loadingCEP} className="h-[42px] w-full rounded-lg border border-stone-200 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50">Buscar CEP</button></div>
                  <div className="hidden sm:block" />
                </div>
                {cepError && <p className="text-xs text-accent-hover">{cepError}</p>}
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
                <label className="flex min-h-11 items-center gap-2 rounded-lg bg-primary-light/40 px-3 text-xs font-medium text-stone-700"><input type="checkbox" checked={saveAddressForNext} onChange={(event) => setSaveAddressForNext(event.target.checked)} />Salvar este endereço para os próximos pedidos</label>
              </section>}
              <section className="rounded-xl bg-stone-50 p-4"><div className="flex items-center justify-between"><h3 className="font-medium text-stone-800">Seu pedido</h3><span className="text-sm text-stone-500">{items.reduce((sum, item) => sum + item.quantity, 0)} itens</span></div><div className="mt-3 space-y-2">{items.map((item) => <div key={item.cartKey} className="flex justify-between gap-3 text-sm"><span className="text-stone-600">{item.quantity}x {item.product.name}</span><span className="shrink-0 text-stone-700">{formatCurrency(item.totalPrice)}</span></div>)}</div><div className="mt-3 space-y-2 border-t border-stone-200 pt-3 text-sm"><div className="flex justify-between text-stone-500"><span>Subtotal dos produtos</span><span>{formatCurrency(subtotal)}</span></div><div className="rounded-lg border border-primary/10 bg-white px-3 py-2 text-xs leading-relaxed text-stone-600">{deliveryType === 'pickup' ? 'Retirada no local. O valor acima é o total do pedido.' : 'O valor da entrega será calculado pela loja e enviado para sua aprovação antes da confirmação.'}</div></div></section>
            </>}

            {step === 2 && <>
              <div><h3 className="font-semibold text-stone-900">Como deseja pagar?</h3><p className="mt-1 text-sm text-stone-500">O pagamento será combinado na entrega ou retirada.</p></div>
              <div className="grid gap-3 sm:grid-cols-2"><PaymentOption value="money" label="Dinheiro" icon={Banknote} selected={formData.paymentMethod === 'money'} onSelect={(value) => change('paymentMethod', value)} /><PaymentOption value="pix" label="Pix" icon={QrCode} selected={formData.paymentMethod === 'pix'} onSelect={(value) => change('paymentMethod', value)} /><PaymentOption value="credit" label="Cartão de crédito" icon={CreditCard} selected={formData.paymentMethod === 'credit'} onSelect={(value) => change('paymentMethod', value)} /><PaymentOption value="debit" label="Cartão de débito" icon={CreditCard} selected={formData.paymentMethod === 'debit'} onSelect={(value) => change('paymentMethod', value)} /></div>
              {formData.paymentMethod === 'money' && <section className="space-y-4 rounded-xl bg-stone-50 p-4"><h4 className="text-sm font-semibold text-stone-800">Precisa de troco?</h4><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => change('needsChange', 'nao')} aria-pressed={formData.needsChange === 'nao'} className={`rounded-lg border px-3 py-3 text-sm ${formData.needsChange === 'nao' ? 'border-primary bg-white text-primary' : 'border-stone-200 bg-white text-stone-600'}`}>Não, valor exato</button><button type="button" onClick={() => change('needsChange', 'sim')} aria-pressed={formData.needsChange === 'sim'} className={`rounded-lg border px-3 py-3 text-sm ${formData.needsChange === 'sim' ? 'border-primary bg-white text-primary' : 'border-stone-200 bg-white text-stone-600'}`}>Sim, preciso</button></div>{formData.needsChange === 'sim' && <label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-700">Troco para quanto?</span><span className="flex items-center gap-2"><span className="text-sm text-stone-500">R$</span><input inputMode="decimal" value={formData.changeFor} onChange={(event) => change('changeFor', event.target.value)} placeholder="50,00" className={inputClass('changeFor')} /></span>{formErrors.changeFor && <span className="mt-1 block text-xs text-rose-600">{formErrors.changeFor}</span>}</label>}</section>}
              {formData.paymentMethod === 'pix' && <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600">A chave Pix ({settings.pix.key}) será enviada junto com os dados do pedido.</p>}
              {(formData.paymentMethod === 'credit' || formData.paymentMethod === 'debit') && <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600">O entregador levará a maquininha no momento da entrega.</p>}
              <section className="rounded-xl border border-stone-200 p-4"><div className="flex justify-between text-sm text-stone-500"><span>Subtotal dos produtos</span><span className="font-semibold text-stone-900">{formatCurrency(subtotal)}</span></div><p className="mt-2 text-xs leading-relaxed text-stone-500">{deliveryType === 'delivery' ? 'A entrega será cotada pela loja após o envio. Você poderá aprovar ou recusar o valor.' : 'Retirada no local, sem cobrança de entrega.'}</p></section>
            </>}

            {step === 3 && <>
              <div><h3 className="font-semibold text-stone-900">Confira seu pedido</h3><p className="mt-1 text-sm text-stone-500">Revise os dados antes de enviar pelo WhatsApp.</p></div>
              <section className="space-y-3 rounded-xl bg-stone-50 p-4"><div><h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Cliente</h4><p className="mt-1 text-sm text-stone-800">{formData.name} · {formData.phone}</p></div><div className="border-t border-stone-200 pt-3"><h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{deliveryType === 'delivery' ? 'Endereço' : 'Retirada'}</h4><p className="mt-1 whitespace-pre-line text-sm text-stone-800">{deliveryType === 'delivery' ? `${formData.street}, ${formData.number}${formData.complement ? `, ${formData.complement}` : ''}\n${formData.neighborhood}, ${formData.city} — CEP ${formData.cep}${formData.reference ? `\nReferência: ${formData.reference}` : ''}` : settings.pickupAddress}</p></div><div className="border-t border-stone-200 pt-3"><h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Pagamento</h4><p className="mt-1 text-sm text-stone-800">{paymentLabel}{formData.paymentMethod === 'money' ? formData.needsChange === 'sim' ? ` · Troco para ${formatCurrency(Number(formData.changeFor.replace(',', '.')))} (devolver ${formatCurrency(Number(formData.changeFor.replace(',', '.')) - total)})` : ' · Valor exato' : ''}</p></div></section>
              <section className="rounded-xl border border-stone-200 p-4"><h4 className="mb-3 text-sm font-semibold text-stone-800">Produtos</h4><div className="space-y-4">{items.map((item) => <div key={item.cartKey} className="flex justify-between gap-3 text-sm"><div><p className="font-medium text-stone-800">{item.quantity}x {item.product.name}{item.base ? ` — ${item.base.name}` : ''}</p>{item.extras?.length > 0 && <p className="mt-1 text-xs text-stone-500">Adicionais: {item.extras.map((extra) => extra.name).join(', ')}</p>}{item.notes && <p className="mt-1 text-xs text-stone-500">Observação: {item.notes}</p>}</div><span className="shrink-0 font-medium text-stone-700">{formatCurrency(item.totalPrice)}</span></div>)}</div><label className="mt-4 block border-t border-stone-100 pt-4"><span className="mb-1.5 block text-xs font-medium text-stone-700">Observação para o pedido (opcional)</span><textarea rows={2} value={formData.orderNotes} onChange={(event) => change('orderNotes', event.target.value)} placeholder="Instruções para a entrega..." className={inputClass('orderNotes')} /></label><div className="mt-4 space-y-2 border-t border-stone-100 pt-3 text-sm"><div className="flex justify-between text-stone-500"><span>Subtotal dos produtos</span><span>{formatCurrency(subtotal)}</span></div><div className="rounded-lg bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-600">{deliveryType === 'pickup' ? 'Total na retirada' : 'Entrega a cotar pela loja; o total final será enviado para sua aprovação.'}</div>{deliveryType === 'pickup' && <div className="flex justify-between border-t border-stone-100 pt-3 text-base font-semibold text-stone-900"><span>Total</span><span>{formatCurrency(total)}</span></div>}</div></section>
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

export function formatCurrency(value) {
  if (value === undefined || value === null) return 'R$ 0,00';
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function parseBrazilianCurrency(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const normalized = String(value || '').replace(/R\$|\s/g, '').trim();
  if (!normalized) return NaN;
  const decimal = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized;
  const parsed = Number(decimal);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : NaN;
}

export function formatPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function formatCEP(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

export async function fetchAddressByCEP(cep) {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) {
    throw new Error('CEP deve conter 8 dígitos');
  }

  const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
  if (!response.ok) {
    throw new Error('Falha ao consultar CEP');
  }

  const data = await response.json();
  if (data.erro) {
    throw new Error('CEP não encontrado');
  }

  return {
    street: data.logradouro || '',
    neighborhood: data.bairro || '',
    city: data.localidade || '',
    state: data.uf || '',
  };
}


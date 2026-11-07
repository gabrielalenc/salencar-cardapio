/**
 * CONFIGURAÇÃO CENTRALIZADA DA SALENCAR
 * Altere aqui os dados comerciais, número de WhatsApp, taxas e horários.
 */

export const STORE_CONFIG = {
  name: "Salencar Batidas Artesanais",
  tagline: "Seu momento, seu sabor.",
  whatsappNumber: "5511983626392", // Formato internacional: 55 + DDD + Número
  whatsappFormatted: "(11) 98362-6392",
  instagram: "@salencar.delicias",
  instagramUrl: "https://www.instagram.com/salencar.delicias?cplk=ZDNlZDc0MzIxNw==",

  // Regras de Delivery
  deliveryFee: 6.00,
  freeDeliveryThreshold: 70.00,
  estimatedDeliveryTime: "30 a 45 min",
  minimumOrder: 15.00,

  // Status e Horários
  status: {
    isOpen: true,
    message: "Aberto para pedidos",
    hours: [
      { day: "Segunda-feira", time: "Fechado" },
      { day: "Terça-feira", time: "Fechado" },
      { day: "Quarta-feira", time: "Fechado" },
      { day: "Quinta-feira", time: "A partir das 18h" },
      { day: "Sexta-feira", time: "Durante o dia, até 01h" },
      { day: "Sábado", time: "Durante o dia, até 01h" },
      { day: "Domingo", time: "Durante o dia, até 23h" },
    ]
  },

  // Dados de Pagamento
  pix: {
    key: "contato@salencar.com.br",
    type: "Chave E-mail",
    beneficiary: "Salencar Batidas Artesanais"
  },

  // Endereço de Retirada
  pickupAddress: "Passagem Marima, 56, Conceição, Diadema - SP"
};

/**
 * CONFIGURAÇÃO CENTRALIZADA DA SALENCAR
 * Altere aqui os dados comerciais, número de WhatsApp, taxas e horários.
 */

export const STORE_CONFIG = {
  name: "Salencar Batidas Artesanais",
  tagline: "Seu momento, seu sabor.",
  whatsappNumber: "5511948648947", // Formato internacional: 55 + DDD + Número
  whatsappFormatted: "(11) 94864-8947",
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
    hours: "Segunda a Domingo: 17h às 23h30"
  },

  // Dados de Pagamento
  pix: {
    key: "contato@salencar.com.br",
    type: "Chave E-mail",
    beneficiary: "Salencar Batidas Artesanais"
  },

  // Endereço de Retirada
  pickupAddress: "Rua das Palmeiras, 250 - Centro"
};

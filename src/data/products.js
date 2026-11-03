export const CATEGORIES = [
  { id: "todos", name: "Todos os Produtos", icon: "Sparkles" },
  { id: "batidas", name: "Batidas Artesanais", icon: "Wine" },
  { id: "combos", name: "Combos & Kits", icon: "Layers" },
  { id: "gelos", name: "Gelos & Acessórios", icon: "Snowflake" },
];

export const PRODUCTS = [
  {
    id: "batida-morango",
    name: "Batida de Morango",
    category: "batidas",
    price: 18.90,
    volume: "300 ml",
    image: "/images/batida-morango.jpg",
    tag: "Mais pedido",
    description: "Batida cremosa preparada com morangos selecionados, leite condensado e calda artesanal de morango.",
    ingredients: "Morango in natura, calda artesanal, leite condensado, leite integral e base selecionada.",
    bases: [
      { id: "vodka", name: "Vodka Premium (Tradicional)", price: 0 },
      { id: "cachaca", name: "Cachaça Prata Artesanal", price: 0 },
      { id: "sem-alcool", name: "Sem Álcool", price: 0 }
    ],
    extras: [
      { id: "calda-morango", name: "Calda extra de morango na borda", price: 2.50 },
      { id: "leite-condensado", name: "Dose extra de leite condensado", price: 2.00 },
      { id: "gelo-coco", name: "Gelo artesanal de água de coco", price: 3.00 }
    ]
  },
  {
    id: "batida-maracuja",
    name: "Batida de Maracujá",
    category: "batidas",
    price: 18.90,
    volume: "300 ml",
    image: "/images/batida-maracuja.jpg",
    tag: "Destaque",
    description: "Equilíbrio entre a acidez natural da polpa com sementes e a doçura aveludada do leite condensado.",
    ingredients: "Polpa fresca de maracujá com sementes, leite condensado, creme de leite e base especial.",
    bases: [
      { id: "vodka", name: "Vodka Premium (Tradicional)", price: 0 },
      { id: "cachaca", name: "Cachaça Prata Artesanal", price: 0 },
      { id: "sem-alcool", name: "Sem Álcool", price: 0 }
    ],
    extras: [
      { id: "calda-maracuja", name: "Polpa extra com sementes", price: 2.50 },
      { id: "leite-condensado", name: "Dose extra de leite condensado", price: 2.00 },
      { id: "gelo-coco", name: "Gelo artesanal de água de coco", price: 3.00 }
    ]
  },
  {
    id: "batida-espanhola",
    name: "Batida Espanhola",
    category: "batidas",
    price: 19.90,
    volume: "300 ml",
    image: "/images/batida-espanhola.jpg",
    tag: "Clássica",
    description: "Receita clássica com vinho tinto nobre batido com abacaxi e leite condensado. Textura densa e encorpada.",
    ingredients: "Vinho tinto selecionado suave, polpa de abacaxi fresco e leite condensado.",
    bases: [
      { id: "vinho-suave", name: "Vinho Tinto Suave (Tradicional)", price: 0 },
      { id: "vinho-seco", name: "Vinho Tinto Seco", price: 0 }
    ],
    extras: [
      { id: "dose-abacaxi", name: "Pedaços extras de abacaxi", price: 2.50 },
      { id: "leite-condensado", name: "Dose extra de leite condensado", price: 2.00 },
      { id: "copo-acrilico", name: "Copo oficial Salencar 500ml", price: 5.00 }
    ]
  },
  {
    id: "combo-trio-tropical",
    name: "Combo Trio Salencar",
    category: "combos",
    price: 52.90,
    volume: "3 x 300 ml",
    image: "/images/banner-hero.jpg",
    tag: "Combo 3 unidades",
    description: "Experimente os três sabores principais: 1 Batida de Morango, 1 Batida de Maracujá e 1 Batida Espanhola.",
    ingredients: "Três garrafas individuais de 300ml prontas para consumo imediato, bem geladas.",
    bases: [
      { id: "padrao", name: "Mix dos 3 sabores (1 Morango, 1 Maracujá, 1 Espanhola)", price: 0 },
      { id: "escolha-livre", name: "Personalizar sabores (informar nas observações)", price: 0 }
    ],
    extras: [
      { id: "gelos-duplos", name: "2x Gelo artesanal de água de coco", price: 5.00 },
      { id: "dois-copos", name: "2x Copos oficiais Salencar 500ml", price: 9.00 }
    ]
  },
  {
    id: "combo-dupla-perfeita",
    name: "Combo Dupla de Batidas",
    category: "combos",
    price: 35.90,
    volume: "2 x 300 ml",
    image: "/images/batida-maracuja.jpg",
    tag: "Combo 2 unidades",
    description: "Duas garrafas artesanais de 300ml geladas. Escolha os dois sabores de sua preferência.",
    ingredients: "Duas garrafas individuais de 300ml.",
    bases: [
      { id: "morango-maracuja", name: "1 Morango + 1 Maracujá", price: 0 },
      { id: "morango-espanhola", name: "1 Morango + 1 Espanhola", price: 1.00 },
      { id: "maracuja-espanhola", name: "1 Maracujá + 1 Espanhola", price: 1.00 },
      { id: "dois-morangos", name: "2 Morangos", price: 0 },
      { id: "dois-maracujas", name: "2 Maracujás", price: 0 }
    ],
    extras: [
      { id: "gelo-coco", name: "Gelo artesanal de água de coco", price: 3.00 },
      { id: "copo-acrilico", name: "Copo oficial Salencar 500ml", price: 5.00 }
    ]
  },
  {
    id: "combo-galera-festa",
    name: "Combo Quatro Unidades",
    category: "combos",
    price: 69.90,
    volume: "4 x 300 ml",
    image: "/images/banner-hero.jpg",
    tag: "Combo 4 unidades",
    description: "Quatro garrafas de 300ml para compartilhar. Ideal para encontros, confraternizações e finais de semana.",
    ingredients: "Quatro garrafas individuais de 300ml.",
    bases: [
      { id: "sortido-salencar", name: "Seleção da casa (2 Morangos, 1 Maracujá, 1 Espanhola)", price: 0 },
      { id: "custom-observacao", name: "Personalizado (especificar nas observações)", price: 0 }
    ],
    extras: [
      { id: "trio-gelos", name: "3x Gelo artesanal de água de coco", price: 7.50 },
      { id: "sacola-termica", name: "Embalagem térmica protetora", price: 6.00 }
    ]
  },
  {
    id: "gelo-coco-saborizado",
    name: "Gelo Artesanal de Água de Coco",
    category: "gelos",
    price: 3.50,
    volume: "200 g",
    image: "/images/batida-maracuja.jpg",
    tag: "Acompanhamento",
    description: "Gelo produzido a partir de 100% água de coco natural. Mantém a bebida gelada sem diluir o sabor.",
    ingredients: "Água de coco natural pasteurizada.",
    bases: [
      { id: "coco-puro", name: "Água de coco natural pura", price: 0 },
      { id: "coco-maracuja", name: "Água de coco com polpa de maracujá", price: 0.50 }
    ],
    extras: []
  },
  {
    id: "copo-salencar-500",
    name: "Copo Oficial Salencar 500ml",
    category: "gelos",
    price: 5.90,
    volume: "500 ml",
    image: "/images/logo.jpg",
    tag: "Acessório",
    description: "Copo acrílico reutilizável com estampa oficial Salencar. Resistente, seguro e livre de BPA.",
    ingredients: "Acrílico alimentar de alta resistência.",
    bases: [
      { id: "unidade", name: "Unidade individual (500ml)", price: 0 }
    ],
    extras: []
  }
];

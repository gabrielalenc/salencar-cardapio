export const CATEGORIES = [
  { id: "todos", name: "Todos os Produtos", icon: "Sparkles" },
  { id: "batidas", name: "Batidas Artesanais", icon: "Wine" },
  { id: "combos", name: "Combos & Kits", icon: "Layers" },
];

const baseComAlcool = { id: "com-alcool", name: "Com álcool", price: 0 };
const duplaFlavorOptions = [
  { id: "morango", name: "Morango", image: "/images/batida-morango.jpg" },
  { id: "morango-creme-avela", name: "Morango com creme de avelã", image: "/images/batida-morango.jpg" },
  { id: "maracuja", name: "Maracujá", image: "/images/batida-maracuja.jpg" },
  { id: "maracuja-creme-avela", name: "Maracujá com creme de avelã", image: "/images/batida-maracuja.jpg" },
  { id: "limao", name: "Limão", image: "/images/batida-limao.jpg" },
  { id: "limao-creme-avela", name: "Limão com creme de avelã", image: "/images/batida-limao-creme-avela.jpg" },
];

const duplaBases = duplaFlavorOptions.flatMap((first, firstIndex) =>
  duplaFlavorOptions.slice(firstIndex).map((second) => {
    const sameFlavor = first.id === second.id;
    return {
      id: `dupla-${first.id}--${second.id}`,
      name: sameFlavor ? `2x ${first.name}` : `${first.name} + ${second.name}`,
      price: 0,
    };
  })
);

const batida = ({ id, sabor, tipo, price, image, bases = [baseComAlcool] }) => ({
  id,
  name: `Batida de ${sabor}${tipo ? ` ${tipo}` : ""}`,
  category: "batidas",
  price,
  volume: "300 ml",
  image,
  description: `Batida alcoólica artesanal de ${sabor.toLowerCase()}, preparada e servida bem gelada${tipo === "com creme de avelã" ? ", com creme de avelã" : ""}.`,
  ingredients: `Batida alcoólica artesanal de ${sabor.toLowerCase()}${tipo === "com creme de avelã" ? " com creme de avelã" : ""}.`,
  bases,
  extras: sabor === "Morango"
    ? [
        { id: "calda-morango", name: "Calda extra de morango na borda", price: 2.5 },
        { id: "leite-condensado", name: "Dose extra de leite condensado", price: 2 },
      ]
    : sabor === "Maracujá"
      ? [
          { id: "calda-maracuja", name: "Polpa extra com sementes", price: 2.5 },
          { id: "leite-condensado", name: "Dose extra de leite condensado", price: 2 },
        ]
      : [],
});

export const PRODUCTS = [
  batida({ id: "morango-com-alcool", sabor: "Morango", tipo: "com álcool", price: 15, image: "/images/batida-morango.jpg" }),
  batida({ id: "maracuja-com-alcool", sabor: "Maracujá", tipo: "com álcool", price: 15, image: "/images/batida-maracuja.jpg" }),
  batida({ id: "limao-com-alcool", sabor: "Limão", tipo: "com álcool", price: 15, image: "/images/batida-limao.jpg" }),
  batida({ id: "morango-creme-avela", sabor: "Morango", tipo: "com creme de avelã", price: 15, image: "/images/batida-morango.jpg" }),
  batida({ id: "maracuja-creme-avela", sabor: "Maracujá", tipo: "com creme de avelã", price: 15, image: "/images/batida-maracuja.jpg" }),
  batida({ id: "limao-creme-avela", sabor: "Limão", tipo: "com creme de avelã", price: 15, image: "/images/batida-limao-creme-avela.jpg" }),
  {
    id: "batida-espanhola",
    name: "Batida Espanhola",
    category: "batidas",
    price: 19.9,
    volume: "300 ml",
    image: "/images/batida-espanhola.jpg",
    tag: "Clássica",
    description: "Receita clássica com vinho tinto, abacaxi e leite condensado.",
    ingredients: "Vinho tinto, abacaxi e leite condensado.",
    bases: [{ id: "vinho-suave", name: "Vinho tinto suave", price: 0 }, { id: "vinho-seco", name: "Vinho tinto seco", price: 0 }],
    extras: [
      { id: "dose-abacaxi", name: "Pedaços extras de abacaxi", price: 2.5 },
      { id: "leite-condensado", name: "Dose extra de leite condensado", price: 2 },
    ],
  },
  {
    id: "combo-2-batidas-alcoolicas",
    name: "Duplas de Batidas",
    category: "combos",
    price: 25,
    volume: "2 x 300 ml",
    image: "/images/header-batidas.png",
    tag: "2 por R$ 25,00",
    description: "Monte sua dupla com duas batidas alcoólicas. Combine morango, maracujá ou limão, tradicionais ou com creme de avelã.",
    ingredients: "Duas batidas alcoólicas à escolha: morango, maracujá ou limão, com ou sem creme de avelã.",
    bases: duplaBases,
    pairOptions: duplaFlavorOptions,
    extras: [],
    requiresCustomization: true,
  },
];

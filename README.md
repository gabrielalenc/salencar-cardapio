# Salencar Batidas Artesanais - E-commerce de Delivery 🍹🌴

Sistema completo de delivery web e mobile-first desenvolvido sob medida para a marca **Salencar**, inspirado na praticidade e estrutura da plataforma MenuDino, porém com identidade visual própria, tropical, moderna e de alto padrão de conversão.

---

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos
- Node.js (versão 18 ou superior)
- NPM ou Yarn

### 2. Instalação e Inicialização
```bash
# Instalar dependências (caso seja clonado em outro ambiente)
npm install

# Iniciar o servidor de desenvolvimento
npm run dev

# Gerar build otimizada de produção
npm run build
```

O site estará disponível em `http://localhost:5173/`.

---

## ⚙️ Configurações Centralizadas da Loja

Todas as configurações comerciais estão centralizadas em um único arquivo de fácil manutenção:
👉 [`src/config/storeConfig.js`](file:///c:/Users/alenc/Documents/salencar%20cardapio/src/config/storeConfig.js)

Lá você pode alterar com rapidez:
- **Número do WhatsApp comercial** (ex: `5511999999999`)
- **Taxa de entrega** (ex: R$ 6,00)
- **Valor para Frete Grátis** (ex: R$ 70,00)
- **Tempo estimado de entrega** (ex: `30 - 45 min`)
- **Chave Pix** e favorecido
- **Horário de funcionamento** e endereço de retirada no balcão
- **Link do Instagram**

---

## 🍹 Produtos e Imagens Reais

O catálogo de produtos está em:
👉 [`src/data/products.js`](file:///c:/Users/alenc/Documents/salencar%20cardapio/src/data/products.js)

As imagens reais fornecidas estão salvas com resolução total em `public/images/`:
- `public/images/logo.jpg` - Logomarca oficial circular da Salencar
- `public/images/batida-morango.jpg` - Garrafa artesanal de Morango
- `public/images/batida-maracuja.jpg` - Garrafa artesanal de Maracujá
- `public/images/batida-espanhola.jpg` - Garrafa artesanal Espanhola

---

## ✨ Funcionalidades Principais Implementadas

1. **Identidade Visual Tropical & Moderna:**
   - Paleta com verde floresta (`#0b3d2e`), dourado/âmbar tropical (`#f59e0b`), vermelho morango e tons suaves de creme.
   - Tipografia premium: *Outfit* para títulos e *Plus Jakarta Sans* para leitura confortável.
   - Cards com cantos arredondados, sombras suaves e animações refinadas.

2. **Banner Principal:**
   - Vitrine das garrafas reais da Salencar.
   - Chamadas comerciais de alta conversão.
   - Badges de qualidade: "Chega Gelada", "Frutas Frescas", "100% Artesanal".

3. **Navegação & Busca Instantânea:**
   - Barra de pesquisa com filtro em tempo real por nome, ingredientes ou descrição.
   - Categorias com contagem de produtos: *Todos*, *Batidas Artesanais*, *Combos & Kits*, *Gelos & Acessórios*.

4. **Modal de Detalhes do Produto:**
   - Foto ampliada em alta definição.
   - Seleção obrigatória de base: *Vodka Premium*, *Cachaça Artesanal*, ou *Sem Álcool (Kids)*.
   - Seleção de adicionais: *Calda Extra na Borda*, *Dose de Leite Condensado*, *Gelo Especial de Água de Coco*.
   - Campo de observações com contador de caracteres.
   - Seletor de quantidade com recálculo automático em tempo real.

5. **Carrinho de Compras Interativo:**
   - Gaveta lateral deslizante (*slide-over*) com persistência via `localStorage`.
   - **Barra de progresso de frete grátis:** gamificação que incentiva o cliente a atingir o valor mínimo para frete grátis.
   - Alteração de quantidades (+/-), remoção individual e limpeza completa.

6. **Checkout Completo & Integrado:**
   - Opção de **Entrega (Delivery)** ou **Retirada no Local** (com taxa zero).
   - Dados de contato com máscara automática de telefone WhatsApp `(XX) 9XXXX-XXXX`.
   - **Busca automática de CEP via ViaCEP**, preenchendo rua, bairro e cidade instantaneamente.
   - Formas de pagamento:
     - **Pix:** exibe a chave Pix na tela e adiciona as instruções ao pedido.
     - **Dinheiro:** pergunta se precisa de troco e calcula automaticamente o troco que o motoboy deve levar.
     - **Cartão de Crédito ou Débito:** avisa sobre a maquininha na entrega.

7. **Integração Real com WhatsApp (wa.me):**
   - Monta automaticamente o texto padronizado conforme o formato exigido:
     - Dados do cliente
     - Produtos detalhados com quantidade, base, adicionais e valor
     - Subtotal, Taxa de entrega e Total
     - Endereço completo com referências
     - Forma de pagamento e troco
     - Observações
   - Abre a conversa oficial no WhatsApp via link direto do WhatsApp Web/App (`https://wa.me/...`).
   - Dispara efeito de confetes na tela e exibe a tela de confirmação com botão de cópia de segurança.

8. **Experiência Mobile First:**
   - Barra flutuante de sacola no rodapé para smartphones (*App-like*).
   - Navegação por toque com botões amplos e sem rolagem horizontal indesejada.


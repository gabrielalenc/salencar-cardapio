# Configuração do Supabase para Salencar

O frontend já usa Supabase Auth e as tabelas protegidas por RLS para sessões, perfis, endereços, preferências de pagamento e pedidos. As contas demonstrativas e pedidos fictícios continuam isolados; credenciais, sessões antigas e pedidos locais não são importados nem tratados como identidade real.

## 1. Criar o projeto e aplicar o banco

1. Crie um projeto no [Supabase](https://supabase.com/dashboard).
2. Abra **SQL Editor → New query**, cole o conteúdo de `supabase/migrations/20261107000000_customer_accounts_orders.sql` e execute.
3. Confira em **Table Editor** se foram criadas `profiles`, `addresses`, `customer_preferences`, `orders` e `order_items` e se RLS está ativa.

A função `create_customer_order` grava o pedido e todos os itens em uma transação. Clientes só leem seus pedidos/endereço/perfil e não podem alterar `profiles.role`; administradores são determinados pelo banco.

## 2. Criar a conta administrativa

A conta `admin@salencar.com` que existia no projeto anterior era demonstrativa e não pode ser convertida com segurança, pois sua senha era validada no navegador. Crie ou convide esse usuário em **Authentication → Users**, confirme o e-mail e defina uma senha nova. Então execute uma vez no SQL Editor:

```sql
update public.profiles p
set role = 'admin', updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = 'admin@salencar.com'
  and u.email_confirmed_at is not null;
```

Se o usuário já existia e estava confirmado antes de aplicar a migration, a migration o promove automaticamente. Somente operadores do projeto Supabase devem executar esse SQL; usuários autenticados não recebem permissão para mudar seu próprio papel.

## 3. E-mail e Google OAuth

Em **Authentication → URL Configuration**, configure:

- **Site URL** para a origem de produção da Vercel, por exemplo `https://salencar.vercel.app`.
- **Redirect URLs** com a origem de produção e as origens de desenvolvimento que você usa, por exemplo `http://localhost:5173/**` e `https://salencar.vercel.app/**`.
- Em **Authentication → Providers → Email**, mantenha a confirmação de e-mail ativa e personalize o modelo de confirmação, se desejar.

Para Google, em **Authentication → Providers → Google**, ative o provedor e informe o OAuth Client ID e Client Secret emitidos pelo Google Cloud. No Google Cloud Console, configure o OAuth consent screen, adicione os domínios autorizados e cadastre como redirect URI autorizado o endereço de callback exibido pelo Supabase, no formato `https://cgcounpiaiqgfilybbgf.supabase.co/auth/v1/callback`. Não coloque o Client Secret ou qualquer `service_role` no frontend.

## 4. Vercel e desenvolvimento local

No painel da Vercel, adicione em **Settings → Environment Variables**:

- `vite_supabase_url`: Project URL de **Project Settings → API**.
- `vite_supabase_anon_key`: publishable key (ou anon key legada) de **Project Settings → API**.

Adicione-as aos ambientes Production, Preview e Development conforme necessário e faça novo deploy. O Vite expõe os nomes em minúsculas com o prefixo `vite_supabase_`. Para desenvolvimento local, copie `.env.example` para `.env.local` e preencha os mesmos dois valores. Essas chaves públicas são protegidas por RLS; nunca adicione a `service_role` ao frontend.

## 5. Dados locais antigos

Os dados de exemplo continuam em `localStorage` separados dos dados reais. Contas locais e sessões antigas não são migradas porque não há como verificar suas senhas ou provar a titularidade. Pedidos locais tampouco são enviados automaticamente: apesar do e-mail salvo, o navegador não é uma fonte confiável para estabelecer vínculo com uma conta autenticada. O conteúdo existente não é apagado pelo código novo. Para preservar pedidos históricos em produção, revise-os e importe-os por um processo administrativo no Supabase após confirmar a identidade e os valores.

## 6. Verificação pós-configuração

Depois da configuração, teste confirmação e login por e-mail, OAuth Google, redefinição de senha, persistência após recarregar, perfil e endereço, dois pedidos consecutivos, acompanhamento como cliente e mudança de status como administrador. A implementação pode ser compilada sem credenciais; esses testes de ponta a ponta precisam de um projeto Supabase e credenciais OAuth reais.

# Configuração do Supabase para Salencar

O frontend já usa Supabase Auth e as tabelas protegidas por RLS para sessões, perfis, endereços, preferências de pagamento e pedidos. As contas demonstrativas e pedidos fictícios continuam isolados; credenciais, sessões antigas e pedidos locais não são importados nem tratados como identidade real.

## 1. Criar o projeto e aplicar o banco

1. Crie um projeto no [Supabase](https://supabase.com/dashboard).
2. Abra **SQL Editor → New query**, cole o conteúdo de `supabase/migrations/20261107000000_customer_accounts_orders.sql` e execute.
3. Execute também `supabase/migrations/20261107120000_ensure_customer_profile.sql` e `supabase/migrations/20261107130000_admin_access_hardening.sql`, nesta ordem.
4. Confira em **Table Editor** se foram criadas `profiles`, `addresses`, `customer_preferences`, `orders` e `order_items` e se RLS está ativa.

Se a migration base já foi aplicada no projeto, não a execute novamente; aplique apenas as migrations posteriores que ainda não constarem no histórico do Supabase.

A função `create_customer_order` grava o pedido e todos os itens em uma transação. Clientes só leem seus pedidos/endereço/perfil e não podem alterar `profiles.role`; administradores são determinados pelo banco.

## 2. Criar a conta administrativa

Crie seu usuário administrativo em **Authentication → Users**, com seu próprio e-mail, senha forte e e-mail confirmado. A migration de hardening remove a promoção por e-mail da versão antiga; depois de executá-la, copie o UUID do administrador e execute a concessão manual abaixo no SQL Editor como operador do projeto:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where id = 'UUID-DO-USUARIO-CONFIRMADO'
  and exists (
    select 1 from auth.users u
    where u.id = profiles.id and u.email_confirmed_at is not null
  );
```

Confirme que a consulta atualizou exatamente uma linha. O cadastro público cria somente perfis `customer`; nenhum e-mail é promovido automaticamente. Somente operadores do projeto Supabase podem executar essa alteração, e as permissões SQL/RLS não permitem que usuários autenticados mudem `profiles.role`.

Depois do deploy, abra `https://SEU-DOMINIO/admin` ou diretamente `https://SEU-DOMINIO/admin/login`. O login do painel aceita somente e-mail e senha do Supabase Auth e consulta `is_admin()` no banco antes de abrir a interface. O login Google dos clientes continua disponível no fluxo normal do site.

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

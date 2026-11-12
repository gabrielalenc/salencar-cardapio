# Configuração do Supabase para Salencar

O frontend usa Supabase Auth e tabelas protegidas por RLS para perfis, endereços, preferências de pagamento, catálogo e pedidos. O painel administrativo consulta somente registros reais do Supabase; dados locais antigos não são importados nem tratados como identidade real.

## 1. Criar o projeto e aplicar o banco

1. Crie um projeto no [Supabase](https://supabase.com/dashboard).
2. Abra **SQL Editor → New query**, cole o conteúdo de `supabase/migrations/20261107000000_customer_accounts_orders.sql` e execute.
3. Execute também, nesta ordem, `supabase/migrations/20261107120000_ensure_customer_profile.sql`, `supabase/migrations/20261107130000_admin_access_hardening.sql`, `supabase/migrations/20261107150000_delivery_quote_flow.sql`, `supabase/migrations/20261110160000_authoritative_catalog_orders.sql` e `supabase/migrations/20261111120000_admin_dashboard_inventory.sql`.
4. Confira em **Table Editor** se foram criadas `profiles`, `addresses`, `customer_preferences`, `catalog_products`, `inventory_settings`, `inventory_items`, `orders` e `order_items` e se RLS está ativa.

Se a migration base já foi aplicada no projeto, não a execute novamente; aplique apenas as migrations posteriores que ainda não constarem no histórico do Supabase.

A função `create_customer_order` grava o pedido e todos os itens em uma transação. A migration mais recente cria um catálogo protegido por RLS e recalcula nome, imagem, opção, adicionais e preços no banco; os valores enviados pelo navegador não definem o total salvo. A tabela permite consulta pública dos dados do cardápio e somente administradores podem alterar preços ou ativar/desativar produtos. Clientes só leem seus pedidos/endereço/perfil e não podem alterar `profiles.role`; administradores são determinados pelo banco.

A migration `20261111120000_admin_dashboard_inventory.sql` adiciona custo privado por produto para estimativas de lucro, disponibilidade do cardápio, estoque persistido e funções administrativas protegidas. O Dashboard usa apenas pedidos reais do Supabase; o lucro fica indisponível enquanto faltar custo de algum produto vendido no período. O estoque começa em zero e o controle automático começa desligado: informe os saldos reais no painel antes de ativar a baixa automática. Quando ativado, a baixa ocorre uma única vez na confirmação, é validada contra pedidos simultâneos e é devolvida uma única vez se um pedido confirmado for cancelado.

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

Depois do deploy, abra `https://SEU-DOMINIO/admin` ou diretamente `https://SEU-DOMINIO/admin/login`. O login do painel aceita somente e-mail e senha do Supabase Auth e consulta `is_admin()` no banco antes de abrir a interface. No site, os clientes podem usar Google ou e-mail e senha; cadastro e recuperação de senha usam códigos OTP do Supabase.

## 3. E-mail e Google OAuth

Em **Authentication → URL Configuration**, configure:

- **Site URL** para a origem de produção da Vercel, por exemplo `https://salencar.vercel.app`.
- **Redirect URLs** com a origem de produção e as origens de desenvolvimento que você usa, por exemplo `http://localhost:5173/**` e `https://salencar.vercel.app/**`.
- Em **Authentication → Providers → Email**, mantenha **Confirm email** ativo. No template **Confirm signup**, inclua `{{ .Token }}` para enviar o código de 6 dígitos utilizado pelo cadastro; a aplicação valida esse código com `verifyOtp` do tipo `signup`. No template **Reset Password**, inclua `{{ .Token }}` para o código de recuperação, validado com o tipo `recovery`. O login normal usa e-mail e senha, sem OTP em cada entrada.
- Configure o SMTP de envio em **Authentication → SMTP Settings** (o nome/local da opção pode variar no dashboard). O SMTP integrado do Supabase é apenas para testes: atualmente envia somente para endereços da equipe do projeto e tem limite baixo. Para clientes reais, configure um provedor SMTP externo e revise os limites de envio em **Authentication → Rate Limits**. Não é necessário Twilio nem configuração de SMS.

A remoção do login por telefone é somente do fluxo do site: nenhuma migration apaga usuários de `auth.users`, perfis, telefones salvos ou pedidos. Contas existentes com e-mail e senha continuam usando esse login. Contas antigas que só tenham telefone precisam de recuperação de identidade e associação administrativa verificada de e-mail antes que o titular possa entrar sem SMS. Não exclua essas contas nem os pedidos associados.

Para Google, em **Authentication → Providers → Google**, ative o provedor e informe o OAuth Client ID e Client Secret emitidos pelo Google Cloud. No Google Cloud Console, configure o OAuth consent screen, adicione os domínios autorizados e cadastre como redirect URI autorizado o endereço de callback exibido pelo Supabase, no formato `https://cgcounpiaiqgfilybbgf.supabase.co/auth/v1/callback`. Não coloque o Client Secret ou qualquer `service_role` no frontend.

## 4. Vercel e desenvolvimento local

No painel da Vercel, adicione em **Settings → Environment Variables**:

- `vite_supabase_url`: Project URL de **Project Settings → API**.
- `vite_supabase_anon_key`: publishable key (ou anon key legada) de **Project Settings → API**.

Adicione-as aos ambientes Production, Preview e Development conforme necessário e faça novo deploy. A configuração do Vite embute explicitamente somente essas duas variáveis; não coloque outras variáveis com prefixo `vite_supabase_` esperando que permaneçam privadas. Para desenvolvimento local, copie `.env.example` para `.env.local` e preencha os mesmos dois valores. Essas chaves públicas são protegidas por RLS; nunca adicione a `service_role` ao frontend.

O arquivo `vercel.json` define CSP e cabeçalhos HTTP de segurança para a aplicação. Depois do deploy, verifique no navegador se Supabase, Google Fonts, Google Maps e ViaCEP continuam carregando e se os cabeçalhos estão presentes na resposta de produção.

## 5. Dados locais antigos

Os dados de exemplo continuam em `localStorage` separados dos dados reais. Contas locais e sessões antigas não são migradas porque não há como verificar suas senhas ou provar a titularidade. Pedidos locais tampouco são enviados automaticamente: apesar do e-mail salvo, o navegador não é uma fonte confiável para estabelecer vínculo com uma conta autenticada. O conteúdo existente não é apagado pelo código novo. Para preservar pedidos históricos em produção, revise-os e importe-os por um processo administrativo no Supabase após confirmar a identidade e os valores.


### Diagnóstico do catálogo seguro

Se o checkout informar que o catálogo não está disponível, confirme primeiro a tabela, a política de leitura e a RPC. Execute esta consulta somente de leitura no SQL Editor do mesmo projeto Supabase configurado na Vercel:

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  count(p.policyname) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname in ('catalog_products', 'orders', 'order_items')
group by c.relname, c.relrowsecurity
order by c.relname;

select count(*) as catalog_product_count
from public.catalog_products;

select
  has_function_privilege('authenticated', 'public.create_customer_order(jsonb,jsonb)', 'EXECUTE') as customer_can_create_order,
  has_function_privilege('anon', 'public.create_customer_order(jsonb,jsonb)', 'EXECUTE') as anonymous_can_create_order;
```

O resultado esperado inclui as três tabelas com `rls_enabled = true`, ao menos uma política para cada uma, produtos no catálogo, `customer_can_create_order = true` e `anonymous_can_create_order = false`. Se `catalog_products` ou a função não existir, aplique `supabase/migrations/20261110160000_authoritative_catalog_orders.sql` integralmente no SQL Editor. Essa migration usa `if not exists`, recria suas políticas por nome e semeia apenas IDs ausentes; ela não apaga pedidos nem sobrescreve os preços já cadastrados. Se a tabela existir e estiver vazia, revise os dados do cardápio no banco antes de receber pedidos.
## 6. Verificação pós-configuração

Depois da configuração, teste cadastro por e-mail e confirmação OTP, login com senha, recuperação por código OTP, OAuth Google, persistência após recarregar, logout, perfil e endereço, dois pedidos consecutivos, acompanhamento como cliente e mudança de status como administrador. A implementação pode ser compilada sem credenciais; esses testes de ponta a ponta precisam de um projeto Supabase, SMTP funcional e credenciais OAuth reais.

Antes de receber pedidos reais, confirme também:

- A migration `20261110160000_authoritative_catalog_orders.sql` foi aplicada. Ela é necessária para o checkout validado pelo servidor; sem a tabela `catalog_products`, o frontend recusa pedidos.
- Em **Authentication → Rate Limits**, revise os limites de envio de e-mail e OTP; o intervalo padrão entre solicitações OTP é de 60 segundos. Mantenha confirmação de e-mail ativa e configure a senha mínima de acordo com a política do projeto. Ative MFA para as contas de operador do painel Supabase. O login administrativo do site ainda não implementa desafio MFA/AAL2; exigi-lo também no painel Salencar requer completar o fluxo de autenticação do aplicativo.
- A migration `20261111120000_admin_dashboard_inventory.sql` é necessária para as abas de estoque e produtos, custos do Dashboard, cotações exibidas no painel e baixa de estoque no servidor. Preencha as quantidades reais antes de ativar o controle automático; não há saldo de demonstração inserido.
- Os dados operacionais do estabelecimento que ainda vêm de `STORE_CONFIG`/armazenamento local devem ser conferidos no navegador que opera a loja. Eles não são uma configuração compartilhada e confiável entre dispositivos.
- As variáveis e os cabeçalhos configurados em `vercel.json` foram validados localmente, mas precisam ser conferidos na resposta do domínio de produção após o deploy. A configuração real do projeto Vercel não é acessível por este workspace.

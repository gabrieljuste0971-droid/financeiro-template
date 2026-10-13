-- ════════════════════════════════════════════════════════════════════════════
-- Financeiro — tabelas para o adaptador Supabase
--
-- Como usar: abra o SQL Editor do seu projeto Supabase, cole este arquivo
-- inteiro e rode. Pode rodar de novo sem medo: tudo é "if not exists".
--
-- Modelo de acesso: cada linha pertence a um usuário (`user_id`) e a RLS só
-- deixa esse usuário ler e gravar as próprias linhas. É o desenho certo para
-- "cada pessoa com o seu financeiro". Para uma equipe dividir o mesmo caixa,
-- troque `user_id` por um id de organização e ajuste as políticas.
--
-- Os nomes começam com `fin_` para não bater com tabelas que você já tenha.
-- Se renomear, passe os nomes novos em `criarAdaptadorSupabase(supabase, { tabelas })`.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Clientes (o tomador da nota fiscal) ─────────────────────────────────────
create table if not exists public.fin_clientes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome            text not null,
  apelidos        text[] not null default '{}',
  doc_tipo        text not null default 'cnpj' check (doc_tipo in ('cnpj', 'cpf', 'outro')),
  doc             text not null default '',
  -- Só os dígitos de um CPF/CNPJ completo; nulo enquanto incompleto. É a chave
  -- de deduplicação: o mesmo documento não entra duas vezes.
  doc_normalizado text,
  razao_social    text,
  nome_fantasia   text,
  endereco        text,
  cep             text,
  numero          text,
  complemento     text,
  bairro          text,
  cidade          text,
  estado          text,
  criado_em       timestamptz not null default now()
);

create unique index if not exists fin_clientes_doc_unico
  on public.fin_clientes (user_id, doc_normalizado)
  where doc_normalizado is not null;

create index if not exists fin_clientes_user on public.fin_clientes (user_id);

-- ── Contratos (mensalidade de cliente fixo) ─────────────────────────────────
-- Um contrato ativo faz a mensalidade aparecer sozinha todo mês. Desativar
-- (ativo = false) para de gerar e mantém o histórico.
create table if not exists public.fin_contratos (
  cliente_id     uuid primary key references public.fin_clientes (id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  valor          numeric(12, 2) not null default 0,
  dia_vencimento smallint not null default 5 check (dia_vencimento between 1 and 31),
  ativo          boolean not null default true
);

create index if not exists fin_contratos_user on public.fin_contratos (user_id);

-- ── Lançamentos (entradas e saídas) ─────────────────────────────────────────
create table if not exists public.fin_lancamentos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo          text not null check (tipo in ('entrada', 'saida')),
  mes           text not null check (mes ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),  -- 'AAAA-MM'
  descricao     text not null default '',
  categoria     text not null,            -- id da categoria (padroes.js ou criada na tela)
  valor         numeric(12, 2) not null default 0,
  dia           smallint not null default 1 check (dia between 1 and 31),
  pago          boolean not null default false,
  pago_em       date,
  nota_emitida  boolean not null default false,
  cliente_id    uuid references public.fin_clientes (id) on delete set null,
  origem        text,                     -- 'contrato' quando nasceu de uma mensalidade
  serie_id      uuid,                     -- linhas da mesma repetição mensal
  recorrente    boolean not null default false,
  parcela       text check (parcela in ('integral', 'sinal', 'saldo')),
  saldo_quitado boolean not null default false,
  criado_em     timestamptz not null default now()
);

create index if not exists fin_lancamentos_user_mes on public.fin_lancamentos (user_id, mes);
create index if not exists fin_lancamentos_serie on public.fin_lancamentos (serie_id) where serie_id is not null;
create index if not exists fin_lancamentos_cliente on public.fin_lancamentos (cliente_id) where cliente_id is not null;

-- ── Config (uma linha por usuário) ──────────────────────────────────────────
-- Saldo base, meta do mês e tudo que o usuário personaliza pela tela.
create table if not exists public.fin_config (
  user_id            uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  saldo_base         numeric(14, 2) not null default 0,
  meta               numeric(14, 2) not null default 0,
  rotulos            jsonb not null default '{}',   -- apelidos: { "g:fixas": "Custos fixos" }
  ordens             jsonb not null default '{}',   -- ordem das seções: { "entrada": [...] }
  grupos             jsonb not null default '[]',   -- seções criadas pela tela
  categorias         jsonb not null default '[]',   -- categorias criadas pela tela
  naturezas          jsonb not null default '{}',   -- fixa / variável / fora, por seção
  categorias_parcela jsonb not null default '["projeto"]',  -- categorias com 100% / 50%
  atualizado_em      timestamptz not null default now()
);

-- ── Segurança: RLS ──────────────────────────────────────────────────────────
-- Sem estas políticas, qualquer pessoa com a chave pública leria tudo.
alter table public.fin_clientes    enable row level security;
alter table public.fin_contratos   enable row level security;
alter table public.fin_lancamentos enable row level security;
alter table public.fin_config      enable row level security;

drop policy if exists "fin_clientes: dono" on public.fin_clientes;
create policy "fin_clientes: dono" on public.fin_clientes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "fin_contratos: dono" on public.fin_contratos;
create policy "fin_contratos: dono" on public.fin_contratos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "fin_lancamentos: dono" on public.fin_lancamentos;
create policy "fin_lancamentos: dono" on public.fin_lancamentos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "fin_config: dono" on public.fin_config;
create policy "fin_config: dono" on public.fin_config
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

# Financeiro — guia para o Claude

Este repositório é um template de tela de Financeiro (React 18 + Vite 5 + Tailwind 3.4, JavaScript, sem TypeScript). O usuário quer rodar como está ou encaixar a tela no sistema dele. Este arquivo é o que você precisa saber para fazer isso sem quebrar nada.

Todo o código, os comentários e os textos de tela estão em português. Mantenha assim.

## Mapa

```
src/
  marca.js            ← nome, cor, base, logo, fonte. O único arquivo de marca.
  Logo.jsx            ← assinatura horizontal (símbolo + nome) em SVG; nome em currentColor
  assets/simbolo.svg  ← símbolo da marca (topo da tela); public/favicon.svg é a cópia da aba
  App.jsx             ← casca mínima: escolhe o adaptador, tema, cores, faixa de exemplo
  Entrar.jsx          ← login mínimo, só usado no modo Supabase
  demo.js             ← dados fictícios da primeira abertura
  index.css           ← diretivas do Tailwind + fundo/fonte do body
  financeiro/         ← A TELA. Pasta autossuficiente; é o que se leva embora.
    index.js            porta de entrada (exports)
    Financeiro.jsx      a tela inteira (~2.800 linhas, vários componentes internos)
    useFinanceiro.js    estado + escrita otimista em cima de um adaptador
    modelo.js           regras puras: geração de mensalidade, repetição, ordenação, parcela
    padroes.js          seções e categorias padrão ← onde se adapta ao negócio
    documentos.js       máscara e validação de CPF/CNPJ, busca de cliente por texto
    cnpj.js             consulta de CNPJ na BrasilAPI (opcional, falha em silêncio)
    ui.jsx              primitivos: Btn, Campo, TopBar, ToolbarButton, Segmented…
    AreaChart.jsx       gráfico de área em SVG, sem biblioteca
    tema.js             aplicarMarca(), aplicarTema(), escalas de cor, cores salvas do usuário
    PersonalizarAparencia.jsx  botão + diálogo para o usuário trocar logo, cor principal e base; hook useLogo
    financeiro.css      tokens (variáveis CSS) e animações. CSS puro.
    tailwind.preset.js  cores, sombras e tokens que as classes usam
    adaptadores/
      local.js          localStorage
      supabase.js       Supabase (tabelas fin_*)
supabase/schema.sql   ← tabelas e RLS do modo Supabase
public/guia/index.html ← guia de instalação do aluno, servido em /guia (vite.config.js aponta a rota no dev)
```

## Como as peças se ligam

```jsx
const adaptador = criarAdaptadorLocal();        // ou criarAdaptadorSupabase(supabase)
const fin = useFinanceiro(adaptador);           // carrega, guarda estado, grava
<Financeiro {...fin} titulo="Financeiro" />     // a tela só recebe props
```

`Financeiro.jsx` nunca fala com banco. Trocar de backend é trocar o adaptador; a tela e o hook não mudam.

## Contrato do adaptador

Um adaptador é um objeto com estas funções, todas assíncronas. Para ligar em outro backend (API própria, Firebase, Prisma atrás de rotas), copie `adaptadores/local.js` e troque o miolo.

| Função | Faz |
|---|---|
| `carregar()` | Devolve `{ clientes, contratos, lancamentos, config }`. Só contratos ativos. |
| `criarLancamento(l)` | Grava e devolve o lançamento com `id` definitivo. |
| `atualizarLancamento(id, patch)` | Atualiza os campos do patch. |
| `apagarLancamento(id)` | Apaga. |
| `recategorizarLancamentos(deIds, paraId)` | Move todos os lançamentos das categorias `deIds` para `paraId`. |
| `apagarLancamentosDeCategorias(deIds)` | Apaga todos os lançamentos dessas categorias. |
| `definirRecorrenciaSerie(serieId, recorrente)` | Liga ou desliga a repetição de uma série inteira. |
| `salvarContrato(clienteId, { valor, diaVencimento })` | Cria ou atualiza (upsert) e reativa. |
| `desativarContrato(clienteId)` | Soft delete: para de gerar mensalidade. |
| `salvarConfig(patch)` | Mescla o patch na config. |
| `criarCliente(dados)` | Devolve o cliente com `id`. Documento repetido lança `Error` com mensagem de tela. |
| `atualizarCliente(id, patch)` | Atualiza. Mesma regra de documento repetido. |

Erro: lance `Error` com mensagem legível. O hook desfaz a mudança otimista e expõe a mensagem em `fin.erro`.

## Formato dos dados

Valores em reais como número (`1450.5`), nunca centavos. Datas como texto.

```js
lancamento = {
  id, tipo: "entrada" | "saida",
  mes: "2026-10",              // mês de competência
  descricao, categoria,        // id de categoria (padroes.js ou criada na tela)
  valor, dia,                  // dia de vencimento, 1–31
  pago, pagoEm,                // "2026-10-03" ou null
  notaEmitida,
  clienteId,                   // tomador da nota, ou null
  origem,                      // "contrato" quando nasceu de mensalidade; senão null
  serieId, recorrente,         // repetição mensal
  parcela,                     // "integral" | "sinal" | "saldo" | null
  saldoQuitado,                // sinal cuja 2ª metade já foi lançada
}
contrato = { clienteId, valor, diaVencimento }
cliente  = { id, nome, apelidos: [], docTipo: "cnpj" | "cpf" | "outro", doc, endereco, razaoSocial, … }
config   = { saldoBase, meta, rotulos: {}, ordens: {}, grupos: [], categorias: [], naturezas: {}, categoriasParcela: [] }
```

Linhas com id começando em `gen-` são geradas em memória por `lancamentosDoMes()` (mensalidade de contrato, repetição de série). Elas não existem no banco: viram lançamento real quando o usuário edita ou dá baixa. Um adaptador nunca recebe id `gen-`.

## Props de `<Financeiro>`

Todas as que `useFinanceiro` devolve, mais as de apresentação:

| Prop | Tipo | |
|---|---|---|
| `titulo`, `subtitulo` | texto | Cabeçalho. |
| `logo` | URL | Substitui o ícone do cabeçalho. |
| `acoes` | nó React | Botões extras à direita (tema, conta, sair). |

## Marca e tema

- A cor da marca **não** está nas classes. As classes usam `brand-50…950`, `neutro-50…950` e `acc`, que leem variáveis CSS. `aplicarMarca({ cor, corForte, base, fonte })` calcula as escalas e grava as variáveis no `<html>`. Para trocar a marca, edite `src/marca.js`; não faça busca e troca de classes.
- `cor` gera a escala `brand-*`. `base` (um tom bem escuro) gera os cinzas `neutro-*` e as superfícies e textos do tema escuro (`--fundo-0…5`, `--texto-1…4`); sem `base`, vale o cinza neutro de `financeiro.css`. Passar `null` em um dos dois desfaz o que foi aplicado.
- **Personalização pelo usuário**: `<PersonalizarAparencia marca={MARCA} />` vai dentro de `acoes` e deixa trocar logo, cor principal e cor de base. Tudo fica no localStorage (`financeiro_cores`, `financeiro_logo`) e vale por cima da marca. São três ligações, e sem elas a escolha some ao recarregar:
  1. Ponto de entrada: `aplicarMarca(marcaComCores(MARCA, coresSalvas()))` e `if (logoSalvo()) aplicarFavicon(logoSalvo())`.
  2. Quem monta a tela: `const logo = useLogo(MARCA.logo)` e passa `logo` para `<Financeiro>`.
  3. O componente dentro de `acoes`.
  Para tirar o recurso, remova as três e volte a `aplicarMarca(MARCA)` e `logo={MARCA.logo}`.
- O logo enviado vira data URL (imagem reduzida para caber em 256 px; SVG até 150 KB vai inteiro) e só é usado em `<img>` e no favicon. Não injete esse conteúdo como HTML: é o que impede um SVG enviado de executar script.
- Para o logo valer para todos os usuários (e não só no navegador de quem enviou), ele precisa ir para `marca.js` ou para o backend do projeto — o template não sincroniza isso.
- Claro e escuro seguem a classe `dark` no `<html>` (`darkMode: "class"`). `aplicarTema("claro" | "escuro")` troca e lembra no localStorage.
- Verde (`emerald`), rosa (`rose`) e âmbar (`amber`) são semânticos: positivo, negativo, atenção. Não seguem a marca. Não troque.
- `neutro-*` é o cinza da tela. O preset não remapeia nenhuma cor padrão do Tailwind.
- Mexeu em `tailwind.preset.js` ou `tailwind.config.js`? Reinicie o servidor de desenvolvimento: o CSS já gerado não se refaz sozinho.

## Roteiro: integrar em outro projeto

1. **Copie** `src/financeiro/` inteira para o projeto de destino (por exemplo `src/modules/financeiro/` ou `src/financeiro/`). Não copie arquivos soltos: os imports são relativos dentro da pasta.
2. **Dependências**: `react` ≥ 18 e `lucide-react`. Para o modo Supabase, `@supabase/supabase-js`.
3. **Tailwind**: adicione o preset ao `tailwind.config.js` do destino e confira que `content` cobre a pasta copiada.
   ```js
   import financeiro from "./src/financeiro/tailwind.preset.js";
   export default { presets: [financeiro], darkMode: "class", content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"] };
   ```
4. **CSS**: importe `financeiro.css` uma vez, no ponto de entrada (`import "./financeiro/financeiro.css"`).
5. **Marca**: chame `aplicarMarca({ cor: "#…", base: "#…" })` antes de montar o React, com as cores que o projeto já usa (`base` é opcional). Se for manter o botão de personalizar cores, use `aplicarMarca(marcaComCores(marca, coresSalvas()))`.
6. **Dados**: escolha o adaptador.
   - Projeto sem backend: `criarAdaptadorLocal()`.
   - Projeto com Supabase: rode `supabase/schema.sql` e use `criarAdaptadorSupabase(clienteJaAutenticado)`. Não leve `Entrar.jsx` se o projeto já tem login.
   - Outro backend: escreva um adaptador seguindo o contrato acima.
7. **Monte** a tela dentro de um contêiner com altura definida. A tela é `flex-1` e rola por dentro:
   ```jsx
   <div className="flex h-dvh min-h-0 flex-col"><Financeiro {...fin} /></div>
   ```
   Crie o adaptador com `useMemo` (ou fora do componente): adaptador novo a cada render recarrega tudo.
8. **Verifique** no navegador: lançar uma entrada, dar baixa, trocar de mês, abrir Categorias, recarregar a página e conferir que os dados ficaram. Teste claro, escuro e largura de celular.

### Casos especiais

- **Next.js / SSR**: a tela lê `localStorage` e a data de hoje no carregamento do módulo. Carregue só no cliente: `"use client"` no arquivo que importa e `dynamic(() => import("…/financeiro"), { ssr: false })`.
- **Tailwind 4**: o preset está no formato do Tailwind 3. No v4, carregue a config antiga com `@config "./tailwind.config.js";` no CSS principal. Não foi testado neste template; se alguma classe não gerar, porte os valores do preset para `@theme`.
- **Projeto que já tem tabela de clientes**: em vez de `fin_clientes`, passe os nomes em `criarAdaptadorSupabase(supabase, { tabelas: { clientes: "…" } })` e confira se as colunas batem com `CAMPOS_CLIENTE` em `adaptadores/supabase.js`. Se não baterem, ajuste o mapa, não a tela. As chaves estrangeiras de `fin_contratos` e `fin_lancamentos` no `schema.sql` também precisam apontar para a tabela nova.
- **Projeto com TypeScript**: os arquivos `.jsx`/`.js` funcionam com `allowJs`. Não converta para TS sem o usuário pedir.

## Adaptar ao negócio

- Trocar nomes, cores, seções e categorias padrão: `padroes.js`. Trocar só `label` é sempre seguro. Trocar `id` depois que existem lançamentos deixa esses lançamentos órfãos (caem em "Outros").
- Os ids em "Ids estruturais" de `padroes.js` (`SECAO_RECORRENTE`, `CATEGORIA_MENSALIDADE`, `SECAO_RESERVA`) são usados pelas regras. Se renomear a seção de clientes fixos, atualize lá.
- Tirar um painel (notas fiscais, falta 50%): remova o componente do JSX no fim de `Financeiro.jsx` (`<PainelNotas>` / `<PainelParcelas>`) e ajuste a grade em volta. Para desligar só o controle de nota, deixe todas as categorias de entrada em `CATEGORIAS_SEM_NOTA`.

## Cuidados

- Não reescreva `Financeiro.jsx` em vários arquivos nem troque a biblioteca de ícones ou de gráfico sem pedido. A tela é grande de propósito e funciona.
- Não substitua as variáveis CSS por cores fixas. É o que permite trocar a marca.
- Não mexa na regra de `lancamentosDoMes()` sem entender: é ela que evita mensalidade em dobro (contrato × série × lançamento manual).
- Texto de tela começa com maiúscula e fica em português.
- A consulta de CNPJ (`cnpj.js`) chama `brasilapi.com.br`. Se o projeto tiver CSP, libere esse domínio em `connect-src` ou remova a consulta: a tela funciona sem ela.
- O adaptador Supabase exige sessão. Com a RLS do `schema.sql`, sem usuário logado toda leitura volta vazia e toda escrita falha.

## Comandos

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção em dist/
```

Não há suíte de testes automatizados. Depois de mexer, rode o build e confira a tela no navegador.

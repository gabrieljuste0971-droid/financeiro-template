# Financeiro — template

Tela de fechamento financeiro mensal para negócio de serviços: entradas, saídas, clientes fixos, meta, saldo em caixa, fluxo de caixa, fila de notas fiscais e controle de sinal de 50%.

Funciona na hora, sem backend. A marca (cor, logo, fonte, nome) fica em um arquivo só, e quem usa a tela ainda troca logo e cores por um botão.

Vem com a identidade da **Gestão Criativa** aplicada: o símbolo da marca e as duas cores dela em versão suavizada para tela (azul-violeta `#6f6cf6`, base `#0a0b14`). Os tons originais (`#5755ff` e `#000624`) estão nas sugestões de "Personalizar aparência".

## Rodar

```bash
npm install
```

```bash
npm run dev
```

Abre em `http://localhost:5173` com dados de exemplo. A faixa no topo tem **Começar do zero**.

## Deixar com a sua marca

Edite `src/marca.js`:

```js
export const MARCA = {
  nome: "Gestão Criativa",
  cor: "#6f6cf6",   // cor principal; a escala inteira é calculada
  base: "#0a0b14",  // fundo do tema escuro e tom dos cinzas (null = cinza neutro)
  logo: simbolo,    // import simbolo from "./assets/simbolo.svg"
  fonte: "Rethink Sans", // precisa estar carregada no index.html
  temaPadrao: "escuro",
  titulo: "Financeiro",
  subtitulo: "Fechamento do mês",
};
```

Botões, chips, gráfico, anel de foco, brilho e fundo acompanham. Não precisa mexer em classe nem em CSS.

Para trocar o logo: substitua `src/assets/simbolo.svg` (topo da tela), `public/favicon.svg` (aba do navegador) e `src/Logo.jsx` (assinatura da tela de entrada).

## Personalizar pela tela (logo e cores)

O botão de paleta no topo abre **Personalizar aparência**. A tela muda na hora.

- **Logo**: envie uma imagem (PNG, SVG, JPG ou WebP). Ela passa a aparecer no topo da tela e no ícone da aba do navegador. Imagem grande é reduzida sozinha. Fica melhor quadrada e com fundo transparente.
- **Cor principal** e **cor de base**: sugestões prontas, seletor livre e campo de hex. Cor de base clara demais é escurecida sozinha; cor principal clara demais mostra um aviso de leitura.
- **Restaurar padrão** volta logo e cores para a marca.

A escolha fica salva no navegador de quem escolheu e vale por cima do `marca.js`. Para que o logo e as cores valham para todo mundo que abrir o sistema, coloque-os no `marca.js`.

## Adaptar ao seu negócio

As seções e categorias que já vêm prontas estão em `src/financeiro/padroes.js`. Troque nomes, cores e categorias ali. Também é lá que se define:

- quais categorias ficam fora do controle de nota fiscal;
- quais seções não têm dia fixo de vencimento;
- qual categoria conta como retirada de lucro (não entra como despesa).

Pela própria tela, no botão **Categorias**, dá para renomear tudo e criar seções e categorias novas sem tocar em código.

## O que a tela faz

| Bloco | O que mostra |
|---|---|
| Lucro do mês | Recebido menos despesas pagas, com progresso da meta |
| Saldo em caixa | Saldo base mais tudo que já foi pago, somando todos os meses |
| Fluxo de caixa | Entradas, despesas e lucro distribuído dos últimos 6 ou 12 meses |
| Falta 50% | Projetos com sinal recebido e segunda metade ainda por lançar |
| Notas fiscais | Entradas já recebidas com nota por emitir; copia o CNPJ/CPF do tomador |
| Entradas e Saídas | Extrato por seção, com edição no lugar, baixa, repetição mensal e arrastar para reordenar |

Regras que valem saber:

- **Cliente fixo** não é redigitado: a mensalidade aparece sozinha todo mês. Mudar o valor vale dali em diante.
- **Saída fixa e colaborador** também se repetem sozinhos, sempre com o último valor. Para parar, remova a linha.
- **Retirada de lucro** sai do caixa, mas não conta como despesa do mês.

## Onde os dados ficam

**Padrão: no navegador (localStorage).** Não precisa de conta nem de servidor. Os dados ficam só naquele navegador; limpar o cache apaga tudo.

**Opcional: Supabase.** Para ter os dados em banco de verdade, com login:

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No SQL Editor, cole e rode o arquivo `supabase/schema.sql`.
3. Copie `.env.example` para `.env` e preencha a URL e a chave pública do projeto.
4. Rode `npm run dev` de novo. A tela passa a pedir login.

Cada usuário enxerga só os próprios dados (RLS). Os dados do navegador não migram sozinhos para o banco.

## Encaixar no seu sistema com o Claude

O que interessa levar é a pasta `src/financeiro/`. Ela não depende do resto deste projeto.

Abra o **seu** projeto no Claude Code, copie esta pasta do template para dentro dele e peça:

> Integre a tela de Financeiro que está em `financeiro-template/` neste projeto. Leia o `CLAUDE.md` de lá antes de começar e siga o roteiro de integração. Use a cor da minha marca e ligue os dados no meu banco.

O `CLAUDE.md` tem o mapa dos arquivos, o contrato de dados e o passo a passo para o Claude seguir.

## Limites desta versão

- Moeda e formatos são brasileiros (R$, CPF/CNPJ, consulta de CNPJ na BrasilAPI).
- Sem o módulo de vendas com link de pagamento.
- A fonte é a Rethink Sans (a da Gestão Criativa), carregada do Google Fonts; sem internet, cai na fonte do sistema. Para trocar: `marca.js` e o link no `index.html`.
- Logo e cores personalizados pela tela ficam no navegador de cada pessoa; não acompanham a conta.
- O modo Supabase é por usuário; equipe dividindo o mesmo caixa exige ajustar o SQL (está comentado no arquivo).
- Tailwind 3. Em projeto com Tailwind 4, veja a nota no `CLAUDE.md`.

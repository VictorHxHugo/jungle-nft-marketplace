# Jungle NFT Marketplace

Marketplace de NFTs desenvolvido com React, TypeScript e Vite, com foco em experiência de usuário, integração REST simulada e confiabilidade do checkout.

## Funcionalidades

- Catálogo com busca, categorias, ordenação por preço e paginação via API simulada.
- Detalhes de NFTs e tratamento para itens inexistentes.
- Favoritos e carrinho persistidos no navegador.
- Checkout simulado com idempotência e recuperação de pedidos.
- Interface responsiva para desktop e dispositivos móveis.
- Testes unitários e end-to-end.

## Tecnologias

- React e TypeScript
- Vite
- TanStack Router e TanStack Query
- Axios
- Tailwind CSS e shadcn/ui
- Mock Service Worker (MSW)
- Vitest e Testing Library
- Playwright
- Socket.IO Client

## Instalação

Requisitos: Node.js compatível com a versão do Vite instalada e npm.

```bash
git clone https://github.com/VictorHxHugo/jungle-nft-marketplace.git
cd jungle-nft-marketplace
npm install
npm run dev
```

## Scripts

| Comando                   | Descrição                            |
| ------------------------- | ------------------------------------ |
| `npm run dev`             | Inicia o servidor de desenvolvimento |
| `npm run build`           | Verifica os tipos e gera a build     |
| `npm run preview`         | Executa a build localmente           |
| `npm run lint`            | Executa o ESLint                     |
| `npm run test`            | Executa os testes unitários          |
| `npm run test:e2e`        | Executa os testes com Playwright     |
| `npm run test:e2e:report` | Abre o relatório do Playwright       |

## Arquitetura

- `src/`: aplicação, páginas, componentes, serviços e tipos.
- `src/services/`: cliente HTTP e funções de acesso à API.
- `src/mocks/`: handlers e dados da API simulada.
- `e2e/`: testes end-to-end.
- `public/`: arquivos estáticos e service worker do MSW.

O TanStack Query gerencia o cache das consultas. O catálogo envia parâmetros de busca, categoria, ordenação e paginação ao serviço de dados.

## API simulada

O MSW intercepta requisições durante o desenvolvimento e os testes. O checkout é demonstrativo: o projeto não realiza transações reais em blockchain nem pagamentos.

Por padrão, o cliente HTTP utiliza `/api`. A variável `VITE_API_URL` permite configurar outro endereço para um backend compatível.

A variável `VITE_ENABLE_MOCKS=true` habilita os mocks também fora do ambiente de desenvolvimento. Use-a somente quando desejar demonstrar a aplicação com dados simulados.

## Deploy na Vercel

O repositório inclui `vercel.json` com rewrite para a aplicação React.

1. Importe o repositório na Vercel.
2. Configure `npm run build` como comando de build.
3. Configure `dist` como diretório de saída.
4. Configure `VITE_API_URL` se utilizar um backend externo.
5. Para uma demonstração com dados simulados, configure `VITE_ENABLE_MOCKS=true`.

O deploy com MSW é uma demonstração de frontend, não substitui um backend real para produção.

## Licença

Projeto desenvolvido para fins de demonstração e avaliação técnica.

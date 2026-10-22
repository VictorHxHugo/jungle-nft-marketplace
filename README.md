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

### Contratos REST simulados

Todos os caminhos abaixo usam o prefixo `/api` por padrão. As respostas são exemplos de desenvolvimento, mantidos no MSW:

| Método e caminho | Uso |
| --- | --- |
| `GET /nfts?q=&category=Todos&sort=featured&page=1` | Catálogo paginado; retorna `{ items, total, page, pageSize, totalPages }`. `sort` aceita `featured`, `low` ou `high`. |
| `GET /nfts/:id` | Detalhes; responde `404` quando não existe. |
| `POST /auth/register` | Recebe `{ name, email, password }`; cria usuário simulado e retorna `{ user, token }` (`201`). Senha mínima: 8 caracteres. |
| `POST /auth/login` | Recebe `{ email, password }`; retorna `{ user, token }` ou `401`. |
| `GET /auth/me` | Retorna a sessão associada ao cabeçalho `Authorization: Bearer <token>`. |
| `POST /auth/logout` | Invalida a sessão simulada associada ao token. |
| `POST /orders` | Recebe itens, subtotal, taxa, total e `idempotencyKey`; cria pedido confirmado. Repetir a mesma chave e conteúdo retorna o mesmo pedido. |
| `GET /orders/:id` | Recupera o estado atual de um pedido para reconciliação após uma atualização Socket.IO. |
| `GET /orders/by-idempotency-key/:key` | Recupera um pedido confirmado ou retorna `404`. |

### Conta de demonstração e reset dos mocks

Não há conta fictícia pré-cadastrada: crie uma em `/register`, usando qualquer e-mail de teste e senha com ao menos 8 caracteres. Os usuários e sessões do mock ficam no armazenamento local do navegador; o token e o usuário autenticado também são guardados ali. Isso não é autenticação de produção.

Para zerar a demonstração, limpe os dados do site no navegador (DevTools → Application → Local Storage → origem atual → Clear) e recarregue. Isso apaga sessão, usuário, favoritos, carrinho e pedidos simulados persistidos. Os testes Playwright criam contextos isolados. O caso de recuperação de checkout usa a chave temporária `nova-art-test-lose-order-response`, removida pelo próprio mock ao simular a resposta perdida.

### Atualizações em tempo real

O cliente usa `socket.io-client` pelo transporte WebSocket em `/socket.io/`. No desenvolvimento e na demonstração estática, o MSW intercepta o transporte e o binding `@mswjs/socket.io-binding` simula os pacotes Engine.IO/Socket.IO pela camada de rede. O `socket.io-client` é carregado depois da inicialização do worker: o Engine.IO captura o construtor WebSocket durante a avaliação do módulo, então uma importação estática anterior ao MSW impediria a interceptação.

O mock aceita somente para demonstração `POST /api/__mock/socket-events`:

```json
{
  "event": "nft.updated",
  "nftId": 1,
  "changes": { "price": 0.9 },
  "replayStale": true
}
```

`nft.updated` envia `{ nftId, version, changes }`; `changes` pode conter `price` e/ou `available`. O carrinho e o checkout mostram a cotação REST atualizada, e o checkout exige revisão explícita antes de confirmar se um item mudou. `order.updated` envia `{ orderId, ownerId, version, changes: { status } }`, onde `status` aceita `pending`, `confirmed` ou `declined`. Só pedidos pendentes podem mudar de estado; confirmado e recusado são terminais. Os pedidos e chaves de idempotência são separados pelo ID estável do usuário (ou pelo escopo anônimo), e os eventos de pedido só são enviados à conexão Socket.IO desse dono. Cada mudança válida incrementa a versão monotônica, persiste o estado REST e transmite pelo Socket.IO. `replayStale: true` envia também a versão anterior e `replayDuplicate: true` duplica a versão atual para verificar que o cliente as descarta. O catálogo, detalhe e carrinho reconciliam pelo REST; o pedido é consultado por `GET /orders/:id` após evento ou reconexão. Pedidos pendentes guardam um ponteiro local por usuário e são recuperados por REST após refresh sem criar um pedido novo.

Para testar, abra a aplicação com mocks ativos e execute no console do navegador:

```js
fetch("/api/__mock/socket-events", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    event: "nft.updated",
    nftId: 1,
    changes: { price: 0.9 },
    replayStale: true,
  }),
})
```

Troque o corpo por `{"event":"nft.updated","nftId":1,"changes":{"available":false}}` para indisponibilizar um NFT. Para atualizar um pedido, use `{"event":"order.updated","orderId":"ORD-…","changes":{"status":"declined"}}` com um ID criado no checkout. Para verificar a reconexão automática, use `{"event":"socket.disconnect"}`. Os NFTs do MSW são mantidos em memória e voltam ao estado inicial ao recarregar; os pedidos alterados ficam no armazenamento local e são removidos ao limpar os dados do site conforme a seção acima. Essa rota de controle é apenas do mock e não faz parte de um backend de produção.

O binding requer MSW `^2.10.2`; por isso o MSW foi alinhado a `2.10.2` em vez da versão 3 anteriormente instalada, incompatível com o peer dependency publicado por `@mswjs/socket.io-binding@0.2.0`. O worker em `public/mockServiceWorker.js` foi regenerado para corresponder a essa versão. Na Vercel, configure `VITE_ENABLE_MOCKS=true` no ambiente de build para que o worker e os mocks REST/Socket.IO também iniciem na versão de demonstração; a regra de rewrite em `vercel.json` não fornece um servidor Socket.IO de produção. O painel da Vercel não foi consultado, portanto o valor atual dessa variável ainda precisa ser confirmado.

## Testes e limitações

- `npm run test` roda os testes unitários e dos handlers MSW.
- `npm run test:e2e` roda Playwright em Chromium desktop e mobile; os testes usam o MSW inicializado pelo app.
- Os testes E2E verificam catálogo, detalhe, carrinho, indisponibilidade, reconciliação REST de pedido e rejeição de versões Socket.IO antigas.
- O checkout é apenas uma simulação, sem carteira, blockchain ou cobrança.
- O MSW no deploy serve para demonstração e não substitui um backend. Contas, sessões e pedidos ficam no navegador e podem ser alterados pelo usuário.
- Imagens são servidas por URLs externas; a demonstração depende da disponibilidade desses hosts.

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

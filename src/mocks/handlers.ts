import { http, HttpResponse } from 'msw'
import { nfts } from './nfts'

export const handlers = [
  http.get('/api/nfts', () => {
    return HttpResponse.json(nfts)
  }),

  http.get('/api/nfts/:id', ({ params }) => {
    const id = Number(params.id)
    const nft = nfts.find((item) => item.id === id)

    if (!nft) {
      return HttpResponse.json(
        { message: 'NFT não encontrado' },
        { status: 404 },
      )
    }

    return HttpResponse.json(nft)
  }),
]

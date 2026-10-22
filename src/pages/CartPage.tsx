import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getNFTs } from "@/services/nfts";
import type { CartItem } from "@/types/cart";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/SiteChrome";

function readCart(): CartItem[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem("nova-art-cart") ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is CartItem => typeof item.id === "number" && Number.isInteger(item.quantity) && item.quantity > 0) : [];
  } catch {
    return [];
  }
}

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>(readCart);
  const [promo, setPromo] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const { data: nfts = [], isPending, isError } = useQuery({ queryKey: ["nfts"], queryFn: getNFTs });
  const items = cart.flatMap((entry) => {
    const nft = nfts.find((item) => item.id === entry.id);
    return nft ? [{ ...nft, quantity: entry.quantity }] : [];
  });
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const fee = Number((subtotal * 0.0006).toFixed(4));

  function applyPromo() {
    setPromoMessage(promo.trim() ? "Códigos promocionais ainda não estão disponíveis nesta demonstração." : "Digite um código promocional.");
  }

  useEffect(() => {
    localStorage.setItem("nova-art-cart", JSON.stringify(cart));
  }, [cart]);

  function changeQuantity(id: number, delta: number) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  }

  return (
    <div className="min-h-screen bg-[#150d09] text-[#f2ece5]">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <Breadcrumbs current="Carrinho" />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <div className="grid grid-cols-[minmax(0,1fr)_110px_120px_120px_32px] gap-4 border-b border-[#5a3825] pb-3 font-bold max-md:hidden"><span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span /></div>
            {isPending ? <p className="py-12 text-[#bda17e]">Carregando seu carrinho…</p> : isError ? <p role="alert" className="py-12 text-rose-300">Não foi possível carregar os NFTs.</p> : items.length === 0 ? <div className="py-16 text-center"><h1 className="text-2xl font-bold">Seu carrinho está vazio</h1><p className="mt-3 text-[#bda17e]">Explore o mercado e encontre sua próxima peça.</p><Link to="/" search={{ q: "", category: "Todos", sort: "featured", page: 1 }} hash="explore"><Button className="mt-6 bg-[#d88d4b] font-bold text-[#1a100b]">Explorar NFTs</Button></Link></div> : <div className="space-y-3 pt-3">{items.map((item) => <article key={item.id} className="grid items-center gap-4 bg-[#271711] p-3 md:grid-cols-[minmax(0,1fr)_110px_120px_120px_32px]"><div className="flex min-w-0 items-center gap-4"><Link to="/nft/$nftId" params={{ nftId: String(item.id) }}><img src={item.image} alt={item.name} className="h-[70px] w-[70px] rounded-md object-cover"/></Link><div className="min-w-0"><Link to="/nft/$nftId" params={{ nftId: String(item.id) }} className="font-bold hover:text-[#df914a]">{item.name}</Link><p className="mt-1 text-sm text-[#bda17e]">ID do token: #{item.name.match(/#(\d+)/)?.[1]?.padStart(4, "0") ?? String(item.id).padStart(4, "0")}</p></div></div><span className="text-[#d6b997]">{item.price.toFixed(2)} ETH</span><div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label={`Diminuir quantidade de ${item.name}`} className="h-8 w-8 border-[#5a3825] bg-[#d88d4b] text-[#1a100b]" onClick={() => changeQuantity(item.id, -1)}><Minus className="h-4 w-4"/></Button><span>{item.quantity}</span><Button variant="outline" size="icon" aria-label={`Aumentar quantidade de ${item.name}`} className="h-8 w-8 border-[#5a3825] bg-[#d88d4b] text-[#1a100b]" onClick={() => changeQuantity(item.id, 1)}><Plus className="h-4 w-4"/></Button></div><strong className="text-[#df914a]">{(item.price * item.quantity).toFixed(2)} ETH</strong><Button variant="ghost" size="icon" aria-label={`Remover ${item.name} do carrinho`} className="text-[#bda17e] hover:text-rose-300" onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))}><Trash2 className="h-4 w-4"/></Button></article>)}</div>}
          </section>
          <aside>
            <h1 className="border-b border-[#5a3825] pb-3 text-2xl font-bold">Resumo da carteira</h1>
            <label htmlFor="promo" className="mt-6 block font-bold">Código promocional</label>
            <div className="mt-2 flex"><Input id="promo" value={promo} onChange={(event) => setPromo(event.target.value)} placeholder="Digite o código promocional..." className="rounded-r-none border-[#d88d4b] bg-transparent placeholder:text-[#bda17e]"/><Button onClick={applyPromo} className="rounded-l-none bg-[#d88d4b] font-bold text-[#1a100b]">Aplicar</Button></div>
            {promoMessage && <p role="status" className="mt-2 text-sm text-[#e98661]">{promoMessage}</p>}
            <div className="mt-7 space-y-4"><div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toFixed(2)} ETH</span></div><div className="flex justify-between text-[#d9c7b3]"><span>Desconto do lançamento</span><span>(−) 00.00 ETH</span></div><div className="flex justify-between"><span>Taxa de rede</span><span>{fee.toFixed(3)} ETH</span></div><p className="text-right text-sm text-[#d88d4b]">Taxa estimada</p><div className="flex justify-between border-t border-[#5a3825] pt-4 text-xl font-bold"><span>Total</span><span className="text-[#df914a]">{(subtotal + fee).toFixed(3)} ETH</span></div></div>
            <Button disabled={items.length === 0 || items.some((item) => item.available === false)} className="mt-6 w-full bg-[#d88d4b] py-6 text-lg font-bold text-[#1a100b] hover:bg-[#e49b5d]" onClick={() => void navigate({ to: "/checkout" })}>Conectar e finalizar</Button>
            <Link to="/" search={{ q: "", category: "Todos", sort: "featured", page: 1 }} hash="explore" className="mt-5 block text-center text-[#df914a]">Continuar explorando</Link>
          </aside>
        </div>
        <section className="mt-24"><h2 className="border-b border-[#5a3825] pb-3 text-2xl font-bold text-[#df914a]">Colecionadores também viram</h2><div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">{nfts.filter((nft) => !cart.some((item) => item.id === nft.id)).slice(0, 5).map((nft) => <Link key={nft.id} to="/nft/$nftId" params={{ nftId: String(nft.id) }}><img src={nft.image} alt={nft.name} className="aspect-square w-full bg-[#271711] object-cover"/><p className="mt-3">{nft.name}</p><strong className="text-[#df914a]">{nft.price.toFixed(2)} ETH</strong></Link>)}</div></section>
      </main>
      <SiteFooter />
    </div>
  );
}

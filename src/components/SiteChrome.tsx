import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ShoppingCart, UserRound, Wallet, Users, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

const catalogSearch = { q: "", category: "Todos", sort: "featured" as const, page: 1 };

function cartCount() {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem("nova-art-cart") ?? "[]");
    return Array.isArray(stored)
      ? stored.reduce((total, item) => total + (typeof item.quantity === "number" ? item.quantity : 1), 0)
      : 0;
  } catch {
    return 0;
  }
}

export function SiteHeader({ hideLogin = false }: { hideLogin?: boolean }) {
  const count = cartCount();

  return (
    <header className="border-b border-[#4a2d20] bg-[#150d09]">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-5 px-5 lg:px-8">
        <Link to="/" search={catalogSearch} className="shrink-0 text-lg font-bold tracking-[0.12em]">KURIO</Link>
        <nav className="mx-auto hidden items-center gap-7 text-sm text-[#e6ddd4] md:flex">
          <Link to="/" search={catalogSearch} className="hover:text-[#df914a]">Início</Link>
          <Link to="/" search={catalogSearch} hash="explore" className="hover:text-[#df914a]">Mercado</Link>
          <a href="/#journal" className="hover:text-[#df914a]">Criadores</a>
          <a href="/#journal" className="hover:text-[#df914a]">Aprenda</a>
        </nav>
        <Link to="/" search={catalogSearch} hash="explore" aria-label="Buscar NFTs" className="text-white hover:text-[#df914a]"><Search className="h-6 w-6" /></Link>
        <Link to="/cart" aria-label={`Carrinho, ${count} itens`} className="relative text-white hover:text-[#df914a]"><ShoppingCart className="h-6 w-6" />{count > 0 && <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d88d4b] px-1 text-xs font-bold text-[#1a100b]">{count}</span>}</Link>
        {!hideLogin && <Link to="/login"><Button className="h-10 bg-[#d88d4b] font-bold text-[#1a100b] hover:bg-[#e49b5d]"><UserRound className="mr-2 h-4 w-4"/>Entrar</Button></Link>}
      </div>
    </header>
  );
}

export function SiteFooter() {
  const [newsletterMessage, setNewsletterMessage] = useState("");

  return (
    <footer className="mt-20 bg-[#271711] text-[#e9dfd4]">
      <div className="mx-auto grid max-w-7xl gap-7 px-6 py-9 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {[[Wallet, "Segurança da carteira", "Proteja sua carteira e colecione arte digital verificada com confiança."], [Users, "Criadores em destaque", "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede."], [CalendarDays, "Alertas de lançamentos", "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado."]].map(([Icon, title, copy]) => <section key={title as string} className="border-r border-[#d88d4b] pr-5"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d88d4b] text-[#1a100b]"><Icon className="h-6 w-6"/></span><h2 className="mt-4 text-lg font-bold">{title as string}</h2><p className="mt-3 text-sm leading-6 text-[#c8aa84]">{copy as string}</p></section>)}
        <section><h2 className="text-lg font-bold leading-tight">Antecipe-se ao próximo lançamento</h2><form className="mt-3 flex" onSubmit={(event) => { event.preventDefault(); setNewsletterMessage("Cadastro de novidades indisponível nesta demonstração."); }}><label className="sr-only" htmlFor="newsletter-email">Endereço para newsletter</label><input id="newsletter-email" type="email" required placeholder="digite seu e-mail..." className="min-w-0 flex-1 rounded-l-md bg-[#3b2412] px-3 py-2 text-sm text-[#f3eee9] placeholder:text-[#bda17e] focus:outline-none focus:ring-1 focus:ring-[#d88d4b]"/><Button type="submit" className="rounded-l-none bg-[#d88d4b] font-bold text-[#1a100b] hover:bg-[#e49b5d]">Enviar</Button></form><p className="mt-3 text-sm leading-6 text-[#c8aa84]">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>{newsletterMessage && <p role="status" className="mt-2 text-xs text-[#ed9a50]">{newsletterMessage}</p>}</section>
      </div>
      <div className="bg-[#3b2412]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-6 lg:px-8"><span className="font-bold tracking-widest">KURIO</span><span>Feito para colecionadores, criadores e cultura</span><a href="mailto:contato@email.com">contato@email.com</a><span>+55 11 4002 8922</span></div></div>
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div><h2 className="font-bold">Meu perfil</h2><Link to="/profile" className="mt-3 block text-sm text-[#d9c7b3]">Meu perfil</Link><Link to="/wallets" className="mt-2 block text-sm text-[#d9c7b3]">Minha coleção</Link><p className="mt-2 text-sm text-[#d9c7b3]">Atividade</p><p className="mt-2 text-sm text-[#d9c7b3]">Estúdio do criador</p><p className="mt-2 text-sm text-[#d9c7b3]">Lista de interesse</p></div>
        <div><h2 className="font-bold">Central de ajuda</h2><p className="mt-3 text-sm text-[#d9c7b3]">Central de ajuda</p><p className="mt-2 text-sm text-[#d9c7b3]">Como comprar NFTs</p><p className="mt-2 text-sm text-[#d9c7b3]">Carteira e segurança</p><p className="mt-2 text-sm text-[#d9c7b3]">Política do mercado</p><p className="mt-2 text-sm text-[#d9c7b3]">Denunciar item</p></div>
        <div><h2 className="font-bold">Coleções</h2><p className="mt-3 text-sm text-[#d9c7b3]">Arte digital</p><p className="mt-2 text-sm text-[#d9c7b3]">Fotografia</p><p className="mt-2 text-sm text-[#d9c7b3]">Música</p><p className="mt-2 text-sm text-[#d9c7b3]">Arte 3D</p><p className="mt-2 text-sm text-[#d9c7b3]">Utilidade</p></div>
        <div><h2 className="font-bold">Redes sociais</h2><p className="mt-3 text-[#d88d4b]">f · ◎ · ♥ · in · ▶</p><h2 className="mt-5 font-bold">Carteiras compatíveis</h2><p className="mt-3 rounded border border-[#4a2d20] bg-[#382218] p-2 text-xs text-[#d88d4b]">METAMASK • WALLETCONNECT • COINBASE</p></div>
      </div>
      <p className="pb-6 text-center text-sm text-[#d9c7b3]">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  );
}

export function Breadcrumbs({ current }: { current: string }) {
  return <p className="mb-8 text-sm font-semibold text-[#e6ddd4]"><Link to="/" search={catalogSearch} className="hover:text-[#df914a]">Início</Link><span className="mx-3 text-[#bda17e]">/</span><Link to="/" search={catalogSearch} hash="explore" className="hover:text-[#df914a]">Mercado</Link><span className="mx-3 text-[#bda17e]">/</span>{current}</p>;
}

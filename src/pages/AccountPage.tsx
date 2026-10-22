import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { CircleAlert, Download, Heart, MapPin, ShoppingCart, UserRound, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/SiteChrome";

type Profile = { displayName: string; username: string; email: string; ens: string; walletNickname: string; avatar: string };
type Wallet = { id: string; name: string; nickname: string; network: string; profileName: string; address: string; secondaryAddress: string; type: string; referral: string; email: string; ens: string };
const PROFILE_KEY = "nova-art-profile";
const WALLETS_KEY = "nova-art-wallets";
const emptyProfile: Profile = { displayName: "", username: "", email: "", ens: "", walletNickname: "", avatar: "" };
const emptyWallet: Wallet = { id: "", name: "", nickname: "", network: "", profileName: "", address: "", secondaryAddress: "", type: "", referral: "", email: "", ens: "" };

function readProfile(): Profile {
  try { return { ...emptyProfile, ...JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") }; } catch { return emptyProfile; }
}
function readWallets(): Wallet[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(WALLETS_KEY) ?? "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}

export default function AccountPage({ tab }: { tab: "profile" | "wallets" }) {
  const [profile, setProfile] = useState<Profile>(readProfile);
  const [wallets, setWallets] = useState<Wallet[]>(readWallets);
  const [saved, setSaved] = useState(false);
  const [walletForm, setWalletForm] = useState<Wallet>(emptyWallet);
  const [sameWallet, setSameWallet] = useState(false);
  useEffect(() => { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets)); }, [wallets]);

  function updateProfile(key: keyof Profile, value: string) { setProfile((current) => ({ ...current, [key]: value })); setSaved(false); }
  function saveProfile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); setSaved(true); }
  function saveWallet(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setWallets((current) => [...current, { ...walletForm, id: crypto.randomUUID(), secondaryAddress: sameWallet ? walletForm.address : walletForm.secondaryAddress }]); setWalletForm(emptyWallet); }
  function chooseAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2_000_000) return;
    const reader = new FileReader(); reader.onload = () => updateProfile("avatar", String(reader.result ?? "")); reader.readAsDataURL(file);
  }

  const menu = [["Dados do perfil", "/profile", UserRound], ["Carteiras", "/wallets", MapPin], ["Atividade", "/profile", ShoppingCart], ["Lista de interesse", "/profile", Heart], ["Arquivos baixados", "/profile", Download], ["Suporte", "/profile", CircleAlert]] as const;
  const profileFields = [["displayName", "Nome de exibição"], ["username", "Nome de usuário"], ["email", "E-mail"], ["ens", "Nome ENS"]] as const;
  const walletFields = [["name", "Nome de exibição"], ["nickname", "Apelido da carteira"], ["network", "Rede"], ["profileName", "Nome do perfil"], ["address", "Endereço da carteira"], ["secondaryAddress", "ENS ou carteira secundária (opcional)"], ["type", "Tipo de carteira"], ["referral", "Código de indicação"], ["email", "E-mail"], ["ens", "Nome ENS"]] as const;

  return <div className="min-h-screen bg-[#150d09] text-[#f2ece5]"><SiteHeader/><main className="mx-auto max-w-7xl px-5 py-8 lg:px-8"><Breadcrumbs current={tab === "profile" ? "Meu perfil" : "Carteiras"}/><div className="grid gap-8 lg:grid-cols-[310px_minmax(0,1fr)]">
    <aside className="h-fit bg-[#271711] pb-4"><h1 className="px-5 py-5 text-2xl font-bold">Meu perfil</h1><nav className="flex flex-col">{menu.map(([label, href, Icon]) => { const active = (tab === "profile" && label === "Dados do perfil") || (tab === "wallets" && label === "Carteiras"); return <Link key={label} to={href} className={`flex items-center gap-4 border-l-4 px-5 py-4 ${active ? "border-[#d88d4b] bg-[#382218] text-[#df914a]" : "border-transparent text-[#c8aa84] hover:bg-[#382218] hover:text-[#df914a]"}`}><Icon className="h-5 w-5"/>{label}</Link>; })}<button type="button" onClick={() => { localStorage.removeItem("nova-art-token"); localStorage.removeItem("nova-art-user"); window.location.assign("/login"); }} className="mt-2 flex items-center gap-4 border-t border-[#5a3825] px-5 py-4 text-left font-bold text-[#df914a]">↪ Sair</button></nav></aside>
    {tab === "profile" ? <section><h2 className="mb-8 text-2xl font-bold">Perfil do colecionador</h2><form onSubmit={saveProfile} className="grid gap-x-6 gap-y-5 md:grid-cols-2">{profileFields.map(([key, label]) => <label key={key} className="block"><span className="mb-2 block">{label}<span className="text-[#e98661]">*</span></span>{key === "ens" ? <div className="flex gap-2"><select aria-label="Sufixo ENS" defaultValue=".eth" className="h-12 rounded border border-[#4a2d20] bg-[#150d09] px-3"><option>.eth</option><option>.com</option><option>.xyz</option></select><Input value={profile.ens} onChange={(event) => updateProfile("ens", event.target.value)} required className="h-12 border-[#4a2d20] bg-transparent focus-visible:ring-[#d88d4b]"/></div> : <Input type={key === "email" ? "email" : "text"} value={profile[key]} onChange={(event) => updateProfile(key, event.target.value)} required className="h-12 border-[#4a2d20] bg-transparent focus-visible:ring-[#d88d4b]"/>}</label>)}
      <label className="block"><span className="mb-2 block">Apelido da carteira<span className="text-[#e98661]">*</span></span><Input value={profile.walletNickname} onChange={(event) => updateProfile("walletNickname", event.target.value)} required className="h-12 border-[#4a2d20] bg-transparent"/></label>
      <div className="row-span-2"><p className="mb-2">Avatar</p><div className="flex items-center gap-5">{profile.avatar ? <img src={profile.avatar} alt="Avatar do perfil" className="h-16 w-16 rounded-full object-cover"/> : <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[#4a2d20] bg-[#321e15] text-[#d88d4b]"><ImageIcon/></span>}<label className="cursor-pointer rounded bg-[#d88d4b] px-6 py-3 font-bold text-[#1a100b]">Alterar<input type="file" accept="image/*" onChange={chooseAvatar} className="sr-only"/></label><button type="button" onClick={() => updateProfile("avatar", "")} className="text-sm">Remover</button></div></div>
      <div className="md:col-span-2"><h3 className="mb-4 text-xl font-bold">Alterar senha</h3><div className="grid max-w-[420px] gap-5">{["Senha atual", "Nova senha", "Confirmar nova senha"].map((label) => <label key={label}>{label}<Input type="password" autoComplete="new-password" className="mt-2 h-12 border-[#4a2d20] bg-transparent"/></label>)}</div></div><div className="md:col-span-2">{saved && <p role="status" className="mb-3 text-sm text-emerald-300">Perfil salvo neste navegador.</p>}<Button className="bg-[#d88d4b] px-8 font-bold text-[#1a100b] hover:bg-[#e49b5d]">Salvar</Button></div></form></section> : <section><div className="flex items-start justify-between"><div><h2 className="text-2xl font-bold">Carteira principal</h2><p className="mt-2 text-[#bda17e]">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p></div><button type="button" onClick={() => document.getElementById("wallet-form")?.scrollIntoView({ behavior: "smooth" })} className="font-bold text-[#df914a]">Adicionar</button></div>
      <form id="wallet-form" onSubmit={saveWallet} className="mt-8 grid gap-x-6 gap-y-5 md:grid-cols-2">{walletFields.map(([key, label]) => <label key={key} className="block"><span className="mb-2 block">{label}{!(["secondaryAddress", "referral"] as string[]).includes(key) && <span className="text-[#e98661]">*</span>}</span>{key === "network" || key === "type" || key === "ens" ? <select required value={walletForm[key]} onChange={(event) => setWalletForm((current) => ({ ...current, [key]: event.target.value }))} className="h-12 w-full rounded border border-[#4a2d20] bg-[#150d09] px-4 text-[#bda17e]"><option value="">{key === "ens" ? ".eth" : `Selecione ${key === "network" ? "uma rede" : "uma carteira"}`}</option>{(key === "network" ? ["Ethereum", "Polygon", "Solana"] : key === "type" ? ["MetaMask", "WalletConnect", "Coinbase Wallet"] : [".eth", ".com", ".xyz"]).map((option) => <option key={option}>{option}</option>)}</select> : <Input type={key === "email" ? "email" : "text"} value={walletForm[key]} onChange={(event) => setWalletForm((current) => ({ ...current, [key]: event.target.value }))} required={!(["secondaryAddress", "referral"] as string[]).includes(key)} placeholder={key === "address" ? "Endereço 0x da carteira" : key === "secondaryAddress" ? "ENS ou carteira secundária (opcional)" : ""} className="h-12 border-[#4a2d20] bg-transparent"/>}</label>)}<div className="md:col-span-2"><Button className="bg-[#d88d4b] font-bold text-[#1a100b] hover:bg-[#e49b5d]">Salvar carteira</Button></div></form>
      <div className="mt-10 border-t border-[#4a2d20] pt-7"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold">Carteira secundária</h3><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sameWallet} onChange={(event) => setSameWallet(event.target.checked)} className="accent-[#d88d4b]"/> Igual à carteira principal <button type="button" onClick={() => document.getElementById("wallet-form")?.scrollIntoView({ behavior: "smooth" })} className="ml-3 font-bold text-[#df914a]">Adicionar</button></label></div>{wallets.length === 0 ? <p className="mt-3 text-[#bda17e]">Você ainda não adicionou uma carteira secundária.</p> : <div className="mt-4 space-y-3">{wallets.map((wallet) => <article key={wallet.id} className="flex flex-wrap items-center justify-between gap-4 border border-[#4a2d20] p-4"><div><p className="font-bold">{wallet.name} · {wallet.type}</p><p className="mt-1 text-sm text-[#bda17e]">{wallet.network} · {wallet.address}</p></div><Button type="button" variant="outline" onClick={() => setWallets((current) => current.filter((entry) => entry.id !== wallet.id))}>Remover</Button></article>)}</div>}</div></section>}
  </div></main><SiteFooter/></div>;
}

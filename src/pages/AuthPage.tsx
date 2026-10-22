import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import axios from "axios";
import { login, register } from "@/services/auth";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";

type AuthPageProps = {
  mode: "login" | "register";
};

export default function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const isRegister = mode === "register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = isRegister
        ? await register({ name, email, password })
        : await login({ email, password });

      localStorage.setItem("nova-art-token", response.token);
      localStorage.setItem("nova-art-user", JSON.stringify(response.user));

      await navigate({
        to: "/",
        search: {
          q: "",
          category: "Todos",
          sort: "featured",
          page: 1,
        },
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ??
            "Não foi possível concluir a operação. Tente novamente.",
        );
      } else {
        setError("Ocorreu um erro inesperado. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#150d09] text-white">
      <SiteHeader hideLogin />
      <div className="relative isolate flex min-h-[680px] items-center justify-center overflow-hidden px-4 py-12">
        <div className="absolute inset-0 -z-10 grid items-center gap-10 px-6 opacity-70 lg:grid-cols-2 lg:px-16">
          <div className="max-w-xl py-10">
            <p className="mb-5 font-semibold tracking-[0.16em] text-[#e6d7c7]">Bem-vindo à Kurio</p>
            <p className="text-4xl font-bold uppercase leading-tight sm:text-6xl">Seja dono do futuro da arte digital</p>
            <p className="mt-5 text-[#bda17e]">Descubra NFTs selecionados de criadores e colecione arte digital verificada.</p>
          </div>
          <img src="/images/kurio-hero.webp" alt="Emerald Ape com óculos e jaqueta verde" className="mx-auto hidden aspect-square w-full max-w-[460px] rounded-3xl object-cover lg:block" />
        </div>
        <div className="absolute inset-0 -z-10 bg-[#150d09]/35" />
      <section className="w-full max-w-[472px] border border-[#4a2d20] border-b-4 border-b-[#d88d4b] bg-[#261610] p-7 shadow-2xl sm:p-10">
        <div className="mb-7 flex items-center justify-center gap-3 text-xl font-bold"><Link to="/login" className={!isRegister ? "text-[#df914a]" : "text-[#e9dfd4] hover:text-[#df914a]"}>Entrar</Link><span className="text-[#e98661]">|</span><Link to="/register" className={isRegister ? "text-[#df914a]" : "text-[#e9dfd4] hover:text-[#df914a]"}>Criar conta</Link></div>
        <p className="mx-auto mb-7 max-w-md text-center text-sm text-[#d9c7b3]">
          {isRegister ? "Crie sua conta para acompanhar sua coleção e seus criadores favoritos." : "Entre para gerenciar sua carteira, coleção e perfil de criador."}
        </p>
        <Link
          to="/"
          search={{
            q: "",
            category: "Todos",
            sort: "featured",
            page: 1,
          }}
          className="mb-5 inline-block text-sm text-[#d88d4b] transition hover:text-white"
        >
          ← Voltar ao marketplace
        </Link>

        <h1 className="text-3xl font-bold tracking-tight">
          {isRegister ? "Criar conta" : "Entrar"}
        </h1>

        <p className="mt-2 text-sm text-white/60">
          {isRegister ? "Cadastre-se na Kurio para continuar." : "Acesse sua conta Kurio."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {isRegister && (
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                Nome
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/35 focus:border-[#d88d4b]"
                placeholder="Seu nome"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/35 focus:border-[#d88d4b]"
              placeholder="voce@exemplo.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={isRegister ? 8 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/35 focus:border-[#d88d4b]"
              placeholder={isRegister ? "Mínimo de 8 caracteres" : "Sua senha"}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#d88d4b] px-4 py-3 font-semibold transition hover:bg-[#e49b5d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/60">
          {isRegister ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
          <Link
            to={isRegister ? "/login" : "/register"}
            className="font-medium text-[#d88d4b] hover:text-white"
          >
            {isRegister ? "Entrar" : "Cadastre-se"}
          </Link>
        </p>
      </section>
      </div>
      <SiteFooter />
    </main>
  );
}

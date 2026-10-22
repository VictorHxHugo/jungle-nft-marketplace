import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import axios from "axios";
import { login, register } from "@/services/auth";

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
    <main className="flex min-h-screen items-center justify-center bg-[#10091f] px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1b1030] p-7 shadow-2xl sm:p-9">
        <Link
          to="/"
          search={{
            q: "",
            category: "Todos",
            sort: "featured",
            page: 1,
          }}
          className="mb-8 inline-block text-sm text-purple-300 transition hover:text-white"
        >
          ← Voltar ao marketplace
        </Link>

        <h1 className="text-3xl font-bold tracking-tight">
          {isRegister ? "Criar conta" : "Bem-vindo de volta"}
        </h1>

        <p className="mt-2 text-sm text-white/60">
          {isRegister
            ? "Cadastre-se para continuar no Nova Art."
            : "Entre na sua conta para continuar."}
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
                className="w-full rounded-lg border border-white/15 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/35 focus:border-purple-400"
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
              className="w-full rounded-lg border border-white/15 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/35 focus:border-purple-400"
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
              className="w-full rounded-lg border border-white/15 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/35 focus:border-purple-400"
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
            className="w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/60">
          {isRegister ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
          <Link
            to={isRegister ? "/login" : "/register"}
            className="font-medium text-purple-300 hover:text-white"
          >
            {isRegister ? "Entrar" : "Cadastre-se"}
          </Link>
        </p>
      </section>
    </main>
  );
}

import { http, HttpResponse } from "msw";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from "@/types/auth";

type StoredUser = {
  user: User;
  passwordHash: string;
};

type StoredSession = {
  token: string;
  userId: string;
};

const USERS_KEY = "nova-art-auth-users";
const SESSIONS_KEY = "nova-art-auth-sessions";

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

async function hashPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization");

  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

function createToken(): string {
  return crypto.randomUUID();
}

export const authHandlers = [
  http.post("*/api/auth/register", async ({ request }) => {
    const payload = (await request.json()) as RegisterPayload;
    const name = payload.name?.trim();
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password;

    if (
      !name ||
      !email ||
      !email.includes("@") ||
      !password ||
      password.length < 8
    ) {
      return HttpResponse.json(
        {
          message:
            "Informe nome, e-mail válido e senha com pelo menos 8 caracteres.",
        },
        { status: 400 },
      );
    }

    const users = readStorage<StoredUser[]>(USERS_KEY, []);

    if (users.some((entry) => entry.user.email === email)) {
      return HttpResponse.json(
        { message: "Este e-mail já está cadastrado." },
        { status: 409 },
      );
    }

    const user: User = {
      id: crypto.randomUUID(),
      name,
      email,
    };

    users.push({
      user,
      passwordHash: await hashPassword(password),
    });

    writeStorage(USERS_KEY, users);

    const token = createToken();
    const sessions = readStorage<StoredSession[]>(SESSIONS_KEY, []);

    sessions.push({ token, userId: user.id });
    writeStorage(SESSIONS_KEY, sessions);

    const response: AuthResponse = { user, token };

    return HttpResponse.json(response, { status: 201 });
  }),

  http.post("*/api/auth/login", async ({ request }) => {
    const payload = (await request.json()) as LoginPayload;
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password;

    const users = readStorage<StoredUser[]>(USERS_KEY, []);
    const storedUser = users.find((entry) => entry.user.email === email);

    if (
      !storedUser ||
      !password ||
      storedUser.passwordHash !== (await hashPassword(password))
    ) {
      return HttpResponse.json(
        { message: "E-mail ou senha incorretos." },
        { status: 401 },
      );
    }

    const token = createToken();
    const sessions = readStorage<StoredSession[]>(SESSIONS_KEY, []);

    sessions.push({ token, userId: storedUser.user.id });
    writeStorage(SESSIONS_KEY, sessions);

    const response: AuthResponse = {
      user: storedUser.user,
      token,
    };

    return HttpResponse.json(response);
  }),

  http.get("*/api/auth/me", ({ request }) => {
    const token = getToken(request);

    if (!token) {
      return HttpResponse.json(
        { message: "Autenticação necessária." },
        { status: 401 },
      );
    }

    const sessions = readStorage<StoredSession[]>(SESSIONS_KEY, []);
    const session = sessions.find((entry) => entry.token === token);
    const users = readStorage<StoredUser[]>(USERS_KEY, []);
    const user = users.find((entry) => entry.user.id === session?.userId);

    if (!session || !user) {
      return HttpResponse.json(
        { message: "Sessão inválida ou expirada." },
        { status: 401 },
      );
    }

    return HttpResponse.json(user.user);
  }),

  http.post("*/api/auth/logout", ({ request }) => {
    const token = getToken(request);
    const sessions = readStorage<StoredSession[]>(SESSIONS_KEY, []);

    writeStorage(
      SESSIONS_KEY,
      sessions.filter((session) => session.token !== token),
    );

    return HttpResponse.json({ success: true });
  }),
];

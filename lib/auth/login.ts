import { adminFetch } from "@/lib/api/admin-fetch";
import { setClientCsrfToken } from "@/lib/csrf/client-token";

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginAdmin = {
  id: string;
  email: string;
  name: string;
};

export type LoginSuccess = {
  ok: true;
  admin: LoginAdmin;
};

export type LoginFailure = {
  ok: false;
  error: string;
};

export type LoginResult = LoginSuccess | LoginFailure;

export async function loginWithCredentials(
  credentials: LoginCredentials,
): Promise<LoginResult> {
  const response = await adminFetch("/api/auth/login", {
    method: "POST",
    skipCsrf: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    }),
  });

  const data = (await response.json()) as {
    error?: string;
    admin?: LoginAdmin;
    csrfToken?: string;
  };

  if (!response.ok) {
    return {
      ok: false,
      error: data.error ?? "Invalid email or password",
    };
  }

  if (!data.admin) {
    return {
      ok: false,
      error: "Invalid response from server",
    };
  }

  if (data.csrfToken) {
    setClientCsrfToken(data.csrfToken);
  }

  return { ok: true, admin: data.admin };
}

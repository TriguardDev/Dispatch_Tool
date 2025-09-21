const BASE_URL = import.meta.env.VITE_BASE_API_URL;
console.log('LOGIN API - BASE_URL:', BASE_URL);
console.log('LOGIN API - All env vars:', import.meta.env);

export interface LoginResponse {
  id: number;
  role: "dispatcher" | "field_agent" | "admin";
  // No token in response since it's now in HTTP-only cookie
}

export async function login(email: string, password: string, role: "dispatcher" | "field_agent" | "admin"): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Important: include cookies in requests
    body: JSON.stringify({ email, password, role }),
  });

  if (!res.ok) {
    throw new Error("Login failed");
  }

  return res.json();
}

export async function logout(): Promise<void> {
  const res = await fetch(`${BASE_URL}/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Login failed");
  }
}

export async function verifyAuth(): Promise<{success: boolean, user_id?: number, role?: string}> {
  try {
    const res = await fetch(`${BASE_URL}/verify`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) {
      return { success: false };
    }

    return res.json();
  } catch (error) {
    console.error("Auth verification error:", error);
    return { success: false };
  }
}

export async function resetPassword(email: string, role: "dispatcher" | "field_agent" | "admin", oldPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, role, old_password: oldPassword, new_password: newPassword }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Password reset failed");
  }
}

// Wrapper for authenticated API calls
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: "include", // Always include cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}
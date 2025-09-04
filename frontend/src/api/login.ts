const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface LoginResponse {
  id: number;
  user_type: "dispatcher" | "agent";
  // No token in response since it's now in HTTP-only cookie
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Important: include cookies in requests
    body: JSON.stringify({ email, password }),
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

export async function verifyAuth(): Promise<{success: boolean, user_id?: number, user_type?: string}> {
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
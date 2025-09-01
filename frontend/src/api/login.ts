import { BASE_URL } from "../utils/constants";

export interface LoginResponse {
  id: number;
  user_type: "dispatcher" | "agent";
  token: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}:9000/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password}),
  });

  if (!res.ok) {
    throw new Error("Login failed");
  }

  return res.json();
}

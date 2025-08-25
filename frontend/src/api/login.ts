export interface LoginResponse {
  id: number;
  user_type: "dispatcher" | "agent";
}

export async function login(email: string): Promise<LoginResponse> {
  const res = await fetch("http://localhost:9000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw new Error("Login failed");
  }

  return res.json();
}

import { useState } from "react";
import LoginForm from "./components/LoginForm";
import CustomerScreen from "./screens/CustomerScreen";
import AgentScreen from "./screens/AgentScreen";
import type { LoginResponse } from "./api/login";

export default function App() {
  const [user, setUser] = useState<LoginResponse | null>(null);

  if (!user) {
    return <LoginForm onLogin={setUser} />;
  }

  if (user.user_type === "agent") {
    return <CustomerScreen />;
  }

  if (user.user_type === "dispatcher") {
    return <AgentScreen />;
  }

  return null;
}

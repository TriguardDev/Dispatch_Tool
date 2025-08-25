import { useState } from "react";
import LoginForm from "./components/LoginForm";
import DispatcherScreen from "./screens/DispatcherScreen"
import AgentScreen from "./screens/AgentScreen";
import type { LoginResponse } from "./api/login";

export default function App() {
  const [user, setUser] = useState<LoginResponse | null>(null);

  if (!user) {
    return <LoginForm onLogin={setUser} />;
  }

  if (user.user_type === "agent") {
    return <AgentScreen />;
  }

  if (user.user_type === "dispatcher") {
    return <DispatcherScreen />;
  }

  return null;
}

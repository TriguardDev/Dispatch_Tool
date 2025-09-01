import { useState, useEffect } from "react";
import LoginForm from "./components/LoginForm";
import DispatcherScreen from "./screens/DispatcherScreen"
import AgentScreen from "./screens/AgentScreen";
import type { LoginResponse } from "./api/login";
import { getToken } from "./utils/session";

export default function App() {
  const [user, setUser] = useState<LoginResponse | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      // simple reconstruction of user; in real apps you may fetch from backend
      const savedUser = JSON.parse(localStorage.getItem("user") || "null");
      if (savedUser) {
        setUser(savedUser);
      }
    }
  }, []);

  if (!user) {
    return <LoginForm onLogin={(u) => {
      localStorage.setItem("user", JSON.stringify(u)); // save user for refresh
      setUser(u);
    }} />;
  }

  if (user.user_type === "agent") {
    return <AgentScreen agentId={user.id}/>;
  }

  if (user.user_type === "dispatcher") {
    return <DispatcherScreen />;
  }

  return null;
}
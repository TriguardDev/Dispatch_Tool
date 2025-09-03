import { useState, useEffect } from "react";
import LoginForm from "./components/LoginForm";
import DispatcherScreen from "./screens/DispatcherScreen";
import AgentScreen from "./screens/AgentScreen";
import { verifyAuth, type LoginResponse } from "./api/login";

export default function App() {
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated via cookie
    const checkAuth = async () => {
      try {
        const authResult = await verifyAuth();
        if (authResult.success && authResult.user_id && authResult.user_type) {
          setUser({
            id: authResult.user_id,
            user_type: authResult.user_type as "dispatcher" | "agent"
          });
        }
      } catch (error) {
        console.error("Auth verification failed:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (userData: LoginResponse) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-800">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  if (user.user_type === "agent") {
    return <AgentScreen agentId={user.id} onLogout={handleLogout} />;
  }

  if (user.user_type === "dispatcher") {
    return <DispatcherScreen onLogout={handleLogout} />;
  }

  return null;
}
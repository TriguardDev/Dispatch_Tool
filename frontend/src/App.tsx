import { useState, useEffect } from "react";
import { ThemeProvider as MuiThemeProvider, CssBaseline, Box, CircularProgress, Typography } from "@mui/material";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { lightTheme, darkTheme } from "./theme/theme";
import LoginForm from "./components/LoginForm";
import DispatcherScreen from "./screens/DispatcherScreen";
import AgentScreen from "./screens/AgentScreen";
import { verifyAuth, type LoginResponse } from "./api/login";

function AppContent() {
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authResult = await verifyAuth();
        if (authResult.success && authResult.user_id && authResult.role) {
          setUser({
            id: authResult.user_id,
            role: authResult.role as "dispatcher" | "field_agent" | "admin"
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
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'background.default',
          gap: 2
        }}
      >
        <CircularProgress />
        <Typography color="text.primary">Loading...</Typography>
      </Box>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  if (user.role === "field_agent") {
    return <AgentScreen agentId={user.id} onLogout={handleLogout} />;
  }

  if (user.role === "dispatcher") {
    return <DispatcherScreen onLogout={handleLogout} />;
  }

  if (user.role === "admin") {
    return <DispatcherScreen onLogout={handleLogout} />; // For now, admins see the dispatcher screen
  }

  return null;
}

function AppWrapper() {
  const { mode } = useTheme();
  
  return (
    <MuiThemeProvider theme={mode === 'light' ? lightTheme : darkTheme}>
      <CssBaseline />
      <AppContent />
    </MuiThemeProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppWrapper />
    </ThemeProvider>
  );
}
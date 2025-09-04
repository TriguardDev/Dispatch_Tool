import { useState, useEffect } from "react";
import { ThemeProvider as MuiThemeProvider, CssBaseline, Box, CircularProgress, Typography } from "@mui/material";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { lightTheme, darkTheme } from "./theme/theme";
import LoginForm from "./components/LoginForm";
import DispatcherScreen from "./screens/DispatcherScreen";
import AgentScreen from "./screens/AgentScreen";
import { verifyAuth, type LoginResponse } from "./api/login";

function AppContent() {
  const { mode } = useTheme();
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  if (user.user_type === "agent") {
    return <AgentScreen agentId={user.id} onLogout={handleLogout} />;
  }

  if (user.user_type === "dispatcher") {
    return <DispatcherScreen onLogout={handleLogout} />;
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
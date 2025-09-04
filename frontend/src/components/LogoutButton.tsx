import { Button } from "@mui/material";
import { logout } from "../api/login";

interface Props {
  onLogout?: () => void;
}

export default function LogoutButton({ onLogout }: Props) {
  const handleLogout = async () => {
    try {
      await logout(); // Call backend logout endpoint
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if logout fails, clear frontend state
      if (onLogout) {
        onLogout();
      }
    }
  };

  return (
    <Button
      onClick={handleLogout}
      variant="contained"
      color="secondary"
      sx={{ 
        ml: 'auto',
        '&:hover': {
          backgroundColor: 'error.main'
        }
      }}
    >
      Logout
    </Button>
  );
}
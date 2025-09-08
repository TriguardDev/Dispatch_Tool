import { AppBar, Toolbar, Typography, Box, Avatar, IconButton } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import LogoutButton from "./LogoutButton";

interface TopBarProps {
  onLogOut: () => void;
}

export default function TopBar({onLogOut}: TopBarProps) {
  const { mode, toggleTheme } = useTheme();

  return (
    <AppBar position="sticky">
      <Toolbar sx={{ maxWidth: '1280px', width: '100%', mx: 'auto', px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ 
            width: 36, 
            height: 36, 
            bgcolor: 'primary.main',
            fontWeight: 'bold',
            fontSize: '0.875rem'
          }}>
            TG
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
              Triguard Dispatch
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: -0.25 }}>
              Prototype UI
            </Typography>
          </Box>
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton 
            onClick={toggleTheme} 
            color="inherit"
            aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
          >
            {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
          </IconButton>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <LogoutButton onLogout={onLogOut}/>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

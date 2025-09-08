import { useState } from "react";
import { Box, Paper, TextField, Button, Typography, Alert, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import { login, type LoginResponse } from "../api/login";

interface Props {
  onLogin: (user: LoginResponse) => void;
}

type UserRole = "dispatcher" | "field_agent" | "admin";

export default function LoginForm({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("field_agent");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const data = await login(email, password, role);
      onLogin(data);
    } catch (err) {
      setError("Invalid email, password, or role");
      console.error(err);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        p: 2
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}
        elevation={3}
      >
        <Typography variant="h4" align="center" fontWeight="bold">
          Login
        </Typography>
        
        <FormControl fullWidth>
          <InputLabel id="role-label">Role</InputLabel>
          <Select
            labelId="role-label"
            id="role-select"
            value={role}
            label="Role"
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="dispatcher">Dispatcher</MenuItem>
            <MenuItem value="field_agent">Field Agent</MenuItem>
          </Select>
        </FormControl>

        <TextField
          type="email"
          label="Email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
        />

        <TextField
          type="password"
          label="Password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
        />

        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          sx={{ mt: 2 }}
        >
          Login
        </Button>
      </Paper>
    </Box>
  );
}

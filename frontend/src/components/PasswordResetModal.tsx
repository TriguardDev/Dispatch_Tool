import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box
} from "@mui/material";
import { resetPassword } from "../api/login";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type UserRole = "dispatcher" | "field_agent" | "admin";

export default function PasswordResetModal({ open, onClose, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("field_agent");
  const [oldPassword, setOldPassword] = useState("Room2025!");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email, role, oldPassword, newPassword);
      setSuccess("Password reset successfully!");
      
      // Clear form
      setEmail("");
      setOldPassword("Room2025!");
      setNewPassword("");
      setConfirmPassword("");
      
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setOldPassword("Room2025!");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reset Password</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
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
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />

            <TextField
              type="password"
              label="Current Password"
              placeholder="Enter current password (Room2025!)"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              fullWidth
              helperText="Default password is 'Room2025!'"
            />

            <TextField
              type="password"
              label="New Password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              fullWidth
            />

            <TextField
              type="password"
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              fullWidth
            />

            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success">
                {success}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
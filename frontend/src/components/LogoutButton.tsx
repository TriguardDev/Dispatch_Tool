import React from "react";
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
    <button
      onClick={handleLogout}
      className="ml-auto bg-gray-800 hover:bg-red-600 text-white py-1 px-3 rounded"
    >
      Logout
    </button>
  );
}
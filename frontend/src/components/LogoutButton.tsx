import React from "react";
import { clearToken } from "../utils/session";

interface Props {
  onLogout?: () => void;
}

export default function LogoutButton({ onLogout }: Props) {
  const handleLogout = () => {
    clearToken();
    localStorage.removeItem("user"); // clear saved user
    if (onLogout) {
      onLogout();
    } else {
      window.location.reload(); // fallback: reload page to show login form
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

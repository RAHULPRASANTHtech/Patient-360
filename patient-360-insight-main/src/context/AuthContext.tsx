import React, { createContext, useContext, useState, ReactNode } from "react";

// Added 'nurse' to the authorized platform roles
export type UserRole = "doctor" | "nurse" | "patient" | "receptionist" | "lab_technician" | "admin" |null;

interface AuthState {
  isLoggedIn: boolean;
  role: UserRole;
  userName: string;
  userId: string | null; // Added to map specific patients/staff via backend database IDs
  login: (role: UserRole, name: string, id: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const login = (r: UserRole, name: string, id: string) => {
    setRole(r);
    setUserName(name);
    setUserId(id);
    setIsLoggedIn(true);
  };

  const logout = () => {
    setRole(null);
    setUserName("");
    setUserId(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, role, userName, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
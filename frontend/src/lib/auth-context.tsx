"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ApiError, login as loginRequest } from "./api";

interface AuthContextValue {
  token: string | null;
  username: string | null;
  isLoggingIn: boolean;
  loginError: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const login = useCallback(async (user: string, password: string) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await loginRequest(user, password);
      setToken(res.access_token);
      setUsername(user);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setLoginError("Incorrect username or password.");
      } else if (err instanceof ApiError) {
        setLoginError(err.message);
      } else {
        setLoginError("Something went wrong. Please try again.");
      }
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUsername(null);
    setLoginError(null);
  }, []);

  const value = useMemo(
    () => ({ token, username, isLoggingIn, loginError, login, logout }),
    [token, username, isLoggingIn, loginError, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

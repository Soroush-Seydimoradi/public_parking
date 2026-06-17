import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, API_URL } from "../lib/api";
import {
  AuthUser,
  clearAuth,
  getRefreshToken,
  hasAuthTokens,
  setAuthTokens,
  setStoredUser,
} from "../lib/auth-storage";

interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await apiFetch("/api/auth/me/");
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<AuthUser>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!hasAuthTokens()) {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      const currentUser = await fetchCurrentUser();
      if (!cancelled) {
        if (currentUser) {
          setUser(currentUser);
          setStoredUser(currentUser);
        } else {
          clearAuth();
          setUser(null);
        }
        setIsLoading(false);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (username: string, password: string, rememberMe: boolean) => {
      const response = await fetch(`${API_URL}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          (data as { detail?: string }).detail ?? "نام کاربری یا رمز عبور اشتباه است"
        );
      }

      const loginData = data as LoginResponse;
      setAuthTokens(loginData.access, loginData.refresh, loginData.user, rememberMe);
      setUser(loginData.user);
    },
    []
  );

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      await apiFetch("/api/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh }),
      }).catch(() => undefined);
    }
    clearAuth();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export type { AuthUser };

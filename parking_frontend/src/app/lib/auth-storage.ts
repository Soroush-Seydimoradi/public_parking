export interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string | null;
  phone: string | null;
  last_login: string | null;
  is_active: boolean;
  avatar: string;
}

const REMEMBER_KEY = "auth_remember";
const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const USER_KEY = "auth_user";

function getActiveStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(REMEMBER_KEY) === "true"
    ? localStorage
    : sessionStorage;
}

export function setRememberMe(remember: boolean): void {
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, "true");
    return;
  }
  localStorage.removeItem(REMEMBER_KEY);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAccessToken(): string | null {
  return getActiveStorage()?.getItem(ACCESS_KEY) ?? null;
}

export function getRefreshToken(): string | null {
  return getActiveStorage()?.getItem(REFRESH_KEY) ?? null;
}

export function getStoredUser(): AuthUser | null {
  const raw = getActiveStorage()?.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuthTokens(
  access: string,
  refresh: string,
  user: AuthUser,
  remember: boolean
): void {
  setRememberMe(remember);
  const storage = remember ? localStorage : sessionStorage;
  if (!remember) {
    sessionStorage.clear();
  }
  storage.setItem(ACCESS_KEY, access);
  storage.setItem(REFRESH_KEY, refresh);
  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function setAccessToken(access: string): void {
  getActiveStorage()?.setItem(ACCESS_KEY, access);
}

export function setStoredUser(user: AuthUser): void {
  getActiveStorage()?.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(REMEMBER_KEY);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function hasAuthTokens(): boolean {
  return Boolean(getAccessToken() && getRefreshToken());
}

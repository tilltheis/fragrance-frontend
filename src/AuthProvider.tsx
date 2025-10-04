// auth.tsx
import { Octokit } from "octokit";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Session = {
  accessToken: string;
};

export type Auth = LoggedInAuth | LoggedOutAuth;
export type LoggedInAuth = { status: "loggedIn"; session: Session; logout: () => void }
export type LoggedOutAuth = { status: "loggedOut"; login: ({ password }: { password: string }) => Promise<boolean> }


type AuthState =
  | { status: "loggedOut" }
  | { status: "loggedIn"; session: Session };

/** ---------- Persistence helpers ---------- */
const STORAGE_KEY = "app.session.v1";

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (!s?.accessToken) return null;
    return s;
  } catch {
    return null;
  }
}

function saveSession(s: Session | null) {
  if (s) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  else sessionStorage.removeItem(STORAGE_KEY);
}

/** ---------- Context ---------- */
type Ctx = {
  auth: AuthState;
  // Actions exist, but `useAuth()` will expose only legal ones per state
  login: ({ password }: { password: string }) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<Ctx | null>(null);

/** ---------- Provider ---------- */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // RAII: decide initial state synchronously (no "checking" needed)
  const [auth, setAuth] = useState<AuthState>(() => {
    const session = typeof window !== "undefined" ? loadSession() : null;
    return session ? { status: "loggedIn", session } : { status: "loggedOut" };
  });

  const login = useCallback(async ({ password }: { password: string }) => {
    if (auth.status !== "loggedOut") return;
    try {
      const octokit = new Octokit({ auth: password });
      await octokit.rest.users.getAuthenticated();
      const session = { accessToken: password };
      saveSession(session);
      setAuth({ status: "loggedIn", session });
      return true;
    } catch {
      return false;
    }
  }, [auth.status]);

  const logout = useCallback(() => {
    if (auth.status !== "loggedIn") return; // idempotent guard
    saveSession(null);
    setAuth({ status: "loggedOut" });
    // optionally call provider logout/revoke endpoint
  }, [auth.status]);

  // Cross-tab sync (another tab may sign in/out)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== sessionStorage || e.key !== STORAGE_KEY) return;
      const session = loadSession();
      setAuth(session ? { status: "loggedIn", session } : { status: "loggedOut" });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Re-validate on focus/visibility (handles idle expiry/revocation)
  useEffect(() => {
    const recheck = () => {
      const session = loadSession();
      setAuth(session ? { status: "loggedIn", session } : { status: "loggedOut" });
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, []);

  const value = useMemo<Ctx>(() => ({ auth, login, logout }), [auth, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** ---------- Public hook (state-dependent actions) ---------- */
export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");

  const { auth, login, logout } = ctx;
  return auth.status === "loggedIn"
    ? { status: "loggedIn", session: auth.session, logout }
    : { status: "loggedOut", login };
}

/** ---------- (Optional) strict accessor for protected areas ---------- */
export function useSession(): Session | undefined {
  const a = useAuth();
  return a.status === "loggedIn" ? a.session : undefined;
}

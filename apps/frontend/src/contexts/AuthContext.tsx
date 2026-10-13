import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { LoginInput, RegisterInput } from '@rebequi/shared/schemas';
import type { User } from '@rebequi/shared/types';
import {
  changePassword as changePasswordRequest,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '@/services/api/auth';
import { ApiError } from '@/services/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { clearProvisionalCredentials } from '@/lib/provisional-credentials';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginInput) => Promise<User>;
  register: (payload: RegisterInput) => Promise<User>;
  changePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<User>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const sessionUserId = useRef<string | null>(null);
  const sessionResolved = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const setSessionUser = useCallback((nextUser: User | null) => {
    // The first probe starts with an empty, non-persisted client. Clearing it here
    // cancels public queries mounted during bootstrap and strands their observers.
    // Once a session has been resolved, account changes must still clear private data.
    if (sessionResolved.current && sessionUserId.current !== (nextUser?.id ?? null)) queryClient.clear();
    sessionResolved.current = true;
    sessionUserId.current = nextUser?.id ?? null;
    setUser(nextUser);
  }, [queryClient]);

  const refreshSession = useCallback(async (preserveOnTransientFailure = false): Promise<User | null> => {
    try {
      const currentUser = await getCurrentUser();
      setSessionUser(currentUser);
      setStatus('authenticated');
      return currentUser;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setSessionUser(null);
        setStatus('unauthenticated');
        return null;
      }

      // A reconnect probe must not erase a known session and its in-memory draft
      // for a transient network/server failure. Every mutation still authenticates
      // independently on the server; an actual 401 always revokes the session.
      if (preserveOnTransientFailure && sessionResolved.current && sessionUserId.current) throw error;

      setSessionUser(null);
      setStatus('unauthenticated');
      throw error;
    }
  }, [setSessionUser]);

  useEffect(() => {
    void refreshSession().catch(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
  }, [refreshSession]);

  useEffect(() => {
    const reconnect = () => {
      // Keep the authenticated workspace mounted while revalidating its identity.
      // An offline bootstrap has no known identity: hold login guards until the
      // cookie is checked, instead of redirecting before the probe completes.
      if (!sessionUserId.current) setStatus('loading');
      void refreshSession(true).catch(() => { /* Existing session remains only for transient failure. */ });
    };
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, [refreshSession]);

  const login = useCallback(async (payload: LoginInput) => {
    const response = await loginRequest(payload);
    clearProvisionalCredentials();
    setSessionUser(response.user);
    setStatus('authenticated');
    return response.user;
  }, [setSessionUser]);

  const register = useCallback(async (payload: RegisterInput) => {
    const response = await registerRequest(payload);
    setSessionUser(response.user);
    setStatus('authenticated');
    return response.user;
  }, [setSessionUser]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      queryClient.clear();
      clearProvisionalCredentials();
      setSessionUser(null);
      setStatus('unauthenticated');
    }
  }, [queryClient, setSessionUser]);

  const changePassword = useCallback(async (payload: { currentPassword: string; newPassword: string }) => {
    const response = await changePasswordRequest(payload);
    setUser(response.user);
    setStatus('authenticated');
    return response.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated' && !!user,
      isLoading: status === 'loading',
      login,
      register,
      changePassword,
      logout,
      refreshSession,
    }),
    [changePassword, login, logout, refreshSession, register, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

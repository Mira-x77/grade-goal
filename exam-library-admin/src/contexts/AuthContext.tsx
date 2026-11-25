import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

/**
 * The admin panel is a local operator tool with no sign-in screen, so it runs
 * under a fixed local identity. `user.email` is only used for attribution
 * (subscription code generation). Supabase reads/writes still go through the
 * service-role client in `lib/supabaseClient.ts`.
 */
const LOCAL_ADMIN = { id: 'local-admin', email: 'admin@gostudy.app' } as User;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: LOCAL_ADMIN, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

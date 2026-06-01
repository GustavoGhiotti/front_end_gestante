import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User } from '../types/domain';
import { getCurrentUser, logout as logoutApi } from '../services/api';
import { getNotificationPermission, syncPushSubscription } from '../services/notifications';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (getNotificationPermission() !== 'granted') return;
    syncPushSubscription().catch(() => undefined);
  }, [user]);

  function logout() {
    logoutApi();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}

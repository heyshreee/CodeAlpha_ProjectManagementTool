import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import LoaderHelix from '@/components/ui/LoaderHelix';

export function useInitAuth() {
  const init = useAuthStore((s) => s.init);
  const initialized = useAuthStore((s) => s.initialized);
  useEffect(() => {
    if (!initialized) init();
  }, [initialized, init]);
  return initialized;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const initialized = useInitAuth();
  const user = useAuthStore((s) => s.user);
  if (!initialized) {
    return (
      <div className="h-full flex items-center justify-center bg-surface">
        <LoaderHelix speed={700} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const initialized = useInitAuth();
  const user = useAuthStore((s) => s.user);
  if (!initialized) {
    return (
      <div className="h-full flex items-center justify-center bg-surface">
        <LoaderHelix speed={700} />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { UserRole } from '@rebequi/shared/types';
import { useAuth } from '@/contexts/AuthContext';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="rounded-lg border bg-white px-6 py-4 text-sm text-muted-foreground shadow-sm">
        Carregando sessao...
      </div>
    </div>
  );
}

export function ProtectedRoute({
  allowedRoles,
  redirectTo,
}: {
  allowedRoles?: UserRole[];
  redirectTo: string;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallbackRoute = user.role === 'ADMIN' ? '/painel-lojista/painel/visao-geral' : '/painel-cliente';
    return <Navigate to={fallbackRoute} replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && user) {
    const destination = user.role === 'ADMIN' ? '/painel-lojista/painel/visao-geral' : '/painel-cliente';
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}

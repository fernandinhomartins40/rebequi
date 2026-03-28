import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { hasMerchantPermission, isMerchantUserRole, type MerchantPermission } from '@rebequi/shared/constants';
import type { UserRole } from '@rebequi/shared/types';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultRouteForRole } from '@/lib/auth-routing';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="rounded-lg border bg-white px-6 py-4 text-sm text-muted-foreground shadow-sm">
        Carregando sessao...
      </div>
    </div>
  );
}

function resolveFallbackRoute(role?: UserRole | string | null) {
  return getDefaultRouteForRole(role);
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
    return <Navigate to={resolveFallbackRoute(user.role)} replace />;
  }

  return <Outlet />;
}

export function MerchantPermissionRoute({
  permission,
}: {
  permission: MerchantPermission;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/painel-lojista" replace state={{ from: location }} />;
  }

  if (!isMerchantUserRole(user.role) || !hasMerchantPermission(user.role, permission)) {
    return <Navigate to={resolveFallbackRoute(user.role)} replace />;
  }

  return <Outlet />;
}

export function RoleHomeRedirect() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <Navigate to={resolveFallbackRoute(user?.role)} replace />;
}

export function GuestRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={resolveFallbackRoute(user.role)} replace />;
  }

  return <Outlet />;
}

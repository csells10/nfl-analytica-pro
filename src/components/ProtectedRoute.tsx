import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Gates protected routes on auth-restore completion.
 *
 * While the initial session-restore is in flight we render an empty themed
 * surface (matching the app background) instead of a centered spinner, so the
 * shell appears instantly and the route content can swap in without a flash.
 * Auth restore is synchronous (localStorage), so this state is typically a
 * single frame.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}

import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authApi } from "@/lib/auth";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [location, setLocation] = useLocation();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: authApi.me,
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale to force fresh checks
    gcTime: 0, // Don't cache auth data
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if ((error || !data?.user) && !isLoading && location !== "/login") {
      setLocation("/login");
    }
  }, [error, data?.user, isLoading, location, setLocation]);

  // If we have user data and we're on login page, redirect to dashboard
  useEffect(() => {
    if (data?.user && location === "/login") {
      setLocation("/");
    }
  }, [data?.user, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !data?.user) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}

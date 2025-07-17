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
    refetchInterval: 5000, // Check auth status every 5 seconds
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if ((error || !data?.user) && !isLoading) {
      setLocation("/login");
    }
  }, [error, data?.user, isLoading, setLocation]);

  // Force refetch when coming from login page
  useEffect(() => {
    if (location === "/") {
      refetch();
    }
  }, [location, refetch]);

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

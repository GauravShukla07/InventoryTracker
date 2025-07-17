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
    retry: 1, // Allow one retry for race conditions
    retryDelay: 500, // Wait 500ms before retry
    refetchOnWindowFocus: false,
    staleTime: 5000, // Cache for 5 seconds to avoid excessive calls
    gcTime: 10000, // Keep in cache for 10 seconds
  });

  // Redirect to login if not authenticated (but be more patient)
  useEffect(() => {
    // Only redirect if we're certain authentication failed and not currently loading
    if (error && !isLoading && location !== "/login") {
      // Add a small delay to avoid race conditions
      const timer = setTimeout(() => {
        setLocation("/login");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [error, isLoading, location, setLocation]);

  // If we have user data and we're on login page, redirect to dashboard
  useEffect(() => {
    if (data?.user && location === "/login") {
      setLocation("/");
    }
  }, [data?.user, location, setLocation]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only render null (which triggers redirect) if we have a clear error
  if (error && !data?.user) {
    return null;
  }

  // If we have user data, render the children
  if (data?.user) {
    return <>{children}</>;
  }

  // Default loading state for unclear cases
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
  LayoutDashboard, 
  Plus, 
  Package, 
  ArrowLeftRight, 
  Wrench, 
  BarChart3, 
  Settings, 
  Users,
  Menu,
  ChevronDown,
  LogOut,
  Database
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Add Asset", href: "/add-asset", icon: Plus },
  { name: "All Assets", href: "/assets", icon: Package },
  { name: "Transfer Assets", href: "/transfer", icon: ArrowLeftRight },
  { name: "Repair Tracking", href: "/repair", icon: Wrench },
  { name: "User Management", href: "/users", icon: Users, adminOnly: true },
  { name: "Connection Test", href: "/connection-test", icon: Database },
  { name: "Reports", href: "/reports", icon: BarChart3 },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: authApi.me,
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      // Remove auth token cookie
      document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your account",
      });
      // Redirect to login page after successful logout
      setLocation("/login");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return "Never";
    return new Date(lastLogin).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getUserInitials = (username: string) => {
    return username
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border fixed top-0 left-0 right-0 z-40 h-16">
        <div className="flex items-center justify-between px-6 h-full">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-foreground">
              Inventory Management System
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {data?.user && (
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-foreground">
                  {data.user.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last login: {formatLastLogin(data.user.lastLogin)}
                </p>
              </div>
            )}

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {data?.user && getUserInitials(data.user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                <DropdownMenuItem>Preferences</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 h-full w-72 bg-card border-r border-border z-30 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="p-6">
          <nav className="space-y-2">
            {navigation
              .filter((item) => {
                // Show admin-only items only to admins
                if ('adminOnly' in item && item.adminOnly) {
                  return data?.user?.role === 'admin';
                }
                return true;
              })
              .map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <a
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </a>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 pt-16 min-h-screen">
        {children}
      </main>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

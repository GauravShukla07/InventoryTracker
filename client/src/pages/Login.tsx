import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { loginSchema, registerSchema, type LoginCredentials, type RegisterData } from "@shared/schema";
import { UserPlus, LogIn, Key, Info } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Login() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [showInvitationCode, setShowInvitationCode] = useState(false);

  // Check if registration is enabled
  const { data: registrationStatus } = useQuery({
    queryKey: ["/api/auth/registration-status"],
    queryFn: () => apiRequest("/api/auth/registration-status"),
  });

  const loginForm = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      invitationCode: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      // Set the auth data in cache immediately
      queryClient.setQueryData(["/api/auth/me"], data);
      
      // Wait a bit longer for cookies to be set, then verify authentication
      await new Promise(resolve => setTimeout(resolve, 200));
      
      try {
        // Verify authentication works by making a test call
        await authApi.me();
        
        toast({
          title: "Welcome back!",
          description: "You have been successfully logged in",
        });
        
        // Invalidate all queries to refresh data
        queryClient.invalidateQueries();
        
        // Redirect to dashboard
        setLocation("/");
      } catch (error) {
        // If verification fails, show error but don't redirect
        toast({
          title: "Authentication issue",
          description: "Login succeeded but authentication verification failed. Please try refreshing the page.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await apiRequest("/api/auth/register", { method: "POST", body: data });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Registration successful!",
        description: data.message || "You can now log in with your credentials",
      });
      registerForm.reset();
      // Switch to login tab
      const loginTab = document.querySelector('[value="login"]') as HTMLElement;
      loginTab?.click();
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data: LoginCredentials) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Theme Toggle in top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Inventory Management System
          </CardTitle>
          <CardDescription className="text-center">
            Access your inventory management dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </Form>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Demo Credentials:</strong><br />
                  Admin: admin@inventory.com / password123<br />
                  Manager: manager@inventory.com / manager123<br />
                  Operator: operator@inventory.com / operator123<br />
                  Viewer: viewer@inventory.com / viewer123
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your username"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter your email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your password (min 6 characters)"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full flex items-center gap-2"
                        onClick={() => setShowInvitationCode(!showInvitationCode)}
                      >
                        <Key className="h-4 w-4" />
                        {showInvitationCode ? "Hide" : "Have"} Invitation Code?
                      </Button>

                      {showInvitationCode && (
                        <FormField
                          control={registerForm.control}
                          name="invitationCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Invitation Code (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter invitation code"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Registration Info:</strong><br />
                    • Without invitation code: Creates a Viewer account<br />
                    • With valid invitation code: Higher permission levels<br />
                    • Contact an admin for invitation codes
                  </AlertDescription>
                </Alert>
              </TabsContent>
          </Tabs>
          
          <div className="mt-4 text-center">
            <Link href="/connection-test" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
              Test Database Connection
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
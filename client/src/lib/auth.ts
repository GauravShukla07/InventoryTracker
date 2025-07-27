import { apiRequest } from "./queryClient";
import type { LoginCredentials } from "@shared/schema-new";

export interface User {
  id: number;
  username: string;
  email: string;
  lastLogin: string | null;
  createdAt: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<{ user: User; token: string }> => {
    const response = await apiRequest("/api/auth/login", {
      method: "POST",
      body: credentials,
    });
    const data = await response.json();
    
    // Store token in localStorage as fallback
    if (data.token) {
      localStorage.setItem('authToken', data.token);
    }
    
    return data;
  },

  logout: async (): Promise<void> => {
    await apiRequest("/api/auth/logout", { method: "POST" });
    // Clear token from localStorage
    localStorage.removeItem('authToken');
  },

  me: async (): Promise<{ user: User }> => {
    const response = await apiRequest("/api/auth/me");
    return response.json();
  },

  getToken: (): string | null => {
    return localStorage.getItem('authToken');
  }
};

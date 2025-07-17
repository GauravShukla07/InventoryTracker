import { apiRequest } from "./queryClient";

export interface User {
  id: number;
  username: string;
  email: string;
  lastLogin: string | null;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<{ user: User }> => {
    const response = await apiRequest("POST", "/api/auth/login", credentials);
    return response.json();
  },

  logout: async (): Promise<void> => {
    await apiRequest("POST", "/api/auth/logout");
  },

  me: async (): Promise<{ user: User }> => {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  },
};

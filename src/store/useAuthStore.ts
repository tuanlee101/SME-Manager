import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: any | null;
  token: string | null;
  loading: boolean;
  setAuth: (user: any, token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,
  setAuth: (user, token) => {
    set({ user, token, loading: false });
  },
  setLoading: (loading) => set({ loading }),
  logout: () => {
    set({ user: null, token: null, loading: false });
  },
}));

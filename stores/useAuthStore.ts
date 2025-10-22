import { create } from "zustand";
import { persist } from "zustand/middleware";

const users = [
  { id: 1, name: "Alice", username: "alice", password: "password1" },
  { id: 2, name: "Bob", username: "bob", password: "password2" },
  // ...more users
];
interface User {
  id: number;
  name: string;
  username: string;
}

interface AuthState {
  currentUser: User | null;
  mockToken: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      mockToken: null,
      login: (username, password) => {
        const found = users.find(
          (u) => u.username === username && u.password === password
        );
        if (found) {
          const fakeToken = `fake-jwt-${btoa(`${username}:${Date.now()}`)}`;
          set({
            currentUser: {
              id: found.id,
              name: found.name,
              username: found.username,
            },
            mockToken: fakeToken,
          });
          return true;
        }
        return false;
      },
      logout: () => set({ currentUser: null, mockToken: null }),
    }),
    {
      name: "auth-storage",
    }
  )
);

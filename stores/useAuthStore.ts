import { create } from "zustand";
import { persist } from "zustand/middleware";

const users = [
  { id: 1, name: "User1", username: "user1", password: "password1" },
  { id: 2, name: "User2", username: "user2", password: "password2" },
  { id: 3, name: "User3", username: "user3", password: "password3" },
  { id: 4, name: "User4", username: "user4", password: "password4" },
  { id: 5, name: "User5", username: "user5", password: "password5" },
  { id: 6, name: "User6", username: "user6", password: "password6" },
  { id: 7, name: "User7", username: "user7", password: "password7" },
  { id: 8, name: "User8", username: "user8", password: "password8" },
  { id: 9, name: "User9", username: "user9", password: "password9" },
  { id: 10, name: "User10", username: "user10", password: "password10" },
  { id: 11, name: "User11", username: "user11", password: "password11" },
  { id: 12, name: "User12", username: "user12", password: "password12" },
  { id: 13, name: "User13", username: "user13", password: "password13" },
  { id: 14, name: "User14", username: "user14", password: "password14" },
  { id: 15, name: "User15", username: "user15", password: "password15" },
  { id: 16, name: "User16", username: "user16", password: "password16" },
  { id: 17, name: "User17", username: "user17", password: "password17" },
  { id: 18, name: "User18", username: "user18", password: "password18" },
  { id: 19, name: "User19", username: "user19", password: "password19" },
  { id: 20, name: "User20", username: "user20", password: "password20" },
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

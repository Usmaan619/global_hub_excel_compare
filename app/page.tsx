"use client";

import { useEffect, useState } from "react";
import LoginPage from "./login/page";
import DashboardPage from "./dashboard/page";

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("auth-storage");
    if (storedToken) {
      try {
        const parsed = JSON.parse(storedToken);
        const token = parsed?.state?.mockToken;
        console.log("token: ", token);
        if (token) {
          setToken(token);
        }
      } catch (e) {
        console.error("Invalid token storage:", e);
      }
    }
  }, []);

  {
    return !token ? <LoginPage /> : <DashboardPage />;
  }
}

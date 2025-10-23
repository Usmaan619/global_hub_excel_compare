"use client";

import { useEffect, useState } from "react";
import LoginPage from "./login/page";
import DashboardPage from "./dashboard/page";

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [checking, setChecking] = useState(true);

  // Mark component as mounted (client-side)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect mobile (after mount)
  useEffect(() => {
    if (!mounted) return;

    const isMobileDevice = /iPhone|iPad|iPod|Android|Mobile/i.test(
      navigator.userAgent
    );
    setIsMobile(isMobileDevice);
  }, [mounted]);

  // Check token (only for desktop)
  useEffect(() => {
    if (!mounted || isMobile) return;

    const storedToken = localStorage.getItem("auth-storage");
    if (storedToken) {
      try {
        const parsed = JSON.parse(storedToken);
        const token = parsed?.state?.mockToken;
        console.log("token:", token);
        if (token) {
          setToken(token);
        }
      } catch (e) {
        console.error("Invalid token storage:", e);
      }
    }
    setChecking(false);
  }, [mounted, isMobile]);

  // Don’t render anything before mount
  if (!mounted) return null;

  // Block mobile access
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
        <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">
            Mobile Not Supported
          </h1>
          <p className="text-gray-700 mb-6">
            This application is designed for desktop use only. Please open it on
            a desktop or laptop browser.
          </p>
        </div>
      </div>
    );
  }

  // Show loading while checking session/token
  if (checking) {
    return <div className="text-center py-20 text-gray-500">Loading...</div>;
  }

  // If token exists → show dashboard, else → show login page
  return !token ? <LoginPage /> : <DashboardPage />;
}

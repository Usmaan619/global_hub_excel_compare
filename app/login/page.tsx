"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { toast } = useToast();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    const storedToken = localStorage.getItem("auth-storage");

    try {
      const parsed = storedToken ? JSON.parse(storedToken) : null;
      const token = parsed?.state?.mockToken;

      if (token) {
        // Already logged in → redirect to dashboard
        router.replace("/dashboard");
      }
    } catch (error) {
      console.error("Error checking login token:", error);
    }
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const success = login(userName, password);
    if (success) {
      router.replace("/dashboard");
    } else {
      setError("Invalid credentials");
    }
    toast({
      title: "Login not configured",
      description: "Connect an auth integration to enable sign-in.",
    });
    setIsLoading(false);
  };

  return (
    <main className="min-h-dvh grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
        <div>
          <div className="inline-flex items-center gap-2 mb-16">
            <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <span className="text-lg font-bold">EC</span>
            </div>
            <span className="text-xl font-semibold">Excel Compare</span>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Compare spreadsheets instantly
            </h2>
            <p className="text-primary-foreground/80 text-lg">
              Upload two files, choose sheets, and instantly see mismatches with
              exportable results. Perfect for data validation and
              reconciliation.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold">✓</span>
              </div>
              <div>
                <p className="font-semibold">Multiple comparison modes</p>
                <p className="text-primary-foreground/70 text-sm">
                  Position-based, key-based, and fuzzy matching
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold">✓</span>
              </div>
              <div>
                <p className="font-semibold">Advanced settings</p>
                <p className="text-primary-foreground/70 text-sm">
                  Case sensitivity, space handling, and precision control
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold">✓</span>
              </div>
              <div>
                <p className="font-semibold">Export results</p>
                <p className="text-primary-foreground/70 text-sm">
                  Download comparison results and common rows
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-primary-foreground/60 text-sm">
          © 2025 Excel Compare. All rights reserved.
        </p>
      </div>

      <div className="flex items-center justify-center p-4 lg:p-12">
        <Card className="w-full max-w-md border-0 lg:border shadow-none lg:shadow-lg">
          <CardHeader className="space-y-2 pb-6">
            <div className="lg:hidden mb-4">
              <div className="inline-flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                  <span className="text-sm font-bold">EC</span>
                </div>
                <span className="font-semibold">Excel Compare</span>
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userName" className="text-sm font-medium">
                  Username
                </Label>
                <Input
                  id="userName"
                  type="text"
                  autoComplete="username"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your username"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  {/* <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link> */}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10"
                  >
                    {showPw ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked as boolean)}
                />
                <Label
                  htmlFor="remember"
                  className="text-sm font-normal cursor-pointer"
                >
                  Remember me
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-10 mt-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Signing in..."
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
              <p>
                Developed by{" "}
                <a
                  href="http://usman-hasan-portfolio.surge.sh/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Usman Hasan
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

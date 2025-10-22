"use client";

import type React from "react";
import { useState } from "react";
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
import { Eye, EyeOff } from "lucide-react";
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

  const login = useAuthStore((state) => state.login);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = login(userName, password);
    if (success) {
      router.push("/dashboard");
    } else {
      setError("Invalid credentials");
    }
    toast({
      title: "Login not configured",
      description: "Connect an auth integration to enable sign-in.",
    });
  };

  return (
    <main className="min-h-dvh grid place-items-center px-4">
      <Card className="w-full max-w-sm border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <CardHeader className="text-center pb-4">
          <div className="text-center mb-8">
            <img
              src="/images/logo.svg"
              alt="Upload two spreadsheets, choose sheets, and instantly see mismatches with exportable results."
              className="h-16 mx-auto mb-4 rounded-lg
"
            />
            <h1 className="text-2xl font-bold mb-2">Excel Compare</h1>
            <p className="">
              Upload two spreadsheets, choose sheets, and instantly see
              mismatches with exportable results.{" "}
            </p>
          </div>
          <CardTitle className="text-xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to access your dashboard</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="userName">Username</Label>
              <Input
                id="userName"
                type="userName"
                autoComplete="UserName"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="yourusername"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit">Sign in</Button>
          </form>
          <div className="text-center mt-6 text-sm text-gray-500">
            <p>© 2025 Excel Compare. All rights reserved.</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

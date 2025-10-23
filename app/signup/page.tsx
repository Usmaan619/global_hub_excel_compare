"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuthStore } from "@/stores/useAuthStore"
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const router = useRouter()
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const login = useAuthStore((state) => state.login)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!agreeTerms) {
      setError("You must agree to the terms and conditions")
      return
    }

    setIsLoading(true)

    const success = login(email, password)
    if (success) {
      router.push("/dashboard")
    } else {
      setError("Signup failed. Please try again.")
    }
    toast({
      title: "Signup not configured",
      description: "Connect an auth integration to enable sign-up.",
    })
    setIsLoading(false)
  }

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
            <h2 className="text-4xl font-bold mb-4 leading-tight">Start comparing spreadsheets today</h2>
            <p className="text-primary-foreground/80 text-lg">
              Join thousands of users who trust Excel Compare for accurate data validation and reconciliation.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">Instant comparison</p>
                <p className="text-primary-foreground/70 text-sm">Upload files and get results in seconds</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">Multiple comparison modes</p>
                <p className="text-primary-foreground/70 text-sm">Position-based, key-based, and fuzzy matching</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">Export results</p>
                <p className="text-primary-foreground/70 text-sm">Download comparison results and common rows</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-primary-foreground/60 text-sm">© 2025 Excel Compare. All rights reserved.</p>
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
            <CardTitle className="text-2xl">Create account</CardTitle>
            <CardDescription>Sign up to start comparing spreadsheets</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
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
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPw ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={showConfirmPw ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirmPw((s) => !s)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10"
                  >
                    {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-relaxed">
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary hover:underline">
                    terms and conditions
                  </Link>
                </Label>
              </div>

              <Button type="submit" className="w-full h-10 mt-6" disabled={isLoading}>
                {isLoading ? (
                  "Creating account..."
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
              <p>
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

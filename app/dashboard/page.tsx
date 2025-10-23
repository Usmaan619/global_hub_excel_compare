"use client";

import { useEffect, useState } from "react";
import ExcelComparator from "@/components/excel-comparator";
import { ThemeToggle } from "@/components/theme-toggle";
import LogoutDialog from "@/components/logout-dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("auth-storage");

    try {
      const parsed = storedToken ? JSON.parse(storedToken) : null;
      const token = parsed?.state?.mockToken;

      if (!token) {
        // Not logged in → redirect to login
        router.replace("/login");
      } else {
        // Logged in → allow access
        setLoading(false);
      }
    } catch (error) {
      console.error("Error reading token:", error);
      router.replace("/login");
    }
  }, [router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto  px-7 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo.svg"
              alt="Global Hub - Business Process Outsourcing"
              className="h-9 mx-auto  rounded-md
"
            />
            <span className="font-semibold text-foreground text-pretty">
              Excel Compare
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* <Button asChild variant="ghost"> */}
            {/* <Link href="/login">Login</Link> */}
            {/* </Button> */}
            <Button asChild>
              <div className="bg-red-600" onClick={() => setIsDialogOpen(true)}>
                logout
              </div>
            </Button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto  px-7 py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-balance">
            Compare Excel files and spot differences fast
          </h1>
          <p className="text-muted-foreground mt-2">
            Upload two spreadsheets, choose sheets, and instantly see mismatches
            with exportable results.
          </p>
        </div>

        <ExcelComparator />
      </section>
      <LogoutDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </main>
  );
}

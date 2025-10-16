import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import ExcelComparator from "@/components/excel-comparator";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-foreground text-pretty">
              Excel Compare
            </span>
            <span
              aria-label="Beta"
              className="text-[10px] leading-none rounded-full border border-border px-2 py-1 text-muted-foreground"
            >
              {/* Beta */}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              {/* <Link href="/login">Login</Link> */}
            </Button>
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8">
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
    </main>
  );
}

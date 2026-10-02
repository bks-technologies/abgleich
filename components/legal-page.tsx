import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" />
        Zum Dashboard
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">{title}</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-pretty text-ink/85 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_h2]:pt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-ink">
        {children}
      </div>
    </main>
  );
}

export function LegalLinks({ className }: { className?: string }) {
  return (
    <span className={className}>
      <Link href="/impressum" className="hover:text-ink">Impressum</Link>
      <span aria-hidden> · </span>
      <Link href="/datenschutz" className="hover:text-ink">Datenschutz</Link>
    </span>
  );
}

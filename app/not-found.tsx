import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center px-4">
      <p className="font-mono text-[13px] text-faint">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Diese Seite gibt es nicht.</h1>
      <p className="mt-2 text-sm text-muted">Vielleicht ein alter Link. Das Dashboard liegt auf der Startseite.</p>
      <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-ink">
        Zum Dashboard
      </Link>
    </main>
  );
}

import Link from "next/link";

export default function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-black text-white">
      <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-black/90 backdrop-blur">
        <div className="container max-w-3xl">
          <div className="flex items-center gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80">
              <img src="/logo-gooey.png" alt="GaylyFans" className="h-8 w-auto" />
              <span className="text-lg font-bold">GaylyFans</span>
            </Link>
          </div>
        </div>
      </nav>
      <div className="container max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">{title}</h1>
        <div className="prose prose-invert prose-zinc max-w-none text-zinc-300 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:mb-4 [&_ul]:mb-4 [&_li]:mb-1">
          {children}
        </div>
      </div>
      <footer className="border-t border-zinc-800 py-6">
        <div className="container max-w-3xl">
          <div className="flex flex-wrap gap-4 px-4">
            <Link href="/about" className="text-sm text-zinc-400 hover:text-white">About</Link>
            <Link href="/privacy" className="text-sm text-zinc-400 hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="text-sm text-zinc-400 hover:text-white">Terms of Service</Link>
            <Link href="/content-policy" className="text-sm text-zinc-400 hover:text-white">Content Policy</Link>
            <Link href="/contact" className="text-sm text-zinc-400 hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

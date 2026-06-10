"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/matches", label: "Matches" },
  { href: "/historic", label: "Historic" },
  { href: "/arena", label: "Arena" },
];

/**
 * Persistent, mobile-first top navigation shared across the browsing pages
 * (landing, match browser, historic moments). Immersive flows (simulation,
 * arena) render their own purpose-built chrome instead — see SiteChrome.
 */
export default function SiteHeader() {
  const pathname = usePathname() || "/";
  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050a18]/80 backdrop-blur-xl pt-safe">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-6">
        {/* Brand → home. Collapses to just the glyph under 400px to keep room
            for the section pills on the narrowest phones. */}
        <Link
          href="/"
          aria-label="CounterPlay home"
          className="group flex shrink-0 items-center gap-2"
        >
          <span className="text-lg text-[#00e5ff] transition-transform group-hover:scale-110 sm:text-xl">
            ◈
          </span>
          <span className="hidden text-sm font-black uppercase tracking-tight text-white xs:inline sm:text-base">
            Counter<span className="text-[#00e5ff]">play</span>
          </span>
        </Link>

        {/* Section pills. Always visible, ≥40px tall for comfortable tapping. */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-10 items-center rounded-full px-3 text-xs font-bold tracking-wide transition-all sm:px-4 sm:text-sm ${
                  active
                    ? "border border-[#00e5ff]/30 bg-[#00e5ff]/15 text-[#00e5ff] shadow-[0_0_18px_rgba(0,229,255,0.15)]"
                    : "border border-transparent text-[#94a3b8] hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

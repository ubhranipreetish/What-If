"use client";
import { usePathname } from "next/navigation";
import SiteHeader from "./SiteHeader";

// The global header is shown only on the "browsing" surfaces. Immersive,
// full-screen flows (the simulation timeline, the arena, and the per-match
// detail view) ship their own contextual headers — stacking the global bar on
// top of those would mean two headers and wasted vertical space on mobile.
const HEADER_ROUTES = new Set(["/", "/matches", "/historic"]);

export default function SiteChrome() {
  const pathname = usePathname() || "/";
  if (!HEADER_ROUTES.has(pathname)) return null;
  return <SiteHeader />;
}

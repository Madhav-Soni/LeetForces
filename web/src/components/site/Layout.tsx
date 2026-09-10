import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Home" },
  { to: "/problemset", label: "Problemset" },
  { to: "/contests", label: "Contests" },
  { to: "/ratings", label: "Ratings" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-navy text-navy-foreground">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-2.5">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="border border-primary bg-primary px-1.5 py-0.5 text-[13px] font-bold tracking-tight text-primary-foreground">
            CF
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Codeforces</span>
        </Link>
        <nav className="flex items-center gap-1 text-[13px]">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="px-2.5 py-1 text-navy-foreground/75 hover:text-navy-foreground"
              activeProps={{ className: "px-2.5 py-1 text-navy-foreground border-b-2 border-primary" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
          <span className="mx-2 h-4 w-px bg-navy-foreground/25" />
          <Link to="/enter" className="px-2.5 py-1 text-navy-foreground/75 hover:text-navy-foreground">
            Login
          </Link>
          <Link
            to="/register"
            className="bg-primary px-2.5 py-1 text-primary-foreground hover:opacity-90"
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border py-4 text-center text-xs text-muted-foreground">
      Codeforces — 2010–2026 · Server time: {new Date().toUTCString().slice(5, 22)} UTC
    </footer>
  );
}

export function PageTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between border-b border-border pb-2">
      <h1 className="text-[19px] font-semibold tracking-tight">{title}</h1>
      {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
    </div>
  );
}

export function Layout({ children, wide = true }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className={wide ? "mx-auto w-full max-w-[1200px] flex-1 px-4 py-6" : "mx-auto w-full max-w-[440px] flex-1 px-4 py-14"}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

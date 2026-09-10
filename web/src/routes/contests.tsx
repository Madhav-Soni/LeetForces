import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layout, PageTitle } from "@/components/site/Layout";
import { pastContests, upcomingContests } from "@/lib/cf-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contests")({
  head: () => ({
    meta: [
      { title: "Contests — Codeforces" },
      {
        name: "description",
        content:
          "Upcoming contest schedule with countdowns and registration, plus past rounds with standings and virtual participation.",
      },
      { property: "og:title", content: "Contests — Codeforces" },
      {
        property: "og:description",
        content: "Upcoming rounds with countdowns and past contests with standings.",
      },
    ],
  }),
  component: Contests,
});

const types = ["Div. 1", "Div. 2", "Div. 3", "Educational", "Global"];

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function countdown(iso: string, now: number) {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return "running";
  const d = Math.floor(diff / 86400000);
  const h = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0");
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
  return `${d > 0 ? `${d}d ` : ""}${h}:${m}:${s}`;
}

function Contests() {
  const now = useNow();
  const [active, setActive] = useState<string[]>([]);

  const toggle = (t: string) =>
    setActive((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const match = (t: string) => active.length === 0 || active.includes(t);
  const upcoming = useMemo(() => upcomingContests.filter((c) => match(c.type)), [active]);
  const past = useMemo(() => pastContests.filter((c) => match(c.type)), [active]);

  return (
    <Layout>
      <PageTitle title="Contests" meta="all times UTC" />

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs uppercase tracking-[0.06em] text-muted-foreground">Type</span>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => toggle(t)}
            className={cn(
              "border px-1.5 py-0.5 text-[11px]",
              active.includes(t)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
        {active.length > 0 && (
          <button
            onClick={() => setActive([])}
            className="ml-1 text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            reset
          </button>
        )}
      </div>

      <section className="panel mb-6">
        <div className="panel-title">Upcoming contests</div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              <th className="px-2.5 py-1.5">Name</th>
              <th className="w-40 px-2.5 py-1.5">Start (UTC)</th>
              <th className="w-20 px-2.5 py-1.5">Length</th>
              <th className="w-32 px-2.5 py-1.5">Before start</th>
              <th className="w-32 px-2.5 py-1.5 text-right">Register</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {upcoming.map((c) => (
              <tr key={c.name} className="hover:bg-muted/60">
                <td className="px-2.5 py-2">
                  <span className="font-medium hover:underline">{c.name}</span>
                  <span className="tag-pill ml-2">{c.type}</span>
                </td>
                <td className="px-2.5 py-2 font-mono text-xs">
                  {new Date(c.startsAt).toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-2.5 py-2 font-mono text-xs">{c.duration}</td>
                <td className="px-2.5 py-2 font-mono text-xs text-primary">
                  {countdown(c.startsAt, now)}
                </td>
                <td className="px-2.5 py-2 text-right">
                  <button className="border border-primary bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:opacity-90">
                    Register
                  </button>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {c.registered?.toLocaleString()} registered
                  </div>
                </td>
              </tr>
            ))}
            {upcoming.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2.5 py-5 text-center text-xs text-muted-foreground">
                  No upcoming contests of this type.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="panel-title">Past contests</div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              <th className="px-2.5 py-1.5">Name</th>
              <th className="w-32 px-2.5 py-1.5">Date</th>
              <th className="w-20 px-2.5 py-1.5">Length</th>
              <th className="w-28 px-2.5 py-1.5 text-right">Participants</th>
              <th className="w-56 px-2.5 py-1.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {past.map((c) => (
              <tr key={c.name} className="hover:bg-muted/60">
                <td className="px-2.5 py-1.5">
                  <span className="font-medium hover:underline">{c.name}</span>
                  <span className="tag-pill ml-2">{c.type}</span>
                </td>
                <td className="px-2.5 py-1.5 text-xs text-muted-foreground">{c.date}</td>
                <td className="px-2.5 py-1.5 font-mono text-xs">{c.duration}</td>
                <td className="px-2.5 py-1.5 text-right font-mono text-xs">
                  {c.participants.toLocaleString()}
                </td>
                <td className="px-2.5 py-1.5 text-right text-xs">
                  <a className="text-teal hover:underline">view standings</a>
                  <span className="mx-1.5 text-border">|</span>
                  <a className="text-teal hover:underline">virtual participate</a>
                </td>
              </tr>
            ))}
            {past.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2.5 py-5 text-center text-xs text-muted-foreground">
                  No past contests of this type.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </Layout>
  );
}

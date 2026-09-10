import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layout, PageTitle } from "@/components/site/Layout";
import { Handle } from "@/components/site/Handle";
import { ratedUsers, rankForRating, rankLabel } from "@/lib/cf-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ratings")({
  head: () => ({
    meta: [
      { title: "Ratings — Codeforces Global Leaderboard" },
      {
        name: "description",
        content:
          "Global competitive programming rating leaderboard: rank, handle, current and maximum rating by country.",
      },
      { property: "og:title", content: "Ratings — Codeforces" },
      { property: "og:description", content: "Global rating leaderboard of top competitive programmers." },
    ],
  }),
  component: Ratings,
});

const PER_PAGE = 15;

function Ratings() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ratedUsers.filter((u) => !q || u.handle.toLowerCase().includes(q));
  }, [query]);

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pages);
  const slice = rows.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <Layout>
      <PageTitle title="Ratings" meta={`${rows.length} rated users`} />

      <div className="mb-4 flex items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Search by handle
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. tourist"
            className="h-8 w-64 border border-input bg-card px-2 font-mono text-[13px] text-foreground outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-muted text-left text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              <th className="w-14 px-2.5 py-1.5">#</th>
              <th className="px-2.5 py-1.5">Handle</th>
              <th className="px-2.5 py-1.5">Title</th>
              <th className="w-48 px-2.5 py-1.5">Country</th>
              <th className="w-24 px-2.5 py-1.5 text-right">Rating</th>
              <th className="w-24 px-2.5 py-1.5 text-right">Max</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {slice.map((u) => {
              const rank = rankForRating(u.rating);
              return (
                <tr key={u.handle} className="hover:bg-muted/60">
                  <td className="px-2.5 py-1 font-mono text-xs text-muted-foreground">{u.rank}</td>
                  <td className="px-2.5 py-1 font-mono">
                    <Handle handle={u.handle} rating={u.rating} />
                  </td>
                  <td className="px-2.5 py-1 text-xs text-muted-foreground">{rankLabel[rank]}</td>
                  <td className="px-2.5 py-1 text-xs">
                    <span className="mr-1.5">{u.flag}</span>
                    {u.country}
                  </td>
                  <td className={cn("px-2.5 py-1 text-right font-mono font-semibold")}>{u.rating}</td>
                  <td className="px-2.5 py-1 text-right font-mono text-xs text-muted-foreground">
                    {u.maxRating}
                  </td>
                </tr>
              );
            })}
            {slice.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2.5 py-6 text-center text-xs text-muted-foreground">
                  No handle matches “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs">
        <button
          onClick={() => setPage(Math.max(1, current - 1))}
          disabled={current === 1}
          className="border border-border px-2 py-1 text-muted-foreground disabled:opacity-40 hover:text-foreground"
        >
          Prev
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={cn(
              "border px-2 py-1",
              p === current
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => setPage(Math.min(pages, current + 1))}
          disabled={current === pages}
          className="border border-border px-2 py-1 text-muted-foreground disabled:opacity-40 hover:text-foreground"
        >
          Next
        </button>
      </div>
    </Layout>
  );
}

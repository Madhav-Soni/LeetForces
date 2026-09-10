import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layout, PageTitle } from "@/components/site/Layout";
import { allTags, problems, ratingBandClass } from "@/lib/cf-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/problemset")({
  head: () => ({
    meta: [
      { title: "Problemset — Codeforces" },
      {
        name: "description",
        content:
          "Browse and filter competitive programming problems by tag, difficulty rating and solve count.",
      },
      { property: "og:title", content: "Problemset — Codeforces" },
      {
        property: "og:description",
        content: "Filter thousands of problems by tags, difficulty band and number of solvers.",
      },
    ],
  }),
  component: Problemset,
});

type SortKey = "rating" | "solved" | "id";

function Problemset() {
  const [query, setQuery] = useState("");
  const [minRating, setMinRating] = useState(800);
  const [maxRating, setMaxRating] = useState(3000);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("id");
  const [dir, setDir] = useState<1 | -1>(1);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = problems.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) &&
        p.rating >= minRating &&
        p.rating <= maxRating &&
        (selectedTags.length === 0 || selectedTags.every((t) => p.tags.includes(t))),
    );
    return [...filtered].sort((a, b) => {
      const v =
        sort === "id" ? a.id.localeCompare(b.id) : sort === "rating" ? a.rating - b.rating : a.solved - b.solved;
      return v * dir;
    });
  }, [query, minRating, maxRating, selectedTags, sort, dir]);

  function toggleSort(key: SortKey) {
    if (sort === key) setDir(dir === 1 ? -1 : 1);
    else {
      setSort(key);
      setDir(key === "id" ? 1 : -1);
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  const arrow = (key: SortKey) => (sort === key ? (dir === 1 ? " ▲" : " ▼") : "");

  return (
    <Layout>
      <PageTitle title="Problemset" meta={`${rows.length} of ${problems.length} problems`} />

      <div className="panel mb-4 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Search
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="problem name or index"
              className="h-8 w-64 border border-input bg-card px-2 text-[13px] text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Difficulty from
            <input
              type="number"
              step={100}
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value) || 0)}
              className="h-8 w-24 border border-input bg-card px-2 font-mono text-[13px] text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            to
            <input
              type="number"
              step={100}
              value={maxRating}
              onChange={(e) => setMaxRating(Number(e.target.value) || 0)}
              className="h-8 w-24 border border-input bg-card px-2 font-mono text-[13px] text-foreground outline-none focus:border-primary"
            />
          </label>
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="h-8 border border-border px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear {selectedTags.length} tag(s)
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
          {allTags.map((tag) => {
            const on = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "border px-1.5 py-0.5 text-[11px]",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-muted text-left text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              <th className="w-8 px-2 py-1.5"></th>
              <th className="w-20 cursor-pointer px-2 py-1.5" onClick={() => toggleSort("id")}>
                #{arrow("id")}
              </th>
              <th className="px-2 py-1.5">Name</th>
              <th className="px-2 py-1.5">Tags</th>
              <th
                className="w-24 cursor-pointer px-2 py-1.5 text-right"
                onClick={() => toggleSort("rating")}
              >
                Difficulty{arrow("rating")}
              </th>
              <th
                className="w-24 cursor-pointer px-2 py-1.5 text-right"
                onClick={() => toggleSort("solved")}
              >
                Solved{arrow("solved")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-muted/60">
                <td className="px-2 py-1">
                  <span
                    className={cn(
                      "inline-block h-2.5 w-2.5 border",
                      p.status === "solved"
                        ? "border-rank-pupil bg-rank-pupil"
                        : p.status === "attempted"
                          ? "border-destructive bg-destructive/30"
                          : "border-border",
                    )}
                    title={p.status}
                  />
                </td>
                <td className="px-2 py-1 font-mono text-xs text-teal hover:underline">{p.id}</td>
                <td className="px-2 py-1 font-medium hover:underline">{p.name}</td>
                <td className="px-2 py-1">
                  <span className="flex flex-wrap gap-1">
                    {p.tags.map((t) => (
                      <span key={t} className="tag-pill">
                        {t}
                      </span>
                    ))}
                  </span>
                </td>
                <td className={cn("px-2 py-1 text-right font-mono font-semibold", ratingBandClass(p.rating))}>
                  {p.rating}
                </td>
                <td className="px-2 py-1 text-right font-mono text-xs text-muted-foreground">
                  {p.solved.toLocaleString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No problems match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { Handle } from "@/components/site/Handle";
import { posts, ratedUsers, recentActions, upcomingContests } from "@/lib/cf-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Codeforces — Competitive Programming Contests & Problems" },
      {
        name: "description",
        content:
          "Recent announcements, editorials, upcoming contests and the global rating leaderboard for competitive programmers.",
      },
      { property: "og:title", content: "Codeforces — Competitive Programming" },
      {
        property: "og:description",
        content: "Contest announcements, editorials, upcoming rounds and the top rated users.",
      },
    ],
  }),
  component: Home,
});

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "running";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
}

function Home() {
  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
            <h1 className="text-[15px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Recent posts
            </h1>
            <span className="text-xs text-muted-foreground">sorted by activity</span>
          </div>
          <div className="divide-y divide-border">
            {posts.map((post) => (
              <article key={post.id} className="py-4">
                <div className="flex items-baseline gap-2">
                  <span className="w-9 shrink-0 font-mono text-xs text-primary">+{post.votes}</span>
                  <h2 className="text-[15px] font-semibold leading-snug hover:underline">
                    {post.title}
                  </h2>
                </div>
                <p className="ml-11 mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
                <div className="ml-11 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    By <Handle handle={post.author} rating={post.rating} />
                  </span>
                  <span>{post.time}</span>
                  <span className="text-foreground">{post.comments} comments</span>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 flex gap-2 text-xs">
            <button className="border border-border bg-muted px-2.5 py-1 text-muted-foreground hover:text-foreground">
              1
            </button>
            <button className="border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground">
              2
            </button>
            <button className="border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground">
              3
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="panel">
            <div className="panel-title flex items-center justify-between">
              <span>Contests</span>
              <Link to="/contests" className="normal-case tracking-normal hover:underline">
                all
              </Link>
            </div>
            <ul className="divide-y divide-border text-[13px]">
              {upcomingContests.slice(0, 4).map((c) => (
                <li key={c.name} className="px-2.5 py-2">
                  <div className="leading-snug">{c.name}</div>
                  <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{c.duration}</span>
                    <span className="text-primary">in {timeUntil(c.startsAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <div className="panel-title flex items-center justify-between">
              <span>Top rated</span>
              <Link to="/ratings" className="normal-case tracking-normal hover:underline">
                all
              </Link>
            </div>
            <table className="w-full text-[13px]">
              <tbody className="divide-y divide-border">
                {ratedUsers.slice(0, 8).map((u) => (
                  <tr key={u.handle}>
                    <td className="w-7 py-1 pl-2.5 font-mono text-xs text-muted-foreground">{u.rank}</td>
                    <td className="py-1">
                      <Handle handle={u.handle} rating={u.rating} />
                    </td>
                    <td className="py-1 pr-2.5 text-right font-mono text-xs">{u.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <div className="panel-title">Recent actions</div>
            <ul className="divide-y divide-border text-[13px]">
              {recentActions.map((a, i) => (
                <li key={i} className="px-2.5 py-2 leading-snug">
                  <Handle handle={a.handle} rating={a.rating} />{" "}
                  <span className="text-muted-foreground">{a.action}</span> {a.target}
                  <span className="ml-1 text-xs text-muted-foreground">· {a.time}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </Layout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/site/Layout";

export const Route = createFileRoute("/enter")({
  head: () => ({
    meta: [
      { title: "Login — Codeforces" },
      { name: "description", content: "Log in to Codeforces with your handle or email." },
      { property: "og:title", content: "Login — Codeforces" },
      { property: "og:description", content: "Log in to your Codeforces account." },
    ],
  }),
  component: Enter,
});

const field =
  "h-9 w-full border border-input bg-card px-2.5 text-[13px] text-foreground outline-none focus:border-primary";
const label = "mb-1 block text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground";

function Enter() {
  const [note, setNote] = useState(false);

  return (
    <Layout wide={false}>
      <div className="panel p-6">
        <h1 className="text-[17px] font-semibold tracking-tight">Log in</h1>
        <form
          className="mt-5 space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            setNote(true);
          }}
        >
          <div>
            <label className={label} htmlFor="id">
              Handle or email
            </label>
            <input id="id" required className={`${field} font-mono`} autoComplete="username" />
          </div>
          <div>
            <label className={label} htmlFor="pw">
              Password
            </label>
            <input id="pw" type="password" required className={field} autoComplete="current-password" />
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" className="h-3.5 w-3.5 accent-primary" defaultChecked />
              Remember me for a month
            </label>
            <a className="text-xs text-teal hover:underline">Forgot password?</a>
          </div>
          <button
            type="submit"
            className="mt-1 h-9 w-full border border-primary bg-primary text-[13px] font-medium text-primary-foreground hover:opacity-90"
          >
            Log in
          </button>
          {note && (
            <p className="text-xs text-rank-pupil">
              Form validated. Sign-in needs a backend — ask and I'll add it.
            </p>
          )}
        </form>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        No account?{" "}
        <Link to="/register" className="text-teal hover:underline">
          Register
        </Link>
      </p>
    </Layout>
  );
}

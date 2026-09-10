import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/site/Layout";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register — Codeforces" },
      {
        name: "description",
        content: "Create a Codeforces account: pick your handle, email and country to start competing.",
      },
      { property: "og:title", content: "Register — Codeforces" },
      { property: "og:description", content: "Create your competitive programming account." },
    ],
  }),
  component: Register,
});

const countries = [
  "India (UTC+05:30)",
  "United States (UTC-05:00)",
  "Russia (UTC+03:00)",
  "China (UTC+08:00)",
  "Japan (UTC+09:00)",
  "Poland (UTC+02:00)",
  "Brazil (UTC-03:00)",
  "Germany (UTC+02:00)",
];

const field =
  "h-9 w-full border border-input bg-card px-2.5 text-[13px] text-foreground outline-none focus:border-primary";
const label = "mb-1 block text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground";

function Register() {
  const [done, setDone] = useState(false);

  return (
    <Layout wide={false}>
      <div className="panel p-6">
        <h1 className="text-[17px] font-semibold tracking-tight">Create account</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Your handle will be your public competitive programming identity. It appears in standings and
          cannot be changed more than once per year. 3–24 characters, letters, digits, underscores.
        </p>

        <form
          className="mt-5 space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            setDone(true);
          }}
        >
          <div>
            <label className={label} htmlFor="handle">
              Handle
            </label>
            <input id="handle" required className={`${field} font-mono`} autoComplete="username" />
          </div>
          <div>
            <label className={label} htmlFor="email">
              Email
            </label>
            <input id="email" type="email" required className={field} autoComplete="email" />
          </div>
          <div>
            <label className={label} htmlFor="password">
              Password
            </label>
            <input id="password" type="password" required className={field} autoComplete="new-password" />
          </div>
          <div>
            <label className={label} htmlFor="confirm">
              Confirm password
            </label>
            <input id="confirm" type="password" required className={field} autoComplete="new-password" />
          </div>
          <div>
            <label className={label} htmlFor="country">
              Country / timezone
            </label>
            <select id="country" className={field} defaultValue={countries[0]}>
              {countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="mt-2 h-9 w-full border border-primary bg-primary text-[13px] font-medium text-primary-foreground hover:opacity-90"
          >
            Register
          </button>
          {done && (
            <p className="text-xs text-rank-pupil">
              Form validated. Account creation needs a backend — say the word and I'll wire it up.
            </p>
          )}
        </form>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Already registered?{" "}
        <Link to="/enter" className="text-teal hover:underline">
          Log in
        </Link>
      </p>
    </Layout>
  );
}

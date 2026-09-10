# Code League

Shared design direction (paste this at the top of every prompt, or as a starting "style guide" prompt first)

Design language: flat 2D UI, no 3D, no glassmorphism, no gradient blobs, no floating orbs, no particle backgrounds — avoid generic "AI startup" aesthetics entirely. Should not look like LeetCode, GeeksforGeeks, CodeChef, or Coding Ninjas — avoid their specific layouts, color palettes, and card styles. Instead: a distinct identity using a muted color palette (e.g. deep navy + warm off-white + single accent color like burnt orange or teal), functional typography (Inter, IBM Plex Sans, or similar), sharp/slightly rounded corners (not full pill shapes everywhere), and information-dense but organized layouts — this is a competitive programming judge, not a consumer app, so it should feel precise and utilitarian rather than soft and marketing-y. Minimal hover states only, no scroll animations, no parallax.

1. Homepage (codeforces.com)

Build the homepage for a competitive programming platform called Codeforces. Structure: top nav (logo, Problemset, Contests, Ratings, Register/Login), a contest announcement/blog feed as the main content (list of recent posts with author, title, comment count), a right sidebar with upcoming/running contests list, top rated users list, and a small "recent actions" widget. Keep the layout information-dense like a real dev tool dashboard, not a marketing landing page — no big hero section, no giant headline. This is a working homepage for people who already know the platform.

2. Problemset (codeforces.com/problemset)

Build a problem listing page. A filter bar at top (tags multi-select, difficulty range, search by problem name/index). Below it, a table/list of problems: problem ID, name, tags (as small flat pills), difficulty rating (colored by band — e.g. gray/green/blue/purple/orange/red), number of people solved, and a solved/unsolved status indicator. Support sorting by difficulty and solve count. Keep rows compact — this list can have 50+ rows visible without excess padding, unlike LeetCode's card-heavy spacing.

3. Contests (codeforces.com/contests)

Build a contests listing page with two sections: "Upcoming Contests" (name, start time with countdown, duration, register button) and "Past Contests" (name, date, a "view standings" and "virtual participate" link). Use a clean table layout, not cards. Include a small filter/toggle for contest type (Div 1, Div 2, Div 3, Educational, etc. as small tags).

4. Register (codeforces.com/register)

Build a simple registration page: centered card with fields for handle/username, email, password, confirm password, and a country/timezone dropdown. Include a brief note about handle rules (e.g. "This will be your public competitive programming identity"). Keep it minimal — no marketing copy, no illustration, just a clean functional form matching the site's flat utilitarian style. Single accent-colored submit button.

5. Login (codeforces.com/enter)

Build a login page: centered card with handle/email field, password field, "remember me" checkbox, "forgot password" link, and a submit button. Below the card, a small link to register. Keep it extremely minimal — this is a return-visit page, not a first-impression page, so no hero copy or illustration needed.

6. Ratings (codeforces.com/ratings)

Build a global user ratings leaderboard page. A table with rank, handle (colored by rating tier — gray/green/cyan/blue/purple/orange/red, matching competitive programming rating conventions), current rating, max rating, and country flag. Include a search-by-handle input at top and pagination at the bottom. Keep row density high and typography compact — this is a data table page, not a content page.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/aedac22b-62d5-4e72-8c51-11fa4c4b8500).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone https://github.com/Madhav-Soni/LeetForces.git
cd LeetForces/web
npm i
npm run dev
```

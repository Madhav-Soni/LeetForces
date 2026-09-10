# LeetForces

Monorepo with two related projects:

| Folder | What it is |
| --- | --- |
| [`extension/`](./extension) | **LeetForces** — Chrome extension (Manifest V3) for Codeforces problem pages |
| [`web/`](./web) | **Code League** — TanStack Start web UI (from Lovable) inspired by a competitive programming judge |

## Quick start

### Chrome extension

```bash
cd extension
npm run build
```

Then in Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → select the `extension/` folder.

See [extension/README.md](./extension/README.md) for full install docs, supported languages, and tests.

### Web app (Code League)

```bash
cd web
npm install
npm run dev
```

See [web/README.md](./web/README.md) for design notes and Lovable sync info.

## Repository layout

```
LeetForces/
├── extension/          # Chrome extension
│   ├── manifest.json
│   ├── src/            # content scripts & logic
│   ├── scripts/        # build helpers
│   ├── icons/
│   ├── dist/           # built content.bundle.js
│   ├── demo/
│   └── test/
└── web/                # Code League web app
    ├── package.json
    ├── public/
    └── src/
        ├── components/
        ├── routes/
        ├── lib/
        ├── hooks/
        ├── router.tsx
        ├── start.ts
        └── server.ts
```

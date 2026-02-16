# 📡 Relay Social

**Social media scheduling for machines and humans.**

API-first social media management. Built for AI agents, intuitive enough for humans. A lean Buffer alternative designed by [Conscious Collective](https://github.com/conscious-collective).

## Philosophy

- **Machines first, humans second** — every feature is an API endpoint before it's a UI button
- **Lean and mean** — no bloat, no enterprise fluff
- **Ship fast** — internal tool first, product second
- **20x mindset** — build it for ourselves, then shove it down other builders' throats

## Features (MVP)

- 📅 Schedule posts across multiple platforms
- 📊 Basic analytics (reach, engagement, clicks)
- 🔗 Connect multiple pages/accounts per platform
- 🤖 Full REST API for agent automation
- 📱 Simple web dashboard for humans
- 📸 Media upload and management

## Supported Platforms (MVP)

- Instagram (via Meta Graph API)
- Twitter/X (via API v2)
- LinkedIn (via LinkedIn API v2)

## Tech Stack

- **Backend**: Node.js + Hono (lightweight, fast)
- **Database**: SQLite via Drizzle ORM (lean, no external DB needed)
- **Queue**: BullMQ + Redis (scheduled post delivery)
- **Frontend**: Next.js 15 (minimal dashboard)
- **Auth**: API keys for agents, simple session auth for dashboard

## License

MIT

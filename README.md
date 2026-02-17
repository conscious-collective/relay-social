# 📡 Relay Social

**Social media scheduling for machines and humans.**

API-first social media management. Built for AI agents, intuitive enough for humans. A lean Buffer alternative designed by [Conscious Collective](https://github.com/conscious-collective).


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

## Tech Stack

- **Backend**: Node.js + Hono (lightweight, fast)
- **Database**: SQLite via Drizzle ORM (lean, no external DB needed)
- **Queue**: BullMQ + Redis (scheduled post delivery)
- **Frontend**: Next.js 15 (minimal dashboard)
- **Auth**: API keys for agents, simple session auth for dashboard

## License

MIT

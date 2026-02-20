# 📡 Relay Social

**Social media scheduling for machines and humans.**

API-first social media management. Built for AI agents, intuitive enough for humans. A lean Buffer alternative designed by [Conscious Collective](https://github.com/conscious-collective).


## Features

- 📅 Schedule posts across multiple platforms
- 🔗 Connect multiple accounts per platform
- 🤖 Full REST API for agent automation
- 📱 Web dashboard for humans
- 📸 Media upload support

## Supported Platforms

- Instagram (via Meta Graph API)
- Twitter/X (coming soon)

## Tech Stack

- **Backend**: Next.js 15 (API routes)
- **Database**: PostgreSQL via Drizzle ORM + Neon
- **Queue**: Simple scheduler (upgradeable to BullMQ)
- **Frontend**: Next.js 15 + Tailwind
- **Deployment**: Cloudflare Pages (WASM)
- **Auth**: JWT + API keys

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Add DATABASE_URL, JWT_SECRET, META_APP_ID, META_APP_SECRET

# Run locally
npm run dev
```

## API

Base URL: `http://localhost:3000/api`

### Authentication

- Dashboard: Session-based JWT
- Agents: Bearer token via `Authorization: Bearer <api_key>`

### Key Endpoints

- `POST /api/auth/signup` — Create account
- `POST /api/auth/keys` — Create API key
- `POST /api/accounts/connect/instagram` — Connect Instagram
- `POST /api/posts` — Create post
- `POST /api/posts/:id/publish` — Publish immediately
- `GET /api/openapi` — OpenAPI spec for agents

## License

MIT

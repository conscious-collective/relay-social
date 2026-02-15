# 📡 Relay Social — MVP Plan

## Our Marketing Workflows (What We're Automating)

### Current Brands
| Brand | Instagram | Focus |
|-------|-----------|-------|
| Drip Press | @the.drip.press | Print-on-demand posters for artists |
| Moon Child | @moon.child.og | Moon phases, rituals, lunar calendar |
| Angel no.27 | (TBD) | Angel numbers, journaling, spirituality |
| Mantram | (TBD) | Mantra tracking, japa, meditation |
| Woke/6th Sense | (TBD) | Tarot, oracle, intuition |

### Current Pain Points
1. Buffer is clunky, not agent-friendly
2. Can't automate content creation → scheduling pipeline
3. No way for Billo (AI agent) to directly schedule posts via API
4. Managing 5+ brand accounts is tedious
5. No unified analytics across brands

### Dream Workflow
```
Billo creates content → Relay API → scheduled across platforms → analytics back to Billo
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Relay Social                │
├──────────────┬──────────────────────────────┤
│   REST API   │      Web Dashboard           │
│  (Hono)      │      (Next.js 15)            │
├──────────────┴──────────────────────────────┤
│              Core Services                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐│
│  │ Scheduler│ │ Publisher│ │  Analytics   ││
│  │ Service  │ │ Service  │ │  Service     ││
│  └──────────┘ └──────────┘ └──────────────┘│
├─────────────────────────────────────────────┤
│              Platform Adapters               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌───────────┐ │
│  │IG    │ │ X    │ │ FB   │ │ LinkedIn  │ │
│  └──────┘ └──────┘ └──────┘ └───────────┘ │
├─────────────────────────────────────────────┤
│  SQLite (Drizzle) │ Redis (BullMQ queues)   │
└─────────────────────────────────────────────┘
```

---

## Data Models

### Account
```
id, platform, platform_id, name, handle, access_token, refresh_token, 
token_expires_at, avatar_url, created_at, updated_at
```

### Post
```
id, account_id, content, media_urls[], platform_post_id, 
status (draft|scheduled|published|failed), 
scheduled_at, published_at, error_message,
created_at, updated_at
```

### Media
```
id, filename, url, mime_type, size_bytes, width, height,
created_at
```

### Analytics (per post)
```
id, post_id, impressions, reach, likes, comments, shares, 
saves, clicks, fetched_at
```

---

## API Design (Machine-First)

### Auth
```
All endpoints require: Authorization: Bearer <api_key>
```

### Accounts
```
GET    /api/accounts              — List connected accounts
POST   /api/accounts/connect      — Start OAuth flow
DELETE /api/accounts/:id           — Disconnect account
```

### Posts
```
GET    /api/posts                  — List posts (filter: status, account_id, date range)
POST   /api/posts                  — Create post (draft or scheduled)
GET    /api/posts/:id              — Get post details
PATCH  /api/posts/:id              — Update post (reschedule, edit content)
DELETE /api/posts/:id              — Delete post

POST   /api/posts/:id/publish      — Publish now (skip schedule)
POST   /api/posts/bulk              — Create multiple posts at once
```

### Media
```
POST   /api/media/upload           — Upload image/video
GET    /api/media                  — List uploaded media
DELETE /api/media/:id              — Delete media
```

### Analytics
```
GET    /api/analytics/posts/:id    — Get analytics for a post
GET    /api/analytics/account/:id  — Get account-level analytics
GET    /api/analytics/overview     — Cross-account dashboard data
```

### Scheduling Example (What Billo Would Call)
```bash
# Upload image
curl -X POST /api/media/upload -F "file=@poster.jpg"
# → { "id": "med_123", "url": "https://..." }

# Schedule post for tomorrow 10am
curl -X POST /api/posts \
  -d '{
    "account_id": "acc_moonchild_ig",
    "content": "🌕 Full Moon tonight! What are you releasing? #fullmoon #moonchild",
    "media_ids": ["med_123"],
    "scheduled_at": "2026-02-16T10:00:00+05:30"
  }'
# → { "id": "post_456", "status": "scheduled" }
```

---

## Project Structure

```
relay-social/
├── packages/
│   ├── api/                    # Hono REST API
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point
│   │   │   ├── routes/         # Route handlers
│   │   │   │   ├── accounts.ts
│   │   │   │   ├── posts.ts
│   │   │   │   ├── media.ts
│   │   │   │   └── analytics.ts
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── scheduler.ts
│   │   │   │   ├── publisher.ts
│   │   │   │   └── analytics.ts
│   │   │   ├── adapters/       # Platform integrations
│   │   │   │   ├── instagram.ts
│   │   │   │   ├── twitter.ts
│   │   │   │   └── base.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.ts   # Drizzle schema
│   │   │   │   └── index.ts    # DB connection
│   │   │   ├── queue/
│   │   │   │   └── worker.ts   # BullMQ post publisher worker
│   │   │   └── middleware/
│   │   │       └── auth.ts     # API key auth
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── dashboard/              # Next.js web UI
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx            # Dashboard home
│       │   │   ├── posts/page.tsx      # Post management
│       │   │   ├── schedule/page.tsx   # Calendar view
│       │   │   ├── accounts/page.tsx   # Connected accounts
│       │   │   └── analytics/page.tsx  # Analytics
│       │   └── components/
│       ├── package.json
│       └── tsconfig.json
├── package.json                # Workspace root
├── turbo.json                  # Turborepo config
├── README.md
└── PLAN.md
```

---

## MVP Milestones

### Phase 1: Core API (Week 1)
- [ ] Project setup (monorepo, Hono, Drizzle, SQLite)
- [ ] Database schema + migrations
- [ ] API key auth middleware
- [ ] CRUD for posts (create, read, update, delete)
- [ ] Media upload (local storage for MVP, S3 later)
- [ ] Scheduler service (BullMQ + Redis)
- [ ] Instagram adapter (Meta Graph API)
  - [ ] OAuth flow for connecting accounts
  - [ ] Publish photo posts
  - [ ] Publish carousel posts
  - [ ] Fetch basic analytics

### Phase 2: Agent Integration (Week 2)
- [ ] Bulk post creation endpoint
- [ ] CLI tool or OpenClaw skill for Billo
- [ ] Content templates (per brand)
- [ ] Test with Moon Child & Drip Press accounts

### Phase 3: Dashboard (Week 3)
- [ ] Simple Next.js dashboard
- [ ] Calendar view for scheduled posts
- [ ] Post composer with preview
- [ ] Account connection UI
- [ ] Basic analytics charts

### Phase 4: More Platforms (Week 4+)
- [ ] Twitter/X adapter
- [ ] Facebook adapter  
- [ ] TikTok adapter (if API allows)
- [ ] Cross-posting (one post → multiple platforms)

---

## Instagram API Notes

### Meta Graph API Requirements
- Need a **Meta Business Account** (or Creator account)
- Register a **Meta App** at developers.facebook.com
- Permissions needed: `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`, `pages_show_list`
- **Content Publishing API** requires Business/Creator account
- Image must be hosted at a public URL (upload to S3/Cloudflare R2 first)
- Rate limits: 50 posts per 24 hours per account

### Publishing Flow
1. Upload media to public URL
2. Create media container: `POST /{ig-user-id}/media`
3. Publish container: `POST /{ig-user-id}/media_publish`

### Carousel Posts
1. Create individual item containers (up to 10)
2. Create carousel container referencing items
3. Publish carousel container

---

## Twitter/X API Notes
- API v2 with OAuth 2.0
- Free tier: 1,500 tweets/month (write), 10,000 reads/month
- Basic tier ($100/mo): 50,000 tweets, 10,000 reads
- Media upload via chunked upload endpoint

---

## Environment Variables
```env
# Database
DATABASE_URL=file:./relay.db

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# Meta/Instagram
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback

# Twitter/X
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
TWITTER_REDIRECT_URI=http://localhost:3000/api/auth/twitter/callback

# Media Storage
MEDIA_STORAGE=local  # local | s3 | r2
S3_BUCKET=
S3_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# API
API_PORT=3001
DASHBOARD_PORT=3000
API_KEY=relay_sk_...  # For agent access
```

---

*Built by Conscious Collective 🧠 — Internal tools that become products.*

---
name: relay-social
description: Schedule and publish social media posts via Relay Social API (Instagram, Twitter, etc.).
homepage: http://localhost:3001
metadata: { "openclaw": { "emoji": "📡", "requires": { "bins": ["curl", "jq"] } } }
---

# Relay Social Skill

Schedule and publish social media posts via the Relay Social API.

## Quick Start

```bash
# Schedule a post for Instagram
relay-post "🚀 Just shipped a new feature!" --account drip-press --in 1h

# Post now
relay-post "New blog post is live! Check it out 👇" --account moon-child --now

# Schedule with image
relay-post "Check out this poster! 🎨" --account drip-press --media https://example.com/poster.jpg --in 2h
```

## Configuration

Set these in your shell environment or in `~/.openclaw/workspace/.env`:

```bash
RELAY_API_URL=http://localhost:3001
RELAY_API_KEY=relay_sk_as9QYJMhyCNTF0sfek_eymB883zaP21S
```

## Commands

### relay-post — Schedule/Publish a Post

**Syntax:**
```bash
relay-post "content" --account <name> [--media URL] [--in TIME | --at TIMESTAMP | --now]
```

**Examples:**

```bash
# Post now
relay-post "Hello world! 👋" --account my-brand --now

# Schedule for 2 hours from now
relay-post "Launching soon! 🚀" --account my-brand --in 2h

# Schedule for specific time
relay-post "Good morning! ☀️" --account my-brand --at "2026-02-17 09:00"

# Post with image
relay-post "New artwork! 🎨" --account my-brand --media https://i.imgur.com/example.jpg --in 1h

# Carousel (multiple images)
relay-post "Swipe to see more! →" --account my-brand --media "https://i.imgur.com/img1.jpg,https://i.imgur.com/img2.jpg" --now
```

**Time Formats:**
- `--now` → publish immediately
- `--in 30m` → 30 minutes from now
- `--in 2h` → 2 hours from now
- `--in 1d` → 1 day from now
- `--at "2026-02-17 14:30"` → specific date/time (local timezone)

### relay-accounts — List Connected Accounts

```bash
relay-accounts
# Output:
# acc_abc123 | instagram | @drip.press
# acc_def456 | instagram | @moon.child.og
```

### relay-status — Check Post Status

```bash
relay-status <post-id>

# Example:
relay-status post_XruIUjzbMSKf
# Output:
# Post: post_XruIUjzbMSKf
# Status: published
# Published: 2026-02-16 10:30 UTC
# Platform: Instagram (@drip.press)
```

### relay-queue — View Scheduled Posts

```bash
relay-queue

# Output:
# post_abc123 | scheduled | 2026-02-16 15:00 | @drip.press
# post_def456 | scheduled | 2026-02-17 09:00 | @moon.child.og
```

## Helper Functions

These are defined in `helpers.sh` and automatically sourced.

### get_account_id

Find account ID by handle or name:

```bash
ACCOUNT_ID=$(get_account_id "drip-press")
```

### schedule_time

Convert human time to Unix timestamp:

```bash
# 2 hours from now
TIMESTAMP=$(schedule_time "2h")

# Specific date
TIMESTAMP=$(schedule_time "2026-02-17 09:00")
```

## Direct API Usage

If you prefer raw curl:

```bash
# List accounts
curl -s http://localhost:3001/api/accounts \
  -H "Authorization: Bearer $RELAY_API_KEY" | jq

# Schedule a post
curl -X POST http://localhost:3001/api/posts \
  -H "Authorization: Bearer $RELAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"account_id\": \"acc_abc123\",
    \"content\": \"Hello world!\",
    \"media_urls\": [\"https://example.com/image.jpg\"],
    \"scheduled_at\": $(date -u -v+1H +%s)000
  }"

# Publish now
curl -X POST http://localhost:3001/api/posts/POST_ID/publish \
  -H "Authorization: Bearer $RELAY_API_KEY"
```

## OpenClaw Integration

When this skill is loaded, you can simply ask:

> "Schedule a post for Drip Press in 2 hours: New poster drop! 🎨"

> "Post to Moon Child now: Full moon tonight! 🌕"

The assistant will use this skill to schedule the post automatically.

## Account Nicknames

Create a mapping file at `~/.openclaw/workspace/relay-accounts.json`:

```json
{
  "drip-press": "acc_CWMzvl8qoizn",
  "moon-child": "acc_abc123xyz",
  "angel": "acc_def456xyz"
}
```

Then use friendly names:

```bash
relay-post "Hello!" --account drip-press --now
```

## Troubleshooting

### "Account not found"
- Run `relay-accounts` to list available accounts
- Check account ID in Relay Social dashboard

### "Invalid credentials"
- Account access token expired
- Re-authenticate via Instagram/Twitter OAuth

### "Media not found"
- Image URL must be publicly accessible
- Try uploading to Imgur, Cloudinary, or similar

## See Also

- Relay Social docs: `~/_code/relay-social/`
- Instagram setup: `~/_code/relay-social/INSTAGRAM_SETUP.md`
- API docs: http://localhost:3001/api

---

*Built by Billo Rani 💃 for the Bodmashverse*

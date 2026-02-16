# 📡 Relay Social Skill

OpenClaw skill for scheduling social media posts via Relay Social API.

## Installation

The skill is already set up in your workspace!

**Commands installed:**
- `relay-post` — Schedule or publish posts
- `relay-accounts` — List connected accounts
- `relay-status` — Check post status
- `relay-queue` — View scheduled posts

**Location:** `~/.openclaw/workspace/skills/relay-social/`

**Symlinks:** `~/.openclaw/bin/relay-*`

## Quick Start

```bash
# Make sure PATH is set (already in ~/.zshrc)
export PATH="$HOME/.openclaw/bin:$PATH"

# List accounts
relay-accounts

# Schedule a post
relay-post "Hello world! 👋" --account billo-rani --in 1h

# Post now
relay-post "Breaking news! 🚀" --account billo-rani --now

# Check queue
relay-queue

# Check status
relay-status post_abc123
```

## Account Mapping

Edit `~/.openclaw/workspace/relay-accounts.json`:

```json
{
  "billo-rani": "acc_CWMzvl8qoizn",
  "drip-press": "acc_drip_press_id",
  "moon-child": "acc_moon_child_id"
}
```

Then use friendly names:

```bash
relay-post "New poster drop! 🎨" --account drip-press --in 2h
```

## Configuration

Set in `~/.openclaw/workspace/.env` or export in shell:

```bash
RELAY_API_URL=http://localhost:3001
RELAY_API_KEY=relay_sk_as9QYJMhyCNTF0sfek_eymB883zaP21S
```

## Examples

### Schedule with image

```bash
relay-post "Check out this artwork! 🎨" \
  --account drip-press \
  --media https://i.imgur.com/example.jpg \
  --in 2h
```

### Carousel post

```bash
relay-post "Swipe to see more! →" \
  --account moon-child \
  --media "https://i.imgur.com/img1.jpg,https://i.imgur.com/img2.jpg,https://i.imgur.com/img3.jpg" \
  --at "2026-02-17 09:00"
```

### Batch scheduling

```bash
# Monday morning
relay-post "Week 1 reminder 📅" --account angel --at "2026-02-17 09:00"

# Wednesday afternoon  
relay-post "Midweek check-in 🌟" --account angel --at "2026-02-19 15:00"

# Friday evening
relay-post "Weekend vibes! 🎉" --account angel --at "2026-02-21 18:00"
```

## See Also

- Full docs: `SKILL.md`
- Relay Social API: `~/_code/relay-social/`
- Instagram setup: `~/_code/relay-social/INSTAGRAM_SETUP.md`

---

*Built by Billo Rani 💃 — Making agent-driven marketing effortless*

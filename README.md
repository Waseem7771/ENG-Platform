# SpeakPath

**Your Path to Speaking English** — an AI-powered, interactive English learning platform built for Arabic-speaking teens and adults. Students learn through AI conversation scenarios, gamified exercises, CEFR-aligned placement, and live teacher-led sessions. Teachers manage classes, author exercises, and run real-time group sessions.

## Features

**Students**
- CEFR-aligned placement exam (Grammar / Vocabulary / Reading breakdown → Beginner / Intermediate / Advanced)
- 8 exercise types: Grammar Puzzles, Vocabulary Match, Translation Challenge (Arabic ↔ English, AI-scored), Listening Practice (browser text-to-speech), Speed Quiz, AI Conversation, Picture Description, Story Builder
- AI conversation partner with 10 real-world scenarios (restaurant, job interview, airport…), inline grammar corrections tuned to common Arabic-speaker errors, voice input where the browser supports it, and an end-of-chat score
- XP, daily streaks, and per-skill progress tracking
- Join classes with a 6-character code; join live sessions with chat and teacher-pushed exercises

**Teachers**
- Class management with auto-generated join codes and student rosters
- Exercise builder for all 8 types with per-type editors
- Live sessions: start/end control, group chat, push exercises to every student in the room
- Student analytics: skill breakdowns, exercise history, placement results

**Works without an OpenAI key** — every AI feature degrades gracefully to deterministic scoring/canned replies and tells the user AI is offline.

## Tech Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 + shadcn/ui + framer-motion · Prisma 7 + SQLite (libsql) · Better Auth · OpenAI API

## Local Development

```bash
git clone https://github.com/Waseem7771/ENG-Platform.git
cd ENG-Platform
cp .env.example .env            # then edit values (see below)
npm install                     # also runs prisma generate
npx prisma migrate deploy       # create/upgrade the local SQLite db
npm run db:seed                 # placement + exercise library content
npm run dev                     # http://localhost:3000
```

Sign up once as a **Teacher** and once (different email) as a **Student** to try both sides. The student should take the placement exam first, then join the teacher's class using its code.

### Environment variables

See [.env.example](.env.example) for the full annotated list. The important ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite location. Local: `file:./dev.db` · Docker: `file:/app/data/speakpath.db` |
| `BETTER_AUTH_SECRET` | Session encryption. Generate: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Public site URL (`https://yourdomain.com` in production) |
| `OPENAI_API_KEY` | Enables real AI conversations/scoring. Optional — fallback mode without it |
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini` |
| `SITE_ADDRESS` | Caddy site address in Docker: your domain for auto-HTTPS, or `:80` for plain HTTP |

## Deploying to a VPS (Docker + Caddy)

The repo ships a production setup: multi-stage `Dockerfile` (Next standalone output), `docker-compose.yml` (app + one-off migrate/seed service + Caddy reverse proxy with automatic HTTPS), and a `Caddyfile`.

### 1. One-time VPS setup (Ubuntu 22.04/24.04)

```bash
# as root
apt update && apt upgrade -y
apt install -y docker.io docker-compose-v2 ufw fail2ban git
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /opt/speakpath && chown deploy:deploy /opt/speakpath
```

Add your SSH public key to `/home/deploy/.ssh/authorized_keys`, then disable password SSH login in `/etc/ssh/sshd_config`.

### 2. First deploy

```bash
# as deploy
cd /opt/speakpath
git clone https://github.com/Waseem7771/ENG-Platform.git .
cp .env.example .env.production
nano .env.production
```

Set in `.env.production`:

```
DATABASE_URL="file:/app/data/speakpath.db"
BETTER_AUTH_SECRET="<output of: openssl rand -base64 32>"
BETTER_AUTH_URL="https://yourdomain.com"        # or http://YOUR_VPS_IP if no domain yet
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
OPENAI_API_KEY="sk-..."                          # your real key
SITE_ADDRESS="yourdomain.com"                    # or ":80" while you have no domain
```

`chmod 600 .env.production`, then:

```bash
docker compose up -d --build
```

That builds the image, runs `prisma migrate deploy` + the content seed in the one-off `migrate` service, starts the app, and starts Caddy. With a domain in `SITE_ADDRESS` (DNS A record pointed at the VPS first), Caddy fetches and renews Let's Encrypt certificates automatically.

Check: `docker compose ps` (app healthy) and `curl -s localhost:80/api/health` → `{"status":"ok"}`.

### 3. Updating

```bash
cd /opt/speakpath
git pull
docker compose build
docker compose up -d          # re-runs migrate, then swaps the app container (~seconds of handoff)
docker image prune -f
```

### 4. Backups

The entire database is one SQLite file in the `app_data` volume. Take a
**consistent** snapshot with SQLite's online backup (a plain `cp` of a live DB
can capture a torn write or miss the `-wal` sidecar):

```bash
docker compose exec app node -e "const{createClient}=require('@libsql/client');(async()=>{const c=createClient({url:process.env.DATABASE_URL});await c.execute(\"VACUUM INTO '/app/data/backup.db'\");})()"
docker compose cp app:/app/data/backup.db ./backup-$(date +%F).db
docker compose exec app rm -f /app/data/backup.db
```

Cron that daily and copy the snapshot off the box.

### Notes

- The SQLite database lives in the `app_data` Docker volume and survives rebuilds/updates. `docker compose down -v` **deletes it** — never use `-v` in production.
- The seed is idempotent — it re-runs on every deploy and only upserts the built-in content library.
- Scaling: SQLite comfortably handles the MVP target (~500 users). The Prisma schema is portable to PostgreSQL when it's time (Phase 2 in the PRD).

## Project Structure

```
src/
├── app/
│   ├── (marketing)/        # landing page
│   ├── (auth)/             # login, signup
│   ├── (dashboard)/
│   │   ├── student/        # dashboard, placement, exercises(+player), ai-chat, sessions(+room)
│   │   └── teacher/        # dashboard, classes(+detail), exercises, sessions(+room), students
│   └── api/                # route handlers: auth, placement, exercises, classes, students, sessions, ai, health
├── components/
│   ├── exercise/           # the 8 exercise-type players
│   ├── shared/             # animated/branded components
│   └── ui/                 # shadcn/ui primitives
├── lib/                    # db, auth, guards, ai gateway, gamification, placement bank
└── types/                  # shared data + API contracts
prisma/                     # schema, migrations, seed
```

## Product Docs

- [SpeakPath-PRD.md](SpeakPath-PRD.md) — product requirements
- [SpeakPath-Design-Brief.md](SpeakPath-Design-Brief.md) — design system and page specs

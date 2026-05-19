# Life OS — Othmane Elcaidi

A fully local, personal Life Operating System — your single source of truth for your day, your business (MIX AGENCI), your faith, your habits, your journal, and your long-term vision. Built to replace scattered tools and put everything in one clean, fast, local-first interface.

**"Built in public. Rooted in faith. No shortcuts."**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 (Apple-style design system) |
| State | Zustand |
| Database | SQLite via sql.js (local file, no server) |
| Backend | Express.js (thin API layer) |
| Charts | Recharts |
| Icons | Lucide React |
| Rich Text | TipTap |
| Date/Time | date-fns |
| Icons | Lucide React |

---

## Setup Instructions

### Prerequisites

- Node.js 18+ (tested with v24.13.1)
- npm 9+

### Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Create your environment file
cp .env.example .env

# 3. Start the app (client + server)
npm run dev
```

The app opens at **http://localhost:5173** (client) with the API server on **http://localhost:3001**.

---

## Google OAuth Setup (Calendar & Tasks Sync)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Calendar API** and **Google Tasks API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URI: `http://localhost:3001/auth/google/callback`
7. Copy your **Client ID** and **Client Secret**
8. Add them to `.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```
9. In the app, go to **Settings** → Click **Connect Google Account**

---

## Obsidian Sync

1. Open Settings in the app
2. Set your Obsidian vault path (default: `~/Documents/ObsidianVault/`)
3. Journal entries automatically sync as `.md` files to `<vault>/Journal/YYYY-MM-DD.md`
4. Each file includes YAML frontmatter with date, mood, and tags

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Quick-add task (from anywhere) |
| `Cmd/Ctrl + J` | Go to Journal |
| `Cmd/Ctrl + 1` | Dashboard |
| `Cmd/Ctrl + 2` | Schedule |
| `Cmd/Ctrl + 3` | Tasks |
| `Cmd/Ctrl + 4` | Journal |
| `Cmd/Ctrl + 5` | Prayer Tracker |
| `Cmd/Ctrl + 6` | Habits |
| `Cmd/Ctrl + 7` | Agency |
| `Cmd/Ctrl + ,` | Settings |

---

## Project Structure

```
life-os/
├── client/                # React + Vite frontend
│   └── src/
│       ├── components/    # Sidebar, TaskItem, HabitRow, etc.
│       ├── views/         # Dashboard, Schedule, Tasks, Journal, etc.
│       ├── store/         # Zustand state stores
│       ├── hooks/         # Prayer times, Calendar, Obsidian
│       └── utils/         # Date helpers, formatters
├── server/                # Express API
│   ├── routes/            # API endpoints
│   ├── services/          # Google API, Obsidian, Prayer times
│   └── db/                # SQLite schema, migrations, seed data
├── data/                  # SQLite database (gitignored)
└── obsidian-vault/        # Default Obsidian vault path
```

---

## Features

### Dashboard
- Dynamic greeting + live clock
- Quick stats (tasks, habits, calls, days building)
- Today's top priority + urgent tasks
- Prayer times with live countdown to next prayer
- Google Calendar today's events
- Habit quick-check toggles
- Agency pulse

### Schedule
- Visual daily timeline with color-coded blocks
- Pre-loaded with Othmane's exact ideal day
- Edit/add/delete blocks via modal
- 19 default blocks: prayers, work, content, rest, training, etc.

### Tasks
- 4 collapsible sections: Urgent, Business, Personal, Completed
- 13 pre-loaded tasks with tags (CDZ, HVAC, Agency, Brand, Self, Faith)
- Priority levels (High/Medium/Low)
- Star to mark as top priority
- Filter by tag, due date, or search
- Expandable notes editor
- Quick-add with Cmd+K

### Journal
- Daily journal: What happened, Gratitude, Muhasaba, Intention
- Mood tracking (1-5 emoji scale)
- Auto-save every 30 seconds
- Calendar-based entry navigation
- Search entries by keyword
- Export as Markdown
- Obsidian two-way sync

### Prayer Tracker
- Auto-fetched prayer times for Casablanca (Aladhan API)
- Tap to mark prayers as done
- Live countdown to next prayer
- Fajr special card with on-time streak tracking
- Weekly heatmap (4 weeks × 5 prayers)
- Monthly completion stats

### Habits
- 11 pre-loaded habits (Faith, Fitness, Agency, Discipline, Learning, Health)
- Weekly 7-day grid with tap-to-toggle
- Streak counter and weekly completion rate
- Stats card: completion %, best streak, needs attention
- Add custom habits
- Today / Week / Month views

### Agency (MIX AGENCI)
- CDZ client profile with contract progress bar
- HVAC prospect CRM (add, edit, delete, export CSV)
- Revenue tracker with bar chart and goal progress
- Outreach log with daily input and chart
- HVAC Time-Machine Offer reference card

### Settings
- Profile, Google OAuth, Obsidian config
- Prayer calculation method
- Data export (JSON)
- Clear all data

---

## Database

The app uses SQLite (via sql.js) stored at `data/lifeos.db`. All data stays on your machine. No cloud, no servers, no subscriptions.

### Tables: tasks, journal_entries, prayers, prayer_times_cache, habits, habit_logs, clients, prospects, revenue, outreach_log, schedule_blocks, settings

---

## Building for Production

```bash
cd client && npm run build
```

The built files go to `client/dist/`. Serve them with the Express server for production use.

---

## Built For

**Othmane Elcaidi** — Founder of MIX AGENCI  
Age 18 · Casablanca, Morocco  
"Built in public. Rooted in faith. No shortcuts."

---

## License

MIT — Built for personal use. Do whatever you want with it.

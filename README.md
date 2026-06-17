# DailyHabits

A self-hosted daily habit tracker. One page, one user, zero build tooling.

## Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Database:** SQLite (`better-sqlite3`, file at `data/habits.db`)
- **Templates:** EJS (server-rendered shell) + vanilla JS (grid/modals)
- **Auth:** `express-session` + `bcryptjs`

---

## First-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Generate a bcrypt password hash

After `npm install`, run:

```bash
node -e "const b=require('bcryptjs'); b.hash('yourpassword', 12).then(console.log)"
```

Replace `yourpassword` with your actual password. Copy the printed hash (starts with `$2b$12$…`).

### 3. Generate a session secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Create the `.env` file

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Edit `.env`:

```
PORT=3000
SESSION_SECRET=<paste the random string from step 3>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<paste the bcrypt hash from step 2>
SECURE_COOKIES=false   # set to true when behind HTTPS
```

---

## Running locally

```bash
npm start
# or, for auto-restart on file changes:
npm run dev
```

Open `http://localhost:3000`.

---

## Production deployment (pm2)

### Install pm2

```bash
npm install -g pm2
```

### Start the app

```bash
pm2 start ecosystem.config.js
```

### Persist across reboots

```bash
pm2 save
pm2 startup   # follow the printed instruction to register the startup hook
```

### Useful commands

```bash
pm2 status                  # see all processes
pm2 logs dailyhabits        # tail logs
pm2 restart dailyhabits     # restart after config changes
pm2 stop dailyhabits        # stop
```

---

## Reverse proxy (HTTPS)

The app listens on `PORT` (default 3000) over plain HTTP. In production, place
**Nginx** or **Caddy** in front to handle HTTPS and route your domain to the
app port.

Once behind HTTPS, set `SECURE_COOKIES=true` in `.env` and restart pm2 so that
session cookies are sent only over secure connections.

**Example Caddy config** (`/etc/caddy/Caddyfile`):

```
dailyhabits.yourdomain.dev {
    reverse_proxy localhost:3000
}
```

**Example Nginx config** (add to `/etc/nginx/sites-available/dailyhabits`):

```nginx
server {
    listen 80;
    server_name dailyhabits.yourdomain.dev;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name dailyhabits.yourdomain.dev;

    # ssl_certificate / ssl_certificate_key — managed by certbot or similar

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Data

The SQLite database lives at `data/habits.db` and is created automatically on
first run. The `data/` directory is gitignored — back it up separately.

---

## Assumptions & scope

- Single user only — no sign-up, no user table.
- No habit editing or deleting (the data model supports `ON DELETE CASCADE`
  so you can delete via SQLite CLI if needed: `DELETE FROM habits WHERE id=X`).
- No streaks, no analytics — just a monthly grid.
- Dark mode is automatic via `prefers-color-scheme` — no manual toggle.

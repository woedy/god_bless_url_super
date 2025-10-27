🔧 ROLE & GOAL

You are an expert full-stack engineer.
Build a production-ready URL shortener with:

Backend: Django + Django REST Framework (JWT auth), Postgres, Redis

Frontend: React + Vite + Tailwind (clean, minimal UI)

Feature: Given a long URL and a “size” (count), generate N unique short links pointing to the same long URL in one request.

Analytics: Track clicks (timestamp, IP, user agent, referrer; aggregate counts).

Security: URL validation, scheme restrictions, simple denylist, rate-limit on bulk create.

Deployment: Dockerized services + docker-compose; optimized for Coolify (simple, two apps or one compose).

Domains:

API served at api.<domain>

Redirects served by the same backend (e.g., go.<domain>/<code>)

Frontend at app.<domain>

Provide a top-tier README with clear Coolify steps.

Deliver fully working code, not a scaffold.

📁 MONOREPO STRUCTURE

Create a single repo with this structure:

/urlshort
  /backend
    core/...
    shortener/...
    manage.py
    requirements.txt
    Dockerfile
  /frontend
    index.html
    src/...
    package.json
    vite.config.ts
    Dockerfile
  docker-compose.yml
  .env.example
  README.md

🗄️ DATABASE & MODELS (Django)

Use Postgres. Models:

# shortener/models.py
class Link(models.Model):
    owner = FK to user (nullable)
    code = SlugField(unique, max_length=16, db_index=True)
    target_url = TextField()
    is_active = BooleanField(default=True)
    expires_at = DateTimeField(null, blank=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    click_count = PositiveIntegerField(default=0)

    # clean(): validate target_url (http/https only, denylist schemes)
    # save(): if no code, generate base62 random of provided length (default 7), retry on collision

class Click(models.Model):
    link = FK(Link, CASCADE, related_name="clicks")
    ts = DateTimeField(auto_now_add=True)
    ip = GenericIPAddressField(null=True, blank=True)
    user_agent = TextField(null=True, blank=True)
    referrer = TextField(null=True, blank=True)
    country = CharField(max_length=2, null=True, blank=True)  # leave wiring optional


Add indexes as needed (Link.code unique, Click.link+ts).

🔐 SECURITY REQUIREMENTS

Allow only http:// or https:// target URLs.

Denylist schemes like javascript:, data:, file:, about:, chrome:.

Rate limit:

/api/links/bulk/: max 10 requests/min per IP (Redis). Also cap count per request to <= 200.

Auth: JWT (SimpleJWT). Endpoints requiring creation/list/stats are auth-protected.

Redirect endpoint is public (GET /<code> → 301 to target_url if active & not expired).

CORS: Allow frontend origin from env.

🔌 API DESIGN (DRF)

Base path: /api/

Auth

POST /api/auth/token/ → JWT obtain (username/password)

POST /api/auth/refresh/ → refresh

Bulk create

POST /api/links/bulk/
Body:

{
  "url": "https://example.com/long/path?utm=xyz",
  "size": 20,              // number of links to generate (alias: "count")
  "code_length": 7         // optional, default 7, allowed 4..32
}


Response 201:

{
  "links": [
    {"id":1,"code":"aB12cdE","short_url":"https://go.example.com/aB12cdE","target_url":"..."},
    ...
  ]
}


If some collisions prevented full count after retries, return 207 with "detail" and partial "links".

List my links

GET /api/links/ → returns paginated list of links (id, code, short_url, target_url, click_count, is_active, expires_at, created_at)

Link stats

GET /api/links/{id}/stats/ → returns click_count and last 50 click events (ts, referrer, country, user_agent truncated, ip masked e.g., /24)

Single create (optional)

POST /api/links/create/ → same as bulk but one link; accept size or code_length; optional custom_alias.

Redirect

GET /<code> (root level, not under /api) → 301 to target_url if active & not expired; log click with IP, UA, referrer, + increment click_count atomically.

Implementation notes

Compute short_url using REDIRECT_BASE_URL env (fallback to request host).

Use transactions and bulk_create for bulk endpoint.

Generate Base62 codes with secrets.choice over [a-zA-Z0-9].

For rate limiting, use Redis sorted set or incr with TTL.

🧪 CURL EXAMPLES (include in README)
# auth
curl -X POST https://api.example.com/api/auth/token/ -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pass"}'

# bulk create 20 links (code length 7)
curl -X POST https://api.example.com/api/links/bulk/ \
  -H "Authorization: Bearer <ACCESS>" -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","size":20,"code_length":7}'

# list
curl -H "Authorization: Bearer <ACCESS>" https://api.example.com/api/links/

# stats
curl -H "Authorization: Bearer <ACCESS>" https://api.example.com/api/links/1/stats/

🖥️ FRONTEND (React + Vite + Tailwind)

Pages/components:

Auth: Simple login form (username/password) → store JWT access in memory (or localStorage).

Shortener Form (Bulk):

Input Long URL (required)

Input Size (Count) (number, min 1, max 200)

Optional Code Length (4–32), default 7

Submit → POST /api/links/bulk/ → render results as a list with copy buttons.

My Links table:

Columns: Short URL (clickable), Target URL (truncated), Clicks, Created, Expiry, Actions (Stats).

Pagination if needed.

Stats Modal / Page:

Show total clicks and a simple chart (daily counts last 30 days—client-side aggregate from recent clicks).

Show recent 50 events (ts, referrer, approx location if available).

Design:

Clean, modern cards, rounded-2xl, soft shadows, adequate spacing.

Mobile-first responsive.

Toast notifications for copy & errors.

Accessibility (labels, focus states, aria).

Config via .env:

VITE_API_BASE=https://api.example.com/api
VITE_REDIRECT_BASE=https://go.example.com


API client: small wrapper that injects JWT and handles errors.

🐳 DOCKERFILES

/backend/Dockerfile

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000", "--workers=3"]


/frontend/Dockerfile

FROM node:22 as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf "server { listen 80; server_name _; root /usr/share/nginx/html; location / { try_files \\$uri /index.html; } }" > /etc/nginx/conf.d/default.conf

🧩 DOCKER COMPOSE (root: /docker-compose.yml)

Use service names aligned with Coolify expectations; expose minimal ports for proxying:

version: "3.9"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: urlshort
      POSTGRES_USER: urlshort
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7
    restart: always

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgres://urlshort:${POSTGRES_PASSWORD}@postgres:5432/urlshort
      REDIS_HOST: redis
      REDIS_PORT: 6379
      DJANGO_SECRET_KEY: ${DJANGO_SECRET_KEY}
      DJANGO_SETTINGS_MODULE: core.settings
      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS}
      ALLOWED_HOSTS: ${ALLOWED_HOSTS}
      REDIRECT_BASE_URL: ${REDIRECT_BASE_URL} # e.g., https://go.example.com
    depends_on: [postgres, redis]
    ports: ["8000:8000"]
    restart: always

  frontend:
    build: ./frontend
    environment:
      VITE_API_BASE: ${VITE_API_BASE}          # https://api.example.com/api
      VITE_REDIRECT_BASE: ${REDIRECT_BASE_URL} # https://go.example.com
    ports: ["8080:80"]
    restart: always

volumes:
  pgdata:


.env.example

POSTGRES_PASSWORD=change_me
DJANGO_SECRET_KEY=change_me_super_secret
CORS_ALLOWED_ORIGINS=https://app.example.com
ALLOWED_HOSTS=api.example.com,go.example.com
REDIRECT_BASE_URL=https://go.example.com
VITE_API_BASE=https://api.example.com/api

⚙️ DJANGO SETTINGS HIGHLIGHTS

Install: rest_framework, rest_framework_simplejwt, corsheaders, shortener.

Middleware includes corsheaders.middleware.CorsMiddleware.

DRF default auth: JWT.

ALLOWED_HOSTS, CORS from env.

DATABASE_URL from env (dj-database-url or manual config).

Root urls.py routes:

/api/... for API

/<code> for redirect (keep as last pattern)

🧠 BACKEND DETAILS TO IMPLEMENT

Link saving honors a _desired_length set by serializer when code_length provided.

BulkCreate:

Validate input, resolve count (alias size), cap at 200.

Generate codes in memory set; remove collisions present in DB; bulk insert; retry loops until desired count or attempts exhausted.

Build short_url using REDIRECT_BASE_URL.

Click logging:

On redirect: create Click(row) with IP (REMOTE_ADDR), UA, referrer; increment click_count via F() update.

Stats aggregation:

Return click_count and last 50 events.

(Optional) Provide daily counts for last 30 days (can be calculated client-side from recent clicks).

🎨 FRONTEND UI REQUIREMENTS (TAILWIND)

Full-screen container with a centered card for the form.

Inputs: Long URL, Size (number), Code length (number).

Button: “Generate Links”.

After success: show list of generated links with Copy buttons.

Secondary section: “My Links” table with action to open Stats (modal).

Stats modal: total clicks metric and a simple chart (use a tiny chart library or pure SVG; keep deps minimal).

Show loading states and clear error toasts.

✅ ACCEPTANCE CRITERIA

Bulk create works: POST /api/links/bulk/ with size=20 returns exactly 20 unique short links to the same long URL (unless partial due to collisions; then return 207 with partial + message).

Redirect works: GET https://go.example.com/<code> 301 redirects to target, logs click.

Auth works: can login, call protected endpoints with JWT.

Rate limit works: exceeding 10 bulk calls/min returns 429.

UI clean: mobile responsive, easy inputs, copy buttons, stats visible.

Coolify: Using the docker-compose, I can deploy backend and frontend as separate services, attach domains, set envs, run migrations, and get HTTPS via Coolify’s managed certs.

🧾 README CONTENT (WRITE IT)

Include:

Prereqs: Docker, docker-compose.

Local dev:

cp .env.example .env
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser


Visit http://localhost:8080 (frontend) and http://localhost:8000/api (backend).

Coolify deployment:

Add a new “Docker Compose” app with this repo; or add two Buildpacks/Images from subfolders.

Map domains:

api.example.com → backend:8000

go.example.com → backend:8000 (same container handles redirects)

app.example.com → frontend:8080

Set env from .env.example.

Enable HTTPS (managed certs) in Coolify.

First run:

docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser


API examples (curl).

Security notes (schemes, denylist, rate limit).

Scaling tips (gunicorn workers, DB sizing, Redis persistence if needed).

🧰 DEPENDENCIES

Backend:

Django, djangorestframework, djangorestframework-simplejwt,
django-cors-headers, gunicorn, dj-database-url (optional), psycopg2-binary, redis


Frontend:

react, react-dom, vite, typescript, tailwindcss, autoprefixer, postcss

🧹 QUALITY

Type-annotate Python where reasonable.

Prettier/ESLint (basic) for frontend.

Minimal unit tests: code generator uniqueness, bulk insert path, redirect increments click_count.

🚀 OUTPUT

Produce the full codebase with the structure above, complete files, migrations, and a polished README.

No TODOs – ship working code.
# God Bless URL Super

A production-ready URL shortener that bulk-generates unique short links, protects them with JWT authentication, records click analytics, and ships with a polished React frontend. The stack is optimized for Coolify deployments and ships as a Dockerized monorepo.

## Features

- **Bulk link generation** – Create up to 200 unique short links pointing to the same destination in a single request.
- **JWT-secured API** – Authenticated management endpoints using Django REST Framework and Simple JWT.
- **Click analytics** – Redirect endpoint tracks timestamp, IP, referrer, and user agent while incrementing aggregate counters.
- **Rate limiting** – Redis-backed limit of 10 bulk-create calls per minute per IP address.
- **Responsive frontend** – React + Vite + Tailwind UI with login, generator form, live tables, copy buttons, and stats modal with sparkline chart.
- **Coolify-friendly** – Dockerfiles for backend and frontend plus a compose file to deploy Postgres and Redis alongside the app.

## Repository layout

```
.
├── docker-compose.yml   # Root-level compose that targets the backend/frontend subdirectories
└── urlshort/
    ├── backend/         # Django project (core) + shortener app and tests
    ├── frontend/        # React application built with Vite and Tailwind
    ├── docker-compose.yml
    ├── docker-compose.local.yml
    ├── .env.example
    └── README.md
```

## Getting started locally

### Prerequisites

- Docker and Docker Compose
- Make a copy of the environment file: `cp .env.example .env`

### Boot the stack

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

Visit the apps:

- Frontend: <http://localhost:8080>
- API root: <http://localhost:8000/api>
- Django admin: <http://localhost:8000/admin>

### Live-reload development stack

For interactive development with auto-reloading Django and the Vite dev server, run the local compose file instead:

```bash
docker compose -f docker-compose.local.yml up --build
```

This configuration mounts your local source code into the containers, exposes the Vite dev server on <http://localhost:5173>, and keeps Postgres/Redis data in named volumes so changes persist between runs.

### Running tests

Backend unit tests cover the code generator, bulk creation pipeline, and redirect logging.

```bash
docker compose exec backend python manage.py test
```

Frontend linting (optional during local development):

```bash
cd frontend
npm install
npm run lint
```

## Environment variables

| Variable | Description | Default in `.env.example` |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | Django secret key | `change-me` |
| `DJANGO_DEBUG` | Enable Django debug mode | `True` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hosts | `localhost,127.0.0.1` |
| `FRONTEND_ORIGIN` | Allowed origins for CORS | `http://localhost:5173,http://localhost:8080` |
| `CSRF_TRUSTED_ORIGINS` | CSRF trusted origins | `http://localhost:5173,http://localhost:8080` |
| `DATABASE_URL` | Postgres connection string | `postgres://urlshort:urlshort@db:5432/urlshort` |
| `REDIRECT_BASE_URL` | Base used to build short URLs | `http://localhost:8000` |
| `RATE_LIMIT_REDIS_URL` | Redis URL for throttling | `redis://redis:6379/0` |
| `BULK_RATE_LIMIT` | Bulk create calls per minute | `10` |
| `MAX_BULK_LINKS` | Max links per request | `200` |
| `MIN_CODE_LENGTH` / `MAX_CODE_LENGTH_LIMIT` | Allowed code length range | `4` / `32` |
| `DEFAULT_CODE_LENGTH` | Default code length | `7` |
| `DENYLIST_SCHEMES` | Disallowed URL schemes | `javascript,data,file,about,chrome` |
| `JWT_ACCESS_MINUTES` | Access token lifetime (minutes) | `30` |
| `JWT_REFRESH_DAYS` | Refresh token lifetime (days) | `7` |
| `POSTGRES_*` | Database bootstrap variables | – |
| `VITE_API_BASE` | API base URL for frontend build | `http://localhost:8000` |

## API reference

All authenticated endpoints require a Bearer token obtained via the JWT endpoints.

### Authentication

```bash
# Obtain access & refresh tokens
curl -X POST http://localhost:8000/api/auth/token/ \
  -H 'Content-Type: application/json' \
  -d '{"username": "admin", "password": "secret"}'
```

```bash
# Refresh access token
curl -X POST http://localhost:8000/api/auth/refresh/ \
  -H 'Content-Type: application/json' \
  -d '{"refresh": "<refresh-token>"}'
```

### Bulk generate links

```bash
curl -X POST http://localhost:8000/api/links/bulk/ \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com", "size": 20, "code_length": 7}'
```

Response:

```json
{
  "links": [
    {
      "id": 42,
      "code": "Ab12Xyz",
      "short_url": "http://localhost:8000/Ab12Xyz",
      "target_url": "https://example.com",
      "is_active": true,
      "expires_at": null,
      "click_count": 0,
      "created_at": "2024-04-12T18:22:35.121Z",
      "updated_at": "2024-04-12T18:22:35.121Z"
    }
  ]
}
```

If collisions prevent generating the requested amount, the API returns HTTP 207 with a `message` describing the partial success.

### List links

```bash
curl -H 'Authorization: Bearer <token>' http://localhost:8000/api/links/
```

### Link statistics

```bash
curl -H 'Authorization: Bearer <token>' http://localhost:8000/api/links/<code>/stats/
```

Returns aggregate count plus the 50 most recent click events.

### Redirect

```bash
curl -I http://localhost:8000/<code>
```

Responds with HTTP 301 and logs a `Click` record.

## Frontend workflow

1. Sign in using your Django credentials.
2. Provide the destination URL, desired count, and code length.
3. Review the generated batch list and copy URLs with a single click.
4. Monitor your existing links in the “My links” table and open the stats modal for per-link analytics.

The UI is responsive, dark-themed, and optimized for desktop or mobile devices.

## Coolify deployment

1. Push this repository to a Git provider accessible by Coolify.
2. In Coolify, create a new **Docker Compose** application and select the repo. The platform will automatically pick up the root `docker-compose.yml`, which builds from the repository root while explicitly referencing the Django and React Dockerfiles inside `urlshort/backend` and `urlshort/frontend`.
3. Provide the environment variables by copying `.env.example` into `urlshort/.env` (or by adding them through Coolify’s interface). The compose file references that location by default.
4. Deploy the stack – Coolify will build four services: backend, frontend, Postgres, and Redis.
5. Map domains:
   - `api.example.com` → backend container port 8000
   - `go.example.com` → backend container port 8000 (same service handles redirects)
   - `app.example.com` → frontend container port 8080
6. Enable HTTPS on each domain via Coolify’s managed certificates.
7. After the first deploy, run migrations and create a user:
   ```bash
   docker compose exec backend python manage.py migrate
   docker compose exec backend python manage.py createsuperuser
   ```

## Security & scaling notes

- Only `http://` and `https://` targets are accepted. Common harmful schemes (e.g. `javascript:`) are rejected.
- Bulk requests are throttled via Redis at 10 requests per minute per IP; exceeding the limit yields HTTP 429.
- Codes default to 7 characters (62^7 space) and support custom lengths between 4–32 characters.
- Gunicorn serves the Django app in production; scale workers (`--workers`) or replicate the service behind a load balancer as traffic grows.
- Redis persistence can be enabled for rate-limit durability; Postgres should run with regular backups.

## Troubleshooting

- **429 Too Many Requests**: You hit the bulk-create limit. Wait a minute or adjust `BULK_RATE_LIMIT`/`BULK_RATE_PERIOD_SECONDS`.
- **Bad Request on URL**: Ensure the target starts with `http://` or `https://` and avoids deny-listed schemes.
- **Frontend cannot reach API**: Confirm `VITE_API_BASE` matches the external backend URL at build time.

## License

Released under the MIT License. See [LICENSE](LICENSE) if you add one.

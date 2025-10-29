# God Bless URL Super

Bulk URL shortener with analytics. This repository contains a Django REST backend and a Vite/React frontend. This guide covers containerized deployment locally with Docker Compose and in production via Coolify.

## Prerequisites

- Docker 24+
- Docker Compose v2
- (Production) Access to a Coolify instance with git integration

## Configuration

1. Copy the sample environment file and adjust values as needed:
   ```bash
   cp .env.example .env
   ```
2. Make sure the following values are set for production:
   - `DJANGO_SECRET_KEY`: random string, required when `DJANGO_DEBUG=False`
   - `DJANGO_ALLOWED_HOSTS`: comma-separated list of backend hostnames
   - `FRONTEND_ORIGIN` / `CSRF_TRUSTED_ORIGINS`: URLs that will load the app
   - `DATABASE_URL`: Postgres DSN (the default points at the bundled container)
   - `RATE_LIMIT_REDIS_URL`: Redis URL (defaults to the bundled container)
   - `VITE_API_BASE`: Public URL for the backend API (used at build time and runtime)

## Local development with Docker Compose

1. Ensure `.env` is present.
2. Build and start the stack:
   ```bash
   docker compose up --build
   ```
   - A `docker-compose.override.yml` maps services to convenient local ports:
     - Backend (Django/Gunicorn): <http://localhost:8000>
     - Frontend (Nginx): <http://localhost:8080>
3. On first run, create an admin user:
   ```bash
   docker compose exec backend python manage.py createsuperuser
   ```
4. Stop the stack when finished:
   ```bash
   docker compose down
   ```

### Useful commands

- Run backend tests: `docker compose exec backend python manage.py test`
- Tail backend logs: `docker compose logs -f backend`

## Production deployment with Coolify

Coolify can deploy this repository directly via Docker Compose.

1. Ensure `.env` in the repo (or Coolify environment variables) contains production-ready values.
2. In Coolify:
   1. Create a **Standalone Docker Compose** application.
   2. Point it to this repository and select the branch to deploy.
   3. Let Coolify manage environment variables (copy the key/value pairs from `.env`).
3. During deployment Coolify runs `docker compose up -d --build` using the provided `docker-compose.yml`.
   - The base compose file intentionally **does not expose ports**. Coolify will auto-assign ports and present them in the dashboard.
   - The stack includes four services: `backend` (Gunicorn), `frontend` (Nginx static site), `db` (Postgres 16), and `redis` (Redis 7).
4. After the deployment succeeds:
   - Note the public URLs assigned by Coolify for the frontend and backend.
   - Update `VITE_API_BASE` to the backend’s public URL and redeploy if necessary (Coolify handles rebuilds automatically).
   - Run initial migrations if they have not already executed (the backend entrypoint runs `migrate` on start).

### Coolify tips

- Use Coolify’s built-in secrets manager to store sensitive values (`DJANGO_SECRET_KEY`, database credentials, JWT lifetimes).
- If using an external Postgres/Redis, override `DATABASE_URL` and/or `RATE_LIMIT_REDIS_URL` in the Coolify environment rather than editing the compose file.
- For custom domains, configure them in Coolify and ensure `DJANGO_ALLOWED_HOSTS` and `FRONTEND_ORIGIN` include those domains.

## File layout

- `backend/Dockerfile`: Builds the Django app (Python 3.12) and runs Gunicorn with migrations and static collection on startup.
- `frontend/Dockerfile`: Builds the Vite app and serves it through Nginx.
- `docker-compose.yml`: Defines backend, frontend, Postgres, and Redis services without fixed host ports (Coolify-friendly).
- `docker-compose.override.yml`: Local-only port mappings.

## Troubleshooting

- **Migrations not applied**: Check backend logs; the entrypoint runs `migrate`. Ensure the Postgres container is healthy.
- **Frontend can’t reach backend**: Confirm `VITE_API_BASE` matches the backend URL that Coolify exposes and that CORS settings allow the frontend origin.
- **Rate limiting disabled**: If Redis is unreachable the limiter allows all requests; verify `RATE_LIMIT_REDIS_URL` and service health.

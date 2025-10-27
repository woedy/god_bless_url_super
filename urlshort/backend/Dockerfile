FROM python:3.11-slim

ARG BACKEND_DIR=backend

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY ${BACKEND_DIR}/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ${BACKEND_DIR}/ ./

ENV DJANGO_SETTINGS_MODULE=core.settings

CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000"]

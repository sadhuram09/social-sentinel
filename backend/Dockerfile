FROM python:3.11-slim

# Unbuffered stdout so platform log streams show output as it happens.
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render injects $PORT (default 10000) and requires binding on 0.0.0.0.
# Shell-form CMD so $PORT expands — exec form (JSON array) does NOT do
# variable substitution and would pass the literal string "$PORT".
EXPOSE 10000

CMD gunicorn -w 1 --threads 4 -b 0.0.0.0:${PORT:-10000} run:app
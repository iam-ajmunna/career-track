#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

docker compose up -d --build
MODEL=$(grep '^AI_MODEL=' .env | cut -d= -f2- || true)
MODEL=${MODEL:-qwen2.5:7b}

echo "Pulling local AI model: $MODEL"
docker compose exec ollama ollama pull "$MODEL"

echo
echo "Career Track v2 is running at http://localhost:8000"
echo "API health: http://localhost:8000/api/health"

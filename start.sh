#!/bin/bash
set -e

if [ ! -f .env ]; then
    echo "Error: .env file not found. Copy .env.example to .env and set your API key."
    exit 1
fi

# Open browser after a short delay
(sleep 1 && open http://localhost:8000) &

uv run uvicorn main:app --host 0.0.0.0 --port 8000

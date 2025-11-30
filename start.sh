#!/bin/bash
set -e

# Load environment variables from .env if it exists
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Check if OPENROUTER_API_KEY is set
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "Error: OPENROUTER_API_KEY is not set. Either set it in .env or export it in your environment."
    exit 1
fi

# Open browser after a short delay
(sleep 1 && open http://localhost:8000) &

uv run uvicorn main:app --host 0.0.0.0 --port 8000

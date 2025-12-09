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

# Install Python dependencies
echo "Syncing Python dependencies..."
uv sync

# Build frontend
if [ -d "frontend" ] && command -v npm >/dev/null 2>&1; then
    echo "Building frontend..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    npm run build
    cd ..
else
    echo "Skipping frontend build (frontend directory or npm not found)"
fi

# Open browser after a short delay
(sleep 2 && open http://localhost:8000) &

echo "Starting server..."
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

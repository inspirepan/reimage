# Repository Guidelines

## Project Structure

```
image-reproduce/
├── main.py              # FastAPI backend (API endpoints)
├── static/index.html    # Frontend SPA (HTML/CSS/JS)
├── prompts/             # Prompt templates
│   ├── vlm_system.md    # VLM system prompt
│   └── vlm_user.md      # VLM user prompt
├── pyproject.toml       # Project config and dependencies
├── uv.lock              # Dependency lock file
└── .env.example         # Environment variable template
```

## Build & Development Commands

This project uses **uv** as the package manager. Never use pip.

| Command | Description |
|---------|-------------|
| `uv sync` | Install dependencies and create virtual environment |
| `uv run python main.py` | Run the FastAPI server |
| `uv run uvicorn main:app --reload` | Run in development mode with hot reload |

**Environment Setup:**
1. Copy `.env.example` to `.env`
2. Set `OPENROUTER_API_KEY` with your API key

## Coding Style & Conventions

**Python (backend):**
- Python 3.14+ required
- Type hints required for all function parameters and return values
- Use Pydantic BaseModel for request/response validation
- Use async/await for I/O operations
- Line length: 120 characters maximum
- Comments in English only

**Frontend:**
- Native HTML/CSS/JavaScript (no build tools)
- CSS variables for theming
- No external frameworks

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/prompts` | GET | Get default prompt templates |
| `/api/analyze` | POST | Analyze image with VLM (SSE streaming) |
| `/api/generate` | POST | Generate image from prompt |

## Testing Guidelines

No formal testing framework is currently configured. When adding tests:
- Use `pytest` as the testing framework
- Place tests in a `tests/` directory
- Name test files as `test_*.py`
- Run tests with `uv run pytest`

## Commit Guidelines

- Write clear, descriptive commit messages
- Use imperative mood (e.g., "Add feature" not "Added feature")
- Reference related issues when applicable

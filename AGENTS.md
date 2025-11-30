# Repository Guidelines

This document provides contribution guidelines for the **image-reproduce** project, a FastAPI-based Image-to-Text-to-Image pipeline for evaluating image generation models.

## Project Structure

```
.
├── main.py              # FastAPI backend application
├── models.yaml          # Model configuration (MLLM + generation models)
├── pyproject.toml       # Project dependencies (managed by uv)
├── start.sh             # Development startup script
├── prompts/             # MLLM prompt templates
│   ├── mllm_system.md   # System prompt for image analysis
│   └── mllm_user.md     # User prompt template
├── static/              # Frontend assets
│   ├── index.html       # Main web interface
│   └── favicon.svg      # Site icon
└── dev/                 # Development utilities
```

## Build, Test, and Development Commands

| Command | Description |
|---------|-------------|
| `uv sync` | Install/synchronize dependencies |
| `./start.sh` | Start dev server (loads `.env`, opens browser) |
| `uv run uvicorn main:app --reload` | Run server with hot reload |

**Environment setup**: Copy `.env.example` to `.env` and set `OPENROUTER_API_KEY`.

## Coding Style & Naming Conventions

- **Python version**: 3.14+
- **Async-first**: Use `async/await` for I/O operations
- **Type hints**: Required for all function signatures
- **Line length**: 120 characters maximum
- **Naming**: `snake_case` for functions/variables, `PascalCase` for classes

No formal linter configured. Follow existing patterns in `main.py`.

## Testing Guidelines

No test framework is currently configured. When adding tests:
- Use `pytest` as the testing framework
- Place tests in a `tests/` directory
- Name test files as `test_*.py`

## Commit & Pull Request Guidelines

Based on project history, commits follow this pattern:
- Use imperative mood: "Add feature", "Fix bug", "Update config"
- Keep messages concise and descriptive
- Group related changes in single commits

For pull requests:
- Provide clear description of changes
- Reference related issues if applicable
- Ensure the application runs without errors before submitting

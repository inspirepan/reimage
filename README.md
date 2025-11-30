# ReImage

An AI-powered tool that analyzes images and recreates them using text-to-image generation.

## How It Works

1. **Upload** - Drop or paste any image
2. **Analyze** - VLM extracts a detailed reproduction prompt
3. **Generate** - Text-to-image model recreates the image

## Quick Start

```bash
# Install dependencies
uv sync

# Set up environment
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY

# Run the server
uv run python main.py
```

Open http://localhost:8000 in your browser.

## Requirements

- Python 3.14+
- [uv](https://github.com/astral-sh/uv) package manager
- [OpenRouter](https://openrouter.ai/) API key

## Supported Models

**Vision Language Models (VLM):**
- `google/gemini-3-pro-preview`
- `anthropic/claude-opus-4.5`

**Image Generation:**
- `google/gemini-3-pro-image-preview`
- `black-forest-labs/flux.2-flex`
- `google/gemini-2.5-flash-image`

## License

MIT

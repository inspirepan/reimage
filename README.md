# ReImage

Evaluate image models via an Image → Text → Image pipeline.

## How It Works

1. **Upload** - Drop or paste an image
2. **Analyze** - MLLM generates a reproduction prompt
3. **Generate** - Text-to-image model recreates the original

## Quick Start

```bash
uv sync
cp .env.example .env  # Add your OPENROUTER_API_KEY
./start.sh
```

## Requirements

- Python 3.14+
- [uv](https://github.com/astral-sh/uv)
- [OpenRouter](https://openrouter.ai/) API key

## Supported Models

**MLLM:** `google/gemini-3-pro-preview`, `anthropic/claude-opus-4.5`

**Image Generation:** `google/gemini-3-pro-image-preview`, `black-forest-labs/flux.2-flex`, `google/gemini-2.5-flash-image`

## License

MIT

"""FastAPI application for image reproduction testing."""

import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam
from pydantic import BaseModel

app = FastAPI(title="Image Reproduce Tool")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
PROMPTS_DIR = Path(__file__).parent / "prompts"
STATIC_DIR = Path(__file__).parent / "static"


def get_api_key() -> str:
    """Get OpenRouter API key from environment."""
    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not set")
    return key


def load_prompt(name: str) -> str:
    """Load a prompt template from file."""
    path = PROMPTS_DIR / f"{name}.md"
    if not path.exists():
        raise HTTPException(status_code=500, detail=f"Prompt file {name}.md not found")
    return path.read_text(encoding="utf-8")


class PromptsResponse(BaseModel):
    """Response model for prompts endpoint."""

    system_prompt: str
    user_prompt: str


class AnalyzeRequest(BaseModel):
    """Request model for analyze endpoint."""

    image: str  # base64 encoded image
    model: str = "google/gemini-3-pro-preview"
    system_prompt: str
    user_prompt: str


class GenerateRequest(BaseModel):
    """Request model for generate endpoint."""

    prompt: str
    model: str = "google/gemini-3-pro-image-preview"


class GenerateResponse(BaseModel):
    """Response model for generate endpoint."""

    image: str  # base64 encoded image


@app.get("/api/prompts", response_model=PromptsResponse)
async def get_prompts() -> PromptsResponse:
    """Return default prompt templates."""
    return PromptsResponse(
        system_prompt=load_prompt("vlm_system"),
        user_prompt=load_prompt("vlm_user"),
    )


async def stream_vlm_response(request: AnalyzeRequest):
    """Stream VLM response from OpenRouter using OpenAI SDK."""
    api_key = get_api_key()

    client = AsyncOpenAI(
        api_key=api_key,
        base_url=OPENROUTER_BASE_URL,
        timeout=120.0,
    )

    messages: list[ChatCompletionMessageParam] = [
        {"role": "system", "content": request.system_prompt},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": request.user_prompt},
                {"type": "image_url", "image_url": {"url": request.image}},
            ],
        },
    ]

    try:
        stream = await client.chat.completions.create(
            model=request.model,
            messages=messages,
            stream=True,
        )

        async for chunk in stream:
            chunk_data = chunk.model_dump()
            yield f"data: {json.dumps(chunk_data)}\n\n"

        yield "data: [DONE]\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


@app.post("/api/analyze")
async def analyze_image(request: AnalyzeRequest) -> StreamingResponse:
    """Analyze image using VLM and stream response."""
    return StreamingResponse(
        stream_vlm_response(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


def extract_image_from_response(data: dict[str, Any]) -> str | None:
    """Extract image URL from OpenRouter response."""
    message = data.get("choices", [{}])[0].get("message", {})

    # Check for images in the response (Gemini format)
    images = message.get("images", [])
    if images:
        sorted_images = sorted(images, key=lambda x: x.get("index", 0))
        for img in sorted_images:
            if img.get("type") == "image_url":
                image_url = img.get("image_url", {}).get("url", "")
                if image_url:
                    return image_url

    # Fallback: check content for image_url type
    content = message.get("content", "")
    if isinstance(content, list):
        for item in content:
            if item.get("type") == "image_url":
                image_url = item.get("image_url", {}).get("url", "")
                if image_url:
                    return image_url

    return None


@app.post("/api/generate", response_model=GenerateResponse)
async def generate_image(request: GenerateRequest) -> GenerateResponse:
    """Generate image using OpenRouter image generation model."""
    api_key = get_api_key()

    client = AsyncOpenAI(
        api_key=api_key,
        base_url=OPENROUTER_BASE_URL,
        timeout=120.0,
    )

    max_retries = 3
    last_error = None

    for attempt in range(max_retries):
        try:
            response = await client.chat.completions.create(
                model=request.model,
                messages=[
                    {
                        "role": "user",
                        "content": "Please generate an image based on the following prompt: " + request.prompt,
                    }
                ],
                extra_body={"modalities": ["image", "text"]},
            )

            data = response.model_dump()
            image_url = extract_image_from_response(data)
            if image_url:
                return GenerateResponse(image=image_url)

            last_error = "No image found in response"
            continue

        except TimeoutError:
            last_error = "Request timeout"
        except Exception as e:
            last_error = str(e)

    raise HTTPException(status_code=500, detail=f"Failed to generate image: {last_error}")


# Mount static files (must be last to avoid catching API routes)
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

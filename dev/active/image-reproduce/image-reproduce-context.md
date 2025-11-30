# Image Reproduce Tool - Context

**Last Updated: 2025-11-30**

## Key Files

| 文件 | 用途 |
|------|------|
| `/Users/bytedance/code/image-reproduce/pyproject.toml` | uv 项目配置，依赖管理 |
| `/Users/bytedance/code/image-reproduce/main.py` | FastAPI 应用主入口 |
| `/Users/bytedance/code/image-reproduce/prompts/mllm_system.md` | MLLM 系统提示模板 |
| `/Users/bytedance/code/image-reproduce/prompts/mllm_user.md` | MLLM 用户提示模板 |
| `/Users/bytedance/code/image-reproduce/static/index.html` | 前端单页应用 |

## Environment Variables

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API 密钥 |

## External APIs

### OpenRouter API

- **Base URL:** `https://openrouter.ai/api/v1`
- **认证:** Bearer Token (使用 `OPENROUTER_API_KEY`)

#### Chat Completions (MLLM)
```
POST /chat/completions
Content-Type: application/json
Authorization: Bearer $OPENROUTER_API_KEY
```

支持的 MLLM 模型:
- `google/gemini-3-pro-preview` (默认)
- `openai/gpt-4o`
- `anthropic/claude-3.5-sonnet`

#### Image Generation
```
POST /chat/completions
Content-Type: application/json
Authorization: Bearer $OPENROUTER_API_KEY
```

支持的生图模型:
- `google/gemini-3-pro-image-preview` (默认)

## Key Technical Decisions

### 1. 使用 SSE 而非 WebSocket

**决定:** 使用 Server-Sent Events (SSE) 实现流式响应

**理由:**
- 更简单的实现
- 浏览器原生支持 (EventSource API)
- 单向通信足够满足需求
- 自动重连机制

### 2. 前端无框架

**决定:** 使用原生 HTML/CSS/JS

**理由:**
- 项目规模小，无需复杂状态管理
- 减少构建复杂度
- 更快的加载速度

### 3. Prompt 模板使用 Markdown 文件

**决定:** 将默认 Prompt 存储在独立的 .md 文件中

**理由:**
- 方便编辑和版本控制
- 支持 Markdown 格式化
- 后端启动时加载，无需硬编码

### 4. 图片传输使用 Base64

**决定:** 前端将图片转为 Base64 发送，不压缩

**理由:**
- 简化 API 设计
- 避免文件上传的复杂性
- OpenRouter API 接受 Base64 格式

### 5. MLLM 输出同步策略

**决定:** 等 MLLM 完成后一次性同步到右侧生图 Prompt

**理由:**
- 避免用户编辑时被打断
- 实现更简单

### 6. API 重试策略

**决定:** 自动重试 3 次

**理由:**
- 提高稳定性
- 减少用户手动操作

## Dependencies

### Python Packages

| 包名 | 版本 | 用途 |
|------|------|------|
| fastapi | >=0.115.0 | Web 框架 |
| uvicorn | >=0.32.0 | ASGI 服务器 |
| httpx | >=0.28.0 | 异步 HTTP 客户端 |
| python-multipart | >=0.0.12 | 表单数据解析 |

### Browser APIs

| API | 用途 |
|-----|------|
| FileReader | 读取上传的图片文件 |
| EventSource | SSE 流式响应接收 |
| Clipboard API | 粘贴图片支持 |
| Drag and Drop API | 拖拽上传 |

## OpenRouter Request Format

### MLLM Request (with image)
```json
{
  "model": "google/gemini-2.5-pro-preview",
  "stream": true,
  "messages": [
    {
      "role": "system",
      "content": "System prompt here..."
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "User prompt here..."
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,..."
          }
        }
      ]
    }
  ]
}
```

### Image Generation Request
```python
# 使用 openai SDK，参考 /Users/bytedance/code/artkit/src/artkit/providers/openrouter.py
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
    timeout=120.0,
)

response = await client.chat.completions.create(
    model="google/gemini-3-pro-image-preview",
    messages=[{"role": "user", "content": prompt}],
    extra_body={"modalities": ["image", "text"]},  # 关键参数
)
```

### Image Generation Response
```python
# 响应中图片在 message.images 字段
api_dict = response.choices[0].message.model_dump()
images = api_dict.get("images", [])
# images 格式: [{"type": "image_url", "image_url": {"url": "data:image/...;base64,..."}}]
```

## Notes

- 生图使用 `extra_body={"modalities": ["image", "text"]}` 触发图像生成
- 图片在响应的 `images` 字段中，格式为 `image_url` 类型
- MLLM 流式输出完成后一次性同步到生图 Prompt
- API 调用失败时自动重试 3 次

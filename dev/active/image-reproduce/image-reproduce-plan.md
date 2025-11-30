# Image Reproduce Tool - Development Plan

**Last Updated: 2025-11-30**

## Executive Summary

构建一个图像复现测试工具，用于评估VLM（视觉语言模型）和图像生成模型的能力。核心流程：用户上传图片 -> VLM分析生成描述 -> 生图模型根据描述复现图片。

## Current State Analysis

- 空项目，需要从零开始构建
- 使用 OpenRouter 作为统一的 LLM/生图 API 提供商
- 环境变量 `OPENROUTER_API_KEY` 已准备就绪

## Proposed Future State

### 系统架构

```
image-reproduce/
├── pyproject.toml              # uv 项目配置
├── main.py                     # FastAPI 应用入口
├── prompts/                    # Prompt 模板目录
│   ├── vlm_system.md           # VLM 系统提示模板
│   └── vlm_user.md             # VLM 用户提示模板
├── static/
│   └── index.html              # 前端单页应用
├── dev/
│   └── active/
│       └── image-reproduce/    # 开发文档
└── .env.example                # 环境变量示例
```

### 技术栈

| 组件 | 技术选型 |
|------|----------|
| 后端框架 | FastAPI + uvicorn |
| 包管理 | uv |
| HTTP客户端 | httpx (async) |
| 流式响应 | SSE (Server-Sent Events) |
| 前端 | 原生 HTML/CSS/JS |
| API提供商 | OpenRouter |

### 默认模型配置

| 用途 | 模型 |
|------|------|
| VLM (图像分析) | `google/gemini-3-pro-preview` |
| 图像生成 | `google/gemini-3-pro-image-preview` |

## Implementation Phases

### Phase 1: 项目初始化

1. 初始化 uv 项目，配置 pyproject.toml
2. 创建目录结构
3. 创建 .env.example 文件

### Phase 2: Prompt 模板

1. 创建 VLM 系统提示模板 (prompts/vlm_system.md)
2. 创建 VLM 用户提示模板 (prompts/vlm_user.md)

### Phase 3: 后端开发

1. 实现 FastAPI 应用基础结构
2. 实现 Prompt 模板加载逻辑
3. 实现 `/api/analyze` 端点 (VLM 分析，SSE 流式)
4. 实现 `/api/generate` 端点 (图像生成)
5. 实现静态文件服务

### Phase 4: 前端开发

1. 创建基础 HTML 结构和样式
2. 实现图片上传/粘贴功能
3. 实现 VLM 配置和调用
4. 实现流式响应显示
5. 实现生图配置和调用
6. 实现左右联动（VLM输出同步到生图Prompt）

### Phase 5: 测试和优化

1. 端到端测试
2. 错误处理优化
3. UI/UX 优化

## API Design

### `GET /`
返回前端页面

### `GET /api/prompts`
返回默认的 System Prompt 和 User Prompt 模板

**Response:**
```json
{
  "system_prompt": "...",
  "user_prompt": "..."
}
```

### `POST /api/analyze`
调用 VLM 分析图片，流式返回结果

**Request:**
```json
{
  "image": "base64_encoded_image",
  "model": "google/gemini-2.5-pro-preview",
  "system_prompt": "...",
  "user_prompt": "..."
}
```

**Response:** SSE 流式返回文本

### `POST /api/generate`
调用生图模型生成图片

**Request:**
```json
{
  "prompt": "...",
  "model": "google/gemini-2.0-flash-exp"
}
```

**Response:**
```json
{
  "image": "base64_encoded_image"
}
```

## Frontend Layout

```
+---------------------------+---------------------------+
|     图片上传/粘贴区        |     生图模型选择           |
|     [拖拽/点击/Ctrl+V]    |     [下拉框]               |
+---------------------------+---------------------------+
|     VLM模型选择           |                           |
|     [下拉框]              |     图像Prompt编辑框       |
+---------------------------+     (从左侧自动同步)        |
|     System Prompt         |     [可编辑文本框]         |
|     [可编辑文本框]         |                           |
+---------------------------+---------------------------+
|     User Prompt           |     [生成按钮]             |
|     [可编辑文本框]         |                           |
+---------------------------+---------------------------+
|     [分析按钮]            |                           |
+---------------------------+     生成图片展示区         |
|                           |     [图片显示/下载]        |
|     VLM响应输出           |                           |
|     (流式显示)            |                           |
+---------------------------+---------------------------+
```

## Risk Assessment

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| OpenRouter API 不稳定 | 高 | 自动重试3次，友好错误提示 |
| 流式响应中断 | 中 | 前端处理断连，支持重新请求 |
| 生图模型返回非图片 | 中 | 后端验证响应格式 |

## Success Metrics

1. 成功上传图片并显示预览
2. VLM 能流式返回图像分析结果
3. 分析结果自动同步到生图 Prompt
4. 生图模型成功返回并显示生成的图片
5. 整体响应时间可接受 (<30s for VLM, <60s for image gen)

## Required Resources

- Python 3.11+
- uv 包管理器
- OpenRouter API Key
- 现代浏览器 (支持 EventSource API)

## Dependencies

```toml
[project]
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn>=0.32.0",
    "httpx>=0.28.0",
    "python-multipart>=0.0.12",
]
```

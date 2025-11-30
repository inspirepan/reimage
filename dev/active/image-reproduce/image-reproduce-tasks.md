# Image Reproduce Tool - Task Checklist

**Last Updated: 2025-11-30**

## Phase 1: 项目初始化

- [x] **T1.1** 初始化 uv 项目 `uv init`
  - Effort: S
  - Acceptance: pyproject.toml 存在且配置正确
  
- [x] **T1.2** 添加项目依赖
  - Effort: S
  - Dependencies: T1.1
  - Acceptance: `uv add fastapi uvicorn httpx python-multipart` 成功

- [x] **T1.3** 创建目录结构
  - Effort: S
  - Acceptance: prompts/ 和 static/ 目录存在

- [x] **T1.4** 创建 .env.example
  - Effort: S
  - Acceptance: 文件包含 OPENROUTER_API_KEY=your_key_here

## Phase 2: Prompt 模板

- [x] **T2.1** 创建 VLM 系统提示模板
  - Effort: S
  - File: prompts/vlm_system.md
  - Acceptance: 包含清晰的图像分析指导

- [x] **T2.2** 创建 VLM 用户提示模板
  - Effort: S
  - File: prompts/vlm_user.md
  - Acceptance: 包含图像复现的具体要求

## Phase 3: 后端开发

- [x] **T3.1** 创建 FastAPI 应用基础结构
  - Effort: M
  - File: main.py
  - Acceptance: 应用可启动，访问 / 返回静态页面

- [x] **T3.2** 实现 Prompt 模板加载
  - Effort: S
  - Dependencies: T2.1, T2.2
  - Acceptance: /api/prompts 返回模板内容

- [x] **T3.3** 实现 /api/analyze 端点
  - Effort: L
  - Dependencies: T3.1
  - Acceptance: 
    - 接收图片和配置
    - 调用 OpenRouter VLM API
    - SSE 流式返回响应

- [x] **T3.4** 实现 /api/generate 端点
  - Effort: L
  - Dependencies: T3.1
  - Acceptance:
    - 接收 prompt 和模型配置
    - 调用 OpenRouter 生图 API
    - 返回生成的图片 (base64)

## Phase 4: 前端开发

- [x] **T4.1** 创建基础 HTML 结构
  - Effort: M
  - File: static/index.html
  - Acceptance: 左右两栏布局，所有 UI 元素存在

- [x] **T4.2** 实现图片上传功能
  - Effort: M
  - Dependencies: T4.1
  - Acceptance:
    - 支持点击上传
    - 支持拖拽上传
    - 支持 Ctrl+V 粘贴
    - 显示图片预览

- [x] **T4.3** 实现 VLM 调用和流式显示
  - Effort: M
  - Dependencies: T4.1, T3.3
  - Acceptance:
    - 可编辑 System/User Prompt
    - 点击分析按钮调用 API
    - 流式显示 VLM 响应

- [x] **T4.4** 实现 Prompt 同步
  - Effort: S
  - Dependencies: T4.3
  - Acceptance: VLM 输出实时同步到右侧生图 Prompt 框

- [x] **T4.5** 实现生图调用和显示
  - Effort: M
  - Dependencies: T4.1, T3.4
  - Acceptance:
    - 可编辑生图 Prompt
    - 点击生成按钮调用 API
    - 显示生成的图片

## Phase 5: 测试和优化

- [ ] **T5.1** 端到端测试
  - Effort: M
  - Dependencies: Phase 3, Phase 4
  - Acceptance: 完整流程可运行

- [ ] **T5.2** 错误处理优化
  - Effort: M
  - Acceptance:
    - API 错误友好提示
    - 网络错误处理
    - 加载状态显示

- [ ] **T5.3** UI/UX 优化
  - Effort: M
  - Acceptance:
    - 响应式布局
    - 按钮禁用状态
    - 加载动画

---

## Progress Summary

| Phase | Total | Done | Progress |
|-------|-------|------|----------|
| Phase 1 | 4 | 4 | 100% |
| Phase 2 | 2 | 2 | 100% |
| Phase 3 | 4 | 4 | 100% |
| Phase 4 | 5 | 5 | 100% |
| Phase 5 | 3 | 0 | 0% |
| **Total** | **18** | **15** | **83%** |

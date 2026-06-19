# Video Learn - 项目规划

## 项目目标
Web 应用，输入 YouTube 或 Bilibili 视频 URL，输出：
1. 视频摘要（Summary）
2. AI 对话问答（基于视频内容）
3. 思维导图（Mind Map）
4. 回答带时间戳引用

## 技术栈
- 前端：Next.js（App Router）
- 后端：Next.js API Routes / Vercel Functions
- 视频字幕提取：yt-dlp
- LLM API：MiniMax（兼容 OpenAI 格式）
- 思维导图：react-markmap
- 部署：Vercel

## 架构设计

### 目录结构
```
video-learn/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # 主页面
│   ├── globals.css
│   ├── api/
│   │   ├── process-video/   # 处理视频 URL，提取字幕
│   │   ├── chat/            # AI 对话 API
│   │   └── mindmap/         # 思维导图生成
│   └── components/
│       ├── UrlInput.tsx     # URL 输入框
│       ├── Summary.tsx      # 摘要展示
│       ├── ChatWindow.tsx  # AI 对话窗口
│       └── MindMap.tsx      # 思维导图
├── lib/
│   ├── youtube.ts            # YouTube 字幕提取
│   ├── bilibili.ts         # Bilibili 字幕提取
│   ├── llm.ts             # MiniMax LLM 封装
│   └── types.ts           # 类型定义
├── package.json
└── vercel.json / vercel.ts
```

### 核心流程

```
URL 输入
    │
    ▼
[API: /api/process-video]
    │
    ├── 识别平台（YouTube/Bilibili）
    ├── yt-dlp 提取字幕
    ├── 返回字幕文本
    │
    ▼
摘要生成（LLM）
    │
    ▼
展示摘要 + 对话入口
```

## Phase 1（MVP）实现细节

### 1.1 URL 识别与验证
- 正则匹配 YouTube: `youtube.com/watch`, `youtu.be/`
- 正则匹配 Bilibili: `bilibili.com/video/`

### 1.2 字幕提取
- **YouTube**: `yt-dlp --write-subs --write-auto-subs --skip-download -o %(id)s.%(ext)s`
- **Bilibili**: `yt-dlp --sub-lang --write-subs --skip-download`
- 返回格式：纯文本 / 带时间戳的 SRT

### 1.3 摘要生成
- MiniMax API：使用 `abab6.5s-chat` 模型
- Prompt 模板：
```
请根据以下视频字幕，生成一个简洁的摘要（200字以内）：

{字幕内容}
```

### 1.4 基础 UI
- 简洁的输入框 + 提交按钮
- 加载状态显示
- 摘要展示区域

## Phase 2 实现细节

### 2.1 AI 对话
- 基于字幕内容的 RAG
- 保留时间戳信息用于引用

### 2.2 时间戳引用
- 回答中标注 `[MM:SS]` 引用
- 可点击跳转到视频对应位置

## Phase 3 实现细节

### 3.1 思维导图生成
- 使用 LLM 生成 Markdown 格式的大纲
- 通过 react-markmap 渲染

## 环境变量
```
MINIMAX_API_KEY=your-api-key
MINIMAX_BASE_URL=https://api.minimax.chat/v1  # 可选
```

## 验收标准（Phase 1）
- [ ] YouTube URL 输入后能提取字幕并生成摘要
- [ ] Bilibili URL 输入后能提取字幕并生成摘要
- [ ] 摘要准确反映视频内容
- [ ] UI 简洁易用

## 参考项目
- BibiGPT-v1: https://github.com/JimmyLv/BibiGPT-v1
- lakhess: YouTube → mind map + summary
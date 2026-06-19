# Video Learn - Project Documentation

## Project Overview
- **Name**: Video Learn
- **Type**: Next.js Web Application
- **Goal**: Input YouTube/Bilibili URL, output summary, AI chat, mind map
- **Tech Stack**: Next.js 14, TypeScript, yt-dlp, MiniMax API

## Directory Structure
```
video-learn/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main UI
│   ├── globals.css          # Styles
│   └── api/
│       ├── process-video/  # Extract subtitles + summary
│       ├── chat/            # AI chat API
│       └── mindmap/         # Mind map generation
├── lib/
│   ├── types.ts            # Type definitions
│   ├── youtube.ts          # YouTube subtitle extraction
│   ├── bilibili.ts          # Bilibili subtitle extraction
│   └── llm.ts              # MiniMax LLM wrapper
├── package.json
├── tsconfig.json
└── next.config.js
```

## Key APIs
- `/api/process-video` - POST, {url} → {summary, subtitles}
- `/api/chat` - POST, {question, subtitles} → {answer}
- `/api/mindmap` - POST, {subtitles} → {mindmap}

## Environment Variables
- `MINIMAX_API_KEY` - Required API key
- `MINIMAX_BASE_URL` - Optional custom endpoint

## Running
```bash
npm install
cp .env.local.example .env.local
# Add your MINIMAX_API_KEY
npm run dev
```

## Dependencies
- yt-dlp (must be installed on system)
- openai (MiniMax compatible)
import OpenAI from 'openai';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1';

// Create MiniMax client (compatible with OpenAI SDK)
export function createLLMClient(): OpenAI {
  return new OpenAI({
    apiKey: MINIMAX_API_KEY,
    baseURL: MINIMAX_BASE_URL,
  });
}

// Generate video summary
export async function generateSummary(
  client: OpenAI,
  subtitles: { text: string; startTime: number; endTime: number }[],
  videoTitle?: string
): Promise<string> {
  const subtitleText = subtitles.map(s => s.text).join('\n');

  // Truncate if too long
  const truncatedText = subtitleText.length > 15000
    ? subtitleText.substring(0, 15000) + '\n...（内容已截断）'
    : subtitleText;

  const prompt = `你是一个AI视频摘要助手。请根据以下视频字幕，生成一个简洁的摘要（200-300字），准确概括视频的主要内容。

${videoTitle ? `视频标题：${videoTitle}\n` : ''}
字幕内容：
${truncatedText}

请生成摘要：`;

// Use MiniMax model (abab6.5s-chat is compatible with GPT format)
const response = await client.chat.completions.create({
  model: 'abab6.5s-chat',
  messages: [
    {
      role: 'system',
      content: '你是一个专业的视频内容摘要助手，能够准确理解和总结视频内容。',
    },
    {
      role: 'user',
      content: prompt,
    },
  ],
  max_tokens: 1024,
  temperature: 0.7,
});

  return response.choices[0]?.message?.content || '无法生成摘要';
}

// Chat with AI about video content
export async function chatWithVideo(
  client: OpenAI,
  subtitles: { text: string; startTime: number; endTime: number }[],
  question: string,
  videoTitle?: string
): Promise<{ answer: string; references: number[] }> {
  const subtitleText = subtitles.map(s => `[${formatTime(s.startTime)}] ${s.text}`).join('\n');

  // Truncate if too long
  const truncatedText = subtitleText.length > 12000
    ? subtitleText.substring(0, 12000) + '\n...（更多内容）'
    : subtitleText;

  const prompt = `你是一个基于视频内容回答问题的AI助手。请根据以下字幕内容回答用户的问题。如果能在字幕中找到答案，请标注时间戳引用。

${videoTitle ? `视频标题：${videoTitle}\n` : ''}
字幕内容：
${truncatedText}

用户问题：${question}

请回答用户的问题。如果涉及视频内容的特定部分，请标注时间戳 [MM:SS]。`;

  const response = await client.chat.completions.create({
    model: 'abab6.5s-chat',
    messages: [
      {
        role: 'system',
        content: '你是一个专业的视频问答助手，能够基于视频字幕回答问题，并在回答中引用相关时间戳。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 2048,
    temperature: 0.7,
  });

  const answer = response.choices[0]?.message?.content || '无法回答';

  // Extract timestamp references from answer
  const references = extractTimestamps(answer);

  return { answer, references };
}

// Generate mind map in Markdown format
export async function generateMindMap(
  client: OpenAI,
  subtitles: { text: string; startTime: number; endTime: number }[],
  videoTitle?: string
): Promise<string> {
  const subtitleText = subtitles.map(s => s.text).join('\n');

  const truncatedText = subtitleText.length > 10000
    ? subtitleText.substring(0, 10000) + '\n...'
    : subtitleText;

  const prompt = `你是一个AI思维导图助手。请根据以下视频字幕，生成一个Markdown格式的思维导图，使用层级结构。

${videoTitle ? `视频标题：${videoTitle}\n` : ''}
字幕内容：
${truncatedText}

请生成思维导图（使用Markdown标题层级，如 # 一级主题, ## 二级主题, ### 三级主题）：`;

  const response = await client.chat.completions.create({
    model: 'abab6.5s-chat',
    messages: [
      {
        role: 'system',
        content: '你是一个专业的思维导图生成助手，能够将内容整理成清晰的层级结构。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 2048,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '# 无法生成思维导图';
}

// Helper functions
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function extractTimestamps(text: string): number[] {
  const timestamps: number[] = [];
  const regex = /\[(\d{1,2}):(\d{2})\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const mins = parseInt(match[1]);
    const secs = parseInt(match[2]);
    timestamps.push(mins * 60 + secs);
  }

  return Array.from(new Set(timestamps)); // Remove duplicates
}
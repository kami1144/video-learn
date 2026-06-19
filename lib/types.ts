// Video platform types
export type VideoPlatform = 'youtube' | 'bilibili';

export interface VideoInfo {
  platform: VideoPlatform;
  videoId: string;
  url: string;
  title?: string;
  subtitles?: Subtitle[];
}

export interface Subtitle {
  startTime: number; // seconds
  endTime: number;
  text: string;
}

export interface SummaryResult {
  summary: string;
  videoInfo: VideoInfo;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number; // video timestamp reference
}

export interface ChatResult {
  answer: string;
  references: number[]; // timestamps
}

// Platform detection
export function detectPlatform(url: string): VideoPlatform | null {
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  const bilibiliPatterns = [
    /bilibili\.com\/video\/(BV[a-zA-Z0-9]+|av\d+)/,
  ];

  for (const pattern of youtubePatterns) {
    if (pattern.test(url)) return 'youtube';
  }
  for (const pattern of bilibiliPatterns) {
    if (pattern.test(url)) return 'bilibili';
  }
  return null;
}

export function extractVideoId(url: string, platform: VideoPlatform): string | null {
  if (platform === 'youtube') {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }
  if (platform === 'bilibili') {
    const match = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+|av\d+)/);
    return match ? match[1] : null;
  }
  return null;
}
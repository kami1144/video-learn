import type { Subtitle } from './types';

// Bilibili 字幕提取暂不支持
// 未来计划：支持用户上传字幕文件
export async function extractBilibiliSubtitles(videoId: string): Promise<Subtitle[]> {
  console.warn('Bilibili subtitle extraction not yet supported');
  return [];
}
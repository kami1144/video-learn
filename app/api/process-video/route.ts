import { NextRequest, NextResponse } from 'next/server';
import { detectPlatform, extractVideoId, type Subtitle } from '@/lib/types';
import { extractYouTubeSubtitles } from '@/lib/youtube';
import { extractBilibiliSubtitles } from '@/lib/bilibili';
import { createLLMClient, generateSummary } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Detect platform
    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported platform. Please use YouTube or Bilibili URL.' },
        { status: 400 }
      );
    }

    // Extract video ID
    const videoId = extractVideoId(url, platform);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid video URL' },
        { status: 400 }
      );
    }

    console.log(`Processing ${platform} video: ${videoId}`);

    // Extract subtitles based on platform
    let subtitles: Subtitle[] = [];
    if (platform === 'youtube') {
      subtitles = await extractYouTubeSubtitles(videoId);
    } else if (platform === 'bilibili') {
      subtitles = await extractBilibiliSubtitles(videoId);
    }

    if (subtitles.length === 0) {
      return NextResponse.json(
        { error: 'No subtitles found for this video. The video may not have subtitles available.' },
        { status: 404 }
      );
    }

    // Generate summary using LLM
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'MINIMAX_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const client = createLLMClient();
    const summary = await generateSummary(client, subtitles);

    return NextResponse.json({
      success: true,
      platform,
      videoId,
      url,
      subtitles: subtitles.map(s => s.text),
      summary,
    });
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: 'Failed to process video' },
      { status: 500 }
    );
  }
}
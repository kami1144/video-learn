import { NextRequest, NextResponse } from 'next/server';
import { createLLMClient, generateSummary } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, videoId, platform = 'youtube', subtitles } = body;

    if (!url || !videoId) {
      return NextResponse.json(
        { error: 'URL and videoId are required' },
        { status: 400 }
      );
    }

    // subtitles are now sent from the frontend (from Supabase)
    if (!subtitles || subtitles.length === 0) {
      return NextResponse.json(
        { error: 'No subtitles found for this video.' },
        { status: 404 }
      );
    }

    console.log(`Processing ${platform} video: ${videoId}, subtitles: ${subtitles.length}`);

    // Check API key
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'MINIMAX_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Generate summary using LLM
    const client = createLLMClient();
    const summary = await generateSummary(client, subtitles);

    return NextResponse.json({
      success: true,
      platform,
      videoId,
      url,
      subtitles: subtitles.map((s: any) => s.text || s),
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

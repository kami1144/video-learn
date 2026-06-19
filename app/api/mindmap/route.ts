import { NextRequest, NextResponse } from 'next/server';
import { createLLMClient, generateMindMap } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subtitles, videoTitle } = body;

    if (!subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { error: 'Subtitles are required' },
        { status: 400 }
      );
    }

    // Check API key
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'MINIMAX_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const client = createLLMClient();
    const mindmap = await generateMindMap(client, subtitles, videoTitle);

    return NextResponse.json({
      success: true,
      mindmap,
    });
  } catch (error) {
    console.error('Error generating mindmap:', error);
    return NextResponse.json(
      { error: 'Failed to generate mindmap' },
      { status: 500 }
    );
  }
}
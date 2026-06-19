import { NextRequest, NextResponse } from 'next/server';
import { createLLMClient, chatWithVideo } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, subtitles, videoTitle } = body;

    if (!question || !subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { error: 'Question and subtitles are required' },
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
    const result = await chatWithVideo(client, subtitles, question, videoTitle);

    return NextResponse.json({
      success: true,
      answer: result.answer,
      references: result.references,
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
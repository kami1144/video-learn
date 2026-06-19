import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tvjnfmavrotzeqqbvbbi.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Jbjk7nNhIk4pQKmof4h6aw_YX0a3xK7';

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId');
  const platform = request.nextUrl.searchParams.get('platform') || 'youtube';

  if (!videoId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 });
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/subtitles`;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    };
    const params = {
      'video_id': `eq.${videoId}`,
      'platform': `eq.${platform}`,
      'select': '*',
    };

    const resp = await fetch(`${url}?${new URLSearchParams(params)}`, { headers });
    if (!resp.ok) {
      throw new Error(`Supabase error: ${resp.status}`);
    }

    const data = await resp.json();
    if (!data || data.length === 0) {
      return NextResponse.json({ 
        error: 'Subtitles not found. Please extract them first using Hermes.',
        videoId,
        platform,
        hint: 'Run: python3 ~/.hermes/skills/video-subtitle-extractor/extract.py "VIDEO_URL"'
      }, { status: 404 });
    }

    const subtitles = data[0];
    return NextResponse.json({
      success: true,
      videoId,
      platform,
      language: subtitles.language,
      title: subtitles.title,
      subtitles: subtitles.subtitles,
      createdAt: subtitles.created_at,
    });
  } catch (error) {
    console.error('Error fetching subtitles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subtitles' },
      { status: 500 }
    );
  }
}

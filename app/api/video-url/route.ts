import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId');
  const platform = request.nextUrl.searchParams.get('platform') || 'bilibili';

  if (!videoId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 });
  }

  // For YouTube, just return the embed URL
  if (platform === 'youtube') {
    return NextResponse.json({
      success: true,
      url: `https://www.youtube.com/embed/${videoId}`,
      type: 'youtube'
    });
  }

  // For Bilibili, try to get HD URL from local proxy
  try {
    // Try local proxy first (user's Mac)
    const localProxyUrl = `http://localhost:3030/video-url?videoId=${encodeURIComponent(videoId)}&platform=${platform}`;
    
    const response = await fetch(localProxyUrl, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.url) {
        return NextResponse.json({
          success: true,
          url: data.url,
          type: 'direct',
          source: 'local'
        });
      }
    }
  } catch (error) {
    console.log('Local proxy not available, falling back to embed:', error);
  }

  // Fallback to embed player
  return NextResponse.json({
    success: true,
    url: `https://player.bilibili.com/player.html?bvid=${videoId}&autoplay=0`,
    type: 'embed',
    source: 'embed'
  });
}

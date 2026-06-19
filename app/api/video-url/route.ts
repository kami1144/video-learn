import { NextRequest, NextResponse } from 'next/server';

const LOCAL_PROXY = 'http://localhost:3030';

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId');
  const platform = request.nextUrl.searchParams.get('platform') || 'bilibili';
  const action = request.nextUrl.searchParams.get('action') || 'url';
  const quality = request.nextUrl.searchParams.get('quality') || '1080';

  if (!videoId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 });
  }

  // For YouTube without local proxy, just return embed URL
  if (platform === 'youtube' && action === 'url') {
    return NextResponse.json({
      success: true,
      url: `https://www.youtube.com/embed/${videoId}`,
      type: 'iframe'
    });
  }

  // For Bilibili or download actions, use local proxy
  try {
    let endpoint = '';
    if (action === 'download') {
      endpoint = `/download?videoId=${encodeURIComponent(videoId)}&platform=${platform}&quality=${quality}`;
    } else if (action === 'status') {
      endpoint = `/download-status?videoId=${encodeURIComponent(videoId)}`;
    } else {
      endpoint = `/video-url?videoId=${encodeURIComponent(videoId)}&platform=${platform}`;
    }

    const response = await fetch(`${LOCAL_PROXY}${endpoint}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.log('Local proxy error:', error);
  }

  // Fallback
  return NextResponse.json({
    success: true,
    url: `https://player.bilibili.com/player.html?bvid=${videoId}&autoplay=0`,
    type: 'embed',
    source: 'embed'
  });
}

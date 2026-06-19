import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId');
  const lang = request.nextUrl.searchParams.get('lang') || 'en';

  if (!videoId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 });
  }

  try {
    // First get video page to find caption tracks
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoResponse = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = await videoResponse.text();

    // Extract ytInitialPlayerResponse - use a helper to avoid /s flag issue
    const playerMatch = extractPlayerResponse(html);
    if (!playerMatch) {
      return NextResponse.json({ error: 'Could not find player data' }, { status: 404 });
    }

    let playerData;
    try {
      playerData = JSON.parse(playerMatch[1]);
    } catch {
      return NextResponse.json({ error: 'Failed to parse player data' }, { status: 500 });
    }

    const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captions || captions.length === 0) {
      return NextResponse.json({ error: 'No captions available' }, { status: 404 });
    }

    // Find preferred language
    let track = captions.find((t: any) => t.languageCode === lang);
    if (!track) {
      track = captions.find((t: any) => t.languageCode.startsWith('en'));
    }
    if (!track) {
      track = captions[0];
    }

    const baseUrl = track.baseUrl;

    // Fetch the actual subtitle XML
    const subtitleResponse = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    const xml = await subtitleResponse.text();

    // Parse XML to segments
    const subtitles = parseSubtitlesXml(xml);

    return NextResponse.json({
      videoId,
      language: track.languageCode,
      languageName: track.name?.simpleText || track.languageCode,
      subtitles,
    });
  } catch (error) {
    console.error('Caption extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract captions' }, { status: 500 });
  }
}

function parseSubtitlesXml(xml: string): Array<{ startTime: number; endTime: number; text: string }> {
  const subtitles: Array<{ startTime: number; endTime: number; text: string }> = [];
  const timeRegExp = /<p[^>]*t="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  let lastEndTime = 0;

  while ((match = timeRegExp.exec(xml)) !== null) {
    const startMs = parseInt(match[1]);
    const textContent = match[2]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    if (textContent) {
      const startTime = startMs / 1000;
      subtitles.push({
        startTime,
        endTime: lastEndTime || startTime + 3,
        text: textContent,
      });
      lastEndTime = startTime + 3;
    }
  }

  return subtitles;
}

// Helper to extract player response JSON from HTML without /s flag
function extractPlayerResponse(html: string): RegExpMatchArray | null {
  const marker = '"ytInitialPlayerResponse"';
  const idx = html.indexOf(marker);
  if (idx === -1) return null;

  // Find the opening brace and try to parse JSON from there
  let start = html.indexOf('{', idx);
  if (start === -1) return null;

  let depth = 0;
  let end = start;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  const json = html.substring(start, end);
  return ['', json] as any;
}

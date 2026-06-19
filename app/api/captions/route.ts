import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId');
  const lang = request.nextUrl.searchParams.get('lang') || 'en';

  if (!videoId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 });
  }

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoResponse = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = await videoResponse.text();

    // Extract caption tracks from HTML using simple string search
    const captionsData = extractCaptionTracksFromHtml(html);
    
    if (!captionsData || captionsData.length === 0) {
      return NextResponse.json({ error: 'No captions available for this video' }, { status: 404 });
    }

    // Find preferred language
    let track = captionsData.find((t: any) => t.languageCode === lang);
    if (!track) {
      track = captionsData.find((t: any) => t.languageCode.startsWith('en'));
    }
    if (!track) {
      track = captionsData[0];
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

function extractCaptionTracksFromHtml(html: string): any[] {
  // Look for captionTracks array in the HTML
  // YouTube embeds this as: "captionTracks":[{"baseUrl":"...","name":{"simpleText":"..."},"languageCode":"en"},...
  const marker = '"captionTracks":[';
  const idx = html.indexOf(marker);
  if (idx === -1) return [];

  // Find the opening bracket
  let start = idx + marker.length - 1; // position of [
  let depth = 0;
  let end = start;

  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  const arrayStr = html.substring(start, end);
  try {
    return JSON.parse(arrayStr);
  } catch {
    return [];
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

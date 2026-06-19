import type { Subtitle } from './types';

const YOUTUBE_DATA_API_KEY = process.env.YOUTUBE_DATA_API_KEY || '';

export async function extractYouTubeSubtitles(videoId: string): Promise<Subtitle[]> {
  try {
    // Method 1: Try YouTube Data API captions endpoint
    const captions = await tryYouTubeDataApiCaptions(videoId);
    if (captions.length > 0) return captions;

    // Method 2: Try YouTube's internal subtitle endpoint
    const subtitles = await tryYouTubeInternalSubtitles(videoId);
    if (subtitles.length > 0) return subtitles;

    console.log('No subtitles found for video:', videoId);
    return [];
  } catch (error) {
    console.error('Failed to get YouTube transcript:', error);
    return [];
  }
}

async function tryYouTubeDataApiCaptions(videoId: string): Promise<Subtitle[]> {
  if (!YOUTUBE_DATA_API_KEY) return [];

  try {
    // Get caption tracks from video
    const url = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${YOUTUBE_DATA_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.items || data.items.length === 0) return [];

    // Get the first available caption track
    const captionTrack = data.items[0];
    const trackKind = captionTrack.snippet.trackKind;
    const language = captionTrack.snippet.language;

    // Note: YouTube Data API cannot download caption content without OAuth
    // So we still need Method 2 for actual text
    console.log(`Found caption: ${language} (${trackKind})`);
    return [];
  } catch (error) {
    console.error('YouTube Data API error:', error);
    return [];
  }
}

async function tryYouTubeInternalSubtitles(videoId: string): Promise<Subtitle[]> {
  try {
    // Get video metadata to find subtitle tracks
    const metadataUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(metadataUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return [];

    const html = await response.text();

    // Try to extract captions from HTML (player config)
    const captionMatch = extractJsonFromHtml(html, 'captionTracks');
    if (!captionMatch) return [];

    const captionTracks = JSON.parse(`[${captionMatch}]`);
    if (!captionTracks || captionTracks.length === 0) return [];

    // Find auto-generated or preferred subtitle
    const preferredTrack = captionTracks.find((t: any) =>
      t.languageCode === 'en' || t.languageCode === 'zh-Hans' || t.languageCode === 'zh-CN'
    ) || captionTracks[0];

    const subtitleUrl = preferredTrack.baseUrl;
    if (!subtitleUrl) return [];

    // Fetch subtitle content
    const subtitleResponse = await fetch(subtitleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    const subtitleXml = await subtitleResponse.text();
    return parseSubtitlesXml(subtitleXml);
  } catch (error) {
    console.error('YouTube internal subtitles error:', error);
    return [];
  }
}

function parseSubtitlesXml(xml: string): Subtitle[] {
  const subtitles: Subtitle[] = [];
  const timeRegExp = /<p[^>]*t="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let match;

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
      subtitles.push({
        startTime: startMs / 1000,
        endTime: startMs / 1000 + 5, // Approximate duration
        text: textContent,
      });
    }
  }

  return subtitles;
}

// Helper function to extract JSON array from HTML
function extractJsonFromHtml(html: string, key: string): string | null {
  // Find the key followed by array brackets
  const regex = new RegExp(`"${key}":\\[(.*?)\\]`, '');
  const match = html.match(regex);
  return match ? match[1] : null;
}

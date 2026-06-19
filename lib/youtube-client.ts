// Client-side YouTube subtitle extraction
// Runs in browser to avoid server IP blocking

export interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
}

export async function extractYouTubeSubtitlesClient(videoId: string): Promise<Subtitle[]> {
  try {
    // Method 1: Use YouTube's internal transcript API (JSON format)
    const transcriptUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&fmt=json3`;
    const response = await fetch(transcriptUrl);
    if (response.ok) {
      const data = await response.json();
      const subtitles = parseYouTubeTranscriptJson(data);
      if (subtitles.length > 0) return subtitles;
    }
  } catch (e) {
    console.log('JSON transcript failed');
  }

  // Method 2: Fetch video page and extract caption tracks
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const resp = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await resp.text();

    // Extract caption tracks from player config
    const captionMatch = html.match(/"captionTracks":\[(.*?)\]/);
    if (captionMatch) {
      const captionTracks = JSON.parse(`[${captionMatch[1]}]`);
      if (captionTracks && captionTracks.length > 0) {
        const track = captionTracks.find((t: any) =>
          t.languageCode === 'en' || t.languageCode === 'zh-Hans' || t.languageCode === 'zh-CN'
        ) || captionTracks[0];

        if (track.baseUrl) {
          const trackResp = await fetch(track.baseUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            },
          });
          const xml = await trackResp.text();
          return parseSubtitlesXml(xml);
        }
      }
    }
  } catch (e) {
    console.error('HTML extraction failed:', e);
  }

  return [];
}

function parseYouTubeTranscriptJson(data: any): Subtitle[] {
  if (!data.events) return [];
  const subtitles: Subtitle[] = [];

  for (const event of data.events) {
    if (event.segs) {
      let text = '';
      let startTime = 0;
      for (const seg of event.segs) {
        if (seg.t) text += seg.t;
        if (seg.tOffset) startTime = seg.tOffset / 1000;
      }
      if (text.trim()) {
        subtitles.push({
          startTime,
          endTime: startTime + 3,
          text: text.trim(),
        });
      }
    }
  }

  return subtitles;
}

function parseSubtitlesXml(xml: string): Subtitle[] {
  const subtitles: Subtitle[] = [];
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
        endTime: lastEndTime || startTime + 5,
        text: textContent,
      });
      lastEndTime = startTime + 5;
    }
  }

  return subtitles;
}

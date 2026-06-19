// Client-side YouTube subtitle extraction
// Runs in the browser where YouTube trusts the requests

export interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
}

export async function extractYouTubeSubtitles(videoId: string): Promise<Subtitle[]> {
  // Method 1: Try YouTube's transcript API endpoint (works in browser)
  try {
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3&xorb=2&xab=1&lang=zh-CN&lang=zh-Hans&lang=zh-Hant&lang=en`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      const subtitles = parseJson3Transcript(data);
      if (subtitles.length > 0) return subtitles;
    }
  } catch (e) {
    console.log('Method 1 failed:', e);
  }

  // Method 2: Try to extract from video page (for videos with subtitles)
  try {
    const subtitles = await extractFromVideoPage(videoId);
    if (subtitles.length > 0) return subtitles;
  } catch (e) {
    console.log('Method 2 failed:', e);
  }

  return [];
}

async function extractFromVideoPage(videoId: string): Promise<Subtitle[]> {
  // We need to fetch the transcript from a CORS proxy or directly
  // Use a simple approach: try different subtitle APIs
  const subtitleUrls = [
    // YouTube's transcript API with different lang params
    `https://subtitle.youtubetranscript.com/?v=${videoId}&l=zh&p=1`,
    `https://youtubetranscript.com/?v=${videoId}`,
  ];

  for (const url of subtitleUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        const subtitles = parseTextTranscript(text);
        if (subtitles.length > 0) return subtitles;
      }
    } catch (e) {
      // Continue to next URL
    }
  }

  return [];
}

function parseJson3Transcript(data: any): Subtitle[] {
  if (!data?.events) return [];
  const subtitles: Subtitle[] = [];

  for (const event of data.events) {
    if (event.segs) {
      let text = '';
      let startTime = 0;
      for (const seg of event.segs) {
        if (seg.t) text += seg.t;
        if (seg.tOffset !== undefined) startTime = seg.tOffset / 1000;
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

function parseTextTranscript(text: string): Subtitle[] {
  // Simple text parsing - each line is a subtitle
  const lines = text.split('\n').filter(line => line.trim());
  const subtitles: Subtitle[] = [];
  let currentTime = 0;

  for (const line of lines) {
    // Try to parse time format like [00:01:23] or 00:01:23
    const timeMatch = line.match(/\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(.+)/);
    if (timeMatch) {
      currentTime = parseTimeToSeconds(timeMatch[1]);
      subtitles.push({
        startTime: currentTime,
        endTime: currentTime + 3,
        text: timeMatch[2].trim(),
      });
    } else if (line.trim() && subtitles.length > 0) {
      // Continuation of previous line
      subtitles[subtitles.length - 1].text += ' ' + line.trim();
    }
  }

  return subtitles;
}

function parseTimeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

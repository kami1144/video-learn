'use client';

import { useState } from 'react';
import { extractYouTubeSubtitlesClient } from '@/lib/youtube-client';

interface VideoResult {
  platform: string;
  videoId: string;
  url: string;
  subtitles: { text: string; startTime: number; endTime: number }[];
  summary: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<VideoResult | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'mindmap'>('summary');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [mindmap, setMindmap] = useState('');

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('请输入视频 URL');
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('请输入 YouTube 视频链接');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setChatMessages([]);
    setMindmap('');

    try {
      // Step 1: Extract subtitles client-side (user's browser → YouTube, no blocking)
      console.log('Extracting subtitles from YouTube...');
      const subtitles = await extractYouTubeSubtitlesClient(videoId);

      if (subtitles.length === 0) {
        throw new Error('No subtitles found. The video may not have subtitles available.');
      }

      console.log(`Found ${subtitles.length} subtitle segments`);

      // Step 2: Send subtitles to API for LLM processing (summary generation)
      const response = await fetch('/api/process-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, videoId, subtitles }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '处理失败');
      }

      setResult({
        platform: 'youtube',
        videoId: data.videoId,
        url: data.url,
        subtitles,
        summary: data.summary,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !result) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage,
          subtitles: result.subtitles,
          videoTitle: result.videoId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '发送失败');
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: err instanceof Error ? err.message : '发送失败' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateMindmap = async () => {
    if (!result) return;

    setMindmap('正在生成思维导图...');

    try {
      const response = await fetch('/api/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtitles: result.subtitles,
          videoTitle: result.videoId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '生成失败');
      }

      setMindmap(data.mindmap);
    } catch (err) {
      setMindmap(err instanceof Error ? err.message : '生成失败');
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Video Learn</h1>
        <p>输入 YouTube 或 Bilibili 视频 URL，生成摘要、AI 对话、思维导图</p>
      </header>

      <div className="url-input-section">
        <form onSubmit={handleSubmit}>
          <div className="url-input-wrapper">
            <input
              type="text"
              className="url-input"
              placeholder="粘贴 YouTube 或 Bilibili 视频链接..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? '处理中...' : '生成摘要'}
            </button>
          </div>
        </form>

        {error && <div className="error-message" style={{ marginTop: '1rem' }}>{error}</div>}
      </div>

      {loading && (
        <div className="result-section">
          <div className="loading">
            <div className="spinner"></div>
            <span>正在提取字幕并生成摘要...</span>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="result-section">
          <div className="platform-tags">
            <span className="platform-tag youtube">YouTube</span>
          </div>

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              摘要
            </button>
            <button
              className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              AI 对话
            </button>
            <button
              className={`tab ${activeTab === 'mindmap' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('mindmap');
                if (!mindmap) handleGenerateMindmap();
              }}
            >
              思维导图
            </button>
          </div>

          {activeTab === 'summary' && (
            <div>
              <h2>📝 视频摘要</h2>
              <div className="summary-content">{result.summary}</div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="chat-container">
              <div className="chat-messages">
                {chatMessages.length === 0 && (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
                    💬 基于视频内容，向我提问吧！
                  </div>
                )}
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`chat-message ${msg.role}`}>
                    <div>{msg.content}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-message assistant">
                    <div className="loading">
                      <div className="spinner"></div>
                      <span>思考中...</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="chat-input-wrapper">
                <input
                  type="text"
                  className="chat-input"
                  placeholder="输入问题..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  disabled={chatLoading}
                />
                <button className="send-btn" onClick={handleSendMessage} disabled={chatLoading}>
                  发送
                </button>
              </div>
            </div>
          )}

          {activeTab === 'mindmap' && (
            <div>
              <h2>🧠 思维导图</h2>
              {mindmap ? (
                <div
                  className="mindmap-container"
                  dangerouslySetInnerHTML={{ __html: formatMindmap(mindmap) }}
                />
              ) : (
                <div className="loading">
                  <div className="spinner"></div>
                  <span>生成中...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatMindmap(markdown: string): string {
  return markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n\n/g, '</ul><ul>')
    .replace(/\n/g, '<br/>');
}

'use client';

import { useState, useRef, useEffect } from 'react';

interface VideoResult {
  platform: string;
  videoId: string;
  url: string;
  language: string;
  subtitles: { text: string; start: number; duration: number }[];
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [mindmap, setMindmap] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'mindmap'>('chat');
  const transcriptRef = useRef<HTMLDivElement>(null);

  const extractVideoId = (url: string): { videoId: string; platform: string } | null => {
    const youtubePatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of youtubePatterns) {
      const match = url.match(pattern);
      if (match) return { videoId: match[1], platform: 'youtube' };
    }

    const bilibiliPatterns = [
      /bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/,
      /b23\.tv\/([a-zA-Z0-9]+)/,
    ];
    for (const pattern of bilibiliPatterns) {
      const match = url.match(pattern);
      if (match) return { videoId: match[1], platform: 'bilibili' };
    }

    return null;
  };

  const getEmbedUrl = (url: string, platform: string, videoId: string): string => {
    if (platform === 'youtube') {
      return `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    } else if (platform === 'bilibili') {
      return `https://player.bilibili.com/player.html?bvid=${videoId}&autoplay=0`;
    }
    return '';
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('请输入视频 URL');
      return;
    }

    const extracted = extractVideoId(url);
    if (!extracted) {
      setError('请输入 YouTube 或 Bilibili 视频链接');
      return;
    }

    const { videoId, platform } = extracted;
    setLoading(true);
    setError('');
    setResult(null);
    setChatMessages([]);
    setMindmap('');

    try {
      const subtitlesResponse = await fetch(`/api/subtitles?videoId=${encodeURIComponent(videoId)}&platform=${platform}`);
      const subtitlesData = await subtitlesResponse.json();

      if (!subtitlesResponse.ok || !subtitlesData.subtitles || subtitlesData.subtitles.length === 0) {
        if (subtitlesData.hint) {
          throw new Error(subtitlesData.error + '\n\n提示: ' + subtitlesData.hint);
        }
        throw new Error(subtitlesData.error || '暂无字幕，请先提取');
      }

      const subtitles = subtitlesData.subtitles;
      console.log(`Found ${subtitles.length} subtitle segments`);

      const response = await fetch('/api/process-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, videoId, platform, subtitles }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '处理失败');
      }

      setResult({
        platform,
        videoId,
        url: data.url,
        language: subtitlesData.language || 'en',
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

  const handleTimestampClick = (start: number) => {
    // Could send to video player to seek
    console.log('Clicked timestamp:', start);
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>🎬 Video Learn</h1>
        <p>输入视频链接，一边观看一边和 AI 讨论</p>
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
              {loading ? '加载中...' : '开始学习'}
            </button>
          </div>
        </form>

        {error && (
          <div className="error-message" style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
            {error}
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <span>正在读取字幕...</span>
        </div>
      )}

      {result && !loading && (
        <div className="main-content">
          {/* Left Column: Video + Transcript */}
          <div className="left-column">
            <div className="video-container">
              <iframe
                src={getEmbedUrl(result.url, result.platform, result.videoId)}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video Player"
              />
            </div>

            <div className="summary-section">
              <h3>📝 视频摘要</h3>
              <div className="summary-text">{result.summary}</div>
            </div>

            <div className="transcript-section" ref={transcriptRef}>
              <h3>📜 字幕文字记录</h3>
              <div className="transcript-list">
                {result.subtitles.map((sub, idx) => (
                  <div
                    key={idx}
                    className="transcript-item"
                    onClick={() => handleTimestampClick(sub.start)}
                  >
                    <span className="timestamp">{formatTimestamp(sub.start)}</span>
                    <span className="text">{sub.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Chat + Mindmap */}
          <div className="right-column">
            <div className="chat-tabs">
              <button
                className={`chat-tab ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                💬 AI 对话
              </button>
              <button
                className={`chat-tab ${activeTab === 'mindmap' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('mindmap');
                  if (!mindmap) handleGenerateMindmap();
                }}
              >
                🧠 思维导图
              </button>
            </div>

            {activeTab === 'chat' && (
              <div className="chat-container">
                <div className="chat-messages">
                  {chatMessages.length === 0 && (
                    <div className="chat-welcome">
                      <p>👋 基于视频内容，问我任何问题吧！</p>
                      <p className="hint">例如：视频的核心观点是什么？有哪些关键要点？</p>
                    </div>
                  )}
                  {chatMessages.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.role}`}>
                      <div className="message-content">{msg.content}</div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="chat-message assistant">
                      <div className="message-content">
                        <div className="thinking">思考中...</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="chat-input-wrapper">
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="关于这个视频的任何问题都想问..."
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
              <div className="mindmap-container">
                {mindmap ? (
                  <div className="mindmap-content" dangerouslySetInnerHTML={{ __html: formatMindmap(mindmap) }} />
                ) : (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <span>生成中...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="empty-state">
          <p>👆 在上方输入视频链接开始学习</p>
        </div>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8fafc;
          color: #1e293b;
          line-height: 1.6;
        }

        .app-container {
          min-height: 100vh;
          padding: 1.5rem;
          max-width: 1600px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .header h1 {
          font-size: 2rem;
          color: #3b82f6;
          margin-bottom: 0.5rem;
        }

        .header p {
          color: #64748b;
        }

        .url-input-section {
          max-width: 800px;
          margin: 0 auto 1.5rem;
        }

        .url-input-wrapper {
          display: flex;
          gap: 0.5rem;
        }

        .url-input {
          flex: 1;
          padding: 0.875rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .url-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .submit-btn {
          padding: 0.875rem 1.5rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          background: #fee2e2;
          color: #dc2626;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #64748b;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 0.5rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .main-content {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        @media (max-width: 1024px) {
          .main-content {
            grid-template-columns: 1fr;
          }
        }

        .left-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .video-container {
          position: relative;
          width: 100%;
          padding-top: 56.25%;
          background: #000;
          border-radius: 12px;
          overflow: hidden;
        }

        .video-container iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .summary-section, .transcript-section {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .summary-section h3, .transcript-section h3 {
          font-size: 1rem;
          color: #1e293b;
          margin-bottom: 0.75rem;
        }

        .summary-text {
          font-size: 0.9375rem;
          color: #475569;
          line-height: 1.7;
        }

        .transcript-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .transcript-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: background 0.2s;
        }

        .transcript-item:hover {
          background: #f8fafc;
        }

        .transcript-item:last-child {
          border-bottom: none;
        }

        .timestamp {
          font-size: 0.8125rem;
          color: #3b82f6;
          font-weight: 500;
          min-width: 45px;
        }

        .transcript-item .text {
          font-size: 0.875rem;
          color: #475569;
        }

        .right-column {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          height: calc(100vh - 250px);
          min-height: 500px;
        }

        .chat-tabs {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
        }

        .chat-tab {
          flex: 1;
          padding: 1rem;
          background: none;
          border: none;
          font-size: 0.9375rem;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .chat-tab.active {
          color: #3b82f6;
          border-bottom: 2px solid #3b82f6;
        }

        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .chat-welcome {
          text-align: center;
          padding: 2rem 1rem;
          color: #64748b;
        }

        .chat-welcome .hint {
          font-size: 0.875rem;
          margin-top: 0.5rem;
          color: #94a3b8;
        }

        .chat-message {
          margin-bottom: 1rem;
        }

        .chat-message.user .message-content {
          background: #3b82f6;
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 12px 12px 4px 12px;
          display: inline-block;
          max-width: 85%;
        }

        .chat-message.assistant .message-content {
          background: #f1f5f9;
          color: #1e293b;
          padding: 0.75rem 1rem;
          border-radius: 12px 12px 12px 4px;
          display: inline-block;
          max-width: 85%;
        }

        .chat-input-wrapper {
          display: flex;
          gap: 0.5rem;
          padding: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .chat-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9375rem;
        }

        .chat-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .send-btn {
          padding: 0.75rem 1.25rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .send-btn:hover:not(:disabled) {
          background: #059669;
        }

        .send-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .thinking {
          color: #64748b;
          font-style: italic;
        }

        .mindmap-container {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .mindmap-content {
          font-size: 0.9375rem;
          line-height: 1.8;
        }

        .mindmap-content h1 {
          font-size: 1.25rem;
          color: #1e293b;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #3b82f6;
        }

        .mindmap-content h2 {
          font-size: 1.1rem;
          color: #3b82f6;
          margin: 1rem 0 0.5rem;
        }

        .mindmap-content li {
          margin-left: 1.5rem;
          color: #475569;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #94a3b8;
          font-size: 1.125rem;
        }
      `}</style>
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

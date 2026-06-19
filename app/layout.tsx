import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Video Learn - YouTube/Bilibili 视频学习助手',
  description: '输入 YouTube 或 Bilibili 视频 URL，生成摘要、AI 对话问答、思维导图',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
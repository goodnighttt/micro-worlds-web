import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '微观世界 · 三处风景，一段慢时光',
  description: '在山间神社、樱花车站和海上聚落之间漫游。环顾、靠近，等日光换成月色。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}

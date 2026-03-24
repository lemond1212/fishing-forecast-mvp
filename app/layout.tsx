import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "钓鱼预测助手",
  description: "未来 48 小时天气、潮汐、出钓指数与风险提醒"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "RimeCraft - 对话式 2D 游戏开发工具",
	description:
		"面向青少年的 AI 对话式 2D 游戏创作平台。用自然语言描述想法，AI 帮你生成可玩的 Phaser.js 游戏。",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="zh-CN">
			<body className="bg-background text-foreground antialiased">
				{children}
			</body>
		</html>
	);
}

"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/stores/chat-store";
import { Send, Square, Sparkles } from "lucide-react";
import { EXPERT_ROLES } from "@rimecraft/agent-engine";

export function ChatPanel() {
	const messages = useChatStore((s) => s.messages);
	const status = useChatStore((s) => s.status);
	const streamingContent = useChatStore((s) => s.streamingContent);
	const sendMessage = useChatStore((s) => s.sendMessage);
	const cancelRequest = useChatStore((s) => s.cancelRequest);
	const activeRoleId = useChatStore((s) => s.activeRoleId);
	const expertRole = useChatStore((s) => s.expertRole);
	const [input, setInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, streamingContent]);

	const handleSend = () => {
		const trimmed = input.trim();
		if (!trimmed || status !== "idle") return;
		setInput("");
		sendMessage(trimmed);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const currentRole = activeRoleId ?? expertRole;
	const roleInfo = EXPERT_ROLES[currentRole];

	return (
		<div className="flex h-full flex-col bg-background">
			{/* Header */}
			<div className="flex items-center gap-2 border-b border-border px-4 py-3">
				<Sparkles className="h-4 w-4 text-game-primary" />
				<span className="text-sm font-medium">
					{roleInfo?.name ?? "AI 助手"}
				</span>
				<span className="text-xs text-muted-foreground">
					{roleInfo?.description}
				</span>
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto px-4 py-4">
				{messages.length === 0 && (
					<div className="flex h-full flex-col items-center justify-center text-center">
						<Sparkles className="mb-4 h-12 w-12 text-game-primary/50" />
						<h3 className="mb-2 text-lg font-medium">
							欢迎来到 RimeCraft!
						</h3>
						<p className="max-w-sm text-sm text-muted-foreground">
							告诉我你想做什么游戏吧！比如：
						</p>
						<div className="mt-4 flex flex-col gap-2">
							{[
								"做一个小恐龙跑酷游戏",
								"帮我做一个太空射击游戏",
								"我想做一个像素风 RPG",
							].map((suggestion) => (
								<button
									key={suggestion}
									type="button"
									onClick={() => {
										setInput(suggestion);
									}}
									className="rounded-lg border border-border px-4 py-2 text-left text-sm transition-colors hover:bg-accent"
								>
									{suggestion}
								</button>
							))}
						</div>
					</div>
				)}

				{messages.map((msg) => (
					<div
						key={msg.id}
						className={`mb-4 ${
							msg.role === "user"
								? "flex justify-end"
								: "flex justify-start"
						}`}
					>
						<div
							className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
								msg.role === "user"
									? "bg-primary text-primary-foreground"
									: msg.role === "tool"
										? "border border-border bg-card text-xs text-muted-foreground"
										: msg.role === "system"
											? "text-xs text-game-error"
											: "bg-card text-card-foreground"
							}`}
						>
							{msg.content}
						</div>
					</div>
				))}

				{streamingContent && (
					<div className="mb-4 flex justify-start">
						<div className="max-w-[85%] rounded-2xl bg-card px-4 py-2.5 text-sm text-card-foreground">
							{streamingContent}
							<span className="ml-1 inline-block h-4 w-1 animate-pulse bg-game-primary" />
						</div>
					</div>
				)}

				{status === "thinking" && !streamingContent && (
					<div className="mb-4 flex justify-start">
						<div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-2.5 text-sm text-muted-foreground">
							<div className="flex gap-1">
								<span className="h-2 w-2 animate-bounce rounded-full bg-game-primary [animation-delay:0ms]" />
								<span className="h-2 w-2 animate-bounce rounded-full bg-game-primary [animation-delay:150ms]" />
								<span className="h-2 w-2 animate-bounce rounded-full bg-game-primary [animation-delay:300ms]" />
							</div>
							正在思考...
						</div>
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<div className="border-t border-border p-4">
				<div className="flex items-end gap-2">
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="描述你的游戏想法..."
						rows={1}
						className="flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50"
					/>
					{status !== "idle" ? (
						<button
							type="button"
							onClick={cancelRequest}
							className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/80"
						>
							<Square className="h-4 w-4" />
						</button>
					) : (
						<button
							type="button"
							onClick={handleSend}
							disabled={!input.trim()}
							className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
						>
							<Send className="h-4 w-4" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

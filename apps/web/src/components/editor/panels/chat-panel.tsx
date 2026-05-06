"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChatStore } from "@/stores/chat-store";
import {
	Send,
	Square,
	Sparkles,
	ChevronDown,
	ChevronRight,
	Check,
	X,
	Wrench,
	Copy,
	Users,
	RotateCcw,
} from "lucide-react";
import { EXPERT_ROLES, type AgentMessage, type ExpertRole } from "@rimecraft/agent-engine";
import Markdown from "react-markdown";

function ToolCallCard({ msg }: { msg: AgentMessage }) {
	const [expanded, setExpanded] = useState(false);

	if (!msg.toolCalls || msg.toolCalls.length === 0) return null;

	return (
		<div className="mt-2 space-y-1.5">
			{msg.toolCalls.map((tc) => (
				<button
					key={tc.id}
					type="button"
					onClick={() => setExpanded(!expanded)}
					className="flex w-full items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
				>
					<Wrench className="mt-0.5 h-3 w-3 shrink-0 text-game-primary" />
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5">
							{expanded ? (
								<ChevronDown className="h-3 w-3 text-muted-foreground" />
							) : (
								<ChevronRight className="h-3 w-3 text-muted-foreground" />
							)}
							<span className="font-mono font-medium text-foreground">
								{tc.function.name}
							</span>
						</div>
						{expanded && (
							<pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-all rounded bg-[#1a1a2e] p-2 text-[10px] text-gray-300">
								{(() => {
									try {
										return JSON.stringify(
											JSON.parse(tc.function.arguments),
											null,
											2,
										);
									} catch {
										return tc.function.arguments;
									}
								})()}
							</pre>
						)}
					</div>
				</button>
			))}
		</div>
	);
}

function ToolResultMessage({ msg }: { msg: AgentMessage }) {
	const [expanded, setExpanded] = useState(false);
	const result = msg.toolResults?.[0];
	if (!result) {
		return (
			<div className="max-w-[85%] rounded-2xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
				{msg.content}
			</div>
		);
	}

	return (
		<button
			type="button"
			onClick={() => setExpanded(!expanded)}
			className="max-w-[85%] rounded-xl border border-border bg-card px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50"
		>
			<div className="flex items-center gap-2">
				{result.success ? (
					<Check className="h-3 w-3 text-green-400" />
				) : (
					<X className="h-3 w-3 text-red-400" />
				)}
				<span className="font-mono text-muted-foreground">
					{result.toolName}
				</span>
				{result.undoable && (
					<span className="rounded bg-game-primary/20 px-1 py-0.5 text-[10px] text-game-primary">
						可撤销
					</span>
				)}
				{expanded ? (
					<ChevronDown className="h-3 w-3 text-muted-foreground" />
				) : (
					<ChevronRight className="h-3 w-3 text-muted-foreground" />
				)}
			</div>
			{expanded && (
				<pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-[#1a1a2e] p-2 text-[10px] text-gray-300">
					{msg.content}
				</pre>
			)}
		</button>
	);
}

function CodeBlock({
	children,
	className,
}: {
	children?: React.ReactNode;
	className?: string;
}) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(() => {
		const text =
			typeof children === "string"
				? children
				// biome-ignore lint: accessing ReactElement props for clipboard
				: (children as unknown as { props?: { children?: string } })?.props?.children ?? "";
		navigator.clipboard.writeText(String(text));
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}, [children]);

	if (!className) {
		return (
			<code className="rounded bg-[#2a2a4a] px-1 py-0.5 text-game-primary">
				{children}
			</code>
		);
	}

	const lang = className?.replace("language-", "") ?? "";

	return (
		<div className="group relative my-2">
			<div className="flex items-center justify-between rounded-t-lg bg-[#12121f] px-3 py-1.5 text-[10px] text-gray-500">
				<span>{lang}</span>
				<button
					type="button"
					onClick={handleCopy}
					className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
				>
					{copied ? (
						<Check className="h-3 w-3 text-green-400" />
					) : (
						<Copy className="h-3 w-3" />
					)}
				</button>
			</div>
			<pre className="overflow-x-auto rounded-b-lg bg-[#1a1a2e] p-3 text-xs">
				<code className="text-game-primary">{children}</code>
			</pre>
		</div>
	);
}

const markdownComponents = {
	pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
	code: CodeBlock,
} as import("react-markdown").Components;

export function ChatPanel() {
	const messages = useChatStore((s) => s.messages);
	const status = useChatStore((s) => s.status);
	const streamingContent = useChatStore((s) => s.streamingContent);
	const sendMessage = useChatStore((s) => s.sendMessage);
	const cancelRequest = useChatStore((s) => s.cancelRequest);
	const activeRoleId = useChatStore((s) => s.activeRoleId);
	const expertRole = useChatStore((s) => s.expertRole);
	const currentIteration = useChatStore((s) => s.currentIteration);
	const maxIterations = useChatStore((s) => s.maxIterations);
	const setExpertRole = useChatStore((s) => s.setExpertRole);
	const setActiveRoleId = useChatStore((s) => s.setActiveRoleId);
	const undoTurn = useChatStore((s) => s.undoTurn);
	const [input, setInput] = useState("");
	const [showRoleMenu, setShowRoleMenu] = useState(false);
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
				<span className="hidden text-xs text-muted-foreground sm:inline">
					{roleInfo?.description}
				</span>
				<div className="relative ml-auto">
					<button
						type="button"
						onClick={() => setShowRoleMenu(!showRoleMenu)}
						disabled={status !== "idle"}
						className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
					>
						<Users className="h-3 w-3" />
						<span>切换角色</span>
						<ChevronDown className="h-3 w-3" />
					</button>
					{showRoleMenu && (
						<div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-card py-1 shadow-lg">
							{(Object.entries(EXPERT_ROLES) as [ExpertRole, typeof roleInfo][]).map(([id, role]) => (
								<button
									key={id}
									type="button"
									onClick={() => {
										setExpertRole(id);
										setActiveRoleId(id === "director" ? null : id);
										setShowRoleMenu(false);
									}}
									className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-accent ${currentRole === id ? "text-game-primary" : "text-foreground"}`}
								>
									<span className="font-medium">{role.name}</span>
									{currentRole === id && <Check className="ml-auto h-3 w-3 text-game-primary" />}
								</button>
							))}
						</div>
					)}
				</div>
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

				{messages.map((msg) => {
					if (msg.role === "user") {
						return (
							<div key={msg.id} className="mb-4 flex justify-end">
								<div className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
									{msg.content}
								</div>
							</div>
						);
					}

					if (msg.role === "tool") {
						return (
							<div key={msg.id} className="mb-2 flex justify-start">
								<ToolResultMessage msg={msg} />
							</div>
						);
					}

					if (msg.role === "system") {
						return (
							<div key={msg.id} className="mb-4 flex justify-start">
								<div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-xs text-game-error">
									{msg.content}
								</div>
							</div>
						);
					}

					// assistant
					return (
						<div key={msg.id} className="mb-4 flex justify-start">
							<div className="max-w-[85%] rounded-2xl bg-card px-4 py-2.5 text-sm text-card-foreground">
								{msg.commandCheckpoint !== undefined && (
									<div className="mb-2 flex items-center gap-1.5 border-b border-border pb-2">
										<div className="h-1.5 w-1.5 rounded-full bg-game-primary" />
										<span className="text-[10px] text-muted-foreground">检查点</span>
										<button
											type="button"
											disabled={status !== "idle"}
											onClick={() => undoTurn(msg.id)}
											className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
										>
											<RotateCcw className="h-3 w-3" />
											回滚到此
										</button>
									</div>
								)}
								{msg.content && (
									<Markdown components={markdownComponents}>
										{msg.content}
									</Markdown>
								)}
								<ToolCallCard msg={msg} />
							</div>
						</div>
					);
				})}

				{streamingContent && (
					<div className="mb-4 flex justify-start">
						<div className="max-w-[85%] rounded-2xl bg-card px-4 py-2.5 text-sm text-card-foreground">
							<Markdown components={markdownComponents}>
								{streamingContent}
							</Markdown>
							<span className="ml-1 inline-block h-4 w-1 animate-pulse bg-game-primary" />
						</div>
					</div>
				)}

				{status !== "idle" && !streamingContent && (
					<div className="mb-4 flex justify-start">
						<div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-2.5 text-sm text-muted-foreground">
							<div className="flex gap-1">
								<span className="h-2 w-2 animate-bounce rounded-full bg-game-primary [animation-delay:0ms]" />
								<span className="h-2 w-2 animate-bounce rounded-full bg-game-primary [animation-delay:150ms]" />
								<span className="h-2 w-2 animate-bounce rounded-full bg-game-primary [animation-delay:300ms]" />
							</div>
							{currentIteration > 0
								? `正在工作中... (${currentIteration}/${maxIterations})`
								: "正在思考..."}
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

export interface Command {
	id: string;
	name: string;
	execute(): Promise<void>;
	undo(): Promise<void>;
}

export class CommandManager {
	private history: Command[] = [];
	private pointer = -1;

	get historyLength(): number {
		return this.history.length;
	}

	get currentPointer(): number {
		return this.pointer;
	}

	async execute(command: Command): Promise<void> {
		this.history = this.history.slice(0, this.pointer + 1);
		await command.execute();
		this.history.push(command);
		this.pointer++;
	}

	async undo(): Promise<boolean> {
		if (this.pointer < 0) return false;
		const command = this.history[this.pointer];
		await command.undo();
		this.pointer--;
		return true;
	}

	async redo(): Promise<boolean> {
		if (this.pointer >= this.history.length - 1) return false;
		this.pointer++;
		const command = this.history[this.pointer];
		await command.execute();
		return true;
	}

	async undoToCheckpoint(checkpoint: number): Promise<void> {
		while (this.pointer >= checkpoint) {
			const success = await this.undo();
			if (!success) break;
		}
	}

	clear(): void {
		this.history = [];
		this.pointer = -1;
	}
}

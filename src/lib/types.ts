export interface ContentBlock {
	type: string;
	text?: string;
	name?: string;
	input?: Record<string, unknown>;
	content?: Array<{ type: string; text: string }> | string;
	is_error?: boolean;
	thinking?: string;
}

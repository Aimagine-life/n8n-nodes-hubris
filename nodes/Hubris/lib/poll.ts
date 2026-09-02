import type { IDataObject } from 'n8n-workflow';

export interface VideoJob extends IDataObject {
	id: string;
	status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export class PollTimeoutError extends Error {
	constructor(public readonly jobId: string) {
		super(`Video ${jobId} is still processing`);
	}
}

export interface PollOptions {
	intervalMs: number;
	timeoutMs: number;
	now: () => number;
	wait: (ms: number) => Promise<void>;
}

/** Poll a job until it is completed or failed. Throws PollTimeoutError when the deadline passes. */
export async function pollUntilDone(
	fetchStatus: () => Promise<VideoJob>,
	opts: PollOptions,
): Promise<VideoJob> {
	const deadline = opts.now() + opts.timeoutMs;
	let job = await fetchStatus();
	while (job.status !== 'completed' && job.status !== 'failed') {
		if (opts.now() >= deadline) throw new PollTimeoutError(job.id);
		await opts.wait(opts.intervalMs);
		job = await fetchStatus();
	}
	return job;
}

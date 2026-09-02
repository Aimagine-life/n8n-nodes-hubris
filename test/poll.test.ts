import { describe, expect, it } from 'vitest';
import { pollUntilDone, PollTimeoutError, type VideoJob } from '../nodes/Hubris/lib/poll';

function fakeClock() {
	let t = 0;
	return {
		now: () => t,
		wait: async (ms: number) => {
			t += ms;
		},
	};
}

describe('pollUntilDone', () => {
	it('returns when the job is completed', async () => {
		const statuses: VideoJob['status'][] = ['pending', 'in_progress', 'completed'];
		let calls = 0;
		const job = await pollUntilDone(async () => ({ id: 'v1', status: statuses[calls++] }), {
			intervalMs: 1000,
			timeoutMs: 10_000,
			...fakeClock(),
		});
		expect(job.status).toBe('completed');
		expect(calls).toBe(3);
	});

	it('returns a failed job without throwing', async () => {
		const job = await pollUntilDone(async () => ({ id: 'v1', status: 'failed', error: 'x' }), {
			intervalMs: 1000,
			timeoutMs: 10_000,
			...fakeClock(),
		});
		expect(job.status).toBe('failed');
	});

	it('throws PollTimeoutError after the deadline', async () => {
		await expect(
			pollUntilDone(async () => ({ id: 'v1', status: 'in_progress' }), {
				intervalMs: 1000,
				timeoutMs: 3000,
				...fakeClock(),
			}),
		).rejects.toBeInstanceOf(PollTimeoutError);
	});
});

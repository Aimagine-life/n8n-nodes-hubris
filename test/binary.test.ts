import { describe, expect, it } from 'vitest';
import {
	audioFormatFromBinary,
	dataUrlFromBinary,
	detectImageMime,
} from '../nodes/Hubris/lib/binary';

describe('detectImageMime', () => {
	it('detects png', () => {
		expect(detectImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toEqual({
			mime: 'image/png',
			ext: 'png',
		});
	});

	it('detects jpeg', () => {
		expect(detectImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toEqual({
			mime: 'image/jpeg',
			ext: 'jpg',
		});
	});

	it('detects webp', () => {
		expect(detectImageMime(Buffer.from('RIFF....WEBP', 'latin1'))).toEqual({
			mime: 'image/webp',
			ext: 'webp',
		});
	});

	it('falls back to png', () => {
		expect(detectImageMime(Buffer.from([1, 2, 3]))).toEqual({ mime: 'image/png', ext: 'png' });
	});
});

describe('audioFormatFromBinary', () => {
	it('prefers file extension', () => {
		expect(audioFormatFromBinary({ fileName: 'voice.M4A', mimeType: 'audio/mpeg' })).toBe('m4a');
	});

	it('maps mime types', () => {
		expect(audioFormatFromBinary({ mimeType: 'audio/mpeg' })).toBe('mp3');
		expect(audioFormatFromBinary({ mimeType: 'audio/x-wav' })).toBe('wav');
		expect(audioFormatFromBinary({ mimeType: 'audio/ogg; codecs=opus' })).toBe('ogg');
	});

	it('returns undefined for unknown', () => {
		expect(
			audioFormatFromBinary({ fileName: 'a.bin', mimeType: 'application/octet-stream' }),
		).toBeUndefined();
	});
});

describe('dataUrlFromBinary', () => {
	it('builds data url', () => {
		expect(dataUrlFromBinary(Buffer.from('hi'), 'image/png')).toBe('data:image/png;base64,aGk=');
	});
});

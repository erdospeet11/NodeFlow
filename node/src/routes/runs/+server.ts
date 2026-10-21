import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const RUNNER = 'http://127.0.0.1:8000/runs';

export const POST: RequestHandler = async ({ request, fetch }) => {
	let response: Response;
	try {
		response = await fetch(RUNNER, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: await request.text(),
			signal: request.signal
		});
	} catch {
		if (request.signal.aborted) return new Response(null, { status: 499 });
		return json({ detail: 'Runner is not reachable' }, { status: 502 });
	}

	return new Response(await response.text(), {
		status: response.status,
		headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' }
	});
};

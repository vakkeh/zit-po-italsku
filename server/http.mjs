// Chyba se stavovým kódem. Síťové chyby, 429 a 5xx má smysl zopakovat, ostatní ne.
export class HttpError extends Error {
  constructor(message, status = 500) { super(message); this.status = status; }
  get retryable() { return this.status === 429 || this.status >= 500; }
}
export const isRetryable = error => !(error instanceof HttpError) || error.retryable;
export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

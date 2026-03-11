// Override Body.json() to return Promise<any> instead of Promise<unknown>
// This restores pre-TS 5.5 behavior where fetch response.json() returned any
// See: https://github.com/microsoft/TypeScript/pull/57367
interface Body {
  json(): Promise<any>;
}

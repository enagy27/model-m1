export function serializeHeaders(headers: ReadonlyArray<readonly [string, string]>): string {
    return headers.map(([key, value]) => `${key}: ${value}`).join("\r\n");
}
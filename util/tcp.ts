export function serializeHeaders(headers: Array<[string, string]>): string {
    return headers.map(([key, value]) => `${key}: ${value}`).join("\r\n");
}
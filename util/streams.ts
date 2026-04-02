export async function read(stream: NodeJS.ReadStream): Promise<string> {
  const chunks = new Array<Buffer>();
  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf-8");
}

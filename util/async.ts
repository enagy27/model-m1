export async function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(() => resolve(), duration));
}

export async function awaitAtMost<T>(
  promise: Promise<T>,
  duration: number,
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("TIMEOUT")), duration);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

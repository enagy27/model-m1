export async function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(() => resolve(), duration));
}

export async function awaitAtMost<T>(
  promise: Promise<T>,
  duration: number,
): Promise<T> {
  const throwAfterDurationFn = async () => {
    await sleep(duration);
    throw new Error("TIMEOUT");
  };

  return Promise.race([promise, throwAfterDurationFn()]);
}

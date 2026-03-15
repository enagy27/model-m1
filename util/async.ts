export async function awaitAtMost<T>(promise: Promise<T>, duration: number): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject();
    }, duration);
  });

  return Promise.race([promise, timeoutPromise]);
}

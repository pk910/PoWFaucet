
export function sleepPromise(delay: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

export function timeoutPromise<T>(promise: Promise<T>, timeout: number, rejectReason?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(rejectReason || "promise timeout");
    }, timeout);
    promise.then(resolve, reject);
  });
}


declare module "async-lock" {
  interface AsyncLockDoneCallback {
    (err?: Error, ret?: any): void;
  }

  interface AsyncLockOptions {
    timeout?: number;
    maxPending?: number;
    domainReentrant?: boolean;
    Promise?: any;
  }

  class AsyncLock {
    constructor();

    acquire(key: string|string[], fn: (done: AsyncLockDoneCallback) => any, cb: AsyncLockDoneCallback, opts?: AsyncLockOptions): void;
    acquire(key: string|string[], fn: (done: AsyncLockDoneCallback) => any, opts?: AsyncLockOptions): void;
    isBusy(): boolean;
  }

  namespace AsyncLock {}

  export = AsyncLock;
}

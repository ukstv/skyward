import PDefer, { type DeferredPromise } from "p-defer";

export class Actioneer implements PromiseLike<void> {
  private readonly defer: DeferredPromise<void>;
  private didRun: boolean;

  readonly then: Promise<void>["then"];
  readonly catch: Promise<void>["catch"];

  constructor() {
    this.defer = PDefer();
    this.didRun = false;
    const promise = this.defer.promise;
    this.then = promise.then.bind(promise);
    this.catch = promise.catch.bind(promise);
  }

  run<TArguments extends Array<any>>(f: (...args: TArguments) => Promise<void> | void): (...args: TArguments) => void {
    return (...args: TArguments) => {
      if (this.didRun) throw new Error(`Single action allowed`);
      this.didRun = true;
      Promise.resolve()
        .then(() => f(...args))
        .then(() => {
          this.defer.resolve();
        })
        .catch((error) => {
          this.defer.reject(error);
        });
    };
  }
}

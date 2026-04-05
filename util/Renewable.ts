type RenewableArgs<T> = {
  create: () => T;
  destroy: (instance: T) => void;
};

export class Renewable<T> {
  private _current: T;
  private _destroyed: boolean;

  private readonly _create: RenewableArgs<T>["create"];
  private readonly _destroy: RenewableArgs<T>["destroy"];

  public constructor(args: RenewableArgs<T>) {
    this._current = args.create();
    this._destroyed = false;
    this._create = args.create;
    this._destroy = args.destroy;
  }

  public get current(): T {
    if (this._destroyed) {
      throw new Error("Destroyed");
    }

    return this._current;
  }

  public renew(): T {
    if (this._destroyed) {
      throw new Error("Destroyed");
    }

    this._destroy(this._current);

    this._current = this._create();
    return this._current;
  }

  public destroy(): void {
    if (this._destroyed) {
      return;
    }

    this._destroy(this._current);
    this._destroyed = true;
  }
}

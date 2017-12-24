export interface Type<T> {
  channel: string;
  data: T;
  processId: number;

  /**
   * Map to a different value.
   * @template R Generic parameter.
   * @param {(v: T) => R} selector Selector function.
   * @returns {Type<R>} A Type instance.
   */
  map<R>(selector: (v: T) => R): Type<R>;
}

export class Self<T> implements Type<T> {
  public channel: string;
  public data: T;
  public processId: number;

  public constructor(channel: string, data: T, processId: number) {
    this.channel = channel;
    this.data = data;
    this.processId = processId;
  }

  /**
   * Map to a different value.
   * @template R Generic parameter.
   * @param {(v: T) => R} selector Selector function.
   * @returns {Type<R>} A Type instance.
   */
  public map<R>(selector: (v: T) => R): Type<R> {
    let newValue = selector(this.data);
    return new Self(this.channel, newValue, this.processId);
  }
}
import { BuildableType, BuilderType, Nullable } from 'javascriptutilities';

import {
  MiddlewareFilter, 
  RequestType, 
  RequestBuilderType 
} from 'jsrequestframework';

export function builder(): Builder {
  return new Builder();
}

export class Self implements BuildableType<Builder>, RequestType {
  pgQuery?: string;

  inclFilters: MiddlewareFilter[];
  exclFilters: MiddlewareFilter[];
  retryCount: number;
  rqDescription?: string;

  constructor() {
    this.retryCount = 1;
  }

  public builder(): Builder {
    return builder();
  }

  public cloneBuilder(): Builder {
    return this.builder().withBuildable(this);
  }

  public query(): string {
    if (this.pgQuery !== undefined) {
      return this.pgQuery;
    } else {
      throw new Error('Query cannot be nil');
    }
  }

  public inclusiveFilters(): Nullable<MiddlewareFilter[]> {
    return this.inclFilters.length == 0 ? undefined : this.inclFilters;
  }

  public exclusiveFilters(): MiddlewareFilter[] {
    return this.exclFilters;
  }

  public requestDescription(): string {
    return this.rqDescription || '';
  }

  public requestRetries(): number {
    return this.retryCount;
  }
}

export class Builder implements BuilderType<Self>, RequestBuilderType {
  private request: Self;

  constructor() {
    this.request = new Self();
  }
  
  /**
   * Set the POSTGRESQL query.
   * @param  {string} query? A string value.
   * @returns this The current Builder isntance.
   */
  public withQuery(query?: string): this {
    this.request.pgQuery = query;
    return this;
  }

  /**
   * Set inclusive filters.
   * @param  {MiddlewareFilter[]} filters An Array of filters.
   * @returns this The current Builder instance.
   */
  public withInclusiveFilters(filters: MiddlewareFilter[]): this {
    this.request.inclFilters = filters;
    return this;
  }
  
  /**
   * Set exclusive filters.
   * @param  {MiddlewareFilter[]} filters An Array of filters.
   * @returns this The current Builder instance.
   */
  public withExclusiveFilters(filters: MiddlewareFilter[]): this {
    this.request.exclFilters = filters;
    return this;
  }

  /**
   * Set request description.
   * @param  {string} description? A string value.
   * @returns this The current Builder instance.
   */
  public withRequestDescription(description?: string): this {
    this.request.rqDescription = description;
    return this;
  }

  /**
   * Set retry count.
   * @param  {number} retries A number value.
   * @returns this The current Builder instance.
   */
  public withRequestRetries(retries: number): this {
    this.request.retryCount = retries;
    return this;
  }

  public withBuildable(buildable?: Self): this {
    if (buildable !== undefined) {
      return this
        .withInclusiveFilters(buildable.inclFilters)
        .withExclusiveFilters(buildable.exclFilters)
        .withRequestDescription(buildable.rqDescription)
        .withRequestRetries(buildable.retryCount);
    } else {
      return this;
    }
  }

  public build(): Self {
    return this.request;
  }
}
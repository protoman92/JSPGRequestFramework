import { Client, QueryResult } from 'pg';
import { Observable } from 'rxjs';
import { BuildableType, BuilderType, Try } from 'javascriptutilities';

import {
  RequestGenerator,
  RequestHandlerType,
  RequestProcessor,
  ResultProcessor
} from 'jsrequestframework';

import * as PGRequest from './PGRequest';

export type Res = QueryResult;
export type Req = PGRequest.Self;
export type Processor = RequestProcessor.Self<Req>;

export function builder(): Builder {
  return new Builder();
}

export class Self implements BuildableType<Builder>, RequestHandlerType<Req,Res> {
  pgClient?: Client;
  processor?: Processor;

  public builder(): Builder {
    return builder();
  }

  public cloneBuilder(): Builder {
    return this.builder().withBuildable(this);
  }

  /**
   * Perform a POSTGRESQL request.
   * @param  {Req} request A Req instance.
   * @returns Observable An Observable instance.
   */
  private perform(request: Req): Observable<Try<Res>> {
    try {
      let client = this.client();
      let query = request.query();

      return Observable
        .fromPromise(client.query(query))
        .map(value => Try.success(value))
        .catchJustReturn(e => Try.failure(e));
    } catch (e) {
      return Observable.of(Try.failure(e));
    }
  }

  /**
   * Perform a POSTGRESQL request.
   * @param  {Try<Prev>} previous The result of the previous request.
   * @param  {RequestGenerator<Prev,Req>} generator A RequestGenerator instance.
   * @param  {ResultProcessor<Res,Res2>} processor A ResultProcessor instance.
   * @returns Observable An Observable instance.
   */
  public request<Prev,Res2>(
    previous: Try<Prev>, 
    generator: RequestGenerator<Prev, Req>, 
    processor: ResultProcessor<Res,Res2>
  ): Observable<Try<Res2>> {
    try {
      let rqProcessor = this.requestProcessor();
      return rqProcessor.process(previous, generator, this.perform, processor);
    } catch (e) {
      return Observable.of(Try.failure(e));
    }
  }

  public client(): Client {
    if (this.pgClient !== undefined) {
      return this.pgClient;
    } else {
      throw new Error('Client cannot be nil');
    }
  }

  public requestProcessor(): Processor {
    if (this.processor !== undefined) {
      return this.processor;
    } else {
      throw new Error('Request processor cannot be nil');
    }
  }
}

export class Builder implements BuilderType<Self> {
  private handler: Self;

  constructor() {
    this.handler = new Self();
  }
  
  /**
   * Set the POSTGRESQL client.
   * @param  {Client} client? A Client instance.
   * @returns this The current Builder instance.
   */
  public withClient(client?: Client): this {
    this.handler.pgClient = client;
    return this;
  }

  /**
   * Set the request processor.
   * @param  {Processor} processor? A RequestProcessor instance.
   * @returns this The current Builder instance.
   */
  public withRequestProcessor(processor?: Processor): this {
    this.handler.processor = processor;
    return this;
  }

  public withBuildable(buildable?: Self): this {
    if (buildable !== undefined) {
      return this
        .withClient(buildable.pgClient)
        .withRequestProcessor(buildable.processor);
    } else {
      return this;
    }
  }

  public build(): Self {
    return this.handler;
  }
}

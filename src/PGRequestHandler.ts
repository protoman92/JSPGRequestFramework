import { Client, QueryResult } from 'pg';
import { Observable } from 'rxjs';
import { BuildableType, BuilderType, Nullable, Try } from 'javascriptutilities';

import {
  RequestGenerator,
  RequestGenerators,
  RequestHandlerType,
  RequestProcessor,
  ResultProcessor,
  ResultProcessors
} from 'jsrequestframework';

import * as PGRequest from './PGRequest';

export type Res = QueryResult;
export type Req = PGRequest.Self;
export type Processor = RequestProcessor.Self<Req>;

export function builder(): Builder {
  return new Builder();
}

export interface Type {
  /**
   * Perform a POSTGRESQL request.
   * @template Prev The generic of the previous result.
   * @template Res2 The generic of the final processed result.
   * @param {Try<Prev>} previous The result of the previous request.
   * @param {RequestGenerator<Prev,Req>} generator A RequestGenerator instance.
   * @param {ResultProcessor<Res,Res2>} processor A ResultProcessor instance.
   * @returns {Observable<Try<Res2>>} An Observable instance.
   */
  request<Prev,Res2>(
    previous: Try<Prev>, 
    generator: RequestGenerator<Prev,Req>, 
    processor: ResultProcessor<Res,Res2>
  ): Observable<Try<Res2>>;
}

export class Self implements BuildableType<Builder>, RequestHandlerType<Req,Res>, Type {
  pgClient: Nullable<Client>;
  processor: Nullable<Processor>;

  constructor() {}

  public databaseClient = (): Client => {
    if (this.pgClient !== undefined && this.pgClient !== null) {
      return this.pgClient;
    } else {
      throw new Error('Client cannot be nil');
    }
  }

  public requestProcessor = (): Processor => {
    if (this.processor !== undefined && this.processor !== null) {
      return this.processor;
    } else {
      throw new Error('Request processor cannot be nil');
    }
  }

  public builder = (): Builder => {
    return builder();
  }

  public cloneBuilder = (): Builder => {
    return this.builder().withBuildable(this);
  }

  /**
   * Perform a POSTGRESQL request.
   * @param  {Req} request A Req instance.
   * @returns Observable An Observable instance.
   */
  public perform = (request: Req): Observable<Try<Res>> => {
    try { 
      let client = this.databaseClient();
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
    generator: RequestGenerator<Prev,Req>, 
    processor: ResultProcessor<Res,Res2>
  ): Observable<Try<Res2>> {
    try {
      let rqProcessor = this.requestProcessor();
      return rqProcessor.process(previous, generator, this.perform, processor);
    } catch (e) {
      return Observable.of(Try.failure(e));
    }
  }

  /**
   * Perform a direct request using a default generator and processor.
   * @param  {Try<Prev>} previous The result of the previous request.
   * @param  {Req} request A Req instance.
   * @returns Observable An Observable instance.
   */
  public requestDirect<Prev>(
    previous: Try<Prev>, 
    request: Req | string
  ): Observable<Try<Res>> {
    let generator = RequestGenerators.forceGn(() => {
      if (typeof request === 'string') { 
        return PGRequest.builder()
          .withQuery(request)
          .withRequestDescription(`Request of query: ${request}`)
          .build();
      } else {
        return request;
      }
    });

    let processor = ResultProcessors.eq<Res>();
    return this.request(previous, generator, processor);
  }
}

export class Builder implements BuilderType<Self> {
  private handler: Self;

  constructor() {
    this.handler = new Self();
  }
  
  /**
   * Set the POSTGRESQL client.
   * @param  {Nullable<Client>} client A Client instance.
   * @returns this The current Builder instance.
   */
  public withClient = (client: Nullable<Client>): this => {
    this.handler.pgClient = client;
    return this;
  }

  /**
   * Set the request processor.
   * @param  {Nullable<Processor>} processor A RequestProcessor instance.
   * @returns this The current Builder instance.
   */
  public withRequestProcessor = (processor: Nullable<Processor>): this => {
    this.handler.processor = processor;
    return this;
  }

  public withBuildable = (buildable: Nullable<Self>): this => {
    if (buildable !== undefined && buildable !== null) {
      return this
        .withClient(buildable.pgClient)
        .withRequestProcessor(buildable.processor);
    } else {
      return this;
    }
  }

  public build = (): Self => {
    return this.handler;
  }
}

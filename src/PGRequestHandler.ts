import { Client, QueryResult as Res } from 'pg';
import { Observable } from 'rxjs';

import {
  BuildableType,
  BuilderType,
  Nullable,
  Try,
  TryResult,
} from 'javascriptutilities';

import {
  RequestGenerator,
  RequestGenerators,
  RequestHandlerType,
  RequestProcessor,
  ResultProcessor,
  ResultProcessors,
} from 'jsrequestframework';

import * as Req from './PGRequest';
import * as NT from './PGNotification';
import * as NTData from './PGNotificationData';

export type Processor = RequestProcessor.Self<Req.Self>;

export let builder = (): Builder => new Builder();

export interface Type {
  /**
   * Perform a PG request.
   * @template Prev The generic of the previous result.
   * @template Res2 The generic of the final processed result.
   * @param {Try<Prev>} previous The result of the previous request.
   * @param {RequestGenerator<Prev,Req.Self>} generator A RequestGenerator instance.
   * @param {ResultProcessor<Res,Res2>} processor A ResultProcessor instance.
   * @returns {Observable<Try<Res2>>} An Observable instance.
   */
  request<Prev,Res2>(
    previous: Try<Prev>, 
    generator: RequestGenerator<Prev,Req.Self>, 
    processor: ResultProcessor<Res,Res2>
  ): Observable<Try<Res2>>;
}

export interface RawQueryType {
  /**
   * Perform a direct PG request by using a default request generator
   * and result processor..
   * @param {Try<Prev>} previous The result of the previous request.
   * @param {(Req.Self | string)} request A request query/object.
   * @returns {Observable<Try<Res>>} An Observable instance.
   */
  requestRaw<Prev>(previous: Try<Prev>, request: Req.Self | string): Observable<Try<Res>>;
}

export interface StreamType {
  /**
   * Stream notifications from a trigger.
   * @param {Try<any>} prev The result of some other request.
   * @returns {Observable<Try<NT.Type>>} An Observable instance.
   */
  streamNotifications(prev: Try<any>): Observable<Try<NT.Type>>;
}

export interface TypedStreamType {
  /**
   * Stream data of type T from notification payload. 
   * @template T Generic type of the streamed data.
   * @param {Try<any>} prev The result of some other request.
   * @param {(v: string) => T} processor Data processor.
   * @returns {Observable<Try<NTData.Type<T>>>} An Observable instance.
   */
  streamData<T>(
    prev: Try<any>, processor: (v: string) => T,
  ): Observable<Try<NTData.Type<T>>>;
}

export class Self implements
  BuildableType<Builder>,
  RequestHandlerType<Req.Self,Res>,
  Type, RawQueryType,
  StreamType, TypedStreamType
{
  public pgClient: Nullable<Client>;
  public processor: Nullable<Processor>;

  public constructor() {}

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

  public builder = (): Builder => builder();

  public cloneBuilder = (): Builder => this.builder().withBuildable(this);

  /**
   * Perform a PG request.
   * @param {Req.Self} request A Req.Self instance.
   * @returns Observable An Observable instance.
   */
  public perform = (request: Req.Self): Observable<Try<Res>> => {
    try { 
      let client = this.databaseClient();
      let query = request.query();

      return Observable
        .fromPromise(client.query(query))
        .map(value => Try.success(value))
        .catchJustReturn(e => Try.failure<Res>(e));
    } catch (e) {
      return Observable.of(Try.failure(e));
    }
  }

  /**
   * Perform a PG request.
   * @param {Try<Prev>} previous The result of the previous request.
   * @param {RequestGenerator<Prev,Req.Self>} generator A RequestGenerator instance.
   * @param {ResultProcessor<Res,Res2>} processor A ResultProcessor instance.
   * @returns Observable An Observable instance.
   */
  public request<Prev,Res2>(
    previous: Try<Prev>, 
    generator: RequestGenerator<Prev,Req.Self>, 
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
   * @param {Try<Prev>} previous The result of the previous request.
   * @param {Req.Self} request A Req.Self instance.
   * @returns Observable An Observable instance.
   */
  public requestRaw<Prev>(
    previous: Try<Prev>, request: Req.Self | string,
  ): Observable<Try<Res>> {
    let generator = RequestGenerators.forceGn(() => {
      if (typeof request === 'string') { 
        return Req.builder()
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

  /**
   * Stream data of type T from notification payload. 
   * @template T Generic type of the streamed data.
   * @param {Try<any>} prev The result of some other request.
   * @returns {Observable<NT.DataType<T>>} An Observable instance.
   */
  public streamNotifications = (prev: Try<any>): Observable<Try<NT.Type>> => {
    try {
      prev.getOrThrow();
      let client = this.databaseClient();

      return new Observable(obs => {
        client.on('notification', v => obs.next(Try.success(new NT.Self(v))));
      });
    } catch (e) {
      return Observable.of(Try.failure(e));
    }
  }

  /**
   * Stream data of type T from notification payload. 
   * @template T Generic type of the streamed data.
   * @param {Try<any>} prev The result of some other request.
   * @param {(v: string) => TryResult<T>} processor Data processor.
   * @returns {Observable<Try<NTData.Type<T>>>} An Observable instance.
   */
  public streamData<T>(
    prev: Try<any>, processor: (v: string) => TryResult<T>,
  ): Observable<Try<NTData.Type<T>>> { 
    return this.streamNotifications(prev)
      .map((v): Try<NTData.Type<string>> => v
        .flatMap(v1 => Try.unwrap(v1.payload))
        .zipWith(v, (a, b) => new NTData.Self(b.channel, a, b.processId))
      )
      .map(v => v.map(v1 => v1.map(v2 => processor(v2))))
      .map(v => v.map(v1 => v1.map(v2 => Try.unwrap(v2).getOrThrow())));
  }
}

export class Builder implements BuilderType<Self> {
  private handler: Self;

  public constructor() {
    this.handler = new Self();
  }
  
  /**
   * Set the PG client.
   * @param {Nullable<Client>} client A Client instance.
   * @returns {this} The current Builder instance.
   */
  public withClient = (client: Nullable<Client>): this => {
    this.handler.pgClient = client;
    return this;
  }

  /**
   * Set the request processor.
   * @param {Nullable<Processor>} processor A RequestProcessor instance.
   * @returns {this} The current Builder instance.
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

  public build = (): Self => this.handler;
}

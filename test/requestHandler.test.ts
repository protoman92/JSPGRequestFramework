import { Client, QueryResult } from 'pg';
import { Observable } from 'rxjs';

import { Try } from 'javascriptutilities';

import {
  ErrorHolder,
  MiddlewareManager,
  RequestExecutor,
  RequestProcessor
} from 'jsrequestframework';

import { PGRequest, PGRequestHandler } from './../src';
import * as Requests from './requests';

type Req = PGRequest.Self;
type Res = QueryResult;

describe('Request handler should be correct', () => {
  // Make sure that this DB exists before running tests.
  let client = new Client({
    user: 'haipham',
    database: 'testdb',    
    port: 5342,
    host: 'localhost'
  });

  let rqMiddlewareManager = MiddlewareManager.builder<Req>()
    .addGlobalSideEffect(console.log)
    .build();

  let errMiddlewareManager = MiddlewareManager.builder<ErrorHolder>()
    .addGlobalSideEffect(console.log)
    .build();

  let executor = RequestExecutor.builder<Req>()
    .withRequestMiddlewareManager(rqMiddlewareManager)
    .withErrorMiddlewareManager(errMiddlewareManager)
    .build();

  let processor = RequestProcessor.builder<Req>()
    .withExecutor(executor)
    .build();

  let handler = PGRequestHandler.builder()
    .withClient(client)
    .withRequestProcessor(processor)
    .build();

  beforeEach(done => {
    Observable.fromPromise(client.connect())
      .map(value => Try.success(value))
      .catchJustReturn(e => Try.failure(e))
      .flatMap(prev => Observable.merge(
        // handler.request(prev, )
      ))
  });
});
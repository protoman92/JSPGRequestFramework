import { Client } from 'pg';
import { Observable } from 'rxjs';

import { Try } from 'javascriptutilities';

import {
  ErrorHolder,
  MiddlewareManager,
  RequestExecutor,
  RequestProcessor
} from 'jsrequestframework';

import { PGRequest, PGRequestHandler } from './../src';
import * as Middlewares from './middlewares';
import * as Mocks from './mocks';
import * as Requests from './requests';

type Req = PGRequest.Self;

let timeout = 10000;

describe('Request handler should be correct', () => {

  // Make sure that this DB exists before running tests.
  let client = new Client({
    user: 'haipham',
    database: 'testdb',    
    port: 5432,
    host: 'localhost'
  });

  let rqMiddlewareManager = MiddlewareManager.builder<Req>()
    .addGlobalSideEffect(console.log)
    .addTransform(Middlewares.retryTransformer, Middlewares.retryMiddlewareKey)
    .build();

  let errMiddlewareManager = MiddlewareManager.builder<ErrorHolder.Self>()
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

  let mockData = Mocks.createDataMocks();
  let createUserTableRequest = Requests.createUserTableRequest;
  let createUserRequest = Requests.createUserRequest(mockData.users);
  let createMachineTableRequest = Requests.createMachineTableRequest;
  let createMachineRequest = Requests.createMachineRequest(mockData.machines);

  beforeEach(done => {
    Observable.fromPromise(client.connect())
      .map(value => Try.success(value))
      .catchJustReturn(e => Try.failure(e))
      .flatMap(prev => handler.requestDirect(prev, createUserTableRequest))
      .flatMap(prev => handler.requestDirect(prev, createMachineTableRequest))      
      .flatMap(prev => handler.requestDirect(prev, createUserRequest))
      .flatMap(prev => handler.requestDirect(prev, createMachineRequest))
      .map(value => value.getOrThrow())
      .doOnCompleted(done)
      .subscribe();
  }, timeout);

  afterEach(done => {
    let prev = Try.success({});

    Observable
      .concat(
        handler.requestDirect(prev, Requests.dropMachineTableRequest),
        handler.requestDirect(prev, Requests.dropUserTableRequest)
      )
      .map(value => value.getOrThrow())
      .doOnCompleted(done)
      .subscribe()
  }, timeout);

  it('Create and drop tables should work correctly', () => {});
});
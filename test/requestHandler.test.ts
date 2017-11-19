import { Client } from 'pg';
import { Observable } from 'rxjs';

import { Collections, Try, Types } from 'javascriptutilities';

import {
  ErrorHolder,
  MiddlewareManager,
  RequestExecutor,
  RequestProcessor
} from 'jsrequestframework';

import { PGRequest, PGRequestHandler } from './../src';
import * as Middlewares from './middlewares';
import * as Mocks from './mocks';
import * as Models from './models';
import * as Requests from './requests';

type Req = PGRequest.Self;

let timeout = 5000;

describe('Request handler should be correct', () => {

  // Make sure that this DB exists before running tests.
  let client = new Client({
    user: 'haipham',
    database: 'haipham',    
    port: 5432,
    host: 'localhost'
  });

  let rqMiddlewareManager = MiddlewareManager.builder<Req>()    
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

  beforeAll(done => {
    Observable.fromPromise(client.connect())
      .map(value => Try.success(value))
      .catchJustReturn(e => Try.failure(e))
      .flatMap(prev => handler.requestDirect(prev, createUserTableRequest))
      .flatMap(prev => handler.requestDirect(prev, createMachineTableRequest))      
      .flatMap(prev => handler.requestDirect(prev, createUserRequest))
      .flatMap(prev => handler.requestDirect(prev, createMachineRequest))
      .map(value => value.getOrThrow())
      .doOnError(e => fail(e))
      .doOnCompleted(() => done())
      .subscribe();
  }, timeout);

  afterAll(done => {
    let prev = Try.success({});

    Observable
      .concat(
        handler.requestDirect(prev, Requests.dropMachineTableRequest),
        handler.requestDirect(prev, Requests.dropUserTableRequest)
      )
      .map(value => value.getOrThrow())
      .doOnError(e => fail(e))
      .doOnCompleted(() => done())
      .subscribe();
  }, timeout);

  it('Perform request fails - should not throw error', done => {
    /// Setup
    let request = PGRequest.builder()
      .withRequestDescription('Empty request')
      .build();

    /// When & Then
    handler.requestDirect(Try.success({}), request)
      .doOnError(e => fail(e))
      .doOnCompleted(() => done())
      .subscribe();
  }, timeout);

  it('Find user by id successfully - should emit correct results', done => {
    /// Setup
    let randomUser = Collections.randomElement(mockData.users).getOrThrow();
    let randomId = randomUser.id;
    let request = Requests.findUserByIdRequest(randomId);

    /// When & Then
    handler.requestDirect(Try.success({}), request)
      .map(value => value.getOrThrow())
      .doOnNext(result => expect(result.rowCount).toBe(1))
      .doOnNext(result => {
        let first = Collections.first(result.rows).getOrThrow();
        
        if (Types.isInstance<Models.TestUser>(first, 'id')) {
          expect(first).toEqual(randomUser);
        } else {
          fail('Wrong data');
        }
      })
      .doOnError(e => fail(e))
      .doOnCompleted(() => done())
      .subscribe();
  }, timeout);

  it('Find machines by user successfully - should emit correct results', done => {
    /// Setup
    let randomUser = Collections.randomElement(mockData.users).getOrThrow();
    let machines = mockData.machines.filter(value => value.userid === randomUser.id);
    let request = Requests.findMachineByUserRequest(randomUser.id);

    /// When & Then
    handler.requestDirect(Try.success({}), request)
      .map(value => value.getOrThrow())
      .doOnNext(result => expect(result.rowCount).toBe(Mocks.machinePerUserCount))
      .doOnNext(result => {
        result.rows.forEach(value => {
          if (Types.isInstance<Models.Machine>(value, 'userid')) {
            expect(machines).toContainEqual(value);
          } else {
            fail('Wrong data');
          }
        });
      })
      .doOnError(e => fail(e))
      .doOnCompleted(() => done())
      .subscribe();
  }, timeout);
});
import { Client } from 'pg';
import { Observable } from 'rxjs';
import { Collections, Try, Types } from 'javascriptutilities';

import {
  ErrorHolder,
  MiddlewareManager,
  RequestExecutor,
  RequestProcessor,
} from 'jsrequestframework';

import { PGRequest as Req, PGRequestHandler } from './../src';
import * as Middlewares from './middlewares';
import * as Mocks from './mocks';
import * as Models from './models';
import * as Queries from './queries';

let timeout = 2000;

describe('Request handler should be correct', () => {

  // Make sure that this DB exists before running tests.
  let client = new Client({
    user: 'haipham',
    database: 'testdb',
    port: 5432,
    host: 'localhost',
  });

  let rqMiddlewareManager = MiddlewareManager
    .builder<Req.Self>()    
    .addTransform(Middlewares.retryTransformer, Middlewares.retryMiddlewareKey)
    .addSideEffect(v => console.log(v.pgQuery), 'LogQuery')
    .build();

  let errMiddlewareManager = MiddlewareManager
    .builder<ErrorHolder.Self>()
    .addGlobalSideEffect(console.log)
    .build();

  let executor = RequestExecutor.builder<Req.Self>()
    .withRequestMiddlewareManager(rqMiddlewareManager)
    .withErrorMiddlewareManager(errMiddlewareManager)
    .build();

  let processor = RequestProcessor.builder<Req.Self>()
    .withExecutor(executor)
    .build();

  let handler = PGRequestHandler.builder()
    .withClient(client)
    .withRequestProcessor(processor)
    .build();

  let mockData = Mocks.createData();
  let users = mockData.users;
  let machines = mockData.machines;

  beforeAll(done => {
    Observable.fromPromise(client.connect())
      .map(value => Try.success(value))
      .catchJustReturn(e => Try.failure(e))
      .flatMap(v => handler.requestRaw(v, Queries.remoteUserTrigger))
      .flatMap(v => handler.requestRaw(v, Queries.removeUserNotification))
      .flatMap(v => handler.requestRaw(v, Queries.dropMachineTable))
      .flatMap(v => handler.requestRaw(v, Queries.dropUserTable))
      .flatMap(v => handler.requestRaw(v, Queries.createUserTable))
      .flatMap(v => handler.requestRaw(v, Queries.createMachineTable))      
      .flatMap(v => handler.requestRaw(v, Queries.createUser(users)))
      .flatMap(v => handler.requestRaw(v, Queries.createMachine(machines)))
      .flatMap(v => handler.requestRaw(v, Queries.insertUserNotification))
      .flatMap(v => handler.requestRaw(v, Queries.insertUserTrigger))
      .flatMap(v => handler.requestRaw(v, Queries.listenInsertUser))
      .map(v => v.getOrThrow())
      .doOnError(e => fail(e))
      .doOnCompleted(() => done())
      .subscribe();
  }, timeout);

  it('Perform request fails - should not throw error', done => {
    /// Setup
    let request = Req.builder().withRequestDescription('Empty request').build();

    /// When & Then
    handler.requestRaw(Try.success({}), request)
      .doOnError(e => fail(e))
      .doOnCompleted(() => done())
      .subscribe();
  }, timeout);

  it('Find user by id successfully - should emit correct results', done => {
    /// Setup
    let randomUser = Collections.randomElement(mockData.users).getOrThrow();
    let randomId = randomUser.id;
    let request = Queries.findUserById(randomId);

    /// When & Then
    handler.requestRaw(Try.success({}), request)
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

  it('Find machines by user - should emit correct results', done => {
    /// Setup
    let randomUser = Collections.randomElement(mockData.users).getOrThrow();
    let machines = mockData.machines.filter(value => value.userid === randomUser.id);
    let request = Queries.findMachineByUser(randomUser.id);

    /// When & Then
    handler.requestRaw(Try.success({}), request)
      .map(value => value.getOrThrow())
      .doOnNext(result => expect(result.rowCount).toBe(Mocks.perUserCount))
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

  it('Insert user successfully - should trigger notification', done => {
    /// Setup
    let newMocks = Mocks.createData();
    let newUsers = newMocks.users;
    let newMachines = newMocks.machines;
    let notificationCount = 0;
    let prev = Try.success({});

    let processor: (v: string) => string = v => {
      let json = JSON.parse(v);

      if (json.id !== undefined && json.id !== null) {
        return json.id;
      } else {
        throw Error('No id found');
      }
    };

    handler.streamData<string>(Try.success({}), processor)
      .mapNonNilOrEmpty(v => v)
      .map(v => v.data)
      .doOnNext(v => expect(newUsers.some(v1 => v1.id === v)).toBeTruthy())
      .doOnNext(() => notificationCount += 1)
      .doOnNext(() => {
        if (notificationCount === newUsers.length) {
          done();
        }
      })
      .subscribe();

    /// When
    Observable
      .merge(
        handler.requestRaw(prev, Queries.createUser(newUsers)),
        handler.requestRaw(prev, Queries.createMachine(newMachines)),
      )
      .map(v => v.map(v1 => v1.rows).getOrElse([]))
      .reduce((a, b) => a.concat(b), [])
      .subscribe();
  }, timeout);
});
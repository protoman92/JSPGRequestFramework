import { PGRequest } from './../src';
import * as Models from './models';
import * as Queries from './queries';

export let createUserTableRequest = PGRequest.builder()
  .withQuery(Queries.createUserTableQuery)
  .withRequestDescription('Create user table')
  .build();

export function createUserRequest(users: Models.TestUser[]): PGRequest.Self {
  return PGRequest.builder()
    .withQuery(Queries.createUser(users))
    .withRequestDescription('Create users')
    .build();
}

export let createMachineTableRequest = PGRequest.builder()
  .withQuery(Queries.createMachineTableQuery)
  .withRequestDescription('Create machine table')
  .build();

export function createMachineRequest(machines: Models.Machine[]): PGRequest.Self {
  return PGRequest.builder()
    .withQuery(Queries.createMachine(machines))
    .withRequestDescription('Create machines')
    .build();
}

export function findUserByIdRequest(id: string): PGRequest.Self {
  return PGRequest.builder()
    .withQuery(Queries.findUserByIdQuery(id))
    .withRequestDescription(`Find user with id ${id}`)
    .build();
}

export function findMachineByUserRequest(id: string): PGRequest.Self {
  return PGRequest.builder()
    .withQuery(Queries.findMachineByUserQuery(id))
    .withRequestDescription(`Find machines by user id ${id}`)
    .build();
}

export let dropUserTableRequest = PGRequest.builder()
  .withQuery(Queries.dropUserTableQuery)
  .withRequestDescription('Drop user table')
  .build();

export let dropMachineTableRequest = PGRequest.builder()
  .withQuery(Queries.dropMachineTableQuery)
  .withRequestDescription('Drop machine table')
  .build();
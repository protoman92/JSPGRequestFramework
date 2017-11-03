import { PGRequest } from './../src';
import * as Queries from './queries';

export let createTableRequest = PGRequest.builder()
  .withQuery(Queries.createUserTableQuery)
  .withRequestDescription('Create user table')
  .build();
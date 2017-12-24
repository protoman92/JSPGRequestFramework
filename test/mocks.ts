import * as uuid from 'uuid';
import { Numbers, Strings } from 'javascriptutilities';
import * as Models from './models';

export let mockUserCount = 100;
export let perUserCount = 10;

export interface MockDataType {
  users: Models.TestUser[];
  machines: Models.Machine[];
}

export function createData(): MockDataType {
  let users = Numbers.range(0, mockUserCount).map(() => ({
    id: uuid.v4(),
    name: Strings.randomString(20),
    age: Numbers.randomBetween(0, 99)
  }));

  let machines = users
    .map(user => Numbers.range(0, perUserCount).map(() => ({
      id: uuid.v4(), userid: user.id
    })))
    .reduce((x, y) => x.concat(y), []);

  return { users, machines };
}
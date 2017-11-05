import * as Models from './models';

export let createUserTableQuery = `
  CREATE TABLE IF NOT EXISTS testuser (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age SMALLINT NOT NULL
  );
`;

export function createUser(users: Models.TestUser[]): string {
  return `
    INSERT INTO testuser (id, name, age) VALUES
    ${users.map(user => `('${user.id}', '${user.name}', ${user.age})`).join(',\n')};
  `;
}

export function createMachine(machines: Models.Machine[]): string {
  return `
    INSERT INTO machine (id, userid) VALUES
    ${machines.map(machine => `('${machine.id}', '${machine.userid}')`).join(',\n')};
  `;
}

export let createMachineTableQuery = `
  CREATE TABLE IF NOT EXISTS machine (
    id UUID PRIMARY KEY,
    userid UUID REFERENCES testuser(id)
  );
`;

export function findUserByIdQuery(id: string): string {
  return `SELECT * from testuser where id='${id}';`;
}

export function findMachineByUserQuery(id: string): string {
  return `SELECT * from machine where userid='${id}';`;
}

export let dropUserTableQuery = `
  DROP TABLE IF EXISTS testuser;
`

export let dropMachineTableQuery = `
  DROP TABLE IF EXISTS machine;
`;
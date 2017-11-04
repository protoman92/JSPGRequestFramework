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
    INSERT INTO machine (id, userId) VALUES
    ${machines.map(machine => `('${machine.id}', '${machine.userId}')`).join(',\n')};
  `;
}

export let createMachineTableQuery = `
  CREATE TABLE IF NOT EXISTS machine (
    id UUID PRIMARY KEY,
    userId UUID REFERENCES testuser(id)
  );
`;

export let dropUserTableQuery = `
  DROP TABLE IF EXISTS testuser;
`

export let dropMachineTableQuery = `
  DROP TABLE IF EXISTS machine;
`;
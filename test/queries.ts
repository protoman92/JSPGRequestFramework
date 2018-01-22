import * as Models from './models';

export let createUserTable = `
  CREATE TABLE IF NOT EXISTS testuser (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age SMALLINT NOT NULL
  );
`;

export function createUser(users: Models.TestUser[]): string {
  return `
    INSERT INTO testuser (id, name, age) VALUES
    ${users.map(v => `('${v.id}', '${v.name}', ${v.age})`).join(',\n')};
  `;
}

export function createMachine(machines: Models.Machine[]): string {
  return `
    INSERT INTO machine (id, userid) VALUES
    ${machines.map(v => `('${v.id}', '${v.userid}')`).join(',\n')};
  `;
}

export let createMachineTable = `
  CREATE TABLE IF NOT EXISTS machine (
    id UUID PRIMARY KEY,
    userid UUID REFERENCES testuser(id)
  );
`;

export function findUserById(id: string): string {
  return `SELECT * from testuser where id='${id}';`;
}

export function findMachineByUser(id: string): string {
  return `SELECT * from machine where userid='${id}';`;
}

export let dropUserTable = `DROP TABLE IF EXISTS testuser;`;
export let dropMachineTable = `DROP TABLE IF EXISTS machine;`;

export let insertUserNotification = `
  CREATE OR REPLACE 
  FUNCTION notify_user() RETURNS trigger AS 
  $$
  BEGIN
    PERFORM pg_notify('watchers', '{"id":"' || NEW.id || '"}');
    RETURN new;
  END; 
  $$
  LANGUAGE PLPGSQL;
`;

export let insertUserTrigger = `
  CREATE TRIGGER update_user
  BEFORE INSERT ON testuser
  FOR EACH ROW EXECUTE PROCEDURE
  notify_user();
`;

export let listenInsertUser = `LISTEN watchers`;
export let removeUserNotification = `DROP FUNCTION IF EXISTS notify_user();`;
export let removeUserTrigger = `DROP TRIGGER IF EXISTS update_user ON testuser;`;
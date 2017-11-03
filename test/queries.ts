export let createUserTableQuery = `
  CREATE TABLE IF NOT EXISTS user (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NON NULL,
    age SMALLINT NON NULL
  )
`;
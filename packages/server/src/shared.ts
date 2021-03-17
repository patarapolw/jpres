import createConnectionPool, { ConnectionPool } from '@databases/pg'

export const isDevelopment = process.env['NODE_ENV'] === 'development'
export let db: ConnectionPool

export function initDatabase() {
  db = createConnectionPool({
    user: process.env['POSTGRES_USER'],
    password: process.env['POSTGRES_PASSWORD'],
    database: process.env['POSTGRES_DB'],
    bigIntMode: 'number',
  })
  return db
}

require('dotenv').config();

module.exports = {
    client: 'pg',
    connection: {
        host: process.env.PG_HOST,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: process.env.PG_DATABASE,
        port: process.env.PG_PORT,
        ssl: process.env.PG_SSL === 'true'
    },
    migrations: {
        directory: '/app/src/db/migrations',
        tableName: 'knex_migrations'
    }
};
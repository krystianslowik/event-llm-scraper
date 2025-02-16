const knex = require('knex');

const config = {
    client: 'pg',
    connection: {
        host: process.env.PG_HOST,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: process.env.PG_DATABASE,
        port: process.env.PG_PORT || 5432,
        ssl: process.env.PG_SSL ? { rejectUnauthorized: false } : false,
    },
    migrations: {
        tableName: 'knex_migrations',
        directory: './src/db/migrations'
    }
};

module.exports = knex(config);
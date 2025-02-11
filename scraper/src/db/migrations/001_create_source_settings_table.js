exports.up = function (knex) {
    return knex.schema.createTable('source_settings', (table) => {
        table.increments('id').primary();
        table.string('source_url').notNullable().unique();
        table.jsonb('settings').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('source_settings');
};
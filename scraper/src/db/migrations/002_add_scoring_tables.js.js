exports.up = function(knex) {
    return knex.schema
        .alterTable('source_settings', table => {
            table.integer('expected_events').nullable()
        })
        .createTable('scraping_attempts', table => {
            table.increments('id').primary()
            table.string('source_url').notNullable()
            table.jsonb('settings_used').notNullable()
            table.integer('event_count').notNullable()
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.index('source_url')
        })
        .createTable('scoring_results', table => {
            table.increments('id').primary()
            table.string('source_url').notNullable()
            table.string('score_type').notNullable()
            table.jsonb('score_data').notNullable()
            table.timestamp('calculated_at').defaultTo(knex.fn.now())
            table.index('source_url')
        })
}

exports.down = function(knex) {
    return knex.schema
        .alterTable('source_settings', table => {
            table.dropColumn('expected_events')
        })
        .dropTableIfExists('scraping_attempts')
        .dropTableIfExists('scoring_results')
}
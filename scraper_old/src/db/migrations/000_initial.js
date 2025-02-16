exports.up = async knex => {
        await knex.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        await knex.raw(`
    CREATE TABLE events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT NOT NULL,
      source_url TEXT NOT NULL,
      category TEXT,
      date TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      title_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', title)) STORED
    )
  `);

        await knex.raw('CREATE INDEX idx_source_url ON events(source_url)');
        await knex.raw('CREATE INDEX idx_title_trgm ON events USING gin(title gin_trgm_ops)');
        await knex.raw('CREATE INDEX idx_title_vector ON events USING gin(title_vector)');
};

exports.down = knex => knex.schema.dropTable('events');
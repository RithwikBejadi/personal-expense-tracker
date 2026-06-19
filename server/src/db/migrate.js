const fs = require('fs');
const path = require('path');
const sql = require('../config/db');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await sql(schema);
    console.log('✅ Migration complete');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();

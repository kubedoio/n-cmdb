const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cmdb'
});

async function setup() {
    try {
        await client.connect();
        const schema = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
        await client.query(schema);
        console.log('Postgres schema applied successfully.');
    } catch (err) {
        console.error('Failed to apply schema:', err);
    } finally {
        await client.end();
    }
}

setup();

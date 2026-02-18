const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cmdb'
});

fastify.register(cors);

// Helper to check tenant exists
const checkTenant = async (tenantId) => {
    const res = await pool.query('SELECT id FROM tenants WHERE id = $1', [tenantId]);
    return res.rows.length > 0;
};

// GET /:tenant/ci-types
fastify.get('/:tenant/ci-types', async (request, reply) => {
    const { tenant } = request.params;
    const res = await pool.query('SELECT * FROM citypes WHERE tenant_id = $1 AND is_deprecated = FALSE', [tenant]);
    return res.rows;
});

// GET /:tenant/templates
fastify.get('/:tenant/templates', async (request, reply) => {
    const { tenant } = request.params;
    const res = await pool.query('SELECT * FROM templates WHERE tenant_id = $1 AND is_deprecated = FALSE', [tenant]);
    return res.rows;
});

// POST /:tenant/cis
fastify.post('/:tenant/cis', async (request, reply) => {
    const { tenant } = request.params;
    const { kind, name, properties } = request.body;

    const res = await pool.query(
        'INSERT INTO cis (tenant_id, kind, name, properties) VALUES ($1, $2, $3, $4) RETURNING *',
        [tenant, kind, name, properties || {}]
    );
    return res.rows[0];
});

// GET /:tenant/cis
fastify.get('/:tenant/cis', async (request, reply) => {
    const { tenant } = request.params;
    const { query } = request.query;

    let sql = 'SELECT * FROM cis WHERE tenant_id = $1 AND is_deleted = FALSE';
    const params = [tenant];

    if (query) {
        sql += ' AND (name ILIKE $2 OR kind ILIKE $2)';
        params.push(`%${query}%`);
    }

    const res = await pool.query(sql, params);
    return res.rows;
});

// GET /:tenant/cis/:id
fastify.get('/:tenant/cis/:id', async (request, reply) => {
    const { tenant, id } = request.params;

    const ciRes = await pool.query('SELECT * FROM cis WHERE id = $1 AND tenant_id = $2', [id, tenant]);
    if (ciRes.rows.length === 0) return reply.status(404).send({ error: 'CI not found' });

    const relationsRes = await pool.query(`
    SELECT r.*, s.name as source_name, t.name as target_name 
    FROM relations r
    JOIN cis s ON r.source_ci_id = s.id
    JOIN cis t ON r.target_ci_id = t.id
    WHERE r.source_ci_id = $1 OR r.target_ci_id = $1
  `, [id]);

    return {
        ...ciRes.rows[0],
        relations: relationsRes.rows
    };
});

// POST /:tenant/relations
fastify.post('/:tenant/relations', async (request, reply) => {
    const { tenant } = request.params;
    const { kind, source_ci_id, target_ci_id, properties } = request.body;

    const res = await pool.query(
        'INSERT INTO relations (tenant_id, kind, source_ci_id, target_ci_id, properties) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [tenant, kind, source_ci_id, target_ci_id, properties || {}]
    );
    return res.rows[0];
});

// GET /:tenant/cis/:id/graph
fastify.get('/:tenant/cis/:id/graph', async (request, reply) => {
    const { tenant, id } = request.params;
    const depth = parseInt(request.query.depth) || 2;

    const sql = `
    WITH RECURSIVE graph AS (
      SELECT id, name, kind, 0 as level
      FROM cis
      WHERE id = $1 AND tenant_id = $2
      
      UNION
      
      SELECT c.id, c.name, c.kind, g.level + 1
      FROM cis c
      JOIN relations r ON (r.source_ci_id = g.id AND r.target_ci_id = c.id) OR (r.target_ci_id = g.id AND r.source_ci_id = c.id)
      JOIN graph g ON g.id = r.source_ci_id OR g.id = r.target_ci_id
      WHERE g.level < $3 AND c.id != g.id
    )
    SELECT DISTINCT * FROM graph;
  `;

    // Simpler graph for MVP: just get neighbors and edges
    const nodesRes = await pool.query(`
    SELECT DISTINCT c.id, c.name, c.kind
    FROM cis c
    LEFT JOIN relations r ON r.source_ci_id = c.id OR r.target_ci_id = c.id
    WHERE c.id = $1 OR r.source_ci_id = $1 OR r.target_ci_id = $1
  `, [id]);

    const edgesRes = await pool.query(`
    SELECT * FROM relations 
    WHERE source_ci_id = $1 OR target_ci_id = $1
  `, [id]);

    return { nodes: nodesRes.rows, edges: edgesRes.rows };
});

const start = async () => {
    try {
        await fastify.listen({ port: 3002, host: '0.0.0.0' });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();

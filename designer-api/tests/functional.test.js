const test = require('node:test');
const assert = require('node:assert');
const fastify = require('../server');

test('Designer API Functional Tests', async (t) => {
    // 1. Test /api/tenants
    await t.test('GET /api/tenants should return at least one tenant', async () => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/api/tenants'
        });

        assert.strictEqual(response.statusCode, 200);
        const tenants = JSON.parse(response.body);
        assert(Array.isArray(tenants), 'Tenants should be an array');
        assert(tenants.length > 0, 'Should have at least one tenant (acme or acme-corp)');
    });

    // 2. Test /api/tenants/:tenant/objects
    await t.test('GET /api/tenants/acme/objects?kind=CIType should return types', async () => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/api/tenants/acme/objects?kind=CIType'
        });

        assert.strictEqual(response.statusCode, 200);
        const objects = JSON.parse(response.body);
        assert(Array.isArray(objects), 'Objects should be an array');
    });

    // 3. Test /api/tenants/:tenant/resources
    await t.test('GET /api/tenants/acme/resources should return all resource bundles', async () => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/api/tenants/acme/resources'
        });

        assert.strictEqual(response.statusCode, 200);
        const resources = JSON.parse(response.body);
        assert(resources.citypes, 'Should contain citypes');
        assert(resources.templates, 'Should contain templates');
    });

    // Clean up
    await fastify.close();
});

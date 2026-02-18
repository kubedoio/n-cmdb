const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const _ = require('lodash');

class Reconciler {
    constructor(db, repoPath) {
        this.db = db;
        this.repoPath = repoPath;
        this.kinds = ['CIType', 'RelationType', 'Template', 'MonitoringSource', 'MonitoringMapping'];
    }

    async reconcileTenant(tenantId) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            console.log(`Reconciling tenant: ${tenantId}`);

            const tenantGitPath = path.join(this.repoPath, 'cmdb-repo/tenants', tenantId);
            const tenantYamlPath = path.join(tenantGitPath, 'tenant.yaml');
            const tenantYaml = this.loadYaml(tenantYamlPath);

            // 1. Sync Tenant
            await this.upsertResource(client, 'tenants', { id: tenantId, ...tenantYaml });

            // 2. Sync resources in order
            for (const kind of this.kinds) {
                const kindFolder = kind.toLowerCase() + 's';
                const kindPath = path.join(tenantGitPath, kindFolder);
                const table = this.kindToTable(kind);

                const gitResources = [];
                if (fs.existsSync(kindPath)) {
                    const files = fs.readdirSync(kindPath).filter(f => f.endsWith('.yaml'));
                    for (const file of files) {
                        const content = this.loadYaml(path.join(kindPath, file));
                        gitResources.push({ tenant_id: tenantId, name: file.replace('.yaml', ''), ...content });
                    }
                }

                // Apply Git resources
                for (const res of gitResources) {
                    await this.upsertResource(client, table, res);
                }

                // Deprecate removed resources
                await this.deprecateMissing(client, table, tenantId, gitResources.map(r => r.name));
            }

            await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`Reconcile failed for ${tenantId}:`, error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    async upsertResource(client, table, resource) {
        const { id, name, tenant_id, metadata, spec } = resource;
        const query = table === 'tenants'
            ? `INSERT INTO ${table} (id, metadata, spec, is_deprecated, updated_at) 
         VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET metadata = $2, spec = $3, is_deprecated = FALSE, updated_at = CURRENT_TIMESTAMP`
            : `INSERT INTO ${table} (tenant_id, name, metadata, spec, is_deprecated, updated_at) 
         VALUES ($1, $2, $3, $4, FALSE, CURRENT_TIMESTAMP)
         ON CONFLICT (tenant_id, name) DO UPDATE SET metadata = $3, spec = $4, is_deprecated = FALSE, updated_at = CURRENT_TIMESTAMP`;

        const values = table === 'tenants'
            ? [id, metadata || {}, spec || {}]
            : [tenant_id, name, metadata || {}, spec || {}];

        await client.query(query, values);
    }

    async deprecateMissing(client, table, tenantId, currentNames) {
        if (table === 'tenants') return;
        const query = `UPDATE ${table} SET is_deprecated = TRUE, updated_at = CURRENT_TIMESTAMP 
                   WHERE tenant_id = $1 AND name != ALL($2) AND is_deprecated = FALSE`;
        await client.query(query, [tenantId, currentNames]);
    }

    loadYaml(filePath) {
        if (!fs.existsSync(filePath)) return {};
        try {
            return yaml.load(fs.readFileSync(filePath, 'utf8')) || {};
        } catch (e) {
            console.error(`Failed to parse YAML at ${filePath}:`, e.message);
            return {};
        }
    }

    kindToTable(kind) {
        const mapping = {
            'CIType': 'citypes',
            'RelationType': 'relation_types',
            'Template': 'templates',
            'MonitoringSource': 'monitoring_sources',
            'MonitoringMapping': 'monitoring_mappings'
        };
        return mapping[kind];
    }
}

module.exports = Reconciler;

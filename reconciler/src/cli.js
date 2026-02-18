const { Pool } = require('pg');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const Reconciler = require('./reconciler');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cmdb'
});

const REPO_PATH = process.env.CMDB_REPO_PATH || path.resolve(__dirname, '../../');
const git = simpleGit(REPO_PATH);

async function run() {
    const args = process.argv.slice(2);
    const headIdx = args.indexOf('--head');
    const shaIdx = args.indexOf('--sha');

    let targetSha = 'HEAD';
    if (shaIdx !== -1) targetSha = args[shaIdx + 1];

    console.log(`Targeting SHA: ${targetSha}`);

    try {
        // 1. Git pull
        await git.fetch();
        await git.checkout(targetSha);
        const currentSha = await git.revparse(['HEAD']);

        // 2. Discover tenants
        const tenantsPath = path.join(REPO_PATH, 'cmdb-repo/tenants');
        const tenantDirs = fs.readdirSync(tenantsPath).filter(d => fs.statSync(path.join(tenantsPath, d)).isDirectory());

        const reconciler = new Reconciler(pool, REPO_PATH);

        for (const tenantId of tenantDirs) {
            try {
                await reconciler.reconcileTenant(tenantId);

                // Update reconcile state
                await pool.query(
                    `INSERT INTO reconcile_state (tenant_id, last_applied_sha, last_reconcile_status, last_reconciled_at)
           VALUES ($1, $2, 'SUCCESS', CURRENT_TIMESTAMP)
           ON CONFLICT (tenant_id) DO UPDATE SET last_applied_sha = $2, last_reconcile_status = 'SUCCESS', last_reconciled_at = CURRENT_TIMESTAMP`,
                    [tenantId, currentSha]
                );
            } catch (err) {
                await pool.query(
                    `INSERT INTO reconcile_state (tenant_id, last_applied_sha, last_reconcile_status, last_error, last_reconciled_at)
           VALUES ($1, $2, 'FAILURE', $3, CURRENT_TIMESTAMP)
           ON CONFLICT (tenant_id) DO UPDATE SET last_reconcile_status = 'FAILURE', last_error = $3, last_reconciled_at = CURRENT_TIMESTAMP`,
                    [tenantId, currentSha, err.message]
                );
            }
        }

        console.log('Reconciliation complete.');
    } catch (error) {
        console.error('Critical failure:', error.message);
    } finally {
        await pool.end();
    }
}

run();

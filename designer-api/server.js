const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const simpleGit = require('simple-git');
const { Octokit } = require('octokit');
const { createAppAuth } = require('@octokit/auth-app');
require('dotenv').config();

const REPO_PATH = path.resolve(__dirname, '../');
const git = simpleGit(REPO_PATH);

fastify.register(cors, { origin: '*' });

// GitHub Auth Helper
async function getOctokit() {
    if (process.env.GITHUB_APP_ID && process.env.GITHUB_PRIVATE_KEY && process.env.GITHUB_INSTALLATION_ID) {
        fastify.log.info('Using GitHub App authentication');
        return new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: process.env.GITHUB_APP_ID,
                privateKey: Buffer.from(process.env.GITHUB_PRIVATE_KEY, 'base64').toString('ascii'),
                installationId: process.env.GITHUB_INSTALLATION_ID,
            },
        });
    } else if (process.env.GITHUB_TOKEN) {
        fastify.log.info('Using PAT authentication fallback');
        return new Octokit({ auth: process.env.GITHUB_TOKEN });
    } else {
        fastify.log.warn('No GitHub credentials found. PR creation will fail.');
        return new Octokit();
    }
}

// Endpoints
fastify.get('/api/tenants', async (request, reply) => {
    const tenantsPath = path.join(REPO_PATH, 'cmdb-repo/tenants');
    const tenantDirs = fs.readdirSync(tenantsPath);
    const tenants = [];

    for (const dir of tenantDirs) {
        const tenantYamlPath = path.join(tenantsPath, dir, 'tenant.yaml');
        if (fs.existsSync(tenantYamlPath)) {
            const content = fs.readFileSync(tenantYamlPath, 'utf8');
            tenants.push({ id: dir, ...yaml.load(content) });
        }
    }
    return tenants;
});

fastify.get('/api/tenants/:tenant/objects', async (request, reply) => {
    const { tenant } = request.params;
    const { kind } = request.query;
    const kindFolder = kind.toLowerCase() + 's';
    const objectsPath = path.join(REPO_PATH, 'cmdb-repo/tenants', tenant, kindFolder);

    if (!fs.existsSync(objectsPath)) return [];

    const files = fs.readdirSync(objectsPath).filter(f => f.endsWith('.yaml'));
    return files.map(file => {
        const content = fs.readFileSync(path.join(objectsPath, file), 'utf8');
        return { name: file.replace('.yaml', ''), ...yaml.load(content) };
    });
});

fastify.get('/api/tenants/:tenant/resources', async (request, reply) => {
    const { tenant } = request.params;
    const tenantPath = path.join(REPO_PATH, 'cmdb-repo/tenants', tenant);

    if (!fs.existsSync(tenantPath)) {
        reply.status(404).send({ error: 'Tenant not found' });
        return;
    }

    const resources = { citypes: [], relationtypes: [], templates: [] };

    ['citypes', 'relationtypes', 'templates'].forEach(kind => {
        const kindPath = path.join(tenantPath, kind);
        if (fs.existsSync(kindPath)) {
            const files = fs.readdirSync(kindPath).filter(f => f.endsWith('.yaml'));
            files.forEach(file => {
                const content = fs.readFileSync(path.join(kindPath, file), 'utf8');
                resources[kind].push({ name: file.replace('.yaml', ''), ...yaml.load(content) });
            });
        }
    });

    return resources;
});

fastify.post('/api/tenants/:tenant/pr', async (request, reply) => {
    const { tenant } = request.params;
    const { title, branchName, changes, description } = request.body;
    const finalBranchName = branchName || `designer/${tenant}/${Date.now()}`;
    const octokit = await getOctokit();

    try {
        fastify.log.info(`Creating PR for tenant ${tenant} on branch ${finalBranchName}`);

        // 1. Fetch latest and check for conflicts
        await git.fetch('origin', 'main');

        // 2. Create and switch to new branch from latest main
        await git.checkout('main');
        await git.pull('origin', 'main');
        await git.checkoutLocalBranch(finalBranchName);

        // 3. Apply changes
        for (const change of changes) {
            const absolutePath = path.join(REPO_PATH, change.path);
            fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
            const yamlContent = yaml.dump(change.content, { sortKeys: true, lineWidth: -1 });
            fs.writeFileSync(absolutePath, yamlContent);
            await git.add(change.path);
        }

        // 4. Commit
        await git.commit(title || `Update CMDB resources for ${tenant}`);

        // Robust rebase check: if someone else pushed to main in the meantime
        try {
            await git.fetch('origin', 'main');
            await git.rebase(['origin/main']);
        } catch (rebaseError) {
            fastify.log.error('Rebase failed, likely a conflict that requires manual resolution');
            throw new Error('Conflict detected while rebasing onto latest main. Please refresh and try again.');
        }

        // 5. Push and PR
        if (process.env.GITHUB_TOKEN || process.env.GITHUB_APP_ID) {
            await git.push('origin', finalBranchName);

            // Extract owner/repo from remote if not provided
            let owner = process.env.GITHUB_OWNER;
            let repo = process.env.GITHUB_REPO;

            if (!owner || !repo) {
                const remotes = await git.getRemotes(true);
                const origin = remotes.find(r => r.name === 'origin');
                if (origin) {
                    const match = origin.refs.push.match(/github\.com[:/]([^/]+)\/([^.]+)/);
                    if (match) {
                        owner = owner || match[1];
                        repo = repo || match[2];
                    }
                }
            }

            const pr = await octokit.rest.pulls.create({
                owner,
                repo,
                head: finalBranchName,
                base: 'main',
                title: title || `CMDB Update: ${tenant}`,
                body: description || 'Generated by CMDB Designer',
            });

            return { success: true, prUrl: pr.data.html_url, branch: finalBranchName };
        }

        return {
            success: true,
            branch: finalBranchName,
            prUrl: `https://github.com/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/compare/main...${finalBranchName}`,
            summary: description
        };

    } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: error.message });
    } finally {
        try { await git.checkout('main'); } catch (e) { }
    }
});

// Backward compatibility for the prototype frontend
fastify.post('/api/pr', async (request, reply) => {
    const { tenant, kind, name, content, summary } = request.body;
    const changes = [{
        path: `cmdb-repo/tenants/${tenant}/${kind}/${name}.yaml`,
        content: content
    }];
    return fastify.inject({
        method: 'POST',
        url: `/api/tenants/${tenant}/pr`,
        payload: { title: summary, changes, description: summary }
    }).then(res => JSON.parse(res.body));
});

const start = async () => {
    try {
        await fastify.listen({ port: 3001, host: '0.0.0.0' });
        fastify.log.info(`Server listening on ${fastify.server.address().port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();

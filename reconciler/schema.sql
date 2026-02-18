-- CMDB Postgres Schema

CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    metadata JSONB NOT NULL DEFAULT '{}',
    spec JSONB NOT NULL DEFAULT '{}',
    is_deprecated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS citypes (
    tenant_id TEXT REFERENCES tenants(id),
    name TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    spec JSONB NOT NULL DEFAULT '{}',
    is_deprecated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS relation_types (
    tenant_id TEXT REFERENCES tenants(id),
    name TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    spec JSONB NOT NULL DEFAULT '{}',
    is_deprecated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS templates (
    tenant_id TEXT REFERENCES tenants(id),
    name TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    spec JSONB NOT NULL DEFAULT '{}',
    is_deprecated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS monitoring_sources (
    tenant_id TEXT REFERENCES tenants(id),
    name TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    spec JSONB NOT NULL DEFAULT '{}',
    is_deprecated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS monitoring_mappings (
    tenant_id TEXT REFERENCES tenants(id),
    name TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    spec JSONB NOT NULL DEFAULT '{}',
    is_deprecated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS reconcile_state (
    tenant_id TEXT PRIMARY KEY REFERENCES tenants(id),
    last_applied_sha TEXT,
    last_reconcile_status TEXT,
    last_error TEXT,
    last_reconciled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Runtime Instance Data
CREATE TABLE IF NOT EXISTS cis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    kind TEXT NOT NULL, -- Logical kind (CIType.name)
    name TEXT NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    kind TEXT NOT NULL, -- RelationType.name
    source_ci_id UUID NOT NULL REFERENCES cis(id),
    target_ci_id UUID NOT NULL REFERENCES cis(id),
    properties JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, kind, source_ci_id, target_ci_id)
);

CREATE INDEX IF NOT EXISTS idx_cis_tenant_kind ON cis(tenant_id, kind);
CREATE INDEX IF NOT EXISTS idx_cis_properties ON cis USING GIN (properties);
CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_ci_id);
CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_ci_id);

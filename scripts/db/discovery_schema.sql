-- CMDB Discovery Subsystem Tables

-- Enum for Candidate Status
DO $$ BEGIN
    CREATE TYPE discovery_status AS ENUM ('pending', 'approved', 'rejected', 'merged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Discovery Sources (Configurations for agents)
CREATE TABLE IF NOT EXISTS discovery_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'checkmk', 'prometheus', 'zabbix'
    name TEXT NOT NULL,
    config_ref TEXT, -- Reference to secret storage / external config
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Registered Discovery Agents
CREATE TABLE IF NOT EXISTS discovery_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ,
    version TEXT,
    cert_fingerprint TEXT NOT NULL -- For mTLS verification
);

-- Candidate CIs (The "Discovery Inbox" entries)
CREATE TABLE IF NOT EXISTS discovery_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    fingerprint TEXT NOT NULL, -- Deterministic ID for deduping
    ci_type_suggested TEXT NOT NULL,
    props_jsonb JSONB NOT NULL DEFAULT '{}',
    relations_jsonb JSONB NOT NULL DEFAULT '[]',
    status discovery_status DEFAULT 'pending',
    confidence FLOAT DEFAULT 0.0,
    sources_jsonb JSONB NOT NULL DEFAULT '[]', -- List of sources identifying this asset
    first_seen TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    conflicts_jsonb JSONB DEFAULT '{}',
    notes TEXT,
    created_by_agent_id UUID REFERENCES discovery_agents(id),
    UNIQUE(tenant_id, fingerprint)
);

-- Audit log of discovery events
CREATE TABLE IF NOT EXISTS discovery_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    candidate_id UUID REFERENCES discovery_candidates(id),
    timestamp TIMESTAMPTZ DEFAULT now(),
    action TEXT NOT NULL, -- e.g., 'ingest', 'approve', 'reject', 'merge'
    actor TEXT NOT NULL,  -- Agent ID or User handle
    payload_jsonb JSONB
);

-- Mapping between external system IDs and CMDB CIs
CREATE TABLE IF NOT EXISTS external_refs (
    tenant_id TEXT NOT NULL,
    ci_id TEXT NOT NULL,      -- The internal UUID/ID of the accepted CI
    source_type TEXT NOT NULL, -- e.g., 'checkmk'
    external_id TEXT NOT NULL, -- The ID in the source system
    last_seen TIMESTAMPTZ,
    PRIMARY KEY (tenant_id, source_type, external_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_discovery_candidates_tenant_status ON discovery_candidates(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_discovery_events_candidate ON discovery_events(candidate_id);
CREATE INDEX IF NOT EXISTS idx_external_refs_ci ON external_refs(ci_id);

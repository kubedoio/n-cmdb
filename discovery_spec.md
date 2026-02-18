# CMDB Discovery System Specifications

## 1. DB Schema (Postgres)

```sql
-- Security & Multi-tenancy
CREATE TYPE discovery_status AS ENUM ('pending', 'approved', 'rejected', 'merged');

-- Discovery Sources Configuration
CREATE TABLE discovery_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'checkmk', 'prometheus', 'zabbix', 'snmp_trap', 'active_probe'
    name TEXT NOT NULL,
    config_ref TEXT, -- Reference to secret-stored credentials/config
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Enrollment
CREATE TABLE discovery_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ,
    version TEXT,
    cert_fingerprint TEXT NOT NULL
);

-- Candidates (The Inbox)
CREATE TABLE discovery_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    fingerprint TEXT NOT NULL, -- Deterministic ID for deduping
    ci_type_suggested TEXT NOT NULL,
    props_jsonb JSONB NOT NULL DEFAULT '{}',
    relations_jsonb JSONB NOT NULL DEFAULT '[]',
    status discovery_status DEFAULT 'pending',
    confidence FLOAT DEFAULT 0.0,
    sources_jsonb JSONB NOT NULL DEFAULT '[]', -- List of sources that reported this
    first_seen TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    conflicts_jsonb JSONB DEFAULT '{}',
    notes TEXT,
    created_by_agent_id UUID REFERENCES discovery_agents(id),
    UNIQUE(tenant_id, fingerprint)
);

-- Audit Log
CREATE TABLE discovery_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    candidate_id UUID REFERENCES discovery_candidates(id),
    timestamp TIMESTAMPTZ DEFAULT now(),
    action TEXT NOT NULL, -- 'ingest', 'approve', 'reject', 'merge'
    actor TEXT NOT NULL, -- Agent ID or User Name
    payload_jsonb JSONB
);

-- Existing CMDB Reference
CREATE TABLE external_refs (
    tenant_id TEXT NOT NULL,
    ci_id TEXT NOT NULL, -- Target CI in main CMDB
    source_type TEXT NOT NULL, -- 'checkmk', 'zabbix'
    external_id TEXT NOT NULL, 
    last_seen TIMESTAMPTZ,
    PRIMARY KEY (tenant_id, source_type, external_id)
);
```

## 1.5. Deterministic Fingerprinting Logic

The API uses a tiered hashing strategy to identify unique assets across multiple discovery sources.

### Hierarchy (Highest to Lowest Stability)
1.  **Cloud Identity**: `provider` + `instance_id` (e.g., `aws:i-0abcdef123`)
2.  **Hardware MAC**: `mac` (Sorted list if multiple).
3.  **Bios Serial**: `serial_number`.
4.  **Monitoring ID**: `checkmk_host_id`, `zabbix_proxy_id`, etc.
5.  **Weak Fallback**: `hostname` + `primary_ip`.

### Implementation
```rust
fn generate_fingerprint(props: &HashMap<String, String>) -> String {
    let mut hasher = DefaultHasher::new();
    if let Some(id) = props.get("instance_id") {
        "cloud:".to_owned() + id
    } else if let Some(macs) = props.get("mac_addresses") {
        "mac:".to_owned() + macs
    } else {
        // Fallback with warning flag
        format!("weak:{}:{}", props.get("hostname").unwrap_or(&"null".into()), props.get("ip").unwrap_or(&"0.0.0.0".into()))
    }
}
```

## 2. Agent Design (Rust)

### Modules
- `core`: Lifecycle, mTLS client, config loader.
- `sources/monitoring`: HTTP clients for Checkmk, Prometheus, Zabbix.
- `sources/traps`: UDP listener for SNMP traps.
- `sources/prober`: ICMP and TCP port checking (rate-limited).
- `normalizer`: Converts raw source data into `DiscoveryCandidate` batches.

### Config Format (YAML)
```yaml
tenant_id: "acme-corp"
agent_name: "prod-dc1-agent"
server_url: "https://discovery.cmdb.io"
mtls:
  cert_path: "/etc/discovery/agent.crt"
  key_path: "/etc/discovery/agent.key"

sources:
  checkmk:
    enabled: true
    url: "http://checkmk.internal/api"
    secret_ref: "vault:checkmk-api-key"
  probing:
    enabled: true
    networks: ["10.0.0.0/24"]
    ports: [22, 80, 443, 9100]
    rate_limit: 10 # packets/sec
```

## 3. API Specifications

### Candidate Ingest (Agent -> API)
`POST /api/discovery/ingest`
```json
{
  "batch_id": "uuid",
  "candidates": [
    {
      "fingerprint": "mac:00:11:22:33:44:55",
      "ci_type": "server",
      "props": {
        "hostname": "srv-01",
        "ip": "10.0.0.5",
        "os": "Ubuntu 22.04"
      },
      "confidence": 0.9,
      "source_id": "checkmk-01"
    }
  ]
}
```

### Approval UI Endpoints
- `GET /api/tenants/:t/discovery/candidates?status=pending`: List queue.
- `POST /api/tenants/:t/discovery/candidates/:id/approve`: Move to CMDB.
- `POST /api/tenants/:t/discovery/candidates/:id/reject`: Dismiss.

## 4. UI Wireframe: Discovery Inbox

- **Layout**: Full-width list view with a detail side-panel (split 60/40).
- **Table Columns**: Status Badge, Suggested Type, Identifier (Hostname/IP), Confidence (Bar), Source Count.
- **Detail Panel**:
    - **Header**: Asset Name + Identity Fingerprint.
    - **Diff View**: Comparison if an existing CI is found (using logic from `external_refs`).
    - **Provenance Section**: Timeline of which agents/sources saw this and when.
    - **Primary Actions**: Fixed footer with `[Approve]`, `[Reject]`, `[Merge...]`.

## 5. Test Plan

- **Unit Tests**:
    - `fingerprint(candidate)`: Verify same hashes for identical host identifiers.
    - `merge_policy`: Verify that a new source updates the same candidate record.
- **Integration Tests**:
    - End-to-end `Ingest -> Pending List -> Approve -> Assert CI Created`.
- **Load Test**:
    - Batch ingest of 10,000 candidates to verify DB upsert performance.
    - Active prober rate-limiting verification (ensure it doesn't exceed X packet/sec).

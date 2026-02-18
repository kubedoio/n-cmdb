# GitOps CMDB Handbook

Welcome to the official documentation for the **GitOps CMDB Designer**. This guide will take you from a fresh installation to a fully functional, automated inventory system integrated with Rustchat.

---

## Table of Contents
1. [Quickstart (15 Minutes)](#quickstart-15-minutes)
2. [Core Concepts](#core-concepts)
3. [Walkthrough Tutorial](#walkthrough-tutorial)
   - [Section 1: Creating a Tenant](#section-1-creating-a-tenant)
   - [Section 2: Defining a Datacenter Hierarchy](#section-2-defining-a-datacenter-hierarchy)
   - [Section 3: Designing Physical Hardware](#section-3-designing-physical-hardware)
   - [Section 4: Building Reusable Templates](#section-4-building-reusable-templates)
   - [Section 5: Creating Instances](#section-5-creating-instances)
   - [Section 6: Mapping Monitoring](#section-6-mapping-monitoring)
   - [Section 7: Approving Discovery Candidates](#section-7-approving-discovery-candidates)
4. [Reference Docs](#reference-docs)
   - [YAML Schema Reference](#yaml-schema-reference)
   - [API Reference Summary](#api-reference-summary)
   - [Glossary](#glossary)
5. [Troubleshooting](#troubleshooting)

---

## Quickstart (15 Minutes)

In this quickstart, you will create a single "Server" type and a "Production" template.

1.  **Open the Designer**: Navigate to the Designer UI (e.g., `https://designer.cmdb.io`).
2.  **Define CI Type**: Go to **CI Types**, click **+ New**, and create a type called `server`. Add properties: `hostname`, `cpu_cores`, `memory_gb`.
3.  **Review YAML**: Click the **YAML** tab in the preview pane to see the generated spec.
4.  **Create PR**: Click **Create Pull Request**. This opens a PR in your git repository.
5.  **Merge**: Once your team reviews and merges the PR, the Reconciler will automatically update the CMDB Postgres database.
6.  **Verify**: Open the **CMDB Inventory UI** to see the new `server` type available for instantiation.

> [!TIP]
> Use the **Plan** tab in the Designer to see exactly what the Reconciler will do (e.g., "Add table `ci_server`").

---

## Core Concepts

The CMDB follows a "GitOps-First" philosophy:

*   **Git is the Source of Truth**: All definitions (types, relations, templates) are stored as YAML in a Git repository.
*   **Tenant Separation**: Data is structured by tenant under `tenants/<tenant_name>/`.
*   **Designer vs. Runtime**:
    *   The **Designer** is a visual tool for *governance* (editing YAML and opening PRs).
    *   The **Runtime** is the live API/UI for *operations* (searching CIs, viewing graphs, linking assets).
*   **The Reconciler**: A background service that watches the Git repo and synchronizes the Postgres Database (Materialized View) with the YAML state.
*   **Discovery Inbox**: A bridge where external agents propose "Candidates". You review them visually before they become official CIs.

---

## Walkthrough Tutorial

### Scenario: ACME Corp Berlin Datacenter
We will build the inventory for **ACME Corp's** new Berlin site (`dc-berlin-1`).

### Section 1: Creating a Tenant
The tenant is the highest level of isolation.
1.  In the Designer, select **Tenants** from the settings or home screen.
2.  Add `acme`.
3.  **Result**: The folder `tenants/acme/` is initialized in the repo.

### Section 2: Defining a Datacenter Hierarchy
We need `location` and `rack` types to represent the physical space.

#### 1. Location CI Type
*   **Path**: `tenants/acme/ci-types/location.yaml`
```yaml
name: location
display_name: Location
properties:
  - name: city
    type: string
  - name: address
    type: string
```

#### 2. Rack CI Type
*   **Path**: `tenants/acme/ci-types/rack.yaml`
```yaml
name: rack
display_name: Server Rack
properties:
  - name: unit_capacity
    type: integer
    default: 42
```

#### 3. "located_in" Relation
*   **Path**: `tenants/acme/relation-types/located_in.yaml`
```yaml
name: located_in
display_name: Located In
constraints:
  - from: rack
    to: location
```

[Screenshot: Designer - Creating the located_in relation]

### Section 3: Designing Physical Hardware
Now we define the `server` type with "Resources as Parameters".

*   **Path**: `tenants/acme/ci-types/server.yaml`
```yaml
name: server
display_name: Physical Server
properties:
  - name: hostname
    type: string
    required: true
  - name: cpu_cores
    type: integer
  - name: memory_gb
    type: integer
  - name: disk_tb
    type: decimal
  - name: nic_count
    type: integer
```

### Section 4: Building Reusable Templates
Templates allow you to enforce standards. Let's create a **Standard Baremetal** template.

*   **Path**: `tenants/acme/templates/baremetal-standard.yaml`
```yaml
name: baremetal-standard
ci_type: server
defaults:
  cpu_cores: 16
  memory_gb: 64
  disk_tb: 1.2
```

[Screenshot: Template Editor - Setting default values for server attributes]

### Section 5: Creating Instances
Instances are created via the **Runtime UI** or **API**.
1.  Go to the **Inventory** app.
2.  Click **Create CI** -> Select **Template: baremetal-standard**.
3.  Name it `srv-01`.
4.  Override `memory_gb` to `128` if needed.
5.  Link it: `srv-01` -> **located_in** -> `rack-01`.

### Section 6: Mapping Monitoring
Link your CIs to real-time data from Checkmk or Prometheus.

*   **Path**: `tenants/acme/monitoring/checkmk-server.yaml`
```yaml
name: checkmk-server-default
source_type: checkmk
mapping:
  - target_property: health
    source_metric: host_status
  - target_property: cpu_utilization
    source_metric: cpu_load_average
```

> [!NOTE]
> Monitoring properties are usually **Read-Only** in the CMDB UI as they are updated by the bridge.

### Section 7: Approving Discovery Candidates
When the Discovery Agent finds a new switch on the network, it appears in the **Discovery Inbox**.

1.  Open **Discovery Inbox**.
2.  Locate candidate `sw-01` (Type: `network_device`).
3.  Review **Confidence Score** (e.g., 95%).
4.  Click **Approve**.
5.  **What you achieved**: The asset is now a permanent CI in the CMDB with its full provenance preserved.

---

## Reference Docs

### YAML Object Reference

| Object | Path | Description |
| :--- | :--- | :--- |
| **Tenant** | `tenants/<name>/tenant.yaml` | Metadata about the tenant. |
| **CIType** | `tenants/<name>/ci-types/` | Schema definition for an asset class. |
| **RelationType** | `tenants/<name>/relation-types/` | Rules for how CIs can be linked. |
| **Template** | `tenants/<name>/templates/` | Pre-configured defaults for a CIType. |
| **MonitoringMapping** | `tenants/<name>/monitoring/` | Connectivity between source metrics and CI properties. |

### API Reference Summary (Runtime)

*   `GET /api/resources`: List all CIs with filtering.
*   `POST /api/resources/:type`: Create a new CI instance.
*   `GET /api/resources/:type/:id/graph`: Fetch neighbors and relations.
*   `POST /api/discovery/ingest`: (Internal) Agent pushes candidates.

### Glossary

*   **CI (Configuration Item)**: An individual asset (e.g., `srv-01`).
*   **CIType**: The "Class" or "Table" for CIs (e.g., `server`).
*   **Template**: A blueprint with pre-filled attributes.
*   **Relation**: A typed link between two CIs (e.g., `runs_on`).
*   **Provenance**: The history of where a discovered asset came from.

---

## Troubleshooting

### PR Validation Fails
*   **Cause**: Invalid YAML syntax or broken relation constraints.
*   **Fix**: Check the **YAML** tab in the Designer for red linting marks before clicking "Create PR".

### Conflicts (Repo Out of Sync)
*   **Cause**: Someone else pushed a change to the repo while you were editing.
*   **Fix**: Refresh the Designer to pull the latest state and re-apply your changes.

### Reconcile Failed
*   **Cause**: The Postgres DB is unreachable or a schema migration failed.
*   **Fix**: View the **Reconciler Logs** in the "Admin Console" to see the specific SQL error.

### Duplicate Discovery Candidates
*   **Cause**: Multiple agents reporting the same asset with different fingerprints.
*   **Fix**: Use the **Merge** feature in the Discovery Inbox to link the fingerprints together under one identity.

> [!WARNING]
> Never manually edit the Postgres tables created by the Reconciler; they will be overwritten on the next sync. Always edit the YAML in Git.

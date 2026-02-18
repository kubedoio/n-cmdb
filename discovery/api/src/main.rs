use axum::{
    routing::{get, post},
    Router,
    Json,
    extract::{Path, State},
};
use std::net::SocketAddr;
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use std::collections::HashMap;
use sha2::{Sha256, Digest};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Candidate {
    pub fingerprint: String,
    pub ci_type: String,
    pub props: HashMap<String, String>,
    pub confidence: f32,
}

#[derive(Debug, Deserialize)]
struct IngestBatch {
    agent_id: Uuid,
    candidates: Vec<Candidate>,
}

#[derive(Clone)]
struct AppState {
    db: Pool<Postgres>,
}

// Fingerprinting logic based on hierarchy
fn calculate_fingerprint(props: &HashMap<String, String>) -> String {
    if let Some(instance_id) = props.get("instance_id") {
        return format!("cloud:{}", instance_id);
    }
    if let Some(mac) = props.get("mac_address") {
        return format!("mac:{}", mac);
    }
    // Fallback: SHA256 of hostname + IP
    let hostname = props.get("hostname").map(|s| s.as_str()).unwrap_or("unknown");
    let ip = props.get("ip").map(|s| s.as_str()).unwrap_or("0.0.0.0");
    let mut hasher = Sha256::new();
    hasher.update(format!("{}:{}", hostname, ip));
    format!("weak:{:x}", hasher.finalize())
}

async fn ingest(
    State(state): State<AppState>,
    Json(payload): Json<IngestBatch>
) -> Result<String, String> {
    let tenant_id = "acme-corp"; // Mocked for MVP

    for c in payload.candidates {
        let fp = calculate_fingerprint(&c.props);

        
        // Upsert candidate using SQLx
        sqlx::query(
            r#"
            INSERT INTO discovery_candidates (tenant_id, fingerprint, ci_type_suggested, props_jsonb, confidence, last_seen, created_by_agent_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (tenant_id, fingerprint) DO UPDATE 
            SET props_jsonb = discovery_candidates.props_jsonb || EXCLUDED.props_jsonb,
                last_seen = EXCLUDED.last_seen,
                confidence = EXCLUDED.confidence
            "#,
        )
        .bind(tenant_id)
        .bind(fp)
        .bind(&c.ci_type)
        .bind(serde_json::to_value(&c.props).unwrap())
        .bind(c.confidence as f64)
        .bind(Utc::now())
        .bind(payload.agent_id)
        .execute(&state.db).await.map_err(|e| e.to_string())?;

    }

    Ok("Batch processed".to_string())
}

async fn list_candidates(State(state): State<AppState>) -> Result<Json<Vec<serde_json::Value>>, String> {
    let tenant_id = "acme-corp";
    let rows = sqlx::query(
        "SELECT id, fingerprint, ci_type_suggested, props_jsonb, confidence, last_seen FROM discovery_candidates WHERE tenant_id = $1 AND status = 'pending'",
    )
    .bind(tenant_id)
    .fetch_all(&state.db).await.map_err(|e| e.to_string())?;

    let results = rows.into_iter().map(|row: sqlx::postgres::PgRow| {
        use sqlx::Row;
        serde_json::json!({
            "id": row.get::<Uuid, _>("id"),
            "fingerprint": row.get::<String, _>("fingerprint"),
            "ci_type": row.get::<String, _>("ci_type_suggested"),
            "props": row.get::<serde_json::Value, _>("props_jsonb"),
            "confidence": row.get::<f64, _>("confidence"),
            "last_seen": row.get::<DateTime<Utc>, _>("last_seen")
        })
    }).collect();


    Ok(Json(results))
}

async fn approve_candidate(
    State(state): State<AppState>,
    Path(id): Path<Uuid>
) -> Result<String, String> {
    // 1. Mark as approved
    sqlx::query(
        "UPDATE discovery_candidates SET status = 'approved' WHERE id = $1",
    )
    .bind(id)
    .execute(&state.db).await.map_err(|e| e.to_string())?;


    // 2. Promote to CMDB Core (Mocked)
    let candidate = sqlx::query(
        "SELECT tenant_id, fingerprint FROM discovery_candidates WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.db).await.map_err(|e| e.to_string())?;

    use sqlx::Row;
    let tenant_id: String = candidate.get("tenant_id");
    let fingerprint: String = candidate.get("fingerprint");

    tracing::info!("Promoting candidate {} (fingerprint: {}) to CMDB CI", id, fingerprint);
    
    sqlx::query(
        r#"
        INSERT INTO external_refs (tenant_id, ci_id, source_type, external_id, last_seen)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tenant_id, source_type, external_id) DO UPDATE SET last_seen = EXCLUDED.last_seen
        "#,
    )
    .bind(tenant_id)
    .bind(Uuid::new_v4().to_string())
    .bind("discovery-agent")
    .bind(fingerprint)
    .bind(Utc::now())
    .execute(&state.db).await.map_err(|e| e.to_string())?;


    tracing::info!("Candidate {} approved and promoted successfully", id);

    Ok("Approved and Promoted".to_string())
}


#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/cmdb".to_string());
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    let state = AppState { db: pool };

    let app = Router::new()
        .route("/api/discovery/ingest", post(ingest))
        .route("/api/discovery/candidates", get(list_candidates))
        .route("/api/discovery/candidates/:id/approve", post(approve_candidate))
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3002));
    tracing::info!("Discovery API listening on {}", addr);
    
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_fingerprint_cloud() {
        let mut props = HashMap::new();
        props.insert("instance_id".to_string(), "i-123456".to_string());
        props.insert("hostname".to_string(), "srv-01".to_string());
        
        let fp = calculate_fingerprint(&props);
        assert_eq!(fp, "cloud:i-123456");
    }

    #[test]
    fn test_calculate_fingerprint_mac() {
        let mut props = HashMap::new();
        props.insert("mac_address".to_string(), "00:11:22:33:44:55".to_string());
        props.insert("hostname".to_string(), "srv-01".to_string());
        
        let fp = calculate_fingerprint(&props);
        assert_eq!(fp, "mac:00:11:22:33:44:55");
    }

    #[test]
    fn test_calculate_fingerprint_weak() {
        let mut props = HashMap::new();
        props.insert("hostname".to_string(), "srv-01".to_string());
        props.insert("ip".to_string(), "10.0.0.1".to_string());
        
        let fp = calculate_fingerprint(&props);
        assert!(fp.starts_with("weak:"));
    }
}

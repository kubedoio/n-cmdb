mod sources {
    pub mod monitoring;
    pub mod prober;
}

use sources::monitoring::CheckmkSource;
use sources::prober::LightProber;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error;
use std::time::Duration;
use async_trait::async_trait;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Candidate {
    pub fingerprint: String,
    pub ci_type: String,
    pub props: HashMap<String, String>,
    pub confidence: f32,
}

#[async_trait]
pub trait DiscoverySource {
    async fn discover(&self) -> Result<Vec<Candidate>, Box<dyn Error>>;
}

#[derive(Debug, Serialize)]
struct IngestBatch {
    agent_id: String,
    candidates: Vec<Candidate>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    tracing_subscriber::fmt::init();
    tracing::info!("Starting Discovery Agent...");

    // 1. Initial configuration (mocked)
    let tenant_id = "acme-corp";
    let agent_id = "agent-prod-01";
    let api_url = "http://localhost:3002/api/discovery/ingest";

    // 2. Initialize sources
    let sources: Vec<Box<dyn DiscoverySource + Send + Sync>> = vec![
        Box::new(CheckmkSource {
            url: "http://checkmk.internal/api".into(),
            api_key: "secret".into(),
        }),
        Box::new(LightProber {
            networks: vec!["10.0.1.0/24".into()],
            ports: vec![22, 80, 443],
        }),
    ];

    let client = reqwest::Client::new();

    // 3. Main discovery loop
    loop {
        tracing::info!("Starting discovery cycle...");
        let mut all_candidates = Vec::new();

        for source in &sources {
            match source.discover().await {
                Ok(mut batch) => all_candidates.append(&mut batch),
                Err(e) => tracing::error!("Source discovery failed: {}", e),
            }
        }

        if !all_candidates.is_empty() {
            tracing::info!("Sending batch of {} candidates to {}", all_candidates.len(), api_url);
            let batch = IngestBatch {
                agent_id: agent_id.into(),
                candidates: all_candidates,
            };

            match client.post(api_url).json(&batch).send().await {
                Ok(resp) => tracing::info!("Ingest successful: {}", resp.status()),
                Err(e) => tracing::error!("Ingest failed: {}", e),
            }
        }

        tracing::info!("Sleeping for 60 seconds...");
        tokio::time::sleep(Duration::from_secs(60)).await;
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    struct MockSource;
    #[async_trait]
    impl DiscoverySource for MockSource {
        async fn discover(&self) -> Result<Vec<Candidate>, Box<dyn Error>> {
            Ok(vec![Candidate {
                fingerprint: "mock:1".into(),
                ci_type: "test".into(),
                props: HashMap::new(),
                confidence: 1.0,
            }])
        }
    }

    #[tokio::test]
    async fn test_source_polling() {
        let source = MockSource;
        let candidates = source.discover().await.unwrap();
        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].fingerprint, "mock:1");
    }
}

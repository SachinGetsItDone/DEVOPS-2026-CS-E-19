'use strict';

const { connect, disconnect } = require('./db/mongo');
const { RAGService } = require('./services/rag');

// Same starter corpus as the previous FastAPI implementation.
const SEED_FACTS = [
  ['backend', 'database-indexing', 'A database index speeds up reads by maintaining a sorted structure (usually a B-tree) over one or more columns, at the cost of slower writes and extra storage.'],
  ['backend', 'acid', 'ACID transactions guarantee Atomicity, Consistency, Isolation, and Durability; they are the basis for correctness in relational databases under concurrency and failure.'],
  ['backend', 'sql-vs-nosql', 'SQL databases enforce a fixed schema and strong relational integrity; NoSQL stores trade that for flexible documents and horizontal scale. Choose based on access patterns and consistency needs.'],
  ['backend', 'caching', 'Caching stores hot data closer to the reader to cut latency and load. Key decisions are what to cache, the eviction policy (LRU/LFU), and how to invalidate stale entries.'],
  ['backend', 'message-queue', 'A message queue decouples producers from consumers and smooths spiky load. At-least-once delivery is the practical default, which requires idempotent consumers to avoid double-processing.'],
  ['backend', 'load-balancing', 'A load balancer spreads traffic across servers using strategies like round-robin or least-connections, and uses health checks to route away from unhealthy instances.'],
  ['distributed-systems', 'cap-theorem', 'The CAP theorem says a distributed system facing a network partition must choose between consistency and availability; you cannot have both during a partition.'],
  ['distributed-systems', 'consistent-hashing', 'Consistent hashing maps keys and nodes onto a ring so that adding or removing a node only remaps a small fraction of keys, which is essential for scalable sharding and caching.'],
  ['distributed-systems', 'race-conditions', 'A race condition occurs when the result depends on unsynchronized concurrent access to shared state. Fixes include locks, atomic operations, and single-writer designs.'],
  ['distributed-systems', 'idempotency', 'An idempotent operation produces the same result whether applied once or many times; idempotency keys let clients safely retry requests without duplicating side effects.'],
  ['system-design', 'horizontal-vs-vertical-scaling', 'Vertical scaling adds power to one machine and hits a ceiling; horizontal scaling adds more machines and needs statelessness or partitioning but scales much further.'],
  ['system-design', 'rate-limiting', 'Rate limiting protects a service from overload and abuse. Token bucket allows bursts up to a cap; leaky bucket enforces a steady rate.'],
  ['system-design', 'cdn', 'A CDN caches static assets at edge locations near users to reduce latency and origin load, and is the first lever for global content delivery.'],
  ['system-design', 'websockets', 'WebSockets provide a persistent, bidirectional connection ideal for real-time features like live audio or chat, unlike request/response HTTP polling.'],
  ['behavioral', 'star-method', 'The STAR method structures behavioral answers as Situation, Task, Action, Result, keeping stories concrete and outcome-focused.'],
  ['behavioral', 'system-design-approach', 'A strong system-design answer clarifies requirements, estimates scale with numbers, sketches components, then justifies each trade-off as what it solves, worsens, and when to change it.'],
];

async function main() {
  await connect();
  const rag = new RAGService();
  const items = SEED_FACTS.map(([role_category, topic, content]) => ({ role_category, topic, content }));
  const inserted = await rag.addDocuments(items);
  console.log(`[seed] domain knowledge: ${inserted} new facts added (idempotent - existing topics skipped).`);
  await disconnect();
}

main().catch((err) => {
  console.error(`[seed] failed: ${err.message}`);
  process.exit(1);
});

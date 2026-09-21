'use strict';

const config = require('../config');
const { DomainKnowledge } = require('../models');

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 2);
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function keywordScore(queryTokens, doc) {
  if (!queryTokens.length) return 0;
  const docTokens = new Set(tokenize(doc));
  let hits = 0;
  for (const t of queryTokens) if (docTokens.has(t)) hits += 1;
  return hits / queryTokens.length;
}

class RAGService {
  constructor() {
    this.mode = config.RAG_MODE === 'keyword' ? 'keyword' : 'auto';
    this.pipe = null;
    this.loading = null;
  }

  async ensurePipe() {
    if (this.mode === 'keyword') return null;
    if (this.pipe) return this.pipe;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const { pipeline } = await import('@huggingface/transformers');
        this.pipe = await pipeline('feature-extraction', config.EMBEDDING_MODEL, { dtype: 'fp32' });
        return this.pipe;
      } catch (err) {
        console.warn(`[rag] embedding model unavailable (${err.message}) - falling back to keyword matching.`);
        this.mode = 'keyword';
        return null;
      } finally {
        this.loading = null;
      }
    })();
    return this.loading;
  }

  async embed(text) {
    const pipe = await this.ensurePipe();
    if (!pipe) return null;
    const out = await pipe(String(text || '').slice(0, 4000), { pooling: 'mean', normalize: true });
    return Array.from(out.data);
  }

  async addDocuments(items) {
    const docs = [];
    for (const item of items) {
      const { role_category, topic, content } = item;
      // Idempotent seed: existing topics are skipped, never duplicated.
      const existing = await DomainKnowledge.findOne({ role_category, topic }).lean();
      if (existing) continue;
      const embedding = (await this.embed(`${topic}: ${content}`)) || [];
      docs.push({ role_category, topic, content, embedding });
    }
    if (docs.length) await DomainKnowledge.insertMany(docs, { ordered: false });
    return docs.length;
  }

  async retrieveFacts(query, topK = 3) {
    try {
      const docs = await DomainKnowledge.find({}).lean();
      if (!docs.length) return '';

      const pipe = await this.ensurePipe();
      let ranked = null;
      if (pipe) {
        const q = await this.embed(query);
        if (q) {
          ranked = docs
            .filter((d) => Array.isArray(d.embedding) && d.embedding.length)
            .map((d) => ({ d, s: cosine(q, d.embedding) }))
            .sort((a, b) => b.s - a.s)
            .slice(0, topK)
            .filter((x) => x.s > 0.1);
        }
      }
      if (!ranked || !ranked.length) {
        const qTokens = tokenize(query);
        ranked = docs
          .map((d) => ({ d, s: keywordScore(qTokens, `${d.topic} ${d.content}`) }))
          .sort((a, b) => b.s - a.s)
          .slice(0, topK)
          .filter((x) => x.s > 0);
      }
      if (!ranked.length) return '';
      return ranked.map((x) => `${x.d.topic}: ${x.d.content}`).join('\n');
    } catch (err) {
      console.warn(`[rag] retrieval failed: ${err.message}`);
      return '';
    }
  }
}

module.exports = { RAGService };

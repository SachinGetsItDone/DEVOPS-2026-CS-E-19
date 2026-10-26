'use strict';

const { DomainKnowledge } = require('../models');

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 2);
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
    this.mode = 'keyword';
  }

  async addDocuments(items) {
    const docs = [];
    for (const item of items) {
      const { role_category, topic, content } = item;
      // Idempotent seed: existing topics are skipped, never duplicated.
      const existing = await DomainKnowledge.findOne({ role_category, topic }).lean();
      if (existing) continue;
      docs.push({ role_category, topic, content, embedding: [] });
    }
    if (docs.length) await DomainKnowledge.insertMany(docs, { ordered: false });
    return docs.length;
  }

  async retrieveFacts(query, topK = 3) {
    try {
      const docs = await DomainKnowledge.find({}).lean();
      if (!docs.length) return '';

      const qTokens = tokenize(query);
      const ranked = docs
        .map((d) => ({ d, s: keywordScore(qTokens, `${d.topic} ${d.content}`) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, topK)
        .filter((x) => x.s > 0);

      if (!ranked.length) return '';
      return ranked.map(({ d }) => `[${d.topic}] ${d.content}`).join('\n\n');
    } catch (err) {
      console.warn(`[rag] retrieval failed: ${err.message}`);
      return '';
    }
  }
}

module.exports = { RAGService };

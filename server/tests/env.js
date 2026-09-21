'use strict';

// Runs before any module is loaded so config.js picks these up.
process.env.NODE_ENV = 'test';
process.env.RAG_MODE = 'keyword'; // no model download in tests
process.env.JWT_SECRET = 'test-secret';
process.env.DEEPSEEK_API_KEY = '';
process.env.NVIDIA_API_KEY = '';

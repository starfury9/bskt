import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { join } from 'path';
import { mintRouter } from './routes/mint.js';
import { apiKeyAuth } from './middleware/auth.js';

// Load .env from project root
dotenv.config({ path: join(process.cwd(), '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes (protected with API key)
app.use('/mint', apiKeyAuth, mintRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`CRE Mode: Local simulation with --broadcast`);
  console.log(`Auth: API key required (x-api-key header)`);
});

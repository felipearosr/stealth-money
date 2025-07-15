// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Enable JSON body parsing

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
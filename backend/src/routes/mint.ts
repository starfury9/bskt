import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join } from 'path';
import { triggerCREWorkflow, type MintRequest } from '../services/cre-workflow.js';

const router = Router();

// Load baskets configuration
const basketsPath = join(process.cwd(), 'data/baskets.json');

interface BasketConfig {
  name: string;
  symbol: string;
  stablecoinAddress: string;
  mintingConsumerAddress: string;
}

function loadBaskets(): Record<string, BasketConfig> {
  try {
    const data = readFileSync(basketsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Baskets] Failed to load baskets.json:', error);
    return {};
  }
}

// Request validation schema
const mintRequestSchema = z.object({
  basket: z.string().min(1, 'Basket symbol is required'),
  beneficiary: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a valid number string'),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = mintRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validationResult.error.errors.map(e => `${e.path}: ${e.message}`).join(', '),
      });
      return;
    }

    const { basket, beneficiary, amount } = validationResult.data;

    // Lookup basket configuration
    const baskets = loadBaskets();
    const basketConfig = baskets[basket];

    if (!basketConfig) {
      const availableBaskets = Object.keys(baskets);
      res.status(400).json({
        success: false,
        error: 'BASKET_NOT_FOUND',
        message: `Basket "${basket}" not found. Available baskets: ${availableBaskets.join(', ') || 'none'}`,
      });
      return;
    }

    console.log(`[Mint Request] Basket: ${basket}, Beneficiary: ${beneficiary}, Amount: ${amount}`);
    console.log(`[Mint Request] Stablecoin: ${basketConfig.stablecoinAddress}`);
    console.log(`[Mint Request] MintingConsumer: ${basketConfig.mintingConsumerAddress}`);

    // Trigger CRE workflow
    const mintRequest: MintRequest = {
      basket,
      beneficiary,
      amount,
      stablecoinAddress: basketConfig.stablecoinAddress,
      mintingConsumerAddress: basketConfig.mintingConsumerAddress,
    };

    const result = await triggerCREWorkflow(mintRequest);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[Mint Error]', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
    });
  }
});

export { router as mintRouter };

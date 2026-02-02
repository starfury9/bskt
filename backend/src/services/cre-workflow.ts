import crypto from 'crypto';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

export interface MintRequest {
  basket: string;
  beneficiary: string;
  amount: string;
  stablecoinAddress: string;
  mintingConsumerAddress: string;
}

export interface MintResponse {
  success: boolean;
  transactionId?: string;
  mintTransaction?: string;
  beneficiary?: string;
  amount?: string;
  basket?: string;
  message?: string;
  error?: string;
  etherscanUrl?: string;
}

/**
 * Generates a unique transaction ID for the mint request
 */
function generateTransactionId(): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `BSKT${timestamp}${random}`;
}

/**
 * Generates a bank reference (bytes32 format)
 */
function generateBankReference(transactionId: string): string {
  const buffer = Buffer.alloc(32);
  buffer.write(transactionId);
  return '0x' + buffer.toString('hex');
}

/**
 * Transforms the mint request into payload for CRE workflow
 */
function buildCREPayload(request: MintRequest): object {
  const transactionId = generateTransactionId();
  const bankReference = generateBankReference(transactionId);

  return {
    messageType: 'MT103',
    transactionId,
    sender: {
      name: 'BSKT Backend',
      account: 'BSKT001',
      bankCode: 'BSKTAPI',
    },
    beneficiary: {
      name: 'Wallet',
      account: request.beneficiary,
    },
    amount: request.amount,
    currency: 'USD',
    valueDate: new Date().toISOString().slice(0, 10),
    bankReference,
    basket: {
      symbol: request.basket,
      stablecoinAddress: request.stablecoinAddress,
      mintingConsumerAddress: request.mintingConsumerAddress,
    },
  };
}

/**
 * Runs CRE workflow simulation locally with --broadcast to submit real transactions
 */
function runCRESimulation(payload: object): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const projectRoot = process.env.CRE_PROJECT_ROOT || join(process.cwd(), '..');
    const workflowPath = process.env.CRE_WORKFLOW_PATH || join(projectRoot, 'bank-stablecoin-por-ace-ccip-workflow');
    const payloadJson = JSON.stringify(payload);

    // Write payload to temp file
    const tempPayloadPath = join(workflowPath, `temp-payload-${Date.now()}.json`);
    writeFileSync(tempPayloadPath, payloadJson);

    console.log(`[CRE Simulate] Project root: ${projectRoot}`);
    console.log(`[CRE Simulate] Workflow path: ${workflowPath}`);
    console.log(`[CRE Simulate] Payload: ${payloadJson}`);

    const args = [
      'workflow', 'simulate',
      workflowPath,
      '--project-root', projectRoot,
      '--target', 'staging-settings',
      '--http-payload', tempPayloadPath,
      '--broadcast',
      '--non-interactive',
      '--trigger-index', '0',
    ];

    console.log(`[CRE Simulate] Running: cre ${args.join(' ')}`);

    const proc = spawn('cre', args, {
      cwd: projectRoot,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      console.log(`[CRE stdout] ${chunk}`);
    });

    proc.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      console.error(`[CRE stderr] ${chunk}`);
    });

    proc.on('close', (code) => {
      // Clean up temp file
      try {
        unlinkSync(tempPayloadPath);
      } catch (e) {
        // ignore
      }

      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        resolve({ success: false, output: stdout, error: stderr || `Process exited with code ${code}` });
      }
    });

    proc.on('error', (err) => {
      // Clean up temp file
      try {
        unlinkSync(tempPayloadPath);
      } catch (e) {
        // ignore
      }
      resolve({ success: false, output: '', error: err.message });
    });
  });
}

/**
 * Parse CRE simulation output to extract transaction hash and result
 */
function parseSimulationOutput(output: string, request: MintRequest): MintResponse {
  // Look for transaction hash in output
  const txHashMatch = output.match(/0x[a-fA-F0-9]{64}/);
  const txHash = txHashMatch ? txHashMatch[0] : undefined;

  // Look for success indicators
  const isSuccess = output.includes('reportDelivered') ||
                    output.includes('Report delivered') ||
                    output.includes('MintExecuted') ||
                    (txHash && !output.includes('FAILED') && !output.includes('Error'));

  // Extract transaction ID
  const txIdMatch = output.match(/BSKT\d{8}[A-F0-9]{8}/);
  const transactionId = txIdMatch ? txIdMatch[0] : undefined;

  if (isSuccess && txHash) {
    return {
      success: true,
      transactionId,
      mintTransaction: txHash,
      beneficiary: request.beneficiary,
      amount: request.amount,
      basket: request.basket,
      message: `Minted ${request.amount} tokens to ${request.beneficiary}`,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
    };
  } else {
    // Try to extract error message
    const errorMatch = output.match(/Error:?\s*(.+)/i) || output.match(/FAILED[:\s]*(.+)/i);
    const errorMessage = errorMatch ? errorMatch[1].trim() : 'CRE simulation failed';

    return {
      success: false,
      error: 'CRE_SIMULATION_FAILED',
      message: errorMessage,
      beneficiary: request.beneficiary,
      basket: request.basket,
    };
  }
}

/**
 * Triggers the CRE workflow via local simulation with --broadcast
 */
export async function triggerCREWorkflow(request: MintRequest): Promise<MintResponse> {
  const payload = buildCREPayload(request);

  console.log('[CRE Workflow] Triggering local simulation with broadcast...');
  console.log('[CRE Workflow] Payload:', JSON.stringify(payload, null, 2));

  const result = await runCRESimulation(payload);

  if (result.success) {
    return parseSimulationOutput(result.output, request);
  } else {
    console.error('[CRE Workflow] Simulation failed:', result.error);
    return {
      success: false,
      error: 'CRE_SIMULATION_ERROR',
      message: result.error || 'Failed to run CRE simulation',
      beneficiary: request.beneficiary,
      basket: request.basket,
    };
  }
}

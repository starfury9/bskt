# BSKT Hackathon Build Plan (Frontend + Backend/Infra “What’s Required”)

This repo contains two pieces:

- `basket-contracts/` — Foundry project with the Basket factory + per-Basket stablecoin + ACE mint consumer
- `bank-stablecoin-por-ace-ccip-workflow/` — Chainlink CRE workflow that performs PoR validation + ACE-gated minting

We are **not** including CCIP in the first demo path. The demo is: **Factory → Create Basket instance → Update workflow config → Run CRE mint → Verify balance**.

---

## Architecture (High Level)

**On-chain (Sepolia)**
- `BasketFactory` creates a new instance:
  - `StablecoinERC20` (per Basket)
  - `MintingConsumerWithACE` (per Basket, behind `ERC1967Proxy`)
- Factory wires roles (grants mint/burn to consumer), then transfers stablecoin ownership to `admin`.

**Off-chain (CRE workflow)**
- HTTP trigger receives a “bank message” JSON payload.
- PoR check uses `mock-por-response.json` (hackathon mode).
- Workflow generates a DON-signed report and calls `MintingConsumerWithACE.onReport(...)`.
- ACE (PolicyEngine) enforces policy (blacklist) before mint executes.

**Key outcome**
- The same workflow can mint to **any** Basket instance (swap `stablecoinAddress` + `mintingConsumerAddress` in config).

---

## Current Deployments (FYI)

These will likely be re-deployed for hackathon fairness, but are useful to understand the flow:

- PolicyEngine (given): `0x697B79dFdbe5eD6f9d877bBeFac04d7A28be5CA1`
- Deployed Factory example: `0xC0e78dDCc5Ecc590e77A985Bca82122d52b0e092`

The workflow config that matters is:
`bank-stablecoin-por-ace-ccip-workflow/config.json`

---

# What’s Required: Backend / Infra (Holly’s lane)

### Goal
Make this project **production-grade from an infra standpoint** (secure-by-default, minimal footguns) while keeping the hackathon demo path fast.

## A) Deliverables (Backend/Infra)

1. **Developer Onboarding**
   - Confirm repo clone + prerequisites + env setup instructions
   - Optional: a `Makefile` or `justfile` for common commands

2. **Environment + Secrets Hygiene**
   - Ensure `.gitignore` covers:
     - `.env*`, `secrets.yaml`
     - `**/broadcast/`, `**/cache/`, `**/out/`
     - `node_modules/`
     - `basket-contracts/lib/`
   - Provide `.env.example` (never commit real keys)

3. **RPC / Provider Strategy**
   - Document provider limits and best practices:
     - avoid `eth_getLogs` wide-range calls on free tiers
     - prefer `cast receipt` parsing for demo
   - Recommend good defaults (Alchemy/Infura/QuickNode) for hackathon

4. **Workflow “Service” Pattern (Optional but strong)**
   - Wrap workflow trigger and verification into a small script:
     - `scripts/mint_demo.sh` or `scripts/mint_demo.ts`
   - Output should print:
     - workflow tx hash
     - stablecoin address
     - beneficiary balance after mint

5. **Security / Trust Story**
   - Clear explanation for judges:
     - ACE policies (blacklist) guard mint
     - PoR check gate
     - Factory reduces admin shortcuts by enforcing wiring on-chain
   - “What we’d do next” section:
     - replace mock PoR with real PoR API
     - strengthen policy set (volume caps, allowlists, KYB hooks, etc.)
     - move admin to multisig/DAO later

## B) Backend/Infra Immediate Tickets

- [ ] Create `docs/INFRA_OVERVIEW.md` (or Notion export) describing:
  - threat model (keys, policy engine permissions, mint paths)
  - operational runbook for demo
- [ ] Add `.env.example` for both:
  - `basket-contracts/`
  - `bank-stablecoin-por-ace-ccip-workflow/`
- [ ] Add `scripts/` folder:
  - `deploy_factory.sh`
  - `create_basket.sh`
  - `run_workflow.sh`
  - `verify_mint.sh`
- [ ] Provide “Demo-safe” commands (no wide `eth_getLogs`)
- [ ] Optional: GitHub Actions CI
  - run `forge fmt` + `forge test` on PR

---

# What’s Required: Frontend (dApp lane)

### Goal
A clean UI that lets a user:
1) create a new Basket stablecoin via Factory  
2) show the resulting addresses (stablecoin + mint consumer)  
3) request a mint (via workflow trigger) and show the minted balance  

We can keep the UI extremely simple for hackathon: **Create → Mint → Verify**.

## A) Deliverables (Frontend)

1. **Wallet + Network**
   - Connect wallet (MetaMask, etc.)
   - Require Sepolia network (or show “switch network” prompt)

2. **Create Basket UI**
   - Inputs:
     - `name` (e.g., “Basket USD”)
     - `symbol` (e.g., “bUSD”)
     - `admin` (default to connected wallet)
   - Calls:
     - `BasketFactory.createBasket(name, symbol, admin)`
   - Parse receipt logs and display:
     - stablecoin address
     - minting consumer address
   - Store the created addresses in UI state (and optionally localStorage)

3. **Mint Request UI**
   Two options (pick one for hackathon):
   - **Option 1 (recommended for hackathon):** call an API endpoint the team runs that triggers the CRE workflow
   - **Option 2 (advanced):** run CRE from a hosted runner (still typically server-side)

   UI inputs:
   - `amount` (e.g., 1000)
   - `beneficiary` (default to connected wallet)
   - (optional) `bankReference` (can auto-generate)

   Output:
   - show “report delivered” tx hash
   - show etherscan link

4. **Verify Balance UI**
   - Read from the created stablecoin:
     - `balanceOf(user)`
     - `totalSupply()`
   - Display human-readable (decimals = 18)

## B) Frontend Immediate Tickets

- [ ] Create Next.js (or Vite) app scaffold
- [ ] Add wagmi/viem + wallet connect
- [ ] Add `BasketFactory` ABI + address (env var)
- [ ] Implement “Create Basket” form + tx receipt parsing
- [ ] Implement “Mint” request form:
  - calls backend endpoint `POST /mint` (see below)
- [ ] Implement “Verify” section:
  - read ERC20 `balanceOf` and `totalSupply`

---

# Backend Endpoint for Frontend Mint (Recommended)

Because CRE workflow execution is not “just a contract call”, the simplest hackathon approach is a tiny backend service that:
- receives `{ stablecoinAddress, mintingConsumerAddress, beneficiary, amount }`
- updates the workflow config (or passes those addresses into the runner)
- runs the workflow trigger and returns:
  - report delivery tx hash
  - etherscan link

**Proposed API**
- `POST /mint`
  - body:
    ```json
    {
      "beneficiary": "0x...",
      "amount": "1000",
      "stablecoinAddress": "0x...",
      "mintingConsumerAddress": "0x..."
    }
    ```
  - response:
    ```json
    {
      "success": true,
      "mintTx": "0x...",
      "etherscan": "https://sepolia.etherscan.io/tx/0x..."
    }
    ```

This lets the frontend stay clean and keeps CRE execution server-side.

---

# Minimal “Demo Path” (What We Show Judges)

1) Deploy Factory (or use deployed)
2) User creates a Basket stablecoin (Factory emits addresses)
3) Trigger mint pipeline (PoR + ACE)
4) Verify beneficiary balance + total supply increased on new token

---

# Repo Layout

- `basket-contracts/`
  - `src/BasketFactory.sol`
  - `src/StablecoinERC20.sol`
  - `src/MintingConsumerWithACE.sol`
  - `script/DeployBasketFactory.s.sol`
- `bank-stablecoin-por-ace-ccip-workflow/`
  - `main.ts`
  - `config.json`
  - `http_trigger_payload.json`
  - `workflow.yaml`

---

# Notes / Constraints

- We are intentionally keeping the demo to **Sepolia + PoR + ACE mint** first.
- CCIP integration is optional later.
- Provider limitations: avoid wide-range `eth_getLogs` on free tier RPCs. Prefer parsing `cast receipt` or indexed event logs via Etherscan for demo.

---

# Who Owns What

**Backend/Infra (Holly)**
- onboarding, env/secrets, scripts, backend mint endpoint (recommended), security narrative

**Frontend Dev**
- wallet + create basket + mint request UI + balance verification UI

**Core Solidity (Anthony)**
- contracts + factory wiring, demo deploy flow, on-chain stability / correctness

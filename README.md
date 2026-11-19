# Penny

**Money between friends, settled in a second for about a cent.**

Penny is a Venmo-style P2P payments app. It feels like the apps people already use: a handle, a password, a feed, requests and splits. Underneath, every payment settles in USDC on [Arc](https://www.arc.network/), Circle's stablecoin-native L1. Users never see a seed phrase, a gas token or a bridge.

| | Penny | Venmo |
|---|---|---|
| When the money is actually yours | ~1 second, final | 1–3 business days to your bank |
| Instant access fee | ~1¢ network fee | 1.75% (min $0.25, max $25) |
| Pay someone who isn't on the app | ✅ pay links | ❌ |
| Works across borders | ✅ | ❌ US only |

## Features

- **Pay & request by @handle.** Notes, quick-pick emoji, and a live estimate of what the same transfer would cost to cash out instantly on Venmo.
- **Real receipts.** Every receipt shows the *measured* settle time (submit → confirmed), the exact network fee paid in USDC, and the Venmo comparison, with a link to the transaction on the explorer.
- **Pay links.** Send money to anyone with a link, even if they aren't on Penny. The claim key is generated in the sender's browser and lives only in the URL fragment, so the server never sees it. The recipient signs up in about 10 seconds and claims for free (Penny relays the claim and covers the fee). Unclaimed money can be refunded by the sender, and anyone can trigger the refund after 7 days.
- **Bill splits.** Split evenly or with custom amounts. The split and each person's share are recorded onchain. Everyone pays their share in one tap and the creator watches a progress bar fill up.
- **No-crypto onboarding.** Signing up creates an embedded wallet and drops in a welcome bonus. Fees come out of the same USDC balance, because on Arc USDC *is* the gas token.
- **Your stats.** The home screen tracks the fees you skipped compared with Venmo Instant Transfer and your average settle time.
- **Pay-me QR.** Every profile has a QR code and link that opens the Pay screen with you already filled in.

## How Penny uses Arc

Arc uses USDC as its native gas token, which is why the product works the way it does:

1. **One balance, predictable fees.** Users hold only USDC. Payments, splits and links are paid for in that same balance, at a fee that's denominated in dollars (around a cent) instead of a volatile token. The receipt shows the exact `gasUsed × effectiveGasPrice` in USDC.
2. **Sub-second finality.** Arc's deterministic finality is what makes the receipt's "Settled in 0.4s · Final" claim true. There's no "pending" state.
3. **Onchain logic in `Penny.sol`** ([contracts/contracts/Penny.sol](contracts/contracts/Penny.sol)), deployed with Hardhat:

| Function | What it does |
|---|---|
| `pay(to, memo)` | Forwards native USDC and emits a `Payment` event with the note |
| `createLink(claimKey, expiresAt, memo)` | Escrows USDC behind a one-time claim key |
| `claimLink(claimKey, to, signature)` | Anyone can relay. The claim key's signature pins the recipient, so a claim can't be front-run or redirected |
| `cancelLink(claimKey)` | The sender can refund at any time; after expiry, anyone can trigger the refund to the sender |
| `createSplit(debtors, amounts, memo)` / `paySplit(id)` | Records who owes what and forwards each share to the creator |

**Contract address (Arc Testnet):** `PENNY_CONTRACT_ADDRESS` ← *fill in after deploying (see below)*

Chain: Arc Testnet · chain ID `5042002` · RPC `https://rpc.testnet.arc.network` · explorer [testnet.arcscan.app](https://testnet.arcscan.app)

## Architecture

```
web/        Next.js 15 (App Router) + Tailwind v4 + viem
  src/lib/services.ts   business logic: signup, pay, requests, links, splits
  src/lib/chain.ts      viem clients, tx sending with settle-time measurement, revert decoding
  src/app/(app)/        logged-in screens: home, pay, receipt, splits, links, me
  src/app/claim/        public pay-link claim page (keys stay client-side)
contracts/  Hardhat project: Penny.sol + tests + deploy script
```

- **Wallets.** Each user gets an EOA at sign-up. The private key is encrypted with AES-256-GCM and the server signs on the user's behalf, which is what keeps the experience free of seed phrases. For production, this layer would be replaced by [Circle Developer-Controlled Wallets](https://developers.circle.com/w3s/developer-controlled-wallets) or passkey smart accounts. The interface (`send(privateKey, tx)`) is deliberately narrow so that swap is contained.
- **Data.** User profiles, requests and the activity index live in a JSON file (`DATA_DIR/db.json`). Money and its state live onchain.
- **Treasury.** An optional funded wallet sends welcome bonuses and relays pay-link claims, so new users never need funds to receive.

## Running it

Everything runs in Docker. Nothing needs to be installed on the host.

### Local demo (no setup)

```bash
docker compose up --build
```

This starts an in-memory devnet, deploys `Penny.sol`, and serves the app at **http://localhost:3000**. New accounts get 100 test USDC. To try P2P, open a second browser profile or a private window and create another account.

### Arc Testnet

1. `cp .env.example .env`, then set `DEPLOYER_PRIVATE_KEY`, `SESSION_SECRET` and `KEY_ENCRYPTION_SECRET`. Fund the deployer (and optionally a treasury wallet) at [faucet.circle.com](https://faucet.circle.com).
2. Deploy the contract:
   ```bash
   docker compose -f docker-compose.arc.yml --profile deploy run --rm deploy
   ```
3. Put the printed address in `.env` as `PENNY_CONTRACT_ADDRESS` (and in this README), then run:
   ```bash
   docker compose -f docker-compose.arc.yml up --build web
   ```

### Contract tests

```bash
docker build -t penny-contracts ./contracts && docker run --rm penny-contracts
```

## Caveats

- Fee comparisons use Venmo's published Instant Transfer pricing (1.75%, min $0.25, max $25). Sending from a Venmo balance is free; the cost shows up when you need the money in your bank quickly. Moving USDC to a bank account through an off-ramp also has its own costs, which Penny doesn't model.
- Server-held keys are a hackathon shortcut (see Wallets above). Don't put real funds in this deployment.

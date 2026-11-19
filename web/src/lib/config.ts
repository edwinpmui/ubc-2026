import type { Address, Hex } from "viem";

const ARC_TESTNET_CHAIN_ID = 5042002;

export const config = {
  rpcUrl: process.env.RPC_URL || "https://rpc.testnet.arc.network",
  chainId: Number(process.env.CHAIN_ID || ARC_TESTNET_CHAIN_ID),
  pennyAddress: (process.env.PENNY_CONTRACT_ADDRESS || "") as Address | "",
  explorerUrl: process.env.EXPLORER_URL ?? "https://testnet.arcscan.app",
  treasuryKey: (process.env.TREASURY_PRIVATE_KEY || "") as Hex | "",
  welcomeBonus: process.env.WELCOME_BONUS || "25",
  sessionSecret: process.env.SESSION_SECRET || "dev-only-session-secret-change-me",
  keySecret: process.env.KEY_ENCRYPTION_SECRET || "dev-only-key-secret-change-me",
  secureCookies: process.env.SECURE_COOKIES === "true",
  dataDir: process.env.DATA_DIR || ".data",
};

export const isArc = config.chainId === ARC_TESTNET_CHAIN_ID;
export const networkName = isArc ? "Arc Testnet" : "Local devnet";

export function txUrl(hash: string) {
  return config.explorerUrl ? `${config.explorerUrl}/tx/${hash}` : null;
}

export function addressUrl(address: string) {
  return config.explorerUrl ? `${config.explorerUrl}/address/${address}` : null;
}

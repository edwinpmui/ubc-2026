import {
  BaseError,
  InsufficientFundsError,
  createPublicClient,
  createWalletClient,
  decodeErrorResult,
  defineChain,
  formatUnits,
  http,
  isHex,
  parseAbi,
  type Address,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config, networkName } from "./config";

export const pennyAbi = parseAbi([
  "function pay(address to, string memo) payable",
  "function createLink(address claimKey, uint64 expiresAt, string memo) payable",
  "function claimLink(address claimKey, address to, bytes signature)",
  "function cancelLink(address claimKey)",
  "function createSplit(address[] debtors, uint256[] amounts, string memo) returns (uint256)",
  "function paySplit(uint256 id) payable",
  "event SplitCreated(uint256 indexed id, address indexed creator, uint256 total, string memo)",
  "error ZeroAmount()",
  "error InvalidLink()",
  "error LinkExpired()",
  "error BadSignature()",
  "error NotAllowed()",
  "error BadSplit()",
  "error WrongAmount()",
  "error TransferFailed()",
]);

const revertMessages: Record<string, string> = {
  ZeroAmount: "Amount must be more than $0.",
  InvalidLink: "This pay link is no longer active.",
  LinkExpired: "This pay link has expired.",
  BadSignature: "This pay link is invalid.",
  NotAllowed: "You're not allowed to do that.",
  BadSplit: "That split doesn't add up.",
  WrongAmount: "The amount doesn't match what's owed.",
  TransferFailed: "The transfer couldn't be completed.",
};

export const chain = defineChain({
  id: config.chainId,
  name: networkName,
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
});

export const publicClient = createPublicClient({ chain, transport: http(config.rpcUrl) });

const queues = new Map<string, Promise<unknown>>();

function serialize<T>(key: string, task: () => Promise<T>): Promise<T> {
  const next = (queues.get(key) ?? Promise.resolve()).catch(() => {}).then(task);
  queues.set(key, next);
  return next;
}

export interface Settlement {
  hash: Hex;
  receipt: TransactionReceipt;
  settleMs: number;
  feeUsd: number;
}

export function send(privateKey: Hex, tx: { to: Address; data?: Hex; value?: bigint }): Promise<Settlement> {
  const account = privateKeyToAccount(privateKey);
  const wallet = createWalletClient({ account, chain, transport: http(config.rpcUrl) });

  return serialize(account.address, async () => {
    const started = performance.now();
    const hash = await wallet.sendTransaction(tx);
    const receipt = await publicClient.waitForTransactionReceipt({ hash, pollingInterval: 150 });
    const settleMs = Math.round(performance.now() - started);
    if (receipt.status !== "success") throw new Error("The transaction was reverted.");
    const feeUsd = Number(formatUnits(receipt.gasUsed * receipt.effectiveGasPrice, 18));
    return { hash, receipt, settleMs, feeUsd };
  });
}

export async function balanceOf(address: Address) {
  return publicClient.getBalance({ address });
}

export function friendlyError(err: unknown) {
  if (!(err instanceof BaseError)) return "Something went wrong. Please try again.";
  if (err.walk((e) => e instanceof InsufficientFundsError)) {
    return "Not enough USDC to cover this and the network fee.";
  }
  const candidates: unknown[] = [];
  const text: string[] = [];
  err.walk((e) => {
    const node = e as { data?: unknown; details?: string; message?: string };
    candidates.push(node.data, (node.data as { data?: unknown } | undefined)?.data);
    text.push(node.details ?? "", node.message ?? "");
    return false;
  });

  for (const data of candidates) {
    if (!isHex(data)) continue;
    try {
      const { errorName } = decodeErrorResult({ abi: pennyAbi, data });
      return revertMessages[errorName] ?? errorName;
    } catch {}
  }
  const named = Object.keys(revertMessages).find((name) => text.some((t) => t.includes(`${name}()`)));
  return named ? revertMessages[named] : err.shortMessage;
}

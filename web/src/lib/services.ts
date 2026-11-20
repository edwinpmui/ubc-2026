import { randomUUID } from "node:crypto";
import {
  encodeFunctionData,
  formatUnits,
  isAddress,
  isHex,
  parseEventLogs,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { balanceOf, pennyAbi, send, type Settlement } from "./chain";
import { config } from "./config";
import { decryptKey, encryptKey, hashPassword, verifyPassword } from "./crypto";
import { read, write } from "./db";
import { AppError } from "./errors";
import { venmoInstantFee } from "./format";
import {
  fromCents,
  netBalances,
  resolveSplit,
  simplifyDebts,
  toCents,
  type Portion,
  type SplitMode,
} from "./ledger";
import type { Activity, Group, GroupExpense, PayLink, PublicUser, Split, User } from "./types";

const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;
const AMOUNT_PATTERN = /^\d{1,6}(\.\d{1,2})?$/;
const LINK_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

const toWei = (amount: string) => parseUnits(amount, 18);

export function publicUser({ id, handle, name, address }: User): PublicUser {
  return { id, handle, name, address };
}

function normalizeHandle(handle: string) {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

function requireAmount(input: string) {
  const value = String(input ?? "").trim();
  if (!AMOUNT_PATTERN.test(value) || Number(value) <= 0) throw new AppError("Enter an amount like 12.50.");
  return Number(value).toFixed(2);
}

function cleanMemo(memo: string) {
  return String(memo ?? "").trim().slice(0, 140);
}

function contract(): Address {
  if (!config.pennyAddress) throw new AppError("The Penny contract address isn't configured.", 500);
  return config.pennyAddress;
}

function findUser(id: string) {
  return read((db) => db.users.find((u) => u.id === id));
}

function findByHandle(handle: string) {
  const normalized = normalizeHandle(handle);
  return read((db) => db.users.find((u) => u.handle === normalized));
}

async function ensureFunds(user: User, amount: string) {
  const balance = await balanceOf(user.address);
  if (balance < toWei(amount)) {
    throw new AppError(`Not enough USDC. Your balance is $${Number(formatUnits(balance, 18)).toFixed(2)}.`);
  }
}

function record(entry: Omit<Activity, "id" | "createdAt" | "txHash" | "feeUsd" | "settleMs">, settled: Settlement) {
  const activity: Activity = {
    id: randomUUID(),
    createdAt: Date.now(),
    txHash: settled.hash,
    feeUsd: settled.feeUsd,
    settleMs: settled.settleMs,
    ...entry,
  };
  write((db) => db.activity.push(activity));
  return activity;
}

export async function signup(input: { handle: string; name: string; password: string }) {
  const handle = normalizeHandle(input.handle ?? "");
  const name = String(input.name ?? "").trim().slice(0, 40);
  const password = String(input.password ?? "");
  if (!HANDLE_PATTERN.test(handle)) throw new AppError("Handles are 3–20 lowercase letters, numbers or underscores.");
  if (!name) throw new AppError("Tell us your name.");
  if (password.length < 8) throw new AppError("Use at least 8 characters for your password.");

  const privateKey = generatePrivateKey();
  const user: User = {
    id: randomUUID(),
    handle,
    name,
    address: privateKeyToAccount(privateKey).address,
    passwordHash: hashPassword(password),
    encryptedKey: encryptKey(privateKey),
    createdAt: Date.now(),
  };

  write((db) => {
    if (db.users.some((u) => u.handle === handle)) throw new AppError("That handle is taken.");
    db.users.push(user);
  });

  await sendWelcomeBonus(user).catch((err) => console.error("Welcome bonus failed:", err));
  return user;
}

async function sendWelcomeBonus(user: User) {
  if (!config.treasuryKey || Number(config.welcomeBonus) <= 0) return;
  const amount = Number(config.welcomeBonus).toFixed(2);
  const settled = await send(config.treasuryKey, { to: user.address, value: toWei(amount) });
  record(
    { kind: "welcome", fromId: null, toId: user.id, amount, memo: "Welcome to Penny 🎉", sponsored: true },
    settled,
  );
}

export function login(input: { handle: string; password: string }) {
  const user = findByHandle(input.handle ?? "");
  if (!user || !verifyPassword(String(input.password ?? ""), user.passwordHash)) {
    throw new AppError("That handle and password don't match.");
  }
  return user;
}

export function searchUsers(query: string, viewer: User) {
  const q = normalizeHandle(query);
  return read((db) =>
    db.users
      .filter((u) => u.id !== viewer.id)
      .filter((u) => !q || u.handle.includes(q) || u.name.toLowerCase().includes(q))
      .slice(0, 8)
      .map(publicUser),
  );
}

export async function pay(user: User, input: { to: string; amount: string; memo: string; requestId?: string }) {
  const amount = requireAmount(input.amount);
  const memo = cleanMemo(input.memo);
  const recipient = findByHandle(input.to ?? "");
  if (!recipient) throw new AppError("We couldn't find that person.");
  if (recipient.id === user.id) throw new AppError("You can't pay yourself.");

  if (input.requestId) {
    const request = read((db) => db.requests.find((r) => r.id === input.requestId));
    if (!request || request.payerId !== user.id || request.requesterId !== recipient.id || request.status !== "open") {
      throw new AppError("That request is no longer open.");
    }
    if (request.amount !== amount) throw new AppError("The amount doesn't match the request.");
  }

  await ensureFunds(user, amount);
  const settled = await send(decryptKey(user.encryptedKey), {
    to: contract(),
    data: encodeFunctionData({ abi: pennyAbi, functionName: "pay", args: [recipient.address, memo] }),
    value: toWei(amount),
  });
  const activity = record(
    { kind: "payment", fromId: user.id, toId: recipient.id, amount, memo, sponsored: false, ref: input.requestId },
    settled,
  );

  if (input.requestId) {
    write((db) => {
      const request = db.requests.find((r) => r.id === input.requestId);
      if (request) request.status = "paid";
    });
  }
  return activity;
}

export function createRequest(user: User, input: { from: string; amount: string; memo: string }) {
  const amount = requireAmount(input.amount);
  const payer = findByHandle(input.from ?? "");
  if (!payer) throw new AppError("We couldn't find that person.");
  if (payer.id === user.id) throw new AppError("You can't request money from yourself.");

  const request = {
    id: randomUUID(),
    requesterId: user.id,
    payerId: payer.id,
    amount,
    memo: cleanMemo(input.memo),
    status: "open" as const,
    createdAt: Date.now(),
  };
  write((db) => db.requests.push(request));
  return request;
}

export function declineRequest(user: User, requestId: string) {
  write((db) => {
    const request = db.requests.find((r) => r.id === requestId);
    if (!request || request.status !== "open") throw new AppError("That request is no longer open.");
    if (request.payerId !== user.id && request.requesterId !== user.id) throw new AppError("Not your request.", 403);
    request.status = "declined";
  });
}

export async function createLink(user: User, input: { claimAddress: string; amount: string; memo: string }) {
  const amount = requireAmount(input.amount);
  const memo = cleanMemo(input.memo);
  if (!isAddress(input.claimAddress ?? "")) throw new AppError("Invalid link key.");
  const claimAddress = input.claimAddress as Address;
  if (read((db) => db.links.some((l) => l.claimAddress.toLowerCase() === claimAddress.toLowerCase()))) {
    throw new AppError("That link already exists.");
  }

  await ensureFunds(user, amount);
  const expiresAt = Date.now() + LINK_LIFETIME_MS;
  const settled = await send(decryptKey(user.encryptedKey), {
    to: contract(),
    data: encodeFunctionData({
      abi: pennyAbi,
      functionName: "createLink",
      args: [claimAddress, BigInt(Math.floor(expiresAt / 1000)), memo],
    }),
    value: toWei(amount),
  });

  const link: PayLink = {
    claimAddress,
    senderId: user.id,
    amount,
    memo,
    expiresAt,
    status: "open",
    createdAt: Date.now(),
    txHash: settled.hash,
  };
  write((db) => db.links.push(link));
  return record(
    { kind: "link_sent", fromId: user.id, toId: null, amount, memo, sponsored: false, ref: claimAddress },
    settled,
  );
}

export function findLink(claimAddress: string) {
  return read((db) => db.links.find((l) => l.claimAddress.toLowerCase() === claimAddress.toLowerCase()));
}

export async function claimLink(user: User, claimAddress: string, signature: string) {
  const link = findLink(claimAddress);
  if (!link || link.status !== "open") throw new AppError("This pay link is no longer active.");
  if (link.expiresAt < Date.now()) throw new AppError("This pay link has expired.");
  if (link.senderId === user.id) throw new AppError("This is your own link. Cancel it to get the money back.");
  if (!isHex(signature)) throw new AppError("This pay link is invalid.");

  const relayerKey = config.treasuryKey || decryptKey(user.encryptedKey);
  const settled = await send(relayerKey, {
    to: contract(),
    data: encodeFunctionData({
      abi: pennyAbi,
      functionName: "claimLink",
      args: [link.claimAddress, user.address, signature as Hex],
    }),
  });

  write((db) => {
    const stored = db.links.find((l) => l.claimAddress === link.claimAddress)!;
    stored.status = "claimed";
    stored.claimerId = user.id;
  });
  return record(
    {
      kind: "link_claimed",
      fromId: link.senderId,
      toId: user.id,
      amount: link.amount,
      memo: link.memo,
      sponsored: Boolean(config.treasuryKey),
      ref: link.claimAddress,
    },
    settled,
  );
}

export async function cancelLink(user: User, claimAddress: string) {
  const link = findLink(claimAddress);
  if (!link || link.senderId !== user.id) throw new AppError("Link not found.", 404);
  if (link.status !== "open") throw new AppError("This link is no longer active.");

  const settled = await send(decryptKey(user.encryptedKey), {
    to: contract(),
    data: encodeFunctionData({ abi: pennyAbi, functionName: "cancelLink", args: [link.claimAddress] }),
  });
  write((db) => {
    db.links.find((l) => l.claimAddress === link.claimAddress)!.status = "cancelled";
  });
  return record(
    {
      kind: "link_refunded",
      fromId: null,
      toId: user.id,
      amount: link.amount,
      memo: link.memo,
      sponsored: false,
      ref: link.claimAddress,
    },
    settled,
  );
}

export async function createSplit(
  user: User,
  input: { memo: string; myShare: string; shares: { handle: string; amount: string }[] },
) {
  const memo = cleanMemo(input.memo);
  if (!memo) throw new AppError("Give the split a name, like “Sushi night”.");
  const myShare = Number(input.myShare) > 0 ? requireAmount(input.myShare) : "0.00";
  if (!Array.isArray(input.shares) || input.shares.length === 0) throw new AppError("Add at least one friend.");

  const seen = new Set<string>();
  const shares = input.shares.map((share) => {
    const member = findByHandle(share.handle ?? "");
    if (!member) throw new AppError(`We couldn't find @${normalizeHandle(share.handle ?? "")}.`);
    if (member.id === user.id) throw new AppError("You're already in the split.");
    if (seen.has(member.id)) throw new AppError(`@${member.handle} is in the split twice.`);
    seen.add(member.id);
    return { member, amount: requireAmount(share.amount) };
  });

  const settled = await send(decryptKey(user.encryptedKey), {
    to: contract(),
    data: encodeFunctionData({
      abi: pennyAbi,
      functionName: "createSplit",
      args: [shares.map((s) => s.member.address), shares.map((s) => toWei(s.amount)), memo],
    }),
  });
  const [event] = parseEventLogs({ abi: pennyAbi, eventName: "SplitCreated", logs: settled.receipt.logs });

  const split: Split = {
    id: Number(event.args.id),
    creatorId: user.id,
    memo,
    creatorShare: myShare,
    shares: shares.map((s) => ({ userId: s.member.id, amount: s.amount })),
    createdAt: Date.now(),
    txHash: settled.hash,
  };
  write((db) => db.splits.push(split));
  return split;
}

export async function paySplit(user: User, splitId: number) {
  const split = read((db) => db.splits.find((s) => s.id === splitId));
  const share = split?.shares.find((s) => s.userId === user.id);
  if (!split || !share) throw new AppError("You're not part of this split.", 404);
  if (share.activityId) throw new AppError("You've already paid your share.");

  await ensureFunds(user, share.amount);
  const settled = await send(decryptKey(user.encryptedKey), {
    to: contract(),
    data: encodeFunctionData({ abi: pennyAbi, functionName: "paySplit", args: [BigInt(split.id)] }),
    value: toWei(share.amount),
  });
  const activity = record(
    {
      kind: "split_paid",
      fromId: user.id,
      toId: split.creatorId,
      amount: share.amount,
      memo: split.memo,
      sponsored: false,
      ref: String(split.id),
    },
    settled,
  );
  write((db) => {
    db.splits.find((s) => s.id === split.id)!.shares.find((s) => s.userId === user.id)!.activityId = activity.id;
  });
  return activity;
}

export async function safeBalance(address: Address) {
  try {
    return Number(formatUnits(await balanceOf(address), 18));
  } catch (err) {
    console.error("Balance lookup failed:", err);
    return null;
  }
}

export function userDirectory() {
  return read((db) => new Map(db.users.map((u) => [u.id, publicUser(u)])));
}

export function activityFor(user: User) {
  return read((db) =>
    db.activity
      .filter((a) => a.fromId === user.id || a.toId === user.id)
      .sort((a, b) => b.createdAt - a.createdAt),
  );
}

export function statsFor(user: User) {
  const activity = activityFor(user);
  const received = activity.filter(
    (a) => a.toId === user.id && ["payment", "link_claimed", "split_paid", "group_settled"].includes(a.kind),
  );
  const feesAvoided = received.reduce((sum, a) => sum + venmoInstantFee(Number(a.amount)), 0);
  const avgSettleMs = activity.length ? activity.reduce((sum, a) => sum + a.settleMs, 0) / activity.length : 0;
  const feesPaid = activity.filter((a) => a.fromId === user.id && !a.sponsored).reduce((s, a) => s + a.feeUsd, 0);
  return { feesAvoided, avgSettleMs, feesPaid, count: activity.length };
}

export function openRequestsFor(user: User) {
  return read((db) => ({
    incoming: db.requests.filter((r) => r.payerId === user.id && r.status === "open"),
    outgoing: db.requests.filter((r) => r.requesterId === user.id && r.status === "open"),
  }));
}

export function splitsFor(user: User) {
  return read((db) =>
    db.splits
      .filter((s) => s.creatorId === user.id || s.shares.some((sh) => sh.userId === user.id))
      .sort((a, b) => b.createdAt - a.createdAt),
  );
}

export function linksFor(user: User) {
  return read((db) => db.links.filter((l) => l.senderId === user.id).sort((a, b) => b.createdAt - a.createdAt));
}

// ---------------------------------------------------------------------------
// Groups: shared expenses with multiple payers, partial participation and
// minimal settle-up. Expenses live offchain (free to add and edit); settling
// up is a real onchain `pay()` from each debtor straight to their creditor.
// ---------------------------------------------------------------------------

const settling = new Set<string>();

function requireMember(user: User, groupId: string) {
  const group = read((db) => db.groups.find((g) => g.id === groupId));
  if (!group || !group.memberIds.includes(user.id)) throw new AppError("We couldn't find that group.", 404);
  return group;
}

function updateGroup(groupId: string, fn: (group: Group) => void) {
  write((db) => {
    const group = db.groups.find((g) => g.id === groupId);
    if (!group) throw new AppError("We couldn't find that group.", 404);
    fn(group);
  });
}

export function groupSummary(group: Group) {
  const balances = netBalances(group.memberIds, group.expenses, group.settlements);
  const plan = simplifyDebts(balances);
  const totalCents = group.expenses.reduce((sum, e) => sum + e.totalCents, 0);
  return { balances, plan, totalCents, settled: group.expenses.length > 0 && plan.length === 0 };
}

export function groupsFor(user: User) {
  return read((db) =>
    db.groups.filter((g) => g.memberIds.includes(user.id)).sort((a, b) => b.createdAt - a.createdAt),
  );
}

export function groupFor(user: User, groupId: string) {
  return requireMember(user, groupId);
}

export function createGroup(user: User, input: { name: string; handles: string[] }) {
  const name = cleanMemo(input.name).slice(0, 60);
  if (!name) throw new AppError("Name the group, like “Whistler trip”.");
  const memberIds = [user.id];
  for (const handle of Array.isArray(input.handles) ? input.handles : []) {
    const member = findByHandle(handle ?? "");
    if (!member) throw new AppError(`We couldn't find @${normalizeHandle(handle ?? "")}.`);
    if (!memberIds.includes(member.id)) memberIds.push(member.id);
  }
  if (memberIds.length < 2) throw new AppError("Add at least one friend.");

  const group: Group = {
    id: randomUUID(),
    name,
    creatorId: user.id,
    memberIds,
    expenses: [],
    settlements: [],
    createdAt: Date.now(),
  };
  write((db) => db.groups.push(group));
  return group;
}

export function addGroupMember(user: User, groupId: string, handle: string) {
  requireMember(user, groupId);
  const member = findByHandle(handle ?? "");
  if (!member) throw new AppError(`We couldn't find @${normalizeHandle(handle ?? "")}.`);
  updateGroup(groupId, (group) => {
    if (group.memberIds.includes(member.id)) throw new AppError(`@${member.handle} is already in the group.`);
    group.memberIds.push(member.id);
  });
  return publicUser(member);
}

export interface ExpenseInput {
  description: string;
  total: string;
  paidBy: { userId: string; amount: string }[];
  mode: SplitMode;
  splitAmong: { userId: string; value?: string }[];
}

/**
 * Removed members keep their place in old expenses, so any change must leave them square.
 * Otherwise they'd owe (or be owed) money in a group they can no longer see.
 */
function assertFormerMembersSquare(group: Group) {
  const { balances } = groupSummary(group);
  for (const [id, cents] of balances) {
    if (!group.memberIds.includes(id) && cents !== 0) {
      throw new AppError(`That would change the balance of ${findUser(id)?.name ?? "someone"}, who has left the group.`);
    }
  }
}

function requireExpenseEditor(user: User, group: Group, expenseId: string) {
  const expense = group.expenses.find((e) => e.id === expenseId);
  if (!expense) throw new AppError("That expense is already gone.", 404);
  if (expense.addedById !== user.id && group.creatorId !== user.id) {
    throw new AppError("Only whoever added it (or the group owner) can change it.", 403);
  }
  return expense;
}

export function addGroupExpense(user: User, groupId: string, input: ExpenseInput) {
  const group = requireMember(user, groupId);
  const expense: GroupExpense = {
    id: randomUUID(),
    ...buildExpense(group, input),
    addedById: user.id,
    createdAt: Date.now(),
  };
  updateGroup(groupId, (g) => g.expenses.push(expense));
  return expense;
}

export function updateGroupExpense(user: User, groupId: string, expenseId: string, input: ExpenseInput) {
  const group = requireMember(user, groupId);
  const existing = requireExpenseEditor(user, group, expenseId);
  const updated: GroupExpense = { ...existing, ...buildExpense(group, input, existing), editedAt: Date.now() };
  if (!updated.weights) delete updated.weights;
  assertFormerMembersSquare({ ...group, expenses: group.expenses.map((e) => (e.id === expenseId ? updated : e)) });
  updateGroup(groupId, (g) => {
    g.expenses = g.expenses.map((e) => (e.id === expenseId ? updated : e));
  });
  return updated;
}

/** `existing` lets an edit keep people who have since left; assertFormerMembersSquare guards their balance. */
function buildExpense(group: Group, input: ExpenseInput, existing?: GroupExpense) {
  const description = cleanMemo(input.description).slice(0, 80);
  if (!description) throw new AppError("What was it for? e.g. “Hotel”.");
  const totalCents = toCents(requireAmount(input.total));
  const allowed = new Set([
    ...group.memberIds,
    ...(existing ? [...existing.paidBy, ...existing.splitAmong].map((p) => p.userId) : []),
  ]);
  const isMember = (id: string) => allowed.has(id);

  // Who paid: one or more members whose amounts add up to the total.
  const payers = Array.isArray(input.paidBy) ? input.paidBy : [];
  if (payers.length === 0) throw new AppError("Who paid?");
  const paidBy: Portion[] = payers.map((p) => {
    if (!isMember(p.userId)) throw new AppError("Everyone who paid must be in the group.");
    return { userId: p.userId, cents: toCents(requireAmount(p.amount)) };
  });
  if (new Set(paidBy.map((p) => p.userId)).size !== paidBy.length) {
    throw new AppError("Someone is listed as paying twice.");
  }
  const paidSum = paidBy.reduce((sum, p) => sum + p.cents, 0);
  if (paidSum !== totalCents) {
    throw new AppError(`Payments add up to $${fromCents(paidSum)}, not $${fromCents(totalCents)}.`);
  }

  // Who it's for: resolved to cents on the server so the client can't skew the math.
  const mode: SplitMode = ["equal", "exact", "shares"].includes(input.mode) ? input.mode : "equal";
  const among = Array.isArray(input.splitAmong) ? input.splitAmong : [];
  if (among.some((p) => !isMember(p.userId))) throw new AppError("Everyone in the split must be in the group.");
  const values = among.map((p) => (mode === "exact" ? toCents(requireAmount(p.value ?? "")) : Number(p.value)));
  let splitAmong: Portion[];
  try {
    splitAmong = resolveSplit(totalCents, mode, among.map((p) => p.userId), values);
  } catch (err) {
    throw new AppError((err as Error).message);
  }

  return {
    description,
    totalCents,
    paidBy,
    splitMode: mode,
    splitAmong,
    weights: mode === "shares" ? Object.fromEntries(among.map((p, i) => [p.userId, values[i]])) : undefined,
  };
}

export function deleteGroupExpense(user: User, groupId: string, expenseId: string) {
  const group = requireMember(user, groupId);
  requireExpenseEditor(user, group, expenseId);
  assertFormerMembersSquare({ ...group, expenses: group.expenses.filter((e) => e.id !== expenseId) });
  updateGroup(groupId, (g) => {
    g.expenses = g.expenses.filter((e) => e.id !== expenseId);
  });
}

/** The owner can remove anyone else; anyone but the owner can leave. Only people who are square can go. */
export function removeGroupMember(user: User, groupId: string, memberId: string) {
  const group = requireMember(user, groupId);
  const leaving = memberId === user.id;
  if (!group.memberIds.includes(memberId)) throw new AppError("They're not in this group.", 404);
  if (memberId === group.creatorId) throw new AppError("The group owner can't leave their own group.");
  if (!leaving && user.id !== group.creatorId) throw new AppError("Only the group owner can remove people.", 403);

  const cents = groupSummary(group).balances.get(memberId) ?? 0;
  if (cents !== 0) {
    const who = leaving ? "You" : (findUser(memberId)?.name ?? "They");
    const owes = leaving ? "owe" : "owes";
    const gets = leaving ? "are owed" : "is owed";
    throw new AppError(
      `${who} ${cents < 0 ? owes : gets} $${fromCents(Math.abs(cents))}. Settle up first, then try again.`,
    );
  }
  updateGroup(groupId, (g) => {
    g.memberIds = g.memberIds.filter((id) => id !== memberId);
  });
}

async function withSettleLock<T>(user: User, groupId: string, fn: () => Promise<T>) {
  const lock = `${groupId}:${user.id}`;
  if (settling.has(lock)) throw new AppError("You're already settling up. Hang tight.");
  settling.add(lock);
  try {
    return await fn();
  } finally {
    settling.delete(lock);
  }
}

/** One onchain `pay()` for one transfer in the plan, recorded in the activity feed and the group ledger. */
async function payTransfer(user: User, group: Group, toId: string, cents: number) {
  const recipient = findUser(toId);
  if (!recipient) throw new AppError("We couldn't find that person.");
  const amount = fromCents(cents);
  const memo = cleanMemo(`${group.name} · settle up`);
  const settled = await send(decryptKey(user.encryptedKey), {
    to: contract(),
    data: encodeFunctionData({ abi: pennyAbi, functionName: "pay", args: [recipient.address, memo] }),
    value: toWei(amount),
  });
  const activity = record(
    { kind: "group_settled", fromId: user.id, toId, amount, memo, sponsored: false, ref: `group:${group.id}` },
    settled,
  );
  updateGroup(group.id, (g) =>
    g.settlements.push({ id: randomUUID(), fromId: user.id, toId, cents, activityId: activity.id, createdAt: Date.now() }),
  );
  return activity;
}

export async function settleGroupDebt(user: User, groupId: string, toId: string) {
  return withSettleLock(user, groupId, async () => {
    const group = requireMember(user, groupId);
    const transfer = groupSummary(group).plan.find((t) => t.fromId === user.id && t.toId === toId);
    if (!transfer) throw new AppError("You don't owe them anything right now.");
    await ensureFunds(user, fromCents(transfer.cents));
    return payTransfer(user, group, toId, transfer.cents);
  });
}

/**
 * Pay everyone you owe in the group, one onchain payment each. Funds are checked for the full amount
 * first so a settle-up doesn't stop halfway for lack of money. A single payment returns its activity
 * (so the client can show the receipt); several return a summary.
 */
export async function settleAllGroupDebts(user: User, groupId: string) {
  return withSettleLock(user, groupId, async () => {
    const group = requireMember(user, groupId);
    const mine = groupSummary(group).plan.filter((t) => t.fromId === user.id);
    if (mine.length === 0) throw new AppError("You don't owe anyone in this group.");
    const totalCents = mine.reduce((sum, t) => sum + t.cents, 0);
    await ensureFunds(user, fromCents(totalCents));

    const paid: Activity[] = [];
    for (const t of mine) {
      try {
        paid.push(await payTransfer(user, group, t.toId, t.cents));
      } catch (err) {
        if (paid.length === 0) throw err;
        const done = paid.map((a) => `$${a.amount} to ${findUser(a.toId ?? "")?.name ?? "someone"}`).join(", ");
        throw new AppError(`Paid ${done}, but the next payment failed. Tap Settle up again to finish.`);
      }
    }
    if (paid.length === 1) return paid[0];
    return {
      count: paid.length,
      amount: fromCents(totalCents),
      settleMs: paid.reduce((sum, a) => sum + a.settleMs, 0),
      feeUsd: paid.reduce((sum, a) => sum + a.feeUsd, 0),
    };
  });
}

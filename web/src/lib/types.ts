import type { Address, Hex } from "viem";
import type { Portion, SplitMode } from "./ledger";

export interface User {
  id: string;
  handle: string;
  name: string;
  address: Address;
  passwordHash: string;
  encryptedKey: string;
  createdAt: number;
}

export type PublicUser = Pick<User, "id" | "handle" | "name" | "address">;

export type ActivityKind =
  | "payment"
  | "welcome"
  | "link_sent"
  | "link_claimed"
  | "link_refunded"
  | "split_paid"
  | "group_settled";

export interface Activity {
  id: string;
  kind: ActivityKind;
  fromId: string | null;
  toId: string | null;
  amount: string;
  memo: string;
  txHash: Hex;
  feeUsd: number;
  settleMs: number;
  sponsored: boolean;
  createdAt: number;
  ref?: string;
}

export interface PayRequest {
  id: string;
  requesterId: string;
  payerId: string;
  amount: string;
  memo: string;
  status: "open" | "paid" | "declined";
  createdAt: number;
}

export interface PayLink {
  claimAddress: Address;
  senderId: string;
  amount: string;
  memo: string;
  expiresAt: number;
  status: "open" | "claimed" | "cancelled";
  claimerId?: string;
  createdAt: number;
  txHash: Hex;
}

export interface SplitShare {
  userId: string;
  amount: string;
  activityId?: string;
}

export interface Split {
  id: number;
  creatorId: string;
  memo: string;
  creatorShare: string;
  shares: SplitShare[];
  createdAt: number;
  txHash: Hex;
}

/** One shared cost inside a group. Cents are resolved at creation so later math never re-rounds. */
export interface GroupExpense {
  id: string;
  description: string;
  totalCents: number;
  paidBy: Portion[];
  splitMode: SplitMode;
  splitAmong: Portion[];
  /** The weights typed in "shares" mode, kept so the expense can be edited later. */
  weights?: Record<string, number>;
  addedById: string;
  createdAt: number;
  editedAt?: number;
}

/** An onchain `pay()` made to settle up inside a group. */
export interface GroupSettlement {
  id: string;
  fromId: string;
  toId: string;
  cents: number;
  activityId: string;
  createdAt: number;
}

export interface Group {
  id: string;
  name: string;
  creatorId: string;
  memberIds: string[];
  expenses: GroupExpense[];
  settlements: GroupSettlement[];
  createdAt: number;
}

export interface Database {
  users: User[];
  activity: Activity[];
  requests: PayRequest[];
  links: PayLink[];
  splits: Split[];
  groups: Group[];
}

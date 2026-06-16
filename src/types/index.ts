export interface Member {
  id: string;
  plateNumber: string;
  ownerName: string;
  phone?: string;
  remainingWashes: number;
  totalWashes: number;
  createdAt: string;
  lastVisitAt?: string;
}

export interface RechargeRecord {
  id: string;
  memberId: string;
  amount: number;
  washesAdded: number;
  bonusWashes: number;
  createdAt: string;
}

export type WashPaymentType = 'member_deduct' | 'member_cash' | 'member_recharge_deduct' | 'cash';

export interface WashRecord {
  id: string;
  memberId?: string;
  plateNumber: string;
  type: 'member' | 'cash';
  paymentType: WashPaymentType;
  amount: number;
  rechargeAmount?: number;
  washesUsed?: number;
  bonusWashesAdded?: number;
  status: 'completed' | 'cancelled';
  createdAt: string;
  note?: string;
}

export interface QueueItem {
  id: string;
  plateNumber: string;
  memberId?: string;
  isVip: boolean;
  status: 'waiting' | 'washing' | 'completed';
  queueNumber: number;
  stationNumber?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface RechargeRule {
  id: string;
  amount: number;
  bonusWashes: number;
  isDefault: boolean;
}

export interface SystemConfig {
  lowWashThreshold: number;
  washDurationMinutes: number;
  cashPrice: number;
  washStationCount: number;
}

export interface DailyStats {
  date: string;
  totalWashes: number;
  memberWashes: number;
  memberDeductWashes: number;
  memberCashWashes: number;
  memberRechargeAndDeduct: number;
  cashWashes: number;
  cashIncome: number;
  memberCashIncome: number;
  memberRechargeIncome: number;
  totalRechargeIncome: number;
  totalIncome: number;
}

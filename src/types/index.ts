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

export interface WashRecord {
  id: string;
  memberId?: string;
  plateNumber: string;
  type: 'member' | 'cash';
  amount: number;
  status: 'completed' | 'cancelled';
  createdAt: string;
}

export interface QueueItem {
  id: string;
  plateNumber: string;
  memberId?: string;
  isVip: boolean;
  status: 'waiting' | 'washing' | 'completed';
  queueNumber: number;
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
}

export interface DailyStats {
  date: string;
  totalWashes: number;
  memberWashes: number;
  cashWashes: number;
  cashIncome: number;
  memberRecharge: number;
}

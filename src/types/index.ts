export interface MemberVehicle {
  id: string;
  plateNumber: string;
  createdAt: string;
}

export interface Member {
  id: string;
  plateNumber: string; // 主车牌
  plateNumbers: MemberVehicle[]; // 多车绑定
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
  source?: 'recharge_page' | 'settlement';
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
  fromAppointment?: boolean;
  appointmentId?: string;
}

export type AppointmentStatus = 'pending' | 'arrived' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  plateNumber: string;
  memberId?: string;
  ownerName?: string;
  phone?: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  note?: string;
  createdAt: string;
  queueId?: string;
}

export interface ExpenseType {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  typeId: string;
  amount: number;
  note?: string;
  createdAt: string;
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
  rechargeIncomeFromPage: number;
  totalRechargeIncome: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
}

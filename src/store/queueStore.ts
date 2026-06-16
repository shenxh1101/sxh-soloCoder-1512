import { create } from 'zustand';
import type { QueueItem, WashRecord, Member } from '@/types';
import type { WashPaymentType } from '@/types';
import { getFromStorage, setToStorage, generateId, normalizePlateNumber, formatDate } from '@/utils';
import { useMemberStore } from './memberStore';
import { useConfigStore } from './configStore';

interface CompleteWashOptions {
  paymentType: WashPaymentType;
  cashAmount?: number;
  rechargeAmount?: number;
  bonusWashes?: number;
}

interface QueueState {
  queue: QueueItem[];
  washRecords: WashRecord[];
  currentQueueNumber: number;
  getSortedQueue: () => QueueItem[];
  getWaitingQueue: () => QueueItem[];
  getWashingQueue: () => QueueItem[];
  getAvailableStation: () => number | null;
  canStartWash: () => boolean;
  getWaitingInfo: (queueId: string) => { position: number; waitMinutes: number; displayText: string };
  takeNumber: (plateNumber: string) => { success: boolean; message: string; item?: QueueItem };
  startWash: (queueId: string) => { success: boolean; message: string; stationNumber?: number };
  completeWash: (queueId: string, options?: CompleteWashOptions) => { success: boolean; message: string; type?: 'member' | 'cash'; amount?: number };
  cancelQueue: (queueId: string) => void;
  promoteToVip: (queueId: string) => void;
  clearCompleted: () => void;
  getTodayWashRecords: () => WashRecord[];
  getWashRecordsByMember: (memberId: string) => WashRecord[];
  getWashRecordsByDate: (date: string) => WashRecord[];
  getRechargeRecordsByDate: (date: string) => { id: string; memberId: string; memberName: string; amount: number; washesAdded: number; bonusWashes: number; createdAt: string; source?: 'recharge_page' | 'settlement' }[];
}

export const useQueueStore = create<QueueState>((set, get) => ({
  queue: getFromStorage<QueueItem[]>('carwash_queue', []).filter(q => q.status !== 'completed' || formatDate(new Date(q.createdAt)) === formatDate(new Date())),
  washRecords: getFromStorage<WashRecord[]>('carwash_wash_records', []),
  currentQueueNumber: getFromStorage<number>('carwash_queue_number', 0),

  getSortedQueue: () => {
    const queue = get().queue.filter(q => q.status !== 'completed');
    return queue.sort((a, b) => {
      if (a.status === 'washing' && b.status !== 'washing') return -1;
      if (b.status === 'washing' && a.status !== 'washing') return 1;
      if (a.isVip !== b.isVip) return a.isVip ? -1 : 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  },

  getWaitingQueue: () => {
    return get().getSortedQueue().filter(q => q.status === 'waiting');
  },

  getWashingQueue: () => {
    return get().queue.filter(q => q.status === 'washing');
  },

  getAvailableStation: () => {
    const stationCount = useConfigStore.getState().systemConfig.washStationCount;
    const washing = get().getWashingQueue();
    const usedStations = new Set(washing.map(q => q.stationNumber).filter(Boolean) as number[]);
    for (let i = 1; i <= stationCount; i++) {
      if (!usedStations.has(i)) return i;
    }
    return null;
  },

  canStartWash: () => {
    return get().getAvailableStation() !== null;
  },

  getWaitingInfo: (queueId: string) => {
    const sorted = get().getSortedQueue();
    const index = sorted.findIndex(q => q.id === queueId);
    const item = sorted[index];
    if (!item || item.status !== 'waiting') {
      return { position: -1, waitMinutes: 0, displayText: '' };
    }

    const stationCount = useConfigStore.getState().systemConfig.washStationCount;
    const duration = useConfigStore.getState().systemConfig.washDurationMinutes;
    const washing = sorted.filter(q => q.status === 'washing');
    const washingCount = washing.length;

    const waitingBeforeIndex = sorted.slice(0, index).filter(q => q.status === 'waiting');
    const waitingBeforeCount = waitingBeforeIndex.length;

    const position = waitingBeforeCount + 1;
    const availableStations = stationCount - washingCount;

    if (availableStations > 0 && position <= availableStations) {
      return { position, waitMinutes: 0, displayText: '可开始洗车' };
    }

    let batches = 0;
    if (availableStations > 0) {
      batches = Math.ceil((waitingBeforeCount - availableStations + 1) / stationCount);
    } else {
      batches = Math.ceil((waitingBeforeCount + 1) / stationCount);
    }
    const waitMinutes = batches * duration;

    let displayText = '';
    if (waitMinutes === 0) {
      displayText = '可开始洗车';
    } else if (waitMinutes < 60) {
      displayText = `约 ${waitMinutes} 分钟`;
    } else {
      const hours = Math.floor(waitMinutes / 60);
      const mins = waitMinutes % 60;
      displayText = mins > 0 ? `约 ${hours}小时${mins}分钟` : `约 ${hours}小时`;
    }

    return { position, waitMinutes, displayText };
  },

  takeNumber: (plateNumber) => {
    const normalizedPlate = normalizePlateNumber(plateNumber);
    if (!normalizedPlate) {
      return { success: false, message: '请输入车牌号' };
    }

    const existingInQueue = get().queue.find(
      q => q.plateNumber === normalizedPlate && q.status !== 'completed'
    );
    if (existingInQueue) {
      return { success: false, message: '该车辆已在排队中' };
    }

    const findMemberByPlate = useMemberStore.getState().findMemberByPlate;
    const member = findMemberByPlate(normalizedPlate);

    const newNumber = get().currentQueueNumber + 1;
    const item: QueueItem = {
      id: generateId(),
      plateNumber: normalizedPlate,
      memberId: member?.id,
      isVip: !!member,
      status: 'waiting',
      queueNumber: newNumber,
      createdAt: new Date().toISOString()
    };

    const queue = [...get().queue, item];
    set({ queue, currentQueueNumber: newNumber });
    setToStorage('carwash_queue', queue);
    setToStorage('carwash_queue_number', newNumber);

    return {
      success: true,
      message: member ? `取号成功！会员 ${member.ownerName}` : '取号成功！散客',
      item
    };
  },

  startWash: (queueId) => {
    const station = get().getAvailableStation();
    if (station === null) {
      return { success: false, message: '所有工位已满，请等待' };
    }
    const queue = get().queue.map(q =>
      q.id === queueId
        ? { ...q, status: 'washing' as const, startedAt: new Date().toISOString(), stationNumber: station }
        : q
    );
    set({ queue });
    setToStorage('carwash_queue', queue);
    return { success: true, message: `已进入 ${station} 号工位开始洗车`, stationNumber: station };
  },

  completeWash: (queueId, options) => {
    const item = get().queue.find(q => q.id === queueId);
    if (!item) {
      return { success: false, message: '车辆不存在' };
    }

    let paymentType: WashPaymentType = 'cash';
    let totalAmount = 0;
    let rechargeAmount = 0;
    let bonusWashesAdded = 0;
    let washesUsed = 0;
    let note = '';

    const members = useMemberStore.getState();
    const config = useConfigStore.getState().systemConfig;

    if (item.isVip && item.memberId) {
      const member = members.members.find((m: Member) => m.id === item.memberId);

      if (options) {
        paymentType = options.paymentType;
      } else {
        paymentType = member && member.remainingWashes > 0 ? 'member_deduct' : 'cash';
      }

      switch (paymentType) {
        case 'member_deduct':
          if (member && member.remainingWashes > 0) {
            members.deductWash(item.memberId);
            washesUsed = 1;
            totalAmount = 0;
            note = '会员卡扣次数';
          } else {
            paymentType = 'member_cash';
            totalAmount = config.cashPrice;
            note = '会员次数不足，现金支付';
          }
          break;

        case 'member_cash':
          totalAmount = options?.cashAmount ?? config.cashPrice;
          note = '会员选择现金支付';
          useMemberStore.getState().updateMember(item.memberId!, {
            lastVisitAt: new Date().toISOString(),
            totalWashes: (member?.totalWashes || 0) + 1
          });
          break;

        case 'member_recharge_deduct':
          rechargeAmount = options?.rechargeAmount || 0;
          if (rechargeAmount <= 0) {
            return { success: false, message: '请输入充值金额' };
          }

          const getBonusWashesByAmount = useConfigStore.getState().getBonusWashesByAmount;
          const bonus = getBonusWashesByAmount(rechargeAmount);
          const rechargeRules = useConfigStore.getState().rechargeRules;

          if (bonus <= 0) {
            const minRule = rechargeRules.length > 0
              ? Math.min(...rechargeRules.map(r => r.amount))
              : null;
            if (minRule) {
              return {
                success: false,
                message: `充值金额未达到最低档位 ¥${minRule}，请充值至档位金额或选择其他结算方式`
              };
            }
            return {
              success: false,
              message: '充值金额未达到赠送门槛，请调整金额或选择其他结算方式'
            };
          }

          const rechargeResult = members.rechargeMember(item.memberId!, rechargeAmount, undefined, 'settlement');
          if (!rechargeResult.success) {
            return rechargeResult as { success: boolean; message: string };
          }

          bonusWashesAdded = rechargeResult.bonusWashes || 0;
          if (member) {
            const updatedMember = useMemberStore.getState().members.find(m => m.id === item.memberId);
            if (updatedMember && updatedMember.remainingWashes > 0) {
              useMemberStore.getState().deductWash(item.memberId!);
              washesUsed = 1;
            }
          }

          totalAmount = rechargeAmount;
          note = `充值¥${rechargeAmount}后扣次${bonusWashesAdded ? `（赠送${bonusWashesAdded}次）` : ''}`;
          break;
      }
    } else {
      paymentType = 'cash';
      totalAmount = options?.cashAmount ?? config.cashPrice;
      note = '散客现金支付';
    }

    const record: WashRecord = {
      id: generateId(),
      memberId: item.memberId,
      plateNumber: item.plateNumber,
      type: item.isVip ? 'member' : 'cash',
      paymentType,
      amount: totalAmount,
      rechargeAmount,
      washesUsed,
      bonusWashesAdded,
      status: 'completed',
      createdAt: new Date().toISOString(),
      note
    };

    const queue = get().queue.map(q =>
      q.id === queueId
        ? { ...q, status: 'completed' as const, completedAt: new Date().toISOString() }
        : q
    );
    const washRecords = [...get().washRecords, record];

    set({ queue, washRecords });
    setToStorage('carwash_queue', queue);
    setToStorage('carwash_wash_records', washRecords);

    return {
      success: true,
      message: note || '洗车完成',
      type: item.isVip ? 'member' : 'cash',
      amount: totalAmount
    };
  },

  cancelQueue: (queueId) => {
    const queue = get().queue.filter(q => q.id !== queueId);
    set({ queue });
    setToStorage('carwash_queue', queue);
  },

  promoteToVip: (queueId) => {
    const queue = get().queue.map(q =>
      q.id === queueId ? { ...q, isVip: true } : q
    );
    set({ queue });
    setToStorage('carwash_queue', queue);
  },

  clearCompleted: () => {
    const queue = get().queue.filter(q => q.status !== 'completed');
    set({ queue });
    setToStorage('carwash_queue', queue);
  },

  getTodayWashRecords: () => {
    const today = formatDate(new Date());
    return get().washRecords.filter(r => formatDate(new Date(r.createdAt)) === today);
  },

  getWashRecordsByMember: (memberId) => {
    return get().washRecords
      .filter(r => r.memberId === memberId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getWashRecordsByDate: (date) => {
    return get().washRecords
      .filter(r => formatDate(new Date(r.createdAt)) === date)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getRechargeRecordsByDate: (date) => {
    const memberStore = useMemberStore.getState();
    return memberStore.rechargeRecords
      .filter(r => formatDate(new Date(r.createdAt)) === date)
      .map(r => ({
        ...r,
        memberName: memberStore.members.find(m => m.id === r.memberId)?.ownerName || '未知会员'
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}));

import { create } from 'zustand';
import type { QueueItem, WashRecord } from '@/types';
import { getFromStorage, setToStorage, generateId, normalizePlateNumber, formatDate } from '@/utils';
import { useMemberStore } from './memberStore';
import { useConfigStore } from './configStore';

interface QueueState {
  queue: QueueItem[];
  washRecords: WashRecord[];
  currentQueueNumber: number;
  getSortedQueue: () => QueueItem[];
  getWaitingQueue: () => QueueItem[];
  getWashingQueue: () => QueueItem[];
  takeNumber: (plateNumber: string) => { success: boolean; message: string; item?: QueueItem };
  startWash: (queueId: string) => void;
  completeWash: (queueId: string) => { success: boolean; message: string; type?: 'member' | 'cash'; amount?: number };
  cancelQueue: (queueId: string) => void;
  promoteToVip: (queueId: string) => void;
  clearCompleted: () => void;
  getQueuePosition: (queueId: string) => number;
  getTodayWashRecords: () => WashRecord[];
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
    const queue = get().queue.map(q =>
      q.id === queueId
        ? { ...q, status: 'washing' as const, startedAt: new Date().toISOString() }
        : q
    );
    set({ queue });
    setToStorage('carwash_queue', queue);
  },

  completeWash: (queueId) => {
    const item = get().queue.find(q => q.id === queueId);
    if (!item) {
      return { success: false, message: '车辆不存在' };
    }

    let type: 'member' | 'cash' = 'cash';
    let amount = useConfigStore.getState().systemConfig.cashPrice;

    if (item.isVip && item.memberId) {
      const deductWash = useMemberStore.getState().deductWash;
      const member = useMemberStore.getState().members.find(m => m.id === item.memberId);
      if (member && member.remainingWashes > 0) {
        const success = deductWash(item.memberId);
        if (success) {
          type = 'member';
          amount = 0;
        }
      }
    }

    const record: WashRecord = {
      id: generateId(),
      memberId: item.memberId,
      plateNumber: item.plateNumber,
      type,
      amount,
      status: 'completed',
      createdAt: new Date().toISOString()
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
      message: type === 'member' ? '洗车完成，已扣除洗车次数' : `洗车完成，收取现金 ¥${amount}`,
      type,
      amount
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

  getQueuePosition: (queueId) => {
    const sorted = get().getSortedQueue();
    const index = sorted.findIndex(q => q.id === queueId);
    if (index === -1) return -1;
    const washingCount = sorted.filter(q => q.status === 'washing').length;
    return Math.max(0, index - washingCount + 1);
  },

  getTodayWashRecords: () => {
    const today = formatDate(new Date());
    return get().washRecords.filter(r => formatDate(new Date(r.createdAt)) === today);
  }
}));

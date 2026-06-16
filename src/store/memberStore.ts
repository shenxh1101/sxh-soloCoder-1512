import { create } from 'zustand';
import type { Member, RechargeRecord, MemberVehicle } from '@/types';
import { getFromStorage, setToStorage, generateId, normalizePlateNumber } from '@/utils';
import { useConfigStore } from './configStore';

interface MemberState {
  members: Member[];
  rechargeRecords: RechargeRecord[];
  addMember: (plateNumber: string, ownerName: string, phone?: string) => Member | null;
  updateMember: (id: string, data: Partial<Omit<Member, 'id' | 'createdAt'>>) => void;
  deleteMember: (id: string) => void;
  findMemberByPlate: (plateNumber: string) => Member | undefined;
  addVehicle: (memberId: string, plateNumber: string) => { success: boolean; message: string };
  removeVehicle: (memberId: string, vehicleId: string) => { success: boolean; message: string };
  getAllPlatesForMember: (memberId: string) => string[];
  rechargeMember: (memberId: string, amount: number, washes?: number, source?: 'recharge_page' | 'settlement') => { success: boolean; message: string; washesAdded?: number; bonusWashes?: number };
  deductWash: (memberId: string) => boolean;
  getRechargeHistory: (memberId: string) => RechargeRecord[];
  searchMembers: (keyword: string) => Member[];
  getLowWashMembers: () => Member[];
}

const migrateMembers = (members: any[]): Member[] => {
  return members.map(m => ({
    ...m,
    plateNumbers: m.plateNumbers || [
      {
        id: generateId(),
        plateNumber: m.plateNumber,
        createdAt: m.createdAt
      }
    ]
  }));
};

const getInitialMembers = (): Member[] => {
  const stored = getFromStorage<any[]>('carwash_members', []);
  return migrateMembers(stored);
};

export const useMemberStore = create<MemberState>((set, get) => ({
  members: getInitialMembers(),
  rechargeRecords: getFromStorage<RechargeRecord[]>('carwash_recharge_records', []),

  addMember: (plateNumber, ownerName, phone) => {
    const normalizedPlate = normalizePlateNumber(plateNumber);
    const existing = get().findMemberByPlate(normalizedPlate);
    if (existing) {
      return null;
    }
    const vehicle: MemberVehicle = {
      id: generateId(),
      plateNumber: normalizedPlate,
      createdAt: new Date().toISOString()
    };
    const newMember: Member = {
      id: generateId(),
      plateNumber: normalizedPlate,
      plateNumbers: [vehicle],
      ownerName,
      phone,
      remainingWashes: 0,
      totalWashes: 0,
      createdAt: new Date().toISOString()
    };
    const members = [...get().members, newMember];
    set({ members });
    setToStorage('carwash_members', members);
    return newMember;
  },

  updateMember: (id, data) => {
    const members = get().members.map(m =>
      m.id === id ? { ...m, ...data } : m
    );
    set({ members });
    setToStorage('carwash_members', members);
  },

  deleteMember: (id) => {
    const members = get().members.filter(m => m.id !== id);
    set({ members });
    setToStorage('carwash_members', members);
  },

  findMemberByPlate: (plateNumber) => {
    const normalizedPlate = normalizePlateNumber(plateNumber);
    return get().members.find(m =>
      m.plateNumber === normalizedPlate ||
      m.plateNumbers.some(v => v.plateNumber === normalizedPlate)
    );
  },

  addVehicle: (memberId, plateNumber) => {
    const normalizedPlate = normalizePlateNumber(plateNumber);
    if (!normalizedPlate) {
      return { success: false, message: '请输入车牌号' };
    }
    const existing = get().findMemberByPlate(normalizedPlate);
    if (existing) {
      return { success: false, message: '该车牌已绑定到其他会员' };
    }
    const vehicle: MemberVehicle = {
      id: generateId(),
      plateNumber: normalizedPlate,
      createdAt: new Date().toISOString()
    };
    const members = get().members.map(m =>
      m.id === memberId
        ? { ...m, plateNumbers: [...m.plateNumbers, vehicle] }
        : m
    );
    set({ members });
    setToStorage('carwash_members', members);
    return { success: true, message: `已添加 ${normalizedPlate}` };
  },

  removeVehicle: (memberId, vehicleId) => {
    const member = get().members.find(m => m.id === memberId);
    if (!member) {
      return { success: false, message: '会员不存在' };
    }
    const vehicle = member.plateNumbers.find(v => v.id === vehicleId);
    if (!vehicle) {
      return { success: false, message: '车辆不存在' };
    }
    if (vehicle.plateNumber === member.plateNumber) {
      return { success: false, message: '主车牌不能删除，请先更换主车牌' };
    }
    if (member.plateNumbers.length <= 1) {
      return { success: false, message: '会员至少需要保留一个车牌' };
    }
    const members = get().members.map(m =>
      m.id === memberId
        ? { ...m, plateNumbers: m.plateNumbers.filter(v => v.id !== vehicleId) }
        : m
    );
    set({ members });
    setToStorage('carwash_members', members);
    return { success: true, message: '已删除该车辆' };
  },

  getAllPlatesForMember: (memberId) => {
    const member = get().members.find(m => m.id === memberId);
    if (!member) return [];
    return member.plateNumbers.map(v => v.plateNumber);
  },

  rechargeMember: (memberId, amount, washes, source = 'recharge_page') => {
    const member = get().members.find(m => m.id === memberId);
    if (!member) {
      return { success: false, message: '会员不存在' };
    }

    const getBonusWashesByAmount = useConfigStore.getState().getBonusWashesByAmount;
    const bonusWashes = washes !== undefined ? 0 : getBonusWashesByAmount(amount);
    const baseWashes = washes !== undefined ? washes : 0;
    const washesAdded = baseWashes + bonusWashes;

    if (washesAdded <= 0) {
      return { success: false, message: '充值金额未达到赠送门槛' };
    }

    const record: RechargeRecord = {
      id: generateId(),
      memberId,
      amount,
      washesAdded: baseWashes,
      bonusWashes,
      createdAt: new Date().toISOString(),
      source
    };

    const members = get().members.map(m =>
      m.id === memberId
        ? { ...m, remainingWashes: m.remainingWashes + washesAdded }
        : m
    );
    const rechargeRecords = [...get().rechargeRecords, record];

    set({ members, rechargeRecords });
    setToStorage('carwash_members', members);
    setToStorage('carwash_recharge_records', rechargeRecords);

    return {
      success: true,
      message: '充值成功',
      washesAdded: baseWashes,
      bonusWashes
    };
  },

  deductWash: (memberId) => {
    const member = get().members.find(m => m.id === memberId);
    if (!member || member.remainingWashes <= 0) {
      return false;
    }

    const members = get().members.map(m =>
      m.id === memberId
        ? {
            ...m,
            remainingWashes: m.remainingWashes - 1,
            totalWashes: m.totalWashes + 1,
            lastVisitAt: new Date().toISOString()
          }
        : m
    );
    set({ members });
    setToStorage('carwash_members', members);
    return true;
  },

  getRechargeHistory: (memberId) => {
    return get().rechargeRecords
      .filter(r => r.memberId === memberId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  searchMembers: (keyword) => {
    const normalizedKeyword = normalizePlateNumber(keyword);
    if (!keyword.trim()) {
      return get().members;
    }
    return get().members.filter(m =>
      m.plateNumber.includes(normalizedKeyword) ||
      m.plateNumbers.some(v => v.plateNumber.includes(normalizedKeyword)) ||
      m.ownerName.includes(keyword) ||
      (m.phone && m.phone.includes(keyword))
    );
  },

  getLowWashMembers: () => {
    const threshold = useConfigStore.getState().systemConfig.lowWashThreshold;
    return get().members.filter(m => m.remainingWashes <= threshold);
  }
}));

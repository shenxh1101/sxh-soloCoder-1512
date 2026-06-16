import { create } from 'zustand';
import type { ExpenseType, ExpenseRecord } from '@/types';
import { getFromStorage, setToStorage, generateId, formatDate } from '@/utils';

const defaultExpenseTypes: ExpenseType[] = [
  { id: 'et_1', name: '水电费', color: 'from-sky-400 to-blue-500', createdAt: new Date().toISOString() },
  { id: 'et_2', name: '耗材采购', color: 'from-emerald-400 to-teal-500', createdAt: new Date().toISOString() },
  { id: 'et_3', name: '人工工资', color: 'from-purple-400 to-indigo-500', createdAt: new Date().toISOString() },
  { id: 'et_4', name: '房租', color: 'from-amber-400 to-orange-500', createdAt: new Date().toISOString() },
  { id: 'et_5', name: '其他支出', color: 'from-slate-400 to-slate-500', createdAt: new Date().toISOString() }
];

interface ExpenseState {
  expenseTypes: ExpenseType[];
  expenseRecords: ExpenseRecord[];
  addExpenseType: (name: string, color?: string) => { success: boolean; message: string };
  updateExpenseType: (id: string, data: Partial<ExpenseType>) => void;
  deleteExpenseType: (id: string) => void;
  addExpenseRecord: (data: {
    typeId: string;
    amount: number;
    note?: string;
    createdAt?: string;
  }) => { success: boolean; message: string };
  deleteExpenseRecord: (id: string) => void;
  getExpenseRecordsByDate: (date: string) => ExpenseRecord[];
  getExpenseRecordsByMember: (memberId: string) => ExpenseRecord[];
  getExpenseTotalByDate: (date: string) => number;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenseTypes: getFromStorage<ExpenseType[]>('carwash_expense_types', defaultExpenseTypes),
  expenseRecords: getFromStorage<ExpenseRecord[]>('carwash_expense_records', []),

  addExpenseType: (name, color) => {
    if (!name.trim()) {
      return { success: false, message: '请输入支出类型名称' };
    }
    const colors = [
      'from-sky-400 to-blue-500',
      'from-emerald-400 to-teal-500',
      'from-purple-400 to-indigo-500',
      'from-amber-400 to-orange-500',
      'from-rose-400 to-pink-500',
      'from-slate-400 to-slate-500'
    ];
    const usedColors = new Set(get().expenseTypes.map(t => t.color));
    const availableColor = colors.find(c => !usedColors.has(c)) || colors[0];

    const type: ExpenseType = {
      id: generateId(),
      name: name.trim(),
      color: color || availableColor,
      createdAt: new Date().toISOString()
    };
    const types = [...get().expenseTypes, type];
    set({ expenseTypes: types });
    setToStorage('carwash_expense_types', types);
    return { success: true, message: '已添加支出类型' };
  },

  updateExpenseType: (id, data) => {
    const types = get().expenseTypes.map(t => t.id === id ? { ...t, ...data } : t);
    set({ expenseTypes: types });
    setToStorage('carwash_expense_types', types);
  },

  deleteExpenseType: (id) => {
    const types = get().expenseTypes.filter(t => t.id !== id);
    set({ expenseTypes: types });
    setToStorage('carwash_expense_types', types);
  },

  addExpenseRecord: (data) => {
    if (!data.typeId || data.amount <= 0) {
      return { success: false, message: '请选择支出类型并输入有效金额' };
    }
    const record: ExpenseRecord = {
      id: generateId(),
      typeId: data.typeId,
      amount: data.amount,
      note: data.note,
      createdAt: data.createdAt || new Date().toISOString()
    };
    const records = [...get().expenseRecords, record];
    set({ expenseRecords: records });
    setToStorage('carwash_expense_records', records);
    return { success: true, message: '已记录支出' };
  },

  deleteExpenseRecord: (id) => {
    const records = get().expenseRecords.filter(r => r.id !== id);
    set({ expenseRecords: records });
    setToStorage('carwash_expense_records', records);
  },

  getExpenseRecordsByDate: (date) => {
    return get().expenseRecords
      .filter(r => formatDate(new Date(r.createdAt)) === date)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getExpenseRecordsByMember: (memberId) => {
    return get().expenseRecords
      .filter(r => r.typeId === memberId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getExpenseTotalByDate: (date) => {
    return get().getExpenseRecordsByDate(date).reduce((sum, r) => sum + r.amount, 0);
  }
}));

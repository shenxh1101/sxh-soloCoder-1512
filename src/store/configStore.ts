import { create } from 'zustand';
import type { RechargeRule, SystemConfig } from '@/types';
import { getFromStorage, setToStorage, generateId } from '@/utils';

interface ConfigState {
  rechargeRules: RechargeRule[];
  systemConfig: SystemConfig;
  addRechargeRule: (amount: number, bonusWashes: number, isDefault?: boolean) => void;
  updateRechargeRule: (id: string, amount: number, bonusWashes: number) => void;
  deleteRechargeRule: (id: string) => void;
  setDefaultRule: (id: string) => void;
  updateSystemConfig: (config: Partial<SystemConfig>) => void;
  getBonusWashesByAmount: (amount: number) => number;
}

const defaultRechargeRules: RechargeRule[] = [
  { id: generateId(), amount: 200, bonusWashes: 1, isDefault: true },
  { id: generateId(), amount: 500, bonusWashes: 3, isDefault: false },
  { id: generateId(), amount: 1000, bonusWashes: 8, isDefault: false }
];

const defaultSystemConfig: SystemConfig = {
  lowWashThreshold: 3,
  washDurationMinutes: 15,
  cashPrice: 30
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  rechargeRules: getFromStorage('carwash_recharge_rules', defaultRechargeRules),
  systemConfig: getFromStorage('carwash_system_config', defaultSystemConfig),

  addRechargeRule: (amount, bonusWashes, isDefault = false) => {
    const newRule: RechargeRule = {
      id: generateId(),
      amount,
      bonusWashes,
      isDefault
    };
    let rules = [...get().rechargeRules];
    if (isDefault) {
      rules = rules.map(r => ({ ...r, isDefault: false }));
    }
    rules.push(newRule);
    set({ rechargeRules: rules });
    setToStorage('carwash_recharge_rules', rules);
  },

  updateRechargeRule: (id, amount, bonusWashes) => {
    const rules = get().rechargeRules.map(r =>
      r.id === id ? { ...r, amount, bonusWashes } : r
    );
    set({ rechargeRules: rules });
    setToStorage('carwash_recharge_rules', rules);
  },

  deleteRechargeRule: (id) => {
    const rules = get().rechargeRules.filter(r => r.id !== id);
    if (rules.length === 0) {
      return;
    }
    const hadDefault = get().rechargeRules.find(r => r.id === id)?.isDefault;
    if (hadDefault) {
      rules[0].isDefault = true;
    }
    set({ rechargeRules: rules });
    setToStorage('carwash_recharge_rules', rules);
  },

  setDefaultRule: (id) => {
    const rules = get().rechargeRules.map(r => ({
      ...r,
      isDefault: r.id === id
    }));
    set({ rechargeRules: rules });
    setToStorage('carwash_recharge_rules', rules);
  },

  updateSystemConfig: (config) => {
    const newConfig = { ...get().systemConfig, ...config };
    set({ systemConfig: newConfig });
    setToStorage('carwash_system_config', newConfig);
  },

  getBonusWashesByAmount: (amount) => {
    const rules = get().rechargeRules;
    const sorted = [...rules].sort((a, b) => b.amount - a.amount);
    for (const rule of sorted) {
      if (amount >= rule.amount) {
        return rule.bonusWashes;
      }
    }
    return 0;
  }
}));

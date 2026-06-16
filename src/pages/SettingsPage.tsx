import React, { useState } from 'react';
import {
  Gift,
  Clock,
  CircleDollarSign,
  AlertTriangle,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Pencil,
  Star,
  Database,
  Download,
  Upload,
  RefreshCw,
  Car
} from 'lucide-react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { useConfigStore } from '@/store/configStore';
import { useQueueStore } from '@/store/queueStore';
import { useMemberStore } from '@/store/memberStore';
import { cn } from '@/lib/utils';
import type { RechargeRule } from '@/types';

const SettingsPage: React.FC = () => {
  const [editingRule, setEditingRule] = useState<RechargeRule | null>(null);
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({ amount: 0, bonusWashes: 0, isDefault: false });
  const [editRule, setEditRule] = useState({ amount: 0, bonusWashes: 0 });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const rechargeRules = useConfigStore(s => s.rechargeRules);
  const systemConfig = useConfigStore(s => s.systemConfig);
  const addRechargeRule = useConfigStore(s => s.addRechargeRule);
  const updateRechargeRule = useConfigStore(s => s.updateRechargeRule);
  const deleteRechargeRule = useConfigStore(s => s.deleteRechargeRule);
  const setDefaultRule = useConfigStore(s => s.setDefaultRule);
  const updateSystemConfig = useConfigStore(s => s.updateSystemConfig);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddRule = () => {
    if (newRule.amount <= 0 || newRule.bonusWashes < 0) {
      showToast('请填写有效的金额和赠送次数', 'error');
      return;
    }
    addRechargeRule(newRule.amount, newRule.bonusWashes, newRule.isDefault);
    showToast('充值规则添加成功', 'success');
    setIsAddRuleModalOpen(false);
    setNewRule({ amount: 0, bonusWashes: 0, isDefault: false });
  };

  const handleUpdateRule = () => {
    if (!editingRule) return;
    if (editRule.amount <= 0 || editRule.bonusWashes < 0) {
      showToast('请填写有效的金额和赠送次数', 'error');
      return;
    }
    updateRechargeRule(editingRule.id, editRule.amount, editRule.bonusWashes);
    showToast('规则已更新', 'success');
    setEditingRule(null);
  };

  const handleDeleteRule = (id: string) => {
    if (rechargeRules.length <= 1) {
      showToast('至少保留一条充值规则', 'error');
      return;
    }
    if (confirm('确定要删除这条充值规则吗？')) {
      deleteRechargeRule(id);
      showToast('规则已删除', 'info');
    }
  };

  const openEditModal = (rule: RechargeRule) => {
    setEditingRule(rule);
    setEditRule({ amount: rule.amount, bonusWashes: rule.bonusWashes });
  };

  const handleExportData = () => {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      systemConfig,
      members: useMemberStore.getState().members,
      rechargeRecords: useMemberStore.getState().rechargeRecords,
      washRecords: useQueueStore.getState().washRecords,
      rechargeRules
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `洗车店数据备份_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('数据导出成功', 'success');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.version || !data.members) {
          throw new Error('无效的数据文件');
        }
        if (!confirm('导入数据将覆盖现有所有数据，确定继续吗？')) {
          return;
        }
        if (data.systemConfig) {
          updateSystemConfig(data.systemConfig);
        }
        if (data.members) {
          localStorage.setItem('carwash_members', JSON.stringify(data.members));
          useMemberStore.setState({ members: data.members });
        }
        if (data.rechargeRecords) {
          localStorage.setItem('carwash_recharge_records', JSON.stringify(data.rechargeRecords));
          useMemberStore.setState({ rechargeRecords: data.rechargeRecords });
        }
        if (data.washRecords) {
          localStorage.setItem('carwash_wash_records', JSON.stringify(data.washRecords));
          useQueueStore.setState({ washRecords: data.washRecords });
        }
        if (data.rechargeRules) {
          localStorage.setItem('carwash_recharge_rules', JSON.stringify(data.rechargeRules));
          useConfigStore.setState({ rechargeRules: data.rechargeRules });
        }
        showToast('数据导入成功，请刷新页面', 'success');
        setTimeout(() => location.reload(), 1500);
      } catch (err) {
        showToast('导入失败：无效的文件格式', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetAll = () => {
    if (!confirm('⚠️ 警告：此操作将删除所有数据！\n\n将删除：会员信息、充值记录、洗车记录、排队数据，\n但会保留系统设置和充值规则。\n\n确定要继续吗？')) {
      return;
    }
    if (!confirm('⚠️ 再次确认：真的要清空所有业务数据吗？此操作不可恢复！')) {
      return;
    }

    localStorage.removeItem('carwash_members');
    localStorage.removeItem('carwash_recharge_records');
    localStorage.removeItem('carwash_wash_records');
    localStorage.removeItem('carwash_queue');
    localStorage.removeItem('carwash_queue_number');

    useMemberStore.setState({ members: [], rechargeRecords: [] });
    useQueueStore.setState({ queue: [], washRecords: [], currentQueueNumber: 0 });

    showToast('数据已清空', 'success');
  };

  return (
    <div className="space-y-8">
      {toast && (
        <div
          className={cn(
            'fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl font-medium text-sm animate-in slide-in-from-top-5 duration-300',
            toast.type === 'success' && 'bg-emerald-500 text-white',
            toast.type === 'error' && 'bg-rose-500 text-white',
            toast.type === 'info' && 'bg-sky-500 text-white'
          )}
        >
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-800">系统设置</h1>
        <p className="text-slate-500 mt-1">配置系统规则和个性化设置</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/25">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">充值规则设置</h2>
                <p className="text-sm text-slate-500 mt-0.5">自定义充卡赠送规则</p>
              </div>
            </div>
            <Button variant="primary" icon={PlusCircle} onClick={() => setIsAddRuleModalOpen(true)}>
              添加规则
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rechargeRules.map(rule => (
              <div
                key={rule.id}
                className={cn(
                  'relative overflow-hidden rounded-2xl border-2 p-5 transition-all',
                  rule.isDefault
                    ? 'border-sky-500 bg-gradient-to-br from-sky-50 to-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                {rule.isDefault && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500 text-white text-xs font-bold shadow-md">
                    <Star className="w-3 h-3 fill-current" />
                    默认
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    ¥{rule.amount}
                  </p>
                  <p className="text-slate-500 text-sm mt-1">充值金额</p>
                </div>
                <div className="flex items-center gap-2 mb-5">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
                    <Gift className="w-4 h-4" />
                    赠送 {rule.bonusWashes} 次
                  </div>
                </div>
                <div className="flex gap-2">
                  {!rule.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setDefaultRule(rule.id);
                        showToast('已设为默认规则', 'success');
                      }}
                    >
                      设为默认
                    </Button>
                  )}
                  <button
                    onClick={() => openEditModal(rule)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-sky-600 transition-colors"
                    title="编辑"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/25">
              <CircleDollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">散客洗车价格</h2>
              <p className="text-sm text-slate-500 mt-0.5">非会员每次洗车的收费标准</p>
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-2xl font-bold">¥</span>
            <input
              type="number"
              value={systemConfig.cashPrice || ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                updateSystemConfig({ cashPrice: val >= 0 ? val : 0 });
              }}
              min="0"
              className="w-full pl-12 pr-5 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-3xl font-bold outline-none transition-all text-slate-800"
            />
          </div>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            会员充卡更划算哦！
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-md shadow-sky-500/25">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">洗车时长</h2>
              <p className="text-sm text-slate-500 mt-0.5">每辆车预计需要的时间</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="number"
              value={systemConfig.washDurationMinutes || ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                updateSystemConfig({ washDurationMinutes: val > 0 ? val : 15 });
              }}
              min="1"
              className="w-full pl-5 pr-16 py-4 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 text-3xl font-bold outline-none transition-all text-slate-800"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">分钟</span>
          </div>
          <p className="text-xs text-slate-500 mt-3">用于计算客户等待时间估算</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-md shadow-purple-500/25">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">洗车工位数量</h2>
              <p className="text-sm text-slate-500 mt-0.5">店内可同时洗车的工位</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => {
                const val = Math.max(1, systemConfig.washStationCount - 1);
                updateSystemConfig({ washStationCount: val });
              }}
              className="w-14 h-14 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-600 transition-colors"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {systemConfig.washStationCount}
              </span>
              <p className="text-sm text-slate-500 mt-1">个工位</p>
            </div>
            <button
              onClick={() => {
                const val = Math.min(10, systemConfig.washStationCount + 1);
                updateSystemConfig({ washStationCount: val });
              }}
              className="w-14 h-14 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-600 transition-colors"
            >
              +
            </button>
          </div>
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: systemConfig.washStationCount }, (_, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-md"
              >
                {i + 1}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">设置后，可同时开始对应数量的车辆</p>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-md shadow-rose-500/25">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">次数预警阈值</h2>
              <p className="text-sm text-slate-500 mt-0.5">剩余洗车次数低于此值时将显示预警</p>
            </div>
          </div>

          <div className="max-w-md">
            <div className="flex items-center gap-4 mb-4">
              <input
                type="range"
                min="1"
                max="20"
                value={systemConfig.lowWashThreshold}
                onChange={(e) => updateSystemConfig({ lowWashThreshold: Number(e.target.value) })}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="w-20 text-center">
                <span className="text-3xl font-bold text-rose-500">
                  {systemConfig.lowWashThreshold}
                </span>
                <span className="text-sm text-slate-500 ml-1">次</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
              <span>1次</span>
              <span>20次</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-md shadow-violet-500/25">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">数据管理</h2>
              <p className="text-sm text-slate-500 mt-0.5">备份、导入或重置数据</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleExportData}
              className="group relative overflow-hidden p-5 rounded-xl border-2 border-slate-200 hover:border-sky-200 bg-slate-50 hover:bg-sky-50 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-sky-100 group-hover:bg-sky-500 flex items-center justify-center mb-3 transition-colors">
                <Download className="w-6 h-6 text-sky-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">导出备份数据</h3>
              <p className="text-sm text-slate-500">将会员、记录等数据导出为JSON文件</p>
            </button>

            <label className="group relative overflow-hidden p-5 rounded-xl border-2 border-slate-200 hover:border-emerald-200 bg-slate-50 hover:bg-emerald-50 transition-all cursor-pointer block">
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 flex items-center justify-center mb-3 transition-colors">
                <Upload className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">导入数据</h3>
              <p className="text-sm text-slate-500">从备份文件恢复数据（将覆盖现有）</p>
            </label>

            <button
              onClick={handleResetAll}
              className="group relative overflow-hidden p-5 rounded-xl border-2 border-slate-200 hover:border-rose-200 bg-slate-50 hover:bg-rose-50 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-100 group-hover:bg-rose-500 flex items-center justify-center mb-3 transition-colors">
                <RefreshCw className="w-6 h-6 text-rose-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">清空业务数据</h3>
              <p className="text-sm text-slate-500">删除所有会员和记录（保留设置）</p>
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isAddRuleModalOpen}
        onClose={() => {
          setIsAddRuleModalOpen(false);
          setNewRule({ amount: 0, bonusWashes: 0, isDefault: false });
        }}
        title="添加充值规则"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">充值金额</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-bold">¥</span>
              <input
                type="number"
                value={newRule.amount || ''}
                onChange={(e) => setNewRule({ ...newRule, amount: Number(e.target.value) })}
                placeholder="输入充值金额"
                min="0"
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 text-lg font-bold outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">赠送洗车次数</label>
            <div className="relative">
              <input
                type="number"
                value={newRule.bonusWashes || ''}
                onChange={(e) => setNewRule({ ...newRule, bonusWashes: Number(e.target.value) })}
                placeholder="赠送次数"
                min="0"
                className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 text-lg font-bold outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">次</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
            <input
              type="checkbox"
              id="isDefault"
              checked={newRule.isDefault}
              onChange={(e) => setNewRule({ ...newRule, isDefault: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
            />
            <label htmlFor="isDefault" className="text-sm text-slate-700 font-medium cursor-pointer">
              设为默认推荐规则
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setIsAddRuleModalOpen(false)}>
              取消
            </Button>
            <Button variant="primary" className="flex-1" icon={PlusCircle} onClick={handleAddRule}>
              确认添加
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!editingRule}
        onClose={() => setEditingRule(null)}
        title="编辑充值规则"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">充值金额</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-bold">¥</span>
              <input
                type="number"
                value={editRule.amount || ''}
                onChange={(e) => setEditRule({ ...editRule, amount: Number(e.target.value) })}
                min="0"
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 text-lg font-bold outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">赠送洗车次数</label>
            <div className="relative">
              <input
                type="number"
                value={editRule.bonusWashes || ''}
                onChange={(e) => setEditRule({ ...editRule, bonusWashes: Number(e.target.value) })}
                min="0"
                className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 text-lg font-bold outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">次</span>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setEditingRule(null)}>
              取消
            </Button>
            <Button variant="primary" className="flex-1" icon={CheckCircle2} onClick={handleUpdateRule}>
              保存修改
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;

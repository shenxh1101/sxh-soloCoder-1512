import React, { useState, useMemo } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Trash2,
  Wallet,
  Receipt,
  RefreshCw,
  PiggyBank,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { useExpenseStore } from '@/store/expenseStore';
import { formatDate, formatTime } from '@/utils';
import type { ExpenseRecord, ExpenseType } from '@/types';

export default function ExpensePage() {
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const expenseTypes = useExpenseStore(s => s.expenseTypes);
  const addExpenseRecord = useExpenseStore(s => s.addExpenseRecord);
  const deleteExpenseRecord = useExpenseStore(s => s.deleteExpenseRecord);
  const getExpenseRecordsByDate = useExpenseStore(s => s.getExpenseRecordsByDate);
  const getExpenseTotalByDate = useExpenseStore(s => s.getExpenseTotalByDate);

  const todayStr = formatDate(new Date());

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(formatDate(d));
  };

  const isToday = selectedDate === todayStr;

  const dateLabel = (() => {
    if (selectedDate === todayStr) return '今天';
    const y = new Date(selectedDate);
    const t = new Date(todayStr);
    const diff = Math.round((t.getTime() - y.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) return '昨天';
    if (diff === 2) return '前天';
    return y.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  })();

  const expenseRecords = useMemo(() => getExpenseRecordsByDate(selectedDate), [selectedDate, getExpenseRecordsByDate]);

  const statsByType = useMemo(() => {
    const totals: Record<string, number> = {};
    expenseRecords.forEach(r => {
      totals[r.typeId] = (totals[r.typeId] || 0) + r.amount;
    });
    return totals;
  }, [expenseRecords]);

  const totalExpense = useMemo(() => getExpenseTotalByDate(selectedDate), [selectedDate, getExpenseTotalByDate]);

  const getTypeById = (id: string): ExpenseType | undefined => {
    return expenseTypes.find(t => t.id === id);
  };

  const statIcons = [Wallet, Receipt, RefreshCw, PiggyBank];

  const handleOpenModal = () => {
    setSelectedTypeId('');
    setAmount('');
    setNote('');
    setIsModalOpen(true);
  };

  const handleAddExpense = () => {
    const result = addExpenseRecord({
      typeId: selectedTypeId,
      amount: parseFloat(amount),
      note: note.trim() || undefined,
      createdAt: new Date(selectedDate).toISOString()
    });
    if (result.success) {
      setIsModalOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteExpenseRecord(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const formatCNY = (v: number) => `¥${v.toFixed(2)}`;

  const typeIconMap: Record<string, React.ReactNode> = {
    'et_1': <Wallet className="w-4 h-4" />,
    'et_2': <Receipt className="w-4 h-4" />,
    'et_3': <RefreshCw className="w-4 h-4" />,
    'et_4': <PiggyBank className="w-4 h-4" />,
    'et_5': <DollarSign className="w-4 h-4" />
  };

  const getTypeIcon = (typeId: string) => {
    return typeIconMap[typeId] || <DollarSign className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">支出管理</h1>
          <p className="text-slate-500 mt-1">记录和管理店铺日常支出</p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={handleOpenModal}
          className="shadow-lg shadow-sky-500/20"
        >
          记一笔
        </Button>
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={ChevronLeft}
            onClick={() => changeDate(-1)}
          />
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100">
            <CalendarDays className="w-5 h-5 text-sky-600" />
            <div>
              <p className="font-bold text-slate-800">{selectedDate}</p>
              <p className="text-xs text-sky-600 font-medium">{dateLabel}{isToday && ' · 实时数据'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={ChevronRight}
            onClick={() => changeDate(1)}
            disabled={isToday}
          />
        </div>
        <input
          type="date"
          value={selectedDate}
          max={todayStr}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all text-sm font-medium"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {expenseTypes.slice(0, 4).map((type, index) => {
          const StatIcon = statIcons[index] || DollarSign;
          const total = statsByType[type.id] || 0;
          return (
            <div
              key={type.id}
              className={cn(
                'rounded-2xl p-5 border',
                'bg-gradient-to-br',
                type.color.includes('sky') ? 'from-sky-50 to-blue-50 border-sky-100' :
                type.color.includes('emerald') ? 'from-emerald-50 to-teal-50 border-emerald-100' :
                type.color.includes('purple') ? 'from-purple-50 to-indigo-50 border-purple-100' :
                type.color.includes('amber') ? 'from-amber-50 to-orange-50 border-amber-100' :
                'from-slate-50 to-slate-100 border-slate-200'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br',
                  type.color
                )}>
                  <StatIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-600">{type.name}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCNY(total)}</p>
              <p className="text-xs text-slate-500 mt-2">今日支出</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-600" />
            <h3 className="font-bold text-slate-800">支出明细</h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">共 {expenseRecords.length} 条记录</span>
            <span className="text-sm font-bold text-slate-800">
              合计: <span className="text-rose-600">{formatCNY(totalExpense)}</span>
            </span>
          </div>
        </div>

        {expenseRecords.length === 0 ? (
          <EmptyState
            title="暂无支出记录"
            description="点击右上角「记一笔」添加第一条支出记录"
            action={
              <Button variant="primary" icon={Plus} onClick={handleOpenModal}>
                记一笔
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {expenseRecords.map((record) => {
              const type = getTypeById(record.typeId);
              return (
                <div
                  key={record.id}
                  className="px-5 py-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-lg font-bold text-slate-800">
                        {formatTime(record.createdAt)}
                      </p>
                    </div>
                    <div className={cn(
                      'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center',
                      type?.color || 'from-slate-400 to-slate-500'
                    )}>
                      {type && getTypeIcon(type.id)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-white bg-gradient-to-r',
                          type?.color || 'from-slate-400 to-slate-500'
                        )}>
                          {type?.name || '未知类型'}
                        </span>
                      </div>
                      {record.note && (
                        <p className="text-sm text-slate-500 mt-1">{record.note}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-rose-600">
                      -{formatCNY(record.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => handleDelete(record.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="记一笔支出"
        size="lg"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">选择支出类型</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {expenseTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedTypeId(type.id)}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all text-left',
                    selectedTypeId === type.id
                      ? cn('border-transparent ring-2 ring-offset-2 ring-sky-500', 'bg-gradient-to-br', type.color)
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center mb-2 bg-gradient-to-br',
                    type.color
                  )}>
                    {getTypeIcon(type.id)}
                  </div>
                  <p className={cn(
                    'font-semibold text-sm',
                    selectedTypeId === type.id ? 'text-white' : 'text-slate-800'
                  )}>
                    {type.name}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">支出金额</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">¥</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all text-lg font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">备注说明（可选）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：采购洗衣液5桶..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all resize-none text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleAddExpense}
              disabled={!selectedTypeId || !amount || parseFloat(amount) <= 0}
              className="shadow-lg shadow-sky-500/20"
            >
              确认记录
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="确认删除"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-slate-600">确定要删除这条支出记录吗？此操作无法撤销。</p>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmId(null)}
            >
              取消
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              className="shadow-lg shadow-rose-500/20"
            >
              确认删除
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Car,
  Crown,
  Banknote,
  Wallet,
  Sparkles,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  Receipt,
  CreditCard,
  TrendingUp,
  TrendingDown,
  FileText
} from 'lucide-react';
import { Button } from '@/components/Button';
import { useQueueStore } from '@/store/queueStore';
import { useConfigStore } from '@/store/configStore';
import { useExpenseStore } from '@/store/expenseStore';
import { formatDate } from '@/utils';
import type { WashRecord, ExpenseRecord } from '@/types';

export default function StatisticsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const getWashRecordsByDate = useQueueStore(s => s.getWashRecordsByDate);
  const getRechargeRecordsByDate = useQueueStore(s => s.getRechargeRecordsByDate);
  const getExpenseRecordsByDate = useExpenseStore(s => s.getExpenseRecordsByDate);
  const getExpenseTotalByDate = useExpenseStore(s => s.getExpenseTotalByDate);
  const expenseTypes = useExpenseStore(s => s.expenseTypes);
  const config = useConfigStore(s => s.systemConfig);

  const todayStr = formatDate(new Date());

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(formatDate(d));
  };

  const washRecords = useMemo(() => getWashRecordsByDate(selectedDate), [selectedDate, getWashRecordsByDate]);
  const rechargeRecords = useMemo(() => getRechargeRecordsByDate(selectedDate), [selectedDate, getRechargeRecordsByDate]);
  const expenseRecords = useMemo(() => getExpenseRecordsByDate(selectedDate), [selectedDate, getExpenseRecordsByDate]);
  const totalExpense = useMemo(() => getExpenseTotalByDate(selectedDate), [selectedDate, getExpenseTotalByDate]);

  const stats = useMemo(() => {
    const totalWashes = washRecords.length;
    const memberWashes = washRecords.filter(r => r.type === 'member').length;
    const cashWashes = washRecords.filter(r => r.type === 'cash').length;

    const memberDeductCount = washRecords.filter(r => r.paymentType === 'member_deduct').length;
    const memberCashCount = washRecords.filter(r => r.paymentType === 'member_cash').length;
    const memberRechargeCount = washRecords.filter(r => r.paymentType === 'member_recharge_deduct').length;

    const washesUsedTotal = washRecords.reduce((sum, r) => sum + (r.washesUsed || 0), 0);
    const bonusWashesTotal = washRecords.reduce((sum, r) => sum + (r.bonusWashesAdded || 0), 0);

    const cashIncome = washRecords.reduce((sum, r) => {
      if (r.paymentType === 'cash' || r.paymentType === 'member_cash') {
        return sum + (r.amount || 0);
      }
      return sum;
    }, 0);

    const memberCashOnly = washRecords.filter(r => r.paymentType === 'member_cash').reduce((s, r) => s + (r.amount || 0), 0);
    const guestCashOnly = washRecords.filter(r => r.paymentType === 'cash').reduce((s, r) => s + (r.amount || 0), 0);

    const rechargeIncomeFromWash = washRecords.reduce((sum, r) => {
      if (r.paymentType === 'member_recharge_deduct') {
        return sum + (r.rechargeAmount || 0);
      }
      return sum;
    }, 0);

    const rechargeIncomeFromPage = rechargeRecords
      .filter(r => r.source === 'recharge_page' || r.source === undefined)
      .reduce((sum, r) => sum + r.amount, 0);
    const rechargeIncomeFromSettlement = rechargeRecords
      .filter(r => r.source === 'settlement')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalRechargeIncome = rechargeIncomeFromPage + rechargeIncomeFromSettlement;

    const totalIncome = cashIncome + totalRechargeIncome;
    const totalBonusWashes = bonusWashesTotal + rechargeRecords.reduce((sum, r) => sum + (r.bonusWashes || 0), 0);
    const totalWashesAddedFromRecharge = washesUsedTotal - memberDeductCount + rechargeRecords.reduce((sum, r) => sum + r.washesAdded, 0);

    const netProfit = totalIncome - totalExpense;

    const expenseByType: Record<string, number> = {};
    expenseRecords.forEach(r => {
      expenseByType[r.typeId] = (expenseByType[r.typeId] || 0) + r.amount;
    });

    return {
      totalWashes,
      memberWashes,
      cashWashes,
      memberDeductCount,
      memberCashCount,
      memberRechargeCount,
      washesUsedTotal,
      bonusWashesTotal,
      cashIncome,
      memberCashOnly,
      guestCashOnly,
      rechargeIncomeFromWash,
      rechargeIncomeFromPage,
      rechargeIncomeFromSettlement,
      totalRechargeIncome,
      totalIncome,
      totalBonusWashes,
      totalWashesAddedFromRecharge,
      totalExpense,
      netProfit,
      expenseByType
    };
  }, [washRecords, rechargeRecords, expenseRecords, totalExpense]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const lines: string[] = [];
    lines.push(`洗车店打烊结算单 - ${selectedDate}`);
    lines.push('');
    lines.push('【汇总统计】');
    lines.push(`洗车总数,${stats.totalWashes}`);
    lines.push(`会员洗车,${stats.memberWashes}`);
    lines.push(`散客洗车,${stats.cashWashes}`);
    lines.push(`会员卡扣次数,${stats.memberDeductCount}`);
    lines.push(`会员现金支付,${stats.memberCashCount}`);
    lines.push(`会员充值后扣次,${stats.memberRechargeCount}`);
    lines.push(`赠送洗车次数,${stats.totalBonusWashes}`);
    lines.push('');
    lines.push('【收入明细】');
    lines.push(`散客现金收入,¥${stats.guestCashOnly.toFixed(2)}`);
    lines.push(`会员现金支付,¥${stats.memberCashOnly.toFixed(2)}`);
    lines.push(`现金收入小计,¥${stats.cashIncome.toFixed(2)}`);
    lines.push(`充值收入（结算时）,¥${stats.rechargeIncomeFromSettlement.toFixed(2)}`);
    lines.push(`充值收入（充卡页）,¥${stats.rechargeIncomeFromPage.toFixed(2)}`);
    lines.push(`充值收入合计,¥${stats.totalRechargeIncome.toFixed(2)}`);
    lines.push(`当日总收入,¥${stats.totalIncome.toFixed(2)}`);
    lines.push('');
    lines.push('【支出明细】');
    lines.push(`总支出,¥${stats.totalExpense.toFixed(2)}`);
    lines.push(`净利润,¥${stats.netProfit.toFixed(2)}`);
    if (Object.keys(stats.expenseByType).length > 0) {
      lines.push('');
      lines.push('【支出分类汇总】');
      Object.entries(stats.expenseByType).forEach(([typeId, amount]) => {
        const type = expenseTypes.find(t => t.id === typeId);
        lines.push(`${type?.name || '其他'},¥${amount.toFixed(2)}`);
      });
    }
    lines.push('');
    lines.push('【洗车明细】');
    lines.push('时间,车牌号,类型,支付方式,金额,扣次,赠送次数,备注');
    washRecords.forEach(r => {
      const time = new Date(r.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const typeLabel = r.type === 'member' ? '会员' : '散客';
      const payLabel: Record<string, string> = {
        member_deduct: '卡扣次数',
        member_cash: '现金支付',
        member_recharge_deduct: '充值后扣次',
        cash: '现金支付'
      };
      lines.push(`${time},${r.plateNumber},${typeLabel},${payLabel[r.paymentType] || r.paymentType},¥${r.amount},${r.washesUsed || 0},${r.bonusWashesAdded || 0},${r.note || ''}`);
    });
    lines.push('');
    lines.push('【充值明细】');
    lines.push('时间,会员,充值金额,到账次数,赠送次数,来源');
    rechargeRecords.forEach(r => {
      const time = new Date(r.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const sourceLabel = r.source === 'settlement' ? '结算时充值' : r.source === 'recharge_page' ? '充卡页充值' : '充卡页充值';
      lines.push(`${time},${r.memberName},¥${r.amount},${r.washesAdded},${r.bonusWashes},${sourceLabel}`);
    });
    lines.push('');
    lines.push(`导出时间：${new Date().toLocaleString('zh-CN')}`);

    const csv = '\uFEFF' + lines.map(line => line).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `打烊结算单_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatCNY = (v: number) => `¥${v.toFixed(2)}`;

  const dateLabel = (() => {
    if (selectedDate === todayStr) return '今天';
    const y = new Date(selectedDate);
    const t = new Date(todayStr);
    const diff = Math.round((t.getTime() - y.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) return '昨天';
    if (diff === 2) return '前天';
    return y.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  })();

  const isToday = selectedDate === todayStr;

  const getPaymentBadge = (r: WashRecord) => {
    switch (r.paymentType) {
      case 'member_deduct':
        return { label: '卡扣', icon: <CreditCard className="w-3 h-3" />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'member_cash':
        return { label: '现金', icon: <Banknote className="w-3 h-3" />, color: 'bg-sky-100 text-sky-700 border-sky-200' };
      case 'member_recharge_deduct':
        return { label: '充值', icon: <Wallet className="w-3 h-3" />, color: 'bg-purple-100 text-purple-700 border-purple-200' };
      default:
        return { label: '现金', icon: <Banknote className="w-3 h-3" />, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">打烊结算单</h1>
          <p className="text-slate-500 mt-1">按日期查看每日营业数据</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={Download}
            onClick={handleExportCSV}
          >
            导出CSV
          </Button>
          <Button
            variant="primary"
            icon={Printer}
            onClick={handlePrint}
            className="shadow-lg shadow-sky-500/20"
          >
            打印结算单
          </Button>
        </div>
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

      <div id="print-area" className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-8 print:border-none print:p-4 print:shadow-none">
          <div className="text-center mb-8 pb-6 border-b border-dashed border-slate-200">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
                <Car className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-wide">洗车店 · 打烊结算单</h1>
            <div className="mt-3 flex items-center justify-center gap-6 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                营业日期：<span className="font-semibold text-slate-800">{selectedDate}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                打印时间：<span className="font-semibold text-slate-800">{new Date().toLocaleString('zh-CN')}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="rounded-2xl p-5 bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100">
              <div className="flex items-center gap-2 mb-2 text-sky-600">
                <Car className="w-4 h-4" />
                <span className="text-sm font-medium">洗车总数</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.totalWashes}</p>
              <p className="text-xs text-slate-500 mt-2">辆</p>
            </div>
            <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
              <div className="flex items-center gap-2 mb-2 text-amber-600">
                <Crown className="w-4 h-4" />
                <span className="text-sm font-medium">会员洗车</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.memberWashes}</p>
              <p className="text-xs text-slate-500 mt-2">占比 {stats.totalWashes ? Math.round(stats.memberWashes / stats.totalWashes * 100) : 0}%</p>
            </div>
            <div className="rounded-2xl p-5 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
              <div className="flex items-center gap-2 mb-2 text-slate-600">
                <Banknote className="w-4 h-4" />
                <span className="text-sm font-medium">散客洗车</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.cashWashes}</p>
              <p className="text-xs text-slate-500 mt-2">占比 {stats.totalWashes ? Math.round(stats.cashWashes / stats.totalWashes * 100) : 0}%</p>
            </div>
            <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">总收入</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{formatCNY(stats.totalIncome)}</p>
              <p className="text-xs text-slate-500 mt-2">现金+充值</p>
            </div>
            <div className="rounded-2xl p-5 bg-gradient-to-br from-rose-50 to-red-50 border border-rose-100">
              <div className="flex items-center gap-2 mb-2 text-rose-600">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-medium">总支出</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{formatCNY(stats.totalExpense)}</p>
              <p className="text-xs text-slate-500 mt-2">成本支出</p>
            </div>
            <div className="rounded-2xl p-5 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100">
              <div className="flex items-center gap-2 mb-2 text-violet-600">
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-medium">净利润</span>
              </div>
              <p className={`text-3xl font-bold ${stats.netProfit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{formatCNY(stats.netProfit)}</p>
              <p className="text-xs text-slate-500 mt-2">收入-支出</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-800">结算方式分布</h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                      会员卡扣次数
                    </span>
                    <span className="text-sm font-bold text-slate-800">{stats.memberDeductCount} 次 <span className="font-normal text-slate-400">({formatCNY(0)})</span></span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                      style={{ width: `${stats.totalWashes ? (stats.memberDeductCount / stats.totalWashes) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-sky-500" />
                      散客现金 + 会员现金
                    </span>
                    <span className="text-sm font-bold text-slate-800">{stats.cashWashes + stats.memberCashCount} 次 <span className="font-normal text-slate-400">({formatCNY(stats.cashIncome)})</span></span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500"
                      style={{ width: `${stats.totalWashes ? ((stats.cashWashes + stats.memberCashCount) / stats.totalWashes) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-purple-500" />
                      充值后扣次
                    </span>
                    <span className="text-sm font-bold text-slate-800">{stats.memberRechargeCount} 次 <span className="font-normal text-slate-400">({formatCNY(stats.rechargeIncomeFromWash)})</span></span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-400 to-indigo-500"
                      style={{ width: `${stats.totalWashes ? (stats.memberRechargeCount / stats.totalWashes) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-800">收入明细</h3>
              </div>
              <div className="p-5">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 pr-4 text-slate-600">散客现金收入</td>
                      <td className="py-3 text-right font-semibold text-slate-800">{formatCNY(stats.guestCashOnly)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 text-slate-600">会员现金支付</td>
                      <td className="py-3 text-right font-semibold text-slate-800">{formatCNY(stats.memberCashOnly)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 text-slate-600">充值收入（结算时）</td>
                      <td className="py-3 text-right font-semibold text-purple-600">{formatCNY(stats.rechargeIncomeFromSettlement)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 text-slate-600">充值收入（充卡页）</td>
                      <td className="py-3 text-right font-semibold text-purple-600">{formatCNY(stats.rechargeIncomeFromPage)}</td>
                    </tr>
                    <tr className="bg-gradient-to-r from-purple-50 to-indigo-50">
                      <td className="py-4 pr-4 font-bold text-slate-800">充值收入合计</td>
                      <td className="py-4 text-right font-bold text-purple-700 text-lg">{formatCNY(stats.totalRechargeIncome)}</td>
                    </tr>
                    <tr className="bg-gradient-to-r from-emerald-50 to-teal-50">
                      <td className="py-4 pr-4 font-bold text-slate-800">当日总收入</td>
                      <td className="py-4 text-right font-bold text-emerald-700 text-2xl">{formatCNY(stats.totalIncome)}</td>
                    </tr>
                  </tbody>
                </table>
                {stats.totalBonusWashes > 0 && (
                  <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-amber-800">
                      当日赠送 <span className="font-bold">{stats.totalBonusWashes}</span> 次洗车服务
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-rose-50 to-red-50 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-rose-600" />
                  <h3 className="font-bold text-slate-800">支出明细</h3>
                </div>
                <span className="text-sm text-slate-500">共 {expenseRecords.length} 条记录</span>
              </div>
              <div className="p-5">
                {expenseRecords.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Wallet className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-slate-400 text-sm">当日暂无支出记录</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {expenseRecords.map((r: ExpenseRecord) => {
                      const type = expenseTypes.find(t => t.id === r.typeId);
                      return (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-8 rounded-full" style={{ background: type?.color || '#94a3b8' }} />
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{type?.name || '其他'}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(r.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                {r.note && ` · ${r.note}`}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-rose-600">-{formatCNY(r.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {Object.keys(stats.expenseByType).length > 0 && (
                  <div className="mt-5 pt-4 border-t border-dashed border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-3">分类汇总</p>
                    <div className="space-y-2">
                      {Object.entries(stats.expenseByType).map(([typeId, amount]) => {
                        const type = expenseTypes.find(t => t.id === typeId);
                        return (
                          <div key={typeId} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: type?.color || '#94a3b8' }} />
                              {type?.name || '其他'}
                            </span>
                            <span className="font-semibold text-slate-800">{formatCNY(amount)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-600" />
                <h3 className="font-bold text-slate-800">经营概览</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">营业收入</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatCNY(stats.totalIncome)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-100">
                  <div>
                    <p className="text-xs text-rose-600 font-medium">营业支出</p>
                    <p className="text-2xl font-bold text-rose-700">{formatCNY(stats.totalExpense)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-rose-500" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200">
                  <div>
                    <p className="text-xs text-violet-600 font-medium">当日净利润</p>
                    <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-violet-700' : 'text-rose-700'}`}>
                      {formatCNY(stats.netProfit)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-violet-500" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-500">洗车均价</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">
                      {stats.totalWashes ? formatCNY(stats.cashIncome / stats.totalWashes) : formatCNY(0)}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-500">单均利润</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">
                      {stats.totalWashes ? formatCNY(stats.netProfit / stats.totalWashes) : formatCNY(0)}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-500">利润率</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">
                      {stats.totalIncome ? `${Math.round(stats.netProfit / stats.totalIncome * 100)}%` : '0%'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden mb-6">
            <div className="px-5 py-4 bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-800">洗车流水明细</h3>
              </div>
              <span className="text-sm text-slate-500">共 {washRecords.length} 条记录</span>
            </div>
            {washRecords.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Car className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400">当日暂无洗车记录</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3 text-left font-semibold text-slate-600">时间</th>
                      <th className="px-5 py-3 text-left font-semibold text-slate-600">车牌号</th>
                      <th className="px-5 py-3 text-left font-semibold text-slate-600">客户类型</th>
                      <th className="px-5 py-3 text-left font-semibold text-slate-600">支付方式</th>
                      <th className="px-5 py-3 text-right font-semibold text-slate-600">金额</th>
                      <th className="px-5 py-3 text-right font-semibold text-slate-600">扣次</th>
                      <th className="px-5 py-3 text-right font-semibold text-slate-600">赠送</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {washRecords.map((r) => {
                      const badge = getPaymentBadge(r);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                            {new Date(r.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-bold tracking-wider text-slate-900">{r.plateNumber}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            {r.type === 'member' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
                                <Crown className="w-3 h-3" />
                                会员
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium">
                                散客
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${badge.color}`}>
                              {badge.icon}
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                            {r.amount > 0 ? formatCNY(r.amount) : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={r.washesUsed > 0 ? 'font-semibold text-emerald-600' : 'text-slate-300'}>
                              {r.washesUsed > 0 ? `-${r.washesUsed}` : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={r.bonusWashesAdded > 0 ? 'font-semibold text-amber-600' : 'text-slate-300'}>
                              {r.bonusWashesAdded > 0 ? `+${r.bonusWashesAdded}` : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {rechargeRecords.length > 0 && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-slate-800">充值明细（充卡页）</h3>
                </div>
                <span className="text-sm text-slate-500">共 {rechargeRecords.length} 条记录</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3 text-left font-semibold text-slate-600">时间</th>
                      <th className="px-5 py-3 text-left font-semibold text-slate-600">会员</th>
                      <th className="px-5 py-3 text-right font-semibold text-slate-600">充值金额</th>
                      <th className="px-5 py-3 text-right font-semibold text-slate-600">到账次数</th>
                      <th className="px-5 py-3 text-right font-semibold text-slate-600">赠送次数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rechargeRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">{r.memberName}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-purple-600">{formatCNY(r.amount)}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">+{r.washesAdded}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-amber-600">+{r.bonusWashes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-dashed border-slate-200 flex items-center justify-between text-sm text-slate-500">
            <div className="flex items-center gap-8">
              <div>
                <p className="mb-2">收银员签字：</p>
                <p className="w-32 h-8 border-b border-slate-300"></p>
              </div>
              <div>
                <p className="mb-2">店主签字：</p>
                <p className="w-32 h-8 border-b border-slate-300"></p>
              </div>
            </div>
            <div className="text-right">
              <p>洗车店营业管理系统</p>
              <p className="text-xs mt-1">本单一式两份，店铺留底</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .print\:hidden { display: none !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  );
}

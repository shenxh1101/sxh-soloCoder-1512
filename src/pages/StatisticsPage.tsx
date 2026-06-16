import React, { useMemo, useState } from 'react';
import {
  Car,
  Users,
  CircleDollarSign,
  Crown,
  TrendingUp,
  Calendar,
  Download,
  AlertTriangle,
  Activity,
  PieChart
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { useQueueStore } from '@/store/queueStore';
import { useMemberStore } from '@/store/memberStore';
import { useConfigStore } from '@/store/configStore';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils';
import type { DailyStats, WashRecord, Member } from '@/types';

const StatisticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<7 | 14 | 30>(7);
  const washRecords = useQueueStore(s => s.washRecords);
  const members = useMemberStore(s => s.members);
  const getRechargeHistory = useMemberStore(s => s.getRechargeHistory);
  const getLowWashMembers = useMemberStore(s => s.getLowWashMembers);
  const systemConfig = useConfigStore(s => s.systemConfig);

  const lowWashMembers = getLowWashMembers();
  const threshold = systemConfig.lowWashThreshold;

  const statsData = useMemo(() => {
    const dailyStatsMap = new Map<string, DailyStats>();

    const now = new Date();
    for (let i = dateRange - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = formatDate(date);
      dailyStatsMap.set(dateStr, {
        date: dateStr,
        totalWashes: 0,
        memberWashes: 0,
        cashWashes: 0,
        cashIncome: 0,
        memberRecharge: 0
      });
    }

    washRecords
      .filter(r => r.status === 'completed')
      .forEach(record => {
        const date = formatDate(new Date(record.createdAt));
        if (dailyStatsMap.has(date)) {
          const stats = dailyStatsMap.get(date)!;
          stats.totalWashes++;
          if (record.type === 'member') {
            stats.memberWashes++;
          } else {
            stats.cashWashes++;
            stats.cashIncome += record.amount;
          }
        }
      });

    members.forEach(member => {
      const history = getRechargeHistory(member.id);
      history.forEach(r => {
        const date = formatDate(new Date(r.createdAt));
        if (dailyStatsMap.has(date)) {
          dailyStatsMap.get(date)!.memberRecharge += r.amount;
        }
      });
    });

    return Array.from(dailyStatsMap.values()).reverse();
  }, [washRecords, members, dateRange, getRechargeHistory]);

  const totalStats = useMemo(() => {
    const totalWashes = statsData.reduce((s, d) => s + d.totalWashes, 0);
    const memberWashes = statsData.reduce((s, d) => s + d.memberWashes, 0);
    const cashWashes = statsData.reduce((s, d) => s + d.cashWashes, 0);
    const cashIncome = statsData.reduce((s, d) => s + d.cashIncome, 0);
    const memberRecharge = statsData.reduce((s, d) => s + d.memberRecharge, 0);
    return { totalWashes, memberWashes, cashWashes, cashIncome, memberRecharge };
  }, [statsData]);

  const maxWashes = Math.max(...statsData.map(d => d.totalWashes), 1);

  const memberRankings = useMemo(() => {
    return [...members]
      .sort((a, b) => b.totalWashes - a.totalWashes)
      .slice(0, 8);
  }, [members]);

  const exportData = () => {
    const lines: string[] = [];
    lines.push('日期,总洗车数,会员洗车,散客洗车,现金收入,会员充值');
    statsData.forEach(d => {
      lines.push(`${d.date},${d.totalWashes},${d.memberWashes},${d.cashWashes},${d.cashIncome},${d.memberRecharge}`);
    });
    lines.push('');
    lines.push('汇总,,,,,');
    lines.push(`,${totalStats.totalWashes},${totalStats.memberWashes},${totalStats.cashWashes},${totalStats.cashIncome},${totalStats.memberRecharge}`);

    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `洗车店统计_${formatDate(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasData = washRecords.length > 0 || members.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">统计报表</h1>
          <p className="text-slate-500 mt-1">
            查看洗车量、收入和会员消费趋势
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            {([7, 14, 30] as const).map(days => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium text-sm transition-all',
                  dateRange === days
                    ? 'bg-white text-sky-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                近{days}天
              </button>
            ))}
          </div>
          <Button variant="secondary" icon={Download} onClick={exportData}>
            导出CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard
          title="总洗车数"
          value={totalStats.totalWashes}
          subtitle="辆"
          icon={Car}
          color="sky"
        />
        <StatCard
          title="会员洗车"
          value={totalStats.memberWashes}
          subtitle="辆"
          icon={Crown}
          color="amber"
        />
        <StatCard
          title="散客洗车"
          value={totalStats.cashWashes}
          subtitle="辆"
          icon={Users}
          color="violet"
        />
        <StatCard
          title="现金收入"
          value={`¥${totalStats.cashIncome}`}
          icon={CircleDollarSign}
          color="emerald"
        />
        <StatCard
          title="会员充值"
          value={`¥${totalStats.memberRecharge}`}
          icon={TrendingUp}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">洗车趋势</h2>
                <p className="text-sm text-slate-500 mt-0.5">每日洗车数量变化</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500" />
                <span className="text-slate-600">总洗车</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-slate-600">会员</span>
              </span>
            </div>
          </div>

          {!hasData ? (
            <EmptyState
              title="暂无数据"
              description="开始营业后将显示统计图表"
            />
          ) : (
            <div className="h-72 flex items-end gap-2">
              {statsData.map(day => (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-2 group"
                >
                  <div className="w-full h-full flex flex-col justify-end gap-0.5">
                    {day.memberWashes > 0 && (
                      <div
                        className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-md transition-all duration-500 hover:from-amber-600 hover:to-amber-500 group-hover:shadow-md"
                        style={{ height: `${(day.memberWashes / maxWashes) * 100}%` }}
                        title={`会员: ${day.memberWashes}辆`}
                      />
                    )}
                    {day.cashWashes > 0 && (
                      <div
                        className="w-full bg-gradient-to-t from-sky-500 to-sky-400 rounded-b-md transition-all duration-500 hover:from-sky-600 hover:to-sky-500 group-hover:shadow-md"
                        style={{
                          height: `${(day.cashWashes / maxWashes) * 100}%`,
                          borderTopLeftRadius: day.memberWashes === 0 ? '0.375rem' : '0',
                          borderTopRightRadius: day.memberWashes === 0 ? '0.375rem' : '0'
                        }}
                        title={`散客: ${day.cashWashes}辆`}
                      />
                    )}
                  </div>
                  <span className="text-xs text-slate-500 group-hover:text-slate-700 font-medium">
                    {day.date.slice(5).replace('-', '/')}
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    {day.totalWashes > 0 ? day.totalWashes : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">收入构成</h2>
              <p className="text-sm text-slate-500 mt-0.5">现金 vs 充值</p>
            </div>
          </div>

          {!hasData ? (
            <EmptyState title="暂无数据" />
          ) : (
            <div className="space-y-6">
              <div className="relative pt-4">
                <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex">
                  {totalStats.cashIncome > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                      style={{
                        width: `${(totalStats.cashIncome / (totalStats.cashIncome + totalStats.memberRecharge || 1)) * 100}%`
                      }}
                    />
                  )}
                  {totalStats.memberRecharge > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                      style={{
                        width: `${(totalStats.memberRecharge / (totalStats.cashIncome + totalStats.memberRecharge || 1)) * 100}%`
                      }}
                    />
                  )}
                </div>
                <div className="flex justify-between mt-4 text-sm">
                  <div>
                    <p className="text-slate-500">现金收入</p>
                    <p className="text-lg font-bold text-emerald-600">¥{totalStats.cashIncome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500">会员充值</p>
                    <p className="text-lg font-bold text-violet-600">¥{totalStats.memberRecharge}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">会员占比</span>
                  <span className="font-semibold text-amber-600">
                    {totalStats.totalWashes > 0
                      ? Math.round((totalStats.memberWashes / totalStats.totalWashes) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">散客占比</span>
                  <span className="font-semibold text-sky-600">
                    {totalStats.totalWashes > 0
                      ? Math.round((totalStats.cashWashes / totalStats.totalWashes) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">日均洗车</span>
                  <span className="font-semibold text-slate-800">
                    {Math.round(totalStats.totalWashes / statsData.length)} 辆
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">会员活跃度排行</h2>
              <p className="text-sm text-slate-500 mt-0.5">累计洗车次数Top 8</p>
            </div>
          </div>

          {memberRankings.length === 0 ? (
            <EmptyState
              title="暂无会员数据"
              description="添加会员并开始服务后显示排行"
            />
          ) : (
            <div className="space-y-2">
              {memberRankings.map((member, idx) => (
                <MemberRankingItem key={member.id} member={member} rank={idx + 1} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">次数预警名单</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                剩余次数 ≤ {threshold} 次的会员
              </p>
            </div>
            {lowWashMembers.length > 0 && (
              <span className="ml-auto px-3 py-1 rounded-full bg-rose-100 text-rose-600 text-sm font-semibold">
                {lowWashMembers.length} 人
              </span>
            )}
          </div>

          {lowWashMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <Crown className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-slate-700">会员状态良好</h3>
              <p className="text-sm text-slate-500 mt-1">暂无需要提醒的会员</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {lowWashMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-100 hover:bg-amber-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold">
                      {member.ownerName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{member.ownerName}</p>
                      <p className="text-xs text-slate-500">{member.plateNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'text-lg font-bold',
                      member.remainingWashes === 0 ? 'text-rose-600' : 'text-amber-600'
                    )}>
                      {member.remainingWashes}
                      <span className="text-xs font-normal ml-1">次</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">每日明细</h2>
            <p className="text-sm text-slate-500 mt-0.5">最近 {dateRange} 天数据</p>
          </div>
        </div>

        {statsData.every(d => d.totalWashes === 0 && d.memberRecharge === 0) ? (
          <EmptyState title="暂无明细数据" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">日期</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">总洗车</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">会员</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">散客</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">现金收入</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">会员充值</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">合计收入</th>
                </tr>
              </thead>
              <tbody>
                {statsData.map(day => (
                  <tr
                    key={day.date}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{day.date}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-lg bg-sky-100 text-sky-700 font-bold">
                        {day.totalWashes}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-amber-600 font-medium">{day.memberWashes}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-slate-600 font-medium">{day.cashWashes}</span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-emerald-600 font-semibold">¥{day.cashIncome}</span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-violet-600 font-semibold">¥{day.memberRecharge}</span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-slate-800 font-bold">
                        ¥{day.cashIncome + day.memberRecharge}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-4 px-4 text-slate-800">合计</td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-3 py-1 rounded-lg bg-sky-500 text-white font-bold">
                      {totalStats.totalWashes}
                    </span>
                  </td>
                  <td className="text-center py-4 px-4 text-amber-600">{totalStats.memberWashes}</td>
                  <td className="text-center py-4 px-4 text-slate-600">{totalStats.cashWashes}</td>
                  <td className="text-right py-4 px-4 text-emerald-600">¥{totalStats.cashIncome}</td>
                  <td className="text-right py-4 px-4 text-violet-600">¥{totalStats.memberRecharge}</td>
                  <td className="text-right py-4 px-4 text-slate-800 text-lg">
                    ¥{totalStats.cashIncome + totalStats.memberRecharge}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const MemberRankingItem: React.FC<{ member: Member; rank: number }> = ({ member, rank }) => {
  const colors = [
    'from-amber-400 to-yellow-500',
    'from-slate-300 to-slate-400',
    'from-orange-300 to-orange-400'
  ];
  const isTop3 = rank <= 3;
  const maxWashes = 100;

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
          isTop3
            ? `bg-gradient-to-br ${colors[rank - 1]} text-white shadow-md`
            : 'bg-slate-100 text-slate-500'
        )}
      >
        {rank}
      </div>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
        {member.ownerName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-slate-800 text-sm truncate">{member.ownerName}</p>
          <p className="text-sm font-bold text-slate-800 ml-2 flex-shrink-0">{member.totalWashes} 次</p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((member.totalWashes / maxWashes) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;

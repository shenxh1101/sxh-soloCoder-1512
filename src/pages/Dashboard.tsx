import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Users,
  CircleDollarSign,
  Clock,
  PlusCircle,
  UserPlus,
  ListPlus,
  Crown,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/Button';
import { useQueueStore } from '@/store/queueStore';
import { useMemberStore } from '@/store/memberStore';
import { useConfigStore } from '@/store/configStore';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const getTodayWashRecords = useQueueStore(s => s.getTodayWashRecords);
  const getWaitingQueue = useQueueStore(s => s.getWaitingQueue);
  const getWashingQueue = useQueueStore(s => s.getWashingQueue);
  const members = useMemberStore(s => s.members);
  const getLowWashMembers = useMemberStore(s => s.getLowWashMembers);
  const getRechargeHistory = useMemberStore(s => s.getRechargeHistory);
  const washDuration = useConfigStore(s => s.systemConfig.washDurationMinutes);
  const lowThreshold = useConfigStore(s => s.systemConfig.lowWashThreshold);

  const todayRecords = getTodayWashRecords();
  const waitingQueue = getWaitingQueue();
  const washingQueue = getWashingQueue();
  const lowWashMembers = getLowWashMembers();

  const totalWashes = todayRecords.filter(r => r.status === 'completed').length;
  const memberWashes = todayRecords.filter(r => r.type === 'member' && r.status === 'completed').length;
  const cashIncome = todayRecords
    .filter(r => r.type === 'cash' && r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);
  const todayRecharge = members.reduce((sum, m) => {
    const history = getRechargeHistory(m.id);
    const today = new Date().toISOString().split('T')[0];
    return sum + history
      .filter(r => r.createdAt.startsWith(today))
      .reduce((s, r) => s + r.amount, 0);
  }, 0);

  const waitingTime = waitingQueue.length * washDuration;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">欢迎回来 👋</h1>
        <p className="text-slate-500 mt-1">
          {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          ，今天也要加油哦！
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="今日洗车"
          value={totalWashes}
          subtitle="辆"
          icon={Car}
          color="sky"
          trend={{ value: `会员 ${memberWashes} 辆`, positive: true }}
        />
        <StatCard
          title="现金收入"
          value={`¥${cashIncome}`}
          icon={CircleDollarSign}
          color="emerald"
          trend={{ value: `充值 ¥${todayRecharge}`, positive: true }}
        />
        <StatCard
          title="待洗车辆"
          value={waitingQueue.length + washingQueue.length}
          subtitle="辆"
          icon={Clock}
          color="amber"
          trend={{
            value: waitingTime > 0
              ? `预计等待 ${waitingTime} 分钟`
              : '暂无等待',
            positive: waitingQueue.length === 0
          }}
        />
        <StatCard
          title="会员总数"
          value={members.length}
          subtitle="人"
          icon={Users}
          color="violet"
          trend={{
            value: lowWashMembers.length > 0
              ? `${lowWashMembers.length} 人次数不足`
              : '会员状态良好',
            positive: lowWashMembers.length === 0
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">快捷操作</h2>
              <p className="text-sm text-slate-500 mt-0.5">快速开始日常工作</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/queue')}
              className="group relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 hover:border-sky-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mb-3 shadow-md shadow-sky-500/25">
                  <ListPlus className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">取号排队</h3>
                <p className="text-sm text-slate-500">新客户到店登记</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/members')}
              className="group relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 hover:border-violet-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-3 shadow-md shadow-violet-500/25">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">新增会员</h3>
                <p className="text-sm text-slate-500">注册新会员账户</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/members')}
              className="group relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3 shadow-md shadow-emerald-500/25">
                  <PlusCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">会员充卡</h3>
                <p className="text-sm text-slate-500">为会员充值洗车次数</p>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">实时排队</h2>
              <p className="text-sm text-slate-500 mt-0.5">当前车辆状态</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/queue')}
            >
              查看全部
            </Button>
          </div>

          {washingQueue.length === 0 && waitingQueue.length === 0 ? (
            <EmptyState
              title="暂无排队车辆"
              description="点击取号按钮为新客户登记"
            />
          ) : (
            <div className="space-y-3">
              {washingQueue.slice(0, 2).map(item => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                        <Car className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{item.plateNumber}</p>
                        <p className="text-xs text-emerald-600 font-medium">正在清洗中...</p>
                      </div>
                    </div>
                    {item.isVip && (
                      <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-700 text-xs font-semibold flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        VIP
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {waitingQueue.slice(0, 3).map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold',
                        item.isVip
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                          : 'bg-slate-400'
                      )}>
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{item.plateNumber}</p>
                        <p className="text-xs text-slate-500">
                          预计等待 {((idx + 1) * washDuration) + (washingQueue.length > 0 ? washDuration : 0)} 分钟
                        </p>
                      </div>
                    </div>
                    {item.isVip && (
                      <Crown className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                </div>
              ))}

              {waitingQueue.length > 3 && (
                <button
                  onClick={() => navigate('/queue')}
                  className="w-full py-2 text-sm text-sky-600 font-medium hover:bg-sky-50 rounded-lg transition-colors"
                >
                  还有 {waitingQueue.length - 3} 辆车...
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {lowWashMembers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">次数预警</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    剩余次数 ≤ {lowThreshold} 次的会员
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {lowWashMembers.slice(0, 6).map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-100 hover:bg-amber-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                      {member.ownerName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{member.ownerName}</p>
                      <p className="text-xs text-slate-500">{member.plateNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'font-bold',
                      member.remainingWashes === 0 ? 'text-rose-600' : 'text-amber-600'
                    )}>
                      {member.remainingWashes} 次
                    </p>
                    <p className="text-xs text-slate-500">剩余</p>
                  </div>
                </div>
              ))}
              {lowWashMembers.length > 6 && (
                <button
                  onClick={() => navigate('/members?filter=low')}
                  className="w-full py-2 text-sm text-amber-600 font-medium hover:bg-amber-50 rounded-lg transition-colors"
                >
                  查看全部 {lowWashMembers.length} 人
                </button>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">今日动态</h2>
                <p className="text-sm text-slate-500 mt-0.5">最近完成的记录</p>
              </div>
            </div>
          </div>

          {todayRecords.length === 0 ? (
            <EmptyState
              title="暂无今日记录"
              description="完成第一笔洗车后将显示在这里"
            />
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...todayRecords]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 8)
                .map(record => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center',
                        record.type === 'member'
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                          : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                      )}>
                        {record.type === 'member' ? (
                          <Crown className="w-4 h-4 text-white" />
                        ) : (
                          <CircleDollarSign className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{record.plateNumber}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(record.createdAt).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold',
                      record.type === 'member'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    )}>
                      {record.type === 'member' ? '会员' : `¥${record.amount}`}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

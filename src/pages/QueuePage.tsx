import React, { useState, useEffect } from 'react';
import {
  Car,
  PlusCircle,
  Play,
  CheckCircle2,
  Crown,
  ArrowUpCircle,
  Clock,
  Timer,
  User,
  X,
  Trash2
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { useQueueStore } from '@/store/queueStore';
import { useMemberStore } from '@/store/memberStore';
import { useConfigStore } from '@/store/configStore';
import { cn } from '@/lib/utils';
import type { QueueItem, Member } from '@/types';

const QueuePage: React.FC = () => {
  const [isTakeNumberModalOpen, setIsTakeNumberModalOpen] = useState(false);
  const [plateInput, setPlateInput] = useState('');
  const [detectedMember, setDetectedMember] = useState<Member | undefined | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const getSortedQueue = useQueueStore(s => s.getSortedQueue);
  const getWashingQueue = useQueueStore(s => s.getWashingQueue);
  const getWaitingQueue = useQueueStore(s => s.getWaitingQueue);
  const getQueuePosition = useQueueStore(s => s.getQueuePosition);
  const takeNumber = useQueueStore(s => s.takeNumber);
  const startWash = useQueueStore(s => s.startWash);
  const completeWash = useQueueStore(s => s.completeWash);
  const cancelQueue = useQueueStore(s => s.cancelQueue);
  const promoteToVip = useQueueStore(s => s.promoteToVip);
  const clearCompleted = useQueueStore(s => s.clearCompleted);

  const findMemberByPlate = useMemberStore(s => s.findMemberByPlate);
  const washDuration = useConfigStore(s => s.systemConfig.washDurationMinutes);
  const cashPrice = useConfigStore(s => s.systemConfig.cashPrice);

  const sortedQueue = getSortedQueue();
  const washingQueue = getWashingQueue();
  const waitingQueue = getWaitingQueue();

  useEffect(() => {
    if (!plateInput) {
      setDetectedMember(null);
      return;
    }
    const member = findMemberByPlate(plateInput);
    setDetectedMember(member || null);
  }, [plateInput, findMemberByPlate]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleTakeNumber = () => {
    const result = takeNumber(plateInput);
    if (result.success) {
      showToast(result.message, 'success');
      setIsTakeNumberModalOpen(false);
      setPlateInput('');
      setDetectedMember(null);
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleStartWash = (id: string) => {
    startWash(id);
    showToast('开始洗车！', 'info');
  };

  const handleCompleteWash = (id: string) => {
    const result = completeWash(id);
    if (result.success) {
      showToast(result.message, result.type === 'member' ? 'success' : 'info');
    } else {
      showToast(result.message, 'error');
    }
  };

  const handlePromoteToVip = (id: string) => {
    promoteToVip(id);
    showToast('已提升为VIP优先！', 'success');
  };

  const calculateWaitTime = (position: number) => {
    const washCount = washingQueue.length;
    const totalWait = (washCount > 0 ? washDuration : 0) + position * washDuration;
    if (totalWait === 0) return '即将开始';
    if (totalWait < 60) return `约 ${totalWait} 分钟`;
    const hours = Math.floor(totalWait / 60);
    const mins = totalWait % 60;
    return `约 ${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
  };

  const QueueCard: React.FC<{ item: QueueItem; position?: number }> = ({ item, position }) => {
    const isWashing = item.status === 'washing';
    const member = item.memberId ? useMemberStore.getState().members.find(m => m.id === item.memberId) : null;

    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg',
          isWashing
            ? 'bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-emerald-200 shadow-md shadow-emerald-100'
            : item.isVip
              ? 'bg-gradient-to-br from-amber-50 via-white to-orange-50 border-amber-200'
              : 'bg-white border-slate-200'
        )}
      >
        {isWashing && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 animate-pulse" />
        )}
        {item.isVip && !isWashing && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />
        )}

        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center shadow-lg',
                  isWashing
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30'
                    : item.isVip
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30'
                      : 'bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-500/20'
                )}
              >
                {isWashing ? (
                  <Timer className="w-7 h-7 text-white animate-pulse" />
                ) : (
                  <span className="text-white font-bold text-lg">#{item.queueNumber}</span>
                )}
              </div>
              <div>
                <p className="text-2xl font-bold tracking-wider text-slate-800">
                  {item.plateNumber}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {item.isVip ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-semibold">
                      <Crown className="w-3 h-3" />
                      VIP会员
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                      <User className="w-3 h-3" />
                      散客
                    </span>
                  )}
                  {member && (
                    <span className="text-xs text-slate-500">
                      {member.ownerName} · 剩 {member.remainingWashes} 次
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm('确定要取消此排队吗？')) {
                  cancelQueue(item.id);
                  showToast('已取消排队', 'info');
                }
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!isWashing && position !== undefined && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-slate-50">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">
                前面还有 <span className="font-bold text-sky-600">{Math.max(0, position - 1)}</span> 辆车
                · {calculateWaitTime(position)}
              </span>
            </div>
          )}

          {isWashing && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-emerald-100/60">
              <Play className="w-4 h-4 text-emerald-600 fill-current" />
              <span className="text-sm font-medium text-emerald-700">
                正在清洗中 · 预计 {washDuration} 分钟完成
              </span>
            </div>
          )}

          <div className="flex gap-2">
            {!isWashing && position === 1 && (
              <Button
                variant="success"
                className="flex-1"
                onClick={() => handleStartWash(item.id)}
                icon={Play}
              >
                开始洗车
              </Button>
            )}
            {!isWashing && position !== undefined && position > 1 && !item.isVip && (
              <Button
                variant="warning"
                className="flex-1"
                onClick={() => handlePromoteToVip(item.id)}
                icon={ArrowUpCircle}
              >
                VIP优先
              </Button>
            )}
            {isWashing && (
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => handleCompleteWash(item.id)}
                icon={CheckCircle2}
              >
                {item.isVip ? '完成(扣次)' : `完成(收¥${cashPrice})`}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
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

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">排队叫号</h1>
          <p className="text-slate-500 mt-1">
            正在洗 <span className="font-bold text-emerald-600">{washingQueue.length}</span> 辆
            · 排队中 <span className="font-bold text-amber-600">{waitingQueue.length}</span> 辆
          </p>
        </div>
        <div className="flex gap-3">
          {sortedQueue.filter(q => q.status === 'completed').length > 0 && (
            <Button
              variant="ghost"
              onClick={() => {
                clearCompleted();
                showToast('已清空已完成记录', 'info');
              }}
              icon={Trash2}
            >
              清空完成
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsTakeNumberModalOpen(true)}
            icon={PlusCircle}
          >
            取号
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {sortedQueue.length === 0 ? (
          <div className="lg:col-span-2 xl:col-span-3">
            <EmptyState
              title="暂无排队车辆"
              description="点击右上角「取号」按钮为新客户登记排队"
              icon={<Car className="w-16 h-16 text-slate-300" />}
            />
          </div>
        ) : (
          sortedQueue
            .filter(q => q.status !== 'completed')
            .map(item => (
              <QueueCard
                key={item.id}
                item={item}
                position={item.status === 'waiting' ? getQueuePosition(item.id) : undefined}
              />
            ))
        )}
      </div>

      <Modal
        isOpen={isTakeNumberModalOpen}
        onClose={() => {
          setIsTakeNumberModalOpen(false);
          setPlateInput('');
          setDetectedMember(null);
        }}
        title="取号登记"
        size="md"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              车牌号码
            </label>
            <input
              type="text"
              value={plateInput}
              onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && plateInput && handleTakeNumber()}
              placeholder="请输入车牌号，如：京A12345"
              className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 text-lg font-bold tracking-wider text-slate-800 placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal transition-all outline-none"
              autoFocus
            />
          </div>

          {plateInput && (
            <div
              className={cn(
                'p-4 rounded-xl border-2 transition-all',
                detectedMember
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
              )}
            >
              {detectedMember ? (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/25">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{detectedMember.ownerName}</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-200/60 text-amber-700 text-xs font-semibold">
                        VIP会员
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm">
                      <span className="text-slate-600">
                        剩余次数：
                        <span className={cn(
                          'font-bold ml-1',
                          detectedMember.remainingWashes <= 3 ? 'text-rose-600' : 'text-emerald-600'
                        )}>
                          {detectedMember.remainingWashes} 次
                        </span>
                      </span>
                    </div>
                    {detectedMember.phone && (
                      <p className="text-xs text-slate-500 mt-1">📱 {detectedMember.phone}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-300 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">散客</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      洗车费用：<span className="font-bold text-emerald-600">¥{cashPrice}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setIsTakeNumberModalOpen(false);
                setPlateInput('');
                setDetectedMember(null);
              }}
            >
              取消
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleTakeNumber}
              disabled={!plateInput}
              icon={PlusCircle}
            >
              确认取号
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QueuePage;

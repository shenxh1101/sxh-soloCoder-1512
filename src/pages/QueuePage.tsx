import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  UserPlus,
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Crown,
  Car,
  ChevronDown,
  Wallet,
  Coins,
  CreditCard,
  Banknote,
  Sparkles,
  Calendar,
  Phone,
  LogIn,
  CalendarDays,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { useQueueStore } from '@/store/queueStore';
import { useMemberStore } from '@/store/memberStore';
import { useConfigStore } from '@/store/configStore';
import { useAppointmentStore } from '@/store/appointmentStore';
import type { QueueItem, Member, Appointment } from '@/types';
import type { WashPaymentType, RechargeRule } from '@/types';
import { formatTime, formatDate } from '@/utils';

export default function QueuePage() {
  const [plateNumber, setPlateNumber] = useState('');
  const [showTakeModal, setShowTakeModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [completingQueue, setCompletingQueue] = useState<QueueItem | null>(null);
  const [paymentChoice, setPaymentChoice] = useState<WashPaymentType>('member_deduct');
  const [rechargeAmount, setRechargeAmount] = useState<number>(0);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [appointmentTab, setAppointmentTab] = useState<'today' | 'pending'>('today');
  const [, forceUpdate] = useState(0);

  const queueStore = useQueueStore();
  const memberStore = useMemberStore();
  const config = useConfigStore(s => s.systemConfig);
  const rechargeRules = useConfigStore(s => s.rechargeRules);
  const appointmentStore = useAppointmentStore();

  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [newMemberPlate, setNewMemberPlate] = useState('');

  const [appointmentPlate, setAppointmentPlate] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(formatDate(new Date()));
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [appointmentOwner, setAppointmentOwner] = useState('');
  const [appointmentPhone, setAppointmentPhone] = useState('');
  const [appointmentNote, setAppointmentNote] = useState('');

  const sortedQueue = queueStore.getSortedQueue();
  const washingQueue = queueStore.getWashingQueue();
  const waitingQueue = queueStore.getWaitingQueue();
  const canStartNew = queueStore.canStartWash();

  const stationCount = config.washStationCount;
  const washDurationMs = config.washDurationMinutes * 60 * 1000;

  const today = formatDate(new Date());
  const todayAppointments = appointmentStore.getTodayAppointments().filter(a => a.status !== 'completed');
  const pendingAppointments = appointmentStore.getPendingAppointments().filter(a => a.appointmentDate !== today);

  const findMember = (plate: string) => {
    return memberStore.findMemberByPlate(plate);
  };

  const handleTakeNumber = () => {
    const result = queueStore.takeNumber(plateNumber);
    if (result.success) {
      setPlateNumber('');
      setShowTakeModal(false);
      forceUpdate(x => x + 1);
    } else {
      alert(result.message);
    }
  };

  const handleAddMember = () => {
    const res = memberStore.addMember(newMemberPlate, ownerName, phone);
    if (res) {
      setShowAddMemberModal(false);
      setOwnerName('');
      setPhone('');
      setShowTakeModal(false);
      setPlateNumber(newMemberPlate);
      setTimeout(() => handleTakeNumberFromNewMember(), 100);
    } else {
      alert('该车牌已存在会员');
    }
  };

  const handleTakeNumberFromNewMember = () => {
    const result = queueStore.takeNumber(newMemberPlate);
    if (result.success) {
      setNewMemberPlate('');
      setPlateNumber('');
    }
  };

  const handleStartWash = (queueId: string) => {
    const result = queueStore.startWash(queueId);
    if (!result.success) {
      alert(result.message);
    }
    forceUpdate(x => x + 1);
  };

  const openCompleteModal = (item: QueueItem) => {
    setCompletingQueue(item);
    setCashAmount(config.cashPrice);
    setPaymentChoice('member_deduct');
    if (item.isVip && item.memberId) {
      const member = memberStore.members.find(m => m.id === item.memberId);
      if (member && member.remainingWashes <= 0) {
        setPaymentChoice('member_cash');
      }
    } else {
      setPaymentChoice('cash');
    }
    setRechargeAmount(0);
    setShowCompleteModal(true);
  };

  const handleCompleteWash = () => {
    if (!completingQueue) return;
    const options = {
      paymentType: paymentChoice,
      cashAmount: cashAmount,
      rechargeAmount: rechargeAmount,
      bonusWashes: 0
    };
    const result = queueStore.completeWash(completingQueue.id, options);
    if (result.success) {
      setShowCompleteModal(false);
      setCompletingQueue(null);
      forceUpdate(x => x + 1);
    } else {
      alert(result.message);
    }
  };

  const openAppointmentModal = () => {
    setAppointmentPlate('');
    setAppointmentDate(today);
    setAppointmentTime('09:00');
    setAppointmentOwner('');
    setAppointmentPhone('');
    setAppointmentNote('');
    setShowAppointmentModal(true);
  };

  const handleAddAppointment = () => {
    const result = appointmentStore.addAppointment({
      plateNumber: appointmentPlate,
      appointmentDate,
      appointmentTime,
      ownerName: appointmentOwner || undefined,
      phone: appointmentPhone || undefined,
      note: appointmentNote || undefined
    });
    if (result.success) {
      setShowAppointmentModal(false);
      forceUpdate(x => x + 1);
    } else {
      alert(result.message);
    }
  };

  const handleMarkArrived = (appointmentId: string) => {
    const result = appointmentStore.markAsArrived(appointmentId);
    if (result.success) {
      forceUpdate(x => x + 1);
      alert(result.message);
    } else {
      alert(result.message);
    }
  };

  const handleCancelAppointment = (appointmentId: string) => {
    if (confirm('确定取消该预约吗？')) {
      appointmentStore.cancelAppointment(appointmentId);
      forceUpdate(x => x + 1);
    }
  };

  const getRemainingTime = (item: QueueItem) => {
    if (item.status !== 'washing' || !item.startedAt) return null;
    const elapsed = Date.now() - new Date(item.startedAt).getTime();
    const remaining = Math.max(0, washDurationMs - elapsed);
    return remaining;
  };

  const getRemainingTimeText = (item: QueueItem) => {
    const remaining = getRemainingTime(item);
    if (remaining === null) return '';
    const mins = Math.ceil(remaining / 60000);
    if (mins <= 0) return '即将完成';
    return `剩余 ${mins} 分钟`;
  };

  const getProgressPercent = (item: QueueItem) => {
    if (item.status !== 'washing' || !item.startedAt) return 0;
    const elapsed = Date.now() - new Date(item.startedAt).getTime();
    return Math.min(100, (elapsed / washDurationMs) * 100);
  };

  useEffect(() => {
    const timer = setInterval(() => forceUpdate(x => x + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const completingMember = completingQueue?.isVip && completingQueue.memberId
    ? memberStore.members.find(m => m.id === completingQueue.memberId)
    : null;

  const getSelectedRuleBonus = () => {
    if (!rechargeAmount) return 0;
    const matchedRule = rechargeRules
      .filter(r => r.amount <= rechargeAmount)
      .sort((a, b) => b.amount - a.amount)[0];
    return matchedRule?.bonusWashes || 0;
  };

  const renderStationCards = () => {
    const stations = [];
    for (let i = 1; i <= stationCount; i++) {
      const washingItem = washingQueue.find(q => q.stationNumber === i);
      stations.push(
        <div
          key={i}
          className={`rounded-2xl border-2 p-5 transition-all ${
            washingItem
              ? 'bg-gradient-to-br from-emerald-50 to-sky-50 border-emerald-200 shadow-lg shadow-emerald-100'
              : 'bg-slate-50 border-slate-200 border-dashed'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                washingItem ? 'bg-gradient-to-br from-emerald-400 to-sky-500 text-white shadow-md' : 'bg-slate-200 text-slate-400'
              }`}>
                <Car className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-800">{i} 号工位</p>
                <p className="text-xs text-slate-500">
                  {washingItem ? '洗车中' : '空闲'}
                </p>
              </div>
            </div>
            {washingItem && washingItem.isVip && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold shadow-sm">
                <Crown className="w-3 h-3" />
                VIP
              </span>
            )}
          </div>

          {washingItem ? (
            <>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-slate-900 tracking-wider">{washingItem.plateNumber}</span>
              </div>
              {washingItem.isVip && completingMember && (
                <p className="text-sm text-slate-600 mb-3">
                  {completingMember && completingMember.ownerName} · 剩余 {completingMember.remainingWashes} 次
                </p>
              )}
              <div className="w-full h-2 bg-slate-200 rounded-full mb-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-500 transition-all duration-1000"
                  style={{ width: `${getProgressPercent(washingItem)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(washingItem.startedAt!)} 开始
                </span>
                <span className="text-sm font-bold text-emerald-600">{getRemainingTimeText(washingItem)}</span>
              </div>
              <Button
                variant="success"
                icon={CheckCircle2}
                onClick={() => openCompleteModal(washingItem)}
                className="w-full"
              >
                完成结算
              </Button>
            </>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-200/50 flex items-center justify-center mx-auto mb-2">
                <ChevronDown className="w-6 h-6 animate-bounce" />
              </div>
              <p className="text-sm">等待车辆入位</p>
            </div>
          )}
        </div>
      );
    }
    return stations;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">排队叫号</h1>
          <p className="text-slate-500 mt-1">工位：{stationCount} 个 · 每车约 {config.washDurationMinutes} 分钟</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            icon={Calendar}
            onClick={openAppointmentModal}
          >
            预约
          </Button>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setPlateNumber('');
              setShowTakeModal(true);
            }}
          >
            取号
          </Button>
        </div>
      </div>

      {(todayAppointments.length > 0 || pendingAppointments.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-md">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">预约管理</h2>
                <p className="text-xs text-slate-500">今日 {todayAppointments.length} 个预约 · 待预约 {pendingAppointments.length} 个</p>
              </div>
            </div>
            <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
              <button
                onClick={() => setAppointmentTab('today')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  appointmentTab === 'today'
                    ? 'bg-white shadow-sm text-indigo-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                今日预约 {todayAppointments.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-xs">{todayAppointments.length}</span>}
              </button>
              <button
                onClick={() => setAppointmentTab('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  appointmentTab === 'pending'
                    ? 'bg-white shadow-sm text-indigo-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                待预约 {pendingAppointments.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-xs">{pendingAppointments.length}</span>}
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {(appointmentTab === 'today' ? todayAppointments : pendingAppointments).map((apt: Appointment) => {
              const member = apt.memberId ? memberStore.members.find(m => m.id === apt.memberId) : null;
              return (
                <div key={apt.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
                      apt.status === 'pending'
                        ? 'bg-gradient-to-br from-purple-400 to-indigo-500'
                        : apt.status === 'arrived'
                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                        : 'bg-gradient-to-br from-slate-400 to-slate-500'
                    }`}>
                      {apt.plateNumber.slice(-4)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 tracking-wider">{apt.plateNumber}</span>
                        {apt.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium border border-purple-200">
                            待到店
                          </span>
                        )}
                        {apt.status === 'arrived' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200">
                            已到店
                          </span>
                        )}
                        {apt.status === 'cancelled' && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200">
                            已取消
                          </span>
                        )}
                        {member && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                            <Crown className="w-3 h-3" />
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {apt.appointmentDate} {apt.appointmentTime}
                        </span>
                        {(apt.ownerName || member) && (
                          <span className="flex items-center gap-1">
                            <UserPlus className="w-3.5 h-3.5" />
                            {apt.ownerName || member?.ownerName}
                          </span>
                        )}
                        {apt.note && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {apt.note}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {apt.status === 'pending' && (
                      <>
                        <Button
                          variant="success"
                          icon={LogIn}
                          size="sm"
                          onClick={() => handleMarkArrived(apt.id)}
                        >
                          到店
                        </Button>
                        <Button
                          variant="danger"
                          icon={XCircle}
                          size="sm"
                          onClick={() => handleCancelAppointment(apt.id)}
                        >
                          取消
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {(appointmentTab === 'today' ? todayAppointments : pendingAppointments).length === 0 && (
              <div className="py-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
                  <CalendarDays className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-slate-400">{appointmentTab === 'today' ? '今日暂无预约' : '暂无待预约'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {washingQueue.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            洗车工位 ({washingQueue.length}/{stationCount} 使用中)
          </h2>
          <div className={`grid gap-4 ${stationCount === 1 ? 'grid-cols-1' : stationCount === 2 ? 'grid-cols-2' : stationCount === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
            {renderStationCards()}
          </div>
        </div>
      )}

      {waitingQueue.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            等待队列 ({waitingQueue.length} 辆)
          </h2>
          <div className="space-y-3">
            {waitingQueue.map((item, idx) => {
              const info = queueStore.getWaitingInfo(item.id);
              const member = item.isVip && item.memberId
                ? memberStore.members.find(m => m.id === item.memberId)
                : null;
              const isFirst = info.position === 1;
              const canStart = isFirst && canStartNew;
              const progressPercent = Math.round((1 - idx / waitingQueue.length) * 100);

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border p-4 transition-all hover:shadow-md ${
                    canStart
                      ? 'border-emerald-300 shadow-sm shadow-emerald-100 bg-gradient-to-r from-white to-emerald-50'
                      : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0 ${
                        item.isVip
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-200'
                          : canStart
                          ? 'bg-gradient-to-br from-emerald-400 to-sky-500 shadow-emerald-200'
                          : 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-200'
                      }`}>
                        #{item.queueNumber.toString().padStart(2, '0')}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-2xl font-bold text-slate-900 tracking-wider">{item.plateNumber}</span>
                          {item.isVip && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold shadow-sm">
                              <Crown className="w-3 h-3" />
                              VIP
                            </span>
                          )}
                          {canStart && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-sky-500 text-white text-xs font-bold shadow-sm animate-pulse">
                              <Sparkles className="w-3 h-3" />
                              可开始
                            </span>
                          )}
                        </div>

                        {item.isVip && member && (
                          <p className="text-sm text-slate-600 mt-1 truncate">
                            {member.ownerName} · 剩余 <span className={member.remainingWashes <= config.lowWashThreshold ? 'text-rose-500 font-bold' : 'text-emerald-600 font-bold'}>{member.remainingWashes}</span> 次
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-sm">
                          {info.position > 1 && (
                            <span className="text-slate-500">前面有 {info.position - 1} 辆车</span>
                          )}
                          <span className={`font-semibold ${
                            canStart
                              ? 'text-emerald-600'
                              : 'text-sky-600'
                          }`}>
                            <Clock className="w-3.5 h-3.5 inline mr-1" />
                            {info.displayText}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {formatTime(item.createdAt)} 取号
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0 items-end">
                      {canStart && (
                        <Button
                          variant="primary"
                          icon={PlayCircle}
                          onClick={() => handleStartWash(item.id)}
                          className="shadow-lg shadow-sky-500/30"
                        >
                          开始洗车
                        </Button>
                      )}
                      <div className="flex gap-2">
                        {!item.isVip && (
                          <Button
                            variant="warning"
                            icon={Crown}
                            size="sm"
                            onClick={() => queueStore.promoteToVip(item.id)}
                          >
                            VIP优先
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          icon={XCircle}
                          size="sm"
                          onClick={() => {
                            if (confirm('确定取消此排队号吗？')) {
                              queueStore.cancelQueue(item.id);
                              forceUpdate(x => x + 1);
                            }
                          }}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  </div>
                  {waitingQueue.length > 1 && (
                    <div className="mt-3 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {waitingQueue.length === 0 && washingQueue.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-100 to-sky-100 flex items-center justify-center mx-auto mb-4">
            <Car className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">暂无车辆</h3>
          <p className="text-slate-500 mt-2">点击右上角「取号」开始接待客户</p>
        </div>
      )}

      <Modal
        isOpen={showTakeModal}
        onClose={() => setShowTakeModal(false)}
        title="取号排队"
        size="md"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">车牌号码</label>
            <input
              type="text"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
              placeholder="例如：沪A12345 或 12345"
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all text-lg font-medium tracking-wider"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTakeNumber();
              }}
            />
          </div>

          {plateNumber && (() => {
            const m = findMember(plateNumber);
            if (m) {
              return (
                <div className="rounded-xl p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-amber-800">会员识别成功</p>
                      <p className="text-xs text-amber-600">自动VIP插队</p>
                    </div>
                  </div>
                  <p className="text-sm text-amber-900">
                    <span className="font-semibold">{m.ownerName}</span> · {m.phone}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span>剩余次数：<span className={`font-bold ${m.remainingWashes <= config.lowWashThreshold ? 'text-rose-500' : 'text-emerald-600'}`}>{m.remainingWashes} 次</span></span>
                    <span>累计洗车：{m.totalWashes} 次</span>
                  </div>
                </div>
              );
            }
            return (
              <div className="rounded-xl p-4 bg-slate-50 border-2 border-dashed border-slate-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-700">散客（未识别到会员）</p>
                    <p className="text-sm text-slate-500 mt-1">按现金价 ¥{config.cashPrice} 结算</p>
                  </div>
                  <button
                    onClick={() => {
                      setNewMemberPlate(plateNumber);
                      setShowAddMemberModal(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 text-white text-sm font-semibold hover:shadow-md hover:shadow-sky-500/30 transition-all flex items-center gap-1"
                  >
                    <UserPlus className="w-4 h-4" />
                    注册会员
                  </button>
                </div>
              </div>
            );
          })()}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowTakeModal(false)} className="flex-1">取消</Button>
            <Button variant="primary" onClick={handleTakeNumber} disabled={!plateNumber} className="flex-1">
              确认取号
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        title="快速注册会员"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">车牌号码</label>
            <input
              type="text"
              value={newMemberPlate}
              onChange={(e) => setNewMemberPlate(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all text-lg font-medium tracking-wider"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">车主姓名</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="请输入姓名"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">联系电话</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAddMemberModal(false)} className="flex-1">取消</Button>
            <Button variant="primary" onClick={handleAddMember} disabled={!ownerName || !phone || !newMemberPlate} className="flex-1">
              注册并取号
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setCompletingQueue(null);
        }}
        title="完成结算"
        size="lg"
      >
        {completingQueue && (
          <div className="space-y-5">
            <div className="rounded-xl p-4 bg-gradient-to-br from-slate-50 to-sky-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-lg font-bold tracking-wider">
                    {completingQueue.plateNumber.slice(-4)}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900 tracking-wider">{completingQueue.plateNumber}</p>
                    <p className="text-sm text-slate-500">
                      {completingQueue.stationNumber && `${completingQueue.stationNumber} 号工位 · `}
                      {completingQueue.startedAt && `${formatTime(completingQueue.startedAt)} 开始`}
                    </p>
                  </div>
                </div>
                {completingQueue.isVip && (
                  <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white text-sm font-bold shadow-sm">
                    <Crown className="w-3.5 h-3.5 inline mr-1" />
                    VIP会员
                  </span>
                )}
              </div>
              {completingMember && (
                <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-700">{completingMember.ownerName} · {completingMember.phone}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      当前剩余 <span className={`font-bold ${completingMember.remainingWashes <= config.lowWashThreshold ? 'text-rose-500' : 'text-emerald-600'}`}>{completingMember.remainingWashes}</span> 次洗车
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">选择结算方式</label>
              <div className="space-y-3">
                {completingQueue.isVip && (
                  <>
                    <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      paymentChoice === 'member_deduct'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    } ${(!completingMember || completingMember.remainingWashes <= 0) ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="payment" value="member_deduct"
                          checked={paymentChoice === 'member_deduct'}
                          onChange={() => setPaymentChoice('member_deduct')}
                          disabled={!completingMember || completingMember.remainingWashes <= 0}
                          className="w-5 h-5 accent-emerald-500"
                        />
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-emerald-500" />
                            卡扣次数
                          </p>
                          <p className="text-sm text-slate-500">
                            {completingMember && completingMember.remainingWashes > 0
                              ? `本次扣 1 次，剩余 ${completingMember.remainingWashes - 1} 次`
                              : '次数不足，无法使用'}
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-emerald-600">扣1次</span>
                    </label>

                    <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      paymentChoice === 'member_cash'
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="payment" value="member_cash"
                          checked={paymentChoice === 'member_cash'}
                          onChange={() => setPaymentChoice('member_cash')}
                          className="w-5 h-5 accent-sky-500"
                        />
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-2">
                            <Banknote className="w-4 h-4 text-sky-500" />
                            现金支付
                          </p>
                          <p className="text-sm text-slate-500">
                            {completingMember && completingMember.remainingWashes <= 0
                              ? '次数不足，按散客价收现金'
                              : '会员主动选择现金支付'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">¥</span>
                        <input
                          type="number"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(Number(e.target.value))}
                          onClick={(e) => e.stopPropagation()}
                          className="w-24 px-3 py-2 rounded-lg border-2 border-sky-200 focus:border-sky-500 outline-none text-right text-lg font-bold text-sky-700 bg-white"
                        />
                      </div>
                    </label>

                    <div className={`rounded-xl border-2 p-4 transition-all ${
                      paymentChoice === 'member_recharge_deduct'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input type="radio" name="payment" value="member_recharge_deduct"
                          checked={paymentChoice === 'member_recharge_deduct'}
                          onChange={() => {
                            setPaymentChoice('member_recharge_deduct');
                            if (rechargeAmount === 0 && rechargeRules.length > 0) {
                              setRechargeAmount(rechargeRules[0].amount);
                            }
                          }}
                          className="w-5 h-5 accent-purple-500 mt-0.5"
                        />
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-purple-500" />
                            充值后扣次
                          </p>
                          <p className="text-sm text-slate-500">先充值，赠送次数后再扣本次费用</p>

                          {paymentChoice === 'member_recharge_deduct' && (
                            <div className="mt-4 space-y-4">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {rechargeRules.map((rule: RechargeRule) => (
                                  <button
                                    key={rule.id}
                                    type="button"
                                    onClick={() => setRechargeAmount(rule.amount)}
                                    className={`rounded-xl p-3 border-2 text-left transition-all ${
                                      rechargeAmount === rule.amount
                                        ? 'border-purple-500 bg-white shadow-md'
                                        : 'border-slate-200 bg-white hover:border-purple-300'
                                    }`}
                                  >
                                    <p className="text-xl font-bold text-slate-900">¥{rule.amount}</p>
                                    {rule.bonusWashes > 0 && (
                                      <p className="text-xs text-purple-600 font-semibold mt-0.5">
                                        赠 {rule.bonusWashes} 次
                                      </p>
                                    )}
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center gap-3 rounded-xl bg-white border border-purple-200 p-3">
                                <span className="text-slate-500 font-medium">自定义：</span>
                                <span className="text-slate-500">¥</span>
                                <input
                                  type="number"
                                  value={rechargeAmount}
                                  onChange={(e) => setRechargeAmount(Number(e.target.value))}
                                  className="flex-1 px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-purple-500 outline-none text-right font-bold text-slate-800"
                                />
                              </div>

                              {rechargeAmount > 0 && (
                                <div className="rounded-xl bg-white border border-purple-200 p-4">
                                  <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1">
                                    <Sparkles className="w-4 h-4 text-purple-500" />
                                    充值结算明细
                                  </p>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">充值金额</span>
                                      <span className="font-bold text-slate-800">¥{rechargeAmount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">赠送洗车次数</span>
                                      <span className="font-bold text-purple-600">+ {getSelectedRuleBonus()} 次</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">本次扣次</span>
                                      <span className="font-bold text-rose-500">- 1 次</span>
                                    </div>
                                    <div className="border-t border-purple-100 my-2" />
                                    <div className="flex justify-between">
                                      <span className="font-semibold text-slate-700">应收金额</span>
                                      <span className="font-bold text-purple-600 text-lg">¥{rechargeAmount}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </>
                )}

                {!completingQueue.isVip && (
                  <div className="flex items-center justify-between p-4 rounded-xl border-2 border-sky-500 bg-sky-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">散客现金支付</p>
                        <p className="text-sm text-slate-500">无会员记录，按散客价结算</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">¥</span>
                      <input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(Number(e.target.value))}
                        className="w-28 px-3 py-2 rounded-lg border-2 border-sky-200 focus:border-sky-500 outline-none text-right text-lg font-bold text-sky-700 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCompleteModal(false);
                  setCompletingQueue(null);
                }}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                variant="success"
                icon={CheckCircle2}
                onClick={handleCompleteWash}
                disabled={paymentChoice === 'member_recharge_deduct' && (!rechargeAmount || rechargeAmount <= 0)}
                className="flex-1 shadow-lg shadow-emerald-500/20"
              >
                确认完成
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        title="新增预约"
        size="lg"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">车牌号码 *</label>
              <input
                type="text"
                value={appointmentPlate}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setAppointmentPlate(val);
                  const m = findMember(val);
                  if (m) {
                    setAppointmentOwner(m.ownerName);
                    setAppointmentPhone(m.phone || '');
                  }
                }}
                placeholder="例如：沪A12345"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all text-lg font-medium tracking-wider"
              />
              {appointmentPlate && findMember(appointmentPlate) && (
                <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" />
                  已识别会员：{findMember(appointmentPlate)!.ownerName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">预约日期 *</label>
              <input
                type="date"
                value={appointmentDate}
                min={today}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">预约时段 *</label>
              <select
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
              >
                {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">车主姓名</label>
              <input
                type="text"
                value={appointmentOwner}
                onChange={(e) => setAppointmentOwner(e.target.value)}
                placeholder="请输入车主姓名"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">联系电话</label>
              <input
                type="tel"
                value={appointmentPhone}
                onChange={(e) => setAppointmentPhone(e.target.value)}
                placeholder="请输入联系电话"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">备注</label>
            <textarea
              value={appointmentNote}
              onChange={(e) => setAppointmentNote(e.target.value)}
              placeholder="例如：SUV、车内清洁等特殊要求"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowAppointmentModal(false)}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              variant="primary"
              icon={Calendar}
              onClick={handleAddAppointment}
              disabled={!appointmentPlate || !appointmentDate || !appointmentTime}
              className="flex-1 shadow-lg shadow-sky-500/20"
            >
              确认预约
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

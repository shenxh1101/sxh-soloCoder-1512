import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Crown,
  PlusCircle,
  Phone,
  Calendar,
  Car,
  TrendingUp,
  History,
  AlertTriangle,
  X,
  Edit3,
  Trash2,
  Gift,
  CircleDollarSign,
  Sparkles,
  Receipt,
  Banknote,
  CreditCard,
  Wallet
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState } from '@/components/EmptyState';
import { useMemberStore } from '@/store/memberStore';
import { useConfigStore } from '@/store/configStore';
import { useQueueStore } from '@/store/queueStore';
import { cn } from '@/lib/utils';
import type { Member, WashRecord } from '@/types';

type FilterType = 'all' | 'low' | 'active';

const MembersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filter, setFilter] = useState<FilterType>((searchParams.get('filter') as FilterType) || 'all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [detailTab, setDetailTab] = useState<'recharge' | 'wash'>('recharge');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [newMember, setNewMember] = useState({ plateNumber: '', ownerName: '', phone: '' });
  const [editMember, setEditMember] = useState({ plateNumber: '', ownerName: '', phone: '' });
  const [rechargeAmount, setRechargeAmount] = useState<number>(0);
  const [rechargeWashes, setRechargeWashes] = useState<number>(0);
  const [useCustomWashes, setUseCustomWashes] = useState(false);

  const members = useMemberStore(s => s.members);
  const addMember = useMemberStore(s => s.addMember);
  const updateMember = useMemberStore(s => s.updateMember);
  const deleteMember = useMemberStore(s => s.deleteMember);
  const rechargeMember = useMemberStore(s => s.rechargeMember);
  const getRechargeHistory = useMemberStore(s => s.getRechargeHistory);
  const searchMembers = useMemberStore(s => s.searchMembers);
  const getLowWashMembers = useMemberStore(s => s.getLowWashMembers);

  const getWashRecordsByMember = useQueueStore(s => s.getWashRecordsByMember);

  const rechargeRules = useConfigStore(s => s.rechargeRules);
  const getBonusWashesByAmount = useConfigStore(s => s.getBonusWashesByAmount);
  const lowThreshold = useConfigStore(s => s.systemConfig.lowWashThreshold);

  useEffect(() => {
    if (filter) {
      searchParams.set('filter', filter);
    } else {
      searchParams.delete('filter');
    }
    setSearchParams(searchParams);
  }, [filter, searchParams, setSearchParams]);

  const bonusPreview = useMemo(() => {
    if (useCustomWashes) return { base: rechargeWashes, bonus: 0, total: rechargeWashes };
    const bonus = getBonusWashesByAmount(rechargeAmount);
    return { base: 0, bonus, total: bonus };
  }, [rechargeAmount, rechargeWashes, useCustomWashes, getBonusWashesByAmount]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const displayMembers = useMemo(() => {
    let result = searchKeyword.trim() ? searchMembers(searchKeyword) : members;

    if (filter === 'low') {
      result = getLowWashMembers();
    } else if (filter === 'active') {
      result = [...result]
        .filter(m => m.lastVisitAt)
        .sort((a, b) =>
          new Date(b.lastVisitAt!).getTime() - new Date(a.lastVisitAt!).getTime()
        );
    }

    return result.sort((a, b) => {
      if (filter === 'low') return a.remainingWashes - b.remainingWashes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [members, searchKeyword, filter, searchMembers, getLowWashMembers]);

  const handleAddMember = () => {
    if (!newMember.plateNumber.trim() || !newMember.ownerName.trim()) {
      showToast('请填写车牌号和车主姓名', 'error');
      return;
    }
    const result = addMember(newMember.plateNumber, newMember.ownerName, newMember.phone || undefined);
    if (result) {
      showToast(`会员 ${result.ownerName} 添加成功！`, 'success');
      setIsAddModalOpen(false);
      setNewMember({ plateNumber: '', ownerName: '', phone: '' });
    } else {
      showToast('该车牌号已存在', 'error');
    }
  };

  const handleEditMember = () => {
    if (!selectedMember || !editMember.plateNumber.trim() || !editMember.ownerName.trim()) {
      showToast('请填写车牌号和车主姓名', 'error');
      return;
    }
    updateMember(selectedMember.id, {
      plateNumber: editMember.plateNumber.toUpperCase().replace(/\s/g, ''),
      ownerName: editMember.ownerName,
      phone: editMember.phone || undefined
    });
    showToast('会员信息已更新', 'success');
    setIsEditModalOpen(false);
    setSelectedMember(prev => prev ? {
      ...prev,
      plateNumber: editMember.plateNumber.toUpperCase().replace(/\s/g, ''),
      ownerName: editMember.ownerName,
      phone: editMember.phone || undefined
    } : null);
  };

  const handleDeleteMember = (member: Member) => {
    if (confirm(`确定要删除会员 ${member.ownerName} (${member.plateNumber}) 吗？此操作不可恢复。`)) {
      deleteMember(member.id);
      showToast('会员已删除', 'info');
      if (selectedMember?.id === member.id) {
        setIsDetailModalOpen(false);
        setSelectedMember(null);
      }
    }
  };

  const handleRecharge = () => {
    if (!selectedMember) return;
    const amount = useCustomWashes ? 0 : rechargeAmount;
    const washes = useCustomWashes ? rechargeWashes : undefined;

    if (!useCustomWashes && amount <= 0) {
      showToast('请输入充值金额', 'error');
      return;
    }
    if (useCustomWashes && washes !== undefined && washes <= 0) {
      showToast('请输入充值次数', 'error');
      return;
    }

    const result = rechargeMember(selectedMember.id, amount, washes);
    if (result.success) {
      showToast(
        `充值成功！获得 ${result.washesAdded}${result.bonusWashes ? ` + 赠送 ${result.bonusWashes}` : ''} 次`,
        'success'
      );
      setIsRechargeModalOpen(false);
      setRechargeAmount(0);
      setRechargeWashes(0);
      setUseCustomWashes(false);

      const updatedMember = members.find(m => m.id === selectedMember.id);
      if (updatedMember) setSelectedMember(updatedMember);
    } else {
      showToast(result.message, 'error');
    }
  };

  const openRechargeModal = (member: Member) => {
    setSelectedMember(member);
    const defaultRule = rechargeRules.find(r => r.isDefault) || rechargeRules[0];
    if (defaultRule) {
      setRechargeAmount(defaultRule.amount);
    }
    setIsRechargeModalOpen(true);
  };

  const openEditModal = (member: Member) => {
    setSelectedMember(member);
    setEditMember({
      plateNumber: member.plateNumber,
      ownerName: member.ownerName,
      phone: member.phone || ''
    });
    setIsEditModalOpen(true);
  };

  const openDetailModal = (member: Member) => {
    setSelectedMember(member);
    setDetailTab('recharge');
    setIsDetailModalOpen(true);
  };

  const MemberCard: React.FC<{ member: Member }> = ({ member }) => {
    const isLow = member.remainingWashes <= lowThreshold;
    return (
      <div
        className={cn(
          'group relative overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer',
          isLow ? 'border-amber-200' : 'border-slate-100'
        )}
        onClick={() => openDetailModal(member)}
      >
        {isLow && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold">
            <AlertTriangle className="w-3 h-3" />
            次数不足
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-sky-500/25">
                {member.ownerName.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                <Crown className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-800 text-lg truncate">
                {member.ownerName}
              </h3>
              <p className="text-lg font-bold tracking-widest text-sky-600 mt-0.5">
                {member.plateNumber}
              </p>
              {member.phone && (
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {member.phone}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50">
              <p className="text-xs text-slate-500 mb-1">剩余次数</p>
              <p className={cn(
                'text-2xl font-bold',
                isLow ? 'text-amber-600' : 'text-emerald-600'
              )}>
                {member.remainingWashes}
                <span className="text-sm font-normal text-slate-500 ml-1">次</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50">
              <p className="text-xs text-slate-500 mb-1">累计洗车</p>
              <p className="text-2xl font-bold text-sky-600">
                {member.totalWashes}
                <span className="text-sm font-normal text-slate-500 ml-1">次</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(member.createdAt).toLocaleDateString('zh-CN')}
              {member.lastVisitAt && (
                <>
                  <span className="mx-1">·</span>
                  <Car className="w-3 h-3" />
                  {new Date(member.lastVisitAt).toLocaleDateString('zh-CN')}
                </>
              )}
            </span>
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={(e) => {
                e.stopPropagation();
                openRechargeModal(member);
              }}
            >
              充卡
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
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
          <h1 className="text-2xl font-bold text-slate-800">会员管理</h1>
          <p className="text-slate-500 mt-1">
            共 <span className="font-bold text-sky-600">{members.length}</span> 位会员
            {getLowWashMembers().length > 0 && (
              <>
                · <span className="font-bold text-amber-600">{getLowWashMembers().length}</span> 人次数不足
              </>
            )}
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          icon={UserPlus}
          onClick={() => setIsAddModalOpen(true)}
        >
          新增会员
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchKeyword}
              onChange={setSearchKeyword}
              placeholder="搜索车牌号、车主姓名、手机号..."
            />
          </div>
          <div className="flex gap-2">
            {([
              { key: 'all', label: '全部' },
              { key: 'low', label: '次数不足' },
              { key: 'active', label: '活跃会员' }
            ] as const).map(item => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={cn(
                  'px-4 py-2.5 rounded-xl font-medium text-sm transition-all',
                  filter === item.key
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {displayMembers.length === 0 ? (
        <EmptyState
          title={searchKeyword || filter !== 'all' ? '没有找到匹配的会员' : '暂无会员'}
          description={searchKeyword || filter !== 'all' ? '尝试调整搜索条件或筛选器' : '点击「新增会员」按钮添加第一位会员'}
          variant={searchKeyword || filter !== 'all' ? 'search' : 'default'}
          icon={searchKeyword ? <Search className="w-12 h-12 text-slate-400" /> : <UserPlus className="w-12 h-12 text-slate-400" />}
          action={
            !searchKeyword && filter === 'all' && (
              <Button variant="primary" icon={UserPlus} onClick={() => setIsAddModalOpen(true)}>
                新增会员
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayMembers.map(member => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setNewMember({ plateNumber: '', ownerName: '', phone: '' });
        }}
        title="新增会员"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              车牌号码 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newMember.plateNumber}
              onChange={(e) => setNewMember({ ...newMember, plateNumber: e.target.value.toUpperCase().replace(/\s/g, '') })}
              placeholder="如：京A12345"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 font-bold tracking-wider outline-none transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              车主姓名 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newMember.ownerName}
              onChange={(e) => setNewMember({ ...newMember, ownerName: e.target.value })}
              placeholder="请输入车主姓名"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              手机号码
            </label>
            <input
              type="tel"
              value={newMember.phone}
              onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
              placeholder="选填，方便后续联系"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setIsAddModalOpen(false)}>
              取消
            </Button>
            <Button variant="primary" className="flex-1" icon={UserPlus} onClick={handleAddMember}>
              确认添加
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRechargeModalOpen}
        onClose={() => {
          setIsRechargeModalOpen(false);
          setRechargeAmount(0);
          setRechargeWashes(0);
          setUseCustomWashes(false);
        }}
        title={`会员充卡 - ${selectedMember?.ownerName || ''}`}
        size="md"
      >
        <div className="space-y-5">
          {selectedMember && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">{selectedMember.ownerName}</p>
                  <p className="text-sky-600 font-bold tracking-wider">{selectedMember.plateNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">当前剩余</p>
                  <p className="text-2xl font-bold text-emerald-600">{selectedMember.remainingWashes}<span className="text-sm ml-1">次</span></p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setUseCustomWashes(false)}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all',
                !useCustomWashes ? 'bg-white shadow text-sky-600' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              按金额充卡
            </button>
            <button
              onClick={() => setUseCustomWashes(true)}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all',
                useCustomWashes ? 'bg-white shadow text-sky-600' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              自定义次数
            </button>
          </div>

          {!useCustomWashes && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {rechargeRules.map(rule => (
                  <button
                    key={rule.id}
                    onClick={() => setRechargeAmount(rule.amount)}
                    className={cn(
                      'relative p-4 rounded-xl border-2 transition-all text-center',
                      rechargeAmount === rule.amount
                        ? 'border-sky-500 bg-sky-50 shadow-md'
                        : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50',
                      rule.isDefault && rechargeAmount === 0 && 'border-sky-300 bg-sky-50/50'
                    )}
                  >
                    {rule.bonusWashes > 0 && (
                      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-md flex items-center gap-1">
                        <Gift className="w-3 h-3" />
                        送{rule.bonusWashes}次
                      </div>
                    )}
                    <p className="text-xl font-bold text-slate-800">¥{rule.amount}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {rule.bonusWashes > 0 ? `赠 ${rule.bonusWashes} 次` : '标准套餐'}
                    </p>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  自定义金额
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-medium">¥</span>
                  <input
                    type="number"
                    value={rechargeAmount || ''}
                    onChange={(e) => setRechargeAmount(Number(e.target.value))}
                    placeholder="输入任意金额"
                    min="0"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 text-lg font-bold outline-none transition-all"
                  />
                </div>
              </div>

              {bonusPreview.total > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-emerald-700">充值优惠</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    充值 <span className="font-bold text-slate-800">¥{rechargeAmount}</span>
                    ，赠送 <span className="font-bold text-emerald-600">{bonusPreview.bonus} 次</span> 洗车
                  </p>
                </div>
              )}
            </>
          )}

          {useCustomWashes && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                充值次数
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={rechargeWashes || ''}
                  onChange={(e) => setRechargeWashes(Number(e.target.value))}
                  placeholder="输入洗车次数"
                  min="1"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 text-lg font-bold outline-none transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">次</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <CircleDollarSign className="w-3 h-3" />
                请在收银台另行收取费用
              </p>
            </div>
          )}

          {bonusPreview.total > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-600 font-medium">充卡后剩余次数</span>
              <span className="text-2xl font-bold text-emerald-600">
                {(selectedMember?.remainingWashes || 0) + bonusPreview.total}
                <span className="text-sm font-normal text-slate-500 ml-1">次</span>
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setIsRechargeModalOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              icon={PlusCircle}
              onClick={handleRecharge}
              disabled={bonusPreview.total <= 0}
            >
              确认充值
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditMember({ plateNumber: '', ownerName: '', phone: '' });
        }}
        title="编辑会员信息"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              车牌号码 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={editMember.plateNumber}
              onChange={(e) => setEditMember({ ...editMember, plateNumber: e.target.value.toUpperCase().replace(/\s/g, '') })}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 font-bold tracking-wider outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              车主姓名 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={editMember.ownerName}
              onChange={(e) => setEditMember({ ...editMember, ownerName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              手机号码
            </label>
            <input
              type="tel"
              value={editMember.phone}
              onChange={(e) => setEditMember({ ...editMember, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setIsEditModalOpen(false)}>
              取消
            </Button>
            <Button variant="primary" className="flex-1" icon={Edit3} onClick={handleEditMember}>
              保存修改
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedMember(null);
        }}
        title="会员详情"
        size="lg"
      >
        {selectedMember && (
          <div className="space-y-6">
            <div className="flex items-start gap-5 p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-sky-50/30 to-blue-50 border border-slate-100">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-sky-500/25">
                  {selectedMember.ownerName.charAt(0)}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <Crown className="w-4.5 h-4.5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-800">{selectedMember.ownerName}</h3>
                <p className="text-xl font-bold tracking-widest text-sky-600 mt-1">{selectedMember.plateNumber}</p>
                {selectedMember.phone && (
                  <p className="text-slate-600 mt-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {selectedMember.phone}
                  </p>
                )}
                <div className="flex gap-5 mt-4">
                  <div>
                    <p className="text-xs text-slate-500">剩余次数</p>
                    <p className={cn(
                      'text-2xl font-bold',
                      selectedMember.remainingWashes <= lowThreshold ? 'text-amber-600' : 'text-emerald-600'
                    )}>
                      {selectedMember.remainingWashes}<span className="text-sm font-normal ml-1">次</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">累计洗车</p>
                    <p className="text-2xl font-bold text-sky-600">
                      {selectedMember.totalWashes}<span className="text-sm font-normal ml-1">次</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">注册时间</p>
                    <p className="text-sm font-medium text-slate-700">
                      {new Date(selectedMember.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={Edit3} onClick={() => openEditModal(selectedMember)}>
                  编辑
                </Button>
                <Button variant="primary" size="sm" icon={PlusCircle} onClick={() => openRechargeModal(selectedMember)}>
                  充卡
                </Button>
                <button
                  onClick={() => handleDeleteMember(selectedMember)}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                  title="删除会员"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <div className="flex gap-2 mb-4 p-1 rounded-xl bg-slate-100">
                <button
                  onClick={() => setDetailTab('recharge')}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2',
                    detailTab === 'recharge'
                      ? 'bg-white shadow-sm text-sky-600'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <History className="w-4 h-4" />
                  充值记录
                </button>
                <button
                  onClick={() => setDetailTab('wash')}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2',
                    detailTab === 'wash'
                      ? 'bg-white shadow-sm text-sky-600'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <Receipt className="w-4 h-4" />
                  消费流水
                </button>
              </div>

              {detailTab === 'recharge' && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {getRechargeHistory(selectedMember.id).length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-slate-400 text-sm">暂无充值记录</p>
                    </div>
                  ) : (
                    getRechargeHistory(selectedMember.id).map(record => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {record.washesAdded + record.bonusWashes} 次
                              {record.bonusWashes > 0 && (
                                <span className="text-xs font-normal text-amber-600 ml-2">(赠{record.bonusWashes}次)</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(record.createdAt).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-emerald-600">
                          ¥{record.amount}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailTab === 'wash' && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(() => {
                    const washRecords = getWashRecordsByMember(selectedMember.id);
                    if (washRecords.length === 0) {
                      return (
                        <div className="py-12 text-center">
                          <p className="text-slate-400 text-sm">暂无消费流水</p>
                        </div>
                      );
                    }
                    return washRecords.map((record: WashRecord) => {
                      let paymentIcon = <Banknote className="w-5 h-5 text-white" />;
                      let paymentColor = 'from-sky-400 to-blue-500';
                      let paymentLabel = '现金';
                      let amountClass = 'text-sky-600';

                      switch (record.paymentType) {
                        case 'member_deduct':
                          paymentIcon = <CreditCard className="w-5 h-5 text-white" />;
                          paymentColor = 'from-emerald-400 to-teal-500';
                          paymentLabel = '卡扣次数';
                          amountClass = 'text-emerald-600';
                          break;
                        case 'member_cash':
                          paymentIcon = <Banknote className="w-5 h-5 text-white" />;
                          paymentColor = 'from-sky-400 to-blue-500';
                          paymentLabel = '现金支付';
                          amountClass = 'text-sky-600';
                          break;
                        case 'member_recharge_deduct':
                          paymentIcon = <Wallet className="w-5 h-5 text-white" />;
                          paymentColor = 'from-purple-400 to-indigo-500';
                          paymentLabel = '充值后扣次';
                          amountClass = 'text-purple-600';
                          break;
                        default:
                          break;
                      }

                      return (
                        <div
                          key={record.id}
                          className="p-4 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br',
                                paymentColor
                              )}>
                                {paymentIcon}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 flex items-center gap-2">
                                  {record.plateNumber}
                                  <span className="text-xs font-normal text-slate-500">{paymentLabel}</span>
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(record.createdAt).toLocaleString('zh-CN')}
                                </p>
                              </div>
                            </div>
                            <span className={cn('text-lg font-bold', amountClass)}>
                              {record.paymentType === 'member_deduct'
                                ? '扣1次'
                                : `¥${record.amount}`}
                            </span>
                          </div>
                          {record.note && (
                            <div className="mt-2 pt-2 border-t border-slate-100">
                              <div className="flex flex-wrap gap-2 text-xs">
                                {record.washesUsed > 0 && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                    扣次：{record.washesUsed}次
                                  </span>
                                )}
                                {record.bonusWashesAdded > 0 && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                                    赠送：{record.bonusWashesAdded}次
                                  </span>
                                )}
                                {record.rechargeAmount > 0 && (
                                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                                    充值：¥{record.rechargeAmount}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MembersPage;

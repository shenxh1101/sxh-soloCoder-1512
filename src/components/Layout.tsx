import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ListOrdered,
  BarChart3,
  Settings,
  Droplets,
  CalendarDays,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/queue', icon: ListOrdered, label: '排队叫号' },
  { path: '/members', icon: Users, label: '会员管理' },
  { path: '/expense', icon: Wallet, label: '支出管理' },
  { path: '/statistics', icon: BarChart3, label: '统计报表' },
  { path: '/settings', icon: Settings, label: '系统设置' }
];

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-100">
      <div className="flex min-h-screen">
        <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
                <Droplets className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 leading-tight">洗车管家</h1>
                <p className="text-xs text-slate-500">会员管理系统</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                    isActive
                      ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-500/25'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon className={cn('w-5 h-5 flex-shrink-0 transition-transform duration-200',
                    !isActive && 'group-hover:scale-110'
                  )} />
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-slate-100">
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4">
              <p className="text-xs text-slate-500 mb-1">今日日期</p>
              <p className="text-sm font-semibold text-slate-700">
                {new Date().toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </p>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

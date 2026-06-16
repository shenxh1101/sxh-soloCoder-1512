import React from 'react';
import { Inbox, Search } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'default' | 'search';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  variant = 'default'
}) => {
  const defaultIcon = variant === 'search' ? (
    <Search className="w-12 h-12 text-slate-400" />
  ) : (
    <Inbox className="w-12 h-12 text-slate-400" />
  );

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="mb-5 p-5 rounded-full bg-slate-100">
        {icon || defaultIcon}
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 text-center max-w-sm mb-6">
          {description}
        </p>
      )}
      {action}
    </div>
  );
};

import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = '搜索...',
  className
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={cn(
        'relative flex items-center rounded-xl border transition-all duration-200',
        'bg-white',
        isFocused
          ? 'border-sky-500 ring-4 ring-sky-500/10 shadow-md'
          : 'border-slate-200 hover:border-slate-300',
        className
      )}
    >
      <Search className="w-4 h-4 ml-4 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="w-full py-3 px-3 bg-transparent text-slate-700 placeholder-slate-400 text-sm focus:outline-none"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="mr-3 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextType | null>(null);

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className = '', children, id }: React.HTMLAttributes<HTMLButtonElement> & { id?: string }) {
  const ctx = React.useContext(SelectContext)!;
  return (
    <button
      id={id}
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-700 bg-[#0f1117] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${className}`}
    >
      {children}
      <ChevronDown className="h-4 w-4 text-gray-500" />
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(SelectContext)!;
  return <span className={ctx.value ? 'text-gray-200' : 'text-gray-600'}>{ctx.value || placeholder}</span>;
}

export function SelectContent({ className = '', children }: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(SelectContext)!;
  if (!ctx.open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => ctx.setOpen(false)} />
      <div className={`absolute z-50 mt-1 w-full rounded-md border border-gray-700 bg-[#1a1d2e] shadow-xl ${className}`}>
        {children}
      </div>
    </>
  );
}

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function SelectItem({ value, className = '', children }: SelectItemProps) {
  const ctx = React.useContext(SelectContext)!;
  return (
    <div
      onClick={() => { ctx.onValueChange(value); ctx.setOpen(false); }}
      className={`px-3 py-2 text-sm cursor-pointer text-gray-300 hover:bg-gray-800 hover:text-white ${ctx.value === value ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

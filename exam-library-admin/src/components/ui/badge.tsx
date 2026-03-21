import * as React from 'react';

type Variant = 'default' | 'secondary' | 'destructive' | 'outline';

const variantClasses: Record<Variant, string> = {
  default: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
  secondary: 'bg-gray-700 text-gray-300',
  destructive: 'bg-red-500/20 text-red-300',
  outline: 'border border-gray-600 text-gray-400',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant]} ${className}`} {...props} />
  );
}

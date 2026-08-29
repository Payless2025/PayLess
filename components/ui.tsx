'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * The shared surface vocabulary. Every page composes from these instead of
 * inventing its own background, radius and accent — which is how the app ended
 * up with seven different page backgrounds.
 */

export function cx(...parts: Array<string | false | null | undefined>) {
  return twMerge(parts.filter(Boolean).join(' '));
}

/** Page shell. One background for the whole app. */
export function Page({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx('min-h-screen bg-bg', className)}>{children}</div>;
}

/** Page title block — left aligned, no centered hero, no emoji. */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="border-b border-line">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow && (
              <div className="mb-2 font-mono text-xs uppercase tracking-widest text-text-faint">
                {eyebrow}
              </div>
            )}
            <h1 className="text-2xl font-semibold tracking-tight text-text">{title}</h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

/** Constrained content column. */
export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx('mx-auto max-w-6xl px-6 py-10', className)}>{children}</div>;
}

/** A bordered surface. No shadow, no blur, no gradient. */
export function Panel({
  children,
  className,
  title,
  aside,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  aside?: React.ReactNode;
}) {
  return (
    <section className={cx('rounded border border-line bg-surface', className)}>
      {(title || aside) && (
        <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
          {title && (
            <h2 className="font-mono text-xs uppercase tracking-widest text-text-faint">
              {title}
            </h2>
          )}
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'default' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
};

export function Button({
  variant = 'default',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded border font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap';
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-sm',
  };
  const variants = {
    primary:
      'border-accent bg-accent text-bg hover:bg-transparent hover:text-accent',
    default:
      'border-line-strong bg-surface-raised text-text hover:border-text-faint',
    ghost: 'border-transparent bg-transparent text-text-muted hover:text-text',
    danger: 'border-err/40 bg-transparent text-err hover:bg-err/10',
  };
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} {...props} />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'w-full rounded border border-line bg-bg px-3 py-2 text-sm text-text placeholder:text-text-faint',
        'focus:border-accent focus:outline-none',
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        'rounded border border-line bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none',
        className
      )}
      {...props}
    />
  );
}

/** Machine-readable values: addresses, hashes, paths, amounts. */
export function Mono({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cx('font-mono text-sm', className)}>{children}</span>;
}

/** Status pill. Colour is reserved for state — never decoration. */
export function Status({ kind }: { kind: 'completed' | 'pending' | 'failed' | string }) {
  const map: Record<string, string> = {
    completed: 'text-ok border-ok/30 bg-ok/10',
    pending: 'text-warn border-warn/30 bg-warn/10',
    failed: 'text-err border-err/30 bg-err/10',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide',
        map[kind] || 'text-text-muted border-line bg-surface-raised'
      )}
    >
      {kind}
    </span>
  );
}

/** Key/value row used for metrics. Numbers are mono + tabular. */
export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="border-l border-line pl-4">
      <div className="font-mono text-xs uppercase tracking-widest text-text-faint">
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl tnum text-text">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-text-muted">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-12 text-center text-sm text-text-muted">{children}</div>
  );
}

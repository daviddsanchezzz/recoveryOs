import { ReactNode } from 'react';

export function Card({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <article className="rounded-[28px] border border-black/10 bg-white/70 p-5 shadow-[0_12px_40px_rgba(19,32,26,0.08)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.2em] text-moss">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm text-ink/70">{subtitle}</p>
    </article>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[32px] border border-black/10 bg-white/72 p-6 shadow-[0_12px_40px_rgba(19,32,26,0.08)] backdrop-blur ${className}`}
    >
      {children}
    </section>
  );
}


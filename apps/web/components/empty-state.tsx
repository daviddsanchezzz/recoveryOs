import { Panel } from './ui/card';

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Panel className="space-y-3 rounded-[32px]">
      <p className="text-xs uppercase tracking-[0.2em] text-moss">Proximamente</p>
      <h3 className="text-2xl font-semibold text-ink">{title}</h3>
      <p className="text-sm leading-7 text-ink/72">{description}</p>
    </Panel>
  );
}


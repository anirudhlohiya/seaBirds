import { Icon } from './Icon';

export function SectionHeader({
  eyebrow,
  title,
  actionLabel,
  actionHref,
}: {
  eyebrow: string;
  title: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold tracking-caps uppercase text-muted">{eyebrow}</p>
        <h2 className="mt-1 text-[26px] leading-8 font-semibold tracking-tight text-ink">{title}</h2>
      </div>
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-accent"
        >
          {actionLabel}
          <Icon name="chevron_right" className="text-lg" />
        </a>
      )}
    </div>
  );
}

'use client';

export interface ChipOption {
  label: string;
  value: string;
}

export function FilterChips({
  options,
  active,
  onSelect,
  ariaLabel = 'Filters',
}: {
  options: ChipOption[];
  active: string;
  onSelect: (value: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
      {options.map((opt) => {
        const isActive = opt.value === active;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            aria-pressed={isActive}
            className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition ${
              isActive
                ? 'border-accent bg-accent text-white'
                : 'border-hairline bg-white text-ink hover:border-accent'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

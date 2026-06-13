type OwnershipSelectorProps = {
  fragranceId: number;
  owned: boolean;
  onChange?: (owned: boolean) => void;
};

const OPTIONS = [
  { owned: false, label: 'Nicht im Besitz' },
  { owned: true, label: 'Im Besitz' },
] as const;

export function OwnershipSelector({ fragranceId, owned, onChange }: OwnershipSelectorProps) {
  const radioName = `ownership-${fragranceId}`;

  return (
    <fieldset>
      <legend className="text-xs text-fg-muted mb-1 block">Besitz</legend>
      <div className="grid grid-cols-2 gap-1">
        {OPTIONS.map((option) => {
          const checked = owned === option.owned;
          const optionId = `${radioName}-${option.owned ? 'owned' : 'not-owned'}`;

          return (
            <div key={option.label} className="min-w-0">
              <input
                id={optionId}
                type="radio"
                name={radioName}
                checked={checked}
                onChange={() => {
                  if (checked) return;
                  onChange?.(option.owned);
                }}
                className="peer sr-only"
              />
              <label
                htmlFor={optionId}
                className={`
                  flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg border px-3 py-2
                  text-center text-sm transition-colors
                  peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring peer-focus-visible:ring-offset-1
                  ${checked
                    ? 'bg-button-primary-fill text-button-primary-fg border-button-primary-border font-semibold'
                    : 'bg-button-secondary-fill text-button-secondary-fg border-button-secondary-border hover:bg-button-secondary-hover'
                  }
                `}
              >
                <span className="min-w-0">{option.label}</span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

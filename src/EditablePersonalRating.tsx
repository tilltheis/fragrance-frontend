import type { DynamicFragranceData } from './types';
import { OwnershipSelector } from './OwnershipSelector';

export type EditablePersonalRatingProps = {
  data: DynamicFragranceData;
  sellerOptions: Set<string>;
  onChange?: (changedDynamicFragranceData: DynamicFragranceData) => void;
  onOwnershipChange?: (changedDynamicFragranceData: DynamicFragranceData) => void;
};

export function EditablePersonalRating({
  data,
  sellerOptions,
  onChange,
  onOwnershipChange,
}: EditablePersonalRatingProps) {
  const { id, owned, rating, reason, comment, sellers } = data;
  const sellersArray = sellers ?? [];
  const sellerListId = `seller-autocomplete-${id}`;

  return (
    <div className="space-y-4">
      <OwnershipSelector
        fragranceId={id}
        owned={owned === true}
        onChange={(nextOwned) => onOwnershipChange?.({ ...data, owned: nextOwned })}
      />

      {/* Rating slider */}
      <div>
        <label className="text-xs text-fg-muted mb-1 block">Persönliche Wertung</label>
        <div className="flex items-center gap-2">
          <span className="text-lg">❤️️</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round((rating ?? 0) * 100)}
            onChange={(e) => {
              const rating = Number(e.target.value) / 100;
              onChange?.({ ...data, rating });
            }}
            className="flex-1 accent-[var(--meter-rating-fill)] h-2 rounded-full bg-[var(--meter-rating-track)]"
          />
          <span className="text-xs text-fg-muted w-10 text-right">
            {rating !== undefined ? Math.round(rating * 100) : '—'}%
          </span>
        </div>
      </div>

      {/* Reason field */}
      <div>
        <label className="text-xs text-fg-muted mb-1 block">Grund für die Bewertung</label>
        <textarea
          className="w-full min-h-16 rounded border border-input-border bg-input-bg text-input-fg p-2"
          placeholder="Warum diese Bewertung?"
          value={reason ?? ''}
          onChange={(e) => onChange?.({ ...data, reason: e.target.value || undefined })}
        />
      </div>

      {/* Comment field */}
      <div>
        <label className="text-xs text-fg-muted mb-1 block">Allgemeine Notizen</label>
        <textarea
          className="w-full min-h-16 rounded border border-input-border bg-input-bg text-input-fg p-2"
          placeholder="Allgemeine Notizen…"
          value={comment ?? ''}
          onChange={(e) => onChange?.({ ...data, comment: e.target.value })}
        />
      </div>

      {/* Sellers with autocomplete */}
      <div>
        <label className="text-xs text-fg-muted mb-1 block">Händler</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[...sellersArray].map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-full border text-xs bg-[var(--seller-bg)] text-[var(--seller-fg)] border-[var(--seller-border)]"
            >
              {s}
              <button
                type="button"
                className="ml-1 text-fg-muted hover:text-fg-base"
                onClick={() => {
                  const updatedSellers = new Set([...sellersArray]);
                  updatedSellers.delete(s);
                  onChange?.({
                    ...data,
                    sellers: updatedSellers,
                  });
                }}
                aria-label={`Entferne ${s}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="relative">
          <input
            type="text"
            className="w-full rounded border border-input-border bg-input-bg text-input-fg p-2"
            placeholder="Händler hinzufügen…"
            list={sellerListId}
            onChange={(e) => {
              const seller = e.target.value.trim();
              if (seller) {
                onChange?.({ ...data, sellers: new Set(sellersArray).add(seller) });
                e.target.value = '';
              }
            }}
          />
          <datalist id={sellerListId}>
            {[...sellerOptions]
              .filter((s) => !(sellers ?? new Set()).has(s))
              .map((s) => (
                <option key={s} value={s} />
              ))}
          </datalist>
        </div>
      </div>
    </div>
  );
}

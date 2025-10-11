import type { DynamicFragranceData } from "./types";

export type EditablePersonalRatingProps = {
  data: DynamicFragranceData;
  sellerOptions: Set<string>;
  onChange?: (changedDynamicFragranceData: DynamicFragranceData) => void;
};


export function EditablePersonalRating({
  data,
  sellerOptions,
  onChange,
}: EditablePersonalRatingProps) {
  const { rating, reason, comment, sellers } = data;
  const sellersArray = sellers ?? [];

  return (
    <div className="space-y-4">
      {/* Rating slider */}
      <div>
        <label className="text-xs text-[var(--fg-muted)] mb-1 block">Persönliche Wertung</label>
        <div className="flex items-center gap-2">
          <span className="text-lg">❤️️</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round((rating ?? 0) * 100)}
            onChange={e => {
              const rating = Number(e.target.value) / 100;
              onChange?.({...data, rating});
            }}
            className="flex-1 accent-[var(--meter-rating-fill)] h-2 rounded-full bg-[var(--meter-rating-track)]"
          />
          <span className="text-xs text-[var(--fg-muted)] w-10 text-right">{rating !== undefined ? Math.round(rating * 100) : "—"}%</span>
        </div>
      </div>

      {/* Reason field */}
      <div>
        <label className="text-xs text-[var(--fg-muted)] mb-1 block">Grund für die Bewertung</label>
        <textarea
          className="w-full min-h-16 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-fg)] p-2"
          placeholder="Warum diese Bewertung?"
          value={reason}
          onChange={e => onChange?.({...data, reason: e.target.value || undefined})}
        />
      </div>

      {/* Comment field */}
      <div>
        <label className="text-xs text-[var(--fg-muted)] mb-1 block">Allgemeine Notizen</label>
        <textarea
          className="w-full min-h-16 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-fg)] p-2"
          placeholder="Allgemeine Notizen…"
          value={comment}
          onChange={e => onChange?.({...data, comment: e.target.value})}
        />
      </div>

      {/* Sellers with autocomplete */}
      <div>
        <label className="text-xs text-[var(--fg-muted)] mb-1 block">Händler</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[...sellersArray].map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-full border text-xs bg-[var(--seller-bg)] text-[var(--seller-fg)] border-[var(--seller-border)]"
            >
              {s}
                <button
                  type="button"
                  className="ml-1 text-[var(--fg-muted)] hover:text-[var(--fg-base)]"
                  onClick={() => {
                    const updatedSellers = new Set([...sellersArray]);
                    updatedSellers.delete(s);
                    onChange?.({
                      ...data,
                      sellers: updatedSellers
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
            className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-fg)] p-2"
            placeholder="Händler hinzufügen…"
            list="seller-autocomplete"
            onChange={e => {
              const seller = e.target.value.trim();
              if (seller) {
                onChange?.({...data, sellers: new Set(sellersArray).add(seller)});
              }
            }}
          />
          <datalist id="seller-autocomplete">
            {[...sellerOptions.difference(sellers ?? new Set())].map(s => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>
    </div>
  );
}

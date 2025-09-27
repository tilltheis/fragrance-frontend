import { TypeChips } from './TypeChips';
import { SeasonBar } from './SeasonBar';
import { OccasionBar } from './OccasionBar';
import type { Fragrance, LinearNotes, Notes, PyramidNotes } from './types';
import { CommunityRatings } from './CommunityRatings';
import { RatingBar } from './RatingBar';

export type FragranceCardMode = 'communityStats' | 'scentNotes';

interface CardProps {
  fragrance: Fragrance;
  mode: FragranceCardMode;
  onSelect: (id: number) => void;
}

export function FragranceCard({ fragrance, mode, onSelect }: CardProps) {
  const getQualityDots = (fragrance: Fragrance) => {
    return fragrance?.scent?.count ?? 0 >= 100 ? "•••" : fragrance?.scent?.count ?? 0 >= 50 ? "••" : "•";
  };

  const CommunityStats = () => (
    <div>
      <div className="mb-2">
        <div className="text-xs text-fg-muted mb-1">Saison</div>
        <SeasonBar map={fragrance.season} />
      </div>

      <div className="mb-2">
        <div className="text-xs text-fg-muted mb-1">Anlass</div>
        <OccasionBar map={fragrance.occasion} />
      </div>
      
      <div className="mb-2">
        <div className="text-xs text-fg-muted mb-1">Community-Wertung</div>
        <CommunityRatings fragrance={fragrance} />
      </div>
    </div>
  );

  const NotesList = ({ notes, className }: { notes: string[], className?: string }) => (
    <ul title={notes.join(', ')} className={`h-5 overflow-x-clip whitespace-nowrap text-ellipsis ${className ?? ''}`}>
      {notes.map((note, index) => (
        <li key={index} className="inline text-sm not-last:after:content-[',\00a0'] after:text-fg-muted">
          {note}
        </li>
      ))}
    </ul>
  );

  const PyramidNotesView = (pyramidNotes: PyramidNotes) => (
    <>
      <div className="mb-2">
        <div className="text-xs text-fg-muted mb-1">Kopfnoten</div>
        <NotesList notes={pyramidNotes.head} />
      </div>
      <div className="mb-2">
        <div className="text-xs text-fg-muted mb-1">Herznoten</div>
        <NotesList notes={pyramidNotes.heart} />
      </div>
      <div className="mb-2">
        <div className="text-xs text-fg-muted mb-1">Basisnoten</div>
        <NotesList notes={pyramidNotes.base} />
      </div>
    </>
  );

  const LinearNotesView = (linearNotes: LinearNotes) => (
    <div className="mb-2 h-34">
      <div className="text-xs text-fg-muted mb-1">Duftnoten</div>
      <NotesList notes={linearNotes.notes} className="h-auto whitespace-normal! line-clamp-5" />
    </div>
  );

  const NotesView = () => {
    switch (fragrance.notes?.kind) {
      case "pyramid":
        return PyramidNotesView(fragrance.notes);
      case "linear":
        return LinearNotesView(fragrance.notes);
      default:
        return PyramidNotesView({ kind: "pyramid", head: [], heart: [], base: [] });
    }
  };

  return (
    <div
      className="bg-card-bg text-card-fg border border-card-border rounded-lg p-4 shadow-sm hover:shadow-md hover:bg-card-hover transition-colors cursor-pointer"
      onClick={() => onSelect(fragrance.id)}
    >
      {/* Header */}
      <div className="mb-2">
        <h4 className="text-sm font-semibold leading-tight text-card-fg">
          {fragrance.brand || fragrance.brandQuery}
        </h4>
        <h3 className="text-lg font-semibold text-card-fg">
          {fragrance.name || fragrance.nameQuery}
        </h3>
          <p className="text-sm text-fg-muted">
            {fragrance.concentration ?? ""} {getQualityDots(fragrance)}
          </p>
      </div>

      <TypeChips className="mb-2" typeMap={fragrance.type} />
      {mode === 'communityStats' ? <CommunityStats /> : <NotesView />}

      <div className="mb-2">
        <div className="text-xs text-fg-muted mb-1">Persönliche Wertung</div>
        <RatingBar label="❤️️" value={fragrance.rating ? Math.round(fragrance.rating * 100) : undefined} classNames={{ track: "bg-meter-rating-track", fill: "bg-meter-rating-fill" }} />
      </div>
    </div>
  );
}
import { TypeChips } from './TypeChips';
import { SeasonBar } from './SeasonBar';
import { OccasionBar } from './OccasionBar';
import { toDynamicFragranceData, type DynamicFragranceData, type Fragrance, type LinearNotes, type PyramidNotes } from './types';
import { CommunityRatings } from './CommunityRatings';
import { EditablePersonalRating } from './EditablePersonalRating';

type FragranceDetailPanelProps = {
  fragrance: Fragrance;
  onClose?: (closedFragrance: Fragrance) => void;
  onChange?: (changedDynamicFragranceData: DynamicFragranceData) => void;
};

export function FragranceDetailPanel({ fragrance, onClose, onChange }: FragranceDetailPanelProps) {
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

  const NotesList = ({ notes }: { notes: string[], className?: string }) => (
    <ul>
      {notes.map((note, index) => (
        <li key={index} className="inline-block text-sm not-last:after:content-[',\00a0'] after:text-fg-muted">
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
    <div className="mb-2">
      <div className="text-xs text-fg-muted mb-1">Duftnoten</div>
      <NotesList notes={linearNotes.notes} className="" />
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
      className="
      max-md:global-scroll-lock
      max-md:fixed
      max-md:top-0
      max-md:left-0
      max-md:bottom-0
      max-md:right-0
      max-md:z-1
      max-md:bg-black/50

      md:col-span-full

      overflow-scroll
      "

      onClick={() => onClose?.(fragrance)}
    >
      <div className="
      landscape:max-md:absolute
      landscape:max-md:top-0
      landscape:max-md:right-0
      landscape:max-md:bottom-0
      landscape:max-md:left-0

      not-landscape:max-md:flex
      not-landscape:max-md:items-center
      not-landscape:max-md:justify-center 
      
      max-md:z-2
      max-md:h-full
      ">
        <div className="
      max-md:m-4

      bg-card-bg
      text-card-fg
      border
      border-card-border
      rounded-lg
      p-4
      shadow-sm
      "

          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => onClose?.(fragrance)} className="absolute top-2 right-2 text-fg-muted hover:text-fg-accent">X</button>

          {/* Header */}
          <div className="mb-2">
            <h4 className="text-sm font-semibold leading-tight text-card-fg">
              {fragrance.brand || fragrance.brandQuery}
            </h4>
            <h3 className="text-lg font-semibold text-card-fg">
              {fragrance.name || fragrance.nameQuery}
            </h3>
            <p className="text-sm text-fg-muted">
              {fragrance.concentration ?? "\u00A0"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <TypeChips className="mb-2 h-auto" typeMap={fragrance.type} />
              <NotesView />
              <CommunityStats />
            </div>

            <EditablePersonalRating
              data={toDynamicFragranceData(fragrance)}
              sellerOptions={new Set(["Douglas", "Flaconi", "Parfumdreams", "Notino", "Sephora", "Müller", "Rossmann", "dm"])}
              onChange={onChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
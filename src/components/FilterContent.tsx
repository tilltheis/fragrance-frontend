import { type BrowseState } from '../types';
import { type SearchStateActions } from '../useSearchState';
import { type Taxonomy } from '../taxonomy';
import { type FilterCounts } from '../filterCounts';
import { BrandAutocomplete } from './BrandAutocomplete';
import { TypeFilterChips } from './TypeFilterChips';
import { NoteAutocomplete } from './NoteAutocomplete';
import { SeasonFilter } from './SeasonFilter';
import { RatingFilter } from './RatingFilter';
import { OwnershipFilter } from './OwnershipFilter';
import { RatingStateFilter } from './RatingStateFilter';

interface Props {
  state: BrowseState;
  actions: SearchStateActions;
  taxonomy: Taxonomy;
  filterCounts: FilterCounts;
}

export function FilterContent({ state, actions, taxonomy, filterCounts }: Props) {
  return (
    <div className="space-y-6 px-4 py-4">
      <BrandAutocomplete state={state} actions={actions} taxonomy={taxonomy} brandCounts={filterCounts.brands} />
      <TypeFilterChips state={state} actions={actions} typeCounts={filterCounts.types} />
      <NoteAutocomplete state={state} actions={actions} taxonomy={taxonomy} />
      <SeasonFilter state={state} actions={actions} seasonCounts={filterCounts.seasons} />
      <RatingFilter state={state} actions={actions} ratingCounts={filterCounts.ratings} />
      <OwnershipFilter state={state} actions={actions} />
      <RatingStateFilter state={state} actions={actions} />
    </div>
  );
}

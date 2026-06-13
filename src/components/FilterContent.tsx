import { type BrowseState } from '../types';
import { type SearchStateActions } from '../useSearchState';
import { type Taxonomy } from '../taxonomy';
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
}

export function FilterContent({ state, actions, taxonomy }: Props) {
  return (
    <div className="space-y-6 px-4 py-4">
      <BrandAutocomplete state={state} actions={actions} taxonomy={taxonomy} />
      <TypeFilterChips state={state} actions={actions} />
      <NoteAutocomplete state={state} actions={actions} taxonomy={taxonomy} />
      <SeasonFilter state={state} actions={actions} />
      <RatingFilter state={state} actions={actions} />
      <OwnershipFilter state={state} actions={actions} />
      <RatingStateFilter state={state} actions={actions} />
    </div>
  );
}

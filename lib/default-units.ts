/**
 * Canonical default units of measure for Philippine retail.
 *
 * Single source of truth shared by:
 *  - the seed migration (scripts/migrations/089_seed_default_units_of_measure.ts)
 *  - the data-reset endpoint (app/api/data-management/reset) so these defaults
 *    survive a master-data clear or factory reset.
 *
 * Stable `uom_seed_*` ids let reset/seed logic re-insert exactly these rows
 * idempotently (via INSERT IGNORE) without clobbering units the user added.
 */
export interface DefaultUnitOfMeasure {
  id: string;
  name: string;
  abbreviation: string;
}

export const DEFAULT_UNITS_OF_MEASURE: DefaultUnitOfMeasure[] = [
  { id: 'uom_seed_piece', name: 'Piece', abbreviation: 'pc' },
  { id: 'uom_seed_pack', name: 'Pack', abbreviation: 'pck' },
  { id: 'uom_seed_box', name: 'Box', abbreviation: 'box' },
  { id: 'uom_seed_case', name: 'Case', abbreviation: 'cs' },
  { id: 'uom_seed_dozen', name: 'Dozen', abbreviation: 'dz' },
  { id: 'uom_seed_kilogram', name: 'Kilogram', abbreviation: 'kg' },
  { id: 'uom_seed_gram', name: 'Gram', abbreviation: 'g' },
  { id: 'uom_seed_liter', name: 'Liter', abbreviation: 'L' },
  { id: 'uom_seed_milliliter', name: 'Milliliter', abbreviation: 'mL' },
  { id: 'uom_seed_sack', name: 'Sack', abbreviation: 'sack' },
  { id: 'uom_seed_bottle', name: 'Bottle', abbreviation: 'btl' },
  { id: 'uom_seed_can', name: 'Can', abbreviation: 'can' },
  { id: 'uom_seed_bundle', name: 'Bundle', abbreviation: 'bdl' },
  { id: 'uom_seed_pair', name: 'Pair', abbreviation: 'pr' },
  { id: 'uom_seed_set', name: 'Set', abbreviation: 'set' },
  { id: 'uom_seed_roll', name: 'Roll', abbreviation: 'roll' },
  { id: 'uom_seed_meter', name: 'Meter', abbreviation: 'm' },
  { id: 'uom_seed_ream', name: 'Ream', abbreviation: 'rm' },
];

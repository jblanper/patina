/**
 * Canonical CSV column definitions shared between the exporter and importer.
 * Keeping both sides in sync here prevents silent divergence.
 */
export const CSV_HEADERS = [
  'id', 'title', 'issuer', 'denomination', 'year_display', 'year_numeric', 'era', 'mint', 'metal',
  'fineness', 'weight', 'diameter', 'die_axis', 'obverse_legend', 'obverse_desc', 'reverse_legend',
  'reverse_desc', 'edge_desc', 'catalog_ref', 'rarity', 'grade', 'provenance', 'story',
  'purchase_price', 'purchase_date', 'purchase_source', 'created_at',
  'obverse_image', 'reverse_image', 'edge_image'
] as const;

export type CsvHeader = typeof CSV_HEADERS[number];

/**
 * Aliases for common external tool column names (PCGS, NGC, Excel, etc.)
 * Maps lowercased external column name → Patina field name.
 * Used by auto-detection in the CSV field-mapping step.
 */
export const CSV_FIELD_ALIASES: Record<string, string> = {
  'coin name': 'title',
  'coin description': 'title',
  'country': 'issuer',
  'year': 'year_display',
  'date': 'year_display',
  'cert #': 'catalog_ref',
  'pcgs #': 'catalog_ref',
  'ngc #': 'catalog_ref',
  'mintmark': 'mint',
  'notes': 'story',
  'weight (g)': 'weight',
  'weight (gr.)': 'weight',
};

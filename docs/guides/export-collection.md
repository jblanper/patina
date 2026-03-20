# How to Export Your Collection

This guide shows you how to create backup archives and generate printable catalogs of your collection.

## Prerequisites

- Patina is running with at least one coin in your collection

## Export Archive (ZIP)

Creates a complete backup including the database, images, and CSV spreadsheet.

1. **Open the Export Panel**:
   Click **Export Archive** in the header toolbar.

2. **Choose Location**:
   A save dialog opens.
   Select your destination folder and enter a filename.

3. **Wait for Export**:
   Patina packages your collection into a ZIP file.
   A toast notification appears when complete.

The ZIP archive contains:
- `manifest.json`: Export metadata and timestamp
- `coins.db`: SQLite database backup
- `coins.csv`: All coin records in spreadsheet format
- `images/`: All coin images organized by coin ID

## Generate Catalog (PDF)

Creates a museum-quality printable catalog with all coin records and images.

1. **Open the Export Panel**:
   Click **Generate Catalog** in the header toolbar.

2. **Choose Location**:
   A save dialog opens.
   Select your destination and enter a filename.

3. **Wait for Generation**:
   Patina generates the PDF with cover page, table of contents, and per-coin pages.
   A toast notification appears when complete.

The PDF catalog includes:
- Cover page with collection name and date
- Table of contents
- One page per coin with images, metadata, and descriptions

## CSV Format

The exported CSV uses UTF-8 encoding with BOM for Excel compatibility.
All 25 coin fields are included:
`id, title, issuer, denomination, year_display, year_numeric, era, mint, metal, fineness, weight, diameter, die_axis, obverse_legend, obverse_desc, reverse_legend, reverse_desc, edge_desc, catalog_ref, rarity, grade, provenance, story, purchase_price, purchase_date, purchase_source`

## Troubleshooting

- **Export Failed**: Ensure you have write permissions to the destination folder
- **PDF Missing Images**: Some images may be too large; Patina scales images over 800px
- **Large Collection Slow**: Export time increases with collection size; this is normal

## Related Resources

- [How to Add a New Coin](./add-coin.md)
- [Lens Subsystem Reference](./lens_system.md)

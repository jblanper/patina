export interface ColumnDefinition {
  name: string;
  type: string;
  constraints?: string;
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  extraSQL?: string;
}

export const SCHEMA: TableDefinition[] = [
  {
    name: 'coins',
    columns: [
      { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'title', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'issuer', type: 'TEXT' },
      { name: 'denomination', type: 'TEXT' },
      { name: 'year_display', type: 'TEXT' },
      { name: 'year_numeric', type: 'INTEGER' },
      { name: 'era', type: 'TEXT', constraints: "DEFAULT 'Ancient'" },
      { name: 'mint', type: 'TEXT' },
      { name: 'metal', type: 'TEXT' },
      { name: 'fineness', type: 'TEXT' },
      { name: 'weight', type: 'REAL' },
      { name: 'diameter', type: 'REAL' },
      { name: 'die_axis', type: 'TEXT' },
      { name: 'obverse_legend', type: 'TEXT' },
      { name: 'obverse_desc', type: 'TEXT' },
      { name: 'reverse_legend', type: 'TEXT' },
      { name: 'reverse_desc', type: 'TEXT' },
      { name: 'edge_desc', type: 'TEXT' },
      { name: 'catalog_ref', type: 'TEXT' },
      { name: 'rarity', type: 'TEXT' },
      { name: 'grade', type: 'TEXT' },
      { name: 'provenance', type: 'TEXT' },
      { name: 'story', type: 'TEXT' },
      { name: 'purchase_price', type: 'REAL' },
      { name: 'purchase_date', type: 'TEXT' },
      { name: 'purchase_source', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME', constraints: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  {
    name: 'images',
    columns: [
      { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'coin_id', type: 'INTEGER', constraints: 'NOT NULL' },
      { name: 'path', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'label', type: 'TEXT' },
      { name: 'is_primary', type: 'INTEGER', constraints: 'DEFAULT 0' },
      { name: 'sort_order', type: 'INTEGER', constraints: 'DEFAULT 0' },
      { name: 'created_at', type: 'DATETIME', constraints: 'DEFAULT CURRENT_TIMESTAMP' }
    ],
    extraSQL: 'FOREIGN KEY (coin_id) REFERENCES coins(id) ON DELETE CASCADE'
  },
  {
    name: 'vocabularies',
    columns: [
      { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'field', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'value', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'locale', type: 'TEXT', constraints: "DEFAULT 'en'" },
      { name: 'is_builtin', type: 'INTEGER', constraints: 'DEFAULT 0' },
      { name: 'usage_count', type: 'INTEGER', constraints: 'DEFAULT 0' },
      { name: 'created_at', type: 'DATETIME', constraints: 'DEFAULT CURRENT_TIMESTAMP' }
    ],
    extraSQL: 'UNIQUE(field, value, locale)'
  },
  {
    name: 'preferences',
    columns: [
      { name: 'key', type: 'TEXT', constraints: 'PRIMARY KEY' },
      { name: 'value', type: 'TEXT', constraints: 'NOT NULL' }
    ]
  }
];

export function generateSQL(schema: TableDefinition[]): string {
  return schema.map(table => {
    const columnsSQL = table.columns
      .map(col => `${col.name} ${col.type} ${col.constraints || ''}`.trim())
      .join(',\n    ');
    
    return `CREATE TABLE IF NOT EXISTS ${table.name} (
    ${columnsSQL}${table.extraSQL ? ',\n    ' + table.extraSQL : ''}\n  );`;
  }).join('\n\n');
}

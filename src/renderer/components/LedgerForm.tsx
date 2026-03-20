import React from 'react';
import { NewCoin } from '../../common/types';
import { AutocompleteField } from './AutocompleteField';
import { useVocabularies } from '../hooks/useVocabularies';

interface LedgerFormProps {
  formData: NewCoin;
  errors: Record<string, string>;
  updateField: (field: keyof NewCoin, value: string | number | null | boolean) => void;
  coinId?: number;
}

export const LedgerForm: React.FC<LedgerFormProps> = ({ formData, errors, updateField, coinId }) => {
  const entryLabel = coinId ? `#${String(coinId).padStart(3, '0')}` : '#NEW';

  const eraVocab = useVocabularies('era');
  const mintVocab = useVocabularies('mint');
  const denominationVocab = useVocabularies('denomination');
  const metalVocab = useVocabularies('metal');
  const dieAxisVocab = useVocabularies('die_axis');
  const gradeVocab = useVocabularies('grade');
  return (
    <div className="right-folio">
      <div className="folio-header">
        <span className="meta-line">
          ENTRY {entryLabel} // {formData.era?.toUpperCase() || 'ANCIENT'} // {formData.metal?.toUpperCase() || '—'}
        </span>
        <div className="input-group">
          <input
            type="text"
            className={`input-h1 ${errors.title ? 'error' : ''}`}
            placeholder="Designation"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
          />
          {errors.title && <span className="error-hint">{errors.title}</span>}
        </div>
        
        <div className="subtitle-stack">
          <div className="subtitle-item">
            <span className="subtitle-label">Era</span>
            <AutocompleteField
              field="era"
              value={formData.era || ''}
              onChange={(v) => updateField('era', v)}
              onAddNew={(v) => { eraVocab.addVocabulary(v); updateField('era', v); }}
              options={eraVocab.options}
              placeholder="e.g. Roman Imperial"
              onReset={eraVocab.resetVocabularies}
              hasUserValues={false}
            />
          </div>
          <div className="subtitle-item">
            <span className="subtitle-label">Minted at</span>
            <AutocompleteField
              field="mint"
              value={formData.mint || ''}
              onChange={(v) => updateField('mint', v)}
              onAddNew={(v) => { mintVocab.addVocabulary(v); updateField('mint', v); }}
              options={mintVocab.options}
              placeholder="City / Mint"
              onReset={mintVocab.resetVocabularies}
              hasUserValues={false}
            />
          </div>
          <div className="subtitle-item">
            <span className="subtitle-label">Year</span>
            <input
              type="text"
              className="input-sub"
              placeholder="e.g. 440 BC"
              value={formData.year_display || ''}
              onChange={(e) => updateField('year_display', e.target.value)}
            />
          </div>
          <div className="subtitle-item">
            <span className="subtitle-label">Issuer</span>
            <input
              type="text"
              className="input-sub"
              placeholder="e.g. Probus"
              value={formData.issuer || ''}
              onChange={(e) => updateField('issuer', e.target.value)}
            />
          </div>
          <div className="subtitle-item">
            <span className="subtitle-label">Denomination</span>
            <AutocompleteField
              field="denomination"
              value={formData.denomination || ''}
              onChange={(v) => updateField('denomination', v)}
              onAddNew={(v) => { denominationVocab.addVocabulary(v); updateField('denomination', v); }}
              options={denominationVocab.options}
              placeholder="e.g. Antoninianus"
              onReset={denominationVocab.resetVocabularies}
              hasUserValues={false}
            />
          </div>
          <div className="subtitle-item">
            <span className="subtitle-label">Reference</span>
            <input
              type="text"
              className="input-sub"
              placeholder="e.g. RIC II 218"
              value={formData.catalog_ref || ''}
              onChange={(e) => updateField('catalog_ref', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Technical Metrics */}
      <div className="metrics-grid">
        <div className="metric-item">
          <span className="metric-label">Weight</span>
          <input
            type="number"
            step="0.01"
            className={`input-metric ${errors.weight ? 'error' : ''}`}
            placeholder="00.00 g"
            value={formData.weight || ''}
            onChange={(e) => updateField('weight', e.target.value ? parseFloat(e.target.value) : null)}
          />
          {errors.weight && <span className="error-hint">{errors.weight}</span>}
        </div>
        <div className="metric-item">
          <span className="metric-label">Diameter</span>
          <input
            type="number"
            step="0.1"
            className={`input-metric ${errors.diameter ? 'error' : ''}`}
            placeholder="00.0 mm"
            value={formData.diameter || ''}
            onChange={(e) => updateField('diameter', e.target.value ? parseFloat(e.target.value) : null)}
          />
          {errors.diameter && <span className="error-hint">{errors.diameter}</span>}
        </div>
        <div className="metric-item">
          <span className="metric-label">Die Axis</span>
          <AutocompleteField
            field="die_axis"
            value={formData.die_axis || ''}
            onChange={(v) => updateField('die_axis', v)}
            onAddNew={(v) => { dieAxisVocab.addVocabulary(v); updateField('die_axis', v); }}
            options={dieAxisVocab.options}
            placeholder="e.g. 6h"
            onReset={dieAxisVocab.resetVocabularies}
            hasUserValues={false}
          />
        </div>
        <div className="metric-item">
          <span className="metric-label">Material</span>
          <AutocompleteField
            field="metal"
            value={formData.metal || ''}
            onChange={(v) => updateField('metal', v)}
            onAddNew={(v) => { metalVocab.addVocabulary(v); updateField('metal', v); }}
            options={metalVocab.options}
            placeholder="e.g. Silver"
            onReset={metalVocab.resetVocabularies}
            hasUserValues={false}
          />
        </div>
        <div className="metric-item">
          <span className="metric-label">Fineness</span>
          <input
            type="text"
            className="input-metric"
            placeholder="e.g. .999"
            value={formData.fineness || ''}
            onChange={(e) => updateField('fineness', e.target.value)}
          />
        </div>
        <div className="metric-item">
          <span className="metric-label">Grade</span>
          <AutocompleteField
            field="grade"
            value={formData.grade || ''}
            onChange={(v) => updateField('grade', v)}
            onAddNew={(v) => { gradeVocab.addVocabulary(v); updateField('grade', v); }}
            options={gradeVocab.options}
            placeholder="e.g. EF-40"
            onReset={gradeVocab.resetVocabularies}
            hasUserValues={false}
          />
        </div>
      </div>

      {/* Numismatic Data */}
      <div className="numismatic-section">
        <span className="section-label">Obverse</span>
        <input
          type="text"
          className="input-legend"
          placeholder="LEGEND (e.g. IMP CAES HADRIANVS)"
          value={formData.obverse_legend || ''}
          onChange={(e) => updateField('obverse_legend', e.target.value)}
        />
        <textarea
          className="input-block"
          placeholder="Describe the obverse motif, portraiture, and style..."
          value={formData.obverse_desc || ''}
          onChange={(e) => updateField('obverse_desc', e.target.value)}
        />
      </div>

      <div className="numismatic-section">
        <span className="section-label">Reverse</span>
        <input
          type="text"
          className="input-legend"
          placeholder="LEGEND (e.g. AOE)"
          value={formData.reverse_legend || ''}
          onChange={(e) => updateField('reverse_legend', e.target.value)}
        />
        <textarea
          className="input-block"
          placeholder="Describe the reverse symbols, deity, and context..."
          value={formData.reverse_desc || ''}
          onChange={(e) => updateField('reverse_desc', e.target.value)}
        />
      </div>

      {/* Curator's Note */}
      <div className="numismatic-section">
        <span className="section-label">Curator's Note</span>
        <textarea
          className="input-block input-block-tall"
          placeholder="Record the historical significance or unique narrative of this object..."
          value={formData.story || ''}
          onChange={(e) => updateField('story', e.target.value)}
        />
      </div>

      {/* Provenance */}
      <div className="numismatic-section">
        <span className="section-label">Provenance</span>
        <input
          type="text"
          className="input-metric provenance-input"
          placeholder="e.g. Ex. BCD Collection; Purchased 2024"
          value={formData.provenance || ''}
          onChange={(e) => updateField('provenance', e.target.value)}
        />
      </div>

      {/* Acquisition Footer */}
      <footer className="ledger-footer">
        <div className="metrics-grid">
          <div className="metric-item">
            <span className="metric-label">Acquired</span>
            <input
              type="text"
              className="input-metric"
              placeholder="YYYY-MM-DD"
              value={formData.purchase_date || ''}
              onChange={(e) => updateField('purchase_date', e.target.value)}
            />
          </div>
          <div className="metric-item">
            <span className="metric-label">Source</span>
            <input
              type="text"
              className="input-metric"
              placeholder="e.g. CNG Auctions"
              value={formData.purchase_source || ''}
              onChange={(e) => updateField('purchase_source', e.target.value)}
            />
          </div>
          <div className="metric-item">
            <span className="metric-label">Cost</span>
            <input
              type="number"
              className="input-metric"
              placeholder="0.00"
              value={formData.purchase_price || ''}
              onChange={(e) => updateField('purchase_price', e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>
        </div>
      </footer>
    </div>
  );
};

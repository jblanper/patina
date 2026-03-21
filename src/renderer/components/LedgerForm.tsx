import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const entryLabel = coinId ? `#${String(coinId).padStart(3, '0')}` : t('ledger.newEntryId');

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
          {t('ledger.entryLabel')} {entryLabel} // {formData.era?.toUpperCase() || t('ledger.fallbackEra')} // {formData.metal?.toUpperCase() || '—'}
        </span>
        <div className="input-group">
          <input
            type="text"
            className={`input-h1 ${errors.title ? 'error' : ''}`}
            placeholder={t('ledger.designation')}
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
          />
          {errors.title && <span className="error-hint">{errors.title}</span>}
        </div>

        <div className="subtitle-stack">
          <div className="subtitle-item">
            <span className="subtitle-label">{t('ledger.era')}</span>
            <AutocompleteField
              field="era"
              value={formData.era || ''}
              onChange={(v) => updateField('era', v)}
              onAddNew={(v) => { eraVocab.addVocabulary(v); updateField('era', v); }}
              options={eraVocab.options}
              placeholder={t('ledger.placeholders.era')}
              onReset={eraVocab.resetVocabularies}
              hasUserValues={false}
            />
          </div>
          <div className="subtitle-item">
            <span className="subtitle-label">{t('ledger.mintedAt')}</span>
            <AutocompleteField
              field="mint"
              value={formData.mint || ''}
              onChange={(v) => updateField('mint', v)}
              onAddNew={(v) => { mintVocab.addVocabulary(v); updateField('mint', v); }}
              options={mintVocab.options}
              placeholder={t('ledger.placeholders.mint')}
              onReset={mintVocab.resetVocabularies}
              hasUserValues={false}
            />
          </div>
          <div className="subtitle-item">
            <span className="subtitle-label">{t('ledger.year')}</span>
            <input
              type="text"
              className="input-sub"
              placeholder={t('ledger.placeholders.year')}
              value={formData.year_display || ''}
              onChange={(e) => updateField('year_display', e.target.value)}
            />
          </div>
          <div className="subtitle-item">
            <span className="subtitle-label">{t('ledger.issuer')}</span>
            <input
              type="text"
              className="input-sub"
              placeholder={t('ledger.placeholders.issuer')}
              value={formData.issuer || ''}
              onChange={(e) => updateField('issuer', e.target.value)}
            />
          </div>
          <div className="subtitle-item">
            <span className="subtitle-label">{t('ledger.denomination')}</span>
            <AutocompleteField
              field="denomination"
              value={formData.denomination || ''}
              onChange={(v) => updateField('denomination', v)}
              onAddNew={(v) => { denominationVocab.addVocabulary(v); updateField('denomination', v); }}
              options={denominationVocab.options}
              placeholder={t('ledger.placeholders.denomination')}
              onReset={denominationVocab.resetVocabularies}
              hasUserValues={false}
            />
          </div>
          <div className="subtitle-item">
            <span className="subtitle-label">{t('ledger.reference')}</span>
            <input
              type="text"
              className="input-sub"
              placeholder={t('ledger.placeholders.reference')}
              value={formData.catalog_ref || ''}
              onChange={(e) => updateField('catalog_ref', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Technical Metrics */}
      <div className="metrics-grid">
        <div className="metric-item">
          <span className="metric-label">{t('ledger.weight')}</span>
          <input
            type="number"
            step="0.01"
            className={`input-metric ${errors.weight ? 'error' : ''}`}
            placeholder={t('ledger.placeholders.weight')}
            value={formData.weight || ''}
            onChange={(e) => updateField('weight', e.target.value ? parseFloat(e.target.value) : null)}
          />
          {errors.weight && <span className="error-hint">{errors.weight}</span>}
        </div>
        <div className="metric-item">
          <span className="metric-label">{t('ledger.diameter')}</span>
          <input
            type="number"
            step="0.1"
            className={`input-metric ${errors.diameter ? 'error' : ''}`}
            placeholder={t('ledger.placeholders.diameter')}
            value={formData.diameter || ''}
            onChange={(e) => updateField('diameter', e.target.value ? parseFloat(e.target.value) : null)}
          />
          {errors.diameter && <span className="error-hint">{errors.diameter}</span>}
        </div>
        <div className="metric-item">
          <span className="metric-label">{t('ledger.dieAxis')}</span>
          <AutocompleteField
            field="die_axis"
            value={formData.die_axis || ''}
            onChange={(v) => updateField('die_axis', v)}
            onAddNew={(v) => { dieAxisVocab.addVocabulary(v); updateField('die_axis', v); }}
            options={dieAxisVocab.options}
            placeholder={t('ledger.placeholders.dieAxis')}
            onReset={dieAxisVocab.resetVocabularies}
            hasUserValues={false}
          />
        </div>
        <div className="metric-item">
          <span className="metric-label">{t('ledger.material')}</span>
          <AutocompleteField
            field="metal"
            value={formData.metal || ''}
            onChange={(v) => updateField('metal', v)}
            onAddNew={(v) => { metalVocab.addVocabulary(v); updateField('metal', v); }}
            options={metalVocab.options}
            placeholder={t('ledger.placeholders.material')}
            onReset={metalVocab.resetVocabularies}
            hasUserValues={false}
          />
        </div>
        <div className="metric-item">
          <span className="metric-label">{t('ledger.fineness')}</span>
          <input
            type="text"
            className="input-metric"
            placeholder={t('ledger.placeholders.fineness')}
            value={formData.fineness || ''}
            onChange={(e) => updateField('fineness', e.target.value)}
          />
        </div>
        <div className="metric-item">
          <span className="metric-label">{t('ledger.grade')}</span>
          <AutocompleteField
            field="grade"
            value={formData.grade || ''}
            onChange={(v) => updateField('grade', v)}
            onAddNew={(v) => { gradeVocab.addVocabulary(v); updateField('grade', v); }}
            options={gradeVocab.options}
            placeholder={t('ledger.placeholders.grade')}
            onReset={gradeVocab.resetVocabularies}
            hasUserValues={false}
          />
        </div>
      </div>

      {/* Numismatic Data */}
      <div className="numismatic-section">
        <span className="section-label">{t('ledger.obverse')}</span>
        <input
          type="text"
          className="input-legend"
          placeholder={t('ledger.placeholders.obverseLegend')}
          value={formData.obverse_legend || ''}
          onChange={(e) => updateField('obverse_legend', e.target.value)}
        />
        <textarea
          className="input-block"
          placeholder={t('ledger.placeholders.obverseDesc')}
          value={formData.obverse_desc || ''}
          onChange={(e) => updateField('obverse_desc', e.target.value)}
        />
      </div>

      <div className="numismatic-section">
        <span className="section-label">{t('ledger.reverse')}</span>
        <input
          type="text"
          className="input-legend"
          placeholder={t('ledger.placeholders.reverseLegend')}
          value={formData.reverse_legend || ''}
          onChange={(e) => updateField('reverse_legend', e.target.value)}
        />
        <textarea
          className="input-block"
          placeholder={t('ledger.placeholders.reverseDesc')}
          value={formData.reverse_desc || ''}
          onChange={(e) => updateField('reverse_desc', e.target.value)}
        />
      </div>

      {/* Curator's Note */}
      <div className="numismatic-section">
        <span className="section-label">{t('ledger.curatorsNote')}</span>
        <textarea
          className="input-block input-block-tall"
          placeholder={t('ledger.placeholders.curatorsNote')}
          value={formData.story || ''}
          onChange={(e) => updateField('story', e.target.value)}
        />
      </div>

      {/* Provenance */}
      <div className="numismatic-section">
        <span className="section-label">{t('ledger.provenance')}</span>
        <input
          type="text"
          className="input-metric provenance-input"
          placeholder={t('ledger.placeholders.provenance')}
          value={formData.provenance || ''}
          onChange={(e) => updateField('provenance', e.target.value)}
        />
      </div>

      {/* Acquisition Footer */}
      <footer className="ledger-footer">
        <div className="metrics-grid">
          <div className="metric-item">
            <span className="metric-label">{t('ledger.acquired')}</span>
            <input
              type="text"
              className="input-metric"
              placeholder={t('ledger.placeholders.acquired')}
              value={formData.purchase_date || ''}
              onChange={(e) => updateField('purchase_date', e.target.value)}
            />
          </div>
          <div className="metric-item">
            <span className="metric-label">{t('ledger.source')}</span>
            <input
              type="text"
              className="input-metric"
              placeholder={t('ledger.placeholders.source')}
              value={formData.purchase_source || ''}
              onChange={(e) => updateField('purchase_source', e.target.value)}
            />
          </div>
          <div className="metric-item">
            <span className="metric-label">{t('ledger.cost')}</span>
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

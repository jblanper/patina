import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GLOSSARY_FIELDS, GLOSSARY_SECTIONS, GlossaryField, GlossaryVocabTable } from '../data/glossaryFields';

export interface GlossaryTableProps {
  table: GlossaryVocabTable;
}

export const GlossaryTable: React.FC<GlossaryTableProps> = ({ table }) => (
  <table className="glossary-table">
    <thead>
      <tr>
        {table.columns.map((col) => (
          <th key={col}>{col}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {table.rows.map((row, rowIdx) => (
        <tr key={rowIdx}>
          {row.map((cell, cellIdx) => (
            <td key={cellIdx}>{cell}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

export interface GlossaryEntryProps {
  field: GlossaryField;
  lang: 'en' | 'es';
}

export const GlossaryEntry: React.FC<GlossaryEntryProps> = ({ field, lang }) => {
  const { t } = useTranslation();
  const vocab = field.vocabulary?.[lang];
  return (
    <article id={field.id} className="glossary-entry">
      <header className="glossary-entry-header">
        <h3 className="glossary-field-name">{t(field.nameKey)}</h3>
        <code className="glossary-field-id">{field.id}</code>
        {field.required && (
          <span className="glossary-required">{t('glossary.required')}</span>
        )}
        <span className="glossary-type">{t(field.typeKey)}</span>
      </header>
      <p className="glossary-description">{field.description[lang]}</p>
      {vocab && <GlossaryTable table={vocab} />}
      {field.furtherReading && field.furtherReading.length > 0 && (
        <ul className="glossary-further-reading">
          {field.furtherReading.map((link) => (
            <li key={link.url}>
              <a href={link.url} className="glossary-external-link" target="_blank" rel="noreferrer">
                {link.label} ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
};

export const Glossary: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === 'es' ? 'es' : 'en') as 'en' | 'es';

  return (
    <>
      <header className="app-header">
        <Link to="/" className="glossary-back-link">{t('glossary.backToCabinet')}</Link>
        <h1>{t('glossary.title')}</h1>
      </header>

      <div className="glossary-layout">
        <aside className="glossary-rail" aria-label="Section navigation">
          {GLOSSARY_SECTIONS.map((section) => (
            <button
              key={section.id}
              className="glossary-rail-link"
              title={t(section.labelKey)}
              onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t(section.labelKey).charAt(0)}
            </button>
          ))}
        </aside>

        <main className="glossary-scroll">
          {GLOSSARY_SECTIONS.map((section) => {
            const fields = GLOSSARY_FIELDS.filter((f) => f.section === section.id);
            return (
              <section key={section.id} id={section.id} className="glossary-section">
                <h2 className="glossary-section-heading">{t(section.labelKey)}</h2>
                {fields.map((field) => (
                  <GlossaryEntry
                    key={field.id}
                    field={field}
                    lang={lang}
                  />
                ))}
              </section>
            );
          })}
        </main>
      </div>
    </>
  );
};

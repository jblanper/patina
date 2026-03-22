import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Glossary, GlossaryEntry } from './Glossary';
import { GLOSSARY_FIELDS, GLOSSARY_SECTIONS } from '../data/glossaryFields';

// Mutable test language — shared between vi.hoisted and vi.mock factory.
// Default 'en' matches the global setupTests mock; set to 'es' for TC-GL-14.
const { testLang } = vi.hoisted(() => ({ testLang: { value: 'en' as 'en' | 'es' } }));

vi.mock('react-i18next', async () => {
  const en = (await import('../i18n/locales/en.json')).default as Record<string, unknown>;
  const es = (await import('../i18n/locales/es.json')).default as Record<string, unknown>;

  function resolveKey(json: Record<string, unknown>, key: string, opts?: Record<string, unknown>): string {
    const parts = key.split('.');
    let current: unknown = json;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else return key;
    }
    let val = typeof current === 'string' ? current : key;
    if (opts) val = val.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? ''));
    return val;
  }

  return {
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) =>
        resolveKey(testLang.value === 'es' ? es : en, key, opts),
      i18n: { changeLanguage: vi.fn().mockResolvedValue(undefined), language: testLang.value },
    }),
    initReactI18next: { type: '3rdParty', init: vi.fn() },
    Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
  };
});

function renderGlossary() {
  return render(
    <MemoryRouter>
      <Glossary />
    </MemoryRouter>
  );
}

describe('Glossary — section headings', () => {
  it('TC-GL-01: renders all 6 section headings in English', () => {
    renderGlossary();
    expect(screen.getByText('Identity & Classification')).toBeInTheDocument();
    expect(screen.getByText('Dating')).toBeInTheDocument();
    expect(screen.getByText('Physical Description')).toBeInTheDocument();
    expect(screen.getByText('Inscriptions & Descriptions')).toBeInTheDocument();
    expect(screen.getByText('Cataloging & Reference')).toBeInTheDocument();
    expect(screen.getByText('Provenance & Acquisition')).toBeInTheDocument();
  });

  describe('Spanish language', () => {
    beforeEach(() => { testLang.value = 'es'; });
    afterEach(() => { testLang.value = 'en'; });

    it('TC-GL-14: renders all 6 section headings in Spanish when language is "es"', () => {
      renderGlossary();
      expect(screen.getByText('Identidad y Clasificación')).toBeInTheDocument();
      expect(screen.getByText('Datación')).toBeInTheDocument();
      expect(screen.getByText('Descripción Física')).toBeInTheDocument();
      expect(screen.getByText('Inscripciones y Descripciones')).toBeInTheDocument();
      expect(screen.getByText('Catalogación y Referencia')).toBeInTheDocument();
      expect(screen.getByText('Procedencia y Adquisición')).toBeInTheDocument();
    });
  });
});

describe('Glossary — field entries', () => {
  it('TC-GL-02: all field entries render with their id as HTML anchor', () => {
    const { container } = renderGlossary();
    GLOSSARY_FIELDS.forEach((field) => {
      const el = container.querySelector(`#${CSS.escape(field.id)}`);
      expect(el, `Expected element with id="${field.id}" to exist`).toBeTruthy();
    });
  });

  it('TC-GL-03: required fields show the required badge', () => {
    renderGlossary();
    const requiredFields = GLOSSARY_FIELDS.filter((f) => f.required);
    expect(requiredFields.length).toBeGreaterThan(0);

    requiredFields.forEach((field) => {
      const entry = document.getElementById(field.id)!;
      expect(within(entry).getByText('required')).toBeInTheDocument();
    });
  });

  it('TC-GL-04: optional fields do not show the required badge', () => {
    renderGlossary();
    const optionalField = GLOSSARY_FIELDS.find((f) => !f.required)!;
    const entry = document.getElementById(optionalField.id)!;
    expect(within(entry).queryByText('required')).toBeNull();
  });

  it('TC-GL-05: vocabulary tables render for fields that have vocabulary', () => {
    renderGlossary();
    const fieldsWithVocab = GLOSSARY_FIELDS.filter((f) => f.vocabulary);
    expect(fieldsWithVocab.length).toBeGreaterThan(0);

    fieldsWithVocab.forEach((field) => {
      const entry = document.getElementById(field.id)!;
      expect(within(entry).getByRole('table')).toBeInTheDocument();
    });
  });

  it('TC-GL-06: fields without vocabulary do not render a table', () => {
    renderGlossary();
    const fieldWithoutVocab = GLOSSARY_FIELDS.find((f) => !f.vocabulary)!;
    const entry = document.getElementById(fieldWithoutVocab.id)!;
    expect(within(entry).queryByRole('table')).toBeNull();
  });
});

describe('Glossary — navigation', () => {
  it('TC-GL-07: "Back to Cabinet" link points to "/"', () => {
    renderGlossary();
    const backLink = screen.getByRole('link', { name: /Back to Cabinet/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink.getAttribute('href')).toBe('/');
  });
});

describe('Glossary — section rail', () => {
  it('TC-GL-08: sticky section rail renders one button per section', () => {
    renderGlossary();
    const rail = screen.getByRole('complementary', { name: /section navigation/i });
    const railButtons = within(rail).getAllByRole('button');
    expect(railButtons).toHaveLength(GLOSSARY_SECTIONS.length);
  });

  it('TC-GL-09: each rail button title matches its section label', () => {
    renderGlossary();
    const sectionLabels = [
      'Identity & Classification',
      'Dating',
      'Physical Description',
      'Inscriptions & Descriptions',
      'Cataloging & Reference',
      'Provenance & Acquisition',
    ];
    sectionLabels.forEach((label) => {
      expect(screen.getByTitle(label)).toBeInTheDocument();
    });
  });
});

describe('GlossaryEntry — language rendering', () => {
  const titleField = GLOSSARY_FIELDS.find((f) => f.id === 'title')!;

  it('TC-GL-10: renders English description when lang="en"', () => {
    render(<GlossaryEntry field={titleField} lang="en" />);
    expect(screen.getByText(titleField.description.en)).toBeInTheDocument();
  });

  it('TC-GL-11: renders Spanish description when lang="es"', () => {
    render(<GlossaryEntry field={titleField} lang="es" />);
    expect(screen.getByText(titleField.description.es)).toBeInTheDocument();
  });

  it('TC-GL-12: renders vocabulary table in Spanish when lang="es"', () => {
    const fieldWithVocab = GLOSSARY_FIELDS.find((f) => f.vocabulary)!;
    const { container } = render(<GlossaryEntry field={fieldWithVocab} lang="es" />);
    const table = container.querySelector('table.glossary-table');
    expect(table).toBeTruthy();
    // Spanish column header should be present
    const esColumns = fieldWithVocab.vocabulary!.es.columns;
    expect(screen.getByText(esColumns[0])).toBeInTheDocument();
  });

  it('TC-GL-13: renders further reading links when present', () => {
    const fieldWithLinks = GLOSSARY_FIELDS.find((f) => f.furtherReading && f.furtherReading.length > 0);
    if (!fieldWithLinks) return; // skip if no field has further reading
    render(<GlossaryEntry field={fieldWithLinks} lang="en" />);
    fieldWithLinks.furtherReading!.forEach((link) => {
      expect(screen.getByText(`${link.label} ↗`)).toBeInTheDocument();
    });
  });
});

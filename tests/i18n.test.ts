import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLocale, translator } from '../src/lib/i18n';
import { french } from '../src/lib/messages.fr';
import { chefLevels } from '../src/lib/chef-levels';
import { faqs } from '../src/lib/help';

test('language selection accepts supported locales and safely defaults to English', () => {
  assert.equal(parseLocale('fr'), 'fr');
  for (const value of ['en', 'de', '', undefined, '<script>', { language: 'fr' }])
    assert.equal(parseLocale(value), 'en');
  assert.equal(translator('en')('My recipes'), 'My recipes');
  assert.equal(translator('fr')('My recipes'), 'Mes recettes');
});

test('translated messages interpolate values literally and preserve unknown recipe content', () => {
  const t = translator('fr');
  assert.equal(
    t('{0} results for “{1}”', { 0: 2, 1: 'pâtes <b>$&</b>' }),
    '2 résultats pour « pâtes <b>$&</b> »',
  );
  assert.equal(t('Grandma’s handwritten cake'), 'Grandma’s handwritten cake');
  assert.equal(t(4), 4);
  assert.equal(t('{0} results for “{1}”', { 0: 0 }), '0 résultats pour « {1} »');
});

test('French covers every chef rank and help answer, including automatic Google linking', () => {
  for (const level of chefLevels) {
    assert.ok(french[level.name]);
    assert.ok(french[level.description]);
  }
  for (const faq of faqs) {
    assert.ok(french[faq.question], faq.question);
    assert.ok(french[faq.answer], faq.question);
  }
  assert.match(translator('fr')(faqs[2].answer), /automatiquement associé/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { coachInput, validateCoaching } from '../src/lib/chef-coach-content';
const recipe = { title: 'Tomato sauce', servings: 2, ingredients: [{ name: 'tomato', quantity: '1', unit: '' }], steps: ['Chop the tomato.', 'Simmer the sauce for 12 minutes.'] };
const answer = { guidance: 'Cut the tomato into similar pieces so it cooks evenly. Keep your fingers away from the blade.', explanation: 'Similar pieces cook at a similar pace. Set them aside once they are cut.', roast: 'Your tomato cutting technique looks like you negotiated with the knife and lost.' };
test('coaching must add explanation, keep measurements and anchor jokes to the selected step', () => {
  const input = coachInput.parse({ step: 0, language: 'en', servings: 2, roast: true });
  assert.equal(validateCoaching(answer, recipe, input).source, 'ai');
  assert.throws(() => validateCoaching({ ...answer, roast: 'That tomato needs a knife cut, not a demolition job.' }, recipe, input));
  assert.throws(() => validateCoaching({ ...answer, guidance: recipe.steps[0] }, recipe, input));
  assert.throws(() => validateCoaching({ ...answer, explanation: 'Bake the tomato at 180 degrees for 20 minutes.' }, recipe, input));
  assert.throws(() => validateCoaching({ ...answer, explanation: 'Leave the tomato to rest for 1 minute before cutting.' }, recipe, input));
  assert.throws(() => validateCoaching({ ...answer, roast: 'Come on chef, focus. Dinner deserves better.' }, recipe, input));
  assert.throws(() => validateCoaching({ ...answer, roast: 'The tomato refuses to play tennis with a racket.' }, recipe, input));
  assert.throws(() => validateCoaching(answer, recipe, { ...input, previousRoast: answer.roast }));
});
test('French coaching metadata stays in the selected language and calm mode suppresses roasts', () => {
  const french = { ...recipe, steps: ['Coupez la tomate.'] };
  const input = coachInput.parse({ step: 0, language: 'fr', servings: 2, roast: false });
  const result = validateCoaching({ guidance: 'Faites des morceaux réguliers pour une cuisson uniforme. Gardez les doigts loin de la lame.', explanation: 'Les morceaux de taille similaire cuisent au même rythme. Réservez-les une fois découpés.', roast: 'Une blague facultative.' }, french, input);
  assert.equal(result.language, 'fr'); assert.equal(result.roast, ''); assert.equal(result.step, 0);
  assert.throws(() => coachInput.parse({ ...input, step: -1 }));
  assert.throws(() => coachInput.parse({ ...input, language: 'de' }));
});

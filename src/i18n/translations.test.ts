import { translations } from './translations';

test('English and Uzbek expose exactly the same translation keys', () => {
  expect(Object.keys(translations.uz).sort()).toEqual(Object.keys(translations.en).sort());
  expect(Object.values(translations.en).every(Boolean)).toBe(true);
  expect(Object.values(translations.uz).every(Boolean)).toBe(true);
});

import latinize from 'latinize';
import removeAccents from 'remove-accents';
import unidecode from 'unidecode';
import unorm from 'unorm';

/**
 * Normalize a string to a readable format.
 * @param text The text to normalize.
 * @returns The normalized text.
 */
export function normalize(text: string) {
  return unidecode(unorm.nfkc(latinize(removeAccents(text)))).replace(
    /\[\?\]/g,
    ''
  );
}

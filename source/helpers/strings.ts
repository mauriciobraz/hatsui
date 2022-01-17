import unidecode from "unidecode";
import unorm from "unorm";
import latinize from "latinize";
import removeAccents from "remove-accents";

export const sanitizeString = (string: string) => {
  return unidecode(unorm.nfkc(latinize(removeAccents(string)))).replace(
    /\[\?\]/g,
    ""
  );
};

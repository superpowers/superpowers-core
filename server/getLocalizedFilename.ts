export default function getLocalizedFilename(filename: string, language: string) {
  if (language === "en") return filename;
  const [ basename, extension ] = filename.split(".");
  return `${basename}.${language}.${extension}`;
}

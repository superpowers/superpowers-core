export default function getLocalizedFilename(filename: string, languageCode: string) {
  if (languageCode === "en") return filename;
  const [ basename, extension ] = filename.split(".");
  return `${basename}.${languageCode}.${extension}`;
}

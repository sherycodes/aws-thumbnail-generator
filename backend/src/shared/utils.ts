export function sanitiseFilename(name: string | undefined): string | undefined {
  if (!name) return undefined;
  return name.replace(/[\r\n\t]/g, "").slice(0, 200) || undefined;
}

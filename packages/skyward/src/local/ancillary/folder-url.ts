export function folderUrl(file: string): URL {
  const asFolder = `${file}/`.replace(/\/\/$/, "/");
  return new URL(`file://${asFolder}`);
}

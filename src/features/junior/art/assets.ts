/** Illustrations dropped into src/assets/junior (see its README): they replace the drawn fallbacks. */
const ASSETS = import.meta.glob<string>('../../../assets/junior/*.{png,webp,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** The illustration file for a picture id, if one has been added. */
export function assetUrlFor(id: string): string | null {
  for (const [path, url] of Object.entries(ASSETS)) {
    if (path.replace(/^.*\//, '').replace(/\.[^.]+$/, '') === id) return url;
  }
  return null;
}


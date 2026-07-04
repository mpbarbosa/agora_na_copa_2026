// A catalog module contributes one namespaced slice of the UI string catalog.
// Each area/view owns its own module file so contributions never collide.
// `pt` is the complete reference; `es` may omit keys (translate() falls back).
export interface CatalogModule {
  pt: Record<string, string>;
  es: Record<string, string>;
}

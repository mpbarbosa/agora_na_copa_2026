// A catalog module contributes one namespaced slice of the UI string catalog.
// Each area/view owns its own module file so contributions never collide.
// `pt` is the complete reference; `es`/`en` may omit keys (translate() falls
// back to pt). `en` is optional so modules can add English incrementally.
export interface CatalogModule {
  pt: Record<string, string>;
  es: Record<string, string>;
  en?: Record<string, string>;
}

import type { Page } from "@playwright/test";

/**
 * Transient transport-level failures that are NOT app bugs: a request cut off
 * mid-flight by a connection close/reset/abort. These surface as browser-level
 * "Failed to load resource: net::ERR_…" console errors that application code
 * cannot suppress (the fetch promise is caught, but Chromium still logs the
 * failed request). They show up when, e.g., the `/api/presence` heartbeat races
 * the preview server closing a socket, or a navigation aborts an in-flight fetch.
 *
 * Note this only matches transport-level `net::ERR_*` codes — a real HTTP error
 * logs "Failed to load resource: the server responded with a status of 404/500…"
 * which does NOT match, so genuine asset/API failures are still caught.
 */
export const TRANSIENT_NETWORK_ERROR =
  /net::ERR_(CONNECTION_CLOSED|CONNECTION_RESET|CONNECTION_ABORTED|ABORTED|NETWORK_CHANGED|INTERNET_DISCONNECTED|EMPTY_RESPONSE)/;

/**
 * Third-party widget noise (Instagram/Facebook embeds) that logs to the console
 * when it can't reach its origin in the sandboxed e2e environment. Not our code.
 */
export const THIRD_PARTY_CONSOLE_NOISE =
  /instagram\.com|fburl\.com|connect\.facebook|ErrorUtils caught/;

/**
 * Attaches a console listener that collects only the page's *own* error messages,
 * ignoring transient transport-level network blips and known third-party widget
 * noise. Returns the mutable array of captured error texts to assert on (it fills
 * as the page runs, so read it after the interactions, e.g.
 * `expect(errors).toEqual([])`).
 *
 * Pass `extraIgnore` to drop additional spec-specific noise.
 */
export function collectAppConsoleErrors(page: Page, extraIgnore: RegExp[] = []): string[] {
  const ignore = [TRANSIENT_NETWORK_ERROR, THIRD_PARTY_CONSOLE_NOISE, ...extraIgnore];
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    const url = msg.location()?.url ?? "";
    if (ignore.some((re) => re.test(text) || re.test(url))) return;
    errors.push(text);
  });
  return errors;
}

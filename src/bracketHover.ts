// Imperative bridge so the guided tip tour can clear the bracket's hover spotlight
// DIRECTLY, without relying on synthesizing DOM pointer events. The tour's teardown
// runs while Driver.js destroys its popover (on Escape or "Entendi"); under CPU load a
// synthetic pointerleave isn't guaranteed to be processed by React in time, leaving the
// 16-avos feeders stuck lit. BracketView registers its hover setter here on mount and
// the tour calls clearBracketSpotlight() on teardown, so the clear is deterministic
// regardless of host load. Real-user hover/focus behaviour in BracketView is untouched.
type HoverSetter = (matchNumber: number | null) => void;

let setHover: HoverSetter | null = null;

/** BracketView registers its `setHoveredMatch` here; returns the unregister cleanup. */
export function registerBracketHover(setter: HoverSetter): () => void {
  setHover = setter;
  return () => {
    if (setHover === setter) setHover = null;
  };
}

/** Clear the bracket feeder spotlight immediately. No-op when the bracket isn't mounted. */
export function clearBracketSpotlight(): void {
  setHover?.(null);
}

// Local replacement for the CDN-hosted DualObserverSubject (paraty_geocore.js).
// Upstream guia_js re-exports it from jsDelivr; vendoring this minimal, equivalent
// implementation is what lets the speech engine ship with ZERO runtime network
// dependency. The vendored SpeechQueue uses it to notify subscribers of queue
// changes — agora wires no speech-queue observers, so these lists stay empty in
// practice, but the full dual (object + function) observer contract is implemented
// so the queue behaves exactly as upstream.

type Observer = { update?: (...args: unknown[]) => void };
type ObserverFunction = (...args: unknown[]) => void;

export default class ObserverSubject {
  observers: Observer[] = [];
  functionObservers: ObserverFunction[] = [];

  subscribe(observer?: Observer | null): void {
    if (observer && !this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  unsubscribe(observer: Observer): void {
    this.observers = this.observers.filter((o) => o !== observer);
  }

  subscribeFunction(fn?: ObserverFunction | null): void {
    if (typeof fn === "function" && !this.functionObservers.includes(fn)) {
      this.functionObservers.push(fn);
    }
  }

  unsubscribeFunction(fn: ObserverFunction): void {
    this.functionObservers = this.functionObservers.filter((f) => f !== fn);
  }

  notifyObservers(...args: unknown[]): void {
    for (const o of this.observers) {
      try {
        o.update?.(...args);
      } catch {
        /* an observer throwing must not break queue notifications */
      }
    }
  }
}

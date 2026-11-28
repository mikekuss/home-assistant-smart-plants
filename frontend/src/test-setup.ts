// happy-dom's IntersectionObserver never reports anything. Tests see every
// observed element as on screen, shortly after it is observed, as a browser
// would report it (tests that run in Node, without a DOM, are left alone);
// a test that needs to control visibility replaces this
// with `manualVisibility()` from test-helpers.ts.
class OnScreenObserver {
  constructor(private readonly _callback: IntersectionObserverCallback) {}
  observe(target: Element): void {
    queueMicrotask(() => this._callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

const dom = typeof Element === "function";
if (dom) globalThis.IntersectionObserver = OnScreenObserver as unknown as typeof IntersectionObserver;

// Browsers mark the `finished` promise of an animation as handled, so a
// cancelled fade is no error; happy-dom doesn't.
const animate = dom ? Element.prototype.animate as Element["animate"] | undefined : undefined;
if (animate) {
  Element.prototype.animate = function (this: Element, ...args: Parameters<Element["animate"]>) {
    const animation = animate.apply(this, args);
    animation.finished?.catch(() => undefined);
    return animation;
  };
}

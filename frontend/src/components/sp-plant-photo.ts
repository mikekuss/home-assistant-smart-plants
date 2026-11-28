import { LitElement, html, unsafeCSS } from "lit";
import { property } from "lit/decorators.js";
import { whenVisible } from "@lazy-ease/core";
import { createLazyEase } from "@lazy-ease/core/prepared";
import type { AttachOptions, Attachment } from "@lazy-ease/core/prepared";
import { thumbhashDecoder } from "@lazy-ease/core/thumbhash";
import { cssText } from "@lazy-ease/vanilla/css";
import { thumbHashToAverageRGBA, thumbHashToDataURL } from "thumbhash";
import { ENGLISH } from "../localize.js";
import type { Localizer } from "../localize.js";
import { avatarStyles } from "./sp-plant-avatar.js";
import { themeFallbacks } from "./shared-styles.js";

// One controller and one decoder for every photo of the panel. Options that
// lazy-ease compares between updates stay in module scope or are built only
// for a new photo, never in render(): a new options object would start the
// photo over. The decoder gets only the two decoding functions of the
// thumbhash package, so its encoder stays out of the bundle.
const decoder = thumbhashDecoder({ thumbHashToAverageRGBA, thumbHashToDataURL });
const lazyEase = createLazyEase({ thumbhash: decoder });
// The photo is asked for a little before it scrolls into view.
const NEAR = { rootMargin: "400px" };
// The first display of a photo fades in, as other loaded content does; lazy-ease
// skips the fade for reduced motion.
const FADE_MS = 150;
const PLACEHOLDER = ["backgroundColor", "backgroundImage", "backgroundSize"] as const;

// Photos already faded in once. A card that is drawn again, for example after
// going back to the overview, shows its photo at once.
const shown = new Set<string>();

export interface PhotoWantedDetail { photoId: string }

// A plant photo the panel loads only when it comes near the screen.
//
// `photoId` is the plant's image id, null for a plant without a photo (the
// plant icon on a tinted tile). Once the tile comes within 400 px of the
// viewport the element fires `photo-wanted` with that id, and the view fetches
// the photo and hands the downloaded blob over as `photo`. Until it arrives the
// tile shows `thumbhash`, a blurred preview in the photo's colours, or the
// plant icon without one. The element makes the object URL for the blob and
// revokes it when the photo changes or the element leaves the page. A photo
// that downloads but cannot be displayed fires `photo-error`.
export class SpPlantPhoto extends LitElement {
  static styles = [themeFallbacks, unsafeCSS(cssText), avatarStyles];

  @property({ attribute: false }) public photoId: string | null = null;
  @property({ attribute: false }) public photo: Blob | null = null;
  @property({ attribute: false }) public thumbhash: string | null = null;
  @property() public name = "";
  @property({ reflect: true }) public size: "small" | "large" = "small";
  @property({ attribute: false }) public l: Localizer = ENGLISH;

  private _attachment: Attachment | undefined;
  // The object URL of the photo on screen or loading, and its image id.
  private _url: string | null = null;
  private _urlFor: string | null = null;
  // The image id whose tile is watched, and whether the tile came near the
  // screen since the element was connected.
  private _watched: string | null = null;
  private _unwatch: (() => void) | undefined;
  private _near = false;
  // The preview this element painted while no photo is loading.
  private _painted: string | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this._sync();
  }

  // A card that only moves, in a list sorted again, is connected again in the
  // same task and keeps its photo; one that left lets go of it.
  disconnectedCallback(): void {
    super.disconnectedCallback();
    queueMicrotask(() => {
      if (this.isConnected) return;
      this._unwatch?.(); this._unwatch = undefined; this._watched = null; this._near = false;
      this._release();
    });
  }

  protected render() {
    const content = this.photoId && this.photo
      ? html`<img alt=${this.l.t("photo.alt", { name: this.name })}>`
      : this.photoId && this.thumbhash ? "" : html`<ha-icon aria-hidden="true" icon="mdi:sprout"></ha-icon>`;
    return html`<div class="tile" part="tile" data-le>${content}</div>`;
  }

  protected updated(): void { this._sync(); }

  private _tile(): HTMLElement | null { return this.renderRoot.querySelector<HTMLElement>(".tile"); }

  private _sync(): void {
    if (!this.isConnected) return;
    const id = this.photoId;
    const tile = this._tile();
    if (id !== this._watched) {
      this._unwatch?.(); this._unwatch = undefined; this._watched = id;
      if (id && tile) {
        if (this._near) this._want(id);
        else this._unwatch = whenVisible(tile, NEAR, () => { this._unwatch = undefined; this._near = true; this._want(id); });
      }
    }
    const img = this.renderRoot.querySelector("img");
    if (!id || !this.photo || !img) {
      const taken = this._url !== null;
      this._release();
      this._paint(id ? this.thumbhash : null);
      // The view dropped the photo of a tile on screen, after a lost
      // connection for example: ask for it again.
      if (taken && id && id === this._watched && this._near) this._want(id);
      return;
    }
    // The same photo is already on screen or loading; a copy downloaded again
    // (after a new access token, for example) changes nothing.
    if (id === this._urlFor && this._attachment) return;
    this._show(img, id, this.photo);
  }

  private _want(id: string): void {
    if (this.photoId !== id) return;
    if (!this.photo) this._paint(this.thumbhash);
    this.dispatchEvent(new CustomEvent<PhotoWantedDetail>("photo-wanted", { detail: { photoId: id }, bubbles: true, composed: true }));
  }

  private _show(img: HTMLImageElement, id: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const options: AttachOptions = {
      url, loading: "eager", fadeDuration: shown.has(id) ? 0 : FADE_MS,
      onDisplay: () => { if (this._url === url) shown.add(id); },
      onStateChange: state => { if (state === "error" && this._url === url) this.dispatchEvent(new CustomEvent("photo-error", { bubbles: true, composed: true })); },
    };
    if (this.thumbhash && decoder(this.thumbhash)) options.placeholder = `thumbhash:${this.thumbhash}`;
    // lazy-ease paints the preview from here on; it restores what the tile had
    // before, so the tile must not keep this element's own preview.
    this._clearPaint();
    const replaced = this._url;
    this._url = url; this._urlFor = id;
    if (this._attachment) this._attachment.update(options);
    else this._attachment = lazyEase.attach(img, options);
    // update() puts the image back on its placeholder at once and fades the
    // new photo in on the same element, so the old URL is no longer needed.
    if (replaced) URL.revokeObjectURL(replaced);
  }

  // Ends the photo on screen, if any: the controller, its object URLs and
  // any preview it painted.
  private _release(): void {
    if (this._attachment) { this._attachment.destroy(); this._attachment = undefined; this._clearPaint(); }
    if (this._url) URL.revokeObjectURL(this._url);
    this._url = null; this._urlFor = null;
  }

  // The ThumbHash preview while the photo isn't there yet: its average colour
  // at once, the blurred image once the tile is near the screen.
  private _paint(hash: string | null): void {
    const key = hash ? `${hash}:${this._near}` : null;
    if (key === this._painted) return;
    this._clearPaint();
    const preview = hash ? decoder(hash) : undefined;
    const tile = this._tile();
    if (!preview || !tile) return;
    this._painted = key;
    Object.assign(tile.style, preview.style, this._near ? preview.lazy?.() : undefined);
  }

  private _clearPaint(): void {
    const tile = this._tile();
    if (tile) for (const property of PLACEHOLDER) tile.style[property] = "";
    this._painted = null;
  }
}

if (!customElements.get("sp-plant-photo")) customElements.define("sp-plant-photo", SpPlantPhoto);
declare global {
  interface HTMLElementTagNameMap { "sp-plant-photo": SpPlantPhoto }
  interface HTMLElementEventMap { "photo-wanted": CustomEvent<PhotoWantedDetail> }
}

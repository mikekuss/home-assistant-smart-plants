function e() {
	return typeof window.matchMedia == "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function t(t, n = 180) {
	t && typeof t.animate == "function" && !e() && t.animate([{ opacity: 0 }, { opacity: 1 }], {
		duration: n,
		easing: "ease-out"
	});
}
// src/card/picker.ts
var n = {
	en: {
		name: "Smart Plants plant card",
		description: "One plant with its status, soil moisture, readings and a Watered button.",
		load_error: "The plant card could not be loaded. Trying again shortly."
	},
	de: {
		name: "Smart Plants Pflanzenkarte",
		description: "Eine Pflanze mit Status, Bodenfeuchte, Messwerten und einer Schaltfläche „Gegossen“.",
		load_error: "Die Pflanzenkarte konnte nicht geladen werden. Gleich folgt ein neuer Versuch."
	}
};
function r(e) {
	return n[(e ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en"] ?? n.en;
}
// src/card/sidebar-icon.ts
var i = "smart-plants", a = "M7.77 22.18C7.84 20.62 7.91 19.18 7.96 17.67C4.59 17.12 2.48 14.76 2.4 11.34C6.71 11.78 8.65 13.89 8.83 16.54L8.83 15.83C8.83 12.54 11.17 9.74 15.55 8.96Q15.87 9.45 16.04 10.08C15.54 14.01 13.29 16.54 9.67 17.14C9.73 18.85 9.81 20.44 9.89 22.18ZM17.2 2C17.53 4.86 18.74 6.07 21.6 6.41C18.74 6.74 17.53 7.95 17.2 10.81C16.87 7.95 15.66 6.74 12.79 6.41C15.66 6.07 16.87 4.86 17.2 2Z";
function o(e = window) {
	let t = e.customIcons ?? (e.customIcons = {});
	t["smart-plants"] || (t[i] = { getIcon: async (e) => e === "logo" ? {
		path: a,
		viewBox: "0 0 24 24"
	} : { path: "" } });
}
// src/card/loader.ts
var s;
o();
var c = "smart-plants-plant-card", l = "smart-plants-plant-card-content", u = "smart-plants-card-full.js";
function d(e) {
	let t = import.meta.url, n = new URL(u, t);
	return n.search = new URL(t).search, e > 0 && n.searchParams.set("retry", String(e)), n.href;
}
var f = class e extends HTMLElement {
	constructor(...e) {
		super(...e), this._config = null, this._content = null, this._retry = null;
	}
	static module() {
		return this._module || (this._module = this.load(this._attempt++).catch((e) => {
			throw this._module = null, e;
		})), this._module;
	}
	static async getConfigForm() {
		return (await this.module()).getConfigForm();
	}
	static async getStubConfig(e) {
		return {
			type: `custom:${c}`,
			...(await this.module()).getStubConfig(e)
		};
	}
	set hass(e) {
		this._hass = e, this._content && (this._content.hass = e);
	}
	get hass() {
		return this._hass;
	}
	setConfig(e) {
		if (!e || typeof e != "object") throw Error("Invalid configuration");
		this._config = { ...e }, this._content?.setConfig(this._config), this._syncPlaceholder();
	}
	_syncPlaceholder() {
		let e = this.shadowRoot?.querySelector(".placeholder");
		e && (e.style.minHeight = `${this.placeholderHeight()}px`);
	}
	getCardSize() {
		let e = this._config;
		return 3 + (e?.show_readings === !1 ? 0 : 2) + (e?.show_watering === !1 ? 0 : 1);
	}
	getGridOptions() {
		return {
			columns: 6,
			min_columns: 6,
			rows: "auto"
		};
	}
	placeholderHeight() {
		let e = this._config;
		return 170 + (e?.show_readings === !1 ? 0 : 130) + (e?.show_watering === !1 ? 0 : 70);
	}
	connectedCallback() {
		if (!this.shadowRoot) {
			let e = this.attachShadow({ mode: "open" }), t = document.createElement("style");
			t.textContent = `:host { display: block; height: 100%; } ${l} { display: block; height: 100%; } .error { display: block; padding: 16px; color: var(--error-color, #db4437); } .placeholder { box-sizing: border-box; background: var(--ha-card-background, var(--card-background-color, #fff)); border-radius: var(--ha-card-border-radius, 12px); border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0)); animation: sp-pulse 1.4s ease-in-out infinite alternate; } @keyframes sp-pulse { from { opacity: 1; } to { opacity: .6; } } @media (prefers-reduced-motion: reduce) { .placeholder { animation: none; } }`, e.append(t);
		}
		let e = this.shadowRoot;
		if (!this._content && !e.querySelector(".placeholder, .error")) {
			let t = document.createElement("div");
			t.className = "placeholder", t.setAttribute("aria-hidden", "true"), e.append(t);
		}
		this._syncPlaceholder(), this._loadContent();
	}
	disconnectedCallback() {
		this._retry && clearTimeout(this._retry), this._retry = null;
	}
	_loadContent() {
		this._content || this._retry || e.module().then(() => {
			if (this._content || !this.isConnected || !this.shadowRoot) return;
			let e = document.createElement(l);
			this._config && e.setConfig(this._config), e.hass = this._hass, this._content = e, this.shadowRoot.querySelector(".error")?.remove(), this.shadowRoot.querySelector(".placeholder")?.remove(), this.shadowRoot.append(e), t(e);
		}).catch(() => {
			!this._content && this.isConnected && this.shadowRoot && !this._retry && (this._showError(), this._retry = setTimeout(() => {
				this._retry = null, this.isConnected && this._loadContent();
			}, e.retryDelayMs));
		});
	}
	_showError() {
		let e = this.shadowRoot;
		e.querySelector(".placeholder")?.remove();
		let t = e.querySelector(".error");
		t || (t = document.createElement("ha-card"), t.className = "error", t.setAttribute("role", "alert"), e.append(t));
		let n = this._hass?.language ?? document.documentElement.lang;
		t.textContent = r(n).load_error;
	}
};
s = f, s.load = (e) => import(
	/* @vite-ignore */
	d(e)
), s.retryDelayMs = 1e4, s._module = null, s._attempt = 0;
function p() {
	if (!window.customElements.get("smart-plants-plant-card")) try {
		window.customElements.define(c, f);
	} catch {}
}
var m = {
	intervalMs: 100,
	timeoutMs: 12e4
};
function h() {
	let e = window.customElements, t = Date.now(), n = setInterval(() => {
		window.customElements !== e && p(), (window.customElements !== e || Date.now() - t > m.timeoutMs) && clearInterval(n);
	}, m.intervalMs);
}
p(), !window.__haScopedRegistryReady && !("CustomElementRegistryPolyfill" in window) && h();
var g = window;
g.customCards = g.customCards ?? [], g.customCards.some((e) => e.type === "smart-plants-plant-card") || g.customCards.push({
	type: c,
	...r(document.documentElement.lang),
	preview: !0,
	documentationURL: "https://github.com/mikekuss/home-assistant-smart-plants/blob/main/docs/dashboard-card.md"
});
export { c as CARD_TYPE, m as REGISTRY_WATCH, f as SmartPlantsPlantCard, p as defineCard };

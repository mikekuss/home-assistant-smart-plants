// src/card/picker.ts
var e = {
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
function t(t) {
	return e[(t ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en"] ?? e.en;
}
// src/card/sidebar-icon.ts
var n = "smart-plants", r = "M7.77 22.18C7.84 20.62 7.91 19.18 7.96 17.67C4.59 17.12 2.48 14.76 2.4 11.34C6.71 11.78 8.65 13.89 8.83 16.54L8.83 15.83C8.83 12.54 11.17 9.74 15.55 8.96Q15.87 9.45 16.04 10.08C15.54 14.01 13.29 16.54 9.67 17.14C9.73 18.85 9.81 20.44 9.89 22.18ZM17.2 2C17.53 4.86 18.74 6.07 21.6 6.41C18.74 6.74 17.53 7.95 17.2 10.81C16.87 7.95 15.66 6.74 12.79 6.41C15.66 6.07 16.87 4.86 17.2 2Z";
function i(e = window) {
	let t = e.customIcons ?? (e.customIcons = {});
	t["smart-plants"] || (t[n] = { getIcon: async (e) => e === "logo" ? {
		path: r,
		viewBox: "0 0 24 24"
	} : { path: "" } });
}
// src/card/loader.ts
var a;
i();
var o = "smart-plants-plant-card", s = "smart-plants-plant-card-content", c = "smart-plants-card-full.js";
function l(e) {
	let t = import.meta.url, n = new URL(c, t);
	return n.search = new URL(t).search, e > 0 && n.searchParams.set("retry", String(e)), n.href;
}
var u = class e extends HTMLElement {
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
			type: `custom:${o}`,
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
		this._config = { ...e }, this._content?.setConfig(this._config);
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
	connectedCallback() {
		if (!this.shadowRoot) {
			let e = this.attachShadow({ mode: "open" }), t = document.createElement("style");
			t.textContent = `:host { display: block; height: 100%; } ${s} { display: block; height: 100%; } .error { display: block; padding: 16px; color: var(--error-color, #db4437); }`, e.append(t);
		}
		this._loadContent();
	}
	disconnectedCallback() {
		this._retry && clearTimeout(this._retry), this._retry = null;
	}
	_loadContent() {
		this._content || this._retry || e.module().then(() => {
			if (this._content || !this.isConnected || !this.shadowRoot) return;
			let e = document.createElement(s);
			this._config && e.setConfig(this._config), e.hass = this._hass, this._content = e, this.shadowRoot.querySelector(".error")?.remove(), this.shadowRoot.append(e);
		}).catch(() => {
			!this._content && this.isConnected && this.shadowRoot && !this._retry && (this._showError(), this._retry = setTimeout(() => {
				this._retry = null, this.isConnected && this._loadContent();
			}, e.retryDelayMs));
		});
	}
	_showError() {
		let e = this.shadowRoot, n = e.querySelector(".error");
		n || (n = document.createElement("ha-card"), n.className = "error", n.setAttribute("role", "alert"), e.append(n));
		let r = this._hass?.language ?? document.documentElement.lang;
		n.textContent = t(r).load_error;
	}
};
a = u, a.load = (e) => import(
	/* @vite-ignore */
	l(e)
), a.retryDelayMs = 1e4, a._module = null, a._attempt = 0;
function d() {
	if (!window.customElements.get("smart-plants-plant-card")) try {
		window.customElements.define(o, u);
	} catch {}
}
var f = {
	intervalMs: 100,
	timeoutMs: 12e4
};
function p() {
	let e = window.customElements, t = Date.now(), n = setInterval(() => {
		window.customElements !== e && d(), (window.customElements !== e || Date.now() - t > f.timeoutMs) && clearInterval(n);
	}, f.intervalMs);
}
d(), !window.__haScopedRegistryReady && !("CustomElementRegistryPolyfill" in window) && p();
var m = window;
m.customCards = m.customCards ?? [], m.customCards.some((e) => e.type === "smart-plants-plant-card") || m.customCards.push({
	type: o,
	...t(document.documentElement.lang),
	preview: !0,
	documentationURL: "https://github.com/mikekuss/home-assistant-smart-plants/blob/main/docs/dashboard-card.md"
});
export { o as CARD_TYPE, f as REGISTRY_WATCH, u as SmartPlantsPlantCard, d as defineCard };

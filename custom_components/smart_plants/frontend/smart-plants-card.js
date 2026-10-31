//#region src/card/picker.ts
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
//#endregion
//#region src/card/loader.ts
var n, r = "smart-plants-plant-card", i = "smart-plants-plant-card-content", a = "smart-plants-card-full.js";
function o(e) {
	let t = import.meta.url, n = new URL(a, t);
	return n.search = new URL(t).search, e > 0 && n.searchParams.set("retry", String(e)), n.href;
}
var s = class e extends HTMLElement {
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
			type: `custom:${r}`,
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
			t.textContent = `:host { display: block; height: 100%; } ${i} { display: block; height: 100%; } .error { display: block; padding: 16px; color: var(--error-color, #db4437); }`, e.append(t);
		}
		this._loadContent();
	}
	disconnectedCallback() {
		this._retry && clearTimeout(this._retry), this._retry = null;
	}
	_loadContent() {
		this._content || this._retry || e.module().then(() => {
			if (this._content || !this.isConnected || !this.shadowRoot) return;
			let e = document.createElement(i);
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
n = s, n.load = (e) => import(
	/* @vite-ignore */
	o(e)
), n.retryDelayMs = 1e4, n._module = null, n._attempt = 0;
function c() {
	if (!window.customElements.get("smart-plants-plant-card")) try {
		window.customElements.define(r, s);
	} catch {}
}
var l = {
	intervalMs: 100,
	timeoutMs: 12e4
};
function u() {
	let e = window.customElements, t = Date.now(), n = setInterval(() => {
		window.customElements !== e && c(), (window.customElements !== e || Date.now() - t > l.timeoutMs) && clearInterval(n);
	}, l.intervalMs);
}
c(), !window.__haScopedRegistryReady && !("CustomElementRegistryPolyfill" in window) && u();
var d = window;
d.customCards = d.customCards ?? [], d.customCards.some((e) => e.type === "smart-plants-plant-card") || d.customCards.push({
	type: r,
	...t(document.documentElement.lang),
	preview: !0,
	documentationURL: "https://github.com/mikekuss/home-assistant-smart-plants/blob/main/docs/dashboard-card.md"
});
//#endregion
export { r as CARD_TYPE, l as REGISTRY_WATCH, s as SmartPlantsPlantCard, c as defineCard };

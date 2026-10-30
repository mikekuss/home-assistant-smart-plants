//#region src/card/picker.ts
var e = {
	en: {
		name: "Smart Plants plant card",
		description: "One plant with its status, soil moisture, readings and a Watered button."
	},
	de: {
		name: "Smart Plants Pflanzenkarte",
		description: "Eine Pflanze mit Status, Bodenfeuchte, Messwerten und einer Schaltfläche „Gegossen“."
	}
};
function t(t) {
	return e[(t ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en"] ?? e.en;
}
//#endregion
//#region src/card/loader.ts
var n, r = "smart-plants-plant-card", i = "smart-plants-plant-card-content", a = "smart-plants-card-full.js";
function o() {
	let e = import.meta.url, t = new URL(a, e);
	return t.search = new URL(e).search, t.href;
}
var s = class e extends HTMLElement {
	constructor(...e) {
		super(...e), this._config = null, this._content = null;
	}
	static module() {
		return this._module || (this._module = this.load().catch((e) => {
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
			min_columns: 4,
			rows: "auto"
		};
	}
	connectedCallback() {
		if (!this.shadowRoot) {
			let e = this.attachShadow({ mode: "open" }), t = document.createElement("style");
			t.textContent = `:host { display: block; height: 100%; } ${i} { display: block; height: 100%; }`, e.append(t);
		}
		this._content || e.module().then(() => {
			if (this._content || !this.isConnected || !this.shadowRoot) return;
			let e = document.createElement(i);
			this._config && e.setConfig(this._config), e.hass = this._hass, this._content = e, this.shadowRoot.append(e);
		}).catch(() => void 0);
	}
};
n = s, n.load = () => import(
	/* @vite-ignore */
	o()
), n._module = null, customElements.get("smart-plants-plant-card") || customElements.define(r, s);
var c = window;
c.customCards = c.customCards ?? [], c.customCards.some((e) => e.type === "smart-plants-plant-card") || c.customCards.push({
	type: r,
	...t(document.documentElement.lang),
	preview: !0,
	documentationURL: "https://github.com/mikekuss/home-assistant-smart-plants/blob/main/docs/dashboard-card.md"
});
//#endregion
export { r as CARD_TYPE, s as SmartPlantsPlantCard };

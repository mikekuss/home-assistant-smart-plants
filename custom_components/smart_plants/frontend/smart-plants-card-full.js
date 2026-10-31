//#region node_modules/@lit/reactive-element/css-tag.js
/**
* @license
* Copyright 2019 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, l, { is: u, defineProperty: d, getOwnPropertyDescriptor: f, getOwnPropertyNames: ee, getOwnPropertySymbols: p, getPrototypeOf: m } = Object, h = globalThis, g = h.trustedTypes, _ = g ? g.emptyScript : "", te = h.reactiveElementPolyfillSupport, v = (e, t) => e, y = {
	toAttribute(e, t) {
		/**
		* @license
		* Copyright 2017 Google LLC
		* SPDX-License-Identifier: BSD-3-Clause
		*/
		switch (t) {
			case Boolean:
				e = e ? _ : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, ne = (e, t) => !u(e, t), re = {
	attribute: !0,
	type: String,
	converter: y,
	reflect: !1,
	useDefault: !1,
	hasChanged: ne
};
(l = Symbol).metadata ?? (l.metadata = Symbol("metadata")), h.litPropertyMetadata ?? (h.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
var b = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ?? (this.l = [])).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = re) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && d(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = f(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? re;
	}
	static _$Ei() {
		if (this.hasOwnProperty(v("elementProperties"))) return;
		let e = m(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(v("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(v("properties"))) {
			let e = this.properties, t = [...ee(e), ...p(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return s(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? y : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? y : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ?? (n = a.getPropertyOptions(e)), !((n.hasChanged ?? ne)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq && (this._$Eq = this._$Eq.forEach((e) => this._$ET(e, this[e]))), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
b.elementStyles = [], b.shadowRootOptions = { mode: "open" }, b[v("elementProperties")] = /* @__PURE__ */ new Map(), b[v("finalized")] = /* @__PURE__ */ new Map(), te?.({ ReactiveElement: b }), (h.reactiveElementVersions ?? (h.reactiveElementVersions = [])).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
var x = globalThis, ie = (e) => e, S = x.trustedTypes, ae = S ? S.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, oe = "$lit$", C = `lit$${Math.random().toFixed(9).slice(2)}$`, se = "?" + C, ce = `<${se}>`, w = document, T = () => w.createComment(""), E = (e) => e === null || typeof e != "object" && typeof e != "function", le = Array.isArray, ue = (e) => le(e) || typeof e?.[Symbol.iterator] == "function", de = "[ 	\n\f\r]", D = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, fe = /-->/g, pe = />/g, O = RegExp(`>|${de}(?:([^\\s"'>=/]+)(${de}*=${de}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), me = /'/g, he = /"/g, ge = /^(?:script|style|textarea|title)$/i, k = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), A = Symbol.for("lit-noChange"), j = Symbol.for("lit-nothing"), _e = /* @__PURE__ */ new WeakMap(), M = w.createTreeWalker(w, 129);
function ve(e, t) {
	if (!le(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return ae === void 0 ? t : ae.createHTML(t);
}
var ye = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = D;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === D ? c[1] === "!--" ? o = fe : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = O) : (ge.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = O) : o = pe : o === O ? c[0] === ">" ? (o = i ?? D, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? O : c[3] === "\"" ? he : me) : o === he || o === me ? o = O : o === fe || o === pe ? o = D : (o = O, i = void 0);
		let d = o === O && e[t + 1].startsWith("/>") ? " " : "";
		a += o === D ? n + ce : l >= 0 ? (r.push(s), n.slice(0, l) + oe + n.slice(l) + C + d) : n + C + (l === -2 ? t : d);
	}
	return [ve(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, N = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = ye(t, n);
		if (this.el = e.createElement(l, r), M.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = M.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(oe)) {
					let t = u[o++], n = i.getAttribute(e).split(C), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Se : r[1] === "?" ? Ce : r[1] === "@" ? we : F
					}), i.removeAttribute(e);
				} else e.startsWith(C) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ge.test(i.tagName)) {
					let e = i.textContent.split(C), t = e.length - 1;
					if (t > 0) {
						i.textContent = S ? S.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], T()), M.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], T());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === se) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(C, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += C.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = w.createElement("template");
		return n.innerHTML = e, n;
	}
};
function P(e, t, n = e, r) {
	if (t === A) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = E(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ?? (n._$Co = []))[r] = i), i !== void 0 && (t = P(e, i._$AS(e, t.values), i, r)), t;
}
var be = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? w).importNode(t, !0);
		M.currentNode = r;
		let i = M.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new xe(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Te(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = M.nextNode(), a++);
		}
		return M.currentNode = w, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, xe = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = j, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = P(this, e, t), E(e) ? e === j || e == null || e === "" ? (this._$AH !== j && this._$AR(), this._$AH = j) : e !== this._$AH && e !== A && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ue(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== j && E(this._$AH) ? this._$AA.nextSibling.data = e : this.T(w.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = N.createElement(ve(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new be(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = _e.get(e.strings);
		return t === void 0 && _e.set(e.strings, t = new N(e)), t;
	}
	k(t) {
		le(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(T()), this.O(T()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ie(e).nextSibling;
			ie(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, F = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = j, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = j;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = P(this, e, t, 0), a = !E(e) || e !== this._$AH && e !== A, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = P(this, r[n + o], t, o), s === A && (s = this._$AH[o]), a || (a = !E(s) || s !== this._$AH[o]), s === j ? e = j : e !== j && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === j ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Se = class extends F {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === j ? void 0 : e;
	}
}, Ce = class extends F {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== j);
	}
}, we = class extends F {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = P(this, e, t, 0) ?? j) === A) return;
		let n = this._$AH, r = e === j && n !== j || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== j && (n === j || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Te = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		P(this, e);
	}
}, Ee = x.litHtmlPolyfillSupport;
Ee?.(N, xe), (x.litHtmlVersions ?? (x.litHtmlVersions = [])).push("3.3.3");
var De = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new xe(t.insertBefore(T(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, I = globalThis, L = class extends b {
	constructor() {
		/**
		* @license
		* Copyright 2017 Google LLC
		* SPDX-License-Identifier: BSD-3-Clause
		*/
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		var e;
		let t = super.createRenderRoot();
		return (e = this.renderOptions).renderBefore ?? (e.renderBefore = t.firstChild), t;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = De(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return A;
	}
};
L._$litElement$ = !0, L.finalized = !0, I.litElementHydrateSupport?.({ LitElement: L });
var Oe = I.litElementPolyfillSupport;
Oe?.({ LitElement: L }), (I.litElementVersions ?? (I.litElementVersions = [])).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/property.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/ var ke = {
	attribute: !0,
	type: String,
	converter: y,
	reflect: !1,
	hasChanged: ne
}, Ae = (e = ke, t, n) => {
	let { kind: r, metadata: i } = n, a = globalThis.litPropertyMetadata.get(i);
	if (a === void 0 && globalThis.litPropertyMetadata.set(i, a = /* @__PURE__ */ new Map()), r === "setter" && ((e = Object.create(e)).wrapped = !0), a.set(n.name, e), r === "accessor") {
		let { name: r } = n;
		return {
			set(n) {
				let i = t.get.call(this);
				t.set.call(this, n), this.requestUpdate(r, i, e, !0, n);
			},
			init(t) {
				return t !== void 0 && this.C(r, void 0, e, t), t;
			}
		};
	}
	if (r === "setter") {
		let { name: r } = n;
		return function(n) {
			let i = this[r];
			t.call(this, n), this.requestUpdate(r, i, e, !0, n);
		};
	}
	throw Error("Unsupported decorator location: " + r);
};
function R(e) {
	return (t, n) => typeof n == "object" ? Ae(e, t, n) : ((e, t, n) => {
		let r = t.hasOwnProperty(n);
		return t.constructor.createProperty(n, e), r ? Object.getOwnPropertyDescriptor(t, n) : void 0;
	})(e, t, n);
}
//#endregion
//#region node_modules/@lit/reactive-element/decorators/state.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/ function je(e) {
	return R({
		...e,
		state: !0,
		attribute: !1
	});
}
//#endregion
//#region src/translations/de.ts
var Me = {
	"format.percent": "{value} %",
	"format.recorded_date_time": "{datetime} (UTC{offset})",
	"common.cancel": "Abbrechen",
	"common.not_specified": "Nicht angegeben",
	"common.not_supplied": "Nicht angegeben",
	"common.no_species_selected": "Keine Art ausgewählt",
	"common.continue_manually": "Manuell fortfahren",
	"panel.admin_required": "Smart Plants erfordert ein Administratorkonto.",
	"panel.menu": "Menü",
	"panel.back_to_overview": "Zurück zur Übersicht",
	"panel.add_plant": "Pflanze hinzufügen",
	"panel.registry_unavailable": "Sensoren und Bereiche konnten nicht aus Home Assistant geladen werden. Lade die Seite neu, um es erneut zu versuchen; bis dahin kannst du keine Sensoren oder Bereiche zuweisen.",
	"panel.open_created": "Erstellte Pflanze öffnen",
	"panel.busy": "Speichern oder Vorschau wird geladen …",
	"panel.update_available": "Smart Plants wurde aktualisiert. Lade die Seite neu, um die neue Version zu verwenden.",
	"panel.reload": "Neu laden",
	"api_error.unknown": "Etwas ist schiefgelaufen. Prüfe deine Verbindung und versuche es erneut.",
	"api_error.integration_not_loaded": "Smart Plants läuft nicht. Sieh unter Einstellungen → Geräte & Dienste nach und lade diese Seite dann neu.",
	"api_error.unauthorized": "Nur Administratoren können Smart Plants verwenden.",
	"api_error.not_found": "Diese Pflanze oder Art gibt es nicht mehr. Sie wurde vielleicht an anderer Stelle gelöscht.",
	"api_error.revision_conflict": "Diese Pflanze wurde an anderer Stelle geändert. Sieh dir die aktuellen Werte an und speichere deine Änderungen dann erneut.",
	"api_error.provider_disabled": "OpenPlantBook ist nicht verfügbar. Du kannst ohne fortfahren; bereits übernommene Artdaten bleiben erhalten.",
	"api_error.provider_authentication": "OpenPlantBook hat deine Zugangsdaten nicht akzeptiert. Aktualisiere sie unter Einstellungen → Geräte & Dienste oder fahre ohne Art fort.",
	"api_error.provider_rate_limit": "OpenPlantBook erhält gerade zu viele Anfragen. Versuche es später erneut oder fahre ohne fort.",
	"api_error.provider_timeout": "OpenPlantBook hat zu lange nicht geantwortet. Versuche es später erneut oder fahre ohne fort.",
	"api_error.provider_outage": "OpenPlantBook ist gerade nicht erreichbar. Versuche es später erneut oder fahre ohne fort.",
	"api_error.provider_malformed_response": "OpenPlantBook hat eine Antwort geschickt, die Smart Plants nicht lesen kann. Versuche es später erneut oder fahre ohne fort.",
	"api_error.version_mismatch": "Das Smart-Plants-Panel passt nicht zur installierten Version. Starte Home Assistant neu und lade diese Seite dann neu (leere bei Bedarf den Browser-Cache).",
	"api_error.invalid_response": "Smart Plants hat eine unerwartete Antwort erhalten. Lade die Seite neu und versuche es erneut.",
	"api_error.invalid_format": "Einige Angaben konnten nicht gespeichert werden. Prüfe die Felder und versuche es erneut. Wenn du gerade eine Art auswählst, suche sie erneut.",
	"api_error.invalid_image": "Das Foto konnte nicht gespeichert werden. Fotos müssen JPEG, PNG oder WebP sein, höchstens 5 MiB groß und höchstens 2048 × 2048 Pixel.",
	"error.disconnected": "Verbindung getrennt. Lokale Änderungen und Wiederholungen beim Erstellen bleiben erhalten. Stelle die Verbindung vor dem Speichern wieder her.",
	"error.registry_updates": "Registrierungsaktualisierungen nicht verfügbar; stelle die Verbindung wieder her, um native Änderungen erneut zu laden.",
	"error.area_reconnect": "Stelle die Verbindung wieder her, um die aktuellen Home-Assistant-Bereiche zu laden, und wähle dann einen Bereich oder „Kein Bereich“.",
	"error.identity": "Gib einen gültigen Namen und ein gültiges ISO-Datum bzw. eine gültige Uhrzeit für die Anschaffung ein.",
	"error.moisture_reconnect": "Stelle die Verbindung wieder her, um aktuelle Registrierungsdaten zu laden, bevor du Feuchtequellen speicherst.",
	"error.sources_reconnect": "Stelle die Verbindung wieder her, um aktuelle Registrierungsdaten zu laden, bevor du Quellen speicherst.",
	"error.remove_main_sensor": "{name} ist der Hauptsensor. Verwende zuerst einen anderen Sensor als Hauptsensor.",
	"notice.deleted_elsewhere": "Diese Pflanze wurde in einer anderen Sitzung gelöscht.",
	"notice.area_changed_retained": "Der Home-Assistant-Bereich wurde von {from} zu {to} geändert. Deine Bereichsauswahl bleibt erhalten; prüfe sie vor dem Speichern.",
	"notice.area_changed_synced": "Der Home-Assistant-Bereich wurde von {from} zu {to} geändert. Die Bereichsauswahl zeigt jetzt den nativen Bereich.",
	"notice.related_failed": "Zugehörige Automatisierungen konnten nicht geladen werden.",
	"notice.saved": "Gespeichert.",
	"conflict.heading": "Diese Pflanze wurde an anderer Stelle geändert",
	"conflict.revision": "Speichern ist angehalten, damit nichts überschrieben wird. Deine Änderungen bleiben erhalten.",
	"conflict.roles_changed": "Sensoren oder Warnschwellen wurden geändert.",
	"conflict.source_overlap": "Du und die andere Änderung habt beide {fields} bearbeitet. Beim Speichern ersetzen deine Werte die jetzt angezeigten.",
	"conflict.retain": "Meine Änderungen behalten",
	"conflict.discard": "Meine Änderungen verwerfen",
	"conflict.reviewed": "Deine Änderungen bleiben erhalten. Prüfe sie und speichere jeden Bereich erneut.",
	"conflict.reviewed_overlap": "Auch an anderer Stelle geändert: {fields}. Beim Speichern werden diese Werte durch deine ersetzt.",
	"conflict.reviewed_species": "Wenn du gerade eine Art auswählst, suche sie erneut.",
	"conflict_field.name": "Name",
	"conflict_field.acquired_at": "Angeschafft",
	"conflict_field.placement": "Standort",
	"conflict_field.category": "Kategorie",
	"conflict_field.tags": "Tags",
	"conflict_field.species": "Art",
	"conflict_field.image": "Foto",
	"conflict_field.lifecycle_state": "Status",
	"conflict_field.roles": "Sensoren",
	"conflict_field.care_events": "Pflegeverlauf",
	"source_field.sources": "Sensoren",
	"source_field.primary_entity_id": "Hauptsensor",
	"source_field.aggregation": "Kombination der Messwerte",
	"source_field.stale_after_seconds": "Zeit bis „Keine Daten“",
	"list.loading": "Pflanzen werden geladen …",
	"list.count_filtered": "{shown} von {total} Pflanzen",
	"detail.not_found": "Pflanze nicht gefunden – sie wurde möglicherweise in einer anderen Sitzung gelöscht.",
	"detail.sections_label": "Pflanzenbereiche",
	"detail.tab_overview": "Übersicht",
	"detail.name": "Name",
	"detail.acquired": "Angeschafft am (optional)",
	"detail.area_review": "Der native Bereich hat sich geändert. Prüfe den aktuellen und den ausgewählten Bereich, bevor du erneut speicherst.",
	"detail.area_reviewed": "Ich habe die Änderung des nativen Bereichs geprüft",
	"detail.area_use_current": "Aktuellen nativen Bereich verwenden",
	"detail.save_area": "Bereich speichern",
	"area.label": "Home-Assistant-Bereich",
	"area.none": "Kein Bereich",
	"area.missing_option": "{area} (Bereich fehlt – wähle vor dem Speichern einen aktuellen Bereich)",
	"editor.current_value": "{value} (aktueller Wert)",
	"placement.label": "Standort",
	"placement.indoor": "drinnen",
	"placement.outdoor": "draußen",
	"placement.balcony": "Balkon",
	"placement.greenhouse": "Gewächshaus",
	"placement.covered_outdoor": "draußen überdacht",
	"placement.dormant_storage": "Winterquartier",
	"exposure.label": "Sonneneinstrahlung",
	"exposure.full_sun": "volle Sonne",
	"exposure.partial_sun": "Halbschatten",
	"exposure.shade": "Schatten",
	"rain_exposure.label": "Regen",
	"rain_exposure.none": "kein Regen",
	"rain_exposure.partial": "teilweise",
	"rain_exposure.full": "voll",
	"container.label": "Gefäß",
	"container.in_container": "Im Topf",
	"container.in_ground": "Im Boden",
	"taxonomy.category": "Kategorie",
	"taxonomy.tags": "Tags (durch Kommas getrennt)",
	"taxonomy.hint": "Die Einordnung in Smart Plants ist unabhängig von Home-Assistant-Labels.",
	"taxonomy.save": "Kategorie und Tags speichern",
	"species.heading": "Art",
	"species.preview_refresh": "Vorschau der Artaktualisierung",
	"species.provider": "Artanbieter",
	"species.manual": "Manuelle Art",
	"species.common_name": "Deutscher Name",
	"species.scientific_name": "Wissenschaftlicher Name",
	"species.manual_hint": "Speichern ersetzt die Art durch deine eigenen Angaben. Lass beide Namen leer, um die Art zu entfernen.",
	"species.save_manual": "Manuelle Art speichern",
	"species.search": "Art suchen",
	"species.no_matches": "Keine passende Art gefunden. Versuche eine andere Suche oder gib die Art manuell ein.",
	"snapshot.species": "Art",
	"snapshot.provider": "Anbieter",
	"snapshot.reference": "Referenz",
	"snapshot.attribution": "Quellenangabe",
	"snapshot.fetched": "Abgerufen",
	"snapshot.locale": "Sprache",
	"snapshot.status": "Status",
	"snapshot.status_manual": "manuell",
	"snapshot.status_provider": "Anbieter",
	"snapshot.confidence": "Zuverlässigkeit",
	"snapshot.category": "Kategorie",
	"snapshot.imported_defaults": "Importierte Feuchte-Standardwerte",
	"snapshot.default_not_supplied": "Mit — markierte Werte liefert die Art nicht; es gilt der eingebaute Standardwert.",
	"snapshot.care_notes": "Pflegehinweise",
	"snapshot.source_details": "Quellendetails",
	"snapshot.field_attribution": "Quellenangabe je Feld",
	"snapshot.proposed_changes": "Vorgeschlagene Änderungen",
	"snapshot.preview_read_only": "Die Vorschau ist schreibgeschützt. Lokale Überschreibungen bleiben erhalten. Es werden keine externen Bilder geladen.",
	"dialog.delete_title": "{name} löschen?",
	"dialog.delete_body": "Dadurch werden die Pflanze, ihr Pflegeverlauf, ihr Gerät mit allen Entitäten und ihr Foto dauerhaft entfernt. Das kann nicht rückgängig gemacht werden.",
	"dialog.delete_confirm": "Pflanze dauerhaft löschen",
	"dialog.species_title": "Artänderungen prüfen",
	"dialog.preview_invalid": "Die Vorschau ist nicht mehr gültig. Schließe den Dialog und fordere eine neue Vorschau an.",
	"dialog.species_confirm": "Geprüfte Art übernehmen und anwenden",
	"photo.loading": "Foto wird geladen …",
	"photo.load_failed": "Foto konnte nicht geladen werden: {error}",
	"photo.decode_failed": "die heruntergeladene Datei ist kein darstellbares Bild",
	"photo.retry": "Foto erneut laden",
	"photo.alt": "Foto von {name}",
	"photo.none": "Noch kein Foto.",
	"photo.stored": "Lokal gespeichert: {type} · {width} × {height} Pixel",
	"photo.replace": "Foto ändern",
	"photo.upload": "Foto hinzufügen",
	"photo.hint": "JPEG, PNG oder WebP. Große Fotos werden auf 2048 × 2048 Pixel verkleinert. Wird nur in Home Assistant gespeichert.",
	"photo.remove": "Foto entfernen",
	"image_error.type_or_size": "Wähle ein nicht leeres JPEG-, PNG- oder WebP-Bild mit höchstens 5 MiB.",
	"image_error.unreadable": "Dieses Bild konnte nicht gelesen werden. Wähle die Datei erneut aus.",
	"image_error.signature": "Der Bildinhalt passt nicht zum Dateityp JPEG, PNG oder WebP. Wähle ein anderes Bild.",
	"image_error.decode": "Diese Datei konnte nicht als Bild dekodiert werden. Wähle ein anderes JPEG-, PNG- oder WebP-Bild.",
	"image_error.dimensions": "Das Bild darf höchstens 2048 × 2048 Pixel groß sein.",
	"image_error.type_or_input_size": "Wähle ein nicht leeres JPEG-, PNG- oder WebP-Bild mit höchstens 40 MiB.",
	"image_error.too_many_pixels": "Das Bild hat mehr als 64 Megapixel. Wähle ein kleineres Bild.",
	"image_error.resize": "Das Bild konnte für den Upload nicht verkleinert werden. Wähle ein kleineres JPEG-, PNG- oder WebP-Bild.",
	"created.notice": "{name} wurde erstellt.",
	"created.uploading": "Das ausgewählte Foto wird hochgeladen …",
	"created.photo_skipped": "Die Pflanze wurde nach dem Erstellen geändert. Das ursprüngliche Foto aus dem Assistenten wurde nicht hochgeladen. Prüfe das aktuelle Foto in den Pflanzendetails und lade bei Bedarf ausdrücklich ein Foto hoch.",
	"created.photo_uploaded": "Das ausgewählte Foto wurde hochgeladen.",
	"created.photo_failed": "Das ausgewählte Foto wurde nicht hochgeladen. Öffne die erstellte Pflanze, um es erneut hochzuladen.",
	"created.photo_interrupted": "Das Hochladen des Fotos wurde unterbrochen. Öffne die erstellte Pflanze und prüfe ihr Foto, bevor du es erneut versuchst.",
	"moisture.advanced_overrides": "Erweiterte Schwellenwert-Überschreibungen",
	"moisture.incompatible": "Die Daten der Feuchterolle fehlen oder sind nicht kompatibel. Aktualisiere die Seite oder führe ein Update durch, bevor du bearbeitest; Standardwerte werden nicht geraten.",
	"moisture.sources_intro": "Weise bis zu 32 Sensoren zu. Bei mehreren Sensoren wird der Hauptsensor nie automatisch ersetzt. Nicht verfügbare Sensoren können zugewiesen werden.",
	"moisture.add_sensor": "Feuchtesensor hinzufügen",
	"moisture.overrides_intro": "Leere Überschreibungen übernehmen ausdrücklich die Standardwerte. Speichern wendet die vollständige Konfiguration in einem Schritt an.",
	"moisture.override_label": "Überschreibung {key} (%)",
	"moisture.default_effective": "Standard {default} · wirksam {effective}",
	"moisture.inherit_key": "{key} übernehmen",
	"moisture_threshold.min": "Minimum",
	"moisture_threshold.target": "Zielwert",
	"moisture_threshold.max": "Maximum",
	"sources.show_all": "Alle Sensoren anzeigen, auch solche, die nicht passend erscheinen",
	"sources.choose": "Sensor auswählen",
	"sources.candidate": "{name} · {entity_id} · Einheit: {unit} · Klasse: {device_class} · {state}",
	"sources.not_supplied_lower": "nicht angegeben",
	"sources.unavailable_lower": "nicht verfügbar",
	"sources.unavailable": "Nicht verfügbar",
	"sources.assign_unavailable": "Nicht verfügbaren oder nicht registrierten Sensor zuweisen",
	"sources.press_enter": "Drücke die Eingabetaste, um eine Entitäts-ID hinzuzufügen.",
	"sources.own_sensor_refused": "Smart Plants berechnet diesen Sensor aus anderen Sensoren. Gib stattdessen einen davon ein.",
	"sources.primary_suffix": " · Hauptsensor",
	"sources.metadata": "Geräteklasse: {device_class} · Einheit: {unit} · {registration}",
	"sources.registered": "Registriert",
	"sources.not_registered": "Nicht registriert",
	"sources.native_settings": "Native Sensoreinstellungen",
	"sources.remove": "{entity_id} entfernen",
	"sources.open_repairs": "Home-Assistant-Reparaturen öffnen",
	"sources.primary": "Hauptsensor",
	"sources.primary_none": "Keiner",
	"sources.aggregation": "Messwerte kombinieren",
	"sources.stale_after": "Keine Daten nach (Sekunden, 60–604.800)",
	"sources.role_intro": "Weise bis zu 32 Sensoren für {role} zu. Bei mehreren Sensoren wird der Hauptsensor nie automatisch ersetzt. Nicht verfügbare Sensoren können zugewiesen werden.",
	"sources.add_role_sensor": "Sensor für {role} hinzufügen",
	"aggregation.primary": "Nur Hauptsensor",
	"aggregation.average": "Durchschnitt",
	"aggregation.min": "Niedrigster Wert",
	"aggregation.max": "Höchster Wert",
	"source_warning.missing_registered": "Registrierter Sensor fehlt – ersetze ihn oder prüfe die Reparaturen.",
	"source_warning.own_sensor": "Smart Plants berechnet diesen Sensor aus anderen Sensoren. Ersetze ihn durch einen davon.",
	"source_warning.unregistered": "Nicht registriert: Umbenennungen können nicht zuverlässig verfolgt werden",
	"source_warning.unavailable": "Derzeit nicht verfügbar",
	"source_warning.moisture_metadata": "Unerwartete Metadaten: Die Auswertung erfordert einen Zahlenwert von 0–100 %",
	"source_warning.moisture_reading": "Ungültiger Messwert: Die Auswertung erfordert einen Prozentwert von 0 bis 100",
	"source_warning.role_metadata": "Unerwartete Metadaten: Die Auswertung für {role} erfordert die Geräteklasse {device_class} und die Einheit {units}",
	"source_warning.separator": ". ",
	"validation.sources_unique": "Wähle höchstens 32 unterschiedliche Sensorentitäten.",
	"validation.aggregation": "Wähle, wie Messwerte kombiniert werden.",
	"validation.primary": "Der Hauptsensor muss einer der zugewiesenen Sensoren oder „Keiner“ sein.",
	"validation.main_sensor": "Wähle bei „Nur Hauptsensor“ einen Hauptsensor aus.",
	"validation.stale_after": "„Keine Daten nach“ muss eine ganze Zahl von 60 bis 604.800 Sekunden sein.",
	"validation.moisture_thresholds": "Wirksame Feuchte-Schwellenwerte müssen ganze Zahlen sein: 1 ≤ Minimum < Zielwert < Maximum ≤ 99, mit einer Spanne von mindestens 4 %.",
	"validation.taxonomy": "Verwende eine Kategorie mit höchstens 60 Zeichen und höchstens 32 unterschiedliche Tags mit jeweils höchstens 60 Zeichen.",
	"sensors.switch_prompt": "Du hast ungespeicherte Änderungen an den Sensoren für {role}. Wechseln und Änderungen verwerfen?",
	"sensors.edit": "Ändern",
	"sensors.refused": "Die Sensoreinstellungen für {role} fehlen oder sind nicht kompatibel. Aktualisiere die Seite oder führe ein Update durch, bevor du bearbeitest; Standardwerte werden nicht geraten.",
	"sensors.save": "Sensoren für {role} speichern",
	"sensors.saved": "Sensoren für {role} gespeichert.",
	"sensors.summary_unavailable": "Sensoreinstellungen konnten nicht gelesen werden",
	"sensors.summary_empty": "Keine Sensoren",
	"sensors.source_count_one": "{count} Sensor",
	"sensors.source_count_other": "{count} Sensoren",
	"sensors.summary_primary": "Hauptsensor {name}",
	"role.temperature": "Lufttemperatur",
	"role.humidity": "Luftfeuchte",
	"role.illuminance": "Beleuchtungsstärke",
	"role.battery": "Batterie",
	"role.conductivity": "Leitfähigkeit",
	"role.soil_temperature": "Bodentemperatur",
	"role.co2": "CO₂",
	"role_phrase.temperature": "Lufttemperatur",
	"role_phrase.humidity": "Luftfeuchte",
	"role_phrase.illuminance": "Beleuchtungsstärke",
	"role_phrase.battery": "Batterie",
	"role_phrase.conductivity": "Leitfähigkeit",
	"role_phrase.soil_temperature": "Bodentemperatur",
	"role_phrase.co2": "CO₂",
	"care.heading": "Pflegeverlauf",
	"care.watering_count_one": "{count} Gießvorgang.",
	"care.watering_count_other": "{count} Gießvorgänge.",
	"care.last_watered": "Zuletzt gegossen: {date}.",
	"care.never_watered": "Zuletzt gegossen: noch nie.",
	"care.events_label": "Pflegeeinträge der Pflanze",
	"care.empty": "Noch keine Pflege erfasst.",
	"care.loading": "Pflegeverlauf wird geladen, oder aktualisiere die Seite, um es erneut zu versuchen.",
	"care.edit_kind": "{kind} bearbeiten",
	"care.delete_kind": "{kind} löschen",
	"care.record": "Pflege erfassen",
	"care.type": "Pflegeart",
	"care.when": "Wann (deine Ortszeit)",
	"care.note_optional": "Notiz (optional)",
	"care.unit": "Einheit",
	"care.no_amount": "Keine gemessene Menge",
	"care.save_changes": "Pflegeänderungen speichern",
	"care.cancel_editing": "Bearbeitung abbrechen",
	"care.no_irrigation": "Pflegeeinträge steuern nie eine Bewässerung. Nach einer eingetragenen Bewässerung bleibt „Braucht Wasser“ 24 Stunden aus.",
	"care.confirm_delete": "Diesen Eintrag „{kind}“ löschen? Dies kann nicht rückgängig gemacht werden.",
	"care.error_refresh_save": "Aktualisiere den Pflegeverlauf vor dem Speichern. Dein Entwurf bleibt erhalten.",
	"care.error_refresh_delete": "Aktualisiere den Pflegeverlauf vor dem Löschen.",
	"care.error_date": "Wähle ein gültiges lokales Datum mit Uhrzeit, das nicht in der Zukunft liegt.",
	"care.error_note_length": "Notizen dürfen höchstens 500 Zeichen lang sein.",
	"care.error_amount": "Gib eine positive Menge bis 100.000 mit Einheit ein.",
	"care.error_note_text": "Gib eine Notiz mit 1 bis 1000 Zeichen ein.",
	"care.error_details_length": "Pflegedetails dürfen höchstens 120 Zeichen lang sein.",
	"care_kind.watering": "Gießen",
	"care_kind.fertilizing": "Düngen",
	"care_kind.pruning": "Rückschnitt",
	"care_kind.repotting": "Umtopfen",
	"care_kind.note": "Notiz",
	"care_kind.task": "Pflegeaufgabe",
	"care_kind_phrase.watering": "Gießen",
	"care_kind_phrase.fertilizing": "Düngen",
	"care_kind_phrase.pruning": "Rückschnitt",
	"care_kind_phrase.repotting": "Umtopfen",
	"care_kind_phrase.note": "Notiz",
	"care_kind_phrase.task": "Pflegeaufgabe",
	"care_field.product": "Produkt",
	"care_field.amount": "Menge",
	"care_field.unit": "Einheit (g oder mL)",
	"care_field.part": "Pflanzenteil",
	"care_field.container": "Gefäß",
	"care_field.medium": "Substrat",
	"care_field.text": "Notiztext",
	"care_field.note": "Notiz",
	"automations.heading": "Automatisierungen",
	"section.overall_health": "Gesamtzustand",
	"section.overall_health_unavailable": "Der Gesamtzustand ist nicht verfügbar.",
	"section.overall_health_unavailable_detail": "Der Gesamtzustand ist nicht verfügbar – keine konfigurierte Rolle liefert derzeit einen gültigen Wert.",
	"section.overall_health_available_summary": "{score} von 100",
	"section.overall_health_confidence": "Zuverlässigkeit",
	"section.overall_health_included_roles": "Berücksichtigte Rollen",
	"section.overall_health_none_contributing": "Derzeit trägt keine Rolle zum Gesamtwert bei.",
	"section.overall_health_configured_unavailable": "Konfiguriert, aber nicht verfügbar",
	"section.overall_health_all_included": "Keine – jede konfigurierte Rolle ist derzeit berücksichtigt.",
	"section.confidence_label_high": "hoch",
	"section.confidence_label_medium": "mittel",
	"section.confidence_label_low": "niedrig",
	"section.confidence_label_unknown": "unbekannt",
	"section.confidence_high": "jede konfigurierte Rolle ist derzeit verfügbar.",
	"section.confidence_medium": "mindestens die Hälfte der konfigurierten Rollen ist derzeit verfügbar.",
	"section.confidence_low": "weniger als die Hälfte der konfigurierten Rollen ist derzeit verfügbar.",
	"section.confidence_unknown": "für diese Pflanze sind noch keine Rollen konfiguriert.",
	"section.confidence_other": "keine weiteren Details verfügbar.",
	"section.health_contributor.moisture": "Bodenfeuchte",
	"section.health_contributor.temperature": "Temperatur",
	"section.health_contributor.humidity": "Luftfeuchte",
	"section.health_contributor.illuminance": "Beleuchtungsstärke",
	"section.health_contributor.battery": "Batterie",
	"section.health_contributor.conductivity": "Leitfähigkeit",
	"section.health_contributor.soil_temperature": "Bodentemperatur",
	"section.health_contributor.co2": "CO2",
	"section.advanced_diagnostics": "Problemprüfungen",
	"section.advanced_diagnostics_description": "Aktueller Zustand jeder Prüfung mit den verwendeten Grenzwerten. Die Grenzwerte änderst du unter Einstellungen, Weitere Zielwerte.",
	"section.advanced_diagnostics_zero_active": "Keine aktiven Probleme.",
	"section.advanced_diagnostics_one_active": "{count} aktives Problem.",
	"section.advanced_diagnostics_many_active": "{count} aktive Probleme.",
	"section.advanced_diagnostics_status_problem": "Problem erkannt",
	"section.advanced_diagnostics_status_ok": "kein Problem",
	"section.advanced_diagnostics_status_unavailable": "nicht verfügbar",
	"section.advanced_diagnostics_status_not_configured": "nicht konfiguriert",
	"section.advanced_diagnostics_switch_prompt": "Ungespeicherte Änderungen im Editor für {current}. Verwerfen und zum Editor für {pending} wechseln?",
	"section.advanced_diagnostics_switch_discard": "Verwerfen und wechseln",
	"section.advanced_diagnostics_switch_keep": "Weiter bearbeiten",
	"section.advanced_diagnostics_cancel_edit": "Abbrechen",
	"section.advanced_diagnostics_edit_thresholds": "Schwellenwerte bearbeiten",
	"section.effective_thresholds_label": "Wirksame Schwellenwerte für {label}",
	"problem_reason.battery_ok": "Batterie über der unteren Schwelle",
	"problem_reason.battery_stale": "seit einer Weile keine Batteriemeldung",
	"problem_reason.battery_unavailable": "Batteriemesswert nicht verfügbar",
	"problem_reason.co2_ok": "CO2 im Sollbereich",
	"problem_reason.co2_stale": "seit einer Weile kein neuer CO₂-Wert",
	"problem_reason.co2_stress": "CO2 zu hoch",
	"problem_reason.co2_unavailable": "CO2-Messwert nicht verfügbar",
	"problem_reason.cold_stress": "zu kalt",
	"problem_reason.conductivity_ok": "Leitfähigkeit im Sollbereich",
	"problem_reason.conductivity_stale": "seit einer Weile kein neuer Düngergehalt",
	"problem_reason.conductivity_unavailable": "Leitfähigkeitsmesswert nicht verfügbar",
	"problem_reason.damp_stress": "Luft zu feucht",
	"problem_reason.dry_stress": "Luft zu trocken",
	"problem_reason.enough_light": "genug Tageslicht",
	"problem_reason.high_conductivity_stress": "Leitfähigkeit zu hoch",
	"problem_reason.hot_stress": "zu heiß",
	"problem_reason.humidity_ok": "Luftfeuchte im Sollbereich",
	"problem_reason.humidity_stale": "seit einer Weile kein neuer Luftfeuchtewert",
	"problem_reason.humidity_unavailable": "Luftfeuchtemesswert nicht verfügbar",
	"problem_reason.illuminance_stale": "seit einer Weile kein neuer Lichtwert",
	"problem_reason.illuminance_unavailable": "Messwert der Beleuchtungsstärke nicht verfügbar",
	"problem_reason.insufficient_daytime_samples": "noch nicht genug Messwerte bei Tageslicht",
	"problem_reason.low_battery": "Batterie niedrig",
	"problem_reason.low_conductivity_stress": "Leitfähigkeit zu niedrig",
	"problem_reason.low_light": "zu wenig Tageslicht",
	"problem_reason.nighttime": "Nacht; Licht wird nicht bewertet",
	"problem_reason.soil_temperature_ok": "Bodentemperatur im Sollbereich",
	"problem_reason.soil_temperature_stale": "seit einer Weile kein neuer Bodentemperaturwert",
	"problem_reason.soil_temperature_unavailable": "Bodentemperaturmesswert nicht verfügbar",
	"problem_reason.temperature_ok": "Temperatur im Sollbereich",
	"problem_reason.temperature_stale": "seit einer Weile kein neuer Temperaturwert",
	"problem_reason.temperature_unavailable": "Temperaturmesswert nicht verfügbar",
	"problem.temperature_stress": "Temperaturstress",
	"problem.humidity_stress": "Luftfeuchtestress",
	"problem.soil_temperature_stress": "Bodentemperaturstress",
	"problem.co2_stress": "CO2-Stress",
	"problem.low_light": "Zu wenig Licht",
	"problem.low_battery": "Batterie niedrig",
	"problem.conductivity_stress": "Leitfähigkeitsstress",
	"problem_phrase.temperature_stress": "Temperaturstress",
	"problem_phrase.humidity_stress": "Luftfeuchtestress",
	"problem_phrase.soil_temperature_stress": "Bodentemperaturstress",
	"problem_phrase.co2_stress": "CO2-Stress",
	"problem_phrase.low_light": "zu wenig Licht",
	"problem_phrase.low_battery": "Batterie niedrig",
	"problem_phrase.conductivity_stress": "Leitfähigkeitsstress",
	"threshold_label.cold_threshold": "Kälte-Auslöser",
	"threshold_label.cold_clear": "Kälte-Aufhebung",
	"threshold_label.hot_clear": "Hitze-Aufhebung",
	"threshold_label.hot_threshold": "Hitze-Auslöser",
	"threshold_label.dry_threshold": "Trocken-Auslöser",
	"threshold_label.dry_clear": "Trocken-Aufhebung",
	"threshold_label.damp_clear": "Feucht-Aufhebung",
	"threshold_label.damp_threshold": "Feucht-Auslöser",
	"threshold_label.high_threshold": "Hoch-Auslöser",
	"threshold_label.high_clear": "Hoch-Aufhebung",
	"threshold_label.low_threshold": "Niedrig-Auslöser",
	"threshold_label.low_clear": "Niedrig-Aufhebung",
	"threshold_label.target": "Zielwert",
	"threshold_label.clear": "Aufhebung",
	"threshold_field.cold_trigger": "Kälte-Auslöser ({unit})",
	"threshold_field.cold_clear": "Kälte-Aufhebung ({unit})",
	"threshold_field.hot_clear": "Hitze-Aufhebung ({unit})",
	"threshold_field.hot_trigger": "Hitze-Auslöser ({unit})",
	"threshold_field.dry_trigger": "Trocken-Auslöser ({unit})",
	"threshold_field.dry_clear": "Trocken-Aufhebung ({unit})",
	"threshold_field.damp_clear": "Feucht-Aufhebung ({unit})",
	"threshold_field.damp_trigger": "Feucht-Auslöser ({unit})",
	"threshold_field.low_trigger": "Niedrig-Auslöser ({unit})",
	"threshold_field.low_clear": "Niedrig-Aufhebung ({unit})",
	"threshold_field.high_clear": "Hoch-Aufhebung ({unit})",
	"threshold_field.high_trigger": "Hoch-Auslöser ({unit})",
	"threshold_field.target": "Zielwert ({unit})",
	"threshold_field.clear": "Aufhebung ({unit})",
	"threshold.default_effective": "Standard {default} {unit} · wirksam {effective} {unit}",
	"threshold.inherit": "Übernehmen",
	"threshold.inherit_all": "Alle integrierten Standardwerte übernehmen",
	"threshold.save": "Schwellenwerte speichern",
	"threshold.group_label": "Schwellenwerte für {label}",
	"threshold_intro.temperature_stress": "Lass ein Feld leer, um den Standardwert zu verwenden, oder gib einen Wert nur für diese Pflanze ein. Jede Warnung schaltet sich beim Auslöser ein und bei der Aufhebung wieder aus. Die Aufhebung liegt etwas innerhalb des Auslösers, damit die Warnung nicht ständig an- und ausgeht.",
	"threshold_intro.humidity_stress": "Lass ein Feld leer, um den Standardwert zu verwenden, oder gib einen Wert nur für diese Pflanze ein. Jede Warnung schaltet sich beim Auslöser ein und bei der Aufhebung wieder aus. Die Aufhebung liegt etwas innerhalb des Auslösers, damit die Warnung nicht ständig an- und ausgeht.",
	"threshold_intro.conductivity_stress": "Lass ein Feld leer, um den Standardwert zu verwenden, oder gib einen Wert nur für diese Pflanze ein. Jede Warnung schaltet sich beim Auslöser ein und bei der Aufhebung wieder aus. Die Aufhebung liegt etwas innerhalb des Auslösers, damit die Warnung nicht ständig an- und ausgeht.",
	"threshold_intro.co2_stress": "Lass ein Feld leer, um den Standardwert zu verwenden, oder gib einen Wert nur für diese Pflanze ein. Jede Warnung schaltet sich beim Auslöser ein und bei der Aufhebung wieder aus. Die Aufhebung liegt etwas innerhalb des Auslösers, damit die Warnung nicht ständig an- und ausgeht.",
	"threshold_intro.soil_temperature_stress": "Lass ein Feld leer, um den Standardwert zu verwenden, oder gib einen Wert nur für diese Pflanze ein. Jede Warnung schaltet sich beim Auslöser ein und bei der Aufhebung wieder aus. Die Aufhebung liegt etwas innerhalb des Auslösers, damit die Warnung nicht ständig an- und ausgeht.",
	"threshold_intro.low_battery": "Lass ein Feld leer, um den Standardwert zu verwenden, oder gib einen Wert nur für diese Pflanze ein. Jede Warnung schaltet sich beim Auslöser ein und bei der Aufhebung wieder aus. Die Aufhebung liegt etwas innerhalb des Auslösers, damit die Warnung nicht ständig an- und ausgeht.",
	"threshold_intro.low_light": "Lass ein Feld leer, um den Standardwert zu verwenden, oder gib einen Wert nur für diese Pflanze ein. Die Warnung schaltet sich ein, wenn das Licht unter dem Zielwert bleibt, und wieder aus, sobald es die Aufhebung erreicht. Die Aufhebung liegt etwas über dem Zielwert, damit die Warnung nicht ständig an- und ausgeht.",
	"threshold_saved.temperature_stress": "Schwellenwerte für Temperaturstress gespeichert.",
	"threshold_saved.humidity_stress": "Schwellenwerte für Luftfeuchtestress gespeichert.",
	"threshold_saved.conductivity_stress": "Schwellenwerte für Leitfähigkeitsstress gespeichert.",
	"threshold_saved.co2_stress": "Schwellenwerte für CO2-Stress gespeichert.",
	"threshold_saved.soil_temperature_stress": "Schwellenwerte für Bodentemperaturstress gespeichert.",
	"threshold_saved.low_battery": "Schwellenwerte für „Batterie niedrig“ gespeichert.",
	"threshold_saved.low_light": "Schwellenwerte für „Zu wenig Licht“ gespeichert.",
	"threshold_error.temperature_stress": "Prüfe die Werte: Sie müssen von Kälte-Auslöser über Kälte-Aufhebung und Hitze-Aufhebung bis Hitze-Auslöser ansteigen. Jede Aufhebung muss mindestens 0,5 °C von ihrem Auslöser entfernt sein, die beiden Aufhebungen mindestens 1,0 °C auseinander, und alle Werte zwischen −40,0 und 80,0 °C liegen.",
	"threshold_error.humidity_stress": "Prüfe die Werte: Sie müssen von Trocken-Auslöser über Trocken-Aufhebung und Feucht-Aufhebung bis Feucht-Auslöser ansteigen. Jede Aufhebung muss mindestens 1,0 % von ihrem Auslöser entfernt sein, die beiden Aufhebungen mindestens 5,0 % auseinander, und alle Werte zwischen 0,0 und 100,0 % liegen.",
	"threshold_error.conductivity_stress": "Prüfe die Werte: Sie müssen von Niedrig-Auslöser über Niedrig-Aufhebung und Hoch-Aufhebung bis Hoch-Auslöser ansteigen. Jede Aufhebung muss mindestens 10,0 µS/cm von ihrem Auslöser entfernt sein, die beiden Aufhebungen mindestens 50,0 µS/cm auseinander, und alle Werte zwischen 0,0 und 10.000,0 µS/cm liegen.",
	"threshold_error.co2_stress": "Prüfe die Werte: Die Hoch-Aufhebung muss mindestens 100 ppm unter dem Hoch-Auslöser liegen. Beide müssen ganze Zahlen zwischen 0 und 10.000 ppm sein.",
	"threshold_error.soil_temperature_stress": "Prüfe die Werte: Sie müssen von Kälte-Auslöser über Kälte-Aufhebung und Hitze-Aufhebung bis Hitze-Auslöser ansteigen. Jede Aufhebung muss mindestens 0,5 °C von ihrem Auslöser entfernt sein, die beiden Aufhebungen mindestens 1,0 °C auseinander, und alle Werte zwischen −20,0 und 60,0 °C liegen.",
	"threshold_error.low_battery": "Prüfe die Werte: Die Niedrig-Aufhebung muss mindestens 1 % über dem Niedrig-Auslöser liegen. Beide müssen ganze Zahlen zwischen 0 und 100 % sein.",
	"threshold_error.low_light": "Prüfe die Werte: Die Aufhebung muss mindestens 10,0 lx über dem Zielwert liegen. Beide müssen zwischen 0,0 und 200.000,0 lx liegen.",
	"wizard.step_plant": "Pflanze",
	"wizard.step_sensors": "Sensoren",
	"wizard.step_review": "Prüfen",
	"wizard.step_of": "Schritt {step} von {total} · {name}",
	"wizard.plant_heading": "Benenne deine Pflanze",
	"wizard.plant_intro": "Nur der Name ist erforderlich. Alles andere kannst du später ändern.",
	"wizard.plant_name": "Pflanzenname",
	"wizard.area": "Bereich",
	"wizard.no_area": "Kein Bereich",
	"wizard.area_helper": "Das Pflanzengerät wird diesem Bereich zugeordnet. Sensoren aus demselben Bereich werden im nächsten Schritt vorgeschlagen.",
	"wizard.photo_add": "Foto hinzufügen",
	"wizard.photo_optional": "(optional)",
	"wizard.photo_label": "Foto hinzufügen (optional)",
	"wizard.photo_hint": "Bild hierher ziehen oder Datei auswählen · JPEG, PNG oder WebP, große Fotos werden verkleinert",
	"wizard.photo_checking": "Foto wird geprüft …",
	"wizard.photo_pending": "Wird beim Erstellen der Pflanze hochgeladen",
	"wizard.photo_remove": "Entfernen",
	"wizard.photo_remove_label": "Foto entfernen",
	"wizard.photo_change": "Ändern",
	"wizard.photo_change_label": "Anderes Foto auswählen",
	"wizard.sensors_heading": "Sensoren auswählen",
	"wizard.sensors_intro": "Ein Bodenfeuchtesensor sorgt für Gießhinweise. Weitere Sensoren kannst du jetzt oder später hinzufügen.",
	"wizard.moisture_sensor": "Bodenfeuchtesensor",
	"wizard.role_sensor": "Sensor für {role}",
	"wizard.discard_role": "Keinen Sensor für {role} hinzufügen",
	"wizard.choose_sensor": "Sensor auswählen",
	"wizard.search_sensors": "Sensoren suchen …",
	"wizard.no_suitable_sensors": "Keine passenden Sensoren gefunden",
	"wizard.group_in_area": "In {area}",
	"wizard.group_other": "Andere Bereiche",
	"wizard.sensor_reading": "{role} · aktuell {value}",
	"wizard.sensor_unavailable": "nicht verfügbar",
	"wizard.remove_sensor": "{name} entfernen",
	"wizard.suggested": "Vorschläge aus {area}",
	"wizard.no_suggestions": "Keine weiteren Sensoren in {area} gefunden.",
	"wizard.add": "Hinzufügen",
	"wizard.add_label": "{name} hinzufügen",
	"wizard.add_another": "Weiteren Sensor hinzufügen",
	"wizard.add_another_hint": "Licht, Batterie, Düngergehalt, CO₂ und mehr",
	"wizard.review_heading": "Prüfen und erstellen",
	"wizard.review_intro": "Gespeichert wird erst, wenn du „Pflanze erstellen“ auswählst.",
	"wizard.with_photo": "mit Foto",
	"wizard.no_moisture": "Kein Bodenfeuchtesensor",
	"wizard.no_other_sensors": "Keine weiteren Sensoren",
	"wizard.edit": "Bearbeiten",
	"wizard.edit_plant": "Pflanze bearbeiten",
	"wizard.edit_sensors": "Sensoren bearbeiten",
	"wizard.no_moisture_warning": "Ohne Bodenfeuchtesensor gibt es keine Gießhinweise. Du kannst später einen hinzufügen.",
	"wizard.species_section": "Art und Gießziele",
	"wizard.species_summary_default": "Optional · Standardwerte: braucht Wasser unter {min}, zu nass über {max}",
	"wizard.species_summary_manual": "{species} · braucht Wasser unter {min}, zu nass über {max}",
	"wizard.species_summary_accepted": "{species} · Zielwerte von OpenPlantBook",
	"wizard.species_search": "OpenPlantBook durchsuchen",
	"wizard.search_button": "Suchen",
	"wizard.search_hint": "Mindestens 3 Zeichen",
	"wizard.results": "Suchergebnisse",
	"wizard.no_matches": "Keine Treffer. Versuche eine andere Suche oder gib selbst einen Namen ein.",
	"wizard.accept_species": "Ich habe diese Artinformationen geprüft und übernehme sie",
	"wizard.remove_species": "Diese Art nicht verwenden",
	"wizard.manual_species": "Oder gib selbst einen Namen ein",
	"wizard.provider_unavailable_title": "Die Artsuche braucht OpenPlantBook.",
	"wizard.provider_unavailable_body": "Trage deine OpenPlantBook-Client-ID in den Optionen der Smart-Plants-Integration ein. Du kannst die Pflanze auch ohne Art hinzufügen.",
	"wizard.open_options": "Integrationsoptionen öffnen",
	"wizard.openplantbook_credentials_link": "OpenPlantBook-API-Zugangsdaten abrufen",
	"wizard.targets_label": "Bodenfeuchte-Zielwerte",
	"wizard.target_min": "Braucht Wasser unter",
	"wizard.target_ideal": "Ideal",
	"wizard.target_max": "Zu nass über",
	"wizard.targets_default": "Standardwerte von Smart Plants. Eine Art kann passendere Werte vorschlagen.",
	"wizard.targets_species": "Von OpenPlantBook übernommen. Ändere einen Wert, um ihn für diese Pflanze zu überschreiben.",
	"wizard.targets_reset": "Auf Standardwerte zurücksetzen",
	"wizard.details_section": "Weitere Details",
	"wizard.details_summary": "Optional · Anschaffungsdatum, drinnen oder draußen, Kategorie, Tags",
	"wizard.acquired_date": "Anschaffungsdatum",
	"wizard.tags": "Tags",
	"wizard.tags_hint": "Tags mit Kommas trennen",
	"wizard.back": "Zurück",
	"wizard.next": "Weiter",
	"wizard.skip": "Vorerst überspringen",
	"wizard.create": "Pflanze erstellen",
	"wizard.retry_create": "Dieselbe Erstellungsanfrage wiederholen",
	"wizard.retry_draft": "Entwurf erneut starten",
	"wizard.final_request_retained": "Die abschließende Anfrage bleibt unverändert erhalten. Wiederhole sie, um ein unsicheres Ergebnis sicher aufzulösen, auch nach einer neuen Verbindung. Starte keinen neuen Entwurf, bevor das Ergebnis geklärt ist.",
	"wizard.rejected": "Der Server hat die Anfrage als ungültig oder abgelaufen abgelehnt. Du kannst sie mit einem neuen Entwurf korrigieren; Artdaten müssen erneut angezeigt und übernommen werden.",
	"wizard.start_fresh": "Neuen Entwurf starten und Eingaben behalten",
	"wizard.working": "Wird bearbeitet …",
	"wizard.open_plant": "Pflanze öffnen",
	"wizard.done_heading": "{name} ist bereit",
	"wizard.done_body_area": "Die Pflanze ist jetzt ein Gerät in {area}. Ihre Messwerte und Hinweise erscheinen innerhalb einer Minute hier und in Home Assistant.",
	"wizard.done_body": "Die Pflanze ist jetzt ein Gerät in Home Assistant. Ihre Messwerte und Hinweise erscheinen innerhalb einer Minute hier und in Home Assistant.",
	"wizard.back_to_plants": "Zurück zu den Pflanzen",
	"wizard.add_another_plant": "Weitere Pflanze hinzufügen",
	"wizard.error_code": "{code}: Anfrage fehlgeschlagen. Prüfe die Eingaben oder versuche es erneut, sobald eine Verbindung besteht. Die Art kann manuell eingegeben werden; abgelaufene Vorschauen müssen erneut geprüft werden.",
	"wizard.error_generic": "Anfrage fehlgeschlagen. Versuche es erneut, sobald eine Verbindung besteht.",
	"wizard.error_name": "Gib einen Pflanzennamen ein.",
	"wizard.error_name_length": "Gib einen Pflanzennamen ein (1–200 Zeichen).",
	"wizard.error_acquired": "Gib ein gültiges Anschaffungsdatum ein.",
	"wizard.error_area": "Der ausgewählte Home-Assistant-Bereich existiert nicht mehr. Wähle einen aktuellen Bereich oder „Kein Bereich“.",
	"wizard.error_accept_preview": "Prüfe die ausgewählte Art und übernimm sie ausdrücklich, oder verwende sie nicht.",
	"wizard.error_targets": "Prüfe die Gießziele: ganze Zahlen von 1 bis 99, „Braucht Wasser unter“ kleiner als „Ideal“ kleiner als „Zu nass über“, mindestens 4 % Abstand.",
	"plant_status.needs_water": "Braucht Wasser",
	"plant_status.too_wet": "Zu nass",
	"plant_status.problem": "Problem",
	"plant_status.stale": "Keine aktuellen Daten",
	"plant_status.no_sensors": "Keine Sensoren",
	"plant_status.no_moisture": "Kein Feuchtesensor",
	"plant_status.no_main_sensor": "Kein Hauptsensor",
	"plant_status.healthy": "Gesund",
	"plant_status.paused": "Pausiert",
	"plant_status.more": "+{count}",
	"plant_status.more_label": "und {count} weitere",
	"reading.moisture": "Bodenfeuchte",
	"reading.temperature": "Temperatur",
	"reading.humidity": "Luftfeuchte",
	"reading.illuminance": "Licht",
	"reading.conductivity": "Düngergehalt",
	"reading.soil_temperature": "Bodentemperatur",
	"reading.co2": "CO₂",
	"reading.battery": "Batterie",
	"reading.no_value": "Kein Wert",
	"reading.outside_target": "außerhalb des Zielbereichs {range}",
	"reading.not_updating": "wird nicht aktualisiert",
	"range.between": "{min}–{max}",
	"range.at_least": "Mindestens {value}",
	"range.at_most": "Höchstens {value}",
	"range.low_below": "Niedrig unter {value}",
	"moisture_bar.dry": "Trocken",
	"moisture_bar.wet": "Nass",
	"moisture_bar.target": "Ziel {range}",
	"moisture_bar.label": "Bodenfeuchte {value}, Zielbereich {range}",
	"moisture_bar.label_no_range": "Bodenfeuchte {value}",
	"moisture_bar.label_no_value": "Bodenfeuchte hat keinen aktuellen Wert",
	"moisture_bar.last_update": "Letzte Aktualisierung {age}",
	"overview.status_unavailable": "Pflanzenstatus ist nicht verfügbar: {error}",
	"overview.filter_label": "Nach Status filtern",
	"overview.tile_all": "Alle Pflanzen",
	"overview.tile_water": "Braucht Wasser",
	"overview.tile_problems": "Probleme",
	"overview.tile_sensors": "Sensorprobleme",
	"overview.search": "Pflanzen suchen",
	"overview.sort_button": "Sortierung: {sort}",
	"overview.sort_attention": "Handlungsbedarf zuerst",
	"overview.sort_name": "Name",
	"overview.sort_area": "Nach Bereich gruppieren",
	"overview.clear_filter": "Filter zurücksetzen",
	"overview.no_area": "Kein Bereich",
	"overview.empty_heading": "Noch keine Pflanzen",
	"overview.empty_body": "Füge eine Pflanze hinzu, wähle die Sensoren, die du schon in Home Assistant hast, und Smart Plants sagt dir, wenn sie Wasser braucht oder etwas nicht stimmt.",
	"overview.how_it_works": "So funktioniert es",
	"overview.no_match_heading": "Keine passenden Pflanzen",
	"overview.no_match_filter": "Gerade nichts in „{filter}“.",
	"overview.no_match_query": "Keine Pflanze passt zu „{query}“.",
	"overview.show_all": "Alle Pflanzen anzeigen",
	"overview.integration_options": "Integrationsoptionen",
	"overview.menu_notifications": "Benachrichtigungen…",
	"overview.documentation": "Dokumentation",
	"card.no_sensors": "Noch keine Sensoren zugewiesen",
	"card.assign": "Zuweisen",
	"card.assign_label": "Sensoren für {name} zuweisen",
	"card.watered": "Zuletzt gegossen: {age}",
	"card.watered_just_now": "Gerade gegossen",
	"card.never_watered": "Noch nicht gegossen",
	"card.log_watering": "Gegossen",
	"card.log_watering_label": "Gießen für {name} eintragen",
	"watering.logged": "Gießen für {name} eingetragen",
	"watering.undo": "Rückgängig",
	"watering.removed": "Gießen für {name} entfernt",
	"problem_kind.too_cold": "Zu kalt",
	"problem_kind.too_hot": "Zu warm",
	"problem_kind.too_dry": "Luft zu trocken",
	"problem_kind.too_humid": "Luft zu feucht",
	"problem_kind.low_light": "Zu wenig Licht",
	"problem_kind.low_conductivity": "Braucht Dünger",
	"problem_kind.high_conductivity": "Zu viel Dünger",
	"problem_kind.high_co2": "CO₂ zu hoch",
	"problem_kind.battery_low": "Batterie schwach",
	"problem_kind.soil_too_cold": "Boden zu kalt",
	"problem_kind.soil_too_hot": "Boden zu warm",
	"reason.below_min": "{role} {value} liegt unter dem Minimum von {limit}",
	"reason.above_max": "{role} {value} liegt über dem Maximum von {limit}",
	"reason.turns_off_at": "{role} {value}, Warnung schaltet sich bei {limit} aus",
	"reason.low_light": "Licht {value}, braucht mindestens {limit}",
	"reason.battery_low": "Sensorbatterie bei {value}",
	"reason.stale": "{role}: letzte Messung {age}",
	"reason.not_reporting": "{role}: Sensor meldet keine Werte",
	"reason.no_main_sensor": "{role}: kein Hauptsensor gewählt",
	"reason.no_sensors": "Weise einen Bodenfeuchte-Sensor zu, um Gießhinweise zu erhalten",
	"reason.outside_target": "{role} liegt außerhalb des Zielbereichs",
	"detail.back": "Zurück",
	"detail.tab_sensors": "Sensoren",
	"detail.tab_care": "Pflege",
	"detail.tab_settings": "Einstellungen",
	"detail.no_species": "Keine Art",
	"detail.reason_healthy": "Alle Messwerte liegen im Zielbereich.",
	"detail.reason_paused": "Die Überwachung ist pausiert.",
	"detail.log_care": "Pflege eintragen",
	"detail.key_readings": "Wichtige Messwerte",
	"detail.menu_open_device": "Gerät öffnen",
	"detail.menu_download": "Diagnose herunterladen",
	"reading_state.ok": "Im Bereich",
	"reading_state.low": "Zu niedrig",
	"reading_state.high": "Zu hoch",
	"reading_state.stale": "Keine Daten · {age}",
	"reading_state.stale_no_age": "Keine Daten",
	"reading_state.unavailable": "Kein Wert",
	"sensor.missing": "Fehlender Sensor",
	"readings.heading": "Messwerte",
	"readings.manage": "Sensoren verwalten",
	"readings.empty": "Keine Sensoren zugewiesen. Wähle einen Bodenfeuchtesensor, um Gießhinweise zu erhalten.",
	"readings.paused": "Die Überwachung ist pausiert, daher gibt es keine aktuellen Messwerte.",
	"readings.assign": "Sensoren zuweisen",
	"recent.heading": "Letzte Pflege",
	"recent.show_all": "Alle anzeigen",
	"history.heading": "Verlauf",
	"history.open_native": "In Home Assistant öffnen",
	"history.role_label": "Messwert",
	"history.range_label": "Zeitraum",
	"history.range_24h": "24 Std.",
	"history.range_7d": "7 Tage",
	"history.range_30d": "30 Tage",
	"history.range_1y": "1 Jahr",
	"history.period_24h": "letzte 24 Stunden",
	"history.period_7d": "letzte 7 Tage",
	"history.period_30d": "letzte 30 Tage",
	"history.period_1y": "letztes Jahr",
	"history.loading": "Verlauf wird geladen …",
	"history.empty": "Home Assistant hat für diesen Zeitraum noch keine Werte aufgezeichnet.",
	"history.unavailable": "Der Verlauf ist nicht verfügbar, weil der Recorder von Home Assistant nicht läuft.",
	"history.error": "Der Verlauf konnte nicht geladen werden.",
	"history.retry": "Erneut versuchen",
	"history.summary": "{role}, {period}: von {first} auf {last}, niedrigster Wert {low}, höchster Wert {high}",
	"history.summary_empty": "{role}, {period}: keine aufgezeichneten Werte",
	"history.legend_target": "Ziel: {range}",
	"history.legend_spread": "Niedrigster bis höchster Wert",
	"history.legend_watering": "Gießen eingetragen",
	"history.legend_fertilizing": "Düngen eingetragen",
	"history.point_label": "Zeitpunkt",
	"history.point": "{time}: {value}",
	"history.point_spread": "{time}: {value} ({min}–{max})",
	"history.log_watering_at": "Gießen zu diesem Zeitpunkt eintragen",
	"history.rate": "Sinkt um etwa {rate} pro Tag.",
	"history.rate_since_watering": "Sinkt seit dem letzten Gießen um etwa {rate} pro Tag.",
	"history.forecast_one": "Bei diesem Tempo ist das Minimum von {limit} in etwa {count} Tag erreicht.",
	"history.forecast_other": "Bei diesem Tempo ist das Minimum von {limit} in etwa {count} Tagen erreicht.",
	"history.forecast_soon": "Bei diesem Tempo ist das Minimum von {limit} in weniger als einem Tag erreicht.",
	"care_done.watering": "Gegossen",
	"care_done.fertilizing": "Gedüngt",
	"care_done.pruning": "Geschnitten",
	"care_done.repotting": "Umgetopft",
	"care_done.note": "Notiz",
	"care_done.task": "Pflegeaufgabe erledigt",
	"about.heading": "Über diese Pflanze",
	"about.edit": "Pflanzendetails bearbeiten",
	"about.species": "Art",
	"about.species_provider": "Von {provider}",
	"about.species_manual": "Von dir eingetragen",
	"about.add_species": "Art hinzufügen",
	"about.area": "Bereich",
	"about.placement": "Standort",
	"about.since": "Seit",
	"about.category": "Kategorie",
	"about.tags": "Tags",
	"about.add_details": "Details hinzufügen",
	"automations.body": "Wähle im Automatisierungseditor Smart-Plants-Auslöser wie „Pflanze braucht Wasser“ oder richte Benachrichtigungen über das ⋮-Menü der Pflanzenübersicht ein.",
	"automations.open_device": "Gerät öffnen",
	"automations.create": "Automatisierung erstellen",
	"automations.last_ran": "Zuletzt ausgeführt {time}",
	"automations.never_ran": "Noch nie ausgeführt",
	"automations.yaml": "In YAML definiert",
	"automations.off": "Aus",
	"automations.unavailable": "Nicht verfügbar",
	"automations.show_all": "Alle anzeigen ({count})",
	"automations.all_plants": "Für alle Pflanzen",
	"automations.not_listed": "Automatisierungen, die nur ein Template, den Bereich der Pflanze oder einen ihr zugewiesenen Sensor verwenden, werden nicht aufgeführt.",
	"stale_alert.title": "{name} hat zuletzt {age} gemeldet.",
	"stale_alert.title_no_age": "{name} meldet keine Werte.",
	"stale_alert.body": "Prüfe Batterie oder Verbindung des Sensors. Gießhinweise ruhen, bis er wieder Werte meldet.",
	"assigned.heading": "Zugewiesene Sensoren",
	"assigned.empty": "Noch keine Sensoren.",
	"assigned.updated": "aktualisiert {age}",
	"assigned.not_found": "in Home Assistant nicht gefunden",
	"assigned.main": "Hauptsensor",
	"assigned.own_sensor": "Sensor von Smart Plants, ersetze ihn",
	"assigned.menu": "Optionen für {name}",
	"assigned.change": "Sensoren für {role} ändern",
	"assigned.make_main": "Als Hauptsensor verwenden",
	"assigned.remove": "Von der Pflanze entfernen",
	"assigned.add": "Sensor hinzufügen",
	"assigned.available": "Verfügbar: {roles}",
	"assigned.all_assigned": "Jeder Messwert hat einen Sensor.",
	"sensors.edit_heading": "Sensoren für {role}",
	"sensors.save_moisture": "Bodenfeuchtesensoren speichern",
	"sensors.summary_stale": "keine Daten nach {duration}",
	"combine.heading": "Mehrere Sensoren für einen Messwert",
	"combine.secondary": "Durchschnitt, niedrigsten oder höchsten Wert verwenden, wenn mehrere Sensoren zugewiesen sind",
	"combine.intro": "Lege fest, welcher Wert zählt, wenn ein Messwert mehrere Sensoren hat, und nach welcher Zeit ohne Aktualisierung ein Sensor als ohne Daten gilt.",
	"combine.edit_label": "Kombination der Sensoren für {role} ändern",
	"duration.hours": "{count} Std.",
	"duration.minutes": "{count} Min.",
	"duration.seconds": "{count} Sek.",
	"troubleshooting.heading": "Fehlerbehebung",
	"troubleshooting.secondary": "Technische Details, Entitäts-IDs und Diagnose für Fehlerberichte",
	"troubleshooting.entities_heading": "Sensor-Entitäten",
	"troubleshooting.plant_id": "Pflanzen-ID",
	"troubleshooting.device_id": "Geräte-ID",
	"troubleshooting.moisture_heading": "Auswertung der Bodenfeuchte",
	"troubleshooting.moisture_value": "Kombinierte Feuchte",
	"troubleshooting.moisture_health": "Feuchte-Gesundheitswert",
	"troubleshooting.reasons": "Gründe",
	"troubleshooting.no_evaluation": "Derzeit ist keine Auswertung verfügbar.",
	"troubleshooting.download_heading": "Diagnosedatei",
	"troubleshooting.download_hint": "Eine JSON-Datei mit Konfiguration, Sensor-Entitäts-IDs und aktueller Auswertung dieser Pflanze für Fehlerberichte. Sie enthält weder Name, Notizen, Foto noch Zugangsdaten.",
	"care.filter_label": "Pflegeeinträge filtern",
	"care.filter_all": "Alle",
	"care.filter_notes": "Notizen",
	"care.filter_empty": "Noch keine Einträge dieser Art.",
	"care.close_form": "Formular schließen",
	"care.event_menu": "Optionen für {kind} am {date}",
	"settings.plant_heading": "Pflanze",
	"settings.name": "Name",
	"settings.rename": "Umbenennen",
	"settings.save_name": "Name speichern",
	"settings.close": "Schließen",
	"settings.area": "Bereich",
	"settings.area_value": "{area} · legt auch den Bereich des Geräts fest",
	"settings.change_area": "Bereich ändern",
	"settings.photo": "Foto",
	"settings.species": "Art",
	"settings.species_provider": "{provider}, abgerufen am {date}",
	"settings.species_none": "Keine. Eine Art kann Zielwerte für die Pflege vorschlagen.",
	"settings.find_species": "Art suchen",
	"settings.change_species": "Art ändern",
	"targets.heading": "Zielwerte Bodenfeuchte",
	"targets.from_species": "Außerhalb dieses Bereichs gibt es Hinweise. Die Werte stammen von der Art, solange du sie nicht änderst.",
	"targets.from_defaults": "Außerhalb dieses Bereichs gibt es Hinweise. Es gelten die Standardwerte von Smart Plants, solange du sie nicht änderst.",
	"targets.custom_species": "Außerhalb dieses Bereichs gibt es Hinweise. Du hast eigene Werte festgelegt; „Auf Standard zurücksetzen“ verwendet wieder die Werte der Art.",
	"targets.custom_defaults": "Außerhalb dieses Bereichs gibt es Hinweise. Du hast eigene Werte festgelegt; „Auf Standard zurücksetzen“ verwendet wieder die Standardwerte von Smart Plants.",
	"targets.needs_water": "Braucht Wasser unter",
	"targets.ideal": "Ideal",
	"targets.too_wet": "Zu nass über",
	"targets.default_hint": "Standard {value}",
	"targets.custom_hint": "Eigener Wert · Standard {value}",
	"targets.reset": "Auf Standard zurücksetzen",
	"targets.save": "Zielwerte speichern",
	"other_targets.heading": "Weitere Zielwerte",
	"other_targets.secondary": "Temperatur, Luftfeuchte, Licht, Düngerstand und Batterie",
	"other_targets.intro": "Jede Prüfung hat eigene Grenzwerte. Ändere sie nur für diese Pflanze; leere Felder verwenden die eingebauten Standardwerte.",
	"other_targets.none": "Weise einen Temperatur-, Luftfeuchte-, Licht-, Dünger-, CO₂- oder Batteriesensor zu, um seine Zielwerte festzulegen.",
	"more_details.heading": "Weitere Details",
	"more_details.secondary": "Standort, Anschaffungsdatum, Kategorie und Tags",
	"more_details.save_identity": "Standort und Datum speichern",
	"manage.heading": "Verwalten",
	"manage.pause": "Überwachung pausieren",
	"manage.pause_hint": "Behält die Pflanze und ihren Verlauf, stoppt Hinweise und Messwerte",
	"manage.pause_button": "Pausieren",
	"manage.resume": "Überwachung fortsetzen",
	"manage.resume_hint": "Startet Hinweise und Messwerte wieder",
	"manage.resume_button": "Fortsetzen",
	"manage.delete": "Pflanze löschen",
	"manage.delete_hint": "Entfernt die Pflanze, ihr Gerät, die Entitäten und den Pflegeverlauf",
	"manage.delete_button": "Löschen",
	"care_task_type.fertilize": "Düngen",
	"care_task_type.prune": "Schneiden",
	"care_task_type.repot": "Umtopfen",
	"care_task_type.pests": "Auf Schädlinge prüfen",
	"care_task_type.winter_protection": "Winterschutz",
	"care_task_type.custom": "Eigene Aufgabe",
	"care_plan.heading": "Pflegeplan",
	"care_plan.add_task": "Aufgabe hinzufügen",
	"care_plan.full": "Eine Pflanze kann höchstens 20 Pflegeaufgaben haben.",
	"care_plan.tasks_label": "Pflegeaufgaben",
	"care_plan.empty": "Lass dich ans Düngen, Umtopfen und mehr erinnern.",
	"care_plan.last_done": "Zuletzt: {date}",
	"care_plan.never_done": "Noch nicht erledigt",
	"care_plan.done": "Erledigt",
	"care_plan.done_label": "{name} als erledigt markieren",
	"care_plan.task_menu": "Optionen für {name}",
	"care_plan.menu_mark_done": "Als erledigt markieren …",
	"care_plan.menu_skip": "Diesmal überspringen",
	"care_plan.menu_edit": "Bearbeiten",
	"care_plan.menu_automate": "Automatisieren …",
	"care_plan.menu_delete": "Löschen",
	"care_plan.month_range": "{start}–{end}",
	"care_plan.schedule_yearly": "Einmal im Jahr, {months}",
	"care_plan.every_days_one": "Jeden Tag",
	"care_plan.every_days_other": "Alle {count} Tage",
	"care_plan.every_weeks_one": "Jede Woche",
	"care_plan.every_weeks_other": "Alle {count} Wochen",
	"care_plan.every_months_one": "Jeden Monat",
	"care_plan.every_months_other": "Alle {count} Monate",
	"care_plan.every_years_one": "Jedes Jahr",
	"care_plan.every_years_other": "Alle {count} Jahre",
	"care_plan.schedule_growing_only": "{every} · nur in der Wachstumszeit",
	"care_plan.overdue_one": "1 Tag überfällig",
	"care_plan.overdue_other": "{count} Tage überfällig",
	"care_plan.due_today": "Heute fällig",
	"care_plan.due_until": "Fällig bis {date}",
	"care_plan.resting_until": "Ruht bis {date}",
	"care_plan.done_this_year": "Für dieses Jahr erledigt",
	"care_plan.skipped_this_year": "Dieses Jahr übersprungen",
	"care_plan.missed_this_year": "Dieses Jahr verpasst",
	"care_plan.from_date": "Ab {date}",
	"care_plan.tomorrow": "Morgen",
	"care_plan.in_days_one": "In 1 Tag",
	"care_plan.in_days_other": "In {count} Tagen",
	"care_plan.in_weeks_one": "In 1 Woche",
	"care_plan.in_weeks_other": "In {count} Wochen",
	"care_plan.in_months_one": "In 1 Monat",
	"care_plan.in_months_other": "In {count} Monaten",
	"care_plan.error_name_required": "Gib einen Namen für diese Aufgabe ein.",
	"care_plan.error_name_length": "Verwende höchstens 60 Zeichen.",
	"care_plan.error_months": "Wähle mindestens einen Monat.",
	"care_plan.error_every": "Gib eine ganze Zahl von 1 bis 999 ein.",
	"care_plan.error_instructions_length": "Verwende höchstens 4.000 Zeichen.",
	"care_plan.error_last_done": "Gib ein gültiges Datum ein.",
	"care_plan.error_last_done_future": "Das Datum darf nicht in der Zukunft liegen.",
	"care_plan.error_task_gone": "Diese Aufgabe gibt es nicht mehr. Sie wurde vielleicht an anderer Stelle gelöscht.",
	"care_plan.summary_pick_months": "Einmal im Jahr · wähle die Monate",
	"care_plan.summary_enter_interval": "Wiederkehrend · gib an, wie oft",
	"care_plan.add_title": "Pflegeaufgabe hinzufügen",
	"care_plan.edit_title": "Pflegeaufgabe bearbeiten",
	"care_plan.add_intro": "Woran möchtest du erinnert werden?",
	"care_plan.suggestions_for": "Vorschläge für",
	"care_plan.suggestion_source": "OpenPlantBook · {topic}",
	"care_plan.note_fertilization": "Düngen",
	"care_plan.note_pruning": "Schneiden",
	"care_plan.suggestion_add": "Aufgabe „{name}“ hinzufügen",
	"care_plan.show_more": "Mehr anzeigen",
	"care_plan.show_less": "Weniger anzeigen",
	"care_plan.from_scratch": "Oder ohne Vorlage beginnen",
	"care_plan.empty_suggestions": "OpenPlantBook hat Pflegeinformationen für diese Art. Sie erscheinen als Vorschläge, wenn du eine Aufgabe hinzufügst.",
	"care_plan.note_hint": "OpenPlantBook hat einen Pflegehinweis dazu",
	"care_plan.note_use": "Als Anleitung übernehmen",
	"care_plan.note_applied": "Von OpenPlantBook. Bearbeite den Text, um ihn anzupassen.",
	"care_plan.preset_exists": "Schon im Pflegeplan",
	"care_plan.preset_custom": "Eigener Name und eigener Zeitplan",
	"care_plan.name": "Name",
	"care_plan.name_optional": "Name (optional)",
	"care_plan.when_due": "Wann ist sie fällig?",
	"care_plan.mode_interval": "Wiederkehrend",
	"care_plan.mode_yearly": "Einmal im Jahr",
	"care_plan.every": "Alle",
	"care_plan.unit": "Einheit",
	"care_plan.unit_days": "Tage",
	"care_plan.unit_weeks": "Wochen",
	"care_plan.unit_months": "Monate",
	"care_plan.unit_years": "Jahre",
	"care_plan.growing_only": "Nur in der Wachstumszeit",
	"care_plan.growing_only_hint": "Wartet während der Ruhezeit ({months}).",
	"care_plan.months": "Monate",
	"care_plan.months_hint": "Wähle den ersten Monat, dann den letzten.",
	"care_plan.instructions": "Anleitung (optional)",
	"care_plan.instructions_placeholder": "Was zu tun ist, wird bei der Aufgabe angezeigt",
	"care_plan.more_options": "Weitere Optionen",
	"care_plan.last_done_field": "Zuletzt erledigt",
	"care_plan.last_done_hint": "Optional. Ohne Datum ist eine wiederkehrende Aufgabe sofort fällig.",
	"care_plan.delete": "Löschen",
	"care_plan.back": "Zurück",
	"care_plan.save": "Speichern",
	"care_plan.close": "Schließen",
	"care_plan.confirm_delete": "Pflegeaufgabe {name} löschen? Ihre Entitäten werden entfernt, und Automationen, die sie verwenden, funktionieren nicht mehr. Ihre Einträge im Pflegeverlauf bleiben erhalten.",
	"care_plan.added_toast": "{name} zum Pflegeplan hinzugefügt",
	"care_plan.saved_toast": "{name} gespeichert",
	"care_plan.done_toast": "{name} als erledigt markiert",
	"care_plan.skipped_toast": "{name} diesmal übersprungen",
	"care_plan.deleted_toast": "{name} gelöscht",
	"care_plan.undo": "Rückgängig",
	"care_plan.form_marks_done": "Markiert {name} als erledigt.",
	"care_plan.form_also_marks": "Markiert auch {name} als erledigt.",
	"care_plan.automate_title": "„{name}“ automatisieren",
	"care_plan.automate_intro": "Verwende diese Entitäten in jeder Automation, zum Beispiel für eine Benachrichtigung auf deinem Handy.",
	"care_plan.automate_due": "An, solange {name} fällig ist",
	"care_plan.automate_next": "Nächster Fälligkeitstermin",
	"care_plan.automate_next_disabled": "Standardmäßig deaktiviert. Aktiviere sie auf der Geräteseite der Pflanze, um sie zu verwenden.",
	"care_plan.automate_care_due": "An, solange eine Pflegeaufgabe dieser Pflanze fällig ist",
	"care_plan.automate_missing": "Entität noch nicht gefunden. Lade die Seite gleich neu.",
	"care_plan.automate_action_before": "Markiere die Aufgabe von überall als erledigt, mit der Aktion ",
	"care_plan.automate_action_after": ", zum Beispiel über einen NFC-Tag oder eine Dashboard-Schaltfläche.",
	"care_plan.open_automation_editor": "Automatisierungseditor öffnen",
	"care_plan.copy": "{entity} kopieren",
	"care_plan.copied": "{entity} kopiert",
	"care_plan.copy_failed": "Kopieren fehlgeschlagen. Markiere die Entitäts-ID und kopiere sie selbst.",
	"care_plan.line_more": "{names} +{count}",
	"care_plan.plan_menu": "Optionen für den Pflegeplan",
	"care_plan.rest_set": "Ruhezeit festlegen",
	"care_plan.rest_edit": "Ruhezeit bearbeiten",
	"care_plan.rest_period": "Ruhezeit",
	"care_plan.rest_months_label": "Ruhemonate: {months}",
	"care_plan.edit": "Bearbeiten",
	"care_plan.growing_season": "Wachstumszeit",
	"care_plan.rest_all_running": "alle Aufgaben laufen weiter",
	"care_plan.rest_tasks_off_one": "1 Aufgabe ruht während der Ruhezeit",
	"care_plan.rest_tasks_off_other": "{count} Aufgaben ruhen während der Ruhezeit",
	"care_plan.rest_tasks_off_now_one": "1 Aufgabe ruht",
	"care_plan.rest_tasks_off_now_other": "{count} Aufgaben ruhen",
	"care_plan.rest_intro": "Optional. Viele Freiland- und Mittelmeerpflanzen wachsen im Winter kaum und brauchen dann keinen Dünger. Die meisten Zimmerpflanzen brauchen keine Ruhezeit.",
	"care_plan.rest_watering": "Gießwarnungen sind davon nicht betroffen.",
	"care_plan.rest_months": "Ruhemonate",
	"care_plan.rest_off_heading": "Ruht während der Ruhezeit",
	"care_plan.rest_no_repeating": "Noch keine wiederkehrenden Aufgaben.",
	"care_plan.rest_yearly_note": "Jährliche Aufgaben folgen ihren eigenen Monaten und sind nicht betroffen.",
	"care_plan.rest_remove": "Entfernen",
	"care_plan.rest_error_months": "Wähle die Ruhemonate.",
	"care_plan.rest_error_whole_year": "Eine Ruhezeit kann nicht das ganze Jahr umfassen.",
	"care_plan.rest_saved_toast": "Ruhezeit gespeichert",
	"care_plan.rest_removed_toast": "Ruhezeit entfernt",
	"care_plan.due_chips_label": "Fällige Pflege",
	"care_plan.more_due": "und {count} weitere fällig",
	"care_plan.schedule_reading": "{rule} · {source}",
	"care_plan.condition_below": "Unter {value}",
	"care_plan.condition_above": "Über {value}",
	"care_plan.due_now": "Fällig",
	"care_plan.reading_due": "Fällig · {reading}",
	"care_plan.reading_still_cold": "noch kalt",
	"care_plan.reading_still_warm": "noch warm",
	"care_plan.reading_until_above": "bis über {value}",
	"care_plan.reading_until_below": "bis unter {value}",
	"care_plan.reading_done_on": "Erledigt am {date} · {until}",
	"care_plan.reading_waiting": "Wartet · {until}",
	"care_plan.reading_none": "Kein Messwert",
	"care_plan.reading_below_since": "Unter {value} seit {since} · fällig um {time}",
	"care_plan.reading_above_since": "Über {value} seit {since} · fällig um {time}",
	"care_plan.reading_not_needed": "Nicht nötig · {reading}",
	"care_plan.reading_not_needed_plain": "Nicht nötig",
	"care_plan.error_source": "Wähle einen Sensor.",
	"care_plan.error_value": "Gib eine Zahl ein.",
	"care_plan.error_for_hours": "Gib Stunden von 0 bis 72 in ganzen Minuten ein.",
	"care_plan.error_reset_below": "Gib den Wert oder eine höhere Zahl ein.",
	"care_plan.error_reset_above": "Gib den Wert oder eine niedrigere Zahl ein.",
	"care_plan.summary_pick_source": "Messwert · wähle einen Sensor",
	"care_plan.subject_temperature": "die Temperatur",
	"care_plan.subject_soil_temperature": "die Bodentemperatur",
	"care_plan.subject_humidity": "die Luftfeuchte",
	"care_plan.subject_moisture": "die Bodenfeuchte",
	"care_plan.subject_illuminance": "das Licht",
	"care_plan.subject_conductivity": "der Düngergehalt",
	"care_plan.subject_co2": "der CO₂-Wert",
	"care_plan.summary_below": "Wenn {subject} unter {value} liegt",
	"care_plan.summary_above": "Wenn {subject} über {value} liegt",
	"care_plan.summary_below_enter": "Wenn {subject} unter … liegt · gib einen Wert ein",
	"care_plan.summary_above_enter": "Wenn {subject} über … liegt · gib einen Wert ein",
	"care_plan.summary_for_hours_one": "für 1 Std.",
	"care_plan.summary_for_hours_other": "für {count} Std.",
	"care_plan.summary_again_above": "wieder fällig über {value}",
	"care_plan.summary_again_below": "wieder fällig unter {value}",
	"care_plan.mode_reading": "Messwert",
	"care_plan.reading": "Messwert",
	"care_plan.reading_choose": "Sensor wählen",
	"care_plan.reading_group_plant": "Sensoren dieser Pflanze",
	"care_plan.reading_group_other": "Anderer Sensor",
	"care_plan.reading_other": "Beliebiger anderer Sensor …",
	"care_plan.reading_role_value": "{role} · {value}",
	"care_plan.reading_sensor": "Sensor",
	"care_plan.reading_no_sensors": "Keine Sensoren mit Zahlenwert",
	"care_plan.due_when": "Fällig wenn",
	"care_plan.below": "Unter",
	"care_plan.above": "Über",
	"care_plan.value": "Wert",
	"care_plan.value_placeholder": "z. B. 5",
	"care_plan.min_temp_hint": "OpenPlantBook: mindestens {value}",
	"care_plan.min_temp_use": "Übernehmen",
	"care_plan.min_temp_use_label": "OpenPlantBook-Minimum von {value} übernehmen",
	"care_plan.min_temp_applied": "Aus der Mindesttemperatur von OpenPlantBook.",
	"care_plan.more_options_reading": "Verzögerung, wieder fällig",
	"care_plan.for_hours": "Erst nach (optional)",
	"care_plan.hours": "Std.",
	"care_plan.for_hours_hint": "Fällig, wenn der Messwert so viele Stunden dort bleibt. Nach einem Neustart beginnt die Wartezeit neu.",
	"care_plan.reset_after_above": "Wieder fällig nach über",
	"care_plan.reset_after_below": "Wieder fällig nach unter",
	"care_plan.reset_hint": "Optional. Nach „Erledigt“ wartet die Aufgabe, bis der Messwert diesen Wert erreicht. So gibt ein Messwert, der um den Wert pendelt, nur eine Erinnerung.",
	"care_plan.preset_winter": "Wenn es kalt wird",
	"care_plan.preset_winter_needs_source": "Braucht einen Temperatursensor oder eine Wettervorhersage",
	"care_plan.note_min_temperature": "Mindesttemperatur",
	"care_plan.grows_above": "Wächst ab {value}",
	"care_plan.suggestion_add_winter": "Winterschutz hinzufügen",
	"care_plan.reading_group_forecast": "Wettervorhersage",
	"care_plan.reading_group_forecast_entity": "Wettervorhersage · {name}",
	"care_plan.forecast_row_low": "Tiefsttemperatur · {window}",
	"care_plan.forecast_row_high": "Höchsttemperatur · {window}",
	"care_plan.forecast_window_24": "nächste 24 Std.",
	"care_plan.forecast_window_48": "nächste 2 Tage",
	"care_plan.forecast_window_72": "nächste 3 Tage",
	"care_plan.forecast_window_long_24": "nächsten 24 Stunden",
	"care_plan.forecast_window_long_48": "nächsten 2 Tage",
	"care_plan.forecast_window_long_72": "nächsten 3 Tage",
	"care_plan.subject_forecast_low": "der vorhergesagte Tiefstwert der {window}",
	"care_plan.subject_forecast_high": "der vorhergesagte Höchstwert der {window}",
	"care_plan.forecast_rule_low_below": "Vorhergesagter Tiefstwert unter {value}",
	"care_plan.forecast_rule_low_above": "Vorhergesagter Tiefstwert über {value}",
	"care_plan.forecast_rule_high_below": "Vorhergesagter Höchstwert unter {value}",
	"care_plan.forecast_rule_high_above": "Vorhergesagter Höchstwert über {value}",
	"care_plan.forecast_value": "Vorhersage {value}",
	"care_plan.forecast_none": "Keine Vorhersage",
	"care_plan.forecast_short": "Vorhersage nur bis {time}",
	"care_plan.weather_entity": "Wetter-Entität",
	"care_plan.error_weather_missing": "Wetter-Entität nicht gefunden. Wähle eine andere.",
	"care_plan.error_weather_unit": "Diese Wetter-Entität meldet keine Temperatureinheit. Wähle eine andere.",
	"care_plan.look_ahead": "Vorausschau",
	"care_plan.look_ahead_24": "Nächste 24 Stunden",
	"care_plan.look_ahead_48": "Nächste 2 Tage",
	"care_plan.look_ahead_72": "Nächste 3 Tage",
	"care_plan.look_ahead_hint": "Der Tiefst- oder Höchstwert der Vorhersage gilt für diese Zeit ab jetzt. Kürzere Zeiträume sind verlässlicher. Die Vorhersage wird alle 30 Minuten aktualisiert.",
	"care_plan.more_options_forecast": "Vorausschau, wieder fällig",
	"overview.tile_care": "Pflege fällig",
	"card.care_due": "Pflege: {tasks}",
	"card.care_overdue": "überfällig",
	"snooze.menu": "Hinweise stummschalten…",
	"snooze.menu_change": "Stummschaltung ändern…",
	"snooze.title": "Hinweise für {name} stummschalten",
	"snooze.title_change": "Stummschaltung für {name} ändern",
	"snooze.intro": "Die Entitäten behalten ihren echten Zustand, und die Pflanze zeigt weiter ihren Status. Automationen können das Attribut Stummgeschaltet prüfen, um still zu bleiben. Die Stummschaltung endet von selbst am Ende des gewählten Tages.",
	"snooze.current": "Stummgeschaltet bis {date}",
	"snooze.choices": "Stummschalten für",
	"snooze.preset_1": "1 Tag",
	"snooze.preset_3": "3 Tage",
	"snooze.preset_7": "1 Woche",
	"snooze.preset_14": "2 Wochen",
	"snooze.preset_date": "Bis Datum…",
	"snooze.preset_until": "Bis {date}",
	"snooze.date_label": "Letzter stummgeschalteter Tag",
	"snooze.date_hint": "Nach diesem Tag gibt es wieder Hinweise.",
	"snooze.error_date": "Wähle einen Tag zwischen morgen und heute in einem Jahr.",
	"snooze.confirm": "Stummschalten",
	"snooze.resume": "Fortsetzen",
	"snooze.resume_label": "Hinweise für {name} fortsetzen",
	"snooze.chip": "Stummgeschaltet bis {date}",
	"snooze.menu_all": "Alle Pflanzen stummschalten…",
	"snooze.title_all": "Alle Pflanzen stummschalten",
	"snooze.all_summary_one": "Schaltet {count} Pflanze stumm.",
	"snooze.all_summary_other": "Schaltet {count} Pflanzen stumm.",
	"snooze.all_paused": "Pausierte Pflanzen bleiben außen vor.",
	"snooze.all_kept_one": "{count} Pflanze, die schon länger stummgeschaltet ist, behält ihr Ende.",
	"snooze.all_kept_other": "{count} Pflanzen, die schon länger stummgeschaltet sind, behalten ihr Ende.",
	"snooze.all_none": "Alle Pflanzen sind schon länger stummgeschaltet und behalten ihr Ende.",
	"snooze.resume_all": "Alle fortsetzen",
	"snooze.resume_all_hint_one": "Beendet die Stummschaltung von {count} Pflanze.",
	"snooze.resume_all_hint_other": "Beendet die Stummschaltung von {count} Pflanzen.",
	"snooze.all_done_one": "{count} Pflanze bis {date} stummgeschaltet",
	"snooze.all_done_other": "{count} Pflanzen bis {date} stummgeschaltet",
	"snooze.all_resumed_one": "Hinweise für {count} Pflanze fortgesetzt",
	"snooze.all_resumed_other": "Hinweise für {count} Pflanzen fortgesetzt",
	"snooze.all_unchanged": "Keine Pflanze geändert",
	"snooze.all_undone": "Vorherige Stummschaltungen wiederhergestellt",
	"snooze.undo": "Rückgängig",
	"notifications.title": "Benachrichtigungen",
	"notifications.intro": "Lass dir Nachrichten zu deinen Pflanzen schicken. Du prüfst und speicherst sie im Automatisierungseditor von Home Assistant.",
	"notifications.existing": "Deine Benachrichtigungen",
	"notifications.last_sent": "Zuletzt gesendet {time}",
	"notifications.never_sent": "Noch nicht gesendet",
	"notifications.edit": "Bearbeiten",
	"notifications.edit_label": "{name} bearbeiten",
	"notifications.kind": "Benachrichtigung",
	"notifications.daily": "Täglicher Pflanzenbericht",
	"notifications.daily_help": "Eine Nachricht am Tag, wenn eine Pflanze Wasser braucht, ein Problem hat oder eine Pflegeaufgabe fällig ist.",
	"notifications.daily_time": "Uhrzeit",
	"notifications.water": "Sofort melden, wenn eine Pflanze Wasser braucht",
	"notifications.water_delay": "Nach",
	"notifications.delay_none": "Sofort",
	"notifications.quiet": "Ruhezeit",
	"notifications.quiet_help": "In der Ruhezeit kommen keine Nachrichten. Der tägliche Bericht nennt die Pflanze trotzdem.",
	"notifications.quiet_from": "Von",
	"notifications.quiet_to": "Bis",
	"notifications.plants": "Pflanzen",
	"notifications.plants_all": "Alle Pflanzen",
	"notifications.plants_choose": "Pflanzen auswählen",
	"notifications.error_no_plants": "Wähle mindestens eine Pflanze aus.",
	"notifications.send_to": "Senden an",
	"notifications.group_entities": "Benachrichtigungsentitäten",
	"notifications.group_services": "Benachrichtigungsdienste",
	"notifications.persistent": "Home-Assistant-Benachrichtigung",
	"notifications.open_editor": "Im Automatisierungseditor öffnen",
	"notifications.exists": "Diese Benachrichtigung gibt es schon.",
	"notifications.yaml_help": "Braucht die übliche automations.yaml. Sonst kopiere das YAML aus dem Editor in deine eigenen Dateien.",
	"notifications.editor_fallback": "Der Automatisierungseditor konnte nicht vorausgefüllt werden. Füge den Smart-Plants-Auslöser und eine Benachrichtigungsaktion selbst hinzu.",
	"notifications.alias_daily": "Smart Plants: täglicher Pflanzenbericht",
	"notifications.alias_water": "Smart Plants: Pflanze braucht Wasser",
	"notifications.description_daily": "Erstellt in Smart Plants → Benachrichtigungen. Schickt eine kurze Liste der Pflanzen, die Wasser brauchen, Probleme oder fällige Pflegeaufgaben haben.",
	"notifications.description_water": "Erstellt in Smart Plants → Benachrichtigungen. Schickt eine Nachricht, wenn eine Pflanze seit {delay} Wasser braucht. Stummgeschaltete Pflanzen melden sich, wenn die Stummschaltung endet.",
	"notifications.description_water_now": "Erstellt in Smart Plants → Benachrichtigungen. Schickt eine Nachricht, wenn eine Pflanze Wasser braucht. Stummgeschaltete Pflanzen melden sich, wenn die Stummschaltung endet.",
	"notifications.msg_water_title": "{plant} braucht Wasser",
	"notifications.msg_water_body": "Gieß sie, wenn du dazu kommst.",
	"plant_card.name": "Smart Plants Pflanzenkarte",
	"plant_card.description": "Eine Pflanze mit Status, Bodenfeuchte, Messwerten und einer Schaltfläche „Gegossen“.",
	"plant_card.missing_title": "Pflanze nicht gefunden",
	"plant_card.missing_body": "Die Pflanze dieser Karte wurde entfernt. Bearbeite die Karte und wähle eine andere Pflanze.",
	"plant_card.no_plant": "Wähle im Karteneditor eine Pflanze.",
	"plant_card.care_due": "Pflege fällig",
	"plant_card.paused": "Die Überwachung ist pausiert",
	"plant_card.open_label": "{name} in Smart Plants öffnen",
	"plant_card.details_label": "Details zu {name} anzeigen",
	"plant_card.unauthorized": "Du darfst keine Pflege eintragen",
	"plant_card.load_error": "Die Pflanzenkarte konnte nicht geladen werden. Gleich folgt ein neuer Versuch.",
	"plant_card.log_failed": "Gießen für {name} konnte nicht eingetragen werden",
	"plant_card.undo_failed": "Gießen für {name} konnte nicht entfernt werden",
	"plant_card.editor_plant": "Pflanze",
	"plant_card.editor_show_readings": "Messwerte anzeigen",
	"plant_card.editor_show_readings_help": "Feuchtebalken und Messwert-Chips",
	"plant_card.editor_show_watering": "Schaltfläche „Gegossen“ anzeigen",
	"plant_card.editor_show_watering_help": "Trägt Gießen für diese Pflanze ein"
}, Ne = {
	"format.percent": "{value}%",
	"format.recorded_date_time": "{datetime} (UTC{offset})",
	"common.cancel": "Cancel",
	"common.not_specified": "Not specified",
	"common.not_supplied": "Not supplied",
	"common.no_species_selected": "No species selected",
	"common.continue_manually": "Continue manually",
	"panel.admin_required": "Smart Plants requires an admin account.",
	"panel.menu": "Menu",
	"panel.back_to_overview": "Back to overview",
	"panel.add_plant": "Add plant",
	"panel.registry_unavailable": "Couldn't load sensors and areas from Home Assistant. Reload the page to try again; until then you can't assign sensors or areas.",
	"panel.open_created": "Open created plant",
	"panel.busy": "Saving or loading preview…",
	"panel.update_available": "Smart Plants was updated. Reload the page to use the new version.",
	"panel.reload": "Reload",
	"api_error.unknown": "Something went wrong. Check your connection and try again.",
	"api_error.integration_not_loaded": "Smart Plants isn't running. Check it under Settings → Devices & services, then refresh this page.",
	"api_error.unauthorized": "Only administrators can use Smart Plants.",
	"api_error.not_found": "This plant or species no longer exists. It may have been deleted somewhere else.",
	"api_error.revision_conflict": "This plant was changed somewhere else. Check the latest values, then save your changes again.",
	"api_error.provider_disabled": "OpenPlantBook isn't available. You can continue without it; species data you already added is kept.",
	"api_error.provider_authentication": "OpenPlantBook didn't accept your credentials. Update them in Settings → Devices & services, or continue without a species.",
	"api_error.provider_rate_limit": "OpenPlantBook is getting too many requests. Try again later, or continue without it.",
	"api_error.provider_timeout": "OpenPlantBook took too long to answer. Try again later, or continue without it.",
	"api_error.provider_outage": "OpenPlantBook isn't reachable right now. Try again later, or continue without it.",
	"api_error.provider_malformed_response": "OpenPlantBook sent an answer Smart Plants can't read. Try again later, or continue without it.",
	"api_error.version_mismatch": "The Smart Plants panel doesn't match the installed version. Restart Home Assistant, then reload this page (clear the browser cache if needed).",
	"api_error.invalid_response": "Smart Plants got an unexpected answer. Refresh the page and try again.",
	"api_error.invalid_format": "Some of the details couldn't be saved. Check the fields and try again. If you were choosing a species, search for it again.",
	"api_error.invalid_image": "The photo couldn't be saved. Photos must be JPEG, PNG or WebP, at most 5 MiB and 2048 × 2048 pixels.",
	"error.disconnected": "Disconnected. Local edits and creation retries are retained. Reconnect before saving.",
	"error.registry_updates": "Registry updates unavailable; reconnect to retry native changes.",
	"error.area_reconnect": "Reconnect to load current Home Assistant areas, then choose an area or No area.",
	"error.identity": "Enter a valid name and acquired ISO date/time.",
	"error.moisture_reconnect": "Reconnect to load current registry data before saving moisture sources.",
	"error.sources_reconnect": "Reconnect to load current registry data before saving sources.",
	"error.remove_main_sensor": "{name} is the main sensor. Use another sensor as main sensor first.",
	"notice.deleted_elsewhere": "This plant was deleted in another session.",
	"notice.area_changed_retained": "Home Assistant area changed from {from} to {to}. Your area selection is retained; review it before saving.",
	"notice.area_changed_synced": "Home Assistant area changed from {from} to {to}. The area selector now reflects the native area.",
	"notice.related_failed": "Related automations could not be loaded.",
	"notice.saved": "Saved.",
	"conflict.heading": "This plant was changed somewhere else",
	"conflict.revision": "Saving is paused so nothing gets overwritten. Your edits are kept.",
	"conflict.roles_changed": "Sensors or alert thresholds changed.",
	"conflict.source_overlap": "You and the other change both edited {fields}. If you save, your values replace the ones shown now.",
	"conflict.retain": "Keep my edits",
	"conflict.discard": "Discard my edits",
	"conflict.reviewed": "Your edits are kept. Check them, then save each section again.",
	"conflict.reviewed_overlap": "These also changed elsewhere: {fields}. Saving replaces them with your values.",
	"conflict.reviewed_species": "If you were choosing a species, search for it again.",
	"conflict_field.name": "Name",
	"conflict_field.acquired_at": "Acquired",
	"conflict_field.placement": "Placement",
	"conflict_field.category": "Category",
	"conflict_field.tags": "Tags",
	"conflict_field.species": "Species",
	"conflict_field.image": "Photo",
	"conflict_field.lifecycle_state": "Status",
	"conflict_field.roles": "Sensors",
	"conflict_field.care_events": "Care history",
	"source_field.sources": "sensors",
	"source_field.primary_entity_id": "main sensor",
	"source_field.aggregation": "how readings are combined",
	"source_field.stale_after_seconds": "not-updating time",
	"list.loading": "Loading plants…",
	"list.count_filtered": "{shown} of {total} plants",
	"detail.not_found": "Plant not found — it may have been deleted in another session.",
	"detail.sections_label": "Plant sections",
	"detail.tab_overview": "Overview",
	"detail.name": "Name",
	"detail.acquired": "Date acquired (optional)",
	"detail.area_review": "The native area changed. Review current and selected areas before reapplying.",
	"detail.area_reviewed": "I reviewed the native area change",
	"detail.area_use_current": "Use current native area",
	"detail.save_area": "Save area",
	"area.label": "Home Assistant area",
	"area.none": "No area",
	"area.missing_option": "{area} (missing area — select a current area before saving)",
	"editor.current_value": "{value} (current value)",
	"placement.label": "Placement",
	"placement.indoor": "indoor",
	"placement.outdoor": "outdoor",
	"placement.balcony": "balcony",
	"placement.greenhouse": "greenhouse",
	"placement.covered_outdoor": "covered outdoor",
	"placement.dormant_storage": "dormant storage",
	"exposure.label": "Sun exposure",
	"exposure.full_sun": "full sun",
	"exposure.partial_sun": "partial sun",
	"exposure.shade": "shade",
	"rain_exposure.label": "Rain exposure",
	"rain_exposure.none": "none",
	"rain_exposure.partial": "partial",
	"rain_exposure.full": "full",
	"container.label": "Container",
	"container.in_container": "In a container",
	"container.in_ground": "In the ground",
	"taxonomy.category": "Category",
	"taxonomy.tags": "Tags (comma-separated)",
	"taxonomy.hint": "Smart Plants taxonomy is separate from Home Assistant labels.",
	"taxonomy.save": "Save category and tags",
	"species.heading": "Species",
	"species.preview_refresh": "Preview species refresh",
	"species.provider": "Species provider",
	"species.manual": "Manual species",
	"species.common_name": "Common name",
	"species.scientific_name": "Scientific name",
	"species.manual_hint": "Save replaces the species with user-supplied data. Leave both names blank to clear species.",
	"species.save_manual": "Save manual species",
	"species.search": "Search species",
	"species.no_matches": "No species matches. Try another search or manual entry.",
	"snapshot.species": "Species",
	"snapshot.provider": "Provider",
	"snapshot.reference": "Reference",
	"snapshot.attribution": "Attribution",
	"snapshot.fetched": "Fetched",
	"snapshot.locale": "Locale",
	"snapshot.status": "Status",
	"snapshot.status_manual": "manual",
	"snapshot.status_provider": "provider",
	"snapshot.confidence": "Confidence",
	"snapshot.category": "Category",
	"snapshot.imported_defaults": "Imported moisture defaults",
	"snapshot.default_not_supplied": "Values marked — are not supplied by the species; the built-in default applies.",
	"snapshot.care_notes": "Care notes",
	"snapshot.source_details": "Source details",
	"snapshot.field_attribution": "Field attribution",
	"snapshot.proposed_changes": "Proposed changes",
	"snapshot.preview_read_only": "Preview is read-only. Local overrides are preserved. No remote images are loaded.",
	"dialog.delete_title": "Delete {name}?",
	"dialog.delete_body": "This permanently removes the plant, its care history, its device and entities, and its photo. This can't be undone.",
	"dialog.delete_confirm": "Permanently delete plant",
	"dialog.species_title": "Review species changes",
	"dialog.preview_invalid": "The preview is no longer valid. Close and request a new preview.",
	"dialog.species_confirm": "Accept and apply reviewed species",
	"photo.loading": "Loading photo…",
	"photo.load_failed": "Photo could not be loaded: {error}",
	"photo.retry": "Retry photo",
	"photo.decode_failed": "the downloaded file is not a displayable image",
	"photo.alt": "Photo of {name}",
	"photo.none": "No photo yet.",
	"photo.stored": "Stored locally: {type} · {width} × {height} pixels",
	"photo.replace": "Change photo",
	"photo.upload": "Add photo",
	"photo.hint": "JPEG, PNG or WebP. Large photos are scaled down to 2048 × 2048 pixels. Stored only in Home Assistant.",
	"photo.remove": "Remove photo",
	"image_error.type_or_size": "Choose a nonempty JPEG, PNG or WebP image up to 5 MiB.",
	"image_error.unreadable": "This image could not be read. Select the file again.",
	"image_error.signature": "Image content does not match its JPEG, PNG or WebP file type. Choose another image.",
	"image_error.decode": "This file could not be decoded as an image. Choose another JPEG, PNG or WebP.",
	"image_error.dimensions": "Image dimensions must be at most 2048 × 2048 pixels.",
	"image_error.type_or_input_size": "Choose a nonempty JPEG, PNG or WebP image up to 40 MiB.",
	"image_error.too_many_pixels": "This image has more than 64 megapixels. Choose a smaller image.",
	"image_error.resize": "This image could not be scaled down for upload. Choose a smaller JPEG, PNG or WebP.",
	"created.notice": "{name} created.",
	"created.uploading": "Uploading its selected photo…",
	"created.photo_skipped": "The plant changed after creation. The original wizard photo was not uploaded. Review its current photo in the plant detail and explicitly upload a photo if wanted.",
	"created.photo_uploaded": "Selected photo uploaded.",
	"created.photo_failed": "Selected photo was not uploaded. Open the created plant to upload it again.",
	"created.photo_interrupted": "Photo upload interrupted. Open the created plant to check its photo before retrying.",
	"moisture.advanced_overrides": "Advanced threshold overrides",
	"moisture.incompatible": "Moisture role data is missing or incompatible. Refresh or upgrade before editing; defaults will not be guessed.",
	"moisture.sources_intro": "Assign up to 32 sensors. With several sensors, the main sensor is never replaced automatically. Unavailable sensors can be assigned.",
	"moisture.add_sensor": "Add moisture sensor",
	"moisture.overrides_intro": "Blank overrides explicitly inherit defaults. Save applies the complete configuration atomically.",
	"moisture.override_label": "{key} override (%)",
	"moisture.default_effective": "Default {default} · effective {effective}",
	"moisture.inherit_key": "Inherit {key}",
	"moisture_threshold.min": "min",
	"moisture_threshold.target": "target",
	"moisture_threshold.max": "max",
	"sources.show_all": "Show all sensors, including ones that don't look like a match",
	"sources.choose": "Choose a sensor",
	"sources.candidate": "{name} · {entity_id} · unit: {unit} · class: {device_class} · {state}",
	"sources.not_supplied_lower": "not supplied",
	"sources.unavailable_lower": "unavailable",
	"sources.unavailable": "Unavailable",
	"sources.assign_unavailable": "Assign an unavailable or unregistered sensor",
	"sources.press_enter": "Press Enter to add an entity ID.",
	"sources.own_sensor_refused": "Smart Plants calculates this sensor from other sensors. Enter one of those instead.",
	"sources.primary_suffix": " · Main sensor",
	"sources.metadata": "Device class: {device_class} · Unit: {unit} · {registration}",
	"sources.registered": "Registered",
	"sources.not_registered": "Not in registry",
	"sources.native_settings": "Native sensor settings",
	"sources.remove": "Remove {entity_id}",
	"sources.open_repairs": "Open Home Assistant Repairs",
	"sources.primary": "Main sensor",
	"sources.primary_none": "None",
	"sources.aggregation": "Combine readings",
	"sources.stale_after": "Not updating after (seconds, 60–604800)",
	"sources.role_intro": "Assign up to 32 {role} sensors. With several sensors, the main sensor is never replaced automatically. Unavailable sensors can be assigned.",
	"sources.add_role_sensor": "Add {role} sensor",
	"aggregation.primary": "Main sensor only",
	"aggregation.average": "Average",
	"aggregation.min": "Lowest",
	"aggregation.max": "Highest",
	"source_warning.missing_registered": "Missing registered sensor — replace it or review Repairs.",
	"source_warning.own_sensor": "Smart Plants calculates this sensor from other sensors. Replace it with one of those.",
	"source_warning.unregistered": "Unregistered: renames cannot be followed reliably",
	"source_warning.unavailable": "Currently unavailable",
	"source_warning.moisture_metadata": "Unexpected metadata: evaluation requires numeric 0–100 %",
	"source_warning.moisture_reading": "Invalid reading: evaluation requires a numeric percentage from 0 to 100",
	"source_warning.role_metadata": "Unexpected metadata: {role} evaluation requires device class {device_class} and unit {units}",
	"source_warning.separator": ". ",
	"validation.sources_unique": "Choose at most 32 unique sensor entities.",
	"validation.aggregation": "Choose how to combine readings.",
	"validation.primary": "The main sensor must be one of the assigned sensors or None.",
	"validation.main_sensor": "With Main sensor only, choose a main sensor.",
	"validation.stale_after": "“Not updating after” must be a whole number from 60 to 604800 seconds.",
	"validation.moisture_thresholds": "Effective moisture thresholds must be integers: 1 ≤ min < target < max ≤ 99, with a span of at least 4%.",
	"validation.taxonomy": "Use a category up to 60 characters and at most 32 unique tags up to 60 characters each.",
	"sensors.switch_prompt": "You have unsaved changes to the {role} sensors. Switch and discard them?",
	"sensors.edit": "Change",
	"sensors.refused": "{role} sensor settings are missing or incompatible. Refresh or update before editing; defaults will not be guessed.",
	"sensors.save": "Save {role} sensors",
	"sensors.saved": "{role} sensors saved.",
	"sensors.summary_unavailable": "Sensor settings could not be read",
	"sensors.summary_empty": "No sensors",
	"sensors.source_count_one": "{count} sensor",
	"sensors.source_count_other": "{count} sensors",
	"sensors.summary_primary": "main sensor {name}",
	"role.temperature": "Air temperature",
	"role.humidity": "Air humidity",
	"role.illuminance": "Illuminance",
	"role.battery": "Battery",
	"role.conductivity": "Conductivity",
	"role.soil_temperature": "Soil temperature",
	"role.co2": "CO₂",
	"role_phrase.temperature": "air temperature",
	"role_phrase.humidity": "air humidity",
	"role_phrase.illuminance": "illuminance",
	"role_phrase.battery": "battery",
	"role_phrase.conductivity": "conductivity",
	"role_phrase.soil_temperature": "soil temperature",
	"role_phrase.co2": "CO₂",
	"care.heading": "Care history",
	"care.watering_count_one": "{count} watering event.",
	"care.watering_count_other": "{count} watering events.",
	"care.last_watered": "Last watered: {date}.",
	"care.never_watered": "Last watered: never.",
	"care.events_label": "Plant care events",
	"care.empty": "No care recorded yet.",
	"care.loading": "Loading care history or refresh to retry.",
	"care.edit_kind": "Edit {kind}",
	"care.delete_kind": "Delete {kind}",
	"care.record": "Record care",
	"care.type": "Care type",
	"care.when": "When (your local time)",
	"care.note_optional": "Note (optional)",
	"care.unit": "Unit",
	"care.no_amount": "No measured amount",
	"care.save_changes": "Save care changes",
	"care.cancel_editing": "Cancel editing",
	"care.no_irrigation": "Care records never operate irrigation. After a logged watering, Needs water stays off for 24 hours.",
	"care.confirm_delete": "Delete this {kind} record? This cannot be undone.",
	"care.error_refresh_save": "Refresh care history before saving. Your draft is retained.",
	"care.error_refresh_delete": "Refresh care history before deleting.",
	"care.error_date": "Choose a valid local date and time that is not in the future.",
	"care.error_note_length": "Notes must be at most 500 characters.",
	"care.error_amount": "Enter a positive amount up to 100000 with a unit.",
	"care.error_note_text": "Enter a note of 1 to 1000 characters.",
	"care.error_details_length": "Care details must be at most 120 characters.",
	"care_kind.watering": "Watering",
	"care_kind.fertilizing": "Fertilizing",
	"care_kind.pruning": "Pruning",
	"care_kind.repotting": "Repotting",
	"care_kind.note": "Note",
	"care_kind.task": "Care task",
	"care_kind_phrase.watering": "watering",
	"care_kind_phrase.fertilizing": "fertilizing",
	"care_kind_phrase.pruning": "pruning",
	"care_kind_phrase.repotting": "repotting",
	"care_kind_phrase.note": "note",
	"care_kind_phrase.task": "care task",
	"care_field.product": "Product",
	"care_field.amount": "Amount",
	"care_field.unit": "Unit (g or mL)",
	"care_field.part": "Plant part",
	"care_field.container": "Container",
	"care_field.medium": "Growing medium",
	"care_field.text": "Note text",
	"care_field.note": "Note",
	"automations.heading": "Automations",
	"section.overall_health": "Overall health",
	"section.overall_health_unavailable": "Overall health is unavailable.",
	"section.overall_health_unavailable_detail": "Overall health is unavailable — no configured role is currently reporting a valid value.",
	"section.overall_health_available_summary": "{score} out of 100",
	"section.overall_health_confidence": "Confidence",
	"section.overall_health_included_roles": "Included roles",
	"section.overall_health_none_contributing": "No roles are currently contributing to the composite.",
	"section.overall_health_configured_unavailable": "Configured but unavailable",
	"section.overall_health_all_included": "None — every configured role is currently included.",
	"section.confidence_label_high": "high",
	"section.confidence_label_medium": "medium",
	"section.confidence_label_low": "low",
	"section.confidence_label_unknown": "unknown",
	"section.confidence_high": "every configured role is currently available.",
	"section.confidence_medium": "at least half of the configured roles are currently available.",
	"section.confidence_low": "fewer than half of the configured roles are currently available.",
	"section.confidence_unknown": "no roles are configured for this plant yet.",
	"section.confidence_other": "no additional detail available.",
	"section.health_contributor.moisture": "Moisture",
	"section.health_contributor.temperature": "Temperature",
	"section.health_contributor.humidity": "Humidity",
	"section.health_contributor.illuminance": "Illuminance",
	"section.health_contributor.battery": "Battery",
	"section.health_contributor.conductivity": "Conductivity",
	"section.health_contributor.soil_temperature": "Soil temperature",
	"section.health_contributor.co2": "CO2",
	"section.advanced_diagnostics": "Problem checks",
	"section.advanced_diagnostics_description": "Current state of each check with the limits it uses. Change the limits under Settings, Other targets.",
	"section.advanced_diagnostics_zero_active": "No active problems.",
	"section.advanced_diagnostics_one_active": "{count} active problem.",
	"section.advanced_diagnostics_many_active": "{count} active problems.",
	"section.advanced_diagnostics_status_problem": "problem detected",
	"section.advanced_diagnostics_status_ok": "no problem",
	"section.advanced_diagnostics_status_unavailable": "unavailable",
	"section.advanced_diagnostics_status_not_configured": "not configured",
	"section.advanced_diagnostics_switch_prompt": "Unsaved changes in the {current} editor. Discard them and switch to the {pending} editor?",
	"section.advanced_diagnostics_switch_discard": "Discard and switch",
	"section.advanced_diagnostics_switch_keep": "Keep editing",
	"section.advanced_diagnostics_cancel_edit": "Cancel",
	"section.advanced_diagnostics_edit_thresholds": "Edit thresholds",
	"section.effective_thresholds_label": "{label} effective thresholds",
	"problem_reason.battery_ok": "battery above the low threshold",
	"problem_reason.battery_stale": "no battery update for a while",
	"problem_reason.battery_unavailable": "battery reading unavailable",
	"problem_reason.co2_ok": "CO2 within range",
	"problem_reason.co2_stale": "no CO₂ update for a while",
	"problem_reason.co2_stress": "CO2 too high",
	"problem_reason.co2_unavailable": "CO2 reading unavailable",
	"problem_reason.cold_stress": "too cold",
	"problem_reason.conductivity_ok": "conductivity within range",
	"problem_reason.conductivity_stale": "no fertilizer level update for a while",
	"problem_reason.conductivity_unavailable": "conductivity reading unavailable",
	"problem_reason.damp_stress": "air too damp",
	"problem_reason.dry_stress": "air too dry",
	"problem_reason.enough_light": "enough daytime light",
	"problem_reason.high_conductivity_stress": "conductivity too high",
	"problem_reason.hot_stress": "too hot",
	"problem_reason.humidity_ok": "humidity within range",
	"problem_reason.humidity_stale": "no humidity update for a while",
	"problem_reason.humidity_unavailable": "humidity reading unavailable",
	"problem_reason.illuminance_stale": "no light update for a while",
	"problem_reason.illuminance_unavailable": "illuminance reading unavailable",
	"problem_reason.insufficient_daytime_samples": "not enough daytime readings yet",
	"problem_reason.low_battery": "battery low",
	"problem_reason.low_conductivity_stress": "conductivity too low",
	"problem_reason.low_light": "too little daytime light",
	"problem_reason.nighttime": "night; light is not evaluated",
	"problem_reason.soil_temperature_ok": "soil temperature within range",
	"problem_reason.soil_temperature_stale": "no soil temperature update for a while",
	"problem_reason.soil_temperature_unavailable": "soil temperature reading unavailable",
	"problem_reason.temperature_ok": "temperature within range",
	"problem_reason.temperature_stale": "no temperature update for a while",
	"problem_reason.temperature_unavailable": "temperature reading unavailable",
	"problem.temperature_stress": "Temperature stress",
	"problem.humidity_stress": "Humidity stress",
	"problem.soil_temperature_stress": "Soil temperature stress",
	"problem.co2_stress": "CO2 stress",
	"problem.low_light": "Low light",
	"problem.low_battery": "Low battery",
	"problem.conductivity_stress": "Conductivity stress",
	"problem_phrase.temperature_stress": "temperature stress",
	"problem_phrase.humidity_stress": "humidity stress",
	"problem_phrase.soil_temperature_stress": "soil temperature stress",
	"problem_phrase.co2_stress": "co2 stress",
	"problem_phrase.low_light": "low light",
	"problem_phrase.low_battery": "low battery",
	"problem_phrase.conductivity_stress": "conductivity stress",
	"threshold_label.cold_threshold": "Cold trigger",
	"threshold_label.cold_clear": "Cold clear",
	"threshold_label.hot_clear": "Hot clear",
	"threshold_label.hot_threshold": "Hot trigger",
	"threshold_label.dry_threshold": "Dry trigger",
	"threshold_label.dry_clear": "Dry clear",
	"threshold_label.damp_clear": "Damp clear",
	"threshold_label.damp_threshold": "Damp trigger",
	"threshold_label.high_threshold": "High trigger",
	"threshold_label.high_clear": "High clear",
	"threshold_label.low_threshold": "Low trigger",
	"threshold_label.low_clear": "Low clear",
	"threshold_label.target": "Target",
	"threshold_label.clear": "Clear",
	"threshold_field.cold_trigger": "Cold trigger ({unit})",
	"threshold_field.cold_clear": "Cold clear ({unit})",
	"threshold_field.hot_clear": "Hot clear ({unit})",
	"threshold_field.hot_trigger": "Hot trigger ({unit})",
	"threshold_field.dry_trigger": "Dry trigger ({unit})",
	"threshold_field.dry_clear": "Dry clear ({unit})",
	"threshold_field.damp_clear": "Damp clear ({unit})",
	"threshold_field.damp_trigger": "Damp trigger ({unit})",
	"threshold_field.low_trigger": "Low trigger ({unit})",
	"threshold_field.low_clear": "Low clear ({unit})",
	"threshold_field.high_clear": "High clear ({unit})",
	"threshold_field.high_trigger": "High trigger ({unit})",
	"threshold_field.target": "Target ({unit})",
	"threshold_field.clear": "Clear ({unit})",
	"threshold.default_effective": "Default {default} {unit} · effective {effective} {unit}",
	"threshold.inherit": "Inherit",
	"threshold.inherit_all": "Inherit all built-in defaults",
	"threshold.save": "Save thresholds",
	"threshold.group_label": "{label} thresholds",
	"threshold_intro.temperature_stress": "Leave a field empty to use the default, or enter a value for this plant only. Each alert turns on at its trigger value and turns off at its clear value. The clear value sits a little inside the trigger, so the alert doesn't switch on and off over and over.",
	"threshold_intro.humidity_stress": "Leave a field empty to use the default, or enter a value for this plant only. Each alert turns on at its trigger value and turns off at its clear value. The clear value sits a little inside the trigger, so the alert doesn't switch on and off over and over.",
	"threshold_intro.conductivity_stress": "Leave a field empty to use the default, or enter a value for this plant only. Each alert turns on at its trigger value and turns off at its clear value. The clear value sits a little inside the trigger, so the alert doesn't switch on and off over and over.",
	"threshold_intro.co2_stress": "Leave a field empty to use the default, or enter a value for this plant only. Each alert turns on at its trigger value and turns off at its clear value. The clear value sits a little inside the trigger, so the alert doesn't switch on and off over and over.",
	"threshold_intro.soil_temperature_stress": "Leave a field empty to use the default, or enter a value for this plant only. Each alert turns on at its trigger value and turns off at its clear value. The clear value sits a little inside the trigger, so the alert doesn't switch on and off over and over.",
	"threshold_intro.low_battery": "Leave a field empty to use the default, or enter a value for this plant only. Each alert turns on at its trigger value and turns off at its clear value. The clear value sits a little inside the trigger, so the alert doesn't switch on and off over and over.",
	"threshold_intro.low_light": "Leave a field empty to use the default, or enter a value for this plant only. The alert turns on when light stays below the target and turns off once it reaches the clear value. The clear value sits a little above the target, so the alert doesn't switch on and off over and over.",
	"threshold_saved.temperature_stress": "Temperature stress thresholds saved.",
	"threshold_saved.humidity_stress": "Humidity stress thresholds saved.",
	"threshold_saved.conductivity_stress": "Conductivity stress thresholds saved.",
	"threshold_saved.co2_stress": "CO2 stress thresholds saved.",
	"threshold_saved.soil_temperature_stress": "Soil temperature stress thresholds saved.",
	"threshold_saved.low_battery": "Low battery thresholds saved.",
	"threshold_saved.low_light": "Low light thresholds saved.",
	"threshold_error.temperature_stress": "Check the values: they must go up from Cold trigger to Cold clear to Hot clear to Hot trigger. Each clear value must be at least 0.5 °C from its trigger, the two clear values at least 1.0 °C apart, and all values between −40.0 and 80.0 °C.",
	"threshold_error.humidity_stress": "Check the values: they must go up from Dry trigger to Dry clear to Damp clear to Damp trigger. Each clear value must be at least 1.0 % from its trigger, the two clear values at least 5.0 % apart, and all values between 0.0 and 100.0 %.",
	"threshold_error.conductivity_stress": "Check the values: they must go up from Low trigger to Low clear to High clear to High trigger. Each clear value must be at least 10.0 µS/cm from its trigger, the two clear values at least 50.0 µS/cm apart, and all values between 0.0 and 10000.0 µS/cm.",
	"threshold_error.co2_stress": "Check the values: High clear must be at least 100 ppm below High trigger. Both must be whole numbers between 0 and 10000 ppm.",
	"threshold_error.soil_temperature_stress": "Check the values: they must go up from Cold trigger to Cold clear to Hot clear to Hot trigger. Each clear value must be at least 0.5 °C from its trigger, the two clear values at least 1.0 °C apart, and all values between −20.0 and 60.0 °C.",
	"threshold_error.low_battery": "Check the values: Low clear must be at least 1 % above Low trigger. Both must be whole numbers between 0 and 100 %.",
	"threshold_error.low_light": "Check the values: Clear must be at least 10.0 lx above Target. Both must be between 0.0 and 200000.0 lx.",
	"wizard.step_plant": "Plant",
	"wizard.step_sensors": "Sensors",
	"wizard.step_review": "Review",
	"wizard.step_of": "Step {step} of {total} · {name}",
	"wizard.plant_heading": "Name your plant",
	"wizard.plant_intro": "Only the name is required. You can change everything later.",
	"wizard.plant_name": "Plant name",
	"wizard.area": "Area",
	"wizard.no_area": "No area",
	"wizard.area_helper": "The plant device is placed in this area. Sensors from the same area are suggested next.",
	"wizard.photo_add": "Add a photo",
	"wizard.photo_optional": "(optional)",
	"wizard.photo_label": "Add a photo (optional)",
	"wizard.photo_hint": "Drop an image or choose a file · JPEG, PNG or WebP, large photos are scaled down",
	"wizard.photo_checking": "Checking the photo…",
	"wizard.photo_pending": "Uploaded when you create the plant",
	"wizard.photo_remove": "Remove",
	"wizard.photo_remove_label": "Remove photo",
	"wizard.photo_change": "Change",
	"wizard.photo_change_label": "Choose another photo",
	"wizard.sensors_heading": "Pick sensors",
	"wizard.sensors_intro": "A soil moisture sensor gives watering alerts. Add others now or later.",
	"wizard.moisture_sensor": "Soil moisture sensor",
	"wizard.role_sensor": "{role} sensor",
	"wizard.discard_role": "Don’t add a {role} sensor",
	"wizard.choose_sensor": "Choose a sensor",
	"wizard.search_sensors": "Search sensors…",
	"wizard.no_suitable_sensors": "No suitable sensors found",
	"wizard.group_in_area": "In {area}",
	"wizard.group_other": "Other areas",
	"wizard.sensor_reading": "{role} · now {value}",
	"wizard.sensor_unavailable": "unavailable",
	"wizard.remove_sensor": "Remove {name}",
	"wizard.suggested": "Suggested from {area}",
	"wizard.no_suggestions": "No other sensors found in {area}.",
	"wizard.add": "Add",
	"wizard.add_label": "Add {name}",
	"wizard.add_another": "Add another sensor",
	"wizard.add_another_hint": "Light, battery, fertilizer level, CO₂ and more",
	"wizard.review_heading": "Check and create",
	"wizard.review_intro": "Nothing is saved until you select Create plant.",
	"wizard.with_photo": "with photo",
	"wizard.no_moisture": "No soil moisture sensor",
	"wizard.no_other_sensors": "No other sensors",
	"wizard.edit": "Edit",
	"wizard.edit_plant": "Edit plant",
	"wizard.edit_sensors": "Edit sensors",
	"wizard.no_moisture_warning": "Without a soil moisture sensor there are no watering alerts. You can add one later.",
	"wizard.species_section": "Species and watering targets",
	"wizard.species_summary_default": "Optional · defaults: needs water below {min}, too wet above {max}",
	"wizard.species_summary_manual": "{species} · needs water below {min}, too wet above {max}",
	"wizard.species_summary_accepted": "{species} · targets from OpenPlantBook",
	"wizard.species_search": "Search OpenPlantBook",
	"wizard.search_button": "Search",
	"wizard.search_hint": "At least 3 characters",
	"wizard.results": "Search results",
	"wizard.no_matches": "No matches. Try another search or enter a name yourself.",
	"wizard.accept_species": "I reviewed and accept this species information",
	"wizard.remove_species": "Don’t use this species",
	"wizard.manual_species": "Or enter a name yourself",
	"wizard.provider_unavailable_title": "Species search needs OpenPlantBook.",
	"wizard.provider_unavailable_body": "Add your OpenPlantBook client ID in the Smart Plants integration options. You can add the plant without a species.",
	"wizard.open_options": "Open integration options",
	"wizard.openplantbook_credentials_link": "Get OpenPlantBook API credentials",
	"wizard.targets_label": "Soil moisture targets",
	"wizard.target_min": "Needs water below",
	"wizard.target_ideal": "Ideal",
	"wizard.target_max": "Too wet above",
	"wizard.targets_default": "Smart Plants defaults. A species can suggest better values.",
	"wizard.targets_species": "Imported from OpenPlantBook. Edit any value to override it for this plant.",
	"wizard.targets_reset": "Reset to defaults",
	"wizard.details_section": "More details",
	"wizard.details_summary": "Optional · date acquired, indoor or outdoor, category, tags",
	"wizard.acquired_date": "Date acquired",
	"wizard.tags": "Tags",
	"wizard.tags_hint": "Separate tags with commas",
	"wizard.back": "Back",
	"wizard.next": "Next",
	"wizard.skip": "Skip for now",
	"wizard.create": "Create plant",
	"wizard.retry_create": "Retry same creation request",
	"wizard.retry_draft": "Retry starting draft",
	"wizard.final_request_retained": "The final request is retained unchanged. Retry it to resolve an uncertain result safely, including after reconnect. Do not start a replacement draft until the result is resolved.",
	"wizard.rejected": "The server rejected the request as invalid or expired. You may correct it using a fresh draft; species data must be previewed and accepted again.",
	"wizard.start_fresh": "Start fresh draft retaining editable fields",
	"wizard.working": "Working…",
	"wizard.done_heading": "{name} is ready",
	"wizard.open_plant": "Open plant",
	"wizard.done_body_area": "The plant is now a device in {area}. Its readings and alerts appear here and in Home Assistant within a minute.",
	"wizard.done_body": "The plant is now a device in Home Assistant. Its readings and alerts appear here and in Home Assistant within a minute.",
	"wizard.back_to_plants": "Back to plants",
	"wizard.add_another_plant": "Add another plant",
	"wizard.error_code": "{code}: Request failed. Review input or retry when connected. Species can be entered manually; expired previews require a new review.",
	"wizard.error_generic": "Request failed. Retry when connected.",
	"wizard.error_name": "Enter a plant name.",
	"wizard.error_name_length": "Enter a plant name (1–200 characters).",
	"wizard.error_acquired": "Enter a valid date acquired.",
	"wizard.error_area": "The selected Home Assistant area no longer exists. Choose a current area or No area.",
	"wizard.error_accept_preview": "Review and explicitly accept the selected species, or choose not to use it.",
	"wizard.error_targets": "Check the watering targets: whole numbers from 1 to 99, “Needs water below” lower than “Ideal” lower than “Too wet above”, at least 4 % apart.",
	"plant_status.needs_water": "Needs water",
	"plant_status.too_wet": "Too wet",
	"plant_status.problem": "Problem",
	"plant_status.stale": "No recent data",
	"plant_status.no_sensors": "No sensors",
	"plant_status.no_moisture": "No moisture sensor",
	"plant_status.no_main_sensor": "No main sensor",
	"plant_status.healthy": "Healthy",
	"plant_status.paused": "Paused",
	"plant_status.more": "+{count}",
	"plant_status.more_label": "and {count} more",
	"reading.moisture": "Soil moisture",
	"reading.temperature": "Temperature",
	"reading.humidity": "Humidity",
	"reading.illuminance": "Light",
	"reading.conductivity": "Fertilizer level",
	"reading.soil_temperature": "Soil temperature",
	"reading.co2": "CO₂",
	"reading.battery": "Battery",
	"reading.no_value": "No value",
	"reading.outside_target": "outside the target {range}",
	"reading.not_updating": "not updating",
	"range.between": "{min}–{max}",
	"range.at_least": "At least {value}",
	"range.at_most": "At most {value}",
	"range.low_below": "Low below {value}",
	"moisture_bar.dry": "Dry",
	"moisture_bar.wet": "Wet",
	"moisture_bar.target": "Target {range}",
	"moisture_bar.label": "Soil moisture {value}, target range {range}",
	"moisture_bar.label_no_range": "Soil moisture {value}",
	"moisture_bar.label_no_value": "Soil moisture has no current value",
	"moisture_bar.last_update": "Last update {age}",
	"overview.status_unavailable": "Plant status is unavailable: {error}",
	"overview.filter_label": "Filter by status",
	"overview.tile_all": "All plants",
	"overview.tile_water": "Needs water",
	"overview.tile_problems": "Problems",
	"overview.tile_sensors": "Sensor issues",
	"overview.search": "Search plants",
	"overview.sort_button": "Sort: {sort}",
	"overview.sort_attention": "Needs attention first",
	"overview.sort_name": "Name",
	"overview.sort_area": "Group by area",
	"overview.clear_filter": "Clear filter",
	"overview.no_area": "No area",
	"overview.empty_heading": "No plants yet",
	"overview.empty_body": "Add a plant, pick the sensors you already have in Home Assistant, and Smart Plants tells you when it needs water or something is off.",
	"overview.how_it_works": "How it works",
	"overview.no_match_heading": "No plants match",
	"overview.no_match_filter": "Nothing in “{filter}” right now.",
	"overview.no_match_query": "No plant matches “{query}”.",
	"overview.show_all": "Show all plants",
	"overview.integration_options": "Integration options",
	"overview.menu_notifications": "Notifications…",
	"overview.documentation": "Documentation",
	"card.no_sensors": "No sensors assigned yet",
	"card.assign": "Assign",
	"card.assign_label": "Assign sensors to {name}",
	"card.watered": "Watered {age}",
	"card.watered_just_now": "Watered just now",
	"card.never_watered": "Not watered yet",
	"card.log_watering": "Watered",
	"card.log_watering_label": "Log watering for {name}",
	"watering.logged": "Watering logged for {name}",
	"watering.undo": "Undo",
	"watering.removed": "Watering removed for {name}",
	"problem_kind.too_cold": "Too cold",
	"problem_kind.too_hot": "Too hot",
	"problem_kind.too_dry": "Air too dry",
	"problem_kind.too_humid": "Air too humid",
	"problem_kind.low_light": "Too little light",
	"problem_kind.low_conductivity": "Needs fertilizer",
	"problem_kind.high_conductivity": "Too much fertilizer",
	"problem_kind.high_co2": "High CO₂",
	"problem_kind.battery_low": "Battery low",
	"problem_kind.soil_too_cold": "Soil too cold",
	"problem_kind.soil_too_hot": "Soil too hot",
	"reason.below_min": "{role} {value} is below the minimum of {limit}",
	"reason.above_max": "{role} {value} is above the maximum of {limit}",
	"reason.turns_off_at": "{role} {value}, alert turns off at {limit}",
	"reason.low_light": "Light {value}, needs at least {limit}",
	"reason.battery_low": "Sensor battery at {value}",
	"reason.stale": "{role}: last reading {age}",
	"reason.not_reporting": "{role}: sensor is not reporting",
	"reason.no_main_sensor": "{role}: no main sensor chosen",
	"reason.no_sensors": "Assign a soil moisture sensor to get watering alerts",
	"reason.outside_target": "{role} is outside its target",
	"detail.back": "Back",
	"detail.tab_sensors": "Sensors",
	"detail.tab_care": "Care",
	"detail.tab_settings": "Settings",
	"detail.no_species": "No species",
	"detail.reason_healthy": "All readings are within target.",
	"detail.reason_paused": "Monitoring is paused.",
	"detail.log_care": "Log care",
	"detail.key_readings": "Key readings",
	"detail.menu_open_device": "Open device",
	"detail.menu_download": "Download diagnostics",
	"reading_state.ok": "In range",
	"reading_state.low": "Too low",
	"reading_state.high": "Too high",
	"reading_state.stale": "Not updating · {age}",
	"reading_state.stale_no_age": "Not updating",
	"reading_state.unavailable": "No value",
	"sensor.missing": "Missing sensor",
	"readings.heading": "Readings",
	"readings.manage": "Manage sensors",
	"readings.empty": "No sensors assigned. Pick a soil moisture sensor to get watering alerts.",
	"readings.paused": "Monitoring is paused, so there are no current readings.",
	"readings.assign": "Assign sensors",
	"recent.heading": "Recent care",
	"recent.show_all": "Show all",
	"history.heading": "History",
	"history.open_native": "Open in Home Assistant",
	"history.role_label": "Reading",
	"history.range_label": "Time range",
	"history.range_24h": "24 h",
	"history.range_7d": "7 days",
	"history.range_30d": "30 days",
	"history.range_1y": "1 year",
	"history.period_24h": "last 24 hours",
	"history.period_7d": "last 7 days",
	"history.period_30d": "last 30 days",
	"history.period_1y": "last year",
	"history.loading": "Loading history…",
	"history.empty": "Home Assistant has not recorded any values for this period yet.",
	"history.unavailable": "History is not available because Home Assistant's Recorder is not running.",
	"history.error": "The history could not be loaded.",
	"history.retry": "Try again",
	"history.summary": "{role}, {period}: from {first} to {last}, lowest {low}, highest {high}",
	"history.summary_empty": "{role}, {period}: no recorded values",
	"history.legend_target": "Target: {range}",
	"history.legend_spread": "Lowest to highest value",
	"history.legend_watering": "Watering logged",
	"history.legend_fertilizing": "Fertilizing logged",
	"history.point_label": "Point in time",
	"history.point": "{time}: {value}",
	"history.point_spread": "{time}: {value} ({min}–{max})",
	"history.log_watering_at": "Log watering at this time",
	"history.rate": "Dropping about {rate} per day.",
	"history.rate_since_watering": "Dropping about {rate} per day since the last watering.",
	"history.forecast_one": "At this rate it reaches the minimum of {limit} in about {count} day.",
	"history.forecast_other": "At this rate it reaches the minimum of {limit} in about {count} days.",
	"history.forecast_soon": "At this rate it reaches the minimum of {limit} in less than a day.",
	"care_done.watering": "Watered",
	"care_done.fertilizing": "Fertilized",
	"care_done.pruning": "Pruned",
	"care_done.repotting": "Repotted",
	"care_done.note": "Note",
	"care_done.task": "Care task done",
	"about.heading": "About this plant",
	"about.edit": "Edit plant details",
	"about.species": "Species",
	"about.species_provider": "From {provider}",
	"about.species_manual": "Entered by you",
	"about.add_species": "Add species",
	"about.area": "Area",
	"about.placement": "Placement",
	"about.since": "Since",
	"about.category": "Category",
	"about.tags": "Tags",
	"about.add_details": "Add details",
	"automations.body": "Pick Smart Plants triggers such as “Plant needs water” in the automation editor, or set up notifications from the ⋮ menu on the plants overview.",
	"automations.open_device": "Open device",
	"automations.create": "Create automation",
	"automations.last_ran": "Last ran {time}",
	"automations.never_ran": "Never ran",
	"automations.yaml": "Defined in YAML",
	"automations.off": "Off",
	"automations.unavailable": "Unavailable",
	"automations.show_all": "Show all ({count})",
	"automations.all_plants": "For all plants",
	"automations.not_listed": "Automations that only use a template, the plant's area or a sensor assigned to the plant aren't listed.",
	"stale_alert.title": "{name} last reported {age}.",
	"stale_alert.title_no_age": "{name} is not reporting.",
	"stale_alert.body": "Check the sensor's battery or connection. Watering alerts are paused until it reports again.",
	"assigned.heading": "Assigned sensors",
	"assigned.empty": "No sensors yet.",
	"assigned.updated": "updated {age}",
	"assigned.not_found": "not found in Home Assistant",
	"assigned.main": "Main sensor",
	"assigned.own_sensor": "Smart Plants sensor, replace it",
	"assigned.menu": "Options for {name}",
	"assigned.change": "Change {role} sensors",
	"assigned.make_main": "Use as main sensor",
	"assigned.remove": "Remove from plant",
	"assigned.add": "Add sensor",
	"assigned.available": "Available: {roles}",
	"assigned.all_assigned": "Every reading has a sensor.",
	"sensors.edit_heading": "{role} sensors",
	"sensors.save_moisture": "Save soil moisture sensors",
	"sensors.summary_stale": "not updating after {duration}",
	"combine.heading": "Several sensors for one reading",
	"combine.secondary": "Use the average, lowest or highest value when more than one sensor is assigned",
	"combine.intro": "Choose which value counts when a reading has several sensors, and after how long without an update a sensor counts as not updating.",
	"combine.edit_label": "Change how {role} sensors combine",
	"duration.hours": "{count} h",
	"duration.minutes": "{count} min",
	"duration.seconds": "{count} s",
	"troubleshooting.heading": "Troubleshooting",
	"troubleshooting.secondary": "Technical details, entity IDs and diagnostics for bug reports",
	"troubleshooting.entities_heading": "Sensor entities",
	"troubleshooting.plant_id": "Plant ID",
	"troubleshooting.device_id": "Device ID",
	"troubleshooting.moisture_heading": "Soil moisture evaluation",
	"troubleshooting.moisture_value": "Combined moisture",
	"troubleshooting.moisture_health": "Moisture health score",
	"troubleshooting.reasons": "Reasons",
	"troubleshooting.no_evaluation": "No evaluation is available right now.",
	"troubleshooting.download_heading": "Diagnostics file",
	"troubleshooting.download_hint": "A JSON file with this plant's configuration, sensor entity IDs and current evaluation for bug reports. It contains no name, notes, photo or credentials.",
	"care.filter_label": "Filter care entries",
	"care.filter_all": "All",
	"care.filter_notes": "Notes",
	"care.filter_empty": "No entries of this type yet.",
	"care.close_form": "Close form",
	"care.event_menu": "Options for {kind} on {date}",
	"settings.plant_heading": "Plant",
	"settings.name": "Name",
	"settings.rename": "Rename",
	"settings.save_name": "Save name",
	"settings.close": "Close",
	"settings.area": "Area",
	"settings.area_value": "{area} · also sets the device area",
	"settings.change_area": "Change area",
	"settings.photo": "Photo",
	"settings.species": "Species",
	"settings.species_provider": "{provider}, fetched {date}",
	"settings.species_none": "None. Adding a species can suggest care targets.",
	"settings.find_species": "Find species",
	"settings.change_species": "Change species",
	"targets.heading": "Soil moisture targets",
	"targets.from_species": "Alerts fire outside this range. Values come from the species unless you change them.",
	"targets.from_defaults": "Alerts fire outside this range. Values are Smart Plants defaults unless you change them.",
	"targets.custom_species": "Alerts fire outside this range. You set your own values; Reset to defaults uses the species values again.",
	"targets.custom_defaults": "Alerts fire outside this range. You set your own values; Reset to defaults uses the Smart Plants defaults again.",
	"targets.needs_water": "Needs water below",
	"targets.ideal": "Ideal",
	"targets.too_wet": "Too wet above",
	"targets.default_hint": "Default {value}",
	"targets.custom_hint": "Your value · default {value}",
	"targets.reset": "Reset to defaults",
	"targets.save": "Save targets",
	"other_targets.heading": "Other targets",
	"other_targets.secondary": "Temperature, humidity, light, fertilizer level and battery",
	"other_targets.intro": "Each check has its own limits. Change them for this plant only; blank fields use the built-in defaults.",
	"other_targets.none": "Assign a temperature, humidity, light, fertilizer, CO₂ or battery sensor to set its targets.",
	"more_details.heading": "More details",
	"more_details.secondary": "Placement, date acquired, category and tags",
	"more_details.save_identity": "Save placement and date",
	"manage.heading": "Manage",
	"manage.pause": "Pause monitoring",
	"manage.pause_hint": "Keeps the plant and its history, stops alerts and readings",
	"manage.pause_button": "Pause",
	"manage.resume": "Resume monitoring",
	"manage.resume_hint": "Starts alerts and readings again",
	"manage.resume_button": "Resume",
	"manage.delete": "Delete plant",
	"manage.delete_hint": "Removes the plant, its device, entities and care history",
	"manage.delete_button": "Delete",
	"care_task_type.fertilize": "Fertilize",
	"care_task_type.prune": "Prune",
	"care_task_type.repot": "Repot",
	"care_task_type.pests": "Check for pests",
	"care_task_type.winter_protection": "Winter protection",
	"care_task_type.custom": "Custom task",
	"care_plan.heading": "Care plan",
	"care_plan.add_task": "Add task",
	"care_plan.full": "A plant can have at most 20 care tasks.",
	"care_plan.tasks_label": "Care tasks",
	"care_plan.empty": "Get reminders for fertilizing, repotting and more.",
	"care_plan.last_done": "Last done: {date}",
	"care_plan.never_done": "Not done yet",
	"care_plan.done": "Done",
	"care_plan.done_label": "Mark {name} as done",
	"care_plan.task_menu": "Options for {name}",
	"care_plan.menu_mark_done": "Mark as done…",
	"care_plan.menu_skip": "Skip this time",
	"care_plan.menu_edit": "Edit",
	"care_plan.menu_automate": "Automate…",
	"care_plan.menu_delete": "Delete",
	"care_plan.month_range": "{start}–{end}",
	"care_plan.schedule_yearly": "Once a year, {months}",
	"care_plan.every_days_one": "Every day",
	"care_plan.every_days_other": "Every {count} days",
	"care_plan.every_weeks_one": "Every week",
	"care_plan.every_weeks_other": "Every {count} weeks",
	"care_plan.every_months_one": "Every month",
	"care_plan.every_months_other": "Every {count} months",
	"care_plan.every_years_one": "Every year",
	"care_plan.every_years_other": "Every {count} years",
	"care_plan.schedule_growing_only": "{every} · growing season only",
	"care_plan.overdue_one": "Overdue 1 day",
	"care_plan.overdue_other": "Overdue {count} days",
	"care_plan.due_today": "Due today",
	"care_plan.due_until": "Due until {date}",
	"care_plan.resting_until": "Resting until {date}",
	"care_plan.done_this_year": "Done for this year",
	"care_plan.skipped_this_year": "Skipped this year",
	"care_plan.missed_this_year": "Missed this year",
	"care_plan.from_date": "From {date}",
	"care_plan.tomorrow": "Tomorrow",
	"care_plan.in_days_one": "In 1 day",
	"care_plan.in_days_other": "In {count} days",
	"care_plan.in_weeks_one": "In 1 week",
	"care_plan.in_weeks_other": "In {count} weeks",
	"care_plan.in_months_one": "In 1 month",
	"care_plan.in_months_other": "In {count} months",
	"care_plan.error_name_required": "Enter a name for this task.",
	"care_plan.error_name_length": "Use at most 60 characters.",
	"care_plan.error_months": "Pick at least one month.",
	"care_plan.error_every": "Enter a whole number from 1 to 999.",
	"care_plan.error_instructions_length": "Use at most 4,000 characters.",
	"care_plan.error_last_done": "Enter a valid date.",
	"care_plan.error_last_done_future": "The date can't be in the future.",
	"care_plan.error_task_gone": "This task no longer exists. It may have been deleted somewhere else.",
	"care_plan.summary_pick_months": "Once a year · pick the months",
	"care_plan.summary_enter_interval": "Repeating · enter how often",
	"care_plan.add_title": "Add care task",
	"care_plan.edit_title": "Edit care task",
	"care_plan.add_intro": "What do you want to be reminded of?",
	"care_plan.suggestions_for": "Suggestions for",
	"care_plan.suggestion_source": "OpenPlantBook · {topic}",
	"care_plan.note_fertilization": "fertilizing",
	"care_plan.note_pruning": "pruning",
	"care_plan.suggestion_add": "Add {name} task",
	"care_plan.show_more": "Show more",
	"care_plan.show_less": "Show less",
	"care_plan.from_scratch": "Or start from scratch",
	"care_plan.empty_suggestions": "OpenPlantBook has care information for this species. They show up as suggestions when you add a task.",
	"care_plan.note_hint": "OpenPlantBook has a care note for this",
	"care_plan.note_use": "Use as instructions",
	"care_plan.note_applied": "From OpenPlantBook. Edit the text to make it your own.",
	"care_plan.preset_exists": "Already in the care plan",
	"care_plan.preset_custom": "Your own name and schedule",
	"care_plan.name": "Name",
	"care_plan.name_optional": "Name (optional)",
	"care_plan.when_due": "When is it due?",
	"care_plan.mode_interval": "Repeating",
	"care_plan.mode_yearly": "Once a year",
	"care_plan.every": "Every",
	"care_plan.unit": "Unit",
	"care_plan.unit_days": "Days",
	"care_plan.unit_weeks": "Weeks",
	"care_plan.unit_months": "Months",
	"care_plan.unit_years": "Years",
	"care_plan.growing_only": "Only in the growing season",
	"care_plan.growing_only_hint": "Waits during the rest period ({months}).",
	"care_plan.months": "Months",
	"care_plan.months_hint": "Pick the first month, then the last month.",
	"care_plan.instructions": "Instructions (optional)",
	"care_plan.instructions_placeholder": "What to do, shown with the task",
	"care_plan.more_options": "More options",
	"care_plan.last_done_field": "Last done",
	"care_plan.last_done_hint": "Optional. Without a date, a repeating task is due right away.",
	"care_plan.delete": "Delete",
	"care_plan.back": "Back",
	"care_plan.save": "Save",
	"care_plan.close": "Close",
	"care_plan.confirm_delete": "Delete the care task {name}? Its entities are removed, and automations that use them stop working. Its entries in the care history are kept.",
	"care_plan.added_toast": "{name} added to the care plan",
	"care_plan.saved_toast": "{name} saved",
	"care_plan.done_toast": "{name} marked as done",
	"care_plan.skipped_toast": "{name} skipped this time",
	"care_plan.deleted_toast": "{name} deleted",
	"care_plan.undo": "Undo",
	"care_plan.form_marks_done": "Marks {name} as done.",
	"care_plan.form_also_marks": "Also marks {name} as done.",
	"care_plan.automate_title": "Automate “{name}”",
	"care_plan.automate_intro": "Use these entities in any automation, for example to get a notification on your phone.",
	"care_plan.automate_due": "On while {name} is due",
	"care_plan.automate_next": "Next due date",
	"care_plan.automate_next_disabled": "Disabled by default. Enable it on the plant's device page to use it.",
	"care_plan.automate_care_due": "On while any care task of this plant is due",
	"care_plan.automate_missing": "Entity not found yet. Reload the page in a moment.",
	"care_plan.automate_action_before": "Mark the task as done from anywhere with the action ",
	"care_plan.automate_action_after": ", for example from an NFC tag or a dashboard button.",
	"care_plan.open_automation_editor": "Open automation editor",
	"care_plan.copy": "Copy {entity}",
	"care_plan.copied": "Copied {entity}",
	"care_plan.copy_failed": "Couldn't copy. Select the entity ID and copy it by hand.",
	"care_plan.line_more": "{names} +{count}",
	"care_plan.plan_menu": "Care plan options",
	"care_plan.rest_set": "Set rest period",
	"care_plan.rest_edit": "Edit rest period",
	"care_plan.rest_period": "Rest period",
	"care_plan.rest_months_label": "Rest months: {months}",
	"care_plan.edit": "Edit",
	"care_plan.growing_season": "Growing season",
	"care_plan.rest_all_running": "all tasks keep running",
	"care_plan.rest_tasks_off_one": "1 task off during rest",
	"care_plan.rest_tasks_off_other": "{count} tasks off during rest",
	"care_plan.rest_tasks_off_now_one": "1 task off",
	"care_plan.rest_tasks_off_now_other": "{count} tasks off",
	"care_plan.rest_intro": "Optional. Many outdoor and Mediterranean plants grow little in winter and need no fertilizer then. Most houseplants don't need a rest period.",
	"care_plan.rest_watering": "Watering alerts are not affected.",
	"care_plan.rest_months": "Rest months",
	"care_plan.rest_off_heading": "Off during rest",
	"care_plan.rest_no_repeating": "No repeating tasks yet.",
	"care_plan.rest_yearly_note": "Once-a-year tasks follow their own months and are not affected.",
	"care_plan.rest_remove": "Remove",
	"care_plan.rest_error_months": "Pick the rest months.",
	"care_plan.rest_error_whole_year": "A rest period can't cover the whole year.",
	"care_plan.rest_saved_toast": "Rest period saved",
	"care_plan.rest_removed_toast": "Rest period removed",
	"care_plan.due_chips_label": "Care due",
	"care_plan.more_due": "and {count} more due",
	"care_plan.schedule_reading": "{rule} · {source}",
	"care_plan.condition_below": "Below {value}",
	"care_plan.condition_above": "Above {value}",
	"care_plan.due_now": "Due",
	"care_plan.reading_due": "Due · {reading}",
	"care_plan.reading_still_cold": "still cold",
	"care_plan.reading_still_warm": "still warm",
	"care_plan.reading_until_above": "until above {value}",
	"care_plan.reading_until_below": "until below {value}",
	"care_plan.reading_done_on": "Done {date} · {until}",
	"care_plan.reading_waiting": "Waiting · {until}",
	"care_plan.reading_none": "No reading",
	"care_plan.reading_below_since": "Below {value} since {since} · due {time}",
	"care_plan.reading_above_since": "Above {value} since {since} · due {time}",
	"care_plan.reading_not_needed": "Not needed · {reading}",
	"care_plan.reading_not_needed_plain": "Not needed",
	"care_plan.error_source": "Pick a sensor.",
	"care_plan.error_value": "Enter a number.",
	"care_plan.error_for_hours": "Enter hours from 0 to 72, in whole minutes.",
	"care_plan.error_reset_below": "Enter the value or a higher number.",
	"care_plan.error_reset_above": "Enter the value or a lower number.",
	"care_plan.summary_pick_source": "Reading · pick a sensor",
	"care_plan.subject_temperature": "the temperature",
	"care_plan.subject_soil_temperature": "the soil temperature",
	"care_plan.subject_humidity": "the humidity",
	"care_plan.subject_moisture": "the soil moisture",
	"care_plan.subject_illuminance": "the light",
	"care_plan.subject_conductivity": "the fertilizer level",
	"care_plan.subject_co2": "the CO₂ level",
	"care_plan.summary_below": "When {subject} is below {value}",
	"care_plan.summary_above": "When {subject} is above {value}",
	"care_plan.summary_below_enter": "When {subject} is below … · enter a value",
	"care_plan.summary_above_enter": "When {subject} is above … · enter a value",
	"care_plan.summary_for_hours_one": "for 1 h",
	"care_plan.summary_for_hours_other": "for {count} h",
	"care_plan.summary_again_above": "due again above {value}",
	"care_plan.summary_again_below": "due again below {value}",
	"care_plan.mode_reading": "Reading",
	"care_plan.reading": "Reading",
	"care_plan.reading_choose": "Choose a sensor",
	"care_plan.reading_group_plant": "This plant's sensors",
	"care_plan.reading_group_other": "Other sensor",
	"care_plan.reading_other": "Any other sensor…",
	"care_plan.reading_role_value": "{role} · {value}",
	"care_plan.reading_sensor": "Sensor",
	"care_plan.reading_no_sensors": "No sensors with a numeric state",
	"care_plan.due_when": "Due when",
	"care_plan.below": "Below",
	"care_plan.above": "Above",
	"care_plan.value": "Value",
	"care_plan.value_placeholder": "e.g. 5",
	"care_plan.min_temp_hint": "OpenPlantBook: minimum {value}",
	"care_plan.min_temp_use": "Use",
	"care_plan.min_temp_use_label": "Use the OpenPlantBook minimum of {value}",
	"care_plan.min_temp_applied": "From OpenPlantBook's minimum temperature.",
	"care_plan.more_options_reading": "delay, due again",
	"care_plan.for_hours": "Only after (optional)",
	"care_plan.hours": "h",
	"care_plan.for_hours_hint": "Due once the reading stayed there this many hours. After a restart the wait starts again.",
	"care_plan.reset_after_above": "Due again after above",
	"care_plan.reset_after_below": "Due again after below",
	"care_plan.reset_hint": "Optional. After Done, the task waits until the reading reaches this value, so a reading that hovers near the value gives one reminder.",
	"care_plan.preset_winter": "When it gets cold",
	"care_plan.preset_winter_needs_source": "Needs a temperature sensor or a weather forecast",
	"care_plan.note_min_temperature": "minimum temperature",
	"care_plan.grows_above": "Grows above {value}",
	"care_plan.suggestion_add_winter": "Add winter protection",
	"care_plan.reading_group_forecast": "Weather forecast",
	"care_plan.reading_group_forecast_entity": "Weather forecast · {name}",
	"care_plan.forecast_row_low": "Lowest temperature · {window}",
	"care_plan.forecast_row_high": "Highest temperature · {window}",
	"care_plan.forecast_window_24": "next 24 h",
	"care_plan.forecast_window_48": "next 2 days",
	"care_plan.forecast_window_72": "next 3 days",
	"care_plan.forecast_window_long_24": "next 24 hours",
	"care_plan.forecast_window_long_48": "next 2 days",
	"care_plan.forecast_window_long_72": "next 3 days",
	"care_plan.subject_forecast_low": "the forecast low for the {window}",
	"care_plan.subject_forecast_high": "the forecast high for the {window}",
	"care_plan.forecast_rule_low_below": "Forecast low below {value}",
	"care_plan.forecast_rule_low_above": "Forecast low above {value}",
	"care_plan.forecast_rule_high_below": "Forecast high below {value}",
	"care_plan.forecast_rule_high_above": "Forecast high above {value}",
	"care_plan.forecast_value": "forecast {value}",
	"care_plan.forecast_none": "No forecast",
	"care_plan.forecast_short": "Forecast only until {time}",
	"care_plan.weather_entity": "Weather entity",
	"care_plan.error_weather_missing": "Weather entity not found. Choose another one.",
	"care_plan.error_weather_unit": "This weather entity reports no temperature unit. Choose another one.",
	"care_plan.look_ahead": "Look ahead",
	"care_plan.look_ahead_24": "Next 24 hours",
	"care_plan.look_ahead_48": "Next 2 days",
	"care_plan.look_ahead_72": "Next 3 days",
	"care_plan.look_ahead_hint": "The forecast low or high is taken over this time from now. Shorter times are more reliable. The forecast is refreshed every 30 minutes.",
	"care_plan.more_options_forecast": "look ahead, due again",
	"overview.tile_care": "Care due",
	"card.care_due": "Care: {tasks}",
	"card.care_overdue": "overdue",
	"snooze.menu": "Snooze alerts…",
	"snooze.menu_change": "Change snooze…",
	"snooze.title": "Snooze alerts for {name}",
	"snooze.title_change": "Change snooze for {name}",
	"snooze.intro": "Entities keep their real states and the plant keeps showing its status. Automations can check the Snoozed attribute to stay quiet. The snooze ends by itself at the end of the chosen day.",
	"snooze.current": "Snoozed until {date}",
	"snooze.choices": "Snooze for",
	"snooze.preset_1": "1 day",
	"snooze.preset_3": "3 days",
	"snooze.preset_7": "1 week",
	"snooze.preset_14": "2 weeks",
	"snooze.preset_date": "Until date…",
	"snooze.preset_until": "Until {date}",
	"snooze.date_label": "Last snoozed day",
	"snooze.date_hint": "Alerts resume after this day.",
	"snooze.error_date": "Choose a day from tomorrow up to one year from today.",
	"snooze.confirm": "Snooze",
	"snooze.resume": "Resume",
	"snooze.resume_label": "Resume alerts for {name}",
	"snooze.chip": "Snoozed until {date}",
	"snooze.menu_all": "Snooze all plants…",
	"snooze.title_all": "Snooze all plants",
	"snooze.all_summary_one": "Snoozes {count} plant.",
	"snooze.all_summary_other": "Snoozes {count} plants.",
	"snooze.all_paused": "Paused plants are left out.",
	"snooze.all_kept_one": "{count} plant already snoozed longer keeps its end.",
	"snooze.all_kept_other": "{count} plants already snoozed longer keep their end.",
	"snooze.all_none": "Every plant is already snoozed longer and keeps its end.",
	"snooze.resume_all": "Resume all",
	"snooze.resume_all_hint_one": "Ends the snooze of {count} plant.",
	"snooze.resume_all_hint_other": "Ends the snooze of {count} plants.",
	"snooze.all_done_one": "{count} plant snoozed until {date}",
	"snooze.all_done_other": "{count} plants snoozed until {date}",
	"snooze.all_resumed_one": "Alerts resumed for {count} plant",
	"snooze.all_resumed_other": "Alerts resumed for {count} plants",
	"snooze.all_unchanged": "No plant changed",
	"snooze.all_undone": "Previous snoozes restored",
	"snooze.undo": "Undo",
	"notifications.title": "Notifications",
	"notifications.intro": "Get a message about your plants. You review and save it in Home Assistant's automation editor.",
	"notifications.existing": "Your notifications",
	"notifications.last_sent": "Last sent {time}",
	"notifications.never_sent": "Not sent yet",
	"notifications.edit": "Edit",
	"notifications.edit_label": "Edit {name}",
	"notifications.kind": "Notification",
	"notifications.daily": "Daily plant report",
	"notifications.daily_help": "One message a day if a plant needs water, has a problem or has a care task due.",
	"notifications.daily_time": "Time",
	"notifications.water": "Tell me right away when a plant needs water",
	"notifications.water_delay": "After",
	"notifications.delay_none": "Right away",
	"notifications.quiet": "Quiet hours",
	"notifications.quiet_help": "No messages during quiet hours. The daily report still lists the plant.",
	"notifications.quiet_from": "From",
	"notifications.quiet_to": "To",
	"notifications.plants": "Plants",
	"notifications.plants_all": "All plants",
	"notifications.plants_choose": "Choose plants",
	"notifications.error_no_plants": "Choose at least one plant.",
	"notifications.send_to": "Send to",
	"notifications.group_entities": "Notification entities",
	"notifications.group_services": "Notification services",
	"notifications.persistent": "Home Assistant notification",
	"notifications.open_editor": "Open in automation editor",
	"notifications.exists": "You already have this notification.",
	"notifications.yaml_help": "Needs the default automations.yaml setup. Otherwise copy the YAML from the editor into your own files.",
	"notifications.editor_fallback": "The automation editor couldn't be filled in. Add the Smart Plants trigger and a notify action yourself.",
	"notifications.alias_daily": "Smart Plants: daily plant report",
	"notifications.alias_water": "Smart Plants: plant needs water",
	"notifications.description_daily": "Created in Smart Plants → Notifications. Sends a short list of the plants that need water, have problems or have care tasks due.",
	"notifications.description_water": "Created in Smart Plants → Notifications. Sends a message when a plant has needed water for {delay}. Snoozed plants send theirs when the snooze ends.",
	"notifications.description_water_now": "Created in Smart Plants → Notifications. Sends a message when a plant needs water. Snoozed plants send theirs when the snooze ends.",
	"notifications.msg_water_title": "{plant} needs water",
	"notifications.msg_water_body": "Water it when you get a chance.",
	"plant_card.name": "Smart Plants plant card",
	"plant_card.description": "One plant with its status, soil moisture, readings and a Watered button.",
	"plant_card.missing_title": "Plant not found",
	"plant_card.missing_body": "The plant this card shows was removed. Edit the card to pick another plant.",
	"plant_card.no_plant": "Pick a plant in the card editor.",
	"plant_card.care_due": "Care due",
	"plant_card.paused": "Monitoring is paused",
	"plant_card.open_label": "Open {name} in Smart Plants",
	"plant_card.details_label": "Show details for {name}",
	"plant_card.unauthorized": "You don't have permission to log care",
	"plant_card.load_error": "The plant card could not be loaded. Trying again shortly.",
	"plant_card.log_failed": "Watering could not be logged for {name}",
	"plant_card.undo_failed": "Watering could not be removed for {name}",
	"plant_card.editor_plant": "Plant",
	"plant_card.editor_show_readings": "Show readings",
	"plant_card.editor_show_readings_help": "Moisture bar and reading chips",
	"plant_card.editor_show_watering": "Show Watered button",
	"plant_card.editor_show_watering_help": "Logs a watering for this plant"
}, Pe = ["en", "de"], Fe = {
	en: Ne,
	de: Me
};
function Ie(e) {
	let t = (e?.locale?.language || e?.language || "en").toLowerCase().split(/[-_]/)[0] ?? "en";
	return Pe.includes(t) ? t : "en";
}
function Le(e) {
	if (!e) return;
	let t = e.replaceAll("_", "-");
	try {
		return Intl.getCanonicalLocales(t)[0];
	} catch {
		return;
	}
}
function Re(e, t) {
	switch (e?.number_format) {
		case "system": return {
			locales: void 0,
			grouping: !0
		};
		case "comma_decimal": return {
			locales: ["en-US", "en"],
			grouping: !0
		};
		case "decimal_comma": return {
			locales: [
				"de",
				"es",
				"it"
			],
			grouping: !0
		};
		case "space_comma": return {
			locales: [
				"fr",
				"sv",
				"cs"
			],
			grouping: !0
		};
		case "none": return {
			locales: t ? [t] : void 0,
			grouping: !1
		};
		default: return {
			locales: t ? [t] : void 0,
			grouping: !0
		};
	}
}
function ze(e) {
	if (e?.time_format === "12") return !0;
	if (e?.time_format === "24") return !1;
}
function Be(e, t, n) {
	return t ? e.replace(/\{(\w+)\}/g, (e, r) => {
		if (!Object.hasOwn(t, r)) return e;
		let i = t[r];
		return typeof i == "number" ? n(i) : i;
	}) : e;
}
var Ve = /* @__PURE__ */ new Map();
function He(e, t = Fe) {
	let n = Ie(e), r = e?.locale, i = t === Fe ? JSON.stringify([
		n,
		e?.language,
		r?.language,
		r?.number_format,
		r?.time_format,
		r?.date_format
	]) : null, a = i ? Ve.get(i) : void 0;
	if (a) return a;
	let o = Le(r?.language || e?.language) ?? n, { locales: s, grouping: c } = Re(r, o), l = c ? "min2" : !1, u = r?.date_format === "system" ? void 0 : [o], d = /* @__PURE__ */ new Map(), f = (e, t = {}) => {
		let n = JSON.stringify(t), r = d.get(n);
		return r || (r = new Intl.NumberFormat(s, {
			maximumFractionDigits: 2,
			useGrouping: l,
			...t
		}), d.set(n, r)), r.format(e);
	}, ee = t[n], p = (e, n) => Be(ee[e] ?? t.en[e] ?? e, n, (e) => f(e)), m = new Intl.PluralRules(n), h = new Intl.DateTimeFormat(u, {
		dateStyle: "medium",
		timeZone: "UTC"
	}), g = {
		hour: "numeric",
		minute: "2-digit"
	}, _ = ze(r);
	_ !== void 0 && (g.hour12 = _);
	let te = new Intl.DateTimeFormat(u, {
		...g,
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: "UTC"
	}), v = new Intl.DateTimeFormat(u, {
		...g,
		year: "numeric",
		month: "short",
		day: "numeric"
	}), y = {
		language: n,
		t: p,
		tn: (e, t, n, r) => p(m.select(e) === "one" ? t : n, {
			...r,
			count: e
		}),
		number: f,
		percent: (e) => p("format.percent", { value: e }),
		date: (e) => {
			let t = /^(\d{4})-(\d\d)-(\d\d)$/.exec(e);
			return t ? h.format(Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3]))) : e;
		},
		recordedDateTime: (e) => {
			let t = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::\d\d(?:\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.exec(e);
			if (!t) return e;
			let n = Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3]), Number(t[4]), Number(t[5]));
			return p("format.recorded_date_time", {
				datetime: te.format(n),
				offset: t[6] === "Z" ? "+00:00" : t[6]
			});
		},
		dateTime: (e) => {
			let t = Date.parse(e);
			return Number.isFinite(t) ? v.format(t) : e;
		}
	};
	return i && Ve.set(i, y), y;
}
var z = He(), B = {
	needs_water: {
		icon: "mdi:water-alert",
		color: "--warning-color",
		label: "plant_status.needs_water"
	},
	too_wet: {
		icon: "mdi:waves-arrow-up",
		color: "--info-color",
		label: "plant_status.too_wet"
	},
	problem: {
		icon: "mdi:alert-circle",
		color: "--error-color",
		label: "plant_status.problem"
	},
	stale: {
		icon: "mdi:clock-alert-outline",
		color: "--disabled-text-color",
		label: "plant_status.stale"
	},
	no_sensors: {
		icon: "mdi:sprout-outline",
		color: "--disabled-text-color",
		label: "plant_status.no_sensors"
	},
	healthy: {
		icon: "mdi:check-circle",
		color: "--success-color",
		label: "plant_status.healthy"
	},
	paused: {
		icon: "mdi:pause-circle-outline",
		color: "--disabled-text-color",
		label: "plant_status.paused"
	}
};
function V(e, t) {
	return e.t(B[t].label);
}
var Ue = [
	"moisture",
	"temperature",
	"humidity",
	"illuminance",
	"conductivity",
	"soil_temperature",
	"co2",
	"battery"
], H = {
	moisture: {
		icon: "mdi:water",
		label: "reading.moisture"
	},
	temperature: {
		icon: "mdi:thermometer",
		label: "reading.temperature"
	},
	humidity: {
		icon: "mdi:water-percent",
		label: "reading.humidity"
	},
	illuminance: {
		icon: "mdi:white-balance-sunny",
		label: "reading.illuminance"
	},
	conductivity: {
		icon: "mdi:flash",
		label: "reading.conductivity"
	},
	soil_temperature: {
		icon: "mdi:thermometer-lines",
		label: "reading.soil_temperature"
	},
	co2: {
		icon: "mdi:molecule-co2",
		label: "reading.co2"
	},
	battery: {
		icon: "mdi:battery",
		label: "reading.battery"
	}
};
function We(e) {
	return typeof e == "string" && Ue.includes(e);
}
function Ge(e, t) {
	return e.t(H[t].label);
}
function U(e, t, n) {
	return n === "%" ? e.percent(t) : n ? `${e.number(t)} ${n}` : e.number(t);
}
function Ke(e, t, n, r) {
	if (!n) return "";
	let { min: i, max: a } = n;
	return t === "battery" && i !== null ? e.t("range.low_below", { value: U(e, i, r) }) : i !== null && a !== null ? e.t("range.between", {
		min: e.number(i),
		max: U(e, a, r)
	}) : i === null ? a === null ? "" : e.t("range.at_most", { value: U(e, a, r) }) : e.t("range.at_least", { value: U(e, i, r) });
}
var qe = [
	["second", 60],
	["minute", 60],
	["hour", 24],
	["day", 7],
	["week", 4.34524],
	["month", 12],
	["year", Infinity]
];
function Je(e, t, n = Date.now()) {
	let r = Date.parse(t);
	if (!Number.isFinite(r)) return t;
	let i = new Intl.RelativeTimeFormat(e.language, { numeric: "auto" }), a = (r - n) / 1e3;
	for (let [e, t] of qe) {
		if (Math.abs(a) < t) return i.format(Math.round(a), e);
		a /= t;
	}
	return t;
}
//#endregion
//#region src/components/shared-styles.ts
var W = o`
  :host {
    --sp-success: var(--success-color, #4caf50);
    --sp-warning: var(--warning-color, #ff9800);
    --sp-info: var(--info-color, #039be5);
    --sp-error: var(--error-color, #db4437);
    --sp-disabled: var(--disabled-text-color, #bdbdbd);
    --sp-text: var(--primary-text-color, #212121);
    --sp-text-secondary: var(--secondary-text-color, #727272);
    --sp-primary: var(--primary-color, #009ac7);
    --sp-card: var(--card-background-color, #fff);
    /* Care reminders have their own colour, apart from the watering palette. */
    --sp-care: var(--purple-color, #8f5bd1);
  }
`, Ye = o`
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
`;
function Xe(e) {
	switch (e) {
		case "--success-color": return "var(--sp-success)";
		case "--warning-color": return "var(--sp-warning)";
		case "--info-color": return "var(--sp-info)";
		case "--error-color": return "var(--sp-error)";
		default: return "var(--sp-disabled)";
	}
}
//#endregion
//#region \0@oxc-project+runtime@0.151.0/helpers/esm/decorate.js
function G(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
//#endregion
//#region src/components/sp-moisture-bar.ts
var Ze, Qe = (e) => Math.min(100, Math.max(0, e)), K = class extends L {
	constructor(...e) {
		super(...e), this.value = null, this.range = null, this.state = "ok", this.lastReported = null, this.now = void 0, this.l = z;
	}
	willUpdate() {
		this.toggleAttribute("dimmed", this.state === "stale" || this.state === "unavailable");
	}
	_hasRange() {
		return this.range?.min !== null && this.range?.min !== void 0 && this.range.max !== null && this.range.max !== void 0;
	}
	render() {
		let e = this.l, t = this.range, n = this.value, r = Ke(e, "moisture", t, "%"), i = n === null ? "—" : U(e, n, "%"), a = n === null ? e.t("moisture_bar.label_no_value") : r ? e.t("moisture_bar.label", {
			value: i,
			range: r
		}) : e.t("moisture_bar.label_no_range", { value: i }), o = this._hasRange(), s = o ? Qe(t.min) : 0, c = o ? Qe(t.max) : 0, l = t?.target ?? null, u = this.state === "stale" && this.lastReported;
		return k`
      <div class="top"><span class="name"><ha-icon aria-hidden="true" .icon=${H.moisture.icon}></ha-icon>${Ge(e, "moisture")}</span>
        <span class="value ${this.state}" aria-hidden="true">${i}</span></div>
      <div class="track" role="img" aria-label=${a}>
        ${o ? k`<div class="band" style="left:${s}%;width:${Math.max(0, c - s)}%"></div>` : j}
        ${l === null ? j : k`<div class="tick" style="left:${Qe(l)}%"></div>`}
        ${n === null ? j : k`<div class="dot ${this.state}" style="left:${Math.min(98, Math.max(2, n))}%"></div>`}
      </div>
      <div class="scale" aria-hidden="true"><span class="end">${e.t("moisture_bar.dry")}</span>${r ? k`<span>${e.t("moisture_bar.target", { range: r })}</span>` : j}<span class="end">${e.t("moisture_bar.wet")}</span></div>
      ${u ? k`<div class="age"><ha-icon aria-hidden="true" icon="mdi:clock-outline"></ha-icon>${e.t("moisture_bar.last_update", { age: Je(e, this.lastReported, this.now) })}</div>` : j}`;
	}
};
Ze = K, Ze.styles = [W, o`
    :host { display: block; font-size: 13px; color: var(--sp-text); }
    .top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; column-gap: 8px; }
    .name { display: inline-flex; align-items: center; gap: 4px; color: var(--sp-text-secondary); }
    .name ha-icon { --mdc-icon-size: 16px; }
    .value { font-size: 18px; font-weight: 500; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .value.low { color: color-mix(in srgb, var(--sp-warning) 50%, var(--sp-text)); }
    .value.high { color: color-mix(in srgb, var(--sp-info) 50%, var(--sp-text)); }
    .value.stale, .value.unavailable { color: var(--sp-text-secondary); }
    .track { position: relative; height: 8px; margin-top: 6px; border-radius: 4px; background: color-mix(in srgb, var(--sp-text) 8%, transparent); }
    .band { position: absolute; top: 0; bottom: 0; border-radius: 4px; background: color-mix(in srgb, var(--sp-success) 30%, transparent); }
    .tick { position: absolute; top: -2px; bottom: -2px; width: 2px; margin-left: -1px; border-radius: 1px; background: color-mix(in srgb, var(--sp-success) 60%, var(--sp-text)); }
    .dot { position: absolute; top: 50%; width: 14px; height: 14px; border-radius: 50%; transform: translate(-50%, -50%); border: 2px solid var(--sp-card); box-shadow: 0 0 0 1px color-mix(in srgb, var(--sp-text) 20%, transparent); background: var(--sp-success); }
    .dot.low { background: var(--sp-warning); }
    .dot.high { background: var(--sp-info); }
    .dot.stale, .dot.unavailable { background: var(--sp-disabled); }
    :host([dimmed]) .band, :host([dimmed]) .tick { opacity: .5; }
    .scale { display: flex; justify-content: space-between; gap: 8px; margin-top: 3px; font-size: 11px; color: var(--sp-text-secondary); font-variant-numeric: tabular-nums; }
    /* In a narrow dashboard card only the target fits under the bar. The bar's
       label names the whole range for screen readers. */
    @container (max-width: 200px) {
      .scale { justify-content: center; }
      .scale .end { display: none; }
      .scale span { white-space: nowrap; }
    }
    .age { display: flex; align-items: center; gap: 4px; margin-top: 4px; font-size: 12px; color: var(--sp-text-secondary); }
    .age ha-icon { --mdc-icon-size: 15px; }
  `], G([R({ type: Number })], K.prototype, "value", void 0), G([R({ attribute: !1 })], K.prototype, "range", void 0), G([R({ reflect: !0 })], K.prototype, "state", void 0), G([R({ attribute: !1 })], K.prototype, "lastReported", void 0), G([R({ attribute: !1 })], K.prototype, "now", void 0), G([R({ attribute: !1 })], K.prototype, "l", void 0), customElements.get("sp-moisture-bar") || customElements.define("sp-moisture-bar", K);
//#endregion
//#region src/components/sp-plant-avatar.ts
var $e, q = class extends L {
	constructor(...e) {
		super(...e), this.src = null, this.name = "", this.size = "small", this.l = z;
	}
	render() {
		return k`<div class="tile" part="tile">${this.src ? k`<img src=${this.src} alt=${this.l.t("photo.alt", { name: this.name })} @error=${() => this.dispatchEvent(new CustomEvent("photo-error", {
			bubbles: !0,
			composed: !0
		}))}>` : k`<ha-icon aria-hidden="true" icon="mdi:sprout"></ha-icon>`}</div>`;
	}
};
$e = q, $e.styles = [W, o`
    :host { --sp-avatar-size: 56px; --sp-avatar-radius: 12px; display: inline-block; flex: none; width: var(--sp-avatar-size); height: var(--sp-avatar-size); max-width: 100%; }
    :host([size="large"]) { --sp-avatar-size: 132px; --sp-avatar-radius: 16px; }
    @media (max-width: 600px) { :host([size="large"]) { --sp-avatar-size: 76px; --sp-avatar-radius: 12px; } }
    .tile { width: 100%; height: 100%; border-radius: var(--sp-avatar-radius); overflow: hidden; display: grid; place-items: center;
      background: color-mix(in srgb, var(--sp-primary) 12%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
    ha-icon { --mdc-icon-size: calc(var(--sp-avatar-size) * .54); }
  `], G([R({ attribute: !1 })], q.prototype, "src", void 0), G([R()], q.prototype, "name", void 0), G([R({ reflect: !0 })], q.prototype, "size", void 0), G([R({ attribute: !1 })], q.prototype, "l", void 0), customElements.get("sp-plant-avatar") || customElements.define("sp-plant-avatar", q);
//#endregion
//#region src/components/sp-reading-chip.ts
var et, J = class extends L {
	constructor(...e) {
		super(...e), this.role = "temperature", this.value = null, this.unit = "", this.state = "ok", this.range = null, this.l = z;
	}
	render() {
		let e = this.l, t = H[this.role] ?? H.temperature, n = Ge(e, this.role in H ? this.role : "temperature"), r = Ke(e, this.role, this.range, this.unit), i = (this.state === "low" || this.state === "high") && r;
		return k`<span class="chip" part="chip" title=${r ? `${n}: ${r}` : n}>
      <ha-icon aria-hidden="true" .icon=${t.icon}></ha-icon><span class="sr-only">${n}</span>
      ${this.value === null ? e.t("reading.no_value") : U(e, this.value, this.unit)}
      ${i ? k`<span class="sr-only">, ${e.t("reading.outside_target", { range: r })}</span>` : j}
      ${this.state === "stale" ? k`<span class="sr-only">, ${e.t("reading.not_updating")}</span>` : j}
    </span>`;
	}
};
et = J, et.styles = [
	W,
	Ye,
	o`
    :host { display: inline-flex; }
    .chip {
      display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 9px 0 6px; border-radius: 8px;
      font-size: 13px; font-variant-numeric: tabular-nums; color: var(--sp-text);
      background: color-mix(in srgb, var(--sp-text) 7%, transparent);
    }
    ha-icon { --mdc-icon-size: 17px; color: var(--sp-text-secondary); }
    :host([state="low"]) .chip, :host([state="high"]) .chip {
      background: color-mix(in srgb, var(--sp-error) 15%, transparent);
      color: color-mix(in srgb, var(--sp-error) 50%, var(--sp-text));
    }
    :host([state="low"]) ha-icon, :host([state="high"]) ha-icon { color: inherit; }
    :host([state="stale"]) .chip, :host([state="unavailable"]) .chip { opacity: .6; }
  `
], G([R()], J.prototype, "role", void 0), G([R({ type: Number })], J.prototype, "value", void 0), G([R()], J.prototype, "unit", void 0), G([R({ reflect: !0 })], J.prototype, "state", void 0), G([R({ attribute: !1 })], J.prototype, "range", void 0), G([R({ attribute: !1 })], J.prototype, "l", void 0), customElements.get("sp-reading-chip") || customElements.define("sp-reading-chip", J);
//#endregion
//#region src/components/sp-snooze-chip.ts
var tt, nt = class extends L {
	constructor(...e) {
		super(...e), this.label = "";
	}
	render() {
		return k`<span class="chip" part="chip"><ha-icon aria-hidden="true" icon="mdi:bell-sleep-outline"></ha-icon><span class="label">${this.label}</span></span>`;
	}
};
tt = nt, tt.styles = [W, o`
    :host { display: inline-flex; max-width: 100%; }
    .chip {
      display: inline-flex; align-items: center; gap: 5px; min-height: 26px; max-width: 100%;
      padding: 2px 10px 2px 7px; border-radius: 13px; font-size: 13px; font-weight: 500; line-height: 1.3;
      background: color-mix(in srgb, var(--sp-text) 8%, transparent);
      color: color-mix(in srgb, var(--sp-text-secondary) 60%, var(--sp-text));
    }
    ha-icon { --mdc-icon-size: 17px; flex: none; }
    .label { overflow-wrap: anywhere; hyphens: auto; }
  `], G([R()], nt.prototype, "label", void 0), customElements.get("sp-snooze-chip") || customElements.define("sp-snooze-chip", nt);
//#endregion
//#region src/components/sp-status-chip.ts
var rt, Y = class extends L {
	constructor(...e) {
		super(...e), this.status = "healthy", this.label = "", this.more = 0, this.l = z;
	}
	willUpdate() {
		let e = B[this.status]?.color ?? "--disabled-text-color";
		this.toggleAttribute("muted", e === "--disabled-text-color"), this.style.setProperty("--sp-status", Xe(e));
	}
	render() {
		let e = B[this.status] ?? B.healthy, t = this.label || V(this.l, this.status in B ? this.status : "healthy");
		return k`<span class="chip" part="chip"><ha-icon aria-hidden="true" .icon=${e.icon}></ha-icon><span class="label">${t}</span>${this.more > 0 ? k`<span aria-hidden="true">${this.l.t("plant_status.more", { count: this.more })}</span><span class="sr-only">${this.l.t("plant_status.more_label", { count: this.more })}</span>` : j}</span>`;
	}
};
rt = Y, rt.styles = [
	W,
	Ye,
	o`
    :host { display: inline-flex; max-width: 100%; }
    .chip {
      display: inline-flex; align-items: center; gap: 5px; min-height: 26px; max-width: 100%;
      padding: 2px 10px 2px 7px; border-radius: 13px; font-size: 13px; font-weight: 500; line-height: 1.3;
      background: color-mix(in srgb, var(--sp-status) 16%, transparent);
      color: color-mix(in srgb, var(--sp-status) 50%, var(--sp-text));
    }
    :host([muted]) .chip { color: color-mix(in srgb, var(--sp-status) 35%, var(--sp-text)); }
    ha-icon { --mdc-icon-size: 17px; flex: none; }
    .label { overflow-wrap: anywhere; hyphens: auto; }
  `
], G([R({ reflect: !0 })], Y.prototype, "status", void 0), G([R()], Y.prototype, "label", void 0), G([R({ type: Number })], Y.prototype, "more", void 0), G([R({ attribute: !1 })], Y.prototype, "l", void 0), customElements.get("sp-status-chip") || customElements.define("sp-status-chip", Y);
//#endregion
//#region src/overview-model.ts
var it = {
	too_cold: "problem_kind.too_cold",
	too_hot: "problem_kind.too_hot",
	too_dry: "problem_kind.too_dry",
	too_humid: "problem_kind.too_humid",
	low_light: "problem_kind.low_light",
	low_conductivity: "problem_kind.low_conductivity",
	high_conductivity: "problem_kind.high_conductivity",
	high_co2: "problem_kind.high_co2",
	battery_low: "problem_kind.battery_low"
}, at = {
	too_cold: "problem_kind.soil_too_cold",
	too_hot: "problem_kind.soil_too_hot"
};
function ot(e, t) {
	let n = t.problems[0], r = t.status === "healthy" || t.status === "paused" ? 0 : Math.max(0, t.problems.length - 1);
	if (t.status === "problem" && n) {
		let t = (n.role === "soil_temperature" ? at[n.kind] : void 0) ?? it[n.kind];
		return {
			label: t ? e.t(t) : V(e, "problem"),
			more: r
		};
	}
	return t.status === "no_sensors" && Object.keys(t.roles).length ? {
		label: e.t("plant_status.no_moisture"),
		more: r
	} : t.status === "stale" && n?.kind === "no_main_sensor" ? {
		label: e.t("plant_status.no_main_sensor"),
		more: r
	} : {
		label: V(e, t.status),
		more: r
	};
}
function st(e, t) {
	return t && t.value !== null ? U(e, t.value, t.unit) : null;
}
function ct(e, t, n, r) {
	let i = We(n.role) ? n.role : null, a = i ? t.roles[i] : void 0, o = i ? Ge(e, i) : n.role, s = st(e, a), c = (t) => t == null || !a ? null : U(e, t, a.unit), l = (t) => {
		let n = a?.range[t];
		if (!a || a.value === null || !s || n == null || (t === "min" ? a.value < n : a.value > n) && s !== c(n)) return null;
		let r = c(a.clear[t]);
		return r ? e.t("reason.turns_off_at", {
			role: o,
			value: s,
			limit: r
		}) : e.t("reason.outside_target", { role: o });
	};
	switch (n.kind) {
		case "stale": return a?.last_reported ? e.t("reason.stale", {
			role: o,
			age: Je(e, a.last_reported, r)
		}) : e.t("reason.not_reporting", { role: o });
		case "unavailable": return e.t("reason.not_reporting", { role: o });
		case "no_main_sensor": return e.t("reason.no_main_sensor", { role: o });
		case "no_sensors": return e.t("reason.no_sensors");
		case "low_light": {
			let t = c(a?.range.min);
			return l("min") ?? (s && t ? e.t("reason.low_light", {
				value: s,
				limit: t
			}) : e.t("problem_kind.low_light"));
		}
		case "battery_low": return s ? e.t("reason.battery_low", { value: s }) : e.t("problem_kind.battery_low");
	}
	let u = [
		"needs_water",
		"too_cold",
		"too_dry",
		"low_conductivity"
	].includes(n.kind) ? "low" : [
		"too_wet",
		"too_hot",
		"too_humid",
		"high_conductivity",
		"high_co2"
	].includes(n.kind) ? "high" : null;
	if (u === "low") {
		let t = c(a?.range.min);
		if (s && t) return l("min") ?? e.t("reason.below_min", {
			role: o,
			value: s,
			limit: t
		});
	}
	if (u === "high") {
		let t = c(a?.range.max);
		if (s && t) return l("max") ?? e.t("reason.above_max", {
			role: o,
			value: s,
			limit: t
		});
	}
	return e.t("reason.outside_target", { role: o });
}
function lt(e, t, n) {
	return t.status === "healthy" || t.status === "paused" || t.status === "no_sensors" ? "" : t.problems.slice(0, 2).map((r) => ct(e, t, r, n)).join(" · ");
}
function ut(e, t, n = Date.now()) {
	if (!t) return e.t("card.never_watered");
	let r = Date.parse(t);
	return Number.isFinite(r) && Math.abs(n - r) < 6e4 ? e.t("card.watered_just_now") : e.t("card.watered", { age: Je(e, t, n) });
}
function dt(e) {
	return Object.keys(H).filter((t) => t !== "moisture" && e.roles[t]).map((t) => [t, e.roles[t]]);
}
function ft(e, t) {
	let n = Date.parse(e);
	if (!Number.isFinite(n)) return null;
	let r;
	try {
		r = new Intl.DateTimeFormat("en-CA", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			...t ? { timeZone: t } : {}
		});
	} catch {
		r = new Intl.DateTimeFormat("en-CA", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit"
		});
	}
	let i = Object.fromEntries(r.formatToParts(n).map((e) => [e.type, e.value]));
	return `${i.year}-${i.month}-${i.day}`;
}
//#endregion
//#region src/snooze.ts
var pt = /^(\d{4})-(\d\d)-(\d\d)$/;
function mt(e, t) {
	let n = {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23"
	}, r;
	try {
		r = new Intl.DateTimeFormat("en-CA", {
			...n,
			...t ? { timeZone: t } : {}
		});
	} catch {
		r = new Intl.DateTimeFormat("en-CA", n);
	}
	return Object.fromEntries(r.formatToParts(e).filter((e) => e.type !== "literal").map((e) => [e.type, Number(e.value)]));
}
function ht(e, t = Date.now()) {
	if (!e) return null;
	let n = Date.parse(e);
	return Number.isFinite(n) && n > t ? e : null;
}
function gt(e, t) {
	let n = Date.parse(e);
	if (!Number.isFinite(n)) return null;
	let r = mt(n - 1e3, t);
	return `${String(r.year).padStart(4, "0")}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`;
}
function _t(e, t, n) {
	let r = pt.exec(t);
	if (!r) return t;
	let i = t.slice(0, 4) === n.slice(0, 4);
	return new Intl.DateTimeFormat(e.language, {
		weekday: "short",
		month: "short",
		day: "numeric",
		...i ? {} : { year: "numeric" },
		timeZone: "UTC"
	}).format(Date.UTC(Number(r[1]), Number(r[2]) - 1, Number(r[3])));
}
function vt(e, t, n, r, i = Date.now()) {
	let a = ht(t, i), o = a ? gt(a, r) : null;
	return o ? e.t("snooze.chip", { date: _t(e, o, n).replace(/\s/g, "\xA0") }) : null;
}
//#endregion
//#region src/card/plant-state.ts
var X = "smart_plants", Z = [
	{
		role: "temperature",
		sensor: "temperature_stress",
		kinds: {
			cold_stress: "too_cold",
			hot_stress: "too_hot"
		}
	},
	{
		role: "humidity",
		sensor: "humidity_stress",
		kinds: {
			dry_stress: "too_dry",
			damp_stress: "too_humid"
		}
	},
	{
		role: "illuminance",
		sensor: "low_light",
		kinds: { low_light: "low_light" }
	},
	{
		role: "conductivity",
		sensor: "conductivity_stress",
		kinds: {
			low_conductivity_stress: "low_conductivity",
			high_conductivity_stress: "high_conductivity"
		}
	},
	{
		role: "soil_temperature",
		sensor: "soil_temperature_stress",
		kinds: {
			cold_stress: "too_cold",
			hot_stress: "too_hot"
		}
	},
	{
		role: "co2",
		sensor: "co2_stress",
		kinds: { co2_stress: "high_co2" }
	},
	{
		role: "battery",
		sensor: "low_battery",
		kinds: { low_battery: "battery_low" }
	}
], yt = "stress", bt = /* @__PURE__ */ new Set([
	"needs_water",
	"too_cold",
	"too_dry",
	"low_light",
	"low_conductivity",
	"battery_low"
]), xt = {
	temperature: {
		range: ["cold_threshold_celsius", "hot_threshold_celsius"],
		clear: ["cold_clear_celsius", "hot_clear_celsius"]
	},
	humidity: {
		range: ["dry_threshold_percent", "damp_threshold_percent"],
		clear: ["dry_clear_percent", "damp_clear_percent"]
	},
	illuminance: {
		range: ["target_lux", null],
		clear: ["clear_lux", null]
	},
	conductivity: {
		range: ["low_threshold_micro_siemens_per_cm", "high_threshold_micro_siemens_per_cm"],
		clear: ["low_clear_micro_siemens_per_cm", "high_clear_micro_siemens_per_cm"]
	},
	soil_temperature: {
		range: ["cold_threshold_celsius", "hot_threshold_celsius"],
		clear: ["cold_clear_celsius", "hot_clear_celsius"]
	},
	co2: {
		range: [null, "threshold_ppm"],
		clear: [null, "clear_ppm"]
	},
	battery: {
		range: ["threshold_percent", null],
		clear: ["clear_percent", null]
	}
}, St = /* @__PURE__ */ new Set(["unavailable", "unknown"]), Ct = /* @__PURE__ */ new Set(["on", "off"]), Q = (e) => typeof e == "number" && Number.isFinite(e) ? e : null, wt = (e) => {
	if (!e || St.has(e.state)) return null;
	let t = Number(e.state);
	return e.state.trim() !== "" && Number.isFinite(t) ? t : null;
};
function Tt(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of Object.values(e.entities ?? {})) {
		if (!r || r.device_id !== t || r.platform !== "smart_plants" || !r.translation_key) continue;
		let e = r.entity_id.split(".")[0];
		n.set(`${e}.${r.translation_key}`, r.entity_id);
	}
	return n;
}
function Et(e) {
	return e?.identifiers?.find(([e]) => e === "smart_plants")?.[1] ?? null;
}
function Dt(e) {
	return Object.values(e.devices ?? {}).filter((e) => !!e && Et(e) !== null).sort((e, t) => Ot(e).localeCompare(Ot(t), void 0, { sensitivity: "base" }));
}
var Ot = (e) => e.name_by_user || e.name || "";
function kt(e) {
	if (e.allUnavailable) return {
		status: "paused",
		problems: []
	};
	let t = [], n = e.needs_water === "on" ? "needs_water" : e.too_wet === "on" ? "too_wet" : null;
	n && t.push({
		role: "moisture",
		kind: n
	});
	for (let n of Z) {
		let r = e.stress[n.role];
		r?.state === "on" && t.push({
			role: n.role,
			kind: n.kinds[r.reason ?? ""] ?? yt
		});
	}
	let r = e.moisture !== null && !St.has(e.moisture), i = e.sensor_stale === "on", a = e.sources === null ? r || i : e.sources > 0, o = n !== null || Ct.has(e.needs_water ?? "") && Ct.has(e.too_wet ?? ""), s = a ? i ? "stale" : r && o ? null : "unavailable" : null;
	s && t.push({
		role: "moisture",
		kind: s
	}), a || t.push({
		role: "moisture",
		kind: "no_sensors"
	});
	let c;
	return c = n || (t.some((e) => e.role !== "moisture") ? "problem" : s ? "stale" : a ? "healthy" : "no_sensors"), {
		status: c,
		problems: t
	};
}
function At(e, t) {
	let n = (n) => {
		let r = t.get(n);
		return r ? e.states[r] : void 0;
	}, r = {};
	for (let e of Z) {
		let t = n(`binary_sensor.${e.sensor}`);
		t && (r[e.role] = {
			state: t.state,
			reason: typeof t.attributes.reason == "string" ? t.attributes.reason : null
		});
	}
	let i = [...t.values()];
	return {
		allUnavailable: i.length > 0 && i.every((t) => {
			let n = e.states[t];
			return !n || n.state === "unavailable";
		}),
		moisture: n("sensor.moisture")?.state ?? null,
		needs_water: n("binary_sensor.needs_water")?.state ?? null,
		too_wet: n("binary_sensor.too_wet")?.state ?? null,
		sensor_stale: n("binary_sensor.sensor_stale")?.state ?? null,
		sources: Q(n("binary_sensor.sensor_stale")?.attributes.sources),
		stress: r
	};
}
var jt = /* @__PURE__ */ new Set(["temperature", "soil_temperature"]), Mt = (e, t) => t === "°F" ? Math.round((e * 9 / 5 + 32) * 10) / 10 : t === "K" ? Math.round((e + 273.15) * 100) / 100 : e;
function Nt(e, t, n) {
	let r = xt[e], i = (r) => {
		let i = r && t && !St.has(t.state) ? Q(t.attributes[r]) : null;
		return i !== null && jt.has(e) ? Mt(i, n) : i;
	};
	return {
		range: {
			min: i(r?.range[0] ?? null),
			target: null,
			max: i(r?.range[1] ?? null)
		},
		clear: {
			min: i(r?.clear[0] ?? null),
			max: i(r?.clear[1] ?? null)
		}
	};
}
function Pt(e, t, n) {
	return n ? "stale" : e === null ? "unavailable" : t ? bt.has(t.kind) ? "low" : "high" : "ok";
}
function Ft(e, t) {
	let n = e.devices?.[t], r = Et(n);
	if (!n || !r) return { kind: "missing" };
	let i = Tt(e, t), a = (t) => {
		let n = i.get(t);
		return n ? e.states[n] : void 0;
	}, o = At(e, i), { status: s, problems: c } = kt(o), l = s === "paused", u = {}, d = a("sensor.moisture"), f = wt(d), ee = o.sensor_stale === "on", p = c.every((e) => e.kind !== "no_sensors");
	if (!l && (f !== null || p)) {
		let e = d?.attributes ?? {}, t = Q(e.min), n = Q(e.max);
		u.moisture = {
			value: f,
			unit: "%",
			state: Pt(f, c.find((e) => e.role === "moisture" && (e.kind === "needs_water" || e.kind === "too_wet")), ee),
			range: {
				min: t,
				target: Q(e.target),
				max: n
			},
			clear: {
				min: t === null ? null : t + 2,
				max: n === null ? null : n - 2
			},
			last_reported: null,
			sources: []
		};
	}
	for (let e of Ue) {
		if (e === "moisture" || l) continue;
		let t = a(`sensor.${e}`), n = wt(t);
		if (n === null) continue;
		let r = Z.find((t) => t.role === e), i = typeof t?.attributes.unit_of_measurement == "string" ? t.attributes.unit_of_measurement : "", { range: o, clear: s } = Nt(e, r ? a(`binary_sensor.${r.sensor}`) : void 0, i);
		u[e] = {
			value: n,
			unit: i,
			state: Pt(n, c.find((t) => t.role === e), !1),
			range: o,
			clear: s,
			last_reported: null,
			sources: []
		};
	}
	let m = a("binary_sensor.needs_water"), h = m && "last_watered" in m.attributes ? typeof m.attributes.last_watered == "string" ? m.attributes.last_watered : null : void 0, g = [
		a("binary_sensor.sensor_stale"),
		m,
		...Z.map((e) => a(`binary_sensor.${e.sensor}`))
	].find((e) => e && typeof e.attributes.snoozed_until == "string"), _ = Ue.filter((e) => e !== "moisture").map((e) => i.get(`sensor.${e}`)).find((t) => t !== void 0 && wt(e.states[t]) !== null), te = i.get("sensor.moisture") ?? null, v = n.model?.trim(), y = {
		plant_id: r,
		revision: 0,
		lifecycle_state: l ? "disabled" : "active",
		status: s,
		problems: c,
		roles: u,
		last_watered_at: h ?? null,
		image: null,
		care: [],
		rest_period: null,
		resting: !1,
		snoozed_until: g?.attributes.snoozed_until ?? null
	};
	return {
		kind: "plant",
		deviceId: t,
		plantId: r,
		name: Ot(n),
		area: n.area_id && e.areas?.[n.area_id]?.name || null,
		species: v && v !== "Plant" ? v : null,
		overview: y,
		careDue: !l && a("binary_sensor.care_due")?.state === "on",
		lastWatered: h,
		moreInfoEntity: f !== null || !_ ? te : _
	};
}
//#endregion
//#region src/card/plant-card.ts
var It, Lt = "smart-plants-plant-card-content", Rt = "/smart-plants";
function zt(e) {
	let t = -e.getTimezoneOffset(), n = (e) => String(Math.trunc(Math.abs(e))).padStart(2, "0");
	return `${new Date(e.getTime() + t * 6e4).toISOString().slice(0, 19)}${t < 0 ? "-" : "+"}${n(t / 60)}:${n(t % 60)}`;
}
var Bt = (e) => typeof e == "object" && e && typeof e.code == "string" ? e.code : null, Vt = () => He({ language: document.documentElement.lang || "en" }), $ = class extends L {
	constructor(...e) {
		super(...e), this._config = null, this._busy = !1, this._photo = null, this._photoFor = null, this._photoRequest = 0;
	}
	setConfig(e) {
		this._config = {
			show_readings: !0,
			show_watering: !0,
			...e
		};
	}
	connectedCallback() {
		super.connectedCallback(), this.hasUpdated && this._syncPhoto();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._clearPhoto();
	}
	updated() {
		this._syncPhoto();
	}
	get _l() {
		return He(this.hass);
	}
	get _admin() {
		return this.hass?.user?.is_admin === !0;
	}
	_plant() {
		return !this.hass || !this._config?.device_id ? null : Ft(this.hass, this._config.device_id);
	}
	_syncPhoto() {
		let e = this._plant(), t = e?.kind === "plant" && this._admin && this.isConnected ? e.plantId : null;
		if (t === this._photoFor || (this._clearPhoto(), this._photoFor = t, !t || !this.hass)) return;
		let n = ++this._photoRequest, r = this.hass, i = `/api/${X}/plants/${encodeURIComponent(t)}/image`;
		(r.fetchWithAuth ? r.fetchWithAuth(i) : fetch(i, { credentials: "same-origin" })).then(async (e) => {
			if (!e.ok) return;
			let t = await e.blob();
			n === this._photoRequest && t.type.startsWith("image/") && t.size && (this._photo = URL.createObjectURL(t));
		}).catch(() => void 0);
	}
	_clearPhoto() {
		this._photoRequest++, this._photo && URL.revokeObjectURL(this._photo), this._photo = null, this._photoFor = null;
	}
	_toast(e, t) {
		this.dispatchEvent(new CustomEvent("hass-notification", {
			bubbles: !0,
			composed: !0,
			detail: {
				message: e,
				duration: t ? 8e3 : 4e3,
				...t ? { action: t } : {}
			}
		}));
	}
	_navigate(e) {
		history.pushState(null, "", e), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !1 } }));
	}
	_open(e, t) {
		if (this._admin) {
			this._navigate(`${Rt}/plant/${encodeURIComponent(e.plantId)}${t ? `/${t}` : ""}`);
			return;
		}
		e.moreInfoEntity && this.dispatchEvent(new CustomEvent("hass-more-info", {
			bubbles: !0,
			composed: !0,
			detail: { entityId: e.moreInfoEntity }
		}));
	}
	async _logWatering(e) {
		if (!this.hass || this._busy) return;
		let t = this.hass, n = this._l, r = zt(/* @__PURE__ */ new Date());
		this._busy = !0;
		try {
			let i = this._admin ? await this._wateringIds(t, e) : null;
			await t.callService(X, "log_care", {
				kind: "watering",
				occurred_at: r
			}, { device_id: e.deviceId }, !1);
			let a = n.t("watering.logged", { name: e.name });
			i ? this._toast(a, {
				text: n.t("watering.undo"),
				action: () => void this._undo(e, i, r)
			}) : this._toast(a);
		} catch (t) {
			this._toast(Bt(t) === "unauthorized" ? n.t("plant_card.unauthorized") : n.t("plant_card.log_failed", { name: e.name }));
		} finally {
			this._busy = !1;
		}
	}
	async _wateringIds(e, t) {
		if (!e.callWS) return null;
		try {
			let n = await e.callWS({
				type: `${X}/care/list`,
				plant_id: t.plantId
			});
			return new Set(n.events.filter((e) => e.kind === "watering").map((e) => e.id));
		} catch {
			return null;
		}
	}
	async _undo(e, t, n) {
		let r = this.hass, i = this._l;
		if (r?.callWS) try {
			let a = await r.callWS({
				type: `${X}/care/list`,
				plant_id: e.plantId
			}), o = Date.parse(n), s = a.events.filter((e) => e.kind === "watering" && !t.has(e.id)).sort((e, t) => Math.abs(Date.parse(e.occurred_at) - o) - Math.abs(Date.parse(t.occurred_at) - o))[0];
			if (!s) throw Error("not found");
			await r.callWS({
				type: `${X}/care/delete`,
				plant_id: e.plantId,
				expected_revision: a.revision,
				event_id: s.id
			}), this._toast(i.t("watering.removed", { name: e.name }));
		} catch {
			this._toast(i.t("plant_card.undo_failed", { name: e.name }));
		}
	}
	render() {
		if (!this._config || !this.hass) return j;
		let e = this._l;
		if (!this._config.device_id) return this._warning(e.t("plant_card.name"), e.t("plant_card.no_plant"));
		let t = this._plant();
		return !t || t.kind === "missing" ? this._warning(e.t("plant_card.missing_title"), e.t("plant_card.missing_body")) : this._renderPlant(t, e);
	}
	_warning(e, t) {
		return k`<ha-card><div class="warning" role="alert"><ha-icon aria-hidden="true" icon="mdi:alert-outline"></ha-icon><div><strong>${e}</strong><p>${t}</p></div></div></ha-card>`;
	}
	_renderPlant(e, t) {
		let n = this._config, r = e.overview, i = r.status === "paused", a = ot(t, r), o = i ? t.t("plant_card.paused") : lt(t, r), s = Date.now(), c = typeof this.hass?.config?.time_zone == "string" ? this.hass.config.time_zone : void 0, l = i ? null : vt(t, r.snoozed_until, ft(new Date(s).toISOString(), c) ?? "", c, s), u = this._admin || e.moreInfoEntity !== null, d = t.t(this._admin ? "plant_card.open_label" : "plant_card.details_label", { name: e.name });
		return k`<ha-card>
      <div class="head"><sp-plant-avatar .src=${this._photo} .name=${e.name} .l=${t} @photo-error=${() => this._clearPhoto()}></sp-plant-avatar>
        <div class="title"><h2>${u ? k`<button type="button" class="name" title=${d} @click=${() => this._open(e)}>${e.name}</button>` : e.name}</h2>
          ${e.area || e.species ? k`<span class="sub" title=${[e.area, e.species].filter(Boolean).join(" · ")}>${e.area ? k`<ha-icon aria-hidden="true" icon="mdi:texture-box"></ha-icon>` : j}<span class="subtext">${e.area ?? j}${e.area && e.species ? " · " : ""}${e.species ? k`<i>${e.species}</i>` : j}</span></span>` : j}</div></div>
      <div class="status"><div class="chiprow"><sp-status-chip .status=${r.status} .label=${a.label} .more=${a.more} .l=${t}></sp-status-chip>${l ? k`<sp-snooze-chip .label=${l}></sp-snooze-chip>` : j}</div>${o ? k`<span class="reason">${o}</span>` : j}</div>
      ${e.careDue ? k`<p class="care"><ha-icon aria-hidden="true" icon="mdi:calendar-check-outline"></ha-icon><span>${t.t("plant_card.care_due")}</span></p>` : j}
      ${n.show_readings === !1 ? j : this._renderReadings(e, t)}
      ${n.show_watering === !1 ? j : k`<div class="foot">${e.lastWatered === void 0 ? j : k`<span class="last"><ha-icon aria-hidden="true" icon="mdi:history"></ha-icon>${ut(t, e.lastWatered, s)}</span>`}
        <button type="button" class="tonal" ?disabled=${i || this._busy} aria-label=${t.t("card.log_watering_label", { name: e.name })} @click=${() => void this._logWatering(e)}><ha-icon aria-hidden="true" icon="mdi:water"></ha-icon>${t.t("card.log_watering")}</button></div>`}
    </ha-card>`;
	}
	_renderReadings(e, t) {
		let n = e.overview, r = n.roles.moisture, i = dt(n);
		return n.status === "no_sensors" && !i.length ? k`<div class="empty-box"><span>${t.t("card.no_sensors")}</span>${this._admin ? k`<button type="button" class="text-button" aria-label=${t.t("card.assign_label", { name: e.name })} @click=${() => this._open(e, "sensors")}>${t.t("card.assign")}</button>` : j}</div>` : !r && !i.length ? j : k`<div class="readings">
      ${r ? k`<sp-moisture-bar .value=${r.value} .range=${r.range} .state=${r.state} .l=${t}></sp-moisture-bar>` : j}
      ${i.length ? k`<div class="chips">${i.map(([e, n]) => k`<sp-reading-chip .role=${e} .value=${n.value} .unit=${n.unit} .state=${n.state} .range=${n.range} .l=${t}></sp-reading-chip>`)}</div>` : j}
    </div>`;
	}
};
It = $, It.styles = [W, o`
    :host { display: block; container-type: inline-size; }
    ha-card { display: flex; flex-direction: column; height: 100%; overflow: hidden; position: relative; color: var(--sp-text);
      background: var(--ha-card-background, var(--sp-card)); border-radius: var(--ha-card-border-radius, 12px);
      border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0)); box-shadow: var(--ha-card-box-shadow, none); }
    button { font: inherit; color: inherit; }
    :focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
    ha-icon { flex: none; }
    .head { display: flex; gap: 12px; padding: 14px 14px 10px; align-items: flex-start; }
    .title { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    h2 { margin: 0; font-size: 16px; font-weight: 500; line-height: 1.3; }
    .name { all: unset; cursor: pointer; overflow-wrap: anywhere; }
    .name:hover { text-decoration: underline; text-underline-offset: 3px; }
    .name:focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 2px; border-radius: 2px; }
    .sub { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; font-size: 13px; color: var(--sp-text-secondary); }
    .sub ha-icon { --mdc-icon-size: 16px; }
    .status { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 0 14px 10px; }
    .chiprow { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; max-width: 100%; }
    .reason { font-size: 13px; color: var(--sp-text-secondary); overflow-wrap: anywhere; hyphens: auto; }
    .care { display: flex; align-items: center; gap: 6px; margin: 0 14px 10px; font-size: 13px; color: color-mix(in srgb, var(--sp-care) 55%, var(--sp-text)); }
    .care ha-icon { --mdc-icon-size: 17px; }
    .readings { display: flex; flex-direction: column; gap: 10px; padding: 4px 14px 12px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .empty-box { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 14px 12px; padding: 10px 12px;
      border: 1px dashed var(--divider-color, #e0e0e0); border-radius: 8px; font-size: 13px; color: var(--sp-text-secondary); }
    .text-button { border: 0; background: transparent; color: color-mix(in srgb, var(--sp-primary) 70%, var(--sp-text)); font-weight: 500; cursor: pointer; padding: 6px 10px; border-radius: 16px; }
    .text-button:hover { background: color-mix(in srgb, var(--sp-primary) 10%, transparent); }
    .foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px 6px 14px;
      border-top: 1px solid var(--divider-color, #e0e0e0); }
    .last { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--sp-text-secondary); min-width: 0; }
    .last ha-icon { --mdc-icon-size: 17px; }
    .tonal { display: inline-flex; align-items: center; gap: 6px; height: 36px; margin-left: auto; padding: 0 14px; border: 0; border-radius: 18px; cursor: pointer; font-size: 13px; font-weight: 500; white-space: nowrap;
      background: color-mix(in srgb, var(--sp-primary) 14%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
    .tonal ha-icon { --mdc-icon-size: 17px; }
    .tonal:disabled { opacity: .5; cursor: default; }
    .warning { display: flex; gap: 10px; padding: 14px; background: color-mix(in srgb, var(--sp-warning) 14%, var(--sp-card)); }
    .warning ha-icon { color: color-mix(in srgb, var(--sp-warning) 70%, var(--sp-text)); }
    .warning p { margin: 2px 0 0; font-size: 13px; }
    .warning strong { font-weight: 500; }
    /* A narrow card, such as half a section: area and species stay on one line,
       and the last watering gets its own row above the button. */
    @container (max-width: 300px) {
      .sub { flex-wrap: nowrap; min-width: 0; }
      .subtext { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
      .foot { flex-wrap: wrap; row-gap: 4px; padding: 6px 8px 8px 14px; }
      .last { flex: 1 1 100%; }
    }
    /* Half of the narrowest section: a smaller photo leaves room for the name. */
    @container (max-width: 200px) {
      .head { gap: 10px; padding: 12px 12px 8px; }
      sp-plant-avatar { --sp-avatar-size: 40px; --sp-avatar-radius: 10px; }
      .status { padding: 0 12px 10px; }
      .care { margin: 0 12px 10px; }
      .readings { padding: 4px 12px 12px; }
      .empty-box { margin: 0 12px 12px; }
      .foot { padding: 6px 6px 8px 12px; }
      .warning { padding: 12px; }
    }
  `], G([R({ attribute: !1 })], $.prototype, "hass", void 0), G([je()], $.prototype, "_config", void 0), G([je()], $.prototype, "_busy", void 0), G([je()], $.prototype, "_photo", void 0), customElements.get("smart-plants-plant-card-content") || customElements.define(Lt, $);
function Ht() {
	let e = Vt(), t = {
		device_id: "plant_card.editor_plant",
		show_readings: "plant_card.editor_show_readings",
		show_watering: "plant_card.editor_show_watering"
	}, n = {
		show_readings: "plant_card.editor_show_readings_help",
		show_watering: "plant_card.editor_show_watering_help"
	};
	return {
		schema: [
			{
				name: "device_id",
				required: !0,
				selector: { device: { filter: { integration: X } } }
			},
			{
				name: "show_readings",
				default: !0,
				selector: { boolean: {} }
			},
			{
				name: "show_watering",
				default: !0,
				selector: { boolean: {} }
			}
		],
		computeLabel: (n) => t[n.name] ? e.t(t[n.name]) : void 0,
		computeHelper: (t) => n[t.name] ? e.t(n[t.name]) : void 0
	};
}
function Ut(e) {
	let t = Dt(e), n = t.find((t) => {
		let n = Ft(e, t.id);
		return n.kind === "plant" && n.overview.status === "needs_water";
	}) ?? t[0];
	return {
		...n ? { device_id: n.id } : {},
		show_readings: !0,
		show_watering: !0
	};
}
//#endregion
export { Lt as CONTENT_ELEMENT, Rt as PANEL_PATH, $ as SmartPlantsPlantCardContent, Ht as getConfigForm, Ut as getStubConfig };

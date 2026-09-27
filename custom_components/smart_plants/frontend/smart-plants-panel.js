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
})(e) : e, l, { is: u, defineProperty: d, getOwnPropertyDescriptor: ee, getOwnPropertyNames: te, getOwnPropertySymbols: ne, getPrototypeOf: re } = Object, f = globalThis, ie = f.trustedTypes, ae = ie ? ie.emptyScript : "", oe = f.reactiveElementPolyfillSupport, p = (e, t) => e, m = {
	toAttribute(e, t) {
		/**
		* @license
		* Copyright 2017 Google LLC
		* SPDX-License-Identifier: BSD-3-Clause
		*/
		switch (t) {
			case Boolean:
				e = e ? ae : null;
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
}, se = (e, t) => !u(e, t), ce = {
	attribute: !0,
	type: String,
	converter: m,
	reflect: !1,
	useDefault: !1,
	hasChanged: se
};
(l = Symbol).metadata ?? (l.metadata = Symbol("metadata")), f.litPropertyMetadata ?? (f.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
var h = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ?? (this.l = [])).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ce) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && d(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = ee(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? ce;
	}
	static _$Ei() {
		if (this.hasOwnProperty(p("elementProperties"))) return;
		let e = re(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(p("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(p("properties"))) {
			let e = this.properties, t = [...te(e), ...ne(e)];
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
			let i = (n.converter?.toAttribute === void 0 ? m : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? m : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ?? (n = a.getPropertyOptions(e)), !((n.hasChanged ?? se)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
h.elementStyles = [], h.shadowRootOptions = { mode: "open" }, h[p("elementProperties")] = /* @__PURE__ */ new Map(), h[p("finalized")] = /* @__PURE__ */ new Map(), oe?.({ ReactiveElement: h }), (f.reactiveElementVersions ?? (f.reactiveElementVersions = [])).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
var le = globalThis, ue = (e) => e, de = le.trustedTypes, fe = de ? de.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, pe = "$lit$", g = `lit$${Math.random().toFixed(9).slice(2)}$`, me = "?" + g, he = `<${me}>`, _ = document, v = () => _.createComment(""), y = (e) => e === null || typeof e != "object" && typeof e != "function", ge = Array.isArray, _e = (e) => ge(e) || typeof e?.[Symbol.iterator] == "function", ve = "[ 	\n\f\r]", b = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ye = /-->/g, be = />/g, x = RegExp(`>|${ve}(?:([^\\s"'>=/]+)(${ve}*=${ve}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), xe = /'/g, Se = /"/g, Ce = /^(?:script|style|textarea|title)$/i, S = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), C = Symbol.for("lit-noChange"), w = Symbol.for("lit-nothing"), we = /* @__PURE__ */ new WeakMap(), T = _.createTreeWalker(_, 129);
function Te(e, t) {
	if (!ge(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return fe === void 0 ? t : fe.createHTML(t);
}
var Ee = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = b;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === b ? c[1] === "!--" ? o = ye : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = x) : (Ce.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = x) : o = be : o === x ? c[0] === ">" ? (o = i ?? b, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? x : c[3] === "\"" ? Se : xe) : o === Se || o === xe ? o = x : o === ye || o === be ? o = b : (o = x, i = void 0);
		let d = o === x && e[t + 1].startsWith("/>") ? " " : "";
		a += o === b ? n + he : l >= 0 ? (r.push(s), n.slice(0, l) + pe + n.slice(l) + g + d) : n + g + (l === -2 ? t : d);
	}
	return [Te(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, De = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Ee(t, n);
		if (this.el = e.createElement(l, r), T.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = T.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(pe)) {
					let t = u[o++], n = i.getAttribute(e).split(g), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? je : r[1] === "?" ? Me : r[1] === "@" ? Ne : Ae
					}), i.removeAttribute(e);
				} else e.startsWith(g) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Ce.test(i.tagName)) {
					let e = i.textContent.split(g), t = e.length - 1;
					if (t > 0) {
						i.textContent = de ? de.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], v()), T.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], v());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === me) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(g, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += g.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = _.createElement("template");
		return n.innerHTML = e, n;
	}
};
function E(e, t, n = e, r) {
	if (t === C) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = y(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ?? (n._$Co = []))[r] = i), i !== void 0 && (t = E(e, i._$AS(e, t.values), i, r)), t;
}
var Oe = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? _).importNode(t, !0);
		T.currentNode = r;
		let i = T.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new ke(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Pe(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = T.nextNode(), a++);
		}
		return T.currentNode = _, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, ke = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = w, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = E(this, e, t), y(e) ? e === w || e == null || e === "" ? (this._$AH !== w && this._$AR(), this._$AH = w) : e !== this._$AH && e !== C && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? _e(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== w && y(this._$AH) ? this._$AA.nextSibling.data = e : this.T(_.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = De.createElement(Te(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Oe(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = we.get(e.strings);
		return t === void 0 && we.set(e.strings, t = new De(e)), t;
	}
	k(t) {
		ge(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(v()), this.O(v()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ue(e).nextSibling;
			ue(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, Ae = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = w, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = w;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = E(this, e, t, 0), a = !y(e) || e !== this._$AH && e !== C, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = E(this, r[n + o], t, o), s === C && (s = this._$AH[o]), a || (a = !y(s) || s !== this._$AH[o]), s === w ? e = w : e !== w && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === w ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, je = class extends Ae {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === w ? void 0 : e;
	}
}, Me = class extends Ae {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== w);
	}
}, Ne = class extends Ae {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = E(this, e, t, 0) ?? w) === C) return;
		let n = this._$AH, r = e === w && n !== w || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== w && (n === w || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Pe = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		E(this, e);
	}
}, Fe = le.litHtmlPolyfillSupport;
Fe?.(De, ke), (le.litHtmlVersions ?? (le.litHtmlVersions = [])).push("3.3.3");
var Ie = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new ke(t.insertBefore(v(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Le = globalThis, D = class extends h {
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
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ie(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return C;
	}
};
D._$litElement$ = !0, D.finalized = !0, Le.litElementHydrateSupport?.({ LitElement: D });
var Re = Le.litElementPolyfillSupport;
Re?.({ LitElement: D }), (Le.litElementVersions ?? (Le.litElementVersions = [])).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/property.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/ var ze = {
	attribute: !0,
	type: String,
	converter: m,
	reflect: !1,
	hasChanged: se
}, Be = (e = ze, t, n) => {
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
function O(e) {
	return (t, n) => typeof n == "object" ? Be(e, t, n) : ((e, t, n) => {
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
*/ function k(e) {
	return O({
		...e,
		state: !0,
		attribute: !1
	});
}
//#endregion
//#region src/validation.ts
var A = (e) => typeof e == "object" && !!e && !Array.isArray(e), j = (e, t = 500) => typeof e == "string" && e.length > 0 && e.length <= t, M = (e, t = 500) => e === null || j(e, t), N = (e, t, n) => typeof e == "number" && Number.isSafeInteger(e) && e >= t && e <= n, P = (e) => j(e, 64) && /^\d{4}-\d\d-\d\dT/.test(e) && Number.isFinite(Date.parse(e)), Ve = (e, t) => A(e) && Object.keys(e).length <= 32 && Object.entries(e).every(([e, n]) => j(e, 60) && t(n)), F = {
	provider: (e) => j(e, 60),
	provider_id: (e) => M(e, 200),
	provider_ref: (e) => M(e, 200),
	fetched_at: P,
	locale: (e) => typeof e == "string" && /^(und|[a-z]{2}(?:-[A-Z]{2})?)$/.test(e),
	source_status: (e) => e === "manual" || e === "provider",
	attribution: (e) => j(e),
	common_name: M,
	latin_name: M,
	category: M,
	confidence: (e) => e === null || typeof e == "number" && Number.isFinite(e) && e >= 0 && e <= 1,
	care_text: (e) => Ve(e, (e) => j(e, 4e3)),
	field_sources: (e) => Ve(e, j),
	threshold_defaults: (e) => Ve(e, (e) => Ve(e, (e) => typeof e == "number" && Number.isSafeInteger(e)))
};
function He(e) {
	if (!A(e) || !Object.keys(e).every((e) => Object.hasOwn(F, e)) || !Object.entries(F).every(([t, n]) => n(e[t]))) return !1;
	let t = [
		"common_name",
		"latin_name",
		"category",
		"confidence"
	].filter((t) => e[t] !== null);
	t.push(...Object.keys(e.care_text), ...Object.entries(e.threshold_defaults).flatMap(([e, t]) => Object.keys(t).map((t) => `${e}_${t}`)));
	let n = e.field_sources;
	return new TextEncoder().encode(JSON.stringify(e)).length <= 32768 && new Set(t).size === Object.keys(n).length && t.every((t) => n[t] === e.attribution) && (e.source_status !== "manual" || e.provider === "manual" && e.provider_ref === null) && (e.source_status !== "provider" || e.provider !== "manual" && j(e.provider_ref, 200));
}
function I(e) {
	if (!A(e)) return !1;
	let t = e.placement, n = e.species, r = e.image;
	return j(e.id, 200) && N(e.revision, 1, 2 ** 53 - 1) && j(e.name, 200) && P(e.created_at) && (e.acquired_at === null || P(e.acquired_at)) && ["active", "disabled"].includes(String(e.lifecycle_state)) && M(e.category, 60) && Array.isArray(e.tags) && e.tags.length <= 32 && e.tags.every((e) => j(e, 60)) && new Set(e.tags).size === e.tags.length && (t === null || A(t) && j(t.mode, 60) && M(t.exposure, 60) && M(t.rain_exposure, 60) && (t.container === null || typeof t.container == "boolean")) && (n === null || A(n) && He(n.snapshot) && A(n.snapshot) && n.provider === n.snapshot.provider) && (r === null || A(r) && j(r.id, 200) && r.content_type === "image/webp" && N(r.width, 1, 2048) && N(r.height, 1, 2048) && P(r.created_at)) && (e.care_events === void 0 || Array.isArray(e.care_events) && e.care_events.length <= 256 && e.care_events.every(Ue));
}
function Ue(e) {
	if (!A(e) || e.schema_version !== 1 || !j(e.id, 36) || ![
		"watering",
		"fertilizing",
		"pruning",
		"repotting",
		"note"
	].includes(String(e.kind)) || e.provenance !== "manual" || !P(e.occurred_at) || !/(?:Z|[+-]\d\d:\d\d)$/.test(String(e.occurred_at)) || typeof e.local_date != "string" || !/^\d{4}-\d\d-\d\d$/.test(e.local_date) || e.local_date !== String(e.occurred_at).slice(0, 10) || !P(e.created_at) || !P(e.updated_at) || !A(e.payload)) return !1;
	let t = e.payload, n = (e) => e === null || j(e, 500) && e === e.trim();
	return e.kind === "watering" ? Object.keys(t).length === 1 && n(t.note) : e.kind === "fertilizing" ? Object.keys(t).length === 4 && (t.product === null || j(t.product, 120) && t.product === t.product.trim()) && (t.amount === null || typeof t.amount == "number" && Number.isFinite(t.amount) && t.amount > 0 && t.amount <= 1e5) && (t.amount === null && t.unit === null || t.amount !== null && ["g", "mL"].includes(String(t.unit))) && n(t.note) : e.kind === "pruning" ? Object.keys(t).length === 2 && (t.part === null || j(t.part, 120) && t.part === t.part.trim()) && n(t.note) : e.kind === "repotting" ? Object.keys(t).length === 3 && (t.container === null || j(t.container, 120) && t.container === t.container.trim()) && (t.medium === null || j(t.medium, 120) && t.medium === t.medium.trim()) && n(t.note) : Object.keys(t).length === 1 && j(t.text, 1e3) && t.text === t.text.trim();
}
function We(e, t) {
	let n = (e) => {
		let t = e.match(/\.(\d{1,6})(?=Z|[+-]\d\d:\d\d$)/)?.[1] ?? "", n = Number(t.padEnd(6, "0")), r = e.replace(/\.\d{1,6}(?=Z|[+-]\d\d:\d\d$)/, "");
		return [Date.parse(r) + Math.floor(n / 1e3), n % 1e3];
	}, r = n(String(e.occurred_at)), i = n(String(t.occurred_at));
	return i[0] - r[0] || i[1] - r[1] || (String(e.id) < String(t.id) ? -1 : +(String(e.id) > String(t.id)));
}
function Ge(e) {
	if (!A(e) || !N(e.revision, 1, 2 ** 53 - 1) || !Array.isArray(e.events) || e.events.length > 256 || !e.events.every(Ue) || !A(e.summary)) return !1;
	let t = e.events, n = e.summary, r = t.filter((e) => e.kind === "watering");
	return new Set(t.map((e) => e.id)).size === t.length && n.watering_count === r.length && t.every((e, n) => n === 0 || We(t[n - 1], e) <= 0) && n.last_watered_at === (r[0]?.occurred_at ?? null) && n.last_watered_local_date === (r[0]?.local_date ?? null);
}
function Ke(e, t) {
	return !A(e) || !j(e.preview_token, 200) || !He(e.snapshot) || !A(e.snapshot) || e.provider !== e.snapshot.provider || !A(e.diff) || !Object.entries(e.diff).every(([e, t]) => A(t) && Object.hasOwn(F, e) && (t.before === null || F[e](t.before)) && F[e](t.after)) || t.provider !== void 0 && (e.provider !== t.provider || e.snapshot.provider_ref !== t.provider_ref) ? !1 : e.operation === (t.type === "smart_plants/species/refresh_preview" ? "refresh" : "select") && (t.type !== "smart_plants/wizard/preview" || e.draft_id === t.draft_id && e.revision === 0);
}
function qe(e) {
	return A(e) && j(e.entity_id, 255) && typeof e.state == "string" && P(e.last_updated) && A(e.attributes) && [
		"friendly_name",
		"unit_of_measurement",
		"device_class"
	].every((t) => e.attributes && A(e.attributes) && (e.attributes[t] === void 0 || e.attributes[t] === null || typeof e.attributes[t] == "string"));
}
var Je = /* @__PURE__ */ new Set([
	"high",
	"medium",
	"low",
	"unknown"
]);
function Ye(e) {
	return !A(e) || typeof e.available != "boolean" || typeof e.confidence != "number" || !Number.isFinite(e.confidence) || e.confidence < 0 || e.confidence > 1 || typeof e.confidence_label != "string" || !Je.has(e.confidence_label) || !Array.isArray(e.contributors) || !e.contributors.every((e) => j(e, 60)) || !Array.isArray(e.configured) || !e.configured.every((e) => j(e, 60)) || !Array.isArray(e.reasons) || !e.reasons.every((e) => j(e, 4e3)) ? !1 : e.available ? N(e.health_score, 0, 100) : e.health_score === null;
}
function Xe(e) {
	return !A(e) || typeof e.computed_available != "boolean" || typeof e.sensor_stale != "boolean" || !Array.isArray(e.reasons) || !e.reasons.every((e) => j(e, 4e3)) ? !1 : e.computed_available ? typeof e.computed_percent == "number" && Number.isFinite(e.computed_percent) && e.computed_percent >= 0 && e.computed_percent <= 100 && N(e.health_score, 0, 100) && typeof e.needs_water == "boolean" && typeof e.too_wet == "boolean" : e.computed_percent === null && e.health_score === null && e.needs_water === null && e.too_wet === null;
}
function Ze(e, t) {
	let n = String(e.type);
	if (!n.startsWith("smart_plants/") || n === "smart_plants/panel/info") return !0;
	if (!A(t)) return !1;
	if (n === "smart_plants/wizard/start") return typeof t.draft_id == "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(t.draft_id) && typeof t.draft_token == "string" && /^[A-Za-z0-9_-]{43}$/.test(t.draft_token) && t.revision === 0 && N(t.expires_in, 1, 600);
	if (n.endsWith("/preview") || n.endsWith("/refresh_preview")) return Ke(t, e);
	if (n === "smart_plants/species/search") return Array.isArray(t.results) && t.results.length <= 50 && t.results.every((t) => A(t) && t.provider === e.provider && j(t.provider_ref, 100) && j(t.latin_name) && M(t.common_name) && M(t.category) && j(t.attribution));
	if (n === "smart_plants/moisture/evaluation") return Xe(t.evaluation);
	if (n === "smart_plants/plants/health") return Ye(t.evaluation);
	if (n === "smart_plants/care/list") return Ge(t);
	if ([
		"smart_plants/care/add_watering",
		"smart_plants/care/add",
		"smart_plants/care/edit"
	].includes(n)) {
		if (!I(t.plant) || !A(t.plant) || t.plant.id !== e.plant_id || !Ue(t.event) || !A(t.event) || !Array.isArray(t.plant.care_events)) return !1;
		let r = t.plant.care_events, i = t.event;
		if (!r.some((e) => e.id === i.id && JSON.stringify(e) === JSON.stringify(i))) return !1;
		let a = n === "smart_plants/care/add_watering" ? "watering" : e.kind, o = n === "smart_plants/care/add_watering" ? { note: e.note } : e.payload;
		return i.kind !== a || i.occurred_at !== e.occurred_at || JSON.stringify(i.payload) !== JSON.stringify(o) || n === "smart_plants/care/edit" && i.id !== e.event_id || t.plant.revision !== Number(e.expected_revision) + 1 ? !1 : Ge({
			revision: t.plant.revision,
			events: [...r].sort(We),
			summary: t.summary
		});
	}
	return n === "smart_plants/care/delete" ? !I(t.plant) || !A(t.plant) || t.plant.id !== e.plant_id || !Array.isArray(t.plant.care_events) ? !1 : t.plant.revision === Number(e.expected_revision) + 1 && !t.plant.care_events.some((t) => A(t) && t.id === e.event_id) && Ge({
		revision: t.plant.revision,
		events: [...t.plant.care_events].sort((e, t) => We(e, t)),
		summary: t.summary
	}) : n === "smart_plants/plants/list" ? Array.isArray(t.plants) && t.plants.every(I) && new Set(t.plants.map((e) => e.id)).size === t.plants.length : n === "smart_plants/roles/list" ? Array.isArray(t.roles) && t.roles.every((e) => A(e) && j(e.role) && j(e.source_domain) && Array.isArray(e.aggregations) && e.aggregations.every((e) => j(e)) && Array.isArray(e.thresholds) && e.thresholds.every((e) => A(e) && j(e.key) && j(e.entity_role) && j(e.translation_key)) && Array.isArray(e.entities) && e.entities.every((e) => A(e) && j(e.role) && j(e.platform) && j(e.translation_key))) : n === "smart_plants/plants/delete" ? Object.keys(t).length === 0 : I(t.plant) && A(t.plant) && (e.plant_id === void 0 || t.plant.id === e.plant_id);
}
//#endregion
//#region src/api.ts
var L = class extends Error {
	constructor(e, t) {
		super(t), this.code = e, this.name = "ApiError";
	}
};
function Qe(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	return typeof t.code == "string" || typeof t.error == "object";
}
async function R(e, t) {
	try {
		let n = await e.connection.sendMessagePromise(t);
		if (!Ze(t, n)) throw new L("invalid_response", "The response is incompatible. Refresh and retry.");
		return n;
	} catch (e) {
		if (e instanceof L) throw e;
		if (Qe(e)) {
			let t = e.error?.code ?? e.code ?? "unknown_error";
			throw new L(typeof t == "string" ? t : "unknown_error", "Request failed. Review your input, refresh and retry.");
		}
		throw new L("unknown_error", "Request failed. Refresh and retry when connected.");
	}
}
var z = {
	careHistory(e, t) {
		return R(e, {
			type: "smart_plants/care/list",
			plant_id: t
		});
	},
	async addWatering(e, t, n, r, i) {
		return R(e, {
			type: "smart_plants/care/add_watering",
			plant_id: t,
			expected_revision: n,
			occurred_at: r,
			note: i
		});
	},
	async addCareEvent(e, t, n, r, i, a) {
		return R(e, {
			type: "smart_plants/care/add",
			plant_id: t,
			expected_revision: n,
			kind: r,
			occurred_at: i,
			payload: a
		});
	},
	async editCareEvent(e, t, n, r, i, a, o) {
		return R(e, {
			type: "smart_plants/care/edit",
			plant_id: t,
			expected_revision: n,
			event_id: r,
			kind: i,
			occurred_at: a,
			payload: o
		});
	},
	async deleteCareEvent(e, t, n, r) {
		return R(e, {
			type: "smart_plants/care/delete",
			plant_id: t,
			expected_revision: n,
			event_id: r
		});
	},
	async info(e) {
		let t = await R(e, { type: "smart_plants/panel/info" });
		if (!t || t.api_version !== 1 || t.schema_version !== 1 || !Array.isArray(t.providers) || !t.providers.every((e) => e && typeof e.provider == "string" && typeof e.available == "boolean" && typeof e.search_supported == "boolean")) throw new L("version_mismatch", "Panel/API version mismatch. Restart Home Assistant and fully reload the frontend after upgrading.");
		return t;
	},
	startWizard(e) {
		return R(e, { type: "smart_plants/wizard/start" });
	},
	previewWizard(e, t, n, r, i) {
		return R(e, {
			type: "smart_plants/wizard/preview",
			draft_id: t.draft_id,
			draft_token: t.draft_token,
			expected_revision: 0,
			provider: n,
			provider_ref: r,
			locale: i
		});
	},
	async createWizard(e, t) {
		return (await R(e, {
			type: "smart_plants/wizard/create",
			...t
		})).plant;
	},
	async configureMoisture(e, t, n, r) {
		return (await R(e, {
			type: "smart_plants/moisture/configure",
			plant_id: t,
			expected_revision: n,
			moisture: r
		})).plant;
	},
	async evaluation(e, t) {
		return (await R(e, {
			type: "smart_plants/moisture/evaluation",
			plant_id: t
		})).evaluation;
	},
	async plantHealth(e, t) {
		return (await R(e, {
			type: "smart_plants/plants/health",
			plant_id: t
		})).evaluation;
	},
	async areas(e) {
		return $e(await R(e, { type: "config/area_registry/list" }), (e) => typeof e.area_id == "string" && typeof e.name == "string");
	},
	async entities(e) {
		return $e(await R(e, { type: "config/entity_registry/list" }), (e) => typeof e.id == "string" && typeof e.entity_id == "string" && typeof e.unique_id == "string" && typeof e.platform == "string" && (e.device_id === null || typeof e.device_id == "string"));
	},
	async devices(e) {
		return $e(await R(e, { type: "config/device_registry/list" }), (e) => typeof e.id == "string" && (e.area_id === null || typeof e.area_id == "string") && Array.isArray(e.identifiers) && e.identifiers.every((e) => Array.isArray(e) && e.length === 2 && e.every((e) => typeof e == "string")));
	},
	async states(e) {
		return $e(await R(e, { type: "get_states" }), qe);
	},
	async related(e, t) {
		let n = await R(e, {
			type: "search/related",
			item_type: "device",
			item_id: t
		});
		return Array.isArray(n.automation) ? n.automation.filter((e) => typeof e == "string") : [];
	},
	async subscribeRegistry(e, t) {
		let n = [];
		try {
			if (e.connection.subscribeEvents) for (let r of [
				"area_registry_updated",
				"device_registry_updated",
				"entity_registry_updated"
			]) n.push(await e.connection.subscribeEvents(t, r));
		} catch (e) {
			throw n.forEach((e) => e()), e;
		}
		return () => n.forEach((e) => e());
	},
	async searchSpecies(e, t, n, r, i = 20) {
		return (await R(e, {
			type: "smart_plants/species/search",
			provider: t,
			query: n,
			locale: r,
			limit: i
		})).results;
	},
	async previewSpecies(e, t, n, r, i) {
		return R(e, {
			type: "smart_plants/species/preview",
			provider: t,
			provider_ref: n,
			locale: r,
			plant_id: i
		});
	},
	async previewSpeciesRefresh(e, t, n) {
		return R(e, {
			type: "smart_plants/species/refresh_preview",
			plant_id: t,
			locale: n
		});
	},
	async applySpecies(e, t, n, r, i, a) {
		return (await R(e, {
			type: "smart_plants/species/apply",
			plant_id: t,
			expected_revision: n,
			preview_token: r,
			provider: i,
			operation: a,
			confirmed: !0
		})).plant;
	},
	async roles(e) {
		return (await R(e, { type: "smart_plants/roles/list" })).roles;
	},
	async setThresholdOverrides(e, t, n, r, i) {
		return (await R(e, {
			type: "smart_plants/roles/set_threshold_overrides",
			plant_id: t,
			expected_revision: n,
			role: r,
			values: i
		})).plant;
	},
	async setRoleSources(e, t, n, r, i) {
		return (await R(e, {
			type: "smart_plants/roles/set_sources",
			plant_id: t,
			expected_revision: n,
			role: r,
			sources: i
		})).plant;
	},
	async setRolePrimary(e, t, n, r, i) {
		return (await R(e, {
			type: "smart_plants/roles/set_primary",
			plant_id: t,
			expected_revision: n,
			role: r,
			primary_entity_id: i
		})).plant;
	},
	async setRoleAggregation(e, t, n, r, i) {
		return (await R(e, {
			type: "smart_plants/roles/set_aggregation",
			plant_id: t,
			expected_revision: n,
			role: r,
			aggregation: i
		})).plant;
	},
	async setRoleStaleAfter(e, t, n, r, i) {
		return (await R(e, {
			type: "smart_plants/roles/set_stale_after",
			plant_id: t,
			expected_revision: n,
			role: r,
			stale_after_seconds: i
		})).plant;
	},
	async list(e) {
		return (await R(e, { type: "smart_plants/plants/list" })).plants;
	},
	async create(e, t) {
		return (await R(e, {
			type: "smart_plants/plants/create",
			...t
		})).plant;
	},
	async update(e, t) {
		return (await R(e, {
			type: "smart_plants/plants/update",
			...t
		})).plant;
	},
	async disable(e, t, n) {
		return (await R(e, {
			type: "smart_plants/plants/disable",
			plant_id: t,
			expected_revision: n
		})).plant;
	},
	async reenable(e, t, n) {
		return (await R(e, {
			type: "smart_plants/plants/reenable",
			plant_id: t,
			expected_revision: n
		})).plant;
	},
	async setArea(e, t, n, r) {
		return (await R(e, {
			type: "smart_plants/plants/set_area",
			plant_id: t,
			expected_revision: n,
			area_id: r
		})).plant;
	},
	async delete(e, t, n) {
		await R(e, {
			type: "smart_plants/plants/delete",
			plant_id: t,
			expected_revision: n
		});
	},
	async fetchImage(e, t, n) {
		let r = `/api/smart_plants/plants/${encodeURIComponent(t)}/image`, i = {};
		e.auth?.accessToken && (i.Authorization = `Bearer ${e.auth.accessToken}`);
		let a, o = {
			method: "GET",
			headers: i,
			credentials: "same-origin"
		};
		n && (o.signal = n);
		try {
			a = await fetch(r, o);
		} catch (e) {
			throw e instanceof DOMException && e.name === "AbortError" ? e : new L("unknown_error", "Image request failed. Retry when connected.");
		}
		if (!a.ok) throw new L("unknown_error", `HTTP ${a.status}`);
		let s = await a.blob();
		if (s.type !== "image/webp" || s.size === 0) throw new L("invalid_response", "The image response is incompatible. Refresh and retry.");
		return s;
	},
	async uploadImage(e, t, n, r) {
		return et(e, `/api/smart_plants/plants/${encodeURIComponent(t)}/image?expected_revision=${n}`, {
			method: "POST",
			plantId: t,
			body: r,
			contentType: r.type
		});
	},
	async deleteImage(e, t, n) {
		return et(e, `/api/smart_plants/plants/${encodeURIComponent(t)}/image?expected_revision=${n}`, {
			method: "DELETE",
			plantId: t
		});
	}
};
function $e(e, t) {
	if (!Array.isArray(e) || !e.every((e) => typeof e == "object" && !!e && t(e))) throw new L("invalid_response", "Home Assistant registry/state response is incompatible. Reload and retry.");
	return e;
}
async function et(e, t, n) {
	let r = {};
	n.contentType && (r["Content-Type"] = n.contentType), e.auth?.accessToken && (r.Authorization = `Bearer ${e.auth.accessToken}`);
	let i = {
		method: n.method,
		headers: r,
		credentials: "same-origin"
	};
	n.body !== void 0 && (i.body = n.body);
	let a;
	try {
		a = await fetch(t, i);
	} catch {
		throw new L("unknown_error", "Image request failed. Retry when connected.");
	}
	let o = await a.text(), s = null;
	if (o) try {
		s = JSON.parse(o);
	} catch {
		s = null;
	}
	if (!a.ok) {
		let e = s?.error?.code ?? "unknown_error";
		throw new L(typeof e == "string" ? e : "unknown_error", "Image request failed. Use a valid JPEG, PNG or WebP up to 5 MiB and 2048 × 2048 pixels.");
	}
	let c = s;
	if (!c || !I(c.plant) || c.plant.id !== n.plantId) throw new L("invalid_response", "The image response is incompatible. Refresh before retrying.");
	return c.plant;
}
//#endregion
//#region src/model.ts
var B = [
	"min",
	"target",
	"max"
], V = {
	min: 15,
	target: 35,
	max: 55
}, tt = [
	"indoor",
	"outdoor",
	"balcony",
	"greenhouse",
	"covered_outdoor",
	"dormant_storage"
], nt = [
	"temperature_stress",
	"humidity_stress",
	"soil_temperature_stress",
	"co2_stress",
	"low_light",
	"low_battery",
	"conductivity_stress"
], rt = {
	moisture: "Moisture",
	temperature: "Temperature",
	humidity: "Humidity",
	illuminance: "Illuminance",
	battery: "Battery",
	conductivity: "Conductivity",
	soil_temperature: "Soil temperature",
	co2: "CO2"
}, it = {
	high: "every configured role is currently available.",
	medium: "at least half of the configured roles are currently available.",
	low: "fewer than half of the configured roles are currently available.",
	unknown: "no roles are configured for this plant yet."
};
function at(e) {
	return (t, n, r) => {
		let i = n;
		if (e) {
			let n = [];
			if (r) for (let [e, t] of Object.entries(r)) n.push(e, t);
			let a = e(t, ...n);
			typeof a == "string" && a.trim() !== "" && (i = a);
		}
		if (r) for (let [e, t] of Object.entries(r)) i = i.replaceAll(`{${e}}`, String(t));
		return i;
	};
}
function ot(e, t) {
	let n = rt[e] ?? e.replaceAll("_", " ");
	return at(t)(`component.smart_plants.panel.health_contributor.${e}`, n);
}
function st(e, t) {
	let n = it[e] ?? "no additional detail available.";
	return at(t)(`component.smart_plants.panel.section.confidence_${e}`, n);
}
var ct = {
	temperature_stress: "Temperature stress",
	humidity_stress: "Humidity stress",
	soil_temperature_stress: "Soil temperature stress",
	co2_stress: "CO2 stress",
	low_light: "Low light",
	low_battery: "Low battery",
	conductivity_stress: "Conductivity stress"
}, lt = {
	temperature_stress: [
		{
			key: "cold_threshold_celsius",
			label: "Cold threshold",
			unit: "°C"
		},
		{
			key: "cold_clear_celsius",
			label: "Cold clear",
			unit: "°C"
		},
		{
			key: "hot_clear_celsius",
			label: "Hot clear",
			unit: "°C"
		},
		{
			key: "hot_threshold_celsius",
			label: "Hot threshold",
			unit: "°C"
		}
	],
	humidity_stress: [
		{
			key: "dry_threshold_percent",
			label: "Dry threshold",
			unit: "%"
		},
		{
			key: "dry_clear_percent",
			label: "Dry clear",
			unit: "%"
		},
		{
			key: "damp_clear_percent",
			label: "Damp clear",
			unit: "%"
		},
		{
			key: "damp_threshold_percent",
			label: "Damp threshold",
			unit: "%"
		}
	],
	soil_temperature_stress: [
		{
			key: "cold_threshold_celsius",
			label: "Cold threshold",
			unit: "°C"
		},
		{
			key: "cold_clear_celsius",
			label: "Cold clear",
			unit: "°C"
		},
		{
			key: "hot_clear_celsius",
			label: "Hot clear",
			unit: "°C"
		},
		{
			key: "hot_threshold_celsius",
			label: "Hot threshold",
			unit: "°C"
		}
	],
	co2_stress: [{
		key: "threshold_ppm",
		label: "High threshold",
		unit: "ppm"
	}, {
		key: "clear_ppm",
		label: "High clear",
		unit: "ppm"
	}],
	low_light: [{
		key: "target_lux",
		label: "Target",
		unit: "lx"
	}, {
		key: "clear_lux",
		label: "Clear",
		unit: "lx"
	}],
	low_battery: [{
		key: "threshold_percent",
		label: "Low threshold",
		unit: "%"
	}, {
		key: "clear_percent",
		label: "Low clear",
		unit: "%"
	}],
	conductivity_stress: [
		{
			key: "low_threshold_micro_siemens_per_cm",
			label: "Low threshold",
			unit: "µS/cm"
		},
		{
			key: "low_clear_micro_siemens_per_cm",
			label: "Low clear",
			unit: "µS/cm"
		},
		{
			key: "high_clear_micro_siemens_per_cm",
			label: "High clear",
			unit: "µS/cm"
		},
		{
			key: "high_threshold_micro_siemens_per_cm",
			label: "High threshold",
			unit: "µS/cm"
		}
	]
}, ut = {
	cold_threshold_celsius: 10,
	cold_clear_celsius: 12,
	hot_clear_celsius: 32,
	hot_threshold_celsius: 35
}, dt = [
	"cold_threshold_celsius",
	"cold_clear_celsius",
	"hot_clear_celsius",
	"hot_threshold_celsius"
], ft = -40, pt = 80, mt = .5, ht = 1;
function H(e) {
	return e >= 0 ? Math.floor(e * 10 + .5) / 10 : -(Math.floor(-e * 10 + .5) / 10);
}
function gt(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = H(n);
	return r < ft || r > pt ? "invalid" : r;
}
function _t(e) {
	let t = {};
	for (let n of dt) {
		let r = gt(e[n]);
		if (r === "invalid") return {
			values: {},
			error: "Effective thresholds must satisfy cold trigger < cold clear < hot clear < hot trigger, with ≥ 0.5 °C hysteresis and a ≥ 1.0 °C stable band, all within −40.0…80.0 °C."
		};
		t[n] = r;
	}
	let n = t, r = (e) => n[e] ?? ut[e], i = r("cold_threshold_celsius"), a = r("cold_clear_celsius"), o = r("hot_clear_celsius"), s = r("hot_threshold_celsius");
	return !(i < a && a < o && o < s) || a - i < mt || s - o < mt || o - a < ht ? {
		values: n,
		error: "Effective thresholds must satisfy cold trigger < cold clear < hot clear < hot trigger, with ≥ 0.5 °C hysteresis and a ≥ 1.0 °C stable band, all within −40.0…80.0 °C."
	} : {
		values: n,
		error: null
	};
}
function vt(e) {
	let t = {
		cold_threshold_celsius: "",
		cold_clear_celsius: "",
		hot_clear_celsius: "",
		hot_threshold_celsius: ""
	};
	if (!e) return t;
	for (let n of dt) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var yt = {
	dry_threshold_percent: 25,
	dry_clear_percent: 30,
	damp_clear_percent: 80,
	damp_threshold_percent: 85
}, bt = [
	"dry_threshold_percent",
	"dry_clear_percent",
	"damp_clear_percent",
	"damp_threshold_percent"
], xt = 0, St = 100, Ct = 1, wt = 5;
function Tt(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = H(n);
	return r < xt || r > St ? "invalid" : r;
}
var Et = "Effective thresholds must satisfy dry trigger < dry clear < damp clear < damp trigger, with ≥ 1.0 % hysteresis and a ≥ 5.0 % stable band, all within 0.0…100.0 %.";
function Dt(e) {
	let t = {};
	for (let n of bt) {
		let r = Tt(e[n]);
		if (r === "invalid") return {
			values: {},
			error: Et
		};
		t[n] = r;
	}
	let n = t, r = (e) => n[e] ?? yt[e], i = r("dry_threshold_percent"), a = r("dry_clear_percent"), o = r("damp_clear_percent"), s = r("damp_threshold_percent");
	return !(i < a && a < o && o < s) || a - i < Ct || s - o < Ct || o - a < wt ? {
		values: n,
		error: Et
	} : {
		values: n,
		error: null
	};
}
function Ot(e) {
	let t = {
		dry_threshold_percent: "",
		dry_clear_percent: "",
		damp_clear_percent: "",
		damp_threshold_percent: ""
	};
	if (!e) return t;
	for (let n of bt) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var kt = {
	low_threshold_micro_siemens_per_cm: 350,
	low_clear_micro_siemens_per_cm: 500,
	high_clear_micro_siemens_per_cm: 1800,
	high_threshold_micro_siemens_per_cm: 2e3
}, At = [
	"low_threshold_micro_siemens_per_cm",
	"low_clear_micro_siemens_per_cm",
	"high_clear_micro_siemens_per_cm",
	"high_threshold_micro_siemens_per_cm"
], jt = 0, Mt = 1e4, Nt = 10, Pt = 50;
function Ft(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = H(n);
	return r < jt || r > Mt ? "invalid" : r;
}
var It = "Effective thresholds must satisfy low trigger < low clear < high clear < high trigger, with ≥ 10.0 µS/cm hysteresis and a ≥ 50.0 µS/cm stable band, all within 0.0…10000.0 µS/cm.";
function Lt(e) {
	let t = {};
	for (let n of At) {
		let r = Ft(e[n]);
		if (r === "invalid") return {
			values: {},
			error: It
		};
		t[n] = r;
	}
	let n = t, r = (e) => n[e] ?? kt[e], i = r("low_threshold_micro_siemens_per_cm"), a = r("low_clear_micro_siemens_per_cm"), o = r("high_clear_micro_siemens_per_cm"), s = r("high_threshold_micro_siemens_per_cm");
	return !(i < a && a < o && o < s) || a - i < Nt || s - o < Nt || o - a < Pt ? {
		values: n,
		error: It
	} : {
		values: n,
		error: null
	};
}
function Rt(e) {
	let t = {
		low_threshold_micro_siemens_per_cm: "",
		low_clear_micro_siemens_per_cm: "",
		high_clear_micro_siemens_per_cm: "",
		high_threshold_micro_siemens_per_cm: ""
	};
	if (!e) return t;
	for (let n of At) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var zt = {
	threshold_ppm: 5e3,
	clear_ppm: 4e3
}, Bt = ["threshold_ppm", "clear_ppm"], Vt = 0, Ht = 1e4, Ut = 100;
function Wt(e) {
	return e >= 0 ? Math.floor(e + .5) : -Math.floor(-e + .5);
}
function Gt(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = Wt(n);
	return r < Vt || r > Ht ? "invalid" : r;
}
var Kt = "Effective thresholds must satisfy clear_ppm < threshold_ppm with ≥ 100 ppm hysteresis, both integers within 0…10000 ppm.";
function qt(e) {
	let t = {};
	for (let n of Bt) {
		let r = Gt(e[n]);
		if (r === "invalid") return {
			values: {},
			error: Kt
		};
		t[n] = r;
	}
	let n = t, r = (e) => n[e] ?? zt[e], i = r("clear_ppm"), a = r("threshold_ppm");
	return !(i < a) || a - i < Ut ? {
		values: n,
		error: Kt
	} : {
		values: n,
		error: null
	};
}
function Jt(e) {
	let t = {
		threshold_ppm: "",
		clear_ppm: ""
	};
	if (!e) return t;
	for (let n of Bt) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var Yt = {
	cold_threshold_celsius: 10,
	cold_clear_celsius: 12,
	hot_clear_celsius: 32,
	hot_threshold_celsius: 35
}, Xt = [
	"cold_threshold_celsius",
	"cold_clear_celsius",
	"hot_clear_celsius",
	"hot_threshold_celsius"
], Zt = -20, Qt = 60, $t = .5, en = 1;
function tn(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = H(n);
	return r < Zt || r > Qt ? "invalid" : r;
}
var nn = "Effective thresholds must satisfy cold trigger < cold clear < hot clear < hot trigger, with ≥ 0.5 °C hysteresis and a ≥ 1.0 °C stable band, all within −20.0…60.0 °C.";
function rn(e) {
	let t = {};
	for (let n of Xt) {
		let r = tn(e[n]);
		if (r === "invalid") return {
			values: {},
			error: nn
		};
		t[n] = r;
	}
	let n = t, r = (e) => n[e] ?? Yt[e], i = r("cold_threshold_celsius"), a = r("cold_clear_celsius"), o = r("hot_clear_celsius"), s = r("hot_threshold_celsius");
	return !(i < a && a < o && o < s) || a - i < $t || s - o < $t || o - a < en ? {
		values: n,
		error: nn
	} : {
		values: n,
		error: null
	};
}
function an(e) {
	let t = {
		cold_threshold_celsius: "",
		cold_clear_celsius: "",
		hot_clear_celsius: "",
		hot_threshold_celsius: ""
	};
	if (!e) return t;
	for (let n of Xt) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var on = {
	threshold_percent: 20,
	clear_percent: 25
}, sn = ["threshold_percent", "clear_percent"], cn = 0, ln = 100, un = 1;
function dn(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = Wt(n);
	return r < cn || r > ln ? "invalid" : r;
}
var fn = "Effective thresholds must satisfy threshold_percent < clear_percent with ≥ 1 % hysteresis, both integers within 0…100 %.";
function pn(e) {
	let t = {};
	for (let n of sn) {
		let r = dn(e[n]);
		if (r === "invalid") return {
			values: {},
			error: fn
		};
		t[n] = r;
	}
	let n = t, r = (e) => n[e] ?? on[e], i = r("threshold_percent"), a = r("clear_percent");
	return !(i < a) || a - i < un ? {
		values: n,
		error: fn
	} : {
		values: n,
		error: null
	};
}
function mn(e) {
	let t = {
		threshold_percent: "",
		clear_percent: ""
	};
	if (!e) return t;
	for (let n of sn) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var hn = {
	target_lux: 500,
	clear_lux: 700
}, gn = ["target_lux", "clear_lux"], _n = 0, vn = 2e5, yn = 10;
function bn(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = H(n);
	return r < _n || r > vn ? "invalid" : r;
}
var xn = "Effective thresholds must satisfy target_lux < clear_lux with ≥ 10.0 lx hysteresis, both within 0.0…200000.0 lx.";
function Sn(e) {
	let t = {};
	for (let n of gn) {
		let r = bn(e[n]);
		if (r === "invalid") return {
			values: {},
			error: xn
		};
		t[n] = r;
	}
	let n = t, r = (e) => n[e] ?? hn[e], i = r("target_lux"), a = r("clear_lux");
	return !(i < a) || a - i < yn ? {
		values: n,
		error: xn
	} : {
		values: n,
		error: null
	};
}
function Cn(e) {
	let t = {
		target_lux: "",
		clear_lux: ""
	};
	if (!e) return t;
	for (let n of gn) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
function wn(e, t, n, r) {
	let i = `smart_plants:${e.id}:${t}`, a = n.find((e) => e.unique_id === i && e.platform === "smart_plants");
	if (!a) return [];
	let o = r[a.entity_id];
	return o ? lt[t].map((e) => {
		let t = o.attributes[e.key], n = typeof t == "number" && Number.isFinite(t) ? t : null;
		return {
			key: e.key,
			label: e.label,
			unit: e.unit,
			value: n
		};
	}) : [];
}
function Tn(e, t, n) {
	return nt.map((r) => {
		let i = `smart_plants:${e.id}:${r}`, a = t.find((e) => e.unique_id === i && e.platform === "smart_plants");
		if (!a) return {
			role: r,
			label: ct[r],
			status: "not_configured",
			reason: null
		};
		let o = n[a.entity_id];
		if (!o || o.state === "unavailable" || o.state === "unknown") return {
			role: r,
			label: ct[r],
			status: "unavailable",
			reason: null
		};
		let s = o.state === "on" ? "on" : "off", c = o.attributes.reason, l = typeof c == "string" && c.trim() ? c : null;
		return {
			role: r,
			label: ct[r],
			status: s,
			reason: l
		};
	});
}
function En() {
	return {
		sources: [],
		primary_entity_id: null,
		aggregation: "primary",
		stale_after_seconds: 21600,
		threshold_overrides: {
			min: null,
			target: null,
			max: null
		}
	};
}
function U(e) {
	let t = e.roles?.moisture;
	return !t || !Array.isArray(t.sources) || t.sources.length > 32 || !t.sources.every((e) => e && typeof e.entity_id == "string" && /^sensor\.[a-z0-9_]+$/.test(e.entity_id) && (e.registry_id === null || typeof e.registry_id == "string")) || ![
		"primary",
		"average",
		"min",
		"max"
	].includes(t.aggregation) || !Number.isInteger(t.stale_after_seconds) || t.stale_after_seconds < 60 || t.stale_after_seconds > 604800 || !(t.primary_entity_id === null || t.sources.some((e) => e.entity_id === t.primary_entity_id)) || !B.every((e) => t.threshold_defaults?.[e] && Number.isInteger(t.threshold_defaults[e].value) && t.threshold_defaults[e].value >= 1 && t.threshold_defaults[e].value <= 99 && ["builtin", "provider"].includes(t.threshold_defaults[e].source) && (t.threshold_defaults[e].provider === null || typeof t.threshold_defaults[e].provider == "string") && (t.threshold_defaults[e].provider_ref === null || typeof t.threshold_defaults[e].provider_ref == "string") && (t.threshold_overrides?.[e] === null || Number.isInteger(t.threshold_overrides?.[e]))) || W(t, Object.fromEntries(B.map((e) => [e, t.threshold_defaults[e].value]))) || B.some((e) => {
		let n = t.threshold_defaults[e];
		return n.source === "builtin" ? n.provider !== null || n.provider_ref !== null : !n.provider || !n.provider_ref;
	}) ? null : t;
}
function Dn(e) {
	return structuredClone({
		sources: e.sources,
		primary_entity_id: e.primary_entity_id,
		aggregation: e.aggregation,
		stale_after_seconds: e.stale_after_seconds,
		threshold_overrides: e.threshold_overrides
	});
}
function W(e, t) {
	if (e.sources.length > 32 || new Set(e.sources.map((e) => e.entity_id)).size !== e.sources.length || new Set(e.sources.map((e) => e.registry_id ?? e.entity_id)).size !== e.sources.length || e.sources.some((e) => !/^sensor\.[a-z0-9_]+$/.test(e.entity_id))) return "Choose at most 32 unique sensor entities.";
	if (![
		"primary",
		"average",
		"min",
		"max"
	].includes(e.aggregation)) return "Choose a supported aggregation.";
	if (e.primary_entity_id !== null && !e.sources.some((t) => t.entity_id === e.primary_entity_id)) return "Primary must be one of the assigned sensors or None.";
	if (!Number.isInteger(e.stale_after_seconds) || e.stale_after_seconds < 60 || e.stale_after_seconds > 604800) return "Staleness must be an integer from 60 to 604800 seconds.";
	let n = B.map((n) => e.threshold_overrides[n] ?? t[n]);
	return n.some((e) => !Number.isInteger(e) || e < 1 || e > 99) || !(n[0] < n[1] && n[1] < n[2] && n[2] - n[0] >= 4) ? "Effective moisture thresholds must be integers: 1 ≤ min < target < max ≤ 99, with a span of at least 4%." : null;
}
function On(e, t) {
	return !e.trim() && !t.trim() ? null : {
		provider: "manual",
		snapshot: {
			provider: "manual",
			provider_id: null,
			provider_ref: null,
			fetched_at: (/* @__PURE__ */ new Date()).toISOString(),
			locale: "und",
			source_status: "manual",
			attribution: "User supplied",
			common_name: e.trim() || null,
			latin_name: t.trim() || null,
			category: null,
			confidence: null,
			care_text: {},
			field_sources: {
				...e.trim() ? { common_name: "User supplied" } : {},
				...t.trim() ? { latin_name: "User supplied" } : {}
			},
			threshold_defaults: {}
		}
	};
}
function G(e, t) {
	return t.find((t) => t.identifiers.some(([t, n]) => t === "smart_plants" && n === e.id));
}
function K(e, t) {
	return e.registry_id ? t.find((t) => t.id === e.registry_id) : t.find((t) => t.entity_id === e.entity_id);
}
function kn(e, t) {
	let n = e.sources.find((t) => t.entity_id === e.primary_entity_id);
	return {
		...structuredClone(e),
		sources: e.sources.map((e) => {
			let n = K(e, t);
			return n ? {
				entity_id: n.entity_id,
				registry_id: n.id
			} : { ...e };
		}),
		primary_entity_id: n ? K(n, t)?.entity_id ?? n.entity_id : null
	};
}
function An(e, t, n) {
	let r = K(e, t);
	if (e.registry_id && !r) return "Missing registered source — replace it explicitly or review Repairs.";
	let i = n[r?.entity_id ?? e.entity_id], a = [];
	return r || a.push("Unregistered: renames cannot be followed reliably"), (!i || ["unknown", "unavailable"].includes(i.state)) && a.push("Currently unavailable"), i && (i.attributes.unit_of_measurement !== "%" || i.attributes.device_class !== "moisture") && a.push("Unexpected metadata: evaluation requires numeric 0–100 %"), i && !["unknown", "unavailable"].includes(i.state) && (!i.state.trim() || !Number.isFinite(Number(i.state)) || Number(i.state) < 0 || Number(i.state) > 100) && a.push("Invalid reading: evaluation requires a numeric percentage from 0 to 100"), a.join(". ");
}
var jn = [
	{
		role: "temperature",
		label: "Air temperature",
		deviceClass: "temperature",
		acceptedUnits: [
			"°C",
			"°F",
			"K"
		]
	},
	{
		role: "humidity",
		label: "Air humidity",
		deviceClass: "humidity",
		acceptedUnits: ["%"]
	},
	{
		role: "illuminance",
		label: "Illuminance",
		deviceClass: "illuminance",
		acceptedUnits: ["lx"]
	},
	{
		role: "battery",
		label: "Battery",
		deviceClass: "battery",
		acceptedUnits: ["%"]
	},
	{
		role: "conductivity",
		label: "Conductivity",
		deviceClass: "conductivity",
		acceptedUnits: [
			"µS/cm",
			"μS/cm",
			"uS/cm"
		]
	},
	{
		role: "soil_temperature",
		label: "Soil temperature",
		deviceClass: "temperature",
		acceptedUnits: [
			"°C",
			"°F",
			"K"
		]
	},
	{
		role: "co2",
		label: "CO₂",
		deviceClass: "carbon_dioxide",
		acceptedUnits: ["ppm"]
	}
];
function Mn(e) {
	return jn.find((t) => t.role === e);
}
function q(e, t) {
	let n = e.roles?.[t];
	return !n || !Array.isArray(n.sources) || n.sources.length > 32 || !n.sources.every((e) => e && typeof e.entity_id == "string" && /^sensor\.[a-z0-9_]+$/.test(e.entity_id) && (e.registry_id === null || typeof e.registry_id == "string")) || typeof n.aggregation != "string" || ![
		"primary",
		"average",
		"min",
		"max"
	].includes(n.aggregation) || !Number.isInteger(n.stale_after_seconds) || n.stale_after_seconds < 60 || n.stale_after_seconds > 604800 || !(n.primary_entity_id === null || typeof n.primary_entity_id == "string" && n.sources.some((e) => e.entity_id === n.primary_entity_id)) ? null : {
		sources: n.sources,
		primary_entity_id: n.primary_entity_id ?? null,
		aggregation: n.aggregation,
		stale_after_seconds: n.stale_after_seconds
	};
}
function Nn(e) {
	return structuredClone({
		sources: e.sources,
		primary_entity_id: e.primary_entity_id,
		aggregation: e.aggregation,
		stale_after_seconds: e.stale_after_seconds
	});
}
function Pn(e) {
	return e.sources.length > 32 || new Set(e.sources.map((e) => e.entity_id)).size !== e.sources.length || new Set(e.sources.map((e) => e.registry_id ?? e.entity_id)).size !== e.sources.length || e.sources.some((e) => !/^sensor\.[a-z0-9_]+$/.test(e.entity_id)) ? "Choose at most 32 unique sensor entities." : [
		"primary",
		"average",
		"min",
		"max"
	].includes(e.aggregation) ? e.primary_entity_id !== null && !e.sources.some((t) => t.entity_id === e.primary_entity_id) ? "Primary must be one of the assigned sensors or None." : !Number.isInteger(e.stale_after_seconds) || e.stale_after_seconds < 60 || e.stale_after_seconds > 604800 ? "Staleness must be an integer from 60 to 604800 seconds." : null : "Choose a supported aggregation.";
}
function Fn(e, t) {
	let n = e.sources.find((t) => t.entity_id === e.primary_entity_id);
	return {
		...structuredClone(e),
		sources: e.sources.map((e) => {
			let n = K(e, t);
			return n ? {
				entity_id: n.entity_id,
				registry_id: n.id
			} : { ...e };
		}),
		primary_entity_id: n ? K(n, t)?.entity_id ?? n.entity_id : null
	};
}
function In(e, t, n, r) {
	let i = K(e, t);
	if (e.registry_id && !i) return "Missing registered source — replace it explicitly or review Repairs.";
	let a = n[i?.entity_id ?? e.entity_id], o = [];
	if (i || o.push("Unregistered: renames cannot be followed reliably"), (!a || ["unknown", "unavailable"].includes(a.state)) && o.push("Currently unavailable"), a) {
		let e = a.attributes.unit_of_measurement, t = a.attributes.device_class;
		(typeof e != "string" || !r.acceptedUnits.includes(e) || t !== r.deviceClass) && o.push(`Unexpected metadata: ${r.label} evaluation requires device class ${r.deviceClass} and unit ${r.acceptedUnits.join(" / ")}`);
	}
	return o.join(". ");
}
function J(e) {
	return [...new Set(e.split(",").map((e) => e.trim()).filter(Boolean))];
}
function Ln(e, t) {
	return e.length > 60 || t.length > 32 || t.some((e) => e.length > 60) ? "Use a category up to 60 characters and at most 32 unique tags up to 60 characters each." : null;
}
//#endregion
//#region src/editors.ts
var Rn = (e) => e.target.value;
function Y(e, t, n, r = "text", i = 200) {
	return S`<label>${e}<input type=${r} maxlength=${i} .value=${t} @input=${(e) => n(Rn(e))}></label>`;
}
function X(e, t, n, r) {
	return S`<label>${e}<select .value=${t} @change=${(e) => r(Rn(e))}>${(t && !n.some((e) => e.value === t) ? [...n, {
		value: t,
		label: `${t} (current value)`
	}] : n).map((e) => S`<option value=${e.value} ?selected=${e.value === t}>${e.label}</option>`)}</select></label>`;
}
function zn(e, t, n) {
	return X("Home Assistant area", e, [
		{
			value: "",
			label: "No area"
		},
		...e && !t.some((t) => t.area_id === e) ? [{
			value: e,
			label: `${e} (missing area — select a current area before saving)`
		}] : [],
		...t.map((e) => ({
			value: e.area_id,
			label: e.name
		}))
	], n);
}
function Bn(e, t) {
	let n = (n) => t({
		mode: "indoor",
		exposure: null,
		rain_exposure: null,
		container: null,
		...e,
		...n
	});
	return S`${X("Placement", e?.mode ?? "", [{
		value: "",
		label: "Not specified"
	}, ...tt.map((e) => ({
		value: e,
		label: e.replaceAll("_", " ")
	}))], (e) => e ? n({ mode: e }) : t(null))}
    ${e ? S`${X("Sun exposure", e.exposure ?? "", [
		"",
		"full_sun",
		"partial_sun",
		"shade"
	].map((e) => ({
		value: e,
		label: e || "Not specified"
	})), (e) => n({ exposure: e || null }))}
    ${X("Rain exposure", e.rain_exposure ?? "", [
		"",
		"none",
		"partial",
		"full"
	].map((e) => ({
		value: e,
		label: e || "Not specified"
	})), (e) => n({ rain_exposure: e || null }))}
    ${X("Container", e.container === null ? "" : String(e.container), [
		{
			value: "",
			label: "Not specified"
		},
		{
			value: "true",
			label: "In a container"
		},
		{
			value: "false",
			label: "In the ground"
		}
	], (e) => n({ container: e === "" ? null : e === "true" }))}` : w}`;
}
function Vn(e, t, n, r, i, a, o, s = "all") {
	let c = (t) => o({
		...e,
		...t
	}), l = [.../* @__PURE__ */ new Set([...n.map((e) => e.entity_id), ...Object.keys(r)])].filter((e) => e.startsWith("sensor.") && (i || r[e]?.attributes.device_class === "moisture")).sort();
	return S`${s === "thresholds" ? w : S`
    <p>Assign up to 32 sources. Primary never falls back automatically. Unavailable sensors can be assigned.</p>
    <label class="check"><input type="checkbox" .checked=${i} @change=${(e) => a(e.target.checked)}>Show all sensors (metadata fallback)</label>
    ${X("Add moisture sensor", "", [{
		value: "",
		label: "Choose a sensor"
	}, ...l.map((e) => ({
		value: e,
		label: `${typeof r[e]?.attributes.friendly_name == "string" ? r[e]?.attributes.friendly_name : e} · ${e} · unit: ${r[e]?.attributes.unit_of_measurement ?? "not supplied"} · class: ${r[e]?.attributes.device_class ?? "not supplied"} · ${r[e]?.state ?? "unavailable"}`
	}))], (t) => {
		t && !e.sources.some((e) => e.entity_id === t) && c({ sources: [...e.sources, {
			entity_id: t,
			registry_id: n.find((e) => e.entity_id === t)?.id ?? null
		}] });
	})}
    <label>Assign an unavailable or unregistered sensor<input placeholder="sensor.soil_moisture" @keydown=${(t) => {
		if (t.key === "Enter") {
			t.preventDefault();
			let r = t.target, i = r.value.trim();
			/^sensor\.[a-z0-9_]+$/.test(i) && !e.sources.some((e) => e.entity_id === i) && (c({ sources: [...e.sources, {
				entity_id: i,
				registry_id: n.find((e) => e.entity_id === i)?.id ?? null
			}] }), r.value = "");
		}
	}}></label><small>Press Enter to add an entity ID.</small>
    <ul>${e.sources.map((t) => {
		let i = K(t, n), a = t.registry_id && !i ? void 0 : r[i?.entity_id ?? t.entity_id];
		return S`<li><strong>${i?.entity_id ?? t.entity_id}</strong><p>${a?.state ?? "Unavailable"} ${a?.attributes.unit_of_measurement ?? ""}${t.entity_id === e.primary_entity_id ? " · Primary" : ""}</p><p>Device class: ${a?.attributes.device_class ?? "Not supplied"} · Unit: ${a?.attributes.unit_of_measurement ?? "Not supplied"} · ${i ? "Registered" : "Not in registry"}</p><small>${An(t, n, r)}</small>${i ? S`<a href="/config/entities/entity/${encodeURIComponent(i.id)}">Native sensor settings</a>` : w}<button type="button" @click=${() => c({
			sources: e.sources.filter((e) => e !== t),
			primary_entity_id: e.primary_entity_id === t.entity_id ? null : e.primary_entity_id
		})}>Remove ${t.entity_id}</button></li>`;
	})}</ul>
    ${e.sources.some((e) => e.registry_id && !K(e, n)) ? S`<a href="/config/repairs">Open Home Assistant Repairs</a>` : w}
    ${X("Primary sensor", e.primary_entity_id ?? "", [{
		value: "",
		label: "None (primary aggregation unavailable)"
	}, ...e.sources.map((e) => ({
		value: e.entity_id,
		label: K(e, n)?.entity_id ?? e.entity_id
	}))], (e) => c({ primary_entity_id: e || null }))}
    ${X("Aggregation", e.aggregation, [
		"primary",
		"average",
		"min",
		"max"
	].map((e) => ({
		value: e,
		label: e
	})), (e) => c({ aggregation: e }))}
    ${Y("Stale after (seconds, 60–604800)", String(e.stale_after_seconds), (e) => c({ stale_after_seconds: Number(e) }), "number")}`}
    ${s === "sources" ? w : S`<p>Blank overrides explicitly inherit defaults. Save applies the complete configuration atomically.</p><div class="grid">${B.map((n) => S`<div>${Y(`${n} override (%)`, e.threshold_overrides[n] === null ? "" : String(e.threshold_overrides[n]), (t) => c({ threshold_overrides: {
		...e.threshold_overrides,
		[n]: t.trim() === "" ? null : Number(t)
	} }), "number")}<small>Default ${t[n]}% · effective ${e.threshold_overrides[n] ?? t[n]}%</small><button type="button" @click=${() => c({ threshold_overrides: {
		...e.threshold_overrides,
		[n]: null
	} })}>Inherit ${n}</button></div>`)}</div>`}`;
}
function Hn(e, t, n, r, i, a, o) {
	let s = (e) => o({
		...t,
		...e
	}), c = [.../* @__PURE__ */ new Set([...n.map((e) => e.entity_id), ...Object.keys(r)])].filter((t) => t.startsWith("sensor.") && (i || r[t]?.attributes.device_class === e.deviceClass && typeof r[t]?.attributes.unit_of_measurement == "string" && e.acceptedUnits.includes(r[t]?.attributes.unit_of_measurement))).sort();
	return S`
    <p>Assign up to 32 ${e.label.toLowerCase()} sources. Primary never falls back automatically. Unavailable sensors can be assigned.</p>
    <label class="check"><input type="checkbox" .checked=${i} @change=${(e) => a(e.target.checked)}>Show all sensors (metadata fallback)</label>
    ${X(`Add ${e.label.toLowerCase()} sensor`, "", [{
		value: "",
		label: "Choose a sensor"
	}, ...c.map((e) => ({
		value: e,
		label: `${typeof r[e]?.attributes.friendly_name == "string" ? r[e]?.attributes.friendly_name : e} · ${e} · unit: ${r[e]?.attributes.unit_of_measurement ?? "not supplied"} · class: ${r[e]?.attributes.device_class ?? "not supplied"} · ${r[e]?.state ?? "unavailable"}`
	}))], (e) => {
		e && !t.sources.some((t) => t.entity_id === e) && s({ sources: [...t.sources, {
			entity_id: e,
			registry_id: n.find((t) => t.entity_id === e)?.id ?? null
		}] });
	})}
    <label>Assign an unavailable or unregistered sensor<input placeholder="sensor.${e.role}" @keydown=${(e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			let r = e.target, i = r.value.trim();
			/^sensor\.[a-z0-9_]+$/.test(i) && !t.sources.some((e) => e.entity_id === i) && (s({ sources: [...t.sources, {
				entity_id: i,
				registry_id: n.find((e) => e.entity_id === i)?.id ?? null
			}] }), r.value = "");
		}
	}}></label><small>Press Enter to add an entity ID.</small>
    <ul>${t.sources.map((i) => {
		let a = K(i, n), o = i.registry_id && !a ? void 0 : r[a?.entity_id ?? i.entity_id];
		return S`<li><strong>${a?.entity_id ?? i.entity_id}</strong><p>${o?.state ?? "Unavailable"} ${o?.attributes.unit_of_measurement ?? ""}${i.entity_id === t.primary_entity_id ? " · Primary" : ""}</p><p>Device class: ${o?.attributes.device_class ?? "Not supplied"} · Unit: ${o?.attributes.unit_of_measurement ?? "Not supplied"} · ${a ? "Registered" : "Not in registry"}</p><small>${In(i, n, r, e)}</small>${a ? S`<a href="/config/entities/entity/${encodeURIComponent(a.id)}">Native sensor settings</a>` : w}<button type="button" @click=${() => s({
			sources: t.sources.filter((e) => e !== i),
			primary_entity_id: t.primary_entity_id === i.entity_id ? null : t.primary_entity_id
		})}>Remove ${i.entity_id}</button></li>`;
	})}</ul>
    ${t.sources.some((e) => e.registry_id && !K(e, n)) ? S`<a href="/config/repairs">Open Home Assistant Repairs</a>` : w}
    ${X("Primary sensor", t.primary_entity_id ?? "", [{
		value: "",
		label: "None (primary aggregation unavailable)"
	}, ...t.sources.map((e) => ({
		value: e.entity_id,
		label: K(e, n)?.entity_id ?? e.entity_id
	}))], (e) => s({ primary_entity_id: e || null }))}
    ${X("Aggregation", t.aggregation, [
		"primary",
		"average",
		"min",
		"max"
	].map((e) => ({
		value: e,
		label: e
	})), (e) => s({ aggregation: e }))}
    ${Y("Stale after (seconds, 60–604800)", String(t.stale_after_seconds), (e) => s({ stale_after_seconds: Number(e) }), "number")}`;
}
function Un(e, t) {
	return S`<article><h3>${e.common_name ?? e.latin_name ?? "Species"}</h3><p><i>${e.latin_name}</i></p>
    <dl>${Object.entries({
		Provider: e.provider,
		Reference: e.provider_ref,
		Attribution: e.attribution,
		Fetched: e.fetched_at,
		Locale: e.locale,
		Status: e.source_status,
		Confidence: e.confidence ?? "Not supplied",
		Category: e.category ?? "Not supplied"
	}).map(([e, t]) => S`<dt>${e}</dt><dd>${t}</dd>`)}</dl>
    <h4>Imported moisture defaults</h4>${B.map((t) => S`<p>${t}: ${e.threshold_defaults.moisture?.[t] ?? "Not supplied (built-in default applies)"}</p>`)}
    ${Object.entries(e.care_text).map(([e, t]) => S`<h4>${e}</h4><p class="prose">${t}</p>`)}
    <details><summary>Field attribution</summary>${Object.entries(e.field_sources).map(([e, t]) => S`<p>${e}: ${t}</p>`)}</details>
    ${t ? S`<h4>Proposed changes</h4>${Object.entries(t.diff).map(([e, t]) => S`<p>${e}: ${JSON.stringify(t.before)} → ${JSON.stringify(t.after)}</p>`)}<p>Preview is read-only. Local overrides are preserved. No remote images are loaded.</p>` : w}</article>`;
}
//#endregion
//#region \0@oxc-project+runtime@0.151.0/helpers/esm/decorate.js
function Z(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
//#endregion
//#region src/image.ts
async function Wn(e) {
	if (![
		"image/jpeg",
		"image/png",
		"image/webp"
	].includes(e.type) || e.size === 0 || e.size > 5242880) throw Error("Choose a nonempty JPEG, PNG or WebP image up to 5 MiB.");
	let t;
	try {
		t = new Uint8Array(await e.slice(0, 12).arrayBuffer());
	} catch {
		throw Error("This image could not be read. Select the file again.");
	}
	let n = (...e) => e.every((e, n) => t[n] === e), r = n(255, 216, 255) ? "image/jpeg" : n(137, 80, 78, 71, 13, 10, 26, 10) ? "image/png" : n(82, 73, 70, 70) && t[8] === 87 && t[9] === 69 && t[10] === 66 && t[11] === 80 ? "image/webp" : null;
	if (r !== e.type) throw Error("Image content does not match its JPEG, PNG or WebP file type. Choose another image.");
	let i, a;
	try {
		if (typeof createImageBitmap == "function") {
			let t = await createImageBitmap(e);
			i = t.width, a = t.height, t.close();
		} else {
			let t = URL.createObjectURL(e);
			try {
				let e = new Image();
				await new Promise((n, r) => {
					e.onload = () => n(), e.onerror = () => r(/* @__PURE__ */ Error("decode")), e.src = t;
				}), i = e.naturalWidth, a = e.naturalHeight;
			} finally {
				URL.revokeObjectURL(t);
			}
		}
	} catch {
		throw Error("This file could not be decoded as an image. Choose another JPEG, PNG or WebP.");
	}
	if (!Number.isInteger(i) || !Number.isInteger(a) || i < 1 || a < 1 || i > 2048 || a > 2048) throw Error("Image dimensions must be at most 2048 × 2048 pixels.");
	return {
		format: r,
		bytes: e.size,
		width: i,
		height: a
	};
}
//#endregion
//#region src/styles.ts
var Gn = o`
  :host{display:block;color:var(--primary-text-color,#212121);font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif);line-height:1.5;overflow-wrap:anywhere}
  *{box-sizing:border-box} main{width:100%;max-width:none;margin:0;padding:0} .panel-content{width:100%;max-width:1280px;margin:0 auto;padding:16px 24px 24px} header,.actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap} header{justify-content:space-between;margin-bottom:24px}
  .page-title{font-size:inherit;font-weight:inherit;margin:inherit;line-height:inherit}
  h1,h2,h3{line-height:1.2} h1{font-size:1.8rem} h2{font-size:1.3rem} h3{font-size:1.1rem} p{overflow-wrap:anywhere}
  section,article,.card{background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#ddd);border-radius:var(--ha-card-border-radius,12px);padding:20px;margin-bottom:16px} section>h2:first-child{margin-top:0}
  .grid,.plants{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px}.plants{list-style:none;padding:0}.plant{padding:20px;border:1px solid var(--divider-color,#ddd);border-radius:12px;background:var(--card-background-color,#fff)}
  label{display:grid;gap:6px;margin:12px 0}input,select,textarea,button{font:inherit;color:inherit;min-height:44px;border:1px solid var(--divider-color,#aaa);border-radius:8px;padding:8px 12px;background:var(--card-background-color,#fff);max-width:100%}input,select{width:100%}button{cursor:pointer;transition:border-color .16s ease,transform .16s ease}button:hover:not(:disabled){border-color:var(--primary-color,#007bad)}button.primary{background:var(--secondary-background-color,#f5f5f5);color:var(--primary-text-color,#212121);border:2px solid var(--primary-color,#007bad);font-weight:600}button:disabled{opacity:1;color:var(--secondary-text-color,#666);background:var(--secondary-background-color,#f5f5f5);border-color:var(--divider-color,#ddd);cursor:default}a{color:var(--primary-color,#007bad)}
  :focus-visible{outline:3px solid var(--primary-color,#03a9f4);outline-offset:3px}.check{display:flex;align-items:center;gap:10px}.check input{width:24px;height:24px;min-height:24px}.actions{margin-top:20px}small,.muted{display:block;color:var(--secondary-text-color,#666)}.error{border-left:4px solid var(--error-color,#b00020);padding:16px;background:var(--card-background-color,#fff);color:var(--error-color,#b00020)}.notice{border-left:4px solid var(--warning-color,#f90);padding:16px}fieldset{border:0;padding:0;margin:0;min-width:0}legend{font-weight:600}.empty{text-align:center;padding:48px 16px}.name{font-weight:600;text-align:left}.prose{white-space:pre-wrap}li{margin-bottom:12px}dl{display:grid;grid-template-columns:minmax(90px,1fr) 2fr;gap:4px 12px}dd{margin:0;overflow-wrap:anywhere}dt{color:var(--secondary-text-color,#666)}img.preview{max-width:100%;max-height:320px;object-fit:contain;border-radius:8px}dialog{color:var(--primary-text-color,#212121);background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#ddd);border-radius:16px;padding:24px;max-width:min(600px,calc(100vw - 32px));max-height:85vh;overflow:auto}dialog::backdrop{background:rgba(0,0,0,.5)}nav ol{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none}nav li{padding:6px 10px;border-radius:8px;background:var(--secondary-background-color,#eee)}[aria-current=step]{font-weight:bold;border:2px solid var(--primary-color,#03a9f4)}
  .stepper{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 12px!important;scrollbar-width:thin}.stepper li{display:flex;align-items:center;gap:8px;flex:0 0 auto;margin:0;color:var(--secondary-text-color,#666);font-size:.9rem}.step-number{display:grid;place-items:center;width:26px;height:26px;border:1px solid var(--divider-color,#aaa);border-radius:50%;font-size:.8rem}.stepper [aria-current=step]{color:var(--primary-text-color,#212121);border:0;font-weight:600}.stepper [aria-current=step] .step-number{background:var(--primary-color,#007bad);border-color:var(--primary-color,#007bad);color:var(--text-primary-color,#fff)}
  .choice-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px;margin:20px 0}.choice-card{display:grid;gap:8px;text-align:left;min-height:112px;padding:18px;background:var(--secondary-background-color,#f5f5f5);border-color:var(--divider-color,#ddd)}.choice-card strong{font-size:1.05rem}.choice-card span{color:var(--secondary-text-color,#666)}.choice-card.selected{border:2px solid var(--primary-color,#007bad);background:var(--primary-background-color,#eaf6fa)}.provider-help,.default-summary{padding:16px;border-radius:12px;background:var(--secondary-background-color,#f5f5f5);margin:16px 0}.provider-help{border-inline-start:4px solid var(--primary-color,#007bad)}.provider-help p{margin:8px 0}.advanced-disclosure{border:1px solid var(--divider-color,#ddd);border-radius:12px;padding:0 16px;margin:20px 0}.advanced-disclosure summary{cursor:pointer;font-weight:600;padding:16px 0}.advanced-disclosure[open]{padding-bottom:12px}.result-list{padding-inline-start:20px}.result-list button{text-align:left}
   .detail-tabs{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 12px;margin:8px 0 16px}.detail-tabs button{flex:0 0 auto;background:var(--secondary-background-color,#f5f5f5);border-color:transparent}.detail-tabs button[aria-current=page]{background:var(--secondary-background-color,#f5f5f5);color:var(--primary-text-color,#212121);border:2px solid var(--primary-color,#007bad);font-weight:600}.plant-overview-card{padding:0;overflow:hidden}.overview-heading{display:flex;align-items:center;gap:20px;padding:24px;background:var(--secondary-background-color,#f5f5f5)}.overview-avatar{width:84px;height:84px;flex:0 0 84px;object-fit:cover;border-radius:16px}.overview-avatar.placeholder{display:grid;place-items:center;background:var(--secondary-background-color,#f5f5f5);color:var(--primary-text-color,#212121);font-size:2rem;font-weight:700;border:1px solid var(--divider-color,#ddd)}.overview-heading h2{font-size:1.8rem;margin:4px 0}.overview-heading>section,.overview-heading>article{padding:0;margin:0;border:0;background:transparent}.eyebrow{font-size:.75rem;font-weight:700;letter-spacing:.08em;color:var(--secondary-text-color,#666);margin:0}.overview-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:20px}.overview-metrics article{display:grid;gap:4px;margin:0;background:var(--secondary-background-color,#f5f5f5);border:0}.overview-metrics article span{color:var(--secondary-text-color,#666)}.overview-metrics article strong{font-size:1.45rem}.overview-sensors,.overview-care{border:0;border-top:1px solid var(--divider-color,#ddd);border-radius:0;margin:0}.overview-sensors h2,.overview-care h2{margin-top:0}.overview-heading button{margin-top:8px}
  .detail-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:4px 2px 8px}.detail-heading h2{font-size:1.5rem;margin:0}.detail-heading p{margin:4px 0;color:var(--secondary-text-color,#666)}.detail-heading a{color:var(--primary-text-color,#212121);text-decoration:underline;text-underline-offset:3px}
  .inventory-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 16px;padding:0;border:0;background:transparent}.inventory-summary article{display:grid;gap:4px;margin:0;padding:16px 20px;background:var(--card-background-color,#fff)}.inventory-summary article span{color:var(--secondary-text-color,#666);font-size:.9rem}.inventory-summary article strong{font-size:1.6rem;line-height:1.2}.filter-disclosure{margin-bottom:16px}.filter-disclosure>summary{cursor:pointer;font-weight:600;list-style:none;padding:4px 0}.filter-disclosure>summary::-webkit-details-marker{display:none}.filter-disclosure>summary:before{content:"▸";display:inline-block;width:1.4em;color:var(--secondary-text-color,#666)}.filter-disclosure[open]>summary:before{content:"▾"}.filter-disclosure>section{margin:12px 0 0}.plant-count{font-weight:600;color:var(--secondary-text-color,#666)}.plant-card{display:grid;gap:16px;padding:18px}.plant-card-heading{display:flex;align-items:center;gap:14px}.plant-avatar{display:grid;place-items:center;flex:0 0 52px;width:52px;height:52px;border-radius:16px;background:var(--secondary-background-color,#f5f5f5);color:var(--primary-color,#007bad);font-size:1.45rem;font-weight:700}.plant-card-heading>div{display:grid;gap:2px}.plant-card .name{padding:0;border:0;background:transparent;font-size:1.1rem;font-weight:650}.plant-status{text-transform:capitalize;color:var(--secondary-text-color,#666);font-size:.9rem}.plant-card-metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px}.plant-card-metrics>div{display:grid;gap:2px;padding:12px;border-radius:10px;background:var(--secondary-background-color,#f5f5f5)}.plant-card-metrics>div>strong{font-size:1.3rem}.plant-card-metrics>div>strong small{display:inline;font-size:.8rem;font-weight:400}.plant-meta{line-height:1.6}
  @media(max-width:600px){.panel-content{padding:16px 16px 16px}.inventory-summary{gap:8px}.inventory-summary article{padding:12px 10px}.inventory-summary article span{font-size:.78rem}.inventory-summary article strong{font-size:1.35rem}.plant-card{padding:14px}section,article{padding:16px}.actions button{flex:1 1 auto}header{align-items:flex-start}dl{grid-template-columns:1fr}dd{margin-bottom:8px}.stepper li span:last-child{display:none}.stepper li[aria-current=step] span:last-child{display:inline}.choice-card{min-height:0}.overview-heading{align-items:flex-start;flex-direction:column;padding:18px}.overview-metrics{grid-template-columns:1fr;padding:14px}.detail-tabs button{font-size:.9rem;padding:8px}}
`, Kn, Q = class extends D {
	constructor(...e) {
		super(...e), this.areas = [], this.entities = [], this.states = {}, this.blocked = !1, this.navigationContext = 0, this.step = 0, this.busy = !1, this.error = "", this.name = "", this.acquired = "", this.area = "", this.placement = null, this.category = "", this.tagText = "", this.common = "", this.latin = "", this.provider = "manual", this.query = "", this.results = [], this.searched = !1, this.preview = null, this.accepted = !1, this.moisture = En(), this.all = !1, this.draft = null, this.finalRequest = null, this.photo = null, this.photoInfo = null, this.rejected = !1, this.generation = 0, this.lifecycle = 0, this.steps = [
			"Basic info",
			"Species and care",
			"Review species",
			"Moisture sensors",
			"Moisture thresholds",
			"Category and tags",
			"Review and create"
		];
	}
	get visibleSteps() {
		return this.steps.flatMap((e, t) => t === 2 && this.provider === "manual" ? [] : [{
			index: t,
			label: e
		}]);
	}
	connectedCallback() {
		super.connectedCallback(), this.draft || this.start();
	}
	disconnectedCallback() {
		this.lifecycle++, this.generation++, this.busy = !1, super.disconnectedCallback();
	}
	willUpdate(e) {
		let t = e.get("hass");
		(e.has("blocked") && this.blocked || t && t.connection !== this.hass.connection) && (this.lifecycle++, this.busy = !1, this.generation++, this.finalRequest || (this.preview = null, this.accepted = !1));
	}
	async start() {
		if (this.busy || this.blocked) return;
		let e = this.lifecycle;
		this.busy = !0;
		try {
			let t = await z.startWizard(this.hass);
			e === this.lifecycle && this.isConnected && (this.draft = t);
		} catch (t) {
			e === this.lifecycle && this.fail(t);
		} finally {
			e === this.lifecycle && (this.busy = !1);
		}
	}
	fail(e) {
		let t = [
			"integration_not_loaded",
			"unauthorized",
			"invalid_format",
			"invalid_response",
			"provider_disabled",
			"provider_authentication",
			"provider_rate_limit",
			"provider_timeout",
			"provider_outage",
			"provider_malformed_response",
			"not_found"
		];
		this.error = e instanceof L && t.includes(e.code) ? `${e.code}: Request failed. Review input or retry when connected. Species can be entered manually; expired previews require a new review.` : "Request failed. Retry when connected.", e instanceof L && ["integration_not_loaded", "unauthorized"].includes(e.code) && this.dispatchEvent(new CustomEvent("backend-unavailable", {
			detail: this.error,
			bubbles: !0,
			composed: !0
		}));
	}
	get defaults() {
		return {
			...V,
			...this.accepted ? this.preview?.snapshot.threshold_defaults.moisture : {}
		};
	}
	manual() {
		this.generation++, this.provider = "manual", this.preview = null, this.accepted = !1, this.results = [], this.error = "";
	}
	async search() {
		if (this.busy || this.blocked || this.query.trim().length < 3) return;
		let e = this.lifecycle, t = ++this.generation;
		this.busy = !0, this.error = "", this.preview = null, this.accepted = !1;
		try {
			let e = await z.searchSpecies(this.hass, this.provider, this.query.trim(), this.hass.language ?? "en");
			t === this.generation && (this.results = e, this.searched = !0);
		} catch (e) {
			t === this.generation && this.fail(e);
		} finally {
			e === this.lifecycle && (this.busy = !1);
		}
	}
	async choose(e) {
		if (!this.draft || this.busy || this.blocked) return;
		let t = this.lifecycle, n = ++this.generation;
		this.busy = !0, this.accepted = !1, this.preview = null, this.error = "";
		try {
			let t = await z.previewWizard(this.hass, this.draft, e.provider, e.provider_ref, this.hass.language ?? "en");
			n === this.generation && (this.preview = t, this.step = 2, await this.focusStep());
		} catch (e) {
			n === this.generation && this.fail(e);
		} finally {
			t === this.lifecycle && (this.busy = !1);
		}
	}
	validate() {
		return !this.name.trim() || this.name.trim().length > 200 ? "Enter a plant name (1–200 characters)." : this.acquired && !Number.isFinite(Date.parse(this.acquired)) ? "Enter a valid acquired date." : this.area && !this.areas.some((e) => e.area_id === this.area) ? "The selected Home Assistant area no longer exists. Choose a current area or No area." : this.provider !== "manual" && (!this.preview || !this.accepted) ? "Review and explicitly accept the selected species preview, or continue manually." : W(this.moisture, this.defaults) ?? Ln(this.category, J(this.tagText));
	}
	async next() {
		if (this.busy || this.blocked || !this.draft || this.step >= 6) return;
		let e = this.lifecycle;
		if (this.error = "", this.step === 0 && !this.name.trim() && (this.error = "Enter a plant name."), this.step === 0 && this.photo && !this.error) {
			this.busy = !0;
			try {
				let t = await Wn(this.photo);
				e === this.lifecycle && (this.photoInfo = t);
			} catch (t) {
				e === this.lifecycle && (this.error = t.message);
			} finally {
				e === this.lifecycle && (this.busy = !1);
			}
			if (e !== this.lifecycle || !this.isConnected) return;
		}
		this.step === 1 && this.provider !== "manual" && !this.preview && (this.error = "Choose a species result or continue manually."), this.step === 2 && this.provider !== "manual" && !this.accepted && (this.error = "Explicitly accept the preview or continue manually."), this.step === 3 && (this.error = W({
			...this.moisture,
			threshold_overrides: {
				min: null,
				target: null,
				max: null
			}
		}, V) ?? ""), this.step === 4 && (this.error = W(this.moisture, this.defaults) ?? ""), this.step === 5 && (this.error = Ln(this.category, J(this.tagText)) ?? ""), this.error || (this.step = this.step === 1 && this.provider === "manual" ? 3 : this.step + 1, await this.focusStep());
	}
	async focusStep() {
		await this.updateComplete, this.shadowRoot?.querySelector("h2")?.focus();
	}
	async create() {
		if (this.busy || this.blocked || !this.draft) return;
		if (!this.finalRequest) {
			if (this.error = this.validate() ?? "", this.error) return;
			this.finalRequest = structuredClone({
				draft_id: this.draft.draft_id,
				draft_token: this.draft.draft_token,
				expected_revision: 0,
				confirmed: !0,
				name: this.name.trim(),
				acquired_at: this.acquired ? new Date(this.acquired).toISOString() : null,
				area_id: this.area || null,
				placement: this.placement,
				category: this.category.trim() || null,
				tags: J(this.tagText),
				moisture: kn(this.moisture, this.entities),
				...this.accepted && this.preview ? { accepted_preview: {
					preview_token: this.preview.preview_token,
					provider: this.preview.provider,
					operation: "select"
				} } : { species: On(this.common, this.latin) }
			});
		}
		this.busy = !0, this.error = "";
		let e = this.lifecycle, t = this.navigationContext;
		try {
			let n = await z.createWizard(this.hass, this.finalRequest);
			if (e !== this.lifecycle || !this.isConnected) return;
			this.dispatchEvent(new CustomEvent("plant-created", {
				detail: {
					plant: n,
					photo: this.photo,
					navigationContext: t
				},
				bubbles: !0,
				composed: !0
			}));
		} catch (t) {
			e === this.lifecycle && (this.fail(t), this.rejected = t instanceof L && t.code === "invalid_format");
		} finally {
			e === this.lifecycle && (this.busy = !1);
		}
	}
	render() {
		return S`<section class="wizard-card"><nav aria-label="Creation progress"><ol class="stepper">${this.visibleSteps.map(({ index: e, label: t }, n) => S`<li aria-current=${e === this.step ? "step" : w}><span class="step-number">${n + 1}</span><span>${t}</span></li>`)}</ol></nav>
      <h2 tabindex="-1">${this.steps[this.step]}</h2><p class="muted">Your plant is saved only after the final confirmation. You can go back without losing your choices.</p>
      ${this.error ? S`<p class="error" role="alert">${this.error}</p>${(this.step === 1 || this.step === 2) && !this.finalRequest ? S`<button type="button" @click=${() => this.manual()}>Continue manually</button>` : w}` : w}
      ${!this.draft && !this.busy ? S`<button @click=${() => void this.start()}>Retry starting draft</button>` : w}
      <fieldset ?disabled=${this.busy || this.blocked || !!this.finalRequest}>
      ${this.step === 0 ? S`${Y("Plant name", this.name, (e) => this.name = e)}${Y("Acquired date", this.acquired, (e) => this.acquired = e, "date")}${zn(this.area, this.areas, (e) => this.area = e)}${Bn(this.placement, (e) => this.placement = e)}<label>Optional local photo<input type="file" accept="image/jpeg,image/png,image/webp" @change=${(e) => {
			this.photo = e.target.files?.[0] ?? null, this.photoInfo = null;
		}}></label><small>JPEG, PNG or WebP; 5 MiB, 2048 × 2048 maximum. Uploaded only after creation.</small>${this.photo ? S`<p>Selected: ${this.photo.name} (${this.photo.size} bytes)</p><button @click=${() => {
			this.photo = null, this.photoInfo = null;
			let e = this.shadowRoot?.querySelector("input[type=\"file\"]");
			e && (e.value = "");
		}}>Remove selected photo</button>` : w}` : w}
      ${this.step === 1 ? S`<div class="choice-cards" role="radiogroup" aria-label="Species source">
        <button type="button" class=${this.provider === "manual" ? "choice-card selected" : "choice-card"} aria-pressed=${this.provider === "manual"} @click=${() => this.manual()}><strong>Enter details myself</strong><span>Choose a species name or continue without one. Works offline.</span></button>
        ${this.capabilities.providers.some((e) => e.provider === "openplantbook") ? S`<button type="button" class=${this.provider === "openplantbook" ? "choice-card selected" : "choice-card"} aria-pressed=${this.provider === "openplantbook"} ?disabled=${!this.capabilities.providers.some((e) => e.provider === "openplantbook" && e.available)} @click=${() => {
			this.manual(), this.provider = "openplantbook";
		}}><strong>Search OpenPlantBook</strong><span>Find a species, review imported information, then choose what to apply.</span></button>` : w}
      </div>
        ${this.capabilities.providers.some((e) => e.provider === "openplantbook" && !e.available) ? S`<aside class="provider-help"><strong>OpenPlantBook is not connected</strong><p>Smart Plants connects directly to OpenPlantBook. Create an OpenPlantBook account and API client credentials, then add them in Home Assistant under Settings → Devices & services → Smart Plants → Configure. You do not need to install a separate Home Assistant integration.</p><a href="https://open.plantbook.io/apikey/" target="_blank" rel="noreferrer">Get OpenPlantBook API credentials</a></aside>` : w}
        ${this.provider === "manual" ? S`<h3>Species details <span class="muted">Optional</span></h3>${Y("Common name", this.common, (e) => this.common = e)}${Y("Scientific name", this.latin, (e) => this.latin = e)}<p class="default-summary">Moisture defaults come from Smart Plants: ${V.min}% minimum, ${V.target}% target, ${V.max}% maximum. You can review or adjust them later.</p>` : S`
        ${Y("Search OpenPlantBook (at least 3 characters)", this.query, (e) => {
			this.query = e, this.generation++, this.results = [], this.preview = null, this.accepted = !1;
		})}<button type="button" class="primary" @click=${() => void this.search()} ?disabled=${this.busy || this.query.trim().length < 3}>Search plants</button>${this.searched && !this.results.length ? S`<p>No matches. Try another search or switch to manual entry.</p>` : w}<ul class="result-list">${this.results.map((e) => S`<li><button type="button" @click=${() => void this.choose(e)}>${e.common_name ?? e.latin_name} · ${e.latin_name}</button><small>${e.attribution}</small></li>`)}</ul><button type="button" @click=${() => this.manual()}>Enter details manually instead</button>`}` : w}
      ${this.step === 2 && this.preview ? S`${Un(this.preview.snapshot, this.preview)}<label class="check"><input type="checkbox" .checked=${this.accepted} @change=${(e) => this.accepted = e.target.checked}>I reviewed and accept this species information</label><p>Imported moisture defaults will be shown with their source. Missing values use Smart Plants defaults.</p><button type="button" @click=${() => this.manual()}>Enter details manually instead</button>` : w}
       ${this.step === 3 ? Vn(this.moisture, this.defaults, this.entities, this.states, this.all, (e) => this.all = e, (e) => this.moisture = e, "sources") : w}
       ${this.step === 4 ? S`<p class="default-summary">Current effective range: <strong>${this.moisture.threshold_overrides.min ?? this.defaults.min}%–${this.moisture.threshold_overrides.max ?? this.defaults.max}%</strong>, target <strong>${this.moisture.threshold_overrides.target ?? this.defaults.target}%</strong>.</p><p>Values shown as inherited use ${this.accepted ? "reviewed OpenPlantBook data where supplied, otherwise Smart Plants defaults" : "Smart Plants built-in defaults"}.</p><details class="advanced-disclosure"><summary>Advanced threshold overrides</summary><p>Leave a value blank to inherit its current default.</p>${Vn(this.moisture, this.defaults, this.entities, this.states, this.all, (e) => this.all = e, (e) => this.moisture = e, "thresholds")}</details>` : w}
      ${this.step === 5 ? S`${Y("Category", this.category, (e) => this.category = e, "text", 60)}${Y("Tags (comma-separated)", this.tagText, (e) => this.tagText = e, "text", 2e3)}<p>Tags and category belong to Smart Plants, independently of Home Assistant labels.</p>` : w}
      ${this.step === 6 ? S`<h3>${this.name}</h3><dl>
        <dt>Area</dt><dd>${this.areas.find((e) => e.area_id === this.area)?.name ?? (this.area ? `${this.area} (missing area)` : "No area")}</dd>
        <dt>Placement</dt><dd>${this.placement?.mode ?? "Not specified"}</dd>
        <dt>Sun / rain exposure</dt><dd>${this.placement?.exposure ?? "Not specified"} / ${this.placement?.rain_exposure ?? "Not specified"}</dd>
        <dt>Container</dt><dd>${this.placement?.container === null || !this.placement ? "Not specified" : this.placement.container ? "In a container" : "In the ground"}</dd>
        <dt>Acquired</dt><dd>${this.acquired || "Not specified"}</dd>
        <dt>Species</dt><dd>${this.accepted && this.preview ? [this.preview.snapshot.common_name, this.preview.snapshot.latin_name].filter(Boolean).join(" · ") : [this.common, this.latin].filter(Boolean).join(" · ") || "No species selected"}</dd>
        <dt>Category / tags</dt><dd>${this.category} / ${J(this.tagText).join(", ")}</dd>
        <dt>Sources</dt><dd>${this.moisture.sources.map((e) => e.entity_id).join(", ") || "None"}</dd>
        <dt>Primary / aggregation</dt><dd>${this.moisture.primary_entity_id ?? "None"} / ${this.moisture.aggregation}</dd>
        <dt>Staleness</dt><dd>${this.moisture.stale_after_seconds} seconds</dd>
        <dt>Effective thresholds</dt><dd>${[
			"min",
			"target",
			"max"
		].map((e) => `${e}: ${this.moisture.threshold_overrides[e] ?? this.defaults[e]}% (${this.moisture.threshold_overrides[e] === null ? "inherited" : "override"})`).join(" · ")}</dd>
        <dt>Photo</dt><dd>${this.photo?.name ?? "None"}${this.photoInfo ? S` · ${this.photoInfo.format} · ${this.photoInfo.width} × ${this.photoInfo.height} pixels · ${this.photoInfo.bytes} bytes` : w}</dd>
        </dl><p>Confirming creates one plant device and its moisture entities. You can configure notifications in Home Assistant afterwards.</p>` : w}
      </fieldset>
      ${this.finalRequest ? S`<p class="notice">The final request is retained unchanged. Retry it to resolve an uncertain result safely, including after reconnect. Do not start a replacement draft until the result is resolved.</p>` : w}
      ${this.rejected ? S`<p>The server rejected the request as invalid or expired. You may correct it using a fresh draft; species data must be previewed and accepted again.</p><button ?disabled=${this.busy || this.blocked} @click=${() => {
			this.finalRequest = null, this.rejected = !1, this.preview = null, this.accepted = !1, this.step = 0, this.error = "", this.start();
		}}>Start fresh draft retaining editable fields</button>` : w}
      <div class="actions"><button @click=${() => {
			this.step = this.step === 3 && this.provider === "manual" ? 1 : this.step - 1, this.focusStep();
		}} ?disabled=${this.step === 0 || this.busy || !!this.finalRequest}>Previous step</button>
      ${this.step < 6 ? S`<button class="primary" @click=${() => void this.next()} ?disabled=${this.busy || this.blocked || !this.draft}>Next step</button>` : S`<button class="primary" @click=${() => void this.create()} ?disabled=${this.busy || this.blocked || !this.draft}>${this.finalRequest ? "Retry same creation request" : "Confirm and create plant"}</button>`}</div>
      <p role="status">${this.busy ? "Working…" : ""}</p></section>`;
	}
};
Kn = Q, Kn.styles = Gn, Z([O({ attribute: !1 })], Q.prototype, "hass", void 0), Z([O({ attribute: !1 })], Q.prototype, "capabilities", void 0), Z([O({ attribute: !1 })], Q.prototype, "areas", void 0), Z([O({ attribute: !1 })], Q.prototype, "entities", void 0), Z([O({ attribute: !1 })], Q.prototype, "states", void 0), Z([O({ type: Boolean })], Q.prototype, "blocked", void 0), Z([O({ type: Number })], Q.prototype, "navigationContext", void 0), Z([k()], Q.prototype, "step", void 0), Z([k()], Q.prototype, "busy", void 0), Z([k()], Q.prototype, "error", void 0), Z([k()], Q.prototype, "name", void 0), Z([k()], Q.prototype, "acquired", void 0), Z([k()], Q.prototype, "area", void 0), Z([k()], Q.prototype, "placement", void 0), Z([k()], Q.prototype, "category", void 0), Z([k()], Q.prototype, "tagText", void 0), Z([k()], Q.prototype, "common", void 0), Z([k()], Q.prototype, "latin", void 0), Z([k()], Q.prototype, "provider", void 0), Z([k()], Q.prototype, "query", void 0), Z([k()], Q.prototype, "results", void 0), Z([k()], Q.prototype, "searched", void 0), Z([k()], Q.prototype, "preview", void 0), Z([k()], Q.prototype, "accepted", void 0), Z([k()], Q.prototype, "moisture", void 0), Z([k()], Q.prototype, "all", void 0), Z([k()], Q.prototype, "draft", void 0), Z([k()], Q.prototype, "finalRequest", void 0), Z([k()], Q.prototype, "photo", void 0), Z([k()], Q.prototype, "photoInfo", void 0), Z([k()], Q.prototype, "rejected", void 0), customElements.get("smart-plants-wizard") || customElements.define("smart-plants-wizard", Q);
//#endregion
//#region src/panel.ts
var qn, Jn = Object.fromEntries([
	{
		problemRole: "temperature_stress",
		configRole: "temperature",
		keys: dt,
		defaults: ut,
		unit: "°C",
		min: "-40",
		max: "80",
		step: "0.1",
		labels: {
			cold_threshold_celsius: "Cold trigger (°C)",
			cold_clear_celsius: "Cold clear (°C)",
			hot_clear_celsius: "Hot clear (°C)",
			hot_threshold_celsius: "Hot trigger (°C)"
		},
		successNotice: "Temperature stress thresholds saved.",
		formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy cold trigger < cold clear < hot clear < hot trigger, with at least 0.5 °C hysteresis per side and a 1.0 °C stable band.",
		validate: (e) => _t(e),
		seed: (e) => vt(e)
	},
	{
		problemRole: "humidity_stress",
		configRole: "humidity",
		keys: bt,
		defaults: yt,
		unit: "%",
		min: "0",
		max: "100",
		step: "0.1",
		labels: {
			dry_threshold_percent: "Dry trigger (%)",
			dry_clear_percent: "Dry clear (%)",
			damp_clear_percent: "Damp clear (%)",
			damp_threshold_percent: "Damp trigger (%)"
		},
		successNotice: "Humidity stress thresholds saved.",
		formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy dry trigger < dry clear < damp clear < damp trigger, with at least 1.0 % hysteresis per side and a 5.0 % stable band.",
		validate: (e) => Dt(e),
		seed: (e) => Ot(e)
	},
	{
		problemRole: "conductivity_stress",
		configRole: "conductivity",
		keys: At,
		defaults: kt,
		unit: "µS/cm",
		min: "0",
		max: "10000",
		step: "0.1",
		labels: {
			low_threshold_micro_siemens_per_cm: "Low trigger (µS/cm)",
			low_clear_micro_siemens_per_cm: "Low clear (µS/cm)",
			high_clear_micro_siemens_per_cm: "High clear (µS/cm)",
			high_threshold_micro_siemens_per_cm: "High trigger (µS/cm)"
		},
		successNotice: "Conductivity stress thresholds saved.",
		formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy low trigger < low clear < high clear < high trigger, with at least 10.0 µS/cm hysteresis per side and a 50.0 µS/cm stable band.",
		validate: (e) => Lt(e),
		seed: (e) => Rt(e)
	},
	{
		problemRole: "co2_stress",
		configRole: "co2",
		keys: Bt,
		defaults: zt,
		unit: "ppm",
		min: "0",
		max: "10000",
		step: "1",
		labels: {
			threshold_ppm: "High trigger (ppm)",
			clear_ppm: "High clear (ppm)"
		},
		successNotice: "CO2 stress thresholds saved.",
		formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy clear_ppm < threshold_ppm with at least 100 ppm hysteresis; both are integers within 0…10000 ppm.",
		validate: (e) => qt(e),
		seed: (e) => Jt(e)
	},
	{
		problemRole: "soil_temperature_stress",
		configRole: "soil_temperature",
		keys: Xt,
		defaults: Yt,
		unit: "°C",
		min: "-20",
		max: "60",
		step: "0.1",
		labels: {
			cold_threshold_celsius: "Cold trigger (°C)",
			cold_clear_celsius: "Cold clear (°C)",
			hot_clear_celsius: "Hot clear (°C)",
			hot_threshold_celsius: "Hot trigger (°C)"
		},
		successNotice: "Soil temperature stress thresholds saved.",
		formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy cold trigger < cold clear < hot clear < hot trigger, with at least 0.5 °C hysteresis per side and a 1.0 °C stable band, all within −20.0…60.0 °C.",
		validate: (e) => rn(e),
		seed: (e) => an(e)
	},
	{
		problemRole: "low_battery",
		configRole: "battery",
		keys: sn,
		defaults: on,
		unit: "%",
		min: "0",
		max: "100",
		step: "1",
		labels: {
			threshold_percent: "Low trigger (%)",
			clear_percent: "Low clear (%)"
		},
		successNotice: "Low battery thresholds saved.",
		formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy threshold_percent < clear_percent with at least 1 % hysteresis; both are integers within 0…100 %.",
		validate: (e) => pn(e),
		seed: (e) => mn(e)
	},
	{
		problemRole: "low_light",
		configRole: "illuminance",
		keys: gn,
		defaults: hn,
		unit: "lx",
		min: "0",
		max: "200000",
		step: "0.1",
		labels: {
			target_lux: "Target (lx)",
			clear_lux: "Clear (lx)"
		},
		successNotice: "Low light thresholds saved.",
		formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy target_lux < clear_lux with at least 10.0 lx hysteresis; both are within 0.0…200000.0 lx.",
		validate: (e) => Sn(e),
		seed: (e) => Cn(e)
	}
].map((e) => [e.problemRole, e])), Yn = "M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", Xn = "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z", $ = class extends D {
	constructor(...e) {
		super(...e), this.narrow = !1, this._plants = [], this._loading = !0, this._error = "", this._notice = "", this._view = { kind: "list" }, this._detailSection = "overview", this._formBusy = !1, this._capabilities = null, this._blocked = !0, this._areas = [], this._entities = [], this._devices = [], this._states = {}, this._evaluations = {}, this._health = {}, this._healthError = "", this._careHistory = null, this._careError = "", this._careDate = "", this._careNote = "", this._careKind = "watering", this._careFields = {}, this._careEditingId = null, this._registryError = "", this._areaReview = !1, this._filters = {}, this._edits = null, this._conflict = null, this._allSensors = !1, this._preview = null, this._provider = "manual", this._query = "", this._results = [], this._related = [], this._imageUrl = null, this._imageLoading = !1, this._imageError = null, this._dialog = null, this._wizardStarted = !1, this._creationNotice = "", this._createdPlantId = null, this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._thresholdSaved = {}, this._pendingThresholdSwitch = null, this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._sourceUnavailable = null, this._sourceSaved = {}, this._pendingSourceSwitch = null, this._allSourceSensors = !1, this._base = null, this._baseArea = "", this._imageKey = null, this._imageRequest = 0, this._request = 0, this._careRequest = 0, this._providerRequest = 0, this._context = 0, this._subscriptionGeneration = 0, this._focusReturn = null, this._ready = () => {
			this._refresh();
		}, this._disconnected = () => {
			this._context++, this._formBusy = !1, this._blocked = !0, this._request++, this._providerRequest++, this._preview = null, this._clearImage(), this._error = "Disconnected. Local edits and creation retries are retained. Reconnect before saving.";
		};
	}
	willUpdate(e) {
		e.has("hass") && (this.hass?.states && (this._states = Object.fromEntries(Object.entries(this.hass.states).filter(([e, t]) => qe(t) && t.entity_id === e))), this._syncImage());
	}
	updated(e) {
		e.has("hass") && (this.hass?.connection !== this._connection && (this._unbind(), this._bind(), this._refresh()), this.hass?.user?.is_admin === !1 && this._unbind());
		let t = this.shadowRoot?.querySelector("dialog"), n = this.shadowRoot?.activeElement;
		t?.open && (!n || !t.contains(n) || n.matches(":disabled")) && t.querySelector("button")?.focus();
	}
	connectedCallback() {
		super.connectedCallback(), this.hasUpdated && (this._bind(), this._refresh(), this._syncImage()), this._timer = setInterval(() => {
			!this._formBusy && !this._loading && this.isConnected && this._refresh(!1);
		}, 3e4);
	}
	disconnectedCallback() {
		this._context++, this._formBusy = !1, this._request++, this._providerRequest++, this._clearImage(), this._unbind(), clearInterval(this._timer), super.disconnectedCallback();
	}
	_bind() {
		if (!this.hass || this.hass.user?.is_admin === !1 || this._connection) return;
		let e = this.hass.connection;
		this._connection = e;
		let t = this._subscriptionGeneration;
		e.addEventListener?.("ready", this._ready), e.addEventListener?.("disconnected", this._disconnected), z.subscribeRegistry(this.hass, this._ready).then((n) => {
			this._connection !== e || t !== this._subscriptionGeneration || !this.isConnected ? n() : this._unsubscribe = n;
		}).catch(() => {
			this._registryError = "Registry updates unavailable; reconnect to retry native changes.";
		});
	}
	_unbind() {
		this._context++, this._formBusy = !1, this._request++, this._providerRequest++, this._preview = null, this._blocked = !0, this._clearImage(), this._subscriptionGeneration++, this._unsubscribe?.(), this._unsubscribe = void 0, this._connection?.removeEventListener?.("ready", this._ready), this._connection?.removeEventListener?.("disconnected", this._disconnected), this._connection = void 0;
	}
	_clearImage() {
		this._imageRequest++, this._imageAbort?.abort(), this._imageAbort = void 0, this._imageKey = null, this._imageUrl && URL.revokeObjectURL(this._imageUrl), this._imageUrl = null, this._imageLoading = !1, this._imageError = null;
	}
	_syncImage() {
		if (this._blocked || this.hass?.user?.is_admin === !1) {
			this._clearImage();
			return;
		}
		let e = this._view.kind === "detail" ? this._plantById(this._view.plantId) : void 0, t = this.hass && e?.image ? `${this.hass.auth?.accessToken ?? ""}:${e.id}:${e.revision}:${e.image.id}` : null;
		if (t === this._imageKey || !this.isConnected || (this._clearImage(), this._imageKey = t, !t || !this.hass || !e)) return;
		let n = this._imageRequest, r = new AbortController();
		this._imageAbort = r, this._imageLoading = !0, z.fetchImage(this.hass, e.id, r.signal).then((e) => {
			let t = URL.createObjectURL(e);
			if (n !== this._imageRequest || !this.isConnected) {
				URL.revokeObjectURL(t);
				return;
			}
			this._imageAbort = void 0, this._imageUrl = t, this._imageLoading = !1;
		}).catch((e) => {
			n === this._imageRequest && (this._imageAbort = void 0, this._imageLoading = !1, e instanceof DOMException && e.name === "AbortError" || (this._imageError = this._friendly(e)));
		});
	}
	async _refresh(e = !0) {
		if (!this.isConnected || !this.hass || this.hass.user?.is_admin === !1) return;
		let t = ++this._request, n = this.hass;
		e && (this._loading = !0);
		try {
			let r = await z.info(n), i = await z.list(n);
			if (t !== this._request || !this.isConnected) return;
			if (this._capabilities = r, this._blocked = !1, this._plants = i, e && (this._error = ""), this._base) {
				let e = i.find((e) => e.id === this._base?.id);
				e && e.revision !== this._base.revision && this._setConflict(this._base, e), e || (this._context++, this._formBusy = !1, this._closeDialog(), this._base = null, this._conflict = null, this._edits = null, this._notice = "This plant was deleted in another session.", this.updateComplete.then(() => this.shadowRoot?.querySelector("h1")?.focus()));
			}
			this._syncImage();
			try {
				let [e, r, i, a] = await Promise.all([
					z.areas(n),
					z.entities(n),
					z.devices(n),
					z.states(n)
				]);
				if (t !== this._request) return;
				if (this._areas = e, this._entities = r, this._devices = i, this._states = n.states ? Object.fromEntries(Object.entries(n.states).filter(([e, t]) => qe(t) && t.entity_id === e)) : Object.fromEntries(a.map((e) => [e.entity_id, e])), this._registryError = "", this._base && this._edits) {
					let e = G(this._base, i)?.area_id ?? "";
					if (e !== this._baseArea) {
						let t = this._edits.area !== this._baseArea;
						this._notice = `Home Assistant area changed from ${this._areaName(this._baseArea)} to ${this._areaName(e)}.${t ? " Your area selection is retained; review it before saving." : " The area selector now reflects the native area."}`, t || this._edit({ area: e }), this._areaReview = t, this._baseArea = e;
					}
				}
			} catch (e) {
				t === this._request && (this._registryError = this._friendly(e));
			}
			let a = await Promise.all(i.map(async (e) => {
				try {
					return [e.id, await z.evaluation(n, e.id)];
				} catch {
					return null;
				}
			}));
			if (t === this._request && (this._evaluations = Object.fromEntries(a.filter((e) => e !== null))), this._view.kind === "detail") {
				let e = this._view.plantId;
				await this._loadCare(e, this._context, t);
				try {
					let r = await z.plantHealth(n, e);
					t === this._request && (this._health = {
						...this._health,
						[e]: r
					}, this._healthError = "");
				} catch (n) {
					if (t === this._request) {
						let t = { ...this._health };
						delete t[e], this._health = t, this._healthError = this._friendly(n);
					}
				}
			}
		} catch (e) {
			t === this._request && (this._error = this._friendly(e), this._blocked = !0, this._clearImage());
		} finally {
			t === this._request && (this._loading = !1);
		}
	}
	_friendly(e) {
		return e instanceof L ? {
			integration_not_loaded: "Smart Plants is not loaded. Open Settings → Devices & Services, then refresh after loading the integration.",
			unauthorized: "Smart Plants requires an administrator account.",
			not_found: "Plant or species not found. It may have been removed in another session.",
			revision_conflict: "This plant changed elsewhere. Review the refreshed field changes and explicitly reapply your edits.",
			provider_disabled: "Provider is unavailable. Continue manually; accepted local species data remains available.",
			provider_authentication: "Provider authentication failed. Review the integration's reauthentication in Settings, or continue manually.",
			provider_rate_limit: "Provider rate limit reached. Retry later or continue manually.",
			provider_timeout: "Provider timed out. Retry later or continue manually.",
			provider_outage: "Provider is currently unavailable. Retry later or continue manually.",
			provider_malformed_response: "Provider returned an invalid response. Continue manually or retry later.",
			version_mismatch: "Panel/API version mismatch. Restart Home Assistant and fully reload the frontend after upgrading.",
			invalid_response: "The response is incompatible. Refresh before editing or retrying; creation retries retain the original request.",
			invalid_format: "The server rejected the input. Review fields and source identities. Images must be valid JPEG, PNG or WebP up to 5 MiB and 2048 × 2048 pixels; expired species previews require a new review."
		}[e.code] ?? "Request failed. Refresh and retry when connected." : "Request failed. Refresh and retry when connected.";
	}
	_plantById(e) {
		return this._plants.find((t) => t.id === e);
	}
	_areaName(e) {
		return this._areas.find((t) => t.area_id === e)?.name ?? (e || "No area");
	}
	_setConflict(e, t) {
		let n = [
			"name",
			"acquired_at",
			"placement",
			"category",
			"tags",
			"species",
			"image",
			"lifecycle_state",
			"roles",
			"care_events"
		].filter((n) => JSON.stringify(e[n]) !== JSON.stringify(t[n])).map((n) => n === "roles" ? "Sensor configuration or threshold defaults/overrides changed." : `${n}: ${JSON.stringify(e[n])} → ${JSON.stringify(t[n])}`);
		this._conflict = {
			before: e,
			after: t,
			changes: n
		}, this._preview = null, this._providerRequest++;
	}
	_beginEdit(e) {
		let t = U(e);
		this._base = structuredClone(e), this._baseArea = G(e, this._devices)?.area_id ?? "", this._edits = {
			name: e.name,
			acquired: e.acquired_at ?? "",
			placement: structuredClone(e.placement),
			category: e.category ?? "",
			tagText: e.tags.join(", "),
			area: this._baseArea,
			common: e.species?.snapshot.common_name ?? "",
			latin: e.species?.snapshot.latin_name ?? "",
			moisture: t ? Dn(t) : null
		}, this._conflict = null, this._areaReview = !1, this._preview = null, this._results = [], this._provider = "manual", this._related = [], this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._thresholdSaved = {}, this._pendingThresholdSwitch = null, this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._sourceSaved = {}, this._pendingSourceSwitch = null, this._allSourceSensors = !1, this._sourceUnavailable = null;
		let n = G(e, this._devices), r = this._context;
		n && this.hass && z.related(this.hass, n.id).then((t) => {
			r === this._context && this._base?.id === e.id && (this._related = t);
		}).catch(() => {
			r === this._context && this._base?.id === e.id && (this._notice = "Related automations could not be loaded. Open the native device page to inspect them.");
		});
	}
	_show(e) {
		if (this._context++, this._closeDialog(), this._formBusy = !1, this._providerRequest++, this._view = e, this._error = "", this._notice = "", this._healthError = "", this._careHistory = null, this._careError = "", e.kind === "create" && (this._wizardStarted = !0), e.kind === "detail") {
			this._detailSection = "overview";
			let t = /* @__PURE__ */ new Date();
			this._careDate = (/* @__PURE__ */ new Date(t.getTime() - t.getTimezoneOffset() * 6e4)).toISOString().slice(0, 16), this._careNote = "";
			let n = this._plantById(e.plantId);
			n && this._beginEdit(n);
			let r = e.plantId, i = this.hass, a = this._context;
			i && !this._blocked && (this._loadCare(r, a), z.plantHealth(i, r).then((e) => {
				a === this._context && (this._health = {
					...this._health,
					[r]: e
				}, this._healthError = "");
			}).catch((e) => {
				if (a === this._context) {
					let t = { ...this._health };
					delete t[r], this._health = t, this._healthError = this._friendly(e);
				}
			}));
		} else this._base = null, this._edits = null, this._conflict = null;
		this._syncImage(), this.updateComplete.then(() => this.shadowRoot?.querySelector("h1")?.focus());
	}
	_handleMenuAction(e) {
		e.detail.item.value === "add-plant" && this._show({ kind: "create" }), e.detail.item.value === "back-to-overview" && this._show({ kind: "list" });
	}
	async _loadCare(e, t, n) {
		if (!this.hass) return;
		let r = ++this._careRequest;
		try {
			let i = await z.careHistory(this.hass, e);
			r === this._careRequest && t === this._context && (n === void 0 || n === this._request) && this._view.kind === "detail" && this._view.plantId === e && (this._careHistory = i, this._careError = "");
		} catch (e) {
			r === this._careRequest && t === this._context && (n === void 0 || n === this._request) && (this._careHistory = null, this._careError = this._friendly(e));
		}
	}
	_carePayload() {
		let e = this._careNote.trim() || null;
		switch (this._careKind) {
			case "watering": return { note: e };
			case "fertilizing": {
				let t = this._careFields.amount?.trim() ? Number(this._careFields.amount) : null;
				return {
					product: this._careFields.product?.trim() || null,
					amount: t,
					unit: t === null ? null : this._careFields.unit || null,
					note: e
				};
			}
			case "pruning": return {
				part: this._careFields.part?.trim() || null,
				note: e
			};
			case "repotting": return {
				container: this._careFields.container?.trim() || null,
				medium: this._careFields.medium?.trim() || null,
				note: e
			};
			case "note": return { text: this._careFields.text?.trim() ?? "" };
		}
	}
	_editCare(e) {
		this._careEditingId = e.id, this._careKind = e.kind, this._careNote = typeof e.payload.note == "string" ? e.payload.note : "";
		let t = new Date(e.occurred_at);
		this._careDate = (/* @__PURE__ */ new Date(t.getTime() - t.getTimezoneOffset() * 6e4)).toISOString().slice(0, 16);
		let n = e.payload;
		this._careFields = Object.fromEntries(Object.entries(n).map(([e, t]) => [e, t == null ? "" : String(t)])), this._careError = "";
	}
	async _saveCare(e) {
		let t = this._careHistory;
		if (!this.hass || !t || t.revision !== e.revision || this._formBusy || this._blocked || this._conflict) {
			this._careError = "Refresh care history before saving. Your draft is retained.";
			return;
		}
		let n = new Date(this._careDate);
		if (!this._careDate || Number.isNaN(n.getTime()) || n.getTime() > Date.now() || (/* @__PURE__ */ new Date(n.getTime() - n.getTimezoneOffset() * 6e4)).toISOString().slice(0, 16) !== this._careDate) {
			this._careError = "Choose a valid local date and time that is not in the future.";
			return;
		}
		let r = this._careFields, i = this._carePayload(), a = typeof i.note == "string" ? i.note : null;
		if ((this._careKind === "watering" || this._careKind === "fertilizing" || this._careKind === "pruning" || this._careKind === "repotting") && a && a.length > 500) {
			this._careError = "Notes must be at most 500 characters.";
			return;
		}
		if (this._careKind === "fertilizing" && i.amount !== null && (!Number.isFinite(i.amount) || Number(i.amount) <= 0 || Number(i.amount) > 1e5 || !i.unit)) {
			this._careError = "Enter a positive amount up to 100000 with a unit.";
			return;
		}
		if (this._careKind === "note" && (!String(i.text).trim() || String(i.text).length > 1e3)) {
			this._careError = "Enter a note of 1 to 1000 characters.";
			return;
		}
		if (Object.values(r).some((e) => e.length > 120)) {
			this._careError = "Care details must be at most 120 characters.";
			return;
		}
		let o = -n.getTimezoneOffset(), s = `${o < 0 ? "-" : "+"}${String(Math.floor(Math.abs(o) / 60)).padStart(2, "0")}:${String(Math.abs(o) % 60).padStart(2, "0")}`, c = `${this._careDate}:00${s}`, l = this.hass;
		this._careError = "", await this._mutate(async () => (this._careEditingId ? await z.editCareEvent(l, e.id, e.revision, this._careEditingId, this._careKind, c, i) : await z.addCareEvent(l, e.id, e.revision, this._careKind, c, i)).plant), this._error || (this._careEditingId = null, this._careKind = "watering", this._careFields = {}, this._careNote = "");
	}
	async _deleteCare(e, t) {
		if (!this.hass || !this._careHistory || this._careHistory.revision !== e.revision) {
			this._careError = "Refresh care history before deleting.";
			return;
		}
		if (!window.confirm(`Delete this ${t.kind} record? This cannot be undone.`)) return;
		let n = this.hass;
		await this._mutate(async () => (await z.deleteCareEvent(n, e.id, e.revision, t.id)).plant);
	}
	_renderCare(e) {
		let t = this._careHistory, n = {
			fertilizing: [
				"product",
				"amount",
				"unit"
			],
			pruning: ["part"],
			repotting: ["container", "medium"],
			note: ["text"]
		}, r = {
			product: "Product",
			amount: "Amount",
			unit: "Unit (g or mL)",
			part: "Plant part",
			container: "Container",
			medium: "Growing medium",
			text: "Note text"
		}, i = (e) => ({
			watering: "Watering",
			fertilizing: "Fertilizing",
			pruning: "Pruning",
			repotting: "Repotting",
			note: "Note"
		})[e], a = (e) => `${e.local_date} · ${e.occurred_at} (recorded offset)`;
		return S`<section aria-labelledby="care-heading"><h2 id="care-heading">Care history</h2>
      ${this._careError ? S`<p class="error" role="alert">${this._careError}</p>` : w}
      ${t ? S`<p role="status">${t.summary.watering_count} watering events. Last watered: ${t.summary.last_watered_local_date ?? "never"}.</p>
        ${t.events.length ? S`<ul aria-label="Plant care events">${t.events.map((t) => S`<li><strong>${i(t.kind)}</strong> <time datetime=${t.occurred_at}>${a(t)}</time>
          ${Object.entries(t.payload).filter(([, e]) => e !== null).map(([e, t]) => S`<p>${r[e] ?? e}: ${t}</p>`)}
          <button type="button" ?disabled=${this._formBusy || !!this._conflict} @click=${() => this._editCare(t)}>Edit ${i(t.kind).toLowerCase()}</button>
          <button type="button" ?disabled=${this._formBusy || !!this._conflict} @click=${() => void this._deleteCare(e, t)}>Delete ${i(t.kind).toLowerCase()}</button></li>`)}</ul>` : S`<p>No care recorded yet.</p>`}` : S`<p>Loading care history or refresh to retry.</p>`}
      <fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict || !t || t.revision !== e.revision}>
        <legend>${this._careEditingId ? `Edit ${i(this._careKind).toLowerCase()}` : "Record care"}</legend>
        <label>Care type<select aria-label="Care type" .value=${this._careKind} @change=${(e) => {
			this._careKind = e.target.value, this._careFields = {};
		}}>${[
			"watering",
			"fertilizing",
			"pruning",
			"repotting",
			"note"
		].map((e) => S`<option value=${e}>${i(e)}</option>`)}</select></label>
        <label>When (your local time)<input type="datetime-local" .value=${this._careDate} @input=${(e) => this._careDate = e.target.value}></label>
        ${(n[this._careKind] ?? []).map((e) => S`<label>${r[e]}<input aria-label=${r[e]} type=${e === "amount" ? "number" : "text"} maxlength=${e === "text" ? 1e3 : 120} .value=${this._careFields[e] ?? ""} @input=${(t) => this._careFields = {
			...this._careFields,
			[e]: t.target.value
		}}></label>`)}
        ${this._careKind === "note" ? w : S`<label>Note (optional)<input type="text" maxlength="500" .value=${this._careNote} @input=${(e) => this._careNote = e.target.value}></label>`}
        ${this._careKind === "fertilizing" ? S`<label>Unit<select aria-label="Unit" .value=${this._careFields.unit ?? ""} @change=${(e) => this._careFields = {
			...this._careFields,
			unit: e.target.value
		}}><option value="">No measured amount</option><option value="g">g</option><option value="mL">mL</option></select></label>` : w}
        <button type="button" class="primary" @click=${() => void this._saveCare(e)}>${this._careEditingId ? "Save care changes" : "Record care"}</button>
        ${this._careEditingId ? S`<button type="button" @click=${() => {
			this._careEditingId = null, this._careKind = "watering", this._careFields = {}, this._careNote = "";
		}}>Cancel editing</button>` : w}
      </fieldset><p>Care records do not operate irrigation or change moisture alerts.</p></section>`;
	}
	_edit(e) {
		this._edits && (this._edits = {
			...this._edits,
			...e
		});
	}
	_status(e) {
		let t = this._evaluations[e.id];
		return e.lifecycle_state === "disabled" ? "disabled" : !t || !t.computed_available ? "unavailable" : t.needs_water ? "needs water" : t.too_wet ? "too wet" : t.sensor_stale ? "stale" : "healthy";
	}
	_missing(e) {
		return !!U(e)?.sources.some((e) => e.registry_id && !K(e, this._entities));
	}
	_matches(e) {
		let t = this._filters, n = this._status(e), r = this._evaluations[e.id], i = [
			e.name,
			e.species?.snapshot.common_name,
			e.species?.snapshot.latin_name,
			e.category,
			...e.tags
		].join(" ").toLocaleLowerCase();
		return (!t.search || i.includes(t.search.toLocaleLowerCase())) && (!t.status || (t.status === "problems" ? [
			"needs water",
			"too wet",
			"stale",
			"unavailable"
		].includes(n) || this._missing(e) : n === t.status)) && (!t.area || (G(e, this._devices)?.area_id ?? "none") === t.area) && (!t.placement || (e.placement?.mode ?? "none") === t.placement) && (!t.lifecycle || e.lifecycle_state === t.lifecycle) && (!t.species || (e.species?.snapshot.latin_name ?? e.species?.snapshot.common_name ?? "none") === t.species) && (!t.category || (e.category ?? "none") === t.category) && (!t.tag || e.tags.includes(t.tag)) && (!t.sensor || (t.sensor === "missing" ? this._missing(e) : t.sensor === "stale" ? !!r?.sensor_stale : t.sensor === "unavailable" ? !r?.computed_available : this._missing(e) || !!r?.sensor_stale));
	}
	_filter(e, t, n) {
		return X(e, this._filters[t] ?? "", [{
			value: "",
			label: `All ${e.toLowerCase()}`
		}, ...[...new Set(n)].sort().map((e) => ({
			value: e,
			label: t === "area" ? this._areaName(e === "none" ? "" : e) : e
		}))], (e) => this._filters = {
			...this._filters,
			[t]: e
		});
	}
	_renderList() {
		if (this._loading) return S`<p role="status">Loading plants…</p>`;
		let e = this._plants.filter((e) => this._matches(e)), t = this._plants.filter((e) => this._status(e) === "needs water").length, n = this._plants.filter((e) => e.lifecycle_state !== "disabled" && (this._missing(e) || [
			"too wet",
			"stale",
			"unavailable"
		].includes(this._status(e)))).length;
		return S`<section class="inventory-summary" aria-label="Plant summary"><article><span>Total plants</span><strong>${this._plants.length}</strong></article><article><span>Needs water</span><strong>${t}</strong></article><article><span>Problems</span><strong>${n}</strong></article></section>
      <details class="filter-disclosure"><summary role="button">Filter plants${Object.values(this._filters).filter(Boolean).length ? ` · ${Object.values(this._filters).filter(Boolean).length} active` : ""}</summary><section><div class="grid">${Y("Search plants", this._filters.search ?? "", (e) => this._filters = {
			...this._filters,
			search: e
		})}
      ${this._filter("Status", "status", [
			"healthy",
			"needs water",
			"too wet",
			"stale",
			"unavailable",
			"disabled",
			"problems"
		])}
      ${this._filter("Lifecycle", "lifecycle", ["active", "disabled"])}
      ${this._filter("Area", "area", ["none", ...this._areas.map((e) => e.area_id)])}
      ${this._filter("Placement", "placement", this._plants.map((e) => e.placement?.mode ?? "none"))}
      ${this._filter("Species", "species", this._plants.map((e) => e.species?.snapshot.latin_name ?? e.species?.snapshot.common_name ?? "none"))}
      ${this._filter("Category", "category", this._plants.map((e) => e.category ?? "none"))}
      ${this._filter("Sensor condition", "sensor", [
			"missing",
			"stale",
			"unavailable",
			"missing or stale"
		])}
      ${this._filter("Tags", "tag", this._plants.flatMap((e) => e.tags))}</div><button @click=${() => this._filters = {}}>Clear filters</button></section></details>
      ${this._plants.length ? e.length ? S`<p class="plant-count" role="status">${e.length === this._plants.length ? `${e.length} plants` : `${e.length} of ${this._plants.length} plants`}</p><ul class="plants">${e.map((e) => S`<li class="plant plant-card"><div class="plant-card-heading"><span class="plant-avatar" aria-hidden="true">${(e.name.trim()[0] ?? "?").toLocaleUpperCase()}</span><div><button class="name" @click=${() => this._show({
			kind: "detail",
			plantId: e.id
		})}>${e.name}</button><span class="plant-status">${this._status(e)}${this._missing(e) ? " · missing source" : ""}</span></div></div><div class="plant-card-metrics"><div><small>Soil moisture</small><strong>${this._evaluations[e.id]?.computed_percent ?? "—"}<small>%</small></strong></div><div><small>Moisture health</small><strong>${this._evaluations[e.id]?.health_score ?? "—"}<small>/100</small></strong></div></div><small class="plant-meta">${this._areaName(G(e, this._devices)?.area_id ?? "")} · ${e.placement?.mode ?? "No placement"}<br>${e.species?.snapshot.common_name ?? e.species?.snapshot.latin_name ?? "Manual plant"} · ${e.category ?? "Uncategorized"}${e.tags.length ? S`<br>${e.tags.join(" · ")}` : w}</small></li>`)}</ul>` : S`<p role="status">No plants match these filters.</p>` : S`<section class="empty"><h2>A home for every plant</h2><p>Create a lasting plant profile, connect replaceable moisture sensors, and use its entities in native Home Assistant automations. Species and sensors are optional.</p><button class="primary" ?disabled=${this._blocked} @click=${() => this._show({ kind: "create" })}>Add your first plant</button></section>`}`;
	}
	async _save(e) {
		let t = this._base, n = this._edits;
		if (!this.hass || !t || !n || this._formBusy || this._blocked || this._conflict || e === "area" && this._areaReview) return;
		if (e === "area" && (this._registryError || n.area && !this._areas.some((e) => e.area_id === n.area))) {
			this._error = "Reconnect to load current Home Assistant areas, then choose an area or No area.";
			return;
		}
		let r = this.hass, i = {
			plant_id: t.id,
			expected_revision: t.revision
		};
		if (e === "identity") {
			if (!n.name.trim() || n.name.trim().length > 200 || n.acquired && !Number.isFinite(Date.parse(n.acquired))) {
				this._error = "Enter a valid name and acquired ISO date/time.";
				return;
			}
			Object.assign(i, {
				name: n.name.trim(),
				acquired_at: n.acquired ? new Date(n.acquired).toISOString() : null,
				placement: n.placement
			});
		}
		if (e === "taxonomy") {
			let e = Ln(n.category, J(n.tagText));
			if (e) {
				this._error = e;
				return;
			}
			Object.assign(i, {
				category: n.category.trim() || null,
				tags: J(n.tagText)
			});
		}
		if (e === "species" && (i.species = On(n.common, n.latin)), e === "moisture") {
			if (!n.moisture) return;
			if (this._registryError) {
				this._error = "Reconnect to load current registry data before saving moisture sources.";
				return;
			}
			let e = W(n.moisture, this._defaults(t));
			if (e) {
				this._error = e;
				return;
			}
		}
		await this._mutate(async () => e === "area" ? await z.setArea(r, t.id, t.revision, n.area || null) : e === "moisture" && n.moisture ? z.configureMoisture(r, t.id, t.revision, kn(n.moisture, this._entities)) : z.update(r, i), !1, e);
	}
	async _mutate(e, t = !1, n) {
		if (this._formBusy || this._blocked || this._conflict) return;
		this._formBusy = !0, this._error = "";
		let r = this._context, i = this._base, a = this._edits?.area;
		this._request++;
		try {
			let o = await e();
			if (r !== this._context || !this.isConnected) return;
			if (o) {
				let e = this._plantById(o.id);
				if (e && e.revision > o.revision) {
					await this._refresh(!1);
					return;
				}
				this._plants = this._plants.map((e) => e.id === o.id ? o : e), i && this._base?.id === o.id && this._rebaseEdits(i, o, n), n === "area" && a !== void 0 && (this._baseArea = a, this._edit({ area: a }), this._areaReview = !1), this._syncImage(), this._notice = "Saved.";
			}
			t && this._show({ kind: "list" }), await this._refresh(!1);
		} catch (e) {
			if (r !== this._context || !this.isConnected) return;
			this._error = this._friendly(e), e instanceof L && e.code === "revision_conflict" && await this._refresh(!1), e instanceof L && ["integration_not_loaded", "unauthorized"].includes(e.code) && (this._blocked = !0, this._clearImage());
		} finally {
			r === this._context && (this._formBusy = !1);
		}
	}
	_defaults(e) {
		let t = U(e);
		return t ? {
			min: t.threshold_defaults.min.value,
			target: t.threshold_defaults.target.value,
			max: t.threshold_defaults.max.value
		} : V;
	}
	_reviewConflict() {
		if (!this._conflict || !this._edits) return;
		let e = this._sourceConflictFields(this._conflict.after);
		this._rebaseEdits(this._conflict.before, this._conflict.after), this._notice = `Changes reviewed. Your edited fields are retained; inspect them and use each Save button to explicitly reapply.${e.length ? ` Both sessions changed ${e.join(", ")} in the sources editor. Saving will replace the refreshed values for those fields.` : ""} Species previews must be requested and reviewed again.`;
	}
	_sourceConflictFields(e) {
		if (!this._sourceRole || !this._sourceEdits || !this._sourceBaseline) return [];
		let t = q(e, this._sourceRole);
		return t ? [
			"sources",
			"primary_entity_id",
			"aggregation",
			"stale_after_seconds"
		].filter((e) => JSON.stringify(this._sourceEdits[e]) !== JSON.stringify(this._sourceBaseline[e]) && JSON.stringify(t[e]) !== JSON.stringify(this._sourceBaseline[e])) : [];
	}
	_rebaseEdits(e, t, n) {
		if (!this._edits) return;
		let r = this._edits, i = this._areaReview, a = this._sourceRole, o = this._sourceEdits, s = this._sourceBaseline, c = this._thresholdRole, l = this._thresholdEdits, u = this._thresholdBaseline, d = {};
		r.name !== e.name && (d.name = r.name), r.acquired !== (e.acquired_at ?? "") && (d.acquired = r.acquired), JSON.stringify(r.placement) !== JSON.stringify(e.placement) && (d.placement = r.placement), r.category !== (e.category ?? "") && (d.category = r.category), JSON.stringify(J(r.tagText)) !== JSON.stringify(e.tags) && (d.tagText = r.tagText), r.area !== this._baseArea && (d.area = r.area), r.common !== (e.species?.snapshot.common_name ?? "") && (d.common = r.common), r.latin !== (e.species?.snapshot.latin_name ?? "") && (d.latin = r.latin);
		let ee = U(e), te = U(t);
		if (r.moisture && ee && te) {
			let e = Dn(te);
			for (let t of [
				"sources",
				"primary_entity_id",
				"aggregation",
				"stale_after_seconds"
			]) JSON.stringify(r.moisture[t]) !== JSON.stringify(ee[t]) && Object.assign(e, { [t]: structuredClone(r.moisture[t]) });
			for (let t of B) r.moisture.threshold_overrides[t] !== ee.threshold_overrides[t] && (e.threshold_overrides[t] = r.moisture.threshold_overrides[t]);
			d.moisture = e;
		}
		let ne = {
			identity: [
				"name",
				"acquired",
				"placement"
			],
			taxonomy: ["category", "tagText"],
			area: ["area"],
			species: ["common", "latin"],
			moisture: ["moisture"]
		};
		if (n) for (let e of ne[n]) delete d[e];
		if (this._beginEdit(t), this._edit(d), this._areaReview = i, a && o && s) {
			let e = q(t, a);
			if (e) {
				let t = Nn(e), n = structuredClone(t);
				for (let e of [
					"sources",
					"primary_entity_id",
					"aggregation",
					"stale_after_seconds"
				]) JSON.stringify(o[e]) !== JSON.stringify(s[e]) && Object.assign(n, { [e]: structuredClone(o[e]) });
				this._sourceRole = a, this._sourceBaseline = t, this._sourceEdits = n;
			}
		}
		if (c && l && u) {
			let e = Jn[c];
			if (e) {
				let n = e.seed(this._persistedRoleOverrides(e, t)), r = { ...n };
				for (let t of e.keys) l[t] !== u[t] && (r[t] = l[t]);
				this._thresholdRole = c, this._thresholdBaseline = n, this._thresholdEdits = r;
			}
		}
	}
	async _searchSpecies() {
		if (!this.hass || this._formBusy || this._blocked || this._query.trim().length < 3) return;
		let e = this._context, t = ++this._providerRequest;
		this._formBusy = !0, this._error = "", this._preview = null;
		try {
			let e = await z.searchSpecies(this.hass, this._provider, this._query.trim(), this.hass.language ?? "en");
			t === this._providerRequest && (this._results = e, e.length || (this._notice = "No species matches. Try another search or manual entry."));
		} catch (e) {
			t === this._providerRequest && (this._error = this._friendly(e));
		} finally {
			e === this._context && (this._formBusy = !1);
		}
	}
	async _previewSpecies(e) {
		if (!this.hass || !this._base || this._formBusy || this._blocked || this._conflict) return;
		let t = this._context, n = this.shadowRoot?.activeElement, r = ++this._providerRequest, i = this._base;
		this._formBusy = !0, this._error = "", this._preview = null;
		try {
			let t = e ? await z.previewSpecies(this.hass, e.provider, e.provider_ref, this.hass.language ?? "en", i.id) : await z.previewSpeciesRefresh(this.hass, i.id, this.hass.language ?? "en");
			if (!e && (t.provider !== i.species?.provider || t.snapshot.provider_ref !== i.species?.snapshot.provider_ref)) throw new L("invalid_response", "Species refresh returned a different species.");
			r === this._providerRequest && this._base?.revision === i.revision && (this._preview = t, this._openDialog("species", n));
		} catch (e) {
			r === this._providerRequest && (this._error = this._friendly(e));
		} finally {
			t === this._context && (this._formBusy = !1);
		}
	}
	_openDialog(e, t = this.shadowRoot?.activeElement) {
		this._focusReturn = t, this._dialog = e;
		let n = this._context;
		this.updateComplete.then(() => {
			if (n !== this._context || this._dialog !== e) return;
			let t = this.shadowRoot?.querySelector("dialog");
			t && !t.open && t.showModal(), t?.querySelector(e === "species" ? "h2" : "button")?.focus();
		});
	}
	_closeDialog() {
		this.shadowRoot?.querySelector("dialog")?.close(), this._dialog = null, (this._focusReturn?.isConnected && !this._focusReturn.matches(":disabled") ? this._focusReturn : this.shadowRoot?.querySelector("h1"))?.focus(), this._focusReturn = null;
	}
	_renderDialog() {
		if (!this._dialog || !this._base) return w;
		let e = this._base, t = this._preview;
		return S`<dialog aria-labelledby="dialog-title" @cancel=${(e) => {
			e.preventDefault(), this._closeDialog();
		}} @keydown=${(e) => {
			if (e.key !== "Tab") return;
			let t = [...e.currentTarget.querySelectorAll("button:not([disabled]),a[href],input:not([disabled]),summary")], n = t[0], r = t.at(-1);
			e.shiftKey && (this.shadowRoot?.activeElement === n || this.shadowRoot?.activeElement?.matches("#dialog-title")) ? (e.preventDefault(), r?.focus()) : !e.shiftKey && this.shadowRoot?.activeElement === r && (e.preventDefault(), n?.focus());
		}}><h2 id="dialog-title" tabindex="-1">${this._dialog === "delete" ? `Delete ${e.name}?` : "Review species changes"}</h2>
      ${this._dialog === "delete" ? S`<p>This permanently removes the plant, its device, entities, and local photo. This cannot be undone.</p>` : t ? Un(t.snapshot, t) : S`<p>The preview is no longer valid. Close and request a new preview.</p>`}
      <div class="actions"><button @click=${() => this._closeDialog()}>Cancel</button><button class="primary" ?disabled=${this._formBusy || this._blocked || !!this._conflict || this._dialog === "species" && !t} @click=${() => {
			let n = this._dialog;
			if (this._closeDialog(), !this.hass) return;
			let r = this.hass;
			n === "delete" ? this._mutate(() => z.delete(r, e.id, e.revision), !0) : t && this._mutate(() => z.applySpecies(r, e.id, e.revision, t.preview_token, t.provider, t.operation), !1, "species");
		}}>${this._dialog === "delete" ? "Permanently delete plant" : "Accept and apply reviewed species"}</button></div></dialog>`;
	}
	async _uploadImage(e, t) {
		if (!this.hass || this._formBusy || this._blocked) return;
		let n = this._context;
		this._formBusy = !0;
		try {
			await Wn(t);
		} catch (e) {
			n === this._context && (this._error = e.message);
			return;
		} finally {
			n === this._context && (this._formBusy = !1);
		}
		if (n !== this._context || !this.isConnected || this._view.kind !== "detail" || this._view.plantId !== e.id || this._base?.revision !== e.revision) return;
		let r = this.hass;
		await this._mutate(() => z.uploadImage(r, e.id, e.revision, t));
	}
	_renderImage(e) {
		return S`<section><h2>Plant photo</h2>${e.image ? this._imageLoading ? S`<p role="status">Loading photo…</p>` : this._imageError ? S`<p class="error" role="alert">Photo could not be loaded: ${this._imageError}</p><button @click=${() => {
			this._clearImage(), this._syncImage();
		}}>Retry photo</button>` : this._imageUrl ? S`<img class="preview" alt="Photo of ${e.name}" src=${this._imageUrl} @error=${() => {
			this._imageError = "The stored photo could not be decoded. Retry or replace it with a valid image.";
		}}>` : w : S`<p>No photo yet.</p>`}
      ${e.image ? S`<p>Stored locally: ${e.image.content_type} · ${e.image.width} × ${e.image.height} pixels</p>` : w}
      <label>${e.image ? "Replace photo" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" ?disabled=${this._formBusy || this._blocked || !!this._conflict} @change=${(t) => {
			let n = t.target, r = n.files?.[0];
			n.value = "", r && this._uploadImage(e, r);
		}}></label><small>JPEG, PNG or WebP · max 5 MiB · max 2048 × 2048. Images are authenticated and stored locally.</small>
      ${e.image ? S`<button ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => {
			if (this.hass) {
				let t = this.hass;
				this._mutate(() => z.deleteImage(t, e.id, e.revision));
			}
		}}>Remove photo</button>` : w}</section>`;
	}
	_saveButton(e, t) {
		return S`<button class="primary" @click=${() => void this._save(e)}>${t}</button>`;
	}
	_t(e, t, n) {
		return at(this.hass?.localize)(`component.smart_plants.${e}`, t, n);
	}
	_renderOverallHealth(e) {
		let t = this._health[e.id], n = this.hass?.localize, r = this._t("panel.section.overall_health", "Overall health"), i = this._t("panel.section.overall_health_unavailable", "Overall health is unavailable."), a = this._t("panel.section.overall_health_unavailable_detail", "Overall health is unavailable — no configured role is currently reporting a valid value."), o = this._t("panel.section.overall_health_confidence", "Confidence"), s = this._t("panel.section.overall_health_included_roles", "Included roles"), c = this._t("panel.section.overall_health_none_contributing", "No roles are currently contributing to the composite."), l = this._t("panel.section.overall_health_configured_unavailable", "Configured but unavailable"), u = this._t("panel.section.overall_health_all_included", "None — every configured role is currently included.");
		return S`<section aria-labelledby="overall-health-heading"><h2 id="overall-health-heading">${r}</h2>
      ${t ? S`
        <p role="status" aria-live="polite">${t.available && t.health_score !== null ? this._t("panel.section.overall_health_available_summary", "{score} out of 100", { score: t.health_score }) : a}</p>
        <dl class="overall-health">
          <dt>${o}</dt><dd>${t.confidence_label} — ${st(t.confidence_label, n)}</dd>
          <dt>${s}</dt><dd>${t.contributors.length ? S`<ul class="contributors">${t.contributors.map((e) => S`<li>${ot(e, n)}</li>`)}</ul>` : c}</dd>
          <dt>${l}</dt><dd>${(() => {
			let e = t.configured.filter((e) => !t.contributors.includes(e));
			return e.length ? S`<ul class="configured-unavailable">${e.map((e) => S`<li>${ot(e, n)}</li>`)}</ul>` : u;
		})()}</dd>
        </dl>
      ` : S`<p role="status">${this._healthError ? `${i} ${this._healthError}` : i}</p>`}
    </section>`;
	}
	_renderDiagnostics(e) {
		let t = Tn(e, this._entities, this._states), n = t.filter((e) => e.status === "on").length, r = (e) => e === "on" ? this._t("panel.section.advanced_diagnostics_status_problem", "problem detected") : e === "off" ? this._t("panel.section.advanced_diagnostics_status_ok", "no problem") : e === "unavailable" ? this._t("panel.section.advanced_diagnostics_status_unavailable", "unavailable") : this._t("panel.section.advanced_diagnostics_status_not_configured", "not configured"), i = this._pendingThresholdSwitch, a = this._thresholdRole ? Jn[this._thresholdRole] : null, o = a ? a.problemRole.replaceAll("_", " ") : "", s = i ? i.spec.problemRole.replaceAll("_", " ") : "", c = this._t("panel.section.advanced_diagnostics", "Advanced diagnostics"), l = this._t("panel.section.advanced_diagnostics_description", "Status of the problem indicators for this plant. Threshold editing is available for every role: temperature, humidity, conductivity, CO2, soil temperature stress, low battery, and low light.");
		return S`<section aria-labelledby="diagnostics-heading"><h2 id="diagnostics-heading">${c}</h2>
      <p role="status" aria-live="polite">${n === 0 ? this._t("panel.section.advanced_diagnostics_zero_active", "No active problems.") : n === 1 ? this._t("panel.section.advanced_diagnostics_one_active", "1 active problem.") : this._t("panel.section.advanced_diagnostics_many_active", "{count} active problems.", { count: n })}</p>
      <p>${l}</p>
      ${i ? S`<p class="notice threshold-switch-alert" role="alert">${this._t("panel.section.advanced_diagnostics_switch_prompt", "Unsaved changes in the {current} editor. Discard them and switch to the {pending} editor?", {
			current: o,
			pending: s
		})}
        <button type="button" class="primary" @click=${() => this._confirmDiscardAndSwitch()}>${this._t("panel.section.advanced_diagnostics_switch_discard", "Discard and switch")}</button>
        <button type="button" @click=${() => {
			this._pendingThresholdSwitch = null;
		}}>${this._t("panel.section.advanced_diagnostics_switch_keep", "Keep editing")}</button>
      </p>` : w}
      <dl class="diagnostics">${t.map((t) => {
			let n = t.status === "not_configured" ? [] : wn(e, t.role, this._entities, this._states), i = Jn[t.role], a = !!i && t.status !== "not_configured", o = a && this._thresholdRole === t.role && this._thresholdEdits !== null, s = i ? this._thresholdSaved[t.role] : "";
			return S`<dt>${t.label}</dt><dd class=${"status-" + t.status}>${r(t.status)}${t.reason ? S` — ${t.reason}` : w}${n.length ? S`<ul class="thresholds" aria-label=${`${t.label} effective thresholds`}>${n.map((e) => S`<li><span class="threshold-label">${e.label}</span>: <span class="threshold-value">${e.value === null ? "—" : `${e.value} ${e.unit}`}</span></li>`)}</ul>` : w}${a && i ? S`<button class="threshold-toggle" type="button" aria-expanded=${o ? "true" : "false"} aria-controls=${`${t.role}-editor`} ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._toggleThresholdEdit(i, e)}>${o ? this._t("panel.section.advanced_diagnostics_cancel_edit", "Cancel") : this._t("panel.section.advanced_diagnostics_edit_thresholds", "Edit thresholds")}</button>${o ? this._renderThresholdEditor(i, e) : w}${s && !o ? S`<p class="notice" role="status">${s}</p>` : w}` : w}</dd>`;
		})}</dl></section>`;
	}
	_persistedRoleOverrides(e, t) {
		let n = t.roles?.[e.configRole];
		if (!n || typeof n != "object") return null;
		let r = n.stress_threshold_overrides;
		if (!r || typeof r != "object") return null;
		let i = {};
		for (let t of e.keys) {
			let e = r[t];
			i[t] = e === null || typeof e == "number" ? e : null;
		}
		return i;
	}
	_toggleThresholdEdit(e, t) {
		if (this._thresholdRole === e.problemRole && this._thresholdEdits !== null) {
			this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._pendingThresholdSwitch = null;
			return;
		}
		if (this._thresholdRole && this._thresholdRole !== e.problemRole && this._hasUnsavedThresholdChanges()) {
			this._pendingThresholdSwitch = {
				spec: e,
				plant: t
			};
			return;
		}
		this._openThresholdEditor(e, t);
	}
	_openThresholdEditor(e, t) {
		let n = e.seed(this._persistedRoleOverrides(e, t));
		this._thresholdRole = e.problemRole, this._thresholdEdits = n, this._thresholdBaseline = { ...n }, this._thresholdError = "", this._pendingThresholdSwitch = null, this._thresholdSaved = {
			...this._thresholdSaved,
			[e.problemRole]: ""
		};
	}
	_hasUnsavedThresholdChanges() {
		if (!this._thresholdEdits || !this._thresholdBaseline) return !1;
		for (let e of Object.keys(this._thresholdEdits)) if ((this._thresholdEdits[e] ?? "") !== (this._thresholdBaseline[e] ?? "")) return !0;
		return !1;
	}
	_confirmDiscardAndSwitch() {
		let e = this._pendingThresholdSwitch;
		e && this._openThresholdEditor(e.spec, e.plant);
	}
	_editThreshold(e) {
		this._thresholdEdits && (this._thresholdEdits = {
			...this._thresholdEdits,
			...e
		});
	}
	_renderThresholdEditor(e, t) {
		let n = this._thresholdEdits;
		if (!n) return w;
		let r = (t) => S`<label>${e.labels[t]}<input type="number" step=${e.step} min=${e.min} max=${e.max} inputmode="decimal" .value=${n[t]} @input=${(e) => this._editThreshold({ [t]: e.target.value })}></label><small>Default ${e.defaults[t]} ${e.unit} · effective ${n[t].trim() === "" ? e.defaults[t] : n[t]} ${e.unit}</small><button type="button" @click=${() => this._editThreshold({ [t]: "" })}>Inherit</button>`;
		return S`<div id=${`${e.problemRole}-editor`} class="threshold-editor" role="group" aria-label=${`${e.problemRole.replaceAll("_", " ")} thresholds`}>
      <p>${e.formIntro}</p>
      <fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
        <div class="grid">${e.keys.map((e) => S`<div>${r(e)}</div>`)}</div>
        ${this._thresholdError ? S`<p class="error" role="alert">${this._thresholdError}</p>` : w}
        <div class="actions">
          <button type="button" @click=${() => this._editThreshold(Object.fromEntries(e.keys.map((e) => [e, ""])))}>Inherit all built-in defaults</button>
          <button type="button" @click=${() => {
			this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._pendingThresholdSwitch = null;
		}}>Cancel</button>
          <button type="button" class="primary" @click=${() => void this._saveThresholds(e, t)}>Save thresholds</button>
        </div>
      </fieldset>
    </div>`;
	}
	async _saveThresholds(e, t) {
		if (!this.hass || !this._thresholdEdits || this._formBusy || this._blocked || this._conflict) return;
		let { values: n, error: r } = e.validate(this._thresholdEdits);
		if (r) {
			this._thresholdError = r;
			return;
		}
		this._thresholdError = "";
		let i = this.hass;
		await this._mutate(() => z.setThresholdOverrides(i, t.id, t.revision, e.configRole, n)), this._error || (this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._pendingThresholdSwitch = null, this._thresholdSaved = {
			...this._thresholdSaved,
			[e.problemRole]: e.successNotice
		});
	}
	_sourceSummary(e, t) {
		let n = q(e, t);
		return n ? n.sources.length ? `${n.sources.length} source${n.sources.length === 1 ? "" : "s"} · ${n.aggregation}${n.primary_entity_id ? ` · primary ${n.primary_entity_id}` : ""}` : "no sources — this role has no computed entity yet" : "role data unavailable";
	}
	_toggleSourceEdit(e, t) {
		if (this._sourceRole === e && this._sourceEdits !== null) {
			this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._pendingSourceSwitch = null;
			return;
		}
		if (this._sourceRole && this._sourceRole !== e && this._hasUnsavedSourceChanges()) {
			this._pendingSourceSwitch = {
				role: e,
				plant: t
			};
			return;
		}
		this._openSourceEditor(e, t);
	}
	_openSourceEditor(e, t) {
		let n = q(t, e);
		if (!n) {
			this._sourceUnavailable = {
				role: e,
				plantId: t.id,
				revision: t.revision
			}, this._pendingSourceSwitch = null;
			return;
		}
		let r = Nn(n);
		this._sourceRole = e, this._sourceEdits = r, this._sourceBaseline = structuredClone(r), this._sourceError = "", this._pendingSourceSwitch = null, this._allSourceSensors = !1, this._sourceUnavailable = null, this._sourceSaved = {
			...this._sourceSaved,
			[e]: ""
		};
	}
	_sourceRefused(e, t) {
		let n = this._sourceUnavailable;
		return !!n && n.role === t && n.plantId === e.id && n.revision === e.revision && !q(e, t);
	}
	_hasUnsavedSourceChanges() {
		return !this._sourceEdits || !this._sourceBaseline ? !1 : JSON.stringify(this._sourceEdits) !== JSON.stringify(this._sourceBaseline);
	}
	_confirmSourceSwitch() {
		let e = this._pendingSourceSwitch;
		e && this._openSourceEditor(e.role, e.plant);
	}
	_editSource(e) {
		this._sourceEdits && (this._sourceEdits = {
			...this._sourceEdits,
			...e
		});
	}
	_renderSensors(e) {
		return S`<section aria-labelledby="sensors-heading"><h2 id="sensors-heading">Sensors</h2>
      <p>Assign Home Assistant sensors to each role. A role's computed sensor and problem binary appear once it has had at least one source. The entity picker is filtered by device class and unit; other sensors are available under "Show all sensors".</p>
      ${this._pendingSourceSwitch ? S`<div class="notice" role="alert"><p>You have unsaved changes in the ${Mn(this._sourceRole ?? "")?.label ?? this._sourceRole} sources editor. Switch editors and discard them?</p>
        <button type="button" class="primary" @click=${() => this._confirmSourceSwitch()}>Discard and switch</button>
        <button type="button" @click=${() => {
			this._pendingSourceSwitch = null;
		}}>Keep editing</button></div>` : w}
      <dl class="sensors">${jn.map((t) => {
			let n = this._sourceRole === t.role && this._sourceEdits !== null, r = this._sourceSaved[t.role];
			return S`<dt>${t.label}</dt><dd>${this._sourceSummary(e, t.role)}
          <button class="source-toggle" type="button" aria-expanded=${n ? "true" : "false"} aria-controls=${`${t.role}-sources-editor`} ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._toggleSourceEdit(t.role, e)}>${n ? "Cancel" : "Edit sources"}</button>
          ${n ? this._renderSourceEditor(t.role, e) : w}
          ${!n && this._sourceRefused(e, t.role) ? S`<p id=${`${t.role}-sources-unavailable`} class="error" role="alert">${t.label} source data is missing or incompatible. Refresh or upgrade before editing; defaults will not be guessed.</p>` : w}
          ${r && !n ? S`<p class="notice" role="status">${r}</p>` : w}</dd>`;
		})}</dl></section>`;
	}
	_renderSourceEditor(e, t) {
		let n = Mn(e), r = this._sourceEdits;
		return !n || !r ? w : S`<div id=${`${e}-sources-editor`} class="editor"><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
      ${Hn(n, r, this._entities, this._states, this._allSourceSensors, (e) => this._allSourceSensors = e, (e) => this._editSource(e))}
      ${this._sourceError ? S`<p class="error" role="alert">${this._sourceError}</p>` : w}
      <div class="actions">
        <button type="button" @click=${() => {
			this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._pendingSourceSwitch = null;
		}}>Cancel</button>
        <button type="button" class="primary" @click=${() => void this._saveRoleSources(e, t)}>Save ${n.label.toLowerCase()} sources</button>
      </div></fieldset></div>`;
	}
	async _saveRoleSources(e, t) {
		if (!this.hass || !this._sourceEdits || this._formBusy || this._blocked || this._conflict) return;
		if (this._registryError) {
			this._sourceError = "Reconnect to load current registry data before saving sources.";
			return;
		}
		let n = Pn(this._sourceEdits);
		if (n) {
			this._sourceError = n;
			return;
		}
		this._sourceError = "";
		let r = this.hass, i = Fn(this._sourceEdits, this._entities), a = q(t, e);
		await this._mutate(async () => {
			let n = t.revision, o = t;
			return (!a || JSON.stringify(a.sources) !== JSON.stringify(i.sources)) && (o = await z.setRoleSources(r, t.id, n, e, i.sources), n = o.revision), (!a || a.primary_entity_id !== i.primary_entity_id) && (o = await z.setRolePrimary(r, t.id, n, e, i.primary_entity_id), n = o.revision), (!a || a.aggregation !== i.aggregation) && (o = await z.setRoleAggregation(r, t.id, n, e, i.aggregation), n = o.revision), (!a || a.stale_after_seconds !== i.stale_after_seconds) && (o = await z.setRoleStaleAfter(r, t.id, n, e, i.stale_after_seconds), n = o.revision), o;
		}), this._error || (this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._pendingSourceSwitch = null, this._sourceSaved = {
			...this._sourceSaved,
			[e]: `${Mn(e)?.label ?? e} sources saved.`
		});
	}
	_renderPlantOverview(e, t) {
		let n = U(e), r = n?.sources.map((e) => K(e, this._entities)?.entity_id ?? e.entity_id) ?? [], i = jn.flatMap((t) => {
			if (t.role === "moisture") return [];
			let n = q(e, t.role);
			return n?.sources.length ? [{
				label: t.label,
				count: n.sources.length
			}] : [];
		}), a = this._careHistory?.events.slice(0, 3) ?? [];
		return S`<section class="plant-overview-card"><div class="overview-heading">${this._imageUrl ? S`<img class="overview-avatar" src=${this._imageUrl} alt=${`Photo of ${e.name}`}>` : S`<div class="overview-avatar placeholder" aria-hidden="true">${e.name.slice(0, 1).toLocaleUpperCase()}</div>`}<div><p class="eyebrow">PLANT OVERVIEW</p><p>${e.species?.snapshot.common_name ?? e.species?.snapshot.latin_name ?? "No species selected"}</p>${e.category ? S`<span class="muted">${e.category}</span>` : w}<button type="button" @click=${() => this._detailSection = "details"}>Plant details and photo</button></div></div>
      <div class="overview-metrics"><article><span>Soil moisture</span><strong>${t?.computed_percent ?? "—"}${t?.computed_percent === null || t?.computed_percent === void 0 ? "" : "%"}</strong><small>${t?.computed_available ? "Current reading" : "No current reading"}</small></article><article><span>Moisture health</span><strong>${t?.health_score ?? "—"}${t?.health_score === null || t?.health_score === void 0 ? "" : "/100"}</strong><small>Based on moisture readings</small></article><article><span>Moisture sensors</span><strong>${r.length}</strong><small>${n?.aggregation ?? "Not configured"} aggregation</small></article></div>
       <section class="overview-sensors"><h2>Assigned sensors</h2>${r.length || i.length ? S`<ul>${r.map((e) => S`<li>Soil moisture · ${e}${e === n?.primary_entity_id ? S` <span class="muted">Primary</span>` : w}</li>`)}${i.map((e) => S`<li>${e.label} · ${e.count} source${e.count === 1 ? "" : "s"}</li>`)}</ul>` : S`<p>No sensors assigned. You can still use the plant profile and log care.</p>`}<button type="button" @click=${() => this._detailSection = "sensors"}>Manage sensors</button></section>
       <section class="overview-care"><h2>Recent care</h2>${a.length ? S`<ul>${a.map((e) => S`<li><strong>${e.kind}</strong> · ${e.local_date}</li>`)}</ul>` : S`<p>No care events recorded yet.</p>`}<button type="button" @click=${() => this._detailSection = "care"}>Open care history</button></section>
      ${this._health?.[e.id] ? S`<p class="muted">Overall health confidence: ${this._health[e.id]?.confidence_label ?? "unknown"}</p>` : w}
    </section>`;
	}
	_renderDetail(e) {
		let t = this._plantById(e), n = this._edits;
		if (!t || !n) return S`<p>Plant not found — it may have been deleted in another session.</p>`;
		let r = this._evaluations[e], i = U(t), a = G(t, this._devices);
		return S`${this._conflict ? S`<section class="notice" role="alert"><h2>Review changes from another session</h2><p>Revision ${this._conflict.before.revision} → ${this._conflict.after.revision}. Saving is paused. Local edits are retained.</p><ul>${this._conflict.changes.map((e) => S`<li class="prose">${e}</li>`)}</ul>${this._sourceConflictFields(this._conflict.after).length ? S`<p>Both sessions changed these source fields: ${this._sourceConflictFields(this._conflict.after).join(", ")}. Review the refreshed role summary and your draft before retrying; Save will replace the refreshed values for these fields.</p>` : w}<button @click=${() => this._reviewConflict()}>I reviewed changes; retain my edits for reapply</button><button @click=${() => this._beginEdit(t)}>Discard my edits and use refreshed values</button></section>` : w}
       <header class="detail-heading"><div><h2>${t.name}</h2><p>${this._status(t)}</p></div>${a ? S`<a href="/config/devices/device/${encodeURIComponent(a.id)}">Open Home Assistant device</a>` : w}</header>
      <nav class="detail-tabs" aria-label="Plant sections">${[
			["overview", "Overview"],
			["sensors", "Sensors"],
			["care", "Care history"],
			["details", "Plant details"],
			["diagnostics", "Diagnostics"]
		].map(([e, t]) => S`<button type="button" aria-current=${this._detailSection === e ? "page" : w} @click=${() => this._detailSection = e}>${t}</button>`)}</nav>
        ${this._detailSection === "overview" ? this._renderPlantOverview(t, r) : w}
       ${this._detailSection === "details" ? S`<section><h2>Identity and placement</h2>${this._renderImage(t)}<fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>${Y("Name", n.name, (e) => this._edit({ name: e }))}${Y("Acquired (ISO date/time, optional)", n.acquired, (e) => this._edit({ acquired: e }))}${Bn(n.placement, (e) => this._edit({ placement: e }))}${this._saveButton("identity", "Save identity")}</fieldset></section>
       <section><h2>Home Assistant area</h2><p>Current: ${this._areaName(a?.area_id ?? "")}. Area belongs to the native device registry.</p>${this._areaReview ? S`<p class="notice">The native area changed. Review current and selected areas before reapplying.</p><button @click=${() => this._areaReview = !1}>I reviewed the native area change</button><button @click=${() => {
			this._edit({ area: this._baseArea }), this._areaReview = !1;
		}}>Use current native area</button>` : w}<fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict || !!this._registryError || this._areaReview}>${zn(n.area, this._areas, (e) => this._edit({ area: e }))}${this._saveButton("area", "Save area")}</fieldset></section>
       <section><h2>Taxonomy</h2><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>${Y("Category", n.category, (e) => this._edit({ category: e }), "text", 60)}${Y("Tags (comma-separated)", n.tagText, (e) => this._edit({ tagText: e }), "text", 2e3)}<p>Smart Plants taxonomy is separate from Home Assistant labels.</p>${this._saveButton("taxonomy", "Save taxonomy")}</fieldset></section>
       <section><h2>Species</h2>${t.species ? Un(t.species.snapshot) : S`<p>No species assigned.</p>`}<fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
      ${t.species?.snapshot.provider_ref ? S`<button @click=${() => void this._previewSpecies()}>Preview species refresh</button>` : w}
      ${X("Species provider", this._provider, [{
			value: "manual",
			label: "Manual species"
		}, ...this._capabilities?.providers.filter((e) => e.available && e.search_supported).map((e) => ({
			value: e.provider,
			label: e.provider
		})) ?? []], (e) => {
			this._providerRequest++, this._provider = e, this._preview = null, this._results = [];
		})}
       ${this._provider === "manual" ? S`${Y("Common name", n.common, (e) => this._edit({ common: e }))}${Y("Scientific name", n.latin, (e) => this._edit({ latin: e }))}<p>Save replaces the species with user-supplied data. Leave both names blank to clear species.</p>${this._saveButton("species", "Save manual species")}` : S`${Y("Search species", this._query, (e) => {
			this._query = e, this._providerRequest++, this._results = [], this._preview = null;
		})}<button @click=${() => void this._searchSpecies()}>Search species</button><ul>${this._results.map((e) => S`<li><button @click=${() => void this._previewSpecies(e)}>${e.common_name ?? e.latin_name} · ${e.latin_name}</button><small>${e.attribution}</small></li>`)}</ul><button @click=${() => {
			this._provider = "manual", this._providerRequest++, this._preview = null;
		}}>Continue manually</button>`}</fieldset></section>
       ` : w}
       ${this._detailSection === "details" ? S`
       <section><h2>Lifecycle</h2><p>Disabling stops plant evaluation and makes its entities unavailable. User-authored automations remain independent.</p><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}><div class="actions"><button @click=${() => {
			if (this.hass) {
				let e = this.hass;
				this._mutate(() => t.lifecycle_state === "active" ? z.disable(e, t.id, t.revision) : z.reenable(e, t.id, t.revision));
			}
		}}>${t.lifecycle_state === "active" ? "Disable" : "Re-enable"}</button><button @click=${() => this._openDialog("delete")}>Delete plant</button></div></fieldset></section>` : w}
       ${this._detailSection === "sensors" ? S`<section><h2>Moisture configuration</h2>${i && n.moisture ? S`<p class="default-summary">Effective thresholds: ${B.map((e) => `${e} ${i.threshold_overrides[e] ?? this._defaults(t)[e]}%`).join(" · ")}</p><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>${Vn(n.moisture, this._defaults(t), this._entities, this._states, this._allSensors, (e) => this._allSensors = e, (e) => this._edit({ moisture: e }), "sources")}<details class="advanced-disclosure"><summary>Advanced threshold overrides</summary><p>Blank values inherit the effective default shown above.</p>${Vn(n.moisture, this._defaults(t), this._entities, this._states, this._allSensors, (e) => this._allSensors = e, (e) => this._edit({ moisture: e }), "thresholds")}</details>${this._saveButton("moisture", "Save complete moisture configuration")}</fieldset>` : S`<p class="error" role="alert">Moisture role data is missing or incompatible. Refresh or upgrade before editing; defaults will not be guessed.</p>`}</section>${this._renderSensors(t)}` : w}
       ${this._detailSection === "care" ? this._renderCare(t) : w}
       ${this._detailSection === "diagnostics" ? S`<section><h2>Native automations</h2><p>Use the plant's needs-water entity for notifications or reminders in Home Assistant. Dynamic/template references may not appear in related results.</p><a href="/config/automation/dashboard">Open automation editor</a><ul>${this._related.map((e) => S`<li>${e}</li>`)}</ul></section>${this._renderOverallHealth(t)}${this._renderDiagnostics(t)}` : w}
       ${this._renderDialog()}`;
	}
	async _created(e) {
		let { plant: t, photo: n, navigationContext: r } = e.detail, i = this.hass, a = this._view.kind === "create" && r === this._context, o = n && t.revision === 1 && t.image === null;
		this._wizardStarted = !1;
		let s = this._plantById(t.id);
		(!s || s.revision <= t.revision) && (this._plants = [...this._plants.filter((e) => e.id !== t.id), t]), this._createdPlantId = t.id, this._creationNotice = `${t.name} created.${o ? " Uploading its selected photo…" : n ? " The plant changed after creation. The original wizard photo was not uploaded. Review its current photo in the plant detail and explicitly upload a photo if wanted." : ""}`, a && this._show({
			kind: "detail",
			plantId: t.id
		});
		let c = this._context;
		if (this._refresh(!1), o && i) {
			try {
				if (await Wn(n), !this.isConnected || this.hass?.connection !== i.connection || this._blocked) return;
				let e = await z.uploadImage(i, t.id, t.revision, n);
				if (!this.isConnected || this.hass?.connection !== i.connection) return;
				c === this._context && this._base?.id === t.id && this._base.revision === t.revision && !this._formBusy && !this._conflict && this._rebaseEdits(this._base, e), this._createdPlantId === t.id && (this._creationNotice = `${t.name} created. Selected photo uploaded.`);
			} catch (e) {
				if (!this.isConnected || this.hass?.connection !== i.connection) return;
				this._createdPlantId === t.id && (this._creationNotice = `${t.name} created. Selected photo was not uploaded. Open the created plant to upload it again. ${this._friendly(e)}`);
			} finally {
				this._createdPlantId === t.id && this._creationNotice.endsWith("Uploading its selected photo…") && (this._creationNotice = `${t.name} created. Photo upload interrupted. Open the created plant to check its photo before retrying.`);
			}
			await this._refresh(!1);
		}
	}
	render() {
		if (this.hass?.user?.is_admin === !1) return S`<main><div class="panel-content"><p role="alert">Smart Plants requires an admin account.</p></div></main>`;
		let e = this.hass?.localize?.("ui.common.menu") || "Menu";
		return S`<main><ha-top-app-bar-fixed class="panel-appbar" .narrow=${this.narrow}>
       <h1 slot="title" class="page-title" tabindex="-1">Smart Plants</h1>
       <ha-dropdown slot="actionItems" @wa-select=${this._handleMenuAction}>
         <ha-icon-button slot="trigger" .label=${e} .path=${Yn}></ha-icon-button>
         ${this._view.kind === "list" ? w : S`<ha-dropdown-item value="back-to-overview" ?disabled=${this._formBusy}>Back to overview</ha-dropdown-item>`}
         <ha-dropdown-item value="add-plant" ?disabled=${this._blocked}>Add plant<ha-svg-icon slot="icon" .path=${Xn}></ha-svg-icon></ha-dropdown-item>
       </ha-dropdown>
       <div class="panel-content">${this._error ? S`<p class="error" role="alert">${this._error}</p>` : w}${this._notice ? S`<p class="notice" role="status">${this._notice}</p>` : w}${this._registryError ? S`<p class="notice" role="alert">Registry/state data unavailable: ${this._registryError}. Reconnect before assigning registered sensors or areas.</p>` : w}
      ${this._creationNotice ? S`<p class="notice" role="status">${this._creationNotice}</p>${this._createdPlantId && (this._view.kind !== "detail" || this._view.plantId !== this._createdPlantId) ? S`<button ?disabled=${this._formBusy} @click=${() => {
			this._createdPlantId && this._show({
				kind: "detail",
				plantId: this._createdPlantId
			});
		}}>Open created plant</button>` : w}` : w}
      ${this._view.kind === "list" ? this._renderList() : this._view.kind === "detail" ? this._renderDetail(this._view.plantId) : w}
      ${this._wizardStarted && this._capabilities ? S`<div ?hidden=${this._view.kind !== "create"}><smart-plants-wizard .hass=${this.hass} .capabilities=${this._capabilities} .areas=${this._areas} .entities=${this._entities} .states=${this._states} .blocked=${this._blocked} .navigationContext=${this._context} @plant-created=${(e) => void this._created(e)} @backend-unavailable=${(e) => {
			this._blocked = !0, this._error = e.detail;
		}}></smart-plants-wizard></div>` : w}
        <p role="status" aria-live="polite">${this._formBusy ? "Saving or loading preview…" : ""}</p></div></ha-top-app-bar-fixed></main>`;
	}
};
qn = $, qn.styles = Gn, Z([O({ attribute: !1 })], $.prototype, "hass", void 0), Z([O({ attribute: !1 })], $.prototype, "panel", void 0), Z([O({
	type: Boolean,
	reflect: !0
})], $.prototype, "narrow", void 0), Z([k()], $.prototype, "_plants", void 0), Z([k()], $.prototype, "_loading", void 0), Z([k()], $.prototype, "_error", void 0), Z([k()], $.prototype, "_notice", void 0), Z([k()], $.prototype, "_view", void 0), Z([k()], $.prototype, "_detailSection", void 0), Z([k()], $.prototype, "_formBusy", void 0), Z([k()], $.prototype, "_capabilities", void 0), Z([k()], $.prototype, "_blocked", void 0), Z([k()], $.prototype, "_areas", void 0), Z([k()], $.prototype, "_entities", void 0), Z([k()], $.prototype, "_devices", void 0), Z([k()], $.prototype, "_states", void 0), Z([k()], $.prototype, "_evaluations", void 0), Z([k()], $.prototype, "_health", void 0), Z([k()], $.prototype, "_healthError", void 0), Z([k()], $.prototype, "_careHistory", void 0), Z([k()], $.prototype, "_careError", void 0), Z([k()], $.prototype, "_careDate", void 0), Z([k()], $.prototype, "_careNote", void 0), Z([k()], $.prototype, "_careKind", void 0), Z([k()], $.prototype, "_careFields", void 0), Z([k()], $.prototype, "_careEditingId", void 0), Z([k()], $.prototype, "_registryError", void 0), Z([k()], $.prototype, "_areaReview", void 0), Z([k()], $.prototype, "_filters", void 0), Z([k()], $.prototype, "_edits", void 0), Z([k()], $.prototype, "_conflict", void 0), Z([k()], $.prototype, "_allSensors", void 0), Z([k()], $.prototype, "_preview", void 0), Z([k()], $.prototype, "_provider", void 0), Z([k()], $.prototype, "_query", void 0), Z([k()], $.prototype, "_results", void 0), Z([k()], $.prototype, "_related", void 0), Z([k()], $.prototype, "_imageUrl", void 0), Z([k()], $.prototype, "_imageLoading", void 0), Z([k()], $.prototype, "_imageError", void 0), Z([k()], $.prototype, "_dialog", void 0), Z([k()], $.prototype, "_wizardStarted", void 0), Z([k()], $.prototype, "_creationNotice", void 0), Z([k()], $.prototype, "_createdPlantId", void 0), Z([k()], $.prototype, "_thresholdRole", void 0), Z([k()], $.prototype, "_thresholdEdits", void 0), Z([k()], $.prototype, "_thresholdBaseline", void 0), Z([k()], $.prototype, "_thresholdError", void 0), Z([k()], $.prototype, "_thresholdSaved", void 0), Z([k()], $.prototype, "_pendingThresholdSwitch", void 0), Z([k()], $.prototype, "_sourceRole", void 0), Z([k()], $.prototype, "_sourceEdits", void 0), Z([k()], $.prototype, "_sourceBaseline", void 0), Z([k()], $.prototype, "_sourceError", void 0), Z([k()], $.prototype, "_sourceUnavailable", void 0), Z([k()], $.prototype, "_sourceSaved", void 0), Z([k()], $.prototype, "_pendingSourceSwitch", void 0), Z([k()], $.prototype, "_allSourceSensors", void 0), customElements.get("smart-plants-panel") || customElements.define("smart-plants-panel", $);
//#endregion
export { $ as SmartPlantsPanel };

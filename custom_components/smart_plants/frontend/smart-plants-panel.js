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
})(e) : e, l, { is: u, defineProperty: d, getOwnPropertyDescriptor: f, getOwnPropertyNames: p, getOwnPropertySymbols: m, getPrototypeOf: h } = Object, g = globalThis, _ = g.trustedTypes, ee = _ ? _.emptyScript : "", te = g.reactiveElementPolyfillSupport, v = (e, t) => e, ne = {
	toAttribute(e, t) {
		/**
		* @license
		* Copyright 2017 Google LLC
		* SPDX-License-Identifier: BSD-3-Clause
		*/
		switch (t) {
			case Boolean:
				e = e ? ee : null;
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
}, re = (e, t) => !u(e, t), ie = {
	attribute: !0,
	type: String,
	converter: ne,
	reflect: !1,
	useDefault: !1,
	hasChanged: re
};
(l = Symbol).metadata ?? (l.metadata = Symbol("metadata")), g.litPropertyMetadata ?? (g.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
var y = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ?? (this.l = [])).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ie) {
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
		return this.elementProperties.get(e) ?? ie;
	}
	static _$Ei() {
		if (this.hasOwnProperty(v("elementProperties"))) return;
		let e = h(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(v("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(v("properties"))) {
			let e = this.properties, t = [...p(e), ...m(e)];
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
			let i = (n.converter?.toAttribute === void 0 ? ne : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? ne : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ?? (n = a.getPropertyOptions(e)), !((n.hasChanged ?? re)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[v("elementProperties")] = /* @__PURE__ */ new Map(), y[v("finalized")] = /* @__PURE__ */ new Map(), te?.({ ReactiveElement: y }), (g.reactiveElementVersions ?? (g.reactiveElementVersions = [])).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
var ae = globalThis, oe = (e) => e, se = ae.trustedTypes, ce = se ? se.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, le = "$lit$", ue = `lit$${Math.random().toFixed(9).slice(2)}$`, de = "?" + ue, fe = `<${de}>`, pe = document, me = () => pe.createComment(""), he = (e) => e === null || typeof e != "object" && typeof e != "function", ge = Array.isArray, _e = (e) => ge(e) || typeof e?.[Symbol.iterator] == "function", ve = "[ 	\n\f\r]", ye = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, be = /-->/g, xe = />/g, Se = RegExp(`>|${ve}(?:([^\\s"'>=/]+)(${ve}*=${ve}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), Ce = /'/g, we = /"/g, Te = /^(?:script|style|textarea|title)$/i, Ee = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), b = Ee(1), De = Ee(2), Oe = Symbol.for("lit-noChange"), x = Symbol.for("lit-nothing"), ke = /* @__PURE__ */ new WeakMap(), Ae = pe.createTreeWalker(pe, 129);
function je(e, t) {
	if (!ge(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return ce === void 0 ? t : ce.createHTML(t);
}
var Me = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = ye;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === ye ? c[1] === "!--" ? o = be : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = Se) : (Te.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = Se) : o = xe : o === Se ? c[0] === ">" ? (o = i ?? ye, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? Se : c[3] === "\"" ? we : Ce) : o === we || o === Ce ? o = Se : o === be || o === xe ? o = ye : (o = Se, i = void 0);
		let d = o === Se && e[t + 1].startsWith("/>") ? " " : "";
		a += o === ye ? n + fe : l >= 0 ? (r.push(s), n.slice(0, l) + le + n.slice(l) + ue + d) : n + ue + (l === -2 ? t : d);
	}
	return [je(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Ne = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Me(t, n);
		if (this.el = e.createElement(l, r), Ae.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = Ae.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(le)) {
					let t = u[o++], n = i.getAttribute(e).split(ue), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Re : r[1] === "?" ? ze : r[1] === "@" ? Be : Le
					}), i.removeAttribute(e);
				} else e.startsWith(ue) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Te.test(i.tagName)) {
					let e = i.textContent.split(ue), t = e.length - 1;
					if (t > 0) {
						i.textContent = se ? se.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], me()), Ae.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], me());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === de) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(ue, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += ue.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = pe.createElement("template");
		return n.innerHTML = e, n;
	}
};
function Pe(e, t, n = e, r) {
	if (t === Oe) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = he(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ?? (n._$Co = []))[r] = i), i !== void 0 && (t = Pe(e, i._$AS(e, t.values), i, r)), t;
}
var Fe = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? pe).importNode(t, !0);
		Ae.currentNode = r;
		let i = Ae.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Ie(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Ve(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = Ae.nextNode(), a++);
		}
		return Ae.currentNode = pe, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Ie = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = x, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = Pe(this, e, t), he(e) ? e === x || e == null || e === "" ? (this._$AH !== x && this._$AR(), this._$AH = x) : e !== this._$AH && e !== Oe && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? _e(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== x && he(this._$AH) ? this._$AA.nextSibling.data = e : this.T(pe.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Ne.createElement(je(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Fe(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = ke.get(e.strings);
		return t === void 0 && ke.set(e.strings, t = new Ne(e)), t;
	}
	k(t) {
		ge(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(me()), this.O(me()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = oe(e).nextSibling;
			oe(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, Le = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = x, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = x;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = Pe(this, e, t, 0), a = !he(e) || e !== this._$AH && e !== Oe, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = Pe(this, r[n + o], t, o), s === Oe && (s = this._$AH[o]), a || (a = !he(s) || s !== this._$AH[o]), s === x ? e = x : e !== x && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === x ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Re = class extends Le {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === x ? void 0 : e;
	}
}, ze = class extends Le {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== x);
	}
}, Be = class extends Le {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = Pe(this, e, t, 0) ?? x) === Oe) return;
		let n = this._$AH, r = e === x && n !== x || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== x && (n === x || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Ve = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		Pe(this, e);
	}
}, He = ae.litHtmlPolyfillSupport;
He?.(Ne, Ie), (ae.litHtmlVersions ?? (ae.litHtmlVersions = [])).push("3.3.3");
var Ue = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Ie(t.insertBefore(me(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, We = globalThis, S = class extends y {
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
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ue(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return Oe;
	}
};
S._$litElement$ = !0, S.finalized = !0, We.litElementHydrateSupport?.({ LitElement: S });
var Ge = We.litElementPolyfillSupport;
Ge?.({ LitElement: S }), (We.litElementVersions ?? (We.litElementVersions = [])).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/property.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/ var Ke = {
	attribute: !0,
	type: String,
	converter: ne,
	reflect: !1,
	hasChanged: re
}, qe = (e = Ke, t, n) => {
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
function C(e) {
	return (t, n) => typeof n == "object" ? qe(e, t, n) : ((e, t, n) => {
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
*/ function w(e) {
	return C({
		...e,
		state: !0,
		attribute: !1
	});
}
//#endregion
//#region src/validation.ts
var T = (e) => typeof e == "object" && !!e && !Array.isArray(e), E = (e, t = 500) => typeof e == "string" && e.length > 0 && e.length <= t, Je = (e, t = 500) => e === null || E(e, t), D = (e, t, n) => typeof e == "number" && Number.isSafeInteger(e) && e >= t && e <= n, O = (e) => E(e, 64) && /^\d{4}-\d\d-\d\dT/.test(e) && Number.isFinite(Date.parse(e)), Ye = (e) => e === null || O(e) || typeof e == "string" && /^\d{4}-\d\d-\d\d$/.test(e) && Number.isFinite(Date.parse(e)), Xe = (e, t) => T(e) && Object.keys(e).length <= 32 && Object.entries(e).every(([e, n]) => E(e, 60) && t(n)), Ze = (e) => e == null || typeof e == "number" && Number.isFinite(e) && e >= -100 && e <= 100, Qe = {
	provider: (e) => E(e, 60),
	provider_id: (e) => Je(e, 200),
	provider_ref: (e) => Je(e, 200),
	fetched_at: O,
	locale: (e) => typeof e == "string" && /^(und|[a-z]{2}(?:-[A-Z]{2})?)$/.test(e),
	source_status: (e) => e === "manual" || e === "provider",
	attribution: (e) => E(e),
	common_name: Je,
	latin_name: Je,
	category: Je,
	confidence: (e) => e === null || typeof e == "number" && Number.isFinite(e) && e >= 0 && e <= 1,
	care_text: (e) => Xe(e, (e) => E(e, 4e3)),
	field_sources: (e) => Xe(e, E),
	threshold_defaults: (e) => Xe(e, (e) => Xe(e, (e) => typeof e == "number" && Number.isSafeInteger(e))),
	min_temperature: Ze,
	max_temperature: Ze,
	survival_min_temperature: (e) => Ze(e) && (e == null || Number.isSafeInteger(e)),
	common_names: (e) => e === void 0 || T(e) && Object.entries(e).every(([e, t]) => (e === "en" || e === "de") && Array.isArray(t) && t.length > 0 && t.length <= 5 && new Set(t).size === t.length && t.every((e) => E(e, 100) && e === e.trim()))
};
function $e(e) {
	if (!T(e) || !Object.keys(e).every((e) => Object.hasOwn(Qe, e)) || !Object.entries(Qe).every(([t, n]) => n(e[t]))) return !1;
	let t = [
		"common_name",
		"latin_name",
		"category",
		"confidence",
		"min_temperature",
		"max_temperature",
		"survival_min_temperature"
	].filter((t) => e[t] !== null && e[t] !== void 0);
	e.common_names !== void 0 && Object.keys(e.common_names).length > 0 && t.push("common_names"), t.push(...Object.keys(e.care_text), ...Object.entries(e.threshold_defaults).flatMap(([e, t]) => Object.keys(t).map((t) => `${e}_${t}`)));
	let n = e.field_sources;
	return new TextEncoder().encode(JSON.stringify(e)).length <= 32768 && new Set(t).size === Object.keys(n).length && t.every((t) => n[t] === e.attribution) && (e.source_status !== "manual" || e.provider === "manual" && e.provider_ref === null) && (e.source_status !== "provider" || e.provider !== "manual" && E(e.provider_ref, 200));
}
function et(e) {
	if (!T(e)) return !1;
	let t = e.placement, n = e.species, r = e.image;
	return E(e.id, 200) && D(e.revision, 1, 2 ** 53 - 1) && E(e.name, 200) && O(e.created_at) && Ye(e.acquired_at) && ["active", "disabled"].includes(String(e.lifecycle_state)) && Je(e.category, 60) && Array.isArray(e.tags) && e.tags.length <= 32 && e.tags.every((e) => E(e, 60)) && new Set(e.tags).size === e.tags.length && (t === null || T(t) && E(t.mode, 60) && Je(t.exposure, 60) && Je(t.rain_exposure, 60) && (t.container === null || typeof t.container == "boolean")) && (n === null || T(n) && $e(n.snapshot) && T(n.snapshot) && n.provider === n.snapshot.provider) && (r === null || T(r) && E(r.id, 200) && r.content_type === "image/webp" && D(r.width, 1, 2048) && D(r.height, 1, 2048) && O(r.created_at)) && (e.care_events === void 0 || Array.isArray(e.care_events) && e.care_events.length <= 256 && e.care_events.every(mt)) && (e.care_tasks === void 0 || ft(e.care_tasks)) && (e.rest_period === void 0 || e.rest_period === null || it(e.rest_period, ["start_month", "end_month"])) && (e.snoozed_until === void 0 || e.snoozed_until === null || O(e.snoozed_until));
}
var tt = /^[0-9a-f]{32}$/, nt = (e) => typeof e == "string" && /^\d{4}-\d\d-\d\d$/.test(e) && Number.isFinite(Date.parse(e)), rt = (e, t) => Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t)), it = (e, t) => T(e) && rt(e, t) && D(e.start_month, 1, 12) && D(e.end_month, 1, 12), at = (e, t) => E(e, t) && e === e.trim(), ot = (e) => typeof e == "number" && Number.isFinite(e), st = [
	"temperature",
	"humidity",
	"moisture",
	"illuminance",
	"conductivity",
	"soil_temperature",
	"co2"
];
function ct(e) {
	if (!T(e)) return !1;
	if (rt(e, ["role"])) return st.includes(String(e.role));
	if (rt(e, ["forecast"])) {
		let t = e.forecast;
		return T(t) && rt(t, [
			"entity_id",
			"reading",
			"hours"
		]) && typeof t.entity_id == "string" && /^weather\.[a-z0-9_]+$/.test(t.entity_id) && (t.reading === "low" || t.reading === "high") && (t.hours === 24 || t.hours === 48 || t.hours === 72);
	}
	return rt(e, ["entity_id"]) && typeof e.entity_id == "string" && /^sensor\.[a-z0-9_]+$/.test(e.entity_id);
}
var lt = (e) => !(T(e.source) && Object.hasOwn(e.source, "forecast")) || e.for_minutes === 0 && [
	"°C",
	"°F",
	"K"
].includes(String(e.unit));
function ut(e) {
	return T(e) ? e.kind === "yearly" ? it(e, [
		"kind",
		"start_month",
		"end_month"
	]) : e.kind === "reading" ? rt(e, [
		"kind",
		"source",
		"condition",
		"value",
		"unit",
		"for_minutes",
		"reset_value"
	]) && ct(e.source) && (e.condition === "below" || e.condition === "above") && ot(e.value) && (e.unit === null || E(e.unit, 32)) && D(e.for_minutes, 0, 4320) && lt(e) && (e.reset_value === null || ot(e.reset_value) && (e.condition === "below" ? e.reset_value >= e.value : e.reset_value <= e.value)) : e.kind === "interval" && rt(e, [
		"kind",
		"every",
		"unit",
		"growing_season_only"
	]) && D(e.every, 1, 999) && [
		"days",
		"weeks",
		"months",
		"years"
	].includes(String(e.unit)) && typeof e.growing_season_only == "boolean" : !1;
}
function dt(e) {
	return T(e) && rt(e, [
		"id",
		"type",
		"name",
		"schedule",
		"instructions",
		"baseline_done_on",
		"last_done_at",
		"last_skipped_on",
		"created_on"
	]) && typeof e.id == "string" && tt.test(e.id) && [
		"fertilize",
		"prune",
		"repot",
		"pests",
		"winter_protection",
		"custom"
	].includes(String(e.type)) && (e.name === null ? e.type !== "custom" : at(e.name, 60)) && ut(e.schedule) && (e.instructions === null || at(e.instructions, 4e3)) && (e.baseline_done_on === null || nt(e.baseline_done_on)) && (e.last_done_at === null || O(e.last_done_at) && String(e.last_done_at).endsWith("Z")) && (e.last_skipped_on === null || nt(e.last_skipped_on)) && nt(e.created_on);
}
function ft(e) {
	if (!Array.isArray(e) || e.length > 20 || !e.every(dt)) return !1;
	let t = e, n = t.map((e) => e.type).filter((e) => e !== "custom");
	return new Set(t.map((e) => e.id)).size === t.length && new Set(n).size === n.length;
}
function pt(e) {
	return e.filter((e, t) => {
		if (et(e)) return !0;
		let n = T(e) && typeof e.id == "string" ? e.id.slice(0, 200) : `#${t}`;
		return console.warn(`Smart Plants: skipping malformed plant record ${n}`), !1;
	});
}
function mt(e) {
	if (!T(e) || e.schema_version !== 2 || !E(e.id, 36) || ![
		"watering",
		"fertilizing",
		"pruning",
		"repotting",
		"note",
		"task"
	].includes(String(e.kind)) || ![
		"manual",
		"action",
		"automation"
	].includes(String(e.provenance)) || !(e.task_id === null || typeof e.task_id == "string" && tt.test(e.task_id)) || !O(e.occurred_at) || !/(?:Z|[+-]\d\d:\d\d)$/.test(String(e.occurred_at)) || typeof e.local_date != "string" || !/^\d{4}-\d\d-\d\d$/.test(e.local_date) || e.local_date !== String(e.occurred_at).slice(0, 10) || !O(e.created_at) || !O(e.updated_at) || !T(e.payload)) return !1;
	let t = e.payload, n = (e) => e === null || E(e, 500) && e === e.trim();
	return e.kind === "watering" || e.kind === "task" ? Object.keys(t).length === 1 && Object.hasOwn(t, "note") && n(t.note) : e.kind === "fertilizing" ? Object.keys(t).length === 4 && (t.product === null || E(t.product, 120) && t.product === t.product.trim()) && (t.amount === null || typeof t.amount == "number" && Number.isFinite(t.amount) && t.amount > 0 && t.amount <= 1e5) && (t.amount === null && t.unit === null || t.amount !== null && ["g", "mL"].includes(String(t.unit))) && n(t.note) : e.kind === "pruning" ? Object.keys(t).length === 2 && (t.part === null || E(t.part, 120) && t.part === t.part.trim()) && n(t.note) : e.kind === "repotting" ? Object.keys(t).length === 3 && (t.container === null || E(t.container, 120) && t.container === t.container.trim()) && (t.medium === null || E(t.medium, 120) && t.medium === t.medium.trim()) && n(t.note) : Object.keys(t).length === 1 && E(t.text, 1e3) && t.text === t.text.trim();
}
function ht(e, t) {
	let n = (e) => {
		let t = e.match(/\.(\d{1,6})(?=Z|[+-]\d\d:\d\d$)/)?.[1] ?? "", n = Number(t.padEnd(6, "0")), r = e.replace(/\.\d{1,6}(?=Z|[+-]\d\d:\d\d$)/, "");
		return [Date.parse(r) + Math.floor(n / 1e3), n % 1e3];
	}, r = n(String(e.occurred_at)), i = n(String(t.occurred_at));
	return i[0] - r[0] || i[1] - r[1] || (String(e.id) < String(t.id) ? -1 : +(String(e.id) > String(t.id)));
}
function gt(e) {
	if (!T(e) || !D(e.revision, 1, 2 ** 53 - 1) || !Array.isArray(e.events) || e.events.length > 256 || !e.events.every(mt) || !T(e.summary)) return !1;
	let t = e.events, n = e.summary, r = t.filter((e) => e.kind === "watering");
	return new Set(t.map((e) => e.id)).size === t.length && n.watering_count === r.length && t.every((e, n) => n === 0 || ht(t[n - 1], e) <= 0) && n.last_watered_at === (r[0]?.occurred_at ?? null) && n.last_watered_local_date === (r[0]?.local_date ?? null);
}
function _t(e, t) {
	return Array.isArray(e) || Array.isArray(t) ? Array.isArray(e) && Array.isArray(t) && e.length === t.length && e.every((e, n) => _t(e, t[n])) : T(e) || T(t) ? T(e) && T(t) && rt(e, Object.keys(t)) && Object.keys(e).every((n) => _t(e[n], t[n])) : e === t;
}
var vt = (e) => typeof e == "string" ? e.trim() || null : e, yt = [
	"name",
	"schedule",
	"instructions",
	"baseline_done_on"
];
function bt(e, t) {
	return yt.every((n) => !Object.hasOwn(t, n) || _t(e[n], n === "name" || n === "instructions" ? vt(t[n]) : t[n]));
}
function xt(e, t, n) {
	let r = {
		create: ["task_id"],
		complete: ["event_id"],
		skip: ["previous_skipped_on"]
	}, i = e.slice(e.lastIndexOf("/") + 1);
	if (!rt(n, ["plant", ...e.startsWith("smart_plants/care_tasks/") ? r[i] ?? [] : []]) || !et(n.plant) || !T(n.plant) || n.plant.id !== t.plant_id || n.plant.revision !== Number(t.expected_revision) + 1) return !1;
	let a = n.plant;
	if (e === "smart_plants/plants/set_rest_period") return _t(a.rest_period, t.rest_period);
	if (!Array.isArray(a.care_tasks)) return !1;
	let o = e === "smart_plants/care_tasks/create" ? n.task_id : t.task_id, s = a.care_tasks.find((e) => e.id === o);
	switch (i) {
		case "create": return typeof n.task_id == "string" && tt.test(n.task_id) && s !== void 0 && s.type === t.task_type && bt(s, t);
		case "update": return s !== void 0 && bt(s, t);
		case "delete": return s === void 0;
		case "complete": {
			if (s === void 0 || !E(n.event_id, 36) || !Array.isArray(a.care_events)) return !1;
			let e = a.care_events.find((e) => e.id === n.event_id);
			return e !== void 0 && e.task_id === t.task_id && T(e.payload) && e.payload.note === (t.note ?? null) && (t.occurred_at === void 0 || e.occurred_at === t.occurred_at);
		}
		case "skip": return s !== void 0 && nt(s.last_skipped_on) && (n.previous_skipped_on === null || nt(n.previous_skipped_on));
		case "undo_skip": return s !== void 0 && s.last_skipped_on === t.previous_skipped_on;
	}
	return !1;
}
var St = new Set([
	"create",
	"update",
	"delete",
	"complete",
	"skip",
	"undo_skip"
].map((e) => `smart_plants/care_tasks/${e}`));
function Ct(e, t) {
	return !T(e) || !E(e.preview_token, 200) || !$e(e.snapshot) || !T(e.snapshot) || e.provider !== e.snapshot.provider || !T(e.diff) || !Object.entries(e.diff).every(([e, t]) => T(t) && Object.hasOwn(Qe, e) && (t.before === null || Qe[e](t.before)) && Qe[e](t.after)) || t.provider !== void 0 && (e.provider !== t.provider || e.snapshot.provider_ref !== t.provider_ref) ? !1 : e.operation === (t.type === "smart_plants/species/refresh_preview" ? "refresh" : "select") && (t.type !== "smart_plants/wizard/preview" || e.draft_id === t.draft_id && e.revision === 0);
}
function wt(e) {
	return T(e) && E(e.entity_id, 255) && typeof e.state == "string" && O(e.last_updated) && T(e.attributes) && [
		"friendly_name",
		"unit_of_measurement",
		"device_class"
	].every((t) => e.attributes && T(e.attributes) && (e.attributes[t] === void 0 || e.attributes[t] === null || typeof e.attributes[t] == "string"));
}
var Tt = /* @__PURE__ */ new Set([
	"high",
	"medium",
	"low",
	"unknown"
]);
function Et(e) {
	return !T(e) || typeof e.available != "boolean" || typeof e.confidence != "number" || !Number.isFinite(e.confidence) || e.confidence < 0 || e.confidence > 1 || typeof e.confidence_label != "string" || !Tt.has(e.confidence_label) || !Array.isArray(e.contributors) || !e.contributors.every((e) => E(e, 60)) || !Array.isArray(e.configured) || !e.configured.every((e) => E(e, 60)) || !Array.isArray(e.reasons) || !e.reasons.every((e) => E(e, 4e3)) ? !1 : e.available ? D(e.health_score, 0, 100) : e.health_score === null;
}
function Dt(e) {
	return !T(e) || typeof e.computed_available != "boolean" || typeof e.sensor_stale != "boolean" || !Array.isArray(e.reasons) || !e.reasons.every((e) => E(e, 4e3)) ? !1 : e.computed_available ? typeof e.computed_percent == "number" && Number.isFinite(e.computed_percent) && e.computed_percent >= 0 && e.computed_percent <= 100 && D(e.health_score, 0, 100) && typeof e.needs_water == "boolean" && typeof e.too_wet == "boolean" : e.computed_percent === null && e.health_score === null && e.needs_water === null && e.too_wet === null;
}
function Ot(e, t) {
	let n = String(e.type);
	if (!n.startsWith("smart_plants/") || n === "smart_plants/panel/info") return !0;
	if (!T(t)) return !1;
	if (n === "smart_plants/wizard/start") return typeof t.draft_id == "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(t.draft_id) && typeof t.draft_token == "string" && /^[A-Za-z0-9_-]{43}$/.test(t.draft_token) && t.revision === 0 && D(t.expires_in, 1, 600);
	if (n.endsWith("/preview") || n.endsWith("/refresh_preview")) return Ct(t, e);
	if (n === "smart_plants/species/search") return Array.isArray(t.results) && t.results.length <= 50 && t.results.every((t) => T(t) && t.provider === e.provider && E(t.provider_ref, 100) && E(t.latin_name) && Je(t.common_name) && Je(t.category) && E(t.attribution));
	if (n === "smart_plants/moisture/evaluation") return Dt(t.evaluation);
	if (n === "smart_plants/plants/health") return Et(t.evaluation);
	if (n === "smart_plants/care/list") return gt(t);
	if ([
		"smart_plants/care/add_watering",
		"smart_plants/care/add",
		"smart_plants/care/edit"
	].includes(n)) {
		if (!et(t.plant) || !T(t.plant) || t.plant.id !== e.plant_id || !mt(t.event) || !T(t.event) || !Array.isArray(t.plant.care_events)) return !1;
		let r = t.plant.care_events, i = t.event;
		if (!r.some((e) => e.id === i.id && JSON.stringify(e) === JSON.stringify(i))) return !1;
		let a = n === "smart_plants/care/add_watering" ? "watering" : e.kind, o = n === "smart_plants/care/add_watering" ? { note: e.note } : e.payload;
		return i.kind !== a || i.occurred_at !== e.occurred_at || JSON.stringify(i.payload) !== JSON.stringify(o) || n === "smart_plants/care/edit" && i.id !== e.event_id || t.plant.revision !== Number(e.expected_revision) + 1 ? !1 : gt({
			revision: t.plant.revision,
			events: [...r].sort(ht),
			summary: t.summary
		});
	}
	if (St.has(n) || n === "smart_plants/plants/set_rest_period") return xt(n, e, t);
	if (n === "smart_plants/care/delete") return !et(t.plant) || !T(t.plant) || t.plant.id !== e.plant_id || !Array.isArray(t.plant.care_events) ? !1 : t.plant.revision === Number(e.expected_revision) + 1 && !t.plant.care_events.some((t) => T(t) && t.id === e.event_id) && gt({
		revision: t.plant.revision,
		events: [...t.plant.care_events].sort((e, t) => ht(e, t)),
		summary: t.summary
	});
	if (n === "smart_plants/plants/list") {
		if (!Array.isArray(t.plants)) return !1;
		let e = t.plants.filter(et);
		return new Set(e.map((e) => e.id)).size === e.length;
	}
	if (n === "smart_plants/roles/list") return Array.isArray(t.roles) && t.roles.every((e) => T(e) && E(e.role) && E(e.source_domain) && Array.isArray(e.aggregations) && e.aggregations.every((e) => E(e)) && Array.isArray(e.thresholds) && e.thresholds.every((e) => T(e) && E(e.key) && E(e.entity_role) && E(e.translation_key)) && Array.isArray(e.entities) && e.entities.every((e) => T(e) && E(e.role) && E(e.platform) && E(e.translation_key)));
	if (n === "smart_plants/plants/delete") return Object.keys(t).length === 0;
	if (n === "smart_plants/plants/snooze") {
		if (!et(t.plant) || !T(t.plant) || t.plant.id !== e.plant_id) return !1;
		let n = t.plant.snoozed_until;
		return e.until === null ? n == null : typeof n == "string" && Math.floor(Date.parse(String(e.until)) / 1e3) === Math.floor(Date.parse(n) / 1e3);
	}
	if (n === "smart_plants/plants/overview") return Array.isArray(t.plants) && t.plants.every(T) && new Set(t.plants.map((e) => e.plant_id)).size === t.plants.length;
	if (n === "smart_plants/wizard/create") {
		if (!et(t.plant) || !T(t.plant)) return !1;
		let n = t.plant.roles;
		return e.roles === void 0 || T(e.roles) && T(n) && Object.keys(e.roles).every((e) => T(n[e]));
	}
	return et(t.plant) && T(t.plant) && (e.plant_id === void 0 || t.plant.id === e.plant_id);
}
//#endregion
//#region src/status.ts
var kt = [
	"needs_water",
	"too_wet",
	"problem",
	"stale",
	"no_sensors",
	"healthy",
	"paused"
], At = {
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
function jt(e) {
	return typeof e == "string" && kt.includes(e);
}
function Mt(e, t) {
	return e.t(At[t].label);
}
function Nt(e, t) {
	return kt.indexOf(e) - kt.indexOf(t);
}
var Pt = [
	"moisture",
	"temperature",
	"humidity",
	"illuminance",
	"conductivity",
	"soil_temperature",
	"co2",
	"battery"
], k = {
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
function Ft(e) {
	return typeof e == "string" && Pt.includes(e);
}
function A(e, t) {
	return e.t(k[t].label);
}
function j(e, t, n) {
	return n === "%" ? e.percent(t) : n ? `${e.number(t)} ${n}` : e.number(t);
}
function It(e, t, n, r) {
	if (!n) return "";
	let { min: i, max: a } = n;
	return t === "battery" && i !== null ? e.t("range.low_below", { value: j(e, i, r) }) : i !== null && a !== null ? e.t("range.between", {
		min: e.number(i),
		max: j(e, a, r)
	}) : i === null ? a === null ? "" : e.t("range.at_most", { value: j(e, a, r) }) : e.t("range.at_least", { value: j(e, i, r) });
}
var Lt = [
	["second", 60],
	["minute", 60],
	["hour", 24],
	["day", 7],
	["week", 4.34524],
	["month", 12],
	["year", Infinity]
];
function Rt(e, t, n = Date.now()) {
	let r = Date.parse(t);
	if (!Number.isFinite(r)) return t;
	let i = new Intl.RelativeTimeFormat(e.language, { numeric: "auto" }), a = (r - n) / 1e3;
	for (let [e, t] of Lt) {
		if (Math.abs(a) < t) return i.format(Math.round(a), e);
		a /= t;
	}
	return t;
}
//#endregion
//#region src/overview-model.ts
var zt = [
	"ok",
	"low",
	"high",
	"stale",
	"unavailable"
], Bt = (e) => typeof e == "object" && !!e && !Array.isArray(e), Vt = (e) => e === null || typeof e == "number" && Number.isFinite(e), Ht = (e) => e === null || typeof e == "string", Ut = [
	"fertilize",
	"prune",
	"repot",
	"pests",
	"winter_protection",
	"custom"
], Wt = [
	"scheduled",
	"due",
	"overdue",
	"resting",
	"done",
	"skipped",
	"missed",
	"watching",
	"waiting",
	"no_reading"
], Gt = (e) => e === null || typeof e == "string" && Number.isFinite(Date.parse(e)), Kt = (e) => e === null || typeof e == "string" && /^\d{4}-\d\d-\d\d$/.test(e) && Number.isFinite(Date.parse(e)), qt = (e) => typeof e == "number" && Number.isInteger(e) && e >= 1 && e <= 12;
function Jt(e) {
	if (!Bt(e)) return null;
	let { task_id: t, type: n, name: r, status: i, is_due: a, next_due: o, days: s, window_end: c, resume_on: l } = e, { reading: u = null, unit: d = null, due_since: f = null, due_at: p = null, forecast: m = null, forecast_until: h = null } = e;
	return typeof t != "string" || !/^[0-9a-f]{32}$/.test(t) || !Ut.includes(n) || !(r === null ? n !== "custom" : typeof r == "string" && r.length > 0 && r.length <= 60) || !Wt.includes(i) || typeof a != "boolean" || i !== "no_reading" && a !== (i === "due" || i === "overdue") || !Kt(o) || !Kt(c) || !Kt(l) || !(s === null || typeof s == "number" && Number.isSafeInteger(s) && s >= 0) || !Vt(u) || !Ht(d) || !Gt(f) || !Gt(p) || m !== null && m !== "low" && m !== "high" || !Gt(h) ? null : {
		task_id: t,
		type: n,
		name: r,
		status: i,
		is_due: a,
		next_due: o,
		days: s,
		window_end: c,
		resume_on: l,
		reading: u,
		unit: d,
		due_since: f,
		due_at: p,
		forecast: m,
		forecast_until: h
	};
}
function Yt(e) {
	if (e === null) return null;
	if (Bt(e) && Object.keys(e).length === 2 && qt(e.start_month) && qt(e.end_month)) return {
		start_month: e.start_month,
		end_month: e.end_month
	};
}
function Xt(e) {
	if (!Bt(e) || !Bt(e.range)) return null;
	let { value: t, unit: n, state: r, range: i, last_reported: a, sources: o } = e;
	return !Vt(t) || n !== null && typeof n != "string" || !zt.includes(r) || !Vt(i.min) || !Vt(i.target) || !Vt(i.max) || !Ht(a) || !Array.isArray(o) || !o.every((e) => typeof e == "string") ? null : {
		value: t,
		unit: n ?? "",
		state: r,
		range: {
			min: i.min,
			target: i.target,
			max: i.max
		},
		last_reported: a,
		sources: [...o]
	};
}
function Zt(e) {
	if (!Bt(e)) return null;
	let { plant_id: t, revision: n, lifecycle_state: r, status: i, problems: a, roles: o, last_watered_at: s, image: c, care: l, rest_period: u, resting: d, snoozed_until: f } = e;
	if (typeof t != "string" || typeof n != "number" || r !== "active" && r !== "disabled" || !jt(i) || !Array.isArray(a) || !Bt(o) || !Ht(s) || !(c === null || Bt(c) && typeof c.id == "string") || !Array.isArray(l) || l.length > 20 || typeof d != "boolean") return null;
	let p = l.map(Jt);
	if (!p.every((e) => e !== null) || new Set(p.map((e) => e.task_id)).size !== p.length) return null;
	let m = Yt(u);
	if (m === void 0 || m === null && d || f !== void 0 && !Gt(f)) return null;
	let h = a.filter((e) => Bt(e) && typeof e.role == "string" && typeof e.kind == "string").map((e) => ({
		role: e.role,
		kind: e.kind
	}));
	if (h.length !== a.length) return null;
	let g = {};
	for (let [e, t] of Object.entries(o)) {
		if (!Ft(e)) continue;
		let n = Xt(t);
		if (!n) return null;
		g[e] = n;
	}
	return {
		plant_id: t,
		revision: n,
		lifecycle_state: r,
		status: i,
		problems: h,
		roles: g,
		last_watered_at: s,
		image: c === null ? null : { id: c.id },
		care: p,
		rest_period: m,
		resting: d,
		snoozed_until: f ?? null
	};
}
var Qt = {
	too_cold: "problem_kind.too_cold",
	too_hot: "problem_kind.too_hot",
	too_dry: "problem_kind.too_dry",
	too_humid: "problem_kind.too_humid",
	low_light: "problem_kind.low_light",
	low_conductivity: "problem_kind.low_conductivity",
	high_conductivity: "problem_kind.high_conductivity",
	high_co2: "problem_kind.high_co2",
	battery_low: "problem_kind.battery_low"
}, $t = {
	too_cold: "problem_kind.soil_too_cold",
	too_hot: "problem_kind.soil_too_hot"
};
function en(e, t) {
	let n = t.problems[0], r = t.status === "healthy" || t.status === "paused" ? 0 : Math.max(0, t.problems.length - 1);
	if (t.status === "problem" && n) {
		let t = (n.role === "soil_temperature" ? $t[n.kind] : void 0) ?? Qt[n.kind];
		return {
			label: t ? e.t(t) : Mt(e, "problem"),
			more: r
		};
	}
	return t.status === "no_sensors" && Object.keys(t.roles).length ? {
		label: e.t("plant_status.no_moisture"),
		more: r
	} : {
		label: Mt(e, t.status),
		more: r
	};
}
function tn(e, t) {
	return t && t.value !== null ? j(e, t.value, t.unit) : null;
}
function nn(e, t, n, r) {
	let i = Ft(n.role) ? n.role : null, a = i ? t.roles[i] : void 0, o = i ? A(e, i) : n.role, s = tn(e, a), c = (t) => t == null || !a ? null : j(e, t, a.unit);
	switch (n.kind) {
		case "stale": return a?.last_reported ? e.t("reason.stale", {
			role: o,
			age: Rt(e, a.last_reported, r)
		}) : e.t("reason.not_reporting", { role: o });
		case "unavailable": return e.t("reason.not_reporting", { role: o });
		case "no_sensors": return e.t("reason.no_sensors");
		case "low_light": {
			let t = c(a?.range.min);
			return s && t ? e.t("reason.low_light", {
				value: s,
				limit: t
			}) : e.t("problem_kind.low_light");
		}
		case "battery_low": return s ? e.t("reason.battery_low", { value: s }) : e.t("problem_kind.battery_low");
	}
	let l = [
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
	if (l === "low") {
		let t = c(a?.range.min);
		if (s && t) return e.t("reason.below_min", {
			role: o,
			value: s,
			limit: t
		});
	}
	if (l === "high") {
		let t = c(a?.range.max);
		if (s && t) return e.t("reason.above_max", {
			role: o,
			value: s,
			limit: t
		});
	}
	return e.t("reason.outside_target", { role: o });
}
function rn(e, t, n) {
	return t.status === "healthy" || t.status === "paused" || t.status === "no_sensors" ? "" : t.problems.slice(0, 2).map((r) => nn(e, t, r, n)).join(" · ");
}
function an(e, t, n = Date.now()) {
	if (!t) return e.t("card.never_watered");
	let r = Date.parse(t);
	return Number.isFinite(r) && Math.abs(n - r) < 6e4 ? e.t("card.watered_just_now") : e.t("card.watered", { age: Rt(e, t, n) });
}
function on(e) {
	return Object.keys(k).filter((t) => t !== "moisture" && e.roles[t]).map((t) => [t, e.roles[t]]);
}
var sn = [
	"all",
	"water",
	"problems",
	"sensors",
	"care"
];
function cn(e, t, n = !1, r = !1) {
	if (e === "all") return !0;
	if (r) return !1;
	switch (e) {
		case "care": return n;
		case "water": return t === "needs_water";
		case "problems": return t === "too_wet" || t === "problem";
		case "sensors": return t === "stale" || t === "no_sensors";
	}
}
var ln = [
	"attention",
	"name",
	"area"
];
function un(e, t) {
	let n = t.trim().toLocaleLowerCase();
	return !n || e.searchText.toLocaleLowerCase().includes(n);
}
var dn = (e, t) => e.name.localeCompare(t.name, void 0, { sensitivity: "base" }), fn = (e) => e.snoozed && e.status !== "paused" ? "healthy" : e.status ?? "healthy";
function pn(e, t) {
	let n = [...e];
	return t === "attention" ? n.sort((e, t) => Nt(fn(e), fn(t)) || dn(e, t)) : n.sort(dn), n;
}
function mn(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of pn(e, "name")) t.set(n.areaName, [...t.get(n.areaName) ?? [], n]);
	return [...t.entries()].sort(([e], [t]) => e === null ? 1 : t === null ? -1 : e.localeCompare(t, void 0, { sensitivity: "base" })).map(([e, t]) => ({
		area: e,
		items: t
	}));
}
//#endregion
//#region src/history-model.ts
var hn = [
	"24h",
	"7d",
	"30d",
	"1y"
], gn = 36e5, _n = 24 * gn, vn = {
	"24h": {
		spanMs: _n,
		period: "5minute",
		periodMs: 3e5
	},
	"7d": {
		spanMs: 7 * _n,
		period: "hour",
		periodMs: gn
	},
	"30d": {
		spanMs: 30 * _n,
		period: "hour",
		periodMs: gn
	},
	"1y": {
		spanMs: 365 * _n,
		period: "day",
		periodMs: _n
	}
};
function yn(e) {
	return typeof e == "string" && hn.includes(e);
}
var bn = (e) => typeof e == "number" && Number.isFinite(e);
function xn(e, t) {
	if (typeof e != "object" || !e || Array.isArray(e)) return null;
	let n = e[t];
	if (n === void 0) return [];
	if (!Array.isArray(n)) return null;
	let r = [];
	for (let e of n) {
		if (typeof e != "object" || !e) continue;
		let { start: t, end: n, mean: i, min: a, max: o } = e;
		if (!bn(t) || !bn(i)) continue;
		let s = bn(n) && n > t ? (t + n) / 2 : t, c = bn(a) ? Math.min(a, i) : i, l = bn(o) ? Math.max(o, i) : i;
		r.push({
			t: s,
			mean: i,
			min: c,
			max: l
		});
	}
	return r.sort((e, t) => e.t - t.t);
}
function Sn(e, t, n) {
	let r = e.at(-1);
	return t == null || !Number.isFinite(t) || r && r.t >= n ? [...e] : [...e, {
		t: n,
		mean: t,
		min: t,
		max: t
	}];
}
function Cn(e, t) {
	let n = [], r;
	for (let i of e) (!r || i.t - r.t > t * 2.5) && n.push([]), n.at(-1).push(i), r = i;
	return n;
}
function wn(e) {
	let t = 10 ** Math.floor(Math.log10(e)), n = e / t;
	return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * t;
}
function Tn(e, t, n) {
	let r = Math.min(...e.map((e) => e.min)), i = Math.max(...e.map((e) => e.max));
	(!Number.isFinite(r) || !Number.isFinite(i)) && (r = 0, i = n === "%" ? 100 : 1);
	let a = Math.max(i - r, n === "%" ? 10 : Math.max(Math.abs(i) * .1, 1)) * 1.5;
	for (let e of t) e != null && Number.isFinite(e) && (e < r && e >= r - a && (r = e), e > i && e <= i + a && (i = e));
	let o = n === "%" ? 10 : Math.max(Math.abs(i) * .05, 2);
	if (i - r < o) {
		let e = (o - (i - r)) / 2;
		r -= e, i += e;
	}
	let s = wn((i - r) / 4), c = Math.floor((r - s * .25) / s) * s, l = Math.ceil((i + s * .25) / s) * s;
	n === "%" ? (c = Math.max(0, c), l = Math.min(100, l)) : r >= 0 && (c = Math.max(0, c));
	let u = [];
	for (let e = Math.ceil(c / s - 1e-9) * s; e <= l + s * 1e-6; e += s) u.push(Number(e.toPrecision(12)));
	return {
		min: c,
		max: l,
		ticks: u
	};
}
function En(e, t, n) {
	let r = t - e, i = [], a = new Date(e), o = (n) => {
		let r = a.getTime();
		r >= e && r <= t && i.push({
			t: r,
			label: n.format(r)
		});
	};
	if (r <= 1.5 * _n) {
		let e = new Intl.DateTimeFormat(n, {
			hour: "2-digit",
			minute: "2-digit"
		});
		a.setMinutes(0, 0, 0), a.setHours(Math.floor(a.getHours() / 6) * 6);
		for (let n = 0; n < 12 && a.getTime() <= t; n++) o(e), a.setHours(a.getHours() + 6);
	} else if (r <= 45 * _n) {
		let e = r > 10 * _n, i = new Intl.DateTimeFormat(n, e ? {
			day: "numeric",
			month: "short"
		} : { weekday: "short" });
		a.setHours(0, 0, 0, 0);
		for (let n = 0; n < 60 && a.getTime() <= t; n++) o(i), a.setDate(a.getDate() + (e ? 7 : 1));
	} else {
		let e = new Intl.DateTimeFormat(n, { month: "short" });
		a.setHours(0, 0, 0, 0), a.setDate(1);
		for (let n = 0; n < 24 && a.getTime() <= t; n++) o(e), a.setMonth(a.getMonth() + 2);
	}
	return i;
}
var Dn = 5, On = 12 * gn, kn = .2, An = 60;
function jn(e, t) {
	let { periodMs: n, wateredAt: r = null, min: i = null } = t;
	if (n > gn || e.length < 3) return null;
	let a = Math.max(6 * gn, n * 1.5), o = 0, s = 0, c = !1;
	for (let t = 1; t < e.length; t++) {
		for (; e[t].t - e[s].t > a;) s++;
		let n = e[t].mean;
		for (let r = s; r < t; r++) n = Math.min(n, e[r].mean);
		let r = e[t].mean - n >= Dn;
		r && !c && (o = t), c = r;
	}
	let l = e.at(-1), u = o, d = !1;
	if (r !== null && Number.isFinite(r) && r <= l.t) {
		let t = e.findIndex((e) => e.t >= r);
		t >= 0 && (t >= o || e[o].t - r <= a) && (u = Math.max(t, o), d = !0);
	}
	for (let t = u + 1; t < e.length && e[t].t - e[u].t <= a; t++) e[t].mean >= e[u].mean && (u = t);
	let f = e.slice(u);
	if (f.length < 3 || l.t - f[0].t < On) return null;
	let p = f.reduce((e, t) => e + t.t, 0) / f.length, m = f.reduce((e, t) => e + t.mean, 0) / f.length, h = 0, g = 0;
	for (let e of f) h += (e.t - p) * (e.mean - m), g += (e.t - p) ** 2;
	if (g === 0) return null;
	let _ = -(h / g) * _n;
	if (!(_ >= kn)) return null;
	let ee = i !== null && l.mean > i ? (l.mean - i) / _ : null;
	return {
		ratePerDay: _,
		sinceWatering: d,
		daysToMin: ee !== null && ee <= An ? ee : null
	};
}
function Mn(e, t, n) {
	let r = j(e, Math.round(t.ratePerDay * 10) / 10, "%"), i = t.daysToMin, a = n == null ? "" : j(e, n, "%");
	return {
		rate: e.t(t.sinceWatering ? "history.rate_since_watering" : "history.rate", { rate: r }),
		forecast: i === null || !a ? "" : i < 1 ? e.t("history.forecast_soon", { limit: a }) : e.tn(Math.round(i), "history.forecast_one", "history.forecast_other", { limit: a })
	};
}
var Nn = {
	"24h": "history.period_24h",
	"7d": "history.period_7d",
	"30d": "history.period_30d",
	"1y": "history.period_1y"
};
function Pn(e, t, n, r, i) {
	let a = e.t(Nn[n]), o = r[0], s = r.at(-1);
	if (!o || !s) return e.t("history.summary_empty", {
		role: t,
		period: a
	});
	let c = (t) => j(e, Math.round(t * 10) / 10, i);
	return e.t("history.summary", {
		role: t,
		period: a,
		first: c(o.mean),
		last: c(s.mean),
		low: c(Math.min(...r.map((e) => e.min))),
		high: c(Math.max(...r.map((e) => e.max)))
	});
}
function Fn(e, t) {
	return {
		min: t?.min ?? null,
		max: e === "battery" ? null : t?.max ?? null,
		target: t?.target ?? null
	};
}
//#endregion
//#region src/api.ts
var M = class extends Error {
	constructor(e, t) {
		super(t), this.code = e, this.name = "ApiError";
	}
};
function In(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	return typeof t.code == "string" || typeof t.error == "object";
}
async function N(e, t) {
	try {
		let n = await e.connection.sendMessagePromise(t);
		if (!Ot(t, n)) throw new M("invalid_response", "The response is incompatible. Refresh and retry.");
		return n;
	} catch (e) {
		if (e instanceof M) throw e;
		if (In(e)) {
			let t = e.error?.code ?? e.code ?? "unknown_error";
			throw new M(typeof t == "string" ? t : "unknown_error", "Request failed. Review your input, refresh and retry.");
		}
		throw new M("unknown_error", "Request failed. Refresh and retry when connected.");
	}
}
var P = {
	careHistory(e, t) {
		return N(e, {
			type: "smart_plants/care/list",
			plant_id: t
		});
	},
	async addWatering(e, t, n, r, i) {
		return N(e, {
			type: "smart_plants/care/add_watering",
			plant_id: t,
			expected_revision: n,
			occurred_at: r,
			note: i
		});
	},
	async addCareEvent(e, t, n, r, i, a) {
		return N(e, {
			type: "smart_plants/care/add",
			plant_id: t,
			expected_revision: n,
			kind: r,
			occurred_at: i,
			payload: a
		});
	},
	async editCareEvent(e, t, n, r, i, a, o) {
		return N(e, {
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
		return N(e, {
			type: "smart_plants/care/delete",
			plant_id: t,
			expected_revision: n,
			event_id: r
		});
	},
	async createCareTask(e, t, n, r) {
		return N(e, {
			type: "smart_plants/care_tasks/create",
			plant_id: t,
			expected_revision: n,
			...r
		});
	},
	async updateCareTask(e, t, n, r, i) {
		return (await N(e, {
			type: "smart_plants/care_tasks/update",
			plant_id: t,
			task_id: n,
			expected_revision: r,
			...i
		})).plant;
	},
	async deleteCareTask(e, t, n, r) {
		return (await N(e, {
			type: "smart_plants/care_tasks/delete",
			plant_id: t,
			task_id: n,
			expected_revision: r
		})).plant;
	},
	async completeCareTask(e, t, n, r, i = {}) {
		return N(e, {
			type: "smart_plants/care_tasks/complete",
			plant_id: t,
			task_id: n,
			expected_revision: r,
			...i
		});
	},
	async skipCareTask(e, t, n, r) {
		return N(e, {
			type: "smart_plants/care_tasks/skip",
			plant_id: t,
			task_id: n,
			expected_revision: r
		});
	},
	async undoSkipCareTask(e, t, n, r, i) {
		return (await N(e, {
			type: "smart_plants/care_tasks/undo_skip",
			plant_id: t,
			task_id: n,
			expected_revision: r,
			previous_skipped_on: i
		})).plant;
	},
	async setRestPeriod(e, t, n, r) {
		return (await N(e, {
			type: "smart_plants/plants/set_rest_period",
			plant_id: t,
			expected_revision: n,
			rest_period: r
		})).plant;
	},
	async info(e) {
		let t = await N(e, { type: "smart_plants/panel/info" });
		if (!t || t.api_version !== 1 || t.schema_version !== 1 || !Array.isArray(t.providers) || !t.providers.every((e) => e && typeof e.provider == "string" && typeof e.available == "boolean" && typeof e.search_supported == "boolean") || t.bundle_version !== void 0 && (typeof t.bundle_version != "string" || t.bundle_version.length > 100)) throw new M("version_mismatch", "Panel/API version mismatch. Restart Home Assistant and fully reload the frontend after upgrading.");
		return t;
	},
	startWizard(e) {
		return N(e, { type: "smart_plants/wizard/start" });
	},
	previewWizard(e, t, n, r, i) {
		return N(e, {
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
		return (await N(e, {
			type: "smart_plants/wizard/create",
			...t
		})).plant;
	},
	async configureMoisture(e, t, n, r) {
		return (await N(e, {
			type: "smart_plants/moisture/configure",
			plant_id: t,
			expected_revision: n,
			moisture: r
		})).plant;
	},
	async evaluation(e, t) {
		return (await N(e, {
			type: "smart_plants/moisture/evaluation",
			plant_id: t
		})).evaluation;
	},
	async plantHealth(e, t) {
		return (await N(e, {
			type: "smart_plants/plants/health",
			plant_id: t
		})).evaluation;
	},
	async areas(e) {
		return Ln(await N(e, { type: "config/area_registry/list" }), (e) => typeof e.area_id == "string" && typeof e.name == "string");
	},
	async entities(e) {
		return Ln(await N(e, { type: "config/entity_registry/list" }), (e) => typeof e.id == "string" && typeof e.entity_id == "string" && typeof e.unique_id == "string" && typeof e.platform == "string" && (e.device_id === null || typeof e.device_id == "string") && (e.area_id === void 0 || e.area_id === null || typeof e.area_id == "string"));
	},
	async devices(e) {
		return Ln(await N(e, { type: "config/device_registry/list" }), (e) => typeof e.id == "string" && (e.area_id === null || typeof e.area_id == "string") && Array.isArray(e.identifiers) && e.identifiers.every((e) => Array.isArray(e) && e.length === 2 && e.every((e) => typeof e == "string")));
	},
	async states(e) {
		return Ln(await N(e, { type: "get_states" }), wt);
	},
	async related(e, t) {
		let n = await N(e, {
			type: "search/related",
			item_type: "device",
			item_id: t
		});
		return Array.isArray(n.automation) ? n.automation.filter((e) => typeof e == "string") : [];
	},
	async statistics(e, t, n, r, i) {
		let a = xn(await N(e, {
			type: "recorder/statistics_during_period",
			start_time: n.toISOString(),
			statistic_ids: [t],
			period: r,
			types: [
				"mean",
				"min",
				"max"
			],
			...i ? { units: i } : {}
		}), t);
		if (!a) throw new M("invalid_response", "The statistics response is incompatible. Refresh and retry.");
		return a;
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
		return (await N(e, {
			type: "smart_plants/species/search",
			provider: t,
			query: n,
			locale: r,
			limit: i
		})).results;
	},
	async previewSpecies(e, t, n, r, i) {
		return N(e, {
			type: "smart_plants/species/preview",
			provider: t,
			provider_ref: n,
			locale: r,
			plant_id: i
		});
	},
	async previewSpeciesRefresh(e, t, n) {
		return N(e, {
			type: "smart_plants/species/refresh_preview",
			plant_id: t,
			locale: n
		});
	},
	async applySpecies(e, t, n, r, i, a) {
		return (await N(e, {
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
		return (await N(e, { type: "smart_plants/roles/list" })).roles;
	},
	async setThresholdOverrides(e, t, n, r, i) {
		return (await N(e, {
			type: "smart_plants/roles/set_threshold_overrides",
			plant_id: t,
			expected_revision: n,
			role: r,
			values: i
		})).plant;
	},
	async setRoleSources(e, t, n, r, i) {
		return (await N(e, {
			type: "smart_plants/roles/set_sources",
			plant_id: t,
			expected_revision: n,
			role: r,
			sources: i
		})).plant;
	},
	async setRolePrimary(e, t, n, r, i) {
		return (await N(e, {
			type: "smart_plants/roles/set_primary",
			plant_id: t,
			expected_revision: n,
			role: r,
			primary_entity_id: i
		})).plant;
	},
	async setRoleAggregation(e, t, n, r, i) {
		return (await N(e, {
			type: "smart_plants/roles/set_aggregation",
			plant_id: t,
			expected_revision: n,
			role: r,
			aggregation: i
		})).plant;
	},
	async setRoleStaleAfter(e, t, n, r, i) {
		return (await N(e, {
			type: "smart_plants/roles/set_stale_after",
			plant_id: t,
			expected_revision: n,
			role: r,
			stale_after_seconds: i
		})).plant;
	},
	async overview(e) {
		let t = await N(e, { type: "smart_plants/plants/overview" });
		if (!Array.isArray(t?.plants)) throw new M("invalid_response", "Invalid plant overview response.");
		return t.plants.map(Zt).filter((e) => e !== null);
	},
	async list(e) {
		return pt((await N(e, { type: "smart_plants/plants/list" })).plants);
	},
	async create(e, t) {
		return (await N(e, {
			type: "smart_plants/plants/create",
			...t
		})).plant;
	},
	async update(e, t) {
		return (await N(e, {
			type: "smart_plants/plants/update",
			...t
		})).plant;
	},
	async disable(e, t, n) {
		return (await N(e, {
			type: "smart_plants/plants/disable",
			plant_id: t,
			expected_revision: n
		})).plant;
	},
	async reenable(e, t, n) {
		return (await N(e, {
			type: "smart_plants/plants/reenable",
			plant_id: t,
			expected_revision: n
		})).plant;
	},
	async snooze(e, t, n, r) {
		return (await N(e, {
			type: "smart_plants/plants/snooze",
			plant_id: t,
			expected_revision: n,
			until: r
		})).plant;
	},
	async setArea(e, t, n, r) {
		return (await N(e, {
			type: "smart_plants/plants/set_area",
			plant_id: t,
			expected_revision: n,
			area_id: r
		})).plant;
	},
	async delete(e, t, n) {
		await N(e, {
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
			throw e instanceof DOMException && e.name === "AbortError" ? e : new M("unknown_error", "Image request failed. Retry when connected.");
		}
		if (!a.ok) throw new M("unknown_error", `HTTP ${a.status}`);
		let s = await a.blob();
		if (s.type !== "image/webp" || s.size === 0) throw new M("invalid_response", "The image response is incompatible. Refresh and retry.");
		return s;
	},
	async uploadImage(e, t, n, r) {
		return Rn(e, `/api/smart_plants/plants/${encodeURIComponent(t)}/image?expected_revision=${n}`, {
			method: "POST",
			plantId: t,
			body: r,
			contentType: r.type
		});
	},
	async deleteImage(e, t, n) {
		return Rn(e, `/api/smart_plants/plants/${encodeURIComponent(t)}/image?expected_revision=${n}`, {
			method: "DELETE",
			plantId: t
		});
	}
};
function Ln(e, t) {
	if (!Array.isArray(e)) throw new M("invalid_response", "Home Assistant registry/state response is incompatible. Reload and retry.");
	return e.filter((e) => typeof e == "object" && !!e && !Array.isArray(e) && t(e));
}
async function Rn(e, t, n) {
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
		throw new M("unknown_error", "Image request failed. Retry when connected.");
	}
	let o = await a.text(), s = null;
	if (o) try {
		s = JSON.parse(o);
	} catch {
		s = null;
	}
	if (!a.ok) {
		let e = s?.error?.code ?? "unknown_error", t = e === "invalid_format" ? "invalid_image" : e;
		throw new M(typeof t == "string" ? t : "unknown_error", "Image request failed. Use a valid JPEG, PNG or WebP up to 5 MiB and 2048 × 2048 pixels.");
	}
	let c = s;
	if (!c || !et(c.plant) || c.plant.id !== n.plantId) throw new M("invalid_response", "The image response is incompatible. Refresh before retrying.");
	return c.plant;
}
//#endregion
//#region src/translations/de.ts
var zn = {
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
	"notice.deleted_elsewhere": "Diese Pflanze wurde in einer anderen Sitzung gelöscht.",
	"notice.area_changed_retained": "Der Home-Assistant-Bereich wurde von {from} zu {to} geändert. Deine Bereichsauswahl bleibt erhalten; prüfe sie vor dem Speichern.",
	"notice.area_changed_synced": "Der Home-Assistant-Bereich wurde von {from} zu {to} geändert. Die Bereichsauswahl zeigt jetzt den nativen Bereich.",
	"notice.related_failed": "Zugehörige Automatisierungen konnten nicht geladen werden. Öffne die native Geräteseite, um sie einzusehen.",
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
	"moisture.sources_intro": "Weise bis zu 32 Sensoren zu. Der Hauptsensor wird nie automatisch ersetzt. Nicht verfügbare Sensoren können zugewiesen werden.",
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
	"sources.role_intro": "Weise bis zu 32 Sensoren für {role} zu. Der Hauptsensor wird nie automatisch ersetzt. Nicht verfügbare Sensoren können zugewiesen werden.",
	"sources.add_role_sensor": "Sensor für {role} hinzufügen",
	"aggregation.primary": "Nur Hauptsensor",
	"aggregation.average": "Durchschnitt",
	"aggregation.min": "Niedrigster Wert",
	"aggregation.max": "Höchster Wert",
	"source_warning.missing_registered": "Registrierter Sensor fehlt – ersetze ihn oder prüfe die Reparaturen.",
	"source_warning.unregistered": "Nicht registriert: Umbenennungen können nicht zuverlässig verfolgt werden",
	"source_warning.unavailable": "Derzeit nicht verfügbar",
	"source_warning.moisture_metadata": "Unerwartete Metadaten: Die Auswertung erfordert einen Zahlenwert von 0–100 %",
	"source_warning.moisture_reading": "Ungültiger Messwert: Die Auswertung erfordert einen Prozentwert von 0 bis 100",
	"source_warning.role_metadata": "Unerwartete Metadaten: Die Auswertung für {role} erfordert die Geräteklasse {device_class} und die Einheit {units}",
	"source_warning.separator": ". ",
	"validation.sources_unique": "Wähle höchstens 32 unterschiedliche Sensorentitäten.",
	"validation.aggregation": "Wähle, wie Messwerte kombiniert werden.",
	"validation.primary": "Der Hauptsensor muss einer der zugewiesenen Sensoren oder „Keiner“ sein.",
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
	"automations.description": "Automatisierungen mit Templates oder dynamischen Verweisen werden eventuell nicht aufgeführt.",
	"automations.open_editor": "Automatisierungseditor öffnen",
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
	"reason.low_light": "Licht {value}, braucht mindestens {limit}",
	"reason.battery_low": "Sensorbatterie bei {value}",
	"reason.stale": "{role}: letzte Messung {age}",
	"reason.not_reporting": "{role}: Sensor meldet keine Werte",
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
	"automations.body": "Wähle im Automationseditor Smart-Plants-Auslöser wie „Pflanze braucht Wasser“ oder richte Benachrichtigungen über das ⋮-Menü der Pflanzenübersicht ein.",
	"automations.open_device": "Gerät öffnen",
	"automations.create": "Automatisierung erstellen",
	"automations.related_heading": "Automatisierungen mit dieser Pflanze",
	"automations.related_none": "Noch keine Automatisierung verwendet das Gerät dieser Pflanze.",
	"stale_alert.title": "{name} hat zuletzt {age} gemeldet.",
	"stale_alert.title_no_age": "{name} meldet keine Werte.",
	"stale_alert.body": "Prüfe Batterie oder Verbindung des Sensors. Gießhinweise ruhen, bis er wieder Werte meldet.",
	"assigned.heading": "Zugewiesene Sensoren",
	"assigned.empty": "Noch keine Sensoren.",
	"assigned.updated": "aktualisiert {age}",
	"assigned.not_found": "in Home Assistant nicht gefunden",
	"assigned.main": "Hauptsensor",
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
	"care_plan.open_automation_editor": "Automationseditor öffnen",
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
	"notifications.title": "Benachrichtigungen",
	"notifications.intro": "Lass dir Nachrichten zu deinen Pflanzen schicken. Du prüfst und speicherst sie im Automationseditor von Home Assistant.",
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
	"notifications.open_editor": "Im Automationseditor öffnen",
	"notifications.exists": "Diese Benachrichtigung gibt es schon.",
	"notifications.yaml_help": "Braucht die übliche automations.yaml. Sonst kopiere das YAML aus dem Editor in deine eigenen Dateien.",
	"notifications.editor_fallback": "Der Automationseditor konnte nicht vorausgefüllt werden. Füge den Smart-Plants-Auslöser und eine Benachrichtigungsaktion selbst hinzu.",
	"notifications.alias_daily": "Smart Plants: täglicher Pflanzenbericht",
	"notifications.alias_water": "Smart Plants: Pflanze braucht Wasser",
	"notifications.description_daily": "Erstellt in Smart Plants → Benachrichtigungen. Schickt eine kurze Liste der Pflanzen, die Wasser brauchen, Probleme oder fällige Pflegeaufgaben haben.",
	"notifications.description_water": "Erstellt in Smart Plants → Benachrichtigungen. Schickt eine Nachricht, wenn eine Pflanze seit {delay} Wasser braucht. Stummgeschaltete Pflanzen melden sich, wenn die Stummschaltung endet.",
	"notifications.description_water_now": "Erstellt in Smart Plants → Benachrichtigungen. Schickt eine Nachricht, wenn eine Pflanze Wasser braucht. Stummgeschaltete Pflanzen melden sich, wenn die Stummschaltung endet.",
	"notifications.msg_water_title": "{plant} braucht Wasser",
	"notifications.msg_water_body": "Gieß sie, wenn du dazu kommst."
}, Bn = {
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
	"notice.deleted_elsewhere": "This plant was deleted in another session.",
	"notice.area_changed_retained": "Home Assistant area changed from {from} to {to}. Your area selection is retained; review it before saving.",
	"notice.area_changed_synced": "Home Assistant area changed from {from} to {to}. The area selector now reflects the native area.",
	"notice.related_failed": "Related automations could not be loaded. Open the native device page to inspect them.",
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
	"moisture.sources_intro": "Assign up to 32 sensors. The main sensor is never replaced automatically. Unavailable sensors can be assigned.",
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
	"sources.role_intro": "Assign up to 32 {role} sensors. The main sensor is never replaced automatically. Unavailable sensors can be assigned.",
	"sources.add_role_sensor": "Add {role} sensor",
	"aggregation.primary": "Main sensor only",
	"aggregation.average": "Average",
	"aggregation.min": "Lowest",
	"aggregation.max": "Highest",
	"source_warning.missing_registered": "Missing registered sensor — replace it or review Repairs.",
	"source_warning.unregistered": "Unregistered: renames cannot be followed reliably",
	"source_warning.unavailable": "Currently unavailable",
	"source_warning.moisture_metadata": "Unexpected metadata: evaluation requires numeric 0–100 %",
	"source_warning.moisture_reading": "Invalid reading: evaluation requires a numeric percentage from 0 to 100",
	"source_warning.role_metadata": "Unexpected metadata: {role} evaluation requires device class {device_class} and unit {units}",
	"source_warning.separator": ". ",
	"validation.sources_unique": "Choose at most 32 unique sensor entities.",
	"validation.aggregation": "Choose how to combine readings.",
	"validation.primary": "The main sensor must be one of the assigned sensors or None.",
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
	"automations.description": "Automations that use templates or dynamic references may not be listed.",
	"automations.open_editor": "Open automation editor",
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
	"reason.low_light": "Light {value}, needs at least {limit}",
	"reason.battery_low": "Sensor battery at {value}",
	"reason.stale": "{role}: last reading {age}",
	"reason.not_reporting": "{role}: sensor is not reporting",
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
	"automations.related_heading": "Automations using this plant",
	"automations.related_none": "No automation uses this plant's device yet.",
	"stale_alert.title": "{name} last reported {age}.",
	"stale_alert.title_no_age": "{name} is not reporting.",
	"stale_alert.body": "Check the sensor's battery or connection. Watering alerts are paused until it reports again.",
	"assigned.heading": "Assigned sensors",
	"assigned.empty": "No sensors yet.",
	"assigned.updated": "updated {age}",
	"assigned.not_found": "not found in Home Assistant",
	"assigned.main": "Main sensor",
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
	"notifications.msg_water_body": "Water it when you get a chance."
}, Vn = ["en", "de"], Hn = {
	en: Bn,
	de: zn
};
function Un(e) {
	return Object.hasOwn(Bn, e);
}
function Wn(e) {
	let t = (e?.locale?.language || e?.language || "en").toLowerCase().split(/[-_]/)[0] ?? "en";
	return Vn.includes(t) ? t : "en";
}
function Gn(e) {
	if (!e) return;
	let t = e.replaceAll("_", "-");
	try {
		return Intl.getCanonicalLocales(t)[0];
	} catch {
		return;
	}
}
function Kn(e, t) {
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
function qn(e) {
	if (e?.time_format === "12") return !0;
	if (e?.time_format === "24") return !1;
}
function Jn(e, t, n) {
	return t ? e.replace(/\{(\w+)\}/g, (e, r) => {
		if (!Object.hasOwn(t, r)) return e;
		let i = t[r];
		return typeof i == "number" ? n(i) : i;
	}) : e;
}
var Yn = /* @__PURE__ */ new Map();
function Xn(e, t = Hn) {
	let n = Wn(e), r = e?.locale, i = t === Hn ? JSON.stringify([
		n,
		e?.language,
		r?.language,
		r?.number_format,
		r?.time_format,
		r?.date_format
	]) : null, a = i ? Yn.get(i) : void 0;
	if (a) return a;
	let o = Gn(r?.language || e?.language) ?? n, { locales: s, grouping: c } = Kn(r, o), l = c ? "min2" : !1, u = r?.date_format === "system" ? void 0 : [o], d = /* @__PURE__ */ new Map(), f = (e, t = {}) => {
		let n = JSON.stringify(t), r = d.get(n);
		return r || (r = new Intl.NumberFormat(s, {
			maximumFractionDigits: 2,
			useGrouping: l,
			...t
		}), d.set(n, r)), r.format(e);
	}, p = t[n], m = (e, n) => Jn(p[e] ?? t.en[e] ?? e, n, (e) => f(e)), h = new Intl.PluralRules(n), g = new Intl.DateTimeFormat(u, {
		dateStyle: "medium",
		timeZone: "UTC"
	}), _ = {
		hour: "numeric",
		minute: "2-digit"
	}, ee = qn(r);
	ee !== void 0 && (_.hour12 = ee);
	let te = new Intl.DateTimeFormat(u, {
		..._,
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: "UTC"
	}), v = new Intl.DateTimeFormat(u, {
		..._,
		year: "numeric",
		month: "short",
		day: "numeric"
	}), ne = {
		language: n,
		t: m,
		tn: (e, t, n, r) => m(h.select(e) === "one" ? t : n, {
			...r,
			count: e
		}),
		number: f,
		percent: (e) => m("format.percent", { value: e }),
		date: (e) => {
			let t = /^(\d{4})-(\d\d)-(\d\d)$/.exec(e);
			return t ? g.format(Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3]))) : e;
		},
		recordedDateTime: (e) => {
			let t = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::\d\d(?:\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.exec(e);
			if (!t) return e;
			let n = Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3]), Number(t[4]), Number(t[5]));
			return m("format.recorded_date_time", {
				datetime: te.format(n),
				offset: t[6] === "Z" ? "+00:00" : t[6]
			});
		},
		dateTime: (e) => {
			let t = Date.parse(e);
			return Number.isFinite(t) ? v.format(t) : e;
		}
	};
	return i && Yn.set(i, ne), ne;
}
var F = Xn(), I = [
	"min",
	"target",
	"max"
], Zn = {
	min: 15,
	target: 35,
	max: 55
}, Qn = [
	"indoor",
	"outdoor",
	"balcony",
	"greenhouse",
	"covered_outdoor",
	"dormant_storage"
], $n = [
	"temperature_stress",
	"humidity_stress",
	"soil_temperature_stress",
	"co2_stress",
	"low_light",
	"low_battery",
	"conductivity_stress"
];
function er(e, t = F) {
	let n = `section.health_contributor.${e}`;
	return Un(n) ? t.t(n) : e.replaceAll("_", " ");
}
function tr(e, t = F) {
	let n = `section.confidence_${e}`;
	return t.t(Un(n) ? n : "section.confidence_other");
}
function nr(e, t = F) {
	let n = `section.confidence_label_${e}`;
	return Un(n) ? t.t(n) : e;
}
function rr(e, t = F) {
	return t.t(`problem.${e}`);
}
var ir = {
	temperature_stress: [
		{
			key: "cold_threshold_celsius",
			label: "threshold_label.cold_threshold",
			unit: "°C"
		},
		{
			key: "cold_clear_celsius",
			label: "threshold_label.cold_clear",
			unit: "°C"
		},
		{
			key: "hot_clear_celsius",
			label: "threshold_label.hot_clear",
			unit: "°C"
		},
		{
			key: "hot_threshold_celsius",
			label: "threshold_label.hot_threshold",
			unit: "°C"
		}
	],
	humidity_stress: [
		{
			key: "dry_threshold_percent",
			label: "threshold_label.dry_threshold",
			unit: "%"
		},
		{
			key: "dry_clear_percent",
			label: "threshold_label.dry_clear",
			unit: "%"
		},
		{
			key: "damp_clear_percent",
			label: "threshold_label.damp_clear",
			unit: "%"
		},
		{
			key: "damp_threshold_percent",
			label: "threshold_label.damp_threshold",
			unit: "%"
		}
	],
	soil_temperature_stress: [
		{
			key: "cold_threshold_celsius",
			label: "threshold_label.cold_threshold",
			unit: "°C"
		},
		{
			key: "cold_clear_celsius",
			label: "threshold_label.cold_clear",
			unit: "°C"
		},
		{
			key: "hot_clear_celsius",
			label: "threshold_label.hot_clear",
			unit: "°C"
		},
		{
			key: "hot_threshold_celsius",
			label: "threshold_label.hot_threshold",
			unit: "°C"
		}
	],
	co2_stress: [{
		key: "threshold_ppm",
		label: "threshold_label.high_threshold",
		unit: "ppm"
	}, {
		key: "clear_ppm",
		label: "threshold_label.high_clear",
		unit: "ppm"
	}],
	low_light: [{
		key: "target_lux",
		label: "threshold_label.target",
		unit: "lx"
	}, {
		key: "clear_lux",
		label: "threshold_label.clear",
		unit: "lx"
	}],
	low_battery: [{
		key: "threshold_percent",
		label: "threshold_label.low_threshold",
		unit: "%"
	}, {
		key: "clear_percent",
		label: "threshold_label.low_clear",
		unit: "%"
	}],
	conductivity_stress: [
		{
			key: "low_threshold_micro_siemens_per_cm",
			label: "threshold_label.low_threshold",
			unit: "µS/cm"
		},
		{
			key: "low_clear_micro_siemens_per_cm",
			label: "threshold_label.low_clear",
			unit: "µS/cm"
		},
		{
			key: "high_clear_micro_siemens_per_cm",
			label: "threshold_label.high_clear",
			unit: "µS/cm"
		},
		{
			key: "high_threshold_micro_siemens_per_cm",
			label: "threshold_label.high_threshold",
			unit: "µS/cm"
		}
	]
}, ar = {
	cold_threshold_celsius: 10,
	cold_clear_celsius: 12,
	hot_clear_celsius: 32,
	hot_threshold_celsius: 35
}, or = [
	"cold_threshold_celsius",
	"cold_clear_celsius",
	"hot_clear_celsius",
	"hot_threshold_celsius"
], sr = -40, cr = 80, lr = .5, ur = 1;
function dr(e) {
	return e >= 0 ? Math.floor(e * 10 + .5) / 10 : -(Math.floor(-e * 10 + .5) / 10);
}
function fr(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = dr(n);
	return r < sr || r > cr ? "invalid" : r;
}
function pr(e, t = F) {
	let n = {};
	for (let r of or) {
		let i = fr(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.temperature_stress")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? ar[e], a = i("cold_threshold_celsius"), o = i("cold_clear_celsius"), s = i("hot_clear_celsius"), c = i("hot_threshold_celsius");
	return !(a < o && o < s && s < c) || o - a < lr || c - s < lr || s - o < ur ? {
		values: r,
		error: t.t("threshold_error.temperature_stress")
	} : {
		values: r,
		error: null
	};
}
function mr(e) {
	let t = {
		cold_threshold_celsius: "",
		cold_clear_celsius: "",
		hot_clear_celsius: "",
		hot_threshold_celsius: ""
	};
	if (!e) return t;
	for (let n of or) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var hr = {
	dry_threshold_percent: 25,
	dry_clear_percent: 30,
	damp_clear_percent: 80,
	damp_threshold_percent: 85
}, gr = [
	"dry_threshold_percent",
	"dry_clear_percent",
	"damp_clear_percent",
	"damp_threshold_percent"
], _r = 0, vr = 100, yr = 1, br = 5;
function xr(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = dr(n);
	return r < _r || r > vr ? "invalid" : r;
}
function Sr(e, t = F) {
	let n = {};
	for (let r of gr) {
		let i = xr(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.humidity_stress")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? hr[e], a = i("dry_threshold_percent"), o = i("dry_clear_percent"), s = i("damp_clear_percent"), c = i("damp_threshold_percent");
	return !(a < o && o < s && s < c) || o - a < yr || c - s < yr || s - o < br ? {
		values: r,
		error: t.t("threshold_error.humidity_stress")
	} : {
		values: r,
		error: null
	};
}
function Cr(e) {
	let t = {
		dry_threshold_percent: "",
		dry_clear_percent: "",
		damp_clear_percent: "",
		damp_threshold_percent: ""
	};
	if (!e) return t;
	for (let n of gr) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var wr = {
	low_threshold_micro_siemens_per_cm: 350,
	low_clear_micro_siemens_per_cm: 500,
	high_clear_micro_siemens_per_cm: 1800,
	high_threshold_micro_siemens_per_cm: 2e3
}, Tr = [
	"low_threshold_micro_siemens_per_cm",
	"low_clear_micro_siemens_per_cm",
	"high_clear_micro_siemens_per_cm",
	"high_threshold_micro_siemens_per_cm"
], Er = 0, Dr = 1e4, Or = 10, kr = 50;
function Ar(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = dr(n);
	return r < Er || r > Dr ? "invalid" : r;
}
function jr(e, t = F) {
	let n = {};
	for (let r of Tr) {
		let i = Ar(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.conductivity_stress")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? wr[e], a = i("low_threshold_micro_siemens_per_cm"), o = i("low_clear_micro_siemens_per_cm"), s = i("high_clear_micro_siemens_per_cm"), c = i("high_threshold_micro_siemens_per_cm");
	return !(a < o && o < s && s < c) || o - a < Or || c - s < Or || s - o < kr ? {
		values: r,
		error: t.t("threshold_error.conductivity_stress")
	} : {
		values: r,
		error: null
	};
}
function Mr(e) {
	let t = {
		low_threshold_micro_siemens_per_cm: "",
		low_clear_micro_siemens_per_cm: "",
		high_clear_micro_siemens_per_cm: "",
		high_threshold_micro_siemens_per_cm: ""
	};
	if (!e) return t;
	for (let n of Tr) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var Nr = {
	threshold_ppm: 5e3,
	clear_ppm: 4e3
}, Pr = ["threshold_ppm", "clear_ppm"], Fr = 0, Ir = 1e4, Lr = 100;
function Rr(e) {
	return e >= 0 ? Math.floor(e + .5) : -Math.floor(-e + .5);
}
function zr(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = Rr(n);
	return r < Fr || r > Ir ? "invalid" : r;
}
function Br(e, t = F) {
	let n = {};
	for (let r of Pr) {
		let i = zr(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.co2_stress")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? Nr[e], a = i("clear_ppm"), o = i("threshold_ppm");
	return !(a < o) || o - a < Lr ? {
		values: r,
		error: t.t("threshold_error.co2_stress")
	} : {
		values: r,
		error: null
	};
}
function Vr(e) {
	let t = {
		threshold_ppm: "",
		clear_ppm: ""
	};
	if (!e) return t;
	for (let n of Pr) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var Hr = {
	cold_threshold_celsius: 10,
	cold_clear_celsius: 12,
	hot_clear_celsius: 32,
	hot_threshold_celsius: 35
}, Ur = [
	"cold_threshold_celsius",
	"cold_clear_celsius",
	"hot_clear_celsius",
	"hot_threshold_celsius"
], Wr = -20, Gr = 60, Kr = .5, qr = 1;
function Jr(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = dr(n);
	return r < Wr || r > Gr ? "invalid" : r;
}
function Yr(e, t = F) {
	let n = {};
	for (let r of Ur) {
		let i = Jr(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.soil_temperature_stress")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? Hr[e], a = i("cold_threshold_celsius"), o = i("cold_clear_celsius"), s = i("hot_clear_celsius"), c = i("hot_threshold_celsius");
	return !(a < o && o < s && s < c) || o - a < Kr || c - s < Kr || s - o < qr ? {
		values: r,
		error: t.t("threshold_error.soil_temperature_stress")
	} : {
		values: r,
		error: null
	};
}
function Xr(e) {
	let t = {
		cold_threshold_celsius: "",
		cold_clear_celsius: "",
		hot_clear_celsius: "",
		hot_threshold_celsius: ""
	};
	if (!e) return t;
	for (let n of Ur) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var Zr = {
	threshold_percent: 20,
	clear_percent: 25
}, Qr = ["threshold_percent", "clear_percent"], $r = 0, ei = 100, ti = 1;
function ni(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = Rr(n);
	return r < $r || r > ei ? "invalid" : r;
}
function ri(e, t = F) {
	let n = {};
	for (let r of Qr) {
		let i = ni(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.low_battery")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? Zr[e], a = i("threshold_percent"), o = i("clear_percent");
	return !(a < o) || o - a < ti ? {
		values: r,
		error: t.t("threshold_error.low_battery")
	} : {
		values: r,
		error: null
	};
}
function ii(e) {
	let t = {
		threshold_percent: "",
		clear_percent: ""
	};
	if (!e) return t;
	for (let n of Qr) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var ai = {
	target_lux: 500,
	clear_lux: 700
}, oi = ["target_lux", "clear_lux"], si = 0, ci = 2e5, li = 10;
function ui(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = dr(n);
	return r < si || r > ci ? "invalid" : r;
}
function di(e, t = F) {
	let n = {};
	for (let r of oi) {
		let i = ui(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.low_light")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? ai[e], a = i("target_lux"), o = i("clear_lux");
	return !(a < o) || o - a < li ? {
		values: r,
		error: t.t("threshold_error.low_light")
	} : {
		values: r,
		error: null
	};
}
function fi(e) {
	let t = {
		target_lux: "",
		clear_lux: ""
	};
	if (!e) return t;
	for (let n of oi) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
function pi(e, t, n, r, i = F) {
	let a = `smart_plants:${e.id}:${t}`, o = n.find((e) => e.unique_id === a && e.platform === "smart_plants");
	if (!o) return [];
	let s = r[o.entity_id];
	return s ? ir[t].map((e) => {
		let t = s.attributes[e.key], n = typeof t == "number" && Number.isFinite(t) ? t : null;
		return {
			key: e.key,
			label: i.t(e.label),
			unit: e.unit,
			value: n
		};
	}) : [];
}
function mi(e, t, n, r = F) {
	return $n.map((i) => {
		let a = rr(i, r), o = `smart_plants:${e.id}:${i}`, s = t.find((e) => e.unique_id === o && e.platform === "smart_plants");
		if (!s) return {
			role: i,
			label: a,
			status: "not_configured",
			reason: null
		};
		let c = n[s.entity_id];
		if (!c || c.state === "unavailable" || c.state === "unknown") return {
			role: i,
			label: a,
			status: "unavailable",
			reason: null
		};
		let l = c.state === "on" ? "on" : "off", u = c.attributes.reason;
		return {
			role: i,
			label: a,
			status: l,
			reason: typeof u == "string" && u.trim() ? u : null
		};
	});
}
function hi() {
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
function L(e) {
	let t = e.roles?.moisture;
	return !t || !Array.isArray(t.sources) || t.sources.length > 32 || !t.sources.every((e) => e && typeof e.entity_id == "string" && /^sensor\.[a-z0-9_]+$/.test(e.entity_id) && (e.registry_id === null || typeof e.registry_id == "string")) || ![
		"primary",
		"average",
		"min",
		"max"
	].includes(t.aggregation) || !Number.isInteger(t.stale_after_seconds) || t.stale_after_seconds < 60 || t.stale_after_seconds > 604800 || !(t.primary_entity_id === null || t.sources.some((e) => e.entity_id === t.primary_entity_id)) || !I.every((e) => t.threshold_defaults?.[e] && Number.isInteger(t.threshold_defaults[e].value) && t.threshold_defaults[e].value >= 1 && t.threshold_defaults[e].value <= 99 && ["builtin", "provider"].includes(t.threshold_defaults[e].source) && (t.threshold_defaults[e].provider === null || typeof t.threshold_defaults[e].provider == "string") && (t.threshold_defaults[e].provider_ref === null || typeof t.threshold_defaults[e].provider_ref == "string") && (t.threshold_overrides?.[e] === null || Number.isInteger(t.threshold_overrides?.[e]))) || _i(t, Object.fromEntries(I.map((e) => [e, t.threshold_defaults[e].value]))) || I.some((e) => {
		let n = t.threshold_defaults[e];
		return n.source === "builtin" ? n.provider !== null || n.provider_ref !== null : !n.provider || !n.provider_ref;
	}) ? null : t;
}
function gi(e) {
	return structuredClone({
		sources: e.sources,
		primary_entity_id: e.primary_entity_id,
		aggregation: e.aggregation,
		stale_after_seconds: e.stale_after_seconds,
		threshold_overrides: e.threshold_overrides
	});
}
function _i(e, t, n = F) {
	if (e.sources.length > 32 || new Set(e.sources.map((e) => e.entity_id)).size !== e.sources.length || new Set(e.sources.map((e) => e.registry_id ?? e.entity_id)).size !== e.sources.length || e.sources.some((e) => !/^sensor\.[a-z0-9_]+$/.test(e.entity_id))) return n.t("validation.sources_unique");
	if (![
		"primary",
		"average",
		"min",
		"max"
	].includes(e.aggregation)) return n.t("validation.aggregation");
	if (e.primary_entity_id !== null && !e.sources.some((t) => t.entity_id === e.primary_entity_id)) return n.t("validation.primary");
	if (!Number.isInteger(e.stale_after_seconds) || e.stale_after_seconds < 60 || e.stale_after_seconds > 604800) return n.t("validation.stale_after");
	let r = I.map((n) => e.threshold_overrides[n] ?? t[n]);
	return r.some((e) => !Number.isInteger(e) || e < 1 || e > 99) || !(r[0] < r[1] && r[1] < r[2] && r[2] - r[0] >= 4) ? n.t("validation.moisture_thresholds") : null;
}
function vi(e, t) {
	let n = t === "en" || t === "de" ? e.common_names?.[t] : void 0;
	return t !== "en" && n?.length ? n[0] : e.common_name ?? n?.[0] ?? null;
}
function yi(e) {
	return [
		e.common_name,
		e.latin_name,
		...Object.values(e.common_names ?? {}).flat()
	].filter((e) => !!e);
}
function bi(e, t) {
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
function R(e, t) {
	return t.find((t) => t.identifiers.some(([t, n]) => t === "smart_plants" && n === e.id));
}
function z(e, t) {
	return e.registry_id ? t.find((t) => t.id === e.registry_id) : t.find((t) => t.entity_id === e.entity_id);
}
function xi(e, t) {
	let n = e.sources.find((t) => t.entity_id === e.primary_entity_id);
	return {
		...structuredClone(e),
		sources: e.sources.map((e) => {
			let n = z(e, t);
			return n ? {
				entity_id: n.entity_id,
				registry_id: n.id
			} : { ...e };
		}),
		primary_entity_id: n ? z(n, t)?.entity_id ?? n.entity_id : null
	};
}
function Si(e, t, n, r = F) {
	let i = z(e, t);
	if (e.registry_id && !i) return r.t("source_warning.missing_registered");
	let a = n[i?.entity_id ?? e.entity_id], o = [];
	return i || o.push(r.t("source_warning.unregistered")), (!a || ["unknown", "unavailable"].includes(a.state)) && o.push(r.t("source_warning.unavailable")), a && (a.attributes.unit_of_measurement !== "%" || a.attributes.device_class !== "moisture") && o.push(r.t("source_warning.moisture_metadata")), a && !["unknown", "unavailable"].includes(a.state) && (!a.state.trim() || !Number.isFinite(Number(a.state)) || Number(a.state) < 0 || Number(a.state) > 100) && o.push(r.t("source_warning.moisture_reading")), o.join(r.t("source_warning.separator"));
}
var Ci = [
	{
		role: "temperature",
		deviceClass: "temperature",
		acceptedUnits: [
			"°C",
			"°F",
			"K"
		]
	},
	{
		role: "humidity",
		deviceClass: "humidity",
		acceptedUnits: ["%"]
	},
	{
		role: "illuminance",
		deviceClass: "illuminance",
		acceptedUnits: ["lx"]
	},
	{
		role: "battery",
		deviceClass: "battery",
		acceptedUnits: ["%"]
	},
	{
		role: "conductivity",
		deviceClass: "conductivity",
		acceptedUnits: [
			"µS/cm",
			"μS/cm",
			"uS/cm"
		]
	},
	{
		role: "soil_temperature",
		deviceClass: "temperature",
		acceptedUnits: [
			"°C",
			"°F",
			"K"
		]
	},
	{
		role: "co2",
		deviceClass: "carbon_dioxide",
		acceptedUnits: ["ppm"]
	}
];
function wi(e) {
	return Ci.find((t) => t.role === e);
}
function Ti(e, t = F) {
	return t.t(`role.${e}`);
}
function Ei(e, t = F) {
	return t.t(`role_phrase.${e}`);
}
function B(e, t) {
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
function Di(e) {
	return structuredClone({
		sources: e.sources,
		primary_entity_id: e.primary_entity_id,
		aggregation: e.aggregation,
		stale_after_seconds: e.stale_after_seconds
	});
}
function Oi(e, t = F) {
	return e.sources.length > 32 || new Set(e.sources.map((e) => e.entity_id)).size !== e.sources.length || new Set(e.sources.map((e) => e.registry_id ?? e.entity_id)).size !== e.sources.length || e.sources.some((e) => !/^sensor\.[a-z0-9_]+$/.test(e.entity_id)) ? t.t("validation.sources_unique") : [
		"primary",
		"average",
		"min",
		"max"
	].includes(e.aggregation) ? e.primary_entity_id !== null && !e.sources.some((t) => t.entity_id === e.primary_entity_id) ? t.t("validation.primary") : !Number.isInteger(e.stale_after_seconds) || e.stale_after_seconds < 60 || e.stale_after_seconds > 604800 ? t.t("validation.stale_after") : null : t.t("validation.aggregation");
}
function ki(e, t) {
	let n = e.sources.find((t) => t.entity_id === e.primary_entity_id);
	return {
		...structuredClone(e),
		sources: e.sources.map((e) => {
			let n = z(e, t);
			return n ? {
				entity_id: n.entity_id,
				registry_id: n.id
			} : { ...e };
		}),
		primary_entity_id: n ? z(n, t)?.entity_id ?? n.entity_id : null
	};
}
function Ai(e, t, n, r, i = F) {
	let a = z(e, t);
	if (e.registry_id && !a) return i.t("source_warning.missing_registered");
	let o = n[a?.entity_id ?? e.entity_id], s = [];
	if (a || s.push(i.t("source_warning.unregistered")), (!o || ["unknown", "unavailable"].includes(o.state)) && s.push(i.t("source_warning.unavailable")), o) {
		let e = o.attributes.unit_of_measurement, t = o.attributes.device_class;
		(typeof e != "string" || !r.acceptedUnits.includes(e) || t !== r.deviceClass) && s.push(i.t("source_warning.role_metadata", {
			role: Ti(r.role, i),
			device_class: r.deviceClass,
			units: r.acceptedUnits.join(" / ")
		}));
	}
	return s.join(i.t("source_warning.separator"));
}
function ji(e) {
	return [...new Set(e.split(",").map((e) => e.trim()).filter(Boolean))];
}
function Mi(e, t, n = F) {
	return e.length > 60 || t.length > 32 || t.some((e) => e.length > 60) ? n.t("validation.taxonomy") : null;
}
//#endregion
//#region src/editors.ts
var Ni = (e) => e.target.value;
function Pi(e, t, n, r = "text", i = 200) {
	return b`<label>${e}<input type=${r} maxlength=${i} .value=${t} @input=${(e) => n(Ni(e))}></label>`;
}
function Fi(e, t, n, r, i) {
	return b`<label>${t}<select .value=${n} @change=${(e) => i(Ni(e))}>${(n && !r.some((e) => e.value === n) ? [...r, {
		value: n,
		label: e.t("editor.current_value", { value: n })
	}] : r).map((e) => b`<option value=${e.value} ?selected=${e.value === n}>${e.label}</option>`)}</select></label>`;
}
function Ii(e, t) {
	let n = `placement.${t}`;
	return Un(n) ? e.t(n) : t.replaceAll("_", " ");
}
function Li(e, t) {
	let n = `exposure.${t}`;
	return Un(n) ? e.t(n) : t;
}
function Ri(e, t) {
	let n = `rain_exposure.${t}`;
	return Un(n) ? e.t(n) : t;
}
function zi(e, t) {
	let n = `aggregation.${t}`;
	return Un(n) ? e.t(n) : t;
}
function Bi(e, t) {
	return e.t(`moisture_threshold.${t}`);
}
function Vi(e, t, n, r) {
	return Fi(e, e.t("area.label"), t, [
		{
			value: "",
			label: e.t("area.none")
		},
		...t && !n.some((e) => e.area_id === t) ? [{
			value: t,
			label: e.t("area.missing_option", { area: t })
		}] : [],
		...n.map((e) => ({
			value: e.area_id,
			label: e.name
		}))
	], r);
}
function Hi(e, t, n) {
	let r = (e) => n({
		mode: "indoor",
		exposure: null,
		rain_exposure: null,
		container: null,
		...t,
		...e
	}), i = e.t("common.not_specified");
	return b`${Fi(e, e.t("placement.label"), t?.mode ?? "", [{
		value: "",
		label: i
	}, ...Qn.map((t) => ({
		value: t,
		label: Ii(e, t)
	}))], (e) => e ? r({ mode: e }) : n(null))}
    ${t ? b`${Fi(e, e.t("exposure.label"), t.exposure ?? "", [
		"",
		"full_sun",
		"partial_sun",
		"shade"
	].map((t) => ({
		value: t,
		label: t ? Li(e, t) : i
	})), (e) => r({ exposure: e || null }))}
    ${Fi(e, e.t("rain_exposure.label"), t.rain_exposure ?? "", [
		"",
		"none",
		"partial",
		"full"
	].map((t) => ({
		value: t,
		label: t ? Ri(e, t) : i
	})), (e) => r({ rain_exposure: e || null }))}
    ${Fi(e, e.t("container.label"), t.container === null ? "" : String(t.container), [
		{
			value: "",
			label: i
		},
		{
			value: "true",
			label: e.t("container.in_container")
		},
		{
			value: "false",
			label: e.t("container.in_ground")
		}
	], (e) => r({ container: e === "" ? null : e === "true" }))}` : x}`;
}
function Ui(e, t, n) {
	let r = n[t], i = e.t("sources.not_supplied_lower");
	return e.t("sources.candidate", {
		name: typeof r?.attributes.friendly_name == "string" ? r.attributes.friendly_name : t,
		entity_id: t,
		unit: String(r?.attributes.unit_of_measurement ?? i),
		device_class: String(r?.attributes.device_class ?? i),
		state: r?.state ?? e.t("sources.unavailable_lower")
	});
}
function Wi(e, t) {
	let n = t[e]?.attributes.friendly_name;
	return typeof n == "string" && n.trim() ? `${n} · ${e}` : e;
}
function Gi(e, t, n, r, i, a, o, s, c, l, u, d, f = "all") {
	let p = e.t("common.not_supplied"), m = b`
    ${Fi(e, e.t("sources.primary"), t.primary_entity_id ?? "", [{
		value: "",
		label: e.t("sources.primary_none")
	}, ...t.sources.map((e) => ({
		value: e.entity_id,
		label: Wi(z(e, n)?.entity_id ?? e.entity_id, r)
	}))], (e) => o({ primary_entity_id: e || null }))}
    ${Fi(e, e.t("sources.aggregation"), t.aggregation, [
		"primary",
		"average",
		"min",
		"max"
	].map((t) => ({
		value: t,
		label: zi(e, t)
	})), (e) => o({ aggregation: e }))}
    ${Pi(e.t("sources.stale_after"), String(t.stale_after_seconds), (e) => o({ stale_after_seconds: Number(e) }), "number")}`;
	return f === "combine" ? m : b`
    <p>${s}</p>
    <label class="check"><input type="checkbox" .checked=${i} @change=${(e) => a(e.target.checked)}>${e.t("sources.show_all")}</label>
    ${Fi(e, c, "", [{
		value: "",
		label: e.t("sources.choose")
	}, ...u.map((t) => ({
		value: t,
		label: Ui(e, t, r)
	}))], (e) => {
		e && !t.sources.some((t) => t.entity_id === e) && o({ sources: [...t.sources, {
			entity_id: e,
			registry_id: n.find((t) => t.entity_id === e)?.id ?? null
		}] });
	})}
    <label>${e.t("sources.assign_unavailable")}<input placeholder=${l} @keydown=${(e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			let r = e.target, i = r.value.trim();
			/^sensor\.[a-z0-9_]+$/.test(i) && !t.sources.some((e) => e.entity_id === i) && (o({ sources: [...t.sources, {
				entity_id: i,
				registry_id: n.find((e) => e.entity_id === i)?.id ?? null
			}] }), r.value = "");
		}
	}}></label><small>${e.t("sources.press_enter")}</small>
    <ul>${t.sources.map((i) => {
		let a = z(i, n), s = i.registry_id && !a ? void 0 : r[a?.entity_id ?? i.entity_id];
		return b`<li><strong>${a?.entity_id ?? i.entity_id}</strong><p>${s?.state ?? e.t("sources.unavailable")} ${s?.attributes.unit_of_measurement ?? ""}${i.entity_id === t.primary_entity_id ? e.t("sources.primary_suffix") : ""}</p><p>${e.t("sources.metadata", {
			device_class: String(s?.attributes.device_class ?? p),
			unit: String(s?.attributes.unit_of_measurement ?? p),
			registration: a ? e.t("sources.registered") : e.t("sources.not_registered")
		})}</p><small>${d(i)}</small>${a ? b`<a href="/config/entities/entity/${encodeURIComponent(a.id)}">${e.t("sources.native_settings")}</a>` : x}<button type="button" @click=${() => o({
			sources: t.sources.filter((e) => e !== i),
			primary_entity_id: t.primary_entity_id === i.entity_id ? null : t.primary_entity_id
		})}>${e.t("sources.remove", { entity_id: i.entity_id })}</button></li>`;
	})}</ul>
    ${t.sources.some((e) => e.registry_id && !z(e, n)) ? b`<a href="/config/repairs">${e.t("sources.open_repairs")}</a>` : x}
    ${f === "all" ? m : x}`;
}
function Ki(e, t, n, r, i, a, o, s, c = "all") {
	let l = (e) => s({
		...t,
		...e
	}), u = [.../* @__PURE__ */ new Set([...r.map((e) => e.entity_id), ...Object.keys(i)])].filter((e) => e.startsWith("sensor.") && (a || i[e]?.attributes.device_class === "moisture")).sort(), d = c === "pick" || c === "combine" ? c : "all";
	return b`${c === "thresholds" ? x : Gi(e, t, r, i, a, o, l, e.t("moisture.sources_intro"), e.t("moisture.add_sensor"), "sensor.soil_moisture", u, (t) => Si(t, r, i, e), d)}
    ${c === "thresholds" || c === "all" ? b`<p>${e.t("moisture.overrides_intro")}</p><div class="grid">${I.map((r) => b`<div>${Pi(e.t("moisture.override_label", { key: Bi(e, r) }), t.threshold_overrides[r] === null ? "" : String(t.threshold_overrides[r]), (e) => l({ threshold_overrides: {
		...t.threshold_overrides,
		[r]: e.trim() === "" ? null : Number(e)
	} }), "number")}<small>${e.t("moisture.default_effective", {
		default: e.percent(n[r]),
		effective: e.percent(t.threshold_overrides[r] ?? n[r])
	})}</small><button type="button" @click=${() => l({ threshold_overrides: {
		...t.threshold_overrides,
		[r]: null
	} })}>${e.t("moisture.inherit_key", { key: Bi(e, r) })}</button></div>`)}</div>` : x}`;
}
function qi(e, t, n, r, i, a, o, s, c = "all") {
	let l = (e) => s({
		...n,
		...e
	}), u = [.../* @__PURE__ */ new Set([...r.map((e) => e.entity_id), ...Object.keys(i)])].filter((e) => e.startsWith("sensor.") && (a || i[e]?.attributes.device_class === t.deviceClass && typeof i[e]?.attributes.unit_of_measurement == "string" && t.acceptedUnits.includes(i[e]?.attributes.unit_of_measurement))).sort(), d = Ei(t.role, e);
	return Gi(e, n, r, i, a, o, l, e.t("sources.role_intro", { role: d }), e.t("sources.add_role_sensor", { role: d }), `sensor.${t.role}`, u, (n) => Ai(n, r, i, t, e), c);
}
function Ji(e, t, n) {
	let r = e.t("common.not_supplied"), i = [
		[e.t("snapshot.provider"), t.provider],
		[e.t("snapshot.reference"), t.provider_ref],
		[e.t("snapshot.attribution"), t.attribution],
		[e.t("snapshot.fetched"), e.dateTime(t.fetched_at)],
		[e.t("snapshot.locale"), t.locale],
		[e.t("snapshot.status"), t.source_status === "manual" || t.source_status === "provider" ? e.t(`snapshot.status_${t.source_status}`) : t.source_status],
		[e.t("snapshot.confidence"), t.confidence === null ? r : e.number(t.confidence)],
		[e.t("snapshot.category"), t.category ?? r]
	], a = t.threshold_defaults.moisture, o = Object.entries(t.care_text), s = (e) => {
		let t = e == null ? "—" : typeof e == "string" ? e : JSON.stringify(e);
		return t.length > 80 ? `${t.slice(0, 79)}…` : t;
	}, c = vi(t, e.language);
	return b`<article><h3>${c ?? t.latin_name ?? e.t("snapshot.species")}</h3>${t.latin_name && t.latin_name !== c ? b`<p><i>${t.latin_name}</i></p>` : x}
    <p class="snapshot-targets">${e.t("snapshot.imported_defaults")}: ${I.map((t) => `${Bi(e, t)} ${a?.[t] === void 0 ? "—" : e.percent(a[t])}`).join(" · ")}</p>
    ${I.some((e) => a?.[e] === void 0) ? b`<p class="small muted">${e.t("snapshot.default_not_supplied")}</p>` : x}
    ${o.length ? b`<details><summary>${e.t("snapshot.care_notes")}</summary>${o.map(([e, t]) => b`<h4>${e}</h4><p class="prose">${t}</p>`)}</details>` : x}
    <details><summary>${e.t("snapshot.source_details")}</summary>
      <dl>${i.map(([e, t]) => b`<dt>${e}</dt><dd>${t}</dd>`)}</dl>
      <h4>${e.t("snapshot.field_attribution")}</h4>${Object.entries(t.field_sources).map(([e, t]) => b`<p>${e}: ${t}</p>`)}
      ${n ? b`<h4>${e.t("snapshot.proposed_changes")}</h4>${Object.entries(n.diff).map(([e, t]) => b`<p>${e}: ${s(t.before)} → ${s(t.after)}</p>`)}` : x}
    </details>
    ${n ? b`<p class="small muted">${e.t("snapshot.preview_read_only")}</p>` : x}</article>`;
}
//#endregion
//#region src/components/shared-styles.ts
var V = o`
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
`, Yi = o`
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
`;
function Xi(e) {
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
function H(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
//#endregion
//#region src/components/sp-status-chip.ts
var Zi, Qi = class extends S {
	constructor(...e) {
		super(...e), this.status = "healthy", this.label = "", this.more = 0, this.l = F;
	}
	willUpdate() {
		let e = At[this.status]?.color ?? "--disabled-text-color";
		this.toggleAttribute("muted", e === "--disabled-text-color"), this.style.setProperty("--sp-status", Xi(e));
	}
	render() {
		let e = At[this.status] ?? At.healthy, t = this.label || Mt(this.l, this.status in At ? this.status : "healthy");
		return b`<span class="chip" part="chip"><ha-icon aria-hidden="true" .icon=${e.icon}></ha-icon><span class="label">${t}</span>${this.more > 0 ? b`<span aria-hidden="true">${this.l.t("plant_status.more", { count: this.more })}</span><span class="sr-only">${this.l.t("plant_status.more_label", { count: this.more })}</span>` : x}</span>`;
	}
};
Zi = Qi, Zi.styles = [
	V,
	Yi,
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
], H([C({ reflect: !0 })], Qi.prototype, "status", void 0), H([C()], Qi.prototype, "label", void 0), H([C({ type: Number })], Qi.prototype, "more", void 0), H([C({ attribute: !1 })], Qi.prototype, "l", void 0), customElements.get("sp-status-chip") || customElements.define("sp-status-chip", Qi);
//#endregion
//#region src/components/sp-moisture-bar.ts
var $i, ea = (e) => Math.min(100, Math.max(0, e)), ta = class extends S {
	constructor(...e) {
		super(...e), this.value = null, this.range = null, this.state = "ok", this.lastReported = null, this.now = void 0, this.l = F;
	}
	willUpdate() {
		this.toggleAttribute("dimmed", this.state === "stale" || this.state === "unavailable");
	}
	_hasRange() {
		return this.range?.min !== null && this.range?.min !== void 0 && this.range.max !== null && this.range.max !== void 0;
	}
	render() {
		let e = this.l, t = this.range, n = this.value, r = It(e, "moisture", t, "%"), i = n === null ? "—" : j(e, n, "%"), a = n === null ? e.t("moisture_bar.label_no_value") : r ? e.t("moisture_bar.label", {
			value: i,
			range: r
		}) : e.t("moisture_bar.label_no_range", { value: i }), o = this._hasRange(), s = o ? ea(t.min) : 0, c = o ? ea(t.max) : 0, l = t?.target ?? null, u = this.state === "stale" && this.lastReported;
		return b`
      <div class="top"><span class="name"><ha-icon aria-hidden="true" .icon=${k.moisture.icon}></ha-icon>${A(e, "moisture")}</span>
        <span class="value ${this.state}" aria-hidden="true">${i}</span></div>
      <div class="track" role="img" aria-label=${a}>
        ${o ? b`<div class="band" style="left:${s}%;width:${Math.max(0, c - s)}%"></div>` : x}
        ${l === null ? x : b`<div class="tick" style="left:${ea(l)}%"></div>`}
        ${n === null ? x : b`<div class="dot ${this.state}" style="left:${Math.min(98, Math.max(2, n))}%"></div>`}
      </div>
      <div class="scale" aria-hidden="true"><span>${e.t("moisture_bar.dry")}</span>${r ? b`<span>${e.t("moisture_bar.target", { range: r })}</span>` : x}<span>${e.t("moisture_bar.wet")}</span></div>
      ${u ? b`<div class="age"><ha-icon aria-hidden="true" icon="mdi:clock-outline"></ha-icon>${e.t("moisture_bar.last_update", { age: Rt(e, this.lastReported, this.now) })}</div>` : x}`;
	}
};
$i = ta, $i.styles = [V, o`
    :host { display: block; font-size: 13px; color: var(--sp-text); }
    .top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .name { display: inline-flex; align-items: center; gap: 4px; color: var(--sp-text-secondary); }
    .name ha-icon { --mdc-icon-size: 16px; }
    .value { font-size: 18px; font-weight: 500; font-variant-numeric: tabular-nums; }
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
    .age { display: flex; align-items: center; gap: 4px; margin-top: 4px; font-size: 12px; color: var(--sp-text-secondary); }
    .age ha-icon { --mdc-icon-size: 15px; }
  `], H([C({ type: Number })], ta.prototype, "value", void 0), H([C({ attribute: !1 })], ta.prototype, "range", void 0), H([C({ reflect: !0 })], ta.prototype, "state", void 0), H([C({ attribute: !1 })], ta.prototype, "lastReported", void 0), H([C({ attribute: !1 })], ta.prototype, "now", void 0), H([C({ attribute: !1 })], ta.prototype, "l", void 0), customElements.get("sp-moisture-bar") || customElements.define("sp-moisture-bar", ta);
//#endregion
//#region src/components/sp-reading-chip.ts
var na, ra = class extends S {
	constructor(...e) {
		super(...e), this.role = "temperature", this.value = null, this.unit = "", this.state = "ok", this.range = null, this.l = F;
	}
	render() {
		let e = this.l, t = k[this.role] ?? k.temperature, n = A(e, this.role in k ? this.role : "temperature"), r = It(e, this.role, this.range, this.unit), i = (this.state === "low" || this.state === "high") && r;
		return b`<span class="chip" part="chip" title=${r ? `${n}: ${r}` : n}>
      <ha-icon aria-hidden="true" .icon=${t.icon}></ha-icon><span class="sr-only">${n}</span>
      ${this.value === null ? e.t("reading.no_value") : j(e, this.value, this.unit)}
      ${i ? b`<span class="sr-only">, ${e.t("reading.outside_target", { range: r })}</span>` : x}
      ${this.state === "stale" ? b`<span class="sr-only">, ${e.t("reading.not_updating")}</span>` : x}
    </span>`;
	}
};
na = ra, na.styles = [
	V,
	Yi,
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
], H([C()], ra.prototype, "role", void 0), H([C({ type: Number })], ra.prototype, "value", void 0), H([C()], ra.prototype, "unit", void 0), H([C({ reflect: !0 })], ra.prototype, "state", void 0), H([C({ attribute: !1 })], ra.prototype, "range", void 0), H([C({ attribute: !1 })], ra.prototype, "l", void 0), customElements.get("sp-reading-chip") || customElements.define("sp-reading-chip", ra);
//#endregion
//#region src/components/sp-plant-avatar.ts
var ia, aa = class extends S {
	constructor(...e) {
		super(...e), this.src = null, this.name = "", this.size = "small", this.l = F;
	}
	render() {
		return b`<div class="tile" part="tile">${this.src ? b`<img src=${this.src} alt=${this.l.t("photo.alt", { name: this.name })} @error=${() => this.dispatchEvent(new CustomEvent("photo-error", {
			bubbles: !0,
			composed: !0
		}))}>` : b`<ha-icon aria-hidden="true" icon="mdi:sprout"></ha-icon>`}</div>`;
	}
};
ia = aa, ia.styles = [V, o`
    :host { --sp-avatar-size: 56px; --sp-avatar-radius: 12px; display: inline-block; flex: none; width: var(--sp-avatar-size); height: var(--sp-avatar-size); max-width: 100%; }
    :host([size="large"]) { --sp-avatar-size: 132px; --sp-avatar-radius: 16px; }
    @media (max-width: 600px) { :host([size="large"]) { --sp-avatar-size: 76px; --sp-avatar-radius: 12px; } }
    .tile { width: 100%; height: 100%; border-radius: var(--sp-avatar-radius); overflow: hidden; display: grid; place-items: center;
      background: color-mix(in srgb, var(--sp-primary) 12%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
    ha-icon { --mdc-icon-size: calc(var(--sp-avatar-size) * .54); }
  `], H([C({ attribute: !1 })], aa.prototype, "src", void 0), H([C()], aa.prototype, "name", void 0), H([C({ reflect: !0 })], aa.prototype, "size", void 0), H([C({ attribute: !1 })], aa.prototype, "l", void 0), customElements.get("sp-plant-avatar") || customElements.define("sp-plant-avatar", aa);
//#endregion
//#region src/components/sp-empty-state.ts
var oa, sa = class extends S {
	constructor(...e) {
		super(...e), this.icon = "mdi:sprout", this.heading = "", this.compact = !1;
	}
	render() {
		return b`<div class="art" aria-hidden="true"><ha-icon .icon=${this.icon}></ha-icon></div>
      <h2>${this.heading}</h2><div class="text"><slot></slot></div><div class="actions"><slot name="actions"></slot></div>`;
	}
};
oa = sa, oa.styles = [V, o`
    :host { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 48px 20px; color: var(--sp-text); }
    .art { width: 96px; height: 96px; border-radius: 50%; display: grid; place-items: center;
      background: color-mix(in srgb, var(--sp-primary) 12%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
    :host([compact]) { padding: 32px 16px; }
    :host([compact]) .art { width: 64px; height: 64px; }
    ha-icon { --mdc-icon-size: 52px; }
    :host([compact]) ha-icon { --mdc-icon-size: 34px; }
    h2 { margin: 6px 0 0; font-size: 22px; font-weight: 400; line-height: 1.25; text-wrap: balance; }
    :host([compact]) h2 { font-size: 18px; }
    .text { max-width: 44ch; color: var(--sp-text-secondary); }
    .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 6px; }
  `], H([C()], sa.prototype, "icon", void 0), H([C()], sa.prototype, "heading", void 0), H([C({
	type: Boolean,
	reflect: !0
})], sa.prototype, "compact", void 0), customElements.get("sp-empty-state") || customElements.define("sp-empty-state", sa);
//#endregion
//#region src/components/sp-history-chart.ts
var ca, la = 200, U = {
	top: 10,
	right: 12,
	bottom: 24,
	left: 46
}, W = class extends S {
	constructor(...e) {
		super(...e), this.points = [], this.start = 0, this.end = 0, this.periodMs = 36e5, this.unit = "", this.band = null, this.markers = [], this.summary = "", this.bandLabel = "", this.markerLabel = "", this.actionLabel = "", this.l = F, this._width = 600, this._active = null, this._pinned = !1, this._outside = (e) => {
			this._pinned && !e.composedPath().includes(this) && this._unpin();
		};
	}
	connectedCallback() {
		super.connectedCallback(), typeof ResizeObserver < "u" && (this._observer = new ResizeObserver((e) => {
			let t = Math.round(e[0]?.contentRect.width ?? 0);
			t > 0 && t !== this._width && (this._width = t);
		}), this._observer.observe(this));
	}
	disconnectedCallback() {
		this._observer?.disconnect(), this._observer = void 0, document.removeEventListener("pointerdown", this._outside), super.disconnectedCallback();
	}
	willUpdate(e) {
		if (this._active === null) return;
		let t = e.get("points");
		(e.has("points") && (!t || t.length !== this.points.length || t[0]?.t !== this.points[0]?.t) || e.has("periodMs") || e.has("unit") || this._active >= this.points.length) && (this._active = null, this._unpin());
	}
	_pin(e) {
		this._active = e, this._pinned = e !== null, this._pinned && document.addEventListener("pointerdown", this._outside);
	}
	_unpin() {
		this._pinned = !1, document.removeEventListener("pointerdown", this._outside);
	}
	_pointText(e) {
		let t = this.l, n = (e) => j(t, Math.round(e * 10) / 10, this.unit), r = t.dateTime(new Date(e.t).toISOString());
		return e.max - e.min >= .1 ? t.t("history.point_spread", {
			time: r,
			value: n(e.mean),
			min: t.number(Math.round(e.min * 10) / 10),
			max: n(e.max)
		}) : t.t("history.point", {
			time: r,
			value: n(e.mean)
		});
	}
	_nearest(e) {
		let t = this.shadowRoot?.querySelector("svg")?.getBoundingClientRect();
		if (!t || !t.width || !this.points.length) return null;
		let n = t.width - U.left - U.right, r = this.start + (e - t.left - U.left) / n * (this.end - this.start), i = 0;
		for (let e = 1; e < this.points.length; e++) Math.abs(this.points[e].t - r) < Math.abs(this.points[i].t - r) && (i = e);
		return i;
	}
	_fire(e) {
		this._unpin(), this.dispatchEvent(new CustomEvent("point-action", {
			detail: { t: e },
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		let e = this.l, t = this.points, n = Math.max(this._width, 240), r = n - U.left - U.right, i = la - U.bottom, a = this.band, o = Tn(t, [
			a?.min,
			a?.max,
			a?.target
		], this.unit), s = Math.max(this.end - this.start, 1), c = (e) => U.left + (e - this.start) / s * r, l = (e) => i - (Math.min(o.max, Math.max(o.min, e)) - o.min) / (o.max - o.min) * (i - U.top), u = (e, t) => `${c(e).toFixed(1)} ${l(t).toFixed(1)}`, d = Cn(t, this.periodMs), f = (e) => e != null && e >= o.min && e <= o.max, p = a && (a.min !== null || a.max !== null) ? l(a.max ?? o.max) : null, m = a && (a.min !== null || a.max !== null) ? l(a.min ?? o.min) : null, h = o.max >= 1e4, g = En(this.start, this.end, e.language), _ = Math.max(1, Math.ceil(g.length * 52 / r)), ee = g.filter((e, t) => (g.length - 1 - t) % _ == 0), te = this.markers.filter((e) => e >= this.start && e <= this.end), v = this._active === null ? void 0 : t[this._active], ne = t.some((e) => e.max - e.min >= .1), re = (e) => {
			this._pinned || (this._active = this._nearest(e.clientX));
		}, ie = (e) => {
			let t = this._nearest(e.clientX);
			if (this._pinned && t === this._active) {
				this._unpin();
				return;
			}
			this._pin(t);
		}, y = (e) => {
			e.key === "Enter" && t.length ? (e.preventDefault(), this._pin(this._active ?? t.length - 1)) : e.key === "Escape" && this._pinned && (e.stopPropagation(), this._unpin());
		}, ae = this.actionLabel && this._pinned && v;
		return b`
      <div class="plot" @keydown=${y}>
        <svg viewBox="0 0 ${n} ${la}" role="img" aria-label=${this.summary}
          @pointermove=${re} @pointerdown=${ie} @pointerleave=${() => {
			this._pinned || (this._active = null);
		}}>
          ${p !== null && m !== null && m > p ? De`<rect class="band" x=${U.left} y=${p} width=${r} height=${m - p}></rect>` : x}
          ${o.ticks.map((t) => De`<line class="grid" x1=${U.left} x2=${n - U.right} y1=${l(t)} y2=${l(t)}></line>
            <text x=${U.left - 6} y=${l(t) + 4} text-anchor="end">${e.number(t, h ? { notation: "compact" } : {})}</text>`)}
          ${[a?.min, a?.max].filter(f).map((e) => De`<line class="limit" x1=${U.left} x2=${n - U.right} y1=${l(e)} y2=${l(e)}></line>`)}
          ${f(a?.target) ? De`<line class="limit target" x1=${U.left} x2=${n - U.right} y1=${l(a.target)} y2=${l(a.target)}></line>` : x}
          ${ee.map((e) => De`<text x=${c(e.t)} y=${194} text-anchor="middle">${e.label}</text>`)}
          ${ne ? d.filter((e) => e.length > 1).map((e) => De`<path class="spread" d=${`M${e.map((e) => u(e.t, e.max)).join("L")}L${[...e].reverse().map((e) => u(e.t, e.min)).join("L")}Z`}></path>`) : x}
          ${d.map((e) => e.length > 1 ? De`<path class="line" d=${`M${e.map((e) => u(e.t, e.mean)).join("L")}`}></path>` : De`<circle class="marker-dot" style="fill: var(--sp-primary)" cx=${c(e[0].t)} cy=${l(e[0].mean)} r="2"></circle>`)}
          ${te.map((e) => De`<line class="marker" x1=${c(e)} x2=${c(e)} y1=${U.top + 6} y2=${i}></line><circle class="marker-dot" cx=${c(e)} cy=${U.top + 3} r="3.5"></circle>`)}
          ${v ? De`<line class="cursor" x1=${c(v.t)} x2=${c(v.t)} y1=${U.top} y2=${i}></line><circle class="cursor-dot" cx=${c(v.t)} cy=${l(v.mean)} r="4"></circle>` : x}
        </svg>
        ${t.length ? b`<input class="sr-only" type="range" min="0" max=${t.length - 1} step="1" .value=${String(this._active ?? t.length - 1)}
          aria-label=${e.t("history.point_label")} aria-valuetext=${this._pointText(t[this._active ?? t.length - 1])}
          @input=${(e) => {
			this._active = Number(e.target.value);
		}} @blur=${() => {
			this._pinned || (this._active = null);
		}}>` : x}
      </div>
      <div class="readout-row" @keydown=${(e) => {
			e.key === "Escape" && this._pinned && (e.stopPropagation(), this._unpin());
		}}>
        <span class="readout" aria-hidden="true">${v ? this._pointText(v) : x}</span>
        ${ae ? b`<button type="button" class="action" @click=${() => this._fire(v.t)}>${this.actionLabel}</button>` : x}
      </div>
      <div class="legend">
        ${this.bandLabel ? b`<span><i class="key band"></i>${this.bandLabel}</span>` : x}
        ${ne ? b`<span><i class="key spread"></i>${e.t("history.legend_spread")}</span>` : x}
        ${te.length && this.markerLabel ? b`<span><i class="key marker"></i>${this.markerLabel}</span>` : x}
      </div>`;
	}
};
ca = W, ca.styles = [
	V,
	Yi,
	o`
    :host { display: block; color: var(--sp-text); }
    .plot { position: relative; border-radius: 4px; }
    .plot:focus-within { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
    svg { display: block; width: 100%; height: ${la}px; touch-action: pan-y; }
    text { font-size: 11px; fill: var(--sp-text-secondary); font-variant-numeric: tabular-nums; }
    .grid { stroke: color-mix(in srgb, var(--sp-text) 12%, transparent); stroke-width: 1; }
    .band { fill: color-mix(in srgb, var(--sp-success) 14%, transparent); }
    .limit { stroke: color-mix(in srgb, var(--sp-success) 60%, var(--sp-text)); stroke-width: 1; opacity: .7; }
    .target { stroke-dasharray: 4 4; }
    .spread { fill: color-mix(in srgb, var(--sp-primary) 16%, transparent); }
    .line { fill: none; stroke: var(--sp-primary); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .marker { stroke: var(--sp-info); stroke-width: 1.5; stroke-dasharray: 2 3; }
    .marker-dot { fill: var(--sp-info); }
    .cursor { stroke: color-mix(in srgb, var(--sp-text) 45%, transparent); stroke-width: 1; }
    .cursor-dot { fill: var(--sp-card); stroke: var(--sp-primary); stroke-width: 2; }
    .readout-row { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 12px; min-height: 28px; margin-top: 2px; }
    .readout { font-size: 13px; font-variant-numeric: tabular-nums; }
    .action { padding: 2px 6px; border: 0; border-radius: 4px; background: none; color: var(--sp-primary); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; }
    .action:hover { background: color-mix(in srgb, var(--sp-primary) 10%, transparent); }
    .action:focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 1px; }
    .legend { display: flex; flex-wrap: wrap; gap: 2px 16px; margin-top: 4px; font-size: 12px; color: var(--sp-text-secondary); }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .key { display: inline-block; width: 14px; height: 8px; border-radius: 2px; }
    .key.band { background: color-mix(in srgb, var(--sp-success) 30%, transparent); }
    .key.spread { background: color-mix(in srgb, var(--sp-primary) 30%, transparent); }
    .key.marker { width: 8px; border-radius: 50%; background: var(--sp-info); }
  `
], H([C({ attribute: !1 })], W.prototype, "points", void 0), H([C({ attribute: !1 })], W.prototype, "start", void 0), H([C({ attribute: !1 })], W.prototype, "end", void 0), H([C({ attribute: !1 })], W.prototype, "periodMs", void 0), H([C()], W.prototype, "unit", void 0), H([C({ attribute: !1 })], W.prototype, "band", void 0), H([C({ attribute: !1 })], W.prototype, "markers", void 0), H([C()], W.prototype, "summary", void 0), H([C()], W.prototype, "bandLabel", void 0), H([C()], W.prototype, "markerLabel", void 0), H([C()], W.prototype, "actionLabel", void 0), H([C({ attribute: !1 })], W.prototype, "l", void 0), H([w()], W.prototype, "_width", void 0), H([w()], W.prototype, "_active", void 0), H([w()], W.prototype, "_pinned", void 0), customElements.get("sp-history-chart") || customElements.define("sp-history-chart", W);
//#endregion
//#region src/components/sp-snooze-chip.ts
var ua, da = class extends S {
	constructor(...e) {
		super(...e), this.label = "";
	}
	render() {
		return b`<span class="chip" part="chip"><ha-icon aria-hidden="true" icon="mdi:bell-sleep-outline"></ha-icon><span class="label">${this.label}</span></span>`;
	}
};
ua = da, ua.styles = [V, o`
    :host { display: inline-flex; max-width: 100%; }
    .chip {
      display: inline-flex; align-items: center; gap: 5px; min-height: 26px; max-width: 100%;
      padding: 2px 10px 2px 7px; border-radius: 13px; font-size: 13px; font-weight: 500; line-height: 1.3;
      background: color-mix(in srgb, var(--sp-text) 8%, transparent);
      color: color-mix(in srgb, var(--sp-text-secondary) 60%, var(--sp-text));
    }
    ha-icon { --mdc-icon-size: 17px; flex: none; }
    .label { overflow-wrap: anywhere; hyphens: auto; }
  `], H([C()], da.prototype, "label", void 0), customElements.get("sp-snooze-chip") || customElements.define("sp-snooze-chip", da);
//#endregion
//#region src/ha-elements.ts
function G(e, t = customElements) {
	return t.get(e) !== void 0;
}
//#endregion
//#region src/views/plant.ts
var K = [
	"overview",
	"sensors",
	"care",
	"settings"
], fa = {
	overview: "detail.tab_overview",
	sensors: "detail.tab_sensors",
	care: "detail.tab_care",
	settings: "detail.tab_settings"
}, pa = [
	"watering",
	"fertilizing",
	"pruning",
	"repotting",
	"note"
], ma = {
	watering: "mdi:water",
	fertilizing: "mdi:flask-outline",
	pruning: "mdi:content-cut",
	repotting: "mdi:shovel",
	note: "mdi:note-text-outline",
	task: "mdi:clipboard-check-outline"
};
function ha(e, t, n) {
	let r = t[n], i = r?.attributes.friendly_name;
	if (typeof i == "string" && i.trim()) return i;
	if (!r) return e.t("sensor.missing");
	let a = n.split(".").slice(1).join(".").replaceAll("_", " ");
	return a ? a.charAt(0).toLocaleUpperCase() + a.slice(1) : n;
}
function ga(e) {
	return typeof e.last_reported == "string" && Number.isFinite(Date.parse(e.last_reported)) ? e.last_reported : e.last_updated;
}
function _a(e, t) {
	let n = A(e, t);
	return e.language !== "en" || /^.[A-Z₀-₉]/.test(n) ? n : n.charAt(0).toLocaleLowerCase() + n.slice(1);
}
function va(e) {
	return e ? Object.keys(k).filter((t) => e.roles[t]).map((t) => [t, e.roles[t]]) : [];
}
function ya(e, t) {
	return t.state === "stale" || t.state === "unavailable" ? "off" : t.state === "low" ? e === "moisture" ? "water" : "bad" : t.state === "high" ? e === "moisture" ? "wet" : "bad" : "ok";
}
function ba(e, t, n) {
	switch (t.state) {
		case "ok": return e.t("reading_state.ok");
		case "low": return e.t("reading_state.low");
		case "high": return e.t("reading_state.high");
		case "stale": return t.last_reported ? e.t("reading_state.stale", { age: Rt(e, t.last_reported, n) }) : e.t("reading_state.stale_no_age");
		case "unavailable": return e.t("reading_state.unavailable");
	}
}
function xa(e, t) {
	return t.value === null ? "—" : j(e, t.value, t.unit);
}
function Sa(e, t, n) {
	return t.status === "paused" ? e.t("detail.reason_paused") : t.status === "healthy" || !t.problems.length ? e.t("detail.reason_healthy") : t.problems.map((r) => nn(e, t, r, n)).join(" · ");
}
function Ca(e, t, n) {
	let r = va(t).slice(0, 4);
	return r.length ? b`<ul class="keyreads" aria-label=${e.t("detail.key_readings")}>${r.map(([t, r]) => {
		let i = ya(t, r), a = It(e, t, r.range, r.unit), o = r.state === "stale" && r.last_reported ? e.t("moisture_bar.last_update", { age: Rt(e, r.last_reported, n) }) : a, s = i === "water" || i === "wet" || i === "bad";
		return b`<li class="kr"><span class="kr-label"><ha-icon aria-hidden="true" .icon=${k[t].icon}></ha-icon>${A(e, t)}</span>
      <span class="kr-value tone-${i}">${xa(e, r)}${s ? b`<span class="sr-only">, ${ba(e, r, n)}</span>` : x}</span>
      ${o ? b`<span class="kr-range">${o}</span>` : x}</li>`;
	})}</ul>` : x;
}
function wa(e, t, n, r, i) {
	let a = ya(t, n), o = n.sources.map((t) => ha(e, r, t)).join(", "), s = It(e, t, n.range, n.unit);
	return b`<li class="li"><span class="ic tone-${a}" aria-hidden="true"><ha-icon .icon=${k[t].icon}></ha-icon></span>
    <span class="li-main"><span class="li-title">${A(e, t)}</span>
      <span class="li-sub">${o ? b`${o} · ` : x}<span class="state tone-${a}">${ba(e, n, i)}</span></span></span>
    <span class="li-end"><span class="li-value">${xa(e, n)}</span>${s ? b`<span class="li-sub">${s}</span>` : x}</span></li>`;
}
var Ta = {
	moisture: "%",
	temperature: "°C",
	humidity: "%",
	illuminance: "lx",
	conductivity: "µS/cm",
	soil_temperature: "°C",
	co2: "ppm",
	battery: "%"
}, Ea = {
	"24h": "history.range_24h",
	"7d": "history.range_7d",
	"30d": "history.range_30d",
	"1y": "history.range_1y"
};
function Da(e, t) {
	let { role: n, range: r, reading: i } = t, a = vn[r], o = i?.unit || Ta[n], s = i && i.state !== "stale" && i.state !== "unavailable" ? i.value : null, c = t.status === "ready" ? Sn(t.points, s, t.now) : [], l = Fn(n, i?.range), u = It(e, n, i?.range, o), d = n === "moisture" && c.length ? jn(c, {
		periodMs: a.periodMs,
		wateredAt: t.lastWatered,
		min: l.min
	}) : null, f = d ? Mn(e, d, l.min) : null, p = t.status === "loading" ? e.t("history.loading") : t.status === "unavailable" ? e.t("history.unavailable") : t.status === "ready" && !c.length ? e.t("history.empty") : "";
	return b`<section class="sp-card history-card" aria-labelledby="history-heading"><div class="card-h"><h3 id="history-heading">${e.t("history.heading")}</h3>
      ${t.status === "unavailable" ? x : b`<button type="button" class="btn text sm" @click=${t.onOpen}>${e.t("history.open_native")}</button>`}</div>
    <div class="card-b">
      <div class="history-bar">
        ${t.roles.length > 1 ? b`<div class="row" role="group" aria-label=${e.t("history.role_label")}>${t.roles.map((r) => b`<button type="button" class="fchip" aria-pressed=${r === n ? "true" : "false"} @click=${() => t.onRole(r)}>${A(e, r)}</button>`)}</div>` : x}
        <span class="spacer"></span>
        <div class="seg" role="group" aria-label=${e.t("history.range_label")}>${hn.map((n) => b`<button type="button" aria-pressed=${n === r ? "true" : "false"} @click=${() => t.onRange(n)}>${e.t(Ea[n])}</button>`)}</div>
      </div>
      ${t.status === "error" ? b`<div class="row"><span class="error-text" role="alert">${e.t("history.error")}</span><button type="button" class="btn text sm" @click=${t.onRetry}>${e.t("history.retry")}</button></div>` : p ? b`<p class="muted history-message" role="status">${p}</p>` : b`<sp-history-chart .points=${c} .start=${t.now - a.spanMs} .end=${t.now} .periodMs=${a.periodMs} .unit=${o} .band=${l} .markers=${t.markers}
            .summary=${Pn(e, A(e, n), r, c, o)} .bandLabel=${u ? e.t("history.legend_target", { range: u }) : ""} .markerLabel=${t.markerLabel}
            .actionLabel=${n === "moisture" && t.onLogWatering ? e.t("history.log_watering_at") : ""} @point-action=${(e) => t.onLogWatering?.(e.detail.t)} .l=${e}></sp-history-chart>`}
      ${f ? b`<p class="small history-rate"><strong>${f.rate}</strong>${f.forecast ? b` <span class="muted">${f.forecast}</span>` : x}</p>` : x}
    </div></section>`;
}
function Oa(e, t) {
	return t >= 3600 && t % 3600 == 0 ? e.t("duration.hours", { count: t / 3600 }) : t >= 60 && t % 60 == 0 ? e.t("duration.minutes", { count: t / 60 }) : e.t("duration.seconds", { count: t });
}
function ka(e, t, n) {
	return Object.entries(t.payload).filter(([, e]) => e !== null && e !== "").map(([t, r]) => `${n(t)}: ${typeof r == "number" && t === "amount" ? e.number(r) : String(r)}`);
}
function Aa(e) {
	let { key: t, icon: n, header: r, secondary: i, open: a, native: o, toggle: s, content: c } = e;
	return o ? b`<ha-expansion-panel class="expander" data-section=${t} outlined .header=${r} .secondary=${i} .expanded=${a}
      @expanded-changed=${(e) => {
		e.target === e.currentTarget && s(e.detail.expanded);
	}}>
      <ha-icon slot="leading-icon" aria-hidden="true" .icon=${n}></ha-icon>
      ${a ? b`<div class="expander-body">${c()}</div>` : x}</ha-expansion-panel>` : b`<details class="expander" data-section=${t} ?open=${a} @toggle=${(e) => {
		let t = e.currentTarget.open;
		t !== a && s(t);
	}}>
    <summary><ha-icon aria-hidden="true" .icon=${n}></ha-icon><span class="summary-text"><span class="summary-title">${r}</span><span class="summary-sub">${i}</span></span></summary>
    <div class="expander-body">${c()}</div></details>`;
}
var ja = o`
  .pd { container: plant / inline-size; display: flex; flex-direction: column; gap: 16px; padding-bottom: 32px; --sp-primary-strong: color-mix(in srgb, var(--sp-primary) 78%, #000); }
  .pd .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  .pd ha-icon { --mdc-icon-size: 20px; flex: none; }
  .pd h2, .pd h3 { margin: 0; line-height: 1.25; }
  .pd p { margin: 0; }
  .pd ul { list-style: none; margin: 0; padding: 0; }
  .pd li { margin: 0; }
  .pd dl { margin: 0; }

  .sp-card { background: var(--ha-card-background, var(--sp-card)); border: 1px solid var(--ha-card-border-color, var(--divider-color, #e0e0e0)); border-radius: var(--ha-card-border-radius, 12px); min-width: 0; }
  .pd section.sp-card, .pd div.sp-card { padding: 0; margin: 0; }
  .pd .spacer { flex: 1; }
  .pd .error-text { color: var(--sp-error); }
  .pd code { font-size: 12.5px; overflow-wrap: anywhere; }
  /* On narrow cards the actions move below the heading instead of squeezing
     it; long words in other languages break at hyphens, not mid-letter. */
  .card-h { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 8px; padding: 12px 16px 4px; min-height: 52px; }
  .card-h h2, .card-h h3 { font-size: 16px; font-weight: 500; flex: 1 1 auto; overflow-wrap: break-word; hyphens: auto; }
  .card-b { padding: 8px 16px 16px; display: flex; flex-direction: column; gap: 12px; }
  .muted, .pd small { color: var(--sp-text-secondary); }
  .small { font-size: 13px; }

  .pd button.btn, .pd a.btn, .pd label.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; height: auto; padding: 6px 18px; border-radius: 20px; border: 0; font: inherit; font-size: 14px; font-weight: 500; cursor: pointer; text-decoration: none; white-space: nowrap; background: transparent; color: inherit; max-width: 100%; margin: 0; }
  .pd .btn ha-icon { --mdc-icon-size: 18px; }
  .pd .btn.filled { background: var(--sp-primary-strong); color: var(--text-primary-color, #fff); }
  .pd .btn.outline { border: 1px solid var(--divider-color, #bdbdbd); color: color-mix(in srgb, var(--sp-primary) 70%, var(--sp-text)); }
  .pd .btn.tonal { background: color-mix(in srgb, var(--sp-primary) 14%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
  .pd .btn.text { color: color-mix(in srgb, var(--sp-primary) 70%, var(--sp-text)); padding: 6px 12px; }
  .pd .btn.danger { border: 1px solid color-mix(in srgb, var(--sp-error) 60%, transparent); color: color-mix(in srgb, var(--sp-error) 60%, var(--sp-text)); }
  .pd .btn.sm { min-height: 36px; padding: 4px 14px; font-size: 13px; }
  .pd .btn:hover:not(:disabled) { box-shadow: inset 0 0 0 100px color-mix(in srgb, currentColor 8%, transparent); }
  .pd .btn.filled:hover:not(:disabled) { box-shadow: none; background: color-mix(in srgb, var(--sp-primary) 70%, #000); }
  .pd .btn:disabled { opacity: .55; cursor: default; background: transparent; }
  .pd .btn.filled:disabled { background: var(--sp-primary-strong); }
  .pd label.btn:focus-within { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
  .pd .file-input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; min-height: 0; padding: 0; border: 0; }
  .pd button.icon-btn { display: inline-grid; place-items: center; width: 40px; height: 40px; min-height: 40px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--sp-text-secondary); cursor: pointer; flex: none; }
  .pd button.icon-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--sp-text) 8%, transparent); }

  /* Header */
  .hero { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 20px; align-items: start; padding: 20px; }
  .hero-name { font-size: 26px; font-weight: 400; line-height: 1.2; overflow-wrap: anywhere; hyphens: auto; }
  .hero-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 4px; color: var(--sp-text-secondary); font-size: 13.5px; }
  .hero-meta span { display: inline-flex; align-items: center; gap: 4px; }
  .hero-meta ha-icon { --mdc-icon-size: 17px; }
  .hero-status { margin-top: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
  .reason { font-size: 13.5px; color: var(--sp-text-secondary); overflow-wrap: anywhere; hyphens: auto; }
  .hero-status .snooze { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 2px; max-width: 100%; }
  .pd .hero-status .snooze .btn.sm { min-height: 32px; padding: 2px 10px; }

  /* Snooze dialog */
  .snooze-dialog .snooze-choices { display: flex; flex-direction: column; gap: 4px; }
  .snooze-dialog .snooze-choices legend { margin-bottom: 4px; }
  .snooze-dialog .check { padding: 6px 0; cursor: pointer; }
  .snooze-dialog .check input { margin: 0; flex: none; }
  .snooze-dialog .choice-text { display: flex; flex-direction: column; min-width: 0; }
  .snooze-dialog input[type="date"] { max-width: 240px; }
  .hero-actions { display: flex; flex-direction: column; gap: 8px; align-items: stretch; }
  .keyreads { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); border-top: 1px solid var(--divider-color, #e0e0e0); }
  .kr { display: flex; flex-direction: column; padding: 12px 20px; border-inline-end: 1px solid var(--divider-color, #e0e0e0); min-width: 0; }
  .kr:last-child { border-inline-end: 0; }
  .kr-label { display: flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--sp-text-secondary); }
  .kr-label ha-icon { --mdc-icon-size: 16px; }
  .kr-value { font-size: 20px; font-weight: 500; font-variant-numeric: tabular-nums; }
  .kr-range { font-size: 12px; color: var(--sp-text-secondary); }

  .tone-water { color: color-mix(in srgb, var(--sp-warning) 50%, var(--sp-text)); }
  .tone-wet { color: color-mix(in srgb, var(--sp-info) 50%, var(--sp-text)); }
  .tone-bad { color: color-mix(in srgb, var(--sp-error) 55%, var(--sp-text)); }
  .tone-ok.state { color: color-mix(in srgb, var(--sp-success) 55%, var(--sp-text)); }
  .tone-off.state { color: var(--sp-text-secondary); }

  /* Tabs */
  ha-tab-group { display: block; --ha-tab-track-color: var(--divider-color, #e0e0e0); }
  .tablist { display: flex; gap: 4px; border-bottom: 1px solid var(--divider-color, #e0e0e0); overflow-x: auto; scrollbar-width: none; }
  .tablist button[role="tab"] { border: 0; border-bottom: 2px solid transparent; border-radius: 0; background: transparent; min-height: 48px; padding: 0 16px; font: inherit; font-weight: 500; color: var(--sp-text-secondary); cursor: pointer; white-space: nowrap; }
  .tablist button[role="tab"][aria-selected="true"] { color: color-mix(in srgb, var(--sp-primary) 70%, var(--sp-text)); border-bottom-color: var(--sp-primary); }
  .tabpanel { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .tabpanel:focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 4px; }

  /* Lists */
  .cols { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 16px; align-items: start; }
  .stack { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .list { display: flex; flex-direction: column; }
  .li { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 16px; min-height: 60px; }
  .li + .li { border-top: 1px solid var(--divider-color, #e0e0e0); }
  .ic { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, var(--sp-text) 7%, transparent); color: var(--sp-text-secondary); }
  .ic.tone-water { background: color-mix(in srgb, var(--sp-warning) 18%, transparent); }
  .ic.tone-wet { background: color-mix(in srgb, var(--sp-info) 16%, transparent); }
  .ic.tone-bad { background: color-mix(in srgb, var(--sp-error) 15%, transparent); }
  .ic.tone-ok { background: color-mix(in srgb, var(--sp-success) 15%, transparent); color: color-mix(in srgb, var(--sp-success) 55%, var(--sp-text)); }
  .ic.tonal { background: color-mix(in srgb, var(--sp-primary) 12%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
  .li-main { display: flex; flex-direction: column; min-width: 0; }
  .li-title { font-size: 15px; overflow-wrap: anywhere; }
  .li-sub { font-size: 13px; color: var(--sp-text-secondary); overflow-wrap: anywhere; hyphens: auto; }
  .li-end { display: flex; flex-direction: column; align-items: flex-end; text-align: end; font-variant-numeric: tabular-nums; }
  .li-end .li-sub { font-size: 12px; }
  .li-value { font-size: 16px; font-weight: 500; white-space: nowrap; }
  .li-actions { display: flex; align-items: center; gap: 4px; }
  .empty-box { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 12px; border: 1px dashed var(--divider-color, #e0e0e0); border-radius: 8px; font-size: 13px; color: var(--sp-text-secondary); }
  .kv { display: grid; grid-template-columns: minmax(90px, 130px) minmax(0, 1fr); gap: 10px 12px; font-size: 14px; }
  .kv dt { color: var(--sp-text-secondary); }
  .kv dd { margin: 0; overflow-wrap: anywhere; }
  .kv .btn.text { padding: 0; min-height: 0; }
  dl.sensors, dl.other-targets { display: grid; grid-template-columns: minmax(110px, 180px) minmax(0, 1fr); gap: 12px 16px; align-items: baseline; }
  dl.sensors dt, dl.other-targets dt { color: var(--sp-text-secondary); }
  dl.sensors dd, dl.other-targets dd { margin: 0; }
  dl.sensors .editor, dl.other-targets .threshold-editor { margin-top: 8px; }
  .tag { display: inline-flex; align-items: center; min-height: 24px; padding: 0 10px; margin: 0 4px 4px 0; border-radius: 12px; background: color-mix(in srgb, var(--sp-text) 7%, transparent); font-size: 12.5px; }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

  /* Expanders */
  .expander { display: block; border-radius: var(--ha-card-border-radius, 12px); background: var(--ha-card-background, var(--sp-card)); --expansion-panel-summary-padding: 4px 16px; --expansion-panel-content-padding: 0 16px 16px; }
  details.expander { border: 1px solid var(--divider-color, #e0e0e0); }
  details.expander > summary { display: flex; align-items: center; gap: 14px; padding: 12px 16px; cursor: pointer; min-height: 56px; }
  details.expander > summary::marker { content: ""; }
  .summary-text { display: flex; flex-direction: column; min-width: 0; }
  .summary-title { font-weight: 500; }
  .summary-sub { font-size: 13px; color: var(--sp-text-secondary); overflow-wrap: anywhere; hyphens: auto; }
  details.expander > .expander-body { padding: 0 16px 16px; }
  .expander-body { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .expander-body section { border: 0; padding: 0; margin: 0; background: transparent; border-radius: 0; }
  .expander-body section + section { border-top: 1px solid var(--divider-color, #e0e0e0); padding-top: 16px; }
  .expander-body h3 { font-size: 15px; font-weight: 500; margin: 0 0 8px; }

  /* Settings */
  .setrow { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 16px; align-items: center; padding: 14px 16px; }
  .setrow + .setrow { border-top: 1px solid var(--divider-color, #e0e0e0); }
  .setrow-h { font-size: 15px; }
  .setrow-d { font-size: 13px; color: var(--sp-text-secondary); overflow-wrap: anywhere; hyphens: auto; }
  .setrow-editor { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .setrow-editor label { margin: 4px 0; }
  /* After the button rules, which reset margins: header actions stay at the end when they wrap. */
  .pd .card-h > :not(h2, h3) { margin-inline-start: auto; }
  .setrow-editor .actions, .card-b .actions { margin-top: 4px; }
  .thr { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .thr label { margin: 0; }
  .field-suffix { display: flex; align-items: center; gap: 6px; }
  .field-suffix input { flex: 1; min-width: 0; }

  /* Care */
  .care-filters { display: flex; flex-direction: column; gap: 8px; padding: 4px 16px 8px; }
  .care-filters p { margin: 0; }
  .pd button.fchip { min-height: 32px; height: auto; padding: 4px 12px; border-radius: 8px; border: 1px solid var(--divider-color, #bdbdbd); background: var(--ha-card-background, var(--sp-card)); font-size: 13px; color: var(--sp-text); cursor: pointer; }
  .pd button.fchip[aria-pressed="true"] { background: color-mix(in srgb, var(--sp-primary) 14%, transparent); border-color: transparent; color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); font-weight: 500; }
  .care-form label { margin: 8px 0; }

  /* History */
  .history-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .history-bar .spacer { flex: 1; }
  .pd .seg { display: inline-flex; border: 1px solid var(--divider-color, #bdbdbd); border-radius: 8px; overflow: hidden; }
  .pd .seg button { min-height: 32px; height: auto; margin: 0; padding: 4px 12px; border: 0; border-radius: 0; background: transparent; font: inherit; font-size: 13px; color: var(--sp-text-secondary); cursor: pointer; white-space: nowrap; }
  .pd .seg button + button { border-inline-start: 1px solid var(--divider-color, #bdbdbd); }
  .pd .seg button[aria-pressed="true"] { background: color-mix(in srgb, var(--sp-primary) 14%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); font-weight: 500; }
  .pd .seg button:focus-visible { outline: 2px solid var(--sp-primary); outline-offset: -2px; }
  .history-message { min-height: 120px; display: grid; place-items: center; text-align: center; }
  .history-rate strong { font-weight: 500; }

  ha-alert { display: block; }
  .alert-fallback { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 8px; background: color-mix(in srgb, var(--sp-warning) 14%, transparent); }
  .alert-title { font-weight: 500; }

  @container plant (max-width: 700px) {
    .hero { grid-template-columns: auto minmax(0, 1fr); gap: 14px; padding: 14px; }
    .hero-name { font-size: 21px; }
    .hero-actions { grid-column: 1 / -1; flex-direction: row; }
    .hero-actions .btn { flex: 1; }
    .keyreads { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .kr { padding: 10px 14px; }
    .kr:nth-child(2n) { border-inline-end: 0; }
    .kr:nth-child(n+3) { border-top: 1px solid var(--divider-color, #e0e0e0); }
    .cols { grid-template-columns: minmax(0, 1fr); }
    .setrow { grid-template-columns: minmax(0, 1fr); }
    .setrow > .btn, .setrow > .row { justify-self: start; margin-inline-start: -12px; }
    .thr { grid-template-columns: minmax(0, 1fr); }
    .li { padding: 10px 12px; gap: 10px; }
    .kv { grid-template-columns: minmax(0, 1fr); gap: 2px 0; }
    .kv dd { margin-bottom: 8px; }
    dl.sensors, dl.other-targets { grid-template-columns: minmax(0, 1fr); gap: 2px 0; }
    dl.sensors dd, dl.other-targets dd { margin-bottom: 10px; }
  }
`, Ma = [
	"fertilize",
	"prune",
	"repot",
	"pests",
	"winter_protection",
	"custom"
], Na = {
	fertilize: "mdi:flask-outline",
	prune: "mdi:content-cut",
	repot: "mdi:pot-mix-outline",
	pests: "mdi:bug-outline",
	winter_protection: "mdi:snowflake",
	custom: "mdi:checkbox-marked-circle-outline"
}, Pa = {
	fertilize: "fertilizing",
	prune: "pruning",
	repot: "repotting",
	pests: "task",
	winter_protection: "task",
	custom: "task"
}, Fa = {
	temperature: "°C",
	soil_temperature: "°C",
	humidity: "%",
	moisture: "%",
	illuminance: "lx",
	conductivity: "µS/cm",
	co2: "ppm"
}, Ia = Object.keys(Fa), La = [
	24,
	48,
	72
], Ra = [
	"days",
	"weeks",
	"months",
	"years"
], za = 4e3, Ba = {
	fertilize: {
		kind: "interval",
		every: 4,
		unit: "weeks",
		growing_season_only: !0
	},
	prune: {
		kind: "yearly",
		start_month: 3,
		end_month: 4
	},
	repot: {
		kind: "interval",
		every: 2,
		unit: "years",
		growing_season_only: !1
	},
	pests: {
		kind: "interval",
		every: 2,
		unit: "weeks",
		growing_season_only: !1
	},
	winter_protection: {
		kind: "interval",
		every: 1,
		unit: "weeks",
		growing_season_only: !1
	},
	custom: {
		kind: "interval",
		every: 1,
		unit: "weeks",
		growing_season_only: !1
	}
};
function q(e, t) {
	return t.name ?? e.t(`care_task_type.${t.type}`);
}
function Va(e, t) {
	let n = [];
	for (let r = e;; r = r % 12 + 1) if (n.push(r), r === t || n.length === 12) return n;
}
function Ha(e, t, n = "long") {
	return new Intl.DateTimeFormat(e.language, {
		month: n,
		timeZone: "UTC"
	}).format(Date.UTC(2e3, t - 1, 1));
}
function Ua(e, t, n, r = "long") {
	return t === n ? Ha(e, t, r) : e.t("care_plan.month_range", {
		start: Ha(e, t, r),
		end: Ha(e, n, r)
	});
}
function Wa(e, t, n) {
	let [r, i, a] = t.split("-").map(Number);
	if (!r || !i || !a) return t;
	let o = t.slice(0, 4) === n.slice(0, 4);
	return new Intl.DateTimeFormat(e.language, {
		month: "short",
		day: "numeric",
		...o ? {} : { year: "numeric" },
		timeZone: "UTC"
	}).format(Date.UTC(r, i - 1, a));
}
function Ga(e, t, n, r) {
	if (t.kind === "reading") return e.t("care_plan.schedule_reading", {
		rule: Ka(e, t),
		source: Y(e, t.source, r)
	});
	if (t.kind === "yearly") return e.t("care_plan.schedule_yearly", { months: Ua(e, t.start_month, t.end_month) });
	let i = e.tn(t.every, `care_plan.every_${t.unit}_one`, `care_plan.every_${t.unit}_other`);
	return t.growing_season_only && n ? e.t("care_plan.schedule_growing_only", { every: i }) : i;
}
function Ka(e, t) {
	let n = J(e, t.value, t.unit);
	if (!("forecast" in t.source)) return e.t(`care_plan.condition_${t.condition}`, { value: n });
	let { reading: r, hours: i } = t.source.forecast, a = e.t(`care_plan.forecast_rule_${r}_${t.condition}`, { value: n });
	return i === 24 ? a : `${a} · ${Ja(e, i)}`;
}
function qa(e) {
	return Object.hasOwn(Fa, e);
}
function J(e, t, n) {
	return j(e, t, n ?? "");
}
function Y(e, t, n) {
	if ("role" in t) return qa(t.role) ? A(e, t.role) : t.role;
	let r = "forecast" in t ? t.forecast.entity_id : t.entity_id, i = n?.[r]?.attributes.friendly_name;
	return typeof i == "string" && i.trim() ? i : r;
}
function Ja(e, t) {
	return e.t(t === 72 ? "care_plan.forecast_window_72" : t === 48 ? "care_plan.forecast_window_48" : "care_plan.forecast_window_24");
}
function Ya(e) {
	let t = e?.attributes.supported_features;
	return !!e && e.entity_id.startsWith("weather.") && typeof t == "number" && Number.isInteger(t) && !!(t & 7);
}
function Xa(e, t) {
	let n = (n) => Y(e, { entity_id: n.entity_id }, t);
	return Object.values(t ?? {}).filter(Ya).sort((e, t) => n(e).localeCompare(n(t)) || e.entity_id.localeCompare(t.entity_id));
}
function Za(e, t) {
	let n = t?.[e]?.attributes.temperature_unit;
	return typeof n == "string" && no.has(n) ? n : null;
}
function Qa(e, t) {
	return e.mode === "reading" && !e.role && !e.entityId && !!e.forecast && !!e.weatherEntityId && !!t && Object.keys(t).length > 0 && !t[e.weatherEntityId];
}
function $a(e, t, n, r) {
	let i = e.care_tasks?.find((e) => e.id === n)?.schedule, a = t?.care.find((e) => e.task_id === n);
	if (i?.kind !== "reading" || !("forecast" in i.source) || !a || a.reading === null) return null;
	let o = i.source.forecast;
	return o.entity_id !== r.entity_id || o.hours !== r.hours || o.reading !== r.reading ? null : {
		value: a.reading,
		unit: a.unit ?? i.unit
	};
}
function eo(e, t, n) {
	if (t.kind !== "reading" || !("forecast" in t.source) || !e.forecast_until) return null;
	let r = Date.parse(e.forecast_until);
	return Number.isFinite(r) && r < n + (t.source.forecast.hours - 1) * 36e5 ? e.forecast_until : null;
}
function to(e, t, n) {
	let r = {
		weekday: "short",
		hour: "numeric",
		minute: "2-digit"
	}, i;
	try {
		i = new Intl.DateTimeFormat(e.language, {
			...r,
			...n ? { timeZone: n } : {}
		});
	} catch {
		i = new Intl.DateTimeFormat(e.language, r);
	}
	return e.t("care_plan.forecast_short", { time: i.format(Date.parse(t)) });
}
var no = /* @__PURE__ */ new Set([
	"°C",
	"°F",
	"K"
]);
function ro(e, t) {
	return e ? "role" in e ? e.role === "temperature" || e.role === "soil_temperature" : "forecast" in e || t?.[e.entity_id]?.attributes.device_class === "temperature" : !1;
}
function io(e, t) {
	let n = t === "°C" ? e : t === "°F" ? e * 9 / 5 + 32 : t === "K" ? e + 273.15 : null;
	return n === null ? null : Math.round(n * 10) / 10;
}
function ao(e) {
	let t = e.species?.snapshot, n = t?.provider === "openplantbook" ? t.min_temperature : null;
	return typeof n == "number" && Number.isFinite(n) ? n : null;
}
function oo(e, t, n) {
	let r = ao(e), i = Mo(t);
	return r === null || t.mode !== "reading" || t.condition !== "below" || !ro(i, n) || i && "forecast" in i && i.forecast.reading !== "low" ? null : io(r, t.readingUnit ?? "°C");
}
function so(e) {
	let t = e.roles;
	return Ia.filter((e) => {
		let n = t?.[e];
		return Array.isArray(n?.sources) && n.sources.length > 0;
	});
}
function co(e) {
	return !!e && e.entity_id.startsWith("sensor.") && e.state.trim() !== "" && Number.isFinite(Number(e.state));
}
function lo(e, t, n, r) {
	let i = t && "forecast" in t ? t.forecast : null, a = {
		role: t && "role" in t ? t.role : null,
		entityId: t && "entity_id" in t ? t.entity_id : null,
		forecast: i?.reading ?? null,
		weatherEntityId: i?.entity_id ?? null,
		readingUnit: n
	};
	i && (a.forecastHours = i.hours);
	let o = ao(r), s = o === null ? null : io(o, e.readingUnit ?? "°C"), c = o === null ? null : io(o, n);
	return s !== null && c !== null && s !== c && jo(e.value) === s && (a.value = String(c)), a;
}
function uo(e, t) {
	if ("role" in e) return qa(e.role) ? Fa[e.role] : null;
	if ("forecast" in e) return Za(e.forecast.entity_id, t);
	let n = t?.[e.entity_id]?.attributes.unit_of_measurement;
	return typeof n == "string" && n ? n : null;
}
function fo(e, t, n) {
	let r;
	try {
		r = new Intl.DateTimeFormat(e.language, {
			hour: "numeric",
			minute: "2-digit",
			...n ? { timeZone: n } : {}
		});
	} catch {
		r = new Intl.DateTimeFormat(e.language, {
			hour: "numeric",
			minute: "2-digit"
		});
	}
	return r.format(t);
}
function po(e, t, n, r, i, a) {
	let o = "forecast" in n.source, s = t.reading === null ? null : J(e, t.reading, t.unit ?? n.unit), c = s !== null && o ? e.t("care_plan.forecast_value", { value: s }) : s;
	switch (t.status) {
		case "due":
		case "overdue": return {
			tone: "care",
			icon: "mdi:alert-circle-outline",
			text: c ? e.t("care_plan.reading_due", { reading: c }) : e.t("care_plan.due_now")
		};
		case "waiting": {
			let t = n.reset_value ?? n.value, o = t === n.value && no.has(n.unit ?? "") ? e.t(n.condition === "below" ? "care_plan.reading_still_cold" : "care_plan.reading_still_warm") : e.t(n.condition === "below" ? "care_plan.reading_until_above" : "care_plan.reading_until_below", { value: J(e, t, n.unit) }), s = i ? ho(i, a) : null;
			return {
				tone: "done",
				icon: "mdi:check",
				text: s ? e.t("care_plan.reading_done_on", {
					date: Wa(e, s, r),
					until: o
				}) : e.t("care_plan.reading_waiting", { until: o })
			};
		}
		case "no_reading": return {
			tone: "later",
			icon: "mdi:help-circle-outline",
			text: e.t(o ? "care_plan.forecast_none" : "care_plan.reading_none")
		};
		default: {
			let r = t.due_at ? Date.parse(t.due_at) : NaN;
			if (Number.isFinite(r)) {
				let t = J(e, n.value, n.unit);
				return {
					tone: "later",
					icon: "mdi:timer-sand",
					text: e.t(n.condition === "below" ? "care_plan.reading_below_since" : "care_plan.reading_above_since", {
						value: t,
						since: fo(e, r - n.for_minutes * 6e4, a),
						time: fo(e, r, a)
					})
				};
			}
			return {
				tone: "later",
				icon: "mdi:gauge",
				text: c ? e.t("care_plan.reading_not_needed", { reading: c }) : e.t("care_plan.reading_not_needed_plain")
			};
		}
	}
}
function mo(e, t, n, r, i = {}) {
	if (n.kind === "reading") return po(e, t, n, r, i.lastDoneAt ?? null, i.timeZone);
	let a = (t) => t ? Wa(e, t, r) : "";
	switch (t.status) {
		case "overdue": return {
			tone: "overdue",
			icon: "mdi:alarm",
			text: e.tn(t.days ?? 0, "care_plan.overdue_one", "care_plan.overdue_other")
		};
		case "due": return n.kind === "yearly" && t.window_end ? {
			tone: "care",
			icon: "mdi:calendar-clock",
			text: e.t("care_plan.due_until", { date: a(t.window_end) })
		} : {
			tone: "care",
			icon: "mdi:calendar-clock",
			text: e.t("care_plan.due_today")
		};
		case "resting": return {
			tone: "resting",
			icon: "mdi:weather-night",
			text: e.t("care_plan.resting_until", { date: a(t.resume_on ?? t.next_due) })
		};
		case "done": return {
			tone: "done",
			icon: "mdi:check",
			text: e.t("care_plan.done_this_year")
		};
		case "skipped": return {
			tone: "later",
			icon: "mdi:skip-next",
			text: e.t("care_plan.skipped_this_year")
		};
		case "missed": return {
			tone: "later",
			icon: "mdi:calendar-remove-outline",
			text: e.t("care_plan.missed_this_year")
		};
		case "watching":
		case "waiting":
		case "no_reading": return {
			tone: "later",
			icon: "mdi:calendar-blank-outline",
			text: e.t("care_plan.reading_none")
		};
		case "scheduled": {
			if (n.kind === "yearly") return {
				tone: "later",
				icon: "mdi:calendar-blank-outline",
				text: e.t("care_plan.from_date", { date: a(t.next_due) })
			};
			let r = t.days ?? 0;
			return r === 1 ? {
				tone: "later",
				icon: "mdi:calendar-blank-outline",
				text: e.t("care_plan.tomorrow")
			} : r < 14 ? {
				tone: "later",
				icon: "mdi:calendar-blank-outline",
				text: e.tn(r, "care_plan.in_days_one", "care_plan.in_days_other")
			} : r < 60 ? {
				tone: "later",
				icon: "mdi:calendar-blank-outline",
				text: e.tn(Math.round(r / 7), "care_plan.in_weeks_one", "care_plan.in_weeks_other")
			} : {
				tone: "later",
				icon: "mdi:calendar-blank-outline",
				text: e.tn(Math.max(2, Math.round(r / 30.44)), "care_plan.in_months_one", "care_plan.in_months_other")
			};
		}
	}
}
function ho(e, t) {
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
function go(e, t) {
	let n = e.last_done_at ? ho(e.last_done_at, t) : null, r = e.baseline_done_on;
	return n ? r ? n > r ? n : r : n : r;
}
function _o(e, t) {
	if (t !== "task") return e.find((e) => Pa[e.type] === t);
}
function vo(e) {
	return new Set(e.filter((e) => e.type !== "custom").map((e) => e.type));
}
var yo = {
	mode: "interval",
	every: "4",
	unit: "weeks",
	growingSeasonOnly: !1,
	startMonth: null,
	endMonth: null,
	role: null,
	entityId: null,
	forecast: null,
	weatherEntityId: null,
	forecastHours: 24,
	condition: "below",
	value: "",
	readingUnit: null,
	forHours: "",
	resetValue: ""
};
function bo(e) {
	switch (e.kind) {
		case "interval": return {
			...yo,
			every: String(e.every),
			unit: e.unit,
			growingSeasonOnly: e.growing_season_only
		};
		case "yearly": return {
			...yo,
			mode: "yearly",
			startMonth: e.start_month,
			endMonth: e.end_month
		};
		case "reading": return {
			...yo,
			mode: "reading",
			role: "role" in e.source ? e.source.role : null,
			entityId: "entity_id" in e.source ? e.source.entity_id : null,
			..."forecast" in e.source ? {
				forecast: e.source.forecast.reading,
				weatherEntityId: e.source.forecast.entity_id,
				forecastHours: e.source.forecast.hours
			} : {},
			condition: e.condition,
			value: String(e.value),
			readingUnit: e.unit,
			forHours: e.for_minutes ? String(e.for_minutes / 60) : "",
			resetValue: e.reset_value === null ? "" : String(e.reset_value)
		};
	}
}
function xo(e, t, n, r) {
	let i = {
		type: e,
		name: "",
		instructions: "",
		lastDone: "",
		...bo(Ba[e])
	};
	if (e !== "winter_protection") return i;
	let a = {
		...i,
		mode: "reading",
		condition: "below"
	};
	if (t && so(t).includes("temperature")) return {
		...a,
		role: "temperature",
		readingUnit: Fa.temperature
	};
	let o = r ? Xa(r, n)[0] : void 0;
	return o ? {
		...a,
		forecast: "low",
		weatherEntityId: o.entity_id,
		readingUnit: Za(o.entity_id, n)
	} : a;
}
function So(e, t, n) {
	let r = xo("winter_protection", e, t, n);
	return !r.role && !r.weatherEntityId;
}
function Co(e, t, n) {
	let r = ao(e);
	if (r === null) return null;
	let i = xo("winter_protection", e, t, n);
	return {
		...i,
		value: String(io(r, i.readingUnit ?? "°C"))
	};
}
var wo = {
	fertilize: "fertilization",
	prune: "pruning",
	repot: "soil"
}, To = ["fertilize", "prune"];
function Eo(e, t) {
	let n = e.species?.snapshot, r = wo[t];
	if (!n || n.provider !== "openplantbook" || !r) return null;
	let i = n.care_text[r]?.trim();
	return i ? i.slice(0, za) : null;
}
function Do(e) {
	return To.flatMap((t) => {
		let n = Eo(e, t);
		return n ? [{
			type: t,
			text: n
		}] : [];
	});
}
function Oo(e, t, n, r, i) {
	return {
		...xo(e, n, r, i),
		instructions: t
	};
}
function ko(e) {
	return {
		type: e.type,
		name: e.name ?? "",
		instructions: e.instructions ?? "",
		lastDone: e.baseline_done_on ?? "",
		...bo(e.schedule)
	};
}
function Ao(e, t, n) {
	return e !== null && t !== null && e === t && n !== e ? {
		startMonth: e,
		endMonth: n
	} : {
		startMonth: n,
		endMonth: n
	};
}
function jo(e) {
	let t = e.trim().replace(",", ".");
	if (!/^[-+]?(\d+(\.\d{0,3})?|\.\d{1,3})$/.test(t)) return null;
	let n = Number(t);
	return Number.isFinite(n) ? n : null;
}
function Mo(e) {
	return e.role ? { role: e.role } : e.entityId ? { entity_id: e.entityId } : e.forecast && e.weatherEntityId ? { forecast: {
		entity_id: e.weatherEntityId,
		reading: e.forecast,
		hours: e.forecastHours
	} } : null;
}
function No(e) {
	let t = Mo(e);
	return !!t && "forecast" in t;
}
function Po(e) {
	let t = e.trim().replace(",", ".");
	if (!t) return 0;
	if (!/^\d+(\.\d+)?$/.test(t)) return null;
	let n = Number(t) * 60, r = Math.round(n);
	return Math.abs(n - r) > 1e-9 || r > 4320 ? null : r;
}
function Fo(e, t) {
	let n = {}, r = No(e);
	Mo(e) ? Qa(e, t) ? n.source = "care_plan.error_weather_missing" : r && !no.has(e.readingUnit ?? "") && (n.source = "care_plan.error_weather_unit") : n.source = "care_plan.error_source";
	let i = jo(e.value);
	if (i === null && (n.value = "care_plan.error_value"), !r && Po(e.forHours) === null && (n.forHours = "care_plan.error_for_hours"), e.resetValue.trim()) {
		let t = jo(e.resetValue);
		t === null ? n.resetValue = "care_plan.error_value" : i !== null && (e.condition === "below" ? t < i : t > i) && (n.resetValue = e.condition === "below" ? "care_plan.error_reset_below" : "care_plan.error_reset_above");
	}
	return n;
}
function Io(e, t) {
	if (e.mode === "reading") {
		let n = Mo(e), r = jo(e.value), i = No(e) ? 0 : Po(e.forHours);
		return !n || r === null || i === null || Object.keys(Fo(e, t)).length ? null : {
			kind: "reading",
			source: n,
			condition: e.condition,
			value: r,
			unit: e.readingUnit,
			for_minutes: i,
			reset_value: e.resetValue.trim() ? jo(e.resetValue) : null
		};
	}
	if (e.mode === "yearly") return e.startMonth !== null && e.endMonth !== null ? {
		kind: "yearly",
		start_month: e.startMonth,
		end_month: e.endMonth
	} : null;
	let n = Number(e.every.trim());
	return !/^\d+$/.test(e.every.trim()) || n < 1 || n > 999 ? null : {
		kind: "interval",
		every: n,
		unit: e.unit,
		growing_season_only: e.growingSeasonOnly
	};
}
function Lo(e, t, n) {
	let r = {}, i = e.name.trim();
	e.type === "custom" && !i ? r.name = "care_plan.error_name_required" : i.length > 60 && (r.name = "care_plan.error_name_length");
	let a = Io(e, n);
	e.mode === "reading" ? Object.assign(r, Fo(e, n)) : a || (r[e.mode === "yearly" ? "months" : "every"] = e.mode === "yearly" ? "care_plan.error_months" : "care_plan.error_every");
	let o = e.instructions.trim();
	o.length > 4e3 && (r.instructions = "care_plan.error_instructions_length");
	let s = e.mode === "reading" ? "" : e.lastDone.trim();
	return s && (!/^\d{4}-\d\d-\d\d$/.test(s) || !Number.isFinite(Date.parse(s))) ? r.lastDone = "care_plan.error_last_done" : s && s > t && (r.lastDone = "care_plan.error_last_done_future"), Object.keys(r).length || !a ? {
		input: null,
		errors: r
	} : {
		input: {
			task_type: e.type,
			name: i || null,
			schedule: a,
			instructions: o || null,
			baseline_done_on: s || null
		},
		errors: null
	};
}
function Ro(e) {
	return JSON.stringify(e, (e, t) => t && typeof t == "object" && !Array.isArray(t) ? Object.fromEntries(Object.entries(t).sort(([e], [t]) => e.localeCompare(t))) : t);
}
function zo(e, t) {
	let n = {};
	return t.name !== e.name && (n.name = t.name), Ro(t.schedule) !== Ro(e.schedule) && (n.schedule = t.schedule), t.instructions !== e.instructions && (n.instructions = t.instructions), t.baseline_done_on !== e.baseline_done_on && (n.baseline_done_on = t.baseline_done_on), n;
}
function Bo(e, t, n, r) {
	if (t.mode === "reading") return Vo(e, t, r);
	let i = Io(t);
	return i ? Ga(e, i, n) : e.t(t.mode === "yearly" ? "care_plan.summary_pick_months" : "care_plan.summary_enter_interval");
}
function Vo(e, t, n) {
	let r = Mo(t);
	if (!r) return e.t("care_plan.summary_pick_source");
	let i = "role" in r && qa(r.role) ? e.t(`care_plan.subject_${r.role}`) : "forecast" in r ? e.t(`care_plan.subject_forecast_${r.forecast.reading}`, { window: Ho(e, r.forecast.hours) }) : Y(e, r, n), a = jo(t.value), o = t.condition === "below";
	if (a === null) return e.t(o ? "care_plan.summary_below_enter" : "care_plan.summary_above_enter", { subject: i });
	let s = [e.t(o ? "care_plan.summary_below" : "care_plan.summary_above", {
		subject: i,
		value: J(e, a, t.readingUnit)
	})], c = "forecast" in r ? 0 : Po(t.forHours);
	c && s.push(e.tn(c / 60, "care_plan.summary_for_hours_one", "care_plan.summary_for_hours_other"));
	let l = t.resetValue.trim() ? jo(t.resetValue) : null;
	return l !== null && l !== a && s.push(e.t(o ? "care_plan.summary_again_above" : "care_plan.summary_again_below", { value: J(e, l, t.readingUnit) })), s.join(" · ");
}
function Ho(e, t) {
	return e.t(t === 72 ? "care_plan.forecast_window_long_72" : t === 48 ? "care_plan.forecast_window_long_48" : "care_plan.forecast_window_long_24");
}
var Uo = /* @__PURE__ */ new Set([
	"revision",
	"care_events",
	"care_tasks",
	"rest_period",
	"snoozed_until"
]);
function Wo(e, t) {
	return [.../* @__PURE__ */ new Set([...Object.keys(e), ...Object.keys(t)])].every((n) => Uo.has(n) || JSON.stringify(e[n]) === JSON.stringify(t[n]));
}
function Go(e, t) {
	return {
		due: `smart_plants:${e}:care_task:${t}:due`,
		next: `smart_plants:${e}:care_task:${t}:next`,
		careDue: `smart_plants:${e}:care_due`
	};
}
function Ko(e, t) {
	return t.name ?? e.t(`care_task_type.${t.type}`);
}
function qo(e) {
	return e?.care.filter((e) => e.is_due) ?? [];
}
function Jo(e, t, n = 2) {
	let r = t.slice(0, n).map((t) => Ko(e, t)).join(", ");
	return t.length > n ? e.t("care_plan.line_more", {
		names: r,
		count: t.length - n
	}) : r;
}
function Yo(e, t) {
	return !!e && Va(e.start_month, e.end_month).includes(t);
}
function Xo(e, t) {
	let n = Number(t.slice(0, 4)), r = Number(t.slice(5, 7)), i = e.end_month % 12 + 1;
	return `${i > r ? n : n + 1}-${String(i).padStart(2, "0")}-01`;
}
function Zo(e) {
	return e.filter((e) => e.schedule.kind === "interval" && e.schedule.growing_season_only);
}
function Qo(e, t, n, r) {
	let i = Yo(t, Number(r.slice(5, 7))), a = Zo(n).length;
	return {
		resting: i,
		season: i ? e.t("care_plan.resting_until", { date: Wa(e, Xo(t, r), r) }) : e.t("care_plan.growing_season"),
		tasks: a === 0 ? e.t("care_plan.rest_all_running") : i ? e.tn(a, "care_plan.rest_tasks_off_now_one", "care_plan.rest_tasks_off_now_other") : e.tn(a, "care_plan.rest_tasks_off_one", "care_plan.rest_tasks_off_other")
	};
}
function $o(e, t) {
	let n = t.filter((e) => e.schedule.kind === "interval").filter((t) => t.schedule.kind === "interval" && (t.schedule.growing_season_only || !e && t.type === "fertilize"));
	return {
		startMonth: e?.start_month ?? null,
		endMonth: e?.end_month ?? null,
		off: new Set(n.map((e) => e.id))
	};
}
function es(e) {
	return e.startMonth === null || e.endMonth === null ? {
		rest: null,
		error: "care_plan.rest_error_months"
	} : Va(e.startMonth, e.endMonth).length === 12 ? {
		rest: null,
		error: "care_plan.rest_error_whole_year"
	} : {
		rest: {
			start_month: e.startMonth,
			end_month: e.endMonth
		},
		error: null
	};
}
function ts(e, t) {
	return e.flatMap((e) => e.schedule.kind === "interval" && e.schedule.growing_season_only !== t.has(e.id) ? [{
		task: e,
		schedule: {
			...e.schedule,
			growing_season_only: t.has(e.id)
		}
	}] : []);
}
//#endregion
//#region src/views/care-plan.ts
function ns(e) {
	let { l: t, plant: n } = e, r = n.care_tasks ?? [], i = r.length >= 20;
	return b`<section class="sp-card care-plan" aria-labelledby="care-plan-heading">
    <div class="card-h"><h3 id="care-plan-heading">${t.t("care_plan.heading")}</h3>
      <span class="row care-plan-actions">${r.length ? b`<button type="button" class="btn text sm" ?disabled=${e.disabled || i} title=${i ? t.t("care_plan.full") : ""} @click=${e.onAdd}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("care_plan.add_task")}</button>` : x}
        <ha-dropdown @wa-select=${(t) => {
		t.detail.item.value === "rest" && e.onRest();
	}}>
          <button slot="trigger" type="button" class="icon-btn" ?disabled=${e.disabled} aria-label=${t.t("care_plan.plan_menu")}><ha-icon aria-hidden="true" icon="mdi:dots-vertical"></ha-icon></button>
          <ha-dropdown-item value="rest" ?disabled=${e.disabled}>${t.t(n.rest_period ? "care_plan.rest_edit" : "care_plan.rest_set")}<ha-icon slot="icon" icon="mdi:weather-night"></ha-icon></ha-dropdown-item>
        </ha-dropdown></span></div>
    ${n.rest_period ? rs(e, n.rest_period) : x}
    ${r.length ? b`<ul class="list task-list" aria-label=${t.t("care_plan.tasks_label")}>${r.map((t) => is(e, t))}</ul>` : b`<div class="card-b"><div class="empty-box"><span>${t.t("care_plan.empty")}</span>
          <button type="button" class="btn tonal sm" ?disabled=${e.disabled} @click=${e.onAdd}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("care_plan.add_task")}</button></div>
          ${Do(n).length || ao(n) !== null ? b`<p class="small muted care-note"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${t.t("care_plan.empty_suggestions")}</span></p>` : x}</div>`}
  </section>`;
}
function rs(e, t) {
	let { l: n } = e, r = Number(e.today.slice(5, 7)), i = Qo(n, t, e.plant.care_tasks ?? [], e.today), a = Ua(n, t.start_month, t.end_month, "short");
	return b`<div class="restline">
    <ha-icon aria-hidden="true" icon="mdi:weather-night"></ha-icon>
    <div class="restline-main"><div class="restline-top"><span class="restline-title">${n.t("care_plan.rest_period")}</span>
        <span class="months" role="img" aria-label=${n.t("care_plan.rest_months_label", { months: Ua(n, t.start_month, t.end_month) })}>${Array.from({ length: 12 }, (e, t) => t + 1).map((e) => b`<i class="${Yo(t, e) ? "on" : ""} ${e === r ? "now" : ""}">${Ha(n, e, "narrow")}</i>`)}</span>
        <span aria-hidden="true">${a}</span></div>
      <div class="restline-text"><b>${i.season}</b> · ${i.tasks}</div></div>
    <button type="button" class="btn text sm" ?disabled=${e.disabled} aria-label=${n.t("care_plan.rest_edit")} @click=${e.onRest}>${n.t("care_plan.edit")}</button>
  </div>`;
}
function is(e, t) {
	let { l: n } = e, r = q(n, t), i = e.overview?.care.find((e) => e.task_id === t.id), a = i ? mo(n, i, t.schedule, e.today, {
		lastDoneAt: t.last_done_at,
		timeZone: e.timeZone
	}) : null, o = go(t, e.timeZone), s = i ? eo(i, t.schedule, Date.now()) : null, c = e.disabled || e.pending.has(t.id), l = [
		[
			"mark_done",
			"care_plan.menu_mark_done",
			"mdi:check-circle-outline"
		],
		...t.schedule.kind === "reading" ? [] : [[
			"skip",
			"care_plan.menu_skip",
			"mdi:skip-next-outline"
		]],
		[
			"edit",
			"care_plan.menu_edit",
			"mdi:pencil-outline"
		],
		[
			"automate",
			"care_plan.menu_automate",
			"mdi:robot-outline"
		],
		[
			"delete",
			"care_plan.menu_delete",
			"mdi:delete-outline"
		]
	];
	return b`<li class="li task">
    <span class="ic tonal" aria-hidden="true"><ha-icon .icon=${Na[t.type]}></ha-icon></span>
    <span class="li-main"><span class="li-title">${r}</span>
      <span class="li-sub">${Ga(n, t.schedule, e.plant.rest_period ?? null, e.states)} · ${o ? n.t("care_plan.last_done", { date: Wa(n, o, e.today) }) : n.t("care_plan.never_done")}${s ? b`<br>${to(n, s, e.timeZone)}` : x}</span></span>
    <span class="task-side">${a ? b`<span class="cchip tone-${a.tone}"><ha-icon aria-hidden="true" .icon=${a.icon}></ha-icon><span>${a.text}</span></span>` : x}
      ${i?.is_due ? b`<button type="button" class="btn tonal sm" ?disabled=${c} aria-label=${n.t("care_plan.done_label", { name: r })} @click=${() => e.onDone(t)}><ha-icon aria-hidden="true" icon="mdi:check"></ha-icon>${n.t("care_plan.done")}</button>` : x}</span>
    <ha-dropdown class="task-menu" @wa-select=${(n) => e.onAction(t, n.detail.item.value)}>
      <button slot="trigger" type="button" class="icon-btn" ?disabled=${c} aria-label=${n.t("care_plan.task_menu", { name: r })}><ha-icon aria-hidden="true" icon="mdi:dots-vertical"></ha-icon></button>
      ${l.map(([e, t, r]) => b`<ha-dropdown-item value=${e} ?disabled=${c}>${n.t(t)}<ha-icon slot="icon" icon=${r}></ha-icon></ha-dropdown-item>`)}
    </ha-dropdown>
  </li>`;
}
function as(e, t) {
	return e.t(t.taskId ? "care_plan.edit_title" : "care_plan.add_title");
}
function os(e) {
	return e.state.step === 1 ? ss(e) : hs(e);
}
function ss(e) {
	let { l: t, plant: n } = e, r = vo(n.care_tasks ?? []), i = Do(n), a = ao(n), o = a === null ? null : Co(n, e.states, t), s = n.species?.snapshot.latin_name ?? n.species?.snapshot.common_name ?? "";
	return b`<p class="muted">${t.t("care_plan.add_intro")}</p>
    ${i.length || o ? b`<section class="suggestions" aria-labelledby="suggestions-heading">
      <h4 id="suggestions-heading"><ha-icon aria-hidden="true" icon="mdi:auto-fix"></ha-icon><span>${t.t("care_plan.suggestions_for")} <i>${s}</i></span></h4>
      ${i.map(({ type: n, text: i }) => {
		let a = t.t(`care_task_type.${n}`), o = i.length > cs, s = e.state.expanded === n;
		return b`<div class="suggestion">
          <div class="suggestion-main"><span class="suggestion-source"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon>${t.t("care_plan.suggestion_source", { topic: t.t(n === "fertilize" ? "care_plan.note_fertilization" : "care_plan.note_pruning") })}</span>
            <q class=${o && !s ? "clamped" : ""} id="suggestion-${n}">${i}</q>
            ${o ? b`<button type="button" class="linkbtn" aria-expanded=${s ? "true" : "false"} aria-controls="suggestion-${n}" @click=${() => e.onExpand(s ? null : n)}>${t.t(s ? "care_plan.show_less" : "care_plan.show_more")}</button>` : x}</div>
          ${r.has(n) ? b`<span class="small muted">${t.t("care_plan.preset_exists")}</span>` : b`<button type="button" class="btn tonal sm" ?disabled=${e.busy} @click=${() => e.onSuggestion(n, i)}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("care_plan.suggestion_add", { name: a })}</button>`}
        </div>`;
	})}
      ${o && a !== null ? b`<div class="suggestion">
          <div class="suggestion-main"><span class="suggestion-source"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon>${t.t("care_plan.suggestion_source", { topic: t.t("care_plan.note_min_temperature") })}</span>
            <span class="suggestion-value">${t.t("care_plan.grows_above", { value: J(t, a, "°C") })}</span></div>
          ${r.has("winter_protection") ? b`<span class="small muted">${t.t("care_plan.preset_exists")}</span>` : b`<button type="button" class="btn tonal sm" ?disabled=${e.busy} @click=${() => e.onDraft(o)}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("care_plan.suggestion_add_winter")}</button>`}
        </div>` : x}</section>
      <span class="field-label">${t.t("care_plan.from_scratch")}</span>` : x}
    <div class="presets" role="list">${Ma.map((i) => {
		let a = r.has(i), o = !a && i === "winter_protection" && So(n, e.states, t), s = a ? t.t("care_plan.preset_exists") : i === "custom" ? t.t("care_plan.preset_custom") : i === "winter_protection" ? t.t("care_plan.preset_winter") : Ga(t, ps(xo(i)), n.rest_period ?? null);
		return b`<div role="listitem"><button type="button" class="preset" ?disabled=${a || e.busy} @click=${() => e.onPreset(i)}>
        <span class="ic tonal" aria-hidden="true"><ha-icon .icon=${Na[i]}></ha-icon></span>
        <span class="preset-text"><span class="preset-name">${t.t(`care_task_type.${i}`)}</span><span class="preset-d">${s}</span>
          ${o ? b`<span class="preset-hint">${t.t("care_plan.preset_winter_needs_source")}</span>` : x}</span></button></div>`;
	})}</div>
    <div class="actions dialog-actions"><span class="spacer"></span><button type="button" @click=${e.onCancel}>${t.t("common.cancel")}</button></div>`;
}
var cs = 160;
function ls(e, t) {
	let { l: n, plant: r, state: i } = e, a = i.draft, o = i.errors, s = e.states, c = so(r);
	a.role && qa(a.role) && !c.includes(a.role) && c.push(a.role);
	let l = No(a) ? a.forecast : null, u = !a.role && !l && (!!a.entityId || !!i.otherSensor), d = a.role ? `role:${a.role}` : l ? `forecast:${l}` : u ? "other" : "", f = Xa(n, s), p = f.length > 0 || !!l, m = Qa(a, s), h = a.forecastHours, g = (t) => {
		let o = n.t(`care_plan.forecast_row_${t}`, { window: Ja(n, h) }), s = a.weatherEntityId ? $a(r, e.overview, i.taskId, {
			entity_id: a.weatherEntityId,
			reading: t,
			hours: h
		}) : null;
		return s ? n.t("care_plan.reading_role_value", {
			role: o,
			value: J(n, s.value, s.unit)
		}) : o;
	}, _ = f.some((e) => e.entity_id === a.weatherEntityId), ee = f.length === 1 && (_ || !l) ? n.t("care_plan.reading_group_forecast_entity", { name: Y(n, { entity_id: f[0].entity_id }, s) }) : n.t("care_plan.reading_group_forecast"), te = (t, n) => {
		n && (e.onEditor({ otherSensor: !1 }), e.onChange(lo(a, { forecast: {
			entity_id: n,
			reading: t,
			hours: h
		} }, Za(n, s), r)));
	}, v = (t) => {
		let r = e.overview?.roles[t]?.value;
		return typeof r == "number" ? n.t("care_plan.reading_role_value", {
			role: A(n, t),
			value: J(n, r, Fa[t])
		}) : A(n, t);
	}, ne = (t) => {
		if (t === "other") {
			e.onEditor({ otherSensor: !0 }), e.onChange(lo(a, null, null, r));
			return;
		}
		if (t === "forecast:low" || t === "forecast:high") {
			let e = a.weatherEntityId && f.some((e) => e.entity_id === a.weatherEntityId) ? a.weatherEntityId : null;
			te(t === "forecast:low" ? "low" : "high", e ?? f[0]?.entity_id ?? a.weatherEntityId);
			return;
		}
		let n = t.slice(5);
		qa(n) && (e.onEditor({ otherSensor: !1 }), e.onChange(lo(a, { role: n }, Fa[n], r)));
	}, re = (t) => {
		t && e.onChange(lo(a, { entity_id: t }, uo({ entity_id: t }, s), r));
	}, ie = a.readingUnit ?? "", y = oo(r, a, s), ae = jo(a.value);
	return b`<label>${n.t("care_plan.reading")}<select aria-invalid=${o.source ? "true" : "false"} aria-describedby=${o.source ? "task-source-error" : x} @change=${(e) => ne(e.target.value)}>
      <option value="" disabled ?selected=${d === ""}>${n.t("care_plan.reading_choose")}</option>
      ${c.length ? b`<optgroup label=${n.t("care_plan.reading_group_plant")}>${c.map((e) => b`<option value="role:${e}" ?selected=${d === `role:${e}`}>${v(e)}</option>`)}</optgroup>` : x}
      <optgroup label=${n.t("care_plan.reading_group_other")}><option value="other" ?selected=${d === "other"}>${n.t("care_plan.reading_other")}</option></optgroup>
      ${p ? b`<optgroup label=${ee}>${["low", "high"].map((e) => b`<option value="forecast:${e}" ?selected=${d === `forecast:${e}`}>${g(e)}</option>`)}</optgroup>` : x}</select></label>
    ${u ? ds(e, re) : x}
    ${l && (f.length > 1 || !_) ? us(e, f, m, (e) => te(l, e)) : x}
    ${o.source === "care_plan.error_weather_missing" ? x : ms("task-source-error", t("source"))}
    <div class="grid2">
      <label>${n.t("care_plan.due_when")}<select @change=${(t) => e.onChange({ condition: t.target.value === "above" ? "above" : "below" })}>
        <option value="below" ?selected=${a.condition === "below"}>${n.t("care_plan.below")}</option>
        <option value="above" ?selected=${a.condition === "above"}>${n.t("care_plan.above")}</option></select></label>
      <label>${n.t("care_plan.value")}<span class="suffix-field"><input type="text" inputmode="decimal" required .value=${a.value} placeholder=${n.t("care_plan.value_placeholder")}
          aria-invalid=${o.value ? "true" : "false"} aria-describedby=${o.value ? "task-value-error" : x}
          @input=${(t) => e.onChange({ value: t.target.value })}>${ie ? b`<span class="suffix">${ie}</span>` : x}</span></label></div>
    ${ms("task-value-error", t("value"))}
    ${y === null ? x : ae === y ? b`<div class="note-hint small"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${n.t("care_plan.min_temp_applied")}</span></div>` : b`<div class="note-hint small"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${n.t("care_plan.min_temp_hint", { value: J(n, y, a.readingUnit ?? "°C") })}</span>
          <button type="button" class="btn text sm" ?disabled=${e.busy} aria-label=${n.t("care_plan.min_temp_use_label", { value: J(n, y, a.readingUnit ?? "°C") })} @click=${() => e.onChange({ value: String(y) })}>${n.t("care_plan.min_temp_use")}</button></div>`}`;
}
function us(e, t, n, r) {
	let { l: i } = e, a = e.state.draft, o = e.states, s = a.weatherEntityId, c = !!s && t.some((e) => e.entity_id === s);
	return b`<label>${i.t("care_plan.weather_entity")}<select aria-invalid=${n ? "true" : "false"} aria-describedby=${n ? "task-weather-error" : x} @change=${(e) => r(e.target.value)}>
      ${s && !c ? b`<option value="" disabled selected>${n ? s : Y(i, { entity_id: s }, o)}</option>` : x}
      ${t.map((e) => b`<option value=${e.entity_id} ?selected=${e.entity_id === s}>${Y(i, { entity_id: e.entity_id }, o)}</option>`)}</select></label>
    ${n ? ms("task-weather-error", i.t("care_plan.error_weather_missing")) : x}`;
}
function ds(e, t) {
	let { l: n } = e, r = e.state.draft, i = e.states, a = r.entityId ? b`<span class="small muted chosen-sensor">${Y(n, { entity_id: r.entityId }, i)} · <code>${r.entityId}</code></span>` : x;
	if (G("ha-entity-picker") && e.hass) return b`<ha-entity-picker .hass=${e.hass} .label=${n.t("care_plan.reading_sensor")} .placeholder=${n.t("wizard.search_sensors")} .value=${r.entityId ?? ""} .includeDomains=${["sensor"]}
      .entityFilter=${(e) => co(e)} @value-changed=${(e) => t(e.detail.value ?? "")}></ha-entity-picker>${a}`;
	let o = Object.values(i ?? {}).filter(co).sort((e, t) => Y(n, { entity_id: e.entity_id }, i).localeCompare(Y(n, { entity_id: t.entity_id }, i)));
	return b`<label>${n.t("care_plan.reading_sensor")}<select @change=${(e) => t(e.target.value)}>
    <option value="" disabled ?selected=${!r.entityId}>${o.length ? n.t("care_plan.reading_choose") : n.t("care_plan.reading_no_sensors")}</option>
    ${o.map((e) => b`<option value=${e.entity_id} ?selected=${e.entity_id === r.entityId}>${Y(n, { entity_id: e.entity_id }, i)}</option>`)}</select></label>`;
}
function fs(e, t) {
	let { l: n } = e, r = e.state.draft, i = e.state.errors, a = r.readingUnit ?? "", o = (e, t, n) => t ? `${e} ${n}` : e, s = No(r);
	return b`<div id="task-more"><div class="grid2">
      ${s ? b`<label>${n.t("care_plan.look_ahead")}<select aria-describedby="task-ahead-hint" @change=${(t) => e.onChange({ forecastHours: Number(t.target.value) })}>
          ${La.map((e) => b`<option value=${e} ?selected=${r.forecastHours === e}>${n.t(`care_plan.look_ahead_${e}`)}</option>`)}</select></label>` : b`<label>${n.t("care_plan.for_hours")}<span class="suffix-field"><input type="number" inputmode="decimal" min="0" max=${72} step="any" .value=${r.forHours}
          aria-invalid=${i.forHours ? "true" : "false"} aria-describedby=${o("task-for-hint", !!i.forHours, "task-for-error")}
          @input=${(t) => e.onChange({ forHours: t.target.value })}><span class="suffix">${n.t("care_plan.hours")}</span></span></label>`}
      <label>${n.t(r.condition === "below" ? "care_plan.reset_after_above" : "care_plan.reset_after_below")}<span class="suffix-field"><input type="text" inputmode="decimal" .value=${r.resetValue} placeholder=${r.value.trim()}
          aria-invalid=${i.resetValue ? "true" : "false"} aria-describedby=${o("task-reset-hint", !!i.resetValue, "task-reset-error")}
          @input=${(t) => e.onChange({ resetValue: t.target.value })}>${a ? b`<span class="suffix">${a}</span>` : x}</span></label></div>
    ${s ? x : ms("task-for-error", t("forHours"))}${ms("task-reset-error", t("resetValue"))}
    ${s ? b`<span class="small muted" id="task-ahead-hint">${n.t("care_plan.look_ahead_hint")}</span>` : b`<span class="small muted" id="task-for-hint">${n.t("care_plan.for_hours_hint")}</span>`}
    <span class="small muted" id="task-reset-hint">${n.t("care_plan.reset_hint")}</span></div>`;
}
function ps(e) {
	return e.mode === "yearly" ? {
		kind: "yearly",
		start_month: e.startMonth ?? 1,
		end_month: e.endMonth ?? 1
	} : {
		kind: "interval",
		every: Number(e.every),
		unit: e.unit,
		growing_season_only: e.growingSeasonOnly
	};
}
function ms(e, t) {
	return t ? b`<span class="error-text small" id=${e}>${t}</span>` : x;
}
function hs(e) {
	let { l: t, plant: n, state: r } = e, i = r.draft, a = r.errors, o = (e) => {
		let n = a[e];
		return n ? t.t(n) : void 0;
	}, s = t.t(`care_task_type.${i.type}`), c = i.type === "custom", l = n.rest_period ?? null, u = i.startMonth !== null && i.endMonth !== null ? new Set(Va(i.startMonth, i.endMonth)) : /* @__PURE__ */ new Set(), d = (e) => e.target.value, f = Eo(n, i.type), p = i.mode === "reading", m = r.moreOpen || !!a.lastDone || !!a.forHours || !!a.resetValue;
	return b`${r.error ? b`<p class="error" role="alert">${r.error}</p>` : x}
    <div class="task-summary"><ha-icon aria-hidden="true" .icon=${Na[i.type]}></ha-icon>
      <span><span class="summary-name">${i.name.trim() || s}</span> · ${Bo(t, i, l, e.states)}</span></div>
    <label>${c ? t.t("care_plan.name") : t.t("care_plan.name_optional")}
      <input type="text" maxlength=${60} .value=${i.name} placeholder=${c ? "" : s} ?required=${c}
        aria-invalid=${a.name ? "true" : "false"} aria-describedby=${a.name ? "task-name-error" : x}
        @input=${(t) => e.onChange({ name: d(t) })}></label>
    ${ms("task-name-error", o("name"))}
    <div class="field-group"><span class="field-label" id="task-mode-label">${t.t("care_plan.when_due")}</span>
      <div class="seg" role="group" aria-labelledby="task-mode-label">
        <button type="button" aria-pressed=${i.mode === "interval" ? "true" : "false"} @click=${() => e.onChange({ mode: "interval" })}>${t.t("care_plan.mode_interval")}</button>
        <button type="button" aria-pressed=${i.mode === "yearly" ? "true" : "false"} @click=${() => e.onChange({ mode: "yearly" })}>${t.t("care_plan.mode_yearly")}</button>
        <button type="button" aria-pressed=${p ? "true" : "false"} @click=${() => e.onChange({ mode: "reading" })}>${t.t("care_plan.mode_reading")}</button></div></div>
    ${p ? ls(e, o) : i.mode === "interval" ? b`<div class="grid2">
        <label>${t.t("care_plan.every")}<input type="number" inputmode="numeric" min="1" max="999" step="1" .value=${i.every}
          aria-invalid=${a.every ? "true" : "false"} aria-describedby=${a.every ? "task-every-error" : x}
          @input=${(t) => e.onChange({ every: d(t) })}></label>
        <label>${t.t("care_plan.unit")}<select .value=${i.unit} @change=${(t) => e.onChange({ unit: t.target.value })}>
          ${Ra.map((e) => b`<option value=${e} ?selected=${e === i.unit}>${t.t(`care_plan.unit_${e}`)}</option>`)}</select></label></div>
      ${ms("task-every-error", o("every"))}
      ${l ? b`<div><label class="check"><input type="checkbox" aria-describedby="task-growing-hint" .checked=${i.growingSeasonOnly} @change=${(t) => e.onChange({ growingSeasonOnly: t.target.checked })}>
        <span>${t.t("care_plan.growing_only")}</span></label>
        <span class="small muted growing-hint" id="task-growing-hint">${t.t("care_plan.growing_only_hint", { months: Ua(t, l.start_month, l.end_month) })}</span></div>` : x}` : b`<div class="field-group"><span class="field-label" id="task-months-label">${t.t("care_plan.months")}</span>
        <div class="monthpick" role="group" aria-labelledby="task-months-label" aria-describedby=${a.months ? "task-months-error task-months-hint" : "task-months-hint"}>
          ${Array.from({ length: 12 }, (e, t) => t + 1).map((n) => b`<button type="button" aria-pressed=${u.has(n) ? "true" : "false"} aria-label=${Ha(t, n)} @click=${() => e.onMonth(n)}>${Ha(t, n, "short")}</button>`)}</div>
        <span class="small muted" id="task-months-hint">${t.t("care_plan.months_hint")}</span>
        ${ms("task-months-error", o("months"))}</div>`}
    <label>${t.t("care_plan.instructions")}<textarea rows=${i.instructions.length > cs ? 6 : 3} maxlength=${za} .value=${i.instructions} placeholder=${t.t("care_plan.instructions_placeholder")}
      aria-invalid=${a.instructions ? "true" : "false"} aria-describedby=${a.instructions ? "task-instructions-error" : x}
      @input=${(t) => e.onChange({ instructions: t.target.value })}></textarea></label>
    ${ms("task-instructions-error", o("instructions"))}
    ${f && !i.instructions.trim() ? b`<div class="note-hint small"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${t.t("care_plan.note_hint")}</span>
        <button type="button" class="btn text sm" ?disabled=${e.busy} @click=${() => e.onChange({ instructions: f })}>${t.t("care_plan.note_use")}</button></div>` : f && i.instructions === f ? b`<div class="note-hint small"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${t.t("care_plan.note_applied")}</span></div>` : x}
    <div class="more-options">
      <button type="button" class="btn text sm" aria-expanded=${m ? "true" : "false"} aria-controls="task-more" @click=${e.onToggleMore}>
        <ha-icon aria-hidden="true" icon=${m ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>${t.t("care_plan.more_options")}${p && !m ? b`<span class="more-hint">&nbsp;· ${t.t(No(i) ? "care_plan.more_options_forecast" : "care_plan.more_options_reading")}</span>` : x}</button>
      ${m && p ? fs(e, o) : m ? b`<div id="task-more"><label>${t.t("care_plan.last_done_field")}
        <input type="date" max=${e.today} .value=${i.lastDone} aria-invalid=${a.lastDone ? "true" : "false"} aria-describedby="task-last-done-hint${a.lastDone ? " task-last-done-error" : ""}"
          @input=${(t) => e.onChange({ lastDone: d(t) })}></label>
        <span class="small muted" id="task-last-done-hint">${t.t("care_plan.last_done_hint")}</span>${ms("task-last-done-error", o("lastDone"))}</div>` : x}
    </div>
    <div class="actions dialog-actions">
      ${r.taskId ? b`<button type="button" class="danger-text" ?disabled=${e.busy} @click=${e.onDelete}>${t.t("care_plan.delete")}</button><span class="spacer"></span>` : b`<button type="button" ?disabled=${e.busy} @click=${e.onBack}>${t.t("care_plan.back")}</button><span class="spacer"></span>`}
      <button type="button" ?disabled=${e.busy} @click=${e.onCancel}>${t.t("common.cancel")}</button>
      <button type="button" class="primary" ?disabled=${e.busy || Qa(i, e.states)} @click=${e.onSave}>${t.t(r.taskId ? "care_plan.save" : "care_plan.add_task")}</button></div>`;
}
function gs(e) {
	let { l: t, plant: n, draft: r } = e, i = (n.care_tasks ?? []).filter((e) => e.schedule.kind === "interval"), a = r.startMonth !== null && r.endMonth !== null ? new Set(Va(r.startMonth, r.endMonth)) : /* @__PURE__ */ new Set();
	return b`<p class="muted">${t.t("care_plan.rest_intro")}</p>
    <p class="small muted">${t.t("care_plan.rest_watering")}</p>
    <div class="field-group"><span class="field-label" id="rest-months-label">${t.t("care_plan.rest_months")}</span>
      <div class="monthpick" role="group" aria-labelledby="rest-months-label" aria-describedby=${e.error ? "rest-error rest-months-hint" : "rest-months-hint"}>
        ${Array.from({ length: 12 }, (e, t) => t + 1).map((n) => b`<button type="button" aria-pressed=${a.has(n) ? "true" : "false"} aria-label=${Ha(t, n)} @click=${() => e.onMonth(n)}>${Ha(t, n, "short")}</button>`)}</div>
      <span class="small muted" id="rest-months-hint">${t.t("care_plan.months_hint")}</span>
      ${e.error ? b`<span class="error-text small" id="rest-error">${e.error}</span>` : x}</div>
    <fieldset class="rest-tasks"><legend class="field-label">${t.t("care_plan.rest_off_heading")}</legend>
      ${i.length ? i.map((n) => b`<div><label class="check"><input type="checkbox" .checked=${r.off.has(n.id)} aria-describedby="rest-task-${n.id}"
          @change=${(t) => e.onToggle(n.id, t.target.checked)}><span>${q(t, n)}</span></label>
          <span class="small muted growing-hint" id="rest-task-${n.id}">${Ga(t, n.schedule, null)}</span></div>`) : b`<p class="small muted">${t.t("care_plan.rest_no_repeating")}</p>`}
      <p class="small muted">${t.t("care_plan.rest_yearly_note")}</p></fieldset>
    <div class="actions dialog-actions">
      ${n.rest_period ? b`<button type="button" class="danger-text" ?disabled=${e.busy} @click=${e.onRemove}>${t.t("care_plan.rest_remove")}</button>` : x}<span class="spacer"></span>
      <button type="button" ?disabled=${e.busy} @click=${e.onCancel}>${t.t("common.cancel")}</button>
      <button type="button" class="primary" ?disabled=${e.busy} @click=${e.onSave}>${t.t("care_plan.save")}</button></div>`;
}
function _s(e) {
	let { l: t } = e;
	return b`<p class="muted">${t.t("care_plan.automate_intro")}</p>
    <ul class="list automate-list">${e.rows.map((n) => b`<li class="li"><span class="ic tonal" aria-hidden="true"><ha-icon .icon=${n.icon}></ha-icon></span>
      <span class="li-main"><span class="li-title">${n.entityId ? b`<code>${n.entityId}</code>` : t.t("care_plan.automate_missing")}</span>
        <span class="li-sub">${n.description}${n.note ? b`<br>${n.note}` : x}</span></span>
      ${n.entityId ? b`<button type="button" class="icon-btn" aria-label=${t.t("care_plan.copy", { entity: n.entityId })} @click=${() => e.onCopy(n.entityId)}><ha-icon aria-hidden="true" icon="mdi:content-copy"></ha-icon></button>` : b`<span></span>`}</li>`)}</ul>
    <p class="small automate-hint"><ha-icon aria-hidden="true" icon="mdi:lightbulb-outline"></ha-icon><span>${t.t("care_plan.automate_action_before")}<code>smart_plants.log_care</code>${t.t("care_plan.automate_action_after")}</span></p>
    <div class="actions dialog-actions"><span class="spacer"></span><button type="button" @click=${e.onClose}>${t.t("care_plan.close")}</button>
      <button type="button" class="primary" @click=${e.onOpenEditor}>${t.t("care_plan.open_automation_editor")}</button></div>`;
}
var vs = o`
  .care-plan .task { grid-template-columns: 40px minmax(0, 1fr) auto 40px; }
  .care-plan .task-side { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
  .cchip { display: inline-flex; align-items: center; gap: 4px; min-height: 26px; padding: 2px 10px 2px 7px; border-radius: 13px; font-size: 13px; font-weight: 500; line-height: 1.3; max-width: 100%; }
  .cchip ha-icon { --mdc-icon-size: 16px; }
  .cchip.tone-care { background: color-mix(in srgb, var(--sp-care) 15%, transparent); color: color-mix(in srgb, var(--sp-care) 55%, var(--sp-text)); }
  .cchip.tone-overdue { background: color-mix(in srgb, var(--sp-error) 15%, transparent); color: color-mix(in srgb, var(--sp-error) 55%, var(--sp-text)); }
  .cchip.tone-later, .cchip.tone-resting { background: color-mix(in srgb, var(--sp-text) 7%, transparent); color: color-mix(in srgb, var(--sp-text-secondary) 55%, var(--sp-text)); }
  .cchip.tone-done { background: color-mix(in srgb, var(--sp-success) 15%, transparent); color: color-mix(in srgb, var(--sp-success) 55%, var(--sp-text)); }
  .care-note { display: flex; align-items: center; gap: 6px; }
  .care-plan-actions { gap: 0; }
  .restline { display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; gap: 4px 10px; align-items: start; padding: 0 8px 12px 16px; font-size: 13px; color: var(--sp-text-secondary); }
  .restline > ha-icon { --mdc-icon-size: 18px; margin-top: 2px; }
  .restline-top { display: flex; align-items: center; gap: 4px 10px; flex-wrap: wrap; }
  .restline-title, .restline-text b { font-weight: 500; color: var(--sp-text); }
  .restline-text { margin-top: 4px; }
  .months { display: inline-flex; gap: 2px; }
  .months i { font-style: normal; width: 18px; height: 18px; border-radius: 4px; display: grid; place-items: center; font-size: 10.5px; background: color-mix(in srgb, var(--sp-text) 7%, transparent); color: color-mix(in srgb, var(--sp-text-secondary) 55%, var(--sp-text)); }
  .months i.on { background: color-mix(in srgb, var(--sp-care) 18%, transparent); color: color-mix(in srgb, var(--sp-care) 55%, var(--sp-text)); font-weight: 500; }
  .months i.now { box-shadow: inset 0 0 0 1.5px var(--sp-text-secondary); }
  .pd .care-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .care-kind { display: flex; flex-direction: column; gap: 2px; margin: 8px 0; }
  .care-note ha-icon { --mdc-icon-size: 18px; color: color-mix(in srgb, var(--sp-care) 55%, var(--sp-text)); }

  dialog.care-dialog { width: min(560px, calc(100vw - 32px)); }
  .care-dialog .dialog-body { display: flex; flex-direction: column; gap: 12px; }
  .care-dialog label { margin: 0; }
  .care-dialog textarea { width: 100%; resize: vertical; max-height: 40vh; overflow-y: auto; }
  .care-dialog .suggestions { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 12px; overflow: hidden; padding: 0; margin: 0; }
  .care-dialog .suggestions h4 { display: flex; align-items: center; gap: 8px; margin: 0; padding: 10px 14px; font-size: 13.5px; font-weight: 500; background: color-mix(in srgb, var(--sp-primary) 10%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
  .care-dialog .suggestions h4 ha-icon { --mdc-icon-size: 18px; }
  .care-dialog .suggestion { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; align-items: start; padding: 12px 14px; }
  .care-dialog .suggestion + .suggestion { border-top: 1px solid var(--divider-color, #e0e0e0); }
  .care-dialog .suggestion-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .care-dialog .suggestion-source { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--sp-text-secondary); }
  .care-dialog .suggestion-source ha-icon, .care-dialog .note-hint ha-icon { --mdc-icon-size: 16px; color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
  .care-dialog .suggestion q { font-size: 14px; overflow-wrap: anywhere; }
  .care-dialog .suggestion-value { font-size: 14px; font-weight: 500; }
  .care-dialog .suggestion q.clamped { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; overflow: hidden; }
  .care-dialog .linkbtn { align-self: flex-start; padding: 0; min-height: 24px; border: 0; background: none; color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: underline; }
  .care-dialog .note-hint { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; color: var(--sp-text-secondary); margin-top: -4px; }
  .care-dialog .note-hint .btn { margin-inline-start: -4px; }
  .care-dialog .dialog-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 8px; }
  .care-dialog .dialog-actions .spacer { flex: 1; }
  .care-dialog .error-text { display: block; color: color-mix(in srgb, var(--sp-error) 75%, var(--sp-text)); }
  .care-dialog .danger-text { color: color-mix(in srgb, var(--sp-error) 60%, var(--sp-text)); }
  .care-dialog .presets { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .care-dialog button.preset { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 12px; align-items: center; width: 100%; height: 100%; text-align: start; padding: 10px 12px; border-radius: 12px; background: var(--ha-card-background, var(--sp-card)); }
  .care-dialog button.preset:disabled { opacity: .6; cursor: default; }
  .care-dialog .preset-text { display: flex; flex-direction: column; min-width: 0; }
  .care-dialog .preset-name { font-weight: 500; }
  .care-dialog .preset-d { font-size: 12.5px; color: var(--sp-text-secondary); }
  .care-dialog .preset-hint { margin-top: 2px; font-size: 12px; color: var(--sp-text-secondary); }
  .care-dialog .task-summary { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; background: color-mix(in srgb, var(--sp-text) 6%, transparent); }
  .care-dialog .summary-name { font-weight: 500; }
  .care-dialog .field-group { display: flex; flex-direction: column; gap: 6px; }
  .care-dialog .field-label { font-size: 14px; }
  .care-dialog .seg { display: flex; }
  .care-dialog .seg button { flex: 1; min-height: 40px; }
  .care-dialog .grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: start; }
  .care-dialog .monthpick { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 4px; }
  .care-dialog .monthpick button { min-height: 40px; padding: 4px 0; font-size: 12.5px; border-radius: 8px; }
  .care-dialog .monthpick button[aria-pressed="true"], .care-dialog .seg button[aria-pressed="true"] { background: color-mix(in srgb, var(--sp-primary) 14%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); border-color: transparent; font-weight: 500; }
  .care-dialog .check { align-items: flex-start; }
  .care-dialog .growing-hint { display: block; margin-inline-start: 34px; }
  .care-dialog #task-more { display: flex; flex-direction: column; gap: 4px; }
  .care-dialog .more-options .btn { margin-inline-start: -14px; }
  .care-dialog .more-hint { font-weight: 400; color: var(--sp-text-secondary); }
  .care-dialog #task-more .grid2 { margin-bottom: 4px; }
  .care-dialog .suffix-field { position: relative; display: block; }
  .care-dialog .suffix-field input { width: 100%; padding-inline-end: 56px; }
  .care-dialog .suffix-field .suffix { position: absolute; inset-inline-end: 12px; top: 50%; transform: translateY(-50%); color: var(--sp-text-secondary); pointer-events: none; }
  .care-dialog .chosen-sensor { overflow-wrap: anywhere; }
  .care-dialog .rest-tasks { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .care-dialog .rest-tasks legend { padding: 0; margin-bottom: 6px; }
  .care-dialog .automate-list { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 12px; }
  .care-dialog .automate-hint { display: flex; gap: 8px; align-items: flex-start; }
  @media (max-width: 600px) {
    .care-dialog .presets { grid-template-columns: minmax(0, 1fr); }
    .care-dialog .suggestion { grid-template-columns: minmax(0, 1fr); }
    .care-dialog .monthpick { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .care-dialog #task-more .grid2 { grid-template-columns: minmax(0, 1fr); }
  }
  @container plant (max-width: 700px) {
    .care-plan .task { grid-template-columns: 40px minmax(0, 1fr) 40px; align-items: start; }
    .care-plan .task-side { grid-column: 2 / -1; grid-row: 2; justify-content: flex-start; }
    .care-plan .task-menu { grid-column: 3; grid-row: 1; }
    .restline { grid-template-columns: 20px minmax(0, 1fr); }
    .restline > .btn { grid-column: 2; justify-self: start; margin-inline-start: -12px; }
  }
`, ys = 5242880, bs = 2048, xs = 41943040, Ss = 64e6, Cs = [
	"image/jpeg",
	"image/png",
	"image/webp"
];
async function ws(e, t, n) {
	if (!Cs.includes(e.type) || e.size === 0 || e.size > t) throw Error(n.t(t > 5242880 ? "image_error.type_or_input_size" : "image_error.type_or_size"));
	let r;
	try {
		r = new Uint8Array(await e.slice(0, 12).arrayBuffer());
	} catch {
		throw Error(n.t("image_error.unreadable"));
	}
	let i = (...e) => e.every((e, t) => r[t] === e), a = i(255, 216, 255) ? "image/jpeg" : i(137, 80, 78, 71, 13, 10, 26, 10) ? "image/png" : i(82, 73, 70, 70) && r[8] === 87 && r[9] === 69 && r[10] === 66 && r[11] === 80 ? "image/webp" : null;
	if (a !== e.type) throw Error(n.t("image_error.signature"));
	return a;
}
async function Ts(e, t) {
	try {
		if (typeof createImageBitmap == "function") {
			let t = await createImageBitmap(e, { imageOrientation: "from-image" });
			return {
				source: t,
				width: t.width,
				height: t.height,
				release: () => t.close()
			};
		}
		let t = URL.createObjectURL(e);
		try {
			let e = new Image();
			return await new Promise((n, r) => {
				e.onload = () => n(), e.onerror = () => r(/* @__PURE__ */ Error("decode")), e.src = t;
			}), {
				source: e,
				width: e.naturalWidth,
				height: e.naturalHeight,
				release: () => void 0
			};
		} finally {
			URL.revokeObjectURL(t);
		}
	} catch {
		throw Error(t.t("image_error.decode"));
	}
}
var Es = (e, t) => Number.isInteger(e) && Number.isInteger(t) && e >= 1 && t >= 1;
async function Ds(e, t = F) {
	let n = await ws(e, ys, t), { width: r, height: i, release: a } = await Ts(e, t);
	if (a(), !Es(r, i) || r > 2048 || i > 2048) throw Error(t.t("image_error.dimensions"));
	return {
		format: n,
		bytes: e.size,
		width: r,
		height: i
	};
}
function Os(e, t, n) {
	return new Promise((r) => {
		e.toBlob((e) => r(e), t, n);
	});
}
async function ks(e, t = F) {
	await ws(e, xs, t);
	let { source: n, width: r, height: i, release: a } = await Ts(e, t);
	try {
		if (!Es(r, i)) throw Error(t.t("image_error.decode"));
		if (r * i > Ss) throw Error(t.t("image_error.too_many_pixels"));
		if (r <= 2048 && i <= 2048 && e.size <= 5242880) return e;
		let a = Math.min(1, bs / Math.max(r, i)), o = document.createElement("canvas");
		o.width = Math.max(1, Math.round(r * a)), o.height = Math.max(1, Math.round(i * a));
		let s = o.getContext("2d");
		if (!s) throw Error(t.t("image_error.resize"));
		s.imageSmoothingEnabled = !0, s.imageSmoothingQuality = "high", s.drawImage(n, 0, 0, o.width, o.height);
		for (let t of [
			.9,
			.8,
			.65
		]) {
			let n = await Os(o, "image/webp", t);
			if (n?.type !== "image/webp" && (n = await Os(o, "image/jpeg", t)), !n || !Cs.includes(n.type)) break;
			if (n.size > 0 && n.size <= 5242880) {
				let t = n.type === "image/webp" ? "webp" : "jpg";
				return new File([n], `${e.name.replace(/\.[^.]*$/, "") || "photo"}.${t}`, { type: n.type });
			}
		}
		throw Error(t.t("image_error.resize"));
	} finally {
		a();
	}
}
//#endregion
//#region src/bundle-version.ts
function As(e) {
	try {
		return new URL(e).searchParams.get("v") || null;
	} catch {
		return null;
	}
}
function js(e, t) {
	return !!e && !!t && e !== t;
}
//#endregion
//#region src/snooze.ts
var Ms = [
	{
		choice: "1",
		days: 1,
		label: "snooze.preset_1"
	},
	{
		choice: "3",
		days: 3,
		label: "snooze.preset_3"
	},
	{
		choice: "7",
		days: 7,
		label: "snooze.preset_7"
	},
	{
		choice: "14",
		days: 14,
		label: "snooze.preset_14"
	}
], Ns = /^(\d{4})-(\d\d)-(\d\d)$/;
function Ps(e, t) {
	let n = Ns.exec(e);
	return n ? new Date(Date.UTC(Number(n[1]), Number(n[2]) - 1, Number(n[3]) + t)).toISOString().slice(0, 10) : e;
}
function Fs(e, t) {
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
function Is(e, t) {
	let n = Fs(e, t), r = Date.UTC(n.year, n.month - 1, n.day, n.hour % 24, n.minute, n.second);
	return Math.round((r - Math.floor(e / 1e3) * 1e3) / 6e4);
}
function Ls(e, t) {
	let n = Ns.exec(e);
	if (!n) return null;
	let r = Date.UTC(Number(n[1]), Number(n[2]) - 1, Number(n[3]), 23, 59, 59), i = Is(r, t);
	i = Is(r - i * 6e4, t);
	let a = i < 0 ? "-" : "+", o = Math.abs(i);
	return `${e}T23:59:59${a}${String(Math.floor(o / 60)).padStart(2, "0")}:${String(o % 60).padStart(2, "0")}`;
}
function Rs(e, t, n, r) {
	let i = Ms.find((t) => t.choice === e);
	return i ? Ls(Ps(t, i.days), r) : Bs(n, t) ? Ls(n, r) : null;
}
function zs(e) {
	return {
		min: Ps(e, 1),
		max: Ps(e, 365)
	};
}
function Bs(e, t) {
	if (!Ns.test(e) || Ps(e, 0) !== e) return !1;
	let { min: n, max: r } = zs(t);
	return e >= n && e <= r;
}
function Vs(e, t = Date.now()) {
	if (!e) return null;
	let n = Date.parse(e);
	return Number.isFinite(n) && n > t ? e : null;
}
function Hs(e, t) {
	let n = Date.parse(e);
	if (!Number.isFinite(n)) return null;
	let r = Fs(n - 1e3, t);
	return `${String(r.year).padStart(4, "0")}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`;
}
function Us(e, t, n) {
	let r = Ns.exec(t);
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
function Ws(e, t, n, r, i = Date.now()) {
	let a = Vs(t, i), o = a ? Hs(a, r) : null;
	return o ? e.t("snooze.chip", { date: Us(e, o, n).replace(/\s/g, "\xA0") }) : null;
}
//#endregion
//#region src/styles.ts
var Gs = o`
  :host{display:block;color:var(--primary-text-color,#212121);font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif);line-height:1.5;overflow-wrap:anywhere}
  *{box-sizing:border-box} .update-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-left:4px solid var(--info-color,#039be5);padding:8px 16px;margin-bottom:16px;background:var(--card-background-color,#fff)} .update-banner p{margin:0} main{width:100%;max-width:none;margin:0;padding:0} .panel-content{width:100%;max-width:1280px;margin:0 auto;padding:16px 24px 24px} header,.actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap} header{justify-content:space-between;margin-bottom:24px}
  .page-title{font-size:inherit;font-weight:inherit;margin:inherit;line-height:inherit}
  h1,h2,h3{line-height:1.2} h1{font-size:1.8rem} h2{font-size:1.3rem} h3{font-size:1.1rem} p{overflow-wrap:anywhere}
  section,article,.card{background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#ddd);border-radius:var(--ha-card-border-radius,12px);padding:20px;margin-bottom:16px} section>h2:first-child{margin-top:0}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px}
  label{display:grid;gap:6px;margin:12px 0}input,select,textarea,button{font:inherit;color:inherit;min-height:44px;border:1px solid var(--divider-color,#aaa);border-radius:8px;padding:8px 12px;background:var(--card-background-color,#fff);max-width:100%}input,select{width:100%}button{cursor:pointer;transition:border-color .16s ease,transform .16s ease}button:hover:not(:disabled){border-color:var(--primary-color,#007bad)}button.primary{background:var(--secondary-background-color,#f5f5f5);color:var(--primary-text-color,#212121);border:2px solid var(--primary-color,#007bad);font-weight:600}button:disabled{opacity:1;color:var(--secondary-text-color,#666);background:var(--secondary-background-color,#f5f5f5);border-color:var(--divider-color,#ddd);cursor:default}a{color:var(--primary-color,#007bad)}
  :focus-visible{outline:3px solid var(--primary-color,#03a9f4);outline-offset:3px}.check{display:flex;align-items:center;gap:10px}.check input{width:24px;height:24px;min-height:24px}.actions{margin-top:20px}small,.muted{display:block;color:var(--secondary-text-color,#666)}.error{border-left:4px solid var(--error-color,#b00020);padding:16px;background:var(--card-background-color,#fff);color:var(--error-color,#b00020)}.notice{border-left:4px solid var(--warning-color,#f90);padding:16px}fieldset{border:0;padding:0;margin:0;min-width:0}legend{font-weight:600}.empty{text-align:center;padding:48px 16px}.name{font-weight:600;text-align:left}.prose{white-space:pre-wrap}li{margin-bottom:12px}dl{display:grid;grid-template-columns:minmax(90px,1fr) 2fr;gap:4px 12px}dd{margin:0;overflow-wrap:anywhere}dt{color:var(--secondary-text-color,#666)}img.preview{max-width:100%;max-height:320px;object-fit:contain;border-radius:8px}dialog{color:var(--primary-text-color,#212121);background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#ddd);border-radius:16px;padding:24px;max-width:min(600px,calc(100vw - 32px));max-height:85vh;overflow:auto}dialog::backdrop{background:rgba(0,0,0,.5)}nav ol{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none}nav li{padding:6px 10px;border-radius:8px;background:var(--secondary-background-color,#eee)}[aria-current=step]{font-weight:bold;border:2px solid var(--primary-color,#03a9f4)}
  .stepper{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 12px!important;scrollbar-width:thin}.stepper li{display:flex;align-items:center;gap:8px;flex:0 0 auto;margin:0;color:var(--secondary-text-color,#666);font-size:.9rem}.step-number{display:grid;place-items:center;width:26px;height:26px;border:1px solid var(--divider-color,#aaa);border-radius:50%;font-size:.8rem}.stepper [aria-current=step]{color:var(--primary-text-color,#212121);border:0;font-weight:600}.stepper [aria-current=step] .step-number{background:var(--primary-color,#007bad);border-color:var(--primary-color,#007bad);color:var(--text-primary-color,#fff)}
  .choice-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px;margin:20px 0}.choice-card{display:grid;gap:8px;text-align:left;min-height:112px;padding:18px;background:var(--secondary-background-color,#f5f5f5);border-color:var(--divider-color,#ddd)}.choice-card strong{font-size:1.05rem}.choice-card span{color:var(--secondary-text-color,#666)}.choice-card.selected{border:2px solid var(--primary-color,#007bad);background:var(--primary-background-color,#eaf6fa)}.provider-help,.default-summary{padding:16px;border-radius:12px;background:var(--secondary-background-color,#f5f5f5);margin:16px 0}.provider-help{border-inline-start:4px solid var(--primary-color,#007bad)}.provider-help p{margin:8px 0}.advanced-disclosure{border:1px solid var(--divider-color,#ddd);border-radius:12px;padding:0 16px;margin:20px 0}.advanced-disclosure summary{cursor:pointer;font-weight:600;padding:16px 0}.advanced-disclosure[open]{padding-bottom:12px}.result-list{padding-inline-start:20px}.result-list button{text-align:left}
   .detail-tabs{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 12px;margin:8px 0 16px}.detail-tabs button{flex:0 0 auto;background:var(--secondary-background-color,#f5f5f5);border-color:transparent}.detail-tabs button[aria-current=page]{background:var(--secondary-background-color,#f5f5f5);color:var(--primary-text-color,#212121);border:2px solid var(--primary-color,#007bad);font-weight:600}.plant-overview-card{padding:0;overflow:hidden}.overview-heading{display:flex;align-items:center;gap:20px;padding:24px;background:var(--secondary-background-color,#f5f5f5)}.overview-avatar{width:84px;height:84px;flex:0 0 84px;object-fit:cover;border-radius:16px}.overview-avatar.placeholder{display:grid;place-items:center;background:var(--secondary-background-color,#f5f5f5);color:var(--primary-text-color,#212121);font-size:2rem;font-weight:700;border:1px solid var(--divider-color,#ddd)}.overview-heading h2{font-size:1.8rem;margin:4px 0}.overview-heading>section,.overview-heading>article{padding:0;margin:0;border:0;background:transparent}.eyebrow{font-size:.75rem;font-weight:700;letter-spacing:.08em;color:var(--secondary-text-color,#666);margin:0}.overview-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:20px}.overview-metrics article{display:grid;gap:4px;margin:0;background:var(--secondary-background-color,#f5f5f5);border:0}.overview-metrics article span{color:var(--secondary-text-color,#666)}.overview-metrics article strong{font-size:1.45rem}.overview-sensors,.overview-care{border:0;border-top:1px solid var(--divider-color,#ddd);border-radius:0;margin:0}.overview-sensors h2,.overview-care h2{margin-top:0}.overview-heading button{margin-top:8px}
  .detail-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:4px 2px 8px}.detail-heading h2{font-size:1.5rem;margin:0}.detail-heading p{margin:4px 0;color:var(--secondary-text-color,#666)}.detail-heading a{color:var(--primary-text-color,#212121);text-decoration:underline;text-underline-offset:3px}
  @media(max-width:600px){.panel-content{padding:16px 16px 16px}section,article{padding:16px}.actions button{flex:1 1 auto}header{align-items:flex-start}dl{grid-template-columns:1fr}dd{margin-bottom:8px}.stepper li span:last-child{display:none}.stepper li[aria-current=step] span:last-child{display:inline}.choice-card{min-height:0}.overview-heading{align-items:flex-start;flex-direction:column;padding:18px}.overview-metrics{grid-template-columns:1fr;padding:14px}.detail-tabs button{font-size:.9rem;padding:8px}}
`, Ks, qs = [
	"ha-area-picker",
	"ha-entity-picker",
	"ha-selector",
	"ha-alert",
	"ha-expansion-panel",
	"ha-dropdown",
	"ha-dropdown-item"
], Js = Pt.filter((e) => e !== "moisture"), Ys = "/config/integrations/integration/smart_plants", Xs = "https://open.plantbook.io/apikey/", X = class extends S {
	constructor(...e) {
		super(...e), this.areas = [], this.entities = [], this.devices = [], this.states = {}, this.blocked = !1, this.navigationContext = 0, this.photoStatus = "", this.step = 1, this.busy = !1, this.error = "", this.name = "", this.area = "", this.photo = null, this.photoUrl = null, this.photoError = "", this.photoChecking = !1, this.dragging = !1, this.moisture = hi(), this.extras = [], this.pendingRole = null, this.roleMenu = !1, this.expanded = /* @__PURE__ */ new Set(), this.opened = /* @__PURE__ */ new Set(), this.query = "", this.results = [], this.searched = !1, this.preview = null, this.accepted = !1, this.speciesError = "", this.common = "", this.latin = "", this.acquired = "", this.placement = "", this.category = "", this.tagText = "", this.draft = null, this.finalRequest = null, this.rejected = !1, this.created = null, this.generation = 0, this.lifecycle = 0, this.photoCheck = 0, this.entityById = /* @__PURE__ */ new Map(), this.areaOfEntity = /* @__PURE__ */ new Map();
	}
	get knownAreas() {
		let e = new Map(this.areas.map((e) => [e.area_id, e]));
		for (let [t, n] of Object.entries(this.hass?.areas ?? {})) !e.has(t) && n && n.area_id === t && typeof n.name == "string" && e.set(t, {
			area_id: t,
			name: n.name
		});
		return [...e.values()];
	}
	get l() {
		return Xn(this.hass);
	}
	connectedCallback() {
		super.connectedCallback();
		for (let e of qs) G(e) || customElements.whenDefined(e).then(() => this.requestUpdate());
		this.photo && !this.photoUrl && (this.photoUrl = URL.createObjectURL(this.photo)), !this.draft && !this.created && this.start();
	}
	disconnectedCallback() {
		this.lifecycle++, this.generation++, this.busy = !1, this.photoUrl && (URL.revokeObjectURL(this.photoUrl), this.photoUrl = null), super.disconnectedCallback();
	}
	willUpdate(e) {
		let t = e.get("hass");
		if ((e.has("blocked") && this.blocked || t && t.connection !== this.hass.connection) && (this.lifecycle++, this.busy = !1, this.generation++, this.finalRequest || (this.preview = null, this.accepted = !1)), e.has("entities") || e.has("devices")) {
			this.entityById = new Map(this.entities.map((e) => [e.entity_id, e]));
			let e = new Map(this.devices.map((e) => [e.id, e.area_id]));
			this.areaOfEntity = new Map(this.entities.flatMap((t) => {
				let n = t.area_id || (t.device_id ? e.get(t.device_id) : null);
				return n ? [[t.entity_id, n]] : [];
			}));
		}
	}
	async start() {
		if (this.busy || this.blocked) return;
		let e = this.lifecycle;
		this.busy = !0;
		try {
			let t = await P.startWizard(this.hass);
			e === this.lifecycle && this.isConnected && (this.draft = t);
		} catch (t) {
			e === this.lifecycle && this.fail(t);
		} finally {
			e === this.lifecycle && (this.busy = !1);
		}
	}
	commonName(e) {
		let t = vi(e, this.l.language);
		return t && t !== e.latin_name ? t : null;
	}
	message(e) {
		return e instanceof M && [
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
		].includes(e.code) ? this.l.t("wizard.error_code", { code: e.code }) : this.l.t("wizard.error_generic");
	}
	fail(e, t = !1) {
		let n = this.message(e);
		t ? this.speciesError = n : this.error = n, e instanceof M && ["integration_not_loaded", "unauthorized"].includes(e.code) && this.dispatchEvent(new CustomEvent("backend-unavailable", {
			detail: n,
			bubbles: !0,
			composed: !0
		}));
	}
	emit(e) {
		this.dispatchEvent(new CustomEvent(e, {
			bubbles: !0,
			composed: !0
		}));
	}
	get defaults() {
		return {
			...Zn,
			...this.accepted ? this.preview?.snapshot.threshold_defaults.moisture : {}
		};
	}
	get providerInfo() {
		return this.capabilities.providers.find((e) => e.provider === "openplantbook");
	}
	manual() {
		this.generation++, this.preview = null, this.accepted = !1, this.results = [], this.searched = !1, this.speciesError = "";
	}
	async search() {
		if (this.busy || this.blocked || this.query.trim().length < 3) return;
		let e = this.lifecycle, t = ++this.generation;
		this.busy = !0, this.speciesError = "", this.preview = null, this.accepted = !1;
		try {
			let e = await P.searchSpecies(this.hass, "openplantbook", this.query.trim(), this.hass.language ?? "en");
			t === this.generation && (this.results = e, this.searched = !0);
		} catch (e) {
			t === this.generation && this.fail(e, !0);
		} finally {
			e === this.lifecycle && (this.busy = !1);
		}
	}
	async choose(e) {
		if (!this.draft || this.busy || this.blocked) return;
		let t = this.lifecycle, n = ++this.generation;
		this.busy = !0, this.accepted = !1, this.preview = null, this.speciesError = "";
		try {
			let t = await P.previewWizard(this.hass, this.draft, e.provider, e.provider_ref, this.hass.language ?? "en");
			n === this.generation && (this.preview = t);
		} catch (e) {
			n === this.generation && this.fail(e, !0);
		} finally {
			t === this.lifecycle && (this.busy = !1);
		}
	}
	setOverride(e, t) {
		this.moisture = {
			...this.moisture,
			threshold_overrides: {
				...this.moisture.threshold_overrides,
				[e]: t.trim() === "" ? null : Number(t)
			}
		};
	}
	stateOf(e) {
		return this.states[e];
	}
	friendly(e) {
		let t = this.stateOf(e)?.attributes.friendly_name;
		return typeof t == "string" && t.trim() ? t : e;
	}
	valueText(e) {
		let t = this.stateOf(e);
		if (!t || [
			"unknown",
			"unavailable",
			""
		].includes(t.state)) return this.l.t("wizard.sensor_unavailable");
		let n = typeof t.attributes.unit_of_measurement == "string" ? t.attributes.unit_of_measurement : "", r = Number(t.state);
		return Number.isFinite(r) ? j(this.l, r, n) : t.state;
	}
	fits(e, t) {
		if (!t.entity_id.startsWith("sensor.") || this.entityById.get(t.entity_id)?.platform === "smart_plants") return !1;
		let n = t.attributes.device_class, r = t.attributes.unit_of_measurement;
		if (e === "moisture") return n === "moisture";
		let i = wi(e);
		return !!i && n === i.deviceClass && typeof r == "string" && i.acceptedUnits.includes(r);
	}
	roleFor(e) {
		let t = Pt.find((t) => t !== "soil_temperature" && this.fits(t, e)) ?? null;
		return t === "temperature" && /soil|boden/i.test(`${e.entity_id} ${this.friendly(e.entity_id)}`) ? "soil_temperature" : t;
	}
	get assignedIds() {
		return [...this.moisture.sources.map((e) => e.entity_id), ...this.extras.map((e) => e.entity_id)];
	}
	get takenRoles() {
		return /* @__PURE__ */ new Set([...this.moisture.sources.length ? ["moisture"] : [], ...this.extras.map((e) => e.role)]);
	}
	source(e) {
		return {
			entity_id: e,
			registry_id: this.entityById.get(e)?.id ?? null
		};
	}
	assign(e, t) {
		t && !this.assignedIds.includes(t) && (e === "moisture" ? this.moisture = {
			...this.moisture,
			sources: [this.source(t)],
			primary_entity_id: t
		} : this.extras = [...this.extras.filter((t) => t.role !== e), {
			role: e,
			entity_id: t
		}], this.pendingRole === e && (this.pendingRole = null));
	}
	unassign(e) {
		e === "moisture" ? this.moisture = {
			...this.moisture,
			sources: [],
			primary_entity_id: null
		} : this.extras = this.extras.filter((t) => t.role !== e);
	}
	suggestions() {
		if (!this.area) return [];
		let e = this.takenRoles, t = new Set(this.assignedIds);
		return Object.values(this.states).flatMap((n) => {
			if (t.has(n.entity_id) || this.areaOfEntity.get(n.entity_id) !== this.area) return [];
			let r = this.roleFor(n);
			return r && !e.has(r) ? [{
				role: r,
				entity_id: n.entity_id,
				name: this.friendly(n.entity_id)
			}] : [];
		}).sort((e, t) => Pt.indexOf(e.role) - Pt.indexOf(t.role) || e.name.localeCompare(t.name));
	}
	async pickPhoto(e) {
		if (this.clearPhoto(), !e) return;
		let t = ++this.photoCheck;
		this.photoChecking = !0;
		try {
			let n = await ks(e, this.l);
			if (t !== this.photoCheck) return;
			this.photo = n, this.photoUrl = URL.createObjectURL(n);
		} catch (e) {
			t === this.photoCheck && (this.photoError = e.message);
		} finally {
			t === this.photoCheck && (this.photoChecking = !1);
		}
	}
	clearPhoto() {
		this.photoCheck++, this.photoChecking = !1, this.photoUrl && URL.revokeObjectURL(this.photoUrl), this.photo = null, this.photoUrl = null, this.photoError = "";
	}
	async go(e) {
		this.step = e, this.roleMenu = !1, await this.updateComplete, this.shadowRoot?.querySelector("h2")?.focus();
	}
	async next() {
		if (!(this.busy || this.blocked || !this.draft)) {
			if (this.error = "", this.step === 1) {
				if (!this.name.trim()) {
					this.error = this.l.t("wizard.error_name");
					return;
				}
				if (this.photoChecking) return;
				await this.go(2);
			} else this.step === 2 && await this.go(3);
		}
	}
	back() {
		this.busy || this.finalRequest || (this.error = "", (this.step === 2 || this.step === 3) && this.go(this.step === 3 ? 2 : 1));
	}
	toggle(e, t) {
		t && (this.opened = /* @__PURE__ */ new Set([...this.opened, e]));
		let n = new Set(this.expanded);
		t ? n.add(e) : n.delete(e), this.expanded = n;
	}
	validate() {
		let e = this.l;
		if (!this.name.trim() || this.name.trim().length > 200) return e.t("wizard.error_name_length");
		if (this.area && !this.knownAreas.some((e) => e.area_id === this.area)) return e.t("wizard.error_area");
		if (this.preview && !this.accepted) return this.toggle("species", !0), e.t("wizard.error_accept_preview");
		if (_i(this.moisture, this.defaults, e)) return this.toggle("species", !0), e.t("wizard.error_targets");
		if (this.acquired && !Number.isFinite(Date.parse(this.acquired))) return this.toggle("details", !0), e.t("wizard.error_acquired");
		let t = Mi(this.category, ji(this.tagText), e);
		return t && this.toggle("details", !0), t;
	}
	request(e) {
		let t = Object.fromEntries(this.extras.map(({ role: e, entity_id: t }) => {
			let n = z(this.source(t), this.entities), r = n ? {
				entity_id: n.entity_id,
				registry_id: n.id
			} : {
				entity_id: t,
				registry_id: null
			};
			return [e, {
				sources: [r],
				primary_entity_id: r.entity_id
			}];
		})), n = this.placement ? {
			mode: this.placement,
			exposure: null,
			rain_exposure: null,
			container: null
		} : null;
		return structuredClone({
			draft_id: e.draft_id,
			draft_token: e.draft_token,
			expected_revision: 0,
			confirmed: !0,
			name: this.name.trim(),
			acquired_at: this.acquired ? new Date(this.acquired).toISOString() : null,
			area_id: this.area || null,
			placement: n,
			category: this.category.trim() || null,
			tags: ji(this.tagText),
			moisture: xi(this.moisture, this.entities),
			...this.extras.length ? { roles: t } : {},
			...this.accepted && this.preview ? { accepted_preview: {
				preview_token: this.preview.preview_token,
				provider: this.preview.provider,
				operation: "select"
			} } : { species: bi(this.common, this.latin) }
		});
	}
	async create() {
		if (this.busy || this.blocked || !this.draft) return;
		if (!this.finalRequest) {
			if (this.error = this.validate() ?? "", this.error) return;
			this.finalRequest = this.request(this.draft);
		}
		this.busy = !0, this.error = "";
		let e = this.lifecycle, t = this.navigationContext;
		try {
			let n = await P.createWizard(this.hass, this.finalRequest);
			if (e !== this.lifecycle || !this.isConnected) return;
			this.created = n, this.step = 4, this.dispatchEvent(new CustomEvent("plant-created", {
				detail: {
					plant: n,
					photo: this.photo,
					navigationContext: t
				},
				bubbles: !0,
				composed: !0
			})), await this.updateComplete, this.shadowRoot?.querySelector("h2")?.focus();
		} catch (t) {
			e === this.lifecycle && (this.fail(t), this.rejected = t instanceof M && t.code === "invalid_format");
		} finally {
			e === this.lifecycle && (this.busy = !1);
		}
	}
	startFresh() {
		this.finalRequest = null, this.rejected = !1, this.preview = null, this.accepted = !1, this.results = [], this.searched = !1, this.error = "", this.draft = null, this.go(1), this.start();
	}
	restart() {
		this.lifecycle++, this.generation++, this.busy = !1, this.clearPhoto(), Object.assign(this, {
			name: "",
			area: "",
			moisture: hi(),
			extras: [],
			pendingRole: null,
			roleMenu: !1,
			expanded: /* @__PURE__ */ new Set(),
			opened: /* @__PURE__ */ new Set(),
			query: "",
			results: [],
			searched: !1,
			preview: null,
			accepted: !1,
			speciesError: "",
			common: "",
			latin: "",
			acquired: "",
			placement: "",
			category: "",
			tagText: "",
			draft: null,
			finalRequest: null,
			rejected: !1,
			created: null,
			error: ""
		}), this.emit("wizard-restart"), this.go(1), this.start();
	}
	render() {
		let e = this.l;
		if (this.step === 4 && this.created) return this.renderDone();
		let t = [
			e.t("wizard.step_plant"),
			e.t("wizard.step_sensors"),
			e.t("wizard.step_review")
		], n = this.busy || this.blocked || !!this.finalRequest, r = this.step === 3 ? b`<button type="button" class="btn filled" ?disabled=${this.busy || this.blocked || !this.draft} @click=${() => void this.create()}><ha-icon aria-hidden="true" icon="mdi:check"></ha-icon>${this.finalRequest ? e.t("wizard.retry_create") : e.t("wizard.create")}</button>` : b`<button type="button" class="btn filled" ?disabled=${this.busy || this.blocked || !this.draft || this.photoChecking} @click=${() => void this.next()}>${this.step === 2 && !this.assignedIds.length ? e.t("wizard.skip") : e.t("wizard.next")}</button>`;
		return b`<div class="wz" lang=${e.language}>
      <div class="stepline"><span>${e.t("wizard.step_of", {
			step: this.step,
			total: 3,
			name: t[this.step - 1]
		})}</span>
        <span class="all" aria-hidden="true">${t.map((e, t) => b`${t ? " · " : ""}${t + 1 === this.step ? b`<b>${e}</b>` : e}`)}</span></div>
      <div class="bars" aria-hidden="true">${[
			1,
			2,
			3
		].map((e) => b`<span class=${e <= this.step ? "on" : ""}></span>`)}</div>
      <div class="card">
        <fieldset style="border:0;margin:0;padding:0;min-width:0" ?disabled=${n}>
          ${this.step === 1 ? this.renderPlant() : this.step === 2 ? this.renderSensors() : this.renderReview()}
        </fieldset>
        ${this.error ? b`<p class="error" role="alert" style="margin-top:14px">${this.error}</p>` : x}
        ${!this.draft && !this.busy ? b`<p style="margin-top:14px"><button type="button" class="btn outline sm" @click=${() => void this.start()}>${e.t("wizard.retry_draft")}</button></p>` : x}
        ${this.finalRequest ? b`<p class="notice" style="margin-top:14px">${e.t("wizard.final_request_retained")}</p>` : x}
        ${this.rejected ? b`<p style="margin-top:14px">${e.t("wizard.rejected")}</p><p style="margin-top:8px"><button type="button" class="btn outline sm" ?disabled=${this.busy || this.blocked} @click=${() => this.startFresh()}>${e.t("wizard.start_fresh")}</button></p>` : x}
      </div>
      <div class="actions">
        ${this.step === 1 ? b`<button type="button" class="btn text" ?disabled=${this.busy} @click=${() => this.emit("wizard-close")}>${e.t("common.cancel")}</button>` : b`<button type="button" class="btn text" ?disabled=${this.busy || !!this.finalRequest} @click=${() => this.back()}>${e.t("wizard.back")}</button>`}
        <span class="end">${r}</span>
      </div>
      <p class="status small muted" role="status">${this.busy ? e.t("wizard.working") : ""}</p>
    </div>`;
	}
	renderPlant() {
		let e = this.l, t = G("ha-area-picker") && this.hass ? b`<ha-area-picker .hass=${this.hass} .label=${e.t("wizard.area")} .value=${this.area || void 0} .noAdd=${!0} .disabled=${this.busy || this.blocked} @value-changed=${(e) => {
			this.area = e.detail.value ?? "";
		}}></ha-area-picker>` : b`<div class="field"><label for="area">${e.t("wizard.area")}</label><select id="area" aria-describedby="area-helper" @change=${(e) => {
			this.area = e.target.value;
		}}>
          <option value="" ?selected=${!this.area}>${e.t("wizard.no_area")}</option>
          ${this.area && !this.knownAreas.some((e) => e.area_id === this.area) ? b`<option value=${this.area} selected>${e.t("area.missing_option", { area: this.area })}</option>` : x}
          ${this.knownAreas.map((e) => b`<option value=${e.area_id} ?selected=${e.area_id === this.area}>${e.name}</option>`)}</select><ha-icon class="trail" aria-hidden="true" icon="mdi:menu-down"></ha-icon></div>`;
		return b`<h2 tabindex="-1">${e.t("wizard.plant_heading")}</h2><p class="intro">${e.t("wizard.plant_intro")}</p>
      <div class="stack">
        <label class="field">${e.t("wizard.plant_name")}<input required maxlength="200" autocomplete="off" .value=${this.name} @input=${(e) => {
			this.name = e.target.value;
		}} @keydown=${(e) => {
			e.key === "Enter" && this.next();
		}}></label>
        <div>${t}<div class="helper" id="area-helper">${e.t("wizard.area_helper")}</div></div>
        ${this.renderPhoto()}
      </div>`;
	}
	renderPhoto() {
		let e = this.l, t = (e, t) => {
			e.preventDefault(), this.dragging = t;
		}, n = (e) => b`<input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label=${e} aria-describedby="photo-hint" ?disabled=${this.busy || this.blocked}
      @change=${(e) => {
			let t = e.target;
			this.pickPhoto(t.files?.[0]), t.value = "";
		}}>`, r = this.photoChecking ? e.t("wizard.photo_checking") : this.photo ? e.t("wizard.photo_pending") : e.t("wizard.photo_hint");
		return b`<div><div class="drop ${this.photo ? "has" : ""} ${this.dragging ? "over" : ""}" @dragover=${(e) => t(e, !0)} @dragleave=${(e) => t(e, !1)}
        @drop=${(e) => {
			t(e, !1), !this.busy && !this.blocked && this.pickPhoto(e.dataTransfer?.files?.[0]);
		}}>
      ${this.photo && this.photoUrl ? b`<img src=${this.photoUrl} alt="">
          <span class="grow" dir="auto" title=${this.photo.name}>${this.photo.name}</span>
          <label class="btn text sm pick">${e.t("wizard.photo_change")}${n(e.t("wizard.photo_change_label"))}</label>
          <button type="button" class="btn text sm" aria-label=${e.t("wizard.photo_remove_label")} @click=${() => this.clearPhoto()}>${e.t("wizard.photo_remove")}</button>` : b`<label><ha-icon aria-hidden="true" icon="mdi:camera-plus-outline"></ha-icon>
          <span class="grow">${e.t("wizard.photo_add")} <span class="muted">${e.t("wizard.photo_optional")}</span></span>${n(e.t("wizard.photo_label"))}</label>`}
      </div><div class="helper" id="photo-hint">${r}</div>${this.photoError ? b`<p class="error" role="alert">${this.photoError}</p>` : x}</div>`;
	}
	sensorPicker(e, t) {
		let n = this.l, r = this.assignedIds;
		if (G("ha-entity-picker") && this.hass) return b`<ha-entity-picker .hass=${this.hass} .label=${t} .placeholder=${n.t("wizard.search_sensors")} .value=${""} .includeDomains=${["sensor"]} .excludeEntities=${r}
        .entityFilter=${(t) => this.fits(e, t)} @value-changed=${(t) => {
			t.detail.value && this.assign(e, t.detail.value);
		}}></ha-entity-picker>`;
		let i = Object.values(this.states).filter((t) => !r.includes(t.entity_id) && this.fits(e, t)).map((e) => ({
			id: e.entity_id,
			text: `${this.friendly(e.entity_id)} · ${this.valueText(e.entity_id)}`,
			near: !!this.area && this.areaOfEntity.get(e.entity_id) === this.area
		})).sort((e, t) => e.text.localeCompare(t.text)), a = i.filter((e) => e.near), o = i.filter((e) => !e.near), s = this.knownAreas.find((e) => e.area_id === this.area)?.name, c = (e) => b`<option value=${e.id}>${e.text}</option>`;
		return b`<div class="field"><label for="sensor-${e}">${t}</label><select id="sensor-${e}" @change=${(t) => this.assign(e, t.target.value)}>
        <option value="" selected>${i.length ? n.t("wizard.choose_sensor") : n.t("wizard.no_suitable_sensors")}</option>
        ${a.length && s ? b`<optgroup label=${n.t("wizard.group_in_area", { area: s })}>${a.map(c)}</optgroup><optgroup label=${n.t("wizard.group_other")}>${o.map(c)}</optgroup>` : i.map(c)}
      </select><ha-icon class="trail" aria-hidden="true" icon="mdi:menu-down"></ha-icon></div>`;
	}
	assignedRow(e, t) {
		let n = this.l, r = this.friendly(t);
		return b`<div class="item assigned"><span class="ic" aria-hidden="true"><ha-icon .icon=${k[e].icon}></ha-icon></span>
      <div><div>${r}</div><div class="small muted">${n.t("wizard.sensor_reading", {
			role: A(n, e),
			value: this.valueText(t)
		})}</div></div>
      <button type="button" class="iconbtn" aria-label=${n.t("wizard.remove_sensor", { name: r })} @click=${() => this.unassign(e)}><ha-icon aria-hidden="true" icon="mdi:close"></ha-icon></button></div>`;
	}
	renderSensors() {
		let e = this.l, t = this.moisture.sources[0]?.entity_id, n = this.knownAreas.find((e) => e.area_id === this.area)?.name, r = this.suggestions(), i = Js.filter((e) => !this.takenRoles.has(e) && e !== this.pendingRole);
		return b`<h2 tabindex="-1">${e.t("wizard.sensors_heading")}</h2><p class="intro">${e.t("wizard.sensors_intro")}</p>
      <div class="stack">
        ${t ? this.assignedRow("moisture", t) : this.sensorPicker("moisture", e.t("wizard.moisture_sensor"))}
        ${this.extras.length ? b`<div class="rows">${this.extras.map((e) => this.assignedRow(e.role, e.entity_id))}</div>` : x}
        ${this.pendingRole ? b`<div class="item pending"><div>${this.sensorPicker(this.pendingRole, e.t("wizard.role_sensor", { role: A(e, this.pendingRole) }))}</div>
          <button type="button" class="iconbtn" aria-label=${e.t("wizard.discard_role", { role: A(e, this.pendingRole) })} @click=${() => {
			this.pendingRole = null;
		}}><ha-icon aria-hidden="true" icon="mdi:close"></ha-icon></button></div>` : x}
        ${n ? b`<h3 class="caption">${e.t("wizard.suggested", { area: n })}</h3>
          ${r.length ? b`<div class="rows">${r.map((t) => b`<div class="item sugg"><span class="ic" aria-hidden="true"><ha-icon .icon=${k[t.role].icon}></ha-icon></span>
            <div><div>${t.name}</div><div class="small muted">${e.t("wizard.sensor_reading", {
			role: A(e, t.role),
			value: this.valueText(t.entity_id)
		})}</div></div>
            <button type="button" class="btn text sm" aria-label=${e.t("wizard.add_label", { name: t.name })} @click=${() => this.assign(t.role, t.entity_id)}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${e.t("wizard.add")}</button></div>`)}</div>` : b`<p class="small muted">${e.t("wizard.no_suggestions", { area: n })}</p>`}` : x}
        ${i.length ? b`<div class="add-another">${this.renderRoleMenu(i)}<span class="small muted">${e.t("wizard.add_another_hint")}</span></div>` : x}
      </div>`;
	}
	renderRoleMenu(e) {
		let t = this.l, n = (e) => b`<button type="button" class="btn outline sm" slot=${e ? "trigger" : x} aria-expanded=${e ? x : String(this.roleMenu)} @click=${e ? x : () => {
			this.roleMenu = !this.roleMenu;
		}}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("wizard.add_another")}</button>`;
		return G("ha-dropdown") && G("ha-dropdown-item") ? b`<ha-dropdown @wa-select=${(e) => {
			let t = e.detail.item.value;
			Js.includes(t) && (this.pendingRole = t);
		}}>
        ${n(!0)}${e.map((e) => b`<ha-dropdown-item value=${e}><ha-icon slot="icon" .icon=${k[e].icon}></ha-icon>${A(t, e)}</ha-dropdown-item>`)}</ha-dropdown>` : b`${n(!1)}${this.roleMenu ? b`<div class="role-menu">${e.map((e) => b`<button type="button" class="btn outline sm" @click=${() => {
			this.pendingRole = e, this.roleMenu = !1;
		}}><ha-icon aria-hidden="true" .icon=${k[e].icon}></ha-icon>${A(t, e)}</button>`)}</div>` : x}`;
	}
	alert(e, t, n = "") {
		return G("ha-alert") ? b`<ha-alert alert-type=${e} .title=${n}>${t}</ha-alert>` : b`<div class="alert ${e}" role=${e === "warning" ? "alert" : "note"}><ha-icon aria-hidden="true" icon=${e === "warning" ? "mdi:alert-outline" : "mdi:information-outline"}></ha-icon><div>${n ? b`<b>${n}</b> ` : x}${t}</div></div>`;
	}
	expander(e, t, n, r, i) {
		let a = this.expanded.has(e);
		return G("ha-expansion-panel") ? b`<ha-expansion-panel class="expander" data-section=${e} outlined .header=${n} .secondary=${r} .expanded=${a}
        @expanded-will-change=${(t) => {
			t.target === t.currentTarget && t.detail.expanded && (this.opened = /* @__PURE__ */ new Set([...this.opened, e]));
		}}
        @expanded-changed=${(t) => {
			t.target === t.currentTarget && this.toggle(e, t.detail.expanded);
		}}>
        <ha-icon slot="leading-icon" aria-hidden="true" .icon=${t}></ha-icon>
        ${a || this.opened.has(e) ? b`<div class="expander-body">${i()}</div>` : x}</ha-expansion-panel>` : b`<details class="expander" data-section=${e} ?open=${a} @toggle=${(t) => {
			let n = t.currentTarget.open;
			n !== a && this.toggle(e, n);
		}}>
      <summary><ha-icon aria-hidden="true" .icon=${t}></ha-icon><span class="summary-text"><span class="summary-title">${n}</span><span class="summary-sub">${r}</span></span><ha-icon aria-hidden="true" icon=${a ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon></summary>
      ${a ? b`<div class="expander-body">${i()}</div>` : x}</details>`;
	}
	renderReview() {
		let e = this.l, t = this.moisture.sources[0]?.entity_id, n = this.area ? this.knownAreas.find((e) => e.area_id === this.area)?.name ?? e.t("area.missing_option", { area: this.area }) : e.t("wizard.no_area"), r = this.defaults, i = (e) => this.moisture.threshold_overrides[e] ?? r[e], a = this.accepted && this.preview ? this.preview.snapshot.latin_name ?? this.preview.snapshot.common_name : [this.common.trim(), this.latin.trim()].filter(Boolean).join(" · "), o = this.accepted && a ? e.t("wizard.species_summary_accepted", { species: a }) : a ? e.t("wizard.species_summary_manual", {
			species: a,
			min: e.percent(i("min")),
			max: e.percent(i("max"))
		}) : e.t("wizard.species_summary_default", {
			min: e.percent(i("min")),
			max: e.percent(i("max"))
		});
		return b`<h2 tabindex="-1">${e.t("wizard.review_heading")}</h2><p class="intro" style="margin-bottom:8px">${e.t("wizard.review_intro")}</p>
      <div class="review">
        <div class="li"><span class="ic" aria-hidden="true"><ha-icon icon="mdi:sprout"></ha-icon></span><div><div class="p">${this.name.trim()}</div><div class="s">${n}${this.photo ? ` · ${e.t("wizard.with_photo")}` : ""}</div></div>
          <button type="button" class="btn text sm" aria-label=${e.t("wizard.edit_plant")} @click=${() => void this.go(1)}>${e.t("wizard.edit")}</button></div>
        <div class="li"><span class="ic" aria-hidden="true"><ha-icon icon="mdi:access-point"></ha-icon></span><div><div class="p">${t ? this.friendly(t) : e.t("wizard.no_moisture")}</div><div class="s">${this.extras.length ? this.extras.map((e) => this.friendly(e.entity_id)).join(", ") : e.t("wizard.no_other_sensors")}</div></div>
          <button type="button" class="btn text sm" aria-label=${e.t("wizard.edit_sensors")} @click=${() => void this.go(2)}>${e.t("wizard.edit")}</button></div>
      </div>
      ${t ? x : b`<div style="margin-top:6px">${this.alert("warning", e.t("wizard.no_moisture_warning"))}</div>`}
      <div class="sections">
        ${this.expander("species", "mdi:leaf", e.t("wizard.species_section"), o, () => this.renderSpecies())}
        ${this.expander("details", "mdi:tag-outline", e.t("wizard.details_section"), e.t("wizard.details_summary"), () => this.renderDetails())}
      </div>`;
	}
	renderSpecies() {
		let e = this.l, t = this.providerInfo, n = this.defaults, r = I.some((e) => this.moisture.threshold_overrides[e] !== null), i = {
			min: e.t("wizard.target_min"),
			target: e.t("wizard.target_ideal"),
			max: e.t("wizard.target_max")
		};
		return b`${t?.available ? this.accepted && this.preview ? b`<div class="species-chip"><ha-icon aria-hidden="true" icon="mdi:leaf"></ha-icon>
        <div class="grow"><div><i>${this.preview.snapshot.latin_name}</i>${this.commonName(this.preview.snapshot) ? ` · ${this.commonName(this.preview.snapshot)}` : ""}</div><div class="small muted">${this.preview.snapshot.attribution}</div></div>
        <button type="button" class="btn text sm" @click=${() => this.manual()}>${e.t("wizard.remove_species")}</button></div>` : b`<div class="search"><label class="field">${e.t("wizard.species_search")}<input type="search" autocomplete="off" aria-describedby="search-hint" .value=${this.query}
          @input=${(e) => {
			this.query = e.target.value, this.generation++, this.results = [], this.searched = !1, this.preview = null, this.accepted = !1;
		}}
          @keydown=${(e) => {
			e.key === "Enter" && (e.preventDefault(), this.search());
		}}></label>
          <button type="button" class="btn outline" ?disabled=${this.busy || this.query.trim().length < 3} @click=${() => void this.search()}><ha-icon aria-hidden="true" icon="mdi:magnify"></ha-icon>${e.t("wizard.search_button")}</button></div>
        <span class="helper" id="search-hint" style="padding-top:0;margin-top:-8px">${e.t("wizard.search_hint")}</span>
        ${this.speciesError ? b`<p class="error" role="alert">${this.speciesError}</p><button type="button" class="btn text sm flush" @click=${() => this.manual()}>${e.t("common.continue_manually")}</button>` : x}
        ${this.searched && !this.results.length ? b`<p class="small muted">${e.t("wizard.no_matches")}</p>` : x}
        ${this.results.length && !this.preview ? b`<ul class="results" aria-label=${e.t("wizard.results")}>${this.results.map((e) => b`<li><button type="button" @click=${() => void this.choose(e)}>${e.common_name ?? e.latin_name} · ${e.latin_name}</button><small>${e.attribution}</small></li>`)}</ul>` : x}
        ${this.preview ? b`<div class="preview">${Ji(e, this.preview.snapshot)}</div>
          <label class="check"><input type="checkbox" .checked=${this.accepted} @change=${(e) => {
			this.accepted = e.target.checked, this.error = "";
		}}>${e.t("wizard.accept_species")}</label>
          <button type="button" class="btn text sm flush" @click=${() => this.manual()}>${e.t("wizard.remove_species")}</button>` : x}` : t ? this.alert("info", b`${e.t("wizard.provider_unavailable_body")}<span class="alert-links"><a href=${Ys} @click=${(e) => {
			e.preventDefault(), history.pushState(null, "", Ys), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !1 } }));
		}}>${e.t("wizard.open_options")}</a><a href=${Xs} target="_blank" rel="noreferrer">${e.t("wizard.openplantbook_credentials_link")}</a></span>`, e.t("wizard.provider_unavailable_title")) : x}
      ${this.accepted || this.preview ? x : b`<h3>${e.t("wizard.manual_species")}</h3><div class="two">
        <label class="field">${e.t("species.common_name")}<input maxlength="200" .value=${this.common} @input=${(e) => {
			this.common = e.target.value;
		}}></label>
        <label class="field">${e.t("species.scientific_name")}<input maxlength="200" .value=${this.latin} @input=${(e) => {
			this.latin = e.target.value;
		}}></label></div>`}
      <fieldset class="thr"><legend>${e.t("wizard.targets_label")}</legend>
        ${I.map((e) => b`<div class="field"><label for="target-${e}">${i[e]}</label><span class="suffix"><input id="target-${e}" type="number" min="1" max="99" step="1" inputmode="numeric" .value=${String(this.moisture.threshold_overrides[e] ?? n[e])}
          @input=${(t) => this.setOverride(e, t.target.value)}
          @change=${(t) => {
			let r = t.target;
			r.value.trim() || (r.value = String(n[e]));
		}}><span aria-hidden="true">%</span></span></div>`)}
      </fieldset>
      <p class="helper" style="padding:0">${this.accepted ? e.t("wizard.targets_species") : e.t("wizard.targets_default")}</p>
      ${r ? b`<button type="button" class="btn text sm flush" @click=${() => {
			this.moisture = {
				...this.moisture,
				threshold_overrides: {
					min: null,
					target: null,
					max: null
				}
			};
		}}>${e.t("wizard.targets_reset")}</button>` : x}`;
	}
	renderDetails() {
		let e = this.l, t = this.hass?.locale?.language ?? this.hass?.language ?? e.language, n = G("ha-selector") && this.hass ? b`<ha-selector .hass=${this.hass} .selector=${{ date: {} }} .label=${e.t("wizard.acquired_date")} .value=${this.acquired || void 0} .required=${!1} @value-changed=${(e) => {
			this.acquired = e.detail.value ?? "";
		}}></ha-selector>` : b`<label class="field">${e.t("wizard.acquired_date")}<input type="date" lang=${t} .value=${this.acquired} @input=${(e) => {
			this.acquired = e.target.value;
		}}></label>`, r = (e) => e.charAt(0).toLocaleUpperCase(t) + e.slice(1);
		return b`<div class="two">
      ${n}
      <div class="field"><label for="placement">${e.t("placement.label")}</label><select id="placement" @change=${(e) => {
			this.placement = e.target.value;
		}}>
        <option value="" ?selected=${!this.placement}>${e.t("common.not_specified")}</option>
        ${Qn.map((t) => b`<option value=${t} ?selected=${t === this.placement}>${r(Ii(e, t))}</option>`)}</select><ha-icon class="trail" aria-hidden="true" icon="mdi:menu-down"></ha-icon></div>
      <label class="field">${e.t("taxonomy.category")}<input maxlength="60" .value=${this.category} @input=${(e) => {
			this.category = e.target.value;
		}}></label>
      <div><label class="field">${e.t("wizard.tags")}<input maxlength="2000" aria-describedby="tags-hint" .value=${this.tagText} @input=${(e) => {
			this.tagText = e.target.value;
		}}></label><div class="helper" id="tags-hint">${e.t("wizard.tags_hint")}</div></div>
    </div>`;
	}
	renderDone() {
		let e = this.l, t = this.created, n = this.area ? this.knownAreas.find((e) => e.area_id === this.area)?.name : void 0;
		return b`<div class="wz" lang=${e.language}><div class="card done">
      <div class="big" aria-hidden="true"><ha-icon icon="mdi:check"></ha-icon></div>
      <h2 tabindex="-1">${e.t("wizard.done_heading", { name: t.name })}</h2>
      <p>${n ? e.t("wizard.done_body_area", { area: n }) : e.t("wizard.done_body")}</p>
      <p class="small" role="status">${this.photoStatus}</p>
      <div class="row"><button type="button" class="btn filled" @click=${() => this.dispatchEvent(new CustomEvent("wizard-open-plant", {
			detail: { plantId: t.id },
			bubbles: !0,
			composed: !0
		}))}>${e.t("wizard.open_plant")}</button>
        <button type="button" class="btn outline" @click=${() => this.emit("wizard-close")}>${e.t("wizard.back_to_plants")}</button>
        <button type="button" class="btn outline" ?disabled=${this.blocked} @click=${() => this.restart()}>${e.t("wizard.add_another_plant")}</button></div>
    </div></div>`;
	}
};
Ks = X, Ks.styles = [
	V,
	Yi,
	o`
    :host { display: block; container-type: inline-size; color: var(--sp-text);
      --sp-primary-strong: color-mix(in srgb, var(--sp-primary) 78%, #000);
      /* Secondary text a little darker than the theme's so it keeps 4.5:1 on tinted rows and filled fields. */
      --wz-muted: color-mix(in srgb, var(--sp-text-secondary) 78%, var(--sp-text));
      --wz-divider: var(--divider-color, #e0e0e0);
      --wz-card: var(--ha-card-background, var(--card-background-color, #fff));
      --wz-fill: var(--input-fill-color, color-mix(in srgb, var(--sp-text) 5%, var(--wz-card)));
      --wz-tonal: color-mix(in srgb, var(--sp-primary) 12%, transparent);
      --wz-tonal-fg: color-mix(in srgb, var(--sp-primary) 65%, var(--sp-text));
      --wz-off: color-mix(in srgb, var(--sp-text) 7%, transparent); }
    * { box-sizing: border-box; }
    button, input, select { font: inherit; color: inherit; }
    :focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
    h2[tabindex]:focus { outline: none; }
    ha-icon { --mdc-icon-size: 20px; flex: none; }
    p { margin: 0; }
    .wz { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; hyphens: auto; overflow-wrap: anywhere; }
    .stepline { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--wz-muted); }
    .stepline b { color: var(--sp-text); font-weight: 500; }
    .bars { display: flex; gap: 8px; }
    .bars span { flex: 1; height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--sp-text) 10%, transparent); }
    .bars span.on { background: var(--sp-primary); }
    .card { background: var(--wz-card); border: 1px solid var(--ha-card-border-color, var(--wz-divider)); border-radius: var(--ha-card-border-radius, 12px); padding: 20px; }
    h2 { font-size: 22px; font-weight: 400; line-height: 1.25; margin: 0 0 4px; }
    .intro { color: var(--wz-muted); margin: 0 0 16px; }
    .stack { display: flex; flex-direction: column; gap: 14px; }
    .muted { color: var(--wz-muted); }
    .small { font-size: 12.5px; }

    /* Filled text fields in the style of Home Assistant's inputs. */
    .field { position: relative; display: block; min-height: 56px; padding: 7px 12px 0; border-radius: 4px 4px 0 0; background: var(--wz-fill);
      border-bottom: 1px solid var(--input-idle-line-color, #8a8a8a); font-size: 12px; color: var(--wz-muted); cursor: text; }
    .field:focus-within { border-bottom: 2px solid var(--sp-primary); color: color-mix(in srgb, var(--sp-primary) 70%, var(--sp-text)); }
    .field input, .field select { display: block; width: 100%; min-height: 32px; margin: 0; padding: 2px 0 6px; border: 0; background: transparent; outline: none; font-size: 16px; color: var(--sp-text); }
    .field select { appearance: none; padding-inline-end: 28px; cursor: pointer; }
    .field select option, .field select optgroup { color: var(--sp-text); background: var(--wz-card); }
    .field .trail { position: absolute; inset-inline-end: 10px; top: 18px; color: var(--wz-muted); pointer-events: none; }
    .field .suffix { display: flex; align-items: center; gap: 4px; font-size: 16px; color: var(--sp-text); }
    .field .suffix input { flex: 1; min-width: 0; }
    .field > label { display: block; cursor: inherit; }
    .helper { font-size: 12px; color: var(--wz-muted); padding: 4px 12px 0; }
    ha-area-picker, ha-entity-picker, ha-selector { display: block; }

    /* One compact row; the hint or upload note sits below it like a field helper. */
    .drop { display: flex; align-items: center; gap: 10px; min-height: 48px; padding-block: 4px; padding-inline: 12px 4px; border: 1.5px dashed var(--wz-divider); border-radius: 12px; }
    .drop.has { border-style: solid; padding-inline-start: 6px; }
    .drop.over { border-color: var(--sp-primary); background: var(--wz-tonal); }
    .drop:not(.has):focus-within, .drop .pick:focus-within { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
    .drop > label { display: flex; align-items: center; gap: 10px; flex: 1; align-self: stretch; cursor: pointer; }
    .drop ha-icon { --mdc-icon-size: 22px; color: var(--wz-tonal-fg); flex: none; }
    .drop .grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .drop .pick { cursor: pointer; }
    .drop img { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; flex: none; }

    .caption { margin: 6px 0 0; font-size: 12px; font-weight: 400; letter-spacing: .05em; text-transform: uppercase; color: var(--wz-muted); }
    .rows { display: flex; flex-direction: column; gap: 8px; }
    .item { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 10px; }
    .item.sugg { border: 1px solid var(--wz-divider); }
    .item.assigned { background: var(--wz-tonal); }
    .item .ic { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--wz-off); color: var(--wz-muted); }
    .item.assigned .ic { background: var(--wz-card); color: var(--wz-tonal-fg); }
    .item.pending { grid-template-columns: minmax(0, 1fr) auto; padding: 0; }
    .add-another { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
    .role-menu { display: flex; flex-wrap: wrap; gap: 6px; }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; padding: 0 18px; border: 0; border-radius: 20px; cursor: pointer;
      font-size: 14px; font-weight: 500; white-space: nowrap; background: transparent; color: var(--wz-tonal-fg); text-decoration: none; }
    .btn ha-icon { --mdc-icon-size: 18px; }
    .btn.filled { background: var(--sp-primary-strong); color: var(--text-primary-color, #fff); }
    .btn.text { padding: 0 12px; }
    .btn.text:hover:not(:disabled) { background: color-mix(in srgb, var(--sp-primary) 10%, transparent); }
    .btn.outline { border: 1px solid var(--wz-divider); }
    .btn.sm { min-height: 32px; padding: 0 14px; font-size: 13px; }
    .btn.flush { padding: 0; min-height: 32px; align-self: flex-start; }
    .btn:disabled { opacity: .5; cursor: default; }
    .iconbtn { width: 40px; height: 40px; display: inline-grid; place-items: center; border: 0; border-radius: 50%; background: transparent; cursor: pointer; color: var(--sp-text); }
    .iconbtn:hover { background: color-mix(in srgb, var(--sp-text) 6%, transparent); }

    .actions { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .actions .end { display: flex; gap: 10px; margin-inline-start: auto; }

    .review { display: flex; flex-direction: column; }
    .li { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 0; min-height: 60px; }
    .li + .li { border-top: 1px solid var(--wz-divider); }
    .li .ic { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--wz-tonal); color: var(--wz-tonal-fg); }
    .li .p { font-size: 15px; }
    .li .s { font-size: 13px; color: var(--wz-muted); }
    .sections { display: flex; flex-direction: column; gap: 14px; margin-top: 12px; }

    .expander { display: block; border-radius: 12px; background: var(--wz-card); --expansion-panel-summary-padding: 4px 16px; --expansion-panel-content-padding: 0 16px; }
    ha-expansion-panel.expander .expander-body { padding: 12px 0 16px; }
    details.expander { border: 1px solid var(--wz-divider); }
    details.expander > summary { display: flex; align-items: center; gap: 14px; padding: 12px 16px; min-height: 56px; cursor: pointer; list-style: none; }
    details.expander > summary::-webkit-details-marker { display: none; }
    .summary-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .summary-title { font-weight: 500; }
    .summary-sub { font-size: 12.5px; color: var(--wz-muted); }
    details.expander > .expander-body { padding: 0 16px 16px; }
    .expander-body { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
    .expander-body h3 { margin: 4px 0 0; font-size: 14px; font-weight: 500; }
    .thr { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; border: 0; margin: 0; padding: 0; min-width: 0; }
    .thr legend { padding: 0; margin-bottom: 8px; font-size: 14px; font-weight: 500; }
    .two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: start; }
    .search { display: flex; gap: 10px; align-items: flex-start; }
    .search .field { flex: 1; }
    .search .btn { margin-top: 8px; }
    .results { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .results li { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border: 1px solid var(--wz-divider); border-radius: 10px; }
    .results li:hover { border-color: var(--sp-primary); }
    .results button { text-align: start; padding: 0; border: 0; background: transparent; cursor: pointer; font-weight: 500; color: var(--wz-tonal-fg); }
    .results small { color: var(--wz-muted); font-size: 12px; }
    .preview { border: 1px solid var(--wz-divider); border-radius: 10px; padding: 12px 14px; }
    .preview article { display: flex; flex-direction: column; gap: 6px; }
    .preview h3, .preview h4 { margin: 4px 0 0; font-size: 14px; font-weight: 500; }
    .preview dl { display: grid; grid-template-columns: minmax(90px, 1fr) 2fr; gap: 2px 12px; margin: 0; font-size: 13px; }
    .preview dt { color: var(--wz-muted); }
    .preview dd { margin: 0; }
    .preview details > summary { cursor: pointer; font-size: 13px; color: var(--primary-color); padding: 4px 0; }
    .preview details[open] > summary { margin-bottom: 6px; }
    .preview .muted { color: var(--wz-muted); }
    .check { display: flex; align-items: center; gap: 10px; font-weight: 500; cursor: pointer; }
    .check input { width: 20px; height: 20px; margin: 0; accent-color: var(--sp-primary-strong); }
    .species-chip { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; background: var(--wz-tonal); }
    .species-chip .grow { flex: 1; min-width: 0; }

    ha-alert { display: block; }
    .alert { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 8px; font-size: 13.5px; color: var(--sp-text); }
    .alert.warning { background: color-mix(in srgb, var(--sp-warning) 18%, transparent); }
    .alert.info { background: color-mix(in srgb, var(--sp-info) 14%, transparent); }
    .alert.warning > ha-icon { color: color-mix(in srgb, var(--sp-warning) 60%, var(--sp-text)); }
    .alert.info > ha-icon { color: color-mix(in srgb, var(--sp-info) 60%, var(--sp-text)); }
    .alert b { font-weight: 500; }
    .alert-links { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 6px; }
    .alert-links a, a.link { color: var(--wz-tonal-fg); font-weight: 500; }
    .error { padding: 12px 14px; border-radius: 8px; border-inline-start: 4px solid var(--sp-error); background: color-mix(in srgb, var(--sp-error) 8%, transparent); color: var(--sp-text); }
    .notice { padding: 12px 14px; border-radius: 8px; border-inline-start: 4px solid var(--sp-warning); background: color-mix(in srgb, var(--sp-warning) 10%, transparent); }
    .status:empty { display: none; }

    .done { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 36px 20px; text-align: center; }
    .done .big { width: 72px; height: 72px; border-radius: 50%; display: grid; place-items: center;
      background: color-mix(in srgb, var(--sp-success) 16%, transparent); color: color-mix(in srgb, var(--sp-success) 55%, var(--sp-text)); }
    .done .big ha-icon { --mdc-icon-size: 40px; }
    .done h2 { margin: 6px 0 0; }
    .done p { max-width: 46ch; color: var(--wz-muted); }
    .done .row { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 8px; }

    @container (max-width: 600px) {
      .stepline .all { display: none; }
      .card { padding: 16px; }
      .thr, .two { grid-template-columns: minmax(0, 1fr); }
      /* The action row stays reachable at the bottom of the screen while the step scrolls. */
      .actions { position: sticky; bottom: 0; z-index: 2; padding: 10px 0 calc(10px + env(safe-area-inset-bottom, 0px)); background: var(--primary-background-color, var(--wz-card)); }
    }
  `
], H([C({ attribute: !1 })], X.prototype, "hass", void 0), H([C({ attribute: !1 })], X.prototype, "capabilities", void 0), H([C({ attribute: !1 })], X.prototype, "areas", void 0), H([C({ attribute: !1 })], X.prototype, "entities", void 0), H([C({ attribute: !1 })], X.prototype, "devices", void 0), H([C({ attribute: !1 })], X.prototype, "states", void 0), H([C({ type: Boolean })], X.prototype, "blocked", void 0), H([C({ type: Number })], X.prototype, "navigationContext", void 0), H([C()], X.prototype, "photoStatus", void 0), H([w()], X.prototype, "step", void 0), H([w()], X.prototype, "busy", void 0), H([w()], X.prototype, "error", void 0), H([w()], X.prototype, "name", void 0), H([w()], X.prototype, "area", void 0), H([w()], X.prototype, "photo", void 0), H([w()], X.prototype, "photoUrl", void 0), H([w()], X.prototype, "photoError", void 0), H([w()], X.prototype, "photoChecking", void 0), H([w()], X.prototype, "dragging", void 0), H([w()], X.prototype, "moisture", void 0), H([w()], X.prototype, "extras", void 0), H([w()], X.prototype, "pendingRole", void 0), H([w()], X.prototype, "roleMenu", void 0), H([w()], X.prototype, "expanded", void 0), H([w()], X.prototype, "opened", void 0), H([w()], X.prototype, "query", void 0), H([w()], X.prototype, "results", void 0), H([w()], X.prototype, "searched", void 0), H([w()], X.prototype, "preview", void 0), H([w()], X.prototype, "accepted", void 0), H([w()], X.prototype, "speciesError", void 0), H([w()], X.prototype, "common", void 0), H([w()], X.prototype, "latin", void 0), H([w()], X.prototype, "acquired", void 0), H([w()], X.prototype, "placement", void 0), H([w()], X.prototype, "category", void 0), H([w()], X.prototype, "tagText", void 0), H([w()], X.prototype, "draft", void 0), H([w()], X.prototype, "finalRequest", void 0), H([w()], X.prototype, "rejected", void 0), H([w()], X.prototype, "created", void 0), customElements.get("smart-plants-wizard") || customElements.define("smart-plants-wizard", X);
function Zs(e) {
	let t = e.find((e) => e.platform === "smart_plants" && e.unique_id === "smart_plants:all_plants");
	return t && !t.disabled_by ? t.entity_id : null;
}
var Qs = [
	0,
	15,
	30,
	60,
	120
], $s = "smart_plants_", ec = [
	"needs_water",
	"problems",
	"care_tasks"
], tc = /* @__PURE__ */ new Set([
	"send_message",
	"notify",
	"persistent_notification"
]), nc = new Uint32Array([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
function rc(e) {
	let t = new TextEncoder().encode(e), n = Math.ceil((t.length + 9) / 64) * 64, r = new Uint8Array(n);
	r.set(t), r[t.length] = 128;
	let i = new DataView(r.buffer);
	i.setUint32(n - 8, Math.floor(t.length / 536870912)), i.setUint32(n - 4, t.length * 8);
	let a = new Uint32Array([
		1779033703,
		3144134277,
		1013904242,
		2773480762,
		1359893119,
		2600822924,
		528734635,
		1541459225
	]), o = /* @__PURE__ */ new Uint32Array(64), s = (e, t) => e >>> t | e << 32 - t;
	for (let e = 0; e < n; e += 64) {
		for (let t = 0; t < 16; t++) o[t] = i.getUint32(e + t * 4);
		for (let e = 16; e < 64; e++) {
			let t = s(o[e - 15], 7) ^ s(o[e - 15], 18) ^ o[e - 15] >>> 3, n = s(o[e - 2], 17) ^ s(o[e - 2], 19) ^ o[e - 2] >>> 10;
			o[e] = o[e - 16] + t + o[e - 7] + n;
		}
		let [t, n, r, c, l, u, d, f] = [...a];
		for (let e = 0; e < 64; e++) {
			let i = f + (s(l, 6) ^ s(l, 11) ^ s(l, 25)) + (l & u ^ ~l & d) + nc[e] + o[e] >>> 0, a = (s(t, 2) ^ s(t, 13) ^ s(t, 22)) + (t & n ^ t & r ^ n & r) >>> 0;
			f = d, d = u, u = l, l = c + i >>> 0, c = r, r = n, n = t, t = i + a >>> 0;
		}
		[
			t,
			n,
			r,
			c,
			l,
			u,
			d,
			f
		].forEach((e, t) => {
			a[t] = a[t] + e;
		});
	}
	return [...a].map((e) => e.toString(16).padStart(8, "0")).join("");
}
function ic(e, t) {
	let n = `${$s}${e}`;
	return t ? `${n}_${rc([...t].sort().join(",")).slice(0, 8)}` : n;
}
var ac = (e) => `${e.slice(0, 5)}:00`, oc = (e) => e % 60 == 0 ? { hours: e / 60 } : { minutes: e };
function sc(e, t) {
	if (t === 0) return e.t("notifications.delay_none");
	let n = t % 60 == 0;
	return new Intl.NumberFormat(e.language, {
		style: "unit",
		unit: n ? "hour" : "minute",
		unitDisplay: "long"
	}).format(n ? t / 60 : t);
}
function cc(e, t, n, r) {
	switch (e.kind) {
		case "entity": return {
			action: "notify.send_message",
			target: { entity_id: e.entityId },
			data: {
				title: n,
				message: r
			}
		};
		case "service": return {
			action: `notify.${e.service}`,
			data: {
				title: n,
				message: r
			}
		};
		case "persistent": return {
			action: "persistent_notification.create",
			data: {
				title: n,
				message: r,
				notification_id: t === "needs_water" ? `${$s}${t}_{{ trigger.device_id }}` : `${$s}${t}`
			}
		};
	}
}
function lc(e, t) {
	let n = ic(e.kind, e.plantDeviceIds), r = e.plantDeviceIds ? { target: { device_id: [...e.plantDeviceIds].sort() } } : e.allPlantsEntityId ? { target: { entity_id: [e.allPlantsEntityId] } } : {};
	return e.kind === "daily_report" ? {
		alias: t.t("notifications.alias_daily"),
		description: t.t("notifications.description_daily"),
		mode: "single",
		triggers: [{
			trigger: "time",
			at: ac(e.time),
			id: n
		}],
		conditions: [{
			condition: "smart_plants.needs_attention",
			...r,
			options: {
				include: [...ec],
				include_snoozed: !1
			}
		}],
		actions: [{
			action: "smart_plants.get_report",
			...r,
			data: {
				include: [...ec],
				include_snoozed: !1,
				language: t.language
			},
			response_variable: "report"
		}, cc(e.target, e.kind, "{{ report.title }}", "{{ report.message }}")]
	} : {
		alias: t.t("notifications.alias_water"),
		description: e.delayMinutes ? t.t("notifications.description_water", { delay: sc(t, e.delayMinutes) }) : t.t("notifications.description_water_now"),
		mode: "queued",
		max: 20,
		triggers: [{
			trigger: "smart_plants.needs_water",
			id: n,
			...r,
			options: {
				behavior: "each",
				...e.delayMinutes ? { for: oc(e.delayMinutes) } : {},
				include_snoozed: !1
			}
		}],
		...e.quiet ? { conditions: [{
			condition: "not",
			conditions: [{
				condition: "time",
				after: ac(e.quiet.from),
				before: ac(e.quiet.to)
			}]
		}] } : {},
		actions: [cc(e.target, e.kind, t.t("notifications.msg_water_title", { plant: "{{ trigger.plant }}" }), t.t("notifications.msg_water_body"))]
	};
}
function uc(e, t) {
	let n = (e, t) => e.label.localeCompare(t.label), r = Object.values(e).filter((e) => e.entity_id.startsWith("notify.")).map((e) => ({
		kind: "entity",
		entityId: e.entity_id,
		label: typeof e.attributes.friendly_name == "string" && e.attributes.friendly_name ? e.attributes.friendly_name : e.entity_id
	})).sort(n), i = Object.keys(t?.notify ?? {}).filter((e) => !tc.has(e)).map((e) => ({
		kind: "service",
		service: e,
		label: e
	})).sort(n);
	return [
		...r,
		...i,
		{ kind: "persistent" }
	];
}
function dc(e) {
	return e.kind === "entity" ? `entity:${e.entityId}` : e.kind === "service" ? `service:${e.service}` : "persistent";
}
function fc(e) {
	if (!e || typeof e != "object") return null;
	let t = e.triggers ?? e.trigger, n = Array.isArray(t) ? t : t ? [t] : [];
	for (let e of n) {
		let t = e && typeof e == "object" ? e.id : void 0;
		if (typeof t == "string" && t.startsWith("smart_plants_")) return t;
	}
	return null;
}
async function pc(e, t, n = 8) {
	let r = Array(t.length).fill(null), i = 0;
	return await Promise.all(Array.from({ length: Math.min(n, t.length) }, async () => {
		for (; i < t.length;) {
			let n = i++, a = t[n];
			try {
				let t = fc((await e.connection.sendMessagePromise({
					type: "automation/config",
					entity_id: a
				}))?.config);
				t && (r[n] = {
					entityId: a,
					marker: t
				});
			} catch {}
		}
	})), r.filter((e) => e !== null);
}
function mc(e, t, n) {
	let r = location.href;
	e.dispatchEvent(new CustomEvent("hass-automation-editor", {
		detail: { data: t },
		bubbles: !0,
		composed: !0
	})), requestAnimationFrame(() => {
		location.href === r && (history.pushState(null, "", "/config/automation/edit/new"), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !1 } })), n());
	});
}
//#endregion
//#region src/views/notifications.ts
var hc, Z = class extends S {
	constructor(...e) {
		super(...e), this.plants = [], this.devices = [], this.entities = [], this.states = {}, this._draft = {
			kind: "daily_report",
			time: "08:00",
			delayMinutes: 30,
			quiet: !1,
			quietFrom: "22:00",
			quietTo: "07:00",
			allPlants: !0,
			plantIds: /* @__PURE__ */ new Set(),
			target: "",
			error: ""
		}, this._found = [], this._toggling = /* @__PURE__ */ new Set(), this._request = 0, this._unsubscribe = null;
	}
	connectedCallback() {
		super.connectedCallback(), this._load();
		let e = this.hass;
		e?.connection.subscribeEvents?.(() => void this._load(), "automation_reloaded").then((t) => {
			this.isConnected && this.hass === e ? this._unsubscribe = t : t();
		}).catch(() => void 0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._request++, this._unsubscribe?.(), this._unsubscribe = null;
	}
	firstUpdated() {
		let e = this.shadowRoot?.querySelector("dialog");
		e && !e.open && e.showModal(), this.shadowRoot?.querySelector("h2")?.focus();
	}
	updated() {
		let e = this.shadowRoot?.querySelector("#water-delay");
		e && (e.value = String(this._draft.delayMinutes));
		let t = this.shadowRoot?.querySelector("#send-to"), n = this._targets();
		t && (t.value = dc(n.find((e) => dc(e) === this._draft.target) ?? n[0]));
	}
	async _load() {
		let e = this.hass;
		if (!e) return;
		let t = ++this._request, n = await pc(e, Object.keys(this.states).filter((e) => e.startsWith("automation.")).sort());
		t === this._request && (this._found = n);
	}
	_close() {
		this.shadowRoot?.querySelector("dialog")?.close(), this.dispatchEvent(new CustomEvent("notifications-close"));
	}
	_trapFocus(e) {
		if (e.key !== "Tab") return;
		let t = [...e.currentTarget.querySelectorAll("button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])")], n = t[0], r = t.at(-1), i = this.shadowRoot?.activeElement;
		e.shiftKey && (i === n || i?.matches("#notifications-title")) ? (e.preventDefault(), r?.focus()) : !e.shiftKey && i === r && (e.preventDefault(), n?.focus());
	}
	_edit(e) {
		this._draft = {
			...this._draft,
			error: "",
			...e
		};
	}
	_targets() {
		return uc(this.states, this.hass?.services);
	}
	_choosable() {
		return this.plants.map((e) => ({
			id: e.id,
			name: e.name,
			deviceId: R(e, this.devices)?.id ?? ""
		})).filter((e) => e.deviceId).sort((e, t) => e.name.localeCompare(t.name));
	}
	_deviceIds() {
		return this._draft.allPlants ? null : this._choosable().filter((e) => this._draft.plantIds.has(e.id)).map((e) => e.deviceId);
	}
	_open() {
		let e = this._draft, t = this._deviceIds();
		if (t && !t.length) {
			this._edit({ error: this.l.t("notifications.error_no_plants") }), this.updateComplete.then(() => this.shadowRoot?.querySelector(".plant-choices input")?.focus());
			return;
		}
		let n = this._targets(), r = n.find((t) => dc(t) === e.target) ?? n[0], i = lc({
			kind: e.kind,
			time: e.time,
			delayMinutes: e.delayMinutes,
			quiet: e.kind === "needs_water" && e.quiet ? {
				from: e.quietFrom,
				to: e.quietTo
			} : null,
			plantDeviceIds: t,
			allPlantsEntityId: Zs(this.entities),
			target: r
		}, this.l), a = this.l, o = this.getRootNode().host ?? this, s = (e) => o.dispatchEvent(new CustomEvent("hass-notification", {
			bubbles: !0,
			composed: !0,
			detail: {
				message: e,
				duration: 8e3
			}
		}));
		mc(this, i, () => s(a.t("notifications.editor_fallback"))), this._close();
	}
	_link(e) {
		e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.preventDefault(), history.pushState(null, "", e.currentTarget.getAttribute("href")), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !1 } })), this._close());
	}
	async _toggle(e, t) {
		let n = this.hass;
		if (n && !this._toggling.has(e)) {
			this._toggling = /* @__PURE__ */ new Set([...this._toggling, e]);
			try {
				await n.connection.sendMessagePromise({
					type: "call_service",
					domain: "automation",
					service: t ? "turn_on" : "turn_off",
					target: { entity_id: e }
				});
			} catch {
				this.requestUpdate();
			} finally {
				let t = new Set(this._toggling);
				t.delete(e), this._toggling = t;
			}
		}
	}
	_renderExisting() {
		let e = this.l, t = this._found.map((e) => ({
			...e,
			state: this.states[e.entityId]
		})).filter((e) => e.state);
		return t.length ? b`<section class="existing" aria-labelledby="notifications-existing">
      <h3 id="notifications-existing">${e.t("notifications.existing")}</h3>
      <ul class="notify-list">${t.map(({ entityId: t, state: n }) => {
			let r = typeof n.attributes.friendly_name == "string" && n.attributes.friendly_name ? n.attributes.friendly_name : t, i = n.attributes.last_triggered, a = n.attributes.id, o = typeof i == "string" && i ? e.t("notifications.last_sent", { time: Rt(e, i) }) : e.t("notifications.never_sent");
			return b`<li>
          <input class="switch" type="checkbox" role="switch" aria-label=${r} aria-describedby=${`sent-${t}`} .checked=${n.state === "on"} ?disabled=${this._toggling.has(t) || n.state === "unavailable"}
            @change=${(e) => void this._toggle(t, e.target.checked)}>
          <span class="row-text"><span>${r}</span><span class="small muted" id=${`sent-${t}`}>${o}</span></span>
          ${typeof a == "string" && a ? b`<a href=${`/config/automation/edit/${encodeURIComponent(a)}`} @click=${(e) => this._link(e)} aria-label=${e.t("notifications.edit_label", { name: r })}>${e.t("notifications.edit")}</a>` : b`<span></span>`}
        </li>`;
		})}</ul></section>` : x;
	}
	render() {
		let e = this.l, t = this._draft, n = this._targets(), r = n.filter((e) => e.kind === "entity"), i = n.filter((e) => e.kind === "service"), a = n.find((e) => dc(e) === t.target) ?? n[0], o = this._choosable(), s = this._deviceIds(), c = (!s || s.length > 0) && this._found.some((e) => e.marker === ic(t.kind, s) && this.states[e.entityId]), l = (e, t) => b`<option value=${dc(e)} ?selected=${dc(e) === dc(a)}>${t}</option>`;
		return b`<dialog class="care-dialog notifications-dialog" aria-labelledby="notifications-title" aria-describedby="notifications-intro" @cancel=${(e) => {
			e.preventDefault(), this._close();
		}} @keydown=${(e) => this._trapFocus(e)}>
      <h2 id="notifications-title" tabindex="-1">${e.t("notifications.title")}</h2>
      <div class="dialog-body">
        <p class="muted hint" id="notifications-intro">${e.t("notifications.intro")}</p>
        ${this._renderExisting()}
        <fieldset class="choices"><legend class="field-label">${e.t("notifications.kind")}</legend>
          <div class="preset">
            <label class="check"><input type="radio" name="notification-kind" value="daily_report" .checked=${t.kind === "daily_report"} aria-describedby="daily-help" @change=${() => this._edit({ kind: "daily_report" })}>
              <span class="choice-text"><span>${e.t("notifications.daily")}</span><span class="small muted" id="daily-help">${e.t("notifications.daily_help")}</span></span></label>
            ${t.kind === "daily_report" ? b`<div class="preset-fields"><label>${e.t("notifications.daily_time")}<input id="daily-time" type="time" required .value=${t.time} @change=${(e) => this._edit({ time: e.target.value || "08:00" })}></label></div>` : x}
          </div>
          <div class="preset">
            <label class="check"><input type="radio" name="notification-kind" value="needs_water" .checked=${t.kind === "needs_water"} @change=${() => this._edit({ kind: "needs_water" })}>
              <span class="choice-text"><span>${e.t("notifications.water")}</span></span></label>
            ${t.kind === "needs_water" ? b`<div class="preset-fields">
              <label>${e.t("notifications.water_delay")}<select id="water-delay" @change=${(e) => this._edit({ delayMinutes: Number(e.target.value) })}>
                ${Qs.map((n) => b`<option value=${String(n)} ?selected=${t.delayMinutes === n}>${sc(e, n)}</option>`)}</select></label>
              <label class="check"><input type="checkbox" .checked=${t.quiet} aria-describedby="quiet-help" @change=${(e) => this._edit({ quiet: e.target.checked })}>
                <span class="choice-text"><span>${e.t("notifications.quiet")}</span><span class="small muted" id="quiet-help">${e.t("notifications.quiet_help")}</span></span></label>
              ${t.quiet ? b`<label>${e.t("notifications.quiet_from")}<input id="quiet-from" type="time" required .value=${t.quietFrom} @change=${(e) => this._edit({ quietFrom: e.target.value || "22:00" })}></label>
                <label>${e.t("notifications.quiet_to")}<input id="quiet-to" type="time" required .value=${t.quietTo} @change=${(e) => this._edit({ quietTo: e.target.value || "07:00" })}></label>` : x}
            </div>` : x}
          </div>
        </fieldset>
        <fieldset class="choices"><legend class="field-label">${e.t("notifications.plants")}</legend>
          <label class="check"><input type="radio" name="notification-plants" value="all" .checked=${t.allPlants} @change=${() => this._edit({ allPlants: !0 })}><span>${e.t("notifications.plants_all")}</span></label>
          <label class="check"><input type="radio" name="notification-plants" value="choose" .checked=${!t.allPlants} ?disabled=${!o.length} @change=${() => this._edit({ allPlants: !1 })}><span>${e.t("notifications.plants_choose")}</span></label>
          ${t.allPlants ? x : b`<div class="plant-choices">${o.map((e) => b`<label class="check"><input type="checkbox" .checked=${t.plantIds.has(e.id)} aria-invalid=${t.error ? "true" : "false"} aria-describedby=${t.error ? "plants-error" : x}
              @change=${(n) => {
			let r = new Set(t.plantIds);
			n.target.checked ? r.add(e.id) : r.delete(e.id), this._edit({ plantIds: r });
		}}><span>${e.name}</span></label>`)}
            ${t.error ? b`<span class="error-text small" id="plants-error" role="alert">${t.error}</span>` : x}</div>`}
        </fieldset>
        <label>${e.t("notifications.send_to")}<select id="send-to" @change=${(e) => this._edit({ target: e.target.value })}>
          ${r.length ? b`<optgroup label=${e.t("notifications.group_entities")}>${r.map((e) => l(e, e.kind === "entity" ? e.label : ""))}</optgroup>` : x}
          ${i.length ? b`<optgroup label=${e.t("notifications.group_services")}>${i.map((e) => l(e, e.kind === "service" ? e.label : ""))}</optgroup>` : x}
          ${l({ kind: "persistent" }, e.t("notifications.persistent"))}
        </select></label>
        ${c ? b`<p class="hint" role="status">${e.t("notifications.exists")}</p>` : x}
        <p class="small muted hint">${e.t("notifications.yaml_help")}</p>
        <div class="actions dialog-actions"><span class="spacer"></span>
          <button type="button" @click=${() => this._close()}>${e.t("common.cancel")}</button>
          <button type="button" class="primary" @click=${() => this._open()}>${e.t("notifications.open_editor")}</button></div>
      </div></dialog>`;
	}
};
hc = Z, hc.styles = [
	V,
	Gs,
	vs,
	o`
    .notify-list { list-style: none; padding: 0; margin: 0; border: 1px solid var(--divider-color, #ddd); border-radius: 12px; }
    .notify-list li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 4px 12px; align-items: center; padding: 10px 14px; margin: 0; }
    .notify-list li + li { border-top: 1px solid var(--divider-color, #ddd); }
    /* A native checkbox drawn like Home Assistant's own switch: a track with a
       thumb that slides to the end when on. It uses the same theme colours, so
       it follows light and dark themes. The input stays native so its label,
       description, Space key and focus ring work as for any checkbox. */
    .notify-list .switch {
      --track: var(--ha-switch-background-color, var(--ha-color-fill-disabled-quiet-resting, var(--secondary-background-color, #f3f3f3)));
      --edge: var(--ha-switch-border-color, var(--ha-color-border-neutral-normal, #989898));
      --thumb: var(--ha-switch-thumb-background-color, var(--ha-color-on-neutral-normal, #5e5e5e));
      appearance: none; -webkit-appearance: none; box-sizing: border-box; flex: none;
      width: 48px; height: 24px; min-height: 24px; margin: 0; border: 1px solid var(--edge); border-radius: 12px; cursor: pointer;
      background: radial-gradient(circle closest-side, var(--thumb) 8.5px, transparent 9px) no-repeat 0 50% / 22px 22px, var(--track);
      transition: background-position 150ms ease, background-color 150ms ease, border-color 150ms ease;
    }
    .notify-list .switch:checked {
      --track: var(--ha-switch-checked-background-color, var(--ha-color-fill-primary-normal-resting, #dff3fc));
      --edge: var(--ha-switch-checked-border-color, var(--ha-color-border-primary-loud, var(--primary-color, #009ac7)));
      --thumb: var(--ha-switch-checked-thumb-background-color, var(--ha-color-on-primary-normal, var(--primary-color, #009ac7)));
      background-position: 100% 50%, 0 0;
    }
    .notify-list .switch:dir(rtl) { background-position: 100% 50%, 0 0; }
    .notify-list .switch:checked:dir(rtl) { background-position: 0 50%, 0 0; }
    .notify-list .switch:disabled { opacity: var(--ha-switch-disabled-opacity, 0.3); cursor: not-allowed; }
    @media (prefers-reduced-motion: reduce) { .notify-list .switch { transition: none; } }
    @media (forced-colors: active) {
      .notify-list .switch { forced-color-adjust: none; --track: Canvas; --edge: CanvasText; --thumb: CanvasText; }
      .notify-list .switch:checked { --edge: Highlight; --thumb: Highlight; }
      .notify-list .switch:disabled { --edge: GrayText; --thumb: GrayText; opacity: 1; }
    }
    .notify-list .row-text, .choice-text { display: flex; flex-direction: column; min-width: 0; }
    .existing { padding: 0; border: 0; margin: 0; background: none; }
    .notify-list a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 8px; }
    .care-dialog h3 { margin: 4px 0 0; font-size: 1rem; }
    .preset { display: flex; flex-direction: column; gap: 8px; }
    .preset-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px; padding-inline-start: 34px; }
    .preset-fields .check { grid-column: 1 / -1; }
    .preset-fields .check input, .plant-choices .check input { flex: 0 0 24px; width: 24px; height: 24px; min-height: 24px; }
    .plant-choices { display: flex; flex-direction: column; gap: 4px; padding-inline-start: 34px; }
    .plant-choices .check, .choices .check { margin: 4px 0; }
    .hint { margin: 0; }
    @media (max-width: 600px) { .preset-fields, .plant-choices { padding-inline-start: 0; } .preset-fields { grid-template-columns: 1fr; } }
  `
], H([C({ attribute: !1 })], Z.prototype, "hass", void 0), H([C({ attribute: !1 })], Z.prototype, "l", void 0), H([C({ attribute: !1 })], Z.prototype, "plants", void 0), H([C({ attribute: !1 })], Z.prototype, "devices", void 0), H([C({ attribute: !1 })], Z.prototype, "entities", void 0), H([C({ attribute: !1 })], Z.prototype, "states", void 0), H([w()], Z.prototype, "_draft", void 0), H([w()], Z.prototype, "_found", void 0), H([w()], Z.prototype, "_toggling", void 0), customElements.get("smart-plants-notifications") || customElements.define("smart-plants-notifications", Z);
//#endregion
//#region src/views/overview.ts
var gc, _c = "https://github.com/mikekuss/home-assistant-smart-plants/blob/main/docs/getting-started.md", vc = {
	all: {
		label: "overview.tile_all",
		icon: "mdi:sprout",
		tone: "var(--sp-primary)"
	},
	water: {
		label: "overview.tile_water",
		icon: "mdi:water-alert",
		tone: "var(--sp-warning)"
	},
	problems: {
		label: "overview.tile_problems",
		icon: "mdi:alert-circle",
		tone: "var(--sp-error)"
	},
	sensors: {
		label: "overview.tile_sensors",
		icon: "mdi:clock-alert-outline",
		tone: "var(--sp-disabled)"
	},
	care: {
		label: "overview.tile_care",
		icon: "mdi:calendar-check-outline",
		tone: "var(--sp-care)"
	}
}, yc = {
	attention: "overview.sort_attention",
	name: "overview.sort_name",
	area: "overview.sort_area"
}, bc = {
	attention: "mdi:alert-circle-outline",
	name: "mdi:sort-alphabetical-ascending",
	area: "mdi:texture-box"
}, Q = class extends S {
	constructor(...e) {
		super(...e), this.l = F, this.plants = [], this.overview = {}, this.areaNames = {}, this.thumbnails = {}, this.watering = /* @__PURE__ */ new Set(), this.loading = !1, this.blocked = !1, this.now = void 0, this.timeZone = void 0, this.hidden = !1, this._filter = "all", this._sort = "attention", this._query = "";
	}
	_emit(e, t) {
		this.dispatchEvent(new CustomEvent(e, {
			detail: t,
			bubbles: !0,
			composed: !0
		}));
	}
	_items() {
		let e = this.now ?? Date.now();
		return this.plants.map((t) => {
			let n = t.species?.snapshot.latin_name ?? t.species?.snapshot.common_name ?? null, r = this.areaNames[t.id] ?? null, i = this.overview[t.id], a = Vs(i ? i.snoozed_until : t.snoozed_until, e) !== null;
			return {
				id: t.id,
				name: t.name,
				areaName: r,
				status: i?.status,
				snoozed: a,
				plant: t,
				overview: i,
				species: n,
				careDue: qo(i).length > 0,
				searchText: [
					t.name,
					r,
					...t.species ? yi(t.species.snapshot) : [],
					t.category,
					...t.tags
				].filter(Boolean).join(" ")
			};
		});
	}
	_clear() {
		this._filter = "all", this._query = "";
	}
	render() {
		let e = this.l;
		if (this.hidden) return x;
		if (this.loading && !this.plants.length) return b`<p class="loading" role="status">${e.t("list.loading")}</p>`;
		if (!this.plants.length) return this._renderEmpty();
		let t = this._items(), n = t.filter((e) => cn(this._filter, e.status, e.careDue, e.snoozed) && un(e, this._query)), r = sn.filter((e) => e !== "care" || t.some((e) => cn("care", e.status, e.careDue, e.snoozed)) || this._filter === "care"), i = this._filter !== "all";
		return b`<div class="content">
      <div class="summary ${r.length === 5 ? "five" : ""}" role="group" aria-label=${e.t("overview.filter_label")}>${r.map((e) => this._renderTile(e, t.filter((t) => cn(e, t.status, t.careDue, t.snoozed)).length))}</div>
      <div class="listbar">
        <label class="search"><ha-icon aria-hidden="true" icon="mdi:magnify"></ha-icon>
          <input type="search" .value=${this._query} placeholder=${e.t("overview.search")} aria-label=${e.t("overview.search")} @input=${(e) => {
			this._query = e.target.value;
		}}></label>
        <ha-dropdown @wa-select=${(e) => {
			let t = e.detail.item.value;
			ln.includes(t) && (this._sort = t);
		}}>
          <button slot="trigger" class="pill" type="button" aria-label=${e.t("overview.sort_button", { sort: e.t(yc[this._sort]) })}><ha-icon aria-hidden="true" icon="mdi:sort"></ha-icon>${e.t(yc[this._sort])}<ha-icon aria-hidden="true" icon="mdi:menu-down"></ha-icon></button>
          ${ln.map((t) => b`<ha-dropdown-item value=${t} ?checked=${this._sort === t}>
            ${this._sort === t ? b`<ha-icon slot="icon" icon="mdi:check"></ha-icon>` : b`<ha-icon slot="icon" .icon=${bc[t]}></ha-icon>`}${e.t(yc[t])}</ha-dropdown-item>`)}
        </ha-dropdown>
      </div>
      <div class="countline"><p role="status">${e.t("list.count_filtered", {
			shown: n.length,
			total: t.length
		})}${i ? ` · ${e.t(vc[this._filter].label)}` : ""}</p>
        ${i || this._query ? b`<button type="button" class="text-button" @click=${() => this._clear()}>${e.t("overview.clear_filter")}</button>` : x}</div>
      ${n.length ? this._renderList(n) : this._renderNoResults()}
    </div>
    <button type="button" class="fab" ?disabled=${this.blocked} @click=${() => this._emit("add-plant")}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${e.t("panel.add_plant")}</button>`;
	}
	_renderTile(e, t) {
		let n = vc[e];
		return b`<button type="button" class="tile ${t === 0 ? "zero" : ""}" style="--tone:${n.tone}" aria-pressed=${this._filter === e ? "true" : "false"}
      @click=${() => {
			this._filter = this._filter === e && e !== "all" ? "all" : e;
		}}>
      <span class="ico" aria-hidden="true"><ha-icon .icon=${n.icon}></ha-icon></span>
      <span class="txt"><span class="num">${this.l.number(t)}</span><span class="lbl">${this.l.t(n.label)}</span></span></button>`;
	}
	_renderList(e) {
		return this._sort === "area" ? mn(e).map((e) => b`<h2 class="group-heading"><ha-icon aria-hidden="true" icon="mdi:texture-box"></ha-icon>${e.area ?? this.l.t("overview.no_area")} <span class="n">· ${this.l.number(e.items.length)}</span></h2>
      <ul class="grid">${e.items.map((e) => b`<li>${this._renderCard(e)}</li>`)}</ul>`) : b`<ul class="grid">${pn(e, this._sort).map((e) => b`<li>${this._renderCard(e)}</li>`)}</ul>`;
	}
	_renderCard(e) {
		let t = this.l, n = e.overview, r = e.plant, i = n ? en(t, n) : null, a = n ? rn(t, n, this.now) : "", o = n?.roles.moisture, s = n ? on(n) : [], c = `plant-${r.id}`, l = this.now ?? Date.now(), u = Ws(t, n ? n.snoozed_until : r.snoozed_until, ho(new Date(l).toISOString(), this.timeZone) ?? "", this.timeZone, l);
		return b`<article class="card" aria-labelledby=${c}>
      <div class="head"><sp-plant-avatar .src=${this.thumbnails[r.id] ?? null} .name=${r.name} .l=${t}></sp-plant-avatar>
        <div class="title"><div role="heading" aria-level=${this._sort === "area" ? "3" : "2"}><button type="button" class="name" id=${c} @click=${() => this._emit("open-plant", { plantId: r.id })}>${r.name}</button></div>
          <span class="sub">${e.areaName ? b`<ha-icon aria-hidden="true" icon="mdi:texture-box"></ha-icon>${e.areaName}` : x}${e.areaName && e.species ? " · " : ""}${e.species ? b`<i>${e.species}</i>` : x}</span></div></div>
      ${n && i ? b`<div class="status"><div class="chiprow"><sp-status-chip .status=${n.status} .label=${i.label} .more=${i.more} .l=${t}></sp-status-chip>${u ? b`<sp-snooze-chip .label=${u}></sp-snooze-chip>` : x}</div>${a ? b`<span class="reason">${a}</span>` : x}</div>` : x}
      ${this._renderCare(n)}
      ${n && n.status === "no_sensors" && !s.length ? b`<div class="empty-box"><span>${t.t("card.no_sensors")}</span><button type="button" class="text-button" @click=${() => this._emit("open-plant", {
			plantId: r.id,
			section: "sensors"
		})} aria-label=${t.t("card.assign_label", { name: r.name })}>${t.t("card.assign")}</button></div>` : o || s.length ? b`<div class="readings">
          ${o ? b`<sp-moisture-bar .value=${o.value} .range=${o.range} .state=${o.state} .lastReported=${o.last_reported} .now=${this.now} .l=${t}></sp-moisture-bar>` : x}
          ${s.length ? b`<div class="chips">${s.map(([e, n]) => b`<sp-reading-chip .role=${e} .value=${n.value} .unit=${n.unit} .state=${n.state} .range=${n.range} .l=${t}></sp-reading-chip>`)}</div>` : x}
        </div>` : x}
      <div class="foot"><span class="last"><ha-icon aria-hidden="true" icon="mdi:history"></ha-icon>${an(t, n?.last_watered_at ?? null, this.now)}</span>
        <button type="button" class="tonal" ?disabled=${this.blocked || this.watering.has(r.id)} aria-label=${t.t("card.log_watering_label", { name: r.name })} @click=${() => this._emit("log-watering", { plantId: r.id })}><ha-icon aria-hidden="true" icon="mdi:water"></ha-icon>${t.t("card.log_watering")}</button></div>
    </article>`;
	}
	_renderCare(e) {
		let t = qo(e);
		if (!t.length) return x;
		let n = this.l, r = t.some((e) => e.status === "overdue");
		return b`<p class="care ${r ? "overdue" : ""}"><ha-icon aria-hidden="true" icon=${r ? "mdi:alarm" : "mdi:calendar-check-outline"}></ha-icon>
      <span>${n.t("card.care_due", { tasks: Jo(n, t) })}${r ? b`<span class="sr-only"> (${n.t("card.care_overdue")})</span>` : x}</span></p>`;
	}
	_renderEmpty() {
		let e = this.l;
		return b`<sp-empty-state icon="mdi:sprout" .heading=${e.t("overview.empty_heading")}>${e.t("overview.empty_body")}
      <button slot="actions" type="button" class="filled" ?disabled=${this.blocked} @click=${() => this._emit("add-plant")}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${e.t("panel.add_plant")}</button>
      <a slot="actions" class="text-button" href=${_c} target="_blank" rel="noopener noreferrer">${e.t("overview.how_it_works")}</a></sp-empty-state>`;
	}
	_renderNoResults() {
		let e = this.l, t = this._query.trim() ? e.t("overview.no_match_query", { query: this._query.trim() }) : e.t("overview.no_match_filter", { filter: e.t(vc[this._filter].label) });
		return b`<sp-empty-state class="no-results" compact icon="mdi:magnify-remove-outline" .heading=${e.t("overview.no_match_heading")}>${t}
      <button slot="actions" type="button" class="text-button" @click=${() => this._clear()}>${e.t("overview.show_all")}</button></sp-empty-state>`;
	}
};
gc = Q, gc.styles = [V, o`
    /* White text on the theme's primary colour needs a slightly darker fill to reach 4.5:1. */
    :host { display: block; container-type: inline-size; --sp-primary-strong: color-mix(in srgb, var(--sp-primary) 78%, #000); }
    :host([hidden]) { display: none; }
    .content { display: flex; flex-direction: column; gap: 16px; padding-bottom: 88px; }
    button { font: inherit; color: inherit; }
    :focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
    ha-icon { --mdc-icon-size: 20px; flex: none; }

    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .tile { display: flex; align-items: center; gap: 12px; padding: 12px 14px; text-align: start; cursor: pointer; min-width: 0;
      background: var(--ha-card-background, var(--sp-card)); border: 1px solid var(--ha-card-border-color, var(--divider-color, #e0e0e0)); border-radius: var(--ha-card-border-radius, 12px); }
    /* Hover tints the border, not the fill, so secondary text keeps its contrast. */
    .tile:hover { border-color: color-mix(in srgb, var(--sp-primary) 55%, var(--divider-color, #e0e0e0)); }
    .tile[aria-pressed="true"] { border-color: var(--sp-primary); box-shadow: inset 0 0 0 1px var(--sp-primary); }
    .tile .ico { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none;
      background: color-mix(in srgb, var(--tone) 16%, transparent); color: color-mix(in srgb, var(--tone) 55%, var(--sp-text)); }
    .tile .num { display: block; font-size: 22px; font-weight: 500; line-height: 1.1; font-variant-numeric: tabular-nums; }
    .tile .lbl { display: block; font-size: 13px; color: var(--sp-text-secondary); overflow-wrap: anywhere; hyphens: auto; }
    .tile.zero .num { color: var(--sp-text-secondary); }
    .summary.five { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .care { display: flex; align-items: center; gap: 6px; margin: 0 14px 10px; font-size: 13px; min-width: 0; color: color-mix(in srgb, var(--sp-care) 55%, var(--sp-text)); }
    .care.overdue { color: color-mix(in srgb, var(--sp-error) 60%, var(--sp-text)); }
    .care ha-icon { --mdc-icon-size: 17px; }
    .care > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

    .listbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
    .search { flex: 1 1 220px; display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px; border-radius: 20px; color: var(--sp-text-secondary);
      background: var(--ha-card-background, var(--sp-card)); border: 1px solid var(--divider-color, #e0e0e0); }
    .search:focus-within { border-color: var(--sp-primary); }
    .search input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; color: var(--sp-text); font: inherit; }
    .pill { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 10px 0 14px; border-radius: 20px; cursor: pointer; font-size: 14px;
      background: var(--ha-card-background, var(--sp-card)); border: 1px solid var(--divider-color, #e0e0e0); }
    .icon-space { display: inline-block; width: 20px; }
    ha-dropdown-item[checked] { color: var(--sp-primary); font-weight: 500; }

    .countline { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 13px; color: var(--sp-text-secondary); }
    .countline p { margin: 0; }
    .text-button { border: 0; background: transparent; color: color-mix(in srgb, var(--sp-primary) 70%, var(--sp-text)); font-weight: 500; cursor: pointer; padding: 6px 10px; border-radius: 16px; }
    .text-button:hover { background: color-mix(in srgb, var(--sp-primary) 10%, transparent); }

    .group-heading { display: flex; align-items: center; gap: 8px; margin: 4px 0 0; font-size: 14px; font-weight: 500; color: var(--sp-text-secondary); }
    .group-heading .n { font-weight: 400; }
    .grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 12px; align-items: start; }

    .card { position: relative; display: flex; flex-direction: column; min-width: 0;
      background: var(--ha-card-background, var(--sp-card)); border: 1px solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
      border-radius: var(--ha-card-border-radius, 12px); box-shadow: var(--ha-card-box-shadow, none); }
    .card:hover { box-shadow: 0 2px 10px color-mix(in srgb, #000 10%, transparent); }
    .head { display: flex; gap: 12px; padding: 14px 14px 10px; align-items: flex-start; }
    .title { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .name { all: unset; font-size: 16px; font-weight: 500; line-height: 1.3; color: var(--sp-text); cursor: pointer; overflow-wrap: anywhere; }
    .name::after { content: ""; position: absolute; inset: 0; border-radius: var(--ha-card-border-radius, 12px); }
    .name:focus-visible { outline: none; }
    .name:focus-visible::after { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
    .sub { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; font-size: 13px; color: var(--sp-text-secondary); }
    .sub ha-icon { --mdc-icon-size: 16px; }
    .status { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 0 14px 10px; }
    .chiprow { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; max-width: 100%; }
    .reason { font-size: 13px; color: var(--sp-text-secondary); overflow-wrap: anywhere; hyphens: auto; }
    .readings { display: flex; flex-direction: column; gap: 10px; padding: 4px 14px 12px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .empty-box { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 14px 12px; padding: 10px 12px;
      border: 1px dashed var(--divider-color, #e0e0e0); border-radius: 8px; font-size: 13px; color: var(--sp-text-secondary); }
    .foot { position: relative; z-index: 1; margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px 6px 14px;
      border-top: 1px solid var(--divider-color, #e0e0e0); }
    .last { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--sp-text-secondary); min-width: 0; }
    .last ha-icon { --mdc-icon-size: 17px; }
    .tonal { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 14px; border: 0; border-radius: 16px; cursor: pointer; font-size: 13px; font-weight: 500; white-space: nowrap;
      background: color-mix(in srgb, var(--sp-primary) 14%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
    .tonal ha-icon { --mdc-icon-size: 17px; }
    .tonal:disabled { opacity: .5; cursor: default; }
    .filled { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 20px; border: 0; border-radius: 20px; cursor: pointer; font-weight: 500;
      background: var(--sp-primary-strong); color: var(--text-primary-color, #fff); }
    .filled:disabled { opacity: .5; cursor: default; }
    a.text-button { text-decoration: none; display: inline-flex; align-items: center; }
    .no-results { background: var(--ha-card-background, var(--sp-card)); border: 1px solid var(--divider-color, #e0e0e0); border-radius: var(--ha-card-border-radius, 12px); }
    .loading { color: var(--sp-text-secondary); }

    .fab { position: fixed; right: max(16px, env(safe-area-inset-right, 0px)); bottom: calc(16px + env(safe-area-inset-bottom, 0px)); z-index: 3;
      display: inline-flex; align-items: center; gap: 10px; height: 56px; padding: 0 22px 0 18px; border: 0; border-radius: 28px; cursor: pointer; font-size: 15px; font-weight: 500;
      background: var(--sp-primary-strong); color: var(--text-primary-color, #fff); box-shadow: 0 3px 8px color-mix(in srgb, #000 25%, transparent); }
    .fab ha-icon { --mdc-icon-size: 24px; }
    .fab:disabled { opacity: .6; cursor: default; }

    /* Five tiles need more room than four: medium widths use three columns so labels such as
       "Sensor issues" (German "Sensorprobleme") never break inside a word. */
    @container (min-width: 601px) and (max-width: 900px) {
      .summary.five { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    /* Phones: the tiles become one row of compact filter chips, so the first plant
       stays near the top. The row scrolls sideways when the chips do not fit. */
    @container (max-width: 600px) {
      .summary, .summary.five { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 2px 16px; }
      .summary::-webkit-scrollbar { display: none; }
      .tile { flex: none; gap: 6px; height: 36px; padding: 0 12px 0 6px; border-radius: 18px; }
      .tile .ico { width: 26px; height: 26px; }
      .tile .ico ha-icon { --mdc-icon-size: 16px; }
      .tile .txt { display: inline-flex; align-items: baseline; gap: 5px; white-space: nowrap; }
      .tile .num { display: inline; font-size: 14px; line-height: 1; }
      .tile .lbl { display: inline; overflow-wrap: normal; }
      .grid { grid-template-columns: 1fr; }
    }
  `], H([C({ attribute: !1 })], Q.prototype, "l", void 0), H([C({ attribute: !1 })], Q.prototype, "plants", void 0), H([C({ attribute: !1 })], Q.prototype, "overview", void 0), H([C({ attribute: !1 })], Q.prototype, "areaNames", void 0), H([C({ attribute: !1 })], Q.prototype, "thumbnails", void 0), H([C({ attribute: !1 })], Q.prototype, "watering", void 0), H([C({ type: Boolean })], Q.prototype, "loading", void 0), H([C({ type: Boolean })], Q.prototype, "blocked", void 0), H([C({ attribute: !1 })], Q.prototype, "now", void 0), H([C({ attribute: !1 })], Q.prototype, "timeZone", void 0), H([C({
	type: Boolean,
	reflect: !0
})], Q.prototype, "hidden", void 0), H([w()], Q.prototype, "_filter", void 0), H([w()], Q.prototype, "_sort", void 0), H([w()], Q.prototype, "_query", void 0), customElements.get("smart-plants-overview") || customElements.define("smart-plants-overview", Q);
//#endregion
//#region src/panel.ts
var xc, Sc = Object.fromEntries([
	{
		problemRole: "temperature_stress",
		configRole: "temperature",
		keys: or,
		defaults: ar,
		unit: "°C",
		min: "-40",
		max: "80",
		step: "0.1",
		labels: {
			cold_threshold_celsius: "threshold_field.cold_trigger",
			cold_clear_celsius: "threshold_field.cold_clear",
			hot_clear_celsius: "threshold_field.hot_clear",
			hot_threshold_celsius: "threshold_field.hot_trigger"
		},
		validate: (e, t) => pr(e, t),
		seed: (e) => mr(e)
	},
	{
		problemRole: "humidity_stress",
		configRole: "humidity",
		keys: gr,
		defaults: hr,
		unit: "%",
		min: "0",
		max: "100",
		step: "0.1",
		labels: {
			dry_threshold_percent: "threshold_field.dry_trigger",
			dry_clear_percent: "threshold_field.dry_clear",
			damp_clear_percent: "threshold_field.damp_clear",
			damp_threshold_percent: "threshold_field.damp_trigger"
		},
		validate: (e, t) => Sr(e, t),
		seed: (e) => Cr(e)
	},
	{
		problemRole: "conductivity_stress",
		configRole: "conductivity",
		keys: Tr,
		defaults: wr,
		unit: "µS/cm",
		min: "0",
		max: "10000",
		step: "0.1",
		labels: {
			low_threshold_micro_siemens_per_cm: "threshold_field.low_trigger",
			low_clear_micro_siemens_per_cm: "threshold_field.low_clear",
			high_clear_micro_siemens_per_cm: "threshold_field.high_clear",
			high_threshold_micro_siemens_per_cm: "threshold_field.high_trigger"
		},
		validate: (e, t) => jr(e, t),
		seed: (e) => Mr(e)
	},
	{
		problemRole: "co2_stress",
		configRole: "co2",
		keys: Pr,
		defaults: Nr,
		unit: "ppm",
		min: "0",
		max: "10000",
		step: "1",
		labels: {
			threshold_ppm: "threshold_field.high_trigger",
			clear_ppm: "threshold_field.high_clear"
		},
		validate: (e, t) => Br(e, t),
		seed: (e) => Vr(e)
	},
	{
		problemRole: "soil_temperature_stress",
		configRole: "soil_temperature",
		keys: Ur,
		defaults: Hr,
		unit: "°C",
		min: "-20",
		max: "60",
		step: "0.1",
		labels: {
			cold_threshold_celsius: "threshold_field.cold_trigger",
			cold_clear_celsius: "threshold_field.cold_clear",
			hot_clear_celsius: "threshold_field.hot_clear",
			hot_threshold_celsius: "threshold_field.hot_trigger"
		},
		validate: (e, t) => Yr(e, t),
		seed: (e) => Xr(e)
	},
	{
		problemRole: "low_battery",
		configRole: "battery",
		keys: Qr,
		defaults: Zr,
		unit: "%",
		min: "0",
		max: "100",
		step: "1",
		labels: {
			threshold_percent: "threshold_field.low_trigger",
			clear_percent: "threshold_field.low_clear"
		},
		validate: (e, t) => ri(e, t),
		seed: (e) => ii(e)
	},
	{
		problemRole: "low_light",
		configRole: "illuminance",
		keys: oi,
		defaults: ai,
		unit: "lx",
		min: "0",
		max: "200000",
		step: "0.1",
		labels: {
			target_lux: "threshold_field.target",
			clear_lux: "threshold_field.clear"
		},
		validate: (e, t) => di(e, t),
		seed: (e) => fi(e)
	}
].map((e) => [e.problemRole, e])), Cc = "M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", wc = "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z", Tc = "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2Z";
function Ec(e) {
	let t = -e.getTimezoneOffset();
	return `${new Date(e.getTime() + t * 6e4).toISOString().slice(0, 19)}${t < 0 ? "-" : "+"}${String(Math.floor(Math.abs(t) / 60)).padStart(2, "0")}:${String(Math.abs(t) % 60).padStart(2, "0")}`;
}
var Dc = "smart_plants.history_role", Oc = "smart_plants.history_range", kc = 3e5, Ac = 400, jc = 2e3, Mc = (e, t) => e !== t && (e?.state !== t?.state || JSON.stringify(e?.attributes) !== JSON.stringify(t?.attributes)), Nc = (e, t) => !!e && !!t && e !== t && (e.attributes.snoozed_until ?? null) !== (t.attributes.snoozed_until ?? null);
function Pc(e) {
	try {
		return localStorage.getItem(e);
	} catch {
		return null;
	}
}
function Fc(e, t) {
	try {
		localStorage.setItem(e, t);
	} catch {}
}
var $ = class e extends S {
	constructor(...e) {
		super(...e), this.narrow = !1, this._plants = [], this._loading = !0, this._error = "", this._notice = "", this._view = { kind: "list" }, this._detailSection = "overview", this._formBusy = !1, this._capabilities = null, this._updateAvailable = !1, this._blocked = !0, this._areas = [], this._entities = [], this._devices = [], this._states = {}, this._evaluations = {}, this._health = {}, this._healthError = "", this._careHistory = null, this._historyRole = ((e) => Ft(e) ? e : "moisture")(Pc(Dc)), this._historyRange = ((e) => yn(e) ? e : "7d")(Pc(Oc)), this._history = null, this._careError = "", this._careDate = "", this._careNote = "", this._careKind = "watering", this._careFields = {}, this._careEditingId = null, this._registryError = "", this._areaReview = !1, this._overview = {}, this._overviewError = "", this._thumbnails = {}, this._watering = /* @__PURE__ */ new Set(), this._edits = null, this._conflict = null, this._allSensors = !1, this._preview = null, this._provider = "manual", this._query = "", this._results = [], this._related = [], this._imageUrl = null, this._imageLoading = !1, this._imageError = null, this._dialog = null, this._snoozeDraft = null, this._restEditor = null, this._taskEditor = null, this._automateTaskId = null, this._carePending = /* @__PURE__ */ new Set(), this._careTaskId = null, this._wizardStarted = !1, this._notificationsOpen = !1, this._creationNotice = "", this._creationPhoto = "", this._createdPlantId = null, this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._thresholdSaved = {}, this._pendingThresholdSwitch = null, this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._sourceUnavailable = null, this._sourceSaved = {}, this._pendingSourceSwitch = null, this._sourceMode = "combine", this._moistureMode = null, this._expanded = /* @__PURE__ */ new Set(), this._settingsOpen = /* @__PURE__ */ new Set(), this._careFilter = "all", this._careFormOpen = !1, this._allSourceSensors = !1, this._base = null, this._baseArea = "", this._imageKey = null, this._imageRequest = 0, this._thumbnailKeys = {}, this._thumbnailAborts = /* @__PURE__ */ new Map(), this._request = 0, this._careRequest = 0, this._historyRequest = 0, this._historyLoadedAt = 0, this._providerRequest = 0, this._context = 0, this._subscriptionGeneration = 0, this._focusReturn = null, this._ownWriteAt = -Infinity, this._ready = () => {
			this._refresh();
		}, this._disconnected = () => {
			this._context++, this._formBusy = !1, this._blocked = !0, this._request++, this._providerRequest++, this._preview = null, this._clearImage(), this._error = this._l.t("error.disconnected");
		};
	}
	get _l() {
		return Xn(this.hass);
	}
	willUpdate(e) {
		e.has("hass") && (this.hass?.states && (this._states = Object.fromEntries(Object.entries(this.hass.states).filter(([e, t]) => wt(t) && t.entity_id === e))), this._syncImage()), this._syncHistory();
	}
	updated(e) {
		e.has("hass") && (this.hass?.connection !== this._connection && (this._unbind(), this._bind(), this._refresh()), this.hass?.user?.is_admin === !1 && this._unbind(), this._watchCare(e.get("hass")));
		let t = this.shadowRoot?.querySelector("dialog"), n = null;
		try {
			n = this.shadowRoot?.activeElement;
		} catch {
			n = null;
		}
		t?.open && (!n || !t.contains(n) || n.matches(":disabled")) && t.querySelector("button")?.focus();
	}
	connectedCallback() {
		super.connectedCallback(), this.hasUpdated && (this._bind(), this._refresh(), this._syncImage());
		for (let e of [
			"ha-tab-group",
			"ha-expansion-panel",
			"ha-alert",
			"ha-area-picker"
		]) customElements.whenDefined(e).then(() => this.requestUpdate());
		this._timer = setInterval(() => {
			!this._formBusy && !this._loading && this.isConnected && this._refresh(!1);
		}, 3e4);
	}
	disconnectedCallback() {
		this._context++, this._formBusy = !1, this._request++, this._providerRequest++, this._clearImage(), this._clearThumbnails(), this._unbind(), clearInterval(this._timer), this._clearCareTimer(), super.disconnectedCallback();
	}
	_watchCare(e) {
		let t = e?.states, n = this.hass?.states;
		if (!t || !n || t === n) return;
		let r = this._view.kind === "detail" ? `smart_plants:${this._view.plantId}:care` : null;
		this._entities.some((e) => e.platform === "smart_plants" && (r !== null && e.unique_id.startsWith(r) && Mc(t[e.entity_id], n[e.entity_id]) || e.entity_id.startsWith("binary_sensor.") && Nc(t[e.entity_id], n[e.entity_id]))) && (this._carePending.size || this._watering.size || Date.now() - this._ownWriteAt < jc || this._scheduleCareRefresh());
	}
	_scheduleCareRefresh() {
		this._careTimer === void 0 && (this._careTimer = setTimeout(() => {
			if (this._careTimer = void 0, this.isConnected) {
				if (this._formBusy) {
					this._scheduleCareRefresh();
					return;
				}
				this._refresh(!1);
			}
		}, Ac));
	}
	_clearCareTimer() {
		clearTimeout(this._careTimer), this._careTimer = void 0;
	}
	_bind() {
		if (!this.hass || this.hass.user?.is_admin === !1 || this._connection) return;
		let e = this.hass.connection;
		this._connection = e;
		let t = this._subscriptionGeneration;
		e.addEventListener?.("ready", this._ready), e.addEventListener?.("disconnected", this._disconnected), P.subscribeRegistry(this.hass, this._ready).then((n) => {
			this._connection !== e || t !== this._subscriptionGeneration || !this.isConnected ? n() : this._unsubscribe = n;
		}).catch(() => {
			this._registryError = this._l.t("error.registry_updates");
		});
	}
	_unbind() {
		this._context++, this._formBusy = !1, this._request++, this._providerRequest++, this._preview = null, this._blocked = !0, this._clearImage(), this._clearThumbnails(), this._subscriptionGeneration++, this._unsubscribe?.(), this._unsubscribe = void 0, this._connection?.removeEventListener?.("ready", this._ready), this._connection?.removeEventListener?.("disconnected", this._disconnected), this._connection = void 0;
	}
	_clearThumbnails() {
		for (let e of this._thumbnailAborts.values()) e.abort();
		this._thumbnailAborts.clear();
		for (let e of Object.values(this._thumbnails)) URL.revokeObjectURL(e);
		this._thumbnails = {}, this._thumbnailKeys = {};
	}
	_syncThumbnails() {
		if (this._blocked || !this.hass || this.hass.user?.is_admin === !1 || !this.isConnected) {
			this._clearThumbnails();
			return;
		}
		if (this._view.kind !== "list") return;
		let e = this.hass, t = e.auth?.accessToken ?? "", n = new Map(this._plants.filter((e) => e.image).map((e) => [e.id, `${t}:${e.id}:${e.image.id}`])), r = { ...this._thumbnails };
		for (let e of Object.keys(this._thumbnailKeys)) n.get(e) !== this._thumbnailKeys[e] && (this._thumbnailAborts.get(e)?.abort(), this._thumbnailAborts.delete(e), r[e] && URL.revokeObjectURL(r[e]), delete r[e], delete this._thumbnailKeys[e]);
		this._thumbnails = r;
		for (let [t, r] of n) {
			if (this._thumbnailKeys[t] === r) continue;
			this._thumbnailKeys[t] = r;
			let n = new AbortController();
			this._thumbnailAborts.set(t, n), P.fetchImage(e, t, n.signal).then((e) => {
				n.signal.aborted || this._thumbnailKeys[t] !== r || (this._thumbnailAborts.delete(t), this._thumbnails = {
					...this._thumbnails,
					[t]: URL.createObjectURL(e)
				});
			}).catch(() => {
				this._thumbnailKeys[t] === r && (this._thumbnailAborts.delete(t), delete this._thumbnailKeys[t]);
			});
		}
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
		this._imageAbort = r, this._imageLoading = !0, P.fetchImage(this.hass, e.id, r.signal).then((e) => {
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
	async _refresh(t = !0) {
		if (!this.isConnected || !this.hass || this.hass.user?.is_admin === !1) return;
		let n = ++this._request, r = this.hass;
		this._clearCareTimer(), t && (this._loading = !0);
		try {
			let i = await P.info(r), a = await P.list(r);
			if (n !== this._request || !this.isConnected) return;
			if (this._capabilities = i, this._blocked = !1, this._plants = a, this._updateAvailable = js(e.bundleVersion, i.bundle_version), t && (this._error = ""), this._base) {
				let e = a.find((e) => e.id === this._base?.id);
				e && e.revision !== this._base.revision && (Wo(this._base, e) && !this._conflict ? this._formBusy || this._rebaseEdits(this._base, e) : this._setConflict(this._base, e)), e || (this._context++, this._formBusy = !1, this._closeDialog(), this._base = null, this._conflict = null, this._edits = null, this._notice = this._l.t("notice.deleted_elsewhere"), this.updateComplete.then(() => this.shadowRoot?.querySelector("h1")?.focus()));
			}
			this._syncImage();
			try {
				let [e, t, i, a] = await Promise.all([
					P.areas(r),
					P.entities(r),
					P.devices(r),
					P.states(r)
				]);
				if (n !== this._request) return;
				if (this._areas = e, this._entities = t, this._devices = i, this._states = r.states ? Object.fromEntries(Object.entries(r.states).filter(([e, t]) => wt(t) && t.entity_id === e)) : Object.fromEntries(a.map((e) => [e.entity_id, e])), this._registryError = "", this._base && this._edits) {
					let e = R(this._base, i)?.area_id ?? "";
					if (e !== this._baseArea) {
						let t = this._edits.area !== this._baseArea;
						this._notice = this._l.t(t ? "notice.area_changed_retained" : "notice.area_changed_synced", {
							from: this._areaName(this._baseArea),
							to: this._areaName(e)
						}), t || this._edit({ area: e }), this._areaReview = t, this._baseArea = e;
					}
				}
			} catch (e) {
				n === this._request && (this._registryError = this._friendly(e));
			}
			try {
				let e = await P.overview(r);
				n === this._request && (this._overview = Object.fromEntries(e.map((e) => [e.plant_id, e])), this._overviewError = "");
			} catch (e) {
				n === this._request && (this._overview = {}, this._overviewError = this._friendly(e));
			}
			if (n === this._request && this._syncThumbnails(), this._view.kind === "detail") {
				let e = this._view.plantId;
				try {
					let t = await P.evaluation(r, e);
					n === this._request && (this._evaluations = {
						...this._evaluations,
						[e]: t
					});
				} catch {
					if (n === this._request) {
						let t = { ...this._evaluations };
						delete t[e], this._evaluations = t;
					}
				}
			}
			if (this._view.kind === "detail") {
				let e = this._view.plantId;
				await this._loadCare(e, this._context, n);
				try {
					let t = await P.plantHealth(r, e);
					n === this._request && (this._health = {
						...this._health,
						[e]: t
					}, this._healthError = "");
				} catch (t) {
					if (n === this._request) {
						let n = { ...this._health };
						delete n[e], this._health = n, this._healthError = this._friendly(t);
					}
				}
			}
		} catch (e) {
			n === this._request && (this._error = this._friendly(e), this._blocked = !0, this._clearImage());
		} finally {
			n === this._request && (this._loading = !1);
		}
	}
	_friendly(e) {
		let t = e instanceof M ? `api_error.${e.code}` : "";
		return this._l.t(Un(t) ? t : "api_error.unknown");
	}
	_plantById(e) {
		return this._plants.find((t) => t.id === e);
	}
	_plantAreaNames() {
		return Object.fromEntries(this._plants.map((e) => {
			let t = R(e, this._devices)?.area_id;
			return [e.id, t ? this._areaName(t) : null];
		}));
	}
	_areaName(e) {
		return this._areas.find((t) => t.area_id === e)?.name ?? (e || this._l.t("area.none"));
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
		].filter((n) => JSON.stringify(e[n]) !== JSON.stringify(t[n])).map((n) => n === "roles" ? this._l.t("conflict.roles_changed") : `${this._l.t(`conflict_field.${n}`)}: ${JSON.stringify(e[n])} → ${JSON.stringify(t[n])}`);
		this._conflict = {
			before: e,
			after: t,
			changes: n
		}, this._preview = null, this._providerRequest++;
	}
	_beginEdit(e) {
		let t = L(e);
		this._base = structuredClone(e), this._baseArea = R(e, this._devices)?.area_id ?? "", this._edits = {
			name: e.name,
			acquired: e.acquired_at ?? "",
			placement: structuredClone(e.placement),
			category: e.category ?? "",
			tagText: e.tags.join(", "),
			area: this._baseArea,
			common: e.species?.snapshot.common_name ?? "",
			latin: e.species?.snapshot.latin_name ?? "",
			moisture: t ? gi(t) : null
		}, this._conflict = null, this._areaReview = !1, this._preview = null, this._results = [], this._provider = "manual", this._related = [], this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._thresholdSaved = {}, this._pendingThresholdSwitch = null, this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._sourceSaved = {}, this._pendingSourceSwitch = null, this._allSourceSensors = !1, this._sourceUnavailable = null;
		let n = R(e, this._devices), r = this._context;
		n && this.hass && P.related(this.hass, n.id).then((t) => {
			r === this._context && this._base?.id === e.id && (this._related = t);
		}).catch(() => {
			r === this._context && this._base?.id === e.id && (this._notice = this._l.t("notice.related_failed"));
		});
	}
	_show(e) {
		if (this._context++, this._closeDialog(), this._formBusy = !1, this._providerRequest++, this._view = e, this._error = "", this._notice = "", this._healthError = "", this._careHistory = null, this._careError = "", e.kind === "create" && (this._wizardStarted = !0), e.kind === "detail") {
			this._detailSection = "overview", this._expanded = /* @__PURE__ */ new Set(), this._settingsOpen = /* @__PURE__ */ new Set(), this._moistureMode = null, this._careFilter = "all", this._careFormOpen = !1, this._careEditingId = null, this._careTaskId = null, this._careKind = "watering", this._careFields = {};
			let t = /* @__PURE__ */ new Date();
			this._careDate = (/* @__PURE__ */ new Date(t.getTime() - t.getTimezoneOffset() * 6e4)).toISOString().slice(0, 16), this._careNote = "";
			let n = this._plantById(e.plantId);
			n && this._beginEdit(n);
			let r = e.plantId, i = this.hass, a = this._context;
			i && !this._blocked && (this._loadCare(r, a), P.evaluation(i, r).then((e) => {
				a === this._context && (this._evaluations = {
					...this._evaluations,
					[r]: e
				});
			}).catch(() => void 0), P.plantHealth(i, r).then((e) => {
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
		this._syncImage(), this._syncThumbnails(), this.updateComplete.then(() => this.shadowRoot?.querySelector("h1")?.focus());
	}
	_handleMenuAction(e) {
		e.detail.item.value === "add-plant" && this._show({ kind: "create" }), e.detail.item.value === "back-to-overview" && this._show({ kind: "list" }), e.detail.item.value === "notifications" && (this._notificationsOpen = !0), e.detail.item.value === "integration-options" && this._navigate("/config/integrations/integration/smart_plants"), e.detail.item.value === "documentation" && window.open(_c, "_blank", "noopener,noreferrer");
		let t = this._view.kind === "detail" ? this._plantById(this._view.plantId) : void 0;
		if (!t) return;
		let n = R(t, this._devices);
		e.detail.item.value === "open-device" && n && this._navigate(`/config/devices/device/${encodeURIComponent(n.id)}`), e.detail.item.value === "download-diagnostics" && this._downloadDiagnostics(t), e.detail.item.value === "toggle-monitoring" && this._toggleMonitoring(t), e.detail.item.value === "snooze" && this._openSnooze(t), e.detail.item.value === "delete-plant" && this._openDialog("delete", this.shadowRoot?.querySelector(".panel-appbar ha-dropdown [slot=trigger]") ?? null);
	}
	_navigate(e) {
		history.pushState(null, "", e), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !1 } }));
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
	_openFromOverview(e) {
		this._show({
			kind: "detail",
			plantId: e.plantId
		}), e.section && (this._detailSection = e.section);
	}
	_selectSection(e) {
		K.includes(e) && e !== this._detailSection && (this._detailSection = e);
	}
	_goTo(e, t, n) {
		this._selectSection(e), n && this._setExpanded(n, !0);
		let r = this._context;
		this.updateComplete.then(() => {
			if (r !== this._context || !t) return;
			let e = this.shadowRoot?.querySelector(t);
			e?.scrollIntoView?.({ block: "nearest" }), e?.focus();
		});
	}
	_setExpanded(e, t) {
		let n = new Set(this._expanded);
		t ? n.add(e) : n.delete(e), this._expanded = n;
	}
	_followQuickWrite(e) {
		this._base?.id === e.id && !this._conflict && !this._formBusy && this._base.revision + 1 === e.revision && this._rebaseEdits(this._base, e);
	}
	async _withRevision(e, t) {
		let n = this._plantById(e);
		if (!n) throw new M("not_found", "Plant not found.");
		try {
			return await t(n.revision);
		} catch (n) {
			if (!(n instanceof M && n.code === "revision_conflict")) throw n;
			await this._refresh(!1);
			let r = this._plantById(e);
			if (!r) throw n;
			return await t(r.revision);
		}
	}
	_setWatering(e, t) {
		let n = new Set(this._watering);
		t ? n.add(e) : n.delete(e), this._watering = n;
	}
	_adopt(e) {
		this._ownWriteAt = Date.now();
		let t = this._plantById(e.id);
		(!t || t.revision <= e.revision) && (this._plants = this._plants.map((t) => t.id === e.id ? e : t));
		let n = this._overview[e.id];
		n && n.revision < e.revision && (this._overview = {
			...this._overview,
			[e.id]: {
				...n,
				revision: e.revision
			}
		});
	}
	async _logWatering(e) {
		let t = this._plantById(e);
		if (!this.hass || !t || this._blocked || this._watering.has(e)) return;
		let n = this.hass, r = this._l;
		this._setWatering(e, !0), this._error = "", this._request++;
		try {
			let i = await this._withRevision(e, (t) => P.addWatering(n, e, t, Ec(/* @__PURE__ */ new Date()), null));
			this._adopt(i.plant), this._followQuickWrite(i.plant);
			let a = this._overview[e];
			a && (this._overview = {
				...this._overview,
				[e]: {
					...a,
					last_watered_at: i.event.occurred_at
				}
			}), this._toast(r.t("watering.logged", { name: t.name }), {
				text: r.t("watering.undo"),
				action: () => void this._undoWatering(e, t.name, i.event.id)
			});
		} catch (e) {
			this._error = this._friendly(e);
		} finally {
			this._setWatering(e, !1), this._refresh(!1);
		}
	}
	async _undoWatering(e, t, n) {
		if (!this.hass || this._blocked) return;
		let r = this.hass;
		this._request++;
		try {
			let i = await this._withRevision(e, (t) => P.deleteCareEvent(r, e, t, n));
			this._adopt(i.plant), this._followQuickWrite(i.plant);
			let a = this._overview[e];
			a && (this._overview = {
				...this._overview,
				[e]: {
					...a,
					last_watered_at: i.summary.last_watered_at
				}
			}), this._toast(this._l.t("watering.removed", { name: t }));
		} catch (e) {
			this._error = this._friendly(e);
		} finally {
			this._refresh(!1);
		}
	}
	async _loadCare(e, t, n) {
		if (!this.hass) return;
		let r = ++this._careRequest;
		try {
			let i = await P.careHistory(this.hass, e);
			r === this._careRequest && t === this._context && (n === void 0 || n === this._request) && this._view.kind === "detail" && this._view.plantId === e && (this._careHistory = i, this._careError = "");
		} catch (e) {
			r === this._careRequest && t === this._context && (n === void 0 || n === this._request) && (this._careHistory = null, this._careError = this._friendly(e));
		}
	}
	_historyEntity(e, t) {
		let n = `smart_plants:${e.id}:${t}`;
		return this._entities.find((e) => e.platform === "smart_plants" && e.unique_id === n && e.entity_id.startsWith("sensor."))?.entity_id;
	}
	_historyRoles(e) {
		return Pt.filter((t) => ((t === "moisture" ? L(e) : B(e, t))?.sources.length ?? 0) > 0 && this._historyEntity(e, t) !== void 0);
	}
	_historyTarget(e) {
		let t = this._historyRoles(e), n = t.includes(this._historyRole) ? this._historyRole : t[0], r = n ? this._historyEntity(e, n) : void 0;
		return n && r ? {
			role: n,
			roles: t,
			entityId: r,
			key: `${r}|${this._historyRange}`
		} : null;
	}
	_syncHistory(e = !1) {
		let t = this._view.kind === "detail" && this._detailSection === "overview" ? this._plantById(this._view.plantId) : void 0;
		if (!t || !this.hass || this._blocked || !this.isConnected) return;
		let n = this._historyTarget(t);
		if (!n) return;
		let { key: r, entityId: i, role: a } = n, o = this._history?.key === r;
		if (o && !e && Date.now() - this._historyLoadedAt < kc) return;
		let s = ++this._historyRequest;
		this._historyLoadedAt = Date.now(), (!o || this._history?.status !== "ready") && (this._history = {
			key: r,
			status: "loading",
			points: []
		});
		let c = vn[this._historyRange], l = a === "temperature" || a === "soil_temperature" ? { temperature: "°C" } : void 0;
		P.statistics(this.hass, i, new Date(Date.now() - c.spanMs), c.period, l).then((e) => {
			s === this._historyRequest && (this._history = {
				key: r,
				status: "ready",
				points: e
			});
		}).catch((e) => {
			s === this._historyRequest && (this._history = {
				key: r,
				status: e instanceof M && e.code === "unknown_command" ? "unavailable" : "error",
				points: []
			});
		});
	}
	_renderHistory(e) {
		let t = this._historyTarget(e);
		if (!t) return x;
		let n = this._l, r = this._overview[e.id], i = this._history?.key === t.key ? this._history : null, a = t.role === "moisture" ? "watering" : t.role === "conductivity" ? "fertilizing" : null, o = a ? (this._careHistory?.events ?? []).filter((e) => e.kind === a).map((e) => Date.parse(e.occurred_at)).filter(Number.isFinite) : [], s = r?.last_watered_at ? Date.parse(r.last_watered_at) : NaN;
		return Da(n, {
			roles: t.roles,
			role: t.role,
			range: this._historyRange,
			status: i?.status ?? "loading",
			points: i?.points ?? [],
			reading: r?.roles[t.role],
			markers: o,
			markerLabel: a ? n.t(`history.legend_${a}`) : "",
			lastWatered: Number.isFinite(s) ? s : null,
			now: Date.now(),
			onLogWatering: this._blocked ? null : (e) => this._logCareAt("watering", e),
			onRole: (e) => {
				this._historyRole = e, Fc(Dc, e);
			},
			onRange: (e) => {
				this._historyRange = e, Fc(Oc, e);
			},
			onOpen: () => {
				this.dispatchEvent(new CustomEvent("hass-more-info", {
					bubbles: !0,
					composed: !0,
					detail: { entityId: t.entityId }
				}));
			},
			onRetry: () => this._syncHistory(!0)
		});
	}
	_carePayload() {
		let e = this._careNote.trim() || null;
		switch (this._careKind) {
			case "watering":
			case "task": return { note: e };
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
			this._careError = this._l.t("care.error_refresh_save");
			return;
		}
		let n = new Date(this._careDate);
		if (!this._careDate || Number.isNaN(n.getTime()) || n.getTime() > Date.now() || (/* @__PURE__ */ new Date(n.getTime() - n.getTimezoneOffset() * 6e4)).toISOString().slice(0, 16) !== this._careDate) {
			this._careError = this._l.t("care.error_date");
			return;
		}
		let r = this._careFields, i = this._carePayload(), a = typeof i.note == "string" ? i.note : null;
		if (this._careKind !== "note" && a && a.length > 500) {
			this._careError = this._l.t("care.error_note_length");
			return;
		}
		if (this._careKind === "fertilizing" && i.amount !== null && (!Number.isFinite(i.amount) || Number(i.amount) <= 0 || Number(i.amount) > 1e5 || !i.unit)) {
			this._careError = this._l.t("care.error_amount");
			return;
		}
		if (this._careKind === "note" && (!String(i.text).trim() || String(i.text).length > 1e3)) {
			this._careError = this._l.t("care.error_note_text");
			return;
		}
		if (Object.values(r).some((e) => e.length > 120)) {
			this._careError = this._l.t("care.error_details_length");
			return;
		}
		let o = -n.getTimezoneOffset(), s = `${o < 0 ? "-" : "+"}${String(Math.floor(Math.abs(o) / 60)).padStart(2, "0")}:${String(Math.abs(o) % 60).padStart(2, "0")}`, c = `${this._careDate}:00${s}`, l = this.hass;
		this._careError = "";
		let u = this._careTaskId;
		await this._mutate(async () => (this._careEditingId ? await P.editCareEvent(l, e.id, e.revision, this._careEditingId, this._careKind, c, i) : u ? await P.completeCareTask(l, e.id, u, e.revision, {
			occurred_at: c,
			note: a
		}) : await P.addCareEvent(l, e.id, e.revision, this._careKind, c, i)).plant), this._error || (this._careEditingId = null, this._careTaskId = null, this._careKind = "watering", this._careFields = {}, this._careNote = "");
	}
	async _deleteCare(e, t) {
		if (!this.hass || !this._careHistory || this._careHistory.revision !== e.revision) {
			this._careError = this._l.t("care.error_refresh_delete");
			return;
		}
		if (!window.confirm(this._l.t("care.confirm_delete", { kind: this._l.t(`care_kind_phrase.${t.kind}`) }))) return;
		let n = this.hass;
		await this._mutate(async () => (await P.deleteCareEvent(n, e.id, e.revision, t.id)).plant);
	}
	_openCareForm() {
		this._careTaskId && (this._careTaskId = null, this._careKind = "watering", this._careFields = {}), this._careFormOpen = !0, this._goTo("care", "#care-form select, #care-form input");
	}
	_logCareAt(e, t) {
		let n = new Date(Math.min(t, Date.now()));
		this._careEditingId = null, this._careTaskId = null, this._careKind = e, this._careFields = {}, this._careNote = "", this._careError = "", this._careDate = (/* @__PURE__ */ new Date(n.getTime() - n.getTimezoneOffset() * 6e4)).toISOString().slice(0, 16), this._careFormOpen = !0, this._goTo("care", "#care-form input[type=datetime-local]");
	}
	_closeCareForm() {
		this._careFormOpen = !1, this._careEditingId = null, this._careTaskId = null, this._careKind = "watering", this._careFields = {}, this._careNote = "", this._careError = "";
	}
	_renderCare(e) {
		let t = this._l, n = this._careHistory, r = {
			fertilizing: [
				"product",
				"amount",
				"unit"
			],
			pruning: ["part"],
			repotting: ["container", "medium"],
			note: ["text"]
		}, i = (e) => {
			let n = `care_field.${e}`;
			return Un(n) ? t.t(n) : e;
		}, a = (e) => t.t(`care_kind.${e}`), o = (e) => t.t(`care_kind_phrase.${e}`), s = this._formBusy || !!this._conflict, c = new Set(n?.events.map((e) => e.kind)).size > 1, l = c ? this._careFilter : "all", u = n?.events.filter((e) => l === "all" || e.kind === l) ?? [], d = [["all", t.t("care.filter_all")], ...pa.map((e) => [e, e === "note" ? t.t("care.filter_notes") : a(e)])], f = this._careFormOpen || this._careEditingId !== null, p = this._careTaskId ? (e.care_tasks ?? []).find((e) => e.id === this._careTaskId) : void 0, m = this._careEditingId ? n?.events.find((e) => e.id === this._careEditingId) : void 0, h = !p && !!m && (m.kind === "task" || !!m.task_id), g = !this._careEditingId && !p ? _o(e.care_tasks ?? [], this._careKind) : void 0, _ = (n) => {
			let r = n.task_id ? (e.care_tasks ?? []).find((e) => e.id === n.task_id) : void 0;
			return n.kind === "task" && r ? q(t, r) : a(n.kind);
		}, ee = this._today(), te = ns({
			l: t,
			plant: e,
			overview: this._overview[e.id],
			today: ee,
			timeZone: this._timeZone(),
			states: this._states,
			disabled: s || this._blocked,
			pending: this._carePending,
			onAdd: () => this._openTaskEditor(),
			onRest: () => this._openRestEditor(e),
			onDone: (t) => void this._completeTask(e.id, t),
			onAction: (t, n) => this._taskAction(e, t, n)
		}), v = (e.care_tasks ?? []).length > 0 || !!e.rest_period;
		return b`${v ? te : x}
      ${this._careError ? b`<p class="error" role="alert">${this._careError}</p>` : x}
      ${f ? b`<section class="sp-card" id="care-form" aria-labelledby="care-form-heading"><div class="card-h"><h3 id="care-form-heading">${this._careEditingId ? t.t("care.edit_kind", { kind: o(this._careKind) }) : t.t("care.record")}</h3>
          <button type="button" class="icon-btn" aria-label=${t.t("care.close_form")} @click=${() => this._closeCareForm()}><ha-icon aria-hidden="true" icon="mdi:close"></ha-icon></button></div>
        <div class="card-b care-form"><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict || !n || n.revision !== e.revision}>
        <legend class="sr-only">${this._careEditingId ? t.t("care.edit_kind", { kind: o(this._careKind) }) : t.t("care.record")}</legend>
        ${p ? b`<p class="care-note"><ha-icon aria-hidden="true" .icon=${"mdi:check-circle-outline"}></ha-icon><span>${t.t("care_plan.form_marks_done", { name: q(t, p) })}</span></p>` : h ? b`<p class="care-kind"><span class="small muted">${t.t("care.type")}</span><span>${_({
			...m,
			kind: this._careKind
		})}</span></p>` : b`<label>${t.t("care.type")}<select aria-label=${t.t("care.type")} .value=${this._careKind} @change=${(e) => {
			this._careKind = e.target.value, this._careFields = {};
		}}>${pa.map((e) => b`<option value=${e} ?selected=${e === this._careKind}>${a(e)}</option>`)}</select></label>`}
        ${g ? b`<p class="small care-note"><ha-icon aria-hidden="true" .icon=${"mdi:check-circle-outline"}></ha-icon><span>${t.t("care_plan.form_also_marks", { name: q(t, g) })}</span></p>` : x}
        <label>${t.t("care.when")}<input type="datetime-local" .value=${this._careDate} @input=${(e) => this._careDate = e.target.value}></label>
        ${(r[this._careKind] ?? []).map((e) => b`<label>${i(e)}<input aria-label=${i(e)} type=${e === "amount" ? "number" : "text"} maxlength=${e === "text" ? 1e3 : 120} .value=${this._careFields[e] ?? ""} @input=${(t) => this._careFields = {
			...this._careFields,
			[e]: t.target.value
		}}></label>`)}
        ${this._careKind === "note" ? x : b`<label>${t.t("care.note_optional")}<input type="text" maxlength="500" .value=${this._careNote} @input=${(e) => this._careNote = e.target.value}></label>`}
        ${this._careKind === "fertilizing" ? b`<label>${t.t("care.unit")}<select aria-label=${t.t("care.unit")} .value=${this._careFields.unit ?? ""} @change=${(e) => this._careFields = {
			...this._careFields,
			unit: e.target.value
		}}><option value="">${t.t("care.no_amount")}</option><option value="g">g</option><option value="mL">mL</option></select></label>` : x}
        ${this._careKind === "watering" ? b`<p class="small muted">${t.t("care.no_irrigation")}</p>` : x}
        <div class="actions"><button type="button" class="primary" @click=${() => void this._saveCare(e)}>${this._careEditingId ? t.t("care.save_changes") : t.t("care.record")}</button>
        ${this._careEditingId ? b`<button type="button" @click=${() => {
			this._careEditingId = null, this._careKind = "watering", this._careFields = {}, this._careNote = "";
		}}>${t.t("care.cancel_editing")}</button>` : x}</div>
      </fieldset></div></section>` : x}
      <section class="sp-card care-history" aria-labelledby="care-heading"><div class="card-h"><h3 id="care-heading">${t.t("care.heading")}</h3>
        <button type="button" class="btn text sm" ?disabled=${this._blocked} @click=${() => this._openCareForm()}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("detail.log_care")}</button></div>
      ${n?.events.length ? b`<div class="care-filters">
        ${c ? b`<div class="row" role="group" aria-label=${t.t("care.filter_label")}>${d.map(([e, t]) => b`<button type="button" class="fchip" aria-pressed=${l === e ? "true" : "false"} @click=${() => {
			this._careFilter = e;
		}}>${t}</button>`)}</div>` : x}
        <p class="small muted" role="status">${t.tn(n.summary.watering_count, "care.watering_count_one", "care.watering_count_other")} ${n.summary.last_watered_local_date ? t.t("care.last_watered", { date: t.date(n.summary.last_watered_local_date) }) : t.t("care.never_watered")}</p>
      </div>` : x}
      ${n ? n.events.length ? u.length ? b`<ul class="list" aria-label=${t.t("care.events_label")}>${u.map((n) => {
			let r = ka(t, n, i), c = t.recordedDateTime(n.occurred_at);
			return b`<li class="li"><span class="ic tonal" aria-hidden="true"><ha-icon .icon=${ma[n.kind]}></ha-icon></span>
            <span class="li-main"><span class="li-title">${_(n)}</span><span class="li-sub"><time datetime=${n.occurred_at}>${c}</time>${r.map((e) => b` · <span class="prose">${e}</span>`)}</span></span>
            <ha-dropdown @wa-select=${(t) => {
				t.detail.item.value === "edit" ? (this._careTaskId = null, this._editCare(n), this._goTo("care", "#care-form select, #care-form input")) : t.detail.item.value === "delete" && this._deleteCare(e, n);
			}}>
              <button slot="trigger" type="button" class="icon-btn" ?disabled=${s} aria-label=${t.t("care.event_menu", {
				kind: a(n.kind),
				date: c
			})}><ha-icon aria-hidden="true" icon="mdi:dots-vertical"></ha-icon></button>
              <ha-dropdown-item value="edit" ?disabled=${s}>${t.t("care.edit_kind", { kind: o(n.kind) })}<ha-icon slot="icon" icon="mdi:pencil-outline"></ha-icon></ha-dropdown-item>
              <ha-dropdown-item value="delete" ?disabled=${s}>${t.t("care.delete_kind", { kind: o(n.kind) })}<ha-icon slot="icon" icon="mdi:delete-outline"></ha-icon></ha-dropdown-item>
            </ha-dropdown></li>`;
		})}</ul>` : b`<p class="card-b muted">${t.t("care.filter_empty")}</p>` : b`<p class="card-b muted">${t.t("care.empty")}</p>` : b`<p class="card-b muted">${t.t("care.loading")}</p>`}</section>
      ${v ? x : te}`;
	}
	_edit(e) {
		this._edits && (this._edits = {
			...this._edits,
			...e
		});
	}
	async _save(e) {
		let t = this._base, n = this._edits;
		if (!this.hass || !t || !n || this._formBusy || this._blocked || this._conflict || e === "area" && this._areaReview) return;
		if (e === "area" && (this._registryError || n.area && !this._areas.some((e) => e.area_id === n.area))) {
			this._error = this._l.t("error.area_reconnect");
			return;
		}
		let r = this.hass, i = {
			plant_id: t.id,
			expected_revision: t.revision
		};
		if (e === "identity") {
			if (!n.name.trim() || n.name.trim().length > 200 || n.acquired && !Number.isFinite(Date.parse(n.acquired))) {
				this._error = this._l.t("error.identity");
				return;
			}
			Object.assign(i, {
				name: n.name.trim(),
				acquired_at: n.acquired ? new Date(n.acquired).toISOString() : null,
				placement: n.placement
			});
		}
		if (e === "taxonomy") {
			let e = Mi(n.category, ji(n.tagText), this._l);
			if (e) {
				this._error = e;
				return;
			}
			Object.assign(i, {
				category: n.category.trim() || null,
				tags: ji(n.tagText)
			});
		}
		if (e === "species" && (i.species = bi(n.common, n.latin)), e === "moisture") {
			if (!n.moisture) return;
			if (this._registryError) {
				this._error = this._l.t("error.moisture_reconnect");
				return;
			}
			let e = _i(n.moisture, this._defaults(t), this._l);
			if (e) {
				this._error = e;
				return;
			}
		}
		await this._mutate(async () => e === "area" ? await P.setArea(r, t.id, t.revision, n.area || null) : e === "moisture" && n.moisture ? P.configureMoisture(r, t.id, t.revision, xi(n.moisture, this._entities)) : P.update(r, i), !1, e);
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
				this._plants = this._plants.map((e) => e.id === o.id ? o : e), i && this._base?.id === o.id && this._rebaseEdits(i, o, n), n === "area" && a !== void 0 && (this._baseArea = a, this._edit({ area: a }), this._areaReview = !1), this._syncImage(), this._notice = this._l.t("notice.saved");
			}
			t && this._show({ kind: "list" }), await this._refresh(!1);
		} catch (e) {
			if (r !== this._context || !this.isConnected) return;
			this._error = this._friendly(e), e instanceof M && e.code === "revision_conflict" && await this._refresh(!1), e instanceof M && ["integration_not_loaded", "unauthorized"].includes(e.code) && (this._blocked = !0, this._clearImage());
		} finally {
			r === this._context && (this._formBusy = !1);
		}
	}
	_defaults(e) {
		let t = L(e);
		return t ? {
			min: t.threshold_defaults.min.value,
			target: t.threshold_defaults.target.value,
			max: t.threshold_defaults.max.value
		} : Zn;
	}
	_reviewConflict() {
		if (!this._conflict || !this._edits) return;
		let e = this._sourceConflictFields(this._conflict.after);
		this._rebaseEdits(this._conflict.before, this._conflict.after);
		let t = this._l;
		this._notice = [
			t.t("conflict.reviewed"),
			...e.length ? [t.t("conflict.reviewed_overlap", { fields: this._sourceFieldList(e) })] : [],
			t.t("conflict.reviewed_species")
		].join(" ");
	}
	_sourceFieldList(e) {
		return e.map((e) => this._l.t(`source_field.${e}`)).join(", ");
	}
	_sourceConflictFields(e) {
		if (!this._sourceRole || !this._sourceEdits || !this._sourceBaseline) return [];
		let t = B(e, this._sourceRole);
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
		r.name !== e.name && (d.name = r.name), r.acquired !== (e.acquired_at ?? "") && (d.acquired = r.acquired), JSON.stringify(r.placement) !== JSON.stringify(e.placement) && (d.placement = r.placement), r.category !== (e.category ?? "") && (d.category = r.category), JSON.stringify(ji(r.tagText)) !== JSON.stringify(e.tags) && (d.tagText = r.tagText), r.area !== this._baseArea && (d.area = r.area), r.common !== (e.species?.snapshot.common_name ?? "") && (d.common = r.common), r.latin !== (e.species?.snapshot.latin_name ?? "") && (d.latin = r.latin);
		let f = L(e), p = L(t);
		if (r.moisture && f && p) {
			let e = gi(p);
			for (let t of [
				"sources",
				"primary_entity_id",
				"aggregation",
				"stale_after_seconds"
			]) JSON.stringify(r.moisture[t]) !== JSON.stringify(f[t]) && Object.assign(e, { [t]: structuredClone(r.moisture[t]) });
			for (let t of I) r.moisture.threshold_overrides[t] !== f.threshold_overrides[t] && (e.threshold_overrides[t] = r.moisture.threshold_overrides[t]);
			d.moisture = e;
		}
		let m = {
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
		if (n) for (let e of m[n]) delete d[e];
		if (this._beginEdit(t), this._edit(d), this._areaReview = i, a && o && s) {
			let e = B(t, a);
			if (e) {
				let t = Di(e), n = structuredClone(t);
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
			let e = Sc[c];
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
			let e = await P.searchSpecies(this.hass, this._provider, this._query.trim(), this.hass.language ?? "en");
			t === this._providerRequest && (this._results = e, e.length || (this._notice = this._l.t("species.no_matches")));
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
			let t = e ? await P.previewSpecies(this.hass, e.provider, e.provider_ref, this.hass.language ?? "en", i.id) : await P.previewSpeciesRefresh(this.hass, i.id, this.hass.language ?? "en");
			if (!e && (t.provider !== i.species?.provider || t.snapshot.provider_ref !== i.species?.snapshot.provider_ref)) throw new M("invalid_response", "Species refresh returned a different species.");
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
			t && !t.open && t.showModal(), t?.querySelector(e === "delete" ? "button" : "h2")?.focus();
		});
	}
	_closeDialog() {
		this.shadowRoot?.querySelector("dialog")?.close(), this._dialog = null, this._taskEditor = null, this._automateTaskId = null, this._restEditor = null, this._snoozeDraft = null, (this._focusReturn?.isConnected && !this._focusReturn.matches(":disabled") ? this._focusReturn : this.shadowRoot?.querySelector("h1"))?.focus(), this._focusReturn = null;
	}
	_renderDialog() {
		if (!this._dialog || !this._base) return x;
		if (this._dialog === "care_task" || this._dialog === "care_automate" || this._dialog === "care_rest") return this._renderCareDialog(this._base.id);
		if (this._dialog === "snooze") return this._renderSnoozeDialog(this._base.id);
		let e = this._base, t = this._preview, n = this._l;
		return b`<dialog aria-labelledby="dialog-title" @cancel=${(e) => {
			e.preventDefault(), this._closeDialog();
		}} @keydown=${(e) => this._trapFocus(e)}><h2 id="dialog-title" tabindex="-1">${this._dialog === "delete" ? n.t("dialog.delete_title", { name: e.name }) : n.t("dialog.species_title")}</h2>
      ${this._dialog === "delete" ? b`<p>${n.t("dialog.delete_body")}</p>` : t ? Ji(n, t.snapshot, t) : b`<p>${n.t("dialog.preview_invalid")}</p>`}
      <div class="actions"><button @click=${() => this._closeDialog()}>${n.t("common.cancel")}</button><button class="primary" ?disabled=${this._formBusy || this._blocked || !!this._conflict || this._dialog === "species" && !t} @click=${() => {
			let n = this._dialog;
			if (this._closeDialog(), !this.hass) return;
			let r = this.hass;
			n === "delete" ? this._mutate(() => P.delete(r, e.id, e.revision), !0) : t && this._mutate(() => P.applySpecies(r, e.id, e.revision, t.preview_token, t.provider, t.operation), !1, "species");
		}}>${this._dialog === "delete" ? n.t("dialog.delete_confirm") : n.t("dialog.species_confirm")}</button></div></dialog>`;
	}
	_trapFocus(e) {
		if (e.key !== "Tab") return;
		let t = [...e.currentTarget.querySelectorAll("button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary")], n = t[0], r = t.at(-1);
		e.shiftKey && (this.shadowRoot?.activeElement === n || this.shadowRoot?.activeElement?.matches("#dialog-title")) ? (e.preventDefault(), r?.focus()) : !e.shiftKey && this.shadowRoot?.activeElement === r && (e.preventDefault(), n?.focus());
	}
	_timeZone() {
		let e = this.hass?.config?.time_zone;
		return typeof e == "string" && e ? e : void 0;
	}
	_today() {
		return ho((/* @__PURE__ */ new Date()).toISOString(), this._timeZone()) ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
	}
	_openTaskEditor(e) {
		this._taskEditor = e ? {
			step: 2,
			taskId: e.id,
			draft: ko(e),
			errors: {},
			error: "",
			moreOpen: e.baseline_done_on !== null
		} : {
			step: 1,
			taskId: null,
			draft: xo("custom"),
			errors: {},
			error: "",
			moreOpen: !1
		}, this._openDialog("care_task");
	}
	_setTaskEditor(e, t = !1) {
		this._taskEditor && (this._taskEditor = {
			...this._taskEditor,
			...e
		}, t && this.updateComplete.then(() => this.shadowRoot?.querySelector("#dialog-title")?.focus()));
	}
	_editTaskDraft(e) {
		let t = this._taskEditor;
		if (!t) return;
		let n = {
			...t.draft,
			...e
		}, r = Object.keys(t.errors).length ? Lo(n, this._today(), this._states).errors ?? {} : {};
		this._taskEditor = {
			...t,
			draft: n,
			errors: r
		};
	}
	async _saveTask(e) {
		let t = this._taskEditor, n = this.hass, r = this._l;
		if (!t || !n || this._formBusy || this._blocked) return;
		let i = Lo(t.draft, this._today(), this._states);
		if (!i.input) {
			this._setTaskEditor({
				errors: i.errors,
				moreOpen: t.moreOpen || !!i.errors.lastDone || !!i.errors.forHours || !!i.errors.resetValue
			}), this.updateComplete.then(() => this.shadowRoot?.querySelector("dialog [aria-invalid=true], dialog .monthpick button")?.focus());
			return;
		}
		let a = i.input, o = this._context, s = q(r, {
			type: a.task_type,
			name: a.name
		});
		this._formBusy = !0, this._setTaskEditor({
			errors: {},
			error: ""
		}), this._request++;
		try {
			let i;
			if (t.taskId) {
				let o = this._plantById(e)?.care_tasks?.find((e) => e.id === t.taskId);
				if (!o) {
					this._setTaskEditor({ error: r.t("care_plan.error_task_gone") });
					return;
				}
				let s = zo(o, a);
				Object.keys(s).length && (i = await this._withRevision(e, (t) => P.updateCareTask(n, e, o.id, t, s)));
			} else i = (await this._withRevision(e, (t) => P.createCareTask(n, e, t, a))).plant;
			if (o !== this._context) return;
			i && (this._adopt(i), this._followQuickWrite(i)), this._formBusy = !1, this._closeDialog(), this._toast(r.t(t.taskId ? "care_plan.saved_toast" : "care_plan.added_toast", { name: s }));
		} catch (e) {
			o === this._context && this._setTaskEditor({ error: this._friendly(e) });
		} finally {
			o === this._context && (this._formBusy = !1, this._refresh(!1));
		}
	}
	_openRestEditor(e) {
		this._restEditor = {
			draft: $o(e.rest_period ?? null, e.care_tasks ?? []),
			error: ""
		}, this._openDialog("care_rest");
	}
	_editRest(e) {
		let t = this._restEditor;
		if (!t) return;
		let n = {
			...t.draft,
			...e
		}, r = t.error ? ((e) => e.error ? this._l.t(e.error) : "")(es(n)) : "";
		this._restEditor = {
			draft: n,
			error: r
		};
	}
	async _saveRest(e, t = !1) {
		let n = this._restEditor, r = this.hass, i = this._l;
		if (!n || !r || this._formBusy || this._blocked) return;
		let a = t ? null : es(n.draft);
		if (a && !a.rest) {
			this._restEditor = {
				...n,
				error: i.t(a.error)
			};
			return;
		}
		let o = a?.rest ?? null, s = this._context;
		this._formBusy = !0, this._restEditor = {
			...n,
			error: ""
		}, this._request++;
		try {
			let a = this._plantById(e);
			if (!a) return;
			let c = a;
			if (JSON.stringify(o) !== JSON.stringify(a.rest_period ?? null) && (c = await this._withRevision(e, (t) => P.setRestPeriod(r, e, t, o)), this._adopt(c), this._followQuickWrite(c)), !t) for (let t of ts(c.care_tasks ?? [], n.draft.off)) c = await this._withRevision(e, (n) => P.updateCareTask(r, e, t.task.id, n, { schedule: t.schedule })), this._adopt(c), this._followQuickWrite(c);
			if (s !== this._context) return;
			this._formBusy = !1, this._closeDialog(), this._toast(i.t(t ? "care_plan.rest_removed_toast" : "care_plan.rest_saved_toast"));
		} catch (e) {
			s === this._context && this._restEditor && (this._restEditor = {
				...this._restEditor,
				error: this._friendly(e)
			});
		} finally {
			s === this._context && (this._formBusy = !1, this._refresh(!1));
		}
	}
	_setCarePending(e, t) {
		let n = new Set(this._carePending);
		t ? n.add(e) : n.delete(e), this._carePending = n;
	}
	async _careTaskWrite(e, t, n, r) {
		let i = this.hass;
		if (!i || this._blocked || this._formBusy || this._carePending.has(t)) return null;
		let a = this._context;
		this._setCarePending(t, !0), this._careError = "", this._request++;
		try {
			let t = await this._withRevision(e, (e) => n(i, e));
			if (a === this._context) {
				let e = r(t);
				this._adopt(e), this._followQuickWrite(e);
			}
			return t;
		} catch (e) {
			return a === this._context && (this._careError = this._friendly(e)), null;
		} finally {
			this._setCarePending(t, !1), a === this._context && this._refresh(!1);
		}
	}
	async _completeTask(e, t) {
		let n = this._l, r = q(n, t), i = await this._careTaskWrite(e, t.id, (n, r) => P.completeCareTask(n, e, t.id, r), (e) => e.plant);
		i && this._toast(n.t("care_plan.done_toast", { name: r }), {
			text: n.t("care_plan.undo"),
			action: () => void this._careTaskWrite(e, t.id, (t, n) => P.deleteCareEvent(t, e, n, i.event_id), (e) => e.plant)
		});
	}
	async _skipTask(e, t) {
		let n = this._l, r = q(n, t), i = await this._careTaskWrite(e, t.id, (n, r) => P.skipCareTask(n, e, t.id, r), (e) => e.plant);
		i && this._toast(n.t("care_plan.skipped_toast", { name: r }), {
			text: n.t("care_plan.undo"),
			action: () => void this._careTaskWrite(e, t.id, (n, r) => P.undoSkipCareTask(n, e, t.id, r, i.previous_skipped_on), (e) => e)
		});
	}
	async _deleteTask(e, t) {
		let n = this._l, r = q(n, t);
		window.confirm(n.t("care_plan.confirm_delete", { name: r })) && (this._dialog && this._closeDialog(), await this._careTaskWrite(e, t.id, (n, r) => P.deleteCareTask(n, e, t.id, r), (e) => e) && this._toast(n.t("care_plan.deleted_toast", { name: r })));
	}
	_taskAction(e, t, n) {
		switch (n) {
			case "mark_done": {
				let e = Pa[t.type];
				this._careEditingId = null, this._careFields = {}, this._careNote = "", this._careError = "", this._careTaskId = e === "task" ? t.id : null, this._careKind = e;
				let n = /* @__PURE__ */ new Date();
				this._careDate = (/* @__PURE__ */ new Date(n.getTime() - n.getTimezoneOffset() * 6e4)).toISOString().slice(0, 16), this._careFormOpen = !0, this._goTo("care", "#care-form input, #care-form select");
				return;
			}
			case "skip":
				this._skipTask(e.id, t);
				return;
			case "edit":
				this._openTaskEditor(t);
				return;
			case "automate":
				this._automateTaskId = t.id, this._openDialog("care_automate");
				return;
			case "delete":
				this._deleteTask(e.id, t);
				return;
		}
	}
	_automateRows(e, t) {
		let n = this._l, r = Go(e.id, t.id), i = (e) => this._entities.find((t) => t.platform === "smart_plants" && t.unique_id === e)?.entity_id ?? null;
		return [
			{
				icon: "mdi:toggle-switch-outline",
				entityId: i(r.due),
				description: n.t("care_plan.automate_due", { name: q(n, t) })
			},
			...t.schedule.kind === "reading" ? [] : [{
				icon: "mdi:calendar-clock",
				entityId: i(r.next),
				description: n.t("care_plan.automate_next"),
				note: n.t("care_plan.automate_next_disabled")
			}],
			{
				icon: "mdi:calendar-check-outline",
				entityId: i(r.careDue),
				description: n.t("care_plan.automate_care_due")
			}
		];
	}
	_copyEntityId(e) {
		let t = this._l, n = typeof navigator > "u" ? void 0 : navigator.clipboard;
		if (!n) {
			this._toast(t.t("care_plan.copy_failed"));
			return;
		}
		n.writeText(e).then(() => this._toast(t.t("care_plan.copied", { entity: e })), () => this._toast(t.t("care_plan.copy_failed")));
	}
	_renderCareDialog(e) {
		let t = this._l, n = this._plantById(e);
		if (!n) return x;
		let r = "", i = x;
		if (this._dialog === "care_task" && this._taskEditor) {
			let e = this._taskEditor;
			r = as(t, e), i = os({
				l: t,
				plant: n,
				overview: this._overview[n.id],
				hass: this.hass,
				states: this._states,
				state: e,
				today: this._today(),
				busy: this._formBusy || this._blocked,
				onPreset: (e) => this._setTaskEditor({
					step: 2,
					draft: xo(e, n, this._states, t),
					errors: {},
					error: "",
					moreOpen: !1,
					otherSensor: !1
				}, !0),
				onSuggestion: (e, r) => this._setTaskEditor({
					step: 2,
					draft: Oo(e, r, n, this._states, t),
					errors: {},
					error: "",
					moreOpen: !1,
					otherSensor: !1
				}, !0),
				onDraft: (e) => this._setTaskEditor({
					step: 2,
					draft: e,
					errors: {},
					error: "",
					moreOpen: !1,
					otherSensor: !1
				}, !0),
				onEditor: (e) => this._setTaskEditor(e),
				onExpand: (e) => this._setTaskEditor({ expanded: e }),
				onBack: () => this._setTaskEditor({
					step: 1,
					errors: {},
					error: ""
				}, !0),
				onChange: (e) => this._editTaskDraft(e),
				onMonth: (e) => {
					let t = this._taskEditor?.draft;
					t && this._editTaskDraft(Ao(t.startMonth, t.endMonth, e));
				},
				onToggleMore: () => this._setTaskEditor({ moreOpen: !this._taskEditor?.moreOpen }),
				onSave: () => void this._saveTask(n.id),
				onCancel: () => this._closeDialog(),
				onDelete: () => {
					let t = n.care_tasks?.find((t) => t.id === e.taskId);
					t && this._deleteTask(n.id, t);
				}
			});
		} else if (this._dialog === "care_rest" && this._restEditor) {
			let e = this._restEditor;
			r = t.t("care_plan.rest_period"), i = gs({
				l: t,
				plant: n,
				draft: e.draft,
				error: e.error,
				busy: this._formBusy || this._blocked,
				onMonth: (e) => {
					let t = this._restEditor;
					t && this._editRest({ ...Ao(t.draft.startMonth, t.draft.endMonth, e) });
				},
				onToggle: (e, t) => {
					let n = this._restEditor;
					if (!n) return;
					let r = new Set(n.draft.off);
					t ? r.add(e) : r.delete(e), this._editRest({ off: r });
				},
				onSave: () => void this._saveRest(n.id),
				onRemove: () => void this._saveRest(n.id, !0),
				onCancel: () => this._closeDialog()
			});
		} else if (this._dialog === "care_automate") {
			let e = n.care_tasks?.find((e) => e.id === this._automateTaskId);
			e ? (r = t.t("care_plan.automate_title", { name: q(t, e) }), i = _s({
				l: t,
				rows: this._automateRows(n, e),
				onCopy: (e) => this._copyEntityId(e),
				onOpenEditor: () => {
					this._closeDialog(), this._navigate("/config/automation/edit/new");
				},
				onClose: () => this._closeDialog()
			})) : i = b`<p>${t.t("care_plan.error_task_gone")}</p><div class="actions dialog-actions"><span class="spacer"></span><button type="button" @click=${() => this._closeDialog()}>${t.t("care_plan.close")}</button></div>`;
		}
		return b`<dialog class="care-dialog" aria-labelledby="dialog-title" @cancel=${(e) => {
			e.preventDefault(), this._formBusy || this._closeDialog();
		}} @keydown=${(e) => this._trapFocus(e)}>
      <h2 id="dialog-title" tabindex="-1">${r}</h2><div class="dialog-body">${i}</div></dialog>`;
	}
	async _uploadImage(e, t) {
		if (!this.hass || this._formBusy || this._blocked) return;
		let n = this._context;
		this._formBusy = !0;
		let r;
		try {
			r = await ks(t, this._l);
		} catch (e) {
			n === this._context && (this._error = e.message);
			return;
		} finally {
			n === this._context && (this._formBusy = !1);
		}
		if (n !== this._context || !this.isConnected || this._view.kind !== "detail" || this._view.plantId !== e.id || this._base?.revision !== e.revision) return;
		let i = this.hass;
		await this._mutate(() => P.uploadImage(i, e.id, e.revision, r));
	}
	_renderPhotoRow(e) {
		let t = this._l, n = this._formBusy || this._blocked || !!this._conflict, r = e.image ? this._imageLoading ? b`<span role="status">${t.t("photo.loading")}</span>` : this._imageError ? b`<span class="error-text" role="alert">${t.t("photo.load_failed", { error: this._imageError })}</span> <button type="button" class="btn text sm" @click=${() => {
			this._clearImage(), this._syncImage();
		}}>${t.t("photo.retry")}</button>` : t.t("photo.stored", {
			type: e.image.content_type,
			width: e.image.width,
			height: e.image.height
		}) : t.t("photo.none");
		return b`<div class="setrow"><div><div class="setrow-h">${t.t("settings.photo")}</div><div class="setrow-d">${r}</div><div class="setrow-d">${t.t("photo.hint")}</div></div>
      <div class="row">
        <label class="btn text sm">${e.image ? t.t("photo.replace") : t.t("photo.upload")}<input class="file-input" type="file" accept="image/jpeg,image/png,image/webp" ?disabled=${n} @change=${(t) => {
			let n = t.target, r = n.files?.[0];
			n.value = "", r && this._uploadImage(e, r);
		}}></label>
        ${e.image ? b`<button type="button" class="btn text sm" ?disabled=${n} @click=${() => {
			if (this.hass) {
				let t = this.hass;
				this._mutate(() => P.deleteImage(t, e.id, e.revision));
			}
		}}>${t.t("photo.remove")}</button>` : x}
      </div></div>`;
	}
	_saveButton(e, t) {
		return b`<button class="primary" @click=${() => void this._save(e)}>${t}</button>`;
	}
	_renderOverallHealth(e) {
		let t = this._health[e.id], n = this._l, r = n.t("section.overall_health_unavailable");
		return b`<section aria-labelledby="overall-health-heading"><h3 id="overall-health-heading">${n.t("section.overall_health")}</h3>
      ${t ? b`
        <p role="status" aria-live="polite">${t.available && t.health_score !== null ? n.t("section.overall_health_available_summary", { score: t.health_score }) : n.t("section.overall_health_unavailable_detail")}</p>
        <dl class="overall-health">
          <dt>${n.t("section.overall_health_confidence")}</dt><dd>${nr(t.confidence_label, n)} — ${tr(t.confidence_label, n)}</dd>
          <dt>${n.t("section.overall_health_included_roles")}</dt><dd>${t.contributors.length ? b`<ul class="contributors">${t.contributors.map((e) => b`<li>${er(e, n)}</li>`)}</ul>` : n.t("section.overall_health_none_contributing")}</dd>
          <dt>${n.t("section.overall_health_configured_unavailable")}</dt><dd>${(() => {
			let e = t.configured.filter((e) => !t.contributors.includes(e));
			return e.length ? b`<ul class="configured-unavailable">${e.map((e) => b`<li>${er(e, n)}</li>`)}</ul>` : n.t("section.overall_health_all_included");
		})()}</dd>
        </dl>
      ` : b`<p role="status">${this._healthError ? `${r} ${this._healthError}` : r}</p>`}
    </section>`;
	}
	_renderDiagnostics(e) {
		let t = this._l, n = mi(e, this._entities, this._states, t), r = n.filter((e) => e.status === "on").length, i = r === 0 ? t.t("section.advanced_diagnostics_zero_active") : t.tn(r, "section.advanced_diagnostics_one_active", "section.advanced_diagnostics_many_active");
		return b`<section aria-labelledby="diagnostics-heading"><h3 id="diagnostics-heading">${t.t("section.advanced_diagnostics")}</h3>
      <p role="status" aria-live="polite">${i}</p>
      <p>${t.t("section.advanced_diagnostics_description")}</p>
      <dl class="diagnostics">${n.map((n) => {
			let r = n.status === "not_configured" ? [] : pi(e, n.role, this._entities, this._states, t);
			return b`<dt>${n.label}</dt><dd class=${"status-" + n.status}>${this._problemStatusText(n.status)}${n.reason ? b` — ${this._problemReason(n.reason)}` : x}${r.length ? b`<ul class="thresholds" aria-label=${t.t("section.effective_thresholds_label", { label: n.label })}>${r.map((e) => b`<li><span class="threshold-label">${e.label}</span>: <span class="threshold-value">${e.value === null ? "—" : `${t.number(e.value)} ${e.unit}`}</span></li>`)}</ul>` : x}</dd>`;
		})}</dl></section>`;
	}
	_problemStatusText(e) {
		let t = this._l;
		return e === "on" ? t.t("section.advanced_diagnostics_status_problem") : e === "off" ? t.t("section.advanced_diagnostics_status_ok") : e === "unavailable" ? t.t("section.advanced_diagnostics_status_unavailable") : t.t("section.advanced_diagnostics_status_not_configured");
	}
	_renderOtherTargets(e) {
		let t = this._l, n = mi(e, this._entities, this._states, t).filter((e) => e.status !== "not_configured" && Sc[e.role]), r = this._pendingThresholdSwitch, i = this._thresholdRole ? Sc[this._thresholdRole] : null, a = i ? t.t(`problem_phrase.${i.problemRole}`) : "", o = r ? t.t(`problem_phrase.${r.spec.problemRole}`) : "";
		return b`<p class="small muted">${t.t("other_targets.intro")}</p>
      ${r ? b`<p class="notice threshold-switch-alert" role="alert">${t.t("section.advanced_diagnostics_switch_prompt", {
			current: a,
			pending: o
		})}
        <button type="button" class="primary" @click=${() => this._confirmDiscardAndSwitch()}>${t.t("section.advanced_diagnostics_switch_discard")}</button>
        <button type="button" @click=${() => {
			this._pendingThresholdSwitch = null;
		}}>${t.t("section.advanced_diagnostics_switch_keep")}</button>
      </p>` : x}
      ${n.length ? b`<dl class="other-targets">${n.map((n) => {
			let r = Sc[n.role], i = pi(e, n.role, this._entities, this._states, t), a = this._thresholdRole === n.role && this._thresholdEdits !== null, o = this._thresholdSaved[n.role];
			return b`<dt>${n.label}</dt><dd>${i.length ? b`<ul class="thresholds" aria-label=${t.t("section.effective_thresholds_label", { label: n.label })}>${i.map((e) => b`<li><span class="threshold-label">${e.label}</span>: <span class="threshold-value">${e.value === null ? "—" : `${t.number(e.value)} ${e.unit}`}</span></li>`)}</ul>` : x}
          <button class="threshold-toggle btn outline sm" type="button" aria-expanded=${a ? "true" : "false"} aria-controls=${`${n.role}-editor`} ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._toggleThresholdEdit(r, e)}>${a ? t.t("section.advanced_diagnostics_cancel_edit") : t.t("section.advanced_diagnostics_edit_thresholds")}</button>${a ? this._renderThresholdEditor(r, e) : x}${o && !a ? b`<p class="notice" role="status">${o}</p>` : x}</dd>`;
		})}</dl>` : b`<p>${t.t("other_targets.none")}</p>`}`;
	}
	_problemReason(e) {
		let t = `problem_reason.${e}`;
		return Un(t) ? this._l.t(t) : e;
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
		if (!n) return x;
		let r = this._l, i = (t) => {
			let i = n[t].trim(), a = Number(i);
			return i === "" ? r.number(e.defaults[t]) : Number.isFinite(a) ? r.number(a) : i;
		}, a = (t) => b`<label>${r.t(e.labels[t], { unit: e.unit })}<input type="number" step=${e.step} min=${e.min} max=${e.max} inputmode="decimal" .value=${n[t]} @input=${(e) => this._editThreshold({ [t]: e.target.value })}></label><small>${r.t("threshold.default_effective", {
			default: r.number(e.defaults[t]),
			effective: i(t),
			unit: e.unit
		})}</small><button type="button" @click=${() => this._editThreshold({ [t]: "" })}>${r.t("threshold.inherit")}</button>`;
		return b`<div id=${`${e.problemRole}-editor`} class="threshold-editor" role="group" aria-label=${r.t("threshold.group_label", { label: r.t(`problem_phrase.${e.problemRole}`) })}>
      <p>${r.t(`threshold_intro.${e.problemRole}`)}</p>
      <fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
        <div class="grid">${e.keys.map((e) => b`<div>${a(e)}</div>`)}</div>
        ${this._thresholdError ? b`<p class="error" role="alert">${this._thresholdError}</p>` : x}
        <div class="actions">
          <button type="button" @click=${() => this._editThreshold(Object.fromEntries(e.keys.map((e) => [e, ""])))}>${r.t("threshold.inherit_all")}</button>
          <button type="button" @click=${() => {
			this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._pendingThresholdSwitch = null;
		}}>${r.t("common.cancel")}</button>
          <button type="button" class="primary" @click=${() => void this._saveThresholds(e, t)}>${r.t("threshold.save")}</button>
        </div>
      </fieldset>
    </div>`;
	}
	async _saveThresholds(e, t) {
		if (!this.hass || !this._thresholdEdits || this._formBusy || this._blocked || this._conflict) return;
		let { values: n, error: r } = e.validate(this._thresholdEdits, this._l);
		if (r) {
			this._thresholdError = r;
			return;
		}
		this._thresholdError = "";
		let i = this.hass;
		await this._mutate(() => P.setThresholdOverrides(i, t.id, t.revision, e.configRole, n)), this._error || (this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._pendingThresholdSwitch = null, this._thresholdSaved = {
			...this._thresholdSaved,
			[e.problemRole]: this._l.t(`threshold_saved.${e.problemRole}`)
		});
	}
	_sourceSummary(e, t) {
		let n = t === "moisture" ? L(e) : B(e, t), r = this._l;
		if (!n) return r.t("sensors.summary_unavailable");
		if (!n.sources.length) return r.t("sensors.summary_empty");
		let i = [r.tn(n.sources.length, "sensors.source_count_one", "sensors.source_count_other"), zi(r, n.aggregation)];
		return n.primary_entity_id && n.sources.length > 1 && i.push(r.t("sensors.summary_primary", { name: ha(r, this._states, n.primary_entity_id) })), i.push(r.t("sensors.summary_stale", { duration: Oa(r, n.stale_after_seconds) })), i.join(" · ");
	}
	_toggleSourceEdit(e, t, n = "combine") {
		if (this._sourceRole === e && this._sourceEdits !== null) {
			if (this._sourceMode !== n) {
				this._sourceMode = n;
				return;
			}
			this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._pendingSourceSwitch = null;
			return;
		}
		this._openSensorEditor(e, t, n);
	}
	_openSensorEditor(e, t, n) {
		if (e === "moisture") {
			this._moistureMode = n, this._focusEditor(n, e);
			return;
		}
		if (this._sourceRole === e && this._sourceEdits !== null) {
			this._sourceMode = n, this._focusEditor(n, e);
			return;
		}
		if (this._sourceRole && this._sourceRole !== e && this._hasUnsavedSourceChanges()) {
			this._pendingSourceSwitch = {
				role: e,
				plant: t,
				mode: n
			};
			return;
		}
		this._openSourceEditor(e, t, n);
	}
	_focusEditor(e, t) {
		if (e !== "pick") return;
		let n = this._context;
		this.updateComplete.then(() => {
			if (n !== this._context) return;
			let e = this.shadowRoot?.querySelector(`#${t}-picker-heading`);
			e?.scrollIntoView?.({ block: "nearest" }), e?.focus();
		});
	}
	_openSourceEditor(e, t, n = "combine") {
		let r = B(t, e);
		if (!r) {
			this._sourceUnavailable = {
				role: e,
				plantId: t.id,
				revision: t.revision,
				mode: n
			}, this._pendingSourceSwitch = null;
			return;
		}
		let i = Di(r);
		this._sourceRole = e, this._sourceEdits = i, this._sourceBaseline = structuredClone(i), this._sourceMode = n, this._sourceError = "", this._pendingSourceSwitch = null, this._allSourceSensors = !1, this._sourceUnavailable = null, this._sourceSaved = {
			...this._sourceSaved,
			[e]: ""
		}, this._focusEditor(n, e);
	}
	_sourceRefused(e, t, n) {
		let r = this._sourceUnavailable;
		return !!r && r.role === t && r.mode === n && r.plantId === e.id && r.revision === e.revision && !B(e, t);
	}
	_hasUnsavedSourceChanges() {
		return !this._sourceEdits || !this._sourceBaseline ? !1 : JSON.stringify(this._sourceEdits) !== JSON.stringify(this._sourceBaseline);
	}
	_confirmSourceSwitch() {
		let e = this._pendingSourceSwitch;
		e && this._openSourceEditor(e.role, e.plant, e.mode);
	}
	_editSource(e) {
		this._sourceEdits && (this._sourceEdits = {
			...this._sourceEdits,
			...e
		});
	}
	_closeSourceEditor() {
		this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._pendingSourceSwitch = null;
	}
	_closeMoistureEditor() {
		let e = this._base ? L(this._base) : null;
		if (e && this._edits?.moisture) {
			let t = gi(e);
			this._edit({ moisture: {
				...this._edits.moisture,
				sources: t.sources,
				primary_entity_id: t.primary_entity_id,
				aggregation: t.aggregation,
				stale_after_seconds: t.stale_after_seconds
			} });
		}
		this._moistureMode = null;
	}
	async _saveMoistureSensors() {
		await this._save("moisture"), this._error || (this._moistureMode = null);
	}
	_assignedSensors(e) {
		let t = ["moisture", ...Ci.map((e) => e.role)], n = Object.keys(k);
		return t.sort((e, t) => n.indexOf(e) - n.indexOf(t)).flatMap((t) => {
			let n = t === "moisture" ? L(e) : B(e, t);
			return n ? n.sources.map((e) => ({
				role: t,
				entityId: z(e, this._entities)?.entity_id ?? e.entity_id,
				main: n.primary_entity_id === e.entity_id,
				several: n.sources.length > 1
			})) : [];
		});
	}
	_sensorValue(e) {
		let t = this._states[e], n = this._l;
		if (!t) return "";
		let r = Number(t.state), i = typeof t.attributes.unit_of_measurement == "string" ? t.attributes.unit_of_measurement : "";
		return t.state.trim() !== "" && Number.isFinite(r) ? j(n, r, i) : t.state === "unavailable" || t.state === "unknown" ? n.t("sources.unavailable") : t.state;
	}
	async _sensorAction(e, t, n, r) {
		if (r === "change") {
			this._openSensorEditor(t, e, "pick");
			return;
		}
		if (!this.hass || this._formBusy || this._blocked || this._conflict) return;
		if (this._registryError) {
			this._error = this._l.t("error.sources_reconnect");
			return;
		}
		let i = this.hass;
		if (t === "moisture") {
			let t = L(e);
			if (!t) return;
			let a = gi(t);
			if (r === "remove") a.sources = a.sources.filter((e) => e.entity_id !== n), a.primary_entity_id === n && (a.primary_entity_id = null);
			else if (r === "primary") a.primary_entity_id = n;
			else return;
			await this._mutate(() => P.configureMoisture(i, e.id, e.revision, xi(a, this._entities)));
			return;
		}
		let a = B(e, t);
		if (a) {
			if (r === "remove") {
				let r = ki({
					...a,
					sources: a.sources.filter((e) => e.entity_id !== n)
				}, this._entities).sources;
				await this._mutate(() => P.setRoleSources(i, e.id, e.revision, t, r));
			} else r === "primary" && await this._mutate(() => P.setRolePrimary(i, e.id, e.revision, t, n));
		}
	}
	_staleAlert(e) {
		let t = this._l, n = this._overview[e.id]?.roles.moisture;
		if (!n || n.state !== "stale") return x;
		let r = n.sources.map((e) => ha(t, this._states, e)).join(", ") || A(t, "moisture"), i = n.last_reported ? t.t("stale_alert.title", {
			name: r,
			age: Rt(t, n.last_reported)
		}) : t.t("stale_alert.title_no_age", { name: r });
		return G("ha-alert") ? b`<ha-alert class="stale-alert" alert-type="warning" .title=${i}>${t.t("stale_alert.body")}</ha-alert>` : b`<div class="alert-fallback stale-alert" role="alert"><ha-icon aria-hidden="true" icon="mdi:alert-outline"></ha-icon><div><p class="alert-title">${i}</p><p>${t.t("stale_alert.body")}</p></div></div>`;
	}
	_renderSensorsTab(e) {
		let t = this._l, n = this._formBusy || this._blocked || !!this._conflict, r = this._pendingSourceSwitch, i = wi(this._sourceRole ?? ""), a = this._assignedSensors(e), o = [...L(e)?.sources.length ? [] : ["moisture"], ...Ci.filter((t) => !B(e, t.role)?.sources.length).map((e) => e.role)], s = Ci.find((t) => this._sourceRefused(e, t.role, "pick"));
		return b`${this._staleAlert(e)}
      ${r ? b`<div class="notice" role="alert"><p>${t.t("sensors.switch_prompt", { role: i ? _a(t, i.role) : this._sourceRole ?? "" })}</p>
        <button type="button" class="primary" @click=${() => this._confirmSourceSwitch()}>${t.t("section.advanced_diagnostics_switch_discard")}</button>
        <button type="button" @click=${() => {
			this._pendingSourceSwitch = null;
		}}>${t.t("section.advanced_diagnostics_switch_keep")}</button></div>` : x}
      <section class="sp-card" aria-labelledby="assigned-heading"><div class="card-h"><h3 id="assigned-heading">${t.t("assigned.heading")}</h3></div>
        ${a.length ? b`<ul class="list">${a.map((r) => {
			let i = ha(t, this._states, r.entityId), a = this._states[r.entityId], o = a ? t.t("assigned.updated", { age: Rt(t, ga(a)) }) : t.t("assigned.not_found");
			return b`<li class="li"><span class="ic" aria-hidden="true"><ha-icon .icon=${k[r.role].icon}></ha-icon></span>
            <span class="li-main"><span class="li-title">${i}</span><span class="li-sub">${A(t, r.role)} · ${o}${r.main && r.several ? ` · ${t.t("assigned.main")}` : ""}</span></span>
            <span class="li-actions"><span class="li-value">${this._sensorValue(r.entityId)}</span>
              <ha-dropdown @wa-select=${(t) => void this._sensorAction(e, r.role, r.entityId, t.detail.item.value)}>
                <button slot="trigger" type="button" class="icon-btn" ?disabled=${n} aria-label=${t.t("assigned.menu", { name: i })}><ha-icon aria-hidden="true" icon="mdi:dots-vertical"></ha-icon></button>
                <ha-dropdown-item value="change">${t.t("assigned.change", { role: _a(t, r.role) })}<ha-icon slot="icon" icon="mdi:pencil-outline"></ha-icon></ha-dropdown-item>
                ${r.several && !r.main ? b`<ha-dropdown-item value="primary">${t.t("assigned.make_main")}<ha-icon slot="icon" icon="mdi:star-outline"></ha-icon></ha-dropdown-item>` : x}
                <ha-dropdown-item value="remove">${t.t("assigned.remove")}<ha-icon slot="icon" icon="mdi:link-variant-off"></ha-icon></ha-dropdown-item>
              </ha-dropdown></span></li>`;
		})}</ul>` : b`<p class="card-b muted">${t.t("assigned.empty")}</p>`}
        <div class="card-b"><div class="row">${o.length ? b`<ha-dropdown class="add-sensor" @wa-select=${(t) => this._openSensorEditor(t.detail.item.value, e, "pick")}>
            <button slot="trigger" type="button" class="btn tonal" ?disabled=${n}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("assigned.add")}</button>
            ${o.map((e) => b`<ha-dropdown-item value=${e}>${A(t, e)}<ha-icon slot="icon" .icon=${k[e].icon}></ha-icon></ha-dropdown-item>`)}
          </ha-dropdown><span class="small muted">${t.t("assigned.available", { roles: o.map((e) => A(t, e)).join(", ") })}</span>` : b`<span class="small muted">${t.t("assigned.all_assigned")}</span>`}</div>
          ${s ? b`<p id=${`${s.role}-sources-unavailable`} class="error" role="alert">${t.t("sensors.refused", { role: A(t, s.role) })}</p>` : x}
        </div></section>
      ${this._moistureMode === "pick" ? this._renderPicker("moisture", e) : x}
      ${this._sourceRole && this._sourceEdits && this._sourceMode === "pick" ? this._renderPicker(this._sourceRole, e) : x}
      ${this._expander("combine", "mdi:call-merge", t.t("combine.heading"), t.t("combine.secondary"), () => this._renderCombine(e))}
      ${this._expander("troubleshooting", "mdi:stethoscope", t.t("troubleshooting.heading"), t.t("troubleshooting.secondary"), () => this._renderTroubleshooting(e))}`;
	}
	_renderPicker(e, t) {
		let n = this._l, r = A(n, e), i = this._formBusy || this._blocked || !!this._conflict, a = this._edits, o;
		return o = e === "moisture" ? a?.moisture ? b`<div id="moisture-sources-editor" class="editor"><fieldset ?disabled=${i}>${Ki(n, a.moisture, this._defaults(t), this._entities, this._states, this._allSensors, (e) => this._allSensors = e, (e) => this._edit({ moisture: e }), "pick")}
        <div class="actions"><button type="button" @click=${() => this._closeMoistureEditor()}>${n.t("common.cancel")}</button><button type="button" class="primary" @click=${() => void this._saveMoistureSensors()}>${n.t("sensors.save_moisture")}</button></div></fieldset></div>` : b`<p class="error" role="alert">${n.t("moisture.incompatible")}</p>` : this._renderSourceEditor(e, t), b`<section class="sp-card picker" aria-labelledby=${`${e}-picker-heading`}><div class="card-h"><h3 id=${`${e}-picker-heading`} tabindex="-1">${n.t("sensors.edit_heading", { role: r })}</h3></div>
      <div class="card-b">${o}</div></section>`;
	}
	_renderSourceEditor(e, t) {
		let n = wi(e), r = this._sourceEdits, i = this._l;
		return !n || !r ? x : b`<div id=${`${e}-sources-editor`} class="editor"><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
      ${qi(i, n, r, this._entities, this._states, this._allSourceSensors, (e) => this._allSourceSensors = e, (e) => this._editSource(e), this._sourceMode)}
      ${this._sourceError ? b`<p class="error" role="alert">${this._sourceError}</p>` : x}
      <div class="actions">
        <button type="button" @click=${() => this._closeSourceEditor()}>${i.t("common.cancel")}</button>
        <button type="button" class="primary" @click=${() => void this._saveRoleSources(e, t)}>${i.t("sensors.save", { role: _a(i, e) })}</button>
      </div></fieldset></div>`;
	}
	_renderCombine(e) {
		let t = this._l, n = this._formBusy || this._blocked || !!this._conflict, r = this._edits, i = this._moistureMode === "combine";
		return b`<p class="small muted">${t.t("combine.intro")}</p>
      <dl class="sensors">
        <dt>${A(t, "moisture")}</dt><dd>${this._sourceSummary(e, "moisture")}
          <button class="source-toggle btn text sm" type="button" aria-expanded=${i ? "true" : "false"} aria-controls="moisture-sources-editor" aria-label=${i ? t.t("common.cancel") : t.t("combine.edit_label", { role: _a(t, "moisture") })} ?disabled=${n || !r?.moisture} @click=${() => {
			i ? this._closeMoistureEditor() : this._moistureMode = "combine";
		}}>${i ? t.t("common.cancel") : t.t("sensors.edit")}</button>
          ${i && r?.moisture ? b`<div id="moisture-sources-editor" class="editor"><fieldset ?disabled=${n}>${Ki(t, r.moisture, this._defaults(e), this._entities, this._states, this._allSensors, (e) => this._allSensors = e, (e) => this._edit({ moisture: e }), "combine")}
            <div class="actions"><button type="button" @click=${() => this._closeMoistureEditor()}>${t.t("common.cancel")}</button><button type="button" class="primary" @click=${() => void this._saveMoistureSensors()}>${t.t("sensors.save_moisture")}</button></div></fieldset></div>` : x}</dd>
        ${Ci.map((r) => {
			let i = this._sourceRole === r.role && this._sourceEdits !== null && this._sourceMode === "combine", a = this._sourceSaved[r.role], o = A(t, r.role);
			return b`<dt>${o}</dt><dd>${this._sourceSummary(e, r.role)}
            <button class="source-toggle btn text sm" type="button" aria-expanded=${i ? "true" : "false"} aria-controls=${`${r.role}-sources-editor`} aria-label=${i ? t.t("common.cancel") : t.t("combine.edit_label", { role: _a(t, r.role) })} ?disabled=${n} @click=${() => this._toggleSourceEdit(r.role, e, "combine")}>${i ? t.t("common.cancel") : t.t("sensors.edit")}</button>
            ${i ? this._renderSourceEditor(r.role, e) : x}
            ${!i && this._sourceRefused(e, r.role, "combine") ? b`<p id=${`${r.role}-sources-unavailable`} class="error" role="alert">${t.t("sensors.refused", { role: o })}</p>` : x}
            ${a && !i ? b`<p class="notice" role="status">${a}</p>` : x}</dd>`;
		})}
      </dl>`;
	}
	_renderTroubleshooting(e) {
		let t = this._l, n = R(e, this._devices), r = this._evaluations[e.id], i = ["moisture", ...Ci.map((e) => e.role)].flatMap((t) => {
			let n = t === "moisture" ? L(e) : B(e, t);
			return n?.sources.length ? [{
				role: t,
				c: n
			}] : [];
		});
		return b`<section aria-labelledby="entities-heading"><h3 id="entities-heading">${t.t("troubleshooting.entities_heading")}</h3>
        <dl class="kv entity-ids">${i.map(({ role: e, c: n }) => b`<dt>${A(t, e)}</dt><dd>${n.sources.map((e) => {
			let r = z(e, this._entities)?.entity_id ?? e.entity_id;
			return b`<div><code>${r}</code>${r === n.primary_entity_id ? b` <span class="muted">(${t.t("assigned.main")})</span>` : x}</div>`;
		})}</dd>`)}
          <dt>${t.t("troubleshooting.plant_id")}</dt><dd><code>${e.id}</code></dd>
          ${n ? b`<dt>${t.t("troubleshooting.device_id")}</dt><dd><code>${n.id}</code></dd>` : x}</dl></section>
      <section aria-labelledby="evaluation-heading"><h3 id="evaluation-heading">${t.t("troubleshooting.moisture_heading")}</h3>
        ${r ? b`<dl class="kv moisture-evaluation"><dt>${t.t("troubleshooting.moisture_value")}</dt><dd>${r.computed_percent === null ? "—" : t.percent(r.computed_percent)}</dd>
          <dt>${t.t("troubleshooting.moisture_health")}</dt><dd>${r.health_score === null ? "—" : t.t("section.overall_health_available_summary", { score: r.health_score })}</dd>
          ${r.reasons.length ? b`<dt>${t.t("troubleshooting.reasons")}</dt><dd>${r.reasons.join(" ")}</dd>` : x}</dl>` : b`<p>${t.t("troubleshooting.no_evaluation")}</p>`}</section>
      ${this._renderOverallHealth(e)}
      ${this._renderDiagnostics(e)}
      <section aria-labelledby="related-heading"><h3 id="related-heading">${t.t("automations.related_heading")}</h3>
        ${this._related.length ? b`<ul class="related">${this._related.map((e) => b`<li><code>${e}</code></li>`)}</ul>` : b`<p>${t.t("automations.related_none")}</p>`}
        <p class="small muted">${t.t("automations.description")}</p>
        <a href="/config/automation/dashboard" @click=${(e) => this._internalLink(e, "/config/automation/dashboard")}>${t.t("automations.open_editor")}</a></section>
      <section aria-labelledby="download-heading"><h3 id="download-heading">${t.t("troubleshooting.download_heading")}</h3>
        <p class="small muted">${t.t("troubleshooting.download_hint")}</p>
        <div class="row"><button type="button" class="btn outline sm" @click=${() => this._downloadDiagnostics(e)}><ha-icon aria-hidden="true" icon="mdi:download"></ha-icon>${t.t("detail.menu_download")}</button></div></section>`;
	}
	_internalLink(e, t) {
		e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.preventDefault(), this._navigate(t));
	}
	_downloadDiagnostics(e) {
		let t = R(e, this._devices), n = {
			generated_at: (/* @__PURE__ */ new Date()).toISOString(),
			plant: {
				id: e.id,
				revision: e.revision,
				lifecycle_state: e.lifecycle_state,
				created_at: e.created_at,
				has_photo: e.image !== null,
				care_event_count: this._careHistory?.events.length ?? null,
				species: e.species ? {
					provider: e.species.provider,
					provider_ref: e.species.snapshot.provider_ref,
					source_status: e.species.snapshot.source_status,
					fetched_at: e.species.snapshot.fetched_at
				} : null
			},
			device_id: t?.id ?? null,
			roles: e.roles ?? null,
			status: this._overview[e.id] ?? null,
			moisture_evaluation: this._evaluations[e.id] ?? null,
			overall_health: this._health[e.id] ?? null,
			problem_checks: mi(e, this._entities, this._states, this._l).map((e) => ({
				role: e.role,
				status: e.status,
				reason: e.reason
			})),
			related_automations: this._related
		}, r = URL.createObjectURL(new Blob([JSON.stringify(n, null, 2)], { type: "application/json" })), i = document.createElement("a");
		i.href = r, i.download = `smart-plants-${e.id}-diagnostics.json`, i.click(), setTimeout(() => URL.revokeObjectURL(r), 1e3);
	}
	_openSnooze(e) {
		let t = this._today(), n = Vs(e.snoozed_until), r = n ? Hs(n, this._timeZone()) : null;
		this._snoozeDraft = r && Bs(r, t) ? {
			choice: "date",
			date: r,
			error: ""
		} : {
			choice: "1",
			date: zs(t).min,
			error: ""
		}, this._openDialog("snooze", this.shadowRoot?.querySelector(".panel-appbar ha-dropdown [slot=trigger]") ?? null);
	}
	_saveSnooze(e) {
		let t = this._snoozeDraft, n = this._plantById(e);
		if (!t || !n || !this.hass) return;
		let r = Rs(t.choice, this._today(), t.date, this._timeZone());
		if (!r) {
			this._snoozeDraft = {
				...t,
				error: this._l.t("snooze.error_date")
			}, this.updateComplete.then(() => this.shadowRoot?.querySelector("#snooze-date")?.focus());
			return;
		}
		let i = this.hass;
		this._closeDialog(), this._mutate(() => P.snooze(i, n.id, n.revision, r));
	}
	_resumeSnooze(e) {
		let t = this._plantById(e);
		if (!t || !this.hass) return;
		let n = this.hass;
		this._dialog && this._closeDialog(), this._mutate(() => P.snooze(n, t.id, t.revision, null)).then(() => this.shadowRoot?.querySelector("h1")?.focus());
	}
	_renderSnoozeDialog(e) {
		let t = this._plantById(e), n = this._snoozeDraft;
		if (!t || !n) return x;
		let r = this._l, i = this._today(), a = Vs(t.snoozed_until), o = a ? Hs(a, this._timeZone()) : null, s = zs(i), c = this._formBusy || this._blocked || !!this._conflict, l = (e) => {
			this._snoozeDraft = {
				...n,
				choice: e,
				error: ""
			};
		};
		return b`<dialog class="care-dialog snooze-dialog" aria-labelledby="dialog-title" aria-describedby="snooze-intro" @cancel=${(e) => {
			e.preventDefault(), this._closeDialog();
		}} @keydown=${(e) => this._trapFocus(e)}>
      <h2 id="dialog-title" tabindex="-1">${r.t(o ? "snooze.title_change" : "snooze.title", { name: t.name })}</h2>
      <div class="dialog-body">
        <p class="muted" id="snooze-intro">${r.t("snooze.intro")}</p>
        ${o ? b`<p class="snooze-current">${r.t("snooze.current", { date: Us(r, o, i) })}</p>` : x}
        <fieldset class="snooze-choices"><legend class="field-label">${r.t("snooze.choices")}</legend>
          ${Ms.map((e) => b`<label class="check"><input type="radio" name="snooze-choice" value=${e.choice} .checked=${n.choice === e.choice} @change=${() => l(e.choice)}>
            <span class="choice-text"><span>${r.t(e.label)}</span><span class="small muted">${r.t("snooze.preset_until", { date: Us(r, Ps(i, e.days), i) })}</span></span></label>`)}
          <label class="check"><input type="radio" name="snooze-choice" value="date" .checked=${n.choice === "date"} @change=${() => l("date")}><span class="choice-text"><span>${r.t("snooze.preset_date")}</span></span></label>
        </fieldset>
        ${n.choice === "date" ? b`<div class="field-group"><label for="snooze-date" class="field-label">${r.t("snooze.date_label")}</label>
          <input id="snooze-date" type="date" min=${s.min} max=${s.max} .value=${n.date} aria-invalid=${n.error ? "true" : "false"} aria-describedby=${n.error ? "snooze-error snooze-date-hint" : "snooze-date-hint"}
            @input=${(e) => {
			this._snoozeDraft = {
				...n,
				date: e.target.value,
				error: ""
			};
		}}>
          <span class="small muted" id="snooze-date-hint">${r.t("snooze.date_hint")}</span>
          ${n.error ? b`<span class="error-text small" id="snooze-error" role="alert">${n.error}</span>` : x}</div>` : x}
        <div class="actions dialog-actions">
          ${o ? b`<button type="button" ?disabled=${c} @click=${() => this._resumeSnooze(t.id)}>${r.t("snooze.resume")}</button>` : x}<span class="spacer"></span>
          <button type="button" @click=${() => this._closeDialog()}>${r.t("common.cancel")}</button>
          <button type="button" class="primary" ?disabled=${c} @click=${() => this._saveSnooze(t.id)}>${r.t("snooze.confirm")}</button></div>
      </div></dialog>`;
	}
	_toggleMonitoring(e) {
		if (!this.hass) return;
		let t = this.hass;
		this._mutate(() => e.lifecycle_state === "active" ? P.disable(t, e.id, e.revision) : P.reenable(t, e.id, e.revision));
	}
	_expander(e, t, n, r, i) {
		return Aa({
			key: e,
			icon: t,
			header: n,
			secondary: r,
			content: i,
			open: this._expanded.has(e),
			native: G("ha-expansion-panel"),
			toggle: (t) => this._setExpanded(e, t)
		});
	}
	async _saveRoleSources(e, t) {
		if (!this.hass || !this._sourceEdits || this._formBusy || this._blocked || this._conflict) return;
		if (this._registryError) {
			this._sourceError = this._l.t("error.sources_reconnect");
			return;
		}
		let n = Oi(this._sourceEdits, this._l);
		if (n) {
			this._sourceError = n;
			return;
		}
		this._sourceError = "";
		let r = this.hass, i = ki(this._sourceEdits, this._entities), a = B(t, e);
		await this._mutate(async () => {
			let n = t.revision, o = t;
			return (!a || JSON.stringify(a.sources) !== JSON.stringify(i.sources)) && (o = await P.setRoleSources(r, t.id, n, e, i.sources), n = o.revision), (!a || a.primary_entity_id !== i.primary_entity_id) && (o = await P.setRolePrimary(r, t.id, n, e, i.primary_entity_id), n = o.revision), (!a || a.aggregation !== i.aggregation) && (o = await P.setRoleAggregation(r, t.id, n, e, i.aggregation), n = o.revision), (!a || a.stale_after_seconds !== i.stale_after_seconds) && (o = await P.setRoleStaleAfter(r, t.id, n, e, i.stale_after_seconds), n = o.revision), o;
		}), this._error || (this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._pendingSourceSwitch = null, this._sourceSaved = {
			...this._sourceSaved,
			[e]: this._l.t("sensors.saved", { role: A(this._l, e) })
		});
	}
	_renderHeader(e) {
		let t = this._l, n = this._overview[e.id], r = R(e, this._devices)?.area_id, i = e.species?.snapshot.latin_name ?? e.species?.snapshot.common_name ?? null, a = n ? en(t, n) : null, o = Ws(t, e.snoozed_until, this._today(), this._timeZone()), s = this._formBusy || this._blocked || !!this._conflict;
		return b`<div class="sp-card header-card">
      <div class="hero">
        <sp-plant-avatar size="large" .src=${this._imageUrl} .name=${e.name} .l=${t} @photo-error=${() => {
			this._imageError = t.t("photo.decode_failed");
		}}></sp-plant-avatar>
        <div class="hero-text">
          <h2 class="hero-name">${e.name}</h2>
          <div class="hero-meta">${r ? b`<span><ha-icon aria-hidden="true" icon="mdi:texture-box"></ha-icon>${this._areaName(r)}</span>` : x}
            <span><ha-icon aria-hidden="true" icon="mdi:leaf"></ha-icon>${i ? b`<i>${i}</i>` : t.t("detail.no_species")}</span></div>
          ${n && a || o ? b`<div class="hero-status">${n && a ? b`<sp-status-chip .status=${n.status} .label=${a.label} .more=${a.more} .l=${t}></sp-status-chip>` : x}
            ${o ? b`<span class="snooze"><sp-snooze-chip .label=${o}></sp-snooze-chip><button type="button" class="btn text sm" ?disabled=${s} aria-label=${t.t("snooze.resume_label", { name: e.name })} @click=${() => this._resumeSnooze(e.id)}>${t.t("snooze.resume")}</button></span>` : x}
            ${n ? b`<span class="reason">${Sa(t, n)}</span>` : x}</div>` : x}
          ${this._renderCareChips(e, n)}
        </div>
        <div class="hero-actions">
          <button type="button" class="btn filled" ?disabled=${this._blocked || this._watering.has(e.id) || !!this._conflict} @click=${() => void this._logWatering(e.id)}><ha-icon aria-hidden="true" icon="mdi:water"></ha-icon>${t.t("card.log_watering")}</button>
          <button type="button" class="btn outline" @click=${() => this._openCareForm()}><ha-icon aria-hidden="true" icon="mdi:note-edit-outline"></ha-icon>${t.t("detail.log_care")}</button>
        </div>
      </div>
      ${Ca(t, n)}
    </div>`;
	}
	_renderCareChips(e, t) {
		let n = this._l, r = qo(t);
		if (!r.length) return x;
		let i = this._today(), a = r.slice(0, 2).map((t) => {
			let r = e.care_tasks?.find((e) => e.id === t.task_id), a = r ? mo(n, t, r.schedule, i, {
				lastDoneAt: r.last_done_at,
				timeZone: this._timeZone()
			}) : null;
			return b`<li class="cchip tone-${a?.tone ?? "care"}"><ha-icon aria-hidden="true" .icon=${a?.icon ?? "mdi:calendar-clock"}></ha-icon><span>${Ko(n, t)}${a?.tone === "overdue" ? b`<span class="sr-only"> (${a.text})</span>` : x}</span></li>`;
		});
		return b`<ul class="care-chips" aria-label=${n.t("care_plan.due_chips_label")}>${a}${r.length > 2 ? b`<li class="cchip tone-later"><span aria-hidden="true">+${n.number(r.length - 2)}</span><span class="sr-only">${n.t("care_plan.more_due", { count: r.length - 2 })}</span></li>` : x}</ul>`;
	}
	_renderTabs() {
		let e = this._l;
		return G("ha-tab-group") ? b`<ha-tab-group class="tabs" @wa-tab-show=${(e) => this._selectSection(e.detail.name)}>
        ${K.map((t) => b`<ha-tab-group-tab slot="nav" .panel=${t} .active=${this._detailSection === t}>${e.t(fa[t])}</ha-tab-group-tab>`)}</ha-tab-group>` : b`<div class="tablist" role="tablist" aria-label=${e.t("detail.sections_label")} @keydown=${(e) => {
			let t = K.indexOf(this._detailSection), n = e.key === "ArrowRight" ? (t + 1) % K.length : e.key === "ArrowLeft" ? (t + K.length - 1) % K.length : e.key === "Home" ? 0 : e.key === "End" ? K.length - 1 : -1;
			n < 0 || (e.preventDefault(), this._selectSection(K[n]), this.updateComplete.then(() => this.shadowRoot?.querySelector(`#tab-${K[n]}`)?.focus()));
		}}>${K.map((t) => {
			let n = this._detailSection === t;
			return b`<button type="button" role="tab" id=${`tab-${t}`} aria-controls="detail-panel" aria-selected=${n ? "true" : "false"} tabindex=${n ? "0" : "-1"} @click=${() => this._selectSection(t)}>${e.t(fa[t])}</button>`;
		})}</div>`;
	}
	_renderOverviewTab(e) {
		let t = this._l, n = this._overview[e.id], r = va(n), i = this._careHistory, a = i?.events.slice(0, 3) ?? [], o = R(e, this._devices), s = !e.placement || !e.acquired_at || !e.category || !e.tags.length, c = e.species?.snapshot, l = c ? vi(c, t.language) : null, u = (e) => e.charAt(0).toLocaleUpperCase() + e.slice(1), d = o ? `/config/automation/edit/new?add_automation_element=trigger&target_device_id=${encodeURIComponent(o.id)}` : "", f = o ? `/config/devices/device/${encodeURIComponent(o.id)}` : "";
		return b`<div class="cols">
      <div class="stack">
        <section class="sp-card" aria-labelledby="readings-heading"><div class="card-h"><h3 id="readings-heading">${t.t("readings.heading")}</h3>
          ${r.length ? b`<button type="button" class="btn text sm" @click=${() => this._selectSection("sensors")}>${t.t("readings.manage")}</button>` : x}</div>
          ${r.length ? b`<ul class="list">${r.map(([e, n]) => wa(t, e, n, this._states))}</ul>` : b`<div class="card-b"><div class="empty-box"><span>${n?.status === "paused" ? t.t("readings.paused") : t.t("readings.empty")}</span><button type="button" class="btn tonal sm" @click=${() => this._selectSection("sensors")}>${t.t("readings.assign")}</button></div></div>`}
        </section>
        ${this._renderHistory(e)}
        <section class="sp-card" aria-labelledby="recent-heading"><div class="card-h"><h3 id="recent-heading">${t.t("recent.heading")}</h3>
          ${i?.events.length ? b`<button type="button" class="btn text sm" @click=${() => this._selectSection("care")}>${t.t("recent.show_all")}</button>` : x}</div>
          ${i ? a.length ? b`<ul class="list">${a.map((e) => b`<li class="li"><span class="ic tonal" aria-hidden="true"><ha-icon .icon=${ma[e.kind]}></ha-icon></span>
            <span class="li-main"><span class="li-title">${t.t(`care_done.${e.kind}`)}</span><span class="li-sub">${t.date(e.local_date)}</span></span><span></span></li>`)}</ul>` : b`<div class="card-b"><div class="empty-box"><span>${t.t("care.empty")}</span><button type="button" class="btn tonal sm" @click=${() => this._openCareForm()}>${t.t("detail.log_care")}</button></div></div>` : b`<p class="card-b muted">${t.t("care.loading")}</p>`}
        </section>
      </div>
      <div class="stack">
        <section class="sp-card" aria-labelledby="about-heading"><div class="card-h"><h3 id="about-heading">${t.t("about.heading")}</h3>
          <button type="button" class="icon-btn" aria-label=${t.t("about.edit")} @click=${() => this._selectSection("settings")}><ha-icon aria-hidden="true" icon="mdi:pencil-outline"></ha-icon></button></div>
          <div class="card-b"><dl class="kv about">
            <dt>${t.t("about.species")}</dt><dd>${c ? b`${c.latin_name ? b`<i>${c.latin_name}</i>` : x}${l && l !== c.latin_name ? b`${c.latin_name ? " · " : ""}${l}` : x}
              <div class="small muted">${c.source_status === "provider" ? t.t("about.species_provider", { provider: c.provider === "openplantbook" ? "OpenPlantBook" : c.provider }) : t.t("about.species_manual")}</div>` : b`<button type="button" class="btn text sm" @click=${() => this._openSetting("species")}>${t.t("about.add_species")}</button>`}</dd>
            <dt>${t.t("about.area")}</dt><dd>${o?.area_id ? this._areaName(o.area_id) : t.t("area.none")}</dd>
            ${e.placement ? b`<dt>${t.t("about.placement")}</dt><dd>${u(Ii(t, e.placement.mode))}</dd>` : x}
            ${e.acquired_at ? b`<dt>${t.t("about.since")}</dt><dd>${t.date(e.acquired_at.slice(0, 10))}</dd>` : x}
            ${e.category ? b`<dt>${t.t("about.category")}</dt><dd>${e.category}</dd>` : x}
            ${e.tags.length ? b`<dt>${t.t("about.tags")}</dt><dd>${e.tags.map((e) => b`<span class="tag">${e}</span>`)}</dd>` : x}
          </dl>
          ${s ? b`<button type="button" class="btn text sm" @click=${() => this._selectSection("settings")}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("about.add_details")}</button>` : x}</div></section>
        <section class="sp-card" aria-labelledby="automations-heading"><div class="card-h"><h3 id="automations-heading">${t.t("automations.heading")}</h3></div>
          <div class="card-b"><p class="small muted">${t.t("automations.body")}</p>
            ${o ? b`<div class="row"><a class="btn outline sm" href=${f} @click=${(e) => this._internalLink(e, f)}><ha-icon aria-hidden="true" icon="mdi:devices"></ha-icon>${t.t("automations.open_device")}</a>
              <a class="btn outline sm" href=${d} @click=${(e) => this._internalLink(e, d)}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("automations.create")}</a></div>` : x}
          </div></section>
      </div></div>`;
	}
	_openSetting(e) {
		let t = new Set(this._settingsOpen);
		t.add(e), this._settingsOpen = t, this._goTo("settings", `#setting-${e}-editor input, #setting-${e}-editor select, #setting-${e}-editor ha-area-picker`);
	}
	_closeSetting(e) {
		let t = new Set(this._settingsOpen);
		t.delete(e), this._settingsOpen = t;
	}
	_settingRow(e, t, n, r, i, a = !1) {
		let o = this._l, s = a || this._settingsOpen.has(e);
		return b`<div class="setrow"><div><div class="setrow-h" id=${`setting-${e}`}>${t}</div><div class="setrow-d">${n}</div></div>
      <button type="button" class="btn text sm" aria-expanded=${s ? "true" : "false"} aria-controls=${`setting-${e}-editor`} ?disabled=${a} @click=${() => s ? this._closeSetting(e) : this._openSetting(e)}>${s ? o.t("settings.close") : r}</button>
      ${s ? b`<div class="setrow-editor" id=${`setting-${e}-editor`}>${i()}</div>` : x}</div>`;
	}
	_renderSettingsTab(e) {
		let t = this._l, n = this._edits, r = L(e), i = this._formBusy || this._blocked || !!this._conflict, a = R(e, this._devices), o = e.species?.snapshot, s = o ? o.latin_name ?? o.common_name ?? t.t("snapshot.species") : "", c = o ? b`<i>${s}</i> · ${o.source_status === "provider" ? t.t("settings.species_provider", {
			provider: o.provider === "openplantbook" ? "OpenPlantBook" : o.provider,
			date: t.date(o.fetched_at.slice(0, 10))
		}) : t.t("about.species_manual")}` : t.t("settings.species_none"), l = G("ha-area-picker") && this.hass ? b`<ha-area-picker .hass=${this.hass} .label=${t.t("area.label")} .value=${n.area || void 0} .noAdd=${!0} .disabled=${i || !!this._registryError || this._areaReview} @value-changed=${(e) => this._edit({ area: e.detail.value ?? "" })}></ha-area-picker>` : b`<fieldset ?disabled=${i || !!this._registryError || this._areaReview}>${Vi(t, n.area, this._areas, (e) => this._edit({ area: e }))}</fieldset>`, u = this._defaults(e), d = r ? I.some((e) => r.threshold_defaults[e].source === "provider") : !1, f = r && I.some((e) => r.threshold_overrides[e] !== null) ? t.t(d ? "targets.custom_species" : "targets.custom_defaults") : t.t(d ? "targets.from_species" : "targets.from_defaults"), p = {
			min: "targets.needs_water",
			target: "targets.ideal",
			max: "targets.too_wet"
		}, m = e.lifecycle_state === "active";
		return b`<section class="sp-card" aria-labelledby="plant-settings-heading"><div class="card-h"><h3 id="plant-settings-heading">${t.t("settings.plant_heading")}</h3></div>
        ${this._settingRow("name", t.t("settings.name"), e.name, t.t("settings.rename"), () => b`<fieldset ?disabled=${i}>${Pi(t.t("detail.name"), n.name, (e) => this._edit({ name: e }))}
          <div class="actions"><button type="button" @click=${() => {
			this._edit({ name: e.name }), this._closeSetting("name");
		}}>${t.t("common.cancel")}</button>${this._saveButton("identity", t.t("settings.save_name"))}</div></fieldset>`)}
        ${this._settingRow("area", t.t("settings.area"), t.t("settings.area_value", { area: this._areaName(a?.area_id ?? "") }), t.t("settings.change_area"), () => b`
          ${this._areaReview ? b`<p class="notice">${t.t("detail.area_review")}</p><div class="row"><button type="button" @click=${() => this._areaReview = !1}>${t.t("detail.area_reviewed")}</button><button type="button" @click=${() => {
			this._edit({ area: this._baseArea }), this._areaReview = !1;
		}}>${t.t("detail.area_use_current")}</button></div>` : x}
          ${l}<div class="actions"><button type="button" ?disabled=${i} @click=${() => {
			this._edit({ area: this._baseArea }), this._closeSetting("area");
		}}>${t.t("common.cancel")}</button><button type="button" class="primary" ?disabled=${i || !!this._registryError || this._areaReview} @click=${() => void this._save("area")}>${t.t("detail.save_area")}</button></div>`, this._areaReview)}
        ${this._renderPhotoRow(e)}
        ${this._settingRow("species", t.t("settings.species"), c, o ? t.t("settings.change_species") : t.t("settings.find_species"), () => b`
          ${e.species ? Ji(t, e.species.snapshot) : x}<fieldset ?disabled=${i}>
          ${e.species?.snapshot.provider_ref ? b`<button type="button" @click=${() => void this._previewSpecies()}>${t.t("species.preview_refresh")}</button>` : x}
          ${Fi(t, t.t("species.provider"), this._provider, [{
			value: "manual",
			label: t.t("species.manual")
		}, ...this._capabilities?.providers.filter((e) => e.available && e.search_supported).map((e) => ({
			value: e.provider,
			label: e.provider === "openplantbook" ? "OpenPlantBook" : e.provider
		})) ?? []], (e) => {
			this._providerRequest++, this._provider = e, this._preview = null, this._results = [];
		})}
          ${this._provider === "manual" ? b`${Pi(t.t("species.common_name"), n.common, (e) => this._edit({ common: e }))}${Pi(t.t("species.scientific_name"), n.latin, (e) => this._edit({ latin: e }))}<p class="small muted">${t.t("species.manual_hint")}</p><div class="actions">${this._saveButton("species", t.t("species.save_manual"))}</div>` : b`${Pi(t.t("species.search"), this._query, (e) => {
			this._query = e, this._providerRequest++, this._results = [], this._preview = null;
		})}<div class="actions"><button type="button" @click=${() => void this._searchSpecies()}>${t.t("species.search")}</button></div><ul class="result-list">${this._results.map((e) => b`<li><button type="button" @click=${() => void this._previewSpecies(e)}>${e.common_name ?? e.latin_name} · ${e.latin_name}</button><small>${e.attribution}</small></li>`)}</ul><button type="button" @click=${() => {
			this._provider = "manual", this._providerRequest++, this._preview = null;
		}}>${t.t("common.continue_manually")}</button>`}</fieldset>`)}
      </section>
      <section class="sp-card" aria-labelledby="targets-heading"><div class="card-h"><h3 id="targets-heading">${t.t("targets.heading")}</h3></div>
        <div class="card-b">${r && n.moisture ? b`<p class="small muted">${f}</p>
          <fieldset ?disabled=${i}><div class="thr">${I.map((e) => {
			let r = n.moisture.threshold_overrides[e];
			return b`<div><label>${t.t(p[e])}<span class="field-suffix"><input type="number" min="1" max="99" step="1" inputmode="numeric" aria-label=${t.t(p[e])} .value=${r === null ? "" : String(r)} placeholder=${String(u[e])}
              @input=${(t) => {
				let r = t.target.value;
				this._edit({ moisture: {
					...n.moisture,
					threshold_overrides: {
						...n.moisture.threshold_overrides,
						[e]: r.trim() === "" ? null : Number(r)
					}
				} });
			}}><span aria-hidden="true">%</span></span></label>
              <small>${r === null ? t.t("targets.default_hint", { value: t.percent(u[e]) }) : t.t("targets.custom_hint", { value: t.percent(u[e]) })}</small></div>`;
		})}</div>
          <div class="row"><button type="button" class="btn text sm" @click=${() => this._edit({ moisture: {
			...n.moisture,
			threshold_overrides: {
				min: null,
				target: null,
				max: null
			}
		} })}>${t.t("targets.reset")}</button><span class="spacer"></span>
            <button type="button" class="btn filled sm" @click=${() => void this._save("moisture")}>${t.t("targets.save")}</button></div></fieldset>` : b`<p class="error" role="alert">${t.t("moisture.incompatible")}</p>`}</div></section>
      ${this._expander("other_targets", "mdi:tune-variant", t.t("other_targets.heading"), t.t("other_targets.secondary"), () => this._renderOtherTargets(e))}
      ${this._expander("more_details", "mdi:tag-outline", t.t("more_details.heading"), t.t("more_details.secondary"), () => b`
        <fieldset ?disabled=${i}>${Hi(t, n.placement, (e) => this._edit({ placement: e }))}
          <label>${t.t("detail.acquired")}<input type="date" .value=${n.acquired.slice(0, 10)} @input=${(e) => this._edit({ acquired: e.target.value })}></label>
          <div class="actions">${this._saveButton("identity", t.t("more_details.save_identity"))}</div></fieldset>
        <fieldset ?disabled=${i}>${Pi(t.t("taxonomy.category"), n.category, (e) => this._edit({ category: e }), "text", 60)}${Pi(t.t("taxonomy.tags"), n.tagText, (e) => this._edit({ tagText: e }), "text", 2e3)}<p class="small muted">${t.t("taxonomy.hint")}</p>
          <div class="actions">${this._saveButton("taxonomy", t.t("taxonomy.save"))}</div></fieldset>`)}
      <section class="sp-card" aria-labelledby="manage-heading"><div class="card-h"><h3 id="manage-heading">${t.t("manage.heading")}</h3></div>
        <div class="setrow"><div><div class="setrow-h">${m ? t.t("manage.pause") : t.t("manage.resume")}</div><div class="setrow-d">${m ? t.t("manage.pause_hint") : t.t("manage.resume_hint")}</div></div>
          <button type="button" class="btn outline sm" ?disabled=${i} @click=${() => this._toggleMonitoring(e)}>${m ? t.t("manage.pause_button") : t.t("manage.resume_button")}</button></div>
        <div class="setrow"><div><div class="setrow-h">${t.t("manage.delete")}</div><div class="setrow-d">${t.t("manage.delete_hint")}</div></div>
          <button type="button" class="btn danger sm" ?disabled=${i} @click=${() => this._openDialog("delete")}>${t.t("manage.delete_button")}</button></div>
      </section>`;
	}
	_renderDetail(e) {
		let t = this._l, n = this._plantById(e), r = this._edits;
		if (!n || !r) return b`<p>${t.t("detail.not_found")}</p>`;
		let i = this._conflict ? this._sourceConflictFields(this._conflict.after) : [];
		return b`<div class="pd">
      ${this._conflict ? b`<section class="notice" role="alert"><h2>${t.t("conflict.heading")}</h2><p>${t.t("conflict.revision", {
			before: this._conflict.before.revision,
			after: this._conflict.after.revision
		})}</p><ul>${this._conflict.changes.map((e) => b`<li class="prose">${e}</li>`)}</ul>${i.length ? b`<p>${t.t("conflict.source_overlap", { fields: this._sourceFieldList(i) })}</p>` : x}<div class="actions"><button @click=${() => this._reviewConflict()}>${t.t("conflict.retain")}</button><button @click=${() => this._beginEdit(n)}>${t.t("conflict.discard")}</button></div></section>` : x}
      ${this._renderHeader(n)}
      ${this._renderTabs()}
      <div class="tabpanel" id="detail-panel" role="tabpanel" aria-label=${t.t(fa[this._detailSection])}>${{
			overview: () => this._renderOverviewTab(n),
			sensors: () => this._renderSensorsTab(n),
			care: () => this._renderCare(n),
			settings: () => this._renderSettingsTab(n)
		}[this._detailSection]()}</div>
      ${this._renderDialog()}</div>`;
	}
	_closeWizard() {
		this._formBusy || (this._clearCreationNotice(), this._wizardStarted = !1, this._show({ kind: "list" }));
	}
	_openCreated(e) {
		!this._formBusy && this._plantById(e) && (this._clearCreationNotice(), this._wizardStarted = !1, this._show({
			kind: "detail",
			plantId: e
		}));
	}
	_clearCreationNotice() {
		this._creationNotice.endsWith(this._l.t("created.uploading")) || (this._creationNotice = "", this._creationPhoto = "", this._createdPlantId = null);
	}
	async _created(e) {
		let { plant: t, photo: n, navigationContext: r } = e.detail, i = this.hass, a = this._view.kind === "create" && r === this._context, o = n && t.revision === 1 && t.image === null;
		a || (this._wizardStarted = !1);
		let s = this._plantById(t.id);
		(!s || s.revision <= t.revision) && (this._plants = [...this._plants.filter((e) => e.id !== t.id), t]), this._createdPlantId = t.id;
		let c = this._l, l = c.t("created.notice", { name: t.name }), u = c.t("created.uploading"), d = (e) => {
			this._creationPhoto = e, this._creationNotice = e ? `${l} ${e}` : l;
		};
		d(o ? u : n ? c.t("created.photo_skipped") : "");
		let f = this._context;
		if (this._refresh(!1), o && i) {
			try {
				if (await Ds(n, c), !this.isConnected || this.hass?.connection !== i.connection || this._blocked) return;
				let e = await P.uploadImage(i, t.id, t.revision, n);
				if (!this.isConnected || this.hass?.connection !== i.connection) return;
				f === this._context && this._base?.id === t.id && this._base.revision === t.revision && !this._formBusy && !this._conflict && this._rebaseEdits(this._base, e), this._createdPlantId === t.id && d(c.t("created.photo_uploaded"));
			} catch (e) {
				if (!this.isConnected || this.hass?.connection !== i.connection) return;
				this._createdPlantId === t.id && d(`${c.t("created.photo_failed")} ${this._friendly(e)}`);
			} finally {
				this._createdPlantId === t.id && this._creationNotice.endsWith(u) && d(c.t("created.photo_interrupted"));
			}
			await this._refresh(!1);
		}
	}
	_reload() {
		window.location.reload();
	}
	render() {
		let e = this._l;
		if (this.hass?.user?.is_admin === !1) return b`<main><div class="panel-content"><p role="alert">${e.t("panel.admin_required")}</p></div></main>`;
		let t = this.hass?.localize?.("ui.common.menu") || e.t("panel.menu"), n = this._view.kind === "detail" ? this._plantById(this._view.plantId) : void 0, r = this._formBusy || this._blocked || !!this._conflict;
		return b`<main><ha-top-app-bar-fixed class="panel-appbar" .narrow=${this.narrow}>
       ${this._view.kind === "detail" ? b`<ha-icon-button slot="navigationIcon" class="back" .label=${e.t("detail.back")} .path=${Tc} @click=${() => {
			this._formBusy || this._show({ kind: "list" });
		}}></ha-icon-button>` : x}
       <h1 slot="title" class="page-title" tabindex="-1">${n ? n.name : "Smart Plants"}</h1>
       <ha-dropdown slot="actionItems" @wa-select=${this._handleMenuAction}>
         <ha-icon-button slot="trigger" .label=${t} .path=${Cc}></ha-icon-button>
         ${n ? b`
         <ha-dropdown-item value="open-device" ?disabled=${!R(n, this._devices)}>${e.t("detail.menu_open_device")}<ha-icon slot="icon" icon="mdi:open-in-new"></ha-icon></ha-dropdown-item>
         <ha-dropdown-item value="download-diagnostics">${e.t("detail.menu_download")}<ha-icon slot="icon" icon="mdi:download"></ha-icon></ha-dropdown-item>
         <ha-dropdown-item value="snooze" ?disabled=${r || n.lifecycle_state !== "active"}>${Vs(n.snoozed_until) ? e.t("snooze.menu_change") : e.t("snooze.menu")}<ha-icon slot="icon" icon="mdi:bell-sleep-outline"></ha-icon></ha-dropdown-item>
         <ha-dropdown-item value="toggle-monitoring" ?disabled=${r}>${n.lifecycle_state === "active" ? e.t("manage.pause") : e.t("manage.resume")}<ha-icon slot="icon" .icon=${n.lifecycle_state === "active" ? "mdi:pause-circle-outline" : "mdi:play-circle-outline"}></ha-icon></ha-dropdown-item>
         <ha-dropdown-item value="delete-plant" ?disabled=${r}>${e.t("manage.delete")}<ha-icon slot="icon" icon="mdi:delete-outline"></ha-icon></ha-dropdown-item>` : b`
         ${this._view.kind === "list" ? x : b`<ha-dropdown-item value="back-to-overview" ?disabled=${this._formBusy}>${e.t("panel.back_to_overview")}</ha-dropdown-item>`}
         <ha-dropdown-item value="add-plant" ?disabled=${this._blocked}>${e.t("panel.add_plant")}<ha-svg-icon slot="icon" .path=${wc}></ha-svg-icon></ha-dropdown-item>
         ${this._view.kind === "list" ? b`<ha-dropdown-item value="notifications">${e.t("overview.menu_notifications")}<ha-icon slot="icon" icon="mdi:bell-outline"></ha-icon></ha-dropdown-item>` : x}
         <ha-dropdown-item value="integration-options">${e.t("overview.integration_options")}<ha-icon slot="icon" icon="mdi:cog-outline"></ha-icon></ha-dropdown-item>
         <ha-dropdown-item value="documentation">${e.t("overview.documentation")}<ha-icon slot="icon" icon="mdi:help-circle-outline"></ha-icon></ha-dropdown-item>`}
       </ha-dropdown>
       <div class="panel-content">${this._updateAvailable ? b`<div class="update-banner" role="status"><p>${e.t("panel.update_available")}</p><button type="button" @click=${() => this._reload()}>${e.t("panel.reload")}</button></div>` : x}${this._error ? b`<p class="error" role="alert">${this._error}</p>` : x}${this._notice ? b`<p class="notice" role="status">${this._notice}</p>` : x}${this._registryError ? b`<p class="notice" role="alert">${e.t("panel.registry_unavailable")}</p>` : x}
      ${this._creationNotice && this._view.kind !== "create" ? b`<p class="notice" role="status">${this._creationNotice}</p>${this._createdPlantId && (this._view.kind !== "detail" || this._view.plantId !== this._createdPlantId) ? b`<button ?disabled=${this._formBusy} @click=${() => {
			this._createdPlantId && this._show({
				kind: "detail",
				plantId: this._createdPlantId
			});
		}}>${e.t("panel.open_created")}</button>` : x}` : x}
      ${this._view.kind === "list" && this._overviewError ? b`<p class="error" role="alert">${e.t("overview.status_unavailable", { error: this._overviewError })}</p>` : x}
      <smart-plants-overview ?hidden=${this._view.kind !== "list"} .l=${e} .plants=${this._plants} .overview=${this._overview} .areaNames=${this._plantAreaNames()}
        .thumbnails=${this._thumbnails} .watering=${this._watering} .timeZone=${this._timeZone()} .loading=${this._loading} .blocked=${this._blocked}
        @open-plant=${(e) => this._openFromOverview(e.detail)} @add-plant=${() => this._show({ kind: "create" })} @log-watering=${(e) => void this._logWatering(e.detail.plantId)}></smart-plants-overview>
      ${this._view.kind === "detail" ? this._renderDetail(this._view.plantId) : x}
      ${this._notificationsOpen && this._view.kind === "list" ? b`<smart-plants-notifications .hass=${this.hass} .l=${e} .plants=${this._plants} .devices=${this._devices} .entities=${this._entities} .states=${this._states}
        @notifications-close=${() => {
			this._notificationsOpen = !1, this.shadowRoot?.querySelector(".panel-appbar ha-dropdown [slot=trigger]")?.focus();
		}}></smart-plants-notifications>` : x}
      ${this._wizardStarted && this._capabilities ? b`<div ?hidden=${this._view.kind !== "create"}><smart-plants-wizard .hass=${this.hass} .capabilities=${this._capabilities} .areas=${this._areas} .entities=${this._entities} .devices=${this._devices} .states=${this._states} .blocked=${this._blocked} .navigationContext=${this._context} .photoStatus=${this._creationPhoto} @plant-created=${(e) => void this._created(e)} @wizard-close=${() => this._closeWizard()} @wizard-open-plant=${(e) => this._openCreated(e.detail.plantId)} @wizard-restart=${() => this._clearCreationNotice()} @backend-unavailable=${(e) => {
			this._blocked = !0, this._error = e.detail;
		}}></smart-plants-wizard></div>` : x}
        <p role="status" aria-live="polite">${this._formBusy ? e.t("panel.busy") : ""}</p></div></ha-top-app-bar-fixed></main>`;
	}
};
xc = $, xc.styles = [
	V,
	Gs,
	ja,
	vs
], xc.bundleVersion = As(import.meta.url), H([C({ attribute: !1 })], $.prototype, "hass", void 0), H([C({ attribute: !1 })], $.prototype, "panel", void 0), H([C({
	type: Boolean,
	reflect: !0
})], $.prototype, "narrow", void 0), H([w()], $.prototype, "_plants", void 0), H([w()], $.prototype, "_loading", void 0), H([w()], $.prototype, "_error", void 0), H([w()], $.prototype, "_notice", void 0), H([w()], $.prototype, "_view", void 0), H([w()], $.prototype, "_detailSection", void 0), H([w()], $.prototype, "_formBusy", void 0), H([w()], $.prototype, "_capabilities", void 0), H([w()], $.prototype, "_updateAvailable", void 0), H([w()], $.prototype, "_blocked", void 0), H([w()], $.prototype, "_areas", void 0), H([w()], $.prototype, "_entities", void 0), H([w()], $.prototype, "_devices", void 0), H([w()], $.prototype, "_states", void 0), H([w()], $.prototype, "_evaluations", void 0), H([w()], $.prototype, "_health", void 0), H([w()], $.prototype, "_healthError", void 0), H([w()], $.prototype, "_careHistory", void 0), H([w()], $.prototype, "_historyRole", void 0), H([w()], $.prototype, "_historyRange", void 0), H([w()], $.prototype, "_history", void 0), H([w()], $.prototype, "_careError", void 0), H([w()], $.prototype, "_careDate", void 0), H([w()], $.prototype, "_careNote", void 0), H([w()], $.prototype, "_careKind", void 0), H([w()], $.prototype, "_careFields", void 0), H([w()], $.prototype, "_careEditingId", void 0), H([w()], $.prototype, "_registryError", void 0), H([w()], $.prototype, "_areaReview", void 0), H([w()], $.prototype, "_overview", void 0), H([w()], $.prototype, "_overviewError", void 0), H([w()], $.prototype, "_thumbnails", void 0), H([w()], $.prototype, "_watering", void 0), H([w()], $.prototype, "_edits", void 0), H([w()], $.prototype, "_conflict", void 0), H([w()], $.prototype, "_allSensors", void 0), H([w()], $.prototype, "_preview", void 0), H([w()], $.prototype, "_provider", void 0), H([w()], $.prototype, "_query", void 0), H([w()], $.prototype, "_results", void 0), H([w()], $.prototype, "_related", void 0), H([w()], $.prototype, "_imageUrl", void 0), H([w()], $.prototype, "_imageLoading", void 0), H([w()], $.prototype, "_imageError", void 0), H([w()], $.prototype, "_dialog", void 0), H([w()], $.prototype, "_snoozeDraft", void 0), H([w()], $.prototype, "_restEditor", void 0), H([w()], $.prototype, "_taskEditor", void 0), H([w()], $.prototype, "_automateTaskId", void 0), H([w()], $.prototype, "_carePending", void 0), H([w()], $.prototype, "_careTaskId", void 0), H([w()], $.prototype, "_wizardStarted", void 0), H([w()], $.prototype, "_notificationsOpen", void 0), H([w()], $.prototype, "_creationNotice", void 0), H([w()], $.prototype, "_creationPhoto", void 0), H([w()], $.prototype, "_createdPlantId", void 0), H([w()], $.prototype, "_thresholdRole", void 0), H([w()], $.prototype, "_thresholdEdits", void 0), H([w()], $.prototype, "_thresholdBaseline", void 0), H([w()], $.prototype, "_thresholdError", void 0), H([w()], $.prototype, "_thresholdSaved", void 0), H([w()], $.prototype, "_pendingThresholdSwitch", void 0), H([w()], $.prototype, "_sourceRole", void 0), H([w()], $.prototype, "_sourceEdits", void 0), H([w()], $.prototype, "_sourceBaseline", void 0), H([w()], $.prototype, "_sourceError", void 0), H([w()], $.prototype, "_sourceUnavailable", void 0), H([w()], $.prototype, "_sourceSaved", void 0), H([w()], $.prototype, "_pendingSourceSwitch", void 0), H([w()], $.prototype, "_sourceMode", void 0), H([w()], $.prototype, "_moistureMode", void 0), H([w()], $.prototype, "_expanded", void 0), H([w()], $.prototype, "_settingsOpen", void 0), H([w()], $.prototype, "_careFilter", void 0), H([w()], $.prototype, "_careFormOpen", void 0), H([w()], $.prototype, "_allSourceSensors", void 0), customElements.get("smart-plants-panel") || customElements.define("smart-plants-panel", $);
//#endregion
export { $ as SmartPlantsPanel };

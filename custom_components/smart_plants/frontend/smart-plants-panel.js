// node_modules/@lit/reactive-element/css-tag.js
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
})(e) : e, l, { is: u, defineProperty: d, getOwnPropertyDescriptor: f, getOwnPropertyNames: p, getOwnPropertySymbols: m, getPrototypeOf: h } = Object, g = globalThis, _ = g.trustedTypes, v = _ ? _.emptyScript : "", y = g.reactiveElementPolyfillSupport, b = (e, t) => e, x = {
	toAttribute(e, t) {
		/**
		* @license
		* Copyright 2017 Google LLC
		* SPDX-License-Identifier: BSD-3-Clause
		*/
		switch (t) {
			case Boolean:
				e = e ? v : null;
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
}, S = (e, t) => !u(e, t), ee = {
	attribute: !0,
	type: String,
	converter: x,
	reflect: !1,
	useDefault: !1,
	hasChanged: S
};
(l = Symbol).metadata ?? (l.metadata = Symbol("metadata")), g.litPropertyMetadata ?? (g.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
var C = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ?? (this.l = [])).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ee) {
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
		return this.elementProperties.get(e) ?? ee;
	}
	static _$Ei() {
		if (this.hasOwnProperty(b("elementProperties"))) return;
		let e = h(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(b("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(b("properties"))) {
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
			let i = (n.converter?.toAttribute === void 0 ? x : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? x : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ?? (n = a.getPropertyOptions(e)), !((n.hasChanged ?? S)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
C.elementStyles = [], C.shadowRootOptions = { mode: "open" }, C[b("elementProperties")] = /* @__PURE__ */ new Map(), C[b("finalized")] = /* @__PURE__ */ new Map(), y?.({ ReactiveElement: C }), (g.reactiveElementVersions ?? (g.reactiveElementVersions = [])).push("2.1.2");
// node_modules/lit-html/lit-html.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
var te = globalThis, ne = (e) => e, re = te.trustedTypes, ie = re ? re.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ae = "$lit$", w = `lit$${Math.random().toFixed(9).slice(2)}$`, oe = "?" + w, se = `<${oe}>`, ce = document, le = () => ce.createComment(""), ue = (e) => e === null || typeof e != "object" && typeof e != "function", de = Array.isArray, fe = (e) => de(e) || typeof e?.[Symbol.iterator] == "function", pe = "[ 	\n\f\r]", me = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, he = /-->/g, ge = />/g, _e = RegExp(`>|${pe}(?:([^\\s"'>=/]+)(${pe}*=${pe}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ve = /'/g, ye = /"/g, be = /^(?:script|style|textarea|title)$/i, xe = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), T = xe(1), Se = xe(2), Ce = Symbol.for("lit-noChange"), E = Symbol.for("lit-nothing"), we = /* @__PURE__ */ new WeakMap(), Te = ce.createTreeWalker(ce, 129);
function Ee(e, t) {
	if (!de(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return ie === void 0 ? t : ie.createHTML(t);
}
var De = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = me;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === me ? c[1] === "!--" ? o = he : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = _e) : (be.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = _e) : o = ge : o === _e ? c[0] === ">" ? (o = i ?? me, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? _e : c[3] === "\"" ? ye : ve) : o === ye || o === ve ? o = _e : o === he || o === ge ? o = me : (o = _e, i = void 0);
		let d = o === _e && e[t + 1].startsWith("/>") ? " " : "";
		a += o === me ? n + se : l >= 0 ? (r.push(s), n.slice(0, l) + ae + n.slice(l) + w + d) : n + w + (l === -2 ? t : d);
	}
	return [Ee(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Oe = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = De(t, n);
		if (this.el = e.createElement(l, r), Te.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = Te.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ae)) {
					let t = u[o++], n = i.getAttribute(e).split(w), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Ne : r[1] === "?" ? Pe : r[1] === "@" ? Fe : Me
					}), i.removeAttribute(e);
				} else e.startsWith(w) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (be.test(i.tagName)) {
					let e = i.textContent.split(w), t = e.length - 1;
					if (t > 0) {
						i.textContent = re ? re.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], le()), Te.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], le());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === oe) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(w, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += w.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = ce.createElement("template");
		return n.innerHTML = e, n;
	}
};
function ke(e, t, n = e, r) {
	if (t === Ce) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = ue(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ?? (n._$Co = []))[r] = i), i !== void 0 && (t = ke(e, i._$AS(e, t.values), i, r)), t;
}
var Ae = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? ce).importNode(t, !0);
		Te.currentNode = r;
		let i = Te.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new je(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Ie(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = Te.nextNode(), a++);
		}
		return Te.currentNode = ce, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, je = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = E, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = ke(this, e, t), ue(e) ? e === E || e == null || e === "" ? (this._$AH !== E && this._$AR(), this._$AH = E) : e !== this._$AH && e !== Ce && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? fe(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== E && ue(this._$AH) ? this._$AA.nextSibling.data = e : this.T(ce.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Oe.createElement(Ee(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Ae(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = we.get(e.strings);
		return t === void 0 && we.set(e.strings, t = new Oe(e)), t;
	}
	k(t) {
		de(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(le()), this.O(le()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ne(e).nextSibling;
			ne(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, Me = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = E, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = E;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = ke(this, e, t, 0), a = !ue(e) || e !== this._$AH && e !== Ce, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = ke(this, r[n + o], t, o), s === Ce && (s = this._$AH[o]), a || (a = !ue(s) || s !== this._$AH[o]), s === E ? e = E : e !== E && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === E ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Ne = class extends Me {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === E ? void 0 : e;
	}
}, Pe = class extends Me {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== E);
	}
}, Fe = class extends Me {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = ke(this, e, t, 0) ?? E) === Ce) return;
		let n = this._$AH, r = e === E && n !== E || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== E && (n === E || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Ie = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		ke(this, e);
	}
}, Le = {
	M: ae,
	P: w,
	A: oe,
	C: 1,
	L: De,
	R: Ae,
	D: fe,
	V: ke,
	I: je,
	H: Me,
	N: Pe,
	U: Fe,
	B: Ne,
	F: Ie
}, Re = te.litHtmlPolyfillSupport;
Re?.(Oe, je), (te.litHtmlVersions ?? (te.litHtmlVersions = [])).push("3.3.3");
var ze = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new je(t.insertBefore(le(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Be = globalThis, D = class extends C {
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
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = ze(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return Ce;
	}
};
D._$litElement$ = !0, D.finalized = !0, Be.litElementHydrateSupport?.({ LitElement: D });
var Ve = Be.litElementPolyfillSupport;
Ve?.({ LitElement: D }), (Be.litElementVersions ?? (Be.litElementVersions = [])).push("4.2.2");
// node_modules/@lit/reactive-element/decorators/property.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/ var He = {
	attribute: !0,
	type: String,
	converter: x,
	reflect: !1,
	hasChanged: S
}, Ue = (e = He, t, n) => {
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
	return (t, n) => typeof n == "object" ? Ue(e, t, n) : ((e, t, n) => {
		let r = t.hasOwnProperty(n);
		return t.constructor.createProperty(n, e), r ? Object.getOwnPropertyDescriptor(t, n) : void 0;
	})(e, t, n);
}
// node_modules/@lit/reactive-element/decorators/state.js
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
// src/text.ts
function We(e) {
	let t = 0;
	for (let n of e) t++;
	return t;
}
var A = (e, t) => e.length <= t || e.length <= t * 2 && We(e) <= t, Ge = (e, t) => We(e) <= t ? e : Array.from(e).slice(0, t).join(""), Ke = (e) => e * 2, j = (e) => typeof e == "object" && !!e && !Array.isArray(e), M = (e, t = 500) => typeof e == "string" && e.length > 0 && A(e, t), qe = (e, t = 500) => e === null || M(e, t), N = (e, t, n) => typeof e == "number" && Number.isSafeInteger(e) && e >= t && e <= n, Je = (e) => M(e, 64) && /^\d{4}-\d\d-\d\dT/.test(e) && Number.isFinite(Date.parse(e)), Ye = (e) => j(e) && M(e.id, 200) && N(e.revision, 1, 2 ** 53 - 1) && M(e.name, 200) && Je(e.created_at) && Je(e.archived_at) && (e.acquired_at === null || M(e.acquired_at, 64)) && (e.species === null || j(e.species)) && (e.image === null || j(e.image)) && qe(e.area_name, 100) && N(e.event_count, 0, 1e4), Xe = (e) => e === null || Je(e) || typeof e == "string" && /^\d{4}-\d\d-\d\d$/.test(e) && Number.isFinite(Date.parse(e)), Ze = (e, t) => j(e) && Object.keys(e).length <= 32 && Object.entries(e).every(([e, n]) => M(e, 60) && t(n)), Qe = (e) => e == null || typeof e == "number" && Number.isFinite(e) && e >= -100 && e <= 100, $e = {
	provider: (e) => M(e, 60),
	provider_id: (e) => qe(e, 200),
	provider_ref: (e) => qe(e, 200),
	fetched_at: Je,
	locale: (e) => typeof e == "string" && /^(und|[a-z]{2}(?:-[A-Z]{2})?)$/.test(e),
	source_status: (e) => e === "manual" || e === "provider",
	attribution: (e) => M(e),
	common_name: qe,
	latin_name: qe,
	category: qe,
	confidence: (e) => e === null || typeof e == "number" && Number.isFinite(e) && e >= 0 && e <= 1,
	care_text: (e) => Ze(e, (e) => M(e, 4e3)),
	field_sources: (e) => Ze(e, M),
	threshold_defaults: (e) => Ze(e, (e) => Ze(e, (e) => typeof e == "number" && Number.isSafeInteger(e))),
	min_temperature: Qe,
	max_temperature: Qe,
	survival_min_temperature: (e) => Qe(e) && (e == null || Number.isSafeInteger(e)),
	common_names: (e) => e === void 0 || j(e) && Object.entries(e).every(([e, t]) => (e === "en" || e === "de") && Array.isArray(t) && t.length > 0 && t.length <= 5 && new Set(t).size === t.length && t.every((e) => M(e, 100) && e === e.trim()))
};
function et(e) {
	if (!j(e) || !Object.keys(e).every((e) => Object.hasOwn($e, e)) || !Object.entries($e).every(([t, n]) => n(e[t]))) return !1;
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
	return new TextEncoder().encode(JSON.stringify(e)).length <= 32768 && new Set(t).size === Object.keys(n).length && t.every((t) => n[t] === e.attribution) && (e.source_status !== "manual" || e.provider === "manual" && e.provider_ref === null) && (e.source_status !== "provider" || e.provider !== "manual" && M(e.provider_ref, 200));
}
function tt(e) {
	if (!j(e)) return !1;
	let t = e.placement, n = e.species, r = e.image;
	return M(e.id, 200) && N(e.revision, 1, 2 ** 53 - 1) && M(e.name, 200) && Je(e.created_at) && Xe(e.acquired_at) && ["active", "disabled"].includes(String(e.lifecycle_state)) && qe(e.category, 60) && Array.isArray(e.tags) && e.tags.length <= 32 && e.tags.every((e) => M(e, 60)) && new Set(e.tags).size === e.tags.length && (t === null || j(t) && M(t.mode, 60) && qe(t.exposure, 60) && qe(t.rain_exposure, 60) && (t.container === null || typeof t.container == "boolean")) && (n === null || j(n) && et(n.snapshot) && j(n.snapshot) && n.provider === n.snapshot.provider) && (r === null || j(r) && M(r.id, 200) && r.content_type === "image/webp" && N(r.width, 1, 2048) && N(r.height, 1, 2048) && Je(r.created_at)) && (e.care_events === void 0 || Array.isArray(e.care_events) && e.care_events.length <= 256 && e.care_events.every(_t)) && (e.care_tasks === void 0 || ht(e.care_tasks)) && (e.rest_period === void 0 || e.rest_period === null || st(e.rest_period, ["start_month", "end_month"])) && (e.snoozed_until === void 0 || e.snoozed_until === null || Je(e.snoozed_until)) && (e.watering_detection === void 0 || e.watering_detection === null || typeof e.watering_detection == "boolean") && (e.winter_thresholds === void 0 || e.winter_thresholds === null || rt(e.winter_thresholds));
}
var nt = [
	"temperature",
	"soil_temperature",
	"moisture",
	"illuminance",
	"conductivity",
	"humidity"
];
function rt(e) {
	return j(e) && Object.keys(e).length > 0 && Object.entries(e).every(([e, t]) => nt.includes(e) && j(t) && Object.keys(t).length > 0 && Object.values(t).every((e) => typeof e == "number" && Number.isFinite(e)));
}
var it = /^[0-9a-f]{32}$/, at = (e) => typeof e == "string" && /^\d{4}-\d\d-\d\d$/.test(e) && Number.isFinite(Date.parse(e)), ot = (e, t) => Object.keys(e).length === t.length && t.every((t) => Object.hasOwn(e, t)), st = (e, t) => j(e) && ot(e, t) && N(e.start_month, 1, 12) && N(e.end_month, 1, 12), ct = (e, t) => M(e, t) && e === e.trim(), lt = (e) => typeof e == "number" && Number.isFinite(e), ut = [
	"temperature",
	"humidity",
	"moisture",
	"illuminance",
	"conductivity",
	"soil_temperature",
	"co2"
];
function dt(e) {
	if (!j(e)) return !1;
	if (ot(e, ["role"])) return ut.includes(String(e.role));
	if (ot(e, ["forecast"])) {
		let t = e.forecast;
		return j(t) && ot(t, [
			"entity_id",
			"reading",
			"hours"
		]) && typeof t.entity_id == "string" && /^weather\.[a-z0-9_]+$/.test(t.entity_id) && (t.reading === "low" || t.reading === "high") && (t.hours === 24 || t.hours === 48 || t.hours === 72);
	}
	return ot(e, ["entity_id"]) && typeof e.entity_id == "string" && /^sensor\.[a-z0-9_]+$/.test(e.entity_id);
}
var ft = (e) => !(j(e.source) && Object.hasOwn(e.source, "forecast")) || e.for_minutes === 0 && [
	"°C",
	"°F",
	"K"
].includes(String(e.unit));
function pt(e) {
	return j(e) ? e.kind === "yearly" ? st(e, [
		"kind",
		"start_month",
		"end_month"
	]) : e.kind === "reading" ? ot(e, [
		"kind",
		"source",
		"condition",
		"value",
		"unit",
		"for_minutes",
		"reset_value"
	]) && dt(e.source) && (e.condition === "below" || e.condition === "above") && lt(e.value) && (e.unit === null || M(e.unit, 32)) && N(e.for_minutes, 0, 4320) && ft(e) && (e.reset_value === null || lt(e.reset_value) && (e.condition === "below" ? e.reset_value >= e.value : e.reset_value <= e.value)) : e.kind === "interval" && ot(e, [
		"kind",
		"every",
		"unit",
		"growing_season_only"
	]) && N(e.every, 1, 999) && [
		"days",
		"weeks",
		"months",
		"years"
	].includes(String(e.unit)) && typeof e.growing_season_only == "boolean" : !1;
}
function mt(e) {
	return j(e) && ot(e, [
		"id",
		"type",
		"name",
		"schedule",
		"instructions",
		"baseline_done_on",
		"last_done_at",
		"last_skipped_on",
		"created_on"
	]) && typeof e.id == "string" && it.test(e.id) && [
		"fertilize",
		"prune",
		"repot",
		"pests",
		"winter_protection",
		"custom"
	].includes(String(e.type)) && (e.name === null ? e.type !== "custom" : ct(e.name, 60)) && pt(e.schedule) && (e.instructions === null || ct(e.instructions, 4e3)) && (e.baseline_done_on === null || at(e.baseline_done_on)) && (e.last_done_at === null || Je(e.last_done_at) && String(e.last_done_at).endsWith("Z")) && (e.last_skipped_on === null || at(e.last_skipped_on)) && at(e.created_on);
}
function ht(e) {
	if (!Array.isArray(e) || e.length > 20 || !e.every(mt)) return !1;
	let t = e, n = t.map((e) => e.type).filter((e) => e !== "custom");
	return new Set(t.map((e) => e.id)).size === t.length && new Set(n).size === n.length;
}
function gt(e) {
	let t = [];
	return {
		plants: e.filter((e, n) => {
			if (tt(e)) return !0;
			let r = j(e) && typeof e.id == "string" ? e.id.slice(0, 200) : `#${n}`;
			return console.warn(`Smart Plants: skipping malformed plant record ${r}`), t.push(r), !1;
		}),
		rejected: t
	};
}
function _t(e) {
	if (!j(e) || e.schema_version !== 2 || !M(e.id, 36) || ![
		"watering",
		"fertilizing",
		"pruning",
		"repotting",
		"pest_control",
		"note",
		"task"
	].includes(String(e.kind)) || ![
		"manual",
		"action",
		"automation",
		"sensor"
	].includes(String(e.provenance)) || !(e.task_id === null || typeof e.task_id == "string" && it.test(e.task_id)) || !Je(e.occurred_at) || !/(?:Z|[+-]\d\d:\d\d)$/.test(String(e.occurred_at)) || typeof e.local_date != "string" || !/^\d{4}-\d\d-\d\d$/.test(e.local_date) || e.local_date !== String(e.occurred_at).slice(0, 10) || !Je(e.created_at) || !Je(e.updated_at) || !j(e.payload)) return !1;
	let t = e.payload, n = (e) => e === null || M(e, 500) && e === e.trim();
	return e.kind === "watering" || e.kind === "task" ? Object.keys(t).length === 1 && Object.hasOwn(t, "note") && n(t.note) : e.kind === "fertilizing" ? Object.keys(t).length === 4 && (t.product === null || M(t.product, 120) && t.product === t.product.trim()) && (t.amount === null || typeof t.amount == "number" && Number.isFinite(t.amount) && t.amount > 0 && t.amount <= 1e5) && (t.amount === null && t.unit === null || t.amount !== null && ["g", "mL"].includes(String(t.unit))) && n(t.note) : e.kind === "pruning" ? Object.keys(t).length === 2 && (t.part === null || M(t.part, 120) && t.part === t.part.trim()) && n(t.note) : e.kind === "repotting" ? Object.keys(t).length === 3 && (t.container === null || M(t.container, 120) && t.container === t.container.trim()) && (t.medium === null || M(t.medium, 120) && t.medium === t.medium.trim()) && n(t.note) : e.kind === "pest_control" ? Object.keys(t).length === 3 && (t.pest === null || M(t.pest, 120) && t.pest === t.pest.trim()) && (t.product === null || M(t.product, 120) && t.product === t.product.trim()) && n(t.note) : Object.keys(t).length === 1 && M(t.text, 1e3) && t.text === t.text.trim();
}
function vt(e, t) {
	let n = (e) => {
		let t = e.match(/\.(\d{1,6})(?=Z|[+-]\d\d:\d\d$)/)?.[1] ?? "", n = Number(t.padEnd(6, "0")), r = e.replace(/\.\d{1,6}(?=Z|[+-]\d\d:\d\d$)/, "");
		return [Date.parse(r) + Math.floor(n / 1e3), n % 1e3];
	}, r = n(String(e.occurred_at)), i = n(String(t.occurred_at));
	return i[0] - r[0] || i[1] - r[1] || (String(e.id) < String(t.id) ? -1 : +(String(e.id) > String(t.id)));
}
function yt(e) {
	if (!j(e) || !N(e.revision, 1, 2 ** 53 - 1) || !Array.isArray(e.events) || e.events.length > 256 || !e.events.every(_t) || !j(e.summary)) return !1;
	let t = e.events, n = e.summary, r = t.filter((e) => e.kind === "watering");
	return new Set(t.map((e) => e.id)).size === t.length && n.watering_count === r.length && t.every((e, n) => n === 0 || vt(t[n - 1], e) <= 0) && n.last_watered_at === (r[0]?.occurred_at ?? null) && n.last_watered_local_date === (r[0]?.local_date ?? null);
}
function bt(e, t) {
	return Array.isArray(e) || Array.isArray(t) ? Array.isArray(e) && Array.isArray(t) && e.length === t.length && e.every((e, n) => bt(e, t[n])) : j(e) || j(t) ? j(e) && j(t) && ot(e, Object.keys(t)) && Object.keys(e).every((n) => bt(e[n], t[n])) : e === t;
}
var xt = (e) => typeof e == "string" ? e.trim() || null : e, St = [
	"name",
	"schedule",
	"instructions",
	"baseline_done_on"
];
function Ct(e, t) {
	return St.every((n) => !Object.hasOwn(t, n) || bt(e[n], n === "name" || n === "instructions" ? xt(t[n]) : t[n]));
}
function wt(e, t, n) {
	let r = {
		create: ["task_id"],
		complete: ["event_id"],
		skip: ["previous_skipped_on"]
	}, i = e.slice(e.lastIndexOf("/") + 1);
	if (!ot(n, ["plant", ...e.startsWith("smart_plants/care_tasks/") ? r[i] ?? [] : []]) || !tt(n.plant) || !j(n.plant) || n.plant.id !== t.plant_id || n.plant.revision !== Number(t.expected_revision) + 1) return !1;
	let a = n.plant;
	if (e === "smart_plants/plants/set_rest_period") return bt(a.rest_period, t.rest_period);
	if (!Array.isArray(a.care_tasks)) return !1;
	let o = e === "smart_plants/care_tasks/create" ? n.task_id : t.task_id, s = a.care_tasks.find((e) => e.id === o);
	switch (i) {
		case "create": return typeof n.task_id == "string" && it.test(n.task_id) && s !== void 0 && s.type === t.task_type && Ct(s, t);
		case "update": return s !== void 0 && Ct(s, t);
		case "delete": return s === void 0;
		case "complete": {
			if (s === void 0 || !M(n.event_id, 36) || !Array.isArray(a.care_events)) return !1;
			let e = a.care_events.find((e) => e.id === n.event_id);
			return e !== void 0 && e.task_id === t.task_id && j(e.payload) && e.payload.note === (t.note ?? null) && (t.occurred_at === void 0 || e.occurred_at === t.occurred_at);
		}
		case "skip": return s !== void 0 && at(s.last_skipped_on) && (n.previous_skipped_on === null || at(n.previous_skipped_on));
		case "undo_skip": return s !== void 0 && s.last_skipped_on === t.previous_skipped_on;
	}
	return !1;
}
var Tt = new Set([
	"create",
	"update",
	"delete",
	"complete",
	"skip",
	"undo_skip"
].map((e) => `smart_plants/care_tasks/${e}`));
function Et(e, t) {
	return !j(e) || !M(e.preview_token, 200) || !et(e.snapshot) || !j(e.snapshot) || e.provider !== e.snapshot.provider || !j(e.diff) || !Object.entries(e.diff).every(([e, t]) => j(t) && Object.hasOwn($e, e) && (t.before === null || $e[e](t.before)) && $e[e](t.after)) || t.provider !== void 0 && (e.provider !== t.provider || e.snapshot.provider_ref !== t.provider_ref) ? !1 : e.operation === (t.type === "smart_plants/species/refresh_preview" ? "refresh" : "select") && (t.type !== "smart_plants/wizard/preview" || e.draft_id === t.draft_id && e.revision === 0);
}
function Dt(e) {
	return j(e) && M(e.entity_id, 255) && typeof e.state == "string" && Je(e.last_updated) && j(e.attributes) && [
		"friendly_name",
		"unit_of_measurement",
		"device_class"
	].every((t) => e.attributes && j(e.attributes) && (e.attributes[t] === void 0 || e.attributes[t] === null || typeof e.attributes[t] == "string"));
}
var Ot = /* @__PURE__ */ new Set([
	"high",
	"medium",
	"low",
	"unknown"
]);
function kt(e) {
	return !j(e) || typeof e.available != "boolean" || typeof e.confidence != "number" || !Number.isFinite(e.confidence) || e.confidence < 0 || e.confidence > 1 || typeof e.confidence_label != "string" || !Ot.has(e.confidence_label) || !Array.isArray(e.contributors) || !e.contributors.every((e) => M(e, 60)) || !Array.isArray(e.configured) || !e.configured.every((e) => M(e, 60)) || !Array.isArray(e.reasons) || !e.reasons.every((e) => M(e, 4e3)) ? !1 : e.available ? N(e.health_score, 0, 100) : e.health_score === null;
}
function At(e) {
	return !j(e) || typeof e.computed_available != "boolean" || typeof e.sensor_stale != "boolean" || !Array.isArray(e.reasons) || !e.reasons.every((e) => M(e, 4e3)) ? !1 : e.computed_available ? typeof e.computed_percent == "number" && Number.isFinite(e.computed_percent) && e.computed_percent >= 0 && e.computed_percent <= 100 && N(e.health_score, 0, 100) && typeof e.needs_water == "boolean" && typeof e.too_wet == "boolean" : e.computed_percent === null && e.health_score === null && e.needs_water === null && e.too_wet === null;
}
function jt(e, t) {
	let n = String(e.type);
	if (!n.startsWith("smart_plants/") || n === "smart_plants/panel/info") return !0;
	if (!j(t)) return !1;
	if (n === "smart_plants/wizard/start") return typeof t.draft_id == "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(t.draft_id) && typeof t.draft_token == "string" && /^[A-Za-z0-9_-]{43}$/.test(t.draft_token) && t.revision === 0 && N(t.expires_in, 1, 600);
	if (n.endsWith("/preview") || n.endsWith("/refresh_preview")) return Et(t, e);
	if (n === "smart_plants/species/search") return Array.isArray(t.results) && t.results.length <= 50 && t.results.every((t) => j(t) && t.provider === e.provider && M(t.provider_ref, 100) && M(t.latin_name) && qe(t.common_name) && qe(t.category) && M(t.attribution));
	if (n === "smart_plants/moisture/evaluation") return At(t.evaluation);
	if (n === "smart_plants/plants/health") return kt(t.evaluation);
	if (n === "smart_plants/care/list") return yt(t);
	if ([
		"smart_plants/care/add_watering",
		"smart_plants/care/add",
		"smart_plants/care/edit"
	].includes(n)) {
		if (!tt(t.plant) || !j(t.plant) || t.plant.id !== e.plant_id || !_t(t.event) || !j(t.event) || !Array.isArray(t.plant.care_events)) return !1;
		let r = t.plant.care_events, i = t.event;
		if (!r.some((e) => e.id === i.id && JSON.stringify(e) === JSON.stringify(i))) return !1;
		let a = n === "smart_plants/care/add_watering" ? "watering" : e.kind, o = n === "smart_plants/care/add_watering" ? { note: e.note } : e.payload;
		return i.kind !== a || i.occurred_at !== e.occurred_at || JSON.stringify(i.payload) !== JSON.stringify(o) || n === "smart_plants/care/edit" && i.id !== e.event_id || t.plant.revision !== Number(e.expected_revision) + 1 ? !1 : yt({
			revision: t.plant.revision,
			events: [...r].sort(vt),
			summary: t.summary
		});
	}
	if (Tt.has(n) || n === "smart_plants/plants/set_rest_period") return wt(n, e, t);
	if (n === "smart_plants/plants/set_winter_thresholds") {
		if (!ot(t, ["plant"]) || !tt(t.plant) || !j(t.plant) || t.plant.id !== e.plant_id || t.plant.revision !== Number(e.expected_revision) + 1) return !1;
		let n = t.plant.winter_thresholds ?? null, r = e.winter_thresholds;
		return r === null ? n === null : j(r) && j(n) && bt(Object.keys(n).sort(), Object.keys(r).sort());
	}
	if (n === "smart_plants/care/delete") return !tt(t.plant) || !j(t.plant) || t.plant.id !== e.plant_id || !Array.isArray(t.plant.care_events) ? !1 : t.plant.revision === Number(e.expected_revision) + 1 && !t.plant.care_events.some((t) => j(t) && t.id === e.event_id) && yt({
		revision: t.plant.revision,
		events: [...t.plant.care_events].sort((e, t) => vt(e, t)),
		summary: t.summary
	});
	if (n === "smart_plants/plants/list") {
		if (!Array.isArray(t.plants)) return !1;
		let e = t.plants.filter(tt);
		return new Set(e.map((e) => e.id)).size === e.length;
	}
	if (n === "smart_plants/roles/list") return Array.isArray(t.roles) && t.roles.every((e) => j(e) && M(e.role) && M(e.source_domain) && Array.isArray(e.aggregations) && e.aggregations.every((e) => M(e)) && Array.isArray(e.thresholds) && e.thresholds.every((e) => j(e) && M(e.key) && M(e.entity_role) && M(e.translation_key)) && Array.isArray(e.entities) && e.entities.every((e) => j(e) && M(e.role) && M(e.platform) && M(e.translation_key)));
	if (n === "smart_plants/plants/delete" || n === "smart_plants/archive/delete") return Object.keys(t).length === 0;
	if (n === "smart_plants/plants/archive") return Ye(t.archived) && t.archived.id === e.plant_id;
	if (n === "smart_plants/archive/list") return Array.isArray(t.plants) && t.plants.every(Ye) && new Set(t.plants.map((e) => e.id)).size === t.plants.length;
	if (n === "smart_plants/archive/get") return !Ye(t.plant) || !j(t.plant) || t.plant.id !== e.plant_id ? !1 : Array.isArray(t.plant.events) && t.plant.events.every(_t) && j(t.plant.sources) && j(t.plant.summary);
	if (n === "smart_plants/archive/restore_check") return typeof t.name_taken == "boolean" && M(t.suggested_name) && Array.isArray(t.sources_in_use) && Array.isArray(t.sources_missing) && typeof t.area_missing == "boolean" && (t.blocked === null || t.blocked === "limit" || t.blocked === "busy");
	if (n === "smart_plants/plants/snooze") {
		if (!tt(t.plant) || !j(t.plant) || t.plant.id !== e.plant_id) return !1;
		let n = t.plant.snoozed_until;
		return e.until === null ? n == null : typeof n == "string" && Math.floor(Date.parse(String(e.until)) / 1e3) === Math.floor(Date.parse(n) / 1e3);
	}
	if (n === "smart_plants/plants/snooze_many" || n === "smart_plants/plants/restore_snoozes") {
		if (!Array.isArray(t.plants) || !t.plants.every((e) => tt(e) && j(e))) return !1;
		let e = t.plants.map((e) => e.id);
		if (new Set(e).size !== e.length) return !1;
		if (n === "smart_plants/plants/restore_snoozes") return t.skipped === void 0 || Array.isArray(t.skipped) && t.skipped.every((t) => typeof t == "string" && !e.includes(t));
		let r = t.previous;
		return j(r) && Object.keys(r).length === e.length && e.every((e) => typeof e == "string" && e in r) && Object.values(r).every((e) => e === null || Je(e));
	}
	if (n === "smart_plants/plants/overview") return Array.isArray(t.plants) && t.plants.every(j) && new Set(t.plants.map((e) => e.plant_id)).size === t.plants.length;
	if (n === "smart_plants/wizard/create") {
		if (!tt(t.plant) || !j(t.plant)) return !1;
		let n = t.plant.roles;
		return e.roles === void 0 || j(e.roles) && j(n) && Object.keys(e.roles).every((e) => j(n[e]));
	}
	return tt(t.plant) && j(t.plant) && (e.plant_id === void 0 || t.plant.id === e.plant_id);
}
// src/status.ts
var Mt = [
	"needs_water",
	"too_wet",
	"problem",
	"stale",
	"no_sensors",
	"healthy",
	"paused"
], Nt = {
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
function Pt(e) {
	return typeof e == "string" && Mt.includes(e);
}
function Ft(e, t) {
	return e.t(Nt[t].label);
}
function It(e, t) {
	return Mt.indexOf(e) - Mt.indexOf(t);
}
var Lt = [
	"moisture",
	"temperature",
	"humidity",
	"illuminance",
	"conductivity",
	"soil_temperature",
	"co2",
	"battery"
], P = {
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
function Rt(e) {
	return typeof e == "string" && Lt.includes(e);
}
function F(e, t) {
	return e.t(P[t].label);
}
function I(e, t, n) {
	return n === "%" ? e.percent(t) : n ? `${e.number(t)} ${n}` : e.number(t);
}
function zt(e, t, n, r) {
	if (!n) return "";
	let { min: i, max: a } = n;
	return t === "battery" && i !== null ? e.t("range.low_below", { value: I(e, i, r) }) : i !== null && a !== null ? e.t("range.between", {
		min: e.number(i),
		max: I(e, a, r)
	}) : i === null ? a === null ? "" : e.t("range.at_most", { value: I(e, a, r) }) : e.t("range.at_least", { value: I(e, i, r) });
}
var Bt = [
	["second", 60],
	["minute", 60],
	["hour", 24],
	["day", 7],
	["week", 4.34524],
	["month", 12],
	["year", Infinity]
];
function Vt(e, t, n = Date.now()) {
	let r = Date.parse(t);
	if (!Number.isFinite(r)) return t;
	let i = new Intl.RelativeTimeFormat(e.language, { numeric: "auto" }), a = (r - n) / 1e3;
	for (let [e, t] of Bt) {
		if (Math.abs(a) < t) return i.format(Math.round(a), e);
		a /= t;
	}
	return t;
}
// src/overview-model.ts
var Ht = [
	"ok",
	"low",
	"high",
	"stale",
	"unavailable"
], Ut = (e) => typeof e == "object" && !!e && !Array.isArray(e), Wt = (e) => e === null || typeof e == "number" && Number.isFinite(e), Gt = (e) => e === null || typeof e == "string", Kt = [
	"fertilize",
	"prune",
	"repot",
	"pests",
	"winter_protection",
	"custom"
], qt = [
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
], Jt = (e) => e === null || typeof e == "string" && Number.isFinite(Date.parse(e)), Yt = (e) => e === null || typeof e == "string" && /^\d{4}-\d\d-\d\d$/.test(e) && Number.isFinite(Date.parse(e)), Xt = (e) => typeof e == "number" && Number.isInteger(e) && e >= 1 && e <= 12;
function Zt(e) {
	if (!Ut(e)) return null;
	let { task_id: t, type: n, name: r, status: i, is_due: a, next_due: o, days: s, window_end: c, resume_on: l } = e, { reading: u = null, unit: d = null, due_since: f = null, due_at: p = null, forecast: m = null, forecast_until: h = null } = e;
	return typeof t != "string" || !/^[0-9a-f]{32}$/.test(t) || !Kt.includes(n) || !(r === null ? n !== "custom" : typeof r == "string" && r.length > 0 && A(r, 60)) || !qt.includes(i) || typeof a != "boolean" || i !== "no_reading" && a !== (i === "due" || i === "overdue") || !Yt(o) || !Yt(c) || !Yt(l) || !(s === null || typeof s == "number" && Number.isSafeInteger(s) && s >= 0) || !Wt(u) || !Gt(d) || !Jt(f) || !Jt(p) || m !== null && m !== "low" && m !== "high" || !Jt(h) ? null : {
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
function Qt(e) {
	if (e === null) return null;
	if (Ut(e) && Object.keys(e).length === 2 && Xt(e.start_month) && Xt(e.end_month)) return {
		start_month: e.start_month,
		end_month: e.end_month
	};
}
function $t(e) {
	if (!Ut(e) || !Ut(e.range)) return null;
	let { value: t, unit: n, state: r, range: i, clear: a = null, last_reported: o, sources: s, normal_range: c = null } = e;
	if (!Wt(t) || n !== null && typeof n != "string" || !Ht.includes(r) || !Wt(i.min) || !Wt(i.target) || !Wt(i.max) || !Gt(o)) return null;
	let l = a === null ? {
		min: null,
		max: null
	} : Ut(a) && Wt(a.min) && Wt(a.max) ? {
		min: a.min,
		max: a.max
	} : null;
	return !l || !Array.isArray(s) || !s.every((e) => typeof e == "string") || !(c === null || Ut(c) && Wt(c.min) && (c.target === void 0 || Wt(c.target)) && Wt(c.max)) ? null : {
		value: t,
		unit: n ?? "",
		state: r,
		range: {
			min: i.min,
			target: i.target,
			max: i.max
		},
		clear: l,
		last_reported: o,
		sources: [...s],
		normal_range: c === null ? null : {
			min: c.min,
			target: c.target ?? null,
			max: c.max
		}
	};
}
function en(e) {
	if (e == null) return null;
	if (!(!Ut(e) || typeof e.active != "boolean" || e.reason !== null && e.reason !== "dormant_storage" && e.reason !== "rest_period") && Yt(e.until) && Array.isArray(e.roles) && e.roles.every((e) => typeof e == "string") && e.active === (e.reason !== null)) return {
		active: e.active,
		reason: e.reason,
		until: e.until,
		roles: [...e.roles]
	};
}
function tn(e) {
	if (!Ut(e)) return null;
	let { plant_id: t, revision: n, lifecycle_state: r, status: i, problems: a, roles: o, last_watered_at: s, image: c, care: l, rest_period: u, resting: d, snoozed_until: f, winter: p } = e;
	if (typeof t != "string" || typeof n != "number" || r !== "active" && r !== "disabled" || !Pt(i) || !Array.isArray(a) || !Ut(o) || !Gt(s) || !(c === null || Ut(c) && typeof c.id == "string") || !Array.isArray(l) || l.length > 20 || typeof d != "boolean") return null;
	let m = l.map(Zt);
	if (!m.every((e) => e !== null) || new Set(m.map((e) => e.task_id)).size !== m.length) return null;
	let h = Qt(u);
	if (h === void 0 || h === null && d || f !== void 0 && !Jt(f)) return null;
	let g = en(p);
	if (g === void 0) return null;
	let _ = a.filter((e) => Ut(e) && typeof e.role == "string" && typeof e.kind == "string").map((e) => ({
		role: e.role,
		kind: e.kind
	}));
	if (_.length !== a.length) return null;
	let v = {};
	for (let [e, t] of Object.entries(o)) {
		if (!Rt(e)) continue;
		let n = $t(t);
		if (!n) return null;
		v[e] = n;
	}
	return {
		plant_id: t,
		revision: n,
		lifecycle_state: r,
		status: i,
		problems: _,
		roles: v,
		last_watered_at: s,
		image: c === null ? null : { id: c.id },
		care: m,
		rest_period: h,
		resting: d,
		snoozed_until: f ?? null,
		winter: g
	};
}
var nn = {
	too_cold: "problem_kind.too_cold",
	too_hot: "problem_kind.too_hot",
	too_dry: "problem_kind.too_dry",
	too_humid: "problem_kind.too_humid",
	low_light: "problem_kind.low_light",
	low_conductivity: "problem_kind.low_conductivity",
	high_conductivity: "problem_kind.high_conductivity",
	high_co2: "problem_kind.high_co2",
	battery_low: "problem_kind.battery_low"
}, rn = {
	too_cold: "problem_kind.soil_too_cold",
	too_hot: "problem_kind.soil_too_hot"
};
function an(e, t) {
	let n = t.problems[0], r = t.status === "healthy" || t.status === "paused" ? 0 : Math.max(0, t.problems.length - 1);
	if (t.status === "problem" && n) {
		let t = (n.role === "soil_temperature" ? rn[n.kind] : void 0) ?? nn[n.kind];
		return {
			label: t ? e.t(t) : Ft(e, "problem"),
			more: r
		};
	}
	return t.status === "stale" && n?.kind === "no_main_sensor" ? {
		label: e.t("plant_status.no_main_sensor"),
		more: r
	} : {
		label: Ft(e, t.status),
		more: r
	};
}
function on(e, t) {
	return t && t.value !== null ? I(e, t.value, t.unit) : null;
}
function sn(e, t, n, r) {
	let i = Rt(n.role) ? n.role : null, a = i ? t.roles[i] : void 0, o = i ? F(e, i) : n.role, s = on(e, a), c = (t) => t == null || !a ? null : I(e, t, a.unit), l = (t) => {
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
			age: Vt(e, a.last_reported, r)
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
function cn(e, t, n) {
	return t.status === "healthy" || t.status === "paused" || t.status === "no_sensors" ? "" : t.problems.slice(0, 2).map((r) => sn(e, t, r, n)).join(" · ");
}
function ln(e, t, n = Date.now()) {
	if (!t) return e.t("card.never_watered");
	let r = Date.parse(t);
	return Number.isFinite(r) && Math.abs(n - r) < 6e4 ? e.t("card.watered_just_now") : e.t("card.watered", { age: Vt(e, t, n) });
}
function un(e) {
	return Object.keys(P).filter((t) => t !== "moisture" && e.roles[t]).map((t) => [t, e.roles[t]]);
}
var dn = [
	"all",
	"water",
	"problems",
	"sensors",
	"care"
];
function fn(e, t, n = !1, r = !1) {
	if (e === "all") return !0;
	if (r) return !1;
	switch (e) {
		case "care": return n;
		case "water": return t === "needs_water";
		case "problems": return t === "too_wet" || t === "problem";
		case "sensors": return t === "stale" || t === "no_sensors";
	}
}
var pn = [
	"attention",
	"name",
	"area"
];
function mn(e, t) {
	let n = t.trim().toLocaleLowerCase();
	return !n || e.searchText.toLocaleLowerCase().includes(n);
}
var hn = (e, t) => e.name.localeCompare(t.name, void 0, { sensitivity: "base" }), gn = (e) => e.snoozed && e.status !== "paused" ? "healthy" : e.status ?? "healthy";
function _n(e, t) {
	let n = [...e];
	return t === "attention" ? n.sort((e, t) => It(gn(e), gn(t)) || hn(e, t)) : n.sort(hn), n;
}
function vn(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of _n(e, "name")) t.set(n.areaName, [...t.get(n.areaName) ?? [], n]);
	return [...t.entries()].sort(([e], [t]) => e === null ? 1 : t === null ? -1 : e.localeCompare(t, void 0, { sensitivity: "base" })).map(([e, t]) => ({
		area: e,
		items: t
	}));
}
// src/history-model.ts
var yn = [
	"24h",
	"7d",
	"30d",
	"1y"
], bn = 36e5, xn = 24 * bn, Sn = {
	"24h": {
		spanMs: xn,
		period: "5minute",
		periodMs: 3e5
	},
	"7d": {
		spanMs: 7 * xn,
		period: "hour",
		periodMs: bn
	},
	"30d": {
		spanMs: 30 * xn,
		period: "hour",
		periodMs: bn
	},
	"1y": {
		spanMs: 365 * xn,
		period: "day",
		periodMs: xn
	}
};
function Cn(e) {
	return typeof e == "string" && yn.includes(e);
}
var wn = (e) => typeof e == "number" && Number.isFinite(e);
function Tn(e, t) {
	if (typeof e != "object" || !e || Array.isArray(e)) return null;
	let n = e[t];
	if (n === void 0) return [];
	if (!Array.isArray(n)) return null;
	let r = [];
	for (let e of n) {
		if (typeof e != "object" || !e) continue;
		let { start: t, end: n, mean: i, min: a, max: o } = e;
		if (!wn(t) || !wn(i)) continue;
		let s = wn(n) && n > t ? (t + n) / 2 : t, c = wn(a) ? Math.min(a, i) : i, l = wn(o) ? Math.max(o, i) : i;
		r.push({
			t: s,
			mean: i,
			min: c,
			max: l
		});
	}
	return r.sort((e, t) => e.t - t.t);
}
function En(e, t, n) {
	let r = e.at(-1);
	return t == null || !Number.isFinite(t) || r && r.t >= n ? [...e] : [...e, {
		t: n,
		mean: t,
		min: t,
		max: t
	}];
}
function Dn(e, t) {
	let n = [], r;
	for (let i of e) (!r || i.t - r.t > t * 2.5) && n.push([]), n.at(-1).push(i), r = i;
	return n;
}
function On(e) {
	let t = 10 ** Math.floor(Math.log10(e)), n = e / t;
	return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * t;
}
function kn(e, t, n) {
	let r = Math.min(...e.map((e) => e.min)), i = Math.max(...e.map((e) => e.max));
	Number.isFinite(r) && Number.isFinite(i) || (r = 0, i = n === "%" ? 100 : 1);
	let a = Math.max(i - r, n === "%" ? 10 : Math.max(Math.abs(i) * .1, 1)) * 1.5;
	for (let e of t) e != null && Number.isFinite(e) && (e < r && e >= r - a && (r = e), e > i && e <= i + a && (i = e));
	let o = n === "%" ? 10 : Math.max(Math.abs(i) * .05, 2);
	if (i - r < o) {
		let e = (o - (i - r)) / 2;
		r -= e, i += e;
	}
	let s = On((i - r) / 4), c = Math.floor((r - s * .25) / s) * s, l = Math.ceil((i + s * .25) / s) * s;
	n === "%" ? (c = Math.max(0, c), l = Math.min(100, l)) : r >= 0 && (c = Math.max(0, c));
	let u = [];
	for (let e = Math.ceil(c / s - 1e-9) * s; e <= l + s * 1e-6; e += s) u.push(Number(e.toPrecision(12)));
	return {
		min: c,
		max: l,
		ticks: u
	};
}
function An(e, t, n) {
	let r = t - e, i = [], a = new Date(e), o = (n) => {
		let r = a.getTime();
		r >= e && r <= t && i.push({
			t: r,
			label: n.format(r)
		});
	};
	if (r <= 1.5 * xn) {
		let e = new Intl.DateTimeFormat(n, {
			hour: "2-digit",
			minute: "2-digit"
		});
		a.setMinutes(0, 0, 0), a.setHours(Math.floor(a.getHours() / 6) * 6);
		for (let n = 0; n < 12 && a.getTime() <= t; n++) o(e), a.setHours(a.getHours() + 6);
	} else if (r <= 45 * xn) {
		let e = r > 10 * xn, i = new Intl.DateTimeFormat(n, e ? {
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
var jn = 5, Mn = 12 * bn, Nn = .2, Pn = 60;
function Fn(e, t) {
	let { periodMs: n, wateredAt: r = null, min: i = null } = t;
	if (n > bn || e.length < 3) return null;
	let a = Math.max(6 * bn, n * 1.5), o = 0, s = 0, c = !1;
	for (let t = 1; t < e.length; t++) {
		for (; e[t].t - e[s].t > a;) s++;
		let n = e[t].mean;
		for (let r = s; r < t; r++) n = Math.min(n, e[r].mean);
		let r = e[t].mean - n >= jn;
		r && !c && (o = t), c = r;
	}
	let l = e.at(-1), u = o, d = !1;
	if (r !== null && Number.isFinite(r) && r <= l.t) {
		let t = e.findIndex((e) => e.t >= r);
		t >= 0 && (t >= o || e[o].t - r <= a) && (u = Math.max(t, o), d = !0);
	}
	for (let t = u + 1; t < e.length && e[t].t - e[u].t <= a; t++) e[t].mean >= e[u].mean && (u = t);
	let f = e.slice(u);
	if (f.length < 3 || l.t - f[0].t < Mn) return null;
	let p = f.reduce((e, t) => e + t.t, 0) / f.length, m = f.reduce((e, t) => e + t.mean, 0) / f.length, h = 0, g = 0;
	for (let e of f) h += (e.t - p) * (e.mean - m), g += (e.t - p) ** 2;
	if (g === 0) return null;
	let _ = -(h / g) * xn;
	if (!(_ >= Nn)) return null;
	let v = i !== null && l.mean > i ? (l.mean - i) / _ : null;
	return {
		ratePerDay: _,
		sinceWatering: d,
		daysToMin: v !== null && v <= Pn ? v : null
	};
}
function In(e, t, n) {
	let r = I(e, Math.round(t.ratePerDay * 10) / 10, "%"), i = t.daysToMin, a = n == null ? "" : I(e, n, "%");
	return {
		rate: e.t(t.sinceWatering ? "history.rate_since_watering" : "history.rate", { rate: r }),
		forecast: i === null || !a ? "" : i < 1 ? e.t("history.forecast_soon", { limit: a }) : e.tn(Math.round(i), "history.forecast_one", "history.forecast_other", { limit: a })
	};
}
var Ln = {
	"24h": "history.period_24h",
	"7d": "history.period_7d",
	"30d": "history.period_30d",
	"1y": "history.period_1y"
};
function Rn(e, t, n, r, i) {
	let a = e.t(Ln[n]), o = r[0], s = r.at(-1);
	if (!o || !s) return e.t("history.summary_empty", {
		role: t,
		period: a
	});
	let c = (t) => I(e, Math.round(t * 10) / 10, i);
	return e.t("history.summary", {
		role: t,
		period: a,
		first: c(o.mean),
		last: c(s.mean),
		low: c(Math.min(...r.map((e) => e.min))),
		high: c(Math.max(...r.map((e) => e.max)))
	});
}
function zn(e, t) {
	return {
		min: t?.min ?? null,
		max: e === "battery" ? null : t?.max ?? null,
		target: t?.target ?? null
	};
}
// src/api.ts
var L = class extends Error {
	constructor(e, t) {
		super(t), this.code = e, this.name = "ApiError";
	}
};
function Bn(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	return typeof t.code == "string" || typeof t.error == "object";
}
async function R(e, t) {
	try {
		let n = await e.connection.sendMessagePromise(t);
		if (!jt(t, n)) throw new L("invalid_response", "The response is incompatible. Refresh and retry.");
		return n;
	} catch (e) {
		if (e instanceof L) throw e;
		if (Bn(e)) {
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
	async createCareTask(e, t, n, r) {
		return R(e, {
			type: "smart_plants/care_tasks/create",
			plant_id: t,
			expected_revision: n,
			...r
		});
	},
	async updateCareTask(e, t, n, r, i) {
		return (await R(e, {
			type: "smart_plants/care_tasks/update",
			plant_id: t,
			task_id: n,
			expected_revision: r,
			...i
		})).plant;
	},
	async deleteCareTask(e, t, n, r) {
		return (await R(e, {
			type: "smart_plants/care_tasks/delete",
			plant_id: t,
			task_id: n,
			expected_revision: r
		})).plant;
	},
	async completeCareTask(e, t, n, r, i = {}) {
		return R(e, {
			type: "smart_plants/care_tasks/complete",
			plant_id: t,
			task_id: n,
			expected_revision: r,
			...i
		});
	},
	async skipCareTask(e, t, n, r) {
		return R(e, {
			type: "smart_plants/care_tasks/skip",
			plant_id: t,
			task_id: n,
			expected_revision: r
		});
	},
	async undoSkipCareTask(e, t, n, r, i) {
		return (await R(e, {
			type: "smart_plants/care_tasks/undo_skip",
			plant_id: t,
			task_id: n,
			expected_revision: r,
			previous_skipped_on: i
		})).plant;
	},
	async setRestPeriod(e, t, n, r) {
		return (await R(e, {
			type: "smart_plants/plants/set_rest_period",
			plant_id: t,
			expected_revision: n,
			rest_period: r
		})).plant;
	},
	async setWinterThresholds(e, t, n, r) {
		return (await R(e, {
			type: "smart_plants/plants/set_winter_thresholds",
			plant_id: t,
			expected_revision: n,
			winter_thresholds: r
		})).plant;
	},
	async info(e) {
		let t = await R(e, { type: "smart_plants/panel/info" });
		if (!t || t.api_version !== 1 || t.schema_version !== 1 || !Array.isArray(t.providers) || !t.providers.every((e) => e && typeof e.provider == "string" && typeof e.available == "boolean" && typeof e.search_supported == "boolean") || t.bundle_version !== void 0 && (typeof t.bundle_version != "string" || t.bundle_version.length > 100)) throw new L("version_mismatch", "Panel/API version mismatch. Restart Home Assistant and fully reload the frontend after upgrading.");
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
		return Vn(await R(e, { type: "config/area_registry/list" }), (e) => typeof e.area_id == "string" && typeof e.name == "string");
	},
	async entities(e) {
		return Vn(await R(e, { type: "config/entity_registry/list" }), (e) => typeof e.id == "string" && typeof e.entity_id == "string" && typeof e.unique_id == "string" && typeof e.platform == "string" && (e.device_id === null || typeof e.device_id == "string") && (e.area_id === void 0 || e.area_id === null || typeof e.area_id == "string"));
	},
	async devices(e) {
		return Vn(await R(e, { type: "config/device_registry/list" }), (e) => typeof e.id == "string" && (e.area_id === null || typeof e.area_id == "string") && Array.isArray(e.identifiers) && e.identifiers.every((e) => Array.isArray(e) && e.length === 2 && e.every((e) => typeof e == "string")));
	},
	async states(e) {
		return Vn(await R(e, { type: "get_states" }), Dt);
	},
	async related(e, t) {
		return Gn(await R(e, {
			type: "search/related",
			item_type: "device",
			item_id: t
		}));
	},
	async relatedToEntity(e, t) {
		return Gn(await R(e, {
			type: "search/related",
			item_type: "entity",
			item_id: t
		}));
	},
	async statistics(e, t, n, r, i) {
		let a = Tn(await R(e, {
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
		if (!a) throw new L("invalid_response", "The statistics response is incompatible. Refresh and retry.");
		return a;
	},
	async subscribeRegistry(e, t) {
		let n = [];
		try {
			if (e.connection.subscribeEvents) for (let r of [
				"area_registry_updated",
				"device_registry_updated",
				"entity_registry_updated",
				"smart_plants_archive_updated"
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
	async overview(e) {
		let t = await R(e, { type: "smart_plants/plants/overview" });
		if (!Array.isArray(t?.plants)) throw new L("invalid_response", "Invalid plant overview response.");
		return t.plants.map(tn).filter((e) => e !== null);
	},
	async list(e) {
		return (await z.listWithArchive(e)).plants;
	},
	async listWithArchive(e) {
		let t = await R(e, { type: "smart_plants/plants/list" }), n = t.archived_count, { plants: r, rejected: i } = gt(t.plants);
		return {
			plants: r,
			rejected: i,
			archivedCount: typeof n == "number" && Number.isInteger(n) && n > 0 ? n : 0,
			photoMeta: Wn(t.photo_meta)
		};
	},
	async archive(e, t, n) {
		return (await R(e, {
			type: "smart_plants/plants/archive",
			plant_id: t,
			expected_revision: n
		})).archived;
	},
	async archiveList(e) {
		let t = await R(e, { type: "smart_plants/archive/list" });
		if (!Array.isArray(t?.plants)) throw new L("invalid_response", "Invalid archive response.");
		return {
			plants: t.plants,
			photoMeta: Wn(t.photo_meta)
		};
	},
	async archiveGet(e, t) {
		return (await R(e, {
			type: "smart_plants/archive/get",
			plant_id: t
		})).plant;
	},
	async restoreCheck(e, t) {
		return R(e, {
			type: "smart_plants/archive/restore_check",
			plant_id: t
		});
	},
	async restore(e, t, n, r, i, a) {
		return (await R(e, {
			type: "smart_plants/archive/restore",
			plant_id: t,
			expected_revision: n,
			name: r,
			include_sources_in_use: i,
			expected_name_taken: a.name_taken,
			expected_sources_in_use: a.sources_in_use.map((e) => e.entity_id)
		})).plant;
	},
	async deleteArchived(e, t, n) {
		await R(e, {
			type: "smart_plants/archive/delete",
			plant_id: t,
			expected_revision: n
		});
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
	async snooze(e, t, n, r) {
		return (await R(e, {
			type: "smart_plants/plants/snooze",
			plant_id: t,
			expected_revision: n,
			until: r
		})).plant;
	},
	async snoozeMany(e, t) {
		return R(e, {
			type: "smart_plants/plants/snooze_many",
			until: t
		});
	},
	async restoreSnoozes(e, t, n) {
		let r = await R(e, {
			type: "smart_plants/plants/restore_snoozes",
			snoozes: t,
			expected: n
		});
		return {
			plants: r.plants,
			skipped: r.skipped ?? []
		};
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
	async fetchImage(e, t, n, r, i) {
		let a = `/api/smart_plants/plants/${encodeURIComponent(t)}/image?v=${encodeURIComponent(n)}${i ? `&size=${i}` : ""}`, o = {};
		e.auth?.accessToken && (o.Authorization = `Bearer ${e.auth.accessToken}`);
		let s, c = {
			method: "GET",
			headers: o,
			credentials: "same-origin"
		};
		r && (c.signal = r);
		try {
			s = await fetch(a, c);
		} catch (e) {
			throw e instanceof DOMException && e.name === "AbortError" ? e : new L("unknown_error", "Image request failed. Retry when connected.");
		}
		if (!s.ok) throw new L("unknown_error", `HTTP ${s.status}`);
		let l = await s.blob();
		if (l.type !== "image/webp" || l.size === 0) throw new L("invalid_response", "The image response is incompatible. Refresh and retry.");
		return l;
	},
	async uploadImage(e, t, n, r) {
		return Kn(e, `/api/smart_plants/plants/${encodeURIComponent(t)}/image?expected_revision=${n}`, {
			method: "POST",
			plantId: t,
			body: r,
			contentType: r.type
		});
	},
	async deleteImage(e, t, n) {
		return Kn(e, `/api/smart_plants/plants/${encodeURIComponent(t)}/image?expected_revision=${n}`, {
			method: "DELETE",
			plantId: t
		});
	}
};
function Vn(e, t) {
	if (!Array.isArray(e)) throw new L("invalid_response", "Home Assistant registry/state response is incompatible. Reload and retry.");
	return e.filter((e) => typeof e == "object" && !!e && !Array.isArray(e) && t(e));
}
var Hn = /^[0-9a-f]{32}$/, Un = /^[A-Za-z0-9+/]+={0,2}$/;
function Wn(e) {
	let t = {};
	if (typeof e != "object" || !e || Array.isArray(e)) return t;
	for (let [n, r] of Object.entries(e)) {
		let e = typeof r == "object" && r ? r.thumbhash : void 0;
		Hn.test(n) && typeof e == "string" && e.length <= 64 && Un.test(e) && (t[n] = { thumbhash: e });
	}
	return t;
}
function Gn(e) {
	let t = typeof e == "object" && e ? e.automation : void 0;
	return Array.isArray(t) ? t.filter((e) => typeof e == "string") : [];
}
async function Kn(e, t, n) {
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
		let e = s?.error?.code ?? (a.status === 413 ? "upload_too_large" : "unknown_error"), t = e === "invalid_format" ? "invalid_image" : e;
		throw new L(typeof t == "string" ? t : "unknown_error", "Image request failed. Use a valid JPEG, PNG or WebP up to 5 MiB and 2048 × 2048 pixels.");
	}
	let c = s;
	if (!c || !tt(c.plant) || c.plant.id !== n.plantId) throw new L("invalid_response", "The image response is incompatible. Refresh before retrying.");
	return c.plant;
}
// src/translations/de.ts
var qn = {
	"format.percent": "{value} %",
	"format.recorded_date_time": "{datetime} (UTC{offset})",
	"common.cancel": "Abbrechen",
	"common.not_specified": "Nicht angegeben",
	"common.not_supplied": "Nicht angegeben",
	"common.no_species_selected": "Keine Art ausgewählt",
	"common.continue_manually": "Manuell fortfahren",
	"panel.admin_required": "Smart Plants erfordert ein Administratorkonto.",
	"panel.menu": "Menü",
	"panel.bell_one": "Benachrichtigungen, {count} eingerichtet",
	"panel.bell_other": "Benachrichtigungen, {count} eingerichtet",
	"panel.sidebar": "Seitenleiste anzeigen",
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
	"api_error.storage_full": "Der Speicher von Smart Plants ist voll, deshalb wurde die Änderung nicht gespeichert. Lösche alte Einträge oder Notizen im Pflegeprotokoll und versuche es erneut.",
	"api_error.pending_operations_full": "Smart Plants hat zu viele unvollständige Änderungen, deshalb wurde die Änderung nicht gespeichert. Starte Home Assistant neu, um sie abzuschließen, und versuche es dann erneut.",
	"api_error.storage_failed": "Smart Plants konnte die Änderung nicht speichern. Es wurde nichts geändert. Prüfe das Home-Assistant-Protokoll und versuche es dann erneut.",
	"api_error.upload_too_large": "Das Foto war größer, als ein Proxy vor Home Assistant erlaubt. Wenn du das NGINX-Add-on nutzt, erhöhe dessen Option Max body size (in MB) und versuche es dann erneut.",
	"api_error.disk_full": "Der Datenträger von Home Assistant ist voll oder schreibgeschützt, deshalb wurde das Foto nicht gespeichert. Gib Speicherplatz frei und versuche es dann erneut.",
	"error.disconnected": "Verbindung getrennt. Lokale Änderungen und Wiederholungen beim Erstellen bleiben erhalten. Stelle die Verbindung vor dem Speichern wieder her.",
	"error.registry_updates": "Registrierungsaktualisierungen nicht verfügbar; stelle die Verbindung wieder her, um native Änderungen erneut zu laden.",
	"error.area_reconnect": "Stelle die Verbindung wieder her, um die aktuellen Home-Assistant-Bereiche zu laden, und wähle dann einen Bereich oder „Kein Bereich“.",
	"error.identity": "Gib einen gültigen Namen und ein gültiges ISO-Datum bzw. eine gültige Uhrzeit für die Anschaffung ein.",
	"error.moisture_reconnect": "Stelle die Verbindung wieder her, um aktuelle Registrierungsdaten zu laden, bevor du Feuchtequellen speicherst.",
	"error.sources_reconnect": "Stelle die Verbindung wieder her, um aktuelle Registrierungsdaten zu laden, bevor du Quellen speicherst.",
	"error.remove_main_sensor": "{name} ist der Hauptsensor. Verwende zuerst einen anderen Sensor als Hauptsensor.",
	"notice.deleted_elsewhere": "Diese Pflanze wurde in einer anderen Sitzung gelöscht.",
	"notice.unreadable_one": "{count} Pflanze kann nicht angezeigt werden, weil das Panel ihre Daten nicht lesen kann. Lade die Seite neu; wenn das nicht hilft, prüfe das Home-Assistant-Protokoll.",
	"notice.unreadable_other": "{count} Pflanzen können nicht angezeigt werden, weil das Panel ihre Daten nicht lesen kann. Lade die Seite neu; wenn das nicht hilft, prüfe das Home-Assistant-Protokoll.",
	"notice.unreadable_open": "Das Panel kann die Daten dieser Pflanze nicht mehr lesen. Lade die Seite neu; wenn das nicht hilft, prüfe das Home-Assistant-Protokoll.",
	"notice.area_changed_retained": "Der Home-Assistant-Bereich wurde von {from} zu {to} geändert. Deine Bereichsauswahl bleibt erhalten; prüfe sie vor dem Speichern.",
	"notice.area_changed_synced": "Der Home-Assistant-Bereich wurde von {from} zu {to} geändert. Die Bereichsauswahl zeigt jetzt den nativen Bereich.",
	"notice.related_failed": "Zugehörige Automatisierungen konnten nicht geladen werden.",
	"notice.saved": "Gespeichert.",
	"conflict.heading": "Diese Pflanze wurde an anderer Stelle geändert",
	"conflict.revision": "Speichern ist angehalten, damit nichts überschrieben wird. Deine Änderungen bleiben erhalten.",
	"conflict.roles_changed": "Sensoren oder Warnschwellen wurden geändert.",
	"conflict.winter_changed": "Winterwerte wurden geändert.",
	"conflict.source_overlap": "Du und die andere Änderung habt beide {fields} bearbeitet. Beim Speichern ersetzen deine Werte die jetzt angezeigten.",
	"conflict.retain": "Meine Änderungen behalten",
	"conflict.discard": "Meine Änderungen verwerfen",
	"conflict.reviewed": "Deine Änderungen bleiben erhalten. Prüfe sie und speichere jeden Bereich erneut.",
	"conflict.reviewed_overlap": "Auch an anderer Stelle geändert: {fields}. Beim Speichern werden diese Werte durch deine ersetzt.",
	"conflict.reviewed_species": "Wenn du gerade eine Art auswählst, suche sie erneut.",
	"conflict_field.name": "Name",
	"conflict_field.acquired_at": "Angeschafft",
	"conflict_field.placement": "Standort",
	"conflict_field.watering_detection": "Gießen über den Bodenfeuchtesensor eintragen",
	"conflict_field.category": "Kategorie",
	"conflict_field.tags": "Tags",
	"conflict_field.species": "Art",
	"conflict_field.image": "Foto",
	"conflict_field.lifecycle_state": "Status",
	"conflict_field.roles": "Sensoren",
	"source_field.sources": "Sensoren",
	"source_field.primary_entity_id": "Hauptsensor",
	"source_field.aggregation": "Kombination der Messwerte",
	"source_field.stale_after_seconds": "Zeit bis „Keine Daten“",
	"list.loading": "Pflanzen werden geladen …",
	"list.count_filtered_one": "{shown} von {total} Pflanze",
	"list.count_filtered_other": "{shown} von {total} Pflanzen",
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
	"placement.info_label": "Was der Standort ändert",
	"placement.info": "Der Standort entscheidet auch, ob Smart Plants ein Gießen einträgt, wenn die Bodenfeuchte plötzlich steigt. Drinnen und im Gewächshaus tut es das. An den anderen Standorten und ohne Standort nicht, weil auch Regen die Bodenfeuchte steigen lässt. Du kannst das für jede Pflanze in ihren Einstellungen ändern.",
	"watering_detection.label": "Gießen über den Bodenfeuchtesensor eintragen",
	"watering_detection.follow_on": "Wie der Standort (an)",
	"watering_detection.follow_off": "Wie der Standort (aus)",
	"watering_detection.on": "An",
	"watering_detection.off": "Aus",
	"watering_detection.hint": "Ein Anstieg um 15 Punkte oder mehr innerhalb einer Stunde trägt ein Gießen ein, außer in den 6 Stunden davor wurde schon eines eingetragen.",
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
	"species.error_query_length": "Suche mit höchstens 100 Zeichen.",
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
	"snapshot.imported_ranges": "Importierte Problembereiche",
	"snapshot.temperature_range": "Temperatur {min}–{max} °C",
	"snapshot.humidity_range": "Luftfeuchte {min}–{max} %",
	"snapshot.temperature_range_not_applied": "Der Temperaturbereich wird nicht verwendet: Er passt nicht zu den eigenen Temperaturwerten dieser Pflanze oder ist zu schmal. Temperaturstress behält die eingebauten Werte.",
	"snapshot.humidity_range_not_applied": "Der Bereich der Luftfeuchte wird nicht verwendet: Er passt nicht zu den eigenen Luftfeuchtewerten dieser Pflanze oder ist zu schmal. Luftfeuchtestress behält die eingebauten Werte.",
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
	"photo.hint": "JPEG, PNG, WebP oder HEIC. Große Fotos werden auf 2048 × 2048 Pixel verkleinert. Wird nur in Home Assistant gespeichert.",
	"photo.remove": "Foto entfernen",
	"image_error.type_or_size": "Wähle ein nicht leeres JPEG-, PNG- oder WebP-Bild mit höchstens 5 MiB.",
	"image_error.unreadable": "Dieses Bild konnte nicht gelesen werden. Wähle die Datei erneut aus.",
	"image_error.signature": "Der Bildinhalt passt nicht zum Dateityp JPEG, PNG oder WebP. Wähle ein anderes Bild.",
	"image_error.decode": "Diese Datei konnte nicht als Bild dekodiert werden. Wähle ein anderes JPEG-, PNG- oder WebP-Bild.",
	"image_error.heic_decode": "Dieser Browser kann keine HEIC-Fotos lesen. Wandle das Foto zuerst in JPEG um.",
	"image_error.dimensions": "Das Bild darf höchstens 2048 × 2048 Pixel groß sein.",
	"image_error.type_or_input_size": "Wähle ein nicht leeres JPEG-, PNG-, WebP- oder HEIC-Bild mit höchstens 40 MiB.",
	"image_error.too_many_pixels": "Das Bild hat mehr als 64 Megapixel. Wähle ein kleineres Bild.",
	"image_error.resize": "Das Bild konnte für den Upload nicht verkleinert werden. Wähle ein kleineres JPEG-, PNG- oder WebP-Bild.",
	"image_error.too_large_to_upload": "Dieses Foto konnte nicht klein genug für den Upload gemacht werden (unter 1 MB). Wähle ein Foto mit weniger Megapixeln oder weniger feinen Details.",
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
	"care.from_sensor": "vom Bodenfeuchtesensor eingetragen",
	"care.watering_count_one": "{count} Gießvorgang.",
	"care.watering_count_other": "{count} Gießvorgänge.",
	"care.last_watered": "Zuletzt gegossen: {date}.",
	"care.never_watered": "Zuletzt gegossen: noch nie.",
	"care.events_label": "Pflegeeinträge der Pflanze",
	"care.empty": "Noch keine Pflege erfasst.",
	"care.loading": "Pflegeverlauf wird geladen…",
	"care.load_failed": "Der Pflegeverlauf konnte nicht geladen werden: {error}",
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
	"care.no_irrigation": "Pflegeeinträge steuern nie eine Bewässerung. Nach einem eingetragenen Gießen bleiben „Braucht Wasser“ und „Zu nass“ 24 Stunden aus.",
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
	"care_kind.pest_control": "Schädlingsbekämpfung",
	"care_kind.note": "Notiz",
	"care_kind.task": "Pflegeaufgabe",
	"care_kind_phrase.watering": "Gießen",
	"care_kind_phrase.fertilizing": "Düngen",
	"care_kind_phrase.pruning": "Rückschnitt",
	"care_kind_phrase.repotting": "Umtopfen",
	"care_kind_phrase.pest_control": "Schädlingsbekämpfung",
	"care_kind_phrase.note": "Notiz",
	"care_kind_phrase.task": "Pflegeaufgabe",
	"care_field.product": "Produkt",
	"care_field.pest": "Schädling",
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
	"section.advanced_diagnostics_description": "Aktueller Zustand jeder Prüfung mit den verwendeten Schwellenwerten. Die Schwellenwerte änderst du unter Einstellungen, Weitere Zielwerte.",
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
	"threshold.species_default_effective": "Standard der Art {default} {unit} · wirksam {effective} {unit}",
	"threshold.inherit": "Übernehmen",
	"threshold.inherit_all": "Alle eingebauten Standardwerte übernehmen",
	"threshold.inherit_all_species": "Alle Standardwerte der Art und eingebauten Standardwerte übernehmen",
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
	"wizard.photo_hint": "Bild hierher ziehen oder Datei auswählen · JPEG, PNG, WebP oder HEIC, große Fotos werden verkleinert",
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
	"wizard.details_summary": "Optional · Anschaffungsdatum, Kategorie, Tags",
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
	"wizard.done_notifications": "Lass dir eine Nachricht schicken, wenn sie Wasser braucht, oder einen täglichen Bericht zu allen Pflanzen.",
	"wizard.done_notifications_action": "Benachrichtigung einrichten",
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
	"overview.tile_count_all_one": "Pflanze",
	"overview.tile_count_all_other": "Pflanzen",
	"overview.tile_count_water_one": "Braucht Wasser",
	"overview.tile_count_water_other": "Brauchen Wasser",
	"overview.tile_count_problems_one": "Problem",
	"overview.tile_count_problems_other": "Probleme",
	"overview.tile_count_sensors_one": "Sensorproblem",
	"overview.tile_count_sensors_other": "Sensorprobleme",
	"overview.tile_count_care_one": "Pflege fällig",
	"overview.tile_count_care_other": "Pflege fällig",
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
	"overview.menu_notifications": "Benachrichtigungen",
	"overview.documentation": "Dokumentation",
	"card.no_sensors": "Noch keine Sensoren zugewiesen",
	"card.assign": "Zuweisen",
	"card.assign_label": "Sensoren für {name} zuweisen",
	"card.watered": "Zuletzt gegossen: {age}",
	"card.watered_just_now": "Gerade gegossen",
	"card.never_watered": "Noch nicht gegossen",
	"card.watered_short_just_now": "Gerade eben",
	"card.log_watering": "Gegossen",
	"overview.log_watering_label": "Gegossen: {name}",
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
	"detail.plant_menu": "Weitere Aktionen für {name}",
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
	"readings.unavailable": "Messwerte sind nicht verfügbar, solange der Pflanzenstatus nicht geladen werden kann.",
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
	"history.legend_pruning": "Rückschnitt eingetragen",
	"history.legend_repotting": "Umtopfen eingetragen",
	"history.legend_pest_control": "Schädlingsbekämpfung eingetragen",
	"history.legend_note": "Notiz",
	"history.legend_task": "Pflegeaufgabe erledigt",
	"history.point_label": "Zeitpunkt",
	"history.point": "{time}: {value}",
	"history.point_spread": "{time}: {value} ({min}–{max})",
	"history.log_watering_at": "Gießen zu diesem Zeitpunkt eintragen",
	"history.log_care_at": "Pflege zu diesem Zeitpunkt eintragen",
	"history.log_other_care_at": "Andere Pflege eintragen",
	"history.rate": "Sinkt um etwa {rate} pro Tag.",
	"history.rate_since_watering": "Sinkt seit dem letzten Gießen um etwa {rate} pro Tag.",
	"history.forecast_one": "Bei diesem Tempo ist das Minimum von {limit} in etwa {count} Tag erreicht.",
	"history.forecast_other": "Bei diesem Tempo ist das Minimum von {limit} in etwa {count} Tagen erreicht.",
	"history.forecast_soon": "Bei diesem Tempo ist das Minimum von {limit} in weniger als einem Tag erreicht.",
	"care_done.watering": "Gegossen",
	"care_done.fertilizing": "Gedüngt",
	"care_done.pruning": "Geschnitten",
	"care_done.repotting": "Umgetopft",
	"care_done.pest_control": "Schädlinge behandelt",
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
	"automations.body": "Wähle im Automatisierungseditor Smart-Plants-Auslöser wie „Pflanze braucht Wasser“ oder richte eine Benachrichtigung für diese Pflanze ein.",
	"automations.notifications": "Benachrichtigung einrichten",
	"automations.open_device": "Gerät öffnen",
	"automations.create": "Automatisierung erstellen",
	"automations.last_ran": "Zuletzt ausgeführt {time}",
	"automations.never_ran": "Noch nie ausgeführt",
	"automations.yaml": "In YAML definiert",
	"automations.off": "Aus",
	"automations.unavailable": "Nicht verfügbar",
	"automations.show_all": "Alle anzeigen ({count})",
	"automations.all_plants": "Für alle Pflanzen",
	"automations.notification": "Benachrichtigung",
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
	"duration.days": "{count} Tg.",
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
	"other_targets.intro": "Jede Prüfung hat eigene Schwellenwerte. Ändere sie nur für diese Pflanze; leere Felder verwenden die eingebauten Standardwerte.",
	"winter.other_targets_active": "Gerade gelten Winterwerte. Prüfungen mit Winterwerten zeigen hier diese Werte; „Schwellenwerte bearbeiten“ ändert die normalen Werte.",
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
	"api_error.busy": "Smart Plants schließt gerade noch eine Änderung an dieser Pflanze ab. Versuche es gleich noch einmal.",
	"api_error.conflict": "Inzwischen hat sich etwas geändert. Prüfe die Angaben und versuche es noch einmal.",
	"api_error.limit": "Für eine weitere Pflanze ist kein Platz. Smart Plants behält nur eine begrenzte Zahl an Pflanzen und archivierten Pflanzen. Lösche eine, die du nicht mehr brauchst, und versuche es dann noch einmal.",
	"manage.retire": "Pflanze archivieren",
	"manage.retire_hint": "Entfernt Gerät und Entitäten, gibt die Sensoren frei, behält Foto und Pflegeverlauf",
	"manage.retire_button": "Archivieren",
	"manage.retire_menu": "Pflanze archivieren…",
	"dialog.delete_retire_hint": "Wenn du Foto und Pflegeverlauf behalten willst, archiviere die Pflanze stattdessen.",
	"dialog.delete_retire_instead": "Stattdessen archivieren",
	"dialog.retire_title": "{name} archivieren?",
	"dialog.retire_body": "Gerät und Entitäten werden entfernt, und die Sensoren sind frei für eine andere Pflanze. Foto und Pflegeverlauf bleiben im Archiv. Dort kannst du die Pflanze wiederherstellen oder endgültig löschen.",
	"dialog.retire_automations_one": "{count} Automatisierung nutzt Entitäten dieser Pflanze und funktioniert dann nicht mehr.",
	"dialog.retire_automations_other": "{count} Automatisierungen nutzen Entitäten dieser Pflanze und funktionieren dann nicht mehr.",
	"dialog.retire_confirm": "Archivieren",
	"archive.menu": "Archiv",
	"archive.title": "Archiv",
	"archive.intro": "Pflanzen, die du archiviert hast, mit Foto und Pflegeverlauf. Sie haben kein Gerät und keine Entitäten mehr.",
	"archive.loading": "Archiv wird geladen…",
	"archive.empty": "Das Archiv ist leer.",
	"archive.date_range": "{start} – {end}",
	"archive.fact_acquired": "Erworben",
	"archive.fact_added": "Hinzugefügt",
	"archive.fact_retired": "Archiviert",
	"archive.fact_monitored": "Überwacht",
	"archive.years_one": "{count} Jahr",
	"archive.years_other": "{count} Jahre",
	"archive.months_one": "{count} Monat",
	"archive.months_other": "{count} Monate",
	"archive.duration_both": "{years}, {months}",
	"archive.days_one": "{count} Tag",
	"archive.days_other": "{count} Tage",
	"archive.less_than_day": "Weniger als ein Tag",
	"archive.care_count": "{kind}: {count}",
	"archive.care_heading": "Pflegeverlauf",
	"archive.restore": "Wiederherstellen",
	"archive.delete": "Endgültig löschen",
	"archive.retired_toast": "{name} archiviert",
	"archive.retired_new_plant": "Neue Pflanze mit diesen Sensoren",
	"archive.retired_open": "Öffnen",
	"archive.restored_toast": "{name} wiederhergestellt",
	"archive.deleted_toast": "{name} endgültig gelöscht",
	"archive.restore_title": "{name} wiederherstellen?",
	"archive.restore_body": "Die Pflanze kommt mit Foto, Pflegeverlauf, Art und Sensoren zurück. Die Schwellenwerte richten sich wieder nach der Art. Eigene Schwellenwerte und Pflegeaufgaben wurden nicht behalten.",
	"archive.restore_name": "Name",
	"archive.restore_name_taken": "Es gibt schon eine Pflanze namens {name}.",
	"archive.restore_name_required": "Gib einen Namen ein.",
	"archive.restore_name_length": "Gib einen Namen mit höchstens 200 Zeichen ein.",
	"archive.restore_in_use": "Diese Sensoren nutzen jetzt andere Pflanzen:",
	"archive.restore_share": "Auch für diese Pflanze verwenden",
	"archive.restore_missing": "Diese Sensoren gibt es nicht mehr, sie werden weggelassen:",
	"archive.restore_area_missing": "Den Bereich {area} gibt es nicht mehr. Die Pflanze bekommt keinen Bereich.",
	"archive.restore_without": "Ohne sie wiederherstellen",
	"archive.restore_confirm": "Wiederherstellen",
	"archive.restore_changed": "Inzwischen hat eine andere Pflanze diesen Namen oder einen Sensor übernommen. Prüfe die Angaben und stelle die Pflanze dann wieder her.",
	"archive.restore_blocked_limit": "Smart Plants verwaltet schon so viele Pflanzen, wie es kann. Lösche zuerst eine Pflanze.",
	"archive.restore_blocked_busy": "Das alte Gerät wird noch entfernt. Versuche es gleich noch einmal.",
	"archive.delete_title": "{name} endgültig löschen?",
	"archive.delete_body": "Foto und Pflegeverlauf werden entfernt. Das lässt sich nicht rückgängig machen.",
	"archive.delete_confirm": "Endgültig löschen",
	"plant_card.retired_body": "{name} wurde archiviert. Foto und Pflegeverlauf findest du in Smart Plants im Archiv.",
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
	"care_plan.error_overlap": "Diese Aufgabe wurde während deiner Bearbeitung an anderer Stelle geändert: {fields}. Für diese Felder zeigt das Formular weiterhin deine Werte, die anderen Felder zeigen die andere Änderung. Speichere erneut, um deine Werte zu übernehmen, oder brich ab, um die andere Änderung zu behalten.",
	"care_plan.overlap_name": "Name",
	"care_plan.overlap_schedule": "Fälligkeit",
	"care_plan.overlap_instructions": "Anleitung",
	"care_plan.overlap_baseline_done_on": "zuletzt erledigt",
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
	"care_plan.confirm_delete": "Pflegeaufgabe {name} löschen? Ihre Entitäten werden entfernt, und Automatisierungen, die sie verwenden, funktionieren nicht mehr. Ihre Einträge im Pflegeverlauf bleiben erhalten.",
	"care_plan.added_toast": "{name} zum Pflegeplan hinzugefügt",
	"care_plan.saved_toast": "{name} gespeichert",
	"care_plan.done_toast": "{name} als erledigt markiert",
	"care_plan.skipped_toast": "{name} diesmal übersprungen",
	"care_plan.deleted_toast": "{name} gelöscht",
	"care_plan.undo": "Rückgängig",
	"care_plan.form_marks_done": "Markiert {name} als erledigt.",
	"care_plan.form_also_marks": "Markiert auch {name} als erledigt.",
	"care_plan.automate_title": "„{name}“ automatisieren",
	"care_plan.automate_intro": "Verwende diese Entitäten in jeder Automatisierung, zum Beispiel für eine Benachrichtigung auf deinem Handy.",
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
	"care_plan.look_ahead_hint": "Der Tiefst- oder Höchstwert der Vorhersage gilt für diese Zeit ab jetzt. Kürzere Zeiträume sind verlässlicher. Die Vorhersage wird im „Aktualisierungsintervall der Wettervorhersage“ aus den Integrationsoptionen erneut abgerufen (standardmäßig 30 Minuten) und wenn sich die Wetter-Entität ändert.",
	"care_plan.more_options_forecast": "Vorausschau, wieder fällig",
	"overview.tile_care": "Pflege fällig",
	"card.care_due": "Pflege: {tasks}",
	"card.care_overdue": "überfällig",
	"snooze.menu": "Hinweise stummschalten…",
	"snooze.menu_change": "Stummschaltung ändern…",
	"snooze.title": "Hinweise für {name} stummschalten",
	"snooze.title_change": "Stummschaltung für {name} ändern",
	"snooze.intro": "Die Entitäten behalten ihren echten Zustand, und die Pflanze zeigt weiter ihren Status. Automatisierungen können das Attribut Stummgeschaltet prüfen, um still zu bleiben. Die Stummschaltung endet von selbst am Ende des gewählten Tages.",
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
	"snooze.all_undone_kept_one": "Vorherige Stummschaltungen wiederhergestellt. {count} Pflanze wurde inzwischen geändert und behält ihre Stummschaltung.",
	"snooze.all_undone_kept_other": "Vorherige Stummschaltungen wiederhergestellt. {count} Pflanzen wurden inzwischen geändert und behalten ihre Stummschaltung.",
	"snooze.all_undo_none": "Nichts wiederhergestellt: Jede Pflanze wurde inzwischen geändert und behält ihre Stummschaltung.",
	"snooze.undo": "Rückgängig",
	"notifications.title": "Benachrichtigungen",
	"notifications.add": "Benachrichtigung hinzufügen",
	"notifications.add_title": "Neue Benachrichtigung",
	"notifications.loading": "Benachrichtigungen werden geladen…",
	"notifications.toggle_on_failed": "{name} konnte nicht eingeschaltet werden: {error}",
	"notifications.toggle_off_failed": "{name} konnte nicht ausgeschaltet werden: {error}",
	"notifications.intro": "Lass dir Nachrichten zu deinen Pflanzen schicken. Du prüfst und speicherst sie im Automatisierungseditor von Home Assistant.",
	"notifications.existing": "Deine Benachrichtigungen",
	"notifications.last_sent": "Zuletzt gesendet {time}",
	"notifications.never_sent": "Noch nicht gesendet",
	"notifications.edit": "Bearbeiten",
	"notifications.edit_label": "{name} bearbeiten",
	"notifications.covers": "Für {plants}",
	"notifications.covers_all": "Für alle Pflanzen",
	"notifications.covers_none": "Die gewählten Pflanzen wurden entfernt",
	"notifications.empty_heading": "Noch keine Benachrichtigungen",
	"notifications.empty_body": "Smart Plants kann dir einen täglichen Bericht schicken oder eine Nachricht, sobald eine Pflanze Wasser braucht. Wähle unten eine aus und speichere sie im Automatisierungseditor.",
	"notifications.empty_action": "Jetzt einrichten",
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
	"plant_card.editor_show_watering_help": "Trägt Gießen für diese Pflanze ein",
	"winter.add": "Winterwerte hinzufügen",
	"winter.add_hint": "Andere Schwellenwerte für die kalten Monate, zum Beispiel in einer kühlen Garage.",
	"winter.title": "Winterwerte",
	"winter.active_now": "Gerade aktiv",
	"winter.when_both": "Gelten in der Ruhezeit ({months}) oder solange der Standort Winterquartier ist.",
	"winter.when_rest": "Gelten in der Ruhezeit ({months}).",
	"winter.when_storage": "Gelten, solange der Standort Winterquartier ist.",
	"winter.next": "Nächstes Mal ab {date} (Ruhezeit).",
	"winter.never": "Winterwerte gelten noch nicht. Lege eine Ruhezeit fest oder stelle den Standort auf Winterquartier.",
	"winter.change_placement": "Standort ändern",
	"winter.same_summary": "{check}: wie sonst",
	"winter.change": "{check} {winter} statt {normal}",
	"winter.no_alert": "keine Warnung",
	"winter.no_alert_short": "Keine Warnung",
	"winter.edit": "Winterwerte bearbeiten",
	"winter.remove": "Entfernen",
	"winter.remove_title": "Winterwerte entfernen?",
	"winter.remove_body": "{name} nutzt dann das ganze Jahr wieder die normalen Werte.",
	"winter.removed": "Winterwerte entfernt",
	"winter.restored": "Winterwerte wiederhergestellt",
	"winter.undo_failed": "Die Winterwerte konnten nicht zurückgeholt werden. Füge sie unter Einstellungen erneut hinzu.",
	"winter.undo": "Rückgängig",
	"winter.saved": "Winterwerte gespeichert.",
	"winter.editor_title": "Winterwerte für {name}",
	"winter.editor_intro": "Diese Werte ersetzen im Winter die normalen. Felder, die du nicht änderst, bleiben wie sonst.",
	"winter.editor_when": "Wann: {when}",
	"winter.field_cold": "Zu kalt unter",
	"winter.field_hot": "Zu warm über",
	"winter.field_light": "Mindestens",
	"winter.field_low": "Zu niedrig unter",
	"winter.field_high": "Zu hoch über",
	"winter.field_dry": "Zu trocken unter",
	"winter.field_damp": "Zu feucht über",
	"winter.same": "Wie sonst",
	"winter.normally": "Sonst {value}",
	"winter.light_off_hint": "0 = keine Licht-Warnung",
	"winter.suggest_temperature": "Vorschlag: {value}, so viel Kälte verträgt {species} gerade noch (OpenPlantBook).",
	"winter.suggest_moisture": "Vorschlag: {min} und {target}. Ruhende Pflanzen brauchen weniger Wasser.",
	"winter.suggest_light": "Vorschlag: 0 lx, keine Licht-Warnung, solange sie dunkel steht.",
	"winter.suggest_conductivity": "Vorschlag: {value}. Ohne Dünger im Winter sinkt der Düngerstand.",
	"winter.use": "Übernehmen",
	"winter.warn_survival": "Kälter, als {species} verträgt ({value}).",
	"winter.error_temperature": "„Zu kalt unter“ muss deutlich unter „Zu warm über“ liegen, zwischen −40 und 80 °C.",
	"winter.error_soil_temperature": "„Zu kalt unter“ muss deutlich unter „Zu warm über“ liegen, zwischen −20 und 60 °C.",
	"winter.error_moisture": "Nutze ganze Zahlen von 1 bis 99, die von „Braucht Wasser unter“ über „Ideal“ bis „Zu nass über“ ansteigen, vom ersten bis zum letzten Wert mindestens 4 % auseinander.",
	"winter.error_light": "Gib einen Wert von 0 bis {max} lx ein.",
	"winter.error_conductivity": "„Zu niedrig unter“ muss deutlich unter „Zu hoch über“ liegen, zwischen 0 und 10.000 µS/cm.",
	"winter.error_humidity": "„Zu trocken unter“ muss deutlich unter „Zu feucht über“ liegen, zwischen 0 und 100 %.",
	"winter.error_empty": "Gib einen Wert ein.",
	"winter.changed_elsewhere": "Die Winterwerte wurden an anderer Stelle geändert. Felder, die du nicht geändert hast, zeigen jetzt die neuen Werte. Prüfe sie und speichere erneut.",
	"winter.conflict": "Diese Pflanze wurde an anderer Stelle geändert. Schließe den Dialog und prüfe die Änderungen, bevor du speicherst.",
	"winter.save": "Winterwerte speichern",
	"winter.chip_until": "Winterwerte bis Ende {month}",
	"winter.chip_storage": "Winterwerte · Winterquartier",
	"winter.reason_rest": "Winterwerte gelten in der Ruhezeit ({months}). Das ändert sich:",
	"winter.reason_storage": "Winterwerte gelten, solange der Standort Winterquartier ist. Sie enden, wenn du den Standort änderst. Das ändert sich:",
	"winter.reason_storage_rest": "Winterwerte gelten, solange der Standort Winterquartier ist, und in der Ruhezeit ({months}). Das ändert sich:",
	"winter.paused": "Sie gelten nicht, solange die Pflanze pausiert ist.",
	"winter.range_tooltip": "Winterwert. Sonst {normal}.",
	"winter.icon_label": "Winterwerte aktiv",
	"winter.hint_storage": "Im Winterquartier?"
}, Jn = {
	"format.percent": "{value}%",
	"format.recorded_date_time": "{datetime} (UTC{offset})",
	"common.cancel": "Cancel",
	"common.not_specified": "Not specified",
	"common.not_supplied": "Not supplied",
	"common.no_species_selected": "No species selected",
	"common.continue_manually": "Continue manually",
	"panel.admin_required": "Smart Plants requires an admin account.",
	"panel.menu": "Menu",
	"panel.bell_one": "Notifications, {count} set up",
	"panel.bell_other": "Notifications, {count} set up",
	"panel.sidebar": "Show sidebar",
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
	"api_error.storage_full": "Smart Plants storage is full, so the change wasn't saved. Delete old care log entries or notes, then try again.",
	"api_error.pending_operations_full": "Smart Plants has too many unfinished changes, so the change wasn't saved. Restart Home Assistant to complete them, then try again.",
	"api_error.storage_failed": "Smart Plants couldn't save the change. Nothing was changed. Check the Home Assistant log, then try again.",
	"api_error.upload_too_large": "The photo was larger than a proxy in front of Home Assistant allows. If you use the NGINX add-on, raise its Max body size (in MB) option, then try again.",
	"api_error.disk_full": "Home Assistant's disk is full or read-only, so the photo wasn't saved. Free up space on the disk, then try again.",
	"error.disconnected": "Disconnected. Local edits and creation retries are retained. Reconnect before saving.",
	"error.registry_updates": "Registry updates unavailable; reconnect to retry native changes.",
	"error.area_reconnect": "Reconnect to load current Home Assistant areas, then choose an area or No area.",
	"error.identity": "Enter a valid name and acquired ISO date/time.",
	"error.moisture_reconnect": "Reconnect to load current registry data before saving moisture sources.",
	"error.sources_reconnect": "Reconnect to load current registry data before saving sources.",
	"error.remove_main_sensor": "{name} is the main sensor. Use another sensor as main sensor first.",
	"notice.deleted_elsewhere": "This plant was deleted in another session.",
	"notice.unreadable_one": "{count} plant can't be shown because the panel can't read its data. Reload the page; if that doesn't help, check the Home Assistant log.",
	"notice.unreadable_other": "{count} plants can't be shown because the panel can't read their data. Reload the page; if that doesn't help, check the Home Assistant log.",
	"notice.unreadable_open": "The panel can't read this plant's data any more. Reload the page; if that doesn't help, check the Home Assistant log.",
	"notice.area_changed_retained": "Home Assistant area changed from {from} to {to}. Your area selection is retained; review it before saving.",
	"notice.area_changed_synced": "Home Assistant area changed from {from} to {to}. The area selector now reflects the native area.",
	"notice.related_failed": "Related automations could not be loaded.",
	"notice.saved": "Saved.",
	"conflict.heading": "This plant was changed somewhere else",
	"conflict.revision": "Saving is paused so nothing gets overwritten. Your edits are kept.",
	"conflict.roles_changed": "Sensors or alert thresholds changed.",
	"conflict.winter_changed": "Winter values changed.",
	"conflict.source_overlap": "You and the other change both edited {fields}. If you save, your values replace the ones shown now.",
	"conflict.retain": "Keep my edits",
	"conflict.discard": "Discard my edits",
	"conflict.reviewed": "Your edits are kept. Check them, then save each section again.",
	"conflict.reviewed_overlap": "These also changed elsewhere: {fields}. Saving replaces them with your values.",
	"conflict.reviewed_species": "If you were choosing a species, search for it again.",
	"conflict_field.name": "Name",
	"conflict_field.acquired_at": "Acquired",
	"conflict_field.placement": "Placement",
	"conflict_field.watering_detection": "Log waterings from the soil moisture sensor",
	"conflict_field.category": "Category",
	"conflict_field.tags": "Tags",
	"conflict_field.species": "Species",
	"conflict_field.image": "Photo",
	"conflict_field.lifecycle_state": "Status",
	"conflict_field.roles": "Sensors",
	"source_field.sources": "sensors",
	"source_field.primary_entity_id": "main sensor",
	"source_field.aggregation": "how readings are combined",
	"source_field.stale_after_seconds": "not-updating time",
	"list.loading": "Loading plants…",
	"list.count_filtered_one": "{shown} of {total} plant",
	"list.count_filtered_other": "{shown} of {total} plants",
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
	"placement.info_label": "What placement changes",
	"placement.info": "Placement also decides whether Smart Plants logs a watering when the soil moisture suddenly rises. Indoors and in a greenhouse it does. In the other placements, and without one, it doesn't, because rain can raise the soil moisture too. You can change this for each plant in its settings.",
	"watering_detection.label": "Log waterings from the soil moisture sensor",
	"watering_detection.follow_on": "Follow placement (on)",
	"watering_detection.follow_off": "Follow placement (off)",
	"watering_detection.on": "On",
	"watering_detection.off": "Off",
	"watering_detection.hint": "A rise of 15 points or more within an hour logs a watering, unless one was logged in the 6 hours before.",
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
	"species.error_query_length": "Search with up to 100 characters.",
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
	"snapshot.imported_ranges": "Imported problem ranges",
	"snapshot.temperature_range": "Temperature {min}–{max} °C",
	"snapshot.humidity_range": "Air humidity {min}–{max} %",
	"snapshot.temperature_range_not_applied": "The temperature range isn't used: it doesn't fit this plant's own temperature values, or it's too narrow. Temperature stress keeps the built-in values.",
	"snapshot.humidity_range_not_applied": "The air humidity range isn't used: it doesn't fit this plant's own humidity values, or it's too narrow. Humidity stress keeps the built-in values.",
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
	"photo.hint": "JPEG, PNG, WebP or HEIC. Large photos are scaled down to 2048 × 2048 pixels. Stored only in Home Assistant.",
	"photo.remove": "Remove photo",
	"image_error.type_or_size": "Choose a nonempty JPEG, PNG or WebP image up to 5 MiB.",
	"image_error.unreadable": "This image could not be read. Select the file again.",
	"image_error.signature": "Image content does not match its JPEG, PNG or WebP file type. Choose another image.",
	"image_error.decode": "This file could not be decoded as an image. Choose another JPEG, PNG or WebP.",
	"image_error.heic_decode": "This browser can't read HEIC photos. Convert the photo to JPEG first.",
	"image_error.dimensions": "Image dimensions must be at most 2048 × 2048 pixels.",
	"image_error.type_or_input_size": "Choose a nonempty JPEG, PNG, WebP or HEIC image up to 40 MiB.",
	"image_error.too_many_pixels": "This image has more than 64 megapixels. Choose a smaller image.",
	"image_error.resize": "This image could not be scaled down for upload. Choose a smaller JPEG, PNG or WebP.",
	"image_error.too_large_to_upload": "This photo couldn't be made small enough to upload (under 1 MB). Choose a photo with fewer megapixels or less fine detail.",
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
	"care.from_sensor": "logged from the soil moisture sensor",
	"care.watering_count_one": "{count} watering event.",
	"care.watering_count_other": "{count} watering events.",
	"care.last_watered": "Last watered: {date}.",
	"care.never_watered": "Last watered: never.",
	"care.events_label": "Plant care events",
	"care.empty": "No care recorded yet.",
	"care.loading": "Loading care history…",
	"care.load_failed": "Care history couldn't be loaded: {error}",
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
	"care.no_irrigation": "Care records never operate irrigation. After a logged watering, Needs water and Too wet stay off for 24 hours.",
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
	"care_kind.pest_control": "Pest control",
	"care_kind.note": "Note",
	"care_kind.task": "Care task",
	"care_kind_phrase.watering": "watering",
	"care_kind_phrase.fertilizing": "fertilizing",
	"care_kind_phrase.pruning": "pruning",
	"care_kind_phrase.repotting": "repotting",
	"care_kind_phrase.pest_control": "pest control",
	"care_kind_phrase.note": "note",
	"care_kind_phrase.task": "care task",
	"care_field.product": "Product",
	"care_field.pest": "Pest",
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
	"threshold.species_default_effective": "Species default {default} {unit} · effective {effective} {unit}",
	"threshold.inherit": "Inherit",
	"threshold.inherit_all": "Inherit all built-in defaults",
	"threshold.inherit_all_species": "Inherit all species and built-in defaults",
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
	"wizard.photo_hint": "Drop an image or choose a file · JPEG, PNG, WebP or HEIC, large photos are scaled down",
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
	"wizard.details_summary": "Optional · date acquired, category, tags",
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
	"wizard.done_notifications": "Get a message when it needs water, or a daily report for all your plants.",
	"wizard.done_notifications_action": "Set up notifications",
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
	"overview.tile_count_all_one": "Plant",
	"overview.tile_count_all_other": "Plants",
	"overview.tile_count_water_one": "Needs water",
	"overview.tile_count_water_other": "Need water",
	"overview.tile_count_problems_one": "Problem",
	"overview.tile_count_problems_other": "Problems",
	"overview.tile_count_sensors_one": "Sensor issue",
	"overview.tile_count_sensors_other": "Sensor issues",
	"overview.tile_count_care_one": "Care due",
	"overview.tile_count_care_other": "Care due",
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
	"overview.menu_notifications": "Notifications",
	"overview.documentation": "Documentation",
	"card.no_sensors": "No sensors assigned yet",
	"card.assign": "Assign",
	"card.assign_label": "Assign sensors to {name}",
	"card.watered": "Watered {age}",
	"card.watered_just_now": "Watered just now",
	"card.never_watered": "Not watered yet",
	"card.watered_short_just_now": "Just now",
	"card.log_watering": "Watered",
	"overview.log_watering_label": "Watered: {name}",
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
	"detail.plant_menu": "More actions for {name}",
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
	"readings.unavailable": "Readings are unavailable while the plant status can't be loaded.",
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
	"history.legend_pruning": "Pruning logged",
	"history.legend_repotting": "Repotting logged",
	"history.legend_pest_control": "Pest control logged",
	"history.legend_note": "Note",
	"history.legend_task": "Care task done",
	"history.point_label": "Point in time",
	"history.point": "{time}: {value}",
	"history.point_spread": "{time}: {value} ({min}–{max})",
	"history.log_watering_at": "Log watering at this time",
	"history.log_care_at": "Log care at this time",
	"history.log_other_care_at": "Log other care",
	"history.rate": "Dropping about {rate} per day.",
	"history.rate_since_watering": "Dropping about {rate} per day since the last watering.",
	"history.forecast_one": "At this rate it reaches the minimum of {limit} in about {count} day.",
	"history.forecast_other": "At this rate it reaches the minimum of {limit} in about {count} days.",
	"history.forecast_soon": "At this rate it reaches the minimum of {limit} in less than a day.",
	"care_done.watering": "Watered",
	"care_done.fertilizing": "Fertilized",
	"care_done.pruning": "Pruned",
	"care_done.repotting": "Repotted",
	"care_done.pest_control": "Treated for pests",
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
	"automations.body": "Pick Smart Plants triggers such as “Plant needs water” in the automation editor, or set up a notification for this plant.",
	"automations.notifications": "Set up notifications",
	"automations.open_device": "Open device",
	"automations.create": "Create automation",
	"automations.last_ran": "Last ran {time}",
	"automations.never_ran": "Never ran",
	"automations.yaml": "Defined in YAML",
	"automations.off": "Off",
	"automations.unavailable": "Unavailable",
	"automations.show_all": "Show all ({count})",
	"automations.all_plants": "For all plants",
	"automations.notification": "Notification",
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
	"duration.days": "{count} d",
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
	"winter.other_targets_active": "Winter values apply now. The checks with winter values list them here; Edit thresholds changes the normal values.",
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
	"api_error.busy": "Smart Plants is still finishing a change to this plant. Try again in a moment.",
	"api_error.conflict": "Something changed in the meantime. Check the details and try again.",
	"api_error.limit": "There's no room for another plant. Smart Plants keeps a limited number of plants and retired plants. Delete one you no longer need, then try again.",
	"manage.retire": "Retire plant",
	"manage.retire_hint": "Removes the device and entities, frees the sensors, keeps the photo and care history",
	"manage.retire_button": "Retire",
	"manage.retire_menu": "Retire plant…",
	"dialog.delete_retire_hint": "To keep the photo and care history, retire the plant instead.",
	"dialog.delete_retire_instead": "Retire instead",
	"dialog.retire_title": "Retire {name}?",
	"dialog.retire_body": "Its device and entities are removed, and its sensors become free for another plant. The photo and care history are kept under Retired plants. You can restore it or delete it for good there.",
	"dialog.retire_automations_one": "{count} automation uses this plant's entities and will stop working.",
	"dialog.retire_automations_other": "{count} automations use this plant's entities and will stop working.",
	"dialog.retire_confirm": "Retire",
	"archive.menu": "Retired plants",
	"archive.title": "Retired plants",
	"archive.intro": "Plants you retired, with their photo and care history. They have no device or entities.",
	"archive.loading": "Loading retired plants…",
	"archive.empty": "There are no retired plants.",
	"archive.date_range": "{start} – {end}",
	"archive.fact_acquired": "Acquired",
	"archive.fact_added": "Added",
	"archive.fact_retired": "Retired",
	"archive.fact_monitored": "Monitored for",
	"archive.years_one": "{count} year",
	"archive.years_other": "{count} years",
	"archive.months_one": "{count} month",
	"archive.months_other": "{count} months",
	"archive.duration_both": "{years}, {months}",
	"archive.days_one": "{count} day",
	"archive.days_other": "{count} days",
	"archive.less_than_day": "Less than a day",
	"archive.care_count": "{kind}: {count}",
	"archive.care_heading": "Care history",
	"archive.restore": "Restore",
	"archive.delete": "Delete for good",
	"archive.retired_toast": "{name} retired",
	"archive.retired_new_plant": "Add plant with its sensors",
	"archive.retired_open": "Open",
	"archive.restored_toast": "{name} restored",
	"archive.deleted_toast": "{name} deleted for good",
	"archive.restore_title": "Restore {name}?",
	"archive.restore_body": "It comes back with its photo, care history, species and sensors. Thresholds follow the species again. Custom thresholds and care tasks were not kept.",
	"archive.restore_name": "Name",
	"archive.restore_name_taken": "A plant named {name} already exists.",
	"archive.restore_name_required": "Enter a name.",
	"archive.restore_name_length": "Enter a name of up to 200 characters.",
	"archive.restore_in_use": "These sensors are used by other plants now:",
	"archive.restore_share": "Use them for this plant too",
	"archive.restore_missing": "These sensors no longer exist and are left out:",
	"archive.restore_area_missing": "The area {area} no longer exists. The plant gets no area.",
	"archive.restore_without": "Restore without them",
	"archive.restore_confirm": "Restore",
	"archive.restore_changed": "Another plant took this name or a sensor in the meantime. Check the details, then restore again.",
	"archive.restore_blocked_limit": "Smart Plants already manages as many plants as it can. Delete a plant first.",
	"archive.restore_blocked_busy": "The old device is still being removed. Try again in a moment.",
	"archive.delete_title": "Delete {name} for good?",
	"archive.delete_body": "Its photo and care history are removed. This can't be undone.",
	"archive.delete_confirm": "Delete for good",
	"plant_card.retired_body": "{name} was retired. Its photo and care history are in Smart Plants under Retired plants.",
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
	"care_plan.error_overlap": "This task was changed somewhere else while you edited it: {fields}. For these fields the form still shows your values; the other fields show the other change. Save again to keep your values, or cancel to keep the other change.",
	"care_plan.overlap_name": "name",
	"care_plan.overlap_schedule": "when it's due",
	"care_plan.overlap_instructions": "instructions",
	"care_plan.overlap_baseline_done_on": "last done",
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
	"care_plan.look_ahead_hint": "The forecast low or high is taken over this time from now. Shorter times are more reliable. The forecast is fetched again at the forecast refresh interval from the integration options (30 minutes by default) and when the weather entity changes.",
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
	"snooze.all_undone_kept_one": "Previous snoozes restored. {count} plant was changed since and keeps its snooze.",
	"snooze.all_undone_kept_other": "Previous snoozes restored. {count} plants were changed since and keep their snooze.",
	"snooze.all_undo_none": "Nothing restored: every plant was changed since and keeps its snooze.",
	"snooze.undo": "Undo",
	"notifications.title": "Notifications",
	"notifications.add": "Add notification",
	"notifications.add_title": "New notification",
	"notifications.loading": "Loading notifications…",
	"notifications.toggle_on_failed": "{name} couldn't be turned on: {error}",
	"notifications.toggle_off_failed": "{name} couldn't be turned off: {error}",
	"notifications.intro": "Get a message about your plants. You review and save it in Home Assistant's automation editor.",
	"notifications.existing": "Your notifications",
	"notifications.last_sent": "Last sent {time}",
	"notifications.never_sent": "Not sent yet",
	"notifications.edit": "Edit",
	"notifications.edit_label": "Edit {name}",
	"notifications.covers": "For {plants}",
	"notifications.covers_all": "For all plants",
	"notifications.covers_none": "The chosen plants were removed",
	"notifications.empty_heading": "No notifications yet",
	"notifications.empty_body": "Smart Plants can send you a daily report or a message as soon as a plant needs water. Pick one below, then save it in the automation editor.",
	"notifications.empty_action": "Set one up",
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
	"plant_card.editor_show_watering_help": "Logs a watering for this plant",
	"winter.add": "Add winter values",
	"winter.add_hint": "Other limits for the cold months, for example in a cool garage.",
	"winter.title": "Winter values",
	"winter.active_now": "Active now",
	"winter.when_both": "Apply during the rest period ({months}) or while the placement is dormant storage.",
	"winter.when_rest": "Apply during the rest period ({months}).",
	"winter.when_storage": "Apply while the placement is dormant storage.",
	"winter.next": "Next: from {date} (rest period).",
	"winter.never": "Winter values don't apply yet. Set a rest period or set the placement to dormant storage.",
	"winter.change_placement": "Change placement",
	"winter.same_summary": "{check}: same as normal",
	"winter.change": "{check} {winter} instead of {normal}",
	"winter.no_alert": "no alert",
	"winter.no_alert_short": "No alert",
	"winter.edit": "Edit winter values",
	"winter.remove": "Remove",
	"winter.remove_title": "Remove winter values?",
	"winter.remove_body": "{name} uses its normal values all year again.",
	"winter.removed": "Winter values removed",
	"winter.restored": "Winter values restored",
	"winter.undo_failed": "Couldn't put the winter values back. Add them again under Settings.",
	"winter.undo": "Undo",
	"winter.saved": "Winter values saved.",
	"winter.editor_title": "Winter values for {name}",
	"winter.editor_intro": "These values replace the normal ones in winter. Fields you leave as they are stay the same as normal.",
	"winter.editor_when": "When: {when}",
	"winter.field_cold": "Too cold below",
	"winter.field_hot": "Too warm above",
	"winter.field_light": "At least",
	"winter.field_low": "Too low below",
	"winter.field_high": "Too high above",
	"winter.field_dry": "Too dry below",
	"winter.field_damp": "Too damp above",
	"winter.same": "Same as normal",
	"winter.normally": "Normally {value}",
	"winter.light_off_hint": "0 = no light alert",
	"winter.suggest_temperature": "Suggestion: {value}, the lowest temperature {species} survives (OpenPlantBook).",
	"winter.suggest_moisture": "Suggestion: {min} and {target}. Resting plants need less water.",
	"winter.suggest_light": "Suggestion: 0 lx, no light alert while it rests in the dark.",
	"winter.suggest_conductivity": "Suggestion: {value}. Without fertilizer in winter the level drops.",
	"winter.use": "Use",
	"winter.warn_survival": "Colder than {species} survives ({value}).",
	"winter.error_temperature": "Keep Too cold below well under Too warm above, between −40 and 80 °C.",
	"winter.error_soil_temperature": "Keep Too cold below well under Too warm above, between −20 and 60 °C.",
	"winter.error_moisture": "Use whole numbers from 1 to 99 that go up from Needs water below to Ideal to Too wet above, at least 4 % apart from first to last.",
	"winter.error_light": "Enter a value from 0 to {max} lx.",
	"winter.error_conductivity": "Keep Too low below well under Too high above, between 0 and 10,000 µS/cm.",
	"winter.error_humidity": "Keep Too dry below well under Too damp above, between 0 and 100 %.",
	"winter.error_empty": "Enter a value.",
	"winter.changed_elsewhere": "The winter values were changed somewhere else. Fields you didn't change now show the new values. Check them and save again.",
	"winter.conflict": "This plant was changed somewhere else. Close this dialog and check the changes before you save.",
	"winter.save": "Save winter values",
	"winter.chip_until": "Winter values until end of {month}",
	"winter.chip_storage": "Winter values · dormant storage",
	"winter.reason_rest": "Winter values apply during the rest period ({months}). What changes:",
	"winter.reason_storage": "Winter values apply while the placement is dormant storage. They end when you change the placement. What changes:",
	"winter.reason_storage_rest": "Winter values apply while the placement is dormant storage and during the rest period ({months}). What changes:",
	"winter.paused": "They don't apply while the plant is paused.",
	"winter.range_tooltip": "Winter value. Normally {normal}.",
	"winter.icon_label": "Winter values apply",
	"winter.hint_storage": "In dormant storage?"
}, Yn = {
	"format.percent": "{value}%",
	"format.recorded_date_time": "{datetime} (UTC{offset})",
	"common.cancel": "Annulla",
	"common.not_specified": "Non specificato",
	"common.not_supplied": "Non fornito",
	"common.no_species_selected": "Nessuna specie selezionata",
	"common.continue_manually": "Continua a mano",
	"panel.admin_required": "Smart Plants richiede un account amministratore.",
	"panel.menu": "Menu",
	"panel.bell_one": "Notifiche: {count} configurata",
	"panel.bell_other": "Notifiche: {count} configurate",
	"panel.sidebar": "Mostra barra laterale",
	"panel.back_to_overview": "Torna alla panoramica",
	"panel.add_plant": "Aggiungi pianta",
	"panel.registry_unavailable": "Impossibile caricare sensori e aree da Home Assistant. Ricarica la pagina per riprovare; fino ad allora non potrai assegnare sensori o aree.",
	"panel.open_created": "Apri la pianta creata",
	"panel.busy": "Salvataggio o caricamento dell'anteprima…",
	"panel.update_available": "Smart Plants è stato aggiornato. Ricarica la pagina per usare la nuova versione.",
	"panel.reload": "Ricarica",
	"api_error.unknown": "Qualcosa è andato storto. Controlla la connessione e riprova.",
	"api_error.integration_not_loaded": "Smart Plants non è in esecuzione. Controllalo in Impostazioni → Dispositivi e servizi, poi aggiorna questa pagina.",
	"api_error.unauthorized": "Solo gli amministratori possono usare Smart Plants.",
	"api_error.not_found": "Questa pianta o specie non esiste più. Potrebbe essere stata eliminata altrove.",
	"api_error.revision_conflict": "Questa pianta è stata modificata altrove. Controlla i valori aggiornati, poi salva di nuovo le tue modifiche.",
	"api_error.provider_disabled": "OpenPlantBook non è disponibile. Puoi continuare senza; i dati della specie già aggiunti restano.",
	"api_error.provider_authentication": "OpenPlantBook non ha accettato le tue credenziali. Aggiornale in Impostazioni → Dispositivi e servizi, oppure continua senza specie.",
	"api_error.provider_rate_limit": "OpenPlantBook sta ricevendo troppe richieste. Riprova più tardi, oppure continua senza.",
	"api_error.provider_timeout": "OpenPlantBook ci ha messo troppo a rispondere. Riprova più tardi, oppure continua senza.",
	"api_error.provider_outage": "OpenPlantBook al momento non è raggiungibile. Riprova più tardi, oppure continua senza.",
	"api_error.provider_malformed_response": "OpenPlantBook ha inviato una risposta che Smart Plants non riesce a leggere. Riprova più tardi, oppure continua senza.",
	"api_error.version_mismatch": "Il pannello di Smart Plants non corrisponde alla versione installata. Riavvia Home Assistant, poi ricarica questa pagina (se serve, svuota la cache del browser).",
	"api_error.invalid_response": "Smart Plants ha ricevuto una risposta inattesa. Aggiorna la pagina e riprova.",
	"api_error.invalid_format": "Alcuni dati non sono stati salvati. Controlla i campi e riprova. Se stavi scegliendo una specie, cercala di nuovo.",
	"api_error.invalid_image": "Impossibile salvare la foto. Le foto devono essere JPEG, PNG o WebP, al massimo 5 MiB e 2048 × 2048 pixel.",
	"api_error.storage_full": "Lo spazio di Smart Plants è pieno, quindi la modifica non è stata salvata. Elimina vecchie voci del registro delle cure o note, poi riprova.",
	"api_error.pending_operations_full": "Smart Plants ha troppe modifiche in sospeso, quindi questa non è stata salvata. Riavvia Home Assistant per completarle, poi riprova.",
	"api_error.storage_failed": "Smart Plants non è riuscito a salvare la modifica. Non è cambiato nulla. Controlla i registri di Home Assistant, poi riprova.",
	"error.disconnected": "Connessione persa. Le modifiche locali e i tentativi di creazione vengono conservati. Riconnettiti prima di salvare.",
	"error.registry_updates": "Aggiornamenti del registro non disponibili; riconnettiti per riprovare le modifiche in Home Assistant.",
	"error.area_reconnect": "Riconnettiti per caricare le aree attuali di Home Assistant, poi scegli un'area o «Nessuna area».",
	"error.identity": "Inserisci un nome valido e una data/ora di acquisto ISO valida.",
	"error.moisture_reconnect": "Riconnettiti per caricare i dati aggiornati del registro prima di salvare i sensori di umidità del terreno.",
	"error.sources_reconnect": "Riconnettiti per caricare i dati aggiornati del registro prima di salvare i sensori.",
	"error.remove_main_sensor": "{name} è il sensore principale. Prima imposta un altro sensore come principale.",
	"notice.deleted_elsewhere": "Questa pianta è stata eliminata in un'altra sessione.",
	"notice.unreadable_one": "Non è possibile mostrare {count} pianta perché il pannello non riesce a leggerne i dati. Ricarica la pagina; se non basta, controlla i registri di Home Assistant.",
	"notice.unreadable_other": "Non è possibile mostrare {count} piante perché il pannello non riesce a leggerne i dati. Ricarica la pagina; se non basta, controlla i registri di Home Assistant.",
	"notice.unreadable_open": "Il pannello non riesce più a leggere i dati di questa pianta. Ricarica la pagina; se non basta, controlla i registri di Home Assistant.",
	"notice.area_changed_retained": "L'area in Home Assistant è cambiata da {from} a {to}. L'area che hai scelto viene mantenuta; controllala prima di salvare.",
	"notice.area_changed_synced": "L'area in Home Assistant è cambiata da {from} a {to}. Il selettore dell'area ora mostra l'area di Home Assistant.",
	"notice.related_failed": "Impossibile caricare le automazioni collegate.",
	"notice.saved": "Salvato.",
	"conflict.heading": "Questa pianta è stata modificata altrove",
	"conflict.revision": "Il salvataggio è sospeso per non sovrascrivere nulla. Le tue modifiche sono conservate.",
	"conflict.roles_changed": "Sono cambiati i sensori o le soglie degli avvisi.",
	"conflict.source_overlap": "Sia tu sia l'altra modifica avete cambiato {fields}. Se salvi, i tuoi valori sostituiscono quelli mostrati ora.",
	"conflict.retain": "Mantieni le mie modifiche",
	"conflict.discard": "Scarta le mie modifiche",
	"conflict.reviewed": "Le tue modifiche sono conservate. Controllale, poi salva di nuovo ogni sezione.",
	"conflict.reviewed_overlap": "Sono cambiati anche altrove: {fields}. Salvando li sostituisci con i tuoi valori.",
	"conflict.reviewed_species": "Se stavi scegliendo una specie, cercala di nuovo.",
	"conflict_field.name": "Nome",
	"conflict_field.acquired_at": "Data di acquisto",
	"conflict_field.placement": "Posizione",
	"conflict_field.watering_detection": "Registra le annaffiature dal sensore del terreno",
	"conflict_field.category": "Categoria",
	"conflict_field.tags": "Tag",
	"conflict_field.species": "Specie",
	"conflict_field.image": "Foto",
	"conflict_field.lifecycle_state": "Stato",
	"conflict_field.roles": "Sensori",
	"source_field.sources": "sensori",
	"source_field.primary_entity_id": "sensore principale",
	"source_field.aggregation": "come si combinano le letture",
	"source_field.stale_after_seconds": "tempo senza aggiornamenti",
	"list.loading": "Caricamento delle piante…",
	"list.count_filtered_one": "{shown} di {total} pianta",
	"list.count_filtered_other": "{shown} di {total} piante",
	"detail.not_found": "Pianta non trovata: potrebbe essere stata eliminata in un'altra sessione.",
	"detail.sections_label": "Sezioni della pianta",
	"detail.tab_overview": "Panoramica",
	"detail.name": "Nome",
	"detail.acquired": "Data di acquisto (facoltativa)",
	"detail.area_review": "L'area in Home Assistant è cambiata. Controlla l'area attuale e quella selezionata prima di applicarla di nuovo.",
	"detail.area_reviewed": "Ho controllato il cambio di area in Home Assistant",
	"detail.area_use_current": "Usa l'area attuale di Home Assistant",
	"detail.save_area": "Salva area",
	"area.label": "Area di Home Assistant",
	"area.none": "Nessuna area",
	"area.missing_option": "{area} (area non trovata: seleziona un'area esistente prima di salvare)",
	"editor.current_value": "{value} (valore attuale)",
	"placement.label": "Posizione",
	"placement.indoor": "in casa",
	"placement.outdoor": "all'aperto",
	"placement.balcony": "balcone",
	"placement.greenhouse": "serra",
	"placement.covered_outdoor": "all'aperto al riparo",
	"placement.dormant_storage": "ricovero invernale",
	"placement.info_label": "Cosa cambia la posizione",
	"placement.info": "La posizione decide anche se Smart Plants registra un'annaffiatura quando l'umidità del terreno sale all'improvviso. In casa e in serra lo fa. Nelle altre posizioni, e senza posizione, no, perché anche la pioggia fa salire l'umidità del terreno. Puoi cambiarlo per ogni pianta nelle sue impostazioni.",
	"watering_detection.label": "Registra le annaffiature dal sensore del terreno",
	"watering_detection.follow_on": "Come la posizione (attivo)",
	"watering_detection.follow_off": "Come la posizione (spento)",
	"watering_detection.on": "Attivo",
	"watering_detection.off": "Spento",
	"watering_detection.hint": "Una salita di 15 punti o più in un'ora registra un'annaffiatura, a meno che non ne sia già stata registrata una nelle 6 ore precedenti.",
	"exposure.label": "Esposizione al sole",
	"exposure.full_sun": "pieno sole",
	"exposure.partial_sun": "sole parziale",
	"exposure.shade": "ombra",
	"rain_exposure.label": "Esposizione alla pioggia",
	"rain_exposure.none": "nessuna",
	"rain_exposure.partial": "parziale",
	"rain_exposure.full": "totale",
	"container.label": "Vaso",
	"container.in_container": "In vaso",
	"container.in_ground": "In piena terra",
	"taxonomy.category": "Categoria",
	"taxonomy.tags": "Tag (separati da virgola)",
	"taxonomy.hint": "Categorie e tag di Smart Plants sono separati dalle etichette di Home Assistant.",
	"taxonomy.save": "Salva categoria e tag",
	"species.heading": "Specie",
	"species.preview_refresh": "Anteprima dell'aggiornamento della specie",
	"species.provider": "Fornitore della specie",
	"species.manual": "Specie manuale",
	"species.common_name": "Nome comune",
	"species.scientific_name": "Nome scientifico",
	"species.manual_hint": "Salvando, la specie viene sostituita con i dati che inserisci tu. Lascia vuoti entrambi i nomi per togliere la specie.",
	"species.save_manual": "Salva specie manuale",
	"species.search": "Cerca specie",
	"species.error_query_length": "Cerca con al massimo 100 caratteri.",
	"species.no_matches": "Nessuna specie trovata. Prova un'altra ricerca o l'inserimento manuale.",
	"snapshot.species": "Specie",
	"snapshot.provider": "Fornitore",
	"snapshot.reference": "Riferimento",
	"snapshot.attribution": "Attribuzione",
	"snapshot.fetched": "Scaricato",
	"snapshot.locale": "Lingua",
	"snapshot.status": "Stato",
	"snapshot.status_manual": "manuale",
	"snapshot.status_provider": "fornitore",
	"snapshot.confidence": "Affidabilità",
	"snapshot.category": "Categoria",
	"snapshot.imported_defaults": "Valori predefiniti di umidità del terreno importati",
	"snapshot.default_not_supplied": "I valori segnati con — non sono forniti dalla specie; si usa il valore predefinito integrato.",
	"snapshot.imported_ranges": "Intervalli dei problemi importati",
	"snapshot.temperature_range": "Temperatura {min}–{max} °C",
	"snapshot.humidity_range": "Umidità dell'aria {min}–{max} %",
	"snapshot.temperature_range_not_applied": "L'intervallo di temperatura non viene usato: non è compatibile con i valori di temperatura impostati per questa pianta, oppure è troppo stretto. Stress da temperatura mantiene i valori predefiniti.",
	"snapshot.humidity_range_not_applied": "L'intervallo di umidità dell'aria non viene usato: non è compatibile con i valori di umidità impostati per questa pianta, oppure è troppo stretto. Stress da umidità dell'aria mantiene i valori predefiniti.",
	"snapshot.care_notes": "Note di cura",
	"snapshot.source_details": "Dettagli della fonte",
	"snapshot.field_attribution": "Fonte per campo",
	"snapshot.proposed_changes": "Modifiche proposte",
	"snapshot.preview_read_only": "L'anteprima è in sola lettura. Le modifiche locali vengono mantenute. Non vengono caricate immagini remote.",
	"dialog.delete_title": "Eliminare {name}?",
	"dialog.delete_body": "Vengono rimossi definitivamente la pianta, il suo registro delle cure, il dispositivo e le entità, e la foto. L'operazione non si può annullare.",
	"dialog.delete_confirm": "Elimina definitivamente la pianta",
	"dialog.species_title": "Controlla le modifiche alla specie",
	"dialog.preview_invalid": "L'anteprima non è più valida. Chiudi e richiedine una nuova.",
	"dialog.species_confirm": "Accetta e applica la specie controllata",
	"photo.loading": "Caricamento della foto…",
	"photo.load_failed": "Impossibile caricare la foto: {error}",
	"photo.retry": "Riprova a caricare la foto",
	"photo.decode_failed": "il file scaricato non è un'immagine visualizzabile",
	"photo.alt": "Foto di {name}",
	"photo.none": "Ancora nessuna foto.",
	"photo.stored": "Salvata in locale: {type} · {width} × {height} pixel",
	"photo.replace": "Cambia foto",
	"photo.upload": "Aggiungi foto",
	"photo.hint": "JPEG, PNG, WebP o HEIC. Le foto grandi vengono ridotte a 2048 × 2048 pixel. Salvate solo in Home Assistant.",
	"photo.remove": "Rimuovi foto",
	"image_error.type_or_size": "Scegli un'immagine JPEG, PNG o WebP non vuota, al massimo di 5 MiB.",
	"image_error.unreadable": "Impossibile leggere l'immagine. Seleziona di nuovo il file.",
	"image_error.signature": "Il contenuto dell'immagine non corrisponde al tipo di file JPEG, PNG o WebP. Scegli un'altra immagine.",
	"image_error.decode": "Impossibile decodificare il file come immagine. Scegli un altro JPEG, PNG o WebP.",
	"image_error.heic_decode": "Questo browser non riesce a leggere le foto HEIC. Converti prima la foto in JPEG.",
	"image_error.dimensions": "L'immagine deve misurare al massimo 2048 × 2048 pixel.",
	"image_error.type_or_input_size": "Scegli un'immagine JPEG, PNG, WebP o HEIC non vuota, al massimo di 40 MiB.",
	"image_error.too_many_pixels": "L'immagine supera i 64 megapixel. Scegline una più piccola.",
	"image_error.resize": "Impossibile ridurre l'immagine per il caricamento. Scegli un JPEG, PNG o WebP più piccolo.",
	"created.notice": "Pianta {name} creata.",
	"created.uploading": "Caricamento della foto selezionata…",
	"created.photo_skipped": "La pianta è stata modificata dopo la creazione, quindi la foto scelta nella procedura guidata non è stata caricata. Controlla la foto attuale nella pagina della pianta e, se vuoi, caricane una.",
	"created.photo_uploaded": "Foto selezionata caricata.",
	"created.photo_failed": "La foto selezionata non è stata caricata. Apri la pianta creata per caricarla di nuovo.",
	"created.photo_interrupted": "Caricamento della foto interrotto. Apri la pianta creata e controlla la foto prima di riprovare.",
	"moisture.advanced_overrides": "Soglie personalizzate avanzate",
	"moisture.incompatible": "I dati dei sensori di umidità del terreno mancano o non sono compatibili. Aggiorna la pagina o Smart Plants prima di modificarli; i valori predefiniti non vengono impostati a caso.",
	"moisture.sources_intro": "Assegna fino a 32 sensori. Con più sensori, il sensore principale non viene mai sostituito in automatico. Puoi assegnare anche sensori non disponibili.",
	"moisture.add_sensor": "Aggiungi sensore di umidità del terreno",
	"moisture.overrides_intro": "Se lasci vuota una soglia personalizzata, si usa il valore predefinito. Salvando, l'intera configurazione viene applicata in un solo passaggio.",
	"moisture.override_label": "Valore {key} personalizzato (%)",
	"moisture.default_effective": "Predefinito {default} · in uso {effective}",
	"moisture.inherit_key": "Usa il valore {key} predefinito",
	"moisture_threshold.min": "minimo",
	"moisture_threshold.target": "ideale",
	"moisture_threshold.max": "massimo",
	"sources.show_all": "Mostra tutti i sensori, anche quelli che non sembrano adatti",
	"sources.choose": "Scegli un sensore",
	"sources.candidate": "{name} · {entity_id} · unità: {unit} · classe: {device_class} · {state}",
	"sources.not_supplied_lower": "non fornita",
	"sources.unavailable_lower": "non disponibile",
	"sources.unavailable": "Non disponibile",
	"sources.assign_unavailable": "Assegna un sensore non disponibile o non registrato",
	"sources.press_enter": "Premi Invio per aggiungere un ID entità.",
	"sources.own_sensor_refused": "Smart Plants calcola questo sensore a partire da altri sensori. Inserisci uno di quelli.",
	"sources.primary_suffix": " · Sensore principale",
	"sources.metadata": "Classe del dispositivo: {device_class} · Unità: {unit} · {registration}",
	"sources.registered": "Registrato",
	"sources.not_registered": "Non presente nel registro",
	"sources.native_settings": "Impostazioni del sensore in Home Assistant",
	"sources.remove": "Rimuovi {entity_id}",
	"sources.open_repairs": "Apri le riparazioni di Home Assistant",
	"sources.primary": "Sensore principale",
	"sources.primary_none": "Nessuno",
	"sources.aggregation": "Combina le letture",
	"sources.stale_after": "Non aggiornato dopo (secondi, 60–604800)",
	"sources.role_intro": "Assegna fino a 32 sensori di {role}. Con più sensori, il sensore principale non viene mai sostituito in automatico. Puoi assegnare anche sensori non disponibili.",
	"sources.add_role_sensor": "Aggiungi sensore di {role}",
	"aggregation.primary": "Solo sensore principale",
	"aggregation.average": "Media",
	"aggregation.min": "Minimo",
	"aggregation.max": "Massimo",
	"source_warning.missing_registered": "Sensore registrato mancante: sostituiscilo o controlla le riparazioni.",
	"source_warning.own_sensor": "Smart Plants calcola questo sensore a partire da altri sensori. Sostituiscilo con uno di quelli.",
	"source_warning.unregistered": "Non registrato: i cambi di nome potrebbero non essere seguiti",
	"source_warning.unavailable": "Al momento non disponibile",
	"source_warning.moisture_metadata": "Metadati inattesi: la valutazione richiede un valore numerico da 0 a 100 %",
	"source_warning.moisture_reading": "Lettura non valida: la valutazione richiede una percentuale numerica da 0 a 100",
	"source_warning.role_metadata": "Metadati inattesi ({role}): la valutazione richiede la classe del dispositivo {device_class} e l'unità {units}",
	"source_warning.separator": ". ",
	"validation.sources_unique": "Scegli al massimo 32 entità sensore diverse.",
	"validation.aggregation": "Scegli come combinare le letture.",
	"validation.primary": "Il sensore principale deve essere uno dei sensori assegnati oppure «Nessuno».",
	"validation.main_sensor": "Con «Solo sensore principale», scegli un sensore principale.",
	"validation.stale_after": "«Non aggiornato dopo» deve essere un numero intero da 60 a 604800 secondi.",
	"validation.moisture_thresholds": "Le soglie di umidità del terreno in uso devono essere numeri interi: 1 ≤ minimo < ideale < massimo ≤ 99, con almeno il 4% di differenza tra minimo e massimo.",
	"validation.taxonomy": "Usa una categoria di al massimo 60 caratteri e al massimo 32 tag diversi, ognuno di al massimo 60 caratteri.",
	"sensors.switch_prompt": "Hai modifiche non salvate ai sensori di {role}. Vuoi cambiare e scartarle?",
	"sensors.edit": "Modifica",
	"sensors.refused": "{role}: impostazioni dei sensori mancanti o non compatibili. Aggiorna la pagina o Smart Plants prima di modificarle; i valori predefiniti non vengono impostati a caso.",
	"sensors.save": "Salva sensori di {role}",
	"sensors.saved": "{role}: sensori salvati.",
	"sensors.summary_unavailable": "Impossibile leggere le impostazioni dei sensori",
	"sensors.summary_empty": "Nessun sensore",
	"sensors.source_count_one": "{count} sensore",
	"sensors.source_count_other": "{count} sensori",
	"sensors.summary_primary": "sensore principale {name}",
	"role.temperature": "Temperatura dell'aria",
	"role.humidity": "Umidità dell'aria",
	"role.illuminance": "Illuminamento",
	"role.battery": "Batteria",
	"role.conductivity": "Conducibilità",
	"role.soil_temperature": "Temperatura del terreno",
	"role.co2": "CO₂",
	"role_phrase.temperature": "temperatura dell'aria",
	"role_phrase.humidity": "umidità dell'aria",
	"role_phrase.illuminance": "illuminamento",
	"role_phrase.battery": "batteria",
	"role_phrase.conductivity": "conducibilità",
	"role_phrase.soil_temperature": "temperatura del terreno",
	"role_phrase.co2": "CO₂",
	"care.heading": "Registro delle cure",
	"care.from_sensor": "registrata dal sensore del terreno",
	"care.watering_count_one": "{count} annaffiatura.",
	"care.watering_count_other": "{count} annaffiature.",
	"care.last_watered": "Ultima annaffiatura: {date}.",
	"care.never_watered": "Ultima annaffiatura: mai.",
	"care.events_label": "Voci del registro delle cure",
	"care.empty": "Nessuna cura registrata.",
	"care.loading": "Caricamento del registro delle cure…",
	"care.load_failed": "Impossibile caricare il registro delle cure: {error}",
	"care.edit_kind": "Modifica {kind}",
	"care.delete_kind": "Elimina {kind}",
	"care.record": "Registra una cura",
	"care.type": "Tipo di cura",
	"care.when": "Quando (ora locale)",
	"care.note_optional": "Nota (facoltativa)",
	"care.unit": "Unità",
	"care.no_amount": "Nessuna quantità misurata",
	"care.save_changes": "Salva le modifiche",
	"care.cancel_editing": "Annulla le modifiche",
	"care.no_irrigation": "Le voci del registro non comandano mai l'irrigazione. Dopo un'annaffiatura registrata, «Da annaffiare» e «Troppo bagnata» restano disattivati per 24 ore.",
	"care.confirm_delete": "Eliminare questa voce ({kind})? L'operazione non può essere annullata.",
	"care.error_refresh_save": "Aggiorna il registro delle cure prima di salvare. La bozza viene conservata.",
	"care.error_refresh_delete": "Aggiorna il registro delle cure prima di eliminare.",
	"care.error_date": "Scegli una data e un'ora locali valide, non nel futuro.",
	"care.error_note_length": "Le note possono avere al massimo 500 caratteri.",
	"care.error_amount": "Inserisci una quantità positiva fino a 100.000, con l'unità.",
	"care.error_note_text": "Inserisci una nota da 1 a 1000 caratteri.",
	"care.error_details_length": "I dettagli della cura possono avere al massimo 120 caratteri.",
	"care_kind.watering": "Annaffiatura",
	"care_kind.fertilizing": "Concimazione",
	"care_kind.pruning": "Potatura",
	"care_kind.repotting": "Rinvaso",
	"care_kind.pest_control": "Trattamento antiparassitario",
	"care_kind.note": "Nota",
	"care_kind.task": "Attività di cura",
	"care_kind_phrase.watering": "annaffiatura",
	"care_kind_phrase.fertilizing": "concimazione",
	"care_kind_phrase.pruning": "potatura",
	"care_kind_phrase.repotting": "rinvaso",
	"care_kind_phrase.pest_control": "trattamento antiparassitario",
	"care_kind_phrase.note": "nota",
	"care_kind_phrase.task": "attività di cura",
	"care_field.product": "Prodotto",
	"care_field.pest": "Parassita",
	"care_field.amount": "Quantità",
	"care_field.unit": "Unità (g o mL)",
	"care_field.part": "Parte della pianta",
	"care_field.container": "Vaso",
	"care_field.medium": "Substrato",
	"care_field.text": "Testo della nota",
	"care_field.note": "Nota",
	"automations.heading": "Automazioni",
	"section.overall_health": "Salute complessiva",
	"section.overall_health_unavailable": "La salute complessiva non è disponibile.",
	"section.overall_health_unavailable_detail": "La salute complessiva non è disponibile: nessuna misura configurata fornisce al momento un valore valido.",
	"section.overall_health_available_summary": "{score} su 100",
	"section.overall_health_confidence": "Affidabilità",
	"section.overall_health_included_roles": "Misure incluse",
	"section.overall_health_none_contributing": "Al momento nessuna misura contribuisce al punteggio complessivo.",
	"section.overall_health_configured_unavailable": "Configurate ma non disponibili",
	"section.overall_health_all_included": "Nessuna: al momento tutte le misure configurate sono incluse.",
	"section.confidence_label_high": "alta",
	"section.confidence_label_medium": "media",
	"section.confidence_label_low": "bassa",
	"section.confidence_label_unknown": "sconosciuta",
	"section.confidence_high": "al momento tutte le misure configurate sono disponibili.",
	"section.confidence_medium": "al momento almeno metà delle misure configurate è disponibile.",
	"section.confidence_low": "al momento meno di metà delle misure configurate è disponibile.",
	"section.confidence_unknown": "per questa pianta non è ancora configurata nessuna misura.",
	"section.confidence_other": "nessun altro dettaglio disponibile.",
	"section.health_contributor.moisture": "Umidità del terreno",
	"section.health_contributor.temperature": "Temperatura",
	"section.health_contributor.humidity": "Umidità",
	"section.health_contributor.illuminance": "Illuminamento",
	"section.health_contributor.battery": "Batteria",
	"section.health_contributor.conductivity": "Conducibilità",
	"section.health_contributor.soil_temperature": "Temperatura del terreno",
	"section.health_contributor.co2": "CO2",
	"section.advanced_diagnostics": "Controllo dei problemi",
	"section.advanced_diagnostics_description": "Stato attuale di ogni controllo, con i limiti che usa. Puoi cambiare i limiti in Impostazioni, Altre soglie.",
	"section.advanced_diagnostics_zero_active": "Nessun problema attivo.",
	"section.advanced_diagnostics_one_active": "{count} problema attivo.",
	"section.advanced_diagnostics_many_active": "{count} problemi attivi.",
	"section.advanced_diagnostics_status_problem": "problema rilevato",
	"section.advanced_diagnostics_status_ok": "nessun problema",
	"section.advanced_diagnostics_status_unavailable": "non disponibile",
	"section.advanced_diagnostics_status_not_configured": "non configurato",
	"section.advanced_diagnostics_switch_prompt": "Ci sono modifiche non salvate nelle soglie per {current}. Vuoi scartarle e passare alle soglie per {pending}?",
	"section.advanced_diagnostics_switch_discard": "Scarta e passa",
	"section.advanced_diagnostics_switch_keep": "Continua a modificare",
	"section.advanced_diagnostics_cancel_edit": "Annulla",
	"section.advanced_diagnostics_edit_thresholds": "Modifica le soglie",
	"section.effective_thresholds_label": "Soglie in uso per {label}",
	"problem_reason.battery_ok": "batteria sopra la soglia minima",
	"problem_reason.battery_stale": "batteria non aggiornata da un po'",
	"problem_reason.battery_unavailable": "lettura della batteria non disponibile",
	"problem_reason.co2_ok": "CO2 nei limiti",
	"problem_reason.co2_stale": "CO₂ non aggiornata da un po'",
	"problem_reason.co2_stress": "CO2 troppo alta",
	"problem_reason.co2_unavailable": "lettura della CO2 non disponibile",
	"problem_reason.cold_stress": "troppo freddo",
	"problem_reason.conductivity_ok": "conducibilità nei limiti",
	"problem_reason.conductivity_stale": "livello di concime non aggiornato da un po'",
	"problem_reason.conductivity_unavailable": "lettura della conducibilità non disponibile",
	"problem_reason.damp_stress": "aria troppo umida",
	"problem_reason.dry_stress": "aria troppo secca",
	"problem_reason.enough_light": "luce diurna sufficiente",
	"problem_reason.high_conductivity_stress": "conducibilità troppo alta",
	"problem_reason.hot_stress": "troppo caldo",
	"problem_reason.humidity_ok": "umidità nei limiti",
	"problem_reason.humidity_stale": "umidità non aggiornata da un po'",
	"problem_reason.humidity_unavailable": "lettura dell'umidità non disponibile",
	"problem_reason.illuminance_stale": "luce non aggiornata da un po'",
	"problem_reason.illuminance_unavailable": "lettura dell'illuminamento non disponibile",
	"problem_reason.insufficient_daytime_samples": "letture diurne ancora insufficienti",
	"problem_reason.low_battery": "batteria scarica",
	"problem_reason.low_conductivity_stress": "conducibilità troppo bassa",
	"problem_reason.low_light": "luce diurna insufficiente",
	"problem_reason.nighttime": "è notte, la luce non viene valutata",
	"problem_reason.soil_temperature_ok": "temperatura del terreno nei limiti",
	"problem_reason.soil_temperature_stale": "temperatura del terreno non aggiornata da un po'",
	"problem_reason.soil_temperature_unavailable": "lettura della temperatura del terreno non disponibile",
	"problem_reason.temperature_ok": "temperatura nei limiti",
	"problem_reason.temperature_stale": "temperatura non aggiornata da un po'",
	"problem_reason.temperature_unavailable": "lettura della temperatura non disponibile",
	"problem.temperature_stress": "Stress da temperatura",
	"problem.humidity_stress": "Stress da umidità",
	"problem.soil_temperature_stress": "Stress da temperatura del terreno",
	"problem.co2_stress": "Stress da CO2",
	"problem.low_light": "Poca luce",
	"problem.low_battery": "Batteria scarica",
	"problem.conductivity_stress": "Stress da conducibilità",
	"problem_phrase.temperature_stress": "stress da temperatura",
	"problem_phrase.humidity_stress": "stress da umidità",
	"problem_phrase.soil_temperature_stress": "stress da temperatura del terreno",
	"problem_phrase.co2_stress": "stress da CO2",
	"problem_phrase.low_light": "poca luce",
	"problem_phrase.low_battery": "batteria scarica",
	"problem_phrase.conductivity_stress": "stress da conducibilità",
	"threshold_label.cold_threshold": "Attivazione freddo",
	"threshold_label.cold_clear": "Disattivazione freddo",
	"threshold_label.hot_clear": "Disattivazione caldo",
	"threshold_label.hot_threshold": "Attivazione caldo",
	"threshold_label.dry_threshold": "Attivazione secco",
	"threshold_label.dry_clear": "Disattivazione secco",
	"threshold_label.damp_clear": "Disattivazione umido",
	"threshold_label.damp_threshold": "Attivazione umido",
	"threshold_label.high_threshold": "Attivazione superiore",
	"threshold_label.high_clear": "Disattivazione superiore",
	"threshold_label.low_threshold": "Attivazione inferiore",
	"threshold_label.low_clear": "Disattivazione inferiore",
	"threshold_label.target": "Ideale",
	"threshold_label.clear": "Disattivazione",
	"threshold_field.cold_trigger": "Attivazione freddo ({unit})",
	"threshold_field.cold_clear": "Disattivazione freddo ({unit})",
	"threshold_field.hot_clear": "Disattivazione caldo ({unit})",
	"threshold_field.hot_trigger": "Attivazione caldo ({unit})",
	"threshold_field.dry_trigger": "Attivazione secco ({unit})",
	"threshold_field.dry_clear": "Disattivazione secco ({unit})",
	"threshold_field.damp_clear": "Disattivazione umido ({unit})",
	"threshold_field.damp_trigger": "Attivazione umido ({unit})",
	"threshold_field.low_trigger": "Attivazione inferiore ({unit})",
	"threshold_field.low_clear": "Disattivazione inferiore ({unit})",
	"threshold_field.high_clear": "Disattivazione superiore ({unit})",
	"threshold_field.high_trigger": "Attivazione superiore ({unit})",
	"threshold_field.target": "Ideale ({unit})",
	"threshold_field.clear": "Disattivazione ({unit})",
	"threshold.default_effective": "Predefinito {default} {unit} · in uso {effective} {unit}",
	"threshold.species_default_effective": "Predefinito della specie {default} {unit} · in uso {effective} {unit}",
	"threshold.inherit": "Usa predefinito",
	"threshold.inherit_all": "Usa tutti i valori predefiniti integrati",
	"threshold.inherit_all_species": "Usa tutti i valori predefiniti della specie e integrati",
	"threshold.save": "Salva le soglie",
	"threshold.group_label": "Soglie per {label}",
	"threshold_intro.temperature_stress": "Lascia un campo vuoto per usare il valore predefinito, oppure inserisci un valore solo per questa pianta. Ogni avviso si attiva al suo valore di attivazione e si disattiva al valore di disattivazione. Il valore di disattivazione è un po' più interno rispetto a quello di attivazione, così l'avviso non continua ad accendersi e spegnersi.",
	"threshold_intro.humidity_stress": "Lascia un campo vuoto per usare il valore predefinito, oppure inserisci un valore solo per questa pianta. Ogni avviso si attiva al suo valore di attivazione e si disattiva al valore di disattivazione. Il valore di disattivazione è un po' più interno rispetto a quello di attivazione, così l'avviso non continua ad accendersi e spegnersi.",
	"threshold_intro.conductivity_stress": "Lascia un campo vuoto per usare il valore predefinito, oppure inserisci un valore solo per questa pianta. Ogni avviso si attiva al suo valore di attivazione e si disattiva al valore di disattivazione. Il valore di disattivazione è un po' più interno rispetto a quello di attivazione, così l'avviso non continua ad accendersi e spegnersi.",
	"threshold_intro.co2_stress": "Lascia un campo vuoto per usare il valore predefinito, oppure inserisci un valore solo per questa pianta. Ogni avviso si attiva al suo valore di attivazione e si disattiva al valore di disattivazione. Il valore di disattivazione è un po' più interno rispetto a quello di attivazione, così l'avviso non continua ad accendersi e spegnersi.",
	"threshold_intro.soil_temperature_stress": "Lascia un campo vuoto per usare il valore predefinito, oppure inserisci un valore solo per questa pianta. Ogni avviso si attiva al suo valore di attivazione e si disattiva al valore di disattivazione. Il valore di disattivazione è un po' più interno rispetto a quello di attivazione, così l'avviso non continua ad accendersi e spegnersi.",
	"threshold_intro.low_battery": "Lascia un campo vuoto per usare il valore predefinito, oppure inserisci un valore solo per questa pianta. Ogni avviso si attiva al suo valore di attivazione e si disattiva al valore di disattivazione. Il valore di disattivazione è un po' più interno rispetto a quello di attivazione, così l'avviso non continua ad accendersi e spegnersi.",
	"threshold_intro.low_light": "Lascia un campo vuoto per usare il valore predefinito, oppure inserisci un valore solo per questa pianta. L'avviso si attiva quando la luce resta sotto il valore ideale e si disattiva quando raggiunge il valore di disattivazione. Il valore di disattivazione è un po' sopra quello ideale, così l'avviso non continua ad accendersi e spegnersi.",
	"threshold_saved.temperature_stress": "Soglie per lo stress da temperatura salvate.",
	"threshold_saved.humidity_stress": "Soglie per lo stress da umidità salvate.",
	"threshold_saved.conductivity_stress": "Soglie per lo stress da conducibilità salvate.",
	"threshold_saved.co2_stress": "Soglie per lo stress da CO2 salvate.",
	"threshold_saved.soil_temperature_stress": "Soglie per lo stress da temperatura del terreno salvate.",
	"threshold_saved.low_battery": "Soglie per la batteria scarica salvate.",
	"threshold_saved.low_light": "Soglie per la poca luce salvate.",
	"threshold_error.temperature_stress": "Controlla i valori: devono crescere da «Attivazione freddo» a «Disattivazione freddo», poi «Disattivazione caldo» e infine «Attivazione caldo». Ogni valore di disattivazione deve distare almeno 0,5 °C dalla sua attivazione, i due valori di disattivazione almeno 1,0 °C tra loro e tutti i valori devono essere tra −40,0 e 80,0 °C.",
	"threshold_error.humidity_stress": "Controlla i valori: devono crescere da «Attivazione secco» a «Disattivazione secco», poi «Disattivazione umido» e infine «Attivazione umido». Ogni valore di disattivazione deve distare almeno 1,0 % dalla sua attivazione, i due valori di disattivazione almeno 5,0 % tra loro e tutti i valori devono essere tra 0,0 e 100,0 %.",
	"threshold_error.conductivity_stress": "Controlla i valori: devono crescere da «Attivazione inferiore» a «Disattivazione inferiore», poi «Disattivazione superiore» e infine «Attivazione superiore». Ogni valore di disattivazione deve distare almeno 10,0 µS/cm dalla sua attivazione, i due valori di disattivazione almeno 50,0 µS/cm tra loro e tutti i valori devono essere tra 0,0 e 10.000,0 µS/cm.",
	"threshold_error.co2_stress": "Controlla i valori: «Disattivazione superiore» deve essere almeno 100 ppm sotto «Attivazione superiore». Entrambi devono essere numeri interi tra 0 e 10.000 ppm.",
	"threshold_error.soil_temperature_stress": "Controlla i valori: devono crescere da «Attivazione freddo» a «Disattivazione freddo», poi «Disattivazione caldo» e infine «Attivazione caldo». Ogni valore di disattivazione deve distare almeno 0,5 °C dalla sua attivazione, i due valori di disattivazione almeno 1,0 °C tra loro e tutti i valori devono essere tra −20,0 e 60,0 °C.",
	"threshold_error.low_battery": "Controlla i valori: «Disattivazione inferiore» deve essere almeno 1 % sopra «Attivazione inferiore». Entrambi devono essere numeri interi tra 0 e 100 %.",
	"threshold_error.low_light": "Controlla i valori: «Disattivazione» deve essere almeno 10,0 lx sopra «Ideale». Entrambi devono essere tra 0,0 e 200.000,0 lx.",
	"wizard.step_plant": "Pianta",
	"wizard.step_sensors": "Sensori",
	"wizard.step_review": "Riepilogo",
	"wizard.step_of": "Passo {step} di {total} · {name}",
	"wizard.plant_heading": "Dai un nome alla pianta",
	"wizard.plant_intro": "Serve solo il nome. Puoi cambiare tutto in seguito.",
	"wizard.plant_name": "Nome della pianta",
	"wizard.area": "Area",
	"wizard.no_area": "Nessuna area",
	"wizard.area_helper": "Il dispositivo della pianta viene assegnato a quest'area. Al passo successivo ti verranno suggeriti i sensori della stessa area.",
	"wizard.photo_add": "Aggiungi una foto",
	"wizard.photo_optional": "(facoltativa)",
	"wizard.photo_label": "Aggiungi una foto (facoltativa)",
	"wizard.photo_hint": "Trascina un'immagine o scegli un file · JPEG, PNG, WebP o HEIC, le foto grandi vengono ridimensionate",
	"wizard.photo_checking": "Controllo della foto…",
	"wizard.photo_pending": "Verrà caricata quando crei la pianta",
	"wizard.photo_remove": "Rimuovi",
	"wizard.photo_remove_label": "Rimuovi la foto",
	"wizard.photo_change": "Cambia",
	"wizard.photo_change_label": "Scegli un'altra foto",
	"wizard.sensors_heading": "Scegli i sensori",
	"wizard.sensors_intro": "Con un sensore di umidità del terreno ricevi gli avvisi di annaffiatura. Puoi aggiungere gli altri ora o in seguito.",
	"wizard.moisture_sensor": "Sensore di umidità del terreno",
	"wizard.role_sensor": "Sensore: {role}",
	"wizard.discard_role": "Non aggiungere il sensore ({role})",
	"wizard.choose_sensor": "Scegli un sensore",
	"wizard.search_sensors": "Cerca sensori…",
	"wizard.no_suitable_sensors": "Nessun sensore adatto trovato",
	"wizard.group_in_area": "Nell'area {area}",
	"wizard.group_other": "Altre aree",
	"wizard.sensor_reading": "{role} · adesso {value}",
	"wizard.sensor_unavailable": "non disponibile",
	"wizard.remove_sensor": "Rimuovi {name}",
	"wizard.suggested": "Suggeriti dall'area {area}",
	"wizard.no_suggestions": "Nessun altro sensore trovato nell'area {area}.",
	"wizard.add": "Aggiungi",
	"wizard.add_label": "Aggiungi {name}",
	"wizard.add_another": "Aggiungi un altro sensore",
	"wizard.add_another_hint": "Luce, batteria, livello di concime, CO₂ e altro",
	"wizard.review_heading": "Controlla e crea",
	"wizard.review_intro": "Non viene salvato nulla finché non selezioni «Crea pianta».",
	"wizard.with_photo": "con foto",
	"wizard.no_moisture": "Nessun sensore di umidità del terreno",
	"wizard.no_other_sensors": "Nessun altro sensore",
	"wizard.edit": "Modifica",
	"wizard.edit_plant": "Modifica la pianta",
	"wizard.edit_sensors": "Modifica i sensori",
	"wizard.no_moisture_warning": "Senza un sensore di umidità del terreno non ricevi avvisi di annaffiatura. Puoi aggiungerlo in seguito.",
	"wizard.species_section": "Specie e soglie per l'annaffiatura",
	"wizard.species_summary_default": "Facoltativo · predefiniti: da annaffiare sotto {min}, troppo bagnata sopra {max}",
	"wizard.species_summary_manual": "{species} · da annaffiare sotto {min}, troppo bagnata sopra {max}",
	"wizard.species_summary_accepted": "{species} · soglie da OpenPlantBook",
	"wizard.species_search": "Cerca su OpenPlantBook",
	"wizard.search_button": "Cerca",
	"wizard.search_hint": "Almeno 3 caratteri",
	"wizard.results": "Risultati della ricerca",
	"wizard.no_matches": "Nessun risultato. Prova un'altra ricerca o inserisci tu un nome.",
	"wizard.accept_species": "Ho controllato queste informazioni sulla specie e le accetto",
	"wizard.remove_species": "Non usare questa specie",
	"wizard.manual_species": "Oppure inserisci tu un nome",
	"wizard.provider_unavailable_title": "Per cercare la specie serve OpenPlantBook.",
	"wizard.provider_unavailable_body": "Aggiungi il tuo ID client di OpenPlantBook nelle opzioni dell'integrazione Smart Plants. Puoi aggiungere la pianta anche senza specie.",
	"wizard.open_options": "Apri le opzioni dell'integrazione",
	"wizard.openplantbook_credentials_link": "Ottieni le credenziali API di OpenPlantBook",
	"wizard.targets_label": "Soglie di umidità del terreno",
	"wizard.target_min": "Da annaffiare sotto",
	"wizard.target_ideal": "Ideale",
	"wizard.target_max": "Troppo bagnata sopra",
	"wizard.targets_default": "Valori predefiniti di Smart Plants. Una specie può suggerirne di migliori.",
	"wizard.targets_species": "Importati da OpenPlantBook. Modifica un valore per cambiarlo solo per questa pianta.",
	"wizard.targets_reset": "Ripristina i valori predefiniti",
	"wizard.details_section": "Altri dettagli",
	"wizard.details_summary": "Facoltativo · data di acquisto, categoria, tag",
	"wizard.acquired_date": "Data di acquisto",
	"wizard.tags": "Tag",
	"wizard.tags_hint": "Separa i tag con una virgola",
	"wizard.back": "Indietro",
	"wizard.next": "Avanti",
	"wizard.skip": "Salta per ora",
	"wizard.create": "Crea pianta",
	"wizard.retry_create": "Riprova la stessa richiesta di creazione",
	"wizard.retry_draft": "Riprova ad avviare la bozza",
	"wizard.final_request_retained": "La richiesta finale resta invariata. Riprovala per chiarire con sicurezza un esito incerto, anche dopo una riconnessione. Non avviare una nuova bozza finché l'esito non è chiaro.",
	"wizard.rejected": "Il server ha rifiutato la richiesta perché non valida o scaduta. Puoi correggerla con una nuova bozza; i dati della specie vanno rivisti in anteprima e accettati di nuovo.",
	"wizard.start_fresh": "Avvia una nuova bozza mantenendo i campi modificabili",
	"wizard.working": "In corso…",
	"wizard.done_heading": "Tutto pronto per {name}",
	"wizard.open_plant": "Apri la pianta",
	"wizard.done_body_area": "Ora la pianta è un dispositivo nell'area {area}. Le sue letture e i suoi avvisi compariranno qui e in Home Assistant entro un minuto.",
	"wizard.done_body": "Ora la pianta è un dispositivo in Home Assistant. Le sue letture e i suoi avvisi compariranno qui e in Home Assistant entro un minuto.",
	"wizard.done_notifications": "Ricevi un messaggio quando va annaffiata, oppure un resoconto giornaliero di tutte le tue piante.",
	"wizard.done_notifications_action": "Configura le notifiche",
	"wizard.back_to_plants": "Torna alle piante",
	"wizard.add_another_plant": "Aggiungi un'altra pianta",
	"wizard.error_code": "{code}: richiesta non riuscita. Controlla i dati inseriti o riprova quando sei connesso. La specie si può inserire a mano; le anteprime scadute vanno ricontrollate.",
	"wizard.error_generic": "Richiesta non riuscita. Riprova quando sei connesso.",
	"wizard.error_name": "Inserisci il nome della pianta.",
	"wizard.error_name_length": "Inserisci il nome della pianta (1–200 caratteri).",
	"wizard.error_acquired": "Inserisci una data di acquisto valida.",
	"wizard.error_area": "L'area di Home Assistant selezionata non esiste più. Scegli un'area esistente o «Nessuna area».",
	"wizard.error_accept_preview": "Controlla e accetta esplicitamente la specie selezionata, oppure scegli di non usarla.",
	"wizard.error_targets": "Controlla le soglie di annaffiatura: numeri interi da 1 a 99, con «Da annaffiare sotto» minore di «Ideale» e «Ideale» minore di «Troppo bagnata sopra», distanziati di almeno 4 %.",
	"plant_status.needs_water": "Da annaffiare",
	"plant_status.too_wet": "Troppo bagnata",
	"plant_status.problem": "Problema",
	"plant_status.stale": "Nessun dato recente",
	"plant_status.no_sensors": "Nessun sensore",
	"plant_status.no_main_sensor": "Nessun sensore principale",
	"plant_status.healthy": "In salute",
	"plant_status.paused": "Sospesa",
	"plant_status.more": "+{count}",
	"plant_status.more_label": "e altri {count}",
	"reading.moisture": "Umidità del terreno",
	"reading.temperature": "Temperatura",
	"reading.humidity": "Umidità dell'aria",
	"reading.illuminance": "Luce",
	"reading.conductivity": "Livello di concime",
	"reading.soil_temperature": "Temperatura del terreno",
	"reading.co2": "CO₂",
	"reading.battery": "Batteria",
	"reading.no_value": "Nessun valore",
	"reading.outside_target": "fuori dall'intervallo ideale {range}",
	"reading.not_updating": "non si aggiorna",
	"range.between": "{min}–{max}",
	"range.at_least": "Almeno {value}",
	"range.at_most": "Al massimo {value}",
	"range.low_below": "Insufficiente sotto {value}",
	"moisture_bar.dry": "Secco",
	"moisture_bar.wet": "Bagnato",
	"moisture_bar.target": "Ideale {range}",
	"moisture_bar.label": "Umidità del terreno {value}, intervallo ideale {range}",
	"moisture_bar.label_no_range": "Umidità del terreno {value}",
	"moisture_bar.label_no_value": "Nessun valore attuale di umidità del terreno",
	"moisture_bar.last_update": "Ultimo aggiornamento {age}",
	"overview.status_unavailable": "Stato delle piante non disponibile: {error}",
	"overview.filter_label": "Filtra per stato",
	"overview.tile_all": "Tutte le piante",
	"overview.tile_water": "Da annaffiare",
	"overview.tile_problems": "Problemi",
	"overview.tile_sensors": "Problemi ai sensori",
	"overview.tile_count_all_one": "Pianta",
	"overview.tile_count_all_other": "Piante",
	"overview.tile_count_water_one": "Da annaffiare",
	"overview.tile_count_water_other": "Da annaffiare",
	"overview.tile_count_problems_one": "Problema",
	"overview.tile_count_problems_other": "Problemi",
	"overview.tile_count_sensors_one": "Problema ai sensori",
	"overview.tile_count_sensors_other": "Problemi ai sensori",
	"overview.tile_count_care_one": "Cura da fare",
	"overview.tile_count_care_other": "Cure da fare",
	"overview.search": "Cerca piante",
	"overview.sort_button": "Ordina: {sort}",
	"overview.sort_attention": "Prima quelle da controllare",
	"overview.sort_name": "Nome",
	"overview.sort_area": "Raggruppa per area",
	"overview.clear_filter": "Rimuovi filtro",
	"overview.no_area": "Nessuna area",
	"overview.empty_heading": "Ancora nessuna pianta",
	"overview.empty_body": "Aggiungi una pianta, scegli i sensori che hai già in Home Assistant e Smart Plants ti avvisa quando va annaffiata o quando qualcosa non va.",
	"overview.how_it_works": "Come funziona",
	"overview.no_match_heading": "Nessuna pianta corrispondente",
	"overview.no_match_filter": "Al momento non c'è niente in «{filter}».",
	"overview.no_match_query": "Nessuna pianta corrisponde a «{query}».",
	"overview.show_all": "Mostra tutte le piante",
	"overview.integration_options": "Opzioni dell'integrazione",
	"overview.menu_notifications": "Notifiche",
	"overview.documentation": "Documentazione",
	"card.no_sensors": "Ancora nessun sensore assegnato",
	"card.assign": "Assegna",
	"card.assign_label": "Assegna i sensori a {name}",
	"card.watered": "Annaffiata {age}",
	"card.watered_just_now": "Appena annaffiata",
	"card.never_watered": "Non ancora annaffiata",
	"card.watered_short_just_now": "Adesso",
	"card.log_watering": "Annaffiata",
	"overview.log_watering_label": "Annaffiata: {name}",
	"watering.logged": "Annaffiatura registrata per {name}",
	"watering.undo": "Annulla",
	"watering.removed": "Annaffiatura rimossa per {name}",
	"problem_kind.too_cold": "Troppo freddo",
	"problem_kind.too_hot": "Troppo caldo",
	"problem_kind.too_dry": "Aria troppo secca",
	"problem_kind.too_humid": "Aria troppo umida",
	"problem_kind.low_light": "Poca luce",
	"problem_kind.low_conductivity": "Serve concime",
	"problem_kind.high_conductivity": "Troppo concime",
	"problem_kind.high_co2": "CO₂ alta",
	"problem_kind.battery_low": "Batteria scarica",
	"problem_kind.soil_too_cold": "Terreno troppo freddo",
	"problem_kind.soil_too_hot": "Terreno troppo caldo",
	"reason.below_min": "{role} a {value}, sotto il minimo di {limit}",
	"reason.above_max": "{role} a {value}, sopra il massimo di {limit}",
	"reason.turns_off_at": "{role} a {value}, l'avviso si disattiva a {limit}",
	"reason.low_light": "Luce a {value}, serve almeno {limit}",
	"reason.battery_low": "Batteria del sensore al {value}",
	"reason.stale": "{role}: ultima lettura {age}",
	"reason.not_reporting": "{role}: il sensore non trasmette dati",
	"reason.no_main_sensor": "{role}: nessun sensore principale scelto",
	"reason.no_sensors": "Assegna un sensore di umidità del terreno per ricevere gli avvisi di annaffiatura",
	"reason.outside_target": "{role} fuori dall'intervallo ideale",
	"detail.back": "Indietro",
	"detail.tab_sensors": "Sensori",
	"detail.tab_care": "Cure",
	"detail.tab_settings": "Impostazioni",
	"detail.no_species": "Nessuna specie",
	"detail.reason_healthy": "Tutte le letture sono nell'intervallo ideale.",
	"detail.reason_paused": "Il monitoraggio è sospeso.",
	"detail.log_care": "Registra cura",
	"detail.key_readings": "Letture principali",
	"detail.menu_open_device": "Apri dispositivo",
	"detail.plant_menu": "Altre azioni per {name}",
	"detail.menu_download": "Scarica diagnostica",
	"reading_state.ok": "Nella norma",
	"reading_state.low": "Troppo basso",
	"reading_state.high": "Troppo alto",
	"reading_state.stale": "Non si aggiorna · {age}",
	"reading_state.stale_no_age": "Non si aggiorna",
	"reading_state.unavailable": "Nessun valore",
	"sensor.missing": "Sensore mancante",
	"readings.heading": "Letture",
	"readings.manage": "Gestisci sensori",
	"readings.empty": "Nessun sensore assegnato. Scegli un sensore di umidità del terreno per ricevere gli avvisi di annaffiatura.",
	"readings.unavailable": "Letture non disponibili finché non si riesce a caricare lo stato della pianta.",
	"readings.paused": "Il monitoraggio è sospeso, quindi non ci sono letture attuali.",
	"readings.assign": "Assegna sensori",
	"recent.heading": "Cure recenti",
	"recent.show_all": "Mostra tutto",
	"history.heading": "Cronologia",
	"history.open_native": "Apri in Home Assistant",
	"history.role_label": "Lettura",
	"history.range_label": "Intervallo di tempo",
	"history.range_24h": "24 ore",
	"history.range_7d": "7 giorni",
	"history.range_30d": "30 giorni",
	"history.range_1y": "1 anno",
	"history.period_24h": "ultime 24 ore",
	"history.period_7d": "ultimi 7 giorni",
	"history.period_30d": "ultimi 30 giorni",
	"history.period_1y": "ultimo anno",
	"history.loading": "Caricamento della cronologia…",
	"history.empty": "Home Assistant non ha ancora registrato valori per questo periodo.",
	"history.unavailable": "La cronologia non è disponibile perché il Recorder di Home Assistant non è attivo.",
	"history.error": "Impossibile caricare la cronologia.",
	"history.retry": "Riprova",
	"history.summary": "{role}, {period}: da {first} a {last}, minimo {low}, massimo {high}",
	"history.summary_empty": "{role}, {period}: nessun valore registrato",
	"history.legend_target": "Ideale: {range}",
	"history.legend_spread": "Dal valore più basso al più alto",
	"history.legend_watering": "Annaffiatura registrata",
	"history.legend_fertilizing": "Concimazione registrata",
	"history.legend_pruning": "Potatura registrata",
	"history.legend_repotting": "Rinvaso registrato",
	"history.legend_pest_control": "Trattamento antiparassitario registrato",
	"history.legend_note": "Nota",
	"history.legend_task": "Attività di cura completata",
	"history.point_label": "Istante",
	"history.point": "{time}: {value}",
	"history.point_spread": "{time}: {value} ({min}–{max})",
	"history.log_watering_at": "Registra un'annaffiatura a quest'ora",
	"history.log_care_at": "Registra una cura a quest'ora",
	"history.log_other_care_at": "Registra un'altra cura",
	"history.rate": "Cala di circa {rate} al giorno.",
	"history.rate_since_watering": "Cala di circa {rate} al giorno dall'ultima annaffiatura.",
	"history.forecast_one": "Di questo passo arriva al minimo di {limit} in circa {count} giorno.",
	"history.forecast_other": "Di questo passo arriva al minimo di {limit} in circa {count} giorni.",
	"history.forecast_soon": "Di questo passo arriva al minimo di {limit} in meno di un giorno.",
	"care_done.watering": "Annaffiata",
	"care_done.fertilizing": "Concimata",
	"care_done.pruning": "Potata",
	"care_done.repotting": "Rinvasata",
	"care_done.pest_control": "Trattata contro i parassiti",
	"care_done.note": "Nota",
	"care_done.task": "Attività di cura completata",
	"about.heading": "Informazioni sulla pianta",
	"about.edit": "Modifica i dettagli della pianta",
	"about.species": "Specie",
	"about.species_provider": "Da {provider}",
	"about.species_manual": "Inserita da te",
	"about.add_species": "Aggiungi specie",
	"about.area": "Area",
	"about.placement": "Posizione",
	"about.since": "Dal",
	"about.category": "Categoria",
	"about.tags": "Tag",
	"about.add_details": "Aggiungi dettagli",
	"automations.body": "Nell'editor delle automazioni scegli le attivazioni di Smart Plants, come «Pianta da annaffiare», oppure configura una notifica per questa pianta.",
	"automations.notifications": "Configura le notifiche",
	"automations.open_device": "Apri dispositivo",
	"automations.create": "Crea automazione",
	"automations.last_ran": "Ultima esecuzione {time}",
	"automations.never_ran": "Mai eseguita",
	"automations.yaml": "Definita in YAML",
	"automations.off": "Disattivata",
	"automations.unavailable": "Non disponibile",
	"automations.show_all": "Mostra tutte ({count})",
	"automations.all_plants": "Per tutte le piante",
	"automations.notification": "Notifica",
	"automations.not_listed": "Non sono elencate le automazioni che usano solo un modello, l'area della pianta o un sensore assegnato alla pianta.",
	"stale_alert.title": "{name}: ultimo aggiornamento {age}.",
	"stale_alert.title_no_age": "{name} non trasmette dati.",
	"stale_alert.body": "Controlla la batteria o la connessione del sensore. Gli avvisi di annaffiatura restano in pausa finché non torna a trasmettere.",
	"assigned.heading": "Sensori assegnati",
	"assigned.empty": "Ancora nessun sensore.",
	"assigned.updated": "aggiornato {age}",
	"assigned.not_found": "non trovato in Home Assistant",
	"assigned.main": "Sensore principale",
	"assigned.own_sensor": "Sensore di Smart Plants, sostituiscilo",
	"assigned.menu": "Opzioni per {name}",
	"assigned.change": "Cambia sensori: {role}",
	"assigned.make_main": "Usa come sensore principale",
	"assigned.remove": "Rimuovi dalla pianta",
	"assigned.add": "Aggiungi sensore",
	"assigned.available": "Disponibili: {roles}",
	"assigned.all_assigned": "Ogni lettura ha un sensore.",
	"sensors.edit_heading": "{role}: sensori",
	"sensors.save_moisture": "Salva sensori di umidità del terreno",
	"sensors.summary_stale": "non aggiornato dopo {duration}",
	"combine.heading": "Più sensori per una lettura",
	"combine.secondary": "Usa il valore medio, minimo o massimo quando sono assegnati più sensori",
	"combine.intro": "Scegli quale valore conta quando una lettura ha più sensori e dopo quanto tempo senza aggiornamenti un sensore è considerato non aggiornato.",
	"combine.edit_label": "{role}: cambia come si combinano i sensori",
	"duration.days": "{count} g",
	"duration.hours": "{count} h",
	"duration.minutes": "{count} min",
	"duration.seconds": "{count} s",
	"troubleshooting.heading": "Risoluzione dei problemi",
	"troubleshooting.secondary": "Dettagli tecnici, ID delle entità e diagnostica per segnalare bug",
	"troubleshooting.entities_heading": "Entità dei sensori",
	"troubleshooting.plant_id": "ID pianta",
	"troubleshooting.device_id": "ID dispositivo",
	"troubleshooting.moisture_heading": "Valutazione dell'umidità del terreno",
	"troubleshooting.moisture_value": "Umidità del terreno combinata",
	"troubleshooting.moisture_health": "Punteggio di salute per l'umidità",
	"troubleshooting.reasons": "Motivi",
	"troubleshooting.no_evaluation": "Al momento non è disponibile nessuna valutazione.",
	"troubleshooting.download_heading": "File di diagnostica",
	"troubleshooting.download_hint": "Un file JSON con la configurazione di questa pianta, gli ID delle entità dei sensori e la valutazione attuale, utile per segnalare bug. Non contiene nome, note, foto né credenziali.",
	"care.filter_label": "Filtra le voci del registro",
	"care.filter_all": "Tutte",
	"care.filter_notes": "Note",
	"care.filter_empty": "Ancora nessuna voce di questo tipo.",
	"care.close_form": "Chiudi modulo",
	"care.event_menu": "Opzioni per {kind} del {date}",
	"settings.plant_heading": "Pianta",
	"settings.name": "Nome",
	"settings.rename": "Rinomina",
	"settings.save_name": "Salva nome",
	"settings.close": "Chiudi",
	"settings.area": "Area",
	"settings.area_value": "{area} · imposta anche l'area del dispositivo",
	"settings.change_area": "Cambia area",
	"settings.photo": "Foto",
	"settings.species": "Specie",
	"settings.species_provider": "{provider}, dati del {date}",
	"settings.species_none": "Nessuna. Con una specie puoi ricevere soglie consigliate per le cure.",
	"settings.find_species": "Cerca specie",
	"settings.change_species": "Cambia specie",
	"targets.heading": "Soglie di umidità del terreno",
	"targets.from_species": "Fuori da questo intervallo scattano gli avvisi. I valori vengono dalla specie, a meno che tu non li modifichi.",
	"targets.from_defaults": "Fuori da questo intervallo scattano gli avvisi. I valori sono quelli predefiniti di Smart Plants, a meno che tu non li modifichi.",
	"targets.custom_species": "Fuori da questo intervallo scattano gli avvisi. Hai impostato valori tuoi; «Ripristina predefiniti» torna a usare i valori della specie.",
	"targets.custom_defaults": "Fuori da questo intervallo scattano gli avvisi. Hai impostato valori tuoi; «Ripristina predefiniti» torna a usare i valori predefiniti di Smart Plants.",
	"targets.needs_water": "Da annaffiare sotto",
	"targets.ideal": "Ideale",
	"targets.too_wet": "Troppo bagnata sopra",
	"targets.default_hint": "Predefinito {value}",
	"targets.custom_hint": "Valore tuo · predefinito {value}",
	"targets.reset": "Ripristina predefiniti",
	"targets.save": "Salva soglie",
	"other_targets.heading": "Altre soglie",
	"other_targets.secondary": "Temperatura, umidità dell'aria, luce, livello di concime e batteria",
	"other_targets.intro": "Ogni controllo ha i suoi limiti. Modificali solo per questa pianta; i campi vuoti usano i valori predefiniti.",
	"other_targets.none": "Assegna un sensore di temperatura, umidità dell'aria, luce, concime, CO₂ o batteria per impostarne le soglie.",
	"more_details.heading": "Altri dettagli",
	"more_details.secondary": "Posizione, data di acquisto, categoria e tag",
	"more_details.save_identity": "Salva posizione e data",
	"manage.heading": "Gestisci",
	"manage.pause": "Sospendi il monitoraggio",
	"manage.pause_hint": "Mantiene la pianta e il suo storico, ferma avvisi e letture",
	"manage.pause_button": "Sospendi",
	"manage.resume": "Riattiva il monitoraggio",
	"manage.resume_hint": "Fa ripartire avvisi e letture",
	"manage.resume_button": "Riattiva",
	"manage.delete": "Elimina pianta",
	"manage.delete_hint": "Rimuove la pianta, il suo dispositivo, le entità e il registro delle cure",
	"manage.delete_button": "Elimina",
	"api_error.busy": "Smart Plants sta ancora completando una modifica a questa pianta. Riprova tra un momento.",
	"api_error.conflict": "Nel frattempo è cambiato qualcosa. Controlla i dati e riprova.",
	"api_error.limit": "Non c'è spazio per un'altra pianta. Smart Plants gestisce un numero limitato di piante, archiviate comprese. Elimina una pianta che non ti serve più e riprova.",
	"manage.retire": "Archivia pianta",
	"manage.retire_hint": "Rimuove dispositivo ed entità, libera i sensori, conserva foto e registro delle cure",
	"manage.retire_button": "Archivia",
	"manage.retire_menu": "Archivia pianta…",
	"dialog.delete_retire_hint": "Per conservare la foto e il registro delle cure, archivia la pianta.",
	"dialog.delete_retire_instead": "Archivia la pianta",
	"dialog.retire_title": "Archiviare {name}?",
	"dialog.retire_body": "Il dispositivo e le entità vengono rimossi e i sensori restano liberi per un'altra pianta. La foto e il registro delle cure si conservano in «Piante archiviate», da dove puoi ripristinarla o eliminarla definitivamente.",
	"dialog.retire_automations_one": "{count} automazione usa le entità di questa pianta e smetterà di funzionare.",
	"dialog.retire_automations_other": "{count} automazioni usano le entità di questa pianta e smetteranno di funzionare.",
	"dialog.retire_confirm": "Archivia",
	"archive.menu": "Piante archiviate",
	"archive.title": "Piante archiviate",
	"archive.intro": "Le piante che hai archiviato, con foto e registro delle cure. Non hanno più dispositivo né entità.",
	"archive.loading": "Caricamento delle piante archiviate…",
	"archive.empty": "Non ci sono piante archiviate.",
	"archive.date_range": "{start} – {end}",
	"archive.fact_acquired": "Acquistata",
	"archive.fact_added": "Aggiunta",
	"archive.fact_retired": "Archiviata",
	"archive.fact_monitored": "Monitorata per",
	"archive.years_one": "{count} anno",
	"archive.years_other": "{count} anni",
	"archive.months_one": "{count} mese",
	"archive.months_other": "{count} mesi",
	"archive.duration_both": "{years}, {months}",
	"archive.days_one": "{count} giorno",
	"archive.days_other": "{count} giorni",
	"archive.less_than_day": "Meno di un giorno",
	"archive.care_count": "{kind}: {count}",
	"archive.care_heading": "Registro delle cure",
	"archive.restore": "Ripristina",
	"archive.delete": "Elimina definitivamente",
	"archive.retired_toast": "{name} archiviata",
	"archive.retired_new_plant": "Aggiungi una pianta con questi sensori",
	"archive.retired_open": "Apri",
	"archive.restored_toast": "{name} ripristinata",
	"archive.deleted_toast": "{name} eliminata definitivamente",
	"archive.restore_title": "Ripristinare {name}?",
	"archive.restore_body": "Torna con foto, registro delle cure, specie e sensori. Le soglie tornano a seguire la specie. Le soglie personalizzate e le attività di cura non sono state conservate.",
	"archive.restore_name": "Nome",
	"archive.restore_name_taken": "Esiste già una pianta di nome {name}.",
	"archive.restore_name_required": "Inserisci un nome.",
	"archive.restore_name_length": "Inserisci un nome di massimo 200 caratteri.",
	"archive.restore_in_use": "Questi sensori ora sono usati da altre piante:",
	"archive.restore_share": "Usali anche per questa pianta",
	"archive.restore_missing": "Questi sensori non esistono più e vengono esclusi:",
	"archive.restore_area_missing": "L'area {area} non esiste più. La pianta resta senza area.",
	"archive.restore_without": "Ripristina senza",
	"archive.restore_confirm": "Ripristina",
	"archive.restore_changed": "Nel frattempo un'altra pianta ha preso questo nome o un sensore. Controlla i dati e ripristina di nuovo.",
	"archive.restore_blocked_limit": "Smart Plants gestisce già il numero massimo di piante. Prima elimina una pianta.",
	"archive.restore_blocked_busy": "Il vecchio dispositivo è ancora in fase di rimozione. Riprova tra un momento.",
	"archive.delete_title": "Eliminare definitivamente {name}?",
	"archive.delete_body": "La foto e il registro delle cure vengono rimossi. L'operazione non può essere annullata.",
	"archive.delete_confirm": "Elimina definitivamente",
	"plant_card.retired_body": "{name} è stata archiviata. La foto e il registro delle cure sono in Smart Plants, in «Piante archiviate».",
	"care_task_type.fertilize": "Concimazione",
	"care_task_type.prune": "Potatura",
	"care_task_type.repot": "Rinvaso",
	"care_task_type.pests": "Controllo parassiti",
	"care_task_type.winter_protection": "Protezione invernale",
	"care_task_type.custom": "Attività personalizzata",
	"care_plan.heading": "Piano delle cure",
	"care_plan.add_task": "Aggiungi attività",
	"care_plan.full": "Una pianta può avere al massimo 20 attività di cura.",
	"care_plan.tasks_label": "Attività di cura",
	"care_plan.empty": "Ricevi promemoria per concimazione, rinvaso e altro.",
	"care_plan.last_done": "Ultima volta: {date}",
	"care_plan.never_done": "Mai fatta",
	"care_plan.done": "Fatto",
	"care_plan.done_label": "Segna {name} come fatta",
	"care_plan.task_menu": "Opzioni per {name}",
	"care_plan.menu_mark_done": "Segna come fatta…",
	"care_plan.menu_skip": "Salta questa volta",
	"care_plan.menu_edit": "Modifica",
	"care_plan.menu_automate": "Automatizza…",
	"care_plan.menu_delete": "Elimina",
	"care_plan.month_range": "{start}–{end}",
	"care_plan.schedule_yearly": "Una volta all'anno, {months}",
	"care_plan.every_days_one": "Ogni giorno",
	"care_plan.every_days_other": "Ogni {count} giorni",
	"care_plan.every_weeks_one": "Ogni settimana",
	"care_plan.every_weeks_other": "Ogni {count} settimane",
	"care_plan.every_months_one": "Ogni mese",
	"care_plan.every_months_other": "Ogni {count} mesi",
	"care_plan.every_years_one": "Ogni anno",
	"care_plan.every_years_other": "Ogni {count} anni",
	"care_plan.schedule_growing_only": "{every} · solo nella stagione vegetativa",
	"care_plan.overdue_one": "In ritardo di 1 giorno",
	"care_plan.overdue_other": "In ritardo di {count} giorni",
	"care_plan.due_today": "Da fare oggi",
	"care_plan.due_until": "Da fare entro il {date}",
	"care_plan.resting_until": "A riposo fino al {date}",
	"care_plan.done_this_year": "Fatta per quest'anno",
	"care_plan.skipped_this_year": "Saltata quest'anno",
	"care_plan.missed_this_year": "Non fatta quest'anno",
	"care_plan.from_date": "Dal {date}",
	"care_plan.tomorrow": "Domani",
	"care_plan.in_days_one": "Tra 1 giorno",
	"care_plan.in_days_other": "Tra {count} giorni",
	"care_plan.in_weeks_one": "Tra 1 settimana",
	"care_plan.in_weeks_other": "Tra {count} settimane",
	"care_plan.in_months_one": "Tra 1 mese",
	"care_plan.in_months_other": "Tra {count} mesi",
	"care_plan.error_name_required": "Inserisci un nome per questa attività.",
	"care_plan.error_name_length": "Usa al massimo 60 caratteri.",
	"care_plan.error_months": "Scegli almeno un mese.",
	"care_plan.error_every": "Inserisci un numero intero da 1 a 999.",
	"care_plan.error_instructions_length": "Usa al massimo 4.000 caratteri.",
	"care_plan.error_last_done": "Inserisci una data valida.",
	"care_plan.error_last_done_future": "La data non può essere nel futuro.",
	"care_plan.error_task_gone": "Questa attività non esiste più. Forse è stata eliminata altrove.",
	"care_plan.error_overlap": "Mentre la modificavi, questa attività è stata cambiata altrove: {fields}. Per questi campi il modulo mostra ancora i tuoi valori; gli altri campi mostrano l'altra modifica. Salva di nuovo per tenere i tuoi valori, oppure annulla per tenere l'altra modifica.",
	"care_plan.overlap_name": "nome",
	"care_plan.overlap_schedule": "quando va fatta",
	"care_plan.overlap_instructions": "istruzioni",
	"care_plan.overlap_baseline_done_on": "ultima volta",
	"care_plan.summary_pick_months": "Una volta all'anno · scegli i mesi",
	"care_plan.summary_enter_interval": "Ricorrente · indica ogni quanto",
	"care_plan.add_title": "Aggiungi attività di cura",
	"care_plan.edit_title": "Modifica attività di cura",
	"care_plan.add_intro": "Per cosa vuoi un promemoria?",
	"care_plan.suggestions_for": "Suggerimenti per",
	"care_plan.suggestion_source": "OpenPlantBook · {topic}",
	"care_plan.note_fertilization": "concimazione",
	"care_plan.note_pruning": "potatura",
	"care_plan.suggestion_add": "Aggiungi l'attività «{name}»",
	"care_plan.show_more": "Mostra altro",
	"care_plan.show_less": "Mostra meno",
	"care_plan.from_scratch": "Oppure parti da zero",
	"care_plan.empty_suggestions": "OpenPlantBook ha informazioni di cura per questa specie. Compaiono come suggerimenti quando aggiungi un'attività.",
	"care_plan.note_hint": "OpenPlantBook ha una nota di cura su questo",
	"care_plan.note_use": "Usa come istruzioni",
	"care_plan.note_applied": "Da OpenPlantBook. Modifica il testo come preferisci.",
	"care_plan.preset_exists": "Già nel piano delle cure",
	"care_plan.preset_custom": "Nome e frequenza a tua scelta",
	"care_plan.name": "Nome",
	"care_plan.name_optional": "Nome (facoltativo)",
	"care_plan.when_due": "Quando va fatta?",
	"care_plan.mode_interval": "Ricorrente",
	"care_plan.mode_yearly": "Una volta all'anno",
	"care_plan.every": "Ogni",
	"care_plan.unit": "Unità",
	"care_plan.unit_days": "Giorni",
	"care_plan.unit_weeks": "Settimane",
	"care_plan.unit_months": "Mesi",
	"care_plan.unit_years": "Anni",
	"care_plan.growing_only": "Solo nella stagione vegetativa",
	"care_plan.growing_only_hint": "Si ferma durante il periodo di riposo ({months}).",
	"care_plan.months": "Mesi",
	"care_plan.months_hint": "Scegli il primo mese, poi l'ultimo.",
	"care_plan.instructions": "Istruzioni (facoltative)",
	"care_plan.instructions_placeholder": "Cosa fare, mostrato insieme all'attività",
	"care_plan.more_options": "Altre opzioni",
	"care_plan.last_done_field": "Ultima volta",
	"care_plan.last_done_hint": "Facoltativo. Senza una data, un'attività ricorrente va fatta subito.",
	"care_plan.delete": "Elimina",
	"care_plan.back": "Indietro",
	"care_plan.save": "Salva",
	"care_plan.close": "Chiudi",
	"care_plan.confirm_delete": "Eliminare l'attività di cura {name}? Le sue entità vengono rimosse e le automazioni che le usano smettono di funzionare. Le sue voci nel registro delle cure restano.",
	"care_plan.added_toast": "{name} aggiunta al piano delle cure",
	"care_plan.saved_toast": "{name} salvata",
	"care_plan.done_toast": "{name} segnata come fatta",
	"care_plan.skipped_toast": "{name} saltata per questa volta",
	"care_plan.deleted_toast": "{name} eliminata",
	"care_plan.undo": "Annulla",
	"care_plan.form_marks_done": "Segna {name} come fatta.",
	"care_plan.form_also_marks": "Completa anche {name}.",
	"care_plan.automate_title": "Automatizza «{name}»",
	"care_plan.automate_intro": "Usa queste entità in qualsiasi automazione, ad esempio per ricevere una notifica sul telefono.",
	"care_plan.automate_due": "Acceso finché {name} è da fare",
	"care_plan.automate_next": "Prossima scadenza",
	"care_plan.automate_next_disabled": "Disabilitata per impostazione predefinita. Abilitala nella pagina del dispositivo della pianta per usarla.",
	"care_plan.automate_care_due": "Acceso finché c'è un'attività di cura da fare per questa pianta",
	"care_plan.automate_missing": "Entità non ancora trovata. Ricarica la pagina tra un momento.",
	"care_plan.automate_action_before": "Segna l'attività come fatta da qualsiasi punto con l'azione ",
	"care_plan.automate_action_after": ", ad esempio da un tag NFC o da un pulsante nella plancia.",
	"care_plan.open_automation_editor": "Apri l'editor delle automazioni",
	"care_plan.copy": "Copia {entity}",
	"care_plan.copied": "{entity} copiato",
	"care_plan.copy_failed": "Impossibile copiare. Seleziona l'ID dell'entità e copialo a mano.",
	"care_plan.line_more": "{names} +{count}",
	"care_plan.plan_menu": "Opzioni del piano di cura",
	"care_plan.rest_set": "Imposta periodo di riposo",
	"care_plan.rest_edit": "Modifica periodo di riposo",
	"care_plan.rest_period": "Periodo di riposo",
	"care_plan.rest_months_label": "Mesi di riposo: {months}",
	"care_plan.edit": "Modifica",
	"care_plan.growing_season": "Stagione vegetativa",
	"care_plan.rest_all_running": "tutte le attività restano attive",
	"care_plan.rest_tasks_off_one": "1 attività sospesa durante il riposo",
	"care_plan.rest_tasks_off_other": "{count} attività sospese durante il riposo",
	"care_plan.rest_tasks_off_now_one": "1 attività sospesa",
	"care_plan.rest_tasks_off_now_other": "{count} attività sospese",
	"care_plan.rest_intro": "Facoltativo. Molte piante da esterno e mediterranee in inverno crescono poco e in quel periodo non vanno concimate. La maggior parte delle piante da appartamento non ha bisogno di un periodo di riposo.",
	"care_plan.rest_watering": "Gli avvisi di annaffiatura restano attivi.",
	"care_plan.rest_months": "Mesi di riposo",
	"care_plan.rest_off_heading": "Sospese durante il riposo",
	"care_plan.rest_no_repeating": "Ancora nessuna attività ricorrente.",
	"care_plan.rest_yearly_note": "Le attività annuali seguono i propri mesi e non ne risentono.",
	"care_plan.rest_remove": "Rimuovi",
	"care_plan.rest_error_months": "Scegli i mesi di riposo.",
	"care_plan.rest_error_whole_year": "Il periodo di riposo non può coprire tutto l'anno.",
	"care_plan.rest_saved_toast": "Periodo di riposo salvato",
	"care_plan.rest_removed_toast": "Periodo di riposo rimosso",
	"care_plan.due_chips_label": "Cure da fare",
	"care_plan.more_due": "e altre {count} da fare",
	"care_plan.schedule_reading": "{rule} · {source}",
	"care_plan.condition_below": "Sotto {value}",
	"care_plan.condition_above": "Sopra {value}",
	"care_plan.due_now": "Da fare",
	"care_plan.reading_due": "Da fare · {reading}",
	"care_plan.reading_still_cold": "fa ancora freddo",
	"care_plan.reading_still_warm": "fa ancora caldo",
	"care_plan.reading_until_above": "finché non supera {value}",
	"care_plan.reading_until_below": "finché non scende sotto {value}",
	"care_plan.reading_done_on": "Fatta il {date} · {until}",
	"care_plan.reading_waiting": "In attesa · {until}",
	"care_plan.reading_none": "Nessuna lettura",
	"care_plan.reading_below_since": "Sotto {value} dalle {since} · da fare alle {time}",
	"care_plan.reading_above_since": "Sopra {value} dalle {since} · da fare alle {time}",
	"care_plan.reading_not_needed": "Non serve · {reading}",
	"care_plan.reading_not_needed_plain": "Non serve",
	"care_plan.error_source": "Scegli un sensore.",
	"care_plan.error_value": "Inserisci un numero.",
	"care_plan.error_for_hours": "Inserisci un numero di ore da 0 a 72, in minuti interi.",
	"care_plan.error_reset_below": "Inserisci il valore o un numero più alto.",
	"care_plan.error_reset_above": "Inserisci il valore o un numero più basso.",
	"care_plan.summary_pick_source": "Lettura · scegli un sensore",
	"care_plan.subject_temperature": "la temperatura",
	"care_plan.subject_soil_temperature": "la temperatura del terreno",
	"care_plan.subject_humidity": "l'umidità dell'aria",
	"care_plan.subject_moisture": "l'umidità del terreno",
	"care_plan.subject_illuminance": "la luce",
	"care_plan.subject_conductivity": "il livello di concime",
	"care_plan.subject_co2": "il livello di CO₂",
	"care_plan.summary_below": "Quando {subject} è sotto {value}",
	"care_plan.summary_above": "Quando {subject} è sopra {value}",
	"care_plan.summary_below_enter": "Quando {subject} è sotto … · inserisci un valore",
	"care_plan.summary_above_enter": "Quando {subject} è sopra … · inserisci un valore",
	"care_plan.summary_for_hours_one": "per 1 h",
	"care_plan.summary_for_hours_other": "per {count} h",
	"care_plan.summary_again_above": "di nuovo da fare sopra {value}",
	"care_plan.summary_again_below": "di nuovo da fare sotto {value}",
	"care_plan.mode_reading": "Lettura",
	"care_plan.reading": "Lettura",
	"care_plan.reading_choose": "Scegli un sensore",
	"care_plan.reading_group_plant": "Sensori di questa pianta",
	"care_plan.reading_group_other": "Altro sensore",
	"care_plan.reading_other": "Un altro sensore…",
	"care_plan.reading_role_value": "{role} · {value}",
	"care_plan.reading_sensor": "Sensore",
	"care_plan.reading_no_sensors": "Nessun sensore con uno stato numerico",
	"care_plan.due_when": "Da fare quando",
	"care_plan.below": "Sotto",
	"care_plan.above": "Sopra",
	"care_plan.value": "Valore",
	"care_plan.value_placeholder": "es. 5",
	"care_plan.min_temp_hint": "OpenPlantBook: minimo {value}",
	"care_plan.min_temp_use": "Usa",
	"care_plan.min_temp_use_label": "Usa il minimo di {value} indicato da OpenPlantBook",
	"care_plan.min_temp_applied": "Dalla temperatura minima di OpenPlantBook.",
	"care_plan.more_options_reading": "ritardo, di nuovo da fare",
	"care_plan.for_hours": "Solo dopo (facoltativo)",
	"care_plan.hours": "h",
	"care_plan.for_hours_hint": "Da fare quando la lettura è rimasta lì per questo numero di ore. Dopo un riavvio l'attesa ricomincia.",
	"care_plan.reset_after_above": "Di nuovo da fare dopo essere salita sopra",
	"care_plan.reset_after_below": "Di nuovo da fare dopo essere scesa sotto",
	"care_plan.reset_hint": "Facoltativo. Dopo «Fatto» l'attività aspetta che la lettura raggiunga questo valore, così una lettura che oscilla intorno al valore dà un solo promemoria.",
	"care_plan.preset_winter": "Quando fa freddo",
	"care_plan.preset_winter_needs_source": "Serve un sensore di temperatura o le previsioni meteo",
	"care_plan.note_min_temperature": "temperatura minima",
	"care_plan.grows_above": "Cresce sopra {value}",
	"care_plan.suggestion_add_winter": "Aggiungi protezione invernale",
	"care_plan.reading_group_forecast": "Previsioni meteo",
	"care_plan.reading_group_forecast_entity": "Previsioni meteo · {name}",
	"care_plan.forecast_row_low": "Temperatura minima · {window}",
	"care_plan.forecast_row_high": "Temperatura massima · {window}",
	"care_plan.forecast_window_24": "prossime 24 h",
	"care_plan.forecast_window_48": "prossimi 2 giorni",
	"care_plan.forecast_window_72": "prossimi 3 giorni",
	"care_plan.forecast_window_long_24": "nelle prossime 24 ore",
	"care_plan.forecast_window_long_48": "nei prossimi 2 giorni",
	"care_plan.forecast_window_long_72": "nei prossimi 3 giorni",
	"care_plan.subject_forecast_low": "la minima prevista {window}",
	"care_plan.subject_forecast_high": "la massima prevista {window}",
	"care_plan.forecast_rule_low_below": "Minima prevista sotto {value}",
	"care_plan.forecast_rule_low_above": "Minima prevista sopra {value}",
	"care_plan.forecast_rule_high_below": "Massima prevista sotto {value}",
	"care_plan.forecast_rule_high_above": "Massima prevista sopra {value}",
	"care_plan.forecast_value": "prevista {value}",
	"care_plan.forecast_none": "Nessuna previsione",
	"care_plan.forecast_short": "Previsioni solo fino a {time}",
	"care_plan.weather_entity": "Entità meteo",
	"care_plan.error_weather_missing": "Entità meteo non trovata. Scegline un'altra.",
	"care_plan.error_weather_unit": "Questa entità meteo non indica l'unità della temperatura. Scegline un'altra.",
	"care_plan.look_ahead": "Periodo di previsione",
	"care_plan.look_ahead_24": "Prossime 24 ore",
	"care_plan.look_ahead_48": "Prossimi 2 giorni",
	"care_plan.look_ahead_72": "Prossimi 3 giorni",
	"care_plan.look_ahead_hint": "La minima o la massima prevista si calcola su questo periodo a partire da adesso. I periodi più brevi sono più affidabili. Le previsioni vengono riscaricate con l'«Intervallo di aggiornamento delle previsioni» impostato nelle opzioni dell'integrazione (30 minuti per impostazione predefinita) e quando cambia l'entità meteo.",
	"care_plan.more_options_forecast": "periodo di previsione, di nuovo da fare",
	"overview.tile_care": "Cure da fare",
	"card.care_due": "Cura: {tasks}",
	"card.care_overdue": "in ritardo",
	"snooze.menu": "Pausa avvisi…",
	"snooze.menu_change": "Modifica pausa…",
	"snooze.title": "Pausa avvisi per {name}",
	"snooze.title_change": "Modifica la pausa di {name}",
	"snooze.intro": "Le entità mantengono il loro stato reale e la pianta continua a mostrare la sua situazione. Le automazioni possono controllare l'attributo «Avvisi in pausa» per non disturbare. La pausa finisce da sola alla fine del giorno scelto.",
	"snooze.current": "Avvisi in pausa fino a {date}",
	"snooze.choices": "Pausa per",
	"snooze.preset_1": "1 giorno",
	"snooze.preset_3": "3 giorni",
	"snooze.preset_7": "1 settimana",
	"snooze.preset_14": "2 settimane",
	"snooze.preset_date": "Fino a una data…",
	"snooze.preset_until": "Fino a {date}",
	"snooze.date_label": "Ultimo giorno di pausa",
	"snooze.date_hint": "Gli avvisi riprendono dopo questo giorno.",
	"snooze.error_date": "Scegli un giorno tra domani e un anno da oggi.",
	"snooze.confirm": "Metti in pausa",
	"snooze.resume": "Riprendi",
	"snooze.resume_label": "Riprendi gli avvisi per {name}",
	"snooze.chip": "In pausa fino a {date}",
	"snooze.menu_all": "Pausa avvisi per tutte le piante…",
	"snooze.title_all": "Pausa avvisi per tutte le piante",
	"snooze.all_summary_one": "Mette in pausa gli avvisi di {count} pianta.",
	"snooze.all_summary_other": "Mette in pausa gli avvisi di {count} piante.",
	"snooze.all_paused": "Le piante sospese sono escluse.",
	"snooze.all_kept_one": "{count} pianta già in pausa più a lungo mantiene la sua scadenza.",
	"snooze.all_kept_other": "{count} piante già in pausa più a lungo mantengono la loro scadenza.",
	"snooze.all_none": "Tutte le piante sono già in pausa più a lungo e mantengono la loro scadenza.",
	"snooze.resume_all": "Riprendi tutto",
	"snooze.resume_all_hint_one": "Termina la pausa di {count} pianta.",
	"snooze.resume_all_hint_other": "Termina la pausa di {count} piante.",
	"snooze.all_done_one": "Avvisi di {count} pianta in pausa fino a {date}",
	"snooze.all_done_other": "Avvisi di {count} piante in pausa fino a {date}",
	"snooze.all_resumed_one": "Avvisi ripresi per {count} pianta",
	"snooze.all_resumed_other": "Avvisi ripresi per {count} piante",
	"snooze.all_unchanged": "Nessuna pianta modificata",
	"snooze.all_undone": "Pause precedenti ripristinate",
	"snooze.all_undone_kept_one": "Pause precedenti ripristinate. {count} pianta è stata modificata nel frattempo e mantiene la sua pausa.",
	"snooze.all_undone_kept_other": "Pause precedenti ripristinate. {count} piante sono state modificate nel frattempo e mantengono la loro pausa.",
	"snooze.all_undo_none": "Niente ripristinato: tutte le piante sono state modificate nel frattempo e mantengono la loro pausa.",
	"snooze.undo": "Annulla",
	"notifications.title": "Notifiche",
	"notifications.add": "Aggiungi notifica",
	"notifications.add_title": "Nuova notifica",
	"notifications.loading": "Caricamento delle notifiche…",
	"notifications.toggle_on_failed": "Impossibile attivare {name}: {error}",
	"notifications.toggle_off_failed": "Impossibile disattivare {name}: {error}",
	"notifications.intro": "Ricevi un messaggio sulle tue piante. Lo controlli e lo salvi nell'editor delle automazioni di Home Assistant.",
	"notifications.existing": "Le tue notifiche",
	"notifications.last_sent": "Ultimo invio {time}",
	"notifications.never_sent": "Non ancora inviata",
	"notifications.edit": "Modifica",
	"notifications.edit_label": "Modifica {name}",
	"notifications.covers": "Per {plants}",
	"notifications.covers_all": "Per tutte le piante",
	"notifications.covers_none": "Le piante scelte sono state rimosse",
	"notifications.empty_heading": "Ancora nessuna notifica",
	"notifications.empty_body": "Smart Plants può mandarti un resoconto giornaliero o un messaggio appena una pianta ha bisogno d'acqua. Scegline uno qui sotto, poi salvalo nell'editor delle automazioni.",
	"notifications.empty_action": "Configurane una",
	"notifications.kind": "Notifica",
	"notifications.daily": "Resoconto giornaliero delle piante",
	"notifications.daily_help": "Un messaggio al giorno se una pianta va annaffiata, ha un problema o ha un'attività di cura da fare.",
	"notifications.daily_time": "Ora",
	"notifications.water": "Avvisami subito quando una pianta ha bisogno d'acqua",
	"notifications.water_delay": "Dopo",
	"notifications.delay_none": "Subito",
	"notifications.quiet": "Ore di silenzio",
	"notifications.quiet_help": "Nessun messaggio nelle ore di silenzio. Il resoconto giornaliero elenca comunque la pianta.",
	"notifications.quiet_from": "Dalle",
	"notifications.quiet_to": "Alle",
	"notifications.plants": "Piante",
	"notifications.plants_all": "Tutte le piante",
	"notifications.plants_choose": "Scegli le piante",
	"notifications.error_no_plants": "Scegli almeno una pianta.",
	"notifications.send_to": "Invia a",
	"notifications.group_entities": "Entità di notifica",
	"notifications.group_services": "Servizi di notifica",
	"notifications.persistent": "Notifica di Home Assistant",
	"notifications.open_editor": "Apri nell'editor delle automazioni",
	"notifications.exists": "Hai già questa notifica.",
	"notifications.yaml_help": "Richiede la configurazione predefinita di automations.yaml. Altrimenti copia lo YAML dall'editor nei tuoi file.",
	"notifications.editor_fallback": "Non è stato possibile compilare l'editor delle automazioni. Aggiungi tu l'attivazione di Smart Plants e un'azione di notifica.",
	"notifications.alias_daily": "Smart Plants: resoconto giornaliero delle piante",
	"notifications.alias_water": "Smart Plants: pianta da annaffiare",
	"notifications.description_daily": "Creata in Smart Plants → Notifiche. Invia un breve elenco delle piante da annaffiare, con problemi o con attività di cura da fare.",
	"notifications.description_water": "Creata in Smart Plants → Notifiche. Invia un messaggio quando una pianta ha bisogno d'acqua da {delay}. Per le piante con gli avvisi in pausa il messaggio arriva quando finisce la pausa.",
	"notifications.description_water_now": "Creata in Smart Plants → Notifiche. Invia un messaggio quando una pianta ha bisogno d'acqua. Per le piante con gli avvisi in pausa il messaggio arriva quando finisce la pausa.",
	"notifications.msg_water_title": "{plant} ha bisogno d'acqua",
	"notifications.msg_water_body": "Annaffiala appena puoi.",
	"plant_card.name": "Scheda pianta di Smart Plants",
	"plant_card.description": "Una pianta con il suo stato, l'umidità del terreno, le letture e il pulsante «Annaffiata».",
	"plant_card.missing_title": "Pianta non trovata",
	"plant_card.missing_body": "La pianta mostrata da questa scheda è stata rimossa. Modifica la scheda per sceglierne un'altra.",
	"plant_card.no_plant": "Scegli una pianta nell'editor della scheda.",
	"plant_card.care_due": "Cure da fare",
	"plant_card.paused": "Monitoraggio sospeso",
	"plant_card.open_label": "Apri {name} in Smart Plants",
	"plant_card.details_label": "Mostra i dettagli di {name}",
	"plant_card.unauthorized": "Non hai il permesso di registrare le cure",
	"plant_card.load_error": "Impossibile caricare la scheda della pianta. Nuovo tentativo tra poco.",
	"plant_card.log_failed": "Impossibile registrare l'annaffiatura di {name}",
	"plant_card.undo_failed": "Impossibile rimuovere l'annaffiatura di {name}",
	"plant_card.editor_plant": "Pianta",
	"plant_card.editor_show_readings": "Mostra le letture",
	"plant_card.editor_show_readings_help": "Barra dell'umidità del terreno e chip delle letture",
	"plant_card.editor_show_watering": "Mostra il pulsante «Annaffiata»",
	"plant_card.editor_show_watering_help": "Registra un'annaffiatura per questa pianta"
}, Xn = [
	"en",
	"de",
	"it"
], Zn = {
	en: Jn,
	de: qn,
	it: Yn
};
function Qn(e) {
	return Object.hasOwn(Jn, e);
}
function $n(e, t = Xn) {
	let n = (e?.locale?.language || e?.language || "en").toLowerCase().split(/[-_]/)[0] ?? "en";
	return t.includes(n) ? n : "en";
}
function er(e) {
	if (!e) return;
	let t = e.replaceAll("_", "-");
	try {
		return Intl.getCanonicalLocales(t)[0];
	} catch {
		return;
	}
}
function tr(e, t) {
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
function nr(e) {
	if (e?.time_format === "12") return !0;
	if (e?.time_format === "24") return !1;
}
function rr(e, t, n) {
	return t ? e.replace(/\{(\w+)\}/g, (e, r) => {
		if (!Object.hasOwn(t, r)) return e;
		let i = t[r];
		return typeof i == "number" ? n(i) : i;
	}) : e;
}
var ir = /* @__PURE__ */ new Map();
function ar(e, t = Zn) {
	let n = $n(e, Object.keys(t)), r = e?.locale, i = t === Zn ? JSON.stringify([
		n,
		e?.language,
		r?.language,
		r?.number_format,
		r?.time_format,
		r?.date_format
	]) : null, a = i ? ir.get(i) : void 0;
	if (a) return a;
	let o = er(r?.language || e?.language) ?? n, { locales: s, grouping: c } = tr(r, o), l = c ? "min2" : !1, u = r?.date_format === "system" ? void 0 : [o], d = /* @__PURE__ */ new Map(), f = (e, t = {}) => {
		let n = JSON.stringify(t), r = d.get(n);
		return r || (r = new Intl.NumberFormat(s, {
			maximumFractionDigits: 2,
			useGrouping: l,
			...t
		}), d.set(n, r)), r.format(e);
	}, p = t[n] ?? t.en, m = t.en, h = (e, t) => rr(p[e] ?? m[e] ?? e, t, (e) => f(e)), g = new Intl.PluralRules(n), _ = new Intl.PluralRules("en"), v = (e, t, n, r) => {
		let i = {
			...r,
			count: e
		}, a = g.select(e), o = n.endsWith("_other") ? n.slice(0, -6) : null, s = (o !== null && t === `${o}_one` ? p[`${o}_${a}`] : p[a === "one" ? t : n]) ?? p[n];
		return s === void 0 ? h(_.select(e) === "one" ? t : n, i) : rr(s, i, (e) => f(e));
	}, y = new Intl.DateTimeFormat(u, {
		dateStyle: "medium",
		timeZone: "UTC"
	}), b = {
		hour: "numeric",
		minute: "2-digit"
	}, x = nr(r);
	x !== void 0 && (b.hour12 = x);
	let S = new Intl.DateTimeFormat(u, {
		...b,
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: "UTC"
	}), ee = new Intl.DateTimeFormat(u, {
		...b,
		year: "numeric",
		month: "short",
		day: "numeric"
	}), C = {
		language: n,
		t: h,
		tn: v,
		number: f,
		percent: (e) => h("format.percent", { value: e }),
		date: (e) => {
			let t = /^(\d{4})-(\d\d)-(\d\d)$/.exec(e);
			return t ? y.format(Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3]))) : e;
		},
		recordedDateTime: (e) => {
			let t = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::\d\d(?:\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.exec(e);
			if (!t) return e;
			let n = Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3]), Number(t[4]), Number(t[5]));
			return h("format.recorded_date_time", {
				datetime: S.format(n),
				offset: t[6] === "Z" ? "+00:00" : t[6]
			});
		},
		dateTime: (e) => {
			let t = Date.parse(e);
			return Number.isFinite(t) ? ee.format(t) : e;
		}
	};
	return i && ir.set(i, C), C;
}
var B = ar(), V = [
	"min",
	"target",
	"max"
], or = {
	min: 15,
	target: 35,
	max: 55
}, sr = [
	"indoor",
	"outdoor",
	"balcony",
	"greenhouse",
	"covered_outdoor",
	"dormant_storage"
], cr = ["indoor", "greenhouse"];
function lr(e, t) {
	return typeof e == "boolean" ? e : t !== null && cr.includes(t.mode);
}
var ur = [
	"temperature_stress",
	"humidity_stress",
	"soil_temperature_stress",
	"co2_stress",
	"low_light",
	"low_battery",
	"conductivity_stress"
];
function dr(e, t = B) {
	let n = `section.health_contributor.${e}`;
	return Qn(n) ? t.t(n) : e.replaceAll("_", " ");
}
function fr(e, t = B) {
	let n = `section.confidence_${e}`;
	return t.t(Qn(n) ? n : "section.confidence_other");
}
function pr(e, t = B) {
	let n = `section.confidence_label_${e}`;
	return Qn(n) ? t.t(n) : e;
}
function mr(e, t = B) {
	return t.t(`problem.${e}`);
}
var hr = {
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
}, gr = {
	cold_threshold_celsius: 10,
	cold_clear_celsius: 12,
	hot_clear_celsius: 32,
	hot_threshold_celsius: 35
}, _r = [
	"cold_threshold_celsius",
	"cold_clear_celsius",
	"hot_clear_celsius",
	"hot_threshold_celsius"
], vr = -40, yr = 80, br = .5, xr = 1;
function Sr(e) {
	return e >= 0 ? Math.floor(e * 10 + .5) / 10 : -(Math.floor(-e * 10 + .5) / 10);
}
function Cr(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = Sr(n);
	return r < vr || r > yr ? "invalid" : r;
}
function wr(e, t = B, n = gr) {
	let r = {};
	for (let n of _r) {
		let i = Cr(e[n]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.temperature_stress")
		};
		r[n] = i;
	}
	let i = r, a = (e) => i[e] ?? n[e], o = a("cold_threshold_celsius"), s = a("cold_clear_celsius"), c = a("hot_clear_celsius"), l = a("hot_threshold_celsius");
	return !(o < s && s < c && c < l) || s - o < br || l - c < br || c - s < xr ? {
		values: i,
		error: t.t("threshold_error.temperature_stress")
	} : {
		values: i,
		error: null
	};
}
function Tr(e) {
	let t = {
		cold_threshold_celsius: "",
		cold_clear_celsius: "",
		hot_clear_celsius: "",
		hot_threshold_celsius: ""
	};
	if (!e) return t;
	for (let n of _r) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var Er = {
	dry_threshold_percent: 25,
	dry_clear_percent: 30,
	damp_clear_percent: 80,
	damp_threshold_percent: 85
}, Dr = [
	"dry_threshold_percent",
	"dry_clear_percent",
	"damp_clear_percent",
	"damp_threshold_percent"
], Or = 0, kr = 100, Ar = 1, jr = 5;
function Mr(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = Sr(n);
	return r < Or || r > kr ? "invalid" : r;
}
function Nr(e, t = B, n = Er) {
	let r = {};
	for (let n of Dr) {
		let i = Mr(e[n]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.humidity_stress")
		};
		r[n] = i;
	}
	let i = r, a = (e) => i[e] ?? n[e], o = a("dry_threshold_percent"), s = a("dry_clear_percent"), c = a("damp_clear_percent"), l = a("damp_threshold_percent");
	return !(o < s && s < c && c < l) || s - o < Ar || l - c < Ar || c - s < jr ? {
		values: i,
		error: t.t("threshold_error.humidity_stress")
	} : {
		values: i,
		error: null
	};
}
function Pr(e) {
	let t = {}, n = {};
	if (e.source_status !== "provider") return {
		temperature: t,
		humidity: n
	};
	let r = gr, i = Er;
	typeof e.min_temperature == "number" && Object.assign(t, {
		cold_threshold_celsius: e.min_temperature,
		cold_clear_celsius: e.min_temperature + r.cold_clear_celsius - r.cold_threshold_celsius
	}), typeof e.max_temperature == "number" && Object.assign(t, {
		hot_threshold_celsius: e.max_temperature,
		hot_clear_celsius: e.max_temperature - (r.hot_threshold_celsius - r.hot_clear_celsius)
	});
	let a = e.threshold_defaults.humidity;
	return typeof a?.min == "number" && Object.assign(n, {
		dry_threshold_percent: a.min,
		dry_clear_percent: a.min + i.dry_clear_percent - i.dry_threshold_percent
	}), typeof a?.max == "number" && Object.assign(n, {
		damp_threshold_percent: a.max,
		damp_clear_percent: a.max - (i.damp_threshold_percent - i.damp_clear_percent)
	}), {
		temperature: t,
		humidity: n
	};
}
function Fr(e, t) {
	let n = Pr(e), r = (e, n) => {
		let r = t?.roles?.[e], i = r && typeof r == "object" ? r.stress_threshold_overrides : void 0;
		return Object.fromEntries(n.map((e) => {
			let t = i && typeof i == "object" ? i[e] : void 0;
			return [e, typeof t == "number" ? String(t) : ""];
		}));
	}, i = [];
	return Object.keys(n.temperature).length && wr(r("temperature", _r), B, {
		...gr,
		...n.temperature
	}).error && i.push("temperature"), Object.keys(n.humidity).length && Nr(r("humidity", Dr), B, {
		...Er,
		...n.humidity
	}).error && i.push("humidity"), i;
}
function Ir(e) {
	let t = {
		dry_threshold_percent: "",
		dry_clear_percent: "",
		damp_clear_percent: "",
		damp_threshold_percent: ""
	};
	if (!e) return t;
	for (let n of Dr) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var Lr = {
	low_threshold_micro_siemens_per_cm: 350,
	low_clear_micro_siemens_per_cm: 500,
	high_clear_micro_siemens_per_cm: 1800,
	high_threshold_micro_siemens_per_cm: 2e3
}, Rr = [
	"low_threshold_micro_siemens_per_cm",
	"low_clear_micro_siemens_per_cm",
	"high_clear_micro_siemens_per_cm",
	"high_threshold_micro_siemens_per_cm"
], zr = 0, Br = 1e4, Vr = 10, Hr = 50;
function Ur(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = Sr(n);
	return r < zr || r > Br ? "invalid" : r;
}
function Wr(e, t = B) {
	let n = {};
	for (let r of Rr) {
		let i = Ur(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.conductivity_stress")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? Lr[e], a = i("low_threshold_micro_siemens_per_cm"), o = i("low_clear_micro_siemens_per_cm"), s = i("high_clear_micro_siemens_per_cm"), c = i("high_threshold_micro_siemens_per_cm");
	return !(a < o && o < s && s < c) || o - a < Vr || c - s < Vr || s - o < Hr ? {
		values: r,
		error: t.t("threshold_error.conductivity_stress")
	} : {
		values: r,
		error: null
	};
}
function Gr(e) {
	let t = {
		low_threshold_micro_siemens_per_cm: "",
		low_clear_micro_siemens_per_cm: "",
		high_clear_micro_siemens_per_cm: "",
		high_threshold_micro_siemens_per_cm: ""
	};
	if (!e) return t;
	for (let n of Rr) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var Kr = {
	threshold_ppm: 5e3,
	clear_ppm: 4e3
}, qr = ["threshold_ppm", "clear_ppm"], Jr = 0, Yr = 1e4, Xr = 100;
function Zr(e) {
	return e >= 0 ? Math.floor(e + .5) : -Math.floor(-e + .5);
}
function Qr(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = Zr(n);
	return r < Jr || r > Yr ? "invalid" : r;
}
function $r(e, t = B) {
	let n = {};
	for (let r of qr) {
		let i = Qr(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.co2_stress")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? Kr[e], a = i("clear_ppm"), o = i("threshold_ppm");
	return !(a < o) || o - a < Xr ? {
		values: r,
		error: t.t("threshold_error.co2_stress")
	} : {
		values: r,
		error: null
	};
}
function ei(e) {
	let t = {
		threshold_ppm: "",
		clear_ppm: ""
	};
	if (!e) return t;
	for (let n of qr) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var ti = {
	cold_threshold_celsius: 10,
	cold_clear_celsius: 12,
	hot_clear_celsius: 32,
	hot_threshold_celsius: 35
}, ni = [
	"cold_threshold_celsius",
	"cold_clear_celsius",
	"hot_clear_celsius",
	"hot_threshold_celsius"
], ri = -20, ii = 60, ai = .5, oi = 1;
function si(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = Sr(n);
	return r < ri || r > ii ? "invalid" : r;
}
function ci(e, t = B) {
	let n = {};
	for (let r of ni) {
		let i = si(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.soil_temperature_stress")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? ti[e], a = i("cold_threshold_celsius"), o = i("cold_clear_celsius"), s = i("hot_clear_celsius"), c = i("hot_threshold_celsius");
	return !(a < o && o < s && s < c) || o - a < ai || c - s < ai || s - o < oi ? {
		values: r,
		error: t.t("threshold_error.soil_temperature_stress")
	} : {
		values: r,
		error: null
	};
}
function li(e) {
	let t = {
		cold_threshold_celsius: "",
		cold_clear_celsius: "",
		hot_clear_celsius: "",
		hot_threshold_celsius: ""
	};
	if (!e) return t;
	for (let n of ni) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var ui = {
	threshold_percent: 20,
	clear_percent: 25
}, di = ["threshold_percent", "clear_percent"], fi = 0, pi = 100, mi = 1;
function hi(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = Zr(n);
	return r < fi || r > pi ? "invalid" : r;
}
function gi(e, t = B) {
	let n = {};
	for (let r of di) {
		let i = hi(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.low_battery")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? ui[e], a = i("threshold_percent"), o = i("clear_percent");
	return !(a < o) || o - a < mi ? {
		values: r,
		error: t.t("threshold_error.low_battery")
	} : {
		values: r,
		error: null
	};
}
function _i(e) {
	let t = {
		threshold_percent: "",
		clear_percent: ""
	};
	if (!e) return t;
	for (let n of di) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var vi = {
	target_lux: 500,
	clear_lux: 700
}, yi = ["target_lux", "clear_lux"], bi = 0, xi = 2e5, Si = 10;
function Ci(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = Sr(n);
	return r < bi || r > xi ? "invalid" : r;
}
function wi(e, t = B) {
	let n = {};
	for (let r of yi) {
		let i = Ci(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.low_light")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? vi[e], a = i("target_lux"), o = i("clear_lux");
	return !(a < o) || o - a < Si ? {
		values: r,
		error: t.t("threshold_error.low_light")
	} : {
		values: r,
		error: null
	};
}
function Ti(e) {
	let t = {
		target_lux: "",
		clear_lux: ""
	};
	if (!e) return t;
	for (let n of yi) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
function Ei(e, t, n, r, i = B) {
	let a = `smart_plants:${e.id}:${t}`, o = n.find((e) => e.unique_id === a && e.platform === "smart_plants");
	if (!o) return [];
	let s = r[o.entity_id];
	return s ? hr[t].map((e) => {
		let t = s.attributes[e.key], n = typeof t == "number" && Number.isFinite(t) ? t : null;
		return {
			key: e.key,
			label: i.t(e.label),
			unit: e.unit,
			value: n
		};
	}) : [];
}
function Di(e, t, n, r = B) {
	return ur.map((i) => {
		let a = mr(i, r), o = `smart_plants:${e.id}:${i}`, s = t.find((e) => e.unique_id === o && e.platform === "smart_plants");
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
var Oi = 86400;
function ki() {
	return {
		sources: [],
		primary_entity_id: null,
		aggregation: "primary",
		stale_after_seconds: Oi,
		threshold_overrides: {
			min: null,
			target: null,
			max: null
		}
	};
}
function H(e) {
	let t = e.roles?.moisture;
	return !t || !Array.isArray(t.sources) || t.sources.length > 32 || !t.sources.every((e) => e && typeof e.entity_id == "string" && /^sensor\.[a-z0-9_]+$/.test(e.entity_id) && (e.registry_id === null || typeof e.registry_id == "string")) || ![
		"primary",
		"average",
		"min",
		"max"
	].includes(t.aggregation) || !Number.isInteger(t.stale_after_seconds) || t.stale_after_seconds < 60 || t.stale_after_seconds > 604800 || !(t.primary_entity_id === null || t.sources.some((e) => e.entity_id === t.primary_entity_id)) || !V.every((e) => t.threshold_defaults?.[e] && Number.isInteger(t.threshold_defaults[e].value) && t.threshold_defaults[e].value >= 1 && t.threshold_defaults[e].value <= 99 && ["builtin", "provider"].includes(t.threshold_defaults[e].source) && (t.threshold_defaults[e].provider === null || typeof t.threshold_defaults[e].provider == "string") && (t.threshold_defaults[e].provider_ref === null || typeof t.threshold_defaults[e].provider_ref == "string") && (t.threshold_overrides?.[e] === null || Number.isInteger(t.threshold_overrides?.[e]))) || ji(t, Object.fromEntries(V.map((e) => [e, t.threshold_defaults[e].value]))) || V.some((e) => {
		let n = t.threshold_defaults[e];
		return n.source === "builtin" ? n.provider !== null || n.provider_ref !== null : !n.provider || !n.provider_ref;
	}) ? null : t;
}
function Ai(e) {
	return structuredClone({
		sources: e.sources,
		primary_entity_id: e.primary_entity_id,
		aggregation: e.aggregation,
		stale_after_seconds: e.stale_after_seconds,
		threshold_overrides: e.threshold_overrides
	});
}
function ji(e, t, n = B) {
	if (e.sources.length > 32 || new Set(e.sources.map((e) => e.entity_id)).size !== e.sources.length || new Set(e.sources.map((e) => e.registry_id ?? e.entity_id)).size !== e.sources.length || e.sources.some((e) => !/^sensor\.[a-z0-9_]+$/.test(e.entity_id))) return n.t("validation.sources_unique");
	if (![
		"primary",
		"average",
		"min",
		"max"
	].includes(e.aggregation)) return n.t("validation.aggregation");
	if (e.primary_entity_id !== null && !e.sources.some((t) => t.entity_id === e.primary_entity_id)) return n.t("validation.primary");
	if (!Number.isInteger(e.stale_after_seconds) || e.stale_after_seconds < 60 || e.stale_after_seconds > 604800) return n.t("validation.stale_after");
	let r = V.map((n) => e.threshold_overrides[n] ?? t[n]);
	return r.some((e) => !Number.isInteger(e) || e < 1 || e > 99) || !(r[0] < r[1] && r[1] < r[2] && r[2] - r[0] >= 4) ? n.t("validation.moisture_thresholds") : null;
}
function Mi(e, t) {
	let n = t === "en" || t === "de" ? e.common_names?.[t] : void 0;
	return t !== "en" && n?.length ? n[0] : e.common_name ?? n?.[0] ?? null;
}
function Ni(e) {
	return [
		e.common_name,
		e.latin_name,
		...Object.values(e.common_names ?? {}).flat()
	].filter((e) => !!e);
}
function Pi(e, t) {
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
function U(e, t) {
	return t.find((t) => t.identifiers.some(([t, n]) => t === "smart_plants" && n === e.id));
}
function Fi(e, t) {
	return e.registry_id ? t.find((t) => t.id === e.registry_id) : t.find((t) => t.entity_id === e.entity_id);
}
function Ii(e) {
	return new Set(e.filter((e) => e.platform === "smart_plants").map((e) => e.entity_id));
}
function Li(e, t) {
	let n = e.sources.find((t) => t.entity_id === e.primary_entity_id);
	return {
		...structuredClone(e),
		sources: e.sources.map((e) => {
			let n = Fi(e, t);
			return n ? {
				entity_id: n.entity_id,
				registry_id: n.id
			} : { ...e };
		}),
		primary_entity_id: n ? Fi(n, t)?.entity_id ?? n.entity_id : null
	};
}
function Ri(e, t, n, r = B) {
	let i = Fi(e, t);
	if (e.registry_id && !i) return r.t("source_warning.missing_registered");
	if (i?.platform === "smart_plants") return r.t("source_warning.own_sensor");
	let a = n[i?.entity_id ?? e.entity_id], o = [];
	return i || o.push(r.t("source_warning.unregistered")), (!a || ["unknown", "unavailable"].includes(a.state)) && o.push(r.t("source_warning.unavailable")), a && (a.attributes.unit_of_measurement !== "%" || a.attributes.device_class !== "moisture") && o.push(r.t("source_warning.moisture_metadata")), a && !["unknown", "unavailable"].includes(a.state) && (!a.state.trim() || !Number.isFinite(Number(a.state)) || Number(a.state) < 0 || Number(a.state) > 100) && o.push(r.t("source_warning.moisture_reading")), o.join(r.t("source_warning.separator"));
}
var zi = [
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
function Bi(e) {
	return zi.find((t) => t.role === e);
}
function Vi(e, t = B) {
	return t.t(`role.${e}`);
}
function Hi(e, t = B) {
	return t.t(`role_phrase.${e}`);
}
function W(e, t) {
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
function Ui(e) {
	return structuredClone({
		sources: e.sources,
		primary_entity_id: e.primary_entity_id,
		aggregation: e.aggregation,
		stale_after_seconds: e.stale_after_seconds
	});
}
function Wi(e, t = B) {
	return e.sources.length > 32 || new Set(e.sources.map((e) => e.entity_id)).size !== e.sources.length || new Set(e.sources.map((e) => e.registry_id ?? e.entity_id)).size !== e.sources.length || e.sources.some((e) => !/^sensor\.[a-z0-9_]+$/.test(e.entity_id)) ? t.t("validation.sources_unique") : [
		"primary",
		"average",
		"min",
		"max"
	].includes(e.aggregation) ? e.primary_entity_id !== null && !e.sources.some((t) => t.entity_id === e.primary_entity_id) ? t.t("validation.primary") : !Number.isInteger(e.stale_after_seconds) || e.stale_after_seconds < 60 || e.stale_after_seconds > 604800 ? t.t("validation.stale_after") : null : t.t("validation.aggregation");
}
function Gi(e, t) {
	return t === null && e.length === 1 ? e[0].entity_id : t;
}
function Ki(e) {
	return e.aggregation === "primary" && e.sources.length > 1 && e.primary_entity_id === null;
}
function qi(e, t) {
	let n = e.sources.find((t) => t.entity_id === e.primary_entity_id);
	return {
		...structuredClone(e),
		sources: e.sources.map((e) => {
			let n = Fi(e, t);
			return n ? {
				entity_id: n.entity_id,
				registry_id: n.id
			} : { ...e };
		}),
		primary_entity_id: n ? Fi(n, t)?.entity_id ?? n.entity_id : null
	};
}
function Ji(e, t, n, r, i = B) {
	let a = Fi(e, t);
	if (e.registry_id && !a) return i.t("source_warning.missing_registered");
	if (a?.platform === "smart_plants") return i.t("source_warning.own_sensor");
	let o = n[a?.entity_id ?? e.entity_id], s = [];
	if (a || s.push(i.t("source_warning.unregistered")), (!o || ["unknown", "unavailable"].includes(o.state)) && s.push(i.t("source_warning.unavailable")), o) {
		let e = o.attributes.unit_of_measurement, t = o.attributes.device_class;
		typeof e == "string" && r.acceptedUnits.includes(e) && t === r.deviceClass || s.push(i.t("source_warning.role_metadata", {
			role: Vi(r.role, i),
			device_class: r.deviceClass,
			units: r.acceptedUnits.join(" / ")
		}));
	}
	return s.join(i.t("source_warning.separator"));
}
function Yi(e) {
	return [...new Set(e.split(",").map((e) => e.trim()).filter(Boolean))];
}
function Xi(e, t, n = B) {
	return !A(e, 60) || t.length > 32 || t.some((e) => !A(e, 60)) ? n.t("validation.taxonomy") : null;
}
// src/editors.ts
var Zi = (e) => e.target.value;
function Qi(e, t, n, r = "text", i = 200) {
	return T`<label>${e}<input type=${r} maxlength=${Ke(i)} .value=${t} @input=${(e) => n(Zi(e))}></label>`;
}
function $i(e, t, n, r, i) {
	return T`<label>${t}<select .value=${n} @change=${(e) => i(Zi(e))}>${(n && !r.some((e) => e.value === n) ? [...r, {
		value: n,
		label: e.t("editor.current_value", { value: n })
	}] : r).map((e) => T`<option value=${e.value} ?selected=${e.value === n}>${e.label}</option>`)}</select></label>`;
}
function ea(e, t) {
	let n = `placement.${t}`;
	return Qn(n) ? e.t(n) : t.replaceAll("_", " ");
}
function ta(e, t) {
	let n = `exposure.${t}`;
	return Qn(n) ? e.t(n) : t;
}
function na(e, t) {
	let n = `rain_exposure.${t}`;
	return Qn(n) ? e.t(n) : t;
}
function ra(e, t) {
	let n = `aggregation.${t}`;
	return Qn(n) ? e.t(n) : t;
}
function ia(e, t) {
	return e.t(`moisture_threshold.${t}`);
}
function aa(e, t, n, r) {
	return $i(e, e.t("area.label"), t, [
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
function oa(e, t) {
	return T`<details class="info-tip"><summary><ha-icon aria-hidden="true" icon="mdi:information-outline"></ha-icon>${e.t("placement.info_label")}</summary><p>${t}</p></details>`;
}
function sa(e, t, n) {
	let r = (e) => n({
		mode: "indoor",
		exposure: null,
		rain_exposure: null,
		container: null,
		...t,
		...e
	}), i = e.t("common.not_specified");
	return T`${$i(e, e.t("placement.label"), t?.mode ?? "", [{
		value: "",
		label: i
	}, ...sr.map((t) => ({
		value: t,
		label: ea(e, t)
	}))], (e) => e ? r({ mode: e }) : n(null))}${oa(e, e.t("placement.info"))}
    ${t ? T`${$i(e, e.t("exposure.label"), t.exposure ?? "", [
		"",
		"full_sun",
		"partial_sun",
		"shade"
	].map((t) => ({
		value: t,
		label: t ? ta(e, t) : i
	})), (e) => r({ exposure: e || null }))}
    ${$i(e, e.t("rain_exposure.label"), t.rain_exposure ?? "", [
		"",
		"none",
		"partial",
		"full"
	].map((t) => ({
		value: t,
		label: t ? na(e, t) : i
	})), (e) => r({ rain_exposure: e || null }))}
    ${$i(e, e.t("container.label"), t.container === null ? "" : String(t.container), [
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
	], (e) => r({ container: e === "" ? null : e === "true" }))}` : E}`;
}
function ca(e, t, n, r) {
	let i = t === null ? "" : t ? "on" : "off", a = lr(null, n) ? e.t("watering_detection.follow_on") : e.t("watering_detection.follow_off");
	return T`${$i(e, e.t("watering_detection.label"), i, [
		{
			value: "",
			label: a
		},
		{
			value: "on",
			label: e.t("watering_detection.on")
		},
		{
			value: "off",
			label: e.t("watering_detection.off")
		}
	], (e) => r(e === "" ? null : e === "on"))}
    <p class="small muted">${e.t("watering_detection.hint")}</p>`;
}
function la(e, t, n) {
	let r = n[t], i = e.t("sources.not_supplied_lower");
	return e.t("sources.candidate", {
		name: typeof r?.attributes.friendly_name == "string" ? r.attributes.friendly_name : t,
		entity_id: t,
		unit: String(r?.attributes.unit_of_measurement ?? i),
		device_class: String(r?.attributes.device_class ?? i),
		state: r?.state ?? e.t("sources.unavailable_lower")
	});
}
function ua(e, t) {
	let n = t[e]?.attributes.friendly_name;
	return typeof n == "string" && n.trim() ? `${n} · ${e}` : e;
}
function da(e, t, n) {
	let r = Ii(e);
	return [.../* @__PURE__ */ new Set([...e.map((e) => e.entity_id), ...Object.keys(t)])].filter((e) => e.startsWith("sensor.") && !r.has(e) && n(e)).sort();
}
function fa(e, t, n, r, i, a, o, s, c, l, u, d, f = "all") {
	let p = e.t("common.not_supplied"), m = (e, t) => o({
		sources: e,
		primary_entity_id: Gi(e, t)
	}), h = (e) => m([...t.sources, {
		entity_id: e,
		registry_id: n.find((t) => t.entity_id === e)?.id ?? null
	}], t.primary_entity_id), g = $i(e, e.t("sources.primary"), t.primary_entity_id ?? "", [{
		value: "",
		label: e.t("sources.primary_none")
	}, ...t.sources.map((e) => ({
		value: e.entity_id,
		label: ua(Fi(e, n)?.entity_id ?? e.entity_id, r)
	}))], (e) => o({ primary_entity_id: e || null })), _ = T`
    ${g}
    ${$i(e, e.t("sources.aggregation"), t.aggregation, [
		"primary",
		"average",
		"min",
		"max"
	].map((t) => ({
		value: t,
		label: ra(e, t)
	})), (e) => o({ aggregation: e }))}
    ${Qi(e.t("sources.stale_after"), String(t.stale_after_seconds), (e) => o({ stale_after_seconds: Number(e) }), "number")}`;
	return f === "combine" ? _ : T`
    <p>${s}</p>
    <label class="check"><input type="checkbox" .checked=${i} @change=${(e) => a(e.target.checked)}>${e.t("sources.show_all")}</label>
    ${$i(e, c, "", [{
		value: "",
		label: e.t("sources.choose")
	}, ...u.map((t) => ({
		value: t,
		label: la(e, t, r)
	}))], (e) => {
		e && !t.sources.some((t) => t.entity_id === e) && h(e);
	})}
    <label>${e.t("sources.assign_unavailable")}<input placeholder=${l} @input=${(e) => e.target.setCustomValidity("")} @keydown=${(r) => {
		if (r.key !== "Enter") return;
		r.preventDefault();
		let i = r.target, a = i.value.trim();
		Ii(n).has(a) ? (i.setCustomValidity(e.t("sources.own_sensor_refused")), i.reportValidity()) : /^sensor\.[a-z0-9_]+$/.test(a) && !t.sources.some((e) => e.entity_id === a) && (h(a), i.value = "");
	}}></label><small>${e.t("sources.press_enter")}</small>
    <ul>${t.sources.map((i) => {
		let a = Fi(i, n), o = i.registry_id && !a ? void 0 : r[a?.entity_id ?? i.entity_id];
		return T`<li><strong>${a?.entity_id ?? i.entity_id}</strong><p>${o?.state ?? e.t("sources.unavailable")} ${o?.attributes.unit_of_measurement ?? ""}${i.entity_id === t.primary_entity_id ? e.t("sources.primary_suffix") : ""}</p><p>${e.t("sources.metadata", {
			device_class: String(o?.attributes.device_class ?? p),
			unit: String(o?.attributes.unit_of_measurement ?? p),
			registration: a ? e.t("sources.registered") : e.t("sources.not_registered")
		})}</p><small>${d(i)}</small>${a ? T`<a href="/config/entities/entity/${encodeURIComponent(a.id)}">${e.t("sources.native_settings")}</a>` : E}<button type="button" @click=${() => m(t.sources.filter((e) => e !== i), t.primary_entity_id === i.entity_id ? null : t.primary_entity_id)}>${e.t("sources.remove", { entity_id: i.entity_id })}</button></li>`;
	})}</ul>
    ${t.sources.some((e) => e.registry_id && !Fi(e, n)) ? T`<a href="/config/repairs">${e.t("sources.open_repairs")}</a>` : E}
    ${f === "all" ? _ : t.aggregation === "primary" && t.sources.length > 1 ? g : E}`;
}
function pa(e, t, n, r, i, a, o, s, c = "all") {
	let l = (e) => s({
		...t,
		...e
	}), u = da(r, i, (e) => a || i[e]?.attributes.device_class === "moisture"), d = c === "pick" || c === "combine" ? c : "all";
	return T`${c === "thresholds" ? E : fa(e, t, r, i, a, o, l, e.t("moisture.sources_intro"), e.t("moisture.add_sensor"), "sensor.soil_moisture", u, (t) => Ri(t, r, i, e), d)}
    ${c === "thresholds" || c === "all" ? T`<p>${e.t("moisture.overrides_intro")}</p><div class="grid">${V.map((r) => T`<div>${Qi(e.t("moisture.override_label", { key: ia(e, r) }), t.threshold_overrides[r] === null ? "" : String(t.threshold_overrides[r]), (e) => l({ threshold_overrides: {
		...t.threshold_overrides,
		[r]: e.trim() === "" ? null : Number(e)
	} }), "number")}<small>${e.t("moisture.default_effective", {
		default: e.percent(n[r]),
		effective: e.percent(t.threshold_overrides[r] ?? n[r])
	})}</small><button type="button" @click=${() => l({ threshold_overrides: {
		...t.threshold_overrides,
		[r]: null
	} })}>${e.t("moisture.inherit_key", { key: ia(e, r) })}</button></div>`)}</div>` : E}`;
}
function ma(e, t, n, r, i, a, o, s, c = "all") {
	let l = (e) => s({
		...n,
		...e
	}), u = da(r, i, (e) => a || i[e]?.attributes.device_class === t.deviceClass && typeof i[e]?.attributes.unit_of_measurement == "string" && t.acceptedUnits.includes(i[e]?.attributes.unit_of_measurement)), d = Hi(t.role, e);
	return fa(e, n, r, i, a, o, l, e.t("sources.role_intro", { role: d }), e.t("sources.add_role_sensor", { role: d }), `sensor.${t.role}`, u, (n) => Ji(n, r, i, t, e), c);
}
function ha(e, t, n, r) {
	let i = e.t("common.not_supplied"), a = [
		[e.t("snapshot.provider"), t.provider],
		[e.t("snapshot.reference"), t.provider_ref],
		[e.t("snapshot.attribution"), t.attribution],
		[e.t("snapshot.fetched"), e.dateTime(t.fetched_at)],
		[e.t("snapshot.locale"), t.locale],
		[e.t("snapshot.status"), t.source_status === "manual" || t.source_status === "provider" ? e.t(`snapshot.status_${t.source_status}`) : t.source_status],
		[e.t("snapshot.confidence"), t.confidence === null ? i : e.number(t.confidence)],
		[e.t("snapshot.category"), t.category ?? i]
	], o = t.threshold_defaults.moisture, s = (t) => t == null ? "—" : e.number(t), c = t.threshold_defaults.humidity, l = t.source_status === "provider" ? [...typeof t.min_temperature == "number" || typeof t.max_temperature == "number" ? [e.t("snapshot.temperature_range", {
		min: s(t.min_temperature),
		max: s(t.max_temperature)
	})] : [], ...c?.min !== void 0 || c?.max !== void 0 ? [e.t("snapshot.humidity_range", {
		min: s(c?.min),
		max: s(c?.max)
	})] : []] : [], u = r === void 0 ? [] : Fr(t, r), d = Object.entries(t.care_text), f = (e) => {
		let t = e == null ? "—" : typeof e == "string" ? e : JSON.stringify(e);
		return We(t) > 80 ? `${Ge(t, 79)}…` : t;
	}, p = Mi(t, e.language);
	return T`<article><h3>${p ?? t.latin_name ?? e.t("snapshot.species")}</h3>${t.latin_name && t.latin_name !== p ? T`<p><i>${t.latin_name}</i></p>` : E}
    <p class="snapshot-targets">${e.t("snapshot.imported_defaults")}: ${V.map((t) => `${ia(e, t)} ${o?.[t] === void 0 ? "—" : e.percent(o[t])}`).join(" · ")}</p>
    ${V.some((e) => o?.[e] === void 0) ? T`<p class="small muted">${e.t("snapshot.default_not_supplied")}</p>` : E}
    ${l.length ? T`<p class="snapshot-ranges">${e.t("snapshot.imported_ranges")}: ${l.join(" · ")}</p>` : E}
    ${u.map((t) => T`<p class="small muted snapshot-not-applied">${e.t(t === "temperature" ? "snapshot.temperature_range_not_applied" : "snapshot.humidity_range_not_applied")}</p>`)}
    ${d.length ? T`<details><summary>${e.t("snapshot.care_notes")}</summary>${d.map(([e, t]) => T`<h4>${e}</h4><p class="prose">${t}</p>`)}</details>` : E}
    <details><summary>${e.t("snapshot.source_details")}</summary>
      <dl>${a.map(([e, t]) => T`<dt>${e}</dt><dd>${t}</dd>`)}</dl>
      <h4>${e.t("snapshot.field_attribution")}</h4>${Object.entries(t.field_sources).map(([e, t]) => T`<p>${e}: ${t}</p>`)}
      ${n ? T`<h4>${e.t("snapshot.proposed_changes")}</h4>${Object.entries(n.diff).map(([e, t]) => T`<p>${e}: ${f(t.before)} → ${f(t.after)}</p>`)}` : E}
    </details>
    ${n ? T`<p class="small muted">${e.t("snapshot.preview_read_only")}</p>` : E}</article>`;
}
// src/components/shared-styles.ts
var G = o`
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
`, ga = o`
  details.info-tip { margin: 0; }
  details.info-tip > summary { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 4px; margin: -6px -4px; border-radius: 8px; cursor: pointer; color: var(--sp-text); font-size: 13px; list-style: none; }
  details.info-tip > summary::-webkit-details-marker { display: none; }
  details.info-tip > summary::marker { content: ""; }
  details.info-tip > summary:hover { background: color-mix(in srgb, var(--sp-text) 6%, transparent); }
  details.info-tip > summary:focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 0; }
  details.info-tip > summary ha-icon { --mdc-icon-size: 18px; color: var(--sp-primary); }
  details.info-tip > p { margin: 4px 0 0; font-size: 13px; line-height: 1.4; color: var(--sp-text-secondary); }
`, _a = o`
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
`;
function va(e) {
	switch (e) {
		case "--success-color": return "var(--sp-success)";
		case "--warning-color": return "var(--sp-warning)";
		case "--info-color": return "var(--sp-info)";
		case "--error-color": return "var(--sp-error)";
		default: return "var(--sp-disabled)";
	}
}
var ya = o`
  .sk { display: block; background: color-mix(in srgb, var(--primary-text-color, #212121) 8%, transparent); border-radius: 6px;
    animation: sp-pulse 1.4s ease-in-out infinite alternate; }
  .sk.line { height: 12px; }
  .sk.round { border-radius: 50%; }
  @keyframes sp-pulse { from { opacity: 1; } to { opacity: .55; } }
  @media (prefers-reduced-motion: reduce) { .sk { animation: none; } }
`;
// \0@oxc-project+runtime@0.156.0/helpers/esm/decorate.js
function K(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
// src/components/sp-status-chip.ts
var ba, xa = class extends D {
	constructor(...e) {
		super(...e), this.status = "healthy", this.label = "", this.more = 0, this.l = B;
	}
	willUpdate() {
		let e = Nt[this.status]?.color ?? "--disabled-text-color";
		this.toggleAttribute("muted", e === "--disabled-text-color"), this.style.setProperty("--sp-status", va(e));
	}
	render() {
		let e = Nt[this.status] ?? Nt.healthy, t = this.label || Ft(this.l, this.status in Nt ? this.status : "healthy");
		return T`<span class="chip" part="chip"><ha-icon aria-hidden="true" .icon=${e.icon}></ha-icon><span class="label">${t}</span>${this.more > 0 ? T`<span aria-hidden="true">${this.l.t("plant_status.more", { count: this.more })}</span><span class="sr-only">${this.l.t("plant_status.more_label", { count: this.more })}</span>` : E}</span>`;
	}
};
ba = xa, ba.styles = [
	G,
	_a,
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
], K([O({ reflect: !0 })], xa.prototype, "status", void 0), K([O()], xa.prototype, "label", void 0), K([O({ type: Number })], xa.prototype, "more", void 0), K([O({ attribute: !1 })], xa.prototype, "l", void 0), customElements.get("sp-status-chip") || customElements.define("sp-status-chip", xa);
// src/components/sp-moisture-bar.ts
var Sa, Ca = (e) => Math.min(100, Math.max(0, e)), wa = class extends D {
	constructor(...e) {
		super(...e), this.value = null, this.range = null, this.state = "ok", this.lastReported = null, this.now = void 0, this.l = B;
	}
	willUpdate() {
		this.toggleAttribute("dimmed", this.state === "stale" || this.state === "unavailable");
	}
	_hasRange() {
		return this.range?.min !== null && this.range?.min !== void 0 && this.range.max !== null && this.range.max !== void 0;
	}
	render() {
		let e = this.l, t = this.range, n = this.value, r = zt(e, "moisture", t, "%"), i = n === null ? "—" : I(e, n, "%"), a = n === null ? e.t("moisture_bar.label_no_value") : r ? e.t("moisture_bar.label", {
			value: i,
			range: r
		}) : e.t("moisture_bar.label_no_range", { value: i }), o = this._hasRange(), s = o ? Ca(t.min) : 0, c = o ? Ca(t.max) : 0, l = t?.target ?? null, u = this.state === "stale" && this.lastReported;
		return T`
      <div class="top"><span class="name"><ha-icon aria-hidden="true" .icon=${P.moisture.icon}></ha-icon>${F(e, "moisture")}</span>
        <span class="value ${this.state}" aria-hidden="true">${i}</span></div>
      <div class="track" role="img" aria-label=${a}>
        ${o ? T`<div class="band" style="left:${s}%;width:${Math.max(0, c - s)}%"></div>` : E}
        ${l === null ? E : T`<div class="tick" style="left:${Ca(l)}%"></div>`}
        ${n === null ? E : T`<div class="dot ${this.state}" style="left:${Math.min(98, Math.max(2, n))}%"></div>`}
      </div>
      <div class="scale" aria-hidden="true"><span class="end">${e.t("moisture_bar.dry")}</span>${r ? T`<span>${e.t("moisture_bar.target", { range: r })}</span>` : E}<span class="end">${e.t("moisture_bar.wet")}</span></div>
      ${u ? T`<div class="age"><ha-icon aria-hidden="true" icon="mdi:clock-outline"></ha-icon>${e.t("moisture_bar.last_update", { age: Vt(e, this.lastReported, this.now) })}</div>` : E}`;
	}
};
Sa = wa, Sa.styles = [G, o`
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
  `], K([O({ type: Number })], wa.prototype, "value", void 0), K([O({ attribute: !1 })], wa.prototype, "range", void 0), K([O({ reflect: !0 })], wa.prototype, "state", void 0), K([O({ attribute: !1 })], wa.prototype, "lastReported", void 0), K([O({ attribute: !1 })], wa.prototype, "now", void 0), K([O({ attribute: !1 })], wa.prototype, "l", void 0), customElements.get("sp-moisture-bar") || customElements.define("sp-moisture-bar", wa);
// src/components/sp-reading-chip.ts
var Ta, Ea = class extends D {
	constructor(...e) {
		super(...e), this.role = "temperature", this.value = null, this.unit = "", this.state = "ok", this.range = null, this.l = B;
	}
	render() {
		let e = this.l, t = P[this.role] ?? P.temperature, n = F(e, this.role in P ? this.role : "temperature"), r = zt(e, this.role, this.range, this.unit), i = (this.state === "low" || this.state === "high") && r;
		return T`<span class="chip" part="chip" title=${r ? `${n}: ${r}` : n}>
      <ha-icon aria-hidden="true" .icon=${t.icon}></ha-icon><span class="sr-only">${n}</span>
      ${this.value === null ? e.t("reading.no_value") : I(e, this.value, this.unit)}
      ${i ? T`<span class="sr-only">, ${e.t("reading.outside_target", { range: r })}</span>` : E}
      ${this.state === "stale" ? T`<span class="sr-only">, ${e.t("reading.not_updating")}</span>` : E}
    </span>`;
	}
};
Ta = Ea, Ta.styles = [
	G,
	_a,
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
], K([O()], Ea.prototype, "role", void 0), K([O({ type: Number })], Ea.prototype, "value", void 0), K([O()], Ea.prototype, "unit", void 0), K([O({ reflect: !0 })], Ea.prototype, "state", void 0), K([O({ attribute: !1 })], Ea.prototype, "range", void 0), K([O({ attribute: !1 })], Ea.prototype, "l", void 0), customElements.get("sp-reading-chip") || customElements.define("sp-reading-chip", Ea);
function Da() {
	return typeof window.matchMedia == "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function Oa(e, t = 180) {
	e && typeof e.animate == "function" && !Da() && e.animate([{ opacity: 0 }, { opacity: 1 }], {
		duration: t,
		easing: "ease-out"
	});
}
// src/components/sp-plant-avatar.ts
var ka, Aa = /* @__PURE__ */ new Set(), ja = o`
  :host { --sp-avatar-size: 56px; --sp-avatar-radius: 12px; display: inline-block; flex: none; width: var(--sp-avatar-size); height: var(--sp-avatar-size); max-width: 100%; }
  :host([size="large"]) { --sp-avatar-size: 132px; --sp-avatar-radius: 16px; }
  @media (max-width: 600px) { :host([size="large"]) { --sp-avatar-size: 76px; --sp-avatar-radius: 12px; } }
  .tile { width: 100%; height: 100%; border-radius: var(--sp-avatar-radius); overflow: hidden; display: grid; place-items: center;
    background-color: color-mix(in srgb, var(--sp-primary) 12%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
  ha-icon { --mdc-icon-size: calc(var(--sp-avatar-size) * .54); }
`, Ma = class extends D {
	constructor(...e) {
		super(...e), this.src = null, this.name = "", this.size = "small", this.l = B;
	}
	render() {
		return T`<div class="tile" part="tile">${this.src ? T`<img src=${this.src} alt=${this.l.t("photo.alt", { name: this.name })} @load=${(e) => this._loaded(e.currentTarget)} @error=${() => this.dispatchEvent(new CustomEvent("photo-error", {
			bubbles: !0,
			composed: !0
		}))}>` : T`<ha-icon aria-hidden="true" icon="mdi:sprout"></ha-icon>`}</div>`;
	}
	_loaded(e) {
		let t = e.getAttribute("src");
		t && !Aa.has(t) && (Aa.add(t), Oa(e, 150));
	}
};
ka = Ma, ka.styles = [G, ja], K([O({ attribute: !1 })], Ma.prototype, "src", void 0), K([O()], Ma.prototype, "name", void 0), K([O({ reflect: !0 })], Ma.prototype, "size", void 0), K([O({ attribute: !1 })], Ma.prototype, "l", void 0), customElements.get("sp-plant-avatar") || customElements.define("sp-plant-avatar", Ma);
// src/components/sp-empty-state.ts
var Na, Pa = class extends D {
	constructor(...e) {
		super(...e), this.icon = "mdi:sprout", this.heading = "", this.compact = !1;
	}
	render() {
		return T`<div class="art" aria-hidden="true"><ha-icon .icon=${this.icon}></ha-icon></div>
      <h2>${this.heading}</h2><div class="text"><slot></slot></div><div class="actions"><slot name="actions"></slot></div>`;
	}
};
Na = Pa, Na.styles = [G, o`
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
  `], K([O()], Pa.prototype, "icon", void 0), K([O()], Pa.prototype, "heading", void 0), K([O({
	type: Boolean,
	reflect: !0
})], Pa.prototype, "compact", void 0), customElements.get("sp-empty-state") || customElements.define("sp-empty-state", Pa);
// src/components/sp-history-chart.ts
var Fa, Ia = 200, q = {
	top: 10,
	right: 12,
	bottom: 24,
	left: 46
};
function La(e = "") {
	let t = e ? `${e} ` : "";
	return a(`
  ${t}.readout-row { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 12px; min-height: 28px; margin-top: 2px; }
  ${t}.legend { display: flex; flex-wrap: wrap; gap: 2px 16px; margin-top: 4px; font-size: 12px; color: var(--sp-text-secondary); }
  ${t}.legend span { display: inline-flex; align-items: center; gap: 6px; }
  ${t}.key { display: inline-block; width: 14px; height: 8px; border-radius: 2px; }
  ${t}.key.marker { width: 8px; border-radius: 50%; }
`);
}
function Ra(e, t, n, r) {
	return e.filter((e) => t.some((t) => t.group === e.key && t.t >= n && t.t <= r));
}
var J = class extends D {
	constructor(...e) {
		super(...e), this.points = [], this.start = 0, this.end = 0, this.periodMs = 36e5, this.unit = "", this.band = null, this.markers = [], this.markerGroups = [], this.summary = "", this.bandLabel = "", this.actions = [], this.l = B, this._width = 600, this._active = null, this._pinned = !1, this._outside = (e) => {
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
		let t = this.l, n = (e) => I(t, Math.round(e * 10) / 10, this.unit), r = t.dateTime(new Date(e.t).toISOString());
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
		let n = t.width - q.left - q.right, r = this.start + (e - t.left - q.left) / n * (this.end - this.start), i = 0;
		for (let e = 1; e < this.points.length; e++) Math.abs(this.points[e].t - r) < Math.abs(this.points[i].t - r) && (i = e);
		return i;
	}
	_fire(e, t) {
		this._unpin(), this.dispatchEvent(new CustomEvent("point-action", {
			detail: {
				t: e,
				key: t
			},
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		let e = this.l, t = this.points, n = Math.max(this._width, 240), r = n - q.left - q.right, i = Ia - q.bottom, a = this.band, o = kn(t, [
			a?.min,
			a?.max,
			a?.target
		], this.unit), s = Math.max(this.end - this.start, 1), c = (e) => q.left + (e - this.start) / s * r, l = (e) => i - (Math.min(o.max, Math.max(o.min, e)) - o.min) / (o.max - o.min) * (i - q.top), u = (e, t) => `${c(e).toFixed(1)} ${l(t).toFixed(1)}`, d = Dn(t, this.periodMs), f = (e) => e != null && e >= o.min && e <= o.max, p = a && (a.min !== null || a.max !== null) ? l(a.max ?? o.max) : null, m = a && (a.min !== null || a.max !== null) ? l(a.min ?? o.min) : null, h = o.max >= 1e4, g = An(this.start, this.end, e.language), _ = Math.max(1, Math.ceil(g.length * 52 / r)), v = g.filter((e, t) => (g.length - 1 - t) % _ == 0), y = new Map(this.markerGroups.map((e) => [e.key, e])), b = this.markers.filter((e) => e.t >= this.start && e.t <= this.end && y.has(e.group)), x = Ra(this.markerGroups, this.markers, this.start, this.end), S = this._active === null ? void 0 : t[this._active], ee = t.some((e) => e.max - e.min >= .1), C = (e) => {
			this._pinned || (this._active = this._nearest(e.clientX));
		}, te = (e) => {
			let t = this._nearest(e.clientX);
			this._pinned && t === this._active ? this._unpin() : this._pin(t);
		}, ne = (e) => {
			e.key === "Enter" && t.length ? (e.preventDefault(), this._pin(this._active ?? t.length - 1)) : e.key === "Escape" && this._pinned && (e.stopPropagation(), this._unpin());
		}, re = this._pinned && S ? this.actions : [];
		return T`
      <div class="plot" @keydown=${ne}>
        <svg viewBox="0 0 ${n} ${Ia}" role="img" aria-label=${this.summary}
          @pointermove=${C} @pointerdown=${te} @pointerleave=${() => {
			this._pinned || (this._active = null);
		}}>
          ${p !== null && m !== null && m > p ? Se`<rect class="band" x=${q.left} y=${p} width=${r} height=${m - p}></rect>` : E}
          ${o.ticks.map((t) => Se`<line class="grid" x1=${q.left} x2=${n - q.right} y1=${l(t)} y2=${l(t)}></line>
            <text x=${q.left - 6} y=${l(t) + 4} text-anchor="end">${e.number(t, h ? { notation: "compact" } : {})}</text>`)}
          ${[a?.min, a?.max].filter(f).map((e) => Se`<line class="limit" x1=${q.left} x2=${n - q.right} y1=${l(e)} y2=${l(e)}></line>`)}
          ${f(a?.target) ? Se`<line class="limit target" x1=${q.left} x2=${n - q.right} y1=${l(a.target)} y2=${l(a.target)}></line>` : E}
          ${v.map((e) => Se`<text x=${c(e.t)} y=${194} text-anchor="middle">${e.label}</text>`)}
          ${ee ? d.filter((e) => e.length > 1).map((e) => Se`<path class="spread" d=${`M${e.map((e) => u(e.t, e.max)).join("L")}L${[...e].reverse().map((e) => u(e.t, e.min)).join("L")}Z`}></path>`) : E}
          ${d.map((e) => e.length > 1 ? Se`<path class="line" d=${`M${e.map((e) => u(e.t, e.mean)).join("L")}`}></path>` : Se`<circle class="marker-dot" style="fill: var(--sp-primary)" cx=${c(e[0].t)} cy=${l(e[0].mean)} r="2"></circle>`)}
          ${b.map((t) => {
			let n = y.get(t.group);
			return Se`<g><title>${n.label}: ${e.dateTime(new Date(t.t).toISOString())}</title><line class="marker" style=${`stroke: ${n.color}`} x1=${c(t.t)} x2=${c(t.t)} y1=${q.top + 6} y2=${i}></line><circle class="marker-dot" style=${`fill: ${n.color}`} cx=${c(t.t)} cy=${q.top + 3} r="3.5"></circle></g>`;
		})}
          ${S ? Se`<line class="cursor" x1=${c(S.t)} x2=${c(S.t)} y1=${q.top} y2=${i}></line><circle class="cursor-dot" cx=${c(S.t)} cy=${l(S.mean)} r="4"></circle>` : E}
        </svg>
        ${t.length ? T`<input class="sr-only" type="range" min="0" max=${t.length - 1} step="1" .value=${String(this._active ?? t.length - 1)}
          aria-label=${e.t("history.point_label")} aria-valuetext=${this._pointText(t[this._active ?? t.length - 1])}
          @input=${(e) => {
			this._active = Number(e.target.value);
		}} @blur=${() => {
			this._pinned || (this._active = null);
		}}>` : E}
      </div>
      <div class="readout-row" @keydown=${(e) => {
			e.key === "Escape" && this._pinned && (e.stopPropagation(), this._unpin());
		}}>
        <span class="readout" aria-hidden="true">${S ? this._pointText(S) : E}</span>
        ${re.map((e) => T`<button type="button" class="action" @click=${() => this._fire(S.t, e.key)}>${e.label}</button>`)}
      </div>
      <div class="legend">
        ${this.bandLabel ? T`<span><i class="key band"></i>${this.bandLabel}</span>` : E}
        ${ee ? T`<span><i class="key spread"></i>${e.t("history.legend_spread")}</span>` : E}
        ${x.map((e) => T`<span><i class="key marker" style=${`background: ${e.color}`}></i>${e.label}</span>`)}
      </div>`;
	}
};
Fa = J, Fa.styles = [
	G,
	_a,
	o`
    :host { display: block; color: var(--sp-text); }
    .plot { position: relative; border-radius: 4px; }
    .plot:focus-within { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
    svg { display: block; width: 100%; height: ${Ia}px; touch-action: pan-y; }
    text { font-size: 11px; fill: var(--sp-text-secondary); font-variant-numeric: tabular-nums; }
    .grid { stroke: color-mix(in srgb, var(--sp-text) 12%, transparent); stroke-width: 1; }
    .band { fill: color-mix(in srgb, var(--sp-success) 14%, transparent); }
    .limit { stroke: color-mix(in srgb, var(--sp-success) 60%, var(--sp-text)); stroke-width: 1; opacity: .7; }
    .target { stroke-dasharray: 4 4; }
    .spread { fill: color-mix(in srgb, var(--sp-primary) 16%, transparent); }
    .line { fill: none; stroke: var(--sp-primary); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .marker { stroke-width: 1.5; stroke-dasharray: 2 3; }
    .cursor { stroke: color-mix(in srgb, var(--sp-text) 45%, transparent); stroke-width: 1; }
    .cursor-dot { fill: var(--sp-card); stroke: var(--sp-primary); stroke-width: 2; }
    ${La()}
    .readout { font-size: 13px; font-variant-numeric: tabular-nums; }
    .action { padding: 2px 6px; border: 0; border-radius: 4px; background: none; color: var(--sp-primary); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; }
    .action:hover { background: color-mix(in srgb, var(--sp-primary) 10%, transparent); }
    .action:focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 1px; }
    .key.band { background: color-mix(in srgb, var(--sp-success) 30%, transparent); }
    .key.spread { background: color-mix(in srgb, var(--sp-primary) 30%, transparent); }
  `
], K([O({ attribute: !1 })], J.prototype, "points", void 0), K([O({ attribute: !1 })], J.prototype, "start", void 0), K([O({ attribute: !1 })], J.prototype, "end", void 0), K([O({ attribute: !1 })], J.prototype, "periodMs", void 0), K([O()], J.prototype, "unit", void 0), K([O({ attribute: !1 })], J.prototype, "band", void 0), K([O({ attribute: !1 })], J.prototype, "markers", void 0), K([O({ attribute: !1 })], J.prototype, "markerGroups", void 0), K([O()], J.prototype, "summary", void 0), K([O()], J.prototype, "bandLabel", void 0), K([O({ attribute: !1 })], J.prototype, "actions", void 0), K([O({ attribute: !1 })], J.prototype, "l", void 0), K([k()], J.prototype, "_width", void 0), K([k()], J.prototype, "_active", void 0), K([k()], J.prototype, "_pinned", void 0), customElements.get("sp-history-chart") || customElements.define("sp-history-chart", J);
// src/components/sp-snooze-chip.ts
var za, Ba = class extends D {
	constructor(...e) {
		super(...e), this.label = "";
	}
	render() {
		return T`<span class="chip" part="chip"><ha-icon aria-hidden="true" icon="mdi:bell-sleep-outline"></ha-icon><span class="label">${this.label}</span></span>`;
	}
};
za = Ba, za.styles = [G, o`
    :host { display: inline-flex; max-width: 100%; }
    .chip {
      display: inline-flex; align-items: center; gap: 5px; min-height: 26px; max-width: 100%;
      padding: 2px 10px 2px 7px; border-radius: 13px; font-size: 13px; font-weight: 500; line-height: 1.3;
      background: color-mix(in srgb, var(--sp-text) 8%, transparent);
      color: color-mix(in srgb, var(--sp-text-secondary) 60%, var(--sp-text));
    }
    ha-icon { --mdc-icon-size: 17px; flex: none; }
    .label { overflow-wrap: anywhere; hyphens: auto; }
  `], K([O()], Ba.prototype, "label", void 0), customElements.get("sp-snooze-chip") || customElements.define("sp-snooze-chip", Ba);
// src/components/sp-winter-icon.ts
var Va, Ha = class extends D {
	constructor(...e) {
		super(...e), this.label = "";
	}
	render() {
		return T`<span class="icon" part="icon" role="img" aria-label=${this.label} title=${this.label}><ha-icon aria-hidden="true" icon="mdi:snowflake"></ha-icon></span>`;
	}
};
Va = Ha, Va.styles = [G, o`
    :host { display: inline-flex; }
    .icon {
      display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 13px;
      background: color-mix(in srgb, var(--sp-info) 14%, transparent); color: var(--sp-info);
    }
    ha-icon { --mdc-icon-size: 17px; }
  `], K([O()], Ha.prototype, "label", void 0), customElements.get("sp-winter-icon") || customElements.define("sp-winter-icon", Ha);
// node_modules/@lazy-ease/core/dist/numbers.js
function Ua(e) {
	if (!Number.isFinite(e)) throw RangeError(`Cannot format ${e} for a URL`);
	return Math.abs(e) >= 1e21 ? BigInt(e).toString() : String(Number(e.toFixed(3)));
}
// node_modules/@lazy-ease/core/dist/focal.js
var Wa = (e, t, n) => Math.min(n, Math.max(t, e));
function Ga(e) {
	if (!e || !Number.isFinite(e.x) || !Number.isFinite(e.y)) return;
	let t = Wa(Math.round(e.x), 0, 100), n = Wa(Math.round(e.y), 0, 100);
	return t === 50 && n === 50 ? void 0 : {
		x: t,
		y: n
	};
}
function Ka(e) {
	return `${e.x}% ${e.y}%`;
}
// node_modules/@lazy-ease/core/dist/source.js
var qa = "lazy-ease.invalid", Ja = {
	"http:": "80",
	"https:": "443"
};
function Ya(e) {
	try {
		return new URL(e, `http://${qa}`);
	} catch {
		return;
	}
}
function Xa(e, t = []) {
	e = e.trim();
	let n = e ? Ya(e) : void 0;
	if (!n) return !1;
	if (!/^[a-z][a-z\d+.-]*:/i.test(e)) return n.host === qa;
	let r = Ja[n.protocol];
	return !!r && t.some((e) => {
		let t = Ya(`http://${e = e.trim()}`), i = /:(\d+)$/.exec(e)?.[1];
		return t?.pathname === "/" && !(t.search || t.hash || t.username || t.password) && t.hostname === n.hostname && (i === void 0 || +i == +(n.port || r));
	});
}
function Za(e, t) {
	return /^\s*data:image\/(svg\+xml|gif)[;,]/i.test(e) || !Xa(e, t) ? !0 : /\.(svg|gif)$/i.test(Ya(e.trim()).pathname);
}
// node_modules/@lazy-ease/core/dist/styles.js
var Qa = (e) => `url("${e.replace(/["\\\n\r]/g, encodeURIComponent)}")`, $a = /[;{}<>"'\\\n\r]|url\(/i;
function eo(e, t) {
	let n = e.trim();
	return n === "none" ? { style: {} } : /^data:/i.test(n) ? { style: {
		backgroundImage: Qa(n),
		backgroundSize: "cover"
	} } : /^thumbhash:/i.test(n) ? t?.(n.slice(10)) : n && !$a.test(n) ? { style: { backgroundColor: n } } : void 0;
}
// node_modules/@lazy-ease/core/dist/dom/guard.js
var to = (e, ...t) => {
	try {
		return e?.(...t);
	} catch (e) {
		setTimeout(() => {
			throw e;
		});
	}
}, no = [];
function ro(e, t, n, r, i) {
	let a = no.find((n) => n.root === e && n.margin === t);
	if (!a) {
		let n = /* @__PURE__ */ new Map();
		no.push(a = {
			root: e,
			margin: t,
			callbacks: n,
			observer: i(n)
		});
	}
	let { observer: o, callbacks: s } = a, c = (...e) => to(r, ...e), l = s.get(n);
	return l ? o.unobserve(n) : s.set(n, l = /* @__PURE__ */ new Set()), l.add(c), o.observe(n), () => {
		l.delete(c) && !l.size && (s.delete(n), o.unobserve(n), s.size || (o.disconnect(), no.splice(no.indexOf(a), 1)));
	};
}
function io(e, { root: t = null, rootMargin: n = "400px", dwellTime: r = 0 }, i) {
	if (typeof IntersectionObserver != "function") return i(), () => {};
	let a, o = () => {
		s(), i();
	}, s = ro(t, n, e, (e) => {
		e ? a || (r > 0 ? a = setTimeout(o, r) : o()) : (clearTimeout(a), a = void 0);
	}, (e) => new IntersectionObserver((t) => {
		for (let n of t) e.get(n.target)?.forEach((e) => e(n.isIntersecting));
	}, {
		root: t,
		rootMargin: n,
		scrollMargin: n
	}));
	return () => {
		clearTimeout(a), s();
	};
}
function ao(e, t) {
	return typeof ResizeObserver == "function" ? ro(void 0, void 0, e, t, (e) => new ResizeObserver((t) => {
		for (let { target: n, contentRect: r } of t) e.get(n)?.forEach((e) => e(r.width, r.height));
	})) : () => {};
}
// node_modules/@lazy-ease/core/dist/dom/controller.js
var oo = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", so = [
	"backgroundColor",
	"backgroundImage",
	"backgroundSize",
	"backgroundPosition"
], co = ["opacity", "transition"], lo = [
	"sizes",
	"srcset",
	"src"
], uo = (e) => e.style, fo = (e, t) => {
	for (let n of t) uo(e)[n] = "";
}, po = (e) => e.priority || e.loading === "native", mo = (e, t) => JSON.stringify([
	e.src,
	e.srcset,
	e.url,
	e.version,
	...[...t].map((e) => e.getAttribute("data-le-srcset"))
]), ho = (e) => JSON.stringify(e, (e, t) => e == "root" || e == "loader" ? void 0 : t);
function go(e, t, n) {
	let r = (r, i) => {
		let a = {
			rootMargin: "400px",
			fadeDuration: 400,
			decodeTimeout: 250,
			quality: 75,
			...e
		};
		for (let e in r) {
			let t = r[e];
			t !== void 0 && (a[e] = t);
		}
		let o = +(a.src !== void 0) + +(a.srcset !== void 0 || a.url !== void 0), s = a.focalPoint, c = (po(a) ? o : o - 1) ? "needs exactly one of src, srcset/url or native" : a.sizes !== void 0 && a.srcset === void 0 ? "sizes needs srcset" : a.src !== void 0 && !(t && a.loader) && !Za(a.src, a.domains) ? n : a.height !== void 0 && (a.width === void 0 || a.aspectRatio !== void 0) ? "height needs width and no aspectRatio" : a.fill && (a.width ?? a.height) !== void 0 ? "fill excludes width and height" : a.crop === "browser" && !(a.srcWidth && a.srcHeight) ? "browser crop needs srcWidth and srcHeight" : s && !(isFinite(s.x) && isFinite(s.y)) ? "focalPoint needs finite x and y" : a.placeholder !== void 0 && !eo(a.placeholder, a.thumbhash) ? "invalid placeholder" : "";
		if (c) throw TypeError(`[lazy-ease] ${c}`);
		return i && !po(a) && a.loading !== "eager" && io(i, a, () => {})(), a;
	};
	return {
		config: e,
		attach(e, n = {}) {
			let i = r(n), a = Symbol.for("lazy-ease.attachment"), o = e;
			if (o[a]) throw Error("[lazy-ease] The image is already attached");
			let s = o[a] = {}, c = Symbol.for("lazy-ease.target"), l = e, u = e.closest("[data-le]") ?? e, d = u === e ? void 0 : u, f = u, p = (t) => e.getAttribute(t), m = p("src"), h = m?.startsWith("data:") && m !== l[c]?.[1] ? m : l[c]?.[2] ?? oo, g = () => e.parentElement?.tagName === "PICTURE" ? [...e.parentElement.querySelectorAll(":scope>source[data-le-srcset]")] : [], _ = so.map((e) => uo(f)[e]), v = () => {
				fo(e, co), so.forEach((e, t) => uo(f)[e] = _[t]);
			}, y = (t = e) => lo.map((e) => t.getAttribute(e)), b = (t, n = e) => lo.forEach((e, r) => {
				let i = t[r];
				i == null ? n.removeAttribute(e) : n.getAttribute(e) !== i && n.setAttribute(e, i);
			}), x, S, ee = (t) => {
				x !== t && (x = t, u.setAttribute("data-state", t), to(i.onStateChange, t, e));
			}, C = u.getAttribute("data-state"), te = () => {
				S?.(), S = void 0, o[a] === s && delete o[a];
			}, ne = () => {
				let n = g(), r = [e, ...n].map((e) => [e, y(e)]), a = l[c], o = !0;
				try {
					let r = po(i), s = r ? oo : h, u = p("src"), m = e.hasAttribute("srcset") || (r ? (u ?? oo) !== oo : u != null && (u === a?.[1] || !u.startsWith("data:"))), _ = r ? void 0 : mo(i, n);
					if (m && _ && a && a[0] !== _) {
						b([
							null,
							null,
							h
						]);
						for (let e of n) e.removeAttribute("srcset"), e.hasAttribute("data-le-sizes") && e.removeAttribute("sizes");
						m = !1;
					}
					l[c] = m && _ ? [
						_,
						u?.startsWith("data:") && u !== a?.[1] ? void 0 : u,
						h
					] : void 0;
					let v = r || m, C = !1, te = !1, ne, re, ie, ae, w = /* @__PURE__ */ new Map(), oe = () => {}, se = /* @__PURE__ */ new Set(), ce = [], le = (e, t) => {
						let n = setTimeout(() => {
							se.delete(n), e();
						}, t);
						return se.add(n), n;
					}, ue = (e) => {
						clearTimeout(e), se.delete(e);
					}, de = (t, n) => {
						e.addEventListener(t, n), ce.push(() => e.removeEventListener(t, n));
					}, fe = i.fadeDuration;
					S = () => o = !1;
					let pe = i.placeholder ? eo(i.placeholder, i.thumbhash) : void 0;
					if (!o) return;
					let me = i.fill ? "fill" : i.height === void 0 ? i.aspectRatio === void 0 ? "intrinsic" : "ratio" : "fixed", he = me === "intrinsic" ? void 0 : Ga(i.focalPoint), ge = (e) => {
						fo(f, so), Object.assign(f.style, he && e.backgroundImage ? {
							...e,
							backgroundPosition: Ka(he)
						} : e);
					};
					pe && ge(pe.style);
					let _e = () => fe <= 0 || matchMedia("(prefers-reduced-motion: reduce)").matches, ve = 0, ye = () => {}, be = () => {
						re?.cancel(), ie?.cancel(), fo(e, co), fo(f, so);
					}, xe = (t) => {
						if (C = !0, ye(), ne = y(), ee("loaded"), o) {
							if (e.style.opacity !== "0" || _e()) be();
							else {
								if (i.reveal) {
									let t = to(i.reveal, ve);
									if (!o) return;
									t && (ae = re = e.animate?.(t, fe));
								}
								if (ae || (re = e.animate?.({
									opacity: [0, 1],
									easing: "ease-out"
								}, fe)), Object.assign(e.style, {
									transition: `opacity ${fe}ms ease-out`,
									opacity: "1"
								}), (pe ?? i).transparent) {
									let [e, t] = ae ? [.25, .6] : [.4, .8], { backgroundImage: n, backgroundColor: r } = f.style;
									ie = f.animate?.({
										...n && { backgroundImage: `url(${oo})` },
										...r && { backgroundColor: "transparent" }
									}, {
										duration: (t - e) * fe,
										delay: e * fe,
										fill: "forwards"
									});
								}
								le(be, fe);
							}
							to(i.onDisplay, e, t);
						}
					}, T = () => {
						ye(), be(), ee("error");
					};
					de("load", (t) => {
						if (v && e.currentSrc !== s) {
							if (C) ne = y();
							else if (r) xe(t);
							else {
								let n = e.currentSrc;
								new Promise((t) => {
									e.decode().then(() => t(!0), () => t(!1)), le(() => t(!0), i.decodeTimeout);
								}).then((r) => {
									o && !C && e.currentSrc === n && (r ? xe(t) : T());
								});
							}
						}
					}), de("error", () => {
						v && (C ? ne && y().some((e, t) => e !== ne[t]) && b(ne) : T());
					});
					let Se = (t, n, r) => {
						let i = [
							t && n,
							t,
							r ?? p("src")
						];
						if (l[c] = [
							_,
							r,
							h
						], !(x === "error" && e.parentElement?.tagName !== "PICTURE" && y().every((e, t) => e === (i[t] ?? null))) && (!v && d && (e.style.opacity = "0", te = !0), v = !0, C || ee("loading"), o)) {
							for (let e of g()) {
								w.has(e) || w.set(e, y(e));
								let t = e.getAttribute("data-le-sizes");
								t !== null && e.setAttribute("sizes", t), e.setAttribute("srcset", e.getAttribute("data-le-srcset"));
							}
							b(i);
						}
					}, Ce = () => {
						if (pe?.lazy && !C) {
							let e = to(pe.lazy);
							if (!o) return;
							e && ge(e);
						}
						i.src === void 0 ? Se(i.srcset, i.sizes, i.url) : Za(i.src, i.domains) ? Se(void 0, void 0, i.src) : oe = t(i.src, i, me, he, e, d, f, () => o, le, ue, ce, Se);
					};
					if (S = (t) => {
						if (t && mo(t, g()) === _ && ho(t) === ho(i) && t.root === i.root && t.loader === i.loader) return i = t;
						o = !1, ce.forEach((e) => e()), se.forEach(clearTimeout), C ? be() : te && fo(e, co), t && (oe(), po(t) || (b([
							null,
							null,
							h
						]), l[c] = void 0, w.forEach((e, t) => b(e, t))));
					}, m && e.complete ? e.naturalWidth > 0 ? xe() : T() : ee(m ? "loading" : "idle"), !o) return;
					i.reveal && d && !r && !(m && e.complete) && !_e() && ce.push(ye = ao(d, (e, t) => ve = e > t ? e : t)), r ? i.priority && (e.setAttribute("fetchpriority", "high"), e.setAttribute("loading", "eager")) : i.loading === "eager" ? Ce() : ce.push(io(f, i, Ce));
				} catch (e) {
					throw o && (te(), r.forEach(([e, t]) => b(t, e)), l[c] = a, v(), C === null ? u.removeAttribute("data-state") : u.setAttribute("data-state", C)), e;
				}
			};
			return ne(), {
				get state() {
					return x;
				},
				update(t) {
					let n = r(t, e);
					S && !S(n) && (v(), i = n, ne());
				},
				destroy: te
			};
		}
	};
}
// node_modules/@lazy-ease/core/dist/prepared.js
function _o(e = {}) {
	return go(e, void 0, "src needs createLazyEase from @lazy-ease/core");
}
// node_modules/@lazy-ease/core/dist/thumbhash.js
var vo = /^[A-Za-z0-9+/_-]+={0,2}$/, yo = 256;
function bo(e) {
	if (!vo.test(e)) return;
	let t;
	try {
		t = atob(e.replace(/-/g, "+").replace(/_/g, "/"));
	} catch {
		return;
	}
	let n = Uint8Array.from(t, (e) => e.charCodeAt(0));
	if (!(n.length < 5 || Co(n) && n.length < 6)) return n;
}
function xo(e) {
	let t = e.indexOf(",");
	if (!/^data:image\/png;base64,/i.test(e.slice(0, t + 1))) return;
	let n;
	try {
		n = atob(e.slice(t + 1, t + 33));
	} catch {
		return;
	}
	if (n.length < 24 || n.slice(12, 16) !== "IHDR") return;
	let r = (e) => [
		0,
		1,
		2,
		3
	].reduce((t, r) => t * 256 + n.charCodeAt(e + r), 0), i = [r(16), r(20)];
	return i[0] && i[1] ? i : void 0;
}
function So(e, t, n) {
	let r = t > 0 && xo(e);
	if (!r) return e;
	let [i, a] = r;
	return `data:image/svg+xml,${`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${i} ${a}'><filter id='b' color-interpolation-filters='sRGB'><feGaussianBlur stdDeviation='${Ua(t / 100 * Math.max(i, a))}'/>` + (n ? "" : "<feComponentTransfer><feFuncA type='discrete' tableValues='1 1'/></feComponentTransfer>") + `</filter><image width='${i}' height='${a}' preserveAspectRatio='none' filter='url(%23b)' href='${e}'/></svg>`}`;
}
var Co = (e) => e[2] >> 7 == 1, wo = (e) => Math.round(Math.max(0, Math.min(1, e)) * 255);
function To(e, t = {}) {
	let { blur: n = 8 } = t;
	if (!Number.isFinite(n) || n < 0) throw RangeError("[lazy-ease] thumbhash blur must be a finite number from 0");
	let r = /* @__PURE__ */ new Map();
	return (t) => {
		let i = bo(t);
		if (!i) return;
		let { r: a, g: o, b: s, a: c } = e.thumbHashToAverageRGBA(i), l = [
			a,
			o,
			s
		].map(wo), u = c >= 1 ? `#${l.map((e) => e.toString(16).padStart(2, "0")).join("")}` : `rgba(${l.join(", ")}, ${Ua(c)})`, d = Co(i);
		return {
			style: { backgroundColor: u },
			transparent: d,
			lazy: () => {
				let a = r.get(t);
				if (!a) {
					let o = {
						backgroundImage: Qa(So(e.thumbHashToDataURL(i), n, d)),
						backgroundSize: "cover"
					};
					a = d ? o : {
						backgroundColor: u,
						...o
					}, r.size >= yo && r.delete(r.keys().next().value), r.set(t, a);
				}
				return a;
			}
		};
	};
}
// node_modules/@lazy-ease/vanilla/dist/css.js
var Eo = ":where([data-le]:not(img)){display:block;overflow:hidden;background-size:cover;background-position:50%;background-repeat:no-repeat}:where([data-le]) :where(picture){display:contents}:where([data-le]) :where(img){display:block;width:100%;height:100%;object-fit:cover}:where([data-le]:not([data-state=error]) img,img[data-le]:not([data-state=error])):where([data-le-src],[data-le-srcset],[data-le-url]){color:transparent}\n";
// node_modules/thumbhash/thumbhash.js
function Do(e) {
	let { PI: t, min: n, max: r, cos: i, round: a } = Math, o = e[0] | e[1] << 8 | e[2] << 16, s = e[3] | e[4] << 8, c = (o & 63) / 63, l = (o >> 6 & 63) / 31.5 - 1, u = (o >> 12 & 63) / 31.5 - 1, d = (o >> 18 & 31) / 31, f = o >> 23, p = (s >> 3 & 63) / 63, m = (s >> 9 & 63) / 63, h = s >> 15, g = r(3, h ? f ? 5 : 7 : s & 7), _ = r(3, h ? s & 7 : f ? 5 : 7), v = f ? (e[5] & 15) / 15 : 1, y = (e[5] >> 4) / 15, b = f ? 6 : 5, x = 0, S = (t, n, r) => {
		let i = [];
		for (let a = 0; a < n; a++) for (let o = +!a; o * n < t * (n - a); o++) i.push(((e[b + (x >> 1)] >> ((x++ & 1) << 2) & 15) / 7.5 - 1) * r);
		return i;
	}, ee = S(g, _, d), C = S(3, 3, p * 1.25), te = S(3, 3, m * 1.25), ne = f && S(5, 5, y), re = ko(e), ie = a(re > 1 ? 32 : 32 * re), ae = a(re > 1 ? 32 / re : 32), w = new Uint8Array(ie * ae * 4), oe = [], se = [];
	for (let e = 0, a = 0; e < ae; e++) for (let o = 0; o < ie; o++, a += 4) {
		let s = c, d = l, p = u, m = v;
		for (let e = 0, n = r(g, f ? 5 : 3); e < n; e++) oe[e] = i(t / ie * (o + .5) * e);
		for (let n = 0, a = r(_, f ? 5 : 3); n < a; n++) se[n] = i(t / ae * (e + .5) * n);
		for (let e = 0, t = 0; e < _; e++) for (let n = +!e, r = se[e] * 2; n * _ < g * (_ - e); n++, t++) s += ee[t] * oe[n] * r;
		for (let e = 0, t = 0; e < 3; e++) for (let n = +!e, r = se[e] * 2; n < 3 - e; n++, t++) {
			let e = oe[n] * r;
			d += C[t] * e, p += te[t] * e;
		}
		if (f) for (let e = 0, t = 0; e < 5; e++) for (let n = +!e, r = se[e] * 2; n < 5 - e; n++, t++) m += ne[t] * oe[n] * r;
		let h = s - 2 / 3 * d, y = (3 * s - h + p) / 2, b = y - p;
		w[a] = r(0, 255 * n(1, y)), w[a + 1] = r(0, 255 * n(1, b)), w[a + 2] = r(0, 255 * n(1, h)), w[a + 3] = r(0, 255 * n(1, m));
	}
	return {
		w: ie,
		h: ae,
		rgba: w
	};
}
function Oo(e) {
	let { min: t, max: n } = Math, r = e[0] | e[1] << 8 | e[2] << 16, i = (r & 63) / 63, a = (r >> 6 & 63) / 31.5 - 1, o = (r >> 12 & 63) / 31.5 - 1, s = r >> 23 ? (e[5] & 15) / 15 : 1, c = i - 2 / 3 * a, l = (3 * i - c + o) / 2, u = l - o;
	return {
		r: n(0, t(1, l)),
		g: n(0, t(1, u)),
		b: n(0, t(1, c)),
		a: s
	};
}
function ko(e) {
	let t = e[3], n = e[2] & 128, r = e[4] & 128;
	return (r ? n ? 5 : 7 : t & 7) / (r ? t & 7 : n ? 5 : 7);
}
function Ao(e, t, n) {
	let r = e * 4 + 1, i = 6 + t * (5 + r), a = [
		137,
		80,
		78,
		71,
		13,
		10,
		26,
		10,
		0,
		0,
		0,
		13,
		73,
		72,
		68,
		82,
		0,
		0,
		e >> 8,
		e & 255,
		0,
		0,
		t >> 8,
		t & 255,
		8,
		6,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		i >>> 24,
		i >> 16 & 255,
		i >> 8 & 255,
		i & 255,
		73,
		68,
		65,
		84,
		120,
		1
	], o = [
		0,
		498536548,
		997073096,
		651767980,
		1994146192,
		1802195444,
		1303535960,
		1342533948,
		-306674912,
		-267414716,
		-690576408,
		-882789492,
		-1687895376,
		-2032938284,
		-1609899400,
		-1111625188
	], s = 1, c = 0;
	for (let e = 0, i = 0, o = r - 1; e < t; e++, o += r - 1) for (a.push(e + 1 < t ? 0 : 1, r & 255, r >> 8, ~r & 255, r >> 8 ^ 255, 0), c = (c + s) % 65521; i < o; i++) {
		let e = n[i] & 255;
		a.push(e), s = (s + e) % 65521, c = (c + s) % 65521;
	}
	a.push(c >> 8, c & 255, s >> 8, s & 255, 0, 0, 0, 0, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130);
	for (let [e, t] of [[12, 29], [37, 41 + i]]) {
		let n = -1;
		for (let r = e; r < t; r++) n ^= a[r], n = n >>> 4 ^ o[n & 15], n = n >>> 4 ^ o[n & 15];
		n = ~n, a[t++] = n >>> 24, a[t++] = n >> 16 & 255, a[t++] = n >> 8 & 255, a[t++] = n & 255;
	}
	return "data:image/png;base64," + btoa(String.fromCharCode(...a));
}
function jo(e) {
	let t = Do(e);
	return Ao(t.w, t.h, t.rgba);
}
// src/components/sp-plant-photo.ts
var Mo, No = To({
	thumbHashToAverageRGBA: Oo,
	thumbHashToDataURL: jo
}), Po = _o({ thumbhash: No }), Fo = { rootMargin: "400px" }, Io = 150, Lo = [
	"backgroundColor",
	"backgroundImage",
	"backgroundSize"
], Ro = /* @__PURE__ */ new Set(), zo = class extends D {
	constructor(...e) {
		super(...e), this.photoId = null, this.photo = null, this.thumbhash = null, this.name = "", this.size = "small", this.l = B, this._url = null, this._urlFor = null, this._watched = null, this._near = !1, this._painted = null;
	}
	connectedCallback() {
		super.connectedCallback(), this.hasUpdated && this._sync();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), queueMicrotask(() => {
			this.isConnected || (this._unwatch?.(), this._unwatch = void 0, this._watched = null, this._near = !1, this._release());
		});
	}
	render() {
		return T`<div class="tile" part="tile" data-le>${this.photoId && this.photo ? T`<img alt=${this.l.t("photo.alt", { name: this.name })}>` : this.photoId && this.thumbhash ? "" : T`<ha-icon aria-hidden="true" icon="mdi:sprout"></ha-icon>`}</div>`;
	}
	updated() {
		this._sync();
	}
	_tile() {
		return this.renderRoot.querySelector(".tile");
	}
	_sync() {
		if (!this.isConnected) return;
		let e = this.photoId, t = this._tile();
		e !== this._watched && (this._unwatch?.(), this._unwatch = void 0, this._watched = e, e && t && (this._near ? this._want(e) : this._unwatch = io(t, Fo, () => {
			this._unwatch = void 0, this._near = !0, this._want(e);
		})));
		let n = this.renderRoot.querySelector("img");
		if (!e || !this.photo || !n) {
			let t = this._url !== null;
			this._release(), this._paint(e ? this.thumbhash : null), t && e && e === this._watched && this._near && this._want(e);
		} else e === this._urlFor && this._attachment || this._show(n, e, this.photo);
	}
	_want(e) {
		this.photoId === e && (this.photo || this._paint(this.thumbhash), this.dispatchEvent(new CustomEvent("photo-wanted", {
			detail: { photoId: e },
			bubbles: !0,
			composed: !0
		})));
	}
	_show(e, t, n) {
		let r = URL.createObjectURL(n), i = {
			url: r,
			loading: "eager",
			fadeDuration: Ro.has(t) ? 0 : Io,
			onDisplay: () => {
				this._url === r && Ro.add(t);
			},
			onStateChange: (e) => {
				e === "error" && this._url === r && this.dispatchEvent(new CustomEvent("photo-error", {
					bubbles: !0,
					composed: !0
				}));
			}
		};
		this.thumbhash && No(this.thumbhash) && (i.placeholder = `thumbhash:${this.thumbhash}`), this._clearPaint();
		let a = this._url;
		this._url = r, this._urlFor = t, this._attachment ? this._attachment.update(i) : this._attachment = Po.attach(e, i), a && URL.revokeObjectURL(a);
	}
	_release() {
		this._attachment && (this._attachment.destroy(), this._attachment = void 0, this._clearPaint()), this._url && URL.revokeObjectURL(this._url), this._url = null, this._urlFor = null;
	}
	_paint(e) {
		let t = e ? `${e}:${this._near}` : null;
		if (t === this._painted) return;
		this._clearPaint();
		let n = e ? No(e) : void 0, r = this._tile();
		n && r && (this._painted = t, Object.assign(r.style, n.style, this._near ? n.lazy?.() : void 0));
	}
	_clearPaint() {
		let e = this._tile();
		if (e) for (let t of Lo) e.style[t] = "";
		this._painted = null;
	}
};
Mo = zo, Mo.styles = [
	G,
	a(Eo),
	ja
], K([O({ attribute: !1 })], zo.prototype, "photoId", void 0), K([O({ attribute: !1 })], zo.prototype, "photo", void 0), K([O({ attribute: !1 })], zo.prototype, "thumbhash", void 0), K([O()], zo.prototype, "name", void 0), K([O({ reflect: !0 })], zo.prototype, "size", void 0), K([O({ attribute: !1 })], zo.prototype, "l", void 0), customElements.get("sp-plant-photo") || customElements.define("sp-plant-photo", zo);
// src/photo-retry.ts
var Bo = 3e4;
function Vo(e, t = Date.now()) {
	return e >= 5 ? null : t + Bo * 2 ** (e - 1);
}
function Ho() {
	return new DOMException("The photo request was cancelled.", "AbortError");
}
var Uo = new class {
	constructor(e = 4) {
		this._limit = e, this._running = 0, this._waiting = [];
	}
	get running() {
		return this._running;
	}
	get waiting() {
		return this._waiting.length;
	}
	run(e, t, n = !1) {
		return t.aborted ? Promise.reject(Ho()) : new Promise((r, i) => {
			let a = {
				start: () => {
					t.removeEventListener("abort", a.drop), this._running++;
					let n = !1, o = () => {
						n || (n = !0, t.removeEventListener("abort", o), this._running--, queueMicrotask(() => this._next()));
					};
					t.addEventListener("abort", o, { once: !0 });
					let s;
					try {
						s = e();
					} catch (e) {
						s = Promise.reject(e);
					}
					s.then(r, i).finally(o);
				},
				drop: () => {
					let e = this._waiting.indexOf(a);
					e >= 0 && this._waiting.splice(e, 1), i(Ho());
				}
			};
			this._running < this._limit ? a.start() : (t.addEventListener("abort", a.drop, { once: !0 }), n ? this._waiting.unshift(a) : this._waiting.push(a));
		});
	}
	_next() {
		for (; this._running < this._limit && this._waiting.length;) this._waiting.shift().start();
	}
}();
// src/ha-elements.ts
function Y(e, t = customElements) {
	return t.get(e) !== void 0;
}
// src/care-plan.ts
var Wo = [
	"fertilize",
	"prune",
	"repot",
	"pests",
	"winter_protection",
	"custom"
], Go = {
	fertilize: "mdi:flask-outline",
	prune: "mdi:content-cut",
	repot: "mdi:pot-mix-outline",
	pests: "mdi:bug-outline",
	winter_protection: "mdi:snowflake",
	custom: "mdi:checkbox-marked-circle-outline"
}, Ko = {
	fertilize: "fertilizing",
	prune: "pruning",
	repot: "repotting",
	pests: "task",
	winter_protection: "task",
	custom: "task"
}, qo = {
	temperature: "°C",
	soil_temperature: "°C",
	humidity: "%",
	moisture: "%",
	illuminance: "lx",
	conductivity: "µS/cm",
	co2: "ppm"
}, Jo = Object.keys(qo), Yo = [
	24,
	48,
	72
], Xo = [
	"days",
	"weeks",
	"months",
	"years"
], Zo = 4e3, Qo = {
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
function $o(e, t) {
	return t.name ?? e.t(`care_task_type.${t.type}`);
}
function es(e, t) {
	let n = [];
	for (let r = e;; r = r % 12 + 1) if (n.push(r), r === t || n.length === 12) return n;
}
function ts(e, t, n = "long") {
	return new Intl.DateTimeFormat(e.language, {
		month: n,
		timeZone: "UTC"
	}).format(Date.UTC(2e3, t - 1, 1));
}
function ns(e, t, n, r = "long") {
	return t === n ? ts(e, t, r) : e.t("care_plan.month_range", {
		start: ts(e, t, r),
		end: ts(e, n, r)
	});
}
function rs(e, t, n) {
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
function is(e, t, n, r) {
	if (t.kind === "reading") return e.t("care_plan.schedule_reading", {
		rule: as(e, t),
		source: cs(e, t.source, r)
	});
	if (t.kind === "yearly") return e.t("care_plan.schedule_yearly", { months: ns(e, t.start_month, t.end_month) });
	let i = e.tn(t.every, `care_plan.every_${t.unit}_one`, `care_plan.every_${t.unit}_other`);
	return t.growing_season_only && n ? e.t("care_plan.schedule_growing_only", { every: i }) : i;
}
function as(e, t) {
	let n = ss(e, t.value, t.unit);
	if (!("forecast" in t.source)) return e.t(`care_plan.condition_${t.condition}`, { value: n });
	let { reading: r, hours: i } = t.source.forecast, a = e.t(`care_plan.forecast_rule_${r}_${t.condition}`, { value: n });
	return i === 24 ? a : `${a} · ${ls(e, i)}`;
}
function os(e) {
	return Object.hasOwn(qo, e);
}
function ss(e, t, n) {
	return I(e, t, n ?? "");
}
function cs(e, t, n) {
	if ("role" in t) return os(t.role) ? F(e, t.role) : t.role;
	let r = "forecast" in t ? t.forecast.entity_id : t.entity_id, i = n?.[r]?.attributes.friendly_name;
	return typeof i == "string" && i.trim() ? i : r;
}
function ls(e, t) {
	return e.t(t === 72 ? "care_plan.forecast_window_72" : t === 48 ? "care_plan.forecast_window_48" : "care_plan.forecast_window_24");
}
function us(e) {
	let t = e?.attributes.supported_features;
	return !!e && e.entity_id.startsWith("weather.") && typeof t == "number" && Number.isInteger(t) && !!(t & 7);
}
function ds(e, t) {
	let n = (n) => cs(e, { entity_id: n.entity_id }, t);
	return Object.values(t ?? {}).filter(us).sort((e, t) => n(e).localeCompare(n(t)) || e.entity_id.localeCompare(t.entity_id));
}
function fs(e, t) {
	let n = t?.[e]?.attributes.temperature_unit;
	return typeof n == "string" && _s.has(n) ? n : null;
}
function ps(e, t) {
	return e.mode === "reading" && !e.role && !e.entityId && !!e.forecast && !!e.weatherEntityId && !!t && Object.keys(t).length > 0 && !t[e.weatherEntityId];
}
function ms(e, t, n, r) {
	let i = e.care_tasks?.find((e) => e.id === n)?.schedule, a = t?.care.find((e) => e.task_id === n);
	if (i?.kind !== "reading" || !("forecast" in i.source) || !a || a.reading === null) return null;
	let o = i.source.forecast;
	return o.entity_id !== r.entity_id || o.hours !== r.hours || o.reading !== r.reading ? null : {
		value: a.reading,
		unit: a.unit ?? i.unit
	};
}
function hs(e, t, n) {
	if (t.kind !== "reading" || !("forecast" in t.source) || !e.forecast_until) return null;
	let r = Date.parse(e.forecast_until);
	return Number.isFinite(r) && r < n + (t.source.forecast.hours - 1) * 36e5 ? e.forecast_until : null;
}
function gs(e, t, n) {
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
var _s = /* @__PURE__ */ new Set([
	"°C",
	"°F",
	"K"
]);
function vs(e, t) {
	return e ? "role" in e ? e.role === "temperature" || e.role === "soil_temperature" : "forecast" in e || t?.[e.entity_id]?.attributes.device_class === "temperature" : !1;
}
function ys(e, t) {
	let n = t === "°C" ? e : t === "°F" ? e * 9 / 5 + 32 : t === "K" ? e + 273.15 : null;
	return n === null ? null : Math.round(n * 10) / 10;
}
function bs(e) {
	let t = e.species?.snapshot, n = t?.provider === "openplantbook" ? t.min_temperature : null;
	return typeof n == "number" && Number.isFinite(n) ? n : null;
}
function xs(e, t, n) {
	let r = bs(e), i = Ks(t);
	return r === null || t.mode !== "reading" || t.condition !== "below" || !vs(i, n) || i && "forecast" in i && i.forecast.reading !== "low" ? null : ys(r, t.readingUnit ?? "°C");
}
function Ss(e) {
	let t = e.roles;
	return Jo.filter((e) => {
		let n = t?.[e];
		return Array.isArray(n?.sources) && n.sources.length > 0;
	});
}
function Cs(e) {
	return !!e && e.entity_id.startsWith("sensor.") && e.state.trim() !== "" && Number.isFinite(Number(e.state));
}
function ws(e, t, n, r) {
	let i = t && "forecast" in t ? t.forecast : null, a = {
		role: t && "role" in t ? t.role : null,
		entityId: t && "entity_id" in t ? t.entity_id : null,
		forecast: i?.reading ?? null,
		weatherEntityId: i?.entity_id ?? null,
		readingUnit: n
	};
	i && (a.forecastHours = i.hours);
	let o = bs(r), s = o === null ? null : ys(o, e.readingUnit ?? "°C"), c = o === null ? null : ys(o, n);
	return s !== null && c !== null && s !== c && Gs(e.value) === s && (a.value = String(c)), a;
}
function Ts(e, t) {
	if ("role" in e) return os(e.role) ? qo[e.role] : null;
	if ("forecast" in e) return fs(e.forecast.entity_id, t);
	let n = t?.[e.entity_id]?.attributes.unit_of_measurement;
	return typeof n == "string" && n ? n : null;
}
function Es(e, t, n) {
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
function Ds(e, t, n, r, i, a) {
	let o = "forecast" in n.source, s = t.reading === null ? null : ss(e, t.reading, t.unit ?? n.unit), c = s !== null && o ? e.t("care_plan.forecast_value", { value: s }) : s;
	switch (t.status) {
		case "due":
		case "overdue": return {
			tone: "care",
			icon: "mdi:alert-circle-outline",
			text: c ? e.t("care_plan.reading_due", { reading: c }) : e.t("care_plan.due_now")
		};
		case "waiting": {
			let t = n.reset_value ?? n.value, o = t === n.value && _s.has(n.unit ?? "") ? e.t(n.condition === "below" ? "care_plan.reading_still_cold" : "care_plan.reading_still_warm") : e.t(n.condition === "below" ? "care_plan.reading_until_above" : "care_plan.reading_until_below", { value: ss(e, t, n.unit) }), s = i ? ks(i, a) : null;
			return {
				tone: "done",
				icon: "mdi:check",
				text: s ? e.t("care_plan.reading_done_on", {
					date: rs(e, s, r),
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
				let t = ss(e, n.value, n.unit);
				return {
					tone: "later",
					icon: "mdi:timer-sand",
					text: e.t(n.condition === "below" ? "care_plan.reading_below_since" : "care_plan.reading_above_since", {
						value: t,
						since: Es(e, r - n.for_minutes * 6e4, a),
						time: Es(e, r, a)
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
function Os(e, t, n, r, i = {}) {
	if (n.kind === "reading") return Ds(e, t, n, r, i.lastDoneAt ?? null, i.timeZone);
	let a = (t) => t ? rs(e, t, r) : "";
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
function ks(e, t) {
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
function As(e, t) {
	let n = e.last_done_at ? ks(e.last_done_at, t) : null, r = e.baseline_done_on;
	return n ? r ? n > r ? n : r : n : r;
}
function js(e, t) {
	if (t !== "task") return e.find((e) => Ko[e.type] === t);
}
function Ms(e) {
	return new Set(e.filter((e) => e.type !== "custom").map((e) => e.type));
}
var Ns = {
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
function Ps(e) {
	switch (e.kind) {
		case "interval": return {
			...Ns,
			every: String(e.every),
			unit: e.unit,
			growingSeasonOnly: e.growing_season_only
		};
		case "yearly": return {
			...Ns,
			mode: "yearly",
			startMonth: e.start_month,
			endMonth: e.end_month
		};
		case "reading": return {
			...Ns,
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
function Fs(e, t, n, r) {
	let i = {
		type: e,
		name: "",
		instructions: "",
		lastDone: "",
		...Ps(Qo[e])
	};
	if (e !== "winter_protection") return i;
	let a = {
		...i,
		mode: "reading",
		condition: "below"
	};
	if (t && Ss(t).includes("temperature")) return {
		...a,
		role: "temperature",
		readingUnit: qo.temperature
	};
	let o = r ? ds(r, n)[0] : void 0;
	return o ? {
		...a,
		forecast: "low",
		weatherEntityId: o.entity_id,
		readingUnit: fs(o.entity_id, n)
	} : a;
}
function Is(e, t, n) {
	let r = Fs("winter_protection", e, t, n);
	return !r.role && !r.weatherEntityId;
}
function Ls(e, t, n) {
	let r = bs(e);
	if (r === null) return null;
	let i = Fs("winter_protection", e, t, n);
	return {
		...i,
		value: String(ys(r, i.readingUnit ?? "°C"))
	};
}
var Rs = {
	fertilize: "fertilization",
	prune: "pruning",
	repot: "soil"
}, zs = ["fertilize", "prune"];
function Bs(e, t) {
	let n = e.species?.snapshot, r = Rs[t];
	if (!n || n.provider !== "openplantbook" || !r) return null;
	let i = n.care_text[r]?.trim();
	return i ? Ge(i, Zo) : null;
}
function Vs(e) {
	return zs.flatMap((t) => {
		let n = Bs(e, t);
		return n ? [{
			type: t,
			text: n
		}] : [];
	});
}
function Hs(e, t, n, r, i) {
	return {
		...Fs(e, n, r, i),
		instructions: t
	};
}
function Us(e) {
	return {
		type: e.type,
		name: e.name ?? "",
		instructions: e.instructions ?? "",
		lastDone: e.baseline_done_on ?? "",
		...Ps(e.schedule)
	};
}
function Ws(e, t, n) {
	return e !== null && t !== null && e === t && n !== e ? {
		startMonth: e,
		endMonth: n
	} : {
		startMonth: n,
		endMonth: n
	};
}
function Gs(e) {
	let t = e.trim().replace(",", ".");
	if (!/^[-+]?(\d+(\.\d{0,3})?|\.\d{1,3})$/.test(t)) return null;
	let n = Number(t);
	return Number.isFinite(n) ? n : null;
}
function Ks(e) {
	return e.role ? { role: e.role } : e.entityId ? { entity_id: e.entityId } : e.forecast && e.weatherEntityId ? { forecast: {
		entity_id: e.weatherEntityId,
		reading: e.forecast,
		hours: e.forecastHours
	} } : null;
}
function qs(e) {
	let t = Ks(e);
	return !!t && "forecast" in t;
}
function Js(e) {
	let t = e.trim().replace(",", ".");
	if (!t) return 0;
	if (!/^\d+(\.\d+)?$/.test(t)) return null;
	let n = Number(t) * 60, r = Math.round(n);
	return Math.abs(n - r) > 1e-9 || r > 4320 ? null : r;
}
function Ys(e, t) {
	let n = {}, r = qs(e);
	Ks(e) ? ps(e, t) ? n.source = "care_plan.error_weather_missing" : r && !_s.has(e.readingUnit ?? "") && (n.source = "care_plan.error_weather_unit") : n.source = "care_plan.error_source";
	let i = Gs(e.value);
	if (i === null && (n.value = "care_plan.error_value"), !r && Js(e.forHours) === null && (n.forHours = "care_plan.error_for_hours"), e.resetValue.trim()) {
		let t = Gs(e.resetValue);
		t === null ? n.resetValue = "care_plan.error_value" : i !== null && (e.condition === "below" ? t < i : t > i) && (n.resetValue = e.condition === "below" ? "care_plan.error_reset_below" : "care_plan.error_reset_above");
	}
	return n;
}
function Xs(e, t) {
	if (e.mode === "reading") {
		let n = Ks(e), r = Gs(e.value), i = qs(e) ? 0 : Js(e.forHours);
		return !n || r === null || i === null || Object.keys(Ys(e, t)).length ? null : {
			kind: "reading",
			source: n,
			condition: e.condition,
			value: r,
			unit: e.readingUnit,
			for_minutes: i,
			reset_value: e.resetValue.trim() ? Gs(e.resetValue) : null
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
function Zs(e, t, n) {
	let r = {}, i = e.name.trim();
	e.type === "custom" && !i ? r.name = "care_plan.error_name_required" : A(i, 60) || (r.name = "care_plan.error_name_length");
	let a = Xs(e, n);
	e.mode === "reading" ? Object.assign(r, Ys(e, n)) : a || (r[e.mode === "yearly" ? "months" : "every"] = e.mode === "yearly" ? "care_plan.error_months" : "care_plan.error_every");
	let o = e.instructions.trim();
	A(o, 4e3) || (r.instructions = "care_plan.error_instructions_length");
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
function Qs(e) {
	return JSON.stringify(e, (e, t) => t && typeof t == "object" && !Array.isArray(t) ? Object.fromEntries(Object.entries(t).sort(([e], [t]) => e.localeCompare(t))) : t);
}
function $s(e, t) {
	let n = {};
	return t.name !== e.name && (n.name = t.name), Qs(t.schedule) !== Qs(e.schedule) && (n.schedule = t.schedule), t.instructions !== e.instructions && (n.instructions = t.instructions), t.baseline_done_on !== e.baseline_done_on && (n.baseline_done_on = t.baseline_done_on), n;
}
function ec(e, t, n) {
	let r = $s(e, n), i = $s(t, n), a = $s(e, {
		task_type: t.type,
		name: t.name,
		schedule: t.schedule,
		instructions: t.instructions,
		baseline_done_on: t.baseline_done_on
	}), o = {}, s = [];
	for (let e of Object.keys(r)) e in i && (e in a && s.push(e), Object.assign(o, { [e]: i[e] }));
	return {
		changes: o,
		overlaps: s
	};
}
function tc(e, t, n, r) {
	let i = $s(t, r), a = Us(n), o = { ...e };
	return "name" in i || (o.name = a.name), "instructions" in i || (o.instructions = a.instructions), "baseline_done_on" in i || (o.lastDone = a.lastDone), "schedule" in i || Object.assign(o, Object.fromEntries(Object.keys(Ns).map((e) => [e, a[e]]))), o;
}
function nc(e, t, n, r) {
	if (t.mode === "reading") return rc(e, t, r);
	let i = Xs(t);
	return i ? is(e, i, n) : e.t(t.mode === "yearly" ? "care_plan.summary_pick_months" : "care_plan.summary_enter_interval");
}
function rc(e, t, n) {
	let r = Ks(t);
	if (!r) return e.t("care_plan.summary_pick_source");
	let i = "role" in r && os(r.role) ? e.t(`care_plan.subject_${r.role}`) : "forecast" in r ? e.t(`care_plan.subject_forecast_${r.forecast.reading}`, { window: ic(e, r.forecast.hours) }) : cs(e, r, n), a = Gs(t.value), o = t.condition === "below";
	if (a === null) return e.t(o ? "care_plan.summary_below_enter" : "care_plan.summary_above_enter", { subject: i });
	let s = [e.t(o ? "care_plan.summary_below" : "care_plan.summary_above", {
		subject: i,
		value: ss(e, a, t.readingUnit)
	})], c = "forecast" in r ? 0 : Js(t.forHours);
	c && s.push(e.tn(c / 60, "care_plan.summary_for_hours_one", "care_plan.summary_for_hours_other"));
	let l = t.resetValue.trim() ? Gs(t.resetValue) : null;
	return l !== null && l !== a && s.push(e.t(o ? "care_plan.summary_again_above" : "care_plan.summary_again_below", { value: ss(e, l, t.readingUnit) })), s.join(" · ");
}
function ic(e, t) {
	return e.t(t === 72 ? "care_plan.forecast_window_long_72" : t === 48 ? "care_plan.forecast_window_long_48" : "care_plan.forecast_window_long_24");
}
var ac = /* @__PURE__ */ new Set([
	"revision",
	"care_events",
	"care_tasks",
	"rest_period",
	"snoozed_until"
]);
function oc(e, t, n = []) {
	return [.../* @__PURE__ */ new Set([...Object.keys(e), ...Object.keys(t)])].every((r) => ac.has(r) || n.includes(r) || JSON.stringify(e[r]) === JSON.stringify(t[r]));
}
function sc(e, t) {
	return {
		due: `smart_plants:${e}:care_task:${t}:due`,
		next: `smart_plants:${e}:care_task:${t}:next`,
		careDue: `smart_plants:${e}:care_due`
	};
}
function cc(e, t) {
	return t.name ?? e.t(`care_task_type.${t.type}`);
}
function lc(e) {
	return e?.care.filter((e) => e.is_due) ?? [];
}
function uc(e, t, n = 2) {
	let r = t.slice(0, n).map((t) => cc(e, t)).join(", ");
	return t.length > n ? e.t("care_plan.line_more", {
		names: r,
		count: t.length - n
	}) : r;
}
function dc(e, t) {
	return !!e && es(e.start_month, e.end_month).includes(t);
}
function fc(e, t) {
	let n = Number(t.slice(0, 4)), r = Number(t.slice(5, 7)), i = e.end_month % 12 + 1;
	return `${i > r ? n : n + 1}-${String(i).padStart(2, "0")}-01`;
}
function pc(e) {
	return e.filter((e) => e.schedule.kind === "interval" && e.schedule.growing_season_only);
}
function mc(e, t, n, r) {
	let i = dc(t, Number(r.slice(5, 7))), a = pc(n).length;
	return {
		resting: i,
		season: i ? e.t("care_plan.resting_until", { date: rs(e, fc(t, r), r) }) : e.t("care_plan.growing_season"),
		tasks: a === 0 ? e.t("care_plan.rest_all_running") : i ? e.tn(a, "care_plan.rest_tasks_off_now_one", "care_plan.rest_tasks_off_now_other") : e.tn(a, "care_plan.rest_tasks_off_one", "care_plan.rest_tasks_off_other")
	};
}
function hc(e, t) {
	let n = t.filter((e) => e.schedule.kind === "interval"), r = n.filter((t) => t.schedule.kind === "interval" && (t.schedule.growing_season_only || !e && t.type === "fertilize")), i = n.filter((e) => e.schedule.kind === "interval" && e.schedule.growing_season_only);
	return {
		startMonth: e?.start_month ?? null,
		endMonth: e?.end_month ?? null,
		off: new Set(r.map((e) => e.id)),
		stored: new Set(i.map((e) => e.id))
	};
}
function gc(e) {
	return e.startMonth === null || e.endMonth === null ? {
		rest: null,
		error: "care_plan.rest_error_months"
	} : es(e.startMonth, e.endMonth).length === 12 ? {
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
function _c(e, t) {
	return e.flatMap((e) => {
		let n = t.off.has(e.id);
		return n === t.stored.has(e.id) || e.schedule.kind !== "interval" || e.schedule.growing_season_only === n ? [] : [{
			task: e,
			schedule: {
				...e.schedule,
				growing_season_only: n
			}
		}];
	});
}
// src/winter.ts
var vc = 2e5, yc = "dormant_storage", bc = {
	temperature: {
		unit: "°C",
		step: "0.1",
		builtin: gr,
		error: "winter.error_temperature",
		keys: [
			"cold_threshold_celsius",
			"cold_clear_celsius",
			"hot_clear_celsius",
			"hot_threshold_celsius"
		],
		fields: [{
			key: "cold_threshold_celsius",
			label: "winter.field_cold",
			clear: "cold_clear_celsius"
		}, {
			key: "hot_threshold_celsius",
			label: "winter.field_hot",
			clear: "hot_clear_celsius"
		}]
	},
	soil_temperature: {
		unit: "°C",
		step: "0.1",
		builtin: ti,
		error: "winter.error_soil_temperature",
		keys: [
			"cold_threshold_celsius",
			"cold_clear_celsius",
			"hot_clear_celsius",
			"hot_threshold_celsius"
		],
		fields: [{
			key: "cold_threshold_celsius",
			label: "winter.field_cold",
			clear: "cold_clear_celsius"
		}, {
			key: "hot_threshold_celsius",
			label: "winter.field_hot",
			clear: "hot_clear_celsius"
		}]
	},
	moisture: {
		unit: "%",
		step: "1",
		builtin: {
			min: 15,
			target: 35,
			max: 55
		},
		error: "winter.error_moisture",
		keys: [
			"min",
			"target",
			"max"
		],
		fields: [
			{
				key: "min",
				label: "targets.needs_water"
			},
			{
				key: "target",
				label: "targets.ideal"
			},
			{
				key: "max",
				label: "targets.too_wet"
			}
		]
	},
	illuminance: {
		unit: "lx",
		step: "1",
		builtin: vi,
		error: "winter.error_light",
		keys: ["target_lux", "clear_lux"],
		fields: [{
			key: "target_lux",
			label: "winter.field_light",
			clear: "clear_lux"
		}]
	},
	conductivity: {
		unit: "µS/cm",
		step: "1",
		builtin: Lr,
		error: "winter.error_conductivity",
		keys: [
			"low_threshold_micro_siemens_per_cm",
			"low_clear_micro_siemens_per_cm",
			"high_clear_micro_siemens_per_cm",
			"high_threshold_micro_siemens_per_cm"
		],
		fields: [{
			key: "low_threshold_micro_siemens_per_cm",
			label: "winter.field_low",
			clear: "low_clear_micro_siemens_per_cm"
		}, {
			key: "high_threshold_micro_siemens_per_cm",
			label: "winter.field_high",
			clear: "high_clear_micro_siemens_per_cm"
		}]
	},
	humidity: {
		unit: "%",
		step: "0.1",
		builtin: Er,
		error: "winter.error_humidity",
		keys: [
			"dry_threshold_percent",
			"dry_clear_percent",
			"damp_clear_percent",
			"damp_threshold_percent"
		],
		fields: [{
			key: "dry_threshold_percent",
			label: "winter.field_dry",
			clear: "dry_clear_percent"
		}, {
			key: "damp_threshold_percent",
			label: "winter.field_damp",
			clear: "damp_clear_percent"
		}]
	}
}, xc = (e) => typeof e == "object" && !!e && !Array.isArray(e), Sc = (e) => typeof e == "number" && Number.isFinite(e), Cc = (e) => Math.round(e * 10) / 10;
function wc(e) {
	let t = e.winter_thresholds;
	if (!xc(t)) return null;
	let n = {};
	for (let e of nt) {
		let r = t[e];
		if (r !== void 0) {
			if (!xc(r) || !bc[e].keys.every((e) => Sc(r[e]))) return null;
			n[e] = Object.fromEntries(bc[e].keys.map((e) => [e, r[e]]));
		}
	}
	return Object.keys(n).length ? n : null;
}
function Tc(e, t) {
	return t === "moisture" ? (H(e)?.sources.length ?? 0) > 0 : (W(e, t)?.sources.length ?? 0) > 0;
}
function Ec(e) {
	return nt.filter((t) => Tc(e, t));
}
function Dc(e, t) {
	let n = bc[t];
	if (t === "moisture") {
		let t = H(e);
		return t ? Object.fromEntries(V.map((e) => [e, t.threshold_overrides[e] ?? t.threshold_defaults[e].value])) : { ...n.builtin };
	}
	let r = e.roles?.[t], i = xc(r) && xc(r.stress_threshold_overrides) ? r.stress_threshold_overrides : {}, a = xc(r) && xc(r.species_defaults) ? r.species_defaults : {};
	return Object.fromEntries(n.keys.map((e) => {
		let t = i[e], r = a[e], o = xc(r) ? r.value : void 0;
		return [e, Sc(t) ? t : Sc(o) ? o : n.builtin[e]];
	}));
}
function Oc(e) {
	let t = wc(e);
	return Object.fromEntries(Ec(e).map((n) => {
		let r = t?.[n] ?? Dc(e, n);
		return [n, Object.fromEntries(bc[n].fields.map((e) => [e.key, String(r[e.key])]))];
	}));
}
function kc(e, t, n) {
	return Object.fromEntries(Object.entries(n).map(([n, r]) => {
		let i = e[n] ?? {}, a = t[n] ?? {};
		return [n, Object.fromEntries(Object.entries(r).map(([e, t]) => [e, i[e] !== void 0 && i[e] !== a[e] ? i[e] : t]))];
	}));
}
function Ac(e, t) {
	return JSON.stringify(e) === JSON.stringify(t);
}
function jc(e) {
	let t = (e ?? "").trim();
	if (t === "") return null;
	let n = Number(t);
	return Number.isFinite(n) ? n : null;
}
function Mc(e, t, n) {
	let r = {};
	for (let i of bc[e].fields) {
		let a = e === "moisture" ? t[i.key] : Cc(t[i.key]);
		r[i.key] = a, i.clear && (r[i.clear] = Cc(a + n[i.clear] - n[i.key]));
	}
	return r;
}
function Nc(e, t, n, r) {
	let i = bc[e], a = vc - (n.clear_lux - n.target_lux), o = {
		values: null,
		error: e === "illuminance" ? r.t(i.error, { max: r.number(a) }) : r.t(i.error),
		invalid: i.fields.map((e) => e.key)
	}, s = i.fields.filter((e) => jc(t[e.key]) === null).map((e) => e.key);
	if (s.length) return {
		values: null,
		error: r.t("winter.error_empty"),
		invalid: s
	};
	let c = Object.fromEntries(i.fields.map((e) => [e.key, jc(t[e.key])])), l = {
		values: null,
		error: null,
		invalid: []
	}, u = Mc(e, c, n), d = Object.fromEntries(Object.entries(u).map(([e, t]) => [e, String(t)]));
	switch (e) {
		case "moisture": {
			let [e, t, n] = [
				u.min,
				u.target,
				u.max
			];
			return [
				e,
				t,
				n
			].every((e) => Number.isInteger(e) && e >= 1 && e <= 99) && e < t && t < n && n - e >= 4 ? {
				...l,
				values: u
			} : o;
		}
		case "temperature": return wr(d, r).error ? o : {
			...l,
			values: u
		};
		case "soil_temperature": return ci(d, r).error ? o : {
			...l,
			values: u
		};
		case "humidity": return Nr(d, r).error ? o : {
			...l,
			values: u
		};
		case "conductivity": return Wr(d, r).error ? o : {
			...l,
			values: u
		};
		case "illuminance": return wi(d, r).error ? o : {
			...l,
			values: u
		};
	}
}
var Pc = (e, t) => Object.keys(e).every((n) => Math.abs(e[n] - (t[n] ?? NaN)) < 1e-9);
function Fc(e, t, n) {
	let r = {}, i = {}, a = {}, o = wc(e);
	for (let s of nt) {
		let c = t[s];
		if (!c) {
			o?.[s] && (r[s] = o[s]);
			continue;
		}
		let l = Dc(e, s), u = Nc(s, c, l, n);
		u.error || !u.values ? (i[s] = u.error ?? n.t(bc[s].error), a[s] = u.invalid) : Pc(u.values, l) || (r[s] = u.values);
	}
	return {
		thresholds: Object.keys(r).length ? r : null,
		errors: i,
		invalid: a
	};
}
function Ic(e, t, n, r, i) {
	let a = jc(r), o = i[n];
	return a !== null && Math.abs(a - o) < 1e-9 ? {
		text: e.t("winter.same"),
		changed: !1
	} : {
		text: e.t("winter.normally", { value: I(e, o, bc[t].unit) }),
		changed: !0
	};
}
function Lc(e, t) {
	let n = t.species?.snapshot;
	return (n ? Mi(n, e.language) ?? n.latin_name : null) ?? t.name;
}
function Rc(e) {
	let t = e.species?.snapshot.survival_min_temperature;
	return Sc(t) ? t : null;
}
function zc(e, t, n) {
	let r = Rc(e);
	return r === null || t === "soil_temperature" && !(r < n.cold_threshold_celsius) ? null : r;
}
function Bc(e, t) {
	let n = Math.round(e / 5) * 5;
	return n >= 1 && n < t ? n : Math.max(1, Math.round(e));
}
function Vc(e, t, n, r, i) {
	let a = (e) => jc(r?.[e]);
	switch (n) {
		case "temperature":
		case "soil_temperature": {
			let r = zc(t, n, i);
			return r === null || a("cold_threshold_celsius") === r || n === "soil_temperature" && Nc(n, {
				cold_threshold_celsius: String(r),
				hot_threshold_celsius: String(i.hot_threshold_celsius)
			}, i, e).error ? null : {
				text: e.t("winter.suggest_temperature", {
					value: I(e, r, "°C"),
					species: Lc(e, t)
				}),
				apply: { cold_threshold_celsius: String(r) }
			};
		}
		case "moisture": {
			let t = Bc(i.min * 2 / 3, i.min), n = Bc(i.target * 3 / 4, i.target);
			if (t === i.min && n === i.target || a("min") === t && a("target") === n) return null;
			let o = {
				min: String(t),
				target: String(n),
				max: r?.max ?? String(i.max)
			};
			return Nc("moisture", o, i, e).error ? null : {
				text: e.t("winter.suggest_moisture", {
					min: e.percent(t),
					target: e.percent(n)
				}),
				apply: {
					min: o.min,
					target: o.target
				}
			};
		}
		case "illuminance": return i.target_lux === 0 || a("target_lux") === 0 ? null : {
			text: e.t("winter.suggest_light"),
			apply: { target_lux: "0" }
		};
		case "conductivity": {
			let t = Cc(i.low_threshold_micro_siemens_per_cm / 2);
			return t === i.low_threshold_micro_siemens_per_cm || a("low_threshold_micro_siemens_per_cm") === t ? null : {
				text: e.t("winter.suggest_conductivity", { value: I(e, t, "µS/cm") }),
				apply: { low_threshold_micro_siemens_per_cm: String(t) }
			};
		}
		case "humidity": return null;
	}
}
function Hc(e, t, n, r, i) {
	let a = zc(t, n, i), o = jc(r?.cold_threshold_celsius);
	return a === null || o === null || o >= a ? null : e.t("winter.warn_survival", {
		species: Lc(e, t),
		value: I(e, a, "°C")
	});
}
function Uc(e, t) {
	switch (e) {
		case "temperature":
		case "soil_temperature": return {
			min: t.cold_threshold_celsius,
			max: t.hot_threshold_celsius
		};
		case "moisture": return {
			min: t.min,
			target: t.target,
			max: t.max
		};
		case "illuminance": return {
			min: t.target_lux,
			max: null
		};
		case "conductivity": return {
			min: t.low_threshold_micro_siemens_per_cm,
			max: t.high_threshold_micro_siemens_per_cm
		};
		case "humidity": return {
			min: t.dry_threshold_percent,
			max: t.damp_threshold_percent
		};
	}
}
var Wc = (e) => e.charAt(0).toLocaleLowerCase() + e.slice(1);
function Gc(e, t, n) {
	return t === "illuminance" && n.min === 0 ? e.t("winter.no_alert") : Wc(zt(e, t, n, bc[t].unit));
}
function Kc(e, t) {
	let n = wc(t);
	return nt.filter((e) => n?.[e] || Tc(t, e)).map((r) => {
		let i = Gc(e, r, Uc(r, Dc(t, r))), a = n?.[r] ? Gc(e, r, Uc(r, n[r])) : i;
		return {
			role: r,
			check: F(e, r),
			changed: !!n?.[r],
			winter: a,
			normal: i
		};
	});
}
function qc(e, t) {
	let [n = "", r = ""] = e.t("winter.change", {
		check: "\0",
		winter: t.winter,
		normal: t.normal
	}).split("\0");
	return {
		before: n,
		after: r
	};
}
var Jc = (e) => e.placement?.mode === yc;
function Yc(e, t) {
	let n = t.rest_period;
	return n ? ns(e, n.start_month, n.end_month, "short") : null;
}
function Xc(e, t) {
	let n = Yc(e, t);
	return n && Jc(t) ? e.t("winter.when_both", { months: n }) : n ? e.t("winter.when_rest", { months: n }) : Jc(t) ? e.t("winter.when_storage") : null;
}
function Zc(e, t) {
	let n = e.rest_period, [r, i] = t.split("-").map(Number);
	return !n || !r || !i ? null : `${n.start_month > i ? r : r + 1}-${String(n.start_month).padStart(2, "0")}-01`;
}
function Qc(e, t, n) {
	let r = Zc(t, n);
	if (!r) return null;
	let [i, a, o] = r.split("-").map(Number), s = new Intl.DateTimeFormat(e.language, {
		day: "numeric",
		month: "long",
		timeZone: "UTC"
	}).format(Date.UTC(i, a - 1, o));
	return e.t("winter.next", { date: s });
}
function $c(e, t) {
	if (Jc(e)) return yc;
	let n = e.rest_period, r = Number(t.slice(5, 7));
	return !n || !r ? null : (n.start_month <= n.end_month ? r >= n.start_month && r <= n.end_month : r >= n.start_month || r <= n.end_month) ? "rest_period" : null;
}
function el(e, t, n) {
	if (!n?.active) return null;
	if (n.reason === "rest_period") {
		let r = n.until ? Number(n.until.slice(5, 7)) : t.rest_period?.end_month;
		if (r) return e.t("winter.chip_until", { month: ts(e, r) });
	}
	return e.t("winter.chip_storage");
}
function tl(e, t, n, r) {
	let i = Yc(e, t);
	return n.reason === "rest_period" && i ? e.t("winter.reason_rest", { months: i }) : i !== null && $c({
		...t,
		placement: null
	}, r) === "rest_period" ? e.t("winter.reason_storage_rest", { months: i }) : e.t("winter.reason_storage");
}
function nl(e, t, n) {
	let r = n.normal_range;
	if (!r || !nt.includes(t)) return null;
	let i = t, a = i === "illuminance" && n.range.min === 0 ? e.t("winter.no_alert_short") : zt(e, i, n.range, n.unit), o = i === "illuminance" && r.min === 0 ? e.t("winter.no_alert") : Wc(zt(e, i, r, n.unit));
	return {
		text: a,
		tooltip: e.t("winter.range_tooltip", { normal: o })
	};
}
var rl = [
	{
		role: "temperature",
		kind: "too_cold"
	},
	{
		role: "soil_temperature",
		kind: "too_cold"
	},
	{
		role: "illuminance",
		kind: "low_light"
	},
	{
		role: "moisture",
		kind: "needs_water"
	}
];
function il(e, t) {
	return !t || !Jc(e) || e.winter_thresholds || t.status === "paused" ? !1 : t.problems.some((e) => rl.some((t) => t.role === e.role && t.kind === e.kind));
}
// src/views/plant.ts
var al = [
	"overview",
	"sensors",
	"care",
	"settings"
], ol = {
	overview: "detail.tab_overview",
	sensors: "detail.tab_sensors",
	care: "detail.tab_care",
	settings: "detail.tab_settings"
}, sl = [
	"watering",
	"fertilizing",
	"pruning",
	"repotting",
	"pest_control",
	"note"
], cl = {
	watering: "mdi:water",
	fertilizing: "mdi:flask-outline",
	pruning: "mdi:content-cut",
	repotting: "mdi:shovel",
	pest_control: "mdi:spray-bottle",
	note: "mdi:note-text-outline",
	task: "mdi:clipboard-check-outline"
}, ll = [...sl, "task"], ul = {
	watering: "var(--sp-info)",
	fertilizing: "var(--amber-color, #c99000)",
	pruning: "var(--teal-color, #009688)",
	repotting: "var(--brown-color, #795548)",
	pest_control: "var(--sp-error)",
	note: "var(--sp-text-secondary)",
	task: "var(--sp-care)"
};
function dl(e, t, n) {
	let r = t[n], i = r?.attributes.friendly_name;
	if (typeof i == "string" && i.trim()) return i;
	if (!r) return e.t("sensor.missing");
	let a = n.split(".").slice(1).join(".").replaceAll("_", " ");
	return a ? a.charAt(0).toLocaleUpperCase() + a.slice(1) : n;
}
function fl(e) {
	return typeof e.last_reported == "string" && Number.isFinite(Date.parse(e.last_reported)) ? e.last_reported : e.last_updated;
}
function pl(e, t) {
	let n = F(e, t);
	return e.language !== "en" || /^.[A-Z₀-₉]/.test(n) ? n : n.charAt(0).toLocaleLowerCase() + n.slice(1);
}
function ml(e) {
	return e ? Object.keys(P).filter((t) => e.roles[t]).map((t) => [t, e.roles[t]]) : [];
}
function hl(e, t) {
	return t.state === "stale" || t.state === "unavailable" ? "off" : t.state === "low" ? e === "moisture" ? "water" : "bad" : t.state === "high" ? e === "moisture" ? "wet" : "bad" : "ok";
}
function gl(e, t, n) {
	switch (t.state) {
		case "ok": return e.t("reading_state.ok");
		case "low": return e.t("reading_state.low");
		case "high": return e.t("reading_state.high");
		case "stale": return t.last_reported ? e.t("reading_state.stale", { age: Vt(e, t.last_reported, n) }) : e.t("reading_state.stale_no_age");
		case "unavailable": return e.t("reading_state.unavailable");
	}
}
function _l(e, t) {
	return t.value === null ? "—" : I(e, t.value, t.unit);
}
function vl(e, t, n) {
	return t.status === "paused" ? e.t("detail.reason_paused") : t.status === "healthy" || !t.problems.length ? e.t("detail.reason_healthy") : t.problems.map((r) => sn(e, t, r, n)).join(" · ");
}
function yl(e, t, n) {
	let r = ml(t).slice(0, 4);
	return r.length ? T`<ul class="keyreads" aria-label=${e.t("detail.key_readings")}>${r.map(([t, r]) => {
		let i = hl(t, r), a = zt(e, t, r.range, r.unit), o = r.state === "stale" && r.last_reported, s = o ? e.t("moisture_bar.last_update", { age: Vt(e, r.last_reported, n) }) : a, c = i === "water" || i === "wet" || i === "bad", l = o ? null : nl(e, t, r);
		return T`<li class="kr"><span class="kr-label"><ha-icon aria-hidden="true" .icon=${P[t].icon}></ha-icon>${F(e, t)}</span>
      <span class="kr-value tone-${i}">${_l(e, r)}${c ? T`<span class="sr-only">, ${gl(e, r, n)}</span>` : E}</span>
      ${l ? T`<span class="kr-range">${xl(l)}</span>` : s ? T`<span class="kr-range">${s}</span>` : E}</li>`;
	})}</ul>` : E;
}
function bl(e, t, n, r, i) {
	let a = hl(t, n), o = n.sources.map((t) => dl(e, r, t)).join(", "), s = zt(e, t, n.range, n.unit), c = nl(e, t, n);
	return T`<li class="li"><span class="ic tone-${a}" aria-hidden="true"><ha-icon .icon=${P[t].icon}></ha-icon></span>
    <span class="li-main"><span class="li-title">${F(e, t)}</span>
      <span class="li-sub">${o ? T`${o} · ` : E}<span class="state tone-${a}">${gl(e, n, i)}</span></span></span>
    <span class="li-end"><span class="li-value">${_l(e, n)}</span>${c ? T`<span class="li-sub">${xl(c)}</span>` : s ? T`<span class="li-sub">${s}</span>` : E}</span></li>`;
}
function xl(e) {
	return T`<span class="winter-range" title=${e.tooltip}>${e.text}<ha-icon aria-hidden="true" icon="mdi:snowflake"></ha-icon><span class="sr-only">. ${e.tooltip}</span></span>`;
}
var Sl = {
	moisture: "%",
	temperature: "°C",
	humidity: "%",
	illuminance: "lx",
	conductivity: "µS/cm",
	soil_temperature: "°C",
	co2: "ppm",
	battery: "%"
}, Cl = {
	"24h": "history.range_24h",
	"7d": "history.range_7d",
	"30d": "history.range_30d",
	"1y": "history.range_1y"
};
function wl(e, t) {
	let { role: n, range: r, reading: i } = t, a = t.status === "loading" ? t.stale : void 0, o = Sn[a ? a.range : r], s = i?.unit || Sl[n], c = i && i.state !== "stale" && i.state !== "unavailable" ? i.value : null, l = t.status === "ready" ? En(t.points, c, t.now) : a ? En(a.points, c, t.now) : [], u = zn(n, i?.range), d = zt(e, n, i?.range, s), f = n === "moisture" && l.length ? Fn(l, {
		periodMs: o.periodMs,
		wateredAt: t.lastWatered,
		min: u.min
	}) : null, p = f ? In(e, f, u.min) : null, m = ll.filter((e) => e !== "watering" || n === "moisture" || n === "conductivity").map((t) => ({
		key: t,
		label: e.t(`history.legend_${t}`),
		color: ul[t]
	})), h = t.care.map((e) => ({
		t: e.t,
		group: e.kind
	})), g = t.onLogCare ? [...n === "moisture" ? [{
		key: "watering",
		label: e.t("history.log_watering_at")
	}] : [], {
		key: "care",
		label: e.t(n === "moisture" ? "history.log_other_care_at" : "history.log_care_at")
	}] : [], _ = t.status === "loading" ? "" : t.status === "unavailable" ? e.t("history.unavailable") : t.status === "ready" && !l.length ? e.t("history.empty") : "";
	return T`<section class="sp-card history-card" aria-labelledby="history-heading"><div class="card-h"><h3 id="history-heading">${e.t("history.heading")}</h3>
      ${t.status === "unavailable" ? E : T`<button type="button" class="btn text sm" @click=${t.onOpen}>${e.t("history.open_native")}</button>`}</div>
    <div class="card-b">
      <div class="history-bar">
        ${t.roles.length > 1 ? T`<div class="row" role="group" aria-label=${e.t("history.role_label")}>${t.roles.map((r) => T`<button type="button" class="fchip" aria-pressed=${r === n ? "true" : "false"} @click=${() => t.onRole(r)}>${F(e, r)}</button>`)}</div>` : E}
        <span class="spacer"></span>
        <div class="seg" role="group" aria-label=${e.t("history.range_label")}>${yn.map((n) => T`<button type="button" aria-pressed=${n === r ? "true" : "false"} @click=${() => t.onRange(n)}>${e.t(Cl[n])}</button>`)}</div>
      </div>
      ${t.status === "error" ? T`<div class="row"><span class="error-text" role="alert">${e.t("history.error")}</span><button type="button" class="btn text sm" @click=${t.onRetry}>${e.t("history.retry")}</button></div>` : _ ? T`<p class="muted history-message" role="status">${_}</p>` : t.status === "loading" && !a ? Tl(e, t, n, m, h, d, u.min) : T`<div class="history-plot ${a ? "stale" : ""}" aria-busy=${a ? "true" : "false"}>${a ? T`<p class="sr-only" role="status">${e.t("history.loading")}</p>` : E}<sp-history-chart .points=${l} .start=${t.now - o.spanMs} .end=${t.now} .periodMs=${o.periodMs} .unit=${s} .band=${u} .markers=${h} .markerGroups=${m}
            .summary=${Rn(e, F(e, n), r, l, s)} .bandLabel=${d ? e.t("history.legend_target", { range: d }) : ""}
            .actions=${a ? [] : g} @point-action=${(e) => t.onLogCare?.(e.detail.key === "watering" ? "watering" : null, e.detail.t)} .l=${e}></sp-history-chart></div>`}
      ${p ? T`<p class="small history-rate"><strong>${p.rate}</strong>${p.forecast ? T` <span class="muted">${p.forecast}</span>` : E}</p>` : E}
    </div></section>`;
}
function Tl(e, t, n, r, i, a, o) {
	let s = Sn[t.range], c = [
		...a ? [{
			label: e.t("history.legend_target", { range: a }),
			key: "key"
		}] : [],
		{
			label: e.t("history.legend_spread"),
			key: "key"
		},
		...Ra(r, i, t.now - s.spanMs, t.now).map((e) => ({
			label: e.label,
			key: "key marker"
		}))
	], l = n === "moisture" ? In(e, {
		ratePerDay: 2.5,
		sinceWatering: t.lastWatered !== null,
		daysToMin: 7
	}, o) : null;
	return T`<div class="history-skeleton" aria-busy="true"><p class="sr-only" role="status">${e.t("history.loading")}</p>
      <span class="sk sk-plot" aria-hidden="true"></span><div class="readout-row" aria-hidden="true"></div>
      <div class="legend sk-reserve" aria-hidden="true">${c.map((e) => T`<span><i class=${e.key}></i>${e.label}</span>`)}</div></div>
    ${l ? T`<p class="small history-rate history-skeleton-rate sk-reserve" aria-hidden="true"><strong>${l.rate}</strong>${l.forecast ? T` <span class="muted">${l.forecast}</span>` : E}</p>` : E}`;
}
function El(e, t) {
	return t >= 172800 && t % 86400 == 0 ? e.t("duration.days", { count: t / 86400 }) : t >= 3600 && t % 3600 == 0 ? e.t("duration.hours", { count: t / 3600 }) : t >= 60 && t % 60 == 0 ? e.t("duration.minutes", { count: t / 60 }) : e.t("duration.seconds", { count: t });
}
function Dl(e, t, n) {
	return Object.entries(t.payload).filter(([, e]) => e !== null && e !== "").map(([t, r]) => `${n(t)}: ${typeof r == "number" && t === "amount" ? e.number(r) : String(r)}`);
}
function Ol(e) {
	let { key: t, icon: n, header: r, secondary: i, open: a, rendered: o, native: s, toggle: c, willOpen: l, content: u } = e;
	return s ? T`<ha-expansion-panel class="expander" data-section=${t} outlined .header=${r} .secondary=${i} .expanded=${a}
      @expanded-will-change=${(e) => {
		e.target === e.currentTarget && e.detail.expanded && l();
	}}
      @expanded-changed=${(e) => {
		e.target === e.currentTarget && c(e.detail.expanded);
	}}>
      <ha-icon slot="leading-icon" aria-hidden="true" .icon=${n}></ha-icon>
      ${a || o ? T`<div class="expander-body">${u()}</div>` : E}</ha-expansion-panel>` : T`<details class="expander" data-section=${t} ?open=${a} @toggle=${(e) => {
		let t = e.currentTarget.open;
		t !== a && c(t);
	}}>
    <summary><ha-icon aria-hidden="true" .icon=${n}></ha-icon><span class="summary-text"><span class="summary-title">${r}</span><span class="summary-sub">${i}</span></span></summary>
    <div class="expander-body">${u()}</div></details>`;
}
var kl = o`
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
  .reason .btn.text.sm { min-height: 0; padding: 0 4px; vertical-align: baseline; }
  .winter-range { display: inline-flex; align-items: center; gap: 4px; color: color-mix(in srgb, var(--sp-info) 62%, #000); }
  .winter-range ha-icon { --mdc-icon-size: 15px; }
  .winter-chip { display: inline-flex; align-items: center; gap: 5px; min-height: 26px; max-width: 100%; padding: 2px 10px 2px 7px; border: 0; border-radius: 13px; font: inherit; font-size: 13px; font-weight: 500; line-height: 1.3; cursor: pointer;
    background: color-mix(in srgb, var(--sp-info) 14%, transparent); color: color-mix(in srgb, var(--sp-info) 62%, #000); text-align: start; }
  .winter-chip ha-icon { --mdc-icon-size: 17px; flex: none; }
  .winter-chip .caret { --mdc-icon-size: 16px; }
  .winter-chip:focus-visible { outline: 2px solid var(--sp-info); outline-offset: 2px; }
  .winter-box { margin-top: 10px; padding: 12px 14px; border-radius: 10px; background: color-mix(in srgb, var(--sp-info) 10%, transparent); font-size: 13.5px; }
  .winter-box p { margin: 0 0 6px; }
  .winter-box ul { margin: 0 0 6px; padding-inline-start: 20px; }
  .winter-box li { margin: 2px 0; }
  .winter-card .card-h h3 { display: flex; align-items: center; gap: 8px; }
  .winter-card .card-h ha-icon { color: color-mix(in srgb, var(--sp-info) 62%, #000); }
  .winter-badge { padding: 2px 10px; border-radius: 12px; font-size: 12.5px; font-weight: 500; background: color-mix(in srgb, var(--sp-info) 14%, transparent); color: color-mix(in srgb, var(--sp-info) 62%, #000); }
  .winter-lines { list-style: none; margin: 6px 0 0; padding: 0; font-size: 14px; }
  .winter-lines li { margin: 4px 0; }
  .winter-lines li.same { color: var(--sp-text-secondary); }
  .winter-never { margin: 8px 0; padding: 10px 12px; border-radius: 8px; background: color-mix(in srgb, var(--sp-warning) 14%, transparent); font-size: 13.5px; }
  .winter-never p { margin: 0 0 4px; }
  .winter-entry { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--divider-color, #e0e0e0); font-size: 13.5px; color: var(--sp-text-secondary); }
  .winter-entry > ha-icon { color: color-mix(in srgb, var(--sp-info) 62%, #000); --mdc-icon-size: 20px; }
  .winter-entry span { flex: 1 1 16em; }
  .winter-dialog .winter-when { margin: 8px 0 4px; padding: 10px 12px; border-radius: 8px; background: color-mix(in srgb, var(--sp-text) 5%, transparent); }
  .winter-dialog .winter-when.never { background: color-mix(in srgb, var(--sp-warning) 14%, transparent); }
  .winter-group { margin: 0; padding: 12px 0; border: 0; border-top: 1px solid var(--divider-color, #e0e0e0); min-width: 0; }
  .winter-group legend { display: flex; align-items: center; gap: 6px; padding: 0; font-weight: 500; }
  .winter-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(9em, 1fr)); gap: 10px; margin-top: 8px; }
  .winter-field label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
  .winter-field input { box-sizing: border-box; width: 100%; }
  .winter-field input.changed { outline: 2px solid var(--sp-info); outline-offset: -1px; }
  .winter-field input.warn { outline: 2px solid var(--sp-warning); outline-offset: -1px; }
  .winter-field small { display: block; margin-top: 2px; font-size: 12px; color: var(--sp-text-secondary); }
  .winter-field small.warn { color: color-mix(in srgb, var(--sp-warning) 70%, var(--sp-text)); }
  .winter-suggestion { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-top: 10px; padding: 8px 10px; border-radius: 8px; background: color-mix(in srgb, var(--sp-info) 10%, transparent); font-size: 13px; }
  .winter-suggestion > ha-icon { color: color-mix(in srgb, var(--sp-info) 62%, #000); --mdc-icon-size: 18px; }
  .winter-suggestion span { flex: 1 1 14em; }
  .hero-status .snooze { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 2px; max-width: 100%; }
  .pd .hero-status .snooze .btn.sm { min-height: 32px; padding: 2px 10px; }

  /* Snooze dialog */
  .snooze-dialog .snooze-choices { display: flex; flex-direction: column; gap: 4px; }
  .snooze-dialog .snooze-choices legend { margin-bottom: 4px; }
  .snooze-dialog .check { padding: 6px 0; cursor: pointer; }
  .snooze-dialog .check input { margin: 0; flex: none; }
  .snooze-dialog .choice-text { display: flex; flex-direction: column; min-width: 0; }
  .snooze-dialog input[type="date"] { max-width: 240px; }
  .hero-actions { display: flex; gap: 8px; align-items: flex-start; }
  .hero-buttons { display: flex; flex-direction: column; gap: 8px; align-items: stretch; max-width: 240px; }
  /* Labels in any language fit: buttons wrap onto more rows first, and a
     label longer than a whole row wraps inside its button. */
  .pd .hero-buttons .btn { min-width: 0; white-space: normal; overflow-wrap: anywhere; text-align: center; }
  .plant-menu { flex: none; }
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

  /* Automations card: rows link to Home Assistant's editor */
  .rel > li + li { border-top: 1px solid var(--divider-color, #e0e0e0); }
  .rel .li { min-height: 56px; padding-block: 8px; }
  .rel a.li { color: inherit; text-decoration: none; }
  /* Light enough that the secondary text keeps a 4.5:1 contrast. */
  .rel a.li:hover { background: color-mix(in srgb, var(--sp-text) 3%, transparent); }
  .rel a.li:focus-visible { outline: 2px solid var(--sp-primary); outline-offset: -2px; }
  .rel-end { display: flex; align-items: center; gap: 2px; color: var(--sp-text-secondary); }
  .rel-more { padding: 2px 2px 6px; }
  .rel-kind { color: var(--sp-text); }

  /* ⋮ menu: items stay on one line, the number of notifications is plain grey
     text, and dividers separate groups. wa-divider draws itself where Home
     Assistant defines it. */
  .panel-appbar ha-dropdown-item { white-space: nowrap; }
  .menu-count { color: var(--secondary-text-color, #727272); font-size: 14px; font-variant-numeric: tabular-nums; }
  wa-divider:not(:defined) { display: block; height: 1px; margin: 4px 0; background: var(--divider-color, #e0e0e0); }
  .pd .rel-group { margin: 0; padding: 14px 16px 4px; border-top: 1px solid var(--divider-color, #e0e0e0); font-size: 13px; font-weight: 500; line-height: 1.25; color: var(--sp-text-secondary); }
  .rel-foot { border-top: 1px solid var(--divider-color, #e0e0e0); padding-top: 12px; }

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
  /* The placeholder takes the chart's height: the plot, its readout row and the legend. */
  ${La(".history-skeleton")}
  .history-skeleton .sk-plot { height: 200px; border-radius: 4px; }
  /* Text that only holds its place: unseen, with a pulsing bar over each line. */
  .sk-reserve { position: relative; }
  .sk-reserve > * { visibility: hidden; }
  .sk-reserve::after { content: ""; position: absolute; inset: 3px 25% 3px 0; border-radius: 6px;
    background: color-mix(in srgb, var(--primary-text-color, #212121) 8%, transparent);
    background: repeating-linear-gradient(to bottom, color-mix(in srgb, var(--primary-text-color, #212121) 8%, transparent) 0 calc(1lh - 8px), transparent calc(1lh - 8px) 1lh);
    animation: sp-pulse 1.4s ease-in-out infinite alternate; }
  @media (prefers-reduced-motion: reduce) { .sk-reserve::after { animation: none; } }
  .care-skeleton .sk-ic { width: 40px; height: 40px; }
  .care-skeleton .li-main { gap: 6px; }
  .care-skeleton .sk-title { width: 45%; height: 14px; }
  .care-skeleton .sk-meta { width: 30%; }
  .history-plot { transition: opacity 150ms ease-out; }
  .history-plot.stale { opacity: .5; pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { .history-plot { transition: none; } }
  .history-rate strong { font-weight: 500; }

  ha-alert { display: block; }
  .alert-fallback { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 8px; background: color-mix(in srgb, var(--sp-warning) 14%, transparent); }
  .alert-title { font-weight: 500; }

  @container plant (max-width: 700px) {
    .hero { grid-template-columns: auto minmax(0, 1fr); gap: 14px; padding: 14px; }
    .hero-name { font-size: 21px; }
    .hero-actions { grid-column: 1 / -1; }
    .hero-buttons { flex: 1; flex-direction: row; flex-wrap: wrap; min-width: 0; max-width: none; }
    .hero-buttons .btn { flex: 1 1 auto; }
    .keyreads { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .kr { padding: 10px 14px; }
    .kr:nth-child(2n) { border-inline-end: 0; }
    .kr:nth-child(n+3) { border-top: 1px solid var(--divider-color, #e0e0e0); }
    .cols { grid-template-columns: minmax(0, 1fr); }
    .setrow { grid-template-columns: minmax(0, 1fr); }
    .setrow > .btn, .setrow > .row { justify-self: start; margin-inline-start: -12px; }
    .thr { grid-template-columns: minmax(0, 1fr); }
    .li { padding: 10px 12px; gap: 10px; }
    .pd .rel-group { padding-inline: 12px; }
    .kv { grid-template-columns: minmax(0, 1fr); gap: 2px 0; }
    .kv dd { margin-bottom: 8px; }
    dl.sensors, dl.other-targets { grid-template-columns: minmax(0, 1fr); gap: 2px 0; }
    dl.sensors dd, dl.other-targets dd { margin-bottom: 10px; }
  }
`;
// src/views/care-plan.ts
function Al(e) {
	let { l: t, plant: n } = e, r = n.care_tasks ?? [], i = r.length >= 20;
	return T`<section class="sp-card care-plan" aria-labelledby="care-plan-heading">
    <div class="card-h"><h3 id="care-plan-heading">${t.t("care_plan.heading")}</h3>
      <span class="row care-plan-actions">${r.length ? T`<button type="button" class="btn text sm" ?disabled=${e.disabled || i} title=${i ? t.t("care_plan.full") : ""} @click=${e.onAdd}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("care_plan.add_task")}</button>` : E}
        <ha-dropdown @wa-select=${(t) => {
		t.detail.item.value === "rest" && e.onRest();
	}}>
          <button slot="trigger" type="button" class="icon-btn" ?disabled=${e.disabled} aria-label=${t.t("care_plan.plan_menu")}><ha-icon aria-hidden="true" icon="mdi:dots-vertical"></ha-icon></button>
          <ha-dropdown-item value="rest" ?disabled=${e.disabled}>${t.t(n.rest_period ? "care_plan.rest_edit" : "care_plan.rest_set")}<ha-icon slot="icon" icon="mdi:weather-night"></ha-icon></ha-dropdown-item>
        </ha-dropdown></span></div>
    ${n.rest_period ? jl(e, n.rest_period) : E}
    ${r.length ? T`<ul class="list task-list" aria-label=${t.t("care_plan.tasks_label")}>${r.map((t) => Ml(e, t))}</ul>` : T`<div class="card-b"><div class="empty-box"><span>${t.t("care_plan.empty")}</span>
          <button type="button" class="btn tonal sm" ?disabled=${e.disabled} @click=${e.onAdd}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("care_plan.add_task")}</button></div>
          ${Vs(n).length || bs(n) !== null ? T`<p class="small muted care-note"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${t.t("care_plan.empty_suggestions")}</span></p>` : E}</div>`}
  </section>`;
}
function jl(e, t) {
	let { l: n } = e, r = Number(e.today.slice(5, 7)), i = mc(n, t, e.plant.care_tasks ?? [], e.today), a = ns(n, t.start_month, t.end_month, "short");
	return T`<div class="restline">
    <ha-icon aria-hidden="true" icon="mdi:weather-night"></ha-icon>
    <div class="restline-main"><div class="restline-top"><span class="restline-title">${n.t("care_plan.rest_period")}</span>
        <span class="months" role="img" aria-label=${n.t("care_plan.rest_months_label", { months: ns(n, t.start_month, t.end_month) })}>${Array.from({ length: 12 }, (e, t) => t + 1).map((e) => T`<i class="${dc(t, e) ? "on" : ""} ${e === r ? "now" : ""}">${ts(n, e, "narrow")}</i>`)}</span>
        <span aria-hidden="true">${a}</span></div>
      <div class="restline-text"><b>${i.season}</b> · ${i.tasks}</div></div>
    <button type="button" class="btn text sm" ?disabled=${e.disabled} aria-label=${n.t("care_plan.rest_edit")} @click=${e.onRest}>${n.t("care_plan.edit")}</button>
  </div>`;
}
function Ml(e, t) {
	let { l: n } = e, r = $o(n, t), i = e.overview?.care.find((e) => e.task_id === t.id), a = i ? Os(n, i, t.schedule, e.today, {
		lastDoneAt: t.last_done_at,
		timeZone: e.timeZone
	}) : null, o = As(t, e.timeZone), s = i ? hs(i, t.schedule, Date.now()) : null, c = e.disabled || e.pending.has(t.id), l = [
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
	return T`<li class="li task">
    <span class="ic tonal" aria-hidden="true"><ha-icon .icon=${Go[t.type]}></ha-icon></span>
    <span class="li-main"><span class="li-title">${r}</span>
      <span class="li-sub">${is(n, t.schedule, e.plant.rest_period ?? null, e.states)} · ${o ? n.t("care_plan.last_done", { date: rs(n, o, e.today) }) : n.t("care_plan.never_done")}${s ? T`<br>${gs(n, s, e.timeZone)}` : E}</span></span>
    <span class="task-side">${a ? T`<span class="cchip tone-${a.tone}"><ha-icon aria-hidden="true" .icon=${a.icon}></ha-icon><span>${a.text}</span></span>` : E}
      ${i?.is_due ? T`<button type="button" class="btn tonal sm" ?disabled=${c} aria-label=${n.t("care_plan.done_label", { name: r })} @click=${() => e.onDone(t)}><ha-icon aria-hidden="true" icon="mdi:check"></ha-icon>${n.t("care_plan.done")}</button>` : E}</span>
    <ha-dropdown class="task-menu" @wa-select=${(n) => e.onAction(t, n.detail.item.value)}>
      <button slot="trigger" type="button" class="icon-btn" ?disabled=${c} aria-label=${n.t("care_plan.task_menu", { name: r })}><ha-icon aria-hidden="true" icon="mdi:dots-vertical"></ha-icon></button>
      ${l.map(([e, t, r]) => T`<ha-dropdown-item value=${e} ?disabled=${c}>${n.t(t)}<ha-icon slot="icon" icon=${r}></ha-icon></ha-dropdown-item>`)}
    </ha-dropdown>
  </li>`;
}
function Nl(e, t) {
	return e.t(t.taskId ? "care_plan.edit_title" : "care_plan.add_title");
}
function Pl(e) {
	return e.state.step === 1 ? Fl(e) : Ul(e);
}
function Fl(e) {
	let { l: t, plant: n } = e, r = Ms(n.care_tasks ?? []), i = Vs(n), a = bs(n), o = a === null ? null : Ls(n, e.states, t), s = n.species?.snapshot.latin_name ?? n.species?.snapshot.common_name ?? "";
	return T`<p class="muted">${t.t("care_plan.add_intro")}</p>
    ${i.length || o ? T`<section class="suggestions" aria-labelledby="suggestions-heading">
      <h4 id="suggestions-heading"><ha-icon aria-hidden="true" icon="mdi:auto-fix"></ha-icon><span>${t.t("care_plan.suggestions_for")} <i>${s}</i></span></h4>
      ${i.map(({ type: n, text: i }) => {
		let a = t.t(`care_task_type.${n}`), o = i.length > Il, s = e.state.expanded === n;
		return T`<div class="suggestion">
          <div class="suggestion-main"><span class="suggestion-source"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon>${t.t("care_plan.suggestion_source", { topic: t.t(n === "fertilize" ? "care_plan.note_fertilization" : "care_plan.note_pruning") })}</span>
            <q class=${o && !s ? "clamped" : ""} id="suggestion-${n}">${i}</q>
            ${o ? T`<button type="button" class="linkbtn" aria-expanded=${s ? "true" : "false"} aria-controls="suggestion-${n}" @click=${() => e.onExpand(s ? null : n)}>${t.t(s ? "care_plan.show_less" : "care_plan.show_more")}</button>` : E}</div>
          ${r.has(n) ? T`<span class="small muted">${t.t("care_plan.preset_exists")}</span>` : T`<button type="button" class="btn tonal sm" ?disabled=${e.busy} @click=${() => e.onSuggestion(n, i)}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("care_plan.suggestion_add", { name: a })}</button>`}
        </div>`;
	})}
      ${o && a !== null ? T`<div class="suggestion">
          <div class="suggestion-main"><span class="suggestion-source"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon>${t.t("care_plan.suggestion_source", { topic: t.t("care_plan.note_min_temperature") })}</span>
            <span class="suggestion-value">${t.t("care_plan.grows_above", { value: ss(t, a, "°C") })}</span></div>
          ${r.has("winter_protection") ? T`<span class="small muted">${t.t("care_plan.preset_exists")}</span>` : T`<button type="button" class="btn tonal sm" ?disabled=${e.busy} @click=${() => e.onDraft(o)}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("care_plan.suggestion_add_winter")}</button>`}
        </div>` : E}</section>
      <span class="field-label">${t.t("care_plan.from_scratch")}</span>` : E}
    <div class="presets" role="list">${Wo.map((i) => {
		let a = r.has(i), o = !a && i === "winter_protection" && Is(n, e.states, t), s = a ? t.t("care_plan.preset_exists") : i === "custom" ? t.t("care_plan.preset_custom") : i === "winter_protection" ? t.t("care_plan.preset_winter") : is(t, Vl(Fs(i)), n.rest_period ?? null);
		return T`<div role="listitem"><button type="button" class="preset" ?disabled=${a || e.busy} @click=${() => e.onPreset(i)}>
        <span class="ic tonal" aria-hidden="true"><ha-icon .icon=${Go[i]}></ha-icon></span>
        <span class="preset-text"><span class="preset-name">${t.t(`care_task_type.${i}`)}</span><span class="preset-d">${s}</span>
          ${o ? T`<span class="preset-hint">${t.t("care_plan.preset_winter_needs_source")}</span>` : E}</span></button></div>`;
	})}</div>
    <div class="actions dialog-actions"><span class="spacer"></span><button type="button" @click=${e.onCancel}>${t.t("common.cancel")}</button></div>`;
}
var Il = 160;
function Ll(e, t) {
	let { l: n, plant: r, state: i } = e, a = i.draft, o = i.errors, s = e.states, c = Ss(r);
	a.role && os(a.role) && !c.includes(a.role) && c.push(a.role);
	let l = qs(a) ? a.forecast : null, u = !a.role && !l && (!!a.entityId || !!i.otherSensor), d = a.role ? `role:${a.role}` : l ? `forecast:${l}` : u ? "other" : "", f = ds(n, s), p = f.length > 0 || !!l, m = ps(a, s), h = a.forecastHours, g = (t) => {
		let o = n.t(`care_plan.forecast_row_${t}`, { window: ls(n, h) }), s = a.weatherEntityId ? ms(r, e.overview, i.taskId, {
			entity_id: a.weatherEntityId,
			reading: t,
			hours: h
		}) : null;
		return s ? n.t("care_plan.reading_role_value", {
			role: o,
			value: ss(n, s.value, s.unit)
		}) : o;
	}, _ = f.some((e) => e.entity_id === a.weatherEntityId), v = f.length === 1 && (_ || !l) ? n.t("care_plan.reading_group_forecast_entity", { name: cs(n, { entity_id: f[0].entity_id }, s) }) : n.t("care_plan.reading_group_forecast"), y = (t, n) => {
		n && (e.onEditor({ otherSensor: !1 }), e.onChange(ws(a, { forecast: {
			entity_id: n,
			reading: t,
			hours: h
		} }, fs(n, s), r)));
	}, b = (t) => {
		let r = e.overview?.roles[t]?.value;
		return typeof r == "number" ? n.t("care_plan.reading_role_value", {
			role: F(n, t),
			value: ss(n, r, qo[t])
		}) : F(n, t);
	}, x = (t) => {
		if (t === "other") {
			e.onEditor({ otherSensor: !0 }), e.onChange(ws(a, null, null, r));
			return;
		}
		if (t === "forecast:low" || t === "forecast:high") {
			let e = a.weatherEntityId && f.some((e) => e.entity_id === a.weatherEntityId) ? a.weatherEntityId : null;
			y(t === "forecast:low" ? "low" : "high", e ?? f[0]?.entity_id ?? a.weatherEntityId);
			return;
		}
		let n = t.slice(5);
		os(n) && (e.onEditor({ otherSensor: !1 }), e.onChange(ws(a, { role: n }, qo[n], r)));
	}, S = (t) => {
		t && e.onChange(ws(a, { entity_id: t }, Ts({ entity_id: t }, s), r));
	}, ee = a.readingUnit ?? "", C = xs(r, a, s), te = Gs(a.value);
	return T`<label>${n.t("care_plan.reading")}<select aria-invalid=${o.source ? "true" : "false"} aria-describedby=${o.source ? "task-source-error" : E} @change=${(e) => x(e.target.value)}>
      <option value="" disabled ?selected=${d === ""}>${n.t("care_plan.reading_choose")}</option>
      ${c.length ? T`<optgroup label=${n.t("care_plan.reading_group_plant")}>${c.map((e) => T`<option value="role:${e}" ?selected=${d === `role:${e}`}>${b(e)}</option>`)}</optgroup>` : E}
      <optgroup label=${n.t("care_plan.reading_group_other")}><option value="other" ?selected=${d === "other"}>${n.t("care_plan.reading_other")}</option></optgroup>
      ${p ? T`<optgroup label=${v}>${["low", "high"].map((e) => T`<option value="forecast:${e}" ?selected=${d === `forecast:${e}`}>${g(e)}</option>`)}</optgroup>` : E}</select></label>
    ${u ? zl(e, S) : E}
    ${l && (f.length > 1 || !_) ? Rl(e, f, m, (e) => y(l, e)) : E}
    ${o.source === "care_plan.error_weather_missing" ? E : Hl("task-source-error", t("source"))}
    <div class="grid2">
      <label>${n.t("care_plan.due_when")}<select @change=${(t) => e.onChange({ condition: t.target.value === "above" ? "above" : "below" })}>
        <option value="below" ?selected=${a.condition === "below"}>${n.t("care_plan.below")}</option>
        <option value="above" ?selected=${a.condition === "above"}>${n.t("care_plan.above")}</option></select></label>
      <label>${n.t("care_plan.value")}<span class="suffix-field"><input type="text" inputmode="decimal" required .value=${a.value} placeholder=${n.t("care_plan.value_placeholder")}
          aria-invalid=${o.value ? "true" : "false"} aria-describedby=${o.value ? "task-value-error" : E}
          @input=${(t) => e.onChange({ value: t.target.value })}>${ee ? T`<span class="suffix">${ee}</span>` : E}</span></label></div>
    ${Hl("task-value-error", t("value"))}
    ${C === null ? E : te === C ? T`<div class="note-hint small"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${n.t("care_plan.min_temp_applied")}</span></div>` : T`<div class="note-hint small"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${n.t("care_plan.min_temp_hint", { value: ss(n, C, a.readingUnit ?? "°C") })}</span>
          <button type="button" class="btn text sm" ?disabled=${e.busy} aria-label=${n.t("care_plan.min_temp_use_label", { value: ss(n, C, a.readingUnit ?? "°C") })} @click=${() => e.onChange({ value: String(C) })}>${n.t("care_plan.min_temp_use")}</button></div>`}`;
}
function Rl(e, t, n, r) {
	let { l: i } = e, a = e.state.draft, o = e.states, s = a.weatherEntityId, c = !!s && t.some((e) => e.entity_id === s);
	return T`<label>${i.t("care_plan.weather_entity")}<select aria-invalid=${n ? "true" : "false"} aria-describedby=${n ? "task-weather-error" : E} @change=${(e) => r(e.target.value)}>
      ${s && !c ? T`<option value="" disabled selected>${n ? s : cs(i, { entity_id: s }, o)}</option>` : E}
      ${t.map((e) => T`<option value=${e.entity_id} ?selected=${e.entity_id === s}>${cs(i, { entity_id: e.entity_id }, o)}</option>`)}</select></label>
    ${n ? Hl("task-weather-error", i.t("care_plan.error_weather_missing")) : E}`;
}
function zl(e, t) {
	let { l: n } = e, r = e.state.draft, i = e.states, a = r.entityId ? T`<span class="small muted chosen-sensor">${cs(n, { entity_id: r.entityId }, i)} · <code>${r.entityId}</code></span>` : E;
	if (Y("ha-entity-picker") && e.hass) return T`<ha-entity-picker .hass=${e.hass} .label=${n.t("care_plan.reading_sensor")} .placeholder=${n.t("wizard.search_sensors")} .value=${r.entityId ?? ""} .includeDomains=${["sensor"]}
      .entityFilter=${(e) => Cs(e)} @value-changed=${(e) => t(e.detail.value ?? "")}></ha-entity-picker>${a}`;
	let o = Object.values(i ?? {}).filter(Cs).sort((e, t) => cs(n, { entity_id: e.entity_id }, i).localeCompare(cs(n, { entity_id: t.entity_id }, i)));
	return T`<label>${n.t("care_plan.reading_sensor")}<select @change=${(e) => t(e.target.value)}>
    <option value="" disabled ?selected=${!r.entityId}>${o.length ? n.t("care_plan.reading_choose") : n.t("care_plan.reading_no_sensors")}</option>
    ${o.map((e) => T`<option value=${e.entity_id} ?selected=${e.entity_id === r.entityId}>${cs(n, { entity_id: e.entity_id }, i)}</option>`)}</select></label>`;
}
function Bl(e, t) {
	let { l: n } = e, r = e.state.draft, i = e.state.errors, a = r.readingUnit ?? "", o = (e, t, n) => t ? `${e} ${n}` : e, s = qs(r);
	return T`<div id="task-more"><div class="grid2">
      ${s ? T`<label>${n.t("care_plan.look_ahead")}<select aria-describedby="task-ahead-hint" @change=${(t) => e.onChange({ forecastHours: Number(t.target.value) })}>
          ${Yo.map((e) => T`<option value=${e} ?selected=${r.forecastHours === e}>${n.t(`care_plan.look_ahead_${e}`)}</option>`)}</select></label>` : T`<label>${n.t("care_plan.for_hours")}<span class="suffix-field"><input type="number" inputmode="decimal" min="0" max=${72} step="any" .value=${r.forHours}
          aria-invalid=${i.forHours ? "true" : "false"} aria-describedby=${o("task-for-hint", !!i.forHours, "task-for-error")}
          @input=${(t) => e.onChange({ forHours: t.target.value })}><span class="suffix">${n.t("care_plan.hours")}</span></span></label>`}
      <label>${n.t(r.condition === "below" ? "care_plan.reset_after_above" : "care_plan.reset_after_below")}<span class="suffix-field"><input type="text" inputmode="decimal" .value=${r.resetValue} placeholder=${r.value.trim()}
          aria-invalid=${i.resetValue ? "true" : "false"} aria-describedby=${o("task-reset-hint", !!i.resetValue, "task-reset-error")}
          @input=${(t) => e.onChange({ resetValue: t.target.value })}>${a ? T`<span class="suffix">${a}</span>` : E}</span></label></div>
    ${s ? E : Hl("task-for-error", t("forHours"))}${Hl("task-reset-error", t("resetValue"))}
    ${s ? T`<span class="small muted" id="task-ahead-hint">${n.t("care_plan.look_ahead_hint")}</span>` : T`<span class="small muted" id="task-for-hint">${n.t("care_plan.for_hours_hint")}</span>`}
    <span class="small muted" id="task-reset-hint">${n.t("care_plan.reset_hint")}</span></div>`;
}
function Vl(e) {
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
function Hl(e, t) {
	return t ? T`<span class="error-text small" id=${e}>${t}</span>` : E;
}
function Ul(e) {
	let { l: t, plant: n, state: r } = e, i = r.draft, a = r.errors, o = (e) => {
		let n = a[e];
		return n ? t.t(n) : void 0;
	}, s = t.t(`care_task_type.${i.type}`), c = i.type === "custom", l = n.rest_period ?? null, u = i.startMonth !== null && i.endMonth !== null ? new Set(es(i.startMonth, i.endMonth)) : /* @__PURE__ */ new Set(), d = (e) => e.target.value, f = Bs(n, i.type), p = i.mode === "reading", m = r.moreOpen || !!a.lastDone || !!a.forHours || !!a.resetValue;
	return T`${r.error ? T`<p class="error" role="alert">${r.error}</p>` : E}
    <div class="task-summary"><ha-icon aria-hidden="true" .icon=${Go[i.type]}></ha-icon>
      <span><span class="summary-name">${i.name.trim() || s}</span> · ${nc(t, i, l, e.states)}</span></div>
    <label>${c ? t.t("care_plan.name") : t.t("care_plan.name_optional")}
      <input type="text" maxlength=${Ke(60)} .value=${i.name} placeholder=${c ? "" : s} ?required=${c}
        aria-invalid=${a.name ? "true" : "false"} aria-describedby=${a.name ? "task-name-error" : E}
        @input=${(t) => e.onChange({ name: d(t) })}></label>
    ${Hl("task-name-error", o("name"))}
    <div class="field-group"><span class="field-label" id="task-mode-label">${t.t("care_plan.when_due")}</span>
      <div class="seg" role="group" aria-labelledby="task-mode-label">
        <button type="button" aria-pressed=${i.mode === "interval" ? "true" : "false"} @click=${() => e.onChange({ mode: "interval" })}>${t.t("care_plan.mode_interval")}</button>
        <button type="button" aria-pressed=${i.mode === "yearly" ? "true" : "false"} @click=${() => e.onChange({ mode: "yearly" })}>${t.t("care_plan.mode_yearly")}</button>
        <button type="button" aria-pressed=${p ? "true" : "false"} @click=${() => e.onChange({ mode: "reading" })}>${t.t("care_plan.mode_reading")}</button></div></div>
    ${p ? Ll(e, o) : i.mode === "interval" ? T`<div class="grid2">
        <label>${t.t("care_plan.every")}<input type="number" inputmode="numeric" min="1" max="999" step="1" .value=${i.every}
          aria-invalid=${a.every ? "true" : "false"} aria-describedby=${a.every ? "task-every-error" : E}
          @input=${(t) => e.onChange({ every: d(t) })}></label>
        <label>${t.t("care_plan.unit")}<select .value=${i.unit} @change=${(t) => e.onChange({ unit: t.target.value })}>
          ${Xo.map((e) => T`<option value=${e} ?selected=${e === i.unit}>${t.t(`care_plan.unit_${e}`)}</option>`)}</select></label></div>
      ${Hl("task-every-error", o("every"))}
      ${l ? T`<div><label class="check"><input type="checkbox" aria-describedby="task-growing-hint" .checked=${i.growingSeasonOnly} @change=${(t) => e.onChange({ growingSeasonOnly: t.target.checked })}>
        <span>${t.t("care_plan.growing_only")}</span></label>
        <span class="small muted growing-hint" id="task-growing-hint">${t.t("care_plan.growing_only_hint", { months: ns(t, l.start_month, l.end_month) })}</span></div>` : E}` : T`<div class="field-group"><span class="field-label" id="task-months-label">${t.t("care_plan.months")}</span>
        <div class="monthpick" role="group" aria-labelledby="task-months-label" aria-describedby=${a.months ? "task-months-error task-months-hint" : "task-months-hint"}>
          ${Array.from({ length: 12 }, (e, t) => t + 1).map((n) => T`<button type="button" aria-pressed=${u.has(n) ? "true" : "false"} aria-description=${ts(t, n)} @click=${() => e.onMonth(n)}>${ts(t, n, "short")}</button>`)}</div>
        <span class="small muted" id="task-months-hint">${t.t("care_plan.months_hint")}</span>
        ${Hl("task-months-error", o("months"))}</div>`}
    <label>${t.t("care_plan.instructions")}<textarea rows=${i.instructions.length > Il ? 6 : 3} maxlength=${Ke(Zo)} .value=${i.instructions} placeholder=${t.t("care_plan.instructions_placeholder")}
      aria-invalid=${a.instructions ? "true" : "false"} aria-describedby=${a.instructions ? "task-instructions-error" : E}
      @input=${(t) => e.onChange({ instructions: t.target.value })}></textarea></label>
    ${Hl("task-instructions-error", o("instructions"))}
    ${f && !i.instructions.trim() ? T`<div class="note-hint small"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${t.t("care_plan.note_hint")}</span>
        <button type="button" class="btn text sm" ?disabled=${e.busy} @click=${() => e.onChange({ instructions: f })}>${t.t("care_plan.note_use")}</button></div>` : f && i.instructions === f ? T`<div class="note-hint small"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${t.t("care_plan.note_applied")}</span></div>` : E}
    <div class="more-options">
      <button type="button" class="btn text sm" aria-expanded=${m ? "true" : "false"} aria-controls="task-more" @click=${e.onToggleMore}>
        <ha-icon aria-hidden="true" icon=${m ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>${t.t("care_plan.more_options")}${p && !m ? T`<span class="more-hint">&nbsp;· ${t.t(qs(i) ? "care_plan.more_options_forecast" : "care_plan.more_options_reading")}</span>` : E}</button>
      ${m && p ? Bl(e, o) : m ? T`<div id="task-more"><label>${t.t("care_plan.last_done_field")}
        <input type="date" max=${e.today} .value=${i.lastDone} aria-invalid=${a.lastDone ? "true" : "false"} aria-describedby="task-last-done-hint${a.lastDone ? " task-last-done-error" : ""}"
          @input=${(t) => e.onChange({ lastDone: d(t) })}></label>
        <span class="small muted" id="task-last-done-hint">${t.t("care_plan.last_done_hint")}</span>${Hl("task-last-done-error", o("lastDone"))}</div>` : E}
    </div>
    <div class="actions dialog-actions">
      ${r.taskId ? T`<button type="button" class="danger-text" ?disabled=${e.busy} @click=${e.onDelete}>${t.t("care_plan.delete")}</button><span class="spacer"></span>` : T`<button type="button" ?disabled=${e.busy} @click=${e.onBack}>${t.t("care_plan.back")}</button><span class="spacer"></span>`}
      <button type="button" ?disabled=${e.busy} @click=${e.onCancel}>${t.t("common.cancel")}</button>
      <button type="button" class="primary" ?disabled=${e.busy || ps(i, e.states)} @click=${e.onSave}>${t.t(r.taskId ? "care_plan.save" : "care_plan.add_task")}</button></div>`;
}
function Wl(e) {
	let { l: t, plant: n, draft: r } = e, i = (n.care_tasks ?? []).filter((e) => e.schedule.kind === "interval"), a = r.startMonth !== null && r.endMonth !== null ? new Set(es(r.startMonth, r.endMonth)) : /* @__PURE__ */ new Set();
	return T`<p class="muted">${t.t("care_plan.rest_intro")}</p>
    <p class="small muted">${t.t("care_plan.rest_watering")}</p>
    <div class="field-group"><span class="field-label" id="rest-months-label">${t.t("care_plan.rest_months")}</span>
      <div class="monthpick" role="group" aria-labelledby="rest-months-label" aria-describedby=${e.error ? "rest-error rest-months-hint" : "rest-months-hint"}>
        ${Array.from({ length: 12 }, (e, t) => t + 1).map((n) => T`<button type="button" aria-pressed=${a.has(n) ? "true" : "false"} aria-description=${ts(t, n)} @click=${() => e.onMonth(n)}>${ts(t, n, "short")}</button>`)}</div>
      <span class="small muted" id="rest-months-hint">${t.t("care_plan.months_hint")}</span>
      ${e.error ? T`<span class="error-text small" id="rest-error">${e.error}</span>` : E}</div>
    <fieldset class="rest-tasks"><legend class="field-label">${t.t("care_plan.rest_off_heading")}</legend>
      ${i.length ? i.map((n) => T`<div><label class="check"><input type="checkbox" .checked=${r.off.has(n.id)} aria-describedby="rest-task-${n.id}"
          @change=${(t) => e.onToggle(n.id, t.target.checked)}><span>${$o(t, n)}</span></label>
          <span class="small muted growing-hint" id="rest-task-${n.id}">${is(t, n.schedule, null)}</span></div>`) : T`<p class="small muted">${t.t("care_plan.rest_no_repeating")}</p>`}
      <p class="small muted">${t.t("care_plan.rest_yearly_note")}</p></fieldset>
    <div class="actions dialog-actions">
      ${n.rest_period ? T`<button type="button" class="danger-text" ?disabled=${e.busy} @click=${e.onRemove}>${t.t("care_plan.rest_remove")}</button>` : E}<span class="spacer"></span>
      <button type="button" ?disabled=${e.busy} @click=${e.onCancel}>${t.t("common.cancel")}</button>
      <button type="button" class="primary" ?disabled=${e.busy} @click=${e.onSave}>${t.t("care_plan.save")}</button></div>`;
}
function Gl(e) {
	let { l: t } = e;
	return T`<p class="muted">${t.t("care_plan.automate_intro")}</p>
    <ul class="list automate-list">${e.rows.map((n) => T`<li class="li"><span class="ic tonal" aria-hidden="true"><ha-icon .icon=${n.icon}></ha-icon></span>
      <span class="li-main"><span class="li-title">${n.entityId ? T`<code>${n.entityId}</code>` : t.t("care_plan.automate_missing")}</span>
        <span class="li-sub">${n.description}${n.note ? T`<br>${n.note}` : E}</span></span>
      ${n.entityId ? T`<button type="button" class="icon-btn" aria-label=${t.t("care_plan.copy", { entity: n.entityId })} @click=${() => e.onCopy(n.entityId)}><ha-icon aria-hidden="true" icon="mdi:content-copy"></ha-icon></button>` : T`<span></span>`}</li>`)}</ul>
    <p class="small automate-hint"><ha-icon aria-hidden="true" icon="mdi:lightbulb-outline"></ha-icon><span>${t.t("care_plan.automate_action_before")}<code>smart_plants.log_care</code>${t.t("care_plan.automate_action_after")}</span></p>
    <div class="actions dialog-actions"><span class="spacer"></span><button type="button" @click=${e.onClose}>${t.t("care_plan.close")}</button>
      <button type="button" class="primary" @click=${e.onOpenEditor}>${t.t("care_plan.open_automation_editor")}</button></div>`;
}
var Kl = o`
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
`, ql = 5242880, Jl = 2048, Yl = 41943040, Xl = 64e6, Zl = [
	Jl,
	1600,
	1280
], Ql = [
	.85,
	.75,
	.65,
	.55
], $l = 262144, eu = [
	"image/jpeg",
	"image/png",
	"image/webp"
], tu = ["image/heic", "image/heif"], nu = [
	"heic",
	"heix",
	"mif1",
	"msf1"
], ru = (e) => tu.includes(e.type) || (e.type === "" || e.type === "application/octet-stream") && /\.hei[cf]$/i.test(e.name), iu = (e) => /iPhone|iPad|iPod/.test(e.userAgent) || /Macintosh/.test(e.userAgent) && e.maxTouchPoints > 1, au = (e = navigator) => (iu(e) ? eu : [
	...eu,
	...tu,
	".heic",
	".heif"
]).join(","), ou = [
	"",
	"application/octet-stream",
	"image/jpg"
];
async function su(e, t, n, r) {
	let i = r && ru(e), a = !i && ou.includes(e.type);
	if (!i && !a && !eu.includes(e.type) || e.size === 0 || e.size > t) throw Error(n.t(t > 5242880 ? "image_error.type_or_input_size" : "image_error.type_or_size"));
	let o;
	try {
		o = new Uint8Array(await e.slice(0, 12).arrayBuffer());
	} catch {
		throw Error(n.t("image_error.unreadable"));
	}
	let s = (...e) => e.every((e, t) => o[t] === e), c = (e, t) => String.fromCharCode(...o.subarray(e, t)), l = s(255, 216, 255) ? "image/jpeg" : s(137, 80, 78, 71, 13, 10, 26, 10) ? "image/png" : s(82, 73, 70, 70) && o[8] === 87 && o[9] === 69 && o[10] === 66 && o[11] === 80 ? "image/webp" : c(4, 8) === "ftyp" && nu.includes(c(8, 12)) ? "image/heic" : null, u = i ? "image/heic" : a ? l !== null && eu.includes(l) ? l : null : e.type;
	if (l === null || l !== u) throw Error(n.t("image_error.signature"));
	return l;
}
async function cu(e, t) {
	if (![
		"image/jpeg",
		"image/png",
		"image/webp"
	].includes(t)) return null;
	let n;
	try {
		n = new Uint8Array(await e.slice(0, t === "image/jpeg" ? $l : 30).arrayBuffer());
	} catch {
		return null;
	}
	let r = new DataView(n.buffer, n.byteOffset, n.byteLength), i = (e) => String.fromCharCode(...n.subarray(e, e + 4)), a = (e, t) => e > 0 && t > 0 ? {
		width: e,
		height: t
	} : null;
	if (t === "image/png") return n.length >= 24 && i(12) === "IHDR" ? a(r.getUint32(16), r.getUint32(20)) : null;
	if (t === "image/webp") {
		if (n.length < 30) return null;
		let e = (e) => r.getUint16(e, !0) + (r.getUint8(e + 2) << 16);
		switch (i(12)) {
			case "VP8 ": return n[23] === 157 && n[24] === 1 && n[25] === 42 ? a(r.getUint16(26, !0) & 16383, r.getUint16(28, !0) & 16383) : null;
			case "VP8L": {
				if (n[20] !== 47) return null;
				let e = r.getUint32(21, !0);
				return a((e & 16383) + 1, (e >>> 14 & 16383) + 1);
			}
			case "VP8X": return a(e(24) + 1, e(27) + 1);
			default: return null;
		}
	}
	let o = 2;
	for (; o + 4 <= n.length;) {
		if (n[o] !== 255) return null;
		let e = n[o + 1];
		if (e === 255) {
			o += 1;
			continue;
		}
		if (e === 1 || e >= 208 && e <= 216) {
			o += 2;
			continue;
		}
		if (e === 217 || e === 218) return null;
		let t = r.getUint16(o + 2);
		if (t < 2) return null;
		if (e >= 192 && e <= 207 && e !== 196 && e !== 200 && e !== 204) return o + 9 <= n.length ? a(r.getUint16(o + 7), r.getUint16(o + 5)) : null;
		o += 2 + t;
	}
	return null;
}
async function lu(e, t, n = !1) {
	if (typeof createImageBitmap == "function") try {
		let t = await createImageBitmap(e, { imageOrientation: "from-image" });
		return {
			source: t,
			width: t.width,
			height: t.height,
			release: () => t.close()
		};
	} catch {}
	let r = URL.createObjectURL(e);
	try {
		let e = new Image();
		return await new Promise((t, n) => {
			e.onload = () => t(), e.onerror = () => n(/* @__PURE__ */ Error("decode")), e.src = r;
		}), {
			source: e,
			width: e.naturalWidth,
			height: e.naturalHeight,
			release: () => void 0
		};
	} catch {
		throw Error(t.t(n ? "image_error.heic_decode" : "image_error.decode"));
	} finally {
		URL.revokeObjectURL(r);
	}
}
var uu = (e, t) => Number.isInteger(e) && Number.isInteger(t) && e >= 1 && t >= 1;
async function du(e, t = B) {
	let n = await su(e, ql, t, !1), { width: r, height: i, release: a } = await lu(e, t);
	if (a(), !uu(r, i) || r > 2048 || i > 2048) throw Error(t.t("image_error.dimensions"));
	return {
		format: n,
		bytes: e.size,
		width: r,
		height: i
	};
}
function fu(e, t, n) {
	return new Promise((r) => {
		e.toBlob((e) => r(e), t, n);
	});
}
var pu;
function mu() {
	if (pu === void 0) try {
		let e = document.createElement("canvas");
		e.width = 1, e.height = 1, pu = e.toDataURL("image/webp").startsWith("data:image/webp");
	} catch {
		pu = !1;
	}
	return pu;
}
async function hu(e, t = B) {
	let n = await su(e, Yl, t, !0), r = n === "image/heic", i = await cu(e, n);
	if (i && i.width * i.height > Xl) throw Error(t.t("image_error.too_many_pixels"));
	let { source: a, width: o, height: s, release: c } = await lu(e, t, r), l;
	try {
		if (!uu(o, s)) throw Error(t.t("image_error.decode"));
		if (o * s > Xl) throw Error(t.t("image_error.too_many_pixels"));
		if (!r && o <= 2048 && s <= 2048 && e.size <= 972800) return e.type === n ? e : new File([e], e.name, {
			type: n,
			lastModified: e.lastModified
		});
		let i = document.createElement("canvas");
		l = i;
		let c = mu(), u = 0;
		for (let n of Zl) {
			let r = Math.min(1, n / Math.max(o, s));
			if (Math.max(o, s) * r === u) continue;
			u = Math.max(o, s) * r, i.width = Math.max(1, Math.round(o * r)), i.height = Math.max(1, Math.round(s * r));
			let l = i.getContext("2d");
			if (!l) throw Error(t.t("image_error.resize"));
			let d = () => {
				c || (l.fillStyle = "#fff", l.fillRect(0, 0, i.width, i.height)), l.imageSmoothingEnabled = !0, l.imageSmoothingQuality = "high", l.drawImage(a, 0, 0, i.width, i.height);
			};
			d();
			for (let n of Ql) {
				let r = c ? await fu(i, "image/webp", n) : null;
				if (r?.type !== "image/webp" && (c && (c = !1, d()), r = await fu(i, "image/jpeg", n)), !r || !eu.includes(r.type)) throw Error(t.t("image_error.resize"));
				if (r.size > 0 && r.size <= 972800) {
					let t = r.type === "image/webp" ? "webp" : "jpg";
					return new File([r], `${e.name.replace(/\.[^.]*$/, "") || "photo"}.${t}`, { type: r.type });
				}
			}
		}
		throw Error(t.t("image_error.too_large_to_upload"));
	} finally {
		l && (l.width = 0, l.height = 0), c();
	}
}
// src/bundle-version.ts
function gu(e) {
	try {
		return new URL(e).searchParams.get("v") || null;
	} catch {
		return null;
	}
}
function _u(e, t) {
	return !!e && !!t && e !== t;
}
// src/snooze.ts
var vu = [
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
], yu = /^(\d{4})-(\d\d)-(\d\d)$/;
function bu(e, t) {
	let n = yu.exec(e);
	return n ? new Date(Date.UTC(Number(n[1]), Number(n[2]) - 1, Number(n[3]) + t)).toISOString().slice(0, 10) : e;
}
function xu(e, t) {
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
function Su(e, t) {
	let n = xu(e, t), r = Date.UTC(n.year, n.month - 1, n.day, n.hour % 24, n.minute, n.second);
	return Math.round((r - Math.floor(e / 1e3) * 1e3) / 6e4);
}
function Cu(e, t) {
	let n = yu.exec(e);
	if (!n) return null;
	let r = Date.UTC(Number(n[1]), Number(n[2]) - 1, Number(n[3]), 23, 59, 59), i = Su(r, t);
	i = Su(r - i * 6e4, t);
	let a = i < 0 ? "-" : "+", o = Math.abs(i);
	return `${e}T23:59:59${a}${String(Math.floor(o / 60)).padStart(2, "0")}:${String(o % 60).padStart(2, "0")}`;
}
function wu(e, t, n, r) {
	let i = vu.find((t) => t.choice === e);
	return i ? Cu(bu(t, i.days), r) : Eu(n, t) ? Cu(n, r) : null;
}
function Tu(e) {
	return {
		min: bu(e, 1),
		max: bu(e, 365)
	};
}
function Eu(e, t) {
	if (!yu.test(e) || bu(e, 0) !== e) return !1;
	let { min: n, max: r } = Tu(t);
	return e >= n && e <= r;
}
function Du(e, t = Date.now()) {
	if (!e) return null;
	let n = Date.parse(e);
	return Number.isFinite(n) && n > t ? e : null;
}
function Ou(e, t) {
	let n = Date.parse(e);
	if (!Number.isFinite(n)) return null;
	let r = xu(n - 1e3, t);
	return `${String(r.year).padStart(4, "0")}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`;
}
function ku(e, t, n) {
	let r = yu.exec(t);
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
function Au(e, t, n, r, i = Date.now()) {
	let a = Du(t, i), o = a ? Ou(a, r) : null;
	return o ? e.t("snooze.chip", { date: ku(e, o, n).replace(/\s/g, "\xA0") }) : null;
}
// src/styles.ts
var ju = o`
  :host{display:block;color:var(--primary-text-color,#212121);font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif);line-height:1.5;overflow-wrap:anywhere}
  *{box-sizing:border-box} .update-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-left:4px solid var(--info-color,#039be5);padding:8px 16px;margin-bottom:16px;background:var(--card-background-color,#fff)} .update-banner p{margin:0} main{width:100%;max-width:none;margin:0;padding:0} .panel-content{width:100%;max-width:1280px;margin:0 auto;padding:16px 24px 24px} header,.actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap} header{justify-content:space-between;margin-bottom:24px}
  .page-title{font-size:inherit;font-weight:inherit;margin:inherit;line-height:inherit}
  h1,h2,h3{line-height:1.2} h1{font-size:1.8rem} h2{font-size:1.3rem} h3{font-size:1.1rem} p{overflow-wrap:anywhere}
  section,article,.card{background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#ddd);border-radius:var(--ha-card-border-radius,12px);padding:20px;margin-bottom:16px} section>h2:first-child{margin-top:0}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px}
  label{display:grid;gap:6px;margin:12px 0}input,select,textarea,button{font:inherit;color:inherit;min-height:44px;border:1px solid var(--divider-color,#aaa);border-radius:8px;padding:8px 12px;background:var(--card-background-color,#fff);max-width:100%}input,select{width:100%}button{cursor:pointer;transition:border-color .16s ease,transform .16s ease}button:hover:not(:disabled){border-color:var(--primary-color,#007bad)}button.primary{background:var(--secondary-background-color,#f5f5f5);color:var(--primary-text-color,#212121);border:2px solid var(--primary-color,#007bad);font-weight:600}button:disabled{opacity:1;color:var(--secondary-text-color,#666);background:var(--secondary-background-color,#f5f5f5);border-color:var(--divider-color,#ddd);cursor:default}a{color:var(--primary-color,#007bad)}
  :focus-visible{outline:3px solid var(--primary-color,#03a9f4);outline-offset:3px}.check{display:flex;align-items:center;gap:10px}.check input{width:24px;height:24px;min-height:24px}.actions{margin-top:20px}small,.muted{display:block;color:var(--secondary-text-color,#666)}.error{border-left:4px solid var(--error-color,#b00020);padding:16px;background:var(--card-background-color,#fff);color:var(--error-color,#b00020)}.notice{border-left:4px solid var(--warning-color,#f90);padding:16px}fieldset{border:0;padding:0;margin:0;min-width:0}legend{font-weight:600}.empty{text-align:center;padding:48px 16px}.name{font-weight:600;text-align:left}.prose{white-space:pre-wrap}li{margin-bottom:12px}dl{display:grid;grid-template-columns:minmax(90px,1fr) 2fr;gap:4px 12px}dd{margin:0;overflow-wrap:anywhere}dt{color:var(--secondary-text-color,#666)}img.preview{max-width:100%;max-height:320px;object-fit:contain;border-radius:8px}dialog{color:var(--primary-text-color,#212121);background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#ddd);border-radius:16px;padding:24px;max-width:min(600px,calc(100vw - 32px));max-height:85vh;overflow:auto}dialog::backdrop{background:rgba(0,0,0,.5)}nav ol{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none}nav li{padding:6px 10px;border-radius:8px;background:var(--secondary-background-color,#eee)}[aria-current=step]{font-weight:bold;border:2px solid var(--primary-color,#03a9f4)}.load-error{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px}
  .stepper{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 12px!important;scrollbar-width:thin}.stepper li{display:flex;align-items:center;gap:8px;flex:0 0 auto;margin:0;color:var(--secondary-text-color,#666);font-size:.9rem}.step-number{display:grid;place-items:center;width:26px;height:26px;border:1px solid var(--divider-color,#aaa);border-radius:50%;font-size:.8rem}.stepper [aria-current=step]{color:var(--primary-text-color,#212121);border:0;font-weight:600}.stepper [aria-current=step] .step-number{background:var(--primary-color,#007bad);border-color:var(--primary-color,#007bad);color:var(--text-primary-color,#fff)}
  .choice-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px;margin:20px 0}.choice-card{display:grid;gap:8px;text-align:left;min-height:112px;padding:18px;background:var(--secondary-background-color,#f5f5f5);border-color:var(--divider-color,#ddd)}.choice-card strong{font-size:1.05rem}.choice-card span{color:var(--secondary-text-color,#666)}.choice-card.selected{border:2px solid var(--primary-color,#007bad);background:var(--primary-background-color,#eaf6fa)}.provider-help,.default-summary{padding:16px;border-radius:12px;background:var(--secondary-background-color,#f5f5f5);margin:16px 0}.provider-help{border-inline-start:4px solid var(--primary-color,#007bad)}.provider-help p{margin:8px 0}.advanced-disclosure{border:1px solid var(--divider-color,#ddd);border-radius:12px;padding:0 16px;margin:20px 0}.advanced-disclosure summary{cursor:pointer;font-weight:600;padding:16px 0}.advanced-disclosure[open]{padding-bottom:12px}.result-list{padding-inline-start:20px}.result-list button{text-align:left}
   .detail-tabs{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 12px;margin:8px 0 16px}.detail-tabs button{flex:0 0 auto;background:var(--secondary-background-color,#f5f5f5);border-color:transparent}.detail-tabs button[aria-current=page]{background:var(--secondary-background-color,#f5f5f5);color:var(--primary-text-color,#212121);border:2px solid var(--primary-color,#007bad);font-weight:600}.plant-overview-card{padding:0;overflow:hidden}.overview-heading{display:flex;align-items:center;gap:20px;padding:24px;background:var(--secondary-background-color,#f5f5f5)}.overview-avatar{width:84px;height:84px;flex:0 0 84px;object-fit:cover;border-radius:16px}.overview-avatar.placeholder{display:grid;place-items:center;background:var(--secondary-background-color,#f5f5f5);color:var(--primary-text-color,#212121);font-size:2rem;font-weight:700;border:1px solid var(--divider-color,#ddd)}.overview-heading h2{font-size:1.8rem;margin:4px 0}.overview-heading>section,.overview-heading>article{padding:0;margin:0;border:0;background:transparent}.eyebrow{font-size:.75rem;font-weight:700;letter-spacing:.08em;color:var(--secondary-text-color,#666);margin:0}.overview-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:20px}.overview-metrics article{display:grid;gap:4px;margin:0;background:var(--secondary-background-color,#f5f5f5);border:0}.overview-metrics article span{color:var(--secondary-text-color,#666)}.overview-metrics article strong{font-size:1.45rem}.overview-sensors,.overview-care{border:0;border-top:1px solid var(--divider-color,#ddd);border-radius:0;margin:0}.overview-sensors h2,.overview-care h2{margin-top:0}.overview-heading button{margin-top:8px}
  .detail-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:4px 2px 8px}.detail-heading h2{font-size:1.5rem;margin:0}.detail-heading p{margin:4px 0;color:var(--secondary-text-color,#666)}.detail-heading a{color:var(--primary-text-color,#212121);text-decoration:underline;text-underline-offset:3px}
  @media(max-width:600px){.panel-content{padding:16px 16px 16px}section,article{padding:16px}.actions button{flex:1 1 auto}header{align-items:flex-start}dl{grid-template-columns:1fr}dd{margin-bottom:8px}.stepper li span:last-child{display:none}.stepper li[aria-current=step] span:last-child{display:inline}.choice-card{min-height:0}.overview-heading{align-items:flex-start;flex-direction:column;padding:18px}.overview-metrics{grid-template-columns:1fr;padding:14px}.detail-tabs button{font-size:.9rem;padding:8px}}
`, Mu, Nu = [
	"ha-area-picker",
	"ha-entity-picker",
	"ha-selector",
	"ha-alert",
	"ha-expansion-panel",
	"ha-dropdown",
	"ha-dropdown-item"
], Pu = Lt.filter((e) => e !== "moisture"), Fu = "/config/integrations/integration/smart_plants", Iu = "https://open.plantbook.io/apikey/", Lu = /* @__PURE__ */ new Set([
	"api_error.storage_full",
	"api_error.pending_operations_full",
	"api_error.storage_failed"
]), X = class extends D {
	constructor(...e) {
		super(...e), this.areas = [], this.entities = [], this.devices = [], this.states = {}, this.blocked = !1, this.navigationContext = 0, this.photoStatus = "", this.step = 1, this.busy = !1, this.error = "", this.name = "", this.area = "", this.photo = null, this.photoUrl = null, this.photoError = "", this.photoChecking = !1, this.dragging = !1, this.moisture = ki(), this.extras = [], this.pendingRole = null, this.roleMenu = !1, this.expanded = /* @__PURE__ */ new Set(), this.opened = /* @__PURE__ */ new Set(), this.query = "", this.results = [], this.searched = !1, this.preview = null, this.accepted = !1, this.speciesError = "", this.common = "", this.latin = "", this.acquired = "", this.placement = "", this.category = "", this.tagText = "", this.draft = null, this.finalRequest = null, this.rejected = !1, this.created = null, this.generation = 0, this.lifecycle = 0, this.photoCheck = 0, this.entityById = /* @__PURE__ */ new Map(), this.areaOfEntity = /* @__PURE__ */ new Map(), this.pendingPrefill = null;
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
		return ar(this.hass);
	}
	connectedCallback() {
		super.connectedCallback();
		for (let e of Nu) Y(e) || customElements.whenDefined(e).then(() => this.requestUpdate());
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
			let t = await z.startWizard(this.hass);
			e === this.lifecycle && this.isConnected && (this.draft = t);
		} catch (t) {
			e === this.lifecycle && this.fail(t);
		} finally {
			e === this.lifecycle && (this.busy = !1);
			let t = this.pendingPrefill;
			this.pendingPrefill = null, t && e === this.lifecycle && this.draft && this.prefill(t);
		}
	}
	commonName(e) {
		let t = Mi(e, this.l.language);
		return t && t !== e.latin_name ? t : null;
	}
	message(e) {
		let t = e instanceof L ? `api_error.${e.code}` : "";
		return Lu.has(t) && Qn(t) ? this.l.t(t) : e instanceof L && [
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
		t ? this.speciesError = n : this.error = n, e instanceof L && ["integration_not_loaded", "unauthorized"].includes(e.code) && this.dispatchEvent(new CustomEvent("backend-unavailable", {
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
			...or,
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
		let e = this.lifecycle;
		if (!A(this.query.trim(), 100)) {
			this.speciesError = this.l.t("species.error_query_length");
			return;
		}
		let t = ++this.generation;
		this.busy = !0, this.speciesError = "", this.preview = null, this.accepted = !1;
		try {
			let e = await z.searchSpecies(this.hass, "openplantbook", this.query.trim(), this.hass.language ?? "en");
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
			let t = await z.previewWizard(this.hass, this.draft, e.provider, e.provider_ref, this.hass.language ?? "en");
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
		return Number.isFinite(r) ? I(this.l, r, n) : t.state;
	}
	fits(e, t) {
		if (!t.entity_id.startsWith("sensor.") || this.entityById.get(t.entity_id)?.platform === "smart_plants") return !1;
		let n = t.attributes.device_class, r = t.attributes.unit_of_measurement;
		if (e === "moisture") return n === "moisture";
		let i = Bi(e);
		return !!i && n === i.deviceClass && typeof r == "string" && i.acceptedUnits.includes(r);
	}
	roleFor(e) {
		let t = Lt.find((t) => t !== "soil_temperature" && this.fits(t, e)) ?? null;
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
	prefill(e) {
		if (this.busy && !this.draft && this.step === 1) this.pendingPrefill = e;
		else if (!(this.step !== 1 || this.busy || this.name || this.assignedIds.length)) {
			e.area && this.knownAreas.some((t) => t.area_id === e.area) && (this.area = e.area);
			for (let t of e.sensors) this.states[t.entity_id] && this.assign(t.role, t.entity_id);
		}
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
		}).sort((e, t) => Lt.indexOf(e.role) - Lt.indexOf(t.role) || e.name.localeCompare(t.name));
	}
	async pickPhoto(e) {
		if (this.clearPhoto(), !e) return;
		let t = ++this.photoCheck;
		this.photoChecking = !0;
		try {
			let n = await hu(e, this.l);
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
		if (!this.name.trim() || !A(this.name.trim(), 200)) return e.t("wizard.error_name_length");
		if (this.area && !this.knownAreas.some((e) => e.area_id === this.area)) return e.t("wizard.error_area");
		if (this.preview && !this.accepted) return this.toggle("species", !0), e.t("wizard.error_accept_preview");
		if (ji(this.moisture, this.defaults, e)) return this.toggle("species", !0), e.t("wizard.error_targets");
		if (this.acquired && !Number.isFinite(Date.parse(this.acquired))) return this.toggle("details", !0), e.t("wizard.error_acquired");
		let t = Xi(this.category, Yi(this.tagText), e);
		return t && this.toggle("details", !0), t;
	}
	request(e) {
		let t = Object.fromEntries(this.extras.map(({ role: e, entity_id: t }) => {
			let n = Fi(this.source(t), this.entities), r = n ? {
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
			tags: Yi(this.tagText),
			moisture: Li(this.moisture, this.entities),
			...this.extras.length ? { roles: t } : {},
			...this.accepted && this.preview ? { accepted_preview: {
				preview_token: this.preview.preview_token,
				provider: this.preview.provider,
				operation: "select"
			} } : { species: Pi(this.common, this.latin) }
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
			let n = await z.createWizard(this.hass, this.finalRequest);
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
			e === this.lifecycle && (this.fail(t), this.rejected = t instanceof L && t.code === "invalid_format");
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
			moisture: ki(),
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
		], n = this.busy || this.blocked || !!this.finalRequest, r = this.step === 3 ? T`<button type="button" class="btn filled" ?disabled=${this.busy || this.blocked || !this.draft} @click=${() => void this.create()}><ha-icon aria-hidden="true" icon="mdi:check"></ha-icon>${this.finalRequest ? e.t("wizard.retry_create") : e.t("wizard.create")}</button>` : T`<button type="button" class="btn filled" ?disabled=${this.busy || this.blocked || !this.draft || this.photoChecking} @click=${() => void this.next()}>${this.step === 2 && !this.assignedIds.length ? e.t("wizard.skip") : e.t("wizard.next")}</button>`;
		return T`<div class="wz" lang=${e.language}>
      <div class="stepline"><span>${e.t("wizard.step_of", {
			step: this.step,
			total: 3,
			name: t[this.step - 1]
		})}</span>
        <span class="all" aria-hidden="true">${t.map((e, t) => T`${t ? " · " : ""}${t + 1 === this.step ? T`<b>${e}</b>` : e}`)}</span></div>
      <div class="bars" aria-hidden="true">${[
			1,
			2,
			3
		].map((e) => T`<span class=${e <= this.step ? "on" : ""}></span>`)}</div>
      <div class="card">
        <fieldset style="border:0;margin:0;padding:0;min-width:0" ?disabled=${n}>
          ${this.step === 1 ? this.renderPlant() : this.step === 2 ? this.renderSensors() : this.renderReview()}
        </fieldset>
        ${this.error ? T`<p class="error" role="alert" style="margin-top:14px">${this.error}</p>` : E}
        ${!this.draft && !this.busy ? T`<p style="margin-top:14px"><button type="button" class="btn outline sm" @click=${() => void this.start()}>${e.t("wizard.retry_draft")}</button></p>` : E}
        ${this.finalRequest ? T`<p class="notice" style="margin-top:14px">${e.t("wizard.final_request_retained")}</p>` : E}
        ${this.rejected ? T`<p style="margin-top:14px">${e.t("wizard.rejected")}</p><p style="margin-top:8px"><button type="button" class="btn outline sm" ?disabled=${this.busy || this.blocked} @click=${() => this.startFresh()}>${e.t("wizard.start_fresh")}</button></p>` : E}
      </div>
      <div class="actions">
        ${this.step === 1 ? T`<button type="button" class="btn text" ?disabled=${this.busy} @click=${() => this.emit("wizard-close")}>${e.t("common.cancel")}</button>` : T`<button type="button" class="btn text" ?disabled=${this.busy || !!this.finalRequest} @click=${() => this.back()}>${e.t("wizard.back")}</button>`}
        <span class="end">${r}</span>
      </div>
      <p class="status small muted" role="status">${this.busy ? e.t("wizard.working") : ""}</p>
    </div>`;
	}
	renderPlant() {
		let e = this.l, t = this.hass?.locale?.language ?? this.hass?.language ?? e.language, n = (e) => e.charAt(0).toLocaleUpperCase(t) + e.slice(1), r = Y("ha-area-picker") && this.hass ? T`<ha-area-picker .hass=${this.hass} .label=${e.t("wizard.area")} .value=${this.area || void 0} .noAdd=${!0} .disabled=${this.busy || this.blocked} @value-changed=${(e) => {
			this.area = e.detail.value ?? "";
		}}></ha-area-picker>` : T`<div class="field"><label for="area">${e.t("wizard.area")}</label><select id="area" aria-describedby="area-helper" @change=${(e) => {
			this.area = e.target.value;
		}}>
          <option value="" ?selected=${!this.area}>${e.t("wizard.no_area")}</option>
          ${this.area && !this.knownAreas.some((e) => e.area_id === this.area) ? T`<option value=${this.area} selected>${e.t("area.missing_option", { area: this.area })}</option>` : E}
          ${this.knownAreas.map((e) => T`<option value=${e.area_id} ?selected=${e.area_id === this.area}>${e.name}</option>`)}</select><ha-icon class="trail" aria-hidden="true" icon="mdi:menu-down"></ha-icon></div>`;
		return T`<h2 tabindex="-1">${e.t("wizard.plant_heading")}</h2><p class="intro">${e.t("wizard.plant_intro")}</p>
      <div class="stack">
        <label class="field">${e.t("wizard.plant_name")}<input required maxlength=${Ke(200)} autocomplete="off" .value=${this.name} @input=${(e) => {
			this.name = e.target.value;
		}} @keydown=${(e) => {
			e.key === "Enter" && this.next();
		}}></label>
        <div>${r}<div class="helper" id="area-helper">${e.t("wizard.area_helper")}</div></div>
        <div><div class="field"><label for="placement">${e.t("placement.label")}</label><select id="placement" ?disabled=${this.busy || this.blocked} @change=${(e) => {
			this.placement = e.target.value;
		}}>
          <option value="" ?selected=${!this.placement}>${e.t("common.not_specified")}</option>
          ${sr.map((t) => T`<option value=${t} ?selected=${t === this.placement}>${n(ea(e, t))}</option>`)}</select><ha-icon class="trail" aria-hidden="true" icon="mdi:menu-down"></ha-icon></div>
          ${oa(e, e.t("placement.info"))}</div>
        ${this.renderPhoto()}
      </div>`;
	}
	renderPhoto() {
		let e = this.l, t = (e, t) => {
			e.preventDefault(), this.dragging = t;
		}, n = (e) => T`<input class="sr-only" type="file" accept=${au()} aria-label=${e} aria-describedby="photo-hint" ?disabled=${this.busy || this.blocked}
      @change=${(e) => {
			let t = e.target;
			this.pickPhoto(t.files?.[0]), t.value = "";
		}}>`, r = this.photoChecking ? e.t("wizard.photo_checking") : this.photo ? e.t("wizard.photo_pending") : e.t("wizard.photo_hint");
		return T`<div><div class="drop ${this.photo ? "has" : ""} ${this.dragging ? "over" : ""}" @dragover=${(e) => t(e, !0)} @dragleave=${(e) => t(e, !1)}
        @drop=${(e) => {
			t(e, !1), !this.busy && !this.blocked && this.pickPhoto(e.dataTransfer?.files?.[0]);
		}}>
      ${this.photo && this.photoUrl ? T`<img src=${this.photoUrl} alt="">
          <span class="grow" dir="auto" title=${this.photo.name}>${this.photo.name}</span>
          <label class="btn text sm pick">${e.t("wizard.photo_change")}${n(e.t("wizard.photo_change_label"))}</label>
          <button type="button" class="btn text sm" aria-label=${e.t("wizard.photo_remove_label")} @click=${() => this.clearPhoto()}>${e.t("wizard.photo_remove")}</button>` : T`<label><ha-icon aria-hidden="true" icon="mdi:camera-plus-outline"></ha-icon>
          <span class="grow">${e.t("wizard.photo_add")} <span class="muted">${e.t("wizard.photo_optional")}</span></span>${n(e.t("wizard.photo_label"))}</label>`}
      </div><div class="helper" id="photo-hint">${r}</div>${this.photoError ? T`<p class="error" role="alert">${this.photoError}</p>` : E}</div>`;
	}
	sensorPicker(e, t) {
		let n = this.l, r = this.assignedIds;
		if (Y("ha-entity-picker") && this.hass) return T`<ha-entity-picker .hass=${this.hass} .label=${t} .placeholder=${n.t("wizard.search_sensors")} .value=${""} .includeDomains=${["sensor"]} .excludeEntities=${r}
        .entityFilter=${(t) => this.fits(e, t)} @value-changed=${(t) => {
			t.detail.value && this.assign(e, t.detail.value);
		}}></ha-entity-picker>`;
		let i = Object.values(this.states).filter((t) => !r.includes(t.entity_id) && this.fits(e, t)).map((e) => ({
			id: e.entity_id,
			text: `${this.friendly(e.entity_id)} · ${this.valueText(e.entity_id)}`,
			near: !!this.area && this.areaOfEntity.get(e.entity_id) === this.area
		})).sort((e, t) => e.text.localeCompare(t.text)), a = i.filter((e) => e.near), o = i.filter((e) => !e.near), s = this.knownAreas.find((e) => e.area_id === this.area)?.name, c = (e) => T`<option value=${e.id}>${e.text}</option>`;
		return T`<div class="field"><label for="sensor-${e}">${t}</label><select id="sensor-${e}" @change=${(t) => this.assign(e, t.target.value)}>
        <option value="" selected>${i.length ? n.t("wizard.choose_sensor") : n.t("wizard.no_suitable_sensors")}</option>
        ${a.length && s ? T`<optgroup label=${n.t("wizard.group_in_area", { area: s })}>${a.map(c)}</optgroup><optgroup label=${n.t("wizard.group_other")}>${o.map(c)}</optgroup>` : i.map(c)}
      </select><ha-icon class="trail" aria-hidden="true" icon="mdi:menu-down"></ha-icon></div>`;
	}
	assignedRow(e, t) {
		let n = this.l, r = this.friendly(t);
		return T`<div class="item assigned"><span class="ic" aria-hidden="true"><ha-icon .icon=${P[e].icon}></ha-icon></span>
      <div><div>${r}</div><div class="small muted">${n.t("wizard.sensor_reading", {
			role: F(n, e),
			value: this.valueText(t)
		})}</div></div>
      <button type="button" class="iconbtn" aria-label=${n.t("wizard.remove_sensor", { name: r })} @click=${() => this.unassign(e)}><ha-icon aria-hidden="true" icon="mdi:close"></ha-icon></button></div>`;
	}
	renderSensors() {
		let e = this.l, t = this.moisture.sources[0]?.entity_id, n = this.knownAreas.find((e) => e.area_id === this.area)?.name, r = this.suggestions(), i = Pu.filter((e) => !this.takenRoles.has(e) && e !== this.pendingRole);
		return T`<h2 tabindex="-1">${e.t("wizard.sensors_heading")}</h2><p class="intro">${e.t("wizard.sensors_intro")}</p>
      <div class="stack">
        ${t ? this.assignedRow("moisture", t) : this.sensorPicker("moisture", e.t("wizard.moisture_sensor"))}
        ${this.extras.length ? T`<div class="rows">${this.extras.map((e) => this.assignedRow(e.role, e.entity_id))}</div>` : E}
        ${this.pendingRole ? T`<div class="item pending"><div>${this.sensorPicker(this.pendingRole, e.t("wizard.role_sensor", { role: F(e, this.pendingRole) }))}</div>
          <button type="button" class="iconbtn" aria-label=${e.t("wizard.discard_role", { role: F(e, this.pendingRole) })} @click=${() => {
			this.pendingRole = null;
		}}><ha-icon aria-hidden="true" icon="mdi:close"></ha-icon></button></div>` : E}
        ${n ? T`<h3 class="caption">${e.t("wizard.suggested", { area: n })}</h3>
          ${r.length ? T`<div class="rows">${r.map((t) => T`<div class="item sugg"><span class="ic" aria-hidden="true"><ha-icon .icon=${P[t.role].icon}></ha-icon></span>
            <div><div>${t.name}</div><div class="small muted">${e.t("wizard.sensor_reading", {
			role: F(e, t.role),
			value: this.valueText(t.entity_id)
		})}</div></div>
            <button type="button" class="btn text sm" aria-label=${e.t("wizard.add_label", { name: t.name })} @click=${() => this.assign(t.role, t.entity_id)}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${e.t("wizard.add")}</button></div>`)}</div>` : T`<p class="small muted">${e.t("wizard.no_suggestions", { area: n })}</p>`}` : E}
        ${i.length ? T`<div class="add-another">${this.renderRoleMenu(i)}<span class="small muted">${e.t("wizard.add_another_hint")}</span></div>` : E}
      </div>`;
	}
	renderRoleMenu(e) {
		let t = this.l, n = (e) => T`<button type="button" class="btn outline sm" slot=${e ? "trigger" : E} aria-expanded=${e ? E : String(this.roleMenu)} @click=${e ? E : () => {
			this.roleMenu = !this.roleMenu;
		}}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("wizard.add_another")}</button>`;
		return Y("ha-dropdown") && Y("ha-dropdown-item") ? T`<ha-dropdown @wa-select=${(e) => {
			let t = e.detail.item.value;
			Pu.includes(t) && (this.pendingRole = t);
		}}>
        ${n(!0)}${e.map((e) => T`<ha-dropdown-item value=${e}><ha-icon slot="icon" .icon=${P[e].icon}></ha-icon>${F(t, e)}</ha-dropdown-item>`)}</ha-dropdown>` : T`${n(!1)}${this.roleMenu ? T`<div class="role-menu">${e.map((e) => T`<button type="button" class="btn outline sm" @click=${() => {
			this.pendingRole = e, this.roleMenu = !1;
		}}><ha-icon aria-hidden="true" .icon=${P[e].icon}></ha-icon>${F(t, e)}</button>`)}</div>` : E}`;
	}
	alert(e, t, n = "") {
		return Y("ha-alert") ? T`<ha-alert alert-type=${e} .title=${n}>${t}</ha-alert>` : T`<div class="alert ${e}" role=${e === "warning" ? "alert" : "note"}><ha-icon aria-hidden="true" icon=${e === "warning" ? "mdi:alert-outline" : "mdi:information-outline"}></ha-icon><div>${n ? T`<b>${n}</b> ` : E}${t}</div></div>`;
	}
	expander(e, t, n, r, i) {
		let a = this.expanded.has(e);
		return Y("ha-expansion-panel") ? T`<ha-expansion-panel class="expander" data-section=${e} outlined .header=${n} .secondary=${r} .expanded=${a}
        @expanded-will-change=${(t) => {
			t.target === t.currentTarget && t.detail.expanded && (this.opened = /* @__PURE__ */ new Set([...this.opened, e]));
		}}
        @expanded-changed=${(t) => {
			t.target === t.currentTarget && this.toggle(e, t.detail.expanded);
		}}>
        <ha-icon slot="leading-icon" aria-hidden="true" .icon=${t}></ha-icon>
        ${a || this.opened.has(e) ? T`<div class="expander-body">${i()}</div>` : E}</ha-expansion-panel>` : T`<details class="expander" data-section=${e} ?open=${a} @toggle=${(t) => {
			let n = t.currentTarget.open;
			n !== a && this.toggle(e, n);
		}}>
      <summary><ha-icon aria-hidden="true" .icon=${t}></ha-icon><span class="summary-text"><span class="summary-title">${n}</span><span class="summary-sub">${r}</span></span><ha-icon aria-hidden="true" icon=${a ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon></summary>
      ${a ? T`<div class="expander-body">${i()}</div>` : E}</details>`;
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
		return T`<h2 tabindex="-1">${e.t("wizard.review_heading")}</h2><p class="intro" style="margin-bottom:8px">${e.t("wizard.review_intro")}</p>
      <div class="review">
        <div class="li"><span class="ic" aria-hidden="true"><ha-icon icon="mdi:sprout"></ha-icon></span><div><div class="p">${this.name.trim()}</div><div class="s">${n}${this.photo ? ` · ${e.t("wizard.with_photo")}` : ""}</div></div>
          <button type="button" class="btn text sm" aria-label=${e.t("wizard.edit_plant")} @click=${() => void this.go(1)}>${e.t("wizard.edit")}</button></div>
        <div class="li"><span class="ic" aria-hidden="true"><ha-icon icon="mdi:access-point"></ha-icon></span><div><div class="p">${t ? this.friendly(t) : e.t("wizard.no_moisture")}</div><div class="s">${this.extras.length ? this.extras.map((e) => this.friendly(e.entity_id)).join(", ") : e.t("wizard.no_other_sensors")}</div></div>
          <button type="button" class="btn text sm" aria-label=${e.t("wizard.edit_sensors")} @click=${() => void this.go(2)}>${e.t("wizard.edit")}</button></div>
      </div>
      ${t ? E : T`<div style="margin-top:6px">${this.alert("warning", e.t("wizard.no_moisture_warning"))}</div>`}
      <div class="sections">
        ${this.expander("species", "mdi:leaf", e.t("wizard.species_section"), o, () => this.renderSpecies())}
        ${this.expander("details", "mdi:tag-outline", e.t("wizard.details_section"), e.t("wizard.details_summary"), () => this.renderDetails())}
      </div>`;
	}
	renderSpecies() {
		let e = this.l, t = this.providerInfo, n = this.defaults, r = V.some((e) => this.moisture.threshold_overrides[e] !== null), i = {
			min: e.t("wizard.target_min"),
			target: e.t("wizard.target_ideal"),
			max: e.t("wizard.target_max")
		};
		return T`${t?.available ? this.accepted && this.preview ? T`<div class="species-chip"><ha-icon aria-hidden="true" icon="mdi:leaf"></ha-icon>
        <div class="grow"><div><i>${this.preview.snapshot.latin_name}</i>${this.commonName(this.preview.snapshot) ? ` · ${this.commonName(this.preview.snapshot)}` : ""}</div><div class="small muted">${this.preview.snapshot.attribution}</div></div>
        <button type="button" class="btn text sm" @click=${() => this.manual()}>${e.t("wizard.remove_species")}</button></div>` : T`<div class="search"><label class="field">${e.t("wizard.species_search")}<input type="search" autocomplete="off" maxlength=${Ke(100)} aria-describedby="search-hint" .value=${this.query}
          @input=${(e) => {
			this.query = e.target.value, this.generation++, this.results = [], this.searched = !1, this.preview = null, this.accepted = !1;
		}}
          @keydown=${(e) => {
			e.key === "Enter" && (e.preventDefault(), this.search());
		}}></label>
          <button type="button" class="btn outline" ?disabled=${this.busy || this.query.trim().length < 3} @click=${() => void this.search()}><ha-icon aria-hidden="true" icon="mdi:magnify"></ha-icon>${e.t("wizard.search_button")}</button></div>
        <span class="helper" id="search-hint" style="padding-top:0;margin-top:-8px">${e.t("wizard.search_hint")}</span>
        ${this.speciesError ? T`<p class="error" role="alert">${this.speciesError}</p><button type="button" class="btn text sm flush" @click=${() => this.manual()}>${e.t("common.continue_manually")}</button>` : E}
        ${this.searched && !this.results.length ? T`<p class="small muted">${e.t("wizard.no_matches")}</p>` : E}
        ${this.results.length && !this.preview ? T`<ul class="results" aria-label=${e.t("wizard.results")}>${this.results.map((e) => T`<li><button type="button" @click=${() => void this.choose(e)}>${e.common_name ?? e.latin_name} · ${e.latin_name}</button><small>${e.attribution}</small></li>`)}</ul>` : E}
        ${this.preview ? T`<div class="preview">${ha(e, this.preview.snapshot, void 0, null)}</div>
          <label class="check"><input type="checkbox" .checked=${this.accepted} @change=${(e) => {
			this.accepted = e.target.checked, this.error = "";
		}}>${e.t("wizard.accept_species")}</label>
          <button type="button" class="btn text sm flush" @click=${() => this.manual()}>${e.t("wizard.remove_species")}</button>` : E}` : t ? this.alert("info", T`${e.t("wizard.provider_unavailable_body")}<span class="alert-links"><a href=${Fu} @click=${(e) => {
			e.preventDefault(), history.pushState(null, "", Fu), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !1 } }));
		}}>${e.t("wizard.open_options")}</a><a href=${Iu} target="_blank" rel="noreferrer">${e.t("wizard.openplantbook_credentials_link")}</a></span>`, e.t("wizard.provider_unavailable_title")) : E}
      ${this.accepted || this.preview ? E : T`<h3>${e.t("wizard.manual_species")}</h3><div class="two">
        <label class="field">${e.t("species.common_name")}<input maxlength=${Ke(200)} .value=${this.common} @input=${(e) => {
			this.common = e.target.value;
		}}></label>
        <label class="field">${e.t("species.scientific_name")}<input maxlength=${Ke(200)} .value=${this.latin} @input=${(e) => {
			this.latin = e.target.value;
		}}></label></div>`}
      <fieldset class="thr"><legend>${e.t("wizard.targets_label")}</legend>
        ${V.map((e) => T`<div class="field"><label for="target-${e}">${i[e]}</label><span class="suffix"><input id="target-${e}" type="number" min="1" max="99" step="1" inputmode="numeric" .value=${String(this.moisture.threshold_overrides[e] ?? n[e])}
          @input=${(t) => this.setOverride(e, t.target.value)}
          @change=${(t) => {
			let r = t.target;
			r.value.trim() || (r.value = String(n[e]));
		}}><span aria-hidden="true">%</span></span></div>`)}
      </fieldset>
      <p class="helper" style="padding:0">${this.accepted ? e.t("wizard.targets_species") : e.t("wizard.targets_default")}</p>
      ${r ? T`<button type="button" class="btn text sm flush" @click=${() => {
			this.moisture = {
				...this.moisture,
				threshold_overrides: {
					min: null,
					target: null,
					max: null
				}
			};
		}}>${e.t("wizard.targets_reset")}</button>` : E}`;
	}
	renderDetails() {
		let e = this.l, t = this.hass?.locale?.language ?? this.hass?.language ?? e.language;
		return T`<div class="two">
      ${Y("ha-selector") && this.hass ? T`<ha-selector .hass=${this.hass} .selector=${{ date: {} }} .label=${e.t("wizard.acquired_date")} .value=${this.acquired || void 0} .required=${!1} @value-changed=${(e) => {
			this.acquired = e.detail.value ?? "";
		}}></ha-selector>` : T`<label class="field">${e.t("wizard.acquired_date")}<input type="date" lang=${t} .value=${this.acquired} @input=${(e) => {
			this.acquired = e.target.value;
		}}></label>`}
      <label class="field">${e.t("taxonomy.category")}<input maxlength=${Ke(60)} .value=${this.category} @input=${(e) => {
			this.category = e.target.value;
		}}></label>
      <div><label class="field">${e.t("wizard.tags")}<input maxlength=${Ke(2e3)} aria-describedby="tags-hint" .value=${this.tagText} @input=${(e) => {
			this.tagText = e.target.value;
		}}></label><div class="helper" id="tags-hint">${e.t("wizard.tags_hint")}</div></div>
    </div>`;
	}
	renderDone() {
		let e = this.l, t = this.created, n = this.area ? this.knownAreas.find((e) => e.area_id === this.area)?.name : void 0;
		return T`<div class="wz" lang=${e.language}><div class="card done">
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
      <p class="small muted" id="done-notifications">${e.t("wizard.done_notifications")}</p>
      <div class="row"><button type="button" class="btn text" aria-describedby="done-notifications" @click=${() => this.dispatchEvent(new CustomEvent("wizard-notifications", {
			detail: { plantId: t.id },
			bubbles: !0,
			composed: !0
		}))}><ha-icon aria-hidden="true" icon="mdi:bell-outline"></ha-icon>${e.t("wizard.done_notifications_action")}</button></div>
    </div></div>`;
	}
};
Mu = X, Mu.styles = [
	G,
	_a,
	ga,
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
], K([O({ attribute: !1 })], X.prototype, "hass", void 0), K([O({ attribute: !1 })], X.prototype, "capabilities", void 0), K([O({ attribute: !1 })], X.prototype, "areas", void 0), K([O({ attribute: !1 })], X.prototype, "entities", void 0), K([O({ attribute: !1 })], X.prototype, "devices", void 0), K([O({ attribute: !1 })], X.prototype, "states", void 0), K([O({ type: Boolean })], X.prototype, "blocked", void 0), K([O({ type: Number })], X.prototype, "navigationContext", void 0), K([O()], X.prototype, "photoStatus", void 0), K([k()], X.prototype, "step", void 0), K([k()], X.prototype, "busy", void 0), K([k()], X.prototype, "error", void 0), K([k()], X.prototype, "name", void 0), K([k()], X.prototype, "area", void 0), K([k()], X.prototype, "photo", void 0), K([k()], X.prototype, "photoUrl", void 0), K([k()], X.prototype, "photoError", void 0), K([k()], X.prototype, "photoChecking", void 0), K([k()], X.prototype, "dragging", void 0), K([k()], X.prototype, "moisture", void 0), K([k()], X.prototype, "extras", void 0), K([k()], X.prototype, "pendingRole", void 0), K([k()], X.prototype, "roleMenu", void 0), K([k()], X.prototype, "expanded", void 0), K([k()], X.prototype, "opened", void 0), K([k()], X.prototype, "query", void 0), K([k()], X.prototype, "results", void 0), K([k()], X.prototype, "searched", void 0), K([k()], X.prototype, "preview", void 0), K([k()], X.prototype, "accepted", void 0), K([k()], X.prototype, "speciesError", void 0), K([k()], X.prototype, "common", void 0), K([k()], X.prototype, "latin", void 0), K([k()], X.prototype, "acquired", void 0), K([k()], X.prototype, "placement", void 0), K([k()], X.prototype, "category", void 0), K([k()], X.prototype, "tagText", void 0), K([k()], X.prototype, "draft", void 0), K([k()], X.prototype, "finalRequest", void 0), K([k()], X.prototype, "rejected", void 0), K([k()], X.prototype, "created", void 0), customElements.get("smart-plants-wizard") || customElements.define("smart-plants-wizard", X);
function Ru(e) {
	let t = e.find((e) => e.platform === "smart_plants" && e.unique_id === "smart_plants:all_plants");
	return t && !t.disabled_by ? t.entity_id : null;
}
var zu = [
	0,
	15,
	30,
	60,
	120
], Bu = "smart_plants_", Vu = [
	"needs_water",
	"problems",
	"care_tasks"
], Hu = /* @__PURE__ */ new Set([
	"send_message",
	"notify",
	"persistent_notification"
]), Uu = new Uint32Array([
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
function Wu(e) {
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
			let i = f + (s(l, 6) ^ s(l, 11) ^ s(l, 25)) + (l & u ^ ~l & d) + Uu[e] + o[e] >>> 0, a = (s(t, 2) ^ s(t, 13) ^ s(t, 22)) + (t & n ^ t & r ^ n & r) >>> 0;
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
function Gu(e, t) {
	let n = `${Bu}${e}`;
	return t ? `${n}_${Wu([...t].sort().join(",")).slice(0, 8)}` : n;
}
var Ku = (e) => `${e.slice(0, 5)}:00`, qu = (e) => e % 60 == 0 ? { hours: e / 60 } : { minutes: e };
function Ju(e, t) {
	if (t === 0) return e.t("notifications.delay_none");
	let n = t % 60 == 0;
	return new Intl.NumberFormat(e.language, {
		style: "unit",
		unit: n ? "hour" : "minute",
		unitDisplay: "long"
	}).format(n ? t / 60 : t);
}
function Yu(e, t, n, r) {
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
				notification_id: t === "needs_water" ? `${Bu}${t}_{{ trigger.device_id }}` : `${Bu}${t}`
			}
		};
	}
}
function Xu(e, t) {
	let n = Gu(e.kind, e.plantDeviceIds), r = e.plantDeviceIds ? { target: { device_id: [...e.plantDeviceIds].sort() } } : e.allPlantsEntityId ? { target: { entity_id: [e.allPlantsEntityId] } } : {};
	return e.kind === "daily_report" ? {
		alias: t.t("notifications.alias_daily"),
		description: t.t("notifications.description_daily"),
		mode: "single",
		triggers: [{
			trigger: "time",
			at: Ku(e.time),
			id: n
		}],
		conditions: [{
			condition: "smart_plants.needs_attention",
			...r,
			options: {
				include: [...Vu],
				include_snoozed: !1
			}
		}],
		actions: [{
			action: "smart_plants.get_report",
			...r,
			data: {
				include: [...Vu],
				include_snoozed: !1,
				language: t.language
			},
			response_variable: "report"
		}, Yu(e.target, e.kind, "{{ report.title }}", "{{ report.message }}")]
	} : {
		alias: t.t("notifications.alias_water"),
		description: e.delayMinutes ? t.t("notifications.description_water", { delay: Ju(t, e.delayMinutes) }) : t.t("notifications.description_water_now"),
		mode: "queued",
		max: 20,
		triggers: [{
			trigger: "smart_plants.needs_water",
			id: n,
			...r,
			options: {
				behavior: "each",
				...e.delayMinutes ? { for: qu(e.delayMinutes) } : {},
				include_snoozed: !1
			}
		}],
		...e.quiet ? { conditions: [{
			condition: "not",
			conditions: [{
				condition: "time",
				after: Ku(e.quiet.from),
				before: Ku(e.quiet.to)
			}]
		}] } : {},
		actions: [Yu(e.target, e.kind, t.t("notifications.msg_water_title", { plant: "{{ trigger.plant }}" }), t.t("notifications.msg_water_body"))]
	};
}
function Zu(e, t) {
	let n = (e, t) => e.label.localeCompare(t.label), r = Object.values(e).filter((e) => e.entity_id.startsWith("notify.")).map((e) => ({
		kind: "entity",
		entityId: e.entity_id,
		label: typeof e.attributes.friendly_name == "string" && e.attributes.friendly_name ? e.attributes.friendly_name : e.entity_id
	})).sort(n), i = Object.keys(t?.notify ?? {}).filter((e) => !Hu.has(e)).map((e) => ({
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
function Qu(e) {
	return e.kind === "entity" ? `entity:${e.entityId}` : e.kind === "service" ? `service:${e.service}` : "persistent";
}
function $u(e) {
	if (!e || typeof e != "object") return null;
	let t = e.triggers ?? e.trigger, n = Array.isArray(t) ? t : t ? [t] : [];
	for (let e of n) {
		let t = e && typeof e == "object" ? e.id : void 0;
		if (typeof t == "string" && t.startsWith("smart_plants_")) return t;
	}
	return null;
}
function ed(e, t) {
	if (!/_[0-9a-f]{8}$/.test(t)) return null;
	let n = e && typeof e == "object" ? e : {}, r = (e) => Array.isArray(e) ? e : e ? [e] : [], i = (e) => r(e).filter((e) => typeof e == "string" && e !== "");
	for (let [e, t] of [
		["triggers", "trigger"],
		["conditions", "condition"],
		["actions", "action"]
	]) for (let a of r(n[e] ?? n[t])) {
		if (!a || typeof a != "object") continue;
		let e = a, t = e.trigger ?? e.platform ?? e.condition ?? e.action ?? e.service;
		if (typeof t != "string" || !t.startsWith("smart_plants")) continue;
		let n = e.target && typeof e.target == "object" ? e.target.device_id : void 0, r = [.../* @__PURE__ */ new Set([...i(n), ...i(e.device_id)])];
		if (r.length) return r.sort();
	}
	return [];
}
function td(e, t, n, r) {
	if (!t) return e.t("notifications.covers_all");
	let i = n.filter((e) => r.some((n) => t.includes(n.id) && n.identifiers.some(([t, n]) => t === "smart_plants" && n === e.id))).map((e) => e.name).sort((t, n) => t.localeCompare(n, e.language));
	return i.length ? e.t("notifications.covers", { plants: new Intl.ListFormat(e.language, { type: "conjunction" }).format(i) }) : e.t("notifications.covers_none");
}
async function nd(e, t, n = 8, r) {
	let i = Array(t.length).fill(null), a = 0;
	return await Promise.all(Array.from({ length: Math.min(n, t.length) }, async () => {
		for (; !r?.aborted && a < t.length;) {
			let n = a++, r = t[n];
			try {
				let t = await e.connection.sendMessagePromise({
					type: "automation/config",
					entity_id: r
				}), a = $u(t?.config);
				a && (i[n] = {
					entityId: r,
					marker: a,
					deviceIds: ed(t?.config, a)
				});
			} catch {}
		}
	})), i.filter((e) => e !== null);
}
function rd(e, t, n) {
	let r = location.href;
	e.dispatchEvent(new CustomEvent("hass-automation-editor", {
		detail: { data: t },
		bubbles: !0,
		composed: !0
	})), requestAnimationFrame(() => {
		location.href === r && (history.pushState(null, "", "/config/automation/edit/new"), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !1 } })), n());
	});
}
// src/views/notifications.ts
var id, ad, od = class extends D {
	constructor(...e) {
		super(...e), this.plants = [], this.devices = [], this.entities = [], this.states = {}, this.plantId = null, this._draft = {
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
		}, this.found = null;
	}
	connectedCallback() {
		super.connectedCallback(), this.plantId && !this.hasUpdated && (this._draft = {
			...this._draft,
			allPlants: !1,
			plantIds: /* @__PURE__ */ new Set([this.plantId])
		});
	}
	firstUpdated() {
		let e = this.shadowRoot?.querySelector("dialog");
		e && !e.open && e.showModal(), this.shadowRoot?.querySelector("h2")?.focus();
	}
	updated() {
		let e = this.shadowRoot?.querySelector("#water-delay");
		e && (e.value = String(this._draft.delayMinutes));
		let t = this.shadowRoot?.querySelector("#send-to"), n = this._targets();
		t && (t.value = Qu(n.find((e) => Qu(e) === this._draft.target) ?? n[0]));
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
		return Zu(this.states, this.hass?.services);
	}
	_choosable() {
		return this.plants.map((e) => ({
			id: e.id,
			name: e.name,
			deviceId: U(e, this.devices)?.id ?? ""
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
		let n = this._targets(), r = n.find((t) => Qu(t) === e.target) ?? n[0], i = Xu({
			kind: e.kind,
			time: e.time,
			delayMinutes: e.delayMinutes,
			quiet: e.kind === "needs_water" && e.quiet ? {
				from: e.quietFrom,
				to: e.quietTo
			} : null,
			plantDeviceIds: t,
			allPlantsEntityId: Ru(this.entities),
			target: r
		}, this.l), a = this.l, o = this.getRootNode().host ?? this, s = (e) => o.dispatchEvent(new CustomEvent("hass-notification", {
			bubbles: !0,
			composed: !0,
			detail: {
				message: e,
				duration: 8e3
			}
		}));
		rd(this, i, () => s(a.t("notifications.editor_fallback"))), this._close();
	}
	render() {
		let e = this.l, t = this._draft, n = this._targets(), r = n.filter((e) => e.kind === "entity"), i = n.filter((e) => e.kind === "service"), a = n.find((e) => Qu(e) === t.target) ?? n[0], o = this._choosable(), s = this._deviceIds(), c = (!s || s.length > 0) && (this.found ?? []).some((e) => e.marker === Gu(t.kind, s) && this.states[e.entityId]), l = (e, t) => T`<option value=${Qu(e)} ?selected=${Qu(e) === Qu(a)}>${t}</option>`;
		return T`<dialog class="care-dialog notifications-dialog" aria-labelledby="notifications-title" aria-describedby="notifications-intro" @cancel=${(e) => {
			e.preventDefault(), this._close();
		}} @keydown=${(e) => this._trapFocus(e)}>
      <h2 id="notifications-title" tabindex="-1">${e.t("notifications.add_title")}</h2>
      <div class="dialog-body">
        <p class="muted hint" id="notifications-intro">${e.t("notifications.intro")}</p>
        <fieldset class="choices"><legend class="field-label">${e.t("notifications.kind")}</legend>
          <div class="preset">
            <label class="check"><input type="radio" name="notification-kind" value="daily_report" .checked=${t.kind === "daily_report"} aria-describedby="daily-help" @change=${() => this._edit({ kind: "daily_report" })}>
              <span class="choice-text"><span>${e.t("notifications.daily")}</span><span class="small muted" id="daily-help">${e.t("notifications.daily_help")}</span></span></label>
            ${t.kind === "daily_report" ? T`<div class="preset-fields"><label>${e.t("notifications.daily_time")}<input id="daily-time" type="time" required .value=${t.time} @change=${(e) => this._edit({ time: e.target.value || "08:00" })}></label></div>` : E}
          </div>
          <div class="preset">
            <label class="check"><input type="radio" name="notification-kind" value="needs_water" .checked=${t.kind === "needs_water"} @change=${() => this._edit({ kind: "needs_water" })}>
              <span class="choice-text"><span>${e.t("notifications.water")}</span></span></label>
            ${t.kind === "needs_water" ? T`<div class="preset-fields">
              <label>${e.t("notifications.water_delay")}<select id="water-delay" @change=${(e) => this._edit({ delayMinutes: Number(e.target.value) })}>
                ${zu.map((n) => T`<option value=${String(n)} ?selected=${t.delayMinutes === n}>${Ju(e, n)}</option>`)}</select></label>
              <label class="check"><input type="checkbox" .checked=${t.quiet} aria-describedby="quiet-help" @change=${(e) => this._edit({ quiet: e.target.checked })}>
                <span class="choice-text"><span>${e.t("notifications.quiet")}</span><span class="small muted" id="quiet-help">${e.t("notifications.quiet_help")}</span></span></label>
              ${t.quiet ? T`<label>${e.t("notifications.quiet_from")}<input id="quiet-from" type="time" required .value=${t.quietFrom} @change=${(e) => this._edit({ quietFrom: e.target.value || "22:00" })}></label>
                <label>${e.t("notifications.quiet_to")}<input id="quiet-to" type="time" required .value=${t.quietTo} @change=${(e) => this._edit({ quietTo: e.target.value || "07:00" })}></label>` : E}
            </div>` : E}
          </div>
        </fieldset>
        <fieldset class="choices"><legend class="field-label">${e.t("notifications.plants")}</legend>
          <label class="check"><input type="radio" name="notification-plants" value="all" .checked=${t.allPlants} @change=${() => this._edit({ allPlants: !0 })}><span>${e.t("notifications.plants_all")}</span></label>
          <label class="check"><input type="radio" name="notification-plants" value="choose" .checked=${!t.allPlants} ?disabled=${!o.length} @change=${() => this._edit({ allPlants: !1 })}><span>${e.t("notifications.plants_choose")}</span></label>
          ${t.allPlants ? E : T`<div class="plant-choices">${o.map((e) => T`<label class="check"><input type="checkbox" .checked=${t.plantIds.has(e.id)} aria-invalid=${t.error ? "true" : "false"} aria-describedby=${t.error ? "plants-error" : E}
              @change=${(n) => {
			let r = new Set(t.plantIds);
			n.target.checked ? r.add(e.id) : r.delete(e.id), this._edit({ plantIds: r });
		}}><span>${e.name}</span></label>`)}
            ${t.error ? T`<span class="error-text small" id="plants-error" role="alert">${t.error}</span>` : E}</div>`}
        </fieldset>
        <label>${e.t("notifications.send_to")}<select id="send-to" @change=${(e) => this._edit({ target: e.target.value })}>
          ${r.length ? T`<optgroup label=${e.t("notifications.group_entities")}>${r.map((e) => l(e, e.kind === "entity" ? e.label : ""))}</optgroup>` : E}
          ${i.length ? T`<optgroup label=${e.t("notifications.group_services")}>${i.map((e) => l(e, e.kind === "service" ? e.label : ""))}</optgroup>` : E}
          ${l({ kind: "persistent" }, e.t("notifications.persistent"))}
        </select></label>
        ${c ? T`<p class="hint" role="status">${e.t("notifications.exists")}</p>` : E}
        <p class="small muted hint">${e.t("notifications.yaml_help")}</p>
        <div class="actions dialog-actions"><span class="spacer"></span>
          <button type="button" @click=${() => this._close()}>${e.t("common.cancel")}</button>
          <button type="button" class="primary" @click=${() => this._open()}>${e.t("notifications.open_editor")}</button></div>
      </div></dialog>`;
	}
};
id = od, id.styles = [
	G,
	ju,
	Kl,
	o`
    .choice-text { display: flex; flex-direction: column; min-width: 0; }
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
], K([O({ attribute: !1 })], od.prototype, "hass", void 0), K([O({ attribute: !1 })], od.prototype, "l", void 0), K([O({ attribute: !1 })], od.prototype, "plants", void 0), K([O({ attribute: !1 })], od.prototype, "devices", void 0), K([O({ attribute: !1 })], od.prototype, "entities", void 0), K([O({ attribute: !1 })], od.prototype, "states", void 0), K([O({ attribute: !1 })], od.prototype, "plantId", void 0), K([k()], od.prototype, "_draft", void 0), K([O({ attribute: !1 })], od.prototype, "found", void 0);
var sd = class extends D {
	constructor(...e) {
		super(...e), this.plants = [], this.devices = [], this.states = {}, this.found = null, this._toggling = /* @__PURE__ */ new Set(), this._toggleError = null;
	}
	_add(e) {
		this.dispatchEvent(new CustomEvent("notifications-add", { detail: { trigger: e } }));
	}
	_link(e) {
		e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.preventDefault(), history.pushState(null, "", e.currentTarget.getAttribute("href")), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !1 } })));
	}
	async _toggle(e, t) {
		let n = t.checked, r = this.hass;
		if (r && !this._toggling.has(e)) {
			this._toggling = /* @__PURE__ */ new Set([...this._toggling, e]), this._toggleError = null;
			try {
				await r.connection.sendMessagePromise({
					type: "call_service",
					domain: "automation",
					service: n ? "turn_on" : "turn_off",
					target: { entity_id: e }
				});
			} catch (r) {
				t.checked = this.states[e]?.state === "on";
				let i = this.states[e], a = typeof i?.attributes.friendly_name == "string" && i.attributes.friendly_name ? i.attributes.friendly_name : e, o = r && typeof r == "object" && "message" in r && typeof r.message == "string" && r.message ? r.message : this.l.t("api_error.unknown");
				this._toggleError = {
					entityId: e,
					message: this.l.t(n ? "notifications.toggle_on_failed" : "notifications.toggle_off_failed", {
						name: a,
						error: o
					})
				};
			} finally {
				let t = new Set(this._toggling);
				t.delete(e), this._toggling = t;
			}
		}
	}
	render() {
		let e = this.l;
		if (!this.found) return T`<p class="muted" role="status">${e.t("notifications.loading")}</p>`;
		let t = this.found.map((e) => ({
			...e,
			state: this.states[e.entityId]
		})).filter((e) => e.state);
		return t.length ? T`<div class="notify-page"><section class="existing" aria-labelledby="notifications-existing">
      <h2 id="notifications-existing">${e.t("notifications.existing")}</h2>
      <ul class="notify-list">${t.map(({ entityId: t, state: n, deviceIds: r }) => {
			let i = typeof n.attributes.friendly_name == "string" && n.attributes.friendly_name ? n.attributes.friendly_name : t, a = n.attributes.last_triggered, o = n.attributes.id, s = typeof a == "string" && a ? e.t("notifications.last_sent", { time: Vt(e, a) }) : e.t("notifications.never_sent");
			return T`<li>
          <input class="switch" type="checkbox" role="switch" aria-label=${i} aria-describedby=${`sent-${t}`} .checked=${n.state === "on"} ?disabled=${this._toggling.has(t) || n.state === "unavailable"}
            @change=${(e) => void this._toggle(t, e.target)}>
          <span class="row-text"><span>${i}</span><span class="small muted"><span class="covers">${td(e, r, this.plants, this.devices)}</span> · <span id=${`sent-${t}`}>${s}</span></span></span>
          ${typeof o == "string" && o ? T`<a href=${`/config/automation/edit/${encodeURIComponent(o)}`} @click=${(e) => this._link(e)} aria-label=${e.t("notifications.edit_label", { name: i })}>${e.t("notifications.edit")}</a>` : T`<span></span>`}
          ${this._toggleError?.entityId === t ? T`<span class="error-text small toggle-error" role="alert">${this._toggleError.message}</span>` : E}
        </li>`;
		})}</ul></section>
      <div class="actions"><button type="button" class="primary" @click=${(e) => this._add(e.currentTarget)}>${e.t("notifications.add")}</button></div></div>` : T`<div class="notify-page"><section class="notify-empty" aria-labelledby="notifications-empty">
      <span class="notify-empty-icon" aria-hidden="true"><ha-icon icon="mdi:bell-outline"></ha-icon></span>
      <div class="row-text"><h2 id="notifications-empty">${e.t("notifications.empty_heading")}</h2>
        <p class="small muted">${e.t("notifications.empty_body")}</p>
        <div><button type="button" class="primary" @click=${(e) => this._add(e.currentTarget)}>${e.t("notifications.empty_action")}</button></div></div>
    </section></div>`;
	}
};
ad = sd, ad.styles = [
	G,
	ju,
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
    .notify-list .row-text { display: flex; flex-direction: column; min-width: 0; }
    .existing { padding: 0; border: 0; margin: 0; background: none; }
    .notify-empty { display: flex; gap: 12px; align-items: flex-start; margin: 0; background: none; padding: 12px 14px; border: 1px solid var(--divider-color, #ddd); border-radius: 12px; }
    .notify-empty-icon { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
      background: color-mix(in srgb, var(--primary-color, #009ac7) 12%, transparent); color: var(--primary-color, #009ac7); }
    .notify-empty h2 { margin: 0; }
    .notify-empty p { margin: 2px 0 8px; }
    .notify-list a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 8px; }
    .notify-list .toggle-error { grid-column: 1 / -1; }
    .notify-page { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }
    .existing h2 { margin: 0 0 8px; font-size: 1rem; font-weight: 500; }
    .notify-page .actions { margin: 0; }
  `
], K([O({ attribute: !1 })], sd.prototype, "hass", void 0), K([O({ attribute: !1 })], sd.prototype, "l", void 0), K([O({ attribute: !1 })], sd.prototype, "plants", void 0), K([O({ attribute: !1 })], sd.prototype, "devices", void 0), K([O({ attribute: !1 })], sd.prototype, "states", void 0), K([O({ attribute: !1 })], sd.prototype, "found", void 0), K([k()], sd.prototype, "_toggling", void 0), K([k()], sd.prototype, "_toggleError", void 0), customElements.get("smart-plants-notifications-page") || customElements.define("smart-plants-notifications-page", sd), customElements.get("smart-plants-notifications") || customElements.define("smart-plants-notifications", od);
// node_modules/lit-html/directive.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
var cd = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, ld = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), ud = class {
	constructor(e) {}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AT(e, t, n) {
		this._$Ct = e, this._$AM = t, this._$Ci = n;
	}
	_$AS(e, t) {
		return this.update(e, t);
	}
	update(e, t) {
		return this.render(...t);
	}
}, { I: dd } = Le, fd = (e) => e, pd = () => document.createComment(""), md = (e, t, n) => {
	/**
	* @license
	* Copyright 2020 Google LLC
	* SPDX-License-Identifier: BSD-3-Clause
	*/
	let r = e._$AA.parentNode, i = t === void 0 ? e._$AB : t._$AA;
	if (n === void 0) n = new dd(r.insertBefore(pd(), i), r.insertBefore(pd(), i), e, e.options);
	else {
		let t = n._$AB.nextSibling, a = n._$AM, o = a !== e;
		if (o) {
			let t;
			n._$AQ?.(e), n._$AM = e, n._$AP !== void 0 && (t = e._$AU) !== a._$AU && n._$AP(t);
		}
		if (t !== i || o) {
			let e = n._$AA;
			for (; e !== t;) {
				let t = fd(e).nextSibling;
				fd(r).insertBefore(e, i), e = t;
			}
		}
	}
	return n;
}, hd = (e, t, n = e) => (e._$AI(t, n), e), gd = {}, _d = (e, t = gd) => e._$AH = t, vd = (e) => e._$AH, yd = (e) => {
	e._$AR(), e._$AA.remove();
}, bd = (e, t, n) => {
	/**
	* @license
	* Copyright 2017 Google LLC
	* SPDX-License-Identifier: BSD-3-Clause
	*/
	let r = /* @__PURE__ */ new Map();
	for (let i = t; i <= n; i++) r.set(e[i], i);
	return r;
}, xd = ld(class extends ud {
	constructor(e) {
		if (super(e), e.type !== cd.CHILD) throw Error("repeat() can only be used in text expressions");
	}
	dt(e, t, n) {
		let r;
		n === void 0 ? n = t : t !== void 0 && (r = t);
		let i = [], a = [], o = 0;
		for (let t of e) i[o] = r ? r(t, o) : o, a[o] = n(t, o), o++;
		return {
			values: a,
			keys: i
		};
	}
	render(e, t, n) {
		return this.dt(e, t, n).values;
	}
	update(e, [t, n, r]) {
		let i = vd(e), { values: a, keys: o } = this.dt(t, n, r);
		if (!Array.isArray(i)) return this.ut = o, a;
		let s = this.ut ?? (this.ut = []), c = [], l, u, d = 0, f = i.length - 1, p = 0, m = a.length - 1;
		for (; d <= f && p <= m;) if (i[d] === null) d++;
		else if (i[f] === null) f--;
		else if (s[d] === o[p]) c[p] = hd(i[d], a[p]), d++, p++;
		else if (s[f] === o[m]) c[m] = hd(i[f], a[m]), f--, m--;
		else if (s[d] === o[m]) c[m] = hd(i[d], a[m]), md(e, c[m + 1], i[d]), d++, m--;
		else if (s[f] === o[p]) c[p] = hd(i[f], a[p]), md(e, i[d], i[f]), f--, p++;
		else if (l === void 0 && (l = bd(o, p, m), u = bd(s, d, f)), l.has(s[d])) {
			if (l.has(s[f])) {
				let t = u.get(o[p]), n = t === void 0 ? null : i[t];
				if (n === null) {
					let t = md(e, i[d]);
					hd(t, a[p]), c[p] = t;
				} else c[p] = hd(n, a[p]), md(e, i[d], n), i[t] = null;
				p++;
			} else yd(i[f]), f--;
		} else yd(i[d]), d++;
		for (; p <= m;) {
			let t = md(e, c[m + 1]);
			hd(t, a[p]), c[p++] = t;
		}
		for (; d <= f;) {
			let e = i[d++];
			e !== null && yd(e);
		}
		return this.ut = o, _d(e, c), Ce;
	}
}), Sd;
function Cd(e, t) {
	let n = new Date(e), r = new Date(t);
	if (Number.isNaN(n.getTime()) || Number.isNaN(r.getTime()) || r < n) return 0;
	let i = (r.getUTCFullYear() - n.getUTCFullYear()) * 12 + r.getUTCMonth() - n.getUTCMonth();
	return r.getUTCDate() < n.getUTCDate() && --i, Math.max(0, i);
}
function wd(e, t) {
	let n = new Date(e).getTime(), r = new Date(t).getTime();
	return Number.isNaN(n) || Number.isNaN(r) || r < n ? 0 : Math.floor((r - n) / 864e5);
}
function Td(e, t, n) {
	if (t === 0 && n !== void 0) return n ? e.tn(n, "archive.days_one", "archive.days_other") : e.t("archive.less_than_day");
	let r = Math.floor(t / 12), i = t % 12, a = r ? e.tn(r, "archive.years_one", "archive.years_other") : "", o = i || !r ? e.tn(i, "archive.months_one", "archive.months_other") : "";
	return a && o ? e.t("archive.duration_both", {
		years: a,
		months: o
	}) : a || o;
}
function Ed(e, t) {
	return /^\d{4}-\d{2}-\d{2}$/.test(t) ? e.date(t) : e.date(new Date(t).toISOString().slice(0, 10));
}
function Dd(e, t) {
	let n = new Date(t);
	return Number.isNaN(n.getTime()) ? t : new Intl.DateTimeFormat(e.language, {
		month: "short",
		year: "numeric",
		timeZone: "UTC"
	}).format(n);
}
function Od(e, t) {
	let n = t.species?.snapshot;
	if (!n) return "";
	let r = Mi(n, e.language);
	return [n.latin_name, r].filter(Boolean).join(" · ");
}
var Z = class extends D {
	constructor(...e) {
		super(...e), this.plantId = null, this.archivedCount = 0, this._list = null, this._detail = null, this._error = "", this._photos = {}, this._photoMeta = {}, this._dialog = null, this._check = null, this._name = "", this._shareSensors = !1, this._busy = !1, this._dialogError = "", this._request = 0, this._photoRequests = /* @__PURE__ */ new Map();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._cancelPhotos(), this._photos = {}, this._request++;
	}
	willUpdate(e) {
		e.has("plantId") && this._cancelPhotos(), (e.has("plantId") || e.has("hass") && !e.get("hass") && this.hass || e.has("archivedCount") && e.get("archivedCount") !== void 0 && !this.plantId) && this._load();
	}
	updated(e) {
		if (e.has("_dialog") && this._dialog) {
			let e = this.shadowRoot?.querySelector("dialog");
			e && !e.open && e.showModal(), this.shadowRoot?.querySelector("dialog h2")?.focus();
		}
	}
	_friendly(e) {
		let t = e instanceof L ? `api_error.${e.code}` : "";
		return this.l.t(Qn(t) ? t : "api_error.unknown");
	}
	async _load() {
		let e = this.hass;
		if (!e) return;
		let t = ++this._request, n = this.plantId;
		this._error = "";
		try {
			if (n) {
				this._detail = null;
				let r = await z.archiveGet(e, n);
				if (t !== this._request) return;
				this._detail = r;
			} else {
				let { plants: n, photoMeta: r } = await z.archiveList(e);
				if (t !== this._request) return;
				this._list = n, this._photoMeta = {
					...this._photoMeta,
					...r
				};
			}
		} catch (e) {
			if (t !== this._request) return;
			if (n && e instanceof L && e.code === "not_found") {
				this._open(null, !0);
				return;
			}
			this._error = this._friendly(e);
		}
	}
	_cancelPhotos() {
		for (let e of this._photoRequests.values()) e.abort();
		this._photoRequests.clear();
	}
	_photo(e, t) {
		let n = this.hass, r = e.image;
		if (!n || !r) return;
		let i = `${e.id}/${r.id}/${t}`;
		if (this._photos[i] || this._photoRequests.has(i)) return;
		let a = new AbortController();
		this._photoRequests.set(i, a), Uo.run(() => z.fetchImage(n, e.id, r.id, a.signal, t), a.signal).then((e) => {
			!a.signal.aborted && this.isConnected && (this._photos = {
				...this._photos,
				[i]: e
			});
		}).catch(() => void 0).finally(() => {
			this._photoRequests.get(i) === a && this._photoRequests.delete(i);
		});
	}
	_renderPhoto(e, t) {
		let n = e.image;
		return T`<sp-plant-photo size=${t === "thumb" ? "small" : "large"} .l=${this.l} .name=${e.name} .photoId=${n?.id ?? null}
      .photo=${n ? this._photos[`${e.id}/${n.id}/${t}`] ?? null : null} .thumbhash=${n ? this._photoMeta[n.id]?.thumbhash ?? null : null}
      @photo-wanted=${() => this._photo(e, t)}></sp-plant-photo>`;
	}
	_open(e, t = !1) {
		this.dispatchEvent(new CustomEvent("archive-open", { detail: {
			plantId: e,
			replace: t
		} }));
	}
	async _openRestore() {
		let e = this.hass, t = this._detail;
		if (e && t && !this._busy) {
			this._busy = !0, this._dialogError = "";
			try {
				let n = await z.restoreCheck(e, t.id);
				this._check = n, this._name = n.suggested_name, this._shareSensors = !1, this._dialog = "restore";
			} catch (e) {
				this._error = this._friendly(e);
			} finally {
				this._busy = !1;
			}
		}
	}
	_close() {
		this.shadowRoot?.querySelector("dialog")?.close(), this._dialog = null, this._dialogError = "", this._check = null, this.updateComplete.then(() => this.shadowRoot?.querySelector(".footer button")?.focus());
	}
	async _restore() {
		let e = this.hass, t = this._detail, n = this._check;
		if (!e || !t || !n || this._busy) return;
		let r = this._name.trim();
		if (!r) this._dialogError = this.l.t("archive.restore_name_required");
		else if (!A(r, 200)) this._dialogError = this.l.t("archive.restore_name_length");
		else {
			this._busy = !0, this._dialogError = "";
			try {
				let i = await z.restore(e, t.id, t.revision, r, this._shareSensors, n);
				this.shadowRoot?.querySelector("dialog")?.close(), this._dialog = null, this.dispatchEvent(new CustomEvent("archive-restored", { detail: { plant: i } }));
			} catch (e) {
				e instanceof L && e.code === "conflict" ? await this._recheck(n) : this._dialogError = this._friendly(e);
			} finally {
				this._busy = !1;
			}
		}
	}
	async _recheck(e) {
		let t = this.hass, n = this._detail;
		if (t && n) try {
			let r = await z.restoreCheck(t, n.id);
			if (this._dialog !== "restore" || this._detail !== n) return;
			let i = (e) => e.sources_in_use.map((e) => e.entity_id).sort().join(",");
			r.name_taken && (!e.name_taken || i(r) === i(e)) && (this._name = r.suggested_name), this._shareSensors = !1, this._check = r, this._dialogError = this.l.t("archive.restore_changed");
		} catch (e) {
			this._dialogError = this._friendly(e);
		}
	}
	async _delete() {
		let e = this.hass, t = this._detail;
		if (e && t && !this._busy) {
			this._busy = !0, this._dialogError = "";
			try {
				await z.deleteArchived(e, t.id, t.revision), this.shadowRoot?.querySelector("dialog")?.close(), this._dialog = null, this.dispatchEvent(new CustomEvent("archive-deleted", { detail: {
					plantId: t.id,
					name: t.name
				} }));
			} catch (e) {
				this._dialogError = this._friendly(e);
			} finally {
				this._busy = !1;
			}
		}
	}
	_trapFocus(e) {
		if (e.key !== "Tab") return;
		let t = [...e.currentTarget.querySelectorAll("button:not([disabled]),input:not([disabled])")], n = t[0], r = t.at(-1), i = this.shadowRoot?.activeElement;
		e.shiftKey && (i === n || i?.matches("h2")) ? (e.preventDefault(), r?.focus()) : !e.shiftKey && i === r && (e.preventDefault(), n?.focus());
	}
	_roleText(e) {
		return Rt(e) ? F(this.l, e) : e;
	}
	_renderList() {
		let e = this.l, t = this._list;
		return t ? t.length ? T`<div class="archive"><p class="muted intro">${e.t("archive.intro")}</p>
      <section class="sp-card" aria-label=${e.t("archive.title")}><ul class="archive-list">${xd(t, (e) => e.id, (t) => {
			let n = Od(e, t), r = e.t("archive.date_range", {
				start: Dd(e, t.acquired_at ?? t.created_at),
				end: Dd(e, t.archived_at)
			});
			return T`<li><button type="button" class="archive-row" @click=${() => this._open(t.id)}>
          ${this._renderPhoto(t, "thumb")}
          <span class="row-text"><span>${t.name}</span>${n ? T`<span class="small muted">${n}</span>` : E}</span>
          <span class="small muted">${r}</span></button></li>`;
		})}</ul></section></div>` : T`<div class="archive"><p>${e.t("archive.empty")}</p><div><button type="button" @click=${() => this.dispatchEvent(new CustomEvent("archive-close"))}>${e.t("panel.back_to_overview")}</button></div></div>` : T`<p class="muted" role="status">${e.t("archive.loading")}</p>`;
	}
	_renderDetail() {
		let e = this.l, t = this._detail;
		if (!t) return T`<p class="muted" role="status">${e.t("archive.loading")}</p>`;
		let n = Od(e, t), r = t.acquired_at ?? t.created_at, i = (t) => {
			let n = `care_field.${t}`;
			return Qn(n) ? e.t(n) : t;
		}, a = Object.keys(cl).map((e) => [e, t.events.filter((t) => t.kind === e).length]).filter(([, e]) => e > 0).map(([t, n]) => e.t("archive.care_count", {
			kind: e.t(`care_kind.${t}`),
			count: n
		})).join(" · ");
		return T`<div class="archive pd">
      <section class="sp-card"><div class="hero">
        ${this._renderPhoto(t, "thumb2x")}
        <div class="row-text"><h2>${t.name}</h2>${n ? T`<span class="muted">${n}</span>` : E}${t.area_name ? T`<span class="small muted">${t.area_name}</span>` : E}</div></div>
        <dl class="facts">
          ${t.acquired_at ? T`<dt>${e.t("archive.fact_acquired")}</dt><dd>${Ed(e, t.acquired_at)}</dd>` : E}
          <dt>${e.t("archive.fact_added")}</dt><dd>${Ed(e, t.created_at)}</dd>
          <dt>${e.t("archive.fact_retired")}</dt><dd>${Ed(e, t.archived_at)}</dd>
          <dt>${e.t("archive.fact_monitored")}</dt><dd>${Td(e, Cd(r, t.archived_at), wd(r, t.archived_at))}</dd>
        </dl></section>
      <section class="sp-card" aria-labelledby="archive-care"><div class="card-h"><h3 id="archive-care">${e.t("archive.care_heading")}</h3></div>
        ${a ? T`<p class="small muted card-b">${a}</p>` : E}
        ${t.events.length ? T`<ul class="list" aria-label=${e.t("care.events_label")}>${t.events.map((t) => {
			let n = Dl(e, t, i);
			return T`<li class="li"><span class="ic tonal" aria-hidden="true"><ha-icon .icon=${cl[t.kind]}></ha-icon></span>
            <span class="li-main"><span class="li-title">${e.t(`care_kind.${t.kind}`)}</span><span class="li-sub"><time datetime=${t.occurred_at}>${e.recordedDateTime(t.occurred_at)}</time>${n.map((e) => T` · <span class="prose">${e}</span>`)}</span></span><span></span></li>`;
		})}</ul>` : T`<p class="card-b muted">${e.t("care.empty")}</p>`}</section>
      <div class="footer">
        <button type="button" class="btn filled" ?disabled=${this._busy} @click=${() => void this._openRestore()}><ha-icon aria-hidden="true" icon="mdi:restore"></ha-icon>${e.t("archive.restore")}</button>
        <button type="button" class="btn danger" ?disabled=${this._busy} @click=${() => {
			this._dialogError = "", this._dialog = "delete";
		}}><ha-icon aria-hidden="true" icon="mdi:delete-outline"></ha-icon>${e.t("archive.delete")}</button>
      </div>
      ${this._dialog === "restore" ? this._renderRestoreDialog(t) : this._dialog === "delete" ? this._renderDeleteDialog(t) : E}
    </div>`;
	}
	_renderRestoreDialog(e) {
		let t = this.l, n = this._check;
		if (!n) return E;
		let r = n.blocked === "limit" ? t.t("archive.restore_blocked_limit") : n.blocked === "busy" ? t.t("archive.restore_blocked_busy") : "";
		return T`<dialog aria-labelledby="restore-title" @cancel=${(e) => {
			e.preventDefault(), this._close();
		}} @keydown=${(e) => this._trapFocus(e)}>
      <h2 id="restore-title" tabindex="-1">${t.t("archive.restore_title", { name: e.name })}</h2>
      <p>${t.t("archive.restore_body")}</p>
      ${r ? T`<p class="error" role="alert">${r}</p>` : T`
        ${n.name_taken ? T`<div class="field"><label for="restore-name">${t.t("archive.restore_name")}</label>
          <input id="restore-name" type="text" maxlength=${Ke(200)} .value=${this._name} aria-describedby="restore-name-help" @input=${(e) => {
			this._name = e.target.value;
		}}>
          <span class="small muted" id="restore-name-help">${t.t("archive.restore_name_taken", { name: e.name })}</span></div>` : E}
        ${n.sources_in_use.length ? T`<div><p class="small">${t.t("archive.restore_in_use")}</p>
          <ul class="sensor-list small">${n.sources_in_use.map((e) => T`<li>${this._roleText(e.role)} · ${e.entity_id} → ${e.plants.join(", ")}</li>`)}</ul>
          <label class="check"><input type="checkbox" .checked=${this._shareSensors} @change=${(e) => {
			this._shareSensors = e.target.checked;
		}}><span>${t.t("archive.restore_share")}</span></label></div>` : E}
        ${n.sources_missing.length ? T`<div><p class="small">${t.t("archive.restore_missing")}</p>
          <ul class="sensor-list small">${n.sources_missing.map((e) => T`<li>${this._roleText(e.role)} · ${e.entity_id}</li>`)}</ul></div>` : E}
        ${n.area_missing ? T`<p class="small">${t.t("archive.restore_area_missing", { area: e.area_name ?? "" })}</p>` : E}`}
      ${this._dialogError ? T`<p class="error" role="alert">${this._dialogError}</p>` : E}
      <div class="actions"><button type="button" @click=${() => this._close()}>${t.t("common.cancel")}</button>
        <button type="button" class="primary" ?disabled=${this._busy || !!r} @click=${() => void this._restore()}>${n.sources_in_use.length && !this._shareSensors ? t.t("archive.restore_without") : t.t("archive.restore_confirm")}</button></div></dialog>`;
	}
	_renderDeleteDialog(e) {
		let t = this.l;
		return T`<dialog aria-labelledby="delete-title" @cancel=${(e) => {
			e.preventDefault(), this._close();
		}} @keydown=${(e) => this._trapFocus(e)}>
      <h2 id="delete-title" tabindex="-1">${t.t("archive.delete_title", { name: e.name })}</h2>
      <p>${t.t("archive.delete_body")}</p>
      ${this._dialogError ? T`<p class="error" role="alert">${this._dialogError}</p>` : E}
      <div class="actions"><button type="button" @click=${() => this._close()}>${t.t("common.cancel")}</button>
        <button type="button" class="primary" ?disabled=${this._busy} @click=${() => void this._delete()}>${t.t("archive.delete_confirm")}</button></div></dialog>`;
	}
	render() {
		return T`${this._error ? T`<p class="error" role="alert">${this._error}</p>` : E}${this.plantId ? this._renderDetail() : this._renderList()}`;
	}
};
Sd = Z, Sd.styles = [
	G,
	ju,
	kl,
	o`
    :host { display: block; }
    .archive { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }
    .intro { margin: 0; }
    .archive-list { list-style: none; margin: 0; padding: 0; }
    .archive-list li { margin: 0; }
    .archive-row { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 12px; align-items: center; width: 100%; min-height: 60px; padding: 10px 16px; border: 0; background: none; color: inherit; font: inherit; text-align: start; cursor: pointer; border-radius: 0; }
    .archive-list li + li .archive-row { border-top: 1px solid var(--divider-color, #e0e0e0); }
    .archive-row:hover { background: color-mix(in srgb, currentColor 5%, transparent); }
    .archive-row:focus-visible { outline: 2px solid var(--sp-primary, var(--primary-color)); outline-offset: -2px; }
    .row-text { display: flex; flex-direction: column; min-width: 0; }
    .row-text span { overflow: hidden; text-overflow: ellipsis; }
    .hero { display: flex; gap: 16px; align-items: center; padding: 16px; flex-wrap: wrap; }
    .hero h2 { margin: 0; font-size: 1.25rem; font-weight: 500; }
    .hero .row-text { gap: 2px; }
    .facts { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 6px 16px; margin: 0; padding: 0 16px 16px; }
    .facts dt { color: var(--secondary-text-color); }
    .facts dd { margin: 0; }
    .card-h { padding: 12px 16px 0; }
    .card-h h3 { margin: 0; font-size: 1rem; font-weight: 500; }
    .footer { display: flex; gap: 8px; flex-wrap: wrap; justify-content: space-between; }
    .sensor-list { margin: 4px 0 0; padding-inline-start: 20px; }
    dialog label.check { display: flex; gap: 8px; align-items: flex-start; }
    dialog .field { display: flex; flex-direction: column; gap: 4px; }
    dialog input[type=text] { min-height: 40px; }
  `
], K([O({ attribute: !1 })], Z.prototype, "hass", void 0), K([O({ attribute: !1 })], Z.prototype, "l", void 0), K([O({ attribute: !1 })], Z.prototype, "plantId", void 0), K([O({ attribute: !1 })], Z.prototype, "archivedCount", void 0), K([k()], Z.prototype, "_list", void 0), K([k()], Z.prototype, "_detail", void 0), K([k()], Z.prototype, "_error", void 0), K([k()], Z.prototype, "_photos", void 0), K([k()], Z.prototype, "_photoMeta", void 0), K([k()], Z.prototype, "_dialog", void 0), K([k()], Z.prototype, "_check", void 0), K([k()], Z.prototype, "_name", void 0), K([k()], Z.prototype, "_shareSensors", void 0), K([k()], Z.prototype, "_busy", void 0), K([k()], Z.prototype, "_dialogError", void 0), customElements.get("smart-plants-archive") || customElements.define("smart-plants-archive", Z);
// src/views/overview.ts
var kd, Ad = "https://github.com/mikekuss/home-assistant-smart-plants/blob/main/docs/getting-started.md", jd = {
	all: {
		label: "overview.tile_all",
		count: ["overview.tile_count_all_one", "overview.tile_count_all_other"],
		icon: "mdi:sprout",
		tone: "var(--sp-primary)"
	},
	water: {
		label: "overview.tile_water",
		count: ["overview.tile_count_water_one", "overview.tile_count_water_other"],
		icon: "mdi:water-alert",
		tone: "var(--sp-warning)"
	},
	problems: {
		label: "overview.tile_problems",
		count: ["overview.tile_count_problems_one", "overview.tile_count_problems_other"],
		icon: "mdi:alert-circle",
		tone: "var(--sp-error)"
	},
	sensors: {
		label: "overview.tile_sensors",
		count: ["overview.tile_count_sensors_one", "overview.tile_count_sensors_other"],
		icon: "mdi:clock-alert-outline",
		tone: "var(--sp-disabled)"
	},
	care: {
		label: "overview.tile_care",
		count: ["overview.tile_count_care_one", "overview.tile_count_care_other"],
		icon: "mdi:calendar-check-outline",
		tone: "var(--sp-care)"
	}
}, Md = {
	attention: "overview.sort_attention",
	name: "overview.sort_name",
	area: "overview.sort_area"
}, Nd = {
	attention: "mdi:alert-circle-outline",
	name: "mdi:sort-alphabetical-ascending",
	area: "mdi:texture-box"
}, Q = class extends D {
	constructor(...e) {
		super(...e), this.l = B, this.plants = [], this.overview = {}, this.areaNames = {}, this.thumbnails = {}, this.photoMeta = {}, this.watering = /* @__PURE__ */ new Set(), this.loading = !1, this.pending = !1, this.blocked = !1, this.now = void 0, this.timeZone = void 0, this.hidden = !1, this._filter = "all", this._sort = "attention", this._query = "", this._wasSkeleton = !1;
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
			let n = t.species?.snapshot.latin_name ?? t.species?.snapshot.common_name ?? null, r = this.areaNames[t.id] ?? null, i = this.overview[t.id], a = Du(i ? i.snoozed_until : t.snoozed_until, e) !== null;
			return {
				id: t.id,
				name: t.name,
				areaName: r,
				status: i?.status,
				snoozed: a,
				plant: t,
				overview: i,
				species: n,
				careDue: lc(i).length > 0,
				searchText: [
					t.name,
					r,
					...t.species ? Ni(t.species.snapshot) : [],
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
		if (this.hidden) return E;
		let t = this._skeleton();
		return !t && !this.plants.length ? this._renderEmpty() : T`<div class="content" aria-busy=${t ? "true" : E}>
      ${t ? this._renderSkeletonTop() : this._renderSummary()}
      <div class="listbar">
        <label class="search"><ha-icon aria-hidden="true" icon="mdi:magnify"></ha-icon>
          <input type="search" .value=${this._query} placeholder=${e.t("overview.search")} aria-label=${e.t("overview.search")} @input=${(e) => {
			this._query = e.target.value;
		}}></label>
        <ha-dropdown @wa-select=${(e) => {
			let t = e.detail.item.value;
			pn.includes(t) && (this._sort = t);
		}}>
          <button slot="trigger" class="pill" type="button" aria-label=${e.t("overview.sort_button", { sort: e.t(Md[this._sort]) })}><ha-icon aria-hidden="true" icon="mdi:sort"></ha-icon>${e.t(Md[this._sort])}<ha-icon aria-hidden="true" icon="mdi:menu-down"></ha-icon></button>
          ${pn.map((t) => T`<ha-dropdown-item value=${t} ?checked=${this._sort === t}>
            ${this._sort === t ? T`<ha-icon slot="icon" icon="mdi:check"></ha-icon>` : T`<ha-icon slot="icon" .icon=${Nd[t]}></ha-icon>`}${e.t(Md[t])}</ha-dropdown-item>`)}
        </ha-dropdown>
      </div>
      ${t ? this._renderSkeletonList() : this._renderResults()}
    </div>
    <button type="button" class="fab" ?disabled=${this.blocked} @click=${() => this._emit("add-plant")}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${e.t("panel.add_plant")}</button>`;
	}
	_skeleton() {
		return this.pending || this.loading && !this.plants.length;
	}
	updated() {
		let e = !this.hidden && this._skeleton();
		this._wasSkeleton && !e && !this.hidden && this.renderRoot.querySelectorAll(".summary, .countline, .grid, .group-heading, .no-results").forEach((e) => Oa(e)), this._wasSkeleton = e;
	}
	_renderSummary() {
		let e = this._items(), t = dn.filter((t) => t !== "care" || e.some((e) => fn("care", e.status, e.careDue, e.snoozed)) || this._filter === "care");
		return T`<div class="summary ${t.length === 5 ? "five" : ""}" role="group" aria-label=${this.l.t("overview.filter_label")}>${t.map((t) => this._renderTile(t, e.filter((e) => fn(t, e.status, e.careDue, e.snoozed)).length))}</div>`;
	}
	_renderResults() {
		let e = this.l, t = this._items(), n = t.filter((e) => fn(this._filter, e.status, e.careDue, e.snoozed) && mn(e, this._query)), r = this._filter !== "all";
		return T`<div class="countline"><p role="status">${e.tn(t.length, "list.count_filtered_one", "list.count_filtered_other", {
			shown: n.length,
			total: t.length
		})}${r ? ` · ${e.t(jd[this._filter].label)}` : ""}</p>
        ${r || this._query ? T`<button type="button" class="text-button" @click=${() => this._clear()}>${e.t("overview.clear_filter")}</button>` : E}</div>
      ${n.length ? this._renderList(n) : this._renderNoResults()}`;
	}
	_renderSkeletonTop() {
		return T`<div class="summary" aria-hidden="true">${[
			0,
			1,
			2,
			3
		].map(() => T`<div class="tile sk-tile"><span class="sk round sk-ico"></span><span class="txt"><span class="sk sk-num"></span><span class="sk line sk-lbl"></span></span></div>`)}</div>`;
	}
	_renderSkeletonList() {
		let e = this.plants.length || 3;
		return T`<div class="countline"><p class="sr-only" role="status">${this.l.t("list.loading")}</p><span class="sk sk-count" aria-hidden="true"></span></div>
      <ul class="grid" aria-hidden="true">${Array.from({ length: e }, () => T`<li><div class="card">
        <div class="head"><span class="sk sk-avatar"></span><span class="title"><span class="sk sk-name"></span><span class="sk line sk-sub"></span></span></div>
        <div class="status"><span class="sk sk-chip"></span><span class="sk line sk-reason"></span></div>
        <div class="readings"><span class="sk sk-bar"></span></div>
        <div class="foot"><span class="sk line sk-last"></span><span class="sk sk-button"></span></div>
      </div></li>`)}</ul>`;
	}
	_renderTile(e, t) {
		let n = jd[e];
		return T`<button type="button" class="tile ${t === 0 ? "zero" : ""}" style="--tone:${n.tone}" aria-pressed=${this._filter === e ? "true" : "false"}
      @click=${() => {
			this._filter = this._filter === e && e !== "all" ? "all" : e;
		}}>
      <span class="ico" aria-hidden="true"><ha-icon .icon=${n.icon}></ha-icon></span>
      <span class="txt"><span class="num">${this.l.number(t)}</span><span class="lbl">${this.l.tn(t, ...n.count)}</span></span></button>`;
	}
	_renderList(e) {
		return this._sort === "area" ? vn(e).map((e) => T`<h2 class="group-heading"><ha-icon aria-hidden="true" icon="mdi:texture-box"></ha-icon>${e.area ?? this.l.t("overview.no_area")} <span class="n">· ${this.l.number(e.items.length)}</span></h2>
      <ul class="grid">${xd(e.items, (e) => e.id, (e) => T`<li>${this._renderCard(e)}</li>`)}</ul>`) : T`<ul class="grid">${xd(_n(e, this._sort), (e) => e.id, (e) => T`<li>${this._renderCard(e)}</li>`)}</ul>`;
	}
	_renderCard(e) {
		let t = this.l, n = e.overview, r = e.plant, i = n ? an(t, n) : null, a = n ? cn(t, n, this.now) : "", o = n?.roles.moisture, s = n ? un(n) : [], c = `plant-${r.id}`, l = this.now ?? Date.now(), u = Au(t, n ? n.snoozed_until : r.snoozed_until, ks(new Date(l).toISOString(), this.timeZone) ?? "", this.timeZone, l);
		return T`<article class="card" aria-labelledby=${c}>
      <div class="head">${this._renderPhoto(r)}
        <div class="title"><div role="heading" aria-level=${this._sort === "area" ? "3" : "2"}><button type="button" class="name" id=${c} @click=${() => this._emit("open-plant", { plantId: r.id })}>${r.name}</button></div>
          <span class="sub">${e.areaName ? T`<ha-icon aria-hidden="true" icon="mdi:texture-box"></ha-icon>${e.areaName}` : E}${e.areaName && e.species ? " · " : ""}${e.species ? T`<i>${e.species}</i>` : E}</span></div></div>
      ${n && i ? T`<div class="status"><div class="chiprow"><sp-status-chip .status=${n.status} .label=${i.label} .more=${i.more} .l=${t}></sp-status-chip>${u ? T`<sp-snooze-chip .label=${u}></sp-snooze-chip>` : E}${n.winter?.active ? T`<sp-winter-icon .label=${t.t("winter.icon_label")}></sp-winter-icon>` : E}</div>${a ? T`<span class="reason">${a}</span>` : E}</div>` : E}
      ${this._renderCare(n)}
      ${n && n.status === "no_sensors" && !s.length ? T`<div class="empty-box"><span>${t.t("card.no_sensors")}</span><button type="button" class="text-button" @click=${() => this._emit("open-plant", {
			plantId: r.id,
			section: "sensors"
		})} aria-label=${t.t("card.assign_label", { name: r.name })}>${t.t("card.assign")}</button></div>` : o || s.length ? T`<div class="readings">
          ${o ? T`<sp-moisture-bar .value=${o.value} .range=${o.range} .state=${o.state} .lastReported=${o.last_reported} .now=${this.now} .l=${t}></sp-moisture-bar>` : E}
          ${s.length ? T`<div class="chips">${s.map(([e, n]) => T`<sp-reading-chip .role=${e} .value=${n.value} .unit=${n.unit} .state=${n.state} .range=${n.range} .l=${t}></sp-reading-chip>`)}</div>` : E}
        </div>` : E}
      <div class="foot"><span class="last"><ha-icon aria-hidden="true" icon="mdi:history"></ha-icon>${ln(t, n?.last_watered_at ?? null, this.now)}</span>
        <button type="button" class="tonal" ?disabled=${this.blocked || this.watering.has(r.id)} aria-label=${t.t("overview.log_watering_label", { name: r.name })} @click=${() => this._emit("log-watering", { plantId: r.id })}><ha-icon aria-hidden="true" icon="mdi:water"></ha-icon>${t.t("card.log_watering")}</button></div>
    </article>`;
	}
	_renderPhoto(e) {
		let t = e.image?.id ?? null, n = this.thumbnails[e.id];
		return T`<sp-plant-photo .photoId=${t} .photo=${t && n?.imageId === t ? n.blob : null}
      .thumbhash=${t ? this.photoMeta[t]?.thumbhash ?? null : null} .name=${e.name} .l=${this.l}></sp-plant-photo>`;
	}
	_renderCare(e) {
		let t = lc(e);
		if (!t.length) return E;
		let n = this.l, r = t.some((e) => e.status === "overdue");
		return T`<p class="care ${r ? "overdue" : ""}"><ha-icon aria-hidden="true" icon=${r ? "mdi:alarm" : "mdi:calendar-check-outline"}></ha-icon>
      <span>${n.t("card.care_due", { tasks: uc(n, t) })}${r ? T`<span class="sr-only"> (${n.t("card.care_overdue")})</span>` : E}</span></p>`;
	}
	_renderEmpty() {
		let e = this.l;
		return T`<sp-empty-state icon="mdi:sprout" .heading=${e.t("overview.empty_heading")}>${e.t("overview.empty_body")}
      <button slot="actions" type="button" class="filled" ?disabled=${this.blocked} @click=${() => this._emit("add-plant")}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${e.t("panel.add_plant")}</button>
      <a slot="actions" class="text-button" href=${Ad} target="_blank" rel="noopener noreferrer">${e.t("overview.how_it_works")}</a></sp-empty-state>`;
	}
	_renderNoResults() {
		let e = this.l, t = this._query.trim() ? e.t("overview.no_match_query", { query: this._query.trim() }) : e.t("overview.no_match_filter", { filter: e.t(jd[this._filter].label) });
		return T`<sp-empty-state class="no-results" compact icon="mdi:magnify-remove-outline" .heading=${e.t("overview.no_match_heading")}>${t}
      <button slot="actions" type="button" class="text-button" @click=${() => this._clear()}>${e.t("overview.show_all")}</button></sp-empty-state>`;
	}
};
kd = Q, kd.styles = [
	G,
	ya,
	o`
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
    /* Placeholders sized like a tile, the count line and a card with one reading. */
    .tile.sk-tile { cursor: default; }
    .sk-ico { width: 40px; height: 40px; flex: none; }
    .sk-tile .txt { display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .sk-num { width: 28px; height: 18px; }
    .sk-lbl { width: 70%; }
    .sk-count { width: 110px; height: 12px; margin: 3px 0; }
    .sk-avatar { width: 56px; height: 56px; border-radius: 12px; flex: none; }
    .sk-name { width: 55%; height: 16px; margin: 2px 0 4px; }
    .sk-sub { width: 38%; }
    .sk-chip { width: 96px; height: 28px; border-radius: 14px; }
    .sk-reason { width: 72%; }
    .sk-bar { height: 52px; border-radius: 8px; }
    .sk-last { width: 42%; }
    .sk-button { width: 96px; height: 32px; border-radius: 16px; flex: none; }

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
      .tile .ico, .sk-ico { width: 26px; height: 26px; }
      .sk-tile { width: 112px; }
      .sk-tile .txt { flex-direction: row; align-items: center; }
      .sk-num { width: 14px; height: 12px; }
      .tile .ico ha-icon { --mdc-icon-size: 16px; }
      .tile .txt { display: inline-flex; align-items: baseline; gap: 5px; white-space: nowrap; }
      .tile .num { display: inline; font-size: 14px; line-height: 1; }
      .tile .lbl { display: inline; overflow-wrap: normal; }
      .grid { grid-template-columns: 1fr; }
    }
  `
], K([O({ attribute: !1 })], Q.prototype, "l", void 0), K([O({ attribute: !1 })], Q.prototype, "plants", void 0), K([O({ attribute: !1 })], Q.prototype, "overview", void 0), K([O({ attribute: !1 })], Q.prototype, "areaNames", void 0), K([O({ attribute: !1 })], Q.prototype, "thumbnails", void 0), K([O({ attribute: !1 })], Q.prototype, "photoMeta", void 0), K([O({ attribute: !1 })], Q.prototype, "watering", void 0), K([O({ type: Boolean })], Q.prototype, "loading", void 0), K([O({ type: Boolean })], Q.prototype, "pending", void 0), K([O({ type: Boolean })], Q.prototype, "blocked", void 0), K([O({ attribute: !1 })], Q.prototype, "now", void 0), K([O({ attribute: !1 })], Q.prototype, "timeZone", void 0), K([O({
	type: Boolean,
	reflect: !0
})], Q.prototype, "hidden", void 0), K([k()], Q.prototype, "_filter", void 0), K([k()], Q.prototype, "_sort", void 0), K([k()], Q.prototype, "_query", void 0), customElements.get("smart-plants-overview") || customElements.define("smart-plants-overview", Q);
function Pd(e) {
	let { friendly_name: t, last_triggered: n, id: r } = e.attributes;
	return {
		entityId: e.entity_id,
		name: typeof t == "string" && t.trim() ? t : e.entity_id,
		status: e.state === "on" ? "on" : e.state === "off" ? "off" : "unavailable",
		lastTriggered: typeof n == "string" && Number.isFinite(Date.parse(n)) ? n : null,
		editPath: typeof r == "string" && r ? `/config/automation/edit/${encodeURIComponent(r)}` : null
	};
}
function Fd(e, t, n, r) {
	let i = (e, t) => Number(e.status !== "on") - Number(t.status !== "on") || e.name.localeCompare(t.name, r, { sensitivity: "base" }) || e.entityId.localeCompare(t.entityId), a = (e, t) => [...new Set(e)].flatMap((e) => {
		let r = n[e];
		return r && !t.has(e) ? [Pd(r)] : [];
	}).sort(i);
	return {
		plant: a(e, /* @__PURE__ */ new Set()),
		allPlants: a(t, new Set(e))
	};
}
function Id(e, t) {
	let n = !t && e.length > 5;
	return {
		shown: n ? e.slice(0, 5) : e,
		more: n
	};
}
function Ld(e, t, n = Date.now()) {
	let r = t.lastTriggered ? e.t("automations.last_ran", { time: Vt(e, t.lastTriggered, Math.max(n, Date.parse(t.lastTriggered))) }) : e.t("automations.never_ran");
	return t.editPath ? r : `${e.t("automations.yaml")} · ${r}`;
}
// src/panel.ts
var Rd, zd = Object.fromEntries([
	{
		problemRole: "temperature_stress",
		configRole: "temperature",
		keys: _r,
		defaults: gr,
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
		validate: (e, t, n) => wr(e, t, n),
		seed: (e) => Tr(e)
	},
	{
		problemRole: "humidity_stress",
		configRole: "humidity",
		keys: Dr,
		defaults: Er,
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
		validate: (e, t, n) => Nr(e, t, n),
		seed: (e) => Ir(e)
	},
	{
		problemRole: "conductivity_stress",
		configRole: "conductivity",
		keys: Rr,
		defaults: Lr,
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
		validate: (e, t) => Wr(e, t),
		seed: (e) => Gr(e)
	},
	{
		problemRole: "co2_stress",
		configRole: "co2",
		keys: qr,
		defaults: Kr,
		unit: "ppm",
		min: "0",
		max: "10000",
		step: "1",
		labels: {
			threshold_ppm: "threshold_field.high_trigger",
			clear_ppm: "threshold_field.high_clear"
		},
		validate: (e, t) => $r(e, t),
		seed: (e) => ei(e)
	},
	{
		problemRole: "soil_temperature_stress",
		configRole: "soil_temperature",
		keys: ni,
		defaults: ti,
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
		validate: (e, t) => ci(e, t),
		seed: (e) => li(e)
	},
	{
		problemRole: "low_battery",
		configRole: "battery",
		keys: di,
		defaults: ui,
		unit: "%",
		min: "0",
		max: "100",
		step: "1",
		labels: {
			threshold_percent: "threshold_field.low_trigger",
			clear_percent: "threshold_field.low_clear"
		},
		validate: (e, t) => gi(e, t),
		seed: (e) => _i(e)
	},
	{
		problemRole: "low_light",
		configRole: "illuminance",
		keys: yi,
		defaults: vi,
		unit: "lx",
		min: "0",
		max: "200000",
		step: "0.1",
		labels: {
			target_lux: "threshold_field.target",
			clear_lux: "threshold_field.clear"
		},
		validate: (e, t) => wi(e, t),
		seed: (e) => Ti(e)
	}
].map((e) => [e.problemRole, e])), Bd = "M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", Vd = "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z", Hd = "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2Z", Ud = "M17.75 21.16L15 18.16L16.16 17L17.75 18.59L21.34 15L22.5 16.41L17.75 21.16M10 21H12.8C13.04 21.41 13.33 21.79 13.65 22.13C13.29 22.66 12.69 23 12 23C10.9 23 10 22.11 10 21M3 20V19L5 17V11C5 7.9 7.03 5.18 10 4.29V4C10 2.9 10.9 2 12 2C13.11 2 14 2.9 14 4V4.29C16.97 5.18 19 7.9 19 11V12.08L18 12L17 12.08V11C17 8.24 14.76 6 12 6C9.24 6 7 8.24 7 11V18H12C12 18.7 12.12 19.37 12.34 20H3Z", Wd = "M21 3H3v6h1v12h16V9h1V3ZM5 5h14v2H5V5Zm1 4h12v10H6V9Zm3 2v2h6v-2H9Z", Gd = "M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z", Kd = /^\/plant\/([^/]+)(?:\/(sensors))?\/?$/, qd = /^\/notifications\/?$/, Jd = /^\/retired(?:\/([^/]+))?\/?$/, Yd = {
	fertilizing: ["product", "amount"],
	pruning: ["part"],
	repotting: ["container", "medium"],
	pest_control: ["pest", "product"]
};
async function Xd(e, t, n, r, i = () => !0) {
	try {
		return await z.uploadImage(e, t, n, r);
	} catch (a) {
		if (!(a instanceof L && a.code === "revision_conflict")) throw a;
		let o = (await z.list(e)).find((e) => e.id === t);
		if (!o || o.revision === n || !i(o)) throw a;
		return await z.uploadImage(e, t, o.revision, r);
	}
}
function Zd(e) {
	let t = -e.getTimezoneOffset();
	return `${new Date(e.getTime() + t * 6e4).toISOString().slice(0, 19)}${t < 0 ? "-" : "+"}${String(Math.floor(Math.abs(t) / 60)).padStart(2, "0")}:${String(Math.abs(t) % 60).padStart(2, "0")}`;
}
var Qd = "smart_plants.history_role", $d = "smart_plants.history_range", ef = 3e5, tf = 3e4, nf = 400, rf = 2e3, af = 1e3, of = (e, t) => e !== t && (e?.state !== t?.state || JSON.stringify(e?.attributes) !== JSON.stringify(t?.attributes)), sf = (e, t) => !!e && !!t && e !== t && (e.attributes.snoozed_until ?? null) !== (t.attributes.snoozed_until ?? null);
function cf(e) {
	try {
		return localStorage.getItem(e);
	} catch {
		return null;
	}
}
function lf(e, t) {
	try {
		localStorage.setItem(e, t);
	} catch {}
}
var $ = class e extends D {
	constructor(...e) {
		super(...e), this.narrow = !1, this._plants = [], this._loading = !0, this._error = "", this._notice = "", this._view = { kind: "list" }, this._detailSection = "overview", this._formBusy = !1, this._capabilities = null, this._updateAvailable = !1, this._blocked = !0, this._areas = [], this._entities = [], this._devices = [], this._states = {}, this._evaluations = {}, this._health = {}, this._healthError = "", this._careHistory = null, this._historyRole = ((e) => Rt(e) ? e : "moisture")(cf(Qd)), this._historyRange = ((e) => Cn(e) ? e : "7d")(cf($d)), this._history = null, this._careError = "", this._careLoadError = "", this._careDate = "", this._careNote = "", this._careKind = "watering", this._careFields = {}, this._careEditingId = null, this._registryError = "", this._areaReview = !1, this._overview = {}, this._overviewError = "", this._statusRead = !1, this._thumbnails = {}, this._photoMeta = {}, this._watering = /* @__PURE__ */ new Set(), this._edits = null, this._conflict = null, this._allSensors = !1, this._preview = null, this._provider = "manual", this._query = "", this._results = [], this._related = [], this._relatedAllPlants = [], this._relatedExpanded = /* @__PURE__ */ new Set(), this._image = null, this._imageFor = null, this._imageLoading = !1, this._imageError = null, this._dialog = null, this._archivedCount = 0, this._rejected = [], this._removing = null, this._snoozeDraft = null, this._winterDraft = null, this._winterBase = null, this._winterStored = null, this._winterChanged = !1, this._winterOpen = !1, this._restEditor = null, this._taskEditor = null, this._automateTaskId = null, this._carePending = /* @__PURE__ */ new Set(), this._careTaskId = null, this._wizardStarted = !1, this._notificationsOpen = !1, this._notificationsReturn = null, this._notifications = null, this._notificationsFor = null, this._notificationsRequest = 0, this._creationNotice = "", this._creationPhoto = "", this._createdPlantId = null, this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._thresholdSaved = {}, this._pendingThresholdSwitch = null, this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._sourceUnavailable = null, this._sourceSaved = {}, this._pendingSourceSwitch = null, this._sourceMode = "combine", this._moistureMode = null, this._moistureSourceError = "", this._expanded = /* @__PURE__ */ new Set(), this._opened = /* @__PURE__ */ new Set(), this._settingsOpen = /* @__PURE__ */ new Set(), this._careFilter = "all", this._careFormOpen = !1, this._allSourceSensors = !1, this._base = null, this._baseArea = "", this._imageKey = null, this._imageRequest = 0, this._thumbnailKeys = {}, this._thumbnailAborts = /* @__PURE__ */ new Map(), this._thumbnailWanted = /* @__PURE__ */ new Set(), this._thumbnailRetries = /* @__PURE__ */ new Map(), this._request = 0, this._careRequest = 0, this._historyRequest = 0, this._historyLoadedAt = 0, this._providerRequest = 0, this._context = 0, this._subscriptionGeneration = 0, this._focusReturn = null, this._registriesDue = !1, this._registryLive = !1, this._ownWriteAt = -Infinity, this._relatedFor = null, this._relatedRequest = 0, this._relatedAt = -Infinity, this._registryChanged = () => {
			this._refresh();
		}, this._ready = () => {
			this._thumbnailRetries.clear(), this._refresh();
		}, this._disconnected = () => {
			this._context++, this._formBusy = !1, this._blocked = !0, this._request++, this._providerRequest++, this._preview = null, this._clearImage(), this._error = this._l.t("error.disconnected");
		}, this._visible = () => {
			document.hidden || this._refreshQuietly();
		}, this._routeApplied = null;
	}
	get _l() {
		return ar(this.hass);
	}
	willUpdate(e) {
		e.has("hass") && (this.hass?.states && (this._states = Object.fromEntries(Object.entries(this.hass.states).filter(([e, t]) => Dt(t) && t.entity_id === e))), this._syncImage()), this._syncHistory();
	}
	updated(e) {
		this._applyRoute(), e.has("hass") && (this.hass?.connection !== this._connection && (this._unbind(), this._bind(), this._refresh()), this.hass?.user?.is_admin === !1 && this._unbind(), this._watchCare(e.get("hass"))), this._syncRelated(), this._syncNotifications(), this._fadeLoaded(e);
		let t = this.shadowRoot?.querySelector("dialog"), n = null;
		try {
			n = this.shadowRoot?.activeElement;
		} catch {
			n = null;
		}
		t?.open && (!n || !t.contains(n) || n.matches(":disabled")) && t.querySelector("button")?.focus();
	}
	_fadeLoaded(e) {
		if (e.has("_history")) {
			let t = e.get("_history");
			t?.status === "loading" && !t.stale && this._history?.status === "ready" && this._history.key === t.key && Oa(this.shadowRoot?.querySelector(".history-plot"));
		}
		e.has("_careHistory") && e.get("_careHistory") === null && this._careHistory && this.shadowRoot?.querySelectorAll(".care-content").forEach((e) => Oa(e));
	}
	connectedCallback() {
		super.connectedCallback(), this.hasUpdated && (this._bind(), this._refresh(), this._syncImage());
		for (let e of [
			"ha-tab-group",
			"ha-expansion-panel",
			"ha-alert",
			"ha-area-picker",
			"ha-menu-button"
		]) customElements.whenDefined(e).then(() => this.requestUpdate());
		this._timer = setInterval(() => {
			document.hidden || this._refreshQuietly();
		}, tf), document.addEventListener("visibilitychange", this._visible);
	}
	disconnectedCallback() {
		this._context++, this._formBusy = !1, this._request++, this._providerRequest++, this._clearImage(), this._clearThumbnails(!0), this._unbind(), clearInterval(this._timer), document.removeEventListener("visibilitychange", this._visible), this._clearCareTimer(), super.disconnectedCallback();
	}
	_refreshQuietly() {
		!this._formBusy && !this._loading && this.isConnected && this._refresh(!1, !this._registryLive);
	}
	_watchCare(e) {
		let t = e?.states, n = this.hass?.states;
		if (!t || !n || t === n) return;
		let r = this._view.kind === "detail" ? `smart_plants:${this._view.plantId}:care` : null;
		this._entities.some((e) => e.platform === "smart_plants" && (r !== null && e.unique_id.startsWith(r) && of(t[e.entity_id], n[e.entity_id]) || e.entity_id.startsWith("binary_sensor.") && sf(t[e.entity_id], n[e.entity_id]))) && (this._carePending.size || this._watering.size || Date.now() - this._ownWriteAt < rf || this._scheduleCareRefresh());
	}
	_scheduleCareRefresh() {
		this._careTimer === void 0 && (this._careTimer = setTimeout(() => {
			this._careTimer = void 0, this.isConnected && (this._formBusy ? this._scheduleCareRefresh() : this._refresh(!1, !1));
		}, nf));
	}
	_clearCareTimer() {
		clearTimeout(this._careTimer), this._careTimer = void 0;
	}
	_syncRelated() {
		let e = this._view.kind === "detail" ? this._plantById(this._view.plantId) : void 0;
		if (!e || !this.hass || this._blocked || !this.isConnected) return;
		let t = [
			e.id,
			U(e, this._devices)?.id ?? "",
			Ru(this._entities) ?? ""
		].join(" "), n = Object.keys(this._states).filter((e) => e.startsWith("automation.")).sort().join(" "), r = this._relatedFor;
		(r?.target !== t || r.automations !== n) && (this._relatedFor = {
			target: t,
			automations: n
		}, r?.target === t ? this._scheduleRelated() : this._loadRelated());
	}
	_scheduleRelated() {
		this._relatedTimer === void 0 && (this._relatedTimer = setTimeout(() => {
			this._relatedTimer = void 0, this._loadRelated();
		}, Math.max(0, this._relatedAt + af - Date.now())));
	}
	_loadRelated() {
		clearTimeout(this._relatedTimer), this._relatedTimer = void 0;
		let e = this._view.kind === "detail" ? this._plantById(this._view.plantId) : void 0, t = this.hass;
		if (!e || !t) return;
		let n = U(e, this._devices), r = Ru(this._entities), i = ++this._relatedRequest;
		this._relatedAt = Date.now(), Promise.allSettled([n ? z.related(t, n.id) : [], r ? z.relatedToEntity(t, r) : []]).then(([e, t]) => {
			i === this._relatedRequest && (e.status === "fulfilled" && (this._related = e.value), t.status === "fulfilled" && (this._relatedAllPlants = t.value), (e.status === "rejected" || t.status === "rejected") && (this._notice = this._l.t("notice.related_failed")));
		});
	}
	_forgetRelated() {
		clearTimeout(this._relatedTimer), this._relatedTimer = void 0, this._relatedRequest++, this._relatedFor = null;
	}
	_bind() {
		if (!this.hass || this.hass.user?.is_admin === !1 || this._connection) return;
		let e = this.hass.connection;
		this._connection = e;
		let t = this._subscriptionGeneration;
		e.addEventListener?.("ready", this._ready), e.addEventListener?.("disconnected", this._disconnected), z.subscribeRegistry(this.hass, this._registryChanged).then((n) => {
			this._connection !== e || t !== this._subscriptionGeneration || !this.isConnected ? n() : (this._unsubscribe = n, this._registryLive = !!e.subscribeEvents);
		}).catch(() => {
			this._registryError = this._l.t("error.registry_updates");
		}), e.subscribeEvents?.(() => {
			this._notificationsFor = null, this._syncNotifications();
		}, "automation_reloaded").then((n) => {
			this._connection !== e || t !== this._subscriptionGeneration || !this.isConnected ? n() : this._notificationsUnsubscribe = n;
		}).catch(() => void 0);
	}
	_syncNotifications() {
		let e = this.hass;
		if (!e || this._blocked || !this.isConnected || e.user?.is_admin === !1) return;
		let t = Object.keys(this._states).filter((e) => e.startsWith("automation.")).sort(), n = t.join(" ");
		if (this._notificationsFor === n) return;
		this._notificationsFor = n;
		let r = ++this._notificationsRequest;
		this._notificationsAbort?.abort();
		let i = new AbortController();
		this._notificationsAbort = i, nd(e, t, void 0, i.signal).then((e) => {
			r === this._notificationsRequest && !i.signal.aborted && this.isConnected && (this._notificationsAbort = void 0, this._notifications = e);
		});
	}
	_notificationCount() {
		return (this._notifications ?? []).filter((e) => this._states[e.entityId]).length;
	}
	_unbind() {
		this._context++, this._formBusy = !1, this._request++, this._providerRequest++, this._preview = null, this._blocked = !0, this._clearImage(), this._clearThumbnails(), this._forgetRelated(), this._subscriptionGeneration++, this._unsubscribe?.(), this._unsubscribe = void 0, this._registryLive = !1, this._notificationsUnsubscribe?.(), this._notificationsUnsubscribe = void 0, this._notificationsRequest++, this._notificationsFor = null, this._notificationsAbort?.abort(), this._notificationsAbort = void 0, this._connection?.removeEventListener?.("ready", this._ready), this._connection?.removeEventListener?.("disconnected", this._disconnected), this._connection = void 0;
	}
	_clearThumbnails(e = !1) {
		for (let e of this._thumbnailAborts.values()) e.abort();
		this._thumbnailAborts.clear(), this._thumbnailRetries.clear(), e && this._thumbnailWanted.clear(), this._thumbnails = {}, this._thumbnailKeys = {};
	}
	_thumbnailNear(e) {
		let t = this._plants.find((t) => t.image?.id === e);
		t && !this._thumbnailWanted.has(t.id) && (this._thumbnailWanted.add(t.id), this._syncThumbnails());
	}
	_syncThumbnails() {
		if (this._blocked || !this.hass || this.hass.user?.is_admin === !1 || !this.isConnected) {
			this._clearThumbnails();
			return;
		}
		if (this._view.kind !== "list") {
			for (let [e, t] of this._thumbnailAborts) t.abort(), delete this._thumbnailKeys[e];
			this._thumbnailAborts.clear(), this._thumbnailWanted.clear();
			return;
		}
		let e = this.hass, t = e.auth?.accessToken ?? "", n = new Map(this._plants.filter((e) => e.image).map((e) => [e.id, e.image.id])), r = (e, n) => `${t}:${e}:${n}`;
		for (let e of Object.keys(this._thumbnailKeys)) {
			let t = n.get(e);
			(t === void 0 || this._thumbnailKeys[e] !== r(e, t)) && (this._thumbnailAborts.get(e)?.abort(), this._thumbnailAborts.delete(e), delete this._thumbnailKeys[e]);
		}
		let i = Object.keys(this._thumbnails).filter((e) => this._thumbnails[e].imageId !== n.get(e));
		if (i.length) {
			let e = { ...this._thumbnails };
			for (let t of i) delete e[t];
			this._thumbnails = e;
		}
		for (let [e, t] of this._thumbnailRetries) n.get(e) !== t.imageId && this._thumbnailRetries.delete(e);
		let a = Date.now();
		for (let [t, i] of n) {
			let n = r(t, i);
			if (!this._thumbnailWanted.has(t) || this._thumbnailKeys[t] === n) continue;
			if (this._thumbnails[t]?.imageId === i) {
				this._thumbnailKeys[t] = n;
				continue;
			}
			let o = this._thumbnailRetries.get(t);
			if (o && (o.retryAt === null || a < o.retryAt)) continue;
			this._thumbnailKeys[t] = n;
			let s = new AbortController();
			this._thumbnailAborts.set(t, s), Uo.run(() => z.fetchImage(e, t, i, s.signal, "thumb"), s.signal).then((e) => {
				s.signal.aborted || this._thumbnailKeys[t] !== n || (this._thumbnailAborts.delete(t), this._thumbnailRetries.delete(t), this._thumbnails = {
					...this._thumbnails,
					[t]: {
						imageId: i,
						blob: e
					}
				});
			}).catch(() => {
				if (s.signal.aborted || this._thumbnailKeys[t] !== n) return;
				this._thumbnailAborts.delete(t), delete this._thumbnailKeys[t];
				let e = this._thumbnailRetries.get(t), r = (e?.imageId === i ? e.attempts : 0) + 1;
				this._thumbnailRetries.set(t, {
					imageId: i,
					attempts: r,
					retryAt: Vo(r)
				});
			});
		}
	}
	_clearImage(e = !1) {
		this._imageRequest++, this._imageAbort?.abort(), this._imageAbort = void 0, this._imageKey = null, e || (this._image = null, this._imageFor = null), this._imageLoading = !1, this._imageError = null;
	}
	_syncImage() {
		if (this._blocked || this.hass?.user?.is_admin === !1) {
			this._clearImage();
			return;
		}
		let e = this._view.kind === "detail" ? this._plantById(this._view.plantId) : void 0, t = this.hass && e?.image ? `${this.hass.auth?.accessToken ?? ""}:${e.id}:${e.image.id}` : null;
		if (t === this._imageKey || !this.isConnected || (this._clearImage(this._image !== null && this._imageFor === e?.image?.id), this._imageKey = t, !t || !this.hass || !e?.image)) return;
		let n = this._imageRequest, r = new AbortController();
		this._imageAbort = r, this._imageLoading = !0;
		let i = this.hass, a = e.id, o = e.image.id;
		Uo.run(() => z.fetchImage(i, a, o, r.signal, "thumb2x"), r.signal, !0).then((e) => {
			n === this._imageRequest && this.isConnected && (this._imageAbort = void 0, this._image = e, this._imageFor = o, this._imageLoading = !1);
		}).catch((e) => {
			n === this._imageRequest && (this._imageAbort = void 0, this._imageLoading = !1, e instanceof DOMException && e.name === "AbortError" || (this._imageError = this._friendly(e)));
		});
	}
	async _refresh(t = !0, n = !0) {
		if (!this.isConnected || !this.hass || this.hass.user?.is_admin === !1) return;
		let r = ++this._request, i = this.hass;
		n && (this._registriesDue = !0);
		let a = this._registriesDue;
		this._clearCareTimer(), t && (this._loading = !0);
		try {
			let n = await z.info(i), { plants: o, rejected: s, archivedCount: c, photoMeta: l } = await z.listWithArchive(i);
			if (r !== this._request || !this.isConnected) return;
			if (this._capabilities = n, this._blocked = !1, this._plants = o, this._rejected = s, this._archivedCount = c, this._photoMeta = l, this._updateAvailable = _u(e.bundleVersion, n.bundle_version), t && (this._error = ""), this._base) {
				let e = o.find((e) => e.id === this._base?.id);
				if (e && e.revision !== this._base.revision && (oc(this._base, e) && !this._conflict ? this._formBusy || this._rebaseEdits(this._base, e) : this._dialog === "winter" && !this._conflict && oc(this._base, e, ["winter_thresholds"]) ? (this._absorbWinterChange(e), this._formBusy || this._rebaseEdits(this._base, e)) : this._setConflict(this._base, e)), !e && this._base.id !== this._removing) {
					let e = s.includes(this._base.id);
					this._context++, this._formBusy = !1, this._closeDialog(), this._base = null, this._conflict = null, this._edits = null, this._notice = this._l.t(e ? "notice.unreadable_open" : "notice.deleted_elsewhere"), this.updateComplete.then(() => this.shadowRoot?.querySelector("h1")?.focus());
				}
			}
			this._syncImage();
			let u = z.overview(i).then((e) => ({
				entries: e,
				error: null
			}), (e) => ({
				entries: null,
				error: e
			}));
			if (a) try {
				let [e, t, n, a] = await Promise.all([
					z.areas(i),
					z.entities(i),
					z.devices(i),
					i.states ? null : z.states(i)
				]);
				if (r !== this._request) return;
				if (this._registriesDue = !1, this._areas = e, this._entities = t, this._devices = n, this._states = i.states ? Object.fromEntries(Object.entries(i.states).filter(([e, t]) => Dt(t) && t.entity_id === e)) : Object.fromEntries((a ?? []).map((e) => [e.entity_id, e])), this._registryError = "", this._base && this._edits) {
					let e = U(this._base, n)?.area_id ?? "";
					if (e !== this._baseArea) {
						let t = this._edits.area !== this._baseArea;
						this._notice = this._l.t(t ? "notice.area_changed_retained" : "notice.area_changed_synced", {
							from: this._areaName(this._baseArea),
							to: this._areaName(e)
						}), t || this._edit({ area: e }), this._areaReview = t, this._baseArea = e;
					}
				}
			} catch (e) {
				r === this._request && (this._registryError = this._friendly(e));
			}
			let d = await u;
			if (r === this._request && (d.entries ? (this._overview = Object.fromEntries(d.entries.map((e) => [e.plant_id, e])), this._overviewError = "") : (this._overview = {}, this._overviewError = this._friendly(d.error)), this._statusRead = !0), r === this._request && this._syncThumbnails(), this._view.kind === "detail") {
				let e = this._view.plantId;
				try {
					let t = await z.evaluation(i, e);
					r === this._request && (this._evaluations = {
						...this._evaluations,
						[e]: t
					});
				} catch {
					if (r === this._request) {
						let t = { ...this._evaluations };
						delete t[e], this._evaluations = t;
					}
				}
			}
			if (this._view.kind === "detail") {
				let e = this._view.plantId;
				await this._loadCare(e, this._context, r);
				try {
					let t = await z.plantHealth(i, e);
					r === this._request && (this._health = {
						...this._health,
						[e]: t
					}, this._healthError = "");
				} catch (t) {
					if (r === this._request) {
						let n = { ...this._health };
						delete n[e], this._health = n, this._healthError = this._friendly(t);
					}
				}
			}
		} catch (e) {
			r === this._request && (this._error = this._friendly(e), this._blocked = !0, this._statusRead = !0, this._clearImage());
		} finally {
			r === this._request && (this._loading = !1);
		}
	}
	_friendly(e) {
		let t = e instanceof L ? `api_error.${e.code}` : "";
		return this._l.t(Qn(t) ? t : "api_error.unknown");
	}
	_plantById(e) {
		return this._plants.find((t) => t.id === e);
	}
	_applyRoute() {
		let e = this.route?.path ?? "";
		if (qd.test(e)) {
			if (e === this._routeApplied) return;
			this._routeApplied = e, this._view.kind !== "notifications" && this._show({
				kind: "notifications",
				from: null
			});
			return;
		}
		if (this._routeApplied && qd.test(this._routeApplied) && this._view.kind === "notifications") {
			this._routeApplied = null, this._leaveNotifications();
			return;
		}
		let t = Jd.exec(e);
		if (t) {
			if (e === this._routeApplied) return;
			this._routeApplied = e;
			let n = null;
			try {
				n = t[1] ? decodeURIComponent(t[1]) : null;
			} catch {
				n = null;
			}
			(this._view.kind !== "archive" || this._view.plantId !== n) && this._show({
				kind: "archive",
				plantId: n
			});
			return;
		}
		if (this._routeApplied && Jd.test(this._routeApplied) && this._view.kind === "archive") {
			this._routeApplied = null, this._show({ kind: "list" });
			return;
		}
		let n = Kd.exec(e);
		if (!n) {
			this._routeApplied = null;
			return;
		}
		if (e === this._routeApplied || this._loading || this._blocked) return;
		this._routeApplied = e;
		let r;
		try {
			r = decodeURIComponent(n[1]);
		} catch {
			return;
		}
		this._plantById(r) ? this._openFromOverview({
			plantId: r,
			...n[2] ? { section: "sensors" } : {}
		}) : this._clearRoute();
	}
	_clearRoute() {
		let e = this.route?.path ?? "";
		(Kd.test(e) || qd.test(e) || Jd.test(e)) && (history.replaceState(null, "", this.route?.prefix || "/smart-plants"), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !0 } })));
	}
	_plantAreaNames() {
		return Object.fromEntries(this._plants.map((e) => {
			let t = U(e, this._devices)?.area_id;
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
			"watering_detection",
			"category",
			"tags",
			"species",
			"image",
			"lifecycle_state",
			"roles",
			"winter_thresholds"
		].filter((n) => JSON.stringify(e[n]) !== JSON.stringify(t[n])).map((n) => n === "roles" ? this._l.t("conflict.roles_changed") : n === "winter_thresholds" ? this._l.t("conflict.winter_changed") : `${this._l.t(`conflict_field.${n}`)}: ${JSON.stringify(e[n])} → ${JSON.stringify(t[n])}`);
		this._conflict = {
			before: e,
			after: t,
			changes: n
		}, this._preview = null, this._providerRequest++;
	}
	_beginEdit(e) {
		let t = H(e);
		this._base = structuredClone(e), this._baseArea = U(e, this._devices)?.area_id ?? "", this._edits = {
			name: e.name,
			acquired: e.acquired_at ?? "",
			placement: structuredClone(e.placement),
			wateringDetection: e.watering_detection ?? null,
			category: e.category ?? "",
			tagText: e.tags.join(", "),
			area: this._baseArea,
			common: e.species?.snapshot.common_name ?? "",
			latin: e.species?.snapshot.latin_name ?? "",
			moisture: t ? Ai(t) : null
		}, this._conflict = null, this._areaReview = !1, this._preview = null, this._results = [], this._provider = "manual", this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._thresholdSaved = {}, this._pendingThresholdSwitch = null, this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._sourceSaved = {}, this._pendingSourceSwitch = null, this._allSourceSensors = !1, this._sourceUnavailable = null, this._moistureSourceError = "";
	}
	_show(e) {
		let t = Kd.exec(this.route?.path ?? "");
		if (t && (e.kind !== "detail" || encodeURIComponent(e.plantId) !== t[1]) && this._clearRoute(), qd.test(this.route?.path ?? "") && e.kind !== "notifications" && this._clearRoute(), Jd.test(this.route?.path ?? "") && e.kind !== "archive" && this._clearRoute(), this._context++, this._closeDialog(), this._formBusy = !1, this._notificationsOpen = !1, this._notificationsReturn = null, this._providerRequest++, this._view = e, this._error = "", this._notice = "", this._healthError = "", this._careHistory = null, this._careError = "", this._careLoadError = "", this._forgetRelated(), this._related = [], this._relatedAllPlants = [], this._relatedExpanded = /* @__PURE__ */ new Set(), e.kind === "create" && (this._wizardStarted = !0), e.kind === "detail") {
			this._detailSection = "overview", this._expanded = /* @__PURE__ */ new Set(), this._opened = /* @__PURE__ */ new Set(), this._settingsOpen = /* @__PURE__ */ new Set(), this._moistureMode = null, this._winterOpen = !1, this._careFilter = "all", this._careFormOpen = !1, this._careEditingId = null, this._careTaskId = null, this._careKind = "watering", this._careFields = {};
			let t = /* @__PURE__ */ new Date();
			this._careDate = (/* @__PURE__ */ new Date(t.getTime() - t.getTimezoneOffset() * 6e4)).toISOString().slice(0, 16), this._careNote = "";
			let n = this._plantById(e.plantId);
			n && this._beginEdit(n);
			let r = e.plantId, i = this.hass, a = this._context;
			i && !this._blocked && (this._loadCare(r, a), z.evaluation(i, r).then((e) => {
				a === this._context && (this._evaluations = {
					...this._evaluations,
					[r]: e
				});
			}).catch(() => void 0), z.plantHealth(i, r).then((e) => {
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
		e.detail.item.value === "add-plant" && this._show({ kind: "create" }), e.detail.item.value === "back-to-overview" && this._show({ kind: "list" }), e.detail.item.value === "notifications" && this._openNotificationsPage(), e.detail.item.value === "archive" && !this._formBusy && this._openArchive(null), e.detail.item.value === "snooze-all" && this._openSnoozeAll(), e.detail.item.value === "integration-options" && this._navigate("/config/integrations/integration/smart_plants"), e.detail.item.value === "documentation" && window.open(Ad, "_blank", "noopener,noreferrer");
	}
	_handlePlantAction(e, t) {
		let n = U(e, this._devices);
		t === "open-device" && n && this._navigate(`/config/devices/device/${encodeURIComponent(n.id)}`), t === "download-diagnostics" && this._downloadDiagnostics(e), t === "toggle-monitoring" && this._toggleMonitoring(e), t === "snooze" && this._openSnooze(e), t === "delete-plant" && this._openDialog("delete", this._plantMenuTrigger()), t === "retire-plant" && this._openDialog("retire", this._plantMenuTrigger());
	}
	_plantMenuTrigger() {
		return this.shadowRoot?.querySelector(".plant-menu [slot=trigger]") ?? null;
	}
	_openNotificationsPage() {
		this._formBusy || (this._show({
			kind: "notifications",
			from: this._view.kind === "detail" ? this._view.plantId : null
		}), this._navigate(`${this.route?.prefix || "/smart-plants"}/notifications`));
	}
	_openArchive(e, t = !1) {
		this._show({
			kind: "archive",
			plantId: e
		});
		let n = `${this.route?.prefix || "/smart-plants"}/retired${e ? `/${encodeURIComponent(e)}` : ""}`;
		location.pathname !== n && (t ? (history.replaceState(null, "", n), window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !0 } }))) : this._navigate(n));
	}
	_leaveNotifications() {
		let e = this._view.kind === "notifications" ? this._view.from : null;
		this._show(e && this._plantById(e) ? {
			kind: "detail",
			plantId: e
		} : { kind: "list" });
	}
	_openNotifications(e) {
		this._notificationsReturn = e, this._notificationsOpen = !0;
	}
	_closeNotifications() {
		this._notificationsOpen = !1;
		let e = this._notificationsReturn?.isConnected ? this._notificationsReturn : this.shadowRoot?.querySelector(".panel-appbar ha-dropdown [slot=trigger]");
		this._notificationsReturn = null, e?.focus();
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
		al.includes(e) && e !== this._detailSection && (this._detailSection = e);
	}
	_openSection(e) {
		this._selectSection(e);
		let t = this._context;
		this.updateComplete.then(() => {
			if (t !== this._context) return;
			let n = this.shadowRoot;
			(n?.querySelector(`#tab-${e}`) ?? [...n?.querySelectorAll("ha-tab-group-tab") ?? []].find((t) => t.panel === e))?.focus();
		});
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
		if (!n) throw new L("not_found", "Plant not found.");
		try {
			return await t(n.revision);
		} catch (n) {
			if (!(n instanceof L && n.code === "revision_conflict")) throw n;
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
			let i = await this._withRevision(e, (t) => z.addWatering(n, e, t, Zd(/* @__PURE__ */ new Date()), null));
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
			let i = await this._withRevision(e, (t) => z.deleteCareEvent(r, e, t, n));
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
			let i = await z.careHistory(this.hass, e);
			r === this._careRequest && t === this._context && (n === void 0 || n === this._request) && this._view.kind === "detail" && this._view.plantId === e && (this._careHistory = i, this._careLoadError = "");
		} catch (e) {
			r === this._careRequest && t === this._context && (n === void 0 || n === this._request) && (this._careHistory = null, this._careLoadError = this._friendly(e));
		}
	}
	_renderCareMissing(e) {
		let t = this._l;
		return this._careLoadError ? T`<div class="card-b load-error" role="alert"><span>${t.t("care.load_failed", { error: this._careLoadError })}</span>
      <button type="button" class="btn text sm" @click=${(t) => this._retryCare(e, t.currentTarget)}>${t.t("history.retry")}</button></div>` : T`<div class="care-skeleton" aria-busy="true"><p class="sr-only" role="status">${t.t("care.loading")}</p>
      <ul class="list" aria-hidden="true">${[0, 1].map(() => T`<li class="li"><span class="sk round sk-ic"></span><span class="li-main"><span class="sk line sk-title"></span><span class="sk line sk-meta"></span></span><span></span></li>`)}</ul></div>`;
	}
	_retryCare(e, t) {
		let n = this._context;
		this._careLoadError = "", this._loadCare(e, n).then(() => this._refocus(t, n));
	}
	_refocus(e, t) {
		this.updateComplete.then(() => {
			t === this._context && !e.isConnected && this.shadowRoot?.querySelector("h1")?.focus();
		});
	}
	_renderStatusError() {
		let e = this._l;
		return T`<div class="error load-error" role="alert"><span>${e.t("overview.status_unavailable", { error: this._overviewError })}</span>
      <button type="button" class="btn text sm" ?disabled=${this._loading} @click=${(e) => {
			let t = e.currentTarget, n = this._context;
			this._refresh(!1).then(() => this._refocus(t, n));
		}}>${e.t("history.retry")}</button></div>`;
	}
	_historyEntity(e, t) {
		let n = `smart_plants:${e.id}:${t}`;
		return this._entities.find((e) => e.platform === "smart_plants" && e.unique_id === n && e.entity_id.startsWith("sensor."))?.entity_id;
	}
	_historyRoles(e) {
		return Lt.filter((t) => ((t === "moisture" ? H(e) : W(e, t))?.sources.length ?? 0) > 0 && this._historyEntity(e, t) !== void 0);
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
		if (o && !e && Date.now() - this._historyLoadedAt < ef) return;
		let s = ++this._historyRequest;
		if (this._historyLoadedAt = Date.now(), !o || this._history?.status !== "ready") {
			let e = this._history, t = e?.key.slice(e.key.lastIndexOf("|") + 1), n = e && !o && e.key.startsWith(`${i}|`) && t ? e.status === "ready" ? e.points.length ? {
				range: t,
				points: e.points
			} : void 0 : e.stale : void 0;
			this._history = {
				key: r,
				status: "loading",
				points: [],
				...n ? { stale: n } : {}
			};
		}
		let c = Sn[this._historyRange], l = a === "temperature" || a === "soil_temperature" ? { temperature: "°C" } : void 0;
		z.statistics(this.hass, i, new Date(Date.now() - c.spanMs), c.period, l).then((e) => {
			s === this._historyRequest && (this._history = {
				key: r,
				status: "ready",
				points: e
			});
		}).catch((e) => {
			s === this._historyRequest && (this._history = {
				key: r,
				status: e instanceof L && e.code === "unknown_command" ? "unavailable" : "error",
				points: []
			});
		});
	}
	_renderHistory(e) {
		let t = this._historyTarget(e);
		if (!t) return E;
		let n = this._l, r = this._overview[e.id], i = this._history?.key === t.key ? this._history : null, a = (this._careHistory?.events ?? []).map((e) => ({
			t: Date.parse(e.occurred_at),
			kind: e.kind
		})).filter((e) => Number.isFinite(e.t)), o = r?.last_watered_at ? Date.parse(r.last_watered_at) : NaN;
		return wl(n, {
			roles: t.roles,
			role: t.role,
			range: this._historyRange,
			status: i?.status ?? "loading",
			points: i?.points ?? [],
			stale: i?.stale,
			reading: r?.roles[t.role],
			care: a,
			lastWatered: Number.isFinite(o) ? o : null,
			now: Date.now(),
			onLogCare: this._blocked ? null : (e, n) => this._logCareAt(e ?? (t.role === "moisture" ? "fertilizing" : "watering"), n, e === null),
			onRole: (e) => {
				this._historyRole = e, lf(Qd, e);
			},
			onRange: (e) => {
				this._historyRange = e, lf($d, e);
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
			case "pest_control": return {
				pest: this._careFields.pest?.trim() || null,
				product: this._careFields.product?.trim() || null,
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
		if (this._careKind !== "note" && a && !A(a, 500)) {
			this._careError = this._l.t("care.error_note_length");
			return;
		}
		if (this._careKind === "fertilizing" && i.amount !== null && (!Number.isFinite(i.amount) || Number(i.amount) <= 0 || Number(i.amount) > 1e5 || !i.unit)) {
			this._careError = this._l.t("care.error_amount");
			return;
		}
		if (this._careKind === "note" && (!String(i.text).trim() || !A(String(i.text), 1e3))) {
			this._careError = this._l.t("care.error_note_text");
			return;
		}
		if ((Yd[this._careKind] ?? []).some((e) => !A(r[e] ?? "", 120))) {
			this._careError = this._l.t("care.error_details_length");
			return;
		}
		let o = -n.getTimezoneOffset(), s = `${o < 0 ? "-" : "+"}${String(Math.floor(Math.abs(o) / 60)).padStart(2, "0")}:${String(Math.abs(o) % 60).padStart(2, "0")}`, c = `${this._careDate}:00${s}`, l = this.hass;
		this._careError = "";
		let u = this._careTaskId;
		await this._mutate(async () => (this._careEditingId ? await z.editCareEvent(l, e.id, e.revision, this._careEditingId, this._careKind, c, i) : u ? await z.completeCareTask(l, e.id, u, e.revision, {
			occurred_at: c,
			note: a
		}) : await z.addCareEvent(l, e.id, e.revision, this._careKind, c, i)).plant), this._error || (this._careEditingId = null, this._careTaskId = null, this._careKind = "watering", this._careFields = {}, this._careNote = "");
	}
	async _deleteCare(e, t) {
		if (!this.hass || !this._careHistory || this._careHistory.revision !== e.revision) {
			this._careError = this._l.t("care.error_refresh_delete");
			return;
		}
		if (!window.confirm(this._l.t("care.confirm_delete", { kind: this._l.t(`care_kind_phrase.${t.kind}`) }))) return;
		let n = this.hass;
		await this._mutate(async () => (await z.deleteCareEvent(n, e.id, e.revision, t.id)).plant);
	}
	_openCareForm() {
		this._careTaskId && (this._careTaskId = null, this._careKind = "watering", this._careFields = {}), this._careFormOpen = !0, this._goTo("care", "#care-form select, #care-form input");
	}
	_logCareAt(e, t, n = !1) {
		let r = new Date(Math.min(t, Date.now()));
		this._careEditingId = null, this._careTaskId = null, this._careKind = e, this._careFields = {}, this._careNote = "", this._careError = "", this._careDate = (/* @__PURE__ */ new Date(r.getTime() - r.getTimezoneOffset() * 6e4)).toISOString().slice(0, 16), this._careFormOpen = !0, this._goTo("care", n ? "#care-form select" : "#care-form input[type=datetime-local]");
	}
	_closeCareForm() {
		this._careFormOpen = !1, this._careEditingId = null, this._careTaskId = null, this._careKind = "watering", this._careFields = {}, this._careNote = "", this._careError = "";
	}
	_renderCare(e) {
		let t = this._l, n = this._careHistory, r = (e) => {
			let n = `care_field.${e}`;
			return Qn(n) ? t.t(n) : e;
		}, i = (e) => t.t(`care_kind.${e}`), a = (e) => t.t(`care_kind_phrase.${e}`), o = this._formBusy || !!this._conflict, s = new Set(n?.events.map((e) => e.kind)).size > 1, c = s ? this._careFilter : "all", l = n?.events.filter((e) => c === "all" || e.kind === c) ?? [], u = [["all", t.t("care.filter_all")], ...sl.map((e) => [e, e === "note" ? t.t("care.filter_notes") : i(e)])], d = this._careFormOpen || this._careEditingId !== null, f = this._careTaskId ? (e.care_tasks ?? []).find((e) => e.id === this._careTaskId) : void 0, p = this._careEditingId ? n?.events.find((e) => e.id === this._careEditingId) : void 0, m = !f && !!p && (p.kind === "task" || !!p.task_id), h = !this._careEditingId && !f ? js(e.care_tasks ?? [], this._careKind) : void 0, g = (n) => {
			let r = n.task_id ? (e.care_tasks ?? []).find((e) => e.id === n.task_id) : void 0;
			return n.kind === "task" && r ? $o(t, r) : i(n.kind);
		}, _ = this._today(), v = Al({
			l: t,
			plant: e,
			overview: this._overview[e.id],
			today: _,
			timeZone: this._timeZone(),
			states: this._states,
			disabled: o || this._blocked,
			pending: this._carePending,
			onAdd: () => this._openTaskEditor(),
			onRest: () => this._openRestEditor(e),
			onDone: (t) => void this._completeTask(e.id, t),
			onAction: (t, n) => this._taskAction(e, t, n)
		}), y = (e.care_tasks ?? []).length > 0 || !!e.rest_period;
		return T`${y ? v : E}
      ${this._careError ? T`<p class="error" role="alert">${this._careError}</p>` : E}
      ${d ? T`<section class="sp-card" id="care-form" aria-labelledby="care-form-heading"><div class="card-h"><h3 id="care-form-heading">${this._careEditingId ? t.t("care.edit_kind", { kind: a(this._careKind) }) : t.t("care.record")}</h3>
          <button type="button" class="icon-btn" aria-label=${t.t("care.close_form")} @click=${() => this._closeCareForm()}><ha-icon aria-hidden="true" icon="mdi:close"></ha-icon></button></div>
        <div class="card-b care-form"><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict || !n || n.revision !== e.revision}>
        <legend class="sr-only">${this._careEditingId ? t.t("care.edit_kind", { kind: a(this._careKind) }) : t.t("care.record")}</legend>
        ${f ? T`<p class="care-note"><ha-icon aria-hidden="true" .icon=${"mdi:check-circle-outline"}></ha-icon><span>${t.t("care_plan.form_marks_done", { name: $o(t, f) })}</span></p>` : m ? T`<p class="care-kind"><span class="small muted">${t.t("care.type")}</span><span>${g({
			...p,
			kind: this._careKind
		})}</span></p>` : T`<label>${t.t("care.type")}<select aria-label=${t.t("care.type")} .value=${this._careKind} @change=${(e) => {
			this._careKind = e.target.value, this._careFields = {};
		}}>${sl.map((e) => T`<option value=${e} ?selected=${e === this._careKind}>${i(e)}</option>`)}</select></label>`}
        ${h ? T`<p class="small care-note"><ha-icon aria-hidden="true" .icon=${"mdi:check-circle-outline"}></ha-icon><span>${t.t("care_plan.form_also_marks", { name: $o(t, h) })}</span></p>` : E}
        <label>${t.t("care.when")}<input type="datetime-local" .value=${this._careDate} @input=${(e) => this._careDate = e.target.value}></label>
        ${[...Yd[this._careKind] ?? [], ...this._careKind === "note" ? ["text"] : []].map((e) => T`<label>${r(e)}<input aria-label=${r(e)} type=${e === "amount" ? "number" : "text"} maxlength=${Ke(e === "text" ? 1e3 : 120)} .value=${this._careFields[e] ?? ""} @input=${(t) => this._careFields = {
			...this._careFields,
			[e]: t.target.value
		}}></label>`)}
        ${this._careKind === "note" ? E : T`<label>${t.t("care.note_optional")}<input type="text" maxlength=${Ke(500)} .value=${this._careNote} @input=${(e) => this._careNote = e.target.value}></label>`}
        ${this._careKind === "fertilizing" ? T`<label>${t.t("care.unit")}<select aria-label=${t.t("care.unit")} .value=${this._careFields.unit ?? ""} @change=${(e) => this._careFields = {
			...this._careFields,
			unit: e.target.value
		}}><option value="">${t.t("care.no_amount")}</option><option value="g">g</option><option value="mL">mL</option></select></label>` : E}
        ${this._careKind === "watering" ? T`<p class="small muted">${t.t("care.no_irrigation")}</p>` : E}
        <div class="actions"><button type="button" class="primary" @click=${() => void this._saveCare(e)}>${this._careEditingId ? t.t("care.save_changes") : t.t("care.record")}</button>
        ${this._careEditingId ? T`<button type="button" @click=${() => {
			this._careEditingId = null, this._careKind = "watering", this._careFields = {}, this._careNote = "";
		}}>${t.t("care.cancel_editing")}</button>` : E}</div>
      </fieldset></div></section>` : E}
      <section class="sp-card care-history" aria-labelledby="care-heading"><div class="card-h"><h3 id="care-heading">${t.t("care.heading")}</h3>
        <button type="button" class="btn text sm" ?disabled=${this._blocked} @click=${() => this._openCareForm()}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("detail.log_care")}</button></div>
      ${n?.events.length ? T`<div class="care-filters">
        ${s ? T`<div class="row" role="group" aria-label=${t.t("care.filter_label")}>${u.map(([e, t]) => T`<button type="button" class="fchip" aria-pressed=${c === e ? "true" : "false"} @click=${() => {
			this._careFilter = e;
		}}>${t}</button>`)}</div>` : E}
        <p class="small muted" role="status">${t.tn(n.summary.watering_count, "care.watering_count_one", "care.watering_count_other")} ${n.summary.last_watered_local_date ? t.t("care.last_watered", { date: t.date(n.summary.last_watered_local_date) }) : t.t("care.never_watered")}</p>
      </div>` : E}
      <div class="care-content">${n ? n.events.length ? l.length ? T`<ul class="list" aria-label=${t.t("care.events_label")}>${l.map((n) => {
			let s = Dl(t, n, r), c = t.recordedDateTime(n.occurred_at);
			return T`<li class="li"><span class="ic tonal" aria-hidden="true"><ha-icon .icon=${cl[n.kind]}></ha-icon></span>
            <span class="li-main"><span class="li-title">${g(n)}</span><span class="li-sub"><time datetime=${n.occurred_at}>${c}</time>${n.provenance === "sensor" ? ` · ${t.t("care.from_sensor")}` : E}${s.map((e) => T` · <span class="prose">${e}</span>`)}</span></span>
            <ha-dropdown @wa-select=${(t) => {
				t.detail.item.value === "edit" ? (this._careTaskId = null, this._editCare(n), this._goTo("care", "#care-form select, #care-form input")) : t.detail.item.value === "delete" && this._deleteCare(e, n);
			}}>
              <button slot="trigger" type="button" class="icon-btn" ?disabled=${o} aria-label=${t.t("care.event_menu", {
				kind: i(n.kind),
				date: c
			})}><ha-icon aria-hidden="true" icon="mdi:dots-vertical"></ha-icon></button>
              <ha-dropdown-item value="edit" ?disabled=${o}>${t.t("care.edit_kind", { kind: a(n.kind) })}<ha-icon slot="icon" icon="mdi:pencil-outline"></ha-icon></ha-dropdown-item>
              <ha-dropdown-item value="delete" ?disabled=${o}>${t.t("care.delete_kind", { kind: a(n.kind) })}<ha-icon slot="icon" icon="mdi:delete-outline"></ha-icon></ha-dropdown-item>
            </ha-dropdown></li>`;
		})}</ul>` : T`<p class="card-b muted">${t.t("care.filter_empty")}</p>` : T`<p class="card-b muted">${t.t("care.empty")}</p>` : this._renderCareMissing(e.id)}</div></section>
      ${y ? E : v}`;
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
			if (!n.name.trim() || !A(n.name.trim(), 200) || n.acquired && !Number.isFinite(Date.parse(n.acquired))) {
				this._error = this._l.t("error.identity");
				return;
			}
			Object.assign(i, {
				name: n.name.trim(),
				acquired_at: n.acquired ? new Date(n.acquired).toISOString() : null,
				placement: n.placement,
				watering_detection: n.wateringDetection
			});
		}
		if (e === "taxonomy") {
			let e = Xi(n.category, Yi(n.tagText), this._l);
			if (e) {
				this._error = e;
				return;
			}
			Object.assign(i, {
				category: n.category.trim() || null,
				tags: Yi(n.tagText)
			});
		}
		if (e === "species" && (i.species = Pi(n.common, n.latin)), e === "moisture") {
			if (!n.moisture) return;
			if (this._registryError) {
				this._error = this._l.t("error.moisture_reconnect");
				return;
			}
			let e = ji(n.moisture, this._defaults(t), this._l);
			if (e) {
				this._error = e;
				return;
			}
		}
		await this._mutate(async () => e === "area" ? await z.setArea(r, t.id, t.revision, n.area || null) : e === "moisture" && n.moisture ? z.configureMoisture(r, t.id, t.revision, Li(n.moisture, this._entities)) : z.update(r, i), !1, e);
	}
	async _mutate(e, t = !1, n, r = !1) {
		if (this._formBusy || this._blocked || this._conflict && !r) return;
		this._formBusy = !0, this._error = "";
		let i = this._context, a = this._base, o = this._edits?.area;
		this._request++, t && (this._removing = a?.id ?? null);
		try {
			let s = await e();
			if (i !== this._context || !this.isConnected) return;
			if (s) {
				let e = this._plantById(s.id);
				if (e && e.revision > s.revision) {
					await this._refresh(!1);
					return;
				}
				this._plants = this._plants.map((e) => e.id === s.id ? s : e), r && a && this._base?.id === s.id ? this._photoUploaded(a, s) : a && this._base?.id === s.id && this._rebaseEdits(a, s, n), n === "area" && o !== void 0 && (this._baseArea = o, this._edit({ area: o }), this._areaReview = !1), this._syncImage(), this._notice = this._l.t("notice.saved");
			}
			t && this._show({ kind: "list" }), await this._refresh(!1);
		} catch (e) {
			if (i !== this._context || !this.isConnected) return;
			this._error = this._friendly(e), e instanceof L && e.code === "revision_conflict" && await this._refresh(!1), e instanceof L && ["integration_not_loaded", "unauthorized"].includes(e.code) && (this._blocked = !0, this._clearImage());
		} finally {
			i === this._context && (this._formBusy = !1), t && (this._removing = null);
		}
	}
	_photoUploaded(e, t) {
		let n = (e) => ({
			...e,
			image: t.image
		});
		!this._conflict && oc(e, t, ["image"]) ? this._rebaseEdits(e, t) : (this._setConflict(n(this._conflict?.before ?? e), t), this._base && (this._base = n(this._base)));
	}
	_defaults(e) {
		let t = H(e);
		return t ? {
			min: t.threshold_defaults.min.value,
			target: t.threshold_defaults.target.value,
			max: t.threshold_defaults.max.value
		} : or;
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
		let t = W(e, this._sourceRole);
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
		r.name !== e.name && (d.name = r.name), r.acquired !== (e.acquired_at ?? "") && (d.acquired = r.acquired), JSON.stringify(r.placement) !== JSON.stringify(e.placement) && (d.placement = r.placement), r.wateringDetection !== (e.watering_detection ?? null) && (d.wateringDetection = r.wateringDetection), r.category !== (e.category ?? "") && (d.category = r.category), JSON.stringify(Yi(r.tagText)) !== JSON.stringify(e.tags) && (d.tagText = r.tagText), r.area !== this._baseArea && (d.area = r.area), r.common !== (e.species?.snapshot.common_name ?? "") && (d.common = r.common), r.latin !== (e.species?.snapshot.latin_name ?? "") && (d.latin = r.latin);
		let f = H(e), p = H(t);
		if (r.moisture && f && p) {
			let e = Ai(p);
			for (let t of [
				"sources",
				"primary_entity_id",
				"aggregation",
				"stale_after_seconds"
			]) JSON.stringify(r.moisture[t]) !== JSON.stringify(f[t]) && Object.assign(e, { [t]: structuredClone(r.moisture[t]) });
			for (let t of V) r.moisture.threshold_overrides[t] !== f.threshold_overrides[t] && (e.threshold_overrides[t] = r.moisture.threshold_overrides[t]);
			d.moisture = e;
		}
		let m = {
			identity: [
				"name",
				"acquired",
				"placement",
				"wateringDetection"
			],
			taxonomy: ["category", "tagText"],
			area: ["area"],
			species: ["common", "latin"],
			moisture: ["moisture"]
		};
		if (n) for (let e of m[n]) delete d[e];
		if (this._beginEdit(t), this._edit(d), this._areaReview = i, a && o && s) {
			let e = W(t, a);
			if (e) {
				let t = Ui(e), n = structuredClone(t);
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
			let e = zd[c];
			if (e) {
				let n = e.seed(this._persistedRoleOverrides(e, t)), r = { ...n };
				for (let t of e.keys) l[t] !== u[t] && (r[t] = l[t]);
				this._thresholdRole = c, this._thresholdBaseline = n, this._thresholdEdits = r;
			}
		}
	}
	async _searchSpecies() {
		if (!this.hass || this._formBusy || this._blocked || this._query.trim().length < 3) return;
		let e = this._context;
		if (!A(this._query.trim(), 100)) {
			this._error = this._l.t("species.error_query_length");
			return;
		}
		let t = ++this._providerRequest;
		this._formBusy = !0, this._error = "", this._preview = null;
		try {
			let e = await z.searchSpecies(this.hass, this._provider, this._query.trim(), this.hass.language ?? "en");
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
			t && !t.open && t.showModal(), t?.querySelector(e === "delete" || e === "retire" ? "button" : "h2")?.focus();
		});
	}
	_closeDialog() {
		this.shadowRoot?.querySelector("dialog")?.close(), this._dialog = null, this._taskEditor = null, this._automateTaskId = null, this._restEditor = null, this._snoozeDraft = null, this._winterDraft = null, this._winterBase = null, this._winterStored = null, this._winterChanged = !1, (this._focusReturn?.isConnected && !this._focusReturn.matches(":disabled") ? this._focusReturn : this.shadowRoot?.querySelector("h1"))?.focus(), this._focusReturn = null;
	}
	_renderDialog() {
		if (!this._dialog || !this._base || this._dialog === "snooze_all") return E;
		if (this._dialog === "care_task" || this._dialog === "care_automate" || this._dialog === "care_rest") return this._renderCareDialog(this._base.id);
		if (this._dialog === "snooze") return this._renderSnoozeDialog(this._base.id);
		if (this._dialog === "retire") return this._renderRetireDialog(this._base);
		if (this._dialog === "winter") return this._renderWinterDialog(this._base.id);
		if (this._dialog === "winter_remove") return this._renderWinterRemoveDialog(this._base.id);
		let e = this._base, t = this._preview, n = this._l;
		return T`<dialog aria-labelledby="dialog-title" @cancel=${(e) => {
			e.preventDefault(), this._closeDialog();
		}} @keydown=${(e) => this._trapFocus(e)}><h2 id="dialog-title" tabindex="-1">${this._dialog === "delete" ? n.t("dialog.delete_title", { name: e.name }) : n.t("dialog.species_title")}</h2>
      ${this._dialog === "delete" ? T`<p>${n.t("dialog.delete_body")}</p><p>${n.t("dialog.delete_retire_hint")}</p>` : t ? ha(n, t.snapshot, t, e) : T`<p>${n.t("dialog.preview_invalid")}</p>`}
      <div class="actions"><button @click=${() => this._closeDialog()}>${n.t("common.cancel")}</button>${this._dialog === "delete" ? T`<button class="retire-instead" ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => {
			this._dialog = "retire", this.updateComplete.then(() => {
				let e = this.shadowRoot?.querySelector("dialog");
				e && !e.open && e.showModal(), e?.querySelector("h2")?.focus();
			});
		}}>${n.t("dialog.delete_retire_instead")}</button>` : E}<button class="primary" ?disabled=${this._formBusy || this._blocked || !!this._conflict || this._dialog === "species" && !t} @click=${() => {
			let n = this._dialog;
			if (this._closeDialog(), !this.hass) return;
			let r = this.hass;
			n === "delete" ? this._mutate(() => z.delete(r, e.id, e.revision), !0) : t && this._mutate(() => z.applySpecies(r, e.id, e.revision, t.preview_token, t.provider, t.operation), !1, "species");
		}}>${this._dialog === "delete" ? n.t("dialog.delete_confirm") : n.t("dialog.species_confirm")}</button></div></dialog>`;
	}
	_renderRetireDialog(e) {
		let t = this._l, n = this._related.length;
		return T`<dialog aria-labelledby="dialog-title" @cancel=${(e) => {
			e.preventDefault(), this._closeDialog();
		}} @keydown=${(e) => this._trapFocus(e)}><h2 id="dialog-title" tabindex="-1">${t.t("dialog.retire_title", { name: e.name })}</h2>
      <p>${t.t("dialog.retire_body")}</p>
      ${n ? T`<p class="notice" role="note">${t.tn(n, "dialog.retire_automations_one", "dialog.retire_automations_other")}</p>` : E}
      <div class="actions"><button @click=${() => this._closeDialog()}>${t.t("common.cancel")}</button><button class="primary" ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => {
			this._closeDialog(), this._retire(e);
		}}>${t.t("dialog.retire_confirm")}</button></div></dialog>`;
	}
	async _retire(e) {
		let t = this.hass;
		if (!t) return;
		let n = uf(e), r = U(e, this._devices)?.area_id ?? "", i = !1;
		if (await this._mutate(async () => {
			await z.archive(t, e.id, e.revision), i = !0;
		}, !0), !i) return;
		let a = this._l;
		this._toast(a.t("archive.retired_toast", { name: e.name }), n.length ? {
			text: a.t("archive.retired_new_plant"),
			action: () => this._startWithSensors(n, r)
		} : {
			text: a.t("archive.retired_open"),
			action: () => this._openArchive(null)
		});
	}
	_startWithSensors(e, t) {
		this._formBusy || this._blocked || (this._show({ kind: "create" }), this.updateComplete.then(() => this.shadowRoot?.querySelector("smart-plants-wizard")?.prefill({
			area: t,
			sensors: e
		})));
	}
	async _restored(e) {
		this._toast(this._l.t("archive.restored_toast", { name: e.name })), this._plants = [...this._plants.filter((t) => t.id !== e.id), e], this._show({
			kind: "detail",
			plantId: e.id
		}), await this._refresh(!1);
	}
	async _archiveDeleted(e) {
		this._toast(this._l.t("archive.deleted_toast", { name: e })), await this._refresh(!1), this._archivedCount ? this._openArchive(null, !0) : this._show({ kind: "list" });
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
		return ks((/* @__PURE__ */ new Date()).toISOString(), this._timeZone()) ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
	}
	_openTaskEditor(e) {
		this._taskEditor = e ? {
			step: 2,
			taskId: e.id,
			baseline: structuredClone(e),
			draft: Us(e),
			errors: {},
			error: "",
			moreOpen: e.baseline_done_on !== null
		} : {
			step: 1,
			taskId: null,
			draft: Fs("custom"),
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
		}, r = Object.keys(t.errors).length ? Zs(n, this._today(), this._states).errors ?? {} : {};
		this._taskEditor = {
			...t,
			draft: n,
			errors: r
		};
	}
	async _saveTask(e) {
		let t = this._taskEditor, n = this.hass, r = this._l;
		if (!t || !n || this._formBusy || this._blocked) return;
		let i = Zs(t.draft, this._today(), this._states);
		if (!i.input) {
			this._setTaskEditor({
				errors: i.errors,
				moreOpen: t.moreOpen || !!i.errors.lastDone || !!i.errors.forHours || !!i.errors.resetValue
			}), this.updateComplete.then(() => this.shadowRoot?.querySelector("dialog [aria-invalid=true], dialog .monthpick button")?.focus());
			return;
		}
		let a = i.input, o = this._context, s = $o(r, {
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
				let o = t.taskId, s = () => this._plantById(e)?.care_tasks?.find((e) => e.id === o), c = s(), l = t.baseline ?? c;
				if (!c || !l) {
					this._setTaskEditor({ error: r.t("care_plan.error_task_gone") });
					return;
				}
				let u = [];
				if (i = await this._withRevision(e, async (r) => {
					let i = s();
					if (!i) throw new L("not_found", "Care task not found.");
					let c = ec(l, i, a);
					if (c.overlaps.length) {
						u = c.overlaps;
						let e = this._taskEditor;
						this._setTaskEditor({
							baseline: structuredClone(i),
							draft: e ? tc(e.draft, l, i, a) : t.draft
						});
					} else return Object.keys(c.changes).length ? z.updateCareTask(n, e, o, r, c.changes) : void 0;
				}), u.length) {
					let e = u.map((e) => r.t(`care_plan.overlap_${e}`)).join(", ");
					this._setTaskEditor({ error: r.t("care_plan.error_overlap", { fields: e }) });
					return;
				}
			} else i = (await this._withRevision(e, (t) => z.createCareTask(n, e, t, a))).plant;
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
			draft: hc(e.rest_period ?? null, e.care_tasks ?? []),
			error: ""
		}, this._openDialog("care_rest");
	}
	_editRest(e) {
		let t = this._restEditor;
		if (!t) return;
		let n = {
			...t.draft,
			...e
		}, r = t.error ? ((e) => e.error ? this._l.t(e.error) : "")(gc(n)) : "";
		this._restEditor = {
			draft: n,
			error: r
		};
	}
	async _saveRest(e, t = !1) {
		let n = this._restEditor, r = this.hass, i = this._l;
		if (!n || !r || this._formBusy || this._blocked) return;
		let a = t ? null : gc(n.draft);
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
			if (JSON.stringify(o) !== JSON.stringify(a.rest_period ?? null) && (c = await this._withRevision(e, (t) => z.setRestPeriod(r, e, t, o)), this._adopt(c), this._followQuickWrite(c)), !t) {
				let { off: t, stored: i } = n.draft, a = [.../* @__PURE__ */ new Set([...t, ...i])].filter((e) => t.has(e) !== i.has(e));
				for (let t of a) {
					let i = await this._withRevision(e, async (i) => {
						let a = _c((this._plantById(e)?.care_tasks ?? []).filter((e) => e.id === t), n.draft)[0];
						return a ? z.updateCareTask(r, e, t, i, { schedule: a.schedule }) : void 0;
					});
					i && (c = i, this._adopt(c), this._followQuickWrite(c));
				}
			}
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
		let n = this._l, r = $o(n, t), i = await this._careTaskWrite(e, t.id, (n, r) => z.completeCareTask(n, e, t.id, r), (e) => e.plant);
		i && this._toast(n.t("care_plan.done_toast", { name: r }), {
			text: n.t("care_plan.undo"),
			action: () => void this._careTaskWrite(e, t.id, (t, n) => z.deleteCareEvent(t, e, n, i.event_id), (e) => e.plant)
		});
	}
	async _skipTask(e, t) {
		let n = this._l, r = $o(n, t), i = await this._careTaskWrite(e, t.id, (n, r) => z.skipCareTask(n, e, t.id, r), (e) => e.plant);
		i && this._toast(n.t("care_plan.skipped_toast", { name: r }), {
			text: n.t("care_plan.undo"),
			action: () => void this._careTaskWrite(e, t.id, (n, r) => z.undoSkipCareTask(n, e, t.id, r, i.previous_skipped_on), (e) => e)
		});
	}
	async _deleteTask(e, t) {
		let n = this._l, r = $o(n, t);
		window.confirm(n.t("care_plan.confirm_delete", { name: r })) && (this._dialog && this._closeDialog(), await this._careTaskWrite(e, t.id, (n, r) => z.deleteCareTask(n, e, t.id, r), (e) => e) && this._toast(n.t("care_plan.deleted_toast", { name: r })));
	}
	_taskAction(e, t, n) {
		switch (n) {
			case "mark_done": {
				let e = Ko[t.type];
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
		let n = this._l, r = sc(e.id, t.id), i = (e) => this._entities.find((t) => t.platform === "smart_plants" && t.unique_id === e)?.entity_id ?? null;
		return [
			{
				icon: "mdi:toggle-switch-outline",
				entityId: i(r.due),
				description: n.t("care_plan.automate_due", { name: $o(n, t) })
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
		n ? n.writeText(e).then(() => this._toast(t.t("care_plan.copied", { entity: e })), () => this._toast(t.t("care_plan.copy_failed"))) : this._toast(t.t("care_plan.copy_failed"));
	}
	_renderCareDialog(e) {
		let t = this._l, n = this._plantById(e);
		if (!n) return E;
		let r = "", i = E;
		if (this._dialog === "care_task" && this._taskEditor) {
			let e = this._taskEditor;
			r = Nl(t, e), i = Pl({
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
					draft: Fs(e, n, this._states, t),
					errors: {},
					error: "",
					moreOpen: !1,
					otherSensor: !1
				}, !0),
				onSuggestion: (e, r) => this._setTaskEditor({
					step: 2,
					draft: Hs(e, r, n, this._states, t),
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
					t && this._editTaskDraft(Ws(t.startMonth, t.endMonth, e));
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
			r = t.t("care_plan.rest_period"), i = Wl({
				l: t,
				plant: n,
				draft: e.draft,
				error: e.error,
				busy: this._formBusy || this._blocked,
				onMonth: (e) => {
					let t = this._restEditor;
					t && this._editRest({ ...Ws(t.draft.startMonth, t.draft.endMonth, e) });
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
			e ? (r = t.t("care_plan.automate_title", { name: $o(t, e) }), i = Gl({
				l: t,
				rows: this._automateRows(n, e),
				onCopy: (e) => this._copyEntityId(e),
				onOpenEditor: () => {
					this._closeDialog(), this._navigate("/config/automation/edit/new");
				},
				onClose: () => this._closeDialog()
			})) : i = T`<p>${t.t("care_plan.error_task_gone")}</p><div class="actions dialog-actions"><span class="spacer"></span><button type="button" @click=${() => this._closeDialog()}>${t.t("care_plan.close")}</button></div>`;
		}
		return T`<dialog class="care-dialog" aria-labelledby="dialog-title" @cancel=${(e) => {
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
			r = await hu(t, this._l);
		} catch (e) {
			n === this._context && (this._error = e.message);
			return;
		} finally {
			n === this._context && (this._formBusy = !1);
		}
		if (n !== this._context || !this.isConnected || this._view.kind !== "detail" || this._view.plantId !== e.id) return;
		let i = this.hass, a = this._plantById(e.id)?.revision;
		i && a !== void 0 && await this._mutate(() => Xd(i, e.id, a, r), !1, void 0, !0);
	}
	_renderPhotoRow(e) {
		let t = this._l, n = this._formBusy || this._blocked || !!this._conflict, r = e.image ? this._imageLoading ? T`<span role="status">${t.t("photo.loading")}</span>` : this._imageError ? T`<span class="error-text" role="alert">${t.t("photo.load_failed", { error: this._imageError })}</span> <button type="button" class="btn text sm" @click=${() => {
			this._clearImage(), this._syncImage();
		}}>${t.t("photo.retry")}</button>` : t.t("photo.stored", {
			type: e.image.content_type,
			width: e.image.width,
			height: e.image.height
		}) : t.t("photo.none");
		return T`<div class="setrow"><div><div class="setrow-h">${t.t("settings.photo")}</div><div class="setrow-d">${r}</div><div class="setrow-d">${t.t("photo.hint")}</div></div>
      <div class="row">
        <label class="btn text sm">${e.image ? t.t("photo.replace") : t.t("photo.upload")}<input class="file-input" type="file" accept=${au()} ?disabled=${n} @change=${(t) => {
			let n = t.target, r = n.files?.[0];
			n.value = "", r && this._uploadImage(e, r);
		}}></label>
        ${e.image ? T`<button type="button" class="btn text sm" ?disabled=${n} @click=${() => {
			if (this.hass) {
				let t = this.hass;
				this._mutate(() => z.deleteImage(t, e.id, e.revision));
			}
		}}>${t.t("photo.remove")}</button>` : E}
      </div></div>`;
	}
	_saveButton(e, t) {
		return T`<button class="primary" @click=${() => void this._save(e)}>${t}</button>`;
	}
	_renderOverallHealth(e) {
		let t = this._health[e.id], n = this._l, r = n.t("section.overall_health_unavailable");
		return T`<section aria-labelledby="overall-health-heading"><h3 id="overall-health-heading">${n.t("section.overall_health")}</h3>
      ${t ? T`
        <p role="status" aria-live="polite">${t.available && t.health_score !== null ? n.t("section.overall_health_available_summary", { score: t.health_score }) : n.t("section.overall_health_unavailable_detail")}</p>
        <dl class="overall-health">
          <dt>${n.t("section.overall_health_confidence")}</dt><dd>${pr(t.confidence_label, n)} — ${fr(t.confidence_label, n)}</dd>
          <dt>${n.t("section.overall_health_included_roles")}</dt><dd>${t.contributors.length ? T`<ul class="contributors">${t.contributors.map((e) => T`<li>${dr(e, n)}</li>`)}</ul>` : n.t("section.overall_health_none_contributing")}</dd>
          <dt>${n.t("section.overall_health_configured_unavailable")}</dt><dd>${(() => {
			let e = t.configured.filter((e) => !t.contributors.includes(e));
			return e.length ? T`<ul class="configured-unavailable">${e.map((e) => T`<li>${dr(e, n)}</li>`)}</ul>` : n.t("section.overall_health_all_included");
		})()}</dd>
        </dl>
      ` : T`<p role="status">${this._healthError ? `${r} ${this._healthError}` : r}</p>`}
    </section>`;
	}
	_renderDiagnostics(e) {
		let t = this._l, n = Di(e, this._entities, this._states, t), r = n.filter((e) => e.status === "on").length, i = r === 0 ? t.t("section.advanced_diagnostics_zero_active") : t.tn(r, "section.advanced_diagnostics_one_active", "section.advanced_diagnostics_many_active");
		return T`<section aria-labelledby="diagnostics-heading"><h3 id="diagnostics-heading">${t.t("section.advanced_diagnostics")}</h3>
      <p role="status" aria-live="polite">${i}</p>
      <p>${t.t("section.advanced_diagnostics_description")}</p>
      <dl class="diagnostics">${n.map((n) => {
			let r = n.status === "not_configured" ? [] : Ei(e, n.role, this._entities, this._states, t);
			return T`<dt>${n.label}</dt><dd class=${"status-" + n.status}>${this._problemStatusText(n.status)}${n.reason ? T` — ${this._problemReason(n.reason)}` : E}${r.length ? T`<ul class="thresholds" aria-label=${t.t("section.effective_thresholds_label", { label: n.label })}>${r.map((e) => T`<li><span class="threshold-label">${e.label}</span>: <span class="threshold-value">${e.value === null ? "—" : `${t.number(e.value)} ${e.unit}`}</span></li>`)}</ul>` : E}</dd>`;
		})}</dl></section>`;
	}
	_problemStatusText(e) {
		let t = this._l;
		return e === "on" ? t.t("section.advanced_diagnostics_status_problem") : e === "off" ? t.t("section.advanced_diagnostics_status_ok") : e === "unavailable" ? t.t("section.advanced_diagnostics_status_unavailable") : t.t("section.advanced_diagnostics_status_not_configured");
	}
	_renderOtherTargets(e) {
		let t = this._l, n = Di(e, this._entities, this._states, t).filter((e) => e.status !== "not_configured" && zd[e.role]), r = this._pendingThresholdSwitch, i = this._thresholdRole ? zd[this._thresholdRole] : null, a = i ? t.t(`problem_phrase.${i.problemRole}`) : "", o = r ? t.t(`problem_phrase.${r.spec.problemRole}`) : "", s = !!this._overview[e.id]?.winter?.active;
		return T`<p class="small muted">${t.t("other_targets.intro")}</p>
      ${s ? T`<p class="notice winter-in-use" role="note">${t.t("winter.other_targets_active")}</p>` : E}
      ${r ? T`<p class="notice threshold-switch-alert" role="alert">${t.t("section.advanced_diagnostics_switch_prompt", {
			current: a,
			pending: o
		})}
        <button type="button" class="primary" @click=${() => this._confirmDiscardAndSwitch()}>${t.t("section.advanced_diagnostics_switch_discard")}</button>
        <button type="button" @click=${() => {
			this._pendingThresholdSwitch = null;
		}}>${t.t("section.advanced_diagnostics_switch_keep")}</button>
      </p>` : E}
      ${n.length ? T`<dl class="other-targets">${n.map((n) => {
			let r = zd[n.role], i = Ei(e, n.role, this._entities, this._states, t), a = this._thresholdRole === n.role && this._thresholdEdits !== null, o = this._thresholdSaved[n.role];
			return T`<dt>${n.label}</dt><dd>${i.length ? T`<ul class="thresholds" aria-label=${t.t("section.effective_thresholds_label", { label: n.label })}>${i.map((e) => T`<li><span class="threshold-label">${e.label}</span>: <span class="threshold-value">${e.value === null ? "—" : `${t.number(e.value)} ${e.unit}`}</span></li>`)}</ul>` : E}
          <button class="threshold-toggle btn outline sm" type="button" aria-expanded=${a ? "true" : "false"} aria-controls=${`${n.role}-editor`} ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._toggleThresholdEdit(r, e)}>${a ? t.t("section.advanced_diagnostics_cancel_edit") : t.t("section.advanced_diagnostics_edit_thresholds")}</button>${a ? this._renderThresholdEditor(r, e) : E}${o && !a ? T`<p class="notice" role="status">${o}</p>` : E}</dd>`;
		})}</dl>` : T`<p>${t.t("other_targets.none")}</p>`}
      ${!wc(e) && Ec(e).length ? T`<div class="winter-entry"><ha-icon aria-hidden="true" icon="mdi:snowflake"></ha-icon><span>${t.t("winter.add_hint")}</span>
        <button type="button" class="btn text sm" ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._openWinterEditor(e)}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("winter.add")}</button></div>` : E}`;
	}
	_problemReason(e) {
		let t = `problem_reason.${e}`;
		return Qn(t) ? this._l.t(t) : e;
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
	_inheritedThresholds(e, t) {
		let n = t.roles?.[e.configRole], r = n && typeof n == "object" ? n.species_defaults : void 0, i = { ...e.defaults }, a = /* @__PURE__ */ new Set();
		if (r && typeof r == "object") for (let t of e.keys) {
			let e = r[t], n = e && typeof e == "object" ? e.value : void 0;
			typeof n == "number" && Number.isFinite(n) && (i[t] = n, a.add(t));
		}
		return {
			values: i,
			species: a
		};
	}
	_toggleThresholdEdit(e, t) {
		this._thresholdRole === e.problemRole && this._thresholdEdits !== null ? (this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._pendingThresholdSwitch = null) : this._thresholdRole && this._thresholdRole !== e.problemRole && this._hasUnsavedThresholdChanges() ? this._pendingThresholdSwitch = {
			spec: e,
			plant: t
		} : this._openThresholdEditor(e, t);
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
		if (!n) return E;
		let r = this._l, i = this._inheritedThresholds(e, t), a = (e) => {
			let t = n[e].trim(), a = Number(t);
			return t === "" ? r.number(i.values[e]) : Number.isFinite(a) ? r.number(a) : t;
		}, o = (t) => T`<label>${r.t(e.labels[t], { unit: e.unit })}<input type="number" step=${e.step} min=${e.min} max=${e.max} inputmode="decimal" .value=${n[t]} @input=${(e) => this._editThreshold({ [t]: e.target.value })}></label><small>${r.t(i.species.has(t) ? "threshold.species_default_effective" : "threshold.default_effective", {
			default: r.number(i.values[t]),
			effective: a(t),
			unit: e.unit
		})}</small><button type="button" @click=${() => this._editThreshold({ [t]: "" })}>${r.t("threshold.inherit")}</button>`;
		return T`<div id=${`${e.problemRole}-editor`} class="threshold-editor" role="group" aria-label=${r.t("threshold.group_label", { label: r.t(`problem_phrase.${e.problemRole}`) })}>
      <p>${r.t(`threshold_intro.${e.problemRole}`)}</p>
      <fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
        <div class="grid">${e.keys.map((e) => T`<div>${o(e)}</div>`)}</div>
        ${this._thresholdError ? T`<p class="error" role="alert">${this._thresholdError}</p>` : E}
        <div class="actions">
          <button type="button" @click=${() => this._editThreshold(Object.fromEntries(e.keys.map((e) => [e, ""])))}>${r.t(i.species.size ? "threshold.inherit_all_species" : "threshold.inherit_all")}</button>
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
		let { values: n, error: r } = e.validate(this._thresholdEdits, this._l, this._inheritedThresholds(e, t).values);
		if (r) {
			this._thresholdError = r;
			return;
		}
		this._thresholdError = "";
		let i = this.hass;
		await this._mutate(() => z.setThresholdOverrides(i, t.id, t.revision, e.configRole, n)), this._error || (this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._pendingThresholdSwitch = null, this._thresholdSaved = {
			...this._thresholdSaved,
			[e.problemRole]: this._l.t(`threshold_saved.${e.problemRole}`)
		});
	}
	_sourceSummary(e, t) {
		let n = t === "moisture" ? H(e) : W(e, t), r = this._l;
		if (!n) return r.t("sensors.summary_unavailable");
		if (!n.sources.length) return r.t("sensors.summary_empty");
		let i = [r.tn(n.sources.length, "sensors.source_count_one", "sensors.source_count_other"), ra(r, n.aggregation)];
		return n.primary_entity_id && n.sources.length > 1 && i.push(r.t("sensors.summary_primary", { name: dl(r, this._states, n.primary_entity_id) })), i.push(r.t("sensors.summary_stale", { duration: El(r, n.stale_after_seconds) })), i.join(" · ");
	}
	_toggleSourceEdit(e, t, n = "combine") {
		if (this._sourceRole === e && this._sourceEdits !== null) {
			if (this._sourceMode !== n) {
				this._sourceMode = n;
				return;
			}
			this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._pendingSourceSwitch = null;
		} else this._openSensorEditor(e, t, n);
	}
	_openSensorEditor(e, t, n) {
		e === "moisture" ? (this._moistureMode = n, this._focusEditor(n, e)) : this._sourceRole === e && this._sourceEdits !== null ? (this._sourceMode = n, this._focusEditor(n, e)) : this._sourceRole && this._sourceRole !== e && this._hasUnsavedSourceChanges() ? this._pendingSourceSwitch = {
			role: e,
			plant: t,
			mode: n
		} : this._openSourceEditor(e, t, n);
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
		let r = W(t, e);
		if (!r) {
			this._sourceUnavailable = {
				role: e,
				plantId: t.id,
				revision: t.revision,
				mode: n
			}, this._pendingSourceSwitch = null;
			return;
		}
		let i = Ui(r);
		this._sourceRole = e, this._sourceEdits = i, this._sourceBaseline = structuredClone(i), this._sourceMode = n, this._sourceError = "", this._pendingSourceSwitch = null, this._allSourceSensors = !1, this._sourceUnavailable = null, this._sourceSaved = {
			...this._sourceSaved,
			[e]: ""
		}, this._focusEditor(n, e);
	}
	_sourceRefused(e, t, n) {
		let r = this._sourceUnavailable;
		return !!r && r.role === t && r.mode === n && r.plantId === e.id && r.revision === e.revision && !W(e, t);
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
		let e = this._base ? H(this._base) : null;
		if (e && this._edits?.moisture) {
			let t = Ai(e);
			this._edit({ moisture: {
				...this._edits.moisture,
				sources: t.sources,
				primary_entity_id: t.primary_entity_id,
				aggregation: t.aggregation,
				stale_after_seconds: t.stale_after_seconds
			} });
		}
		this._moistureMode = null, this._moistureSourceError = "";
	}
	async _saveMoistureSensors() {
		this._edits?.moisture && Ki(this._edits.moisture) ? this._moistureSourceError = this._l.t("validation.main_sensor") : (this._moistureSourceError = "", await this._save("moisture"), this._error || (this._moistureMode = null));
	}
	_assignedSensors(e) {
		let t = ["moisture", ...zi.map((e) => e.role)], n = Object.keys(P);
		return t.sort((e, t) => n.indexOf(e) - n.indexOf(t)).flatMap((t) => {
			let n = t === "moisture" ? H(e) : W(e, t);
			return n ? n.sources.map((e) => {
				let r = Fi(e, this._entities);
				return {
					role: t,
					entityId: r?.entity_id ?? e.entity_id,
					main: n.primary_entity_id === e.entity_id,
					several: n.sources.length > 1,
					own: r?.platform === "smart_plants"
				};
			}) : [];
		});
	}
	_sensorValue(e) {
		let t = this._states[e], n = this._l;
		if (!t) return "";
		let r = Number(t.state), i = typeof t.attributes.unit_of_measurement == "string" ? t.attributes.unit_of_measurement : "";
		return t.state.trim() !== "" && Number.isFinite(r) ? I(n, r, i) : t.state === "unavailable" || t.state === "unknown" ? n.t("sources.unavailable") : t.state;
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
		let i = this.hass, a = t === "moisture" ? H(e) : W(e, t);
		if (r === "remove" && a?.primary_entity_id === n && Ki({
			...a,
			sources: a.sources.filter((e) => e.entity_id !== n),
			primary_entity_id: null
		})) {
			this._notice = "", this._error = this._l.t("error.remove_main_sensor", { name: dl(this._l, this._states, n) });
			return;
		}
		if (t === "moisture") {
			let t = H(e);
			if (!t) return;
			let a = Ai(t);
			if (r === "remove") a.sources = a.sources.filter((e) => e.entity_id !== n), a.primary_entity_id === n && (a.primary_entity_id = null);
			else if (r === "primary") a.primary_entity_id = n;
			else return;
			await this._mutate(() => z.configureMoisture(i, e.id, e.revision, Li(a, this._entities)));
			return;
		}
		let o = W(e, t);
		if (o) {
			if (r === "remove") {
				let r = qi({
					...o,
					sources: o.sources.filter((e) => e.entity_id !== n)
				}, this._entities).sources;
				await this._mutate(() => z.setRoleSources(i, e.id, e.revision, t, r));
			} else r === "primary" && await this._mutate(() => z.setRolePrimary(i, e.id, e.revision, t, n));
		}
	}
	_staleAlert(e) {
		let t = this._l, n = this._overview[e.id]?.roles.moisture;
		if (!n || n.state !== "stale") return E;
		let r = n.sources.map((e) => dl(t, this._states, e)).join(", ") || F(t, "moisture"), i = n.last_reported ? t.t("stale_alert.title", {
			name: r,
			age: Vt(t, n.last_reported)
		}) : t.t("stale_alert.title_no_age", { name: r });
		return Y("ha-alert") ? T`<ha-alert class="stale-alert" alert-type="warning" .title=${i}>${t.t("stale_alert.body")}</ha-alert>` : T`<div class="alert-fallback stale-alert" role="alert"><ha-icon aria-hidden="true" icon="mdi:alert-outline"></ha-icon><div><p class="alert-title">${i}</p><p>${t.t("stale_alert.body")}</p></div></div>`;
	}
	_renderSensorsTab(e) {
		let t = this._l, n = this._formBusy || this._blocked || !!this._conflict, r = this._pendingSourceSwitch, i = Bi(this._sourceRole ?? ""), a = this._assignedSensors(e), o = [...H(e)?.sources.length ? [] : ["moisture"], ...zi.filter((t) => !W(e, t.role)?.sources.length).map((e) => e.role)], s = zi.find((t) => this._sourceRefused(e, t.role, "pick"));
		return T`${this._staleAlert(e)}
      ${r ? T`<div class="notice" role="alert"><p>${t.t("sensors.switch_prompt", { role: i ? pl(t, i.role) : this._sourceRole ?? "" })}</p>
        <button type="button" class="primary" @click=${() => this._confirmSourceSwitch()}>${t.t("section.advanced_diagnostics_switch_discard")}</button>
        <button type="button" @click=${() => {
			this._pendingSourceSwitch = null;
		}}>${t.t("section.advanced_diagnostics_switch_keep")}</button></div>` : E}
      <section class="sp-card" aria-labelledby="assigned-heading"><div class="card-h"><h3 id="assigned-heading">${t.t("assigned.heading")}</h3></div>
        ${a.length ? T`<ul class="list">${a.map((r) => {
			let i = dl(t, this._states, r.entityId), a = this._states[r.entityId], o = a ? t.t("assigned.updated", { age: Vt(t, fl(a)) }) : t.t("assigned.not_found");
			return T`<li class="li"><span class="ic" aria-hidden="true"><ha-icon .icon=${P[r.role].icon}></ha-icon></span>
            <span class="li-main"><span class="li-title">${i}</span><span class="li-sub">${F(t, r.role)} · ${o}${r.main && r.several ? ` · ${t.t("assigned.main")}` : ""}${r.own ? ` · ${t.t("assigned.own_sensor")}` : ""}</span></span>
            <span class="li-actions"><span class="li-value">${this._sensorValue(r.entityId)}</span>
              <ha-dropdown @wa-select=${(t) => void this._sensorAction(e, r.role, r.entityId, t.detail.item.value)}>
                <button slot="trigger" type="button" class="icon-btn" ?disabled=${n} aria-label=${t.t("assigned.menu", { name: i })}><ha-icon aria-hidden="true" icon="mdi:dots-vertical"></ha-icon></button>
                <ha-dropdown-item value="change">${t.t("assigned.change", { role: pl(t, r.role) })}<ha-icon slot="icon" icon="mdi:pencil-outline"></ha-icon></ha-dropdown-item>
                ${r.several && !r.main ? T`<ha-dropdown-item value="primary">${t.t("assigned.make_main")}<ha-icon slot="icon" icon="mdi:star-outline"></ha-icon></ha-dropdown-item>` : E}
                <ha-dropdown-item value="remove">${t.t("assigned.remove")}<ha-icon slot="icon" icon="mdi:link-variant-off"></ha-icon></ha-dropdown-item>
              </ha-dropdown></span></li>`;
		})}</ul>` : T`<p class="card-b muted">${t.t("assigned.empty")}</p>`}
        <div class="card-b"><div class="row">${o.length ? T`<ha-dropdown class="add-sensor" @wa-select=${(t) => this._openSensorEditor(t.detail.item.value, e, "pick")}>
            <button slot="trigger" type="button" class="btn tonal" ?disabled=${n}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("assigned.add")}</button>
            ${o.map((e) => T`<ha-dropdown-item value=${e}>${F(t, e)}<ha-icon slot="icon" .icon=${P[e].icon}></ha-icon></ha-dropdown-item>`)}
          </ha-dropdown><span class="small muted">${t.t("assigned.available", { roles: o.map((e) => F(t, e)).join(", ") })}</span>` : T`<span class="small muted">${t.t("assigned.all_assigned")}</span>`}</div>
          ${s ? T`<p id=${`${s.role}-sources-unavailable`} class="error" role="alert">${t.t("sensors.refused", { role: F(t, s.role) })}</p>` : E}
        </div></section>
      ${this._moistureMode === "pick" ? this._renderPicker("moisture", e) : E}
      ${this._sourceRole && this._sourceEdits && this._sourceMode === "pick" ? this._renderPicker(this._sourceRole, e) : E}
      ${this._expander("combine", "mdi:call-merge", t.t("combine.heading"), t.t("combine.secondary"), () => this._renderCombine(e))}
      ${this._expander("troubleshooting", "mdi:stethoscope", t.t("troubleshooting.heading"), t.t("troubleshooting.secondary"), () => this._renderTroubleshooting(e))}`;
	}
	_renderPicker(e, t) {
		let n = this._l, r = F(n, e), i = this._formBusy || this._blocked || !!this._conflict, a = this._edits, o;
		return o = e === "moisture" ? a?.moisture ? T`<div id="moisture-sources-editor" class="editor"><fieldset ?disabled=${i}>${pa(n, a.moisture, this._defaults(t), this._entities, this._states, this._allSensors, (e) => this._allSensors = e, (e) => this._edit({ moisture: e }), "pick")}
        ${this._moistureSourceError ? T`<p class="error" role="alert">${this._moistureSourceError}</p>` : E}
        <div class="actions"><button type="button" @click=${() => this._closeMoistureEditor()}>${n.t("common.cancel")}</button><button type="button" class="primary" @click=${() => void this._saveMoistureSensors()}>${n.t("sensors.save_moisture")}</button></div></fieldset></div>` : T`<p class="error" role="alert">${n.t("moisture.incompatible")}</p>` : this._renderSourceEditor(e, t), T`<section class="sp-card picker" aria-labelledby=${`${e}-picker-heading`}><div class="card-h"><h3 id=${`${e}-picker-heading`} tabindex="-1">${n.t("sensors.edit_heading", { role: r })}</h3></div>
      <div class="card-b">${o}</div></section>`;
	}
	_renderSourceEditor(e, t) {
		let n = Bi(e), r = this._sourceEdits, i = this._l;
		return !n || !r ? E : T`<div id=${`${e}-sources-editor`} class="editor"><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
      ${ma(i, n, r, this._entities, this._states, this._allSourceSensors, (e) => this._allSourceSensors = e, (e) => this._editSource(e), this._sourceMode)}
      ${this._sourceError ? T`<p class="error" role="alert">${this._sourceError}</p>` : E}
      <div class="actions">
        <button type="button" @click=${() => this._closeSourceEditor()}>${i.t("common.cancel")}</button>
        <button type="button" class="primary" @click=${() => void this._saveRoleSources(e, t)}>${i.t("sensors.save", { role: pl(i, e) })}</button>
      </div></fieldset></div>`;
	}
	_renderCombine(e) {
		let t = this._l, n = this._formBusy || this._blocked || !!this._conflict, r = this._edits, i = this._moistureMode === "combine";
		return T`<p class="small muted">${t.t("combine.intro")}</p>
      <dl class="sensors">
        <dt>${F(t, "moisture")}</dt><dd>${this._sourceSummary(e, "moisture")}
          <button class="source-toggle btn text sm" type="button" aria-expanded=${i ? "true" : "false"} aria-controls="moisture-sources-editor" aria-label=${i ? t.t("common.cancel") : t.t("combine.edit_label", { role: pl(t, "moisture") })} ?disabled=${n || !r?.moisture} @click=${() => {
			i ? this._closeMoistureEditor() : this._moistureMode = "combine";
		}}>${i ? t.t("common.cancel") : t.t("sensors.edit")}</button>
          ${i && r?.moisture ? T`<div id="moisture-sources-editor" class="editor"><fieldset ?disabled=${n}>${pa(t, r.moisture, this._defaults(e), this._entities, this._states, this._allSensors, (e) => this._allSensors = e, (e) => this._edit({ moisture: e }), "combine")}
            ${this._moistureSourceError ? T`<p class="error" role="alert">${this._moistureSourceError}</p>` : E}
            <div class="actions"><button type="button" @click=${() => this._closeMoistureEditor()}>${t.t("common.cancel")}</button><button type="button" class="primary" @click=${() => void this._saveMoistureSensors()}>${t.t("sensors.save_moisture")}</button></div></fieldset></div>` : E}</dd>
        ${zi.map((r) => {
			let i = this._sourceRole === r.role && this._sourceEdits !== null && this._sourceMode === "combine", a = this._sourceSaved[r.role], o = F(t, r.role);
			return T`<dt>${o}</dt><dd>${this._sourceSummary(e, r.role)}
            <button class="source-toggle btn text sm" type="button" aria-expanded=${i ? "true" : "false"} aria-controls=${`${r.role}-sources-editor`} aria-label=${i ? t.t("common.cancel") : t.t("combine.edit_label", { role: pl(t, r.role) })} ?disabled=${n} @click=${() => this._toggleSourceEdit(r.role, e, "combine")}>${i ? t.t("common.cancel") : t.t("sensors.edit")}</button>
            ${i ? this._renderSourceEditor(r.role, e) : E}
            ${!i && this._sourceRefused(e, r.role, "combine") ? T`<p id=${`${r.role}-sources-unavailable`} class="error" role="alert">${t.t("sensors.refused", { role: o })}</p>` : E}
            ${a && !i ? T`<p class="notice" role="status">${a}</p>` : E}</dd>`;
		})}
      </dl>`;
	}
	_renderTroubleshooting(e) {
		let t = this._l, n = U(e, this._devices), r = this._evaluations[e.id], i = ["moisture", ...zi.map((e) => e.role)].flatMap((t) => {
			let n = t === "moisture" ? H(e) : W(e, t);
			return n?.sources.length ? [{
				role: t,
				c: n
			}] : [];
		});
		return T`<section aria-labelledby="entities-heading"><h3 id="entities-heading">${t.t("troubleshooting.entities_heading")}</h3>
        <dl class="kv entity-ids">${i.map(({ role: e, c: n }) => T`<dt>${F(t, e)}</dt><dd>${n.sources.map((e) => {
			let r = Fi(e, this._entities)?.entity_id ?? e.entity_id;
			return T`<div><code>${r}</code>${r === n.primary_entity_id ? T` <span class="muted">(${t.t("assigned.main")})</span>` : E}</div>`;
		})}</dd>`)}
          <dt>${t.t("troubleshooting.plant_id")}</dt><dd><code>${e.id}</code></dd>
          ${n ? T`<dt>${t.t("troubleshooting.device_id")}</dt><dd><code>${n.id}</code></dd>` : E}</dl></section>
      <section aria-labelledby="evaluation-heading"><h3 id="evaluation-heading">${t.t("troubleshooting.moisture_heading")}</h3>
        ${r ? T`<dl class="kv moisture-evaluation"><dt>${t.t("troubleshooting.moisture_value")}</dt><dd>${r.computed_percent === null ? "—" : t.percent(r.computed_percent)}</dd>
          <dt>${t.t("troubleshooting.moisture_health")}</dt><dd>${r.health_score === null ? "—" : t.t("section.overall_health_available_summary", { score: r.health_score })}</dd>
          ${r.reasons.length ? T`<dt>${t.t("troubleshooting.reasons")}</dt><dd>${r.reasons.join(" ")}</dd>` : E}</dl>` : T`<p>${t.t("troubleshooting.no_evaluation")}</p>`}</section>
      ${this._renderOverallHealth(e)}
      ${this._renderDiagnostics(e)}
      <section aria-labelledby="download-heading"><h3 id="download-heading">${t.t("troubleshooting.download_heading")}</h3>
        <p class="small muted">${t.t("troubleshooting.download_hint")}</p>
        <div class="row"><button type="button" class="btn outline sm" @click=${() => this._downloadDiagnostics(e)}><ha-icon aria-hidden="true" icon="mdi:download"></ha-icon>${t.t("detail.menu_download")}</button></div></section>`;
	}
	_internalLink(e, t) {
		e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.preventDefault(), this._navigate(t));
	}
	_downloadDiagnostics(e) {
		let t = U(e, this._devices), n = {
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
			problem_checks: Di(e, this._entities, this._states, this._l).map((e) => ({
				role: e.role,
				status: e.status,
				reason: e.reason
			})),
			related_automations: this._related,
			related_all_plants_automations: this._relatedAllPlants
		}, r = URL.createObjectURL(new Blob([JSON.stringify(n, null, 2)], { type: "application/json" })), i = document.createElement("a");
		i.href = r, i.download = `smart-plants-${e.id}-diagnostics.json`, i.click(), setTimeout(() => URL.revokeObjectURL(r), 1e3);
	}
	_openSnooze(e) {
		let t = this._today(), n = Du(e.snoozed_until), r = n ? Ou(n, this._timeZone()) : null;
		this._snoozeDraft = r && Eu(r, t) ? {
			choice: "date",
			date: r,
			error: ""
		} : {
			choice: "1",
			date: Tu(t).min,
			error: ""
		}, this._openDialog("snooze", this._plantMenuTrigger());
	}
	_saveSnooze(e) {
		let t = this._snoozeDraft, n = this._plantById(e);
		if (!t || !n || !this.hass) return;
		let r = wu(t.choice, this._today(), t.date, this._timeZone());
		if (!r) {
			this._snoozeDraft = {
				...t,
				error: this._l.t("snooze.error_date")
			}, this.updateComplete.then(() => this.shadowRoot?.querySelector("#snooze-date")?.focus());
			return;
		}
		let i = this.hass;
		this._closeDialog(), this._mutate(() => z.snooze(i, n.id, n.revision, r));
	}
	_resumeSnooze(e) {
		let t = this._plantById(e);
		if (!t || !this.hass) return;
		let n = this.hass;
		this._dialog && this._closeDialog(), this._mutate(() => z.snooze(n, t.id, t.revision, null)).then(() => this.shadowRoot?.querySelector("h1")?.focus());
	}
	_renderSnoozeDialog(e) {
		let t = this._plantById(e), n = this._snoozeDraft;
		if (!t || !n) return E;
		let r = this._l, i = this._today(), a = Du(t.snoozed_until), o = a ? Ou(a, this._timeZone()) : null, s = this._formBusy || this._blocked || !!this._conflict;
		return T`<dialog class="care-dialog snooze-dialog" aria-labelledby="dialog-title" aria-describedby="snooze-intro" @cancel=${(e) => {
			e.preventDefault(), this._closeDialog();
		}} @keydown=${(e) => this._trapFocus(e)}>
      <h2 id="dialog-title" tabindex="-1">${r.t(o ? "snooze.title_change" : "snooze.title", { name: t.name })}</h2>
      <div class="dialog-body">
        <p class="muted" id="snooze-intro">${r.t("snooze.intro")}</p>
        ${o ? T`<p class="snooze-current">${r.t("snooze.current", { date: ku(r, o, i) })}</p>` : E}
        ${this._renderSnoozeChoices(n, i)}
        <div class="actions dialog-actions">
          ${o ? T`<button type="button" ?disabled=${s} @click=${() => this._resumeSnooze(t.id)}>${r.t("snooze.resume")}</button>` : E}<span class="spacer"></span>
          <button type="button" @click=${() => this._closeDialog()}>${r.t("common.cancel")}</button>
          <button type="button" class="primary" ?disabled=${s} @click=${() => this._saveSnooze(t.id)}>${r.t("snooze.confirm")}</button></div>
      </div></dialog>`;
	}
	_renderSnoozeChoices(e, t) {
		let n = this._l, r = Tu(t), i = (t) => {
			this._snoozeDraft = {
				...e,
				choice: t,
				error: ""
			};
		};
		return T`<fieldset class="snooze-choices"><legend class="field-label">${n.t("snooze.choices")}</legend>
          ${vu.map((r) => T`<label class="check"><input type="radio" name="snooze-choice" value=${r.choice} .checked=${e.choice === r.choice} @change=${() => i(r.choice)}>
            <span class="choice-text"><span>${n.t(r.label)}</span><span class="small muted">${n.t("snooze.preset_until", { date: ku(n, bu(t, r.days), t) })}</span></span></label>`)}
          <label class="check"><input type="radio" name="snooze-choice" value="date" .checked=${e.choice === "date"} @change=${() => i("date")}><span class="choice-text"><span>${n.t("snooze.preset_date")}</span></span></label>
        </fieldset>
        ${e.choice === "date" ? T`<div class="field-group"><label for="snooze-date" class="field-label">${n.t("snooze.date_label")}</label>
          <input id="snooze-date" type="date" min=${r.min} max=${r.max} .value=${e.date} aria-invalid=${e.error ? "true" : "false"} aria-describedby=${e.error ? "snooze-error snooze-date-hint" : "snooze-date-hint"}
            @input=${(t) => {
			this._snoozeDraft = {
				...e,
				date: t.target.value,
				error: ""
			};
		}}>
          <span class="small muted" id="snooze-date-hint">${n.t("snooze.date_hint")}</span>
          ${e.error ? T`<span class="error-text small" id="snooze-error" role="alert">${e.error}</span>` : E}</div>` : E}`;
	}
	_activePlants() {
		return this._plants.filter((e) => e.lifecycle_state === "active");
	}
	_openSnoozeAll() {
		this._snoozeDraft = {
			choice: "1",
			date: Tu(this._today()).min,
			error: ""
		}, this._openDialog("snooze_all", this.shadowRoot?.querySelector(".panel-appbar ha-dropdown [slot=trigger]") ?? null);
	}
	_saveSnoozeAll() {
		let e = this._snoozeDraft;
		if (!e) return;
		let t = wu(e.choice, this._today(), e.date, this._timeZone());
		t ? (this._closeDialog(), this._snoozeMany(t)) : (this._snoozeDraft = {
			...e,
			error: this._l.t("snooze.error_date")
		}, this.updateComplete.then(() => this.shadowRoot?.querySelector("#snooze-date")?.focus()));
	}
	async _snoozeMany(e) {
		if (!this.hass || this._formBusy || this._blocked) return;
		let t = this.hass, n = this._l, r = await this._snoozeWrite(() => z.snoozeMany(t, e));
		if (!r) return;
		let i = r.plants.length, a = Object.fromEntries(r.plants.map((e) => [e.id, e.snoozed_until ?? null])), o = e ? Ou(e, this._timeZone()) : null, s = i ? o ? n.tn(i, "snooze.all_done_one", "snooze.all_done_other", { date: ku(n, o, this._today()) }) : n.tn(i, "snooze.all_resumed_one", "snooze.all_resumed_other") : n.t("snooze.all_unchanged");
		this._toast(s, i ? {
			text: n.t("snooze.undo"),
			action: () => void this._restoreSnoozes(r.previous, a)
		} : void 0);
	}
	async _restoreSnoozes(e, t) {
		if (!this.hass || this._formBusy || this._blocked) return;
		let n = this.hass, r = this._l, i = await this._snoozeWrite(() => z.restoreSnoozes(n, e, t));
		if (!i) return;
		let a = i.skipped.length;
		this._toast(a ? i.plants.length ? r.tn(a, "snooze.all_undone_kept_one", "snooze.all_undone_kept_other") : r.t("snooze.all_undo_none") : r.t("snooze.all_undone"));
	}
	async _snoozeWrite(e) {
		this._formBusy = !0, this._error = "";
		let t = this._context;
		this._request++;
		try {
			let t = await e();
			for (let e of t.plants) {
				this._adopt(e);
				let t = this._overview[e.id];
				t && (this._overview = {
					...this._overview,
					[e.id]: {
						...t,
						snoozed_until: e.snoozed_until ?? null
					}
				});
			}
			return t;
		} catch (e) {
			return t !== this._context || !this.isConnected || (this._error = this._friendly(e), e instanceof L && ["integration_not_loaded", "unauthorized"].includes(e.code) && (this._blocked = !0, this._clearImage())), null;
		} finally {
			t === this._context && (this._formBusy = !1), this._refresh(!1);
		}
	}
	_renderSnoozeAllDialog() {
		let e = this._snoozeDraft;
		if (!e) return E;
		let t = this._l, n = this._today(), r = Date.now(), i = this._activePlants(), a = this._plants.length > i.length, o = wu(e.choice, n, e.date, this._timeZone()), s = o ? Date.parse(o) : NaN, c = i.filter((e) => {
			let t = Du(e.snoozed_until, r);
			return t !== null && Date.parse(t) >= s;
		}).length, l = i.filter((e) => Du(e.snoozed_until, r) !== null).length, u = this._formBusy || this._blocked, d = [
			c === i.length ? t.t("snooze.all_none") : t.tn(i.length - c, "snooze.all_summary_one", "snooze.all_summary_other"),
			a ? t.t("snooze.all_paused") : "",
			c && c < i.length ? t.tn(c, "snooze.all_kept_one", "snooze.all_kept_other") : ""
		].filter(Boolean).join(" ");
		return T`<dialog class="care-dialog snooze-dialog" aria-labelledby="dialog-title" aria-describedby="snooze-intro" @cancel=${(e) => {
			e.preventDefault(), this._closeDialog();
		}} @keydown=${(e) => this._trapFocus(e)}>
      <h2 id="dialog-title" tabindex="-1">${t.t("snooze.title_all")}</h2>
      <div class="dialog-body">
        <p class="muted" id="snooze-intro">${t.t("snooze.intro")}</p>
        ${this._renderSnoozeChoices(e, n)}
        <p class="snooze-summary" id="snooze-summary" aria-live="polite">${d}</p>
        ${l ? T`<p class="small muted" id="snooze-resume-hint">${t.tn(l, "snooze.resume_all_hint_one", "snooze.resume_all_hint_other")}</p>` : E}
        <div class="actions dialog-actions">
          ${l ? T`<button type="button" ?disabled=${u} aria-describedby="snooze-resume-hint" @click=${() => {
			this._closeDialog(), this._snoozeMany(null);
		}}>${t.t("snooze.resume_all")}</button>` : E}<span class="spacer"></span>
          <button type="button" @click=${() => this._closeDialog()}>${t.t("common.cancel")}</button>
          <button type="button" class="primary" ?disabled=${u || o !== null && c === i.length} aria-describedby="snooze-summary" @click=${() => this._saveSnoozeAll()}>${t.t("snooze.confirm")}</button></div>
      </div></dialog>`;
	}
	_toggleMonitoring(e) {
		if (!this.hass) return;
		let t = this.hass;
		this._mutate(() => e.lifecycle_state === "active" ? z.disable(t, e.id, e.revision) : z.reenable(t, e.id, e.revision));
	}
	_expander(e, t, n, r, i) {
		return Ol({
			key: e,
			icon: t,
			header: n,
			secondary: r,
			content: i,
			open: this._expanded.has(e),
			rendered: this._opened.has(e),
			native: Y("ha-expansion-panel"),
			toggle: (t) => this._setExpanded(e, t),
			willOpen: () => {
				this._opened = /* @__PURE__ */ new Set([...this._opened, e]);
			}
		});
	}
	async _saveRoleSources(e, t) {
		if (!this.hass || !this._sourceEdits || this._formBusy || this._blocked || this._conflict) return;
		if (this._registryError) {
			this._sourceError = this._l.t("error.sources_reconnect");
			return;
		}
		let n = Wi(this._sourceEdits, this._l) ?? (Ki(this._sourceEdits) ? this._l.t("validation.main_sensor") : null);
		if (n) {
			this._sourceError = n;
			return;
		}
		this._sourceError = "";
		let r = this.hass, i = qi(this._sourceEdits, this._entities), a = W(t, e);
		await this._mutate(async () => {
			let n = t.revision, o = t;
			return a && JSON.stringify(a.sources) === JSON.stringify(i.sources) || (o = await z.setRoleSources(r, t.id, n, e, i.sources), n = o.revision), a && W(o, e)?.primary_entity_id === i.primary_entity_id || (o = await z.setRolePrimary(r, t.id, n, e, i.primary_entity_id), n = o.revision), a && a.aggregation === i.aggregation || (o = await z.setRoleAggregation(r, t.id, n, e, i.aggregation), n = o.revision), a && a.stale_after_seconds === i.stale_after_seconds || (o = await z.setRoleStaleAfter(r, t.id, n, e, i.stale_after_seconds), n = o.revision), o;
		}), this._error || (this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._pendingSourceSwitch = null, this._sourceSaved = {
			...this._sourceSaved,
			[e]: this._l.t("sensors.saved", { role: F(this._l, e) })
		});
	}
	_openWinterEditor(e) {
		this._dialog && this._closeDialog(), this._winterDraft = Oc(e), this._winterBase = this._winterDraft, this._winterStored = wc(e), this._winterChanged = !1, this._openDialog("winter");
	}
	_absorbWinterChange(e) {
		let t = this._winterDraft, n = this._winterBase;
		if (!t || !n) return;
		let r = wc(e);
		if (Ac(r, this._winterStored)) return;
		let i = Oc(e);
		this._winterDraft = kc(t, n, i), this._winterBase = i, this._winterStored = r, this._winterChanged = !0;
	}
	_editWinter(e, t) {
		let n = this._winterDraft;
		n && (this._winterDraft = {
			...n,
			[e]: {
				...n[e],
				...t
			}
		});
	}
	_changePlacement() {
		this._dialog && this._closeDialog(), this._winterOpen = !1, this._goTo("settings", "[data-section=\"more_details\"] select", "more_details");
	}
	_setRestFromWinter(e) {
		this._dialog && this._closeDialog(), this._openRestEditor(e);
	}
	async _writeWinter(e, t, n) {
		let r = this.hass;
		if (!r || this._formBusy || this._blocked) return null;
		let i = this._context;
		this._formBusy = !0, this._error = "", this._request++;
		let a = (t) => z.setWinterThresholds(r, e, t, n);
		try {
			let n = this._plantById(e);
			if (!n) throw new L("not_found", "Plant not found.");
			if (!Ac(wc(n), t)) return "changed";
			let r;
			try {
				r = await a(n.revision);
			} catch (t) {
				if (!(t instanceof L && t.code === "revision_conflict")) throw t;
				await this._refresh(!1);
				let o = this._plantById(e);
				if (!o) throw t;
				if (!oc(n, o)) return i === this._context ? "changed" : null;
				r = await a(o.revision);
			}
			return i === this._context ? (this._formBusy = !1, this._adopt(r), this._base?.id === r.id && !this._conflict && oc(this._base, r, ["winter_thresholds"]) && this._rebaseEdits(this._base, r), r) : null;
		} catch (e) {
			return i === this._context && (this._error = this._friendly(e)), null;
		} finally {
			i === this._context && (this._formBusy = !1, this._refresh(!1));
		}
	}
	async _saveWinter(e) {
		let t = this._plantById(e), n = this._winterDraft, r = this._l;
		if (!t || !n) return;
		let { thresholds: i, errors: a } = Fc(t, n, r);
		if (Object.keys(a).length) return;
		let o = await this._writeWinter(e, this._winterStored, i);
		o && o !== "changed" && (this._closeDialog(), this._toast(r.t(i === null ? "winter.removed" : "winter.saved")));
	}
	async _removeWinter(e) {
		let t = this._plantById(e), n = this._l, r = t ? wc(t) : null;
		if (this._closeDialog(), !r) return;
		let i = await this._writeWinter(e, r, null);
		i && i !== "changed" && this._toast(n.t("winter.removed"), {
			text: n.t("winter.undo"),
			action: () => void this._writeWinter(e, null, r).then((e) => {
				this._toast(n.t(e && e !== "changed" ? "winter.restored" : "winter.undo_failed"));
			})
		});
	}
	_renderWinterLine(e) {
		if (!e.changed) return T`<li class="same">${this._l.t("winter.same_summary", { check: e.check })}</li>`;
		let t = qc(this._l, e);
		return T`<li>${t.before}<strong>${e.check}</strong>${t.after}</li>`;
	}
	_renderWinterNever(e) {
		let t = this._l;
		return T`<div class="winter-never" role="note"><p>${t.t("winter.never")}</p>
      <div class="row"><button type="button" class="btn text sm" @click=${() => this._setRestFromWinter(e)}>${t.t("care_plan.rest_set")}</button>
        <button type="button" class="btn text sm" @click=${() => this._changePlacement()}>${t.t("winter.change_placement")}</button></div></div>`;
	}
	_renderWinterCard(e) {
		if (!wc(e)) return E;
		let t = this._l, n = this._overview[e.id], r = this._formBusy || this._blocked || !!this._conflict, i = this._today(), a = n?.winter ? n.winter.active : $c(e, i) !== null, o = Xc(t, e), s = e.lifecycle_state === "disabled" ? t.t("winter.paused") : !a && e.rest_period ? Qc(t, e, i) : null;
		return T`<section class="sp-card winter-card" aria-labelledby="winter-heading"><div class="card-h"><h3 id="winter-heading"><ha-icon aria-hidden="true" icon="mdi:snowflake"></ha-icon>${t.t("winter.title")}${a ? T`<span class="winter-badge">${t.t("winter.active_now")}</span>` : E}</h3></div>
      <div class="card-b">${o ? T`<p class="small muted">${o}${s ? T` ${s}` : E}</p>` : this._renderWinterNever(e)}
        <ul class="winter-lines">${Kc(t, e).map((e) => this._renderWinterLine(e))}</ul>
        <div class="row"><span class="spacer"></span><button type="button" class="btn danger sm" ?disabled=${r} @click=${() => this._openDialog("winter_remove")}>${t.t("winter.remove")}</button>
          <button type="button" class="btn filled sm" ?disabled=${r} @click=${() => this._openWinterEditor(e)}>${t.t("winter.edit")}</button></div></div></section>`;
	}
	_renderWinterBox(e, t) {
		let n = this._l;
		return T`<div class="winter-box" id="winter-box"><p>${tl(n, e, t, this._today())}</p>
      <ul>${Kc(n, e).filter((e) => e.changed).map((e) => this._renderWinterLine(e))}</ul>
      <button type="button" class="btn text sm" ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._openWinterEditor(e)}>${n.t("winter.edit")}</button></div>`;
	}
	_renderWinterDialog(e) {
		let t = this._plantById(e), n = this._winterDraft;
		if (!t || !n) return E;
		let r = this._l, i = this._formBusy || this._blocked || !!this._conflict, a = Xc(r, t), { thresholds: o, errors: s, invalid: c } = Fc(t, n, r), l = o === null && !wc(t), u = Ec(t);
		return T`<dialog class="care-dialog winter-dialog" aria-labelledby="dialog-title" aria-describedby="winter-intro" @cancel=${(e) => {
			e.preventDefault(), this._formBusy || this._closeDialog();
		}} @keydown=${(e) => this._trapFocus(e)}>
      <h2 id="dialog-title" tabindex="-1">${r.t("winter.editor_title", { name: t.name })}</h2>
      <div class="dialog-body">
        <p class="muted" id="winter-intro">${r.t("winter.editor_intro")}</p>
        ${a ? T`<p class="winter-when">${r.t("winter.editor_when", { when: a })}</p>` : this._renderWinterNever(t)}
        ${u.map((e) => this._renderWinterGroup(t, e, n[e] ?? {}, s[e], c[e] ?? []))}
        ${this._winterChanged && !this._conflict ? T`<p class="notice" role="status">${r.t("winter.changed_elsewhere")}</p>` : E}
        ${this._conflict ? T`<p class="error" role="alert">${r.t("winter.conflict")}</p>` : E}
        ${this._error ? T`<p class="error" role="alert">${this._error}</p>` : E}
        <div class="actions dialog-actions"><span class="spacer"></span>
          <button type="button" @click=${() => this._closeDialog()}>${r.t("common.cancel")}</button>
          <button type="button" class="primary" ?disabled=${i || l || Object.keys(s).length > 0} @click=${() => void this._saveWinter(t.id)}>${r.t("winter.save")}</button></div>
      </div></dialog>`;
	}
	_renderWinterGroup(e, t, n, r, i) {
		let a = this._l, o = bc[t], s = Dc(e, t), c = Vc(a, e, t, n, s), l = t === "temperature" || t === "soil_temperature" ? Hc(a, e, t, n, s) : null, u = `winter-${t}-error`;
		return T`<fieldset class="winter-group"><legend><ha-icon aria-hidden="true" .icon=${P[t].icon}></ha-icon>${F(a, t)}</legend>
      <div class="winter-fields">${o.fields.map((e) => {
			let c = Ic(a, t, e.key, n[e.key], s), d = l !== null && e.key === "cold_threshold_celsius", f = `winter-${t}-${e.key}-hint`, p = !!r && i.includes(e.key);
			return T`<div class="winter-field"><label>${a.t(e.label)}<span class="field-suffix"><input type="number" step=${o.step} inputmode="decimal" class=${d ? "warn" : c.changed ? "changed" : ""}
            .value=${n[e.key] ?? ""} aria-invalid=${p ? "true" : "false"} aria-describedby=${p ? `${f} ${u}` : f}
            @input=${(n) => this._editWinter(t, { [e.key]: n.target.value })}><span aria-hidden="true">${o.unit}</span></span></label>
          <small id=${f} class=${d ? "warn" : ""}>${d ? l : c.text}${t === "illuminance" ? T` · ${a.t("winter.light_off_hint")}` : E}</small></div>`;
		})}</div>
      ${r ? T`<p class="error-text small" id=${u} role="alert">${r}</p>` : E}
      ${c ? T`<div class="winter-suggestion"><ha-icon aria-hidden="true" icon="mdi:snowflake"></ha-icon><span>${c.text}</span>
        <button type="button" class="btn text sm" @click=${() => this._editWinter(t, c.apply)}>${a.t("winter.use")}</button></div>` : E}
    </fieldset>`;
	}
	_renderWinterRemoveDialog(e) {
		let t = this._plantById(e);
		if (!t) return E;
		let n = this._l, r = this._formBusy || this._blocked || !!this._conflict;
		return T`<dialog class="care-dialog winter-remove-dialog" aria-labelledby="dialog-title" aria-describedby="winter-remove-body" @cancel=${(e) => {
			e.preventDefault(), this._closeDialog();
		}} @keydown=${(e) => this._trapFocus(e)}>
      <h2 id="dialog-title" tabindex="-1">${n.t("winter.remove_title")}</h2>
      <div class="dialog-body"><p id="winter-remove-body">${n.t("winter.remove_body", { name: t.name })}</p>
        <div class="actions dialog-actions"><span class="spacer"></span>
          <button type="button" @click=${() => this._closeDialog()}>${n.t("common.cancel")}</button>
          <button type="button" class="primary" ?disabled=${r} @click=${() => void this._removeWinter(t.id)}>${n.t("winter.remove")}</button></div>
      </div></dialog>`;
	}
	_renderHeader(e) {
		let t = this._l, n = this._overview[e.id], r = U(e, this._devices)?.area_id, i = e.species?.snapshot.latin_name ?? e.species?.snapshot.common_name ?? null, a = n ? an(t, n) : null, o = Au(t, e.snoozed_until, this._today(), this._timeZone()), s = this._formBusy || this._blocked || !!this._conflict, c = el(t, e, n?.winter);
		return T`<div class="sp-card header-card">
      <div class="hero">
        <sp-plant-photo size="large" .photoId=${e.image?.id ?? null} .photo=${this._imageFor === e.image?.id ? this._image : null} .thumbhash=${e.image ? this._photoMeta[e.image.id]?.thumbhash ?? null : null} .name=${e.name} .l=${t} @photo-error=${() => {
			this._imageError = t.t("photo.decode_failed");
		}}></sp-plant-photo>
        <div class="hero-text">
          <h2 class="hero-name">${e.name}</h2>
          <div class="hero-meta">${r ? T`<span><ha-icon aria-hidden="true" icon="mdi:texture-box"></ha-icon>${this._areaName(r)}</span>` : E}
            <span><ha-icon aria-hidden="true" icon="mdi:leaf"></ha-icon>${i ? T`<i>${i}</i>` : t.t("detail.no_species")}</span></div>
          ${n && a || o || c ? T`<div class="hero-status">${n && a ? T`<sp-status-chip .status=${n.status} .label=${a.label} .more=${a.more} .l=${t}></sp-status-chip>` : E}
            ${o ? T`<span class="snooze"><sp-snooze-chip .label=${o}></sp-snooze-chip><button type="button" class="btn text sm" ?disabled=${s} aria-label=${t.t("snooze.resume_label", { name: e.name })} @click=${() => this._resumeSnooze(e.id)}>${t.t("snooze.resume")}</button></span>` : E}
            ${c ? T`<button type="button" class="winter-chip" aria-expanded=${this._winterOpen ? "true" : "false"} aria-controls="winter-box" @click=${() => {
			this._winterOpen = !this._winterOpen;
		}}><ha-icon aria-hidden="true" icon="mdi:snowflake"></ha-icon><span>${c}</span><ha-icon class="caret" aria-hidden="true" .icon=${this._winterOpen ? "mdi:menu-up" : "mdi:menu-down"}></ha-icon></button>` : E}
            ${n ? T`<span class="reason">${vl(t, n)}${il(e, n) ? T` · ${t.t("winter.hint_storage")} <button type="button" class="btn text sm" ?disabled=${s} @click=${() => this._openWinterEditor(e)}>${t.t("winter.add")}</button>` : E}</span>` : E}</div>` : E}
          ${c && this._winterOpen && n?.winter ? this._renderWinterBox(e, n.winter) : E}
          ${this._renderCareChips(e, n)}
        </div>
        <div class="hero-actions">
          <div class="hero-buttons">
            <button type="button" class="btn filled" ?disabled=${this._blocked || this._watering.has(e.id) || !!this._conflict} @click=${() => void this._logWatering(e.id)}><ha-icon aria-hidden="true" icon="mdi:water"></ha-icon>${t.t("card.log_watering")}</button>
            <button type="button" class="btn outline" @click=${() => this._openCareForm()}><ha-icon aria-hidden="true" icon="mdi:note-edit-outline"></ha-icon>${t.t("detail.log_care")}</button>
          </div>
          <ha-dropdown class="plant-menu" @wa-select=${(t) => this._handlePlantAction(e, t.detail.item.value)}>
            <button slot="trigger" type="button" class="icon-btn" aria-label=${t.t("detail.plant_menu", { name: e.name })}><ha-icon aria-hidden="true" icon="mdi:dots-vertical"></ha-icon></button>
            <ha-dropdown-item value="snooze" ?disabled=${s || e.lifecycle_state !== "active"}>${Du(e.snoozed_until) ? t.t("snooze.menu_change") : t.t("snooze.menu")}<ha-icon slot="icon" icon="mdi:alarm-snooze"></ha-icon></ha-dropdown-item>
            <wa-divider role="separator"></wa-divider>
            <ha-dropdown-item value="open-device" ?disabled=${!U(e, this._devices)}>${t.t("detail.menu_open_device")}<ha-icon slot="icon" icon="mdi:open-in-new"></ha-icon></ha-dropdown-item>
            <ha-dropdown-item value="download-diagnostics">${t.t("detail.menu_download")}<ha-icon slot="icon" icon="mdi:download"></ha-icon></ha-dropdown-item>
            <wa-divider role="separator"></wa-divider>
            <ha-dropdown-item value="toggle-monitoring" ?disabled=${s}>${e.lifecycle_state === "active" ? t.t("manage.pause") : t.t("manage.resume")}<ha-icon slot="icon" .icon=${e.lifecycle_state === "active" ? "mdi:pause-circle-outline" : "mdi:play-circle-outline"}></ha-icon></ha-dropdown-item>
            <ha-dropdown-item value="retire-plant" ?disabled=${s}>${t.t("manage.retire_menu")}<ha-icon slot="icon" icon="mdi:archive-outline"></ha-icon></ha-dropdown-item>
            <ha-dropdown-item value="delete-plant" ?disabled=${s}>${t.t("manage.delete")}<ha-icon slot="icon" icon="mdi:delete-outline"></ha-icon></ha-dropdown-item>
          </ha-dropdown>
        </div>
      </div>
      ${yl(t, n)}
    </div>`;
	}
	_renderCareChips(e, t) {
		let n = this._l, r = lc(t);
		if (!r.length) return E;
		let i = this._today(), a = r.slice(0, 2).map((t) => {
			let r = e.care_tasks?.find((e) => e.id === t.task_id), a = r ? Os(n, t, r.schedule, i, {
				lastDoneAt: r.last_done_at,
				timeZone: this._timeZone()
			}) : null;
			return T`<li class="cchip tone-${a?.tone ?? "care"}"><ha-icon aria-hidden="true" .icon=${a?.icon ?? "mdi:calendar-clock"}></ha-icon><span>${cc(n, t)}${a?.tone === "overdue" ? T`<span class="sr-only"> (${a.text})</span>` : E}</span></li>`;
		});
		return T`<ul class="care-chips" aria-label=${n.t("care_plan.due_chips_label")}>${a}${r.length > 2 ? T`<li class="cchip tone-later"><span aria-hidden="true">+${n.number(r.length - 2)}</span><span class="sr-only">${n.t("care_plan.more_due", { count: r.length - 2 })}</span></li>` : E}</ul>`;
	}
	_renderTabs() {
		let e = this._l;
		return Y("ha-tab-group") ? T`<ha-tab-group class="tabs" @wa-tab-show=${(e) => this._selectSection(e.detail.name)}>
        ${al.map((t) => T`<ha-tab-group-tab slot="nav" .panel=${t} .active=${this._detailSection === t}>${e.t(ol[t])}</ha-tab-group-tab>`)}</ha-tab-group>` : T`<div class="tablist" role="tablist" aria-label=${e.t("detail.sections_label")} @keydown=${(e) => {
			let t = al.indexOf(this._detailSection), n = e.key === "ArrowRight" ? (t + 1) % al.length : e.key === "ArrowLeft" ? (t + al.length - 1) % al.length : e.key === "Home" ? 0 : e.key === "End" ? al.length - 1 : -1;
			n < 0 || (e.preventDefault(), this._selectSection(al[n]), this.updateComplete.then(() => this.shadowRoot?.querySelector(`#tab-${al[n]}`)?.focus()));
		}}>${al.map((t) => {
			let n = this._detailSection === t;
			return T`<button type="button" role="tab" id=${`tab-${t}`} aria-controls="detail-panel" aria-selected=${n ? "true" : "false"} tabindex=${n ? "0" : "-1"} @click=${() => this._selectSection(t)}>${e.t(ol[t])}</button>`;
		})}</div>`;
	}
	_renderOverviewTab(e) {
		let t = this._l, n = this._overview[e.id], r = ml(n), i = this._careHistory, a = i?.events.slice(0, 3) ?? [], o = U(e, this._devices), s = !e.placement || !e.acquired_at || !e.category || !e.tags.length, c = e.species?.snapshot, l = c ? Mi(c, t.language) : null;
		return T`<div class="cols">
      <div class="stack">
        <section class="sp-card" aria-labelledby="readings-heading"><div class="card-h"><h3 id="readings-heading">${t.t("readings.heading")}</h3>
          ${r.length ? T`<button type="button" class="btn text sm" @click=${() => this._openSection("sensors")}>${t.t("readings.manage")}</button>` : E}</div>
          ${r.length ? T`<ul class="list">${r.map(([e, n]) => bl(t, e, n, this._states))}</ul>` : !n && this._overviewError ? T`<p class="card-b muted">${t.t("readings.unavailable")}</p>` : T`<div class="card-b"><div class="empty-box"><span>${n?.status === "paused" ? t.t("readings.paused") : t.t("readings.empty")}</span><button type="button" class="btn tonal sm" @click=${() => this._openSection("sensors")}>${t.t("readings.assign")}</button></div></div>`}
        </section>
        ${this._renderHistory(e)}
        <section class="sp-card" aria-labelledby="recent-heading"><div class="card-h"><h3 id="recent-heading">${t.t("recent.heading")}</h3>
          ${i?.events.length ? T`<button type="button" class="btn text sm" @click=${() => this._openSection("care")}>${t.t("recent.show_all")}</button>` : E}</div>
          <div class="care-content">${i ? a.length ? T`<ul class="list">${a.map((e) => T`<li class="li"><span class="ic tonal" aria-hidden="true"><ha-icon .icon=${cl[e.kind]}></ha-icon></span>
            <span class="li-main"><span class="li-title">${t.t(`care_done.${e.kind}`)}</span><span class="li-sub">${t.date(e.local_date)}</span></span><span></span></li>`)}</ul>` : T`<div class="card-b"><div class="empty-box"><span>${t.t("care.empty")}</span><button type="button" class="btn tonal sm" @click=${() => this._openCareForm()}>${t.t("detail.log_care")}</button></div></div>` : this._renderCareMissing(e.id)}</div>
        </section>
      </div>
      <div class="stack">
        <section class="sp-card" aria-labelledby="about-heading"><div class="card-h"><h3 id="about-heading">${t.t("about.heading")}</h3>
          <button type="button" class="icon-btn" aria-label=${t.t("about.edit")} @click=${() => this._openSection("settings")}><ha-icon aria-hidden="true" icon="mdi:pencil-outline"></ha-icon></button></div>
          <div class="card-b"><dl class="kv about">
            <dt>${t.t("about.species")}</dt><dd>${c ? T`${c.latin_name ? T`<i>${c.latin_name}</i>` : E}${l && l !== c.latin_name ? T`${c.latin_name ? " · " : ""}${l}` : E}
              <div class="small muted">${c.source_status === "provider" ? t.t("about.species_provider", { provider: c.provider === "openplantbook" ? "OpenPlantBook" : c.provider }) : t.t("about.species_manual")}</div>` : T`<button type="button" class="btn text sm" @click=${() => this._openSetting("species")}>${t.t("about.add_species")}</button>`}</dd>
            <dt>${t.t("about.area")}</dt><dd>${o?.area_id ? this._areaName(o.area_id) : t.t("area.none")}</dd>
            ${e.placement ? T`<dt>${t.t("about.placement")}</dt><dd>${((e) => e.charAt(0).toLocaleUpperCase() + e.slice(1))(ea(t, e.placement.mode))}</dd>` : E}
            ${e.acquired_at ? T`<dt>${t.t("about.since")}</dt><dd>${t.date(e.acquired_at.slice(0, 10))}</dd>` : E}
            ${e.category ? T`<dt>${t.t("about.category")}</dt><dd>${e.category}</dd>` : E}
            ${e.tags.length ? T`<dt>${t.t("about.tags")}</dt><dd>${e.tags.map((e) => T`<span class="tag">${e}</span>`)}</dd>` : E}
          </dl>
          ${s ? T`<button type="button" class="btn text sm" @click=${() => this._openSection("settings")}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("about.add_details")}</button>` : E}</div></section>
        ${this._renderAutomations(o)}
      </div></div>`;
	}
	_renderAutomations(e) {
		let t = this._l, n = Fd(this._related, this._relatedAllPlants, this._states, t.language), r = e ? `/config/automation/edit/new?add_automation_element=trigger&target_device_id=${encodeURIComponent(e.id)}` : "", i = e ? `/config/devices/device/${encodeURIComponent(e.id)}` : "", a = e ? T`<div class="row"><a class="btn outline sm" href=${i} @click=${(e) => this._internalLink(e, i)}><ha-icon aria-hidden="true" icon="mdi:devices"></ha-icon>${t.t("automations.open_device")}</a>
      <a class="btn outline sm" href=${r} @click=${(e) => this._internalLink(e, r)}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${t.t("automations.create")}</a></div>` : E, o = n.plant.length > 0 || n.allPlants.length > 0, s = e ? T`<div class="row"><button type="button" class="btn text sm" @click=${(e) => this._openNotifications(e.currentTarget)}><ha-icon aria-hidden="true" icon="mdi:bell-outline"></ha-icon>${t.t("automations.notifications")}</button></div>` : E;
		return T`<section class="sp-card" aria-labelledby="automations-heading"><div class="card-h"><h3 id="automations-heading">${t.t("automations.heading")}</h3></div>
      ${o ? T`${this._renderAutomationGroup("plant", n.plant)}${this._renderAutomationGroup("allPlants", n.allPlants)}
        <div class="card-b rel-foot"><p class="small muted">${t.t("automations.not_listed")}</p>${a}${s}</div>` : T`<div class="card-b"><p class="small muted">${t.t("automations.body")}</p>${a}${s}</div>`}</section>`;
	}
	_renderAutomationGroup(e, t) {
		if (!t.length) return E;
		let n = this._l, { shown: r, more: i } = Id(t, this._relatedExpanded.has(e)), a = e === "plant" ? "automations-plant" : "automations-all-plants";
		return T`${e === "allPlants" ? T`<h4 class="rel-group" id="automations-all-plants-heading">${n.t("automations.all_plants")}</h4>` : E}
      <ul class="list rel" id=${a} tabindex="-1" aria-labelledby=${e === "plant" ? "automations-heading" : "automations-all-plants-heading"}>${r.map((e) => this._renderAutomationRow(e))}</ul>
      ${i ? T`<div class="rel-more"><button type="button" class="btn text sm" @click=${() => this._showAllAutomations(e, a)}>${n.t("automations.show_all", { count: t.length })}</button></div>` : E}`;
	}
	_renderAutomationRow(e) {
		let t = this._l, n = e.editPath, r = (this._notifications ?? []).some((t) => t.entityId === e.entityId), i = e.status === "on" ? "tonal" : e.status === "unavailable" ? "tone-bad" : "", a = e.status === "off" ? T`<span class="cchip tone-later">${t.t("automations.off")}</span>` : e.status === "unavailable" ? T`<span class="cchip tone-overdue"><ha-icon aria-hidden="true" icon="mdi:alert-circle-outline"></ha-icon>${t.t("automations.unavailable")}</span>` : E, o = T`<span class="ic ${i}" aria-hidden="true"><ha-icon icon=${r ? "mdi:bell-outline" : "mdi:robot"}></ha-icon></span>
      <span class="li-main"><span class="li-title">${e.name}</span><span class="li-sub">${r ? T`<span class="rel-kind">${t.t("automations.notification")}</span> · ` : E}${Ld(t, e)}</span></span>
      <span class="rel-end">${a}${n ? T`<ha-icon aria-hidden="true" icon="mdi:chevron-right"></ha-icon>` : E}</span>`;
		return T`<li>${n ? T`<a class="li" href=${n} @click=${(e) => this._internalLink(e, n)}>${o}</a>` : T`<div class="li">${o}</div>`}</li>`;
	}
	_showAllAutomations(e, t) {
		let n = new Set(this._relatedExpanded);
		n.add(e), this._relatedExpanded = n, this.updateComplete.then(() => {
			let e = this.shadowRoot?.querySelector(`#${t}`);
			(e?.querySelector("li:nth-child(n+6) a") ?? e)?.focus();
		});
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
		return T`<div class="setrow"><div><div class="setrow-h" id=${`setting-${e}`}>${t}</div><div class="setrow-d">${n}</div></div>
      <button type="button" class="btn text sm" aria-expanded=${s ? "true" : "false"} aria-controls=${`setting-${e}-editor`} ?disabled=${a} @click=${() => s ? this._closeSetting(e) : this._openSetting(e)}>${s ? o.t("settings.close") : r}</button>
      ${s ? T`<div class="setrow-editor" id=${`setting-${e}-editor`}>${i()}</div>` : E}</div>`;
	}
	_renderSettingsTab(e) {
		let t = this._l, n = this._edits, r = H(e), i = this._formBusy || this._blocked || !!this._conflict, a = U(e, this._devices), o = e.species?.snapshot, s = o ? o.latin_name ?? o.common_name ?? t.t("snapshot.species") : "", c = o ? T`<i>${s}</i> · ${o.source_status === "provider" ? t.t("settings.species_provider", {
			provider: o.provider === "openplantbook" ? "OpenPlantBook" : o.provider,
			date: t.date(o.fetched_at.slice(0, 10))
		}) : t.t("about.species_manual")}` : t.t("settings.species_none"), l = Y("ha-area-picker") && this.hass ? T`<ha-area-picker .hass=${this.hass} .label=${t.t("area.label")} .value=${n.area || void 0} .noAdd=${!0} .disabled=${i || !!this._registryError || this._areaReview} @value-changed=${(e) => this._edit({ area: e.detail.value ?? "" })}></ha-area-picker>` : T`<fieldset ?disabled=${i || !!this._registryError || this._areaReview}>${aa(t, n.area, this._areas, (e) => this._edit({ area: e }))}</fieldset>`, u = this._defaults(e), d = r ? V.some((e) => r.threshold_defaults[e].source === "provider") : !1, f = r && V.some((e) => r.threshold_overrides[e] !== null) ? t.t(d ? "targets.custom_species" : "targets.custom_defaults") : t.t(d ? "targets.from_species" : "targets.from_defaults"), p = {
			min: "targets.needs_water",
			target: "targets.ideal",
			max: "targets.too_wet"
		}, m = e.lifecycle_state === "active";
		return T`<section class="sp-card" aria-labelledby="plant-settings-heading"><div class="card-h"><h3 id="plant-settings-heading">${t.t("settings.plant_heading")}</h3></div>
        ${this._settingRow("name", t.t("settings.name"), e.name, t.t("settings.rename"), () => T`<fieldset ?disabled=${i}>${Qi(t.t("detail.name"), n.name, (e) => this._edit({ name: e }))}
          <div class="actions"><button type="button" @click=${() => {
			this._edit({ name: e.name }), this._closeSetting("name");
		}}>${t.t("common.cancel")}</button>${this._saveButton("identity", t.t("settings.save_name"))}</div></fieldset>`)}
        ${this._settingRow("area", t.t("settings.area"), t.t("settings.area_value", { area: this._areaName(a?.area_id ?? "") }), t.t("settings.change_area"), () => T`
          ${this._areaReview ? T`<p class="notice">${t.t("detail.area_review")}</p><div class="row"><button type="button" @click=${() => this._areaReview = !1}>${t.t("detail.area_reviewed")}</button><button type="button" @click=${() => {
			this._edit({ area: this._baseArea }), this._areaReview = !1;
		}}>${t.t("detail.area_use_current")}</button></div>` : E}
          ${l}<div class="actions"><button type="button" ?disabled=${i} @click=${() => {
			this._edit({ area: this._baseArea }), this._closeSetting("area");
		}}>${t.t("common.cancel")}</button><button type="button" class="primary" ?disabled=${i || !!this._registryError || this._areaReview} @click=${() => void this._save("area")}>${t.t("detail.save_area")}</button></div>`, this._areaReview)}
        ${this._renderPhotoRow(e)}
        ${this._settingRow("species", t.t("settings.species"), c, o ? t.t("settings.change_species") : t.t("settings.find_species"), () => T`
          ${e.species ? ha(t, e.species.snapshot, void 0, e) : E}<fieldset ?disabled=${i}>
          ${e.species?.snapshot.provider_ref ? T`<button type="button" @click=${() => void this._previewSpecies()}>${t.t("species.preview_refresh")}</button>` : E}
          ${$i(t, t.t("species.provider"), this._provider, [{
			value: "manual",
			label: t.t("species.manual")
		}, ...this._capabilities?.providers.filter((e) => e.available && e.search_supported).map((e) => ({
			value: e.provider,
			label: e.provider === "openplantbook" ? "OpenPlantBook" : e.provider
		})) ?? []], (e) => {
			this._providerRequest++, this._provider = e, this._preview = null, this._results = [];
		})}
          ${this._provider === "manual" ? T`${Qi(t.t("species.common_name"), n.common, (e) => this._edit({ common: e }))}${Qi(t.t("species.scientific_name"), n.latin, (e) => this._edit({ latin: e }))}<p class="small muted">${t.t("species.manual_hint")}</p><div class="actions">${this._saveButton("species", t.t("species.save_manual"))}</div>` : T`${Qi(t.t("species.search"), this._query, (e) => {
			this._query = e, this._providerRequest++, this._results = [], this._preview = null;
		}, "text", 100)}<div class="actions"><button type="button" @click=${() => void this._searchSpecies()}>${t.t("species.search")}</button></div><ul class="result-list">${this._results.map((e) => T`<li><button type="button" @click=${() => void this._previewSpecies(e)}>${e.common_name ?? e.latin_name} · ${e.latin_name}</button><small>${e.attribution}</small></li>`)}</ul><button type="button" @click=${() => {
			this._provider = "manual", this._providerRequest++, this._preview = null;
		}}>${t.t("common.continue_manually")}</button>`}</fieldset>`)}
      </section>
      <section class="sp-card" aria-labelledby="targets-heading"><div class="card-h"><h3 id="targets-heading">${t.t("targets.heading")}</h3></div>
        <div class="card-b">${r && n.moisture ? T`<p class="small muted">${f}</p>
          <fieldset ?disabled=${i}><div class="thr">${V.map((e) => {
			let r = n.moisture.threshold_overrides[e];
			return T`<div><label>${t.t(p[e])}<span class="field-suffix"><input type="number" min="1" max="99" step="1" inputmode="numeric" aria-label=${t.t(p[e])} .value=${r === null ? "" : String(r)} placeholder=${String(u[e])}
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
            <button type="button" class="btn filled sm" @click=${() => void this._save("moisture")}>${t.t("targets.save")}</button></div></fieldset>` : T`<p class="error" role="alert">${t.t("moisture.incompatible")}</p>`}</div></section>
      ${this._renderWinterCard(e)}
      ${this._expander("other_targets", "mdi:tune-variant", t.t("other_targets.heading"), t.t("other_targets.secondary"), () => this._renderOtherTargets(e))}
      ${this._expander("more_details", "mdi:tag-outline", t.t("more_details.heading"), t.t("more_details.secondary"), () => T`
        <fieldset ?disabled=${i}>${sa(t, n.placement, (e) => this._edit({ placement: e }))}
          ${ca(t, n.wateringDetection, n.placement, (e) => this._edit({ wateringDetection: e }))}
          <label>${t.t("detail.acquired")}<input type="date" .value=${n.acquired.slice(0, 10)} @input=${(e) => this._edit({ acquired: e.target.value })}></label>
          <div class="actions">${this._saveButton("identity", t.t("more_details.save_identity"))}</div></fieldset>
        <fieldset ?disabled=${i}>${Qi(t.t("taxonomy.category"), n.category, (e) => this._edit({ category: e }), "text", 60)}${Qi(t.t("taxonomy.tags"), n.tagText, (e) => this._edit({ tagText: e }), "text", 2e3)}<p class="small muted">${t.t("taxonomy.hint")}</p>
          <div class="actions">${this._saveButton("taxonomy", t.t("taxonomy.save"))}</div></fieldset>`)}
      <section class="sp-card" aria-labelledby="manage-heading"><div class="card-h"><h3 id="manage-heading">${t.t("manage.heading")}</h3></div>
        <div class="setrow"><div><div class="setrow-h">${m ? t.t("manage.pause") : t.t("manage.resume")}</div><div class="setrow-d">${m ? t.t("manage.pause_hint") : t.t("manage.resume_hint")}</div></div>
          <button type="button" class="btn outline sm" ?disabled=${i} @click=${() => this._toggleMonitoring(e)}>${m ? t.t("manage.pause_button") : t.t("manage.resume_button")}</button></div>
        <div class="setrow"><div><div class="setrow-h">${t.t("manage.retire")}</div><div class="setrow-d">${t.t("manage.retire_hint")}</div></div>
          <button type="button" class="btn outline sm" ?disabled=${i} @click=${() => this._openDialog("retire")}>${t.t("manage.retire_button")}</button></div>
        <div class="setrow"><div><div class="setrow-h">${t.t("manage.delete")}</div><div class="setrow-d">${t.t("manage.delete_hint")}</div></div>
          <button type="button" class="btn danger sm" ?disabled=${i} @click=${() => this._openDialog("delete")}>${t.t("manage.delete_button")}</button></div>
      </section>`;
	}
	_renderDetail(e) {
		let t = this._l, n = this._plantById(e), r = this._edits;
		if (!n || !r) return T`<p>${t.t("detail.not_found")}</p>`;
		let i = this._conflict ? this._sourceConflictFields(this._conflict.after) : [];
		return T`<div class="pd">
      ${this._conflict ? T`<section class="notice" role="alert"><h2>${t.t("conflict.heading")}</h2><p>${t.t("conflict.revision", {
			before: this._conflict.before.revision,
			after: this._conflict.after.revision
		})}</p><ul>${this._conflict.changes.map((e) => T`<li class="prose">${e}</li>`)}</ul>${i.length ? T`<p>${t.t("conflict.source_overlap", { fields: this._sourceFieldList(i) })}</p>` : E}<div class="actions"><button @click=${() => this._reviewConflict()}>${t.t("conflict.retain")}</button><button @click=${() => this._beginEdit(n)}>${t.t("conflict.discard")}</button></div></section>` : E}
      ${this._overviewError ? this._renderStatusError() : E}
      ${this._renderHeader(n)}
      ${this._renderTabs()}
      <div class="tabpanel" id="detail-panel" role="tabpanel" aria-label=${t.t(ol[this._detailSection])}>${{
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
	_notifyCreated(e) {
		!this._formBusy && this._plantById(e) && (this._openCreated(e), this._openNotifications(null));
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
		if (d(o ? u : n ? c.t("created.photo_skipped") : ""), this._refresh(!1), o && i) {
			try {
				if (await du(n, c), !this.isConnected || this.hass?.connection !== i.connection || this._blocked) return;
				let e = await Xd(i, t.id, t.revision, n, (e) => e.image === null);
				if (!this.isConnected || this.hass?.connection !== i.connection) return;
				this._base?.id === t.id && this._base.revision < e.revision && !this._formBusy && this._photoUploaded(this._base, e), this._createdPlantId === t.id && d(c.t("created.photo_uploaded"));
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
	_renderSidebarButton() {
		return Y("ha-menu-button") ? T`<ha-menu-button slot="navigationIcon" .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>` : !this.narrow && this.hass?.dockedSidebar !== "always_hidden" ? E : T`<ha-icon-button slot="navigationIcon" class="sidebar-toggle" .label=${this.hass?.localize?.("ui.sidebar.sidebar_toggle") || this._l.t("panel.sidebar")} .path=${Gd} @click=${() => this.dispatchEvent(new CustomEvent("hass-toggle-menu", {
			bubbles: !0,
			composed: !0
		}))}></ha-icon-button>`;
	}
	render() {
		let e = this._l;
		if (this.hass?.user?.is_admin === !1) return T`<main><div class="panel-content"><p role="alert">${e.t("panel.admin_required")}</p></div></main>`;
		let t = this.hass?.localize?.("ui.common.menu") || e.t("panel.menu"), n = this._view.kind === "detail" ? this._plantById(this._view.plantId) : void 0, r = this._notificationCount(), i = T`<ha-dropdown-item value="notifications">${e.t("overview.menu_notifications")}<ha-icon slot="icon" icon="mdi:bell-outline"></ha-icon>${r ? T`<span slot="details" class="menu-count">${r}</span>` : E}</ha-dropdown-item>`, a = r && this._view.kind !== "create" && this._view.kind !== "notifications" ? T`<ha-icon-button slot="actionItems" class="header-bell" .label=${e.tn(r, "panel.bell_one", "panel.bell_other")} .path=${Ud}
      @click=${() => this._openNotificationsPage()}></ha-icon-button>` : E, o = this._archivedCount && this._view.kind === "list" ? T`<ha-icon-button slot="actionItems" class="header-archive" .label=${e.t("archive.menu")} .path=${Wd}
      @click=${() => {
			this._formBusy || this._openArchive(null);
		}}></ha-icon-button>` : E;
		return T`<main><ha-top-app-bar-fixed class="panel-appbar" .narrow=${this.narrow}>
       ${this._view.kind === "detail" ? T`<ha-icon-button slot="navigationIcon" class="back" .label=${e.t("detail.back")} .path=${Hd} @click=${() => {
			this._formBusy || this._show({ kind: "list" });
		}}></ha-icon-button>` : this._view.kind === "notifications" ? T`<ha-icon-button slot="navigationIcon" class="back" .label=${e.t("detail.back")} .path=${Hd} @click=${() => this._leaveNotifications()}></ha-icon-button>` : this._view.kind === "archive" ? T`<ha-icon-button slot="navigationIcon" class="back" .label=${e.t("detail.back")} .path=${Hd} @click=${() => {
			this._view.kind === "archive" && this._view.plantId && this._archivedCount ? this._openArchive(null, !0) : this._show({ kind: "list" });
		}}></ha-icon-button>` : this._renderSidebarButton()}
       <h1 slot="title" class="page-title" tabindex="-1">${n ? n.name : this._view.kind === "notifications" ? e.t("notifications.title") : this._view.kind === "archive" ? e.t("archive.title") : "Smart Plants"}</h1>
       ${o}${a}
       <ha-dropdown slot="actionItems" @wa-select=${this._handleMenuAction}>
         <ha-icon-button slot="trigger" .label=${t} .path=${Bd}></ha-icon-button>
         ${this._view.kind !== "list" && this._view.kind !== "detail" ? T`<ha-dropdown-item value="back-to-overview" ?disabled=${this._formBusy}>${e.t("panel.back_to_overview")}</ha-dropdown-item>` : E}
         <ha-dropdown-item value="add-plant" ?disabled=${this._blocked}>${e.t("panel.add_plant")}<ha-svg-icon slot="icon" .path=${Vd}></ha-svg-icon></ha-dropdown-item>
         ${this._view.kind === "list" || this._view.kind === "detail" ? T`<wa-divider role="separator"></wa-divider>${i}` : E}
         ${this._view.kind === "list" && this._archivedCount ? T`<ha-dropdown-item value="archive">${e.t("archive.menu")}<ha-icon slot="icon" icon="mdi:archive-outline"></ha-icon><span slot="details" class="menu-count">${this._archivedCount}</span></ha-dropdown-item>` : E}
         ${this._view.kind === "list" && this._activePlants().length >= 2 ? T`<ha-dropdown-item value="snooze-all" ?disabled=${this._formBusy || this._blocked}>${e.t("snooze.menu_all")}<ha-icon slot="icon" icon="mdi:alarm-snooze"></ha-icon></ha-dropdown-item>` : E}
         <wa-divider role="separator"></wa-divider>
         <ha-dropdown-item value="integration-options">${e.t("overview.integration_options")}<ha-icon slot="icon" icon="mdi:cog-outline"></ha-icon></ha-dropdown-item>
         <ha-dropdown-item value="documentation">${e.t("overview.documentation")}<ha-icon slot="icon" icon="mdi:help-circle-outline"></ha-icon></ha-dropdown-item>
       </ha-dropdown>
       <div class="panel-content">${this._updateAvailable ? T`<div class="update-banner" role="status"><p>${e.t("panel.update_available")}</p><button type="button" @click=${() => this._reload()}>${e.t("panel.reload")}</button></div>` : E}${this._error ? T`<p class="error" role="alert">${this._error}</p>` : E}${this._notice ? T`<p class="notice" role="status">${this._notice}</p>` : E}${this._registryError ? T`<p class="notice" role="alert">${e.t("panel.registry_unavailable")}</p>` : E}${this._view.kind === "list" && this._rejected.length ? T`<p class="notice" role="status">${e.tn(this._rejected.length, "notice.unreadable_one", "notice.unreadable_other")}</p>` : E}
      ${this._creationNotice && this._view.kind !== "create" ? T`<p class="notice" role="status">${this._creationNotice}</p>${this._createdPlantId && (this._view.kind !== "detail" || this._view.plantId !== this._createdPlantId) ? T`<button ?disabled=${this._formBusy} @click=${() => {
			this._createdPlantId && this._show({
				kind: "detail",
				plantId: this._createdPlantId
			});
		}}>${e.t("panel.open_created")}</button>` : E}` : E}
      ${this._view.kind === "list" && this._overviewError ? this._renderStatusError() : E}
      <smart-plants-overview ?hidden=${this._view.kind !== "list"} .l=${e} .plants=${this._plants} .overview=${this._overview} .areaNames=${this._plantAreaNames()}
        .thumbnails=${this._thumbnails} .photoMeta=${this._photoMeta} .watering=${this._watering} .timeZone=${this._timeZone()} .loading=${this._loading} .pending=${!this._statusRead} .blocked=${this._blocked}
        @photo-wanted=${(e) => this._thumbnailNear(e.detail.photoId)} @open-plant=${(e) => this._openFromOverview(e.detail)} @add-plant=${() => this._show({ kind: "create" })} @log-watering=${(e) => void this._logWatering(e.detail.plantId)}></smart-plants-overview>
      ${this._view.kind === "detail" ? this._renderDetail(this._view.plantId) : E}
      ${this._view.kind === "notifications" ? T`<smart-plants-notifications-page .hass=${this.hass} .l=${e} .plants=${this._plants} .devices=${this._devices} .states=${this._states} .found=${this._notifications}
        @notifications-add=${(e) => this._openNotifications(e.detail.trigger)}></smart-plants-notifications-page>` : E}
      ${this._view.kind === "archive" ? T`<smart-plants-archive .hass=${this.hass} .l=${e} .plantId=${this._view.plantId} .archivedCount=${this._archivedCount}
        @archive-open=${(e) => this._openArchive(e.detail.plantId, e.detail.replace ?? !1)}
        @archive-close=${() => this._show({ kind: "list" })}
        @archive-restored=${(e) => void this._restored(e.detail.plant)}
        @archive-deleted=${(e) => void this._archiveDeleted(e.detail.name)}></smart-plants-archive>` : E}
      ${this._notificationsOpen && this._view.kind !== "create" ? T`<smart-plants-notifications .hass=${this.hass} .l=${e} .plants=${this._plants} .devices=${this._devices} .entities=${this._entities} .states=${this._states} .found=${this._notifications} .plantId=${n?.id ?? null}
        @notifications-close=${() => this._closeNotifications()}></smart-plants-notifications>` : E}
      ${this._dialog === "snooze_all" && this._view.kind === "list" ? this._renderSnoozeAllDialog() : E}
      ${this._wizardStarted && this._capabilities ? T`<div ?hidden=${this._view.kind !== "create"}><smart-plants-wizard .hass=${this.hass} .capabilities=${this._capabilities} .areas=${this._areas} .entities=${this._entities} .devices=${this._devices} .states=${this._states} .blocked=${this._blocked} .navigationContext=${this._context} .photoStatus=${this._creationPhoto} @plant-created=${(e) => void this._created(e)} @wizard-close=${() => this._closeWizard()} @wizard-open-plant=${(e) => this._openCreated(e.detail.plantId)} @wizard-notifications=${(e) => this._notifyCreated(e.detail.plantId)} @wizard-restart=${() => this._clearCreationNotice()} @backend-unavailable=${(e) => {
			this._blocked = !0, this._error = e.detail;
		}}></smart-plants-wizard></div>` : E}
        <p role="status" aria-live="polite">${this._formBusy ? e.t("panel.busy") : ""}</p></div></ha-top-app-bar-fixed></main>`;
	}
};
Rd = $, Rd.styles = [
	G,
	ya,
	ju,
	kl,
	Kl,
	ga
], Rd.bundleVersion = gu(import.meta.url), K([O({ attribute: !1 })], $.prototype, "hass", void 0), K([O({ attribute: !1 })], $.prototype, "panel", void 0), K([O({
	type: Boolean,
	reflect: !0
})], $.prototype, "narrow", void 0), K([O({ attribute: !1 })], $.prototype, "route", void 0), K([k()], $.prototype, "_plants", void 0), K([k()], $.prototype, "_loading", void 0), K([k()], $.prototype, "_error", void 0), K([k()], $.prototype, "_notice", void 0), K([k()], $.prototype, "_view", void 0), K([k()], $.prototype, "_detailSection", void 0), K([k()], $.prototype, "_formBusy", void 0), K([k()], $.prototype, "_capabilities", void 0), K([k()], $.prototype, "_updateAvailable", void 0), K([k()], $.prototype, "_blocked", void 0), K([k()], $.prototype, "_areas", void 0), K([k()], $.prototype, "_entities", void 0), K([k()], $.prototype, "_devices", void 0), K([k()], $.prototype, "_states", void 0), K([k()], $.prototype, "_evaluations", void 0), K([k()], $.prototype, "_health", void 0), K([k()], $.prototype, "_healthError", void 0), K([k()], $.prototype, "_careHistory", void 0), K([k()], $.prototype, "_historyRole", void 0), K([k()], $.prototype, "_historyRange", void 0), K([k()], $.prototype, "_history", void 0), K([k()], $.prototype, "_careError", void 0), K([k()], $.prototype, "_careLoadError", void 0), K([k()], $.prototype, "_careDate", void 0), K([k()], $.prototype, "_careNote", void 0), K([k()], $.prototype, "_careKind", void 0), K([k()], $.prototype, "_careFields", void 0), K([k()], $.prototype, "_careEditingId", void 0), K([k()], $.prototype, "_registryError", void 0), K([k()], $.prototype, "_areaReview", void 0), K([k()], $.prototype, "_overview", void 0), K([k()], $.prototype, "_overviewError", void 0), K([k()], $.prototype, "_statusRead", void 0), K([k()], $.prototype, "_thumbnails", void 0), K([k()], $.prototype, "_photoMeta", void 0), K([k()], $.prototype, "_watering", void 0), K([k()], $.prototype, "_edits", void 0), K([k()], $.prototype, "_conflict", void 0), K([k()], $.prototype, "_allSensors", void 0), K([k()], $.prototype, "_preview", void 0), K([k()], $.prototype, "_provider", void 0), K([k()], $.prototype, "_query", void 0), K([k()], $.prototype, "_results", void 0), K([k()], $.prototype, "_related", void 0), K([k()], $.prototype, "_relatedAllPlants", void 0), K([k()], $.prototype, "_relatedExpanded", void 0), K([k()], $.prototype, "_image", void 0), K([k()], $.prototype, "_imageLoading", void 0), K([k()], $.prototype, "_imageError", void 0), K([k()], $.prototype, "_dialog", void 0), K([k()], $.prototype, "_archivedCount", void 0), K([k()], $.prototype, "_rejected", void 0), K([k()], $.prototype, "_snoozeDraft", void 0), K([k()], $.prototype, "_winterDraft", void 0), K([k()], $.prototype, "_winterChanged", void 0), K([k()], $.prototype, "_winterOpen", void 0), K([k()], $.prototype, "_restEditor", void 0), K([k()], $.prototype, "_taskEditor", void 0), K([k()], $.prototype, "_automateTaskId", void 0), K([k()], $.prototype, "_carePending", void 0), K([k()], $.prototype, "_careTaskId", void 0), K([k()], $.prototype, "_wizardStarted", void 0), K([k()], $.prototype, "_notificationsOpen", void 0), K([k()], $.prototype, "_notifications", void 0), K([k()], $.prototype, "_creationNotice", void 0), K([k()], $.prototype, "_creationPhoto", void 0), K([k()], $.prototype, "_createdPlantId", void 0), K([k()], $.prototype, "_thresholdRole", void 0), K([k()], $.prototype, "_thresholdEdits", void 0), K([k()], $.prototype, "_thresholdBaseline", void 0), K([k()], $.prototype, "_thresholdError", void 0), K([k()], $.prototype, "_thresholdSaved", void 0), K([k()], $.prototype, "_pendingThresholdSwitch", void 0), K([k()], $.prototype, "_sourceRole", void 0), K([k()], $.prototype, "_sourceEdits", void 0), K([k()], $.prototype, "_sourceBaseline", void 0), K([k()], $.prototype, "_sourceError", void 0), K([k()], $.prototype, "_sourceUnavailable", void 0), K([k()], $.prototype, "_sourceSaved", void 0), K([k()], $.prototype, "_pendingSourceSwitch", void 0), K([k()], $.prototype, "_sourceMode", void 0), K([k()], $.prototype, "_moistureMode", void 0), K([k()], $.prototype, "_moistureSourceError", void 0), K([k()], $.prototype, "_expanded", void 0), K([k()], $.prototype, "_opened", void 0), K([k()], $.prototype, "_settingsOpen", void 0), K([k()], $.prototype, "_careFilter", void 0), K([k()], $.prototype, "_careFormOpen", void 0), K([k()], $.prototype, "_allSourceSensors", void 0);
function uf(e) {
	let t = e.roles ?? {};
	return Lt.flatMap((e) => {
		let n = t[e], r = Array.isArray(n?.sources) ? n.sources : [], i = (typeof n?.primary_entity_id == "string" ? n.primary_entity_id : null) ?? (typeof r[0]?.entity_id == "string" ? r[0].entity_id : null);
		return i ? [{
			role: e,
			entity_id: i
		}] : [];
	});
}
customElements.get("smart-plants-panel") || customElements.define("smart-plants-panel", $);
export { $ as SmartPlantsPanel, uf as retiredSensors };

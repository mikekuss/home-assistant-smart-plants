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
})(e) : e, l, { is: u, defineProperty: d, getOwnPropertyDescriptor: f, getOwnPropertyNames: ee, getOwnPropertySymbols: te, getPrototypeOf: ne } = Object, p = globalThis, re = p.trustedTypes, ie = re ? re.emptyScript : "", ae = p.reactiveElementPolyfillSupport, m = (e, t) => e, oe = {
	toAttribute(e, t) {
		/**
		* @license
		* Copyright 2017 Google LLC
		* SPDX-License-Identifier: BSD-3-Clause
		*/
		switch (t) {
			case Boolean:
				e = e ? ie : null;
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
	converter: oe,
	reflect: !1,
	useDefault: !1,
	hasChanged: se
};
(l = Symbol).metadata ?? (l.metadata = Symbol("metadata")), p.litPropertyMetadata ?? (p.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
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
		return this.elementProperties.get(e) ?? ce;
	}
	static _$Ei() {
		if (this.hasOwnProperty(m("elementProperties"))) return;
		let e = ne(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(m("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(m("properties"))) {
			let e = this.properties, t = [...ee(e), ...te(e)];
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
			let i = (n.converter?.toAttribute === void 0 ? oe : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? oe : e.converter;
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
h.elementStyles = [], h.shadowRootOptions = { mode: "open" }, h[m("elementProperties")] = /* @__PURE__ */ new Map(), h[m("finalized")] = /* @__PURE__ */ new Map(), ae?.({ ReactiveElement: h }), (p.reactiveElementVersions ?? (p.reactiveElementVersions = [])).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
var le = globalThis, ue = (e) => e, de = le.trustedTypes, fe = de ? de.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, pe = "$lit$", g = `lit$${Math.random().toFixed(9).slice(2)}$`, me = "?" + g, he = `<${me}>`, _ = document, ge = () => _.createComment(""), _e = (e) => e === null || typeof e != "object" && typeof e != "function", ve = Array.isArray, ye = (e) => ve(e) || typeof e?.[Symbol.iterator] == "function", be = "[ 	\n\f\r]", xe = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Se = /-->/g, Ce = />/g, v = RegExp(`>|${be}(?:([^\\s"'>=/]+)(${be}*=${be}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), we = /'/g, Te = /"/g, Ee = /^(?:script|style|textarea|title)$/i, y = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), b = Symbol.for("lit-noChange"), x = Symbol.for("lit-nothing"), De = /* @__PURE__ */ new WeakMap(), S = _.createTreeWalker(_, 129);
function Oe(e, t) {
	if (!ve(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return fe === void 0 ? t : fe.createHTML(t);
}
var ke = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = xe;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === xe ? c[1] === "!--" ? o = Se : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = v) : (Ee.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = v) : o = Ce : o === v ? c[0] === ">" ? (o = i ?? xe, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? v : c[3] === "\"" ? Te : we) : o === Te || o === we ? o = v : o === Se || o === Ce ? o = xe : (o = v, i = void 0);
		let d = o === v && e[t + 1].startsWith("/>") ? " " : "";
		a += o === xe ? n + he : l >= 0 ? (r.push(s), n.slice(0, l) + pe + n.slice(l) + g + d) : n + g + (l === -2 ? t : d);
	}
	return [Oe(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Ae = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = ke(t, n);
		if (this.el = e.createElement(l, r), S.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = S.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(pe)) {
					let t = u[o++], n = i.getAttribute(e).split(g), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Pe : r[1] === "?" ? Fe : r[1] === "@" ? Ie : Ne
					}), i.removeAttribute(e);
				} else e.startsWith(g) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Ee.test(i.tagName)) {
					let e = i.textContent.split(g), t = e.length - 1;
					if (t > 0) {
						i.textContent = de ? de.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], ge()), S.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], ge());
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
function C(e, t, n = e, r) {
	if (t === b) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = _e(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ?? (n._$Co = []))[r] = i), i !== void 0 && (t = C(e, i._$AS(e, t.values), i, r)), t;
}
var je = class {
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
		S.currentNode = r;
		let i = S.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Me(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Le(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = S.nextNode(), a++);
		}
		return S.currentNode = _, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Me = class e {
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
		e = C(this, e, t), _e(e) ? e === x || e == null || e === "" ? (this._$AH !== x && this._$AR(), this._$AH = x) : e !== this._$AH && e !== b && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ye(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== x && _e(this._$AH) ? this._$AA.nextSibling.data = e : this.T(_.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Ae.createElement(Oe(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new je(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = De.get(e.strings);
		return t === void 0 && De.set(e.strings, t = new Ae(e)), t;
	}
	k(t) {
		ve(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(ge()), this.O(ge()), this, this.options)) : r = n[i], r._$AI(a), i++;
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
}, Ne = class {
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
		if (i === void 0) e = C(this, e, t, 0), a = !_e(e) || e !== this._$AH && e !== b, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = C(this, r[n + o], t, o), s === b && (s = this._$AH[o]), a || (a = !_e(s) || s !== this._$AH[o]), s === x ? e = x : e !== x && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === x ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Pe = class extends Ne {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === x ? void 0 : e;
	}
}, Fe = class extends Ne {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== x);
	}
}, Ie = class extends Ne {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = C(this, e, t, 0) ?? x) === b) return;
		let n = this._$AH, r = e === x && n !== x || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== x && (n === x || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Le = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		C(this, e);
	}
}, Re = le.litHtmlPolyfillSupport;
Re?.(Ae, Me), (le.litHtmlVersions ?? (le.litHtmlVersions = [])).push("3.3.3");
var ze = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Me(t.insertBefore(ge(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Be = globalThis, w = class extends h {
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
		return b;
	}
};
w._$litElement$ = !0, w.finalized = !0, Be.litElementHydrateSupport?.({ LitElement: w });
var Ve = Be.litElementPolyfillSupport;
Ve?.({ LitElement: w }), (Be.litElementVersions ?? (Be.litElementVersions = [])).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/property.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/ var He = {
	attribute: !0,
	type: String,
	converter: oe,
	reflect: !1,
	hasChanged: se
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
function T(e) {
	return (t, n) => typeof n == "object" ? Ue(e, t, n) : ((e, t, n) => {
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
*/ function E(e) {
	return T({
		...e,
		state: !0,
		attribute: !1
	});
}
//#endregion
//#region src/validation.ts
var D = (e) => typeof e == "object" && !!e && !Array.isArray(e), O = (e, t = 500) => typeof e == "string" && e.length > 0 && e.length <= t, k = (e, t = 500) => e === null || O(e, t), A = (e, t, n) => typeof e == "number" && Number.isSafeInteger(e) && e >= t && e <= n, j = (e) => O(e, 64) && /^\d{4}-\d\d-\d\dT/.test(e) && Number.isFinite(Date.parse(e)), We = (e, t) => D(e) && Object.keys(e).length <= 32 && Object.entries(e).every(([e, n]) => O(e, 60) && t(n)), Ge = {
	provider: (e) => O(e, 60),
	provider_id: (e) => k(e, 200),
	provider_ref: (e) => k(e, 200),
	fetched_at: j,
	locale: (e) => typeof e == "string" && /^(und|[a-z]{2}(?:-[A-Z]{2})?)$/.test(e),
	source_status: (e) => e === "manual" || e === "provider",
	attribution: (e) => O(e),
	common_name: k,
	latin_name: k,
	category: k,
	confidence: (e) => e === null || typeof e == "number" && Number.isFinite(e) && e >= 0 && e <= 1,
	care_text: (e) => We(e, (e) => O(e, 4e3)),
	field_sources: (e) => We(e, O),
	threshold_defaults: (e) => We(e, (e) => We(e, (e) => typeof e == "number" && Number.isSafeInteger(e)))
};
function Ke(e) {
	if (!D(e) || !Object.keys(e).every((e) => Object.hasOwn(Ge, e)) || !Object.entries(Ge).every(([t, n]) => n(e[t]))) return !1;
	let t = [
		"common_name",
		"latin_name",
		"category",
		"confidence"
	].filter((t) => e[t] !== null);
	t.push(...Object.keys(e.care_text), ...Object.entries(e.threshold_defaults).flatMap(([e, t]) => Object.keys(t).map((t) => `${e}_${t}`)));
	let n = e.field_sources;
	return new TextEncoder().encode(JSON.stringify(e)).length <= 32768 && new Set(t).size === Object.keys(n).length && t.every((t) => n[t] === e.attribution) && (e.source_status !== "manual" || e.provider === "manual" && e.provider_ref === null) && (e.source_status !== "provider" || e.provider !== "manual" && O(e.provider_ref, 200));
}
function qe(e) {
	if (!D(e)) return !1;
	let t = e.placement, n = e.species, r = e.image;
	return O(e.id, 200) && A(e.revision, 1, 2 ** 53 - 1) && O(e.name, 200) && j(e.created_at) && (e.acquired_at === null || j(e.acquired_at)) && ["active", "disabled"].includes(String(e.lifecycle_state)) && k(e.category, 60) && Array.isArray(e.tags) && e.tags.length <= 32 && e.tags.every((e) => O(e, 60)) && new Set(e.tags).size === e.tags.length && (t === null || D(t) && O(t.mode, 60) && k(t.exposure, 60) && k(t.rain_exposure, 60) && (t.container === null || typeof t.container == "boolean")) && (n === null || D(n) && Ke(n.snapshot) && D(n.snapshot) && n.provider === n.snapshot.provider) && (r === null || D(r) && O(r.id, 200) && r.content_type === "image/webp" && A(r.width, 1, 2048) && A(r.height, 1, 2048) && j(r.created_at)) && (e.care_events === void 0 || Array.isArray(e.care_events) && e.care_events.length <= 256 && e.care_events.every(Je));
}
function Je(e) {
	if (!D(e) || e.schema_version !== 1 || !O(e.id, 36) || ![
		"watering",
		"fertilizing",
		"pruning",
		"repotting",
		"note"
	].includes(String(e.kind)) || e.provenance !== "manual" || !j(e.occurred_at) || !/(?:Z|[+-]\d\d:\d\d)$/.test(String(e.occurred_at)) || typeof e.local_date != "string" || !/^\d{4}-\d\d-\d\d$/.test(e.local_date) || e.local_date !== String(e.occurred_at).slice(0, 10) || !j(e.created_at) || !j(e.updated_at) || !D(e.payload)) return !1;
	let t = e.payload, n = (e) => e === null || O(e, 500) && e === e.trim();
	return e.kind === "watering" ? Object.keys(t).length === 1 && n(t.note) : e.kind === "fertilizing" ? Object.keys(t).length === 4 && (t.product === null || O(t.product, 120) && t.product === t.product.trim()) && (t.amount === null || typeof t.amount == "number" && Number.isFinite(t.amount) && t.amount > 0 && t.amount <= 1e5) && (t.amount === null && t.unit === null || t.amount !== null && ["g", "mL"].includes(String(t.unit))) && n(t.note) : e.kind === "pruning" ? Object.keys(t).length === 2 && (t.part === null || O(t.part, 120) && t.part === t.part.trim()) && n(t.note) : e.kind === "repotting" ? Object.keys(t).length === 3 && (t.container === null || O(t.container, 120) && t.container === t.container.trim()) && (t.medium === null || O(t.medium, 120) && t.medium === t.medium.trim()) && n(t.note) : Object.keys(t).length === 1 && O(t.text, 1e3) && t.text === t.text.trim();
}
function Ye(e, t) {
	let n = (e) => {
		let t = e.match(/\.(\d{1,6})(?=Z|[+-]\d\d:\d\d$)/)?.[1] ?? "", n = Number(t.padEnd(6, "0")), r = e.replace(/\.\d{1,6}(?=Z|[+-]\d\d:\d\d$)/, "");
		return [Date.parse(r) + Math.floor(n / 1e3), n % 1e3];
	}, r = n(String(e.occurred_at)), i = n(String(t.occurred_at));
	return i[0] - r[0] || i[1] - r[1] || (String(e.id) < String(t.id) ? -1 : +(String(e.id) > String(t.id)));
}
function Xe(e) {
	if (!D(e) || !A(e.revision, 1, 2 ** 53 - 1) || !Array.isArray(e.events) || e.events.length > 256 || !e.events.every(Je) || !D(e.summary)) return !1;
	let t = e.events, n = e.summary, r = t.filter((e) => e.kind === "watering");
	return new Set(t.map((e) => e.id)).size === t.length && n.watering_count === r.length && t.every((e, n) => n === 0 || Ye(t[n - 1], e) <= 0) && n.last_watered_at === (r[0]?.occurred_at ?? null) && n.last_watered_local_date === (r[0]?.local_date ?? null);
}
function Ze(e, t) {
	return !D(e) || !O(e.preview_token, 200) || !Ke(e.snapshot) || !D(e.snapshot) || e.provider !== e.snapshot.provider || !D(e.diff) || !Object.entries(e.diff).every(([e, t]) => D(t) && Object.hasOwn(Ge, e) && (t.before === null || Ge[e](t.before)) && Ge[e](t.after)) || t.provider !== void 0 && (e.provider !== t.provider || e.snapshot.provider_ref !== t.provider_ref) ? !1 : e.operation === (t.type === "smart_plants/species/refresh_preview" ? "refresh" : "select") && (t.type !== "smart_plants/wizard/preview" || e.draft_id === t.draft_id && e.revision === 0);
}
function Qe(e) {
	return D(e) && O(e.entity_id, 255) && typeof e.state == "string" && j(e.last_updated) && D(e.attributes) && [
		"friendly_name",
		"unit_of_measurement",
		"device_class"
	].every((t) => e.attributes && D(e.attributes) && (e.attributes[t] === void 0 || e.attributes[t] === null || typeof e.attributes[t] == "string"));
}
var $e = /* @__PURE__ */ new Set([
	"high",
	"medium",
	"low",
	"unknown"
]);
function et(e) {
	return !D(e) || typeof e.available != "boolean" || typeof e.confidence != "number" || !Number.isFinite(e.confidence) || e.confidence < 0 || e.confidence > 1 || typeof e.confidence_label != "string" || !$e.has(e.confidence_label) || !Array.isArray(e.contributors) || !e.contributors.every((e) => O(e, 60)) || !Array.isArray(e.configured) || !e.configured.every((e) => O(e, 60)) || !Array.isArray(e.reasons) || !e.reasons.every((e) => O(e, 4e3)) ? !1 : e.available ? A(e.health_score, 0, 100) : e.health_score === null;
}
function tt(e) {
	return !D(e) || typeof e.computed_available != "boolean" || typeof e.sensor_stale != "boolean" || !Array.isArray(e.reasons) || !e.reasons.every((e) => O(e, 4e3)) ? !1 : e.computed_available ? typeof e.computed_percent == "number" && Number.isFinite(e.computed_percent) && e.computed_percent >= 0 && e.computed_percent <= 100 && A(e.health_score, 0, 100) && typeof e.needs_water == "boolean" && typeof e.too_wet == "boolean" : e.computed_percent === null && e.health_score === null && e.needs_water === null && e.too_wet === null;
}
function nt(e, t) {
	let n = String(e.type);
	if (!n.startsWith("smart_plants/") || n === "smart_plants/panel/info") return !0;
	if (!D(t)) return !1;
	if (n === "smart_plants/wizard/start") return typeof t.draft_id == "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(t.draft_id) && typeof t.draft_token == "string" && /^[A-Za-z0-9_-]{43}$/.test(t.draft_token) && t.revision === 0 && A(t.expires_in, 1, 600);
	if (n.endsWith("/preview") || n.endsWith("/refresh_preview")) return Ze(t, e);
	if (n === "smart_plants/species/search") return Array.isArray(t.results) && t.results.length <= 50 && t.results.every((t) => D(t) && t.provider === e.provider && O(t.provider_ref, 100) && O(t.latin_name) && k(t.common_name) && k(t.category) && O(t.attribution));
	if (n === "smart_plants/moisture/evaluation") return tt(t.evaluation);
	if (n === "smart_plants/plants/health") return et(t.evaluation);
	if (n === "smart_plants/care/list") return Xe(t);
	if ([
		"smart_plants/care/add_watering",
		"smart_plants/care/add",
		"smart_plants/care/edit"
	].includes(n)) {
		if (!qe(t.plant) || !D(t.plant) || t.plant.id !== e.plant_id || !Je(t.event) || !D(t.event) || !Array.isArray(t.plant.care_events)) return !1;
		let r = t.plant.care_events, i = t.event;
		if (!r.some((e) => e.id === i.id && JSON.stringify(e) === JSON.stringify(i))) return !1;
		let a = n === "smart_plants/care/add_watering" ? "watering" : e.kind, o = n === "smart_plants/care/add_watering" ? { note: e.note } : e.payload;
		return i.kind !== a || i.occurred_at !== e.occurred_at || JSON.stringify(i.payload) !== JSON.stringify(o) || n === "smart_plants/care/edit" && i.id !== e.event_id || t.plant.revision !== Number(e.expected_revision) + 1 ? !1 : Xe({
			revision: t.plant.revision,
			events: [...r].sort(Ye),
			summary: t.summary
		});
	}
	return n === "smart_plants/care/delete" ? !qe(t.plant) || !D(t.plant) || t.plant.id !== e.plant_id || !Array.isArray(t.plant.care_events) ? !1 : t.plant.revision === Number(e.expected_revision) + 1 && !t.plant.care_events.some((t) => D(t) && t.id === e.event_id) && Xe({
		revision: t.plant.revision,
		events: [...t.plant.care_events].sort((e, t) => Ye(e, t)),
		summary: t.summary
	}) : n === "smart_plants/plants/list" ? Array.isArray(t.plants) && t.plants.every(qe) && new Set(t.plants.map((e) => e.id)).size === t.plants.length : n === "smart_plants/roles/list" ? Array.isArray(t.roles) && t.roles.every((e) => D(e) && O(e.role) && O(e.source_domain) && Array.isArray(e.aggregations) && e.aggregations.every((e) => O(e)) && Array.isArray(e.thresholds) && e.thresholds.every((e) => D(e) && O(e.key) && O(e.entity_role) && O(e.translation_key)) && Array.isArray(e.entities) && e.entities.every((e) => D(e) && O(e.role) && O(e.platform) && O(e.translation_key))) : n === "smart_plants/plants/delete" ? Object.keys(t).length === 0 : n === "smart_plants/plants/overview" ? Array.isArray(t.plants) && t.plants.every(D) && new Set(t.plants.map((e) => e.plant_id)).size === t.plants.length : qe(t.plant) && D(t.plant) && (e.plant_id === void 0 || t.plant.id === e.plant_id);
}
//#endregion
//#region src/status.ts
var rt = [
	"needs_water",
	"too_wet",
	"problem",
	"stale",
	"no_sensors",
	"healthy",
	"paused"
], it = {
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
function at(e) {
	return typeof e == "string" && rt.includes(e);
}
function ot(e, t) {
	return e.t(it[t].label);
}
function st(e, t) {
	return rt.indexOf(e) - rt.indexOf(t);
}
var ct = [
	"moisture",
	"temperature",
	"humidity",
	"illuminance",
	"conductivity",
	"soil_temperature",
	"co2",
	"battery"
], M = {
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
function lt(e) {
	return typeof e == "string" && ct.includes(e);
}
function ut(e, t) {
	return e.t(M[t].label);
}
function N(e, t, n) {
	return n === "%" ? e.percent(t) : n ? `${e.number(t)} ${n}` : e.number(t);
}
function dt(e, t, n, r) {
	if (!n) return "";
	let { min: i, max: a } = n;
	return t === "battery" && i !== null ? e.t("range.low_below", { value: N(e, i, r) }) : i !== null && a !== null ? e.t("range.between", {
		min: e.number(i),
		max: N(e, a, r)
	}) : i === null ? a === null ? "" : e.t("range.at_most", { value: N(e, a, r) }) : e.t("range.at_least", { value: N(e, i, r) });
}
var ft = [
	["second", 60],
	["minute", 60],
	["hour", 24],
	["day", 7],
	["week", 4.34524],
	["month", 12],
	["year", Infinity]
];
function pt(e, t, n = Date.now()) {
	let r = Date.parse(t);
	if (!Number.isFinite(r)) return t;
	let i = new Intl.RelativeTimeFormat(e.language, { numeric: "auto" }), a = (r - n) / 1e3;
	for (let [e, t] of ft) {
		if (Math.abs(a) < t) return i.format(Math.round(a), e);
		a /= t;
	}
	return t;
}
//#endregion
//#region src/overview-model.ts
var mt = [
	"ok",
	"low",
	"high",
	"stale",
	"unavailable"
], P = (e) => typeof e == "object" && !!e && !Array.isArray(e), ht = (e) => e === null || typeof e == "number" && Number.isFinite(e), gt = (e) => e === null || typeof e == "string";
function _t(e) {
	if (!P(e) || !P(e.range)) return null;
	let { value: t, unit: n, state: r, range: i, last_reported: a, sources: o } = e;
	return !ht(t) || n !== null && typeof n != "string" || !mt.includes(r) || !ht(i.min) || !ht(i.target) || !ht(i.max) || !gt(a) || !Array.isArray(o) || !o.every((e) => typeof e == "string") ? null : {
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
function vt(e) {
	if (!P(e)) return null;
	let { plant_id: t, revision: n, lifecycle_state: r, status: i, problems: a, roles: o, last_watered_at: s, image: c } = e;
	if (typeof t != "string" || typeof n != "number" || r !== "active" && r !== "disabled" || !at(i) || !Array.isArray(a) || !P(o) || !gt(s) || !(c === null || P(c) && typeof c.id == "string")) return null;
	let l = a.filter((e) => P(e) && typeof e.role == "string" && typeof e.kind == "string").map((e) => ({
		role: e.role,
		kind: e.kind
	}));
	if (l.length !== a.length) return null;
	let u = {};
	for (let [e, t] of Object.entries(o)) {
		if (!lt(e)) continue;
		let n = _t(t);
		if (!n) return null;
		u[e] = n;
	}
	return {
		plant_id: t,
		revision: n,
		lifecycle_state: r,
		status: i,
		problems: l,
		roles: u,
		last_watered_at: s,
		image: c === null ? null : { id: c.id }
	};
}
var yt = {
	too_cold: "problem_kind.too_cold",
	too_hot: "problem_kind.too_hot",
	too_dry: "problem_kind.too_dry",
	too_humid: "problem_kind.too_humid",
	low_light: "problem_kind.low_light",
	low_conductivity: "problem_kind.low_conductivity",
	high_conductivity: "problem_kind.high_conductivity",
	high_co2: "problem_kind.high_co2",
	battery_low: "problem_kind.battery_low"
}, bt = {
	too_cold: "problem_kind.soil_too_cold",
	too_hot: "problem_kind.soil_too_hot"
};
function xt(e, t) {
	let n = t.problems[0], r = t.status === "healthy" || t.status === "paused" ? 0 : Math.max(0, t.problems.length - 1);
	if (t.status === "problem" && n) {
		let t = (n.role === "soil_temperature" ? bt[n.kind] : void 0) ?? yt[n.kind];
		return {
			label: t ? e.t(t) : ot(e, "problem"),
			more: r
		};
	}
	return {
		label: ot(e, t.status),
		more: r
	};
}
function St(e, t) {
	return t && t.value !== null ? N(e, t.value, t.unit) : null;
}
function Ct(e, t, n, r) {
	let i = lt(n.role) ? n.role : null, a = i ? t.roles[i] : void 0, o = i ? ut(e, i) : n.role, s = St(e, a), c = (t) => t == null || !a ? null : N(e, t, a.unit);
	switch (n.kind) {
		case "stale": return a?.last_reported ? e.t("reason.stale", {
			role: o,
			age: pt(e, a.last_reported, r)
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
function wt(e, t, n) {
	return t.status === "healthy" || t.status === "paused" || t.status === "no_sensors" ? "" : t.problems.slice(0, 2).map((r) => Ct(e, t, r, n)).join(" · ");
}
function Tt(e, t, n = Date.now()) {
	if (!t) return e.t("card.never_watered");
	let r = Date.parse(t);
	return Number.isFinite(r) && Math.abs(n - r) < 6e4 ? e.t("card.watered_just_now") : e.t("card.watered", { age: pt(e, t, n) });
}
function Et(e) {
	return Object.keys(M).filter((t) => t !== "moisture" && e.roles[t]).map((t) => [t, e.roles[t]]);
}
var Dt = [
	"all",
	"water",
	"problems",
	"sensors"
];
function Ot(e, t) {
	switch (e) {
		case "all": return !0;
		case "water": return t === "needs_water";
		case "problems": return t === "too_wet" || t === "problem";
		case "sensors": return t === "stale" || t === "no_sensors";
	}
}
var kt = [
	"attention",
	"name",
	"area"
];
function At(e, t) {
	let n = t.trim().toLocaleLowerCase();
	return !n || e.searchText.toLocaleLowerCase().includes(n);
}
var jt = (e, t) => e.name.localeCompare(t.name, void 0, { sensitivity: "base" });
function Mt(e, t) {
	let n = [...e];
	return t === "attention" ? n.sort((e, t) => st(e.status ?? "healthy", t.status ?? "healthy") || jt(e, t)) : n.sort(jt), n;
}
function Nt(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of Mt(e, "name")) t.set(n.areaName, [...t.get(n.areaName) ?? [], n]);
	return [...t.entries()].sort(([e], [t]) => e === null ? 1 : t === null ? -1 : e.localeCompare(t, void 0, { sensitivity: "base" })).map(([e, t]) => ({
		area: e,
		items: t
	}));
}
//#endregion
//#region src/api.ts
var F = class extends Error {
	constructor(e, t) {
		super(t), this.code = e, this.name = "ApiError";
	}
};
function Pt(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	return typeof t.code == "string" || typeof t.error == "object";
}
async function I(e, t) {
	try {
		let n = await e.connection.sendMessagePromise(t);
		if (!nt(t, n)) throw new F("invalid_response", "The response is incompatible. Refresh and retry.");
		return n;
	} catch (e) {
		if (e instanceof F) throw e;
		if (Pt(e)) {
			let t = e.error?.code ?? e.code ?? "unknown_error";
			throw new F(typeof t == "string" ? t : "unknown_error", "Request failed. Review your input, refresh and retry.");
		}
		throw new F("unknown_error", "Request failed. Refresh and retry when connected.");
	}
}
var L = {
	careHistory(e, t) {
		return I(e, {
			type: "smart_plants/care/list",
			plant_id: t
		});
	},
	async addWatering(e, t, n, r, i) {
		return I(e, {
			type: "smart_plants/care/add_watering",
			plant_id: t,
			expected_revision: n,
			occurred_at: r,
			note: i
		});
	},
	async addCareEvent(e, t, n, r, i, a) {
		return I(e, {
			type: "smart_plants/care/add",
			plant_id: t,
			expected_revision: n,
			kind: r,
			occurred_at: i,
			payload: a
		});
	},
	async editCareEvent(e, t, n, r, i, a, o) {
		return I(e, {
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
		return I(e, {
			type: "smart_plants/care/delete",
			plant_id: t,
			expected_revision: n,
			event_id: r
		});
	},
	async info(e) {
		let t = await I(e, { type: "smart_plants/panel/info" });
		if (!t || t.api_version !== 1 || t.schema_version !== 1 || !Array.isArray(t.providers) || !t.providers.every((e) => e && typeof e.provider == "string" && typeof e.available == "boolean" && typeof e.search_supported == "boolean")) throw new F("version_mismatch", "Panel/API version mismatch. Restart Home Assistant and fully reload the frontend after upgrading.");
		return t;
	},
	startWizard(e) {
		return I(e, { type: "smart_plants/wizard/start" });
	},
	previewWizard(e, t, n, r, i) {
		return I(e, {
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
		return (await I(e, {
			type: "smart_plants/wizard/create",
			...t
		})).plant;
	},
	async configureMoisture(e, t, n, r) {
		return (await I(e, {
			type: "smart_plants/moisture/configure",
			plant_id: t,
			expected_revision: n,
			moisture: r
		})).plant;
	},
	async evaluation(e, t) {
		return (await I(e, {
			type: "smart_plants/moisture/evaluation",
			plant_id: t
		})).evaluation;
	},
	async plantHealth(e, t) {
		return (await I(e, {
			type: "smart_plants/plants/health",
			plant_id: t
		})).evaluation;
	},
	async areas(e) {
		return Ft(await I(e, { type: "config/area_registry/list" }), (e) => typeof e.area_id == "string" && typeof e.name == "string");
	},
	async entities(e) {
		return Ft(await I(e, { type: "config/entity_registry/list" }), (e) => typeof e.id == "string" && typeof e.entity_id == "string" && typeof e.unique_id == "string" && typeof e.platform == "string" && (e.device_id === null || typeof e.device_id == "string"));
	},
	async devices(e) {
		return Ft(await I(e, { type: "config/device_registry/list" }), (e) => typeof e.id == "string" && (e.area_id === null || typeof e.area_id == "string") && Array.isArray(e.identifiers) && e.identifiers.every((e) => Array.isArray(e) && e.length === 2 && e.every((e) => typeof e == "string")));
	},
	async states(e) {
		return Ft(await I(e, { type: "get_states" }), Qe);
	},
	async related(e, t) {
		let n = await I(e, {
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
		return (await I(e, {
			type: "smart_plants/species/search",
			provider: t,
			query: n,
			locale: r,
			limit: i
		})).results;
	},
	async previewSpecies(e, t, n, r, i) {
		return I(e, {
			type: "smart_plants/species/preview",
			provider: t,
			provider_ref: n,
			locale: r,
			plant_id: i
		});
	},
	async previewSpeciesRefresh(e, t, n) {
		return I(e, {
			type: "smart_plants/species/refresh_preview",
			plant_id: t,
			locale: n
		});
	},
	async applySpecies(e, t, n, r, i, a) {
		return (await I(e, {
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
		return (await I(e, { type: "smart_plants/roles/list" })).roles;
	},
	async setThresholdOverrides(e, t, n, r, i) {
		return (await I(e, {
			type: "smart_plants/roles/set_threshold_overrides",
			plant_id: t,
			expected_revision: n,
			role: r,
			values: i
		})).plant;
	},
	async setRoleSources(e, t, n, r, i) {
		return (await I(e, {
			type: "smart_plants/roles/set_sources",
			plant_id: t,
			expected_revision: n,
			role: r,
			sources: i
		})).plant;
	},
	async setRolePrimary(e, t, n, r, i) {
		return (await I(e, {
			type: "smart_plants/roles/set_primary",
			plant_id: t,
			expected_revision: n,
			role: r,
			primary_entity_id: i
		})).plant;
	},
	async setRoleAggregation(e, t, n, r, i) {
		return (await I(e, {
			type: "smart_plants/roles/set_aggregation",
			plant_id: t,
			expected_revision: n,
			role: r,
			aggregation: i
		})).plant;
	},
	async setRoleStaleAfter(e, t, n, r, i) {
		return (await I(e, {
			type: "smart_plants/roles/set_stale_after",
			plant_id: t,
			expected_revision: n,
			role: r,
			stale_after_seconds: i
		})).plant;
	},
	async overview(e) {
		let t = await I(e, { type: "smart_plants/plants/overview" });
		if (!Array.isArray(t?.plants)) throw new F("invalid_response", "Invalid plant overview response.");
		return t.plants.map(vt).filter((e) => e !== null);
	},
	async list(e) {
		return (await I(e, { type: "smart_plants/plants/list" })).plants;
	},
	async create(e, t) {
		return (await I(e, {
			type: "smart_plants/plants/create",
			...t
		})).plant;
	},
	async update(e, t) {
		return (await I(e, {
			type: "smart_plants/plants/update",
			...t
		})).plant;
	},
	async disable(e, t, n) {
		return (await I(e, {
			type: "smart_plants/plants/disable",
			plant_id: t,
			expected_revision: n
		})).plant;
	},
	async reenable(e, t, n) {
		return (await I(e, {
			type: "smart_plants/plants/reenable",
			plant_id: t,
			expected_revision: n
		})).plant;
	},
	async setArea(e, t, n, r) {
		return (await I(e, {
			type: "smart_plants/plants/set_area",
			plant_id: t,
			expected_revision: n,
			area_id: r
		})).plant;
	},
	async delete(e, t, n) {
		await I(e, {
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
			throw e instanceof DOMException && e.name === "AbortError" ? e : new F("unknown_error", "Image request failed. Retry when connected.");
		}
		if (!a.ok) throw new F("unknown_error", `HTTP ${a.status}`);
		let s = await a.blob();
		if (s.type !== "image/webp" || s.size === 0) throw new F("invalid_response", "The image response is incompatible. Refresh and retry.");
		return s;
	},
	async uploadImage(e, t, n, r) {
		return It(e, `/api/smart_plants/plants/${encodeURIComponent(t)}/image?expected_revision=${n}`, {
			method: "POST",
			plantId: t,
			body: r,
			contentType: r.type
		});
	},
	async deleteImage(e, t, n) {
		return It(e, `/api/smart_plants/plants/${encodeURIComponent(t)}/image?expected_revision=${n}`, {
			method: "DELETE",
			plantId: t
		});
	}
};
function Ft(e, t) {
	if (!Array.isArray(e) || !e.every((e) => typeof e == "object" && !!e && t(e))) throw new F("invalid_response", "Home Assistant registry/state response is incompatible. Reload and retry.");
	return e;
}
async function It(e, t, n) {
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
		throw new F("unknown_error", "Image request failed. Retry when connected.");
	}
	let o = await a.text(), s = null;
	if (o) try {
		s = JSON.parse(o);
	} catch {
		s = null;
	}
	if (!a.ok) {
		let e = s?.error?.code ?? "unknown_error";
		throw new F(typeof e == "string" ? e : "unknown_error", "Image request failed. Use a valid JPEG, PNG or WebP up to 5 MiB and 2048 × 2048 pixels.");
	}
	let c = s;
	if (!c || !qe(c.plant) || c.plant.id !== n.plantId) throw new F("invalid_response", "The image response is incompatible. Refresh before retrying.");
	return c.plant;
}
//#endregion
//#region src/translations/de.ts
var Lt = {
	"format.percent": "{value} %",
	"format.recorded_date_time": "{datetime} (UTC{offset})",
	"common.cancel": "Abbrechen",
	"common.none": "Keine",
	"common.not_specified": "Nicht angegeben",
	"common.not_supplied": "Nicht angegeben",
	"common.no_species_selected": "Keine Art ausgewählt",
	"common.continue_manually": "Manuell fortfahren",
	"panel.admin_required": "Smart Plants erfordert ein Administratorkonto.",
	"panel.menu": "Menü",
	"panel.back_to_overview": "Zurück zur Übersicht",
	"panel.add_plant": "Pflanze hinzufügen",
	"panel.registry_unavailable": "Registrierungs- oder Zustandsdaten nicht verfügbar: {error}. Stelle die Verbindung wieder her, bevor du registrierte Sensoren oder Bereiche zuweist.",
	"panel.open_created": "Erstellte Pflanze öffnen",
	"panel.busy": "Speichern oder Vorschau wird geladen …",
	"api_error.unknown": "Anfrage fehlgeschlagen. Aktualisiere die Seite und versuche es erneut, sobald eine Verbindung besteht.",
	"api_error.integration_not_loaded": "Smart Plants ist nicht geladen. Öffne Einstellungen → Geräte & Dienste und aktualisiere die Seite, nachdem die Integration geladen wurde.",
	"api_error.unauthorized": "Smart Plants erfordert ein Administratorkonto.",
	"api_error.not_found": "Pflanze oder Art nicht gefunden. Sie wurde möglicherweise in einer anderen Sitzung entfernt.",
	"api_error.revision_conflict": "Diese Pflanze wurde an anderer Stelle geändert. Prüfe die aktualisierten Felder und wende deine Änderungen ausdrücklich erneut an.",
	"api_error.provider_disabled": "Der Anbieter ist nicht verfügbar. Fahre manuell fort; übernommene lokale Artdaten bleiben verfügbar.",
	"api_error.provider_authentication": "Die Anmeldung beim Anbieter ist fehlgeschlagen. Prüfe die erneute Anmeldung der Integration in den Einstellungen oder fahre manuell fort.",
	"api_error.provider_rate_limit": "Das Anfragelimit des Anbieters ist erreicht. Versuche es später erneut oder fahre manuell fort.",
	"api_error.provider_timeout": "Zeitüberschreitung beim Anbieter. Versuche es später erneut oder fahre manuell fort.",
	"api_error.provider_outage": "Der Anbieter ist derzeit nicht erreichbar. Versuche es später erneut oder fahre manuell fort.",
	"api_error.provider_malformed_response": "Der Anbieter hat eine ungültige Antwort geliefert. Fahre manuell fort oder versuche es später erneut.",
	"api_error.version_mismatch": "Panel- und API-Version passen nicht zusammen. Starte Home Assistant nach dem Update neu und lade das Frontend vollständig neu.",
	"api_error.invalid_response": "Die Antwort ist nicht kompatibel. Aktualisiere die Seite, bevor du bearbeitest oder es erneut versuchst; Wiederholungen beim Erstellen behalten die ursprüngliche Anfrage bei.",
	"api_error.invalid_format": "Der Server hat die Eingabe abgelehnt. Prüfe die Felder und Quellenzuordnungen. Bilder müssen gültige JPEG-, PNG- oder WebP-Dateien mit höchstens 5 MiB und 2048 × 2048 Pixeln sein; abgelaufene Artvorschauen müssen erneut geprüft werden.",
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
	"conflict.heading": "Änderungen aus einer anderen Sitzung prüfen",
	"conflict.revision": "Revision {before} → {after}. Das Speichern ist angehalten. Lokale Änderungen bleiben erhalten.",
	"conflict.roles_changed": "Sensorkonfiguration oder Schwellenwert-Standards bzw. -Überschreibungen wurden geändert.",
	"conflict.source_overlap": "Beide Sitzungen haben diese Quellenfelder geändert: {fields}. Prüfe die aktualisierte Rollenübersicht und deinen Entwurf, bevor du es erneut versuchst; Speichern ersetzt die aktualisierten Werte dieser Felder.",
	"conflict.retain": "Änderungen geprüft; meine Änderungen zum erneuten Anwenden behalten",
	"conflict.discard": "Meine Änderungen verwerfen und aktualisierte Werte verwenden",
	"conflict.reviewed": "Änderungen geprüft. Deine bearbeiteten Felder bleiben erhalten; prüfe sie und wende sie mit der jeweiligen Speichern-Schaltfläche ausdrücklich erneut an.",
	"conflict.reviewed_overlap": "Beide Sitzungen haben {fields} im Quellen-Editor geändert. Speichern ersetzt die aktualisierten Werte dieser Felder.",
	"conflict.reviewed_species": "Artvorschauen müssen erneut angefordert und geprüft werden.",
	"conflict_field.name": "Name",
	"conflict_field.acquired_at": "Angeschafft",
	"conflict_field.placement": "Standort",
	"conflict_field.category": "Kategorie",
	"conflict_field.tags": "Tags",
	"conflict_field.species": "Art",
	"conflict_field.image": "Foto",
	"conflict_field.lifecycle_state": "Lebenszyklus",
	"conflict_field.roles": "Rollen",
	"conflict_field.care_events": "Pflegeeinträge",
	"source_field.sources": "Quellen",
	"source_field.primary_entity_id": "primäre Quelle",
	"source_field.aggregation": "Aggregation",
	"source_field.stale_after_seconds": "Veraltet nach",
	"status.healthy": "gesund",
	"status.needs_water": "braucht Wasser",
	"status.too_wet": "zu nass",
	"status.stale": "veraltet",
	"status.unavailable": "nicht verfügbar",
	"status.disabled": "deaktiviert",
	"status.problems": "Probleme",
	"list.loading": "Pflanzen werden geladen …",
	"list.count_one": "{count} Pflanze",
	"list.count_other": "{count} Pflanzen",
	"list.count_filtered": "{shown} von {total} Pflanzen",
	"metric.soil_moisture": "Bodenfeuchte",
	"metric.moisture_health": "Gesundheitswert",
	"detail.not_found": "Pflanze nicht gefunden – sie wurde möglicherweise in einer anderen Sitzung gelöscht.",
	"detail.open_device": "Home-Assistant-Gerät öffnen",
	"detail.sections_label": "Pflanzenbereiche",
	"detail.tab_overview": "Übersicht",
	"detail.tab_details": "Pflanzendetails",
	"detail.tab_diagnostics": "Diagnose",
	"detail.identity_heading": "Identität und Standort",
	"detail.name": "Name",
	"detail.acquired": "Angeschafft (ISO-Datum/-Uhrzeit, optional)",
	"detail.save_identity": "Identität speichern",
	"detail.area_current": "Aktuell: {area}. Der Bereich gehört zur nativen Geräteregistrierung.",
	"detail.area_review": "Der native Bereich hat sich geändert. Prüfe den aktuellen und den ausgewählten Bereich, bevor du erneut speicherst.",
	"detail.area_reviewed": "Ich habe die Änderung des nativen Bereichs geprüft",
	"detail.area_use_current": "Aktuellen nativen Bereich verwenden",
	"detail.save_area": "Bereich speichern",
	"overview.eyebrow": "PFLANZENÜBERSICHT",
	"overview.details_button": "Pflanzendetails und Foto",
	"overview.current_reading": "Aktueller Messwert",
	"overview.no_current_reading": "Kein aktueller Messwert",
	"overview.based_on_moisture": "Basierend auf Feuchtemesswerten",
	"overview.moisture_sensors": "Feuchtesensoren",
	"overview.aggregation": "Aggregation: {aggregation}",
	"overview.not_configured": "nicht konfiguriert",
	"overview.assigned_sensors": "Zugewiesene Sensoren",
	"overview.primary": "Primär",
	"overview.no_sensors": "Keine Sensoren zugewiesen. Du kannst das Pflanzenprofil trotzdem nutzen und Pflege erfassen.",
	"overview.manage_sensors": "Sensoren verwalten",
	"overview.recent_care": "Letzte Pflege",
	"overview.no_care": "Noch keine Pflegeeinträge erfasst.",
	"overview.open_care": "Pflegeverlauf öffnen",
	"overview.overall_confidence": "Zuverlässigkeit des Gesamtzustands: {label}",
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
	"taxonomy.heading": "Einordnung",
	"taxonomy.category": "Kategorie",
	"taxonomy.tags": "Tags (durch Kommas getrennt)",
	"taxonomy.hint": "Die Einordnung in Smart Plants ist unabhängig von Home-Assistant-Labels.",
	"taxonomy.save": "Einordnung speichern",
	"species.heading": "Art",
	"species.none": "Keine Art zugewiesen.",
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
	"snapshot.default_not_supplied": "Nicht angegeben (integrierter Standardwert gilt)",
	"snapshot.field_attribution": "Quellenangabe je Feld",
	"snapshot.proposed_changes": "Vorgeschlagene Änderungen",
	"snapshot.preview_read_only": "Die Vorschau ist schreibgeschützt. Lokale Überschreibungen bleiben erhalten. Es werden keine externen Bilder geladen.",
	"lifecycle.heading": "Lebenszyklus",
	"lifecycle.description": "Deaktivieren beendet die Auswertung der Pflanze und macht ihre Entitäten nicht verfügbar. Eigene Automatisierungen bleiben davon unberührt.",
	"lifecycle.disable": "Deaktivieren",
	"lifecycle.reenable": "Wieder aktivieren",
	"lifecycle.delete": "Pflanze löschen",
	"dialog.delete_title": "{name} löschen?",
	"dialog.delete_body": "Dadurch werden die Pflanze, ihr Gerät, ihre Entitäten und das lokale Foto dauerhaft entfernt. Dies kann nicht rückgängig gemacht werden.",
	"dialog.delete_confirm": "Pflanze dauerhaft löschen",
	"dialog.species_title": "Artänderungen prüfen",
	"dialog.preview_invalid": "Die Vorschau ist nicht mehr gültig. Schließe den Dialog und fordere eine neue Vorschau an.",
	"dialog.species_confirm": "Geprüfte Art übernehmen und anwenden",
	"photo.heading": "Pflanzenfoto",
	"photo.loading": "Foto wird geladen …",
	"photo.load_failed": "Foto konnte nicht geladen werden: {error}",
	"photo.retry": "Foto erneut laden",
	"photo.alt": "Foto von {name}",
	"photo.decode_failed": "Das gespeicherte Foto konnte nicht dekodiert werden. Versuche es erneut oder ersetze es durch ein gültiges Bild.",
	"photo.none": "Noch kein Foto.",
	"photo.stored": "Lokal gespeichert: {type} · {width} × {height} Pixel",
	"photo.replace": "Foto ersetzen",
	"photo.upload": "Foto hochladen",
	"photo.hint": "JPEG, PNG oder WebP · max. 5 MiB · max. 2048 × 2048. Bilder werden authentifiziert und lokal gespeichert.",
	"photo.remove": "Foto entfernen",
	"image_error.type_or_size": "Wähle ein nicht leeres JPEG-, PNG- oder WebP-Bild mit höchstens 5 MiB.",
	"image_error.unreadable": "Dieses Bild konnte nicht gelesen werden. Wähle die Datei erneut aus.",
	"image_error.signature": "Der Bildinhalt passt nicht zum Dateityp JPEG, PNG oder WebP. Wähle ein anderes Bild.",
	"image_error.decode": "Diese Datei konnte nicht als Bild dekodiert werden. Wähle ein anderes JPEG-, PNG- oder WebP-Bild.",
	"image_error.dimensions": "Das Bild darf höchstens 2048 × 2048 Pixel groß sein.",
	"created.notice": "{name} wurde erstellt.",
	"created.uploading": "Das ausgewählte Foto wird hochgeladen …",
	"created.photo_skipped": "Die Pflanze wurde nach dem Erstellen geändert. Das ursprüngliche Foto aus dem Assistenten wurde nicht hochgeladen. Prüfe das aktuelle Foto in den Pflanzendetails und lade bei Bedarf ausdrücklich ein Foto hoch.",
	"created.photo_uploaded": "Das ausgewählte Foto wurde hochgeladen.",
	"created.photo_failed": "Das ausgewählte Foto wurde nicht hochgeladen. Öffne die erstellte Pflanze, um es erneut hochzuladen.",
	"created.photo_interrupted": "Das Hochladen des Fotos wurde unterbrochen. Öffne die erstellte Pflanze und prüfe ihr Foto, bevor du es erneut versuchst.",
	"moisture.heading": "Feuchtekonfiguration",
	"moisture.effective_summary": "Wirksame Schwellenwerte: {thresholds}",
	"moisture.advanced_overrides": "Erweiterte Schwellenwert-Überschreibungen",
	"moisture.advanced_hint": "Leere Werte übernehmen den oben angezeigten wirksamen Standardwert.",
	"moisture.save": "Vollständige Feuchtekonfiguration speichern",
	"moisture.incompatible": "Die Daten der Feuchterolle fehlen oder sind nicht kompatibel. Aktualisiere die Seite oder führe ein Update durch, bevor du bearbeitest; Standardwerte werden nicht geraten.",
	"moisture.sources_intro": "Weise bis zu 32 Quellen zu. Die primäre Quelle wird nie automatisch ersetzt. Nicht verfügbare Sensoren können zugewiesen werden.",
	"moisture.add_sensor": "Feuchtesensor hinzufügen",
	"moisture.overrides_intro": "Leere Überschreibungen übernehmen ausdrücklich die Standardwerte. Speichern wendet die vollständige Konfiguration in einem Schritt an.",
	"moisture.override_label": "Überschreibung {key} (%)",
	"moisture.default_effective": "Standard {default} · wirksam {effective}",
	"moisture.inherit_key": "{key} übernehmen",
	"moisture_threshold.min": "Minimum",
	"moisture_threshold.target": "Zielwert",
	"moisture_threshold.max": "Maximum",
	"sources.show_all": "Alle Sensoren anzeigen (ohne Metadatenfilter)",
	"sources.choose": "Sensor auswählen",
	"sources.candidate": "{name} · {entity_id} · Einheit: {unit} · Klasse: {device_class} · {state}",
	"sources.not_supplied_lower": "nicht angegeben",
	"sources.unavailable_lower": "nicht verfügbar",
	"sources.unavailable": "Nicht verfügbar",
	"sources.assign_unavailable": "Nicht verfügbaren oder nicht registrierten Sensor zuweisen",
	"sources.press_enter": "Drücke die Eingabetaste, um eine Entitäts-ID hinzuzufügen.",
	"sources.primary_suffix": " · Primär",
	"sources.metadata": "Geräteklasse: {device_class} · Einheit: {unit} · {registration}",
	"sources.registered": "Registriert",
	"sources.not_registered": "Nicht registriert",
	"sources.native_settings": "Native Sensoreinstellungen",
	"sources.remove": "{entity_id} entfernen",
	"sources.open_repairs": "Home-Assistant-Reparaturen öffnen",
	"sources.primary": "Primärer Sensor",
	"sources.primary_none": "Keiner (primäre Aggregation nicht verfügbar)",
	"sources.aggregation": "Aggregation",
	"sources.stale_after": "Veraltet nach (Sekunden, 60–604.800)",
	"sources.role_intro": "Weise bis zu 32 Quellen für {role} zu. Die primäre Quelle wird nie automatisch ersetzt. Nicht verfügbare Sensoren können zugewiesen werden.",
	"sources.add_role_sensor": "Sensor für {role} hinzufügen",
	"aggregation.primary": "primär",
	"aggregation.average": "Durchschnitt",
	"aggregation.min": "Minimum",
	"aggregation.max": "Maximum",
	"source_warning.missing_registered": "Registrierte Quelle fehlt – ersetze sie ausdrücklich oder prüfe die Reparaturen.",
	"source_warning.unregistered": "Nicht registriert: Umbenennungen können nicht zuverlässig verfolgt werden",
	"source_warning.unavailable": "Derzeit nicht verfügbar",
	"source_warning.moisture_metadata": "Unerwartete Metadaten: Die Auswertung erfordert einen Zahlenwert von 0–100 %",
	"source_warning.moisture_reading": "Ungültiger Messwert: Die Auswertung erfordert einen Prozentwert von 0 bis 100",
	"source_warning.role_metadata": "Unerwartete Metadaten: Die Auswertung für {role} erfordert die Geräteklasse {device_class} und die Einheit {units}",
	"source_warning.separator": ". ",
	"validation.sources_unique": "Wähle höchstens 32 unterschiedliche Sensorentitäten.",
	"validation.aggregation": "Wähle eine unterstützte Aggregation.",
	"validation.primary": "Die primäre Quelle muss einer der zugewiesenen Sensoren oder „Keiner“ sein.",
	"validation.stale_after": "„Veraltet nach“ muss eine ganze Zahl von 60 bis 604.800 Sekunden sein.",
	"validation.moisture_thresholds": "Wirksame Feuchte-Schwellenwerte müssen ganze Zahlen sein: 1 ≤ Minimum < Zielwert < Maximum ≤ 99, mit einer Spanne von mindestens 4 %.",
	"validation.taxonomy": "Verwende eine Kategorie mit höchstens 60 Zeichen und höchstens 32 unterschiedliche Tags mit jeweils höchstens 60 Zeichen.",
	"sensors.heading": "Sensoren",
	"sensors.intro": "Weise jeder Rolle Home-Assistant-Sensoren zu. Der berechnete Sensor und der Problemsensor einer Rolle erscheinen, sobald sie mindestens einmal eine Quelle hatte. Die Entitätsauswahl ist nach Geräteklasse und Einheit gefiltert; weitere Sensoren sind unter „Alle Sensoren anzeigen“ verfügbar.",
	"sensors.switch_prompt": "Du hast ungespeicherte Änderungen im Quellen-Editor für {role}. Editor wechseln und Änderungen verwerfen?",
	"sensors.edit": "Quellen bearbeiten",
	"sensors.refused": "Die Quelldaten für {role} fehlen oder sind nicht kompatibel. Aktualisiere die Seite oder führe ein Update durch, bevor du bearbeitest; Standardwerte werden nicht geraten.",
	"sensors.save": "Quellen für {role} speichern",
	"sensors.saved": "Quellen für {role} gespeichert.",
	"sensors.summary_unavailable": "Rollendaten nicht verfügbar",
	"sensors.summary_empty": "keine Quellen – diese Rolle hat noch keine berechnete Entität",
	"sensors.source_count_one": "{count} Quelle",
	"sensors.source_count_other": "{count} Quellen",
	"sensors.summary_primary": " · primär {entity_id}",
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
	"care.no_irrigation": "Pflegeeinträge steuern keine Bewässerung und ändern keine Feuchtewarnungen.",
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
	"care_kind_phrase.watering": "Gießen",
	"care_kind_phrase.fertilizing": "Düngen",
	"care_kind_phrase.pruning": "Rückschnitt",
	"care_kind_phrase.repotting": "Umtopfen",
	"care_kind_phrase.note": "Notiz",
	"care_field.product": "Produkt",
	"care_field.amount": "Menge",
	"care_field.unit": "Einheit (g oder mL)",
	"care_field.part": "Pflanzenteil",
	"care_field.container": "Gefäß",
	"care_field.medium": "Substrat",
	"care_field.text": "Notiztext",
	"care_field.note": "Notiz",
	"automations.heading": "Native Automatisierungen",
	"automations.description": "Verwende die Entität „Braucht Wasser“ der Pflanze für Benachrichtigungen oder Erinnerungen in Home Assistant. Dynamische oder Template-Verweise erscheinen möglicherweise nicht in den zugehörigen Ergebnissen.",
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
	"section.advanced_diagnostics": "Erweiterte Diagnose",
	"section.advanced_diagnostics_description": "Status der Problemanzeigen dieser Pflanze. Schwellenwerte lassen sich für jede Rolle bearbeiten: Temperatur, Luftfeuchte, Leitfähigkeit, CO2, Bodentemperaturstress, Batterie niedrig und zu wenig Licht.",
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
	"problem_reason.battery_stale": "Batteriemesswert veraltet",
	"problem_reason.battery_unavailable": "Batteriemesswert nicht verfügbar",
	"problem_reason.co2_ok": "CO2 im Sollbereich",
	"problem_reason.co2_stale": "CO2-Messwert veraltet",
	"problem_reason.co2_stress": "CO2 zu hoch",
	"problem_reason.co2_unavailable": "CO2-Messwert nicht verfügbar",
	"problem_reason.cold_stress": "zu kalt",
	"problem_reason.conductivity_ok": "Leitfähigkeit im Sollbereich",
	"problem_reason.conductivity_stale": "Leitfähigkeitsmesswert veraltet",
	"problem_reason.conductivity_unavailable": "Leitfähigkeitsmesswert nicht verfügbar",
	"problem_reason.damp_stress": "Luft zu feucht",
	"problem_reason.dry_stress": "Luft zu trocken",
	"problem_reason.enough_light": "genug Tageslicht",
	"problem_reason.high_conductivity_stress": "Leitfähigkeit zu hoch",
	"problem_reason.hot_stress": "zu heiß",
	"problem_reason.humidity_ok": "Luftfeuchte im Sollbereich",
	"problem_reason.humidity_stale": "Luftfeuchtemesswert veraltet",
	"problem_reason.humidity_unavailable": "Luftfeuchtemesswert nicht verfügbar",
	"problem_reason.illuminance_stale": "Messwert der Beleuchtungsstärke veraltet",
	"problem_reason.illuminance_unavailable": "Messwert der Beleuchtungsstärke nicht verfügbar",
	"problem_reason.insufficient_daytime_samples": "noch nicht genug Messwerte bei Tageslicht",
	"problem_reason.low_battery": "Batterie niedrig",
	"problem_reason.low_conductivity_stress": "Leitfähigkeit zu niedrig",
	"problem_reason.low_light": "zu wenig Tageslicht",
	"problem_reason.nighttime": "Nacht; Licht wird nicht bewertet",
	"problem_reason.soil_temperature_ok": "Bodentemperatur im Sollbereich",
	"problem_reason.soil_temperature_stale": "Bodentemperaturmesswert veraltet",
	"problem_reason.soil_temperature_unavailable": "Bodentemperaturmesswert nicht verfügbar",
	"problem_reason.temperature_ok": "Temperatur im Sollbereich",
	"problem_reason.temperature_stale": "Temperaturmesswert veraltet",
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
	"threshold_intro.temperature_stress": "Leere Felder übernehmen den integrierten Standardwert. Ausgefüllte Felder überschreiben ihn nur für diese Pflanze. Die wirksame Reihenfolge muss Kälte-Auslöser < Kälte-Aufhebung < Hitze-Aufhebung < Hitze-Auslöser erfüllen, mit mindestens 0,5 °C Hysterese je Seite und einem stabilen Bereich von 1,0 °C.",
	"threshold_intro.humidity_stress": "Leere Felder übernehmen den integrierten Standardwert. Ausgefüllte Felder überschreiben ihn nur für diese Pflanze. Die wirksame Reihenfolge muss Trocken-Auslöser < Trocken-Aufhebung < Feucht-Aufhebung < Feucht-Auslöser erfüllen, mit mindestens 1,0 % Hysterese je Seite und einem stabilen Bereich von 5,0 %.",
	"threshold_intro.conductivity_stress": "Leere Felder übernehmen den integrierten Standardwert. Ausgefüllte Felder überschreiben ihn nur für diese Pflanze. Die wirksame Reihenfolge muss Niedrig-Auslöser < Niedrig-Aufhebung < Hoch-Aufhebung < Hoch-Auslöser erfüllen, mit mindestens 10,0 µS/cm Hysterese je Seite und einem stabilen Bereich von 50,0 µS/cm.",
	"threshold_intro.co2_stress": "Leere Felder übernehmen den integrierten Standardwert. Ausgefüllte Felder überschreiben ihn nur für diese Pflanze. Die wirksame Reihenfolge muss Aufhebung < Auslöser erfüllen, mit mindestens 100 ppm Hysterese; beide Werte sind ganze Zahlen von 0 bis 10.000 ppm.",
	"threshold_intro.soil_temperature_stress": "Leere Felder übernehmen den integrierten Standardwert. Ausgefüllte Felder überschreiben ihn nur für diese Pflanze. Die wirksame Reihenfolge muss Kälte-Auslöser < Kälte-Aufhebung < Hitze-Aufhebung < Hitze-Auslöser erfüllen, mit mindestens 0,5 °C Hysterese je Seite und einem stabilen Bereich von 1,0 °C, alles innerhalb von −20,0 bis 60,0 °C.",
	"threshold_intro.low_battery": "Leere Felder übernehmen den integrierten Standardwert. Ausgefüllte Felder überschreiben ihn nur für diese Pflanze. Die wirksame Reihenfolge muss Auslöser < Aufhebung erfüllen, mit mindestens 1 % Hysterese; beide Werte sind ganze Zahlen von 0 bis 100 %.",
	"threshold_intro.low_light": "Leere Felder übernehmen den integrierten Standardwert. Ausgefüllte Felder überschreiben ihn nur für diese Pflanze. Die wirksame Reihenfolge muss Zielwert < Aufhebung erfüllen, mit mindestens 10,0 lx Hysterese; beide Werte liegen zwischen 0,0 und 200.000,0 lx.",
	"threshold_saved.temperature_stress": "Schwellenwerte für Temperaturstress gespeichert.",
	"threshold_saved.humidity_stress": "Schwellenwerte für Luftfeuchtestress gespeichert.",
	"threshold_saved.conductivity_stress": "Schwellenwerte für Leitfähigkeitsstress gespeichert.",
	"threshold_saved.co2_stress": "Schwellenwerte für CO2-Stress gespeichert.",
	"threshold_saved.soil_temperature_stress": "Schwellenwerte für Bodentemperaturstress gespeichert.",
	"threshold_saved.low_battery": "Schwellenwerte für „Batterie niedrig“ gespeichert.",
	"threshold_saved.low_light": "Schwellenwerte für „Zu wenig Licht“ gespeichert.",
	"threshold_error.temperature_stress": "Die wirksamen Schwellenwerte müssen Kälte-Auslöser < Kälte-Aufhebung < Hitze-Aufhebung < Hitze-Auslöser erfüllen, mit ≥ 0,5 °C Hysterese und einem stabilen Bereich von ≥ 1,0 °C, alles innerhalb von −40,0 bis 80,0 °C.",
	"threshold_error.humidity_stress": "Die wirksamen Schwellenwerte müssen Trocken-Auslöser < Trocken-Aufhebung < Feucht-Aufhebung < Feucht-Auslöser erfüllen, mit ≥ 1,0 % Hysterese und einem stabilen Bereich von ≥ 5,0 %, alles innerhalb von 0,0 bis 100,0 %.",
	"threshold_error.conductivity_stress": "Die wirksamen Schwellenwerte müssen Niedrig-Auslöser < Niedrig-Aufhebung < Hoch-Aufhebung < Hoch-Auslöser erfüllen, mit ≥ 10,0 µS/cm Hysterese und einem stabilen Bereich von ≥ 50,0 µS/cm, alles innerhalb von 0,0 bis 10.000,0 µS/cm.",
	"threshold_error.co2_stress": "Die wirksamen Schwellenwerte müssen Aufhebung < Auslöser mit ≥ 100 ppm Hysterese erfüllen; beide Werte sind ganze Zahlen von 0 bis 10.000 ppm.",
	"threshold_error.soil_temperature_stress": "Die wirksamen Schwellenwerte müssen Kälte-Auslöser < Kälte-Aufhebung < Hitze-Aufhebung < Hitze-Auslöser erfüllen, mit ≥ 0,5 °C Hysterese und einem stabilen Bereich von ≥ 1,0 °C, alles innerhalb von −20,0 bis 60,0 °C.",
	"threshold_error.low_battery": "Die wirksamen Schwellenwerte müssen Auslöser < Aufhebung mit ≥ 1 % Hysterese erfüllen; beide Werte sind ganze Zahlen von 0 bis 100 %.",
	"threshold_error.low_light": "Die wirksamen Schwellenwerte müssen Zielwert < Aufhebung mit ≥ 10,0 lx Hysterese erfüllen; beide Werte liegen zwischen 0,0 und 200.000,0 lx.",
	"wizard.step_basic": "Grunddaten",
	"wizard.step_species": "Art und Pflege",
	"wizard.step_review_species": "Art prüfen",
	"wizard.step_sensors": "Feuchtesensoren",
	"wizard.step_thresholds": "Feuchte-Schwellenwerte",
	"wizard.step_taxonomy": "Kategorie und Tags",
	"wizard.step_review": "Prüfen und erstellen",
	"wizard.progress": "Fortschritt beim Erstellen",
	"wizard.saved_after_confirmation": "Deine Pflanze wird erst nach der abschließenden Bestätigung gespeichert. Du kannst zurückgehen, ohne deine Auswahl zu verlieren.",
	"wizard.retry_draft": "Entwurf erneut starten",
	"wizard.plant_name": "Pflanzenname",
	"wizard.acquired_date": "Anschaffungsdatum",
	"wizard.photo": "Optionales lokales Foto",
	"wizard.photo_hint": "JPEG, PNG oder WebP; höchstens 5 MiB und 2048 × 2048. Wird erst nach dem Erstellen hochgeladen.",
	"wizard.photo_selected": "Ausgewählt: {name} ({bytes} Byte)",
	"wizard.photo_remove": "Ausgewähltes Foto entfernen",
	"wizard.species_source": "Quelle der Artdaten",
	"wizard.manual_title": "Details selbst eingeben",
	"wizard.manual_description": "Gib einen Artnamen ein oder fahre ohne fort. Funktioniert offline.",
	"wizard.openplantbook_title": "OpenPlantBook durchsuchen",
	"wizard.openplantbook_description": "Finde eine Art, prüfe die importierten Informationen und wähle dann aus, was übernommen wird.",
	"wizard.openplantbook_unavailable_title": "OpenPlantBook ist nicht verbunden",
	"wizard.openplantbook_unavailable_help": "Smart Plants verbindet sich direkt mit OpenPlantBook. Erstelle ein OpenPlantBook-Konto und API-Client-Zugangsdaten und trage sie in Home Assistant unter Einstellungen → Geräte & Dienste → Smart Plants → Konfigurieren ein. Die separate Home-Assistant-OpenPlantBook-Integration muss nicht installiert werden.",
	"wizard.openplantbook_credentials_link": "OpenPlantBook-API-Zugangsdaten abrufen",
	"wizard.species_details": "Artdetails",
	"wizard.optional": "Optional",
	"wizard.builtin_defaults": "Die Feuchte-Standardwerte stammen von Smart Plants: {min} Minimum, {target} Zielwert, {max} Maximum. Du kannst sie später prüfen oder anpassen.",
	"wizard.search_label": "OpenPlantBook durchsuchen (mindestens 3 Zeichen)",
	"wizard.search_button": "Pflanzen suchen",
	"wizard.no_matches": "Keine Treffer. Versuche eine andere Suche oder wechsle zur manuellen Eingabe.",
	"wizard.manual_instead": "Stattdessen Details manuell eingeben",
	"wizard.accept_species": "Ich habe diese Artinformationen geprüft und übernehme sie",
	"wizard.imported_defaults_hint": "Importierte Feuchte-Standardwerte werden mit ihrer Quelle angezeigt. Fehlende Werte verwenden die Standardwerte von Smart Plants.",
	"wizard.effective_range": "Aktueller wirksamer Bereich:",
	"wizard.range_value": "{min}–{max}",
	"wizard.target_separator": ", Zielwert ",
	"wizard.inherited_openplantbook": "Übernommene Werte verwenden geprüfte OpenPlantBook-Daten, soweit vorhanden, sonst die Standardwerte von Smart Plants.",
	"wizard.inherited_builtin": "Übernommene Werte verwenden die integrierten Standardwerte von Smart Plants.",
	"wizard.overrides_hint": "Lass einen Wert leer, um seinen aktuellen Standardwert zu übernehmen.",
	"wizard.taxonomy_hint": "Tags und Kategorie gehören zu Smart Plants und sind unabhängig von Home-Assistant-Labels.",
	"wizard.review_area": "Bereich",
	"wizard.review_missing_area": "{area} (Bereich fehlt)",
	"wizard.review_exposure": "Sonne / Regen",
	"wizard.review_acquired": "Angeschafft",
	"wizard.review_taxonomy": "Kategorie / Tags",
	"wizard.review_sources": "Quellen",
	"wizard.review_primary_aggregation": "Primär / Aggregation",
	"wizard.review_staleness": "Veraltet nach",
	"wizard.review_seconds": "{seconds} Sekunden",
	"wizard.review_thresholds": "Wirksame Schwellenwerte",
	"wizard.review_threshold": "{key}: {value} ({source})",
	"wizard.inherited": "übernommen",
	"wizard.override": "überschrieben",
	"wizard.review_photo": "Foto",
	"wizard.review_photo_info": "{format} · {width} × {height} Pixel · {bytes} Byte",
	"wizard.confirm_hint": "Die Bestätigung erstellt ein Pflanzengerät mit seinen Feuchte-Entitäten. Benachrichtigungen kannst du anschließend in Home Assistant einrichten.",
	"wizard.final_request_retained": "Die abschließende Anfrage bleibt unverändert erhalten. Wiederhole sie, um ein unsicheres Ergebnis sicher aufzulösen, auch nach einer neuen Verbindung. Starte keinen neuen Entwurf, bevor das Ergebnis geklärt ist.",
	"wizard.rejected": "Der Server hat die Anfrage als ungültig oder abgelaufen abgelehnt. Du kannst sie mit einem neuen Entwurf korrigieren; Artdaten müssen erneut angezeigt und übernommen werden.",
	"wizard.start_fresh": "Neuen Entwurf starten und Eingaben behalten",
	"wizard.previous": "Vorheriger Schritt",
	"wizard.next": "Nächster Schritt",
	"wizard.retry_create": "Dieselbe Erstellungsanfrage wiederholen",
	"wizard.create": "Bestätigen und Pflanze erstellen",
	"wizard.working": "Wird bearbeitet …",
	"wizard.error_code": "{code}: Anfrage fehlgeschlagen. Prüfe die Eingaben oder versuche es erneut, sobald eine Verbindung besteht. Die Art kann manuell eingegeben werden; abgelaufene Vorschauen müssen erneut geprüft werden.",
	"wizard.error_generic": "Anfrage fehlgeschlagen. Versuche es erneut, sobald eine Verbindung besteht.",
	"wizard.error_name": "Gib einen Pflanzennamen ein.",
	"wizard.error_name_length": "Gib einen Pflanzennamen ein (1–200 Zeichen).",
	"wizard.error_acquired": "Gib ein gültiges Anschaffungsdatum ein.",
	"wizard.error_area": "Der ausgewählte Home-Assistant-Bereich existiert nicht mehr. Wähle einen aktuellen Bereich oder „Kein Bereich“.",
	"wizard.error_accept_preview": "Prüfe die ausgewählte Artvorschau und übernimm sie ausdrücklich, oder fahre manuell fort.",
	"wizard.error_choose_species": "Wähle ein Suchergebnis oder fahre manuell fort.",
	"wizard.error_accept": "Übernimm die Vorschau ausdrücklich oder fahre manuell fort.",
	"plant_status.needs_water": "Braucht Wasser",
	"plant_status.too_wet": "Zu nass",
	"plant_status.problem": "Problem",
	"plant_status.stale": "Keine aktuellen Daten",
	"plant_status.no_sensors": "Keine Sensoren",
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
	"reason.outside_target": "{role} liegt außerhalb des Zielbereichs"
}, Rt = {
	"format.percent": "{value}%",
	"format.recorded_date_time": "{datetime} (UTC{offset})",
	"common.cancel": "Cancel",
	"common.none": "None",
	"common.not_specified": "Not specified",
	"common.not_supplied": "Not supplied",
	"common.no_species_selected": "No species selected",
	"common.continue_manually": "Continue manually",
	"panel.admin_required": "Smart Plants requires an admin account.",
	"panel.menu": "Menu",
	"panel.back_to_overview": "Back to overview",
	"panel.add_plant": "Add plant",
	"panel.registry_unavailable": "Registry/state data unavailable: {error}. Reconnect before assigning registered sensors or areas.",
	"panel.open_created": "Open created plant",
	"panel.busy": "Saving or loading preview…",
	"api_error.unknown": "Request failed. Refresh and retry when connected.",
	"api_error.integration_not_loaded": "Smart Plants is not loaded. Open Settings → Devices & Services, then refresh after loading the integration.",
	"api_error.unauthorized": "Smart Plants requires an administrator account.",
	"api_error.not_found": "Plant or species not found. It may have been removed in another session.",
	"api_error.revision_conflict": "This plant changed elsewhere. Review the refreshed field changes and explicitly reapply your edits.",
	"api_error.provider_disabled": "Provider is unavailable. Continue manually; accepted local species data remains available.",
	"api_error.provider_authentication": "Provider authentication failed. Review the integration's reauthentication in Settings, or continue manually.",
	"api_error.provider_rate_limit": "Provider rate limit reached. Retry later or continue manually.",
	"api_error.provider_timeout": "Provider timed out. Retry later or continue manually.",
	"api_error.provider_outage": "Provider is currently unavailable. Retry later or continue manually.",
	"api_error.provider_malformed_response": "Provider returned an invalid response. Continue manually or retry later.",
	"api_error.version_mismatch": "Panel/API version mismatch. Restart Home Assistant and fully reload the frontend after upgrading.",
	"api_error.invalid_response": "The response is incompatible. Refresh before editing or retrying; creation retries retain the original request.",
	"api_error.invalid_format": "The server rejected the input. Review fields and source identities. Images must be valid JPEG, PNG or WebP up to 5 MiB and 2048 × 2048 pixels; expired species previews require a new review.",
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
	"conflict.heading": "Review changes from another session",
	"conflict.revision": "Revision {before} → {after}. Saving is paused. Local edits are retained.",
	"conflict.roles_changed": "Sensor configuration or threshold defaults/overrides changed.",
	"conflict.source_overlap": "Both sessions changed these source fields: {fields}. Review the refreshed role summary and your draft before retrying; Save will replace the refreshed values for these fields.",
	"conflict.retain": "I reviewed changes; retain my edits for reapply",
	"conflict.discard": "Discard my edits and use refreshed values",
	"conflict.reviewed": "Changes reviewed. Your edited fields are retained; inspect them and use each Save button to explicitly reapply.",
	"conflict.reviewed_overlap": "Both sessions changed {fields} in the sources editor. Saving will replace the refreshed values for those fields.",
	"conflict.reviewed_species": "Species previews must be requested and reviewed again.",
	"conflict_field.name": "name",
	"conflict_field.acquired_at": "acquired_at",
	"conflict_field.placement": "placement",
	"conflict_field.category": "category",
	"conflict_field.tags": "tags",
	"conflict_field.species": "species",
	"conflict_field.image": "image",
	"conflict_field.lifecycle_state": "lifecycle_state",
	"conflict_field.roles": "roles",
	"conflict_field.care_events": "care_events",
	"source_field.sources": "sources",
	"source_field.primary_entity_id": "primary_entity_id",
	"source_field.aggregation": "aggregation",
	"source_field.stale_after_seconds": "stale_after_seconds",
	"status.healthy": "healthy",
	"status.needs_water": "needs water",
	"status.too_wet": "too wet",
	"status.stale": "stale",
	"status.unavailable": "unavailable",
	"status.disabled": "disabled",
	"status.problems": "problems",
	"list.loading": "Loading plants…",
	"list.count_one": "{count} plant",
	"list.count_other": "{count} plants",
	"list.count_filtered": "{shown} of {total} plants",
	"metric.soil_moisture": "Soil moisture",
	"metric.moisture_health": "Moisture health",
	"detail.not_found": "Plant not found — it may have been deleted in another session.",
	"detail.open_device": "Open Home Assistant device",
	"detail.sections_label": "Plant sections",
	"detail.tab_overview": "Overview",
	"detail.tab_details": "Plant details",
	"detail.tab_diagnostics": "Diagnostics",
	"detail.identity_heading": "Identity and placement",
	"detail.name": "Name",
	"detail.acquired": "Acquired (ISO date/time, optional)",
	"detail.save_identity": "Save identity",
	"detail.area_current": "Current: {area}. Area belongs to the native device registry.",
	"detail.area_review": "The native area changed. Review current and selected areas before reapplying.",
	"detail.area_reviewed": "I reviewed the native area change",
	"detail.area_use_current": "Use current native area",
	"detail.save_area": "Save area",
	"overview.eyebrow": "PLANT OVERVIEW",
	"overview.details_button": "Plant details and photo",
	"overview.current_reading": "Current reading",
	"overview.no_current_reading": "No current reading",
	"overview.based_on_moisture": "Based on moisture readings",
	"overview.moisture_sensors": "Moisture sensors",
	"overview.aggregation": "{aggregation} aggregation",
	"overview.not_configured": "Not configured",
	"overview.assigned_sensors": "Assigned sensors",
	"overview.primary": "Primary",
	"overview.no_sensors": "No sensors assigned. You can still use the plant profile and log care.",
	"overview.manage_sensors": "Manage sensors",
	"overview.recent_care": "Recent care",
	"overview.no_care": "No care events recorded yet.",
	"overview.open_care": "Open care history",
	"overview.overall_confidence": "Overall health confidence: {label}",
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
	"taxonomy.heading": "Taxonomy",
	"taxonomy.category": "Category",
	"taxonomy.tags": "Tags (comma-separated)",
	"taxonomy.hint": "Smart Plants taxonomy is separate from Home Assistant labels.",
	"taxonomy.save": "Save taxonomy",
	"species.heading": "Species",
	"species.none": "No species assigned.",
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
	"snapshot.default_not_supplied": "Not supplied (built-in default applies)",
	"snapshot.field_attribution": "Field attribution",
	"snapshot.proposed_changes": "Proposed changes",
	"snapshot.preview_read_only": "Preview is read-only. Local overrides are preserved. No remote images are loaded.",
	"lifecycle.heading": "Lifecycle",
	"lifecycle.description": "Disabling stops plant evaluation and makes its entities unavailable. User-authored automations remain independent.",
	"lifecycle.disable": "Disable",
	"lifecycle.reenable": "Re-enable",
	"lifecycle.delete": "Delete plant",
	"dialog.delete_title": "Delete {name}?",
	"dialog.delete_body": "This permanently removes the plant, its device, entities, and local photo. This cannot be undone.",
	"dialog.delete_confirm": "Permanently delete plant",
	"dialog.species_title": "Review species changes",
	"dialog.preview_invalid": "The preview is no longer valid. Close and request a new preview.",
	"dialog.species_confirm": "Accept and apply reviewed species",
	"photo.heading": "Plant photo",
	"photo.loading": "Loading photo…",
	"photo.load_failed": "Photo could not be loaded: {error}",
	"photo.retry": "Retry photo",
	"photo.alt": "Photo of {name}",
	"photo.decode_failed": "The stored photo could not be decoded. Retry or replace it with a valid image.",
	"photo.none": "No photo yet.",
	"photo.stored": "Stored locally: {type} · {width} × {height} pixels",
	"photo.replace": "Replace photo",
	"photo.upload": "Upload photo",
	"photo.hint": "JPEG, PNG or WebP · max 5 MiB · max 2048 × 2048. Images are authenticated and stored locally.",
	"photo.remove": "Remove photo",
	"image_error.type_or_size": "Choose a nonempty JPEG, PNG or WebP image up to 5 MiB.",
	"image_error.unreadable": "This image could not be read. Select the file again.",
	"image_error.signature": "Image content does not match its JPEG, PNG or WebP file type. Choose another image.",
	"image_error.decode": "This file could not be decoded as an image. Choose another JPEG, PNG or WebP.",
	"image_error.dimensions": "Image dimensions must be at most 2048 × 2048 pixels.",
	"created.notice": "{name} created.",
	"created.uploading": "Uploading its selected photo…",
	"created.photo_skipped": "The plant changed after creation. The original wizard photo was not uploaded. Review its current photo in the plant detail and explicitly upload a photo if wanted.",
	"created.photo_uploaded": "Selected photo uploaded.",
	"created.photo_failed": "Selected photo was not uploaded. Open the created plant to upload it again.",
	"created.photo_interrupted": "Photo upload interrupted. Open the created plant to check its photo before retrying.",
	"moisture.heading": "Moisture configuration",
	"moisture.effective_summary": "Effective thresholds: {thresholds}",
	"moisture.advanced_overrides": "Advanced threshold overrides",
	"moisture.advanced_hint": "Blank values inherit the effective default shown above.",
	"moisture.save": "Save complete moisture configuration",
	"moisture.incompatible": "Moisture role data is missing or incompatible. Refresh or upgrade before editing; defaults will not be guessed.",
	"moisture.sources_intro": "Assign up to 32 sources. Primary never falls back automatically. Unavailable sensors can be assigned.",
	"moisture.add_sensor": "Add moisture sensor",
	"moisture.overrides_intro": "Blank overrides explicitly inherit defaults. Save applies the complete configuration atomically.",
	"moisture.override_label": "{key} override (%)",
	"moisture.default_effective": "Default {default} · effective {effective}",
	"moisture.inherit_key": "Inherit {key}",
	"moisture_threshold.min": "min",
	"moisture_threshold.target": "target",
	"moisture_threshold.max": "max",
	"sources.show_all": "Show all sensors (metadata fallback)",
	"sources.choose": "Choose a sensor",
	"sources.candidate": "{name} · {entity_id} · unit: {unit} · class: {device_class} · {state}",
	"sources.not_supplied_lower": "not supplied",
	"sources.unavailable_lower": "unavailable",
	"sources.unavailable": "Unavailable",
	"sources.assign_unavailable": "Assign an unavailable or unregistered sensor",
	"sources.press_enter": "Press Enter to add an entity ID.",
	"sources.primary_suffix": " · Primary",
	"sources.metadata": "Device class: {device_class} · Unit: {unit} · {registration}",
	"sources.registered": "Registered",
	"sources.not_registered": "Not in registry",
	"sources.native_settings": "Native sensor settings",
	"sources.remove": "Remove {entity_id}",
	"sources.open_repairs": "Open Home Assistant Repairs",
	"sources.primary": "Primary sensor",
	"sources.primary_none": "None (primary aggregation unavailable)",
	"sources.aggregation": "Aggregation",
	"sources.stale_after": "Stale after (seconds, 60–604800)",
	"sources.role_intro": "Assign up to 32 {role} sources. Primary never falls back automatically. Unavailable sensors can be assigned.",
	"sources.add_role_sensor": "Add {role} sensor",
	"aggregation.primary": "primary",
	"aggregation.average": "average",
	"aggregation.min": "min",
	"aggregation.max": "max",
	"source_warning.missing_registered": "Missing registered source — replace it explicitly or review Repairs.",
	"source_warning.unregistered": "Unregistered: renames cannot be followed reliably",
	"source_warning.unavailable": "Currently unavailable",
	"source_warning.moisture_metadata": "Unexpected metadata: evaluation requires numeric 0–100 %",
	"source_warning.moisture_reading": "Invalid reading: evaluation requires a numeric percentage from 0 to 100",
	"source_warning.role_metadata": "Unexpected metadata: {role} evaluation requires device class {device_class} and unit {units}",
	"source_warning.separator": ". ",
	"validation.sources_unique": "Choose at most 32 unique sensor entities.",
	"validation.aggregation": "Choose a supported aggregation.",
	"validation.primary": "Primary must be one of the assigned sensors or None.",
	"validation.stale_after": "Staleness must be an integer from 60 to 604800 seconds.",
	"validation.moisture_thresholds": "Effective moisture thresholds must be integers: 1 ≤ min < target < max ≤ 99, with a span of at least 4%.",
	"validation.taxonomy": "Use a category up to 60 characters and at most 32 unique tags up to 60 characters each.",
	"sensors.heading": "Sensors",
	"sensors.intro": "Assign Home Assistant sensors to each role. A role's computed sensor and problem binary appear once it has had at least one source. The entity picker is filtered by device class and unit; other sensors are available under \"Show all sensors\".",
	"sensors.switch_prompt": "You have unsaved changes in the {role} sources editor. Switch editors and discard them?",
	"sensors.edit": "Edit sources",
	"sensors.refused": "{role} source data is missing or incompatible. Refresh or upgrade before editing; defaults will not be guessed.",
	"sensors.save": "Save {role} sources",
	"sensors.saved": "{role} sources saved.",
	"sensors.summary_unavailable": "role data unavailable",
	"sensors.summary_empty": "no sources — this role has no computed entity yet",
	"sensors.source_count_one": "{count} source",
	"sensors.source_count_other": "{count} sources",
	"sensors.summary_primary": " · primary {entity_id}",
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
	"care.no_irrigation": "Care records do not operate irrigation or change moisture alerts.",
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
	"care_kind_phrase.watering": "watering",
	"care_kind_phrase.fertilizing": "fertilizing",
	"care_kind_phrase.pruning": "pruning",
	"care_kind_phrase.repotting": "repotting",
	"care_kind_phrase.note": "note",
	"care_field.product": "Product",
	"care_field.amount": "Amount",
	"care_field.unit": "Unit (g or mL)",
	"care_field.part": "Plant part",
	"care_field.container": "Container",
	"care_field.medium": "Growing medium",
	"care_field.text": "Note text",
	"care_field.note": "Note",
	"automations.heading": "Native automations",
	"automations.description": "Use the plant's needs-water entity for notifications or reminders in Home Assistant. Dynamic/template references may not appear in related results.",
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
	"section.advanced_diagnostics": "Advanced diagnostics",
	"section.advanced_diagnostics_description": "Status of the problem indicators for this plant. Threshold editing is available for every role: temperature, humidity, conductivity, CO2, soil temperature stress, low battery, and low light.",
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
	"problem_reason.battery_stale": "battery reading is stale",
	"problem_reason.battery_unavailable": "battery reading unavailable",
	"problem_reason.co2_ok": "CO2 within range",
	"problem_reason.co2_stale": "CO2 reading is stale",
	"problem_reason.co2_stress": "CO2 too high",
	"problem_reason.co2_unavailable": "CO2 reading unavailable",
	"problem_reason.cold_stress": "too cold",
	"problem_reason.conductivity_ok": "conductivity within range",
	"problem_reason.conductivity_stale": "conductivity reading is stale",
	"problem_reason.conductivity_unavailable": "conductivity reading unavailable",
	"problem_reason.damp_stress": "air too damp",
	"problem_reason.dry_stress": "air too dry",
	"problem_reason.enough_light": "enough daytime light",
	"problem_reason.high_conductivity_stress": "conductivity too high",
	"problem_reason.hot_stress": "too hot",
	"problem_reason.humidity_ok": "humidity within range",
	"problem_reason.humidity_stale": "humidity reading is stale",
	"problem_reason.humidity_unavailable": "humidity reading unavailable",
	"problem_reason.illuminance_stale": "illuminance reading is stale",
	"problem_reason.illuminance_unavailable": "illuminance reading unavailable",
	"problem_reason.insufficient_daytime_samples": "not enough daytime readings yet",
	"problem_reason.low_battery": "battery low",
	"problem_reason.low_conductivity_stress": "conductivity too low",
	"problem_reason.low_light": "too little daytime light",
	"problem_reason.nighttime": "night; light is not evaluated",
	"problem_reason.soil_temperature_ok": "soil temperature within range",
	"problem_reason.soil_temperature_stale": "soil temperature reading is stale",
	"problem_reason.soil_temperature_unavailable": "soil temperature reading unavailable",
	"problem_reason.temperature_ok": "temperature within range",
	"problem_reason.temperature_stale": "temperature reading is stale",
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
	"threshold_label.cold_threshold": "Cold threshold",
	"threshold_label.cold_clear": "Cold clear",
	"threshold_label.hot_clear": "Hot clear",
	"threshold_label.hot_threshold": "Hot threshold",
	"threshold_label.dry_threshold": "Dry threshold",
	"threshold_label.dry_clear": "Dry clear",
	"threshold_label.damp_clear": "Damp clear",
	"threshold_label.damp_threshold": "Damp threshold",
	"threshold_label.high_threshold": "High threshold",
	"threshold_label.high_clear": "High clear",
	"threshold_label.low_threshold": "Low threshold",
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
	"threshold_intro.temperature_stress": "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy cold trigger < cold clear < hot clear < hot trigger, with at least 0.5 °C hysteresis per side and a 1.0 °C stable band.",
	"threshold_intro.humidity_stress": "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy dry trigger < dry clear < damp clear < damp trigger, with at least 1.0 % hysteresis per side and a 5.0 % stable band.",
	"threshold_intro.conductivity_stress": "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy low trigger < low clear < high clear < high trigger, with at least 10.0 µS/cm hysteresis per side and a 50.0 µS/cm stable band.",
	"threshold_intro.co2_stress": "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy clear_ppm < threshold_ppm with at least 100 ppm hysteresis; both are integers within 0…10000 ppm.",
	"threshold_intro.soil_temperature_stress": "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy cold trigger < cold clear < hot clear < hot trigger, with at least 0.5 °C hysteresis per side and a 1.0 °C stable band, all within −20.0…60.0 °C.",
	"threshold_intro.low_battery": "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy threshold_percent < clear_percent with at least 1 % hysteresis; both are integers within 0…100 %.",
	"threshold_intro.low_light": "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy target_lux < clear_lux with at least 10.0 lx hysteresis; both are within 0.0…200000.0 lx.",
	"threshold_saved.temperature_stress": "Temperature stress thresholds saved.",
	"threshold_saved.humidity_stress": "Humidity stress thresholds saved.",
	"threshold_saved.conductivity_stress": "Conductivity stress thresholds saved.",
	"threshold_saved.co2_stress": "CO2 stress thresholds saved.",
	"threshold_saved.soil_temperature_stress": "Soil temperature stress thresholds saved.",
	"threshold_saved.low_battery": "Low battery thresholds saved.",
	"threshold_saved.low_light": "Low light thresholds saved.",
	"threshold_error.temperature_stress": "Effective thresholds must satisfy cold trigger < cold clear < hot clear < hot trigger, with ≥ 0.5 °C hysteresis and a ≥ 1.0 °C stable band, all within −40.0…80.0 °C.",
	"threshold_error.humidity_stress": "Effective thresholds must satisfy dry trigger < dry clear < damp clear < damp trigger, with ≥ 1.0 % hysteresis and a ≥ 5.0 % stable band, all within 0.0…100.0 %.",
	"threshold_error.conductivity_stress": "Effective thresholds must satisfy low trigger < low clear < high clear < high trigger, with ≥ 10.0 µS/cm hysteresis and a ≥ 50.0 µS/cm stable band, all within 0.0…10000.0 µS/cm.",
	"threshold_error.co2_stress": "Effective thresholds must satisfy clear_ppm < threshold_ppm with ≥ 100 ppm hysteresis, both integers within 0…10000 ppm.",
	"threshold_error.soil_temperature_stress": "Effective thresholds must satisfy cold trigger < cold clear < hot clear < hot trigger, with ≥ 0.5 °C hysteresis and a ≥ 1.0 °C stable band, all within −20.0…60.0 °C.",
	"threshold_error.low_battery": "Effective thresholds must satisfy threshold_percent < clear_percent with ≥ 1 % hysteresis, both integers within 0…100 %.",
	"threshold_error.low_light": "Effective thresholds must satisfy target_lux < clear_lux with ≥ 10.0 lx hysteresis, both within 0.0…200000.0 lx.",
	"wizard.step_basic": "Basic info",
	"wizard.step_species": "Species and care",
	"wizard.step_review_species": "Review species",
	"wizard.step_sensors": "Moisture sensors",
	"wizard.step_thresholds": "Moisture thresholds",
	"wizard.step_taxonomy": "Category and tags",
	"wizard.step_review": "Review and create",
	"wizard.progress": "Creation progress",
	"wizard.saved_after_confirmation": "Your plant is saved only after the final confirmation. You can go back without losing your choices.",
	"wizard.retry_draft": "Retry starting draft",
	"wizard.plant_name": "Plant name",
	"wizard.acquired_date": "Acquired date",
	"wizard.photo": "Optional local photo",
	"wizard.photo_hint": "JPEG, PNG or WebP; 5 MiB, 2048 × 2048 maximum. Uploaded only after creation.",
	"wizard.photo_selected": "Selected: {name} ({bytes} bytes)",
	"wizard.photo_remove": "Remove selected photo",
	"wizard.species_source": "Species source",
	"wizard.manual_title": "Enter details myself",
	"wizard.manual_description": "Choose a species name or continue without one. Works offline.",
	"wizard.openplantbook_title": "Search OpenPlantBook",
	"wizard.openplantbook_description": "Find a species, review imported information, then choose what to apply.",
	"wizard.openplantbook_unavailable_title": "OpenPlantBook is not connected",
	"wizard.openplantbook_unavailable_help": "Smart Plants connects directly to OpenPlantBook. Create an OpenPlantBook account and API client credentials, then add them in Home Assistant under Settings → Devices & services → Smart Plants → Configure. You do not need to install a separate Home Assistant integration.",
	"wizard.openplantbook_credentials_link": "Get OpenPlantBook API credentials",
	"wizard.species_details": "Species details",
	"wizard.optional": "Optional",
	"wizard.builtin_defaults": "Moisture defaults come from Smart Plants: {min} minimum, {target} target, {max} maximum. You can review or adjust them later.",
	"wizard.search_label": "Search OpenPlantBook (at least 3 characters)",
	"wizard.search_button": "Search plants",
	"wizard.no_matches": "No matches. Try another search or switch to manual entry.",
	"wizard.manual_instead": "Enter details manually instead",
	"wizard.accept_species": "I reviewed and accept this species information",
	"wizard.imported_defaults_hint": "Imported moisture defaults will be shown with their source. Missing values use Smart Plants defaults.",
	"wizard.effective_range": "Current effective range:",
	"wizard.range_value": "{min}–{max}",
	"wizard.target_separator": ", target ",
	"wizard.inherited_openplantbook": "Values shown as inherited use reviewed OpenPlantBook data where supplied, otherwise Smart Plants defaults.",
	"wizard.inherited_builtin": "Values shown as inherited use Smart Plants built-in defaults.",
	"wizard.overrides_hint": "Leave a value blank to inherit its current default.",
	"wizard.taxonomy_hint": "Tags and category belong to Smart Plants, independently of Home Assistant labels.",
	"wizard.review_area": "Area",
	"wizard.review_missing_area": "{area} (missing area)",
	"wizard.review_exposure": "Sun / rain exposure",
	"wizard.review_acquired": "Acquired",
	"wizard.review_taxonomy": "Category / tags",
	"wizard.review_sources": "Sources",
	"wizard.review_primary_aggregation": "Primary / aggregation",
	"wizard.review_staleness": "Staleness",
	"wizard.review_seconds": "{seconds} seconds",
	"wizard.review_thresholds": "Effective thresholds",
	"wizard.review_threshold": "{key}: {value} ({source})",
	"wizard.inherited": "inherited",
	"wizard.override": "override",
	"wizard.review_photo": "Photo",
	"wizard.review_photo_info": "{format} · {width} × {height} pixels · {bytes} bytes",
	"wizard.confirm_hint": "Confirming creates one plant device and its moisture entities. You can configure notifications in Home Assistant afterwards.",
	"wizard.final_request_retained": "The final request is retained unchanged. Retry it to resolve an uncertain result safely, including after reconnect. Do not start a replacement draft until the result is resolved.",
	"wizard.rejected": "The server rejected the request as invalid or expired. You may correct it using a fresh draft; species data must be previewed and accepted again.",
	"wizard.start_fresh": "Start fresh draft retaining editable fields",
	"wizard.previous": "Previous step",
	"wizard.next": "Next step",
	"wizard.retry_create": "Retry same creation request",
	"wizard.create": "Confirm and create plant",
	"wizard.working": "Working…",
	"wizard.error_code": "{code}: Request failed. Review input or retry when connected. Species can be entered manually; expired previews require a new review.",
	"wizard.error_generic": "Request failed. Retry when connected.",
	"wizard.error_name": "Enter a plant name.",
	"wizard.error_name_length": "Enter a plant name (1–200 characters).",
	"wizard.error_acquired": "Enter a valid acquired date.",
	"wizard.error_area": "The selected Home Assistant area no longer exists. Choose a current area or No area.",
	"wizard.error_accept_preview": "Review and explicitly accept the selected species preview, or continue manually.",
	"wizard.error_choose_species": "Choose a species result or continue manually.",
	"wizard.error_accept": "Explicitly accept the preview or continue manually.",
	"plant_status.needs_water": "Needs water",
	"plant_status.too_wet": "Too wet",
	"plant_status.problem": "Problem",
	"plant_status.stale": "No recent data",
	"plant_status.no_sensors": "No sensors",
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
	"reason.outside_target": "{role} is outside its target"
}, zt = ["en", "de"], Bt = {
	en: Rt,
	de: Lt
};
function R(e) {
	return Object.hasOwn(Rt, e);
}
function Vt(e) {
	let t = (e?.locale?.language || e?.language || "en").toLowerCase().split(/[-_]/)[0] ?? "en";
	return zt.includes(t) ? t : "en";
}
function Ht(e) {
	if (!e) return;
	let t = e.replaceAll("_", "-");
	try {
		return Intl.getCanonicalLocales(t)[0];
	} catch {
		return;
	}
}
function Ut(e, t) {
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
function Wt(e) {
	if (e?.time_format === "12") return !0;
	if (e?.time_format === "24") return !1;
}
function Gt(e, t, n) {
	return t ? e.replace(/\{(\w+)\}/g, (e, r) => {
		if (!Object.hasOwn(t, r)) return e;
		let i = t[r];
		return typeof i == "number" ? n(i) : i;
	}) : e;
}
var Kt = /* @__PURE__ */ new Map();
function qt(e, t = Bt) {
	let n = Vt(e), r = e?.locale, i = t === Bt ? JSON.stringify([
		n,
		e?.language,
		r?.language,
		r?.number_format,
		r?.time_format,
		r?.date_format
	]) : null, a = i ? Kt.get(i) : void 0;
	if (a) return a;
	let o = Ht(r?.language || e?.language) ?? n, { locales: s, grouping: c } = Ut(r, o), l = c ? "min2" : !1, u = r?.date_format === "system" ? void 0 : [o], d = /* @__PURE__ */ new Map(), f = (e, t = {}) => {
		let n = JSON.stringify(t), r = d.get(n);
		return r || (r = new Intl.NumberFormat(s, {
			maximumFractionDigits: 2,
			useGrouping: l,
			...t
		}), d.set(n, r)), r.format(e);
	}, ee = t[n], te = (e, n) => Gt(ee[e] ?? t.en[e] ?? e, n, (e) => f(e)), ne = new Intl.PluralRules(n), p = new Intl.DateTimeFormat(u, {
		dateStyle: "medium",
		timeZone: "UTC"
	}), re = {
		hour: "numeric",
		minute: "2-digit"
	}, ie = Wt(r);
	ie !== void 0 && (re.hour12 = ie);
	let ae = new Intl.DateTimeFormat(u, {
		...re,
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: "UTC"
	}), m = new Intl.DateTimeFormat(u, {
		...re,
		year: "numeric",
		month: "short",
		day: "numeric"
	}), oe = {
		language: n,
		t: te,
		tn: (e, t, n, r) => te(ne.select(e) === "one" ? t : n, {
			...r,
			count: e
		}),
		number: f,
		percent: (e) => te("format.percent", { value: e }),
		date: (e) => {
			let t = /^(\d{4})-(\d\d)-(\d\d)$/.exec(e);
			return t ? p.format(Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3]))) : e;
		},
		recordedDateTime: (e) => {
			let t = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::\d\d(?:\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.exec(e);
			if (!t) return e;
			let n = Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3]), Number(t[4]), Number(t[5]));
			return te("format.recorded_date_time", {
				datetime: ae.format(n),
				offset: t[6] === "Z" ? "+00:00" : t[6]
			});
		},
		dateTime: (e) => {
			let t = Date.parse(e);
			return Number.isFinite(t) ? m.format(t) : e;
		}
	};
	return i && Kt.set(i, oe), oe;
}
var z = qt(), B = [
	"min",
	"target",
	"max"
], V = {
	min: 15,
	target: 35,
	max: 55
}, Jt = [
	"indoor",
	"outdoor",
	"balcony",
	"greenhouse",
	"covered_outdoor",
	"dormant_storage"
], Yt = [
	"temperature_stress",
	"humidity_stress",
	"soil_temperature_stress",
	"co2_stress",
	"low_light",
	"low_battery",
	"conductivity_stress"
];
function Xt(e, t = z) {
	let n = `section.health_contributor.${e}`;
	return R(n) ? t.t(n) : e.replaceAll("_", " ");
}
function Zt(e, t = z) {
	let n = `section.confidence_${e}`;
	return t.t(R(n) ? n : "section.confidence_other");
}
function Qt(e, t = z) {
	let n = `section.confidence_label_${e}`;
	return R(n) ? t.t(n) : e;
}
function $t(e, t = z) {
	return t.t(`problem.${e}`);
}
var en = {
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
}, tn = {
	cold_threshold_celsius: 10,
	cold_clear_celsius: 12,
	hot_clear_celsius: 32,
	hot_threshold_celsius: 35
}, nn = [
	"cold_threshold_celsius",
	"cold_clear_celsius",
	"hot_clear_celsius",
	"hot_threshold_celsius"
], rn = -40, an = 80, on = .5, sn = 1;
function cn(e) {
	return e >= 0 ? Math.floor(e * 10 + .5) / 10 : -(Math.floor(-e * 10 + .5) / 10);
}
function ln(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = cn(n);
	return r < rn || r > an ? "invalid" : r;
}
function un(e, t = z) {
	let n = {};
	for (let r of nn) {
		let i = ln(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.temperature_stress")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? tn[e], a = i("cold_threshold_celsius"), o = i("cold_clear_celsius"), s = i("hot_clear_celsius"), c = i("hot_threshold_celsius");
	return !(a < o && o < s && s < c) || o - a < on || c - s < on || s - o < sn ? {
		values: r,
		error: t.t("threshold_error.temperature_stress")
	} : {
		values: r,
		error: null
	};
}
function dn(e) {
	let t = {
		cold_threshold_celsius: "",
		cold_clear_celsius: "",
		hot_clear_celsius: "",
		hot_threshold_celsius: ""
	};
	if (!e) return t;
	for (let n of nn) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var fn = {
	dry_threshold_percent: 25,
	dry_clear_percent: 30,
	damp_clear_percent: 80,
	damp_threshold_percent: 85
}, pn = [
	"dry_threshold_percent",
	"dry_clear_percent",
	"damp_clear_percent",
	"damp_threshold_percent"
], mn = 0, hn = 100, gn = 1, _n = 5;
function vn(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = cn(n);
	return r < mn || r > hn ? "invalid" : r;
}
function yn(e, t = z) {
	let n = {};
	for (let r of pn) {
		let i = vn(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.humidity_stress")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? fn[e], a = i("dry_threshold_percent"), o = i("dry_clear_percent"), s = i("damp_clear_percent"), c = i("damp_threshold_percent");
	return !(a < o && o < s && s < c) || o - a < gn || c - s < gn || s - o < _n ? {
		values: r,
		error: t.t("threshold_error.humidity_stress")
	} : {
		values: r,
		error: null
	};
}
function bn(e) {
	let t = {
		dry_threshold_percent: "",
		dry_clear_percent: "",
		damp_clear_percent: "",
		damp_threshold_percent: ""
	};
	if (!e) return t;
	for (let n of pn) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var xn = {
	low_threshold_micro_siemens_per_cm: 350,
	low_clear_micro_siemens_per_cm: 500,
	high_clear_micro_siemens_per_cm: 1800,
	high_threshold_micro_siemens_per_cm: 2e3
}, Sn = [
	"low_threshold_micro_siemens_per_cm",
	"low_clear_micro_siemens_per_cm",
	"high_clear_micro_siemens_per_cm",
	"high_threshold_micro_siemens_per_cm"
], Cn = 0, wn = 1e4, Tn = 10, En = 50;
function Dn(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = cn(n);
	return r < Cn || r > wn ? "invalid" : r;
}
function On(e, t = z) {
	let n = {};
	for (let r of Sn) {
		let i = Dn(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.conductivity_stress")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? xn[e], a = i("low_threshold_micro_siemens_per_cm"), o = i("low_clear_micro_siemens_per_cm"), s = i("high_clear_micro_siemens_per_cm"), c = i("high_threshold_micro_siemens_per_cm");
	return !(a < o && o < s && s < c) || o - a < Tn || c - s < Tn || s - o < En ? {
		values: r,
		error: t.t("threshold_error.conductivity_stress")
	} : {
		values: r,
		error: null
	};
}
function kn(e) {
	let t = {
		low_threshold_micro_siemens_per_cm: "",
		low_clear_micro_siemens_per_cm: "",
		high_clear_micro_siemens_per_cm: "",
		high_threshold_micro_siemens_per_cm: ""
	};
	if (!e) return t;
	for (let n of Sn) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var An = {
	threshold_ppm: 5e3,
	clear_ppm: 4e3
}, jn = ["threshold_ppm", "clear_ppm"], Mn = 0, Nn = 1e4, Pn = 100;
function Fn(e) {
	return e >= 0 ? Math.floor(e + .5) : -Math.floor(-e + .5);
}
function In(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = Fn(n);
	return r < Mn || r > Nn ? "invalid" : r;
}
function Ln(e, t = z) {
	let n = {};
	for (let r of jn) {
		let i = In(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.co2_stress")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? An[e], a = i("clear_ppm"), o = i("threshold_ppm");
	return !(a < o) || o - a < Pn ? {
		values: r,
		error: t.t("threshold_error.co2_stress")
	} : {
		values: r,
		error: null
	};
}
function Rn(e) {
	let t = {
		threshold_ppm: "",
		clear_ppm: ""
	};
	if (!e) return t;
	for (let n of jn) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var zn = {
	cold_threshold_celsius: 10,
	cold_clear_celsius: 12,
	hot_clear_celsius: 32,
	hot_threshold_celsius: 35
}, Bn = [
	"cold_threshold_celsius",
	"cold_clear_celsius",
	"hot_clear_celsius",
	"hot_threshold_celsius"
], Vn = -20, Hn = 60, Un = .5, Wn = 1;
function Gn(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = cn(n);
	return r < Vn || r > Hn ? "invalid" : r;
}
function Kn(e, t = z) {
	let n = {};
	for (let r of Bn) {
		let i = Gn(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.soil_temperature_stress")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? zn[e], a = i("cold_threshold_celsius"), o = i("cold_clear_celsius"), s = i("hot_clear_celsius"), c = i("hot_threshold_celsius");
	return !(a < o && o < s && s < c) || o - a < Un || c - s < Un || s - o < Wn ? {
		values: r,
		error: t.t("threshold_error.soil_temperature_stress")
	} : {
		values: r,
		error: null
	};
}
function qn(e) {
	let t = {
		cold_threshold_celsius: "",
		cold_clear_celsius: "",
		hot_clear_celsius: "",
		hot_threshold_celsius: ""
	};
	if (!e) return t;
	for (let n of Bn) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var Jn = {
	threshold_percent: 20,
	clear_percent: 25
}, Yn = ["threshold_percent", "clear_percent"], Xn = 0, Zn = 100, Qn = 1;
function $n(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = Fn(n);
	return r < Xn || r > Zn ? "invalid" : r;
}
function er(e, t = z) {
	let n = {};
	for (let r of Yn) {
		let i = $n(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.low_battery")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? Jn[e], a = i("threshold_percent"), o = i("clear_percent");
	return !(a < o) || o - a < Qn ? {
		values: r,
		error: t.t("threshold_error.low_battery")
	} : {
		values: r,
		error: null
	};
}
function tr(e) {
	let t = {
		threshold_percent: "",
		clear_percent: ""
	};
	if (!e) return t;
	for (let n of Yn) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
var nr = {
	target_lux: 500,
	clear_lux: 700
}, rr = ["target_lux", "clear_lux"], ir = 0, ar = 2e5, or = 10;
function sr(e) {
	let t = e.trim();
	if (t === "") return null;
	let n = Number(t);
	if (!Number.isFinite(n)) return "invalid";
	let r = cn(n);
	return r < ir || r > ar ? "invalid" : r;
}
function cr(e, t = z) {
	let n = {};
	for (let r of rr) {
		let i = sr(e[r]);
		if (i === "invalid") return {
			values: {},
			error: t.t("threshold_error.low_light")
		};
		n[r] = i;
	}
	let r = n, i = (e) => r[e] ?? nr[e], a = i("target_lux"), o = i("clear_lux");
	return !(a < o) || o - a < or ? {
		values: r,
		error: t.t("threshold_error.low_light")
	} : {
		values: r,
		error: null
	};
}
function lr(e) {
	let t = {
		target_lux: "",
		clear_lux: ""
	};
	if (!e) return t;
	for (let n of rr) {
		let r = e[n];
		t[n] = r == null ? "" : String(r);
	}
	return t;
}
function ur(e, t, n, r, i = z) {
	let a = `smart_plants:${e.id}:${t}`, o = n.find((e) => e.unique_id === a && e.platform === "smart_plants");
	if (!o) return [];
	let s = r[o.entity_id];
	return s ? en[t].map((e) => {
		let t = s.attributes[e.key], n = typeof t == "number" && Number.isFinite(t) ? t : null;
		return {
			key: e.key,
			label: i.t(e.label),
			unit: e.unit,
			value: n
		};
	}) : [];
}
function dr(e, t, n, r = z) {
	return Yt.map((i) => {
		let a = $t(i, r), o = `smart_plants:${e.id}:${i}`, s = t.find((e) => e.unique_id === o && e.platform === "smart_plants");
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
function fr() {
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
function H(e) {
	let t = e.roles?.moisture;
	return !t || !Array.isArray(t.sources) || t.sources.length > 32 || !t.sources.every((e) => e && typeof e.entity_id == "string" && /^sensor\.[a-z0-9_]+$/.test(e.entity_id) && (e.registry_id === null || typeof e.registry_id == "string")) || ![
		"primary",
		"average",
		"min",
		"max"
	].includes(t.aggregation) || !Number.isInteger(t.stale_after_seconds) || t.stale_after_seconds < 60 || t.stale_after_seconds > 604800 || !(t.primary_entity_id === null || t.sources.some((e) => e.entity_id === t.primary_entity_id)) || !B.every((e) => t.threshold_defaults?.[e] && Number.isInteger(t.threshold_defaults[e].value) && t.threshold_defaults[e].value >= 1 && t.threshold_defaults[e].value <= 99 && ["builtin", "provider"].includes(t.threshold_defaults[e].source) && (t.threshold_defaults[e].provider === null || typeof t.threshold_defaults[e].provider == "string") && (t.threshold_defaults[e].provider_ref === null || typeof t.threshold_defaults[e].provider_ref == "string") && (t.threshold_overrides?.[e] === null || Number.isInteger(t.threshold_overrides?.[e]))) || mr(t, Object.fromEntries(B.map((e) => [e, t.threshold_defaults[e].value]))) || B.some((e) => {
		let n = t.threshold_defaults[e];
		return n.source === "builtin" ? n.provider !== null || n.provider_ref !== null : !n.provider || !n.provider_ref;
	}) ? null : t;
}
function pr(e) {
	return structuredClone({
		sources: e.sources,
		primary_entity_id: e.primary_entity_id,
		aggregation: e.aggregation,
		stale_after_seconds: e.stale_after_seconds,
		threshold_overrides: e.threshold_overrides
	});
}
function mr(e, t, n = z) {
	if (e.sources.length > 32 || new Set(e.sources.map((e) => e.entity_id)).size !== e.sources.length || new Set(e.sources.map((e) => e.registry_id ?? e.entity_id)).size !== e.sources.length || e.sources.some((e) => !/^sensor\.[a-z0-9_]+$/.test(e.entity_id))) return n.t("validation.sources_unique");
	if (![
		"primary",
		"average",
		"min",
		"max"
	].includes(e.aggregation)) return n.t("validation.aggregation");
	if (e.primary_entity_id !== null && !e.sources.some((t) => t.entity_id === e.primary_entity_id)) return n.t("validation.primary");
	if (!Number.isInteger(e.stale_after_seconds) || e.stale_after_seconds < 60 || e.stale_after_seconds > 604800) return n.t("validation.stale_after");
	let r = B.map((n) => e.threshold_overrides[n] ?? t[n]);
	return r.some((e) => !Number.isInteger(e) || e < 1 || e > 99) || !(r[0] < r[1] && r[1] < r[2] && r[2] - r[0] >= 4) ? n.t("validation.moisture_thresholds") : null;
}
function hr(e, t) {
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
function gr(e, t) {
	return t.find((t) => t.identifiers.some(([t, n]) => t === "smart_plants" && n === e.id));
}
function U(e, t) {
	return e.registry_id ? t.find((t) => t.id === e.registry_id) : t.find((t) => t.entity_id === e.entity_id);
}
function _r(e, t) {
	let n = e.sources.find((t) => t.entity_id === e.primary_entity_id);
	return {
		...structuredClone(e),
		sources: e.sources.map((e) => {
			let n = U(e, t);
			return n ? {
				entity_id: n.entity_id,
				registry_id: n.id
			} : { ...e };
		}),
		primary_entity_id: n ? U(n, t)?.entity_id ?? n.entity_id : null
	};
}
function vr(e, t, n, r = z) {
	let i = U(e, t);
	if (e.registry_id && !i) return r.t("source_warning.missing_registered");
	let a = n[i?.entity_id ?? e.entity_id], o = [];
	return i || o.push(r.t("source_warning.unregistered")), (!a || ["unknown", "unavailable"].includes(a.state)) && o.push(r.t("source_warning.unavailable")), a && (a.attributes.unit_of_measurement !== "%" || a.attributes.device_class !== "moisture") && o.push(r.t("source_warning.moisture_metadata")), a && !["unknown", "unavailable"].includes(a.state) && (!a.state.trim() || !Number.isFinite(Number(a.state)) || Number(a.state) < 0 || Number(a.state) > 100) && o.push(r.t("source_warning.moisture_reading")), o.join(r.t("source_warning.separator"));
}
var yr = [
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
function br(e) {
	return yr.find((t) => t.role === e);
}
function xr(e, t = z) {
	return t.t(`role.${e}`);
}
function Sr(e, t = z) {
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
function Cr(e) {
	return structuredClone({
		sources: e.sources,
		primary_entity_id: e.primary_entity_id,
		aggregation: e.aggregation,
		stale_after_seconds: e.stale_after_seconds
	});
}
function wr(e, t = z) {
	return e.sources.length > 32 || new Set(e.sources.map((e) => e.entity_id)).size !== e.sources.length || new Set(e.sources.map((e) => e.registry_id ?? e.entity_id)).size !== e.sources.length || e.sources.some((e) => !/^sensor\.[a-z0-9_]+$/.test(e.entity_id)) ? t.t("validation.sources_unique") : [
		"primary",
		"average",
		"min",
		"max"
	].includes(e.aggregation) ? e.primary_entity_id !== null && !e.sources.some((t) => t.entity_id === e.primary_entity_id) ? t.t("validation.primary") : !Number.isInteger(e.stale_after_seconds) || e.stale_after_seconds < 60 || e.stale_after_seconds > 604800 ? t.t("validation.stale_after") : null : t.t("validation.aggregation");
}
function Tr(e, t) {
	let n = e.sources.find((t) => t.entity_id === e.primary_entity_id);
	return {
		...structuredClone(e),
		sources: e.sources.map((e) => {
			let n = U(e, t);
			return n ? {
				entity_id: n.entity_id,
				registry_id: n.id
			} : { ...e };
		}),
		primary_entity_id: n ? U(n, t)?.entity_id ?? n.entity_id : null
	};
}
function Er(e, t, n, r, i = z) {
	let a = U(e, t);
	if (e.registry_id && !a) return i.t("source_warning.missing_registered");
	let o = n[a?.entity_id ?? e.entity_id], s = [];
	if (a || s.push(i.t("source_warning.unregistered")), (!o || ["unknown", "unavailable"].includes(o.state)) && s.push(i.t("source_warning.unavailable")), o) {
		let e = o.attributes.unit_of_measurement, t = o.attributes.device_class;
		(typeof e != "string" || !r.acceptedUnits.includes(e) || t !== r.deviceClass) && s.push(i.t("source_warning.role_metadata", {
			role: xr(r.role, i),
			device_class: r.deviceClass,
			units: r.acceptedUnits.join(" / ")
		}));
	}
	return s.join(i.t("source_warning.separator"));
}
function G(e) {
	return [...new Set(e.split(",").map((e) => e.trim()).filter(Boolean))];
}
function Dr(e, t, n = z) {
	return e.length > 60 || t.length > 32 || t.some((e) => e.length > 60) ? n.t("validation.taxonomy") : null;
}
//#endregion
//#region src/editors.ts
var Or = (e) => e.target.value;
function K(e, t, n, r = "text", i = 200) {
	return y`<label>${e}<input type=${r} maxlength=${i} .value=${t} @input=${(e) => n(Or(e))}></label>`;
}
function q(e, t, n, r, i) {
	return y`<label>${t}<select .value=${n} @change=${(e) => i(Or(e))}>${(n && !r.some((e) => e.value === n) ? [...r, {
		value: n,
		label: e.t("editor.current_value", { value: n })
	}] : r).map((e) => y`<option value=${e.value} ?selected=${e.value === n}>${e.label}</option>`)}</select></label>`;
}
function kr(e, t) {
	let n = `placement.${t}`;
	return R(n) ? e.t(n) : t.replaceAll("_", " ");
}
function Ar(e, t) {
	let n = `exposure.${t}`;
	return R(n) ? e.t(n) : t;
}
function jr(e, t) {
	let n = `rain_exposure.${t}`;
	return R(n) ? e.t(n) : t;
}
function Mr(e, t) {
	let n = `aggregation.${t}`;
	return R(n) ? e.t(n) : t;
}
function Nr(e, t) {
	return e.t(`moisture_threshold.${t}`);
}
function Pr(e, t, n, r) {
	return q(e, e.t("area.label"), t, [
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
function Fr(e, t, n) {
	let r = (e) => n({
		mode: "indoor",
		exposure: null,
		rain_exposure: null,
		container: null,
		...t,
		...e
	}), i = e.t("common.not_specified");
	return y`${q(e, e.t("placement.label"), t?.mode ?? "", [{
		value: "",
		label: i
	}, ...Jt.map((t) => ({
		value: t,
		label: kr(e, t)
	}))], (e) => e ? r({ mode: e }) : n(null))}
    ${t ? y`${q(e, e.t("exposure.label"), t.exposure ?? "", [
		"",
		"full_sun",
		"partial_sun",
		"shade"
	].map((t) => ({
		value: t,
		label: t ? Ar(e, t) : i
	})), (e) => r({ exposure: e || null }))}
    ${q(e, e.t("rain_exposure.label"), t.rain_exposure ?? "", [
		"",
		"none",
		"partial",
		"full"
	].map((t) => ({
		value: t,
		label: t ? jr(e, t) : i
	})), (e) => r({ rain_exposure: e || null }))}
    ${q(e, e.t("container.label"), t.container === null ? "" : String(t.container), [
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
function Ir(e, t, n) {
	let r = n[t], i = e.t("sources.not_supplied_lower");
	return e.t("sources.candidate", {
		name: typeof r?.attributes.friendly_name == "string" ? r.attributes.friendly_name : t,
		entity_id: t,
		unit: String(r?.attributes.unit_of_measurement ?? i),
		device_class: String(r?.attributes.device_class ?? i),
		state: r?.state ?? e.t("sources.unavailable_lower")
	});
}
function Lr(e, t, n, r, i, a, o, s, c, l, u, d) {
	let f = e.t("common.not_supplied");
	return y`
    <p>${s}</p>
    <label class="check"><input type="checkbox" .checked=${i} @change=${(e) => a(e.target.checked)}>${e.t("sources.show_all")}</label>
    ${q(e, c, "", [{
		value: "",
		label: e.t("sources.choose")
	}, ...u.map((t) => ({
		value: t,
		label: Ir(e, t, r)
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
		let a = U(i, n), s = i.registry_id && !a ? void 0 : r[a?.entity_id ?? i.entity_id];
		return y`<li><strong>${a?.entity_id ?? i.entity_id}</strong><p>${s?.state ?? e.t("sources.unavailable")} ${s?.attributes.unit_of_measurement ?? ""}${i.entity_id === t.primary_entity_id ? e.t("sources.primary_suffix") : ""}</p><p>${e.t("sources.metadata", {
			device_class: String(s?.attributes.device_class ?? f),
			unit: String(s?.attributes.unit_of_measurement ?? f),
			registration: a ? e.t("sources.registered") : e.t("sources.not_registered")
		})}</p><small>${d(i)}</small>${a ? y`<a href="/config/entities/entity/${encodeURIComponent(a.id)}">${e.t("sources.native_settings")}</a>` : x}<button type="button" @click=${() => o({
			sources: t.sources.filter((e) => e !== i),
			primary_entity_id: t.primary_entity_id === i.entity_id ? null : t.primary_entity_id
		})}>${e.t("sources.remove", { entity_id: i.entity_id })}</button></li>`;
	})}</ul>
    ${t.sources.some((e) => e.registry_id && !U(e, n)) ? y`<a href="/config/repairs">${e.t("sources.open_repairs")}</a>` : x}
    ${q(e, e.t("sources.primary"), t.primary_entity_id ?? "", [{
		value: "",
		label: e.t("sources.primary_none")
	}, ...t.sources.map((e) => ({
		value: e.entity_id,
		label: U(e, n)?.entity_id ?? e.entity_id
	}))], (e) => o({ primary_entity_id: e || null }))}
    ${q(e, e.t("sources.aggregation"), t.aggregation, [
		"primary",
		"average",
		"min",
		"max"
	].map((t) => ({
		value: t,
		label: Mr(e, t)
	})), (e) => o({ aggregation: e }))}
    ${K(e.t("sources.stale_after"), String(t.stale_after_seconds), (e) => o({ stale_after_seconds: Number(e) }), "number")}`;
}
function Rr(e, t, n, r, i, a, o, s, c = "all") {
	let l = (e) => s({
		...t,
		...e
	}), u = [.../* @__PURE__ */ new Set([...r.map((e) => e.entity_id), ...Object.keys(i)])].filter((e) => e.startsWith("sensor.") && (a || i[e]?.attributes.device_class === "moisture")).sort();
	return y`${c === "thresholds" ? x : Lr(e, t, r, i, a, o, l, e.t("moisture.sources_intro"), e.t("moisture.add_sensor"), "sensor.soil_moisture", u, (t) => vr(t, r, i, e))}
    ${c === "sources" ? x : y`<p>${e.t("moisture.overrides_intro")}</p><div class="grid">${B.map((r) => y`<div>${K(e.t("moisture.override_label", { key: Nr(e, r) }), t.threshold_overrides[r] === null ? "" : String(t.threshold_overrides[r]), (e) => l({ threshold_overrides: {
		...t.threshold_overrides,
		[r]: e.trim() === "" ? null : Number(e)
	} }), "number")}<small>${e.t("moisture.default_effective", {
		default: e.percent(n[r]),
		effective: e.percent(t.threshold_overrides[r] ?? n[r])
	})}</small><button type="button" @click=${() => l({ threshold_overrides: {
		...t.threshold_overrides,
		[r]: null
	} })}>${e.t("moisture.inherit_key", { key: Nr(e, r) })}</button></div>`)}</div>`}`;
}
function zr(e, t, n, r, i, a, o, s) {
	let c = (e) => s({
		...n,
		...e
	}), l = [.../* @__PURE__ */ new Set([...r.map((e) => e.entity_id), ...Object.keys(i)])].filter((e) => e.startsWith("sensor.") && (a || i[e]?.attributes.device_class === t.deviceClass && typeof i[e]?.attributes.unit_of_measurement == "string" && t.acceptedUnits.includes(i[e]?.attributes.unit_of_measurement))).sort(), u = Sr(t.role, e);
	return Lr(e, n, r, i, a, o, c, e.t("sources.role_intro", { role: u }), e.t("sources.add_role_sensor", { role: u }), `sensor.${t.role}`, l, (n) => Er(n, r, i, t, e));
}
function Br(e, t, n) {
	let r = e.t("common.not_supplied"), i = [
		[e.t("snapshot.provider"), t.provider],
		[e.t("snapshot.reference"), t.provider_ref],
		[e.t("snapshot.attribution"), t.attribution],
		[e.t("snapshot.fetched"), e.dateTime(t.fetched_at)],
		[e.t("snapshot.locale"), t.locale],
		[e.t("snapshot.status"), t.source_status === "manual" || t.source_status === "provider" ? e.t(`snapshot.status_${t.source_status}`) : t.source_status],
		[e.t("snapshot.confidence"), t.confidence === null ? r : e.number(t.confidence)],
		[e.t("snapshot.category"), t.category ?? r]
	];
	return y`<article><h3>${t.common_name ?? t.latin_name ?? e.t("snapshot.species")}</h3><p><i>${t.latin_name}</i></p>
    <dl>${i.map(([e, t]) => y`<dt>${e}</dt><dd>${t}</dd>`)}</dl>
    <h4>${e.t("snapshot.imported_defaults")}</h4>${B.map((n) => y`<p>${Nr(e, n)}: ${t.threshold_defaults.moisture?.[n] === void 0 ? e.t("snapshot.default_not_supplied") : e.number(t.threshold_defaults.moisture[n])}</p>`)}
    ${Object.entries(t.care_text).map(([e, t]) => y`<h4>${e}</h4><p class="prose">${t}</p>`)}
    <details><summary>${e.t("snapshot.field_attribution")}</summary>${Object.entries(t.field_sources).map(([e, t]) => y`<p>${e}: ${t}</p>`)}</details>
    ${n ? y`<h4>${e.t("snapshot.proposed_changes")}</h4>${Object.entries(n.diff).map(([e, t]) => y`<p>${e}: ${JSON.stringify(t.before)} → ${JSON.stringify(t.after)}</p>`)}<p>${e.t("snapshot.preview_read_only")}</p>` : x}</article>`;
}
//#endregion
//#region \0@oxc-project+runtime@0.151.0/helpers/esm/decorate.js
function J(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
//#endregion
//#region src/image.ts
async function Vr(e, t = z) {
	if (![
		"image/jpeg",
		"image/png",
		"image/webp"
	].includes(e.type) || e.size === 0 || e.size > 5242880) throw Error(t.t("image_error.type_or_size"));
	let n;
	try {
		n = new Uint8Array(await e.slice(0, 12).arrayBuffer());
	} catch {
		throw Error(t.t("image_error.unreadable"));
	}
	let r = (...e) => e.every((e, t) => n[t] === e), i = r(255, 216, 255) ? "image/jpeg" : r(137, 80, 78, 71, 13, 10, 26, 10) ? "image/png" : r(82, 73, 70, 70) && n[8] === 87 && n[9] === 69 && n[10] === 66 && n[11] === 80 ? "image/webp" : null;
	if (i !== e.type) throw Error(t.t("image_error.signature"));
	let a, o;
	try {
		if (typeof createImageBitmap == "function") {
			let t = await createImageBitmap(e);
			a = t.width, o = t.height, t.close();
		} else {
			let t = URL.createObjectURL(e);
			try {
				let e = new Image();
				await new Promise((n, r) => {
					e.onload = () => n(), e.onerror = () => r(/* @__PURE__ */ Error("decode")), e.src = t;
				}), a = e.naturalWidth, o = e.naturalHeight;
			} finally {
				URL.revokeObjectURL(t);
			}
		}
	} catch {
		throw Error(t.t("image_error.decode"));
	}
	if (!Number.isInteger(a) || !Number.isInteger(o) || a < 1 || o < 1 || a > 2048 || o > 2048) throw Error(t.t("image_error.dimensions"));
	return {
		format: i,
		bytes: e.size,
		width: a,
		height: o
	};
}
//#endregion
//#region src/styles.ts
var Hr = o`
  :host{display:block;color:var(--primary-text-color,#212121);font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif);line-height:1.5;overflow-wrap:anywhere}
  *{box-sizing:border-box} main{width:100%;max-width:none;margin:0;padding:0} .panel-content{width:100%;max-width:1280px;margin:0 auto;padding:16px 24px 24px} header,.actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap} header{justify-content:space-between;margin-bottom:24px}
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
`, Ur, Y = class extends w {
	constructor(...e) {
		super(...e), this.areas = [], this.entities = [], this.states = {}, this.blocked = !1, this.navigationContext = 0, this.step = 0, this.busy = !1, this.error = "", this.name = "", this.acquired = "", this.area = "", this.placement = null, this.category = "", this.tagText = "", this.common = "", this.latin = "", this.provider = "manual", this.query = "", this.results = [], this.searched = !1, this.preview = null, this.accepted = !1, this.moisture = fr(), this.all = !1, this.draft = null, this.finalRequest = null, this.photo = null, this.photoInfo = null, this.rejected = !1, this.generation = 0, this.lifecycle = 0, this.steps = [
			"wizard.step_basic",
			"wizard.step_species",
			"wizard.step_review_species",
			"wizard.step_sensors",
			"wizard.step_thresholds",
			"wizard.step_taxonomy",
			"wizard.step_review"
		];
	}
	get l() {
		return qt(this.hass);
	}
	get visibleSteps() {
		return this.steps.flatMap((e, t) => t === 2 && this.provider === "manual" ? [] : [{
			index: t,
			label: this.l.t(e)
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
			let t = await L.startWizard(this.hass);
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
		this.error = e instanceof F && t.includes(e.code) ? this.l.t("wizard.error_code", { code: e.code }) : this.l.t("wizard.error_generic"), e instanceof F && ["integration_not_loaded", "unauthorized"].includes(e.code) && this.dispatchEvent(new CustomEvent("backend-unavailable", {
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
			let e = await L.searchSpecies(this.hass, this.provider, this.query.trim(), this.hass.language ?? "en");
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
			let t = await L.previewWizard(this.hass, this.draft, e.provider, e.provider_ref, this.hass.language ?? "en");
			n === this.generation && (this.preview = t, this.step = 2, await this.focusStep());
		} catch (e) {
			n === this.generation && this.fail(e);
		} finally {
			t === this.lifecycle && (this.busy = !1);
		}
	}
	validate() {
		return !this.name.trim() || this.name.trim().length > 200 ? this.l.t("wizard.error_name_length") : this.acquired && !Number.isFinite(Date.parse(this.acquired)) ? this.l.t("wizard.error_acquired") : this.area && !this.areas.some((e) => e.area_id === this.area) ? this.l.t("wizard.error_area") : this.provider !== "manual" && (!this.preview || !this.accepted) ? this.l.t("wizard.error_accept_preview") : mr(this.moisture, this.defaults, this.l) ?? Dr(this.category, G(this.tagText), this.l);
	}
	async next() {
		if (this.busy || this.blocked || !this.draft || this.step >= 6) return;
		let e = this.lifecycle;
		if (this.error = "", this.step === 0 && !this.name.trim() && (this.error = this.l.t("wizard.error_name")), this.step === 0 && this.photo && !this.error) {
			this.busy = !0;
			try {
				let t = await Vr(this.photo, this.l);
				e === this.lifecycle && (this.photoInfo = t);
			} catch (t) {
				e === this.lifecycle && (this.error = t.message);
			} finally {
				e === this.lifecycle && (this.busy = !1);
			}
			if (e !== this.lifecycle || !this.isConnected) return;
		}
		this.step === 1 && this.provider !== "manual" && !this.preview && (this.error = this.l.t("wizard.error_choose_species")), this.step === 2 && this.provider !== "manual" && !this.accepted && (this.error = this.l.t("wizard.error_accept")), this.step === 3 && (this.error = mr({
			...this.moisture,
			threshold_overrides: {
				min: null,
				target: null,
				max: null
			}
		}, V, this.l) ?? ""), this.step === 4 && (this.error = mr(this.moisture, this.defaults, this.l) ?? ""), this.step === 5 && (this.error = Dr(this.category, G(this.tagText), this.l) ?? ""), this.error || (this.step = this.step === 1 && this.provider === "manual" ? 3 : this.step + 1, await this.focusStep());
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
				tags: G(this.tagText),
				moisture: _r(this.moisture, this.entities),
				...this.accepted && this.preview ? { accepted_preview: {
					preview_token: this.preview.preview_token,
					provider: this.preview.provider,
					operation: "select"
				} } : { species: hr(this.common, this.latin) }
			});
		}
		this.busy = !0, this.error = "";
		let e = this.lifecycle, t = this.navigationContext;
		try {
			let n = await L.createWizard(this.hass, this.finalRequest);
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
			e === this.lifecycle && (this.fail(t), this.rejected = t instanceof F && t.code === "invalid_format");
		} finally {
			e === this.lifecycle && (this.busy = !1);
		}
	}
	render() {
		let e = this.l, t = e.t("common.not_specified"), n = e.t("common.none"), r = (e) => this.moisture.threshold_overrides[e] ?? this.defaults[e];
		return y`<section class="wizard-card"><nav aria-label=${e.t("wizard.progress")}><ol class="stepper">${this.visibleSteps.map(({ index: t, label: n }, r) => y`<li aria-current=${t === this.step ? "step" : x}><span class="step-number">${e.number(r + 1)}</span><span>${n}</span></li>`)}</ol></nav>
      <h2 tabindex="-1">${e.t(this.steps[this.step])}</h2><p class="muted">${e.t("wizard.saved_after_confirmation")}</p>
      ${this.error ? y`<p class="error" role="alert">${this.error}</p>${(this.step === 1 || this.step === 2) && !this.finalRequest ? y`<button type="button" @click=${() => this.manual()}>${e.t("common.continue_manually")}</button>` : x}` : x}
      ${!this.draft && !this.busy ? y`<button @click=${() => void this.start()}>${e.t("wizard.retry_draft")}</button>` : x}
      <fieldset ?disabled=${this.busy || this.blocked || !!this.finalRequest}>
      ${this.step === 0 ? y`${K(e.t("wizard.plant_name"), this.name, (e) => this.name = e)}${K(e.t("wizard.acquired_date"), this.acquired, (e) => this.acquired = e, "date")}${Pr(e, this.area, this.areas, (e) => this.area = e)}${Fr(e, this.placement, (e) => this.placement = e)}<label>${e.t("wizard.photo")}<input type="file" accept="image/jpeg,image/png,image/webp" @change=${(e) => {
			this.photo = e.target.files?.[0] ?? null, this.photoInfo = null;
		}}></label><small>${e.t("wizard.photo_hint")}</small>${this.photo ? y`<p>${e.t("wizard.photo_selected", {
			name: this.photo.name,
			bytes: this.photo.size
		})}</p><button @click=${() => {
			this.photo = null, this.photoInfo = null;
			let e = this.shadowRoot?.querySelector("input[type=\"file\"]");
			e && (e.value = "");
		}}>${e.t("wizard.photo_remove")}</button>` : x}` : x}
      ${this.step === 1 ? y`<div class="choice-cards" role="radiogroup" aria-label=${e.t("wizard.species_source")}>
        <button type="button" class=${this.provider === "manual" ? "choice-card selected" : "choice-card"} aria-pressed=${this.provider === "manual"} @click=${() => this.manual()}><strong>${e.t("wizard.manual_title")}</strong><span>${e.t("wizard.manual_description")}</span></button>
        ${this.capabilities.providers.some((e) => e.provider === "openplantbook") ? y`<button type="button" class=${this.provider === "openplantbook" ? "choice-card selected" : "choice-card"} aria-pressed=${this.provider === "openplantbook"} ?disabled=${!this.capabilities.providers.some((e) => e.provider === "openplantbook" && e.available)} @click=${() => {
			this.manual(), this.provider = "openplantbook";
		}}><strong>${e.t("wizard.openplantbook_title")}</strong><span>${e.t("wizard.openplantbook_description")}</span></button>` : x}
      </div>
        ${this.capabilities.providers.some((e) => e.provider === "openplantbook" && !e.available) ? y`<aside class="provider-help"><strong>${e.t("wizard.openplantbook_unavailable_title")}</strong><p>${e.t("wizard.openplantbook_unavailable_help")}</p><a href="https://open.plantbook.io/apikey/" target="_blank" rel="noreferrer">${e.t("wizard.openplantbook_credentials_link")}</a></aside>` : x}
        ${this.provider === "manual" ? y`<h3>${e.t("wizard.species_details")} <span class="muted">${e.t("wizard.optional")}</span></h3>${K(e.t("species.common_name"), this.common, (e) => this.common = e)}${K(e.t("species.scientific_name"), this.latin, (e) => this.latin = e)}<p class="default-summary">${e.t("wizard.builtin_defaults", {
			min: e.percent(V.min),
			target: e.percent(V.target),
			max: e.percent(V.max)
		})}</p>` : y`
        ${K(e.t("wizard.search_label"), this.query, (e) => {
			this.query = e, this.generation++, this.results = [], this.preview = null, this.accepted = !1;
		})}<button type="button" class="primary" @click=${() => void this.search()} ?disabled=${this.busy || this.query.trim().length < 3}>${e.t("wizard.search_button")}</button>${this.searched && !this.results.length ? y`<p>${e.t("wizard.no_matches")}</p>` : x}<ul class="result-list">${this.results.map((e) => y`<li><button type="button" @click=${() => void this.choose(e)}>${e.common_name ?? e.latin_name} · ${e.latin_name}</button><small>${e.attribution}</small></li>`)}</ul><button type="button" @click=${() => this.manual()}>${e.t("wizard.manual_instead")}</button>`}` : x}
      ${this.step === 2 && this.preview ? y`${Br(e, this.preview.snapshot, this.preview)}<label class="check"><input type="checkbox" .checked=${this.accepted} @change=${(e) => this.accepted = e.target.checked}>${e.t("wizard.accept_species")}</label><p>${e.t("wizard.imported_defaults_hint")}</p><button type="button" @click=${() => this.manual()}>${e.t("wizard.manual_instead")}</button>` : x}
       ${this.step === 3 ? Rr(e, this.moisture, this.defaults, this.entities, this.states, this.all, (e) => this.all = e, (e) => this.moisture = e, "sources") : x}
       ${this.step === 4 ? y`<p class="default-summary">${e.t("wizard.effective_range")} <strong>${e.t("wizard.range_value", {
			min: e.percent(r("min")),
			max: e.percent(r("max"))
		})}</strong>${e.t("wizard.target_separator")}<strong>${e.percent(r("target"))}</strong>.</p><p>${this.accepted ? e.t("wizard.inherited_openplantbook") : e.t("wizard.inherited_builtin")}</p><details class="advanced-disclosure"><summary>${e.t("moisture.advanced_overrides")}</summary><p>${e.t("wizard.overrides_hint")}</p>${Rr(e, this.moisture, this.defaults, this.entities, this.states, this.all, (e) => this.all = e, (e) => this.moisture = e, "thresholds")}</details>` : x}
      ${this.step === 5 ? y`${K(e.t("taxonomy.category"), this.category, (e) => this.category = e, "text", 60)}${K(e.t("taxonomy.tags"), this.tagText, (e) => this.tagText = e, "text", 2e3)}<p>${e.t("wizard.taxonomy_hint")}</p>` : x}
      ${this.step === 6 ? y`<h3>${this.name}</h3><dl>
        <dt>${e.t("wizard.review_area")}</dt><dd>${this.areas.find((e) => e.area_id === this.area)?.name ?? (this.area ? e.t("wizard.review_missing_area", { area: this.area }) : e.t("area.none"))}</dd>
        <dt>${e.t("placement.label")}</dt><dd>${this.placement?.mode ? kr(e, this.placement.mode) : t}</dd>
        <dt>${e.t("wizard.review_exposure")}</dt><dd>${this.placement?.exposure ? Ar(e, this.placement.exposure) : t} / ${this.placement?.rain_exposure ? jr(e, this.placement.rain_exposure) : t}</dd>
        <dt>${e.t("container.label")}</dt><dd>${this.placement?.container === null || !this.placement ? t : this.placement.container ? e.t("container.in_container") : e.t("container.in_ground")}</dd>
        <dt>${e.t("wizard.review_acquired")}</dt><dd>${this.acquired ? e.date(this.acquired) : t}</dd>
        <dt>${e.t("species.heading")}</dt><dd>${this.accepted && this.preview ? [this.preview.snapshot.common_name, this.preview.snapshot.latin_name].filter(Boolean).join(" · ") : [this.common, this.latin].filter(Boolean).join(" · ") || e.t("common.no_species_selected")}</dd>
        <dt>${e.t("wizard.review_taxonomy")}</dt><dd>${this.category} / ${G(this.tagText).join(", ")}</dd>
        <dt>${e.t("wizard.review_sources")}</dt><dd>${this.moisture.sources.map((e) => e.entity_id).join(", ") || n}</dd>
        <dt>${e.t("wizard.review_primary_aggregation")}</dt><dd>${this.moisture.primary_entity_id ?? n} / ${Mr(e, this.moisture.aggregation)}</dd>
        <dt>${e.t("wizard.review_staleness")}</dt><dd>${e.t("wizard.review_seconds", { seconds: this.moisture.stale_after_seconds })}</dd>
        <dt>${e.t("wizard.review_thresholds")}</dt><dd>${[
			"min",
			"target",
			"max"
		].map((t) => e.t("wizard.review_threshold", {
			key: Nr(e, t),
			value: e.percent(r(t)),
			source: this.moisture.threshold_overrides[t] === null ? e.t("wizard.inherited") : e.t("wizard.override")
		})).join(" · ")}</dd>
        <dt>${e.t("wizard.review_photo")}</dt><dd>${this.photo?.name ?? n}${this.photoInfo ? y` · ${e.t("wizard.review_photo_info", {
			format: this.photoInfo.format,
			width: this.photoInfo.width,
			height: this.photoInfo.height,
			bytes: this.photoInfo.bytes
		})}` : x}</dd>
        </dl><p>${e.t("wizard.confirm_hint")}</p>` : x}
      </fieldset>
      ${this.finalRequest ? y`<p class="notice">${e.t("wizard.final_request_retained")}</p>` : x}
      ${this.rejected ? y`<p>${e.t("wizard.rejected")}</p><button ?disabled=${this.busy || this.blocked} @click=${() => {
			this.finalRequest = null, this.rejected = !1, this.preview = null, this.accepted = !1, this.step = 0, this.error = "", this.start();
		}}>${e.t("wizard.start_fresh")}</button>` : x}
      <div class="actions"><button @click=${() => {
			this.step = this.step === 3 && this.provider === "manual" ? 1 : this.step - 1, this.focusStep();
		}} ?disabled=${this.step === 0 || this.busy || !!this.finalRequest}>${e.t("wizard.previous")}</button>
      ${this.step < 6 ? y`<button class="primary" @click=${() => void this.next()} ?disabled=${this.busy || this.blocked || !this.draft}>${e.t("wizard.next")}</button>` : y`<button class="primary" @click=${() => void this.create()} ?disabled=${this.busy || this.blocked || !this.draft}>${this.finalRequest ? e.t("wizard.retry_create") : e.t("wizard.create")}</button>`}</div>
      <p role="status">${this.busy ? e.t("wizard.working") : ""}</p></section>`;
	}
};
Ur = Y, Ur.styles = Hr, J([T({ attribute: !1 })], Y.prototype, "hass", void 0), J([T({ attribute: !1 })], Y.prototype, "capabilities", void 0), J([T({ attribute: !1 })], Y.prototype, "areas", void 0), J([T({ attribute: !1 })], Y.prototype, "entities", void 0), J([T({ attribute: !1 })], Y.prototype, "states", void 0), J([T({ type: Boolean })], Y.prototype, "blocked", void 0), J([T({ type: Number })], Y.prototype, "navigationContext", void 0), J([E()], Y.prototype, "step", void 0), J([E()], Y.prototype, "busy", void 0), J([E()], Y.prototype, "error", void 0), J([E()], Y.prototype, "name", void 0), J([E()], Y.prototype, "acquired", void 0), J([E()], Y.prototype, "area", void 0), J([E()], Y.prototype, "placement", void 0), J([E()], Y.prototype, "category", void 0), J([E()], Y.prototype, "tagText", void 0), J([E()], Y.prototype, "common", void 0), J([E()], Y.prototype, "latin", void 0), J([E()], Y.prototype, "provider", void 0), J([E()], Y.prototype, "query", void 0), J([E()], Y.prototype, "results", void 0), J([E()], Y.prototype, "searched", void 0), J([E()], Y.prototype, "preview", void 0), J([E()], Y.prototype, "accepted", void 0), J([E()], Y.prototype, "moisture", void 0), J([E()], Y.prototype, "all", void 0), J([E()], Y.prototype, "draft", void 0), J([E()], Y.prototype, "finalRequest", void 0), J([E()], Y.prototype, "photo", void 0), J([E()], Y.prototype, "photoInfo", void 0), J([E()], Y.prototype, "rejected", void 0), customElements.get("smart-plants-wizard") || customElements.define("smart-plants-wizard", Y);
//#endregion
//#region src/components/shared-styles.ts
var Wr = o`
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
  }
`, Gr = o`
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
`;
function Kr(e) {
	switch (e) {
		case "--success-color": return "var(--sp-success)";
		case "--warning-color": return "var(--sp-warning)";
		case "--info-color": return "var(--sp-info)";
		case "--error-color": return "var(--sp-error)";
		default: return "var(--sp-disabled)";
	}
}
//#endregion
//#region src/components/sp-status-chip.ts
var qr, Jr = class extends w {
	constructor(...e) {
		super(...e), this.status = "healthy", this.label = "", this.more = 0, this.l = z;
	}
	willUpdate() {
		let e = it[this.status]?.color ?? "--disabled-text-color";
		this.toggleAttribute("muted", e === "--disabled-text-color"), this.style.setProperty("--sp-status", Kr(e));
	}
	render() {
		let e = it[this.status] ?? it.healthy, t = this.label || ot(this.l, this.status in it ? this.status : "healthy");
		return y`<span class="chip" part="chip"><ha-icon aria-hidden="true" .icon=${e.icon}></ha-icon><span class="label">${t}</span>${this.more > 0 ? y`<span aria-hidden="true">${this.l.t("plant_status.more", { count: this.more })}</span><span class="sr-only">${this.l.t("plant_status.more_label", { count: this.more })}</span>` : x}</span>`;
	}
};
qr = Jr, qr.styles = [
	Wr,
	Gr,
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
], J([T({ reflect: !0 })], Jr.prototype, "status", void 0), J([T()], Jr.prototype, "label", void 0), J([T({ type: Number })], Jr.prototype, "more", void 0), J([T({ attribute: !1 })], Jr.prototype, "l", void 0), customElements.get("sp-status-chip") || customElements.define("sp-status-chip", Jr);
//#endregion
//#region src/components/sp-moisture-bar.ts
var Yr, Xr = (e) => Math.min(100, Math.max(0, e)), X = class extends w {
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
		let e = this.l, t = this.range, n = this.value, r = dt(e, "moisture", t, "%"), i = n === null ? "—" : N(e, n, "%"), a = n === null ? e.t("moisture_bar.label_no_value") : r ? e.t("moisture_bar.label", {
			value: i,
			range: r
		}) : e.t("moisture_bar.label_no_range", { value: i }), o = this._hasRange(), s = o ? Xr(t.min) : 0, c = o ? Xr(t.max) : 0, l = t?.target ?? null, u = this.state === "stale" && this.lastReported;
		return y`
      <div class="top"><span class="name"><ha-icon aria-hidden="true" .icon=${M.moisture.icon}></ha-icon>${ut(e, "moisture")}</span>
        <span class="value ${this.state}" aria-hidden="true">${i}</span></div>
      <div class="track" role="img" aria-label=${a}>
        ${o ? y`<div class="band" style="left:${s}%;width:${Math.max(0, c - s)}%"></div>` : x}
        ${l === null ? x : y`<div class="tick" style="left:${Xr(l)}%"></div>`}
        ${n === null ? x : y`<div class="dot ${this.state}" style="left:${Math.min(98, Math.max(2, n))}%"></div>`}
      </div>
      <div class="scale" aria-hidden="true"><span>${e.t("moisture_bar.dry")}</span>${r ? y`<span>${e.t("moisture_bar.target", { range: r })}</span>` : x}<span>${e.t("moisture_bar.wet")}</span></div>
      ${u ? y`<div class="age"><ha-icon aria-hidden="true" icon="mdi:clock-outline"></ha-icon>${e.t("moisture_bar.last_update", { age: pt(e, this.lastReported, this.now) })}</div>` : x}`;
	}
};
Yr = X, Yr.styles = [Wr, o`
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
  `], J([T({ type: Number })], X.prototype, "value", void 0), J([T({ attribute: !1 })], X.prototype, "range", void 0), J([T({ reflect: !0 })], X.prototype, "state", void 0), J([T({ attribute: !1 })], X.prototype, "lastReported", void 0), J([T({ attribute: !1 })], X.prototype, "now", void 0), J([T({ attribute: !1 })], X.prototype, "l", void 0), customElements.get("sp-moisture-bar") || customElements.define("sp-moisture-bar", X);
//#endregion
//#region src/components/sp-reading-chip.ts
var Zr, Z = class extends w {
	constructor(...e) {
		super(...e), this.role = "temperature", this.value = null, this.unit = "", this.state = "ok", this.range = null, this.l = z;
	}
	render() {
		let e = this.l, t = M[this.role] ?? M.temperature, n = ut(e, this.role in M ? this.role : "temperature"), r = dt(e, this.role, this.range, this.unit), i = (this.state === "low" || this.state === "high") && r;
		return y`<span class="chip" part="chip" title=${r ? `${n}: ${r}` : n}>
      <ha-icon aria-hidden="true" .icon=${t.icon}></ha-icon><span class="sr-only">${n}</span>
      ${this.value === null ? e.t("reading.no_value") : N(e, this.value, this.unit)}
      ${i ? y`<span class="sr-only">, ${e.t("reading.outside_target", { range: r })}</span>` : x}
      ${this.state === "stale" ? y`<span class="sr-only">, ${e.t("reading.not_updating")}</span>` : x}
    </span>`;
	}
};
Zr = Z, Zr.styles = [
	Wr,
	Gr,
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
], J([T()], Z.prototype, "role", void 0), J([T({ type: Number })], Z.prototype, "value", void 0), J([T()], Z.prototype, "unit", void 0), J([T({ reflect: !0 })], Z.prototype, "state", void 0), J([T({ attribute: !1 })], Z.prototype, "range", void 0), J([T({ attribute: !1 })], Z.prototype, "l", void 0), customElements.get("sp-reading-chip") || customElements.define("sp-reading-chip", Z);
//#endregion
//#region src/components/sp-plant-avatar.ts
var Qr, $r = class extends w {
	constructor(...e) {
		super(...e), this.src = null, this.name = "", this.size = "small", this.l = z;
	}
	render() {
		return y`<div class="tile" part="tile">${this.src ? y`<img src=${this.src} alt=${this.l.t("photo.alt", { name: this.name })}>` : y`<ha-icon aria-hidden="true" icon="mdi:sprout"></ha-icon>`}</div>`;
	}
};
Qr = $r, Qr.styles = [Wr, o`
    :host { --sp-avatar-size: 56px; --sp-avatar-radius: 12px; display: inline-block; flex: none; width: var(--sp-avatar-size); height: var(--sp-avatar-size); max-width: 100%; }
    :host([size="large"]) { --sp-avatar-size: 132px; --sp-avatar-radius: 16px; }
    @media (max-width: 600px) { :host([size="large"]) { --sp-avatar-size: 76px; --sp-avatar-radius: 12px; } }
    .tile { width: 100%; height: 100%; border-radius: var(--sp-avatar-radius); overflow: hidden; display: grid; place-items: center;
      background: color-mix(in srgb, var(--sp-primary) 12%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
    ha-icon { --mdc-icon-size: calc(var(--sp-avatar-size) * .54); }
  `], J([T({ attribute: !1 })], $r.prototype, "src", void 0), J([T()], $r.prototype, "name", void 0), J([T({ reflect: !0 })], $r.prototype, "size", void 0), J([T({ attribute: !1 })], $r.prototype, "l", void 0), customElements.get("sp-plant-avatar") || customElements.define("sp-plant-avatar", $r);
//#endregion
//#region src/components/sp-empty-state.ts
var ei, ti = class extends w {
	constructor(...e) {
		super(...e), this.icon = "mdi:sprout", this.heading = "", this.compact = !1;
	}
	render() {
		return y`<div class="art" aria-hidden="true"><ha-icon .icon=${this.icon}></ha-icon></div>
      <h2>${this.heading}</h2><div class="text"><slot></slot></div><div class="actions"><slot name="actions"></slot></div>`;
	}
};
ei = ti, ei.styles = [Wr, o`
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
  `], J([T()], ti.prototype, "icon", void 0), J([T()], ti.prototype, "heading", void 0), J([T({
	type: Boolean,
	reflect: !0
})], ti.prototype, "compact", void 0), customElements.get("sp-empty-state") || customElements.define("sp-empty-state", ti);
//#endregion
//#region src/views/overview.ts
var ni, ri = "https://github.com/mikekuss/home-assistant-smart-plants/blob/main/docs/getting-started.md", ii = {
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
	}
}, ai = {
	attention: "overview.sort_attention",
	name: "overview.sort_name",
	area: "overview.sort_area"
}, oi = {
	attention: "mdi:alert-circle-outline",
	name: "mdi:sort-alphabetical-ascending",
	area: "mdi:texture-box"
}, Q = class extends w {
	constructor(...e) {
		super(...e), this.l = z, this.plants = [], this.overview = {}, this.areaNames = {}, this.thumbnails = {}, this.watering = /* @__PURE__ */ new Set(), this.loading = !1, this.blocked = !1, this.now = void 0, this.hidden = !1, this._filter = "all", this._sort = "attention", this._query = "";
	}
	_emit(e, t) {
		this.dispatchEvent(new CustomEvent(e, {
			detail: t,
			bubbles: !0,
			composed: !0
		}));
	}
	_items() {
		return this.plants.map((e) => {
			let t = e.species?.snapshot.latin_name ?? e.species?.snapshot.common_name ?? null, n = this.areaNames[e.id] ?? null, r = this.overview[e.id];
			return {
				id: e.id,
				name: e.name,
				areaName: n,
				status: r?.status,
				plant: e,
				overview: r,
				species: t,
				searchText: [
					e.name,
					n,
					e.species?.snapshot.common_name,
					e.species?.snapshot.latin_name,
					e.category,
					...e.tags
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
		if (this.loading && !this.plants.length) return y`<p class="loading" role="status">${e.t("list.loading")}</p>`;
		if (!this.plants.length) return this._renderEmpty();
		let t = this._items(), n = t.filter((e) => Ot(this._filter, e.status) && At(e, this._query)), r = this._filter !== "all";
		return y`<div class="content">
      <div class="summary" role="group" aria-label=${e.t("overview.filter_label")}>${Dt.map((e) => this._renderTile(e, t.filter((t) => Ot(e, t.status)).length))}</div>
      <div class="listbar">
        <label class="search"><ha-icon aria-hidden="true" icon="mdi:magnify"></ha-icon>
          <input type="search" .value=${this._query} placeholder=${e.t("overview.search")} aria-label=${e.t("overview.search")} @input=${(e) => {
			this._query = e.target.value;
		}}></label>
        <ha-dropdown @wa-select=${(e) => {
			let t = e.detail.item.value;
			kt.includes(t) && (this._sort = t);
		}}>
          <button slot="trigger" class="pill" type="button" aria-label=${e.t("overview.sort_button", { sort: e.t(ai[this._sort]) })}><ha-icon aria-hidden="true" icon="mdi:sort"></ha-icon>${e.t(ai[this._sort])}<ha-icon aria-hidden="true" icon="mdi:menu-down"></ha-icon></button>
          ${kt.map((t) => y`<ha-dropdown-item value=${t} ?checked=${this._sort === t}>
            ${this._sort === t ? y`<ha-icon slot="icon" icon="mdi:check"></ha-icon>` : y`<ha-icon slot="icon" .icon=${oi[t]}></ha-icon>`}${e.t(ai[t])}</ha-dropdown-item>`)}
        </ha-dropdown>
      </div>
      <div class="countline"><p role="status">${e.t("list.count_filtered", {
			shown: n.length,
			total: t.length
		})}${r ? ` · ${e.t(ii[this._filter].label)}` : ""}</p>
        ${r || this._query ? y`<button type="button" class="text-button" @click=${() => this._clear()}>${e.t("overview.clear_filter")}</button>` : x}</div>
      ${n.length ? this._renderList(n) : this._renderNoResults()}
    </div>
    <button type="button" class="fab" ?disabled=${this.blocked} @click=${() => this._emit("add-plant")}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${e.t("panel.add_plant")}</button>`;
	}
	_renderTile(e, t) {
		let n = ii[e];
		return y`<button type="button" class="tile ${t === 0 ? "zero" : ""}" style="--tone:${n.tone}" aria-pressed=${this._filter === e ? "true" : "false"}
      @click=${() => {
			this._filter = this._filter === e && e !== "all" ? "all" : e;
		}}>
      <span class="ico" aria-hidden="true"><ha-icon .icon=${n.icon}></ha-icon></span>
      <span><span class="num">${this.l.number(t)}</span><span class="lbl">${this.l.t(n.label)}</span></span></button>`;
	}
	_renderList(e) {
		return this._sort === "area" ? Nt(e).map((e) => y`<h2 class="group-heading"><ha-icon aria-hidden="true" icon="mdi:texture-box"></ha-icon>${e.area ?? this.l.t("overview.no_area")} <span class="n">· ${this.l.number(e.items.length)}</span></h2>
      <ul class="grid">${e.items.map((e) => y`<li>${this._renderCard(e)}</li>`)}</ul>`) : y`<ul class="grid">${Mt(e, this._sort).map((e) => y`<li>${this._renderCard(e)}</li>`)}</ul>`;
	}
	_renderCard(e) {
		let t = this.l, n = e.overview, r = e.plant, i = n ? xt(t, n) : null, a = n ? wt(t, n, this.now) : "", o = n?.roles.moisture, s = n ? Et(n) : [], c = `plant-${r.id}`;
		return y`<article class="card" aria-labelledby=${c}>
      <div class="head"><sp-plant-avatar .src=${this.thumbnails[r.id] ?? null} .name=${r.name} .l=${t}></sp-plant-avatar>
        <div class="title"><div role="heading" aria-level=${this._sort === "area" ? "3" : "2"}><button type="button" class="name" id=${c} @click=${() => this._emit("open-plant", { plantId: r.id })}>${r.name}</button></div>
          <span class="sub">${e.areaName ? y`<ha-icon aria-hidden="true" icon="mdi:texture-box"></ha-icon>${e.areaName}` : x}${e.areaName && e.species ? " · " : ""}${e.species ? y`<i>${e.species}</i>` : x}</span></div></div>
      ${n && i ? y`<div class="status"><sp-status-chip .status=${n.status} .label=${i.label} .more=${i.more} .l=${t}></sp-status-chip>${a ? y`<span class="reason">${a}</span>` : x}</div>` : x}
      ${n && n.status === "no_sensors" && !s.length ? y`<div class="empty-box"><span>${t.t("card.no_sensors")}</span><button type="button" class="text-button" @click=${() => this._emit("open-plant", {
			plantId: r.id,
			section: "sensors"
		})} aria-label=${t.t("card.assign_label", { name: r.name })}>${t.t("card.assign")}</button></div>` : o || s.length ? y`<div class="readings">
          ${o ? y`<sp-moisture-bar .value=${o.value} .range=${o.range} .state=${o.state} .lastReported=${o.last_reported} .now=${this.now} .l=${t}></sp-moisture-bar>` : x}
          ${s.length ? y`<div class="chips">${s.map(([e, n]) => y`<sp-reading-chip .role=${e} .value=${n.value} .unit=${n.unit} .state=${n.state} .range=${n.range} .l=${t}></sp-reading-chip>`)}</div>` : x}
        </div>` : x}
      <div class="foot"><span class="last"><ha-icon aria-hidden="true" icon="mdi:history"></ha-icon>${Tt(t, n?.last_watered_at ?? null, this.now)}</span>
        <button type="button" class="tonal" ?disabled=${this.blocked || this.watering.has(r.id)} aria-label=${t.t("card.log_watering_label", { name: r.name })} @click=${() => this._emit("log-watering", { plantId: r.id })}><ha-icon aria-hidden="true" icon="mdi:water"></ha-icon>${t.t("card.log_watering")}</button></div>
    </article>`;
	}
	_renderEmpty() {
		let e = this.l;
		return y`<sp-empty-state icon="mdi:sprout" .heading=${e.t("overview.empty_heading")}>${e.t("overview.empty_body")}
      <button slot="actions" type="button" class="filled" ?disabled=${this.blocked} @click=${() => this._emit("add-plant")}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${e.t("panel.add_plant")}</button>
      <a slot="actions" class="text-button" href=${ri} target="_blank" rel="noopener noreferrer">${e.t("overview.how_it_works")}</a></sp-empty-state>`;
	}
	_renderNoResults() {
		let e = this.l, t = this._query.trim() ? e.t("overview.no_match_query", { query: this._query.trim() }) : e.t("overview.no_match_filter", { filter: e.t(ii[this._filter].label) });
		return y`<sp-empty-state class="no-results" compact icon="mdi:magnify-remove-outline" .heading=${e.t("overview.no_match_heading")}>${t}
      <button slot="actions" type="button" class="text-button" @click=${() => this._clear()}>${e.t("overview.show_all")}</button></sp-empty-state>`;
	}
};
ni = Q, ni.styles = [Wr, o`
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

    @container (max-width: 600px) {
      .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .tile { padding: 10px; gap: 10px; }
      .tile .ico { width: 34px; height: 34px; }
      .grid { grid-template-columns: 1fr; }
    }
  `], J([T({ attribute: !1 })], Q.prototype, "l", void 0), J([T({ attribute: !1 })], Q.prototype, "plants", void 0), J([T({ attribute: !1 })], Q.prototype, "overview", void 0), J([T({ attribute: !1 })], Q.prototype, "areaNames", void 0), J([T({ attribute: !1 })], Q.prototype, "thumbnails", void 0), J([T({ attribute: !1 })], Q.prototype, "watering", void 0), J([T({ type: Boolean })], Q.prototype, "loading", void 0), J([T({ type: Boolean })], Q.prototype, "blocked", void 0), J([T({ attribute: !1 })], Q.prototype, "now", void 0), J([T({
	type: Boolean,
	reflect: !0
})], Q.prototype, "hidden", void 0), J([E()], Q.prototype, "_filter", void 0), J([E()], Q.prototype, "_sort", void 0), J([E()], Q.prototype, "_query", void 0), customElements.get("smart-plants-overview") || customElements.define("smart-plants-overview", Q);
//#endregion
//#region src/panel.ts
var si, ci = Object.fromEntries([
	{
		problemRole: "temperature_stress",
		configRole: "temperature",
		keys: nn,
		defaults: tn,
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
		validate: (e, t) => un(e, t),
		seed: (e) => dn(e)
	},
	{
		problemRole: "humidity_stress",
		configRole: "humidity",
		keys: pn,
		defaults: fn,
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
		validate: (e, t) => yn(e, t),
		seed: (e) => bn(e)
	},
	{
		problemRole: "conductivity_stress",
		configRole: "conductivity",
		keys: Sn,
		defaults: xn,
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
		validate: (e, t) => On(e, t),
		seed: (e) => kn(e)
	},
	{
		problemRole: "co2_stress",
		configRole: "co2",
		keys: jn,
		defaults: An,
		unit: "ppm",
		min: "0",
		max: "10000",
		step: "1",
		labels: {
			threshold_ppm: "threshold_field.high_trigger",
			clear_ppm: "threshold_field.high_clear"
		},
		validate: (e, t) => Ln(e, t),
		seed: (e) => Rn(e)
	},
	{
		problemRole: "soil_temperature_stress",
		configRole: "soil_temperature",
		keys: Bn,
		defaults: zn,
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
		validate: (e, t) => Kn(e, t),
		seed: (e) => qn(e)
	},
	{
		problemRole: "low_battery",
		configRole: "battery",
		keys: Yn,
		defaults: Jn,
		unit: "%",
		min: "0",
		max: "100",
		step: "1",
		labels: {
			threshold_percent: "threshold_field.low_trigger",
			clear_percent: "threshold_field.low_clear"
		},
		validate: (e, t) => er(e, t),
		seed: (e) => tr(e)
	},
	{
		problemRole: "low_light",
		configRole: "illuminance",
		keys: rr,
		defaults: nr,
		unit: "lx",
		min: "0",
		max: "200000",
		step: "0.1",
		labels: {
			target_lux: "threshold_field.target",
			clear_lux: "threshold_field.clear"
		},
		validate: (e, t) => cr(e, t),
		seed: (e) => lr(e)
	}
].map((e) => [e.problemRole, e])), li = "M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", ui = "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z";
function di(e) {
	let t = -e.getTimezoneOffset();
	return `${new Date(e.getTime() + t * 6e4).toISOString().slice(0, 19)}${t < 0 ? "-" : "+"}${String(Math.floor(Math.abs(t) / 60)).padStart(2, "0")}:${String(Math.abs(t) % 60).padStart(2, "0")}`;
}
var $ = class extends w {
	constructor(...e) {
		super(...e), this.narrow = !1, this._plants = [], this._loading = !0, this._error = "", this._notice = "", this._view = { kind: "list" }, this._detailSection = "overview", this._formBusy = !1, this._capabilities = null, this._blocked = !0, this._areas = [], this._entities = [], this._devices = [], this._states = {}, this._evaluations = {}, this._health = {}, this._healthError = "", this._careHistory = null, this._careError = "", this._careDate = "", this._careNote = "", this._careKind = "watering", this._careFields = {}, this._careEditingId = null, this._registryError = "", this._areaReview = !1, this._overview = {}, this._overviewError = "", this._thumbnails = {}, this._watering = /* @__PURE__ */ new Set(), this._edits = null, this._conflict = null, this._allSensors = !1, this._preview = null, this._provider = "manual", this._query = "", this._results = [], this._related = [], this._imageUrl = null, this._imageLoading = !1, this._imageError = null, this._dialog = null, this._wizardStarted = !1, this._creationNotice = "", this._createdPlantId = null, this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._thresholdSaved = {}, this._pendingThresholdSwitch = null, this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._sourceUnavailable = null, this._sourceSaved = {}, this._pendingSourceSwitch = null, this._allSourceSensors = !1, this._base = null, this._baseArea = "", this._imageKey = null, this._imageRequest = 0, this._thumbnailKeys = {}, this._thumbnailAborts = /* @__PURE__ */ new Map(), this._request = 0, this._careRequest = 0, this._providerRequest = 0, this._context = 0, this._subscriptionGeneration = 0, this._focusReturn = null, this._ready = () => {
			this._refresh();
		}, this._disconnected = () => {
			this._context++, this._formBusy = !1, this._blocked = !0, this._request++, this._providerRequest++, this._preview = null, this._clearImage(), this._error = this._l.t("error.disconnected");
		};
	}
	get _l() {
		return qt(this.hass);
	}
	willUpdate(e) {
		e.has("hass") && (this.hass?.states && (this._states = Object.fromEntries(Object.entries(this.hass.states).filter(([e, t]) => Qe(t) && t.entity_id === e))), this._syncImage());
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
		this._context++, this._formBusy = !1, this._request++, this._providerRequest++, this._clearImage(), this._clearThumbnails(), this._unbind(), clearInterval(this._timer), super.disconnectedCallback();
	}
	_bind() {
		if (!this.hass || this.hass.user?.is_admin === !1 || this._connection) return;
		let e = this.hass.connection;
		this._connection = e;
		let t = this._subscriptionGeneration;
		e.addEventListener?.("ready", this._ready), e.addEventListener?.("disconnected", this._disconnected), L.subscribeRegistry(this.hass, this._ready).then((n) => {
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
			this._thumbnailAborts.set(t, n), L.fetchImage(e, t, n.signal).then((e) => {
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
		this._imageAbort = r, this._imageLoading = !0, L.fetchImage(this.hass, e.id, r.signal).then((e) => {
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
			let r = await L.info(n), i = await L.list(n);
			if (t !== this._request || !this.isConnected) return;
			if (this._capabilities = r, this._blocked = !1, this._plants = i, e && (this._error = ""), this._base) {
				let e = i.find((e) => e.id === this._base?.id);
				e && e.revision !== this._base.revision && this._setConflict(this._base, e), e || (this._context++, this._formBusy = !1, this._closeDialog(), this._base = null, this._conflict = null, this._edits = null, this._notice = this._l.t("notice.deleted_elsewhere"), this.updateComplete.then(() => this.shadowRoot?.querySelector("h1")?.focus()));
			}
			this._syncImage();
			try {
				let [e, r, i, a] = await Promise.all([
					L.areas(n),
					L.entities(n),
					L.devices(n),
					L.states(n)
				]);
				if (t !== this._request) return;
				if (this._areas = e, this._entities = r, this._devices = i, this._states = n.states ? Object.fromEntries(Object.entries(n.states).filter(([e, t]) => Qe(t) && t.entity_id === e)) : Object.fromEntries(a.map((e) => [e.entity_id, e])), this._registryError = "", this._base && this._edits) {
					let e = gr(this._base, i)?.area_id ?? "";
					if (e !== this._baseArea) {
						let t = this._edits.area !== this._baseArea;
						this._notice = this._l.t(t ? "notice.area_changed_retained" : "notice.area_changed_synced", {
							from: this._areaName(this._baseArea),
							to: this._areaName(e)
						}), t || this._edit({ area: e }), this._areaReview = t, this._baseArea = e;
					}
				}
			} catch (e) {
				t === this._request && (this._registryError = this._friendly(e));
			}
			try {
				let e = await L.overview(n);
				t === this._request && (this._overview = Object.fromEntries(e.map((e) => [e.plant_id, e])), this._overviewError = "");
			} catch (e) {
				t === this._request && (this._overview = {}, this._overviewError = this._friendly(e));
			}
			if (t === this._request && this._syncThumbnails(), this._view.kind === "detail") {
				let e = this._view.plantId;
				try {
					let r = await L.evaluation(n, e);
					t === this._request && (this._evaluations = {
						...this._evaluations,
						[e]: r
					});
				} catch {
					if (t === this._request) {
						let t = { ...this._evaluations };
						delete t[e], this._evaluations = t;
					}
				}
			}
			if (this._view.kind === "detail") {
				let e = this._view.plantId;
				await this._loadCare(e, this._context, t);
				try {
					let r = await L.plantHealth(n, e);
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
		let t = e instanceof F ? `api_error.${e.code}` : "";
		return this._l.t(R(t) ? t : "api_error.unknown");
	}
	_plantById(e) {
		return this._plants.find((t) => t.id === e);
	}
	_plantAreaNames() {
		return Object.fromEntries(this._plants.map((e) => {
			let t = gr(e, this._devices)?.area_id;
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
		let t = H(e);
		this._base = structuredClone(e), this._baseArea = gr(e, this._devices)?.area_id ?? "", this._edits = {
			name: e.name,
			acquired: e.acquired_at ?? "",
			placement: structuredClone(e.placement),
			category: e.category ?? "",
			tagText: e.tags.join(", "),
			area: this._baseArea,
			common: e.species?.snapshot.common_name ?? "",
			latin: e.species?.snapshot.latin_name ?? "",
			moisture: t ? pr(t) : null
		}, this._conflict = null, this._areaReview = !1, this._preview = null, this._results = [], this._provider = "manual", this._related = [], this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._thresholdSaved = {}, this._pendingThresholdSwitch = null, this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._sourceSaved = {}, this._pendingSourceSwitch = null, this._allSourceSensors = !1, this._sourceUnavailable = null;
		let n = gr(e, this._devices), r = this._context;
		n && this.hass && L.related(this.hass, n.id).then((t) => {
			r === this._context && this._base?.id === e.id && (this._related = t);
		}).catch(() => {
			r === this._context && this._base?.id === e.id && (this._notice = this._l.t("notice.related_failed"));
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
			i && !this._blocked && (this._loadCare(r, a), L.evaluation(i, r).then((e) => {
				a === this._context && (this._evaluations = {
					...this._evaluations,
					[r]: e
				});
			}).catch(() => void 0), L.plantHealth(i, r).then((e) => {
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
		e.detail.item.value === "add-plant" && this._show({ kind: "create" }), e.detail.item.value === "back-to-overview" && this._show({ kind: "list" }), e.detail.item.value === "integration-options" && this._navigate("/config/integrations/integration/smart_plants"), e.detail.item.value === "documentation" && window.open(ri, "_blank", "noopener,noreferrer");
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
	async _withRevision(e, t) {
		let n = this._plantById(e);
		if (!n) throw new F("not_found", "Plant not found.");
		try {
			return await t(n.revision);
		} catch (n) {
			if (!(n instanceof F && n.code === "revision_conflict")) throw n;
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
			let i = await this._withRevision(e, (t) => L.addWatering(n, e, t, di(/* @__PURE__ */ new Date()), null));
			this._adopt(i.plant);
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
			let i = await this._withRevision(e, (t) => L.deleteCareEvent(r, e, t, n));
			this._adopt(i.plant);
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
			let i = await L.careHistory(this.hass, e);
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
			this._careError = this._l.t("care.error_refresh_save");
			return;
		}
		let n = new Date(this._careDate);
		if (!this._careDate || Number.isNaN(n.getTime()) || n.getTime() > Date.now() || (/* @__PURE__ */ new Date(n.getTime() - n.getTimezoneOffset() * 6e4)).toISOString().slice(0, 16) !== this._careDate) {
			this._careError = this._l.t("care.error_date");
			return;
		}
		let r = this._careFields, i = this._carePayload(), a = typeof i.note == "string" ? i.note : null;
		if ((this._careKind === "watering" || this._careKind === "fertilizing" || this._careKind === "pruning" || this._careKind === "repotting") && a && a.length > 500) {
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
		this._careError = "", await this._mutate(async () => (this._careEditingId ? await L.editCareEvent(l, e.id, e.revision, this._careEditingId, this._careKind, c, i) : await L.addCareEvent(l, e.id, e.revision, this._careKind, c, i)).plant), this._error || (this._careEditingId = null, this._careKind = "watering", this._careFields = {}, this._careNote = "");
	}
	async _deleteCare(e, t) {
		if (!this.hass || !this._careHistory || this._careHistory.revision !== e.revision) {
			this._careError = this._l.t("care.error_refresh_delete");
			return;
		}
		if (!window.confirm(this._l.t("care.confirm_delete", { kind: this._l.t(`care_kind_phrase.${t.kind}`) }))) return;
		let n = this.hass;
		await this._mutate(async () => (await L.deleteCareEvent(n, e.id, e.revision, t.id)).plant);
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
			return R(n) ? t.t(n) : e;
		}, a = (e) => t.t(`care_kind.${e}`), o = (e) => t.t(`care_kind_phrase.${e}`), s = (e, n) => typeof n == "number" && e === "amount" ? t.number(n) : String(n);
		return y`<section aria-labelledby="care-heading"><h2 id="care-heading">${t.t("care.heading")}</h2>
      ${this._careError ? y`<p class="error" role="alert">${this._careError}</p>` : x}
      ${n ? y`<p role="status">${t.tn(n.summary.watering_count, "care.watering_count_one", "care.watering_count_other")} ${n.summary.last_watered_local_date ? t.t("care.last_watered", { date: t.date(n.summary.last_watered_local_date) }) : t.t("care.never_watered")}</p>
        ${n.events.length ? y`<ul aria-label=${t.t("care.events_label")}>${n.events.map((n) => y`<li><strong>${a(n.kind)}</strong> <time datetime=${n.occurred_at}>${t.recordedDateTime(n.occurred_at)}</time>
          ${Object.entries(n.payload).filter(([, e]) => e !== null).map(([e, t]) => y`<p>${i(e)}: ${s(e, t)}</p>`)}
          <button type="button" ?disabled=${this._formBusy || !!this._conflict} @click=${() => this._editCare(n)}>${t.t("care.edit_kind", { kind: o(n.kind) })}</button>
          <button type="button" ?disabled=${this._formBusy || !!this._conflict} @click=${() => void this._deleteCare(e, n)}>${t.t("care.delete_kind", { kind: o(n.kind) })}</button></li>`)}</ul>` : y`<p>${t.t("care.empty")}</p>`}` : y`<p>${t.t("care.loading")}</p>`}
      <fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict || !n || n.revision !== e.revision}>
        <legend>${this._careEditingId ? t.t("care.edit_kind", { kind: o(this._careKind) }) : t.t("care.record")}</legend>
        <label>${t.t("care.type")}<select aria-label=${t.t("care.type")} .value=${this._careKind} @change=${(e) => {
			this._careKind = e.target.value, this._careFields = {};
		}}>${[
			"watering",
			"fertilizing",
			"pruning",
			"repotting",
			"note"
		].map((e) => y`<option value=${e}>${a(e)}</option>`)}</select></label>
        <label>${t.t("care.when")}<input type="datetime-local" .value=${this._careDate} @input=${(e) => this._careDate = e.target.value}></label>
        ${(r[this._careKind] ?? []).map((e) => y`<label>${i(e)}<input aria-label=${i(e)} type=${e === "amount" ? "number" : "text"} maxlength=${e === "text" ? 1e3 : 120} .value=${this._careFields[e] ?? ""} @input=${(t) => this._careFields = {
			...this._careFields,
			[e]: t.target.value
		}}></label>`)}
        ${this._careKind === "note" ? x : y`<label>${t.t("care.note_optional")}<input type="text" maxlength="500" .value=${this._careNote} @input=${(e) => this._careNote = e.target.value}></label>`}
        ${this._careKind === "fertilizing" ? y`<label>${t.t("care.unit")}<select aria-label=${t.t("care.unit")} .value=${this._careFields.unit ?? ""} @change=${(e) => this._careFields = {
			...this._careFields,
			unit: e.target.value
		}}><option value="">${t.t("care.no_amount")}</option><option value="g">g</option><option value="mL">mL</option></select></label>` : x}
        <button type="button" class="primary" @click=${() => void this._saveCare(e)}>${this._careEditingId ? t.t("care.save_changes") : t.t("care.record")}</button>
        ${this._careEditingId ? y`<button type="button" @click=${() => {
			this._careEditingId = null, this._careKind = "watering", this._careFields = {}, this._careNote = "";
		}}>${t.t("care.cancel_editing")}</button>` : x}
      </fieldset><p>${t.t("care.no_irrigation")}</p></section>`;
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
	_statusLabel(e) {
		let t = {
			healthy: "status.healthy",
			"needs water": "status.needs_water",
			"too wet": "status.too_wet",
			stale: "status.stale",
			unavailable: "status.unavailable",
			disabled: "status.disabled",
			problems: "status.problems"
		};
		return t[e] ? this._l.t(t[e]) : e;
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
			let e = Dr(n.category, G(n.tagText), this._l);
			if (e) {
				this._error = e;
				return;
			}
			Object.assign(i, {
				category: n.category.trim() || null,
				tags: G(n.tagText)
			});
		}
		if (e === "species" && (i.species = hr(n.common, n.latin)), e === "moisture") {
			if (!n.moisture) return;
			if (this._registryError) {
				this._error = this._l.t("error.moisture_reconnect");
				return;
			}
			let e = mr(n.moisture, this._defaults(t), this._l);
			if (e) {
				this._error = e;
				return;
			}
		}
		await this._mutate(async () => e === "area" ? await L.setArea(r, t.id, t.revision, n.area || null) : e === "moisture" && n.moisture ? L.configureMoisture(r, t.id, t.revision, _r(n.moisture, this._entities)) : L.update(r, i), !1, e);
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
			this._error = this._friendly(e), e instanceof F && e.code === "revision_conflict" && await this._refresh(!1), e instanceof F && ["integration_not_loaded", "unauthorized"].includes(e.code) && (this._blocked = !0, this._clearImage());
		} finally {
			r === this._context && (this._formBusy = !1);
		}
	}
	_defaults(e) {
		let t = H(e);
		return t ? {
			min: t.threshold_defaults.min.value,
			target: t.threshold_defaults.target.value,
			max: t.threshold_defaults.max.value
		} : V;
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
		r.name !== e.name && (d.name = r.name), r.acquired !== (e.acquired_at ?? "") && (d.acquired = r.acquired), JSON.stringify(r.placement) !== JSON.stringify(e.placement) && (d.placement = r.placement), r.category !== (e.category ?? "") && (d.category = r.category), JSON.stringify(G(r.tagText)) !== JSON.stringify(e.tags) && (d.tagText = r.tagText), r.area !== this._baseArea && (d.area = r.area), r.common !== (e.species?.snapshot.common_name ?? "") && (d.common = r.common), r.latin !== (e.species?.snapshot.latin_name ?? "") && (d.latin = r.latin);
		let f = H(e), ee = H(t);
		if (r.moisture && f && ee) {
			let e = pr(ee);
			for (let t of [
				"sources",
				"primary_entity_id",
				"aggregation",
				"stale_after_seconds"
			]) JSON.stringify(r.moisture[t]) !== JSON.stringify(f[t]) && Object.assign(e, { [t]: structuredClone(r.moisture[t]) });
			for (let t of B) r.moisture.threshold_overrides[t] !== f.threshold_overrides[t] && (e.threshold_overrides[t] = r.moisture.threshold_overrides[t]);
			d.moisture = e;
		}
		let te = {
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
		if (n) for (let e of te[n]) delete d[e];
		if (this._beginEdit(t), this._edit(d), this._areaReview = i, a && o && s) {
			let e = W(t, a);
			if (e) {
				let t = Cr(e), n = structuredClone(t);
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
			let e = ci[c];
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
			let e = await L.searchSpecies(this.hass, this._provider, this._query.trim(), this.hass.language ?? "en");
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
			let t = e ? await L.previewSpecies(this.hass, e.provider, e.provider_ref, this.hass.language ?? "en", i.id) : await L.previewSpeciesRefresh(this.hass, i.id, this.hass.language ?? "en");
			if (!e && (t.provider !== i.species?.provider || t.snapshot.provider_ref !== i.species?.snapshot.provider_ref)) throw new F("invalid_response", "Species refresh returned a different species.");
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
		if (!this._dialog || !this._base) return x;
		let e = this._base, t = this._preview, n = this._l;
		return y`<dialog aria-labelledby="dialog-title" @cancel=${(e) => {
			e.preventDefault(), this._closeDialog();
		}} @keydown=${(e) => {
			if (e.key !== "Tab") return;
			let t = [...e.currentTarget.querySelectorAll("button:not([disabled]),a[href],input:not([disabled]),summary")], n = t[0], r = t.at(-1);
			e.shiftKey && (this.shadowRoot?.activeElement === n || this.shadowRoot?.activeElement?.matches("#dialog-title")) ? (e.preventDefault(), r?.focus()) : !e.shiftKey && this.shadowRoot?.activeElement === r && (e.preventDefault(), n?.focus());
		}}><h2 id="dialog-title" tabindex="-1">${this._dialog === "delete" ? n.t("dialog.delete_title", { name: e.name }) : n.t("dialog.species_title")}</h2>
      ${this._dialog === "delete" ? y`<p>${n.t("dialog.delete_body")}</p>` : t ? Br(n, t.snapshot, t) : y`<p>${n.t("dialog.preview_invalid")}</p>`}
      <div class="actions"><button @click=${() => this._closeDialog()}>${n.t("common.cancel")}</button><button class="primary" ?disabled=${this._formBusy || this._blocked || !!this._conflict || this._dialog === "species" && !t} @click=${() => {
			let n = this._dialog;
			if (this._closeDialog(), !this.hass) return;
			let r = this.hass;
			n === "delete" ? this._mutate(() => L.delete(r, e.id, e.revision), !0) : t && this._mutate(() => L.applySpecies(r, e.id, e.revision, t.preview_token, t.provider, t.operation), !1, "species");
		}}>${this._dialog === "delete" ? n.t("dialog.delete_confirm") : n.t("dialog.species_confirm")}</button></div></dialog>`;
	}
	async _uploadImage(e, t) {
		if (!this.hass || this._formBusy || this._blocked) return;
		let n = this._context;
		this._formBusy = !0;
		try {
			await Vr(t, this._l);
		} catch (e) {
			n === this._context && (this._error = e.message);
			return;
		} finally {
			n === this._context && (this._formBusy = !1);
		}
		if (n !== this._context || !this.isConnected || this._view.kind !== "detail" || this._view.plantId !== e.id || this._base?.revision !== e.revision) return;
		let r = this.hass;
		await this._mutate(() => L.uploadImage(r, e.id, e.revision, t));
	}
	_renderImage(e) {
		let t = this._l;
		return y`<section><h2>${t.t("photo.heading")}</h2>${e.image ? this._imageLoading ? y`<p role="status">${t.t("photo.loading")}</p>` : this._imageError ? y`<p class="error" role="alert">${t.t("photo.load_failed", { error: this._imageError })}</p><button @click=${() => {
			this._clearImage(), this._syncImage();
		}}>${t.t("photo.retry")}</button>` : this._imageUrl ? y`<img class="preview" alt=${t.t("photo.alt", { name: e.name })} src=${this._imageUrl} @error=${() => {
			this._imageError = t.t("photo.decode_failed");
		}}>` : x : y`<p>${t.t("photo.none")}</p>`}
      ${e.image ? y`<p>${t.t("photo.stored", {
			type: e.image.content_type,
			width: e.image.width,
			height: e.image.height
		})}</p>` : x}
      <label>${e.image ? t.t("photo.replace") : t.t("photo.upload")}<input type="file" accept="image/jpeg,image/png,image/webp" ?disabled=${this._formBusy || this._blocked || !!this._conflict} @change=${(t) => {
			let n = t.target, r = n.files?.[0];
			n.value = "", r && this._uploadImage(e, r);
		}}></label><small>${t.t("photo.hint")}</small>
      ${e.image ? y`<button ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => {
			if (this.hass) {
				let t = this.hass;
				this._mutate(() => L.deleteImage(t, e.id, e.revision));
			}
		}}>${t.t("photo.remove")}</button>` : x}</section>`;
	}
	_saveButton(e, t) {
		return y`<button class="primary" @click=${() => void this._save(e)}>${t}</button>`;
	}
	_renderOverallHealth(e) {
		let t = this._health[e.id], n = this._l, r = n.t("section.overall_health_unavailable");
		return y`<section aria-labelledby="overall-health-heading"><h2 id="overall-health-heading">${n.t("section.overall_health")}</h2>
      ${t ? y`
        <p role="status" aria-live="polite">${t.available && t.health_score !== null ? n.t("section.overall_health_available_summary", { score: t.health_score }) : n.t("section.overall_health_unavailable_detail")}</p>
        <dl class="overall-health">
          <dt>${n.t("section.overall_health_confidence")}</dt><dd>${Qt(t.confidence_label, n)} — ${Zt(t.confidence_label, n)}</dd>
          <dt>${n.t("section.overall_health_included_roles")}</dt><dd>${t.contributors.length ? y`<ul class="contributors">${t.contributors.map((e) => y`<li>${Xt(e, n)}</li>`)}</ul>` : n.t("section.overall_health_none_contributing")}</dd>
          <dt>${n.t("section.overall_health_configured_unavailable")}</dt><dd>${(() => {
			let e = t.configured.filter((e) => !t.contributors.includes(e));
			return e.length ? y`<ul class="configured-unavailable">${e.map((e) => y`<li>${Xt(e, n)}</li>`)}</ul>` : n.t("section.overall_health_all_included");
		})()}</dd>
        </dl>
      ` : y`<p role="status">${this._healthError ? `${r} ${this._healthError}` : r}</p>`}
    </section>`;
	}
	_renderDiagnostics(e) {
		let t = this._l, n = dr(e, this._entities, this._states, t), r = n.filter((e) => e.status === "on").length, i = (e) => e === "on" ? t.t("section.advanced_diagnostics_status_problem") : e === "off" ? t.t("section.advanced_diagnostics_status_ok") : e === "unavailable" ? t.t("section.advanced_diagnostics_status_unavailable") : t.t("section.advanced_diagnostics_status_not_configured"), a = this._pendingThresholdSwitch, o = this._thresholdRole ? ci[this._thresholdRole] : null, s = o ? t.t(`problem_phrase.${o.problemRole}`) : "", c = a ? t.t(`problem_phrase.${a.spec.problemRole}`) : "", l = r === 0 ? t.t("section.advanced_diagnostics_zero_active") : t.tn(r, "section.advanced_diagnostics_one_active", "section.advanced_diagnostics_many_active");
		return y`<section aria-labelledby="diagnostics-heading"><h2 id="diagnostics-heading">${t.t("section.advanced_diagnostics")}</h2>
      <p role="status" aria-live="polite">${l}</p>
      <p>${t.t("section.advanced_diagnostics_description")}</p>
      ${a ? y`<p class="notice threshold-switch-alert" role="alert">${t.t("section.advanced_diagnostics_switch_prompt", {
			current: s,
			pending: c
		})}
        <button type="button" class="primary" @click=${() => this._confirmDiscardAndSwitch()}>${t.t("section.advanced_diagnostics_switch_discard")}</button>
        <button type="button" @click=${() => {
			this._pendingThresholdSwitch = null;
		}}>${t.t("section.advanced_diagnostics_switch_keep")}</button>
      </p>` : x}
      <dl class="diagnostics">${n.map((n) => {
			let r = n.status === "not_configured" ? [] : ur(e, n.role, this._entities, this._states, t), a = ci[n.role], o = !!a && n.status !== "not_configured", s = o && this._thresholdRole === n.role && this._thresholdEdits !== null, c = a ? this._thresholdSaved[n.role] : "";
			return y`<dt>${n.label}</dt><dd class=${"status-" + n.status}>${i(n.status)}${n.reason ? y` — ${this._problemReason(n.reason)}` : x}${r.length ? y`<ul class="thresholds" aria-label=${t.t("section.effective_thresholds_label", { label: n.label })}>${r.map((e) => y`<li><span class="threshold-label">${e.label}</span>: <span class="threshold-value">${e.value === null ? "—" : `${t.number(e.value)} ${e.unit}`}</span></li>`)}</ul>` : x}${o && a ? y`<button class="threshold-toggle" type="button" aria-expanded=${s ? "true" : "false"} aria-controls=${`${n.role}-editor`} ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._toggleThresholdEdit(a, e)}>${s ? t.t("section.advanced_diagnostics_cancel_edit") : t.t("section.advanced_diagnostics_edit_thresholds")}</button>${s ? this._renderThresholdEditor(a, e) : x}${c && !s ? y`<p class="notice" role="status">${c}</p>` : x}` : x}</dd>`;
		})}</dl></section>`;
	}
	_problemReason(e) {
		let t = `problem_reason.${e}`;
		return R(t) ? this._l.t(t) : e;
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
		}, a = (t) => y`<label>${r.t(e.labels[t], { unit: e.unit })}<input type="number" step=${e.step} min=${e.min} max=${e.max} inputmode="decimal" .value=${n[t]} @input=${(e) => this._editThreshold({ [t]: e.target.value })}></label><small>${r.t("threshold.default_effective", {
			default: r.number(e.defaults[t]),
			effective: i(t),
			unit: e.unit
		})}</small><button type="button" @click=${() => this._editThreshold({ [t]: "" })}>${r.t("threshold.inherit")}</button>`;
		return y`<div id=${`${e.problemRole}-editor`} class="threshold-editor" role="group" aria-label=${r.t("threshold.group_label", { label: r.t(`problem_phrase.${e.problemRole}`) })}>
      <p>${r.t(`threshold_intro.${e.problemRole}`)}</p>
      <fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
        <div class="grid">${e.keys.map((e) => y`<div>${a(e)}</div>`)}</div>
        ${this._thresholdError ? y`<p class="error" role="alert">${this._thresholdError}</p>` : x}
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
		await this._mutate(() => L.setThresholdOverrides(i, t.id, t.revision, e.configRole, n)), this._error || (this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._pendingThresholdSwitch = null, this._thresholdSaved = {
			...this._thresholdSaved,
			[e.problemRole]: this._l.t(`threshold_saved.${e.problemRole}`)
		});
	}
	_sourceSummary(e, t) {
		let n = W(e, t), r = this._l;
		return n ? n.sources.length ? `${r.tn(n.sources.length, "sensors.source_count_one", "sensors.source_count_other")} · ${Mr(r, n.aggregation)}${n.primary_entity_id ? r.t("sensors.summary_primary", { entity_id: n.primary_entity_id }) : ""}` : r.t("sensors.summary_empty") : r.t("sensors.summary_unavailable");
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
		let n = W(t, e);
		if (!n) {
			this._sourceUnavailable = {
				role: e,
				plantId: t.id,
				revision: t.revision
			}, this._pendingSourceSwitch = null;
			return;
		}
		let r = Cr(n);
		this._sourceRole = e, this._sourceEdits = r, this._sourceBaseline = structuredClone(r), this._sourceError = "", this._pendingSourceSwitch = null, this._allSourceSensors = !1, this._sourceUnavailable = null, this._sourceSaved = {
			...this._sourceSaved,
			[e]: ""
		};
	}
	_sourceRefused(e, t) {
		let n = this._sourceUnavailable;
		return !!n && n.role === t && n.plantId === e.id && n.revision === e.revision && !W(e, t);
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
		let t = this._l, n = this._pendingSourceSwitch, r = br(this._sourceRole ?? "");
		return y`<section aria-labelledby="sensors-heading"><h2 id="sensors-heading">${t.t("sensors.heading")}</h2>
      <p>${t.t("sensors.intro")}</p>
      ${n ? y`<div class="notice" role="alert"><p>${t.t("sensors.switch_prompt", { role: r ? Sr(r.role, t) : this._sourceRole ?? "" })}</p>
        <button type="button" class="primary" @click=${() => this._confirmSourceSwitch()}>${t.t("section.advanced_diagnostics_switch_discard")}</button>
        <button type="button" @click=${() => {
			this._pendingSourceSwitch = null;
		}}>${t.t("section.advanced_diagnostics_switch_keep")}</button></div>` : x}
      <dl class="sensors">${yr.map((n) => {
			let r = this._sourceRole === n.role && this._sourceEdits !== null, i = this._sourceSaved[n.role];
			return y`<dt>${xr(n.role, t)}</dt><dd>${this._sourceSummary(e, n.role)}
          <button class="source-toggle" type="button" aria-expanded=${r ? "true" : "false"} aria-controls=${`${n.role}-sources-editor`} ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._toggleSourceEdit(n.role, e)}>${r ? t.t("common.cancel") : t.t("sensors.edit")}</button>
          ${r ? this._renderSourceEditor(n.role, e) : x}
          ${!r && this._sourceRefused(e, n.role) ? y`<p id=${`${n.role}-sources-unavailable`} class="error" role="alert">${t.t("sensors.refused", { role: xr(n.role, t) })}</p>` : x}
          ${i && !r ? y`<p class="notice" role="status">${i}</p>` : x}</dd>`;
		})}</dl></section>`;
	}
	_renderSourceEditor(e, t) {
		let n = br(e), r = this._sourceEdits, i = this._l;
		return !n || !r ? x : y`<div id=${`${e}-sources-editor`} class="editor"><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
      ${zr(i, n, r, this._entities, this._states, this._allSourceSensors, (e) => this._allSourceSensors = e, (e) => this._editSource(e))}
      ${this._sourceError ? y`<p class="error" role="alert">${this._sourceError}</p>` : x}
      <div class="actions">
        <button type="button" @click=${() => {
			this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._pendingSourceSwitch = null;
		}}>${i.t("common.cancel")}</button>
        <button type="button" class="primary" @click=${() => void this._saveRoleSources(e, t)}>${i.t("sensors.save", { role: Sr(e, i) })}</button>
      </div></fieldset></div>`;
	}
	async _saveRoleSources(e, t) {
		if (!this.hass || !this._sourceEdits || this._formBusy || this._blocked || this._conflict) return;
		if (this._registryError) {
			this._sourceError = this._l.t("error.sources_reconnect");
			return;
		}
		let n = wr(this._sourceEdits, this._l);
		if (n) {
			this._sourceError = n;
			return;
		}
		this._sourceError = "";
		let r = this.hass, i = Tr(this._sourceEdits, this._entities), a = W(t, e);
		await this._mutate(async () => {
			let n = t.revision, o = t;
			return (!a || JSON.stringify(a.sources) !== JSON.stringify(i.sources)) && (o = await L.setRoleSources(r, t.id, n, e, i.sources), n = o.revision), (!a || a.primary_entity_id !== i.primary_entity_id) && (o = await L.setRolePrimary(r, t.id, n, e, i.primary_entity_id), n = o.revision), (!a || a.aggregation !== i.aggregation) && (o = await L.setRoleAggregation(r, t.id, n, e, i.aggregation), n = o.revision), (!a || a.stale_after_seconds !== i.stale_after_seconds) && (o = await L.setRoleStaleAfter(r, t.id, n, e, i.stale_after_seconds), n = o.revision), o;
		}), this._error || (this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._pendingSourceSwitch = null, this._sourceSaved = {
			...this._sourceSaved,
			[e]: this._l.t("sensors.saved", { role: xr(e, this._l) })
		});
	}
	_renderPlantOverview(e, t) {
		let n = this._l, r = H(e), i = r?.sources.map((e) => U(e, this._entities)?.entity_id ?? e.entity_id) ?? [], a = yr.flatMap((t) => {
			let r = W(e, t.role);
			return r?.sources.length ? [{
				label: xr(t.role, n),
				count: r.sources.length
			}] : [];
		}), o = this._careHistory?.events.slice(0, 3) ?? [], s = t?.computed_percent, c = t?.health_score, l = this._health?.[e.id]?.confidence_label;
		return y`<section class="plant-overview-card"><div class="overview-heading">${this._imageUrl ? y`<img class="overview-avatar" src=${this._imageUrl} alt=${n.t("photo.alt", { name: e.name })}>` : y`<div class="overview-avatar placeholder" aria-hidden="true">${e.name.slice(0, 1).toLocaleUpperCase()}</div>`}<div><p class="eyebrow">${n.t("overview.eyebrow")}</p><p>${e.species?.snapshot.common_name ?? e.species?.snapshot.latin_name ?? n.t("common.no_species_selected")}</p>${e.category ? y`<span class="muted">${e.category}</span>` : x}<button type="button" @click=${() => this._detailSection = "details"}>${n.t("overview.details_button")}</button></div></div>
      <div class="overview-metrics"><article><span>${n.t("metric.soil_moisture")}</span><strong>${s == null ? "—" : n.percent(s)}</strong><small>${t?.computed_available ? n.t("overview.current_reading") : n.t("overview.no_current_reading")}</small></article><article><span>${n.t("metric.moisture_health")}</span><strong>${c == null ? "—" : `${n.number(c)}/100`}</strong><small>${n.t("overview.based_on_moisture")}</small></article><article><span>${n.t("overview.moisture_sensors")}</span><strong>${n.number(i.length)}</strong><small>${n.t("overview.aggregation", { aggregation: r ? Mr(n, r.aggregation) : n.t("overview.not_configured") })}</small></article></div>
       <section class="overview-sensors"><h2>${n.t("overview.assigned_sensors")}</h2>${i.length || a.length ? y`<ul>${i.map((e) => y`<li>${n.t("metric.soil_moisture")} · ${e}${e === r?.primary_entity_id ? y` <span class="muted">${n.t("overview.primary")}</span>` : x}</li>`)}${a.map((e) => y`<li>${e.label} · ${n.tn(e.count, "sensors.source_count_one", "sensors.source_count_other")}</li>`)}</ul>` : y`<p>${n.t("overview.no_sensors")}</p>`}<button type="button" @click=${() => this._detailSection = "sensors"}>${n.t("overview.manage_sensors")}</button></section>
       <section class="overview-care"><h2>${n.t("overview.recent_care")}</h2>${o.length ? y`<ul>${o.map((e) => y`<li><strong>${n.t(`care_kind.${e.kind}`)}</strong> · ${n.date(e.local_date)}</li>`)}</ul>` : y`<p>${n.t("overview.no_care")}</p>`}<button type="button" @click=${() => this._detailSection = "care"}>${n.t("overview.open_care")}</button></section>
      ${l === void 0 ? x : y`<p class="muted">${n.t("overview.overall_confidence", { label: Qt(l, n) })}</p>`}
    </section>`;
	}
	_renderDetail(e) {
		let t = this._l, n = this._plantById(e), r = this._edits;
		if (!n || !r) return y`<p>${t.t("detail.not_found")}</p>`;
		let i = this._evaluations[e], a = H(n), o = gr(n, this._devices), s = this._formBusy || this._blocked || !!this._conflict, c = this._conflict ? this._sourceConflictFields(this._conflict.after) : [];
		return y`${this._conflict ? y`<section class="notice" role="alert"><h2>${t.t("conflict.heading")}</h2><p>${t.t("conflict.revision", {
			before: this._conflict.before.revision,
			after: this._conflict.after.revision
		})}</p><ul>${this._conflict.changes.map((e) => y`<li class="prose">${e}</li>`)}</ul>${c.length ? y`<p>${t.t("conflict.source_overlap", { fields: this._sourceFieldList(c) })}</p>` : x}<button @click=${() => this._reviewConflict()}>${t.t("conflict.retain")}</button><button @click=${() => this._beginEdit(n)}>${t.t("conflict.discard")}</button></section>` : x}
       <header class="detail-heading"><div><h2>${n.name}</h2><p>${this._statusLabel(this._status(n))}</p></div>${o ? y`<a href="/config/devices/device/${encodeURIComponent(o.id)}">${t.t("detail.open_device")}</a>` : x}</header>
      <nav class="detail-tabs" aria-label=${t.t("detail.sections_label")}>${[
			["overview", "detail.tab_overview"],
			["sensors", "sensors.heading"],
			["care", "care.heading"],
			["details", "detail.tab_details"],
			["diagnostics", "detail.tab_diagnostics"]
		].map(([e, n]) => y`<button type="button" aria-current=${this._detailSection === e ? "page" : x} @click=${() => this._detailSection = e}>${t.t(n)}</button>`)}</nav>
        ${this._detailSection === "overview" ? this._renderPlantOverview(n, i) : x}
       ${this._detailSection === "details" ? y`<section><h2>${t.t("detail.identity_heading")}</h2>${this._renderImage(n)}<fieldset ?disabled=${s}>${K(t.t("detail.name"), r.name, (e) => this._edit({ name: e }))}${K(t.t("detail.acquired"), r.acquired, (e) => this._edit({ acquired: e }))}${Fr(t, r.placement, (e) => this._edit({ placement: e }))}${this._saveButton("identity", t.t("detail.save_identity"))}</fieldset></section>
       <section><h2>${t.t("area.label")}</h2><p>${t.t("detail.area_current", { area: this._areaName(o?.area_id ?? "") })}</p>${this._areaReview ? y`<p class="notice">${t.t("detail.area_review")}</p><button @click=${() => this._areaReview = !1}>${t.t("detail.area_reviewed")}</button><button @click=${() => {
			this._edit({ area: this._baseArea }), this._areaReview = !1;
		}}>${t.t("detail.area_use_current")}</button>` : x}<fieldset ?disabled=${s || !!this._registryError || this._areaReview}>${Pr(t, r.area, this._areas, (e) => this._edit({ area: e }))}${this._saveButton("area", t.t("detail.save_area"))}</fieldset></section>
       <section><h2>${t.t("taxonomy.heading")}</h2><fieldset ?disabled=${s}>${K(t.t("taxonomy.category"), r.category, (e) => this._edit({ category: e }), "text", 60)}${K(t.t("taxonomy.tags"), r.tagText, (e) => this._edit({ tagText: e }), "text", 2e3)}<p>${t.t("taxonomy.hint")}</p>${this._saveButton("taxonomy", t.t("taxonomy.save"))}</fieldset></section>
       <section><h2>${t.t("species.heading")}</h2>${n.species ? Br(t, n.species.snapshot) : y`<p>${t.t("species.none")}</p>`}<fieldset ?disabled=${s}>
      ${n.species?.snapshot.provider_ref ? y`<button @click=${() => void this._previewSpecies()}>${t.t("species.preview_refresh")}</button>` : x}
      ${q(t, t.t("species.provider"), this._provider, [{
			value: "manual",
			label: t.t("species.manual")
		}, ...this._capabilities?.providers.filter((e) => e.available && e.search_supported).map((e) => ({
			value: e.provider,
			label: e.provider
		})) ?? []], (e) => {
			this._providerRequest++, this._provider = e, this._preview = null, this._results = [];
		})}
       ${this._provider === "manual" ? y`${K(t.t("species.common_name"), r.common, (e) => this._edit({ common: e }))}${K(t.t("species.scientific_name"), r.latin, (e) => this._edit({ latin: e }))}<p>${t.t("species.manual_hint")}</p>${this._saveButton("species", t.t("species.save_manual"))}` : y`${K(t.t("species.search"), this._query, (e) => {
			this._query = e, this._providerRequest++, this._results = [], this._preview = null;
		})}<button @click=${() => void this._searchSpecies()}>${t.t("species.search")}</button><ul>${this._results.map((e) => y`<li><button @click=${() => void this._previewSpecies(e)}>${e.common_name ?? e.latin_name} · ${e.latin_name}</button><small>${e.attribution}</small></li>`)}</ul><button @click=${() => {
			this._provider = "manual", this._providerRequest++, this._preview = null;
		}}>${t.t("common.continue_manually")}</button>`}</fieldset></section>
       ` : x}
       ${this._detailSection === "details" ? y`
       <section><h2>${t.t("lifecycle.heading")}</h2><p>${t.t("lifecycle.description")}</p><fieldset ?disabled=${s}><div class="actions"><button @click=${() => {
			if (this.hass) {
				let e = this.hass;
				this._mutate(() => n.lifecycle_state === "active" ? L.disable(e, n.id, n.revision) : L.reenable(e, n.id, n.revision));
			}
		}}>${n.lifecycle_state === "active" ? t.t("lifecycle.disable") : t.t("lifecycle.reenable")}</button><button @click=${() => this._openDialog("delete")}>${t.t("lifecycle.delete")}</button></div></fieldset></section>` : x}
       ${this._detailSection === "sensors" ? y`<section><h2>${t.t("moisture.heading")}</h2>${a && r.moisture ? y`<p class="default-summary">${t.t("moisture.effective_summary", { thresholds: B.map((e) => `${Nr(t, e)} ${t.percent(a.threshold_overrides[e] ?? this._defaults(n)[e])}`).join(" · ") })}</p><fieldset ?disabled=${s}>${Rr(t, r.moisture, this._defaults(n), this._entities, this._states, this._allSensors, (e) => this._allSensors = e, (e) => this._edit({ moisture: e }), "sources")}<details class="advanced-disclosure"><summary>${t.t("moisture.advanced_overrides")}</summary><p>${t.t("moisture.advanced_hint")}</p>${Rr(t, r.moisture, this._defaults(n), this._entities, this._states, this._allSensors, (e) => this._allSensors = e, (e) => this._edit({ moisture: e }), "thresholds")}</details>${this._saveButton("moisture", t.t("moisture.save"))}</fieldset>` : y`<p class="error" role="alert">${t.t("moisture.incompatible")}</p>`}</section>${this._renderSensors(n)}` : x}
       ${this._detailSection === "care" ? this._renderCare(n) : x}
       ${this._detailSection === "diagnostics" ? y`<section><h2>${t.t("automations.heading")}</h2><p>${t.t("automations.description")}</p><a href="/config/automation/dashboard">${t.t("automations.open_editor")}</a><ul>${this._related.map((e) => y`<li>${e}</li>`)}</ul></section>${this._renderOverallHealth(n)}${this._renderDiagnostics(n)}` : x}
       ${this._renderDialog()}`;
	}
	async _created(e) {
		let { plant: t, photo: n, navigationContext: r } = e.detail, i = this.hass, a = this._view.kind === "create" && r === this._context, o = n && t.revision === 1 && t.image === null;
		this._wizardStarted = !1;
		let s = this._plantById(t.id);
		(!s || s.revision <= t.revision) && (this._plants = [...this._plants.filter((e) => e.id !== t.id), t]), this._createdPlantId = t.id;
		let c = this._l, l = c.t("created.notice", { name: t.name }), u = c.t("created.uploading");
		this._creationNotice = o ? `${l} ${u}` : n ? `${l} ${c.t("created.photo_skipped")}` : l, a && this._show({
			kind: "detail",
			plantId: t.id
		});
		let d = this._context;
		if (this._refresh(!1), o && i) {
			try {
				if (await Vr(n, c), !this.isConnected || this.hass?.connection !== i.connection || this._blocked) return;
				let e = await L.uploadImage(i, t.id, t.revision, n);
				if (!this.isConnected || this.hass?.connection !== i.connection) return;
				d === this._context && this._base?.id === t.id && this._base.revision === t.revision && !this._formBusy && !this._conflict && this._rebaseEdits(this._base, e), this._createdPlantId === t.id && (this._creationNotice = `${l} ${c.t("created.photo_uploaded")}`);
			} catch (e) {
				if (!this.isConnected || this.hass?.connection !== i.connection) return;
				this._createdPlantId === t.id && (this._creationNotice = `${l} ${c.t("created.photo_failed")} ${this._friendly(e)}`);
			} finally {
				this._createdPlantId === t.id && this._creationNotice.endsWith(u) && (this._creationNotice = `${l} ${c.t("created.photo_interrupted")}`);
			}
			await this._refresh(!1);
		}
	}
	render() {
		let e = this._l;
		if (this.hass?.user?.is_admin === !1) return y`<main><div class="panel-content"><p role="alert">${e.t("panel.admin_required")}</p></div></main>`;
		let t = this.hass?.localize?.("ui.common.menu") || e.t("panel.menu");
		return y`<main><ha-top-app-bar-fixed class="panel-appbar" .narrow=${this.narrow}>
       <h1 slot="title" class="page-title" tabindex="-1">Smart Plants</h1>
       <ha-dropdown slot="actionItems" @wa-select=${this._handleMenuAction}>
         <ha-icon-button slot="trigger" .label=${t} .path=${li}></ha-icon-button>
         ${this._view.kind === "list" ? x : y`<ha-dropdown-item value="back-to-overview" ?disabled=${this._formBusy}>${e.t("panel.back_to_overview")}</ha-dropdown-item>`}
         <ha-dropdown-item value="add-plant" ?disabled=${this._blocked}>${e.t("panel.add_plant")}<ha-svg-icon slot="icon" .path=${ui}></ha-svg-icon></ha-dropdown-item>
         <ha-dropdown-item value="integration-options">${e.t("overview.integration_options")}<ha-icon slot="icon" icon="mdi:cog-outline"></ha-icon></ha-dropdown-item>
         <ha-dropdown-item value="documentation">${e.t("overview.documentation")}<ha-icon slot="icon" icon="mdi:help-circle-outline"></ha-icon></ha-dropdown-item>
       </ha-dropdown>
       <div class="panel-content">${this._error ? y`<p class="error" role="alert">${this._error}</p>` : x}${this._notice ? y`<p class="notice" role="status">${this._notice}</p>` : x}${this._registryError ? y`<p class="notice" role="alert">${e.t("panel.registry_unavailable", { error: this._registryError })}</p>` : x}
      ${this._creationNotice ? y`<p class="notice" role="status">${this._creationNotice}</p>${this._createdPlantId && (this._view.kind !== "detail" || this._view.plantId !== this._createdPlantId) ? y`<button ?disabled=${this._formBusy} @click=${() => {
			this._createdPlantId && this._show({
				kind: "detail",
				plantId: this._createdPlantId
			});
		}}>${e.t("panel.open_created")}</button>` : x}` : x}
      ${this._view.kind === "list" && this._overviewError ? y`<p class="error" role="alert">${e.t("overview.status_unavailable", { error: this._overviewError })}</p>` : x}
      <smart-plants-overview ?hidden=${this._view.kind !== "list"} .l=${e} .plants=${this._plants} .overview=${this._overview} .areaNames=${this._plantAreaNames()}
        .thumbnails=${this._thumbnails} .watering=${this._watering} .loading=${this._loading} .blocked=${this._blocked}
        @open-plant=${(e) => this._openFromOverview(e.detail)} @add-plant=${() => this._show({ kind: "create" })} @log-watering=${(e) => void this._logWatering(e.detail.plantId)}></smart-plants-overview>
      ${this._view.kind === "detail" ? this._renderDetail(this._view.plantId) : x}
      ${this._wizardStarted && this._capabilities ? y`<div ?hidden=${this._view.kind !== "create"}><smart-plants-wizard .hass=${this.hass} .capabilities=${this._capabilities} .areas=${this._areas} .entities=${this._entities} .states=${this._states} .blocked=${this._blocked} .navigationContext=${this._context} @plant-created=${(e) => void this._created(e)} @backend-unavailable=${(e) => {
			this._blocked = !0, this._error = e.detail;
		}}></smart-plants-wizard></div>` : x}
        <p role="status" aria-live="polite">${this._formBusy ? e.t("panel.busy") : ""}</p></div></ha-top-app-bar-fixed></main>`;
	}
};
si = $, si.styles = Hr, J([T({ attribute: !1 })], $.prototype, "hass", void 0), J([T({ attribute: !1 })], $.prototype, "panel", void 0), J([T({
	type: Boolean,
	reflect: !0
})], $.prototype, "narrow", void 0), J([E()], $.prototype, "_plants", void 0), J([E()], $.prototype, "_loading", void 0), J([E()], $.prototype, "_error", void 0), J([E()], $.prototype, "_notice", void 0), J([E()], $.prototype, "_view", void 0), J([E()], $.prototype, "_detailSection", void 0), J([E()], $.prototype, "_formBusy", void 0), J([E()], $.prototype, "_capabilities", void 0), J([E()], $.prototype, "_blocked", void 0), J([E()], $.prototype, "_areas", void 0), J([E()], $.prototype, "_entities", void 0), J([E()], $.prototype, "_devices", void 0), J([E()], $.prototype, "_states", void 0), J([E()], $.prototype, "_evaluations", void 0), J([E()], $.prototype, "_health", void 0), J([E()], $.prototype, "_healthError", void 0), J([E()], $.prototype, "_careHistory", void 0), J([E()], $.prototype, "_careError", void 0), J([E()], $.prototype, "_careDate", void 0), J([E()], $.prototype, "_careNote", void 0), J([E()], $.prototype, "_careKind", void 0), J([E()], $.prototype, "_careFields", void 0), J([E()], $.prototype, "_careEditingId", void 0), J([E()], $.prototype, "_registryError", void 0), J([E()], $.prototype, "_areaReview", void 0), J([E()], $.prototype, "_overview", void 0), J([E()], $.prototype, "_overviewError", void 0), J([E()], $.prototype, "_thumbnails", void 0), J([E()], $.prototype, "_watering", void 0), J([E()], $.prototype, "_edits", void 0), J([E()], $.prototype, "_conflict", void 0), J([E()], $.prototype, "_allSensors", void 0), J([E()], $.prototype, "_preview", void 0), J([E()], $.prototype, "_provider", void 0), J([E()], $.prototype, "_query", void 0), J([E()], $.prototype, "_results", void 0), J([E()], $.prototype, "_related", void 0), J([E()], $.prototype, "_imageUrl", void 0), J([E()], $.prototype, "_imageLoading", void 0), J([E()], $.prototype, "_imageError", void 0), J([E()], $.prototype, "_dialog", void 0), J([E()], $.prototype, "_wizardStarted", void 0), J([E()], $.prototype, "_creationNotice", void 0), J([E()], $.prototype, "_createdPlantId", void 0), J([E()], $.prototype, "_thresholdRole", void 0), J([E()], $.prototype, "_thresholdEdits", void 0), J([E()], $.prototype, "_thresholdBaseline", void 0), J([E()], $.prototype, "_thresholdError", void 0), J([E()], $.prototype, "_thresholdSaved", void 0), J([E()], $.prototype, "_pendingThresholdSwitch", void 0), J([E()], $.prototype, "_sourceRole", void 0), J([E()], $.prototype, "_sourceEdits", void 0), J([E()], $.prototype, "_sourceBaseline", void 0), J([E()], $.prototype, "_sourceError", void 0), J([E()], $.prototype, "_sourceUnavailable", void 0), J([E()], $.prototype, "_sourceSaved", void 0), J([E()], $.prototype, "_pendingSourceSwitch", void 0), J([E()], $.prototype, "_allSourceSensors", void 0), customElements.get("smart-plants-panel") || customElements.define("smart-plants-panel", $);
//#endregion
export { $ as SmartPlantsPanel };

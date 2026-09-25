/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const _e = globalThis, Ne = _e.ShadowRoot && (_e.ShadyCSS === void 0 || _e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Oe = Symbol(), We = /* @__PURE__ */ new WeakMap();
let ft = class {
  constructor(e, t, i) {
    if (this._$cssResult$ = !0, i !== Oe) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (Ne && e === void 0) {
      const i = t !== void 0 && t.length === 1;
      i && (e = We.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && We.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const Lt = (s) => new ft(typeof s == "string" ? s : s + "", void 0, Oe), Ut = (s, ...e) => {
  const t = s.length === 1 ? s[0] : e.reduce((i, r, a) => i + ((o) => {
    if (o._$cssResult$ === !0) return o.cssText;
    if (typeof o == "number") return o;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + o + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + s[a + 1], s[0]);
  return new ft(t, s, Oe);
}, qt = (s, e) => {
  if (Ne) s.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const i = document.createElement("style"), r = _e.litNonce;
    r !== void 0 && i.setAttribute("nonce", r), i.textContent = t.cssText, s.appendChild(i);
  }
}, Ke = Ne ? (s) => s : (s) => s instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const i of e.cssRules) t += i.cssText;
  return Lt(t);
})(s) : s;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Ht, defineProperty: Dt, getOwnPropertyDescriptor: Mt, getOwnPropertyNames: jt, getOwnPropertySymbols: zt, getPrototypeOf: Ft } = Object, L = globalThis, Ge = L.trustedTypes, Wt = Ge ? Ge.emptyScript : "", Kt = L.reactiveElementPolyfillSupport, te = (s, e) => s, me = { toAttribute(s, e) {
  switch (e) {
    case Boolean:
      s = s ? Wt : null;
      break;
    case Object:
    case Array:
      s = s == null ? s : JSON.stringify(s);
  }
  return s;
}, fromAttribute(s, e) {
  let t = s;
  switch (e) {
    case Boolean:
      t = s !== null;
      break;
    case Number:
      t = s === null ? null : Number(s);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(s);
      } catch {
        t = null;
      }
  }
  return t;
} }, Te = (s, e) => !Ht(s, e), Ye = { attribute: !0, type: String, converter: me, reflect: !1, useDefault: !1, hasChanged: Te };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), L.litPropertyMetadata ?? (L.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let Y = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ?? (this.l = [])).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = Ye) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const i = Symbol(), r = this.getPropertyDescriptor(e, i, t);
      r !== void 0 && Dt(this.prototype, e, r);
    }
  }
  static getPropertyDescriptor(e, t, i) {
    const { get: r, set: a } = Mt(this.prototype, e) ?? { get() {
      return this[t];
    }, set(o) {
      this[t] = o;
    } };
    return { get: r, set(o) {
      const n = r?.call(this);
      a?.call(this, o), this.requestUpdate(e, n, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? Ye;
  }
  static _$Ei() {
    if (this.hasOwnProperty(te("elementProperties"))) return;
    const e = Ft(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(te("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(te("properties"))) {
      const t = this.properties, i = [...jt(t), ...zt(t)];
      for (const r of i) this.createProperty(r, t[r]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [i, r] of t) this.elementProperties.set(i, r);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, i] of this.elementProperties) {
      const r = this._$Eu(t, i);
      r !== void 0 && this._$Eh.set(r, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const i = new Set(e.flat(1 / 0).reverse());
      for (const r of i) t.unshift(Ke(r));
    } else e !== void 0 && t.push(Ke(e));
    return t;
  }
  static _$Eu(e, t) {
    const i = t.attribute;
    return i === !1 ? void 0 : typeof i == "string" ? i : typeof e == "string" ? e.toLowerCase() : void 0;
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
    const e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
    for (const i of t.keys()) this.hasOwnProperty(i) && (e.set(i, this[i]), delete this[i]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return qt(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((e) => e.hostDisconnected?.());
  }
  attributeChangedCallback(e, t, i) {
    this._$AK(e, i);
  }
  _$ET(e, t) {
    const i = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, i);
    if (r !== void 0 && i.reflect === !0) {
      const a = (i.converter?.toAttribute !== void 0 ? i.converter : me).toAttribute(t, i.type);
      this._$Em = e, a == null ? this.removeAttribute(r) : this.setAttribute(r, a), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const i = this.constructor, r = i._$Eh.get(e);
    if (r !== void 0 && this._$Em !== r) {
      const a = i.getPropertyOptions(r), o = typeof a.converter == "function" ? { fromAttribute: a.converter } : a.converter?.fromAttribute !== void 0 ? a.converter : me;
      this._$Em = r;
      const n = o.fromAttribute(t, a.type);
      this[r] = n ?? this._$Ej?.get(r) ?? n, this._$Em = null;
    }
  }
  requestUpdate(e, t, i, r = !1, a) {
    if (e !== void 0) {
      const o = this.constructor;
      if (r === !1 && (a = this[e]), i ?? (i = o.getPropertyOptions(e)), !((i.hasChanged ?? Te)(a, t) || i.useDefault && i.reflect && a === this._$Ej?.get(e) && !this.hasAttribute(o._$Eu(e, i)))) return;
      this.C(e, t, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: i, reflect: r, wrapped: a }, o) {
    i && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(e) && (this._$Ej.set(e, o ?? t ?? this[e]), a !== !0 || o !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (t = void 0), this._$AL.set(e, t)), r === !0 && this._$Em !== e && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(e));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (t) {
      Promise.reject(t);
    }
    const e = this.scheduleUpdate();
    return e != null && await e, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [r, a] of this._$Ep) this[r] = a;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [r, a] of i) {
        const { wrapped: o } = a, n = this[r];
        o !== !0 || this._$AL.has(r) || n === void 0 || this.C(r, void 0, a, n);
      }
    }
    let e = !1;
    const t = this._$AL;
    try {
      e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((i) => i.hostUpdate?.()), this.update(t)) : this._$EM();
    } catch (i) {
      throw e = !1, this._$EM(), i;
    }
    e && this._$AE(t);
  }
  willUpdate(e) {
  }
  _$AE(e) {
    this._$EO?.forEach((t) => t.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
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
    this._$Eq && (this._$Eq = this._$Eq.forEach((t) => this._$ET(t, this[t]))), this._$EM();
  }
  updated(e) {
  }
  firstUpdated(e) {
  }
};
Y.elementStyles = [], Y.shadowRootOptions = { mode: "open" }, Y[te("elementProperties")] = /* @__PURE__ */ new Map(), Y[te("finalized")] = /* @__PURE__ */ new Map(), Kt?.({ ReactiveElement: Y }), (L.reactiveElementVersions ?? (L.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ie = globalThis, Je = (s) => s, fe = ie.trustedTypes, Ve = fe ? fe.createPolicy("lit-html", { createHTML: (s) => s }) : void 0, gt = "$lit$", B = `lit$${Math.random().toFixed(9).slice(2)}$`, yt = "?" + B, Gt = `<${yt}>`, W = document, ne = () => W.createComment(""), oe = (s) => s === null || typeof s != "object" && typeof s != "function", Ie = Array.isArray, Yt = (s) => Ie(s) || typeof s?.[Symbol.iterator] == "function", be = `[ 	
\f\r]`, Q = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Ze = /-->/g, Xe = />/g, D = RegExp(`>|${be}(?:([^\\s"'>=/]+)(${be}*=${be}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Qe = /'/g, et = /"/g, bt = /^(?:script|style|textarea|title)$/i, Jt = (s) => (e, ...t) => ({ _$litType$: s, strings: e, values: t }), c = Jt(1), Z = Symbol.for("lit-noChange"), u = Symbol.for("lit-nothing"), tt = /* @__PURE__ */ new WeakMap(), j = W.createTreeWalker(W, 129);
function vt(s, e) {
  if (!Ie(s) || !s.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Ve !== void 0 ? Ve.createHTML(e) : e;
}
const Vt = (s, e) => {
  const t = s.length - 1, i = [];
  let r, a = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", o = Q;
  for (let n = 0; n < t; n++) {
    const l = s[n];
    let d, h, m = -1, _ = 0;
    for (; _ < l.length && (o.lastIndex = _, h = o.exec(l), h !== null); ) _ = o.lastIndex, o === Q ? h[1] === "!--" ? o = Ze : h[1] !== void 0 ? o = Xe : h[2] !== void 0 ? (bt.test(h[2]) && (r = RegExp("</" + h[2], "g")), o = D) : h[3] !== void 0 && (o = D) : o === D ? h[0] === ">" ? (o = r ?? Q, m = -1) : h[1] === void 0 ? m = -2 : (m = o.lastIndex - h[2].length, d = h[1], o = h[3] === void 0 ? D : h[3] === '"' ? et : Qe) : o === et || o === Qe ? o = D : o === Ze || o === Xe ? o = Q : (o = D, r = void 0);
    const x = o === D && s[n + 1].startsWith("/>") ? " " : "";
    a += o === Q ? l + Gt : m >= 0 ? (i.push(d), l.slice(0, m) + gt + l.slice(m) + B + x) : l + B + (m === -2 ? n : x);
  }
  return [vt(s, a + (s[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class le {
  constructor({ strings: e, _$litType$: t }, i) {
    let r;
    this.parts = [];
    let a = 0, o = 0;
    const n = e.length - 1, l = this.parts, [d, h] = Vt(e, t);
    if (this.el = le.createElement(d, i), j.currentNode = this.el.content, t === 2 || t === 3) {
      const m = this.el.content.firstChild;
      m.replaceWith(...m.childNodes);
    }
    for (; (r = j.nextNode()) !== null && l.length < n; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const m of r.getAttributeNames()) if (m.endsWith(gt)) {
          const _ = h[o++], x = r.getAttribute(m).split(B), O = /([.?@])?(.*)/.exec(_);
          l.push({ type: 1, index: a, name: O[2], strings: x, ctor: O[1] === "." ? Xt : O[1] === "?" ? Qt : O[1] === "@" ? ei : ye }), r.removeAttribute(m);
        } else m.startsWith(B) && (l.push({ type: 6, index: a }), r.removeAttribute(m));
        if (bt.test(r.tagName)) {
          const m = r.textContent.split(B), _ = m.length - 1;
          if (_ > 0) {
            r.textContent = fe ? fe.emptyScript : "";
            for (let x = 0; x < _; x++) r.append(m[x], ne()), j.nextNode(), l.push({ type: 2, index: ++a });
            r.append(m[_], ne());
          }
        }
      } else if (r.nodeType === 8) if (r.data === yt) l.push({ type: 2, index: a });
      else {
        let m = -1;
        for (; (m = r.data.indexOf(B, m + 1)) !== -1; ) l.push({ type: 7, index: a }), m += B.length - 1;
      }
      a++;
    }
  }
  static createElement(e, t) {
    const i = W.createElement("template");
    return i.innerHTML = e, i;
  }
}
function X(s, e, t = s, i) {
  if (e === Z) return e;
  let r = i !== void 0 ? t._$Co?.[i] : t._$Cl;
  const a = oe(e) ? void 0 : e._$litDirective$;
  return r?.constructor !== a && (r?._$AO?.(!1), a === void 0 ? r = void 0 : (r = new a(s), r._$AT(s, t, i)), i !== void 0 ? (t._$Co ?? (t._$Co = []))[i] = r : t._$Cl = r), r !== void 0 && (e = X(s, r._$AS(s, e.values), r, i)), e;
}
class Zt {
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
    const { el: { content: t }, parts: i } = this._$AD, r = (e?.creationScope ?? W).importNode(t, !0);
    j.currentNode = r;
    let a = j.nextNode(), o = 0, n = 0, l = i[0];
    for (; l !== void 0; ) {
      if (o === l.index) {
        let d;
        l.type === 2 ? d = new ce(a, a.nextSibling, this, e) : l.type === 1 ? d = new l.ctor(a, l.name, l.strings, this, e) : l.type === 6 && (d = new ti(a, this, e)), this._$AV.push(d), l = i[++n];
      }
      o !== l?.index && (a = j.nextNode(), o++);
    }
    return j.currentNode = W, r;
  }
  p(e) {
    let t = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, t), t += i.strings.length - 2) : i._$AI(e[t])), t++;
  }
}
class ce {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, t, i, r) {
    this.type = 2, this._$AH = u, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = i, this.options = r, this._$Cv = r?.isConnected ?? !0;
  }
  get parentNode() {
    let e = this._$AA.parentNode;
    const t = this._$AM;
    return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(e, t = this) {
    e = X(this, e, t), oe(e) ? e === u || e == null || e === "" ? (this._$AH !== u && this._$AR(), this._$AH = u) : e !== this._$AH && e !== Z && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Yt(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== u && oe(this._$AH) ? this._$AA.nextSibling.data = e : this.T(W.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: i } = e, r = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = le.createElement(vt(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === r) this._$AH.p(t);
    else {
      const a = new Zt(r, this), o = a.u(this.options);
      a.p(t), this.T(o), this._$AH = a;
    }
  }
  _$AC(e) {
    let t = tt.get(e.strings);
    return t === void 0 && tt.set(e.strings, t = new le(e)), t;
  }
  k(e) {
    Ie(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let i, r = 0;
    for (const a of e) r === t.length ? t.push(i = new ce(this.O(ne()), this.O(ne()), this, this.options)) : i = t[r], i._$AI(a), r++;
    r < t.length && (this._$AR(i && i._$AB.nextSibling, r), t.length = r);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const i = Je(e).nextSibling;
      Je(e).remove(), e = i;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class ye {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, i, r, a) {
    this.type = 1, this._$AH = u, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = a, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = u;
  }
  _$AI(e, t = this, i, r) {
    const a = this.strings;
    let o = !1;
    if (a === void 0) e = X(this, e, t, 0), o = !oe(e) || e !== this._$AH && e !== Z, o && (this._$AH = e);
    else {
      const n = e;
      let l, d;
      for (e = a[0], l = 0; l < a.length - 1; l++) d = X(this, n[i + l], t, l), d === Z && (d = this._$AH[l]), o || (o = !oe(d) || d !== this._$AH[l]), d === u ? e = u : e !== u && (e += (d ?? "") + a[l + 1]), this._$AH[l] = d;
    }
    o && !r && this.j(e);
  }
  j(e) {
    e === u ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Xt extends ye {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === u ? void 0 : e;
  }
}
class Qt extends ye {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== u);
  }
}
class ei extends ye {
  constructor(e, t, i, r, a) {
    super(e, t, i, r, a), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = X(this, e, t, 0) ?? u) === Z) return;
    const i = this._$AH, r = e === u && i !== u || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, a = e !== u && (i === u || r);
    r && this.element.removeEventListener(this.name, this, i), a && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class ti {
  constructor(e, t, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    X(this, e);
  }
}
const ii = ie.litHtmlPolyfillSupport;
ii?.(le, ce), (ie.litHtmlVersions ?? (ie.litHtmlVersions = [])).push("3.3.3");
const si = (s, e, t) => {
  const i = t?.renderBefore ?? e;
  let r = i._$litPart$;
  if (r === void 0) {
    const a = t?.renderBefore ?? null;
    i._$litPart$ = r = new ce(e.insertBefore(ne(), a), a, void 0, t ?? {});
  }
  return r._$AI(s), r;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const se = globalThis;
class V extends Y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var t;
    const e = super.createRenderRoot();
    return (t = this.renderOptions).renderBefore ?? (t.renderBefore = e.firstChild), e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = si(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return Z;
  }
}
V._$litElement$ = !0, V.finalized = !0, se.litElementHydrateSupport?.({ LitElement: V });
const ri = se.litElementPolyfillSupport;
ri?.({ LitElement: V });
(se.litElementVersions ?? (se.litElementVersions = [])).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ai = { attribute: !0, type: String, converter: me, reflect: !1, hasChanged: Te }, ni = (s = ai, e, t) => {
  const { kind: i, metadata: r } = t;
  let a = globalThis.litPropertyMetadata.get(r);
  if (a === void 0 && globalThis.litPropertyMetadata.set(r, a = /* @__PURE__ */ new Map()), i === "setter" && ((s = Object.create(s)).wrapped = !0), a.set(t.name, s), i === "accessor") {
    const { name: o } = t;
    return { set(n) {
      const l = e.get.call(this);
      e.set.call(this, n), this.requestUpdate(o, l, s, !0, n);
    }, init(n) {
      return n !== void 0 && this.C(o, void 0, s, n), n;
    } };
  }
  if (i === "setter") {
    const { name: o } = t;
    return function(n) {
      const l = this[o];
      e.call(this, n), this.requestUpdate(o, l, s, !0, n);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function I(s) {
  return (e, t) => typeof t == "object" ? ni(s, e, t) : ((i, r, a) => {
    const o = r.hasOwnProperty(a);
    return r.constructor.createProperty(a, i), o ? Object.getOwnPropertyDescriptor(r, a) : void 0;
  })(s, e, t);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function p(s) {
  return I({ ...s, state: !0, attribute: !1 });
}
const S = (s) => typeof s == "object" && s !== null && !Array.isArray(s), b = (s, e = 500) => typeof s == "string" && s.length > 0 && s.length <= e, P = (s, e = 500) => s === null || b(s, e), F = (s, e, t) => typeof s == "number" && Number.isSafeInteger(s) && s >= e && s <= t, U = (s) => b(s, 64) && /^\d{4}-\d\d-\d\dT/.test(s) && Number.isFinite(Date.parse(s)), ue = (s, e) => S(s) && Object.keys(s).length <= 32 && Object.entries(s).every(([t, i]) => b(t, 60) && e(i)), re = {
  provider: (s) => b(s, 60),
  provider_id: (s) => P(s, 200),
  provider_ref: (s) => P(s, 200),
  fetched_at: U,
  locale: (s) => typeof s == "string" && /^(und|[a-z]{2}(?:-[A-Z]{2})?)$/.test(s),
  source_status: (s) => s === "manual" || s === "provider",
  attribution: (s) => b(s),
  common_name: P,
  latin_name: P,
  category: P,
  confidence: (s) => s === null || typeof s == "number" && Number.isFinite(s) && s >= 0 && s <= 1,
  care_text: (s) => ue(s, (e) => b(e, 4e3)),
  field_sources: (s) => ue(s, b),
  threshold_defaults: (s) => ue(s, (e) => ue(e, (t) => typeof t == "number" && Number.isSafeInteger(t)))
};
function $t(s) {
  if (!S(s) || !Object.keys(s).every((i) => Object.hasOwn(re, i)) || !Object.entries(re).every(([i, r]) => r(s[i]))) return !1;
  const e = ["common_name", "latin_name", "category", "confidence"].filter((i) => s[i] !== null);
  e.push(...Object.keys(s.care_text), ...Object.entries(s.threshold_defaults).flatMap(([i, r]) => Object.keys(r).map((a) => `${i}_${a}`)));
  const t = s.field_sources;
  return new TextEncoder().encode(JSON.stringify(s)).length <= 32768 && new Set(e).size === Object.keys(t).length && e.every((i) => t[i] === s.attribution) && (s.source_status !== "manual" || s.provider === "manual" && s.provider_ref === null) && (s.source_status !== "provider" || s.provider !== "manual" && b(s.provider_ref, 200));
}
function ee(s) {
  if (!S(s)) return !1;
  const e = s.placement, t = s.species, i = s.image;
  return b(s.id, 200) && F(s.revision, 1, Number.MAX_SAFE_INTEGER) && b(s.name, 200) && U(s.created_at) && (s.acquired_at === null || U(s.acquired_at)) && ["active", "disabled"].includes(String(s.lifecycle_state)) && P(s.category, 60) && Array.isArray(s.tags) && s.tags.length <= 32 && s.tags.every((r) => b(r, 60)) && new Set(s.tags).size === s.tags.length && (e === null || S(e) && b(e.mode, 60) && P(e.exposure, 60) && P(e.rain_exposure, 60) && (e.container === null || typeof e.container == "boolean")) && (t === null || S(t) && $t(t.snapshot) && S(t.snapshot) && t.provider === t.snapshot.provider) && (i === null || S(i) && b(i.id, 200) && i.content_type === "image/webp" && F(i.width, 1, 2048) && F(i.height, 1, 2048) && U(i.created_at)) && (s.care_events === void 0 || Array.isArray(s.care_events) && s.care_events.length <= 256 && s.care_events.every(Pe));
}
function Pe(s) {
  if (!S(s) || s.schema_version !== 1 || !b(s.id, 36) || !["watering", "fertilizing", "pruning", "repotting", "note"].includes(String(s.kind)) || s.provenance !== "manual" || !U(s.occurred_at) || !/(?:Z|[+-]\d\d:\d\d)$/.test(String(s.occurred_at)) || typeof s.local_date != "string" || !/^\d{4}-\d\d-\d\d$/.test(s.local_date) || s.local_date !== String(s.occurred_at).slice(0, 10) || !U(s.created_at) || !U(s.updated_at) || !S(s.payload)) return !1;
  const e = s.payload, t = (i) => i === null || b(i, 500) && i === i.trim();
  return s.kind === "watering" ? Object.keys(e).length === 1 && t(e.note) : s.kind === "fertilizing" ? Object.keys(e).length === 4 && (e.product === null || b(e.product, 120) && e.product === e.product.trim()) && (e.amount === null || typeof e.amount == "number" && Number.isFinite(e.amount) && e.amount > 0 && e.amount <= 1e5) && (e.amount === null && e.unit === null || e.amount !== null && ["g", "mL"].includes(String(e.unit))) && t(e.note) : s.kind === "pruning" ? Object.keys(e).length === 2 && (e.part === null || b(e.part, 120) && e.part === e.part.trim()) && t(e.note) : s.kind === "repotting" ? Object.keys(e).length === 3 && (e.container === null || b(e.container, 120) && e.container === e.container.trim()) && (e.medium === null || b(e.medium, 120) && e.medium === e.medium.trim()) && t(e.note) : Object.keys(e).length === 1 && b(e.text, 1e3) && e.text === e.text.trim();
}
function xe(s, e) {
  const t = (a) => {
    const o = a.match(/\.(\d{1,6})(?=Z|[+-]\d\d:\d\d$)/)?.[1] ?? "", n = Number(o.padEnd(6, "0")), l = a.replace(/\.\d{1,6}(?=Z|[+-]\d\d:\d\d$)/, "");
    return [Date.parse(l) + Math.floor(n / 1e3), n % 1e3];
  }, i = t(String(s.occurred_at)), r = t(String(e.occurred_at));
  return r[0] - i[0] || r[1] - i[1] || (String(s.id) < String(e.id) ? -1 : String(s.id) > String(e.id) ? 1 : 0);
}
function ve(s) {
  if (!S(s) || !F(s.revision, 1, Number.MAX_SAFE_INTEGER) || !Array.isArray(s.events) || s.events.length > 256 || !s.events.every(Pe) || !S(s.summary)) return !1;
  const e = s.events, t = s.summary, i = e.filter((r) => r.kind === "watering");
  return new Set(e.map((r) => r.id)).size === e.length && t.watering_count === i.length && e.every((r, a) => a === 0 || xe(e[a - 1], r) <= 0) && t.last_watered_at === (i[0]?.occurred_at ?? null) && t.last_watered_local_date === (i[0]?.local_date ?? null);
}
function oi(s, e) {
  return !S(s) || !b(s.preview_token, 200) || !$t(s.snapshot) || !S(s.snapshot) || s.provider !== s.snapshot.provider || !S(s.diff) || !Object.entries(s.diff).every(([t, i]) => S(i) && Object.hasOwn(re, t) && (i.before === null || re[t](i.before)) && re[t](i.after)) || e.provider !== void 0 && (s.provider !== e.provider || s.snapshot.provider_ref !== e.provider_ref) ? !1 : s.operation === (e.type === "smart_plants/species/refresh_preview" ? "refresh" : "select") && (e.type !== "smart_plants/wizard/preview" || s.draft_id === e.draft_id && s.revision === 0);
}
function Ee(s) {
  return S(s) && b(s.entity_id, 255) && typeof s.state == "string" && U(s.last_updated) && S(s.attributes) && ["friendly_name", "unit_of_measurement", "device_class"].every((e) => s.attributes && S(s.attributes) && (s.attributes[e] === void 0 || s.attributes[e] === null || typeof s.attributes[e] == "string"));
}
const li = /* @__PURE__ */ new Set(["high", "medium", "low", "unknown"]);
function ci(s) {
  return !S(s) || typeof s.available != "boolean" || typeof s.confidence != "number" || !Number.isFinite(s.confidence) || s.confidence < 0 || s.confidence > 1 || typeof s.confidence_label != "string" || !li.has(s.confidence_label) || !Array.isArray(s.contributors) || !s.contributors.every((e) => b(e, 60)) || !Array.isArray(s.configured) || !s.configured.every((e) => b(e, 60)) || !Array.isArray(s.reasons) || !s.reasons.every((e) => b(e, 4e3)) ? !1 : s.available ? F(s.health_score, 0, 100) : s.health_score === null;
}
function di(s) {
  return !S(s) || typeof s.computed_available != "boolean" || typeof s.sensor_stale != "boolean" || !Array.isArray(s.reasons) || !s.reasons.every((e) => b(e, 4e3)) ? !1 : s.computed_available ? typeof s.computed_percent == "number" && Number.isFinite(s.computed_percent) && s.computed_percent >= 0 && s.computed_percent <= 100 && F(s.health_score, 0, 100) && typeof s.needs_water == "boolean" && typeof s.too_wet == "boolean" : s.computed_percent === null && s.health_score === null && s.needs_water === null && s.too_wet === null;
}
function hi(s, e) {
  const t = String(s.type);
  if (!t.startsWith("smart_plants/") || t === "smart_plants/panel/info") return !0;
  if (!S(e)) return !1;
  if (t === "smart_plants/wizard/start") return typeof e.draft_id == "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(e.draft_id) && typeof e.draft_token == "string" && /^[A-Za-z0-9_-]{43}$/.test(e.draft_token) && e.revision === 0 && F(e.expires_in, 1, 600);
  if (t.endsWith("/preview") || t.endsWith("/refresh_preview")) return oi(e, s);
  if (t === "smart_plants/species/search") return Array.isArray(e.results) && e.results.length <= 50 && e.results.every((i) => S(i) && i.provider === s.provider && b(i.provider_ref, 100) && b(i.latin_name) && P(i.common_name) && P(i.category) && b(i.attribution));
  if (t === "smart_plants/moisture/evaluation") return di(e.evaluation);
  if (t === "smart_plants/plants/health") return ci(e.evaluation);
  if (t === "smart_plants/care/list") return ve(e);
  if (["smart_plants/care/add_watering", "smart_plants/care/add", "smart_plants/care/edit"].includes(t)) {
    if (!ee(e.plant) || !S(e.plant) || e.plant.id !== s.plant_id || !Pe(e.event) || !S(e.event) || !Array.isArray(e.plant.care_events)) return !1;
    const i = e.plant.care_events, r = e.event;
    if (!i.some((n) => n.id === r.id && JSON.stringify(n) === JSON.stringify(r))) return !1;
    const a = t === "smart_plants/care/add_watering" ? "watering" : s.kind, o = t === "smart_plants/care/add_watering" ? { note: s.note } : s.payload;
    return r.kind !== a || r.occurred_at !== s.occurred_at || JSON.stringify(r.payload) !== JSON.stringify(o) || t === "smart_plants/care/edit" && r.id !== s.event_id || e.plant.revision !== Number(s.expected_revision) + 1 ? !1 : ve({ revision: e.plant.revision, events: [...i].sort(xe), summary: e.summary });
  }
  return t === "smart_plants/care/delete" ? !ee(e.plant) || !S(e.plant) || e.plant.id !== s.plant_id || !Array.isArray(e.plant.care_events) ? !1 : e.plant.revision === Number(s.expected_revision) + 1 && !e.plant.care_events.some((i) => S(i) && i.id === s.event_id) && ve({ revision: e.plant.revision, events: [...e.plant.care_events].sort((i, r) => xe(i, r)), summary: e.summary }) : t === "smart_plants/plants/list" ? Array.isArray(e.plants) && e.plants.every(ee) && new Set(e.plants.map((i) => i.id)).size === e.plants.length : t === "smart_plants/roles/list" ? Array.isArray(e.roles) && e.roles.every((i) => S(i) && b(i.role) && b(i.source_domain) && Array.isArray(i.aggregations) && i.aggregations.every((r) => b(r)) && Array.isArray(i.thresholds) && i.thresholds.every((r) => S(r) && b(r.key) && b(r.entity_role) && b(r.translation_key)) && Array.isArray(i.entities) && i.entities.every((r) => S(r) && b(r.role) && b(r.platform) && b(r.translation_key))) : t === "smart_plants/plants/delete" ? Object.keys(e).length === 0 : ee(e.plant) && S(e.plant) && (s.plant_id === void 0 || e.plant.id === s.plant_id);
}
class E extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "ApiError";
  }
}
function ui(s) {
  if (typeof s != "object" || s === null)
    return !1;
  const e = s;
  return typeof e.code == "string" || typeof e.error == "object";
}
async function v(s, e) {
  try {
    const t = await s.connection.sendMessagePromise(e);
    if (!hi(e, t)) throw new E("invalid_response", "The response is incompatible. Refresh and retry.");
    return t;
  } catch (t) {
    if (t instanceof E) throw t;
    if (ui(t)) {
      const i = t.error?.code ?? t.code ?? "unknown_error";
      throw new E(typeof i == "string" ? i : "unknown_error", "Request failed. Review your input, refresh and retry.");
    }
    throw new E("unknown_error", "Request failed. Refresh and retry when connected.");
  }
}
const y = {
  careHistory(s, e) {
    return v(s, { type: "smart_plants/care/list", plant_id: e });
  },
  async addWatering(s, e, t, i, r) {
    return v(s, { type: "smart_plants/care/add_watering", plant_id: e, expected_revision: t, occurred_at: i, note: r });
  },
  async addCareEvent(s, e, t, i, r, a) {
    return v(s, { type: "smart_plants/care/add", plant_id: e, expected_revision: t, kind: i, occurred_at: r, payload: a });
  },
  async editCareEvent(s, e, t, i, r, a, o) {
    return v(s, { type: "smart_plants/care/edit", plant_id: e, expected_revision: t, event_id: i, kind: r, occurred_at: a, payload: o });
  },
  async deleteCareEvent(s, e, t, i) {
    return v(s, { type: "smart_plants/care/delete", plant_id: e, expected_revision: t, event_id: i });
  },
  async info(s) {
    const e = await v(s, { type: "smart_plants/panel/info" });
    if (!e || e.api_version !== 1 || e.schema_version !== 1 || !Array.isArray(e.providers) || !e.providers.every((t) => t && typeof t.provider == "string" && typeof t.available == "boolean" && typeof t.search_supported == "boolean"))
      throw new E("version_mismatch", "Panel/API version mismatch. Restart Home Assistant and fully reload the frontend after upgrading.");
    return e;
  },
  startWizard(s) {
    return v(s, { type: "smart_plants/wizard/start" });
  },
  previewWizard(s, e, t, i, r) {
    return v(s, { type: "smart_plants/wizard/preview", draft_id: e.draft_id, draft_token: e.draft_token, expected_revision: 0, provider: t, provider_ref: i, locale: r });
  },
  async createWizard(s, e) {
    return (await v(s, { type: "smart_plants/wizard/create", ...e })).plant;
  },
  async configureMoisture(s, e, t, i) {
    return (await v(s, { type: "smart_plants/moisture/configure", plant_id: e, expected_revision: t, moisture: i })).plant;
  },
  async evaluation(s, e) {
    return (await v(s, { type: "smart_plants/moisture/evaluation", plant_id: e })).evaluation;
  },
  async plantHealth(s, e) {
    return (await v(s, { type: "smart_plants/plants/health", plant_id: e })).evaluation;
  },
  async areas(s) {
    return pe(await v(s, { type: "config/area_registry/list" }), (e) => typeof e.area_id == "string" && typeof e.name == "string");
  },
  async entities(s) {
    return pe(await v(s, { type: "config/entity_registry/list" }), (e) => typeof e.id == "string" && typeof e.entity_id == "string" && typeof e.unique_id == "string" && typeof e.platform == "string" && (e.device_id === null || typeof e.device_id == "string"));
  },
  async devices(s) {
    return pe(await v(s, { type: "config/device_registry/list" }), (e) => typeof e.id == "string" && (e.area_id === null || typeof e.area_id == "string") && Array.isArray(e.identifiers) && e.identifiers.every((t) => Array.isArray(t) && t.length === 2 && t.every((i) => typeof i == "string")));
  },
  async states(s) {
    return pe(await v(s, { type: "get_states" }), Ee);
  },
  async related(s, e) {
    const t = await v(s, { type: "search/related", item_type: "device", item_id: e });
    return Array.isArray(t.automation) ? t.automation.filter((i) => typeof i == "string") : [];
  },
  async subscribeRegistry(s, e) {
    const t = [];
    try {
      if (s.connection.subscribeEvents) for (const i of ["area_registry_updated", "device_registry_updated", "entity_registry_updated"])
        t.push(await s.connection.subscribeEvents(e, i));
    } catch (i) {
      throw t.forEach((r) => r()), i;
    }
    return () => t.forEach((i) => i());
  },
  async searchSpecies(s, e, t, i, r = 20) {
    return (await v(s, {
      type: "smart_plants/species/search",
      provider: e,
      query: t,
      locale: i,
      limit: r
    })).results;
  },
  async previewSpecies(s, e, t, i, r) {
    return v(s, {
      type: "smart_plants/species/preview",
      provider: e,
      provider_ref: t,
      locale: i,
      plant_id: r
    });
  },
  async previewSpeciesRefresh(s, e, t) {
    return v(s, {
      type: "smart_plants/species/refresh_preview",
      plant_id: e,
      locale: t
    });
  },
  async applySpecies(s, e, t, i, r, a) {
    return (await v(s, {
      type: "smart_plants/species/apply",
      plant_id: e,
      expected_revision: t,
      preview_token: i,
      provider: r,
      operation: a,
      confirmed: !0
    })).plant;
  },
  async roles(s) {
    return (await v(s, {
      type: "smart_plants/roles/list"
    })).roles;
  },
  async setThresholdOverrides(s, e, t, i, r) {
    return (await v(s, {
      type: "smart_plants/roles/set_threshold_overrides",
      plant_id: e,
      expected_revision: t,
      role: i,
      values: r
    })).plant;
  },
  async setRoleSources(s, e, t, i, r) {
    return (await v(s, { type: "smart_plants/roles/set_sources", plant_id: e, expected_revision: t, role: i, sources: r })).plant;
  },
  async setRolePrimary(s, e, t, i, r) {
    return (await v(s, { type: "smart_plants/roles/set_primary", plant_id: e, expected_revision: t, role: i, primary_entity_id: r })).plant;
  },
  async setRoleAggregation(s, e, t, i, r) {
    return (await v(s, { type: "smart_plants/roles/set_aggregation", plant_id: e, expected_revision: t, role: i, aggregation: r })).plant;
  },
  async setRoleStaleAfter(s, e, t, i, r) {
    return (await v(s, { type: "smart_plants/roles/set_stale_after", plant_id: e, expected_revision: t, role: i, stale_after_seconds: r })).plant;
  },
  async list(s) {
    return (await v(s, {
      type: "smart_plants/plants/list"
    })).plants;
  },
  async create(s, e) {
    return (await v(s, {
      type: "smart_plants/plants/create",
      ...e
    })).plant;
  },
  async update(s, e) {
    return (await v(s, {
      type: "smart_plants/plants/update",
      ...e
    })).plant;
  },
  async disable(s, e, t) {
    return (await v(s, {
      type: "smart_plants/plants/disable",
      plant_id: e,
      expected_revision: t
    })).plant;
  },
  async reenable(s, e, t) {
    return (await v(s, {
      type: "smart_plants/plants/reenable",
      plant_id: e,
      expected_revision: t
    })).plant;
  },
  async setArea(s, e, t, i) {
    return (await v(s, {
      type: "smart_plants/plants/set_area",
      plant_id: e,
      expected_revision: t,
      area_id: i
    })).plant;
  },
  async delete(s, e, t) {
    await v(s, {
      type: "smart_plants/plants/delete",
      plant_id: e,
      expected_revision: t
    });
  },
  async fetchImage(s, e, t) {
    const i = `/api/smart_plants/plants/${encodeURIComponent(e)}/image`, r = {};
    s.auth?.accessToken && (r.Authorization = `Bearer ${s.auth.accessToken}`);
    let a;
    const o = {
      method: "GET",
      headers: r,
      credentials: "same-origin"
    };
    t && (o.signal = t);
    try {
      a = await fetch(i, o);
    } catch (l) {
      throw l instanceof DOMException && l.name === "AbortError" ? l : new E("unknown_error", "Image request failed. Retry when connected.");
    }
    if (!a.ok)
      throw new E("unknown_error", `HTTP ${a.status}`);
    const n = await a.blob();
    if (n.type !== "image/webp" || n.size === 0) throw new E("invalid_response", "The image response is incompatible. Refresh and retry.");
    return n;
  },
  async uploadImage(s, e, t, i) {
    const r = `/api/smart_plants/plants/${encodeURIComponent(
      e
    )}/image?expected_revision=${t}`;
    return it(s, r, {
      method: "POST",
      plantId: e,
      body: i,
      contentType: i.type
    });
  },
  async deleteImage(s, e, t) {
    const i = `/api/smart_plants/plants/${encodeURIComponent(
      e
    )}/image?expected_revision=${t}`;
    return it(s, i, { method: "DELETE", plantId: e });
  }
};
function pe(s, e) {
  if (!Array.isArray(s) || !s.every((t) => typeof t == "object" && t !== null && e(t)))
    throw new E("invalid_response", "Home Assistant registry/state response is incompatible. Reload and retry.");
  return s;
}
async function it(s, e, t) {
  const i = {};
  t.contentType && (i["Content-Type"] = t.contentType), s.auth?.accessToken && (i.Authorization = `Bearer ${s.auth.accessToken}`);
  const r = {
    method: t.method,
    headers: i,
    credentials: "same-origin"
  };
  t.body !== void 0 && (r.body = t.body);
  let a;
  try {
    a = await fetch(e, r);
  } catch {
    throw new E("unknown_error", "Image request failed. Retry when connected.");
  }
  const o = await a.text();
  let n = null;
  if (o)
    try {
      n = JSON.parse(o);
    } catch {
      n = null;
    }
  if (!a.ok) {
    const h = n?.error?.code ?? "unknown_error";
    throw new E(typeof h == "string" ? h : "unknown_error", "Image request failed. Use a valid JPEG, PNG or WebP up to 5 MiB and 2048 × 2048 pixels.");
  }
  const l = n;
  if (!l || !ee(l.plant) || l.plant.id !== t.plantId)
    throw new E("invalid_response", "The image response is incompatible. Refresh before retrying.");
  return l.plant;
}
const q = ["min", "target", "max"], J = { min: 15, target: 35, max: 55 }, pi = ["indoor", "outdoor", "balcony", "greenhouse", "covered_outdoor", "dormant_storage"], _i = [
  "temperature_stress",
  "humidity_stress",
  "soil_temperature_stress",
  "co2_stress",
  "low_light",
  "low_battery",
  "conductivity_stress"
], mi = {
  moisture: "Moisture",
  temperature: "Temperature",
  humidity: "Humidity",
  illuminance: "Illuminance",
  battery: "Battery",
  conductivity: "Conductivity",
  soil_temperature: "Soil temperature",
  co2: "CO2"
}, fi = {
  high: "every configured role is currently available.",
  medium: "at least half of the configured roles are currently available.",
  low: "fewer than half of the configured roles are currently available.",
  unknown: "no roles are configured for this plant yet."
};
function Be(s) {
  return (e, t, i) => {
    let r = t;
    if (s) {
      const a = [];
      if (i) for (const [n, l] of Object.entries(i))
        a.push(n, l);
      const o = s(e, ...a);
      typeof o == "string" && o.trim() !== "" && (r = o);
    }
    if (i) for (const [a, o] of Object.entries(i)) r = r.replaceAll(`{${a}}`, String(o));
    return r;
  };
}
function st(s, e) {
  const t = mi[s] ?? s.replaceAll("_", " ");
  return Be(e)(`component.smart_plants.panel.health_contributor.${s}`, t);
}
function gi(s, e) {
  const t = fi[s] ?? "no additional detail available.";
  return Be(e)(`component.smart_plants.panel.section.confidence_${s}`, t);
}
const $e = {
  temperature_stress: "Temperature stress",
  humidity_stress: "Humidity stress",
  soil_temperature_stress: "Soil temperature stress",
  co2_stress: "CO2 stress",
  low_light: "Low light",
  low_battery: "Low battery",
  conductivity_stress: "Conductivity stress"
}, yi = {
  temperature_stress: [
    { key: "cold_threshold_celsius", label: "Cold threshold", unit: "°C" },
    { key: "cold_clear_celsius", label: "Cold clear", unit: "°C" },
    { key: "hot_clear_celsius", label: "Hot clear", unit: "°C" },
    { key: "hot_threshold_celsius", label: "Hot threshold", unit: "°C" }
  ],
  humidity_stress: [
    { key: "dry_threshold_percent", label: "Dry threshold", unit: "%" },
    { key: "dry_clear_percent", label: "Dry clear", unit: "%" },
    { key: "damp_clear_percent", label: "Damp clear", unit: "%" },
    { key: "damp_threshold_percent", label: "Damp threshold", unit: "%" }
  ],
  soil_temperature_stress: [
    { key: "cold_threshold_celsius", label: "Cold threshold", unit: "°C" },
    { key: "cold_clear_celsius", label: "Cold clear", unit: "°C" },
    { key: "hot_clear_celsius", label: "Hot clear", unit: "°C" },
    { key: "hot_threshold_celsius", label: "Hot threshold", unit: "°C" }
  ],
  co2_stress: [
    { key: "threshold_ppm", label: "High threshold", unit: "ppm" },
    { key: "clear_ppm", label: "High clear", unit: "ppm" }
  ],
  low_light: [
    { key: "target_lux", label: "Target", unit: "lx" },
    { key: "clear_lux", label: "Clear", unit: "lx" }
  ],
  low_battery: [
    { key: "threshold_percent", label: "Low threshold", unit: "%" },
    { key: "clear_percent", label: "Low clear", unit: "%" }
  ],
  conductivity_stress: [
    { key: "low_threshold_micro_siemens_per_cm", label: "Low threshold", unit: "µS/cm" },
    { key: "low_clear_micro_siemens_per_cm", label: "Low clear", unit: "µS/cm" },
    { key: "high_clear_micro_siemens_per_cm", label: "High clear", unit: "µS/cm" },
    { key: "high_threshold_micro_siemens_per_cm", label: "High threshold", unit: "µS/cm" }
  ]
}, wt = {
  cold_threshold_celsius: 10,
  cold_clear_celsius: 12,
  hot_clear_celsius: 32,
  hot_threshold_celsius: 35
}, Le = ["cold_threshold_celsius", "cold_clear_celsius", "hot_clear_celsius", "hot_threshold_celsius"], bi = -40, vi = 80, rt = 0.5, $i = 1;
function de(s) {
  return s >= 0 ? Math.floor(s * 10 + 0.5) / 10 : -(Math.floor(-s * 10 + 0.5) / 10);
}
function wi(s) {
  const e = s.trim();
  if (e === "") return null;
  const t = Number(e);
  if (!Number.isFinite(t)) return "invalid";
  const i = de(t);
  return i < bi || i > vi ? "invalid" : i;
}
function Si(s) {
  const e = {};
  for (const l of Le) {
    const d = wi(s[l]);
    if (d === "invalid") return { values: {}, error: "Effective thresholds must satisfy cold trigger < cold clear < hot clear < hot trigger, with ≥ 0.5 °C hysteresis and a ≥ 1.0 °C stable band, all within −40.0…80.0 °C." };
    e[l] = d;
  }
  const t = e, i = (l) => t[l] ?? wt[l], r = i("cold_threshold_celsius"), a = i("cold_clear_celsius"), o = i("hot_clear_celsius"), n = i("hot_threshold_celsius");
  return !(r < a && a < o && o < n) || a - r < rt || n - o < rt || o - a < $i ? { values: t, error: "Effective thresholds must satisfy cold trigger < cold clear < hot clear < hot trigger, with ≥ 0.5 °C hysteresis and a ≥ 1.0 °C stable band, all within −40.0…80.0 °C." } : { values: t, error: null };
}
function xi(s) {
  const e = { cold_threshold_celsius: "", cold_clear_celsius: "", hot_clear_celsius: "", hot_threshold_celsius: "" };
  if (!s) return e;
  for (const t of Le) {
    const i = s[t];
    e[t] = i == null ? "" : String(i);
  }
  return e;
}
const St = {
  dry_threshold_percent: 25,
  dry_clear_percent: 30,
  damp_clear_percent: 80,
  damp_threshold_percent: 85
}, Ue = ["dry_threshold_percent", "dry_clear_percent", "damp_clear_percent", "damp_threshold_percent"], Ei = 0, Ri = 100, at = 1, ki = 5;
function Ai(s) {
  const e = s.trim();
  if (e === "") return null;
  const t = Number(e);
  if (!Number.isFinite(t)) return "invalid";
  const i = de(t);
  return i < Ei || i > Ri ? "invalid" : i;
}
const nt = "Effective thresholds must satisfy dry trigger < dry clear < damp clear < damp trigger, with ≥ 1.0 % hysteresis and a ≥ 5.0 % stable band, all within 0.0…100.0 %.";
function Ci(s) {
  const e = {};
  for (const l of Ue) {
    const d = Ai(s[l]);
    if (d === "invalid") return { values: {}, error: nt };
    e[l] = d;
  }
  const t = e, i = (l) => t[l] ?? St[l], r = i("dry_threshold_percent"), a = i("dry_clear_percent"), o = i("damp_clear_percent"), n = i("damp_threshold_percent");
  return !(r < a && a < o && o < n) || a - r < at || n - o < at || o - a < ki ? { values: t, error: nt } : { values: t, error: null };
}
function Ni(s) {
  const e = { dry_threshold_percent: "", dry_clear_percent: "", damp_clear_percent: "", damp_threshold_percent: "" };
  if (!s) return e;
  for (const t of Ue) {
    const i = s[t];
    e[t] = i == null ? "" : String(i);
  }
  return e;
}
const xt = {
  low_threshold_micro_siemens_per_cm: 350,
  low_clear_micro_siemens_per_cm: 500,
  high_clear_micro_siemens_per_cm: 1800,
  high_threshold_micro_siemens_per_cm: 2e3
}, qe = ["low_threshold_micro_siemens_per_cm", "low_clear_micro_siemens_per_cm", "high_clear_micro_siemens_per_cm", "high_threshold_micro_siemens_per_cm"], Oi = 0, Ti = 1e4, ot = 10, Ii = 50;
function Pi(s) {
  const e = s.trim();
  if (e === "") return null;
  const t = Number(e);
  if (!Number.isFinite(t)) return "invalid";
  const i = de(t);
  return i < Oi || i > Ti ? "invalid" : i;
}
const lt = "Effective thresholds must satisfy low trigger < low clear < high clear < high trigger, with ≥ 10.0 µS/cm hysteresis and a ≥ 50.0 µS/cm stable band, all within 0.0…10000.0 µS/cm.";
function Bi(s) {
  const e = {};
  for (const l of qe) {
    const d = Pi(s[l]);
    if (d === "invalid") return { values: {}, error: lt };
    e[l] = d;
  }
  const t = e, i = (l) => t[l] ?? xt[l], r = i("low_threshold_micro_siemens_per_cm"), a = i("low_clear_micro_siemens_per_cm"), o = i("high_clear_micro_siemens_per_cm"), n = i("high_threshold_micro_siemens_per_cm");
  return !(r < a && a < o && o < n) || a - r < ot || n - o < ot || o - a < Ii ? { values: t, error: lt } : { values: t, error: null };
}
function Li(s) {
  const e = { low_threshold_micro_siemens_per_cm: "", low_clear_micro_siemens_per_cm: "", high_clear_micro_siemens_per_cm: "", high_threshold_micro_siemens_per_cm: "" };
  if (!s) return e;
  for (const t of qe) {
    const i = s[t];
    e[t] = i == null ? "" : String(i);
  }
  return e;
}
const Et = {
  threshold_ppm: 5e3,
  clear_ppm: 4e3
}, He = ["threshold_ppm", "clear_ppm"], Ui = 0, qi = 1e4, Hi = 100;
function Rt(s) {
  return s >= 0 ? Math.floor(s + 0.5) : -Math.floor(-s + 0.5);
}
function Di(s) {
  const e = s.trim();
  if (e === "") return null;
  const t = Number(e);
  if (!Number.isFinite(t)) return "invalid";
  const i = Rt(t);
  return i < Ui || i > qi ? "invalid" : i;
}
const ct = "Effective thresholds must satisfy clear_ppm < threshold_ppm with ≥ 100 ppm hysteresis, both integers within 0…10000 ppm.";
function Mi(s) {
  const e = {};
  for (const o of He) {
    const n = Di(s[o]);
    if (n === "invalid") return { values: {}, error: ct };
    e[o] = n;
  }
  const t = e, i = (o) => t[o] ?? Et[o], r = i("clear_ppm"), a = i("threshold_ppm");
  return !(r < a) || a - r < Hi ? { values: t, error: ct } : { values: t, error: null };
}
function ji(s) {
  const e = { threshold_ppm: "", clear_ppm: "" };
  if (!s) return e;
  for (const t of He) {
    const i = s[t];
    e[t] = i == null ? "" : String(i);
  }
  return e;
}
const kt = {
  cold_threshold_celsius: 10,
  cold_clear_celsius: 12,
  hot_clear_celsius: 32,
  hot_threshold_celsius: 35
}, De = ["cold_threshold_celsius", "cold_clear_celsius", "hot_clear_celsius", "hot_threshold_celsius"], zi = -20, Fi = 60, dt = 0.5, Wi = 1;
function Ki(s) {
  const e = s.trim();
  if (e === "") return null;
  const t = Number(e);
  if (!Number.isFinite(t)) return "invalid";
  const i = de(t);
  return i < zi || i > Fi ? "invalid" : i;
}
const ht = "Effective thresholds must satisfy cold trigger < cold clear < hot clear < hot trigger, with ≥ 0.5 °C hysteresis and a ≥ 1.0 °C stable band, all within −20.0…60.0 °C.";
function Gi(s) {
  const e = {};
  for (const l of De) {
    const d = Ki(s[l]);
    if (d === "invalid") return { values: {}, error: ht };
    e[l] = d;
  }
  const t = e, i = (l) => t[l] ?? kt[l], r = i("cold_threshold_celsius"), a = i("cold_clear_celsius"), o = i("hot_clear_celsius"), n = i("hot_threshold_celsius");
  return !(r < a && a < o && o < n) || a - r < dt || n - o < dt || o - a < Wi ? { values: t, error: ht } : { values: t, error: null };
}
function Yi(s) {
  const e = { cold_threshold_celsius: "", cold_clear_celsius: "", hot_clear_celsius: "", hot_threshold_celsius: "" };
  if (!s) return e;
  for (const t of De) {
    const i = s[t];
    e[t] = i == null ? "" : String(i);
  }
  return e;
}
const At = {
  threshold_percent: 20,
  clear_percent: 25
}, Me = ["threshold_percent", "clear_percent"], Ji = 0, Vi = 100, Zi = 1;
function Xi(s) {
  const e = s.trim();
  if (e === "") return null;
  const t = Number(e);
  if (!Number.isFinite(t)) return "invalid";
  const i = Rt(t);
  return i < Ji || i > Vi ? "invalid" : i;
}
const ut = "Effective thresholds must satisfy threshold_percent < clear_percent with ≥ 1 % hysteresis, both integers within 0…100 %.";
function Qi(s) {
  const e = {};
  for (const o of Me) {
    const n = Xi(s[o]);
    if (n === "invalid") return { values: {}, error: ut };
    e[o] = n;
  }
  const t = e, i = (o) => t[o] ?? At[o], r = i("threshold_percent"), a = i("clear_percent");
  return !(r < a) || a - r < Zi ? { values: t, error: ut } : { values: t, error: null };
}
function es(s) {
  const e = { threshold_percent: "", clear_percent: "" };
  if (!s) return e;
  for (const t of Me) {
    const i = s[t];
    e[t] = i == null ? "" : String(i);
  }
  return e;
}
const Ct = {
  target_lux: 500,
  clear_lux: 700
}, je = ["target_lux", "clear_lux"], ts = 0, is = 2e5, ss = 10;
function rs(s) {
  const e = s.trim();
  if (e === "") return null;
  const t = Number(e);
  if (!Number.isFinite(t)) return "invalid";
  const i = de(t);
  return i < ts || i > is ? "invalid" : i;
}
const pt = "Effective thresholds must satisfy target_lux < clear_lux with ≥ 10.0 lx hysteresis, both within 0.0…200000.0 lx.";
function as(s) {
  const e = {};
  for (const o of je) {
    const n = rs(s[o]);
    if (n === "invalid") return { values: {}, error: pt };
    e[o] = n;
  }
  const t = e, i = (o) => t[o] ?? Ct[o], r = i("target_lux"), a = i("clear_lux");
  return !(r < a) || a - r < ss ? { values: t, error: pt } : { values: t, error: null };
}
function ns(s) {
  const e = { target_lux: "", clear_lux: "" };
  if (!s) return e;
  for (const t of je) {
    const i = s[t];
    e[t] = i == null ? "" : String(i);
  }
  return e;
}
function os(s, e, t, i) {
  const r = `smart_plants:${s.id}:${e}`, a = t.find((n) => n.unique_id === r && n.platform === "smart_plants");
  if (!a) return [];
  const o = i[a.entity_id];
  return o ? yi[e].map((n) => {
    const l = o.attributes[n.key], d = typeof l == "number" && Number.isFinite(l) ? l : null;
    return { key: n.key, label: n.label, unit: n.unit, value: d };
  }) : [];
}
function ls(s, e, t) {
  return _i.map((i) => {
    const r = `smart_plants:${s.id}:${i}`, a = e.find((h) => h.unique_id === r && h.platform === "smart_plants");
    if (!a) return { role: i, label: $e[i], status: "not_configured", reason: null };
    const o = t[a.entity_id];
    if (!o || o.state === "unavailable" || o.state === "unknown") return { role: i, label: $e[i], status: "unavailable", reason: null };
    const n = o.state === "on" ? "on" : "off", l = o.attributes.reason, d = typeof l == "string" && l.trim() ? l : null;
    return { role: i, label: $e[i], status: n, reason: d };
  });
}
function cs() {
  return { sources: [], primary_entity_id: null, aggregation: "primary", stale_after_seconds: 21600, threshold_overrides: { min: null, target: null, max: null } };
}
function M(s) {
  const e = s.roles?.moisture;
  return !e || !Array.isArray(e.sources) || e.sources.length > 32 || !e.sources.every((t) => t && typeof t.entity_id == "string" && /^sensor\.[a-z0-9_]+$/.test(t.entity_id) && (t.registry_id === null || typeof t.registry_id == "string")) || !["primary", "average", "min", "max"].includes(e.aggregation) || !Number.isInteger(e.stale_after_seconds) || e.stale_after_seconds < 60 || e.stale_after_seconds > 604800 || !(e.primary_entity_id === null || e.sources.some((t) => t.entity_id === e.primary_entity_id)) || !q.every((t) => e.threshold_defaults?.[t] && Number.isInteger(e.threshold_defaults[t].value) && e.threshold_defaults[t].value >= 1 && e.threshold_defaults[t].value <= 99 && ["builtin", "provider"].includes(e.threshold_defaults[t].source) && (e.threshold_defaults[t].provider === null || typeof e.threshold_defaults[t].provider == "string") && (e.threshold_defaults[t].provider_ref === null || typeof e.threshold_defaults[t].provider_ref == "string") && (e.threshold_overrides?.[t] === null || Number.isInteger(e.threshold_overrides?.[t]))) || ae(e, Object.fromEntries(q.map((t) => [t, e.threshold_defaults[t].value]))) || q.some((t) => {
    const i = e.threshold_defaults[t];
    return i.source === "builtin" ? i.provider !== null || i.provider_ref !== null : !i.provider || !i.provider_ref;
  }) ? null : e;
}
function _t(s) {
  return structuredClone({ sources: s.sources, primary_entity_id: s.primary_entity_id, aggregation: s.aggregation, stale_after_seconds: s.stale_after_seconds, threshold_overrides: s.threshold_overrides });
}
function ae(s, e) {
  if (s.sources.length > 32 || new Set(s.sources.map((i) => i.entity_id)).size !== s.sources.length || new Set(s.sources.map((i) => i.registry_id ?? i.entity_id)).size !== s.sources.length || s.sources.some((i) => !/^sensor\.[a-z0-9_]+$/.test(i.entity_id))) return "Choose at most 32 unique sensor entities.";
  if (!["primary", "average", "min", "max"].includes(s.aggregation)) return "Choose a supported aggregation.";
  if (s.primary_entity_id !== null && !s.sources.some((i) => i.entity_id === s.primary_entity_id)) return "Primary must be one of the assigned sensors or None.";
  if (!Number.isInteger(s.stale_after_seconds) || s.stale_after_seconds < 60 || s.stale_after_seconds > 604800) return "Staleness must be an integer from 60 to 604800 seconds.";
  const t = q.map((i) => s.threshold_overrides[i] ?? e[i]);
  return t.some((i) => !Number.isInteger(i) || i < 1 || i > 99) || !(t[0] < t[1] && t[1] < t[2] && t[2] - t[0] >= 4) ? "Effective moisture thresholds must be integers: 1 ≤ min < target < max ≤ 99, with a span of at least 4%." : null;
}
function Nt(s, e) {
  return !s.trim() && !e.trim() ? null : { provider: "manual", snapshot: { provider: "manual", provider_id: null, provider_ref: null, fetched_at: (/* @__PURE__ */ new Date()).toISOString(), locale: "und", source_status: "manual", attribution: "User supplied", common_name: s.trim() || null, latin_name: e.trim() || null, category: null, confidence: null, care_text: {}, field_sources: { ...s.trim() ? { common_name: "User supplied" } : {}, ...e.trim() ? { latin_name: "User supplied" } : {} }, threshold_defaults: {} } };
}
function K(s, e) {
  return e.find((t) => t.identifiers.some(([i, r]) => i === "smart_plants" && r === s.id));
}
function N(s, e) {
  return s.registry_id ? e.find((t) => t.id === s.registry_id) : e.find((t) => t.entity_id === s.entity_id);
}
function Ot(s, e) {
  const t = s.sources.find((i) => i.entity_id === s.primary_entity_id);
  return { ...structuredClone(s), sources: s.sources.map((i) => {
    const r = N(i, e);
    return r ? { entity_id: r.entity_id, registry_id: r.id } : { ...i };
  }), primary_entity_id: t ? N(t, e)?.entity_id ?? t.entity_id : null };
}
function ds(s, e, t) {
  const i = N(s, e);
  if (s.registry_id && !i) return "Missing registered source — replace it explicitly or review Repairs.";
  const r = t[i?.entity_id ?? s.entity_id], a = [];
  return i || a.push("Unregistered: renames cannot be followed reliably"), (!r || ["unknown", "unavailable"].includes(r.state)) && a.push("Currently unavailable"), r && (r.attributes.unit_of_measurement !== "%" || r.attributes.device_class !== "moisture") && a.push("Unexpected metadata: evaluation requires numeric 0–100 %"), r && !["unknown", "unavailable"].includes(r.state) && (!r.state.trim() || !Number.isFinite(Number(r.state)) || Number(r.state) < 0 || Number(r.state) > 100) && a.push("Invalid reading: evaluation requires a numeric percentage from 0 to 100"), a.join(". ");
}
const Re = [
  { role: "temperature", label: "Air temperature", deviceClass: "temperature", acceptedUnits: ["°C", "°F", "K"] },
  { role: "humidity", label: "Air humidity", deviceClass: "humidity", acceptedUnits: ["%"] },
  { role: "illuminance", label: "Illuminance", deviceClass: "illuminance", acceptedUnits: ["lx"] },
  { role: "battery", label: "Battery", deviceClass: "battery", acceptedUnits: ["%"] },
  // Conductivity source sensors report the micro sign (U+00B5), Greek mu
  // (U+03BC, the HA constant), or ASCII "uS/cm"; accept all three.
  { role: "conductivity", label: "Conductivity", deviceClass: "conductivity", acceptedUnits: ["µS/cm", "μS/cm", "uS/cm"] },
  { role: "soil_temperature", label: "Soil temperature", deviceClass: "temperature", acceptedUnits: ["°C", "°F", "K"] },
  { role: "co2", label: "CO₂", deviceClass: "carbon_dioxide", acceptedUnits: ["ppm"] }
];
function we(s) {
  return Re.find((e) => e.role === s);
}
function G(s, e) {
  const t = s.roles?.[e];
  return !t || !Array.isArray(t.sources) || t.sources.length > 32 || !t.sources.every((i) => i && typeof i.entity_id == "string" && /^sensor\.[a-z0-9_]+$/.test(i.entity_id) && (i.registry_id === null || typeof i.registry_id == "string")) || typeof t.aggregation != "string" || !["primary", "average", "min", "max"].includes(t.aggregation) || !Number.isInteger(t.stale_after_seconds) || t.stale_after_seconds < 60 || t.stale_after_seconds > 604800 || !(t.primary_entity_id === null || typeof t.primary_entity_id == "string" && t.sources.some((i) => i.entity_id === t.primary_entity_id)) ? null : { sources: t.sources, primary_entity_id: t.primary_entity_id ?? null, aggregation: t.aggregation, stale_after_seconds: t.stale_after_seconds };
}
function mt(s) {
  return structuredClone({ sources: s.sources, primary_entity_id: s.primary_entity_id, aggregation: s.aggregation, stale_after_seconds: s.stale_after_seconds });
}
function hs(s) {
  return s.sources.length > 32 || new Set(s.sources.map((e) => e.entity_id)).size !== s.sources.length || new Set(s.sources.map((e) => e.registry_id ?? e.entity_id)).size !== s.sources.length || s.sources.some((e) => !/^sensor\.[a-z0-9_]+$/.test(e.entity_id)) ? "Choose at most 32 unique sensor entities." : ["primary", "average", "min", "max"].includes(s.aggregation) ? s.primary_entity_id !== null && !s.sources.some((e) => e.entity_id === s.primary_entity_id) ? "Primary must be one of the assigned sensors or None." : !Number.isInteger(s.stale_after_seconds) || s.stale_after_seconds < 60 || s.stale_after_seconds > 604800 ? "Staleness must be an integer from 60 to 604800 seconds." : null : "Choose a supported aggregation.";
}
function us(s, e) {
  const t = s.sources.find((i) => i.entity_id === s.primary_entity_id);
  return { ...structuredClone(s), sources: s.sources.map((i) => {
    const r = N(i, e);
    return r ? { entity_id: r.entity_id, registry_id: r.id } : { ...i };
  }), primary_entity_id: t ? N(t, e)?.entity_id ?? t.entity_id : null };
}
function ps(s, e, t, i) {
  const r = N(s, e);
  if (s.registry_id && !r) return "Missing registered source — replace it explicitly or review Repairs.";
  const a = t[r?.entity_id ?? s.entity_id], o = [];
  if (r || o.push("Unregistered: renames cannot be followed reliably"), (!a || ["unknown", "unavailable"].includes(a.state)) && o.push("Currently unavailable"), a) {
    const n = a.attributes.unit_of_measurement, l = a.attributes.device_class;
    (typeof n != "string" || !i.acceptedUnits.includes(n) || l !== i.deviceClass) && o.push(`Unexpected metadata: ${i.label} evaluation requires device class ${i.deviceClass} and unit ${i.acceptedUnits.join(" / ")}`);
  }
  return o.join(". ");
}
function z(s) {
  return [...new Set(s.split(",").map((e) => e.trim()).filter(Boolean))];
}
function ke(s, e) {
  return s.length > 60 || e.length > 32 || e.some((t) => t.length > 60) ? "Use a category up to 60 characters and at most 32 unique tags up to 60 characters each." : null;
}
const Tt = (s) => s.target.value;
function A(s, e, t, i = "text", r = 200) {
  return c`<label>${s}<input type=${i} maxlength=${r} .value=${e} @input=${(a) => t(Tt(a))}></label>`;
}
function T(s, e, t, i) {
  const r = e && !t.some((a) => a.value === e) ? [...t, { value: e, label: `${e} (current value)` }] : t;
  return c`<label>${s}<select .value=${e} @change=${(a) => i(Tt(a))}>${r.map((a) => c`<option value=${a.value} ?selected=${a.value === e}>${a.label}</option>`)}</select></label>`;
}
function It(s, e, t) {
  return T("Home Assistant area", s, [{ value: "", label: "No area" }, ...s && !e.some((i) => i.area_id === s) ? [{ value: s, label: `${s} (missing area — select a current area before saving)` }] : [], ...e.map((i) => ({ value: i.area_id, label: i.name }))], t);
}
function Pt(s, e) {
  const t = (i) => e({ mode: "indoor", exposure: null, rain_exposure: null, container: null, ...s, ...i });
  return c`${T("Placement", s?.mode ?? "", [{ value: "", label: "Not specified" }, ...pi.map((i) => ({ value: i, label: i.replaceAll("_", " ") }))], (i) => i ? t({ mode: i }) : e(null))}
    ${s ? c`${T("Sun exposure", s.exposure ?? "", ["", "full_sun", "partial_sun", "shade"].map((i) => ({ value: i, label: i || "Not specified" })), (i) => t({ exposure: i || null }))}
    ${T("Rain exposure", s.rain_exposure ?? "", ["", "none", "partial", "full"].map((i) => ({ value: i, label: i || "Not specified" })), (i) => t({ rain_exposure: i || null }))}
    ${T("Container", s.container === null ? "" : String(s.container), [{ value: "", label: "Not specified" }, { value: "true", label: "In a container" }, { value: "false", label: "In the ground" }], (i) => t({ container: i === "" ? null : i === "true" }))}` : u}`;
}
function ge(s, e, t, i, r, a, o, n = "all") {
  const l = (h) => o({ ...s, ...h }), d = [.../* @__PURE__ */ new Set([...t.map((h) => h.entity_id), ...Object.keys(i)])].filter((h) => h.startsWith("sensor.") && (r || i[h]?.attributes.device_class === "moisture")).sort();
  return c`${n !== "thresholds" ? c`
    <p>Assign up to 32 sources. Primary never falls back automatically. Unavailable sensors can be assigned.</p>
    <label class="check"><input type="checkbox" .checked=${r} @change=${(h) => a(h.target.checked)}>Show all sensors (metadata fallback)</label>
    ${T("Add moisture sensor", "", [{ value: "", label: "Choose a sensor" }, ...d.map((h) => ({ value: h, label: `${typeof i[h]?.attributes.friendly_name == "string" ? i[h]?.attributes.friendly_name : h} · ${h} · unit: ${i[h]?.attributes.unit_of_measurement ?? "not supplied"} · class: ${i[h]?.attributes.device_class ?? "not supplied"} · ${i[h]?.state ?? "unavailable"}` }))], (h) => {
    h && !s.sources.some((m) => m.entity_id === h) && l({ sources: [...s.sources, { entity_id: h, registry_id: t.find((m) => m.entity_id === h)?.id ?? null }] });
  })}
    <label>Assign an unavailable or unregistered sensor<input placeholder="sensor.soil_moisture" @keydown=${(h) => {
    if (h.key === "Enter") {
      h.preventDefault();
      const m = h.target, _ = m.value.trim();
      /^sensor\.[a-z0-9_]+$/.test(_) && !s.sources.some((x) => x.entity_id === _) && (l({ sources: [...s.sources, { entity_id: _, registry_id: t.find((x) => x.entity_id === _)?.id ?? null }] }), m.value = "");
    }
  }}></label><small>Press Enter to add an entity ID.</small>
    <ul>${s.sources.map((h) => {
    const m = N(h, t), _ = h.registry_id && !m ? void 0 : i[m?.entity_id ?? h.entity_id];
    return c`<li><strong>${m?.entity_id ?? h.entity_id}</strong><p>${_?.state ?? "Unavailable"} ${_?.attributes.unit_of_measurement ?? ""}${h.entity_id === s.primary_entity_id ? " · Primary" : ""}</p><p>Device class: ${_?.attributes.device_class ?? "Not supplied"} · Unit: ${_?.attributes.unit_of_measurement ?? "Not supplied"} · ${m ? "Registered" : "Not in registry"}</p><small>${ds(h, t, i)}</small>${m ? c`<a href="/config/entities/entity/${encodeURIComponent(m.id)}">Native sensor settings</a>` : u}<button type="button" @click=${() => l({ sources: s.sources.filter((x) => x !== h), primary_entity_id: s.primary_entity_id === h.entity_id ? null : s.primary_entity_id })}>Remove ${h.entity_id}</button></li>`;
  })}</ul>
    ${s.sources.some((h) => h.registry_id && !N(h, t)) ? c`<a href="/config/repairs">Open Home Assistant Repairs</a>` : u}
    ${T("Primary sensor", s.primary_entity_id ?? "", [{ value: "", label: "None (primary aggregation unavailable)" }, ...s.sources.map((h) => ({ value: h.entity_id, label: N(h, t)?.entity_id ?? h.entity_id }))], (h) => l({ primary_entity_id: h || null }))}
    ${T("Aggregation", s.aggregation, ["primary", "average", "min", "max"].map((h) => ({ value: h, label: h })), (h) => l({ aggregation: h }))}
    ${A("Stale after (seconds, 60–604800)", String(s.stale_after_seconds), (h) => l({ stale_after_seconds: Number(h) }), "number")}` : u}
    ${n !== "sources" ? c`<p>Blank overrides explicitly inherit defaults. Save applies the complete configuration atomically.</p><div class="grid">${q.map((h) => c`<div>${A(`${h} override (%)`, s.threshold_overrides[h] === null ? "" : String(s.threshold_overrides[h]), (m) => l({ threshold_overrides: { ...s.threshold_overrides, [h]: m.trim() === "" ? null : Number(m) } }), "number")}<small>Default ${e[h]}% · effective ${s.threshold_overrides[h] ?? e[h]}%</small><button type="button" @click=${() => l({ threshold_overrides: { ...s.threshold_overrides, [h]: null } })}>Inherit ${h}</button></div>`)}</div>` : u}`;
}
function _s(s, e, t, i, r, a, o) {
  const n = (d) => o({ ...e, ...d }), l = [.../* @__PURE__ */ new Set([...t.map((d) => d.entity_id), ...Object.keys(i)])].filter((d) => d.startsWith("sensor.") && (r || i[d]?.attributes.device_class === s.deviceClass && typeof i[d]?.attributes.unit_of_measurement == "string" && s.acceptedUnits.includes(i[d]?.attributes.unit_of_measurement))).sort();
  return c`
    <p>Assign up to 32 ${s.label.toLowerCase()} sources. Primary never falls back automatically. Unavailable sensors can be assigned.</p>
    <label class="check"><input type="checkbox" .checked=${r} @change=${(d) => a(d.target.checked)}>Show all sensors (metadata fallback)</label>
    ${T(`Add ${s.label.toLowerCase()} sensor`, "", [{ value: "", label: "Choose a sensor" }, ...l.map((d) => ({ value: d, label: `${typeof i[d]?.attributes.friendly_name == "string" ? i[d]?.attributes.friendly_name : d} · ${d} · unit: ${i[d]?.attributes.unit_of_measurement ?? "not supplied"} · class: ${i[d]?.attributes.device_class ?? "not supplied"} · ${i[d]?.state ?? "unavailable"}` }))], (d) => {
    d && !e.sources.some((h) => h.entity_id === d) && n({ sources: [...e.sources, { entity_id: d, registry_id: t.find((h) => h.entity_id === d)?.id ?? null }] });
  })}
    <label>Assign an unavailable or unregistered sensor<input placeholder="sensor.${s.role}" @keydown=${(d) => {
    if (d.key === "Enter") {
      d.preventDefault();
      const h = d.target, m = h.value.trim();
      /^sensor\.[a-z0-9_]+$/.test(m) && !e.sources.some((_) => _.entity_id === m) && (n({ sources: [...e.sources, { entity_id: m, registry_id: t.find((_) => _.entity_id === m)?.id ?? null }] }), h.value = "");
    }
  }}></label><small>Press Enter to add an entity ID.</small>
    <ul>${e.sources.map((d) => {
    const h = N(d, t), m = d.registry_id && !h ? void 0 : i[h?.entity_id ?? d.entity_id];
    return c`<li><strong>${h?.entity_id ?? d.entity_id}</strong><p>${m?.state ?? "Unavailable"} ${m?.attributes.unit_of_measurement ?? ""}${d.entity_id === e.primary_entity_id ? " · Primary" : ""}</p><p>Device class: ${m?.attributes.device_class ?? "Not supplied"} · Unit: ${m?.attributes.unit_of_measurement ?? "Not supplied"} · ${h ? "Registered" : "Not in registry"}</p><small>${ps(d, t, i, s)}</small>${h ? c`<a href="/config/entities/entity/${encodeURIComponent(h.id)}">Native sensor settings</a>` : u}<button type="button" @click=${() => n({ sources: e.sources.filter((_) => _ !== d), primary_entity_id: e.primary_entity_id === d.entity_id ? null : e.primary_entity_id })}>Remove ${d.entity_id}</button></li>`;
  })}</ul>
    ${e.sources.some((d) => d.registry_id && !N(d, t)) ? c`<a href="/config/repairs">Open Home Assistant Repairs</a>` : u}
    ${T("Primary sensor", e.primary_entity_id ?? "", [{ value: "", label: "None (primary aggregation unavailable)" }, ...e.sources.map((d) => ({ value: d.entity_id, label: N(d, t)?.entity_id ?? d.entity_id }))], (d) => n({ primary_entity_id: d || null }))}
    ${T("Aggregation", e.aggregation, ["primary", "average", "min", "max"].map((d) => ({ value: d, label: d })), (d) => n({ aggregation: d }))}
    ${A("Stale after (seconds, 60–604800)", String(e.stale_after_seconds), (d) => n({ stale_after_seconds: Number(d) }), "number")}`;
}
function Ae(s, e) {
  return c`<article><h3>${s.common_name ?? s.latin_name ?? "Species"}</h3><p><i>${s.latin_name}</i></p>
    <dl>${Object.entries({ Provider: s.provider, Reference: s.provider_ref, Attribution: s.attribution, Fetched: s.fetched_at, Locale: s.locale, Status: s.source_status, Confidence: s.confidence ?? "Not supplied", Category: s.category ?? "Not supplied" }).map(([t, i]) => c`<dt>${t}</dt><dd>${i}</dd>`)}</dl>
    <h4>Imported moisture defaults</h4>${q.map((t) => c`<p>${t}: ${s.threshold_defaults.moisture?.[t] ?? "Not supplied (built-in default applies)"}</p>`)}
    ${Object.entries(s.care_text).map(([t, i]) => c`<h4>${t}</h4><p class="prose">${i}</p>`)}
    <details><summary>Field attribution</summary>${Object.entries(s.field_sources).map(([t, i]) => c`<p>${t}: ${i}</p>`)}</details>
    ${e ? c`<h4>Proposed changes</h4>${Object.entries(e.diff).map(([t, i]) => c`<p>${t}: ${JSON.stringify(i.before)} → ${JSON.stringify(i.after)}</p>`)}<p>Preview is read-only. Local overrides are preserved. No remote images are loaded.</p>` : u}</article>`;
}
async function Ce(s) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(s.type) || s.size === 0 || s.size > 5 * 1024 * 1024)
    throw new Error("Choose a nonempty JPEG, PNG or WebP image up to 5 MiB.");
  let e;
  try {
    e = new Uint8Array(await s.slice(0, 12).arrayBuffer());
  } catch {
    throw new Error("This image could not be read. Select the file again.");
  }
  const t = (...o) => o.every((n, l) => e[l] === n), i = t(255, 216, 255) ? "image/jpeg" : t(137, 80, 78, 71, 13, 10, 26, 10) ? "image/png" : t(82, 73, 70, 70) && e[8] === 87 && e[9] === 69 && e[10] === 66 && e[11] === 80 ? "image/webp" : null;
  if (i !== s.type) throw new Error("Image content does not match its JPEG, PNG or WebP file type. Choose another image.");
  let r, a;
  try {
    if (typeof createImageBitmap == "function") {
      const o = await createImageBitmap(s);
      r = o.width, a = o.height, o.close();
    } else {
      const o = URL.createObjectURL(s);
      try {
        const n = new Image();
        await new Promise((l, d) => {
          n.onload = () => l(), n.onerror = () => d(new Error("decode")), n.src = o;
        }), r = n.naturalWidth, a = n.naturalHeight;
      } finally {
        URL.revokeObjectURL(o);
      }
    }
  } catch {
    throw new Error("This file could not be decoded as an image. Choose another JPEG, PNG or WebP.");
  }
  if (!Number.isInteger(r) || !Number.isInteger(a) || r < 1 || a < 1 || r > 2048 || a > 2048) throw new Error("Image dimensions must be at most 2048 × 2048 pixels.");
  return { format: i, bytes: s.size, width: r, height: a };
}
const Bt = Ut`
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
`;
var ms = Object.defineProperty, w = (s, e, t, i) => {
  for (var r = void 0, a = s.length - 1, o; a >= 0; a--)
    (o = s[a]) && (r = o(e, t, r) || r);
  return r && ms(e, t, r), r;
};
const ze = class ze extends V {
  constructor() {
    super(...arguments), this.areas = [], this.entities = [], this.states = {}, this.blocked = !1, this.navigationContext = 0, this.step = 0, this.busy = !1, this.error = "", this.name = "", this.acquired = "", this.area = "", this.placement = null, this.category = "", this.tagText = "", this.common = "", this.latin = "", this.provider = "manual", this.query = "", this.results = [], this.searched = !1, this.preview = null, this.accepted = !1, this.moisture = cs(), this.all = !1, this.draft = null, this.finalRequest = null, this.photo = null, this.photoInfo = null, this.rejected = !1, this.generation = 0, this.lifecycle = 0, this.steps = ["Basic info", "Species and care", "Review species", "Moisture sensors", "Moisture thresholds", "Category and tags", "Review and create"];
  }
  get visibleSteps() {
    return this.steps.flatMap((e, t) => t === 2 && this.provider === "manual" ? [] : [{ index: t, label: e }]);
  }
  connectedCallback() {
    super.connectedCallback(), this.draft || this.start();
  }
  disconnectedCallback() {
    this.lifecycle++, this.generation++, this.busy = !1, super.disconnectedCallback();
  }
  willUpdate(e) {
    const t = e.get("hass");
    (e.has("blocked") && this.blocked || t && t.connection !== this.hass.connection) && (this.lifecycle++, this.busy = !1, this.generation++, this.finalRequest || (this.preview = null, this.accepted = !1));
  }
  async start() {
    if (this.busy || this.blocked) return;
    const e = this.lifecycle;
    this.busy = !0;
    try {
      const t = await y.startWizard(this.hass);
      e === this.lifecycle && this.isConnected && (this.draft = t);
    } catch (t) {
      e === this.lifecycle && this.fail(t);
    } finally {
      e === this.lifecycle && (this.busy = !1);
    }
  }
  fail(e) {
    const t = ["integration_not_loaded", "unauthorized", "invalid_format", "invalid_response", "provider_disabled", "provider_authentication", "provider_rate_limit", "provider_timeout", "provider_outage", "provider_malformed_response", "not_found"];
    this.error = e instanceof E && t.includes(e.code) ? `${e.code}: Request failed. Review input or retry when connected. Species can be entered manually; expired previews require a new review.` : "Request failed. Retry when connected.", e instanceof E && ["integration_not_loaded", "unauthorized"].includes(e.code) && this.dispatchEvent(new CustomEvent("backend-unavailable", { detail: this.error, bubbles: !0, composed: !0 }));
  }
  get defaults() {
    return { ...J, ...this.accepted ? this.preview?.snapshot.threshold_defaults.moisture : {} };
  }
  manual() {
    this.generation++, this.provider = "manual", this.preview = null, this.accepted = !1, this.results = [], this.error = "";
  }
  async search() {
    if (this.busy || this.blocked || this.query.trim().length < 3) return;
    const e = this.lifecycle, t = ++this.generation;
    this.busy = !0, this.error = "", this.preview = null, this.accepted = !1;
    try {
      const i = await y.searchSpecies(this.hass, this.provider, this.query.trim(), this.hass.language ?? "en");
      t === this.generation && (this.results = i, this.searched = !0);
    } catch (i) {
      t === this.generation && this.fail(i);
    } finally {
      e === this.lifecycle && (this.busy = !1);
    }
  }
  async choose(e) {
    if (!this.draft || this.busy || this.blocked) return;
    const t = this.lifecycle, i = ++this.generation;
    this.busy = !0, this.accepted = !1, this.preview = null, this.error = "";
    try {
      const r = await y.previewWizard(this.hass, this.draft, e.provider, e.provider_ref, this.hass.language ?? "en");
      i === this.generation && (this.preview = r, this.step = 2, await this.focusStep());
    } catch (r) {
      i === this.generation && this.fail(r);
    } finally {
      t === this.lifecycle && (this.busy = !1);
    }
  }
  validate() {
    return !this.name.trim() || this.name.trim().length > 200 ? "Enter a plant name (1–200 characters)." : this.acquired && !Number.isFinite(Date.parse(this.acquired)) ? "Enter a valid acquired date." : this.area && !this.areas.some((e) => e.area_id === this.area) ? "The selected Home Assistant area no longer exists. Choose a current area or No area." : this.provider !== "manual" && (!this.preview || !this.accepted) ? "Review and explicitly accept the selected species preview, or continue manually." : ae(this.moisture, this.defaults) ?? ke(this.category, z(this.tagText));
  }
  async next() {
    if (this.busy || this.blocked || !this.draft || this.step >= 6) return;
    const e = this.lifecycle;
    if (this.error = "", this.step === 0 && !this.name.trim() && (this.error = "Enter a plant name."), this.step === 0 && this.photo && !this.error) {
      this.busy = !0;
      try {
        const t = await Ce(this.photo);
        e === this.lifecycle && (this.photoInfo = t);
      } catch (t) {
        e === this.lifecycle && (this.error = t.message);
      } finally {
        e === this.lifecycle && (this.busy = !1);
      }
      if (e !== this.lifecycle || !this.isConnected) return;
    }
    this.step === 1 && this.provider !== "manual" && !this.preview && (this.error = "Choose a species result or continue manually."), this.step === 2 && this.provider !== "manual" && !this.accepted && (this.error = "Explicitly accept the preview or continue manually."), this.step === 3 && (this.error = ae({ ...this.moisture, threshold_overrides: { min: null, target: null, max: null } }, J) ?? ""), this.step === 4 && (this.error = ae(this.moisture, this.defaults) ?? ""), this.step === 5 && (this.error = ke(this.category, z(this.tagText)) ?? ""), this.error || (this.step = this.step === 1 && this.provider === "manual" ? 3 : this.step + 1, await this.focusStep());
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
        tags: z(this.tagText),
        moisture: Ot(this.moisture, this.entities),
        ...this.accepted && this.preview ? { accepted_preview: { preview_token: this.preview.preview_token, provider: this.preview.provider, operation: "select" } } : { species: Nt(this.common, this.latin) }
      });
    }
    this.busy = !0, this.error = "";
    const e = this.lifecycle, t = this.navigationContext;
    try {
      const i = await y.createWizard(this.hass, this.finalRequest);
      if (e !== this.lifecycle || !this.isConnected) return;
      this.dispatchEvent(new CustomEvent("plant-created", { detail: { plant: i, photo: this.photo, navigationContext: t }, bubbles: !0, composed: !0 }));
    } catch (i) {
      e === this.lifecycle && (this.fail(i), this.rejected = i instanceof E && i.code === "invalid_format");
    } finally {
      e === this.lifecycle && (this.busy = !1);
    }
  }
  render() {
    return c`<section class="wizard-card"><nav aria-label="Creation progress"><ol class="stepper">${this.visibleSteps.map(({ index: e, label: t }, i) => c`<li aria-current=${e === this.step ? "step" : u}><span class="step-number">${i + 1}</span><span>${t}</span></li>`)}</ol></nav>
      <h2 tabindex="-1">${this.steps[this.step]}</h2><p class="muted">Your plant is saved only after the final confirmation. You can go back without losing your choices.</p>
      ${this.error ? c`<p class="error" role="alert">${this.error}</p>${(this.step === 1 || this.step === 2) && !this.finalRequest ? c`<button type="button" @click=${() => this.manual()}>Continue manually</button>` : u}` : u}
      ${!this.draft && !this.busy ? c`<button @click=${() => void this.start()}>Retry starting draft</button>` : u}
      <fieldset ?disabled=${this.busy || this.blocked || !!this.finalRequest}>
      ${this.step === 0 ? c`${A("Plant name", this.name, (e) => this.name = e)}${A("Acquired date", this.acquired, (e) => this.acquired = e, "date")}${It(this.area, this.areas, (e) => this.area = e)}${Pt(this.placement, (e) => this.placement = e)}<label>Optional local photo<input type="file" accept="image/jpeg,image/png,image/webp" @change=${(e) => {
      this.photo = e.target.files?.[0] ?? null, this.photoInfo = null;
    }}></label><small>JPEG, PNG or WebP; 5 MiB, 2048 × 2048 maximum. Uploaded only after creation.</small>${this.photo ? c`<p>Selected: ${this.photo.name} (${this.photo.size} bytes)</p><button @click=${() => {
      this.photo = null, this.photoInfo = null;
      const e = this.shadowRoot?.querySelector('input[type="file"]');
      e && (e.value = "");
    }}>Remove selected photo</button>` : u}` : u}
      ${this.step === 1 ? c`<div class="choice-cards" role="radiogroup" aria-label="Species source">
        <button type="button" class=${this.provider === "manual" ? "choice-card selected" : "choice-card"} aria-pressed=${this.provider === "manual"} @click=${() => this.manual()}><strong>Enter details myself</strong><span>Choose a species name or continue without one. Works offline.</span></button>
        ${this.capabilities.providers.some((e) => e.provider === "openplantbook") ? c`<button type="button" class=${this.provider === "openplantbook" ? "choice-card selected" : "choice-card"} aria-pressed=${this.provider === "openplantbook"} ?disabled=${!this.capabilities.providers.some((e) => e.provider === "openplantbook" && e.available)} @click=${() => {
      this.manual(), this.provider = "openplantbook";
    }}><strong>Search OpenPlantBook</strong><span>Find a species, review imported information, then choose what to apply.</span></button>` : u}
      </div>
        ${this.capabilities.providers.some((e) => e.provider === "openplantbook" && !e.available) ? c`<aside class="provider-help"><strong>OpenPlantBook is not connected</strong><p>Smart Plants connects directly to OpenPlantBook. Create an OpenPlantBook account and API client credentials, then add them in Home Assistant under Settings → Devices & services → Smart Plants → Configure. You do not need to install a separate Home Assistant integration.</p><a href="https://open.plantbook.io/apikey/" target="_blank" rel="noreferrer">Get OpenPlantBook API credentials</a></aside>` : u}
        ${this.provider === "manual" ? c`<h3>Species details <span class="muted">Optional</span></h3>${A("Common name", this.common, (e) => this.common = e)}${A("Scientific name", this.latin, (e) => this.latin = e)}<p class="default-summary">Moisture defaults come from Smart Plants: ${J.min}% minimum, ${J.target}% target, ${J.max}% maximum. You can review or adjust them later.</p>` : c`
        ${A("Search OpenPlantBook (at least 3 characters)", this.query, (e) => {
      this.query = e, this.generation++, this.results = [], this.preview = null, this.accepted = !1;
    })}<button type="button" class="primary" @click=${() => void this.search()} ?disabled=${this.busy || this.query.trim().length < 3}>Search plants</button>${this.searched && !this.results.length ? c`<p>No matches. Try another search or switch to manual entry.</p>` : u}<ul class="result-list">${this.results.map((e) => c`<li><button type="button" @click=${() => void this.choose(e)}>${e.common_name ?? e.latin_name} · ${e.latin_name}</button><small>${e.attribution}</small></li>`)}</ul><button type="button" @click=${() => this.manual()}>Enter details manually instead</button>`}` : u}
      ${this.step === 2 && this.preview ? c`${Ae(this.preview.snapshot, this.preview)}<label class="check"><input type="checkbox" .checked=${this.accepted} @change=${(e) => this.accepted = e.target.checked}>I reviewed and accept this species information</label><p>Imported moisture defaults will be shown with their source. Missing values use Smart Plants defaults.</p><button type="button" @click=${() => this.manual()}>Enter details manually instead</button>` : u}
       ${this.step === 3 ? ge(this.moisture, this.defaults, this.entities, this.states, this.all, (e) => this.all = e, (e) => this.moisture = e, "sources") : u}
       ${this.step === 4 ? c`<p class="default-summary">Current effective range: <strong>${this.moisture.threshold_overrides.min ?? this.defaults.min}%–${this.moisture.threshold_overrides.max ?? this.defaults.max}%</strong>, target <strong>${this.moisture.threshold_overrides.target ?? this.defaults.target}%</strong>.</p><p>Values shown as inherited use ${this.accepted ? "reviewed OpenPlantBook data where supplied, otherwise Smart Plants defaults" : "Smart Plants built-in defaults"}.</p><details class="advanced-disclosure"><summary>Advanced threshold overrides</summary><p>Leave a value blank to inherit its current default.</p>${ge(this.moisture, this.defaults, this.entities, this.states, this.all, (e) => this.all = e, (e) => this.moisture = e, "thresholds")}</details>` : u}
      ${this.step === 5 ? c`${A("Category", this.category, (e) => this.category = e, "text", 60)}${A("Tags (comma-separated)", this.tagText, (e) => this.tagText = e, "text", 2e3)}<p>Tags and category belong to Smart Plants, independently of Home Assistant labels.</p>` : u}
      ${this.step === 6 ? c`<h3>${this.name}</h3><dl>
        <dt>Area</dt><dd>${this.areas.find((e) => e.area_id === this.area)?.name ?? (this.area ? `${this.area} (missing area)` : "No area")}</dd>
        <dt>Placement</dt><dd>${this.placement?.mode ?? "Not specified"}</dd>
        <dt>Sun / rain exposure</dt><dd>${this.placement?.exposure ?? "Not specified"} / ${this.placement?.rain_exposure ?? "Not specified"}</dd>
        <dt>Container</dt><dd>${this.placement?.container === null || !this.placement ? "Not specified" : this.placement.container ? "In a container" : "In the ground"}</dd>
        <dt>Acquired</dt><dd>${this.acquired || "Not specified"}</dd>
        <dt>Species</dt><dd>${this.accepted && this.preview ? [this.preview.snapshot.common_name, this.preview.snapshot.latin_name].filter(Boolean).join(" · ") : [this.common, this.latin].filter(Boolean).join(" · ") || "No species selected"}</dd>
        <dt>Category / tags</dt><dd>${this.category} / ${z(this.tagText).join(", ")}</dd>
        <dt>Sources</dt><dd>${this.moisture.sources.map((e) => e.entity_id).join(", ") || "None"}</dd>
        <dt>Primary / aggregation</dt><dd>${this.moisture.primary_entity_id ?? "None"} / ${this.moisture.aggregation}</dd>
        <dt>Staleness</dt><dd>${this.moisture.stale_after_seconds} seconds</dd>
        <dt>Effective thresholds</dt><dd>${["min", "target", "max"].map((e) => `${e}: ${this.moisture.threshold_overrides[e] ?? this.defaults[e]}% (${this.moisture.threshold_overrides[e] === null ? "inherited" : "override"})`).join(" · ")}</dd>
        <dt>Photo</dt><dd>${this.photo?.name ?? "None"}${this.photoInfo ? c` · ${this.photoInfo.format} · ${this.photoInfo.width} × ${this.photoInfo.height} pixels · ${this.photoInfo.bytes} bytes` : u}</dd>
        </dl><p>Confirming creates one plant device and its moisture entities. You can configure notifications in Home Assistant afterwards.</p>` : u}
      </fieldset>
      ${this.finalRequest ? c`<p class="notice">The final request is retained unchanged. Retry it to resolve an uncertain result safely, including after reconnect. Do not start a replacement draft until the result is resolved.</p>` : u}
      ${this.rejected ? c`<p>The server rejected the request as invalid or expired. You may correct it using a fresh draft; species data must be previewed and accepted again.</p><button ?disabled=${this.busy || this.blocked} @click=${() => {
      this.finalRequest = null, this.rejected = !1, this.preview = null, this.accepted = !1, this.step = 0, this.error = "", this.start();
    }}>Start fresh draft retaining editable fields</button>` : u}
      <div class="actions"><button @click=${() => {
      this.step = this.step === 3 && this.provider === "manual" ? 1 : this.step - 1, this.focusStep();
    }} ?disabled=${this.step === 0 || this.busy || !!this.finalRequest}>Previous step</button>
      ${this.step < 6 ? c`<button class="primary" @click=${() => void this.next()} ?disabled=${this.busy || this.blocked || !this.draft}>Next step</button>` : c`<button class="primary" @click=${() => void this.create()} ?disabled=${this.busy || this.blocked || !this.draft}>${this.finalRequest ? "Retry same creation request" : "Confirm and create plant"}</button>`}</div>
      <p role="status">${this.busy ? "Working…" : ""}</p></section>`;
  }
};
ze.styles = Bt;
let $ = ze;
w([
  I({ attribute: !1 })
], $.prototype, "hass");
w([
  I({ attribute: !1 })
], $.prototype, "capabilities");
w([
  I({ attribute: !1 })
], $.prototype, "areas");
w([
  I({ attribute: !1 })
], $.prototype, "entities");
w([
  I({ attribute: !1 })
], $.prototype, "states");
w([
  I({ type: Boolean })
], $.prototype, "blocked");
w([
  I({ type: Number })
], $.prototype, "navigationContext");
w([
  p()
], $.prototype, "step");
w([
  p()
], $.prototype, "busy");
w([
  p()
], $.prototype, "error");
w([
  p()
], $.prototype, "name");
w([
  p()
], $.prototype, "acquired");
w([
  p()
], $.prototype, "area");
w([
  p()
], $.prototype, "placement");
w([
  p()
], $.prototype, "category");
w([
  p()
], $.prototype, "tagText");
w([
  p()
], $.prototype, "common");
w([
  p()
], $.prototype, "latin");
w([
  p()
], $.prototype, "provider");
w([
  p()
], $.prototype, "query");
w([
  p()
], $.prototype, "results");
w([
  p()
], $.prototype, "searched");
w([
  p()
], $.prototype, "preview");
w([
  p()
], $.prototype, "accepted");
w([
  p()
], $.prototype, "moisture");
w([
  p()
], $.prototype, "all");
w([
  p()
], $.prototype, "draft");
w([
  p()
], $.prototype, "finalRequest");
w([
  p()
], $.prototype, "photo");
w([
  p()
], $.prototype, "photoInfo");
w([
  p()
], $.prototype, "rejected");
customElements.get("smart-plants-wizard") || customElements.define("smart-plants-wizard", $);
var fs = Object.defineProperty, g = (s, e, t, i) => {
  for (var r = void 0, a = s.length - 1, o; a >= 0; a--)
    (o = s[a]) && (r = o(e, t, r) || r);
  return r && fs(e, t, r), r;
};
const gs = [
  {
    problemRole: "temperature_stress",
    configRole: "temperature",
    keys: Le,
    defaults: wt,
    unit: "°C",
    min: "-40",
    max: "80",
    step: "0.1",
    labels: { cold_threshold_celsius: "Cold trigger (°C)", cold_clear_celsius: "Cold clear (°C)", hot_clear_celsius: "Hot clear (°C)", hot_threshold_celsius: "Hot trigger (°C)" },
    successNotice: "Temperature stress thresholds saved.",
    formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy cold trigger < cold clear < hot clear < hot trigger, with at least 0.5 °C hysteresis per side and a 1.0 °C stable band.",
    validate: (s) => Si(s),
    seed: (s) => xi(s)
  },
  {
    problemRole: "humidity_stress",
    configRole: "humidity",
    keys: Ue,
    defaults: St,
    unit: "%",
    min: "0",
    max: "100",
    step: "0.1",
    labels: { dry_threshold_percent: "Dry trigger (%)", dry_clear_percent: "Dry clear (%)", damp_clear_percent: "Damp clear (%)", damp_threshold_percent: "Damp trigger (%)" },
    successNotice: "Humidity stress thresholds saved.",
    formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy dry trigger < dry clear < damp clear < damp trigger, with at least 1.0 % hysteresis per side and a 5.0 % stable band.",
    validate: (s) => Ci(s),
    seed: (s) => Ni(s)
  },
  {
    problemRole: "conductivity_stress",
    configRole: "conductivity",
    keys: qe,
    defaults: xt,
    unit: "µS/cm",
    min: "0",
    max: "10000",
    step: "0.1",
    labels: { low_threshold_micro_siemens_per_cm: "Low trigger (µS/cm)", low_clear_micro_siemens_per_cm: "Low clear (µS/cm)", high_clear_micro_siemens_per_cm: "High clear (µS/cm)", high_threshold_micro_siemens_per_cm: "High trigger (µS/cm)" },
    successNotice: "Conductivity stress thresholds saved.",
    formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy low trigger < low clear < high clear < high trigger, with at least 10.0 µS/cm hysteresis per side and a 50.0 µS/cm stable band.",
    validate: (s) => Bi(s),
    seed: (s) => Li(s)
  },
  {
    problemRole: "co2_stress",
    configRole: "co2",
    keys: He,
    defaults: Et,
    unit: "ppm",
    min: "0",
    max: "10000",
    step: "1",
    labels: { threshold_ppm: "High trigger (ppm)", clear_ppm: "High clear (ppm)" },
    successNotice: "CO2 stress thresholds saved.",
    formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy clear_ppm < threshold_ppm with at least 100 ppm hysteresis; both are integers within 0…10000 ppm.",
    validate: (s) => Mi(s),
    seed: (s) => ji(s)
  },
  {
    problemRole: "soil_temperature_stress",
    configRole: "soil_temperature",
    keys: De,
    defaults: kt,
    unit: "°C",
    min: "-20",
    max: "60",
    step: "0.1",
    labels: { cold_threshold_celsius: "Cold trigger (°C)", cold_clear_celsius: "Cold clear (°C)", hot_clear_celsius: "Hot clear (°C)", hot_threshold_celsius: "Hot trigger (°C)" },
    successNotice: "Soil temperature stress thresholds saved.",
    formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy cold trigger < cold clear < hot clear < hot trigger, with at least 0.5 °C hysteresis per side and a 1.0 °C stable band, all within −20.0…60.0 °C.",
    validate: (s) => Gi(s),
    seed: (s) => Yi(s)
  },
  {
    problemRole: "low_battery",
    configRole: "battery",
    keys: Me,
    defaults: At,
    unit: "%",
    min: "0",
    max: "100",
    step: "1",
    labels: { threshold_percent: "Low trigger (%)", clear_percent: "Low clear (%)" },
    successNotice: "Low battery thresholds saved.",
    formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy threshold_percent < clear_percent with at least 1 % hysteresis; both are integers within 0…100 %.",
    validate: (s) => Qi(s),
    seed: (s) => es(s)
  },
  {
    problemRole: "low_light",
    configRole: "illuminance",
    keys: je,
    defaults: Ct,
    unit: "lx",
    min: "0",
    max: "200000",
    step: "0.1",
    labels: { target_lux: "Target (lx)", clear_lux: "Clear (lx)" },
    successNotice: "Low light thresholds saved.",
    formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy target_lux < clear_lux with at least 10.0 lx hysteresis; both are within 0.0…200000.0 lx.",
    validate: (s) => as(s),
    seed: (s) => ns(s)
  }
], Se = Object.fromEntries(gs.map((s) => [s.problemRole, s])), ys = "M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", bs = "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z", Fe = class Fe extends V {
  constructor() {
    super(...arguments), this.narrow = !1, this._plants = [], this._loading = !0, this._error = "", this._notice = "", this._view = { kind: "list" }, this._detailSection = "overview", this._formBusy = !1, this._capabilities = null, this._blocked = !0, this._areas = [], this._entities = [], this._devices = [], this._states = {}, this._evaluations = {}, this._health = {}, this._healthError = "", this._careHistory = null, this._careError = "", this._careDate = "", this._careNote = "", this._careKind = "watering", this._careFields = {}, this._careEditingId = null, this._registryError = "", this._areaReview = !1, this._filters = {}, this._edits = null, this._conflict = null, this._allSensors = !1, this._preview = null, this._provider = "manual", this._query = "", this._results = [], this._related = [], this._imageUrl = null, this._imageLoading = !1, this._imageError = null, this._dialog = null, this._wizardStarted = !1, this._creationNotice = "", this._createdPlantId = null, this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._thresholdSaved = {}, this._pendingThresholdSwitch = null, this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._sourceSaved = {}, this._pendingSourceSwitch = null, this._allSourceSensors = !1, this._base = null, this._baseArea = "", this._imageKey = null, this._imageRequest = 0, this._request = 0, this._careRequest = 0, this._providerRequest = 0, this._context = 0, this._subscriptionGeneration = 0, this._focusReturn = null, this._ready = () => {
      this._refresh();
    }, this._disconnected = () => {
      this._context++, this._formBusy = !1, this._blocked = !0, this._request++, this._providerRequest++, this._preview = null, this._clearImage(), this._error = "Disconnected. Local edits and creation retries are retained. Reconnect before saving.";
    };
  }
  willUpdate(e) {
    e.has("hass") && (this.hass?.states && (this._states = Object.fromEntries(Object.entries(this.hass.states).filter(([t, i]) => Ee(i) && i.entity_id === t))), this._syncImage());
  }
  updated(e) {
    e.has("hass") && (this.hass?.connection !== this._connection && (this._unbind(), this._bind(), this._refresh()), this.hass?.user?.is_admin === !1 && this._unbind());
    const t = this.shadowRoot?.querySelector("dialog"), i = this.shadowRoot?.activeElement;
    t?.open && (!i || !t.contains(i) || i.matches(":disabled")) && t.querySelector("button")?.focus();
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
    const e = this.hass.connection;
    this._connection = e;
    const t = this._subscriptionGeneration;
    e.addEventListener?.("ready", this._ready), e.addEventListener?.("disconnected", this._disconnected), y.subscribeRegistry(this.hass, this._ready).then((i) => {
      this._connection !== e || t !== this._subscriptionGeneration || !this.isConnected ? i() : this._unsubscribe = i;
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
    const e = this._view.kind === "detail" ? this._plantById(this._view.plantId) : void 0, t = this.hass && e?.image ? `${this.hass.auth?.accessToken ?? ""}:${e.id}:${e.revision}:${e.image.id}` : null;
    if (t === this._imageKey || !this.isConnected || (this._clearImage(), this._imageKey = t, !t || !this.hass || !e)) return;
    const i = this._imageRequest, r = new AbortController();
    this._imageAbort = r, this._imageLoading = !0, y.fetchImage(this.hass, e.id, r.signal).then((a) => {
      const o = URL.createObjectURL(a);
      if (i !== this._imageRequest || !this.isConnected) {
        URL.revokeObjectURL(o);
        return;
      }
      this._imageAbort = void 0, this._imageUrl = o, this._imageLoading = !1;
    }).catch((a) => {
      i === this._imageRequest && (this._imageAbort = void 0, this._imageLoading = !1, a instanceof DOMException && a.name === "AbortError" || (this._imageError = this._friendly(a)));
    });
  }
  async _refresh(e = !0) {
    if (!this.isConnected || !this.hass || this.hass.user?.is_admin === !1) return;
    const t = ++this._request, i = this.hass;
    e && (this._loading = !0);
    try {
      const r = await y.info(i), a = await y.list(i);
      if (t !== this._request || !this.isConnected) return;
      if (this._capabilities = r, this._blocked = !1, this._plants = a, e && (this._error = ""), this._base) {
        const n = a.find((l) => l.id === this._base?.id);
        n && n.revision !== this._base.revision && this._setConflict(this._base, n), n || (this._context++, this._formBusy = !1, this._closeDialog(), this._base = null, this._conflict = null, this._edits = null, this._notice = "This plant was deleted in another session.", this.updateComplete.then(() => this.shadowRoot?.querySelector("h1")?.focus()));
      }
      this._syncImage();
      try {
        const [n, l, d, h] = await Promise.all([y.areas(i), y.entities(i), y.devices(i), y.states(i)]);
        if (t !== this._request) return;
        if (this._areas = n, this._entities = l, this._devices = d, this._states = i.states ? Object.fromEntries(Object.entries(i.states).filter(([m, _]) => Ee(_) && _.entity_id === m)) : Object.fromEntries(h.map((m) => [m.entity_id, m])), this._registryError = "", this._base && this._edits) {
          const m = K(this._base, d)?.area_id ?? "";
          if (m !== this._baseArea) {
            const _ = this._edits.area !== this._baseArea;
            this._notice = `Home Assistant area changed from ${this._areaName(this._baseArea)} to ${this._areaName(m)}.${_ ? " Your area selection is retained; review it before saving." : " The area selector now reflects the native area."}`, _ || this._edit({ area: m }), this._areaReview = _, this._baseArea = m;
          }
        }
      } catch (n) {
        t === this._request && (this._registryError = this._friendly(n));
      }
      const o = await Promise.all(a.map(async (n) => {
        try {
          return [n.id, await y.evaluation(i, n.id)];
        } catch {
          return null;
        }
      }));
      if (t === this._request && (this._evaluations = Object.fromEntries(o.filter((n) => n !== null))), this._view.kind === "detail") {
        const n = this._view.plantId;
        await this._loadCare(n, this._context, t);
        try {
          const l = await y.plantHealth(i, n);
          t === this._request && (this._health = { ...this._health, [n]: l }, this._healthError = "");
        } catch (l) {
          if (t === this._request) {
            const d = { ...this._health };
            delete d[n], this._health = d, this._healthError = this._friendly(l);
          }
        }
      }
    } catch (r) {
      t === this._request && (this._error = this._friendly(r), this._blocked = !0, this._clearImage());
    } finally {
      t === this._request && (this._loading = !1);
    }
  }
  _friendly(e) {
    return e instanceof E ? {
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
    const r = ["name", "acquired_at", "placement", "category", "tags", "species", "image", "lifecycle_state", "roles", "care_events"].filter((a) => JSON.stringify(e[a]) !== JSON.stringify(t[a])).map((a) => a === "roles" ? "Sensor configuration or threshold defaults/overrides changed." : `${a}: ${JSON.stringify(e[a])} → ${JSON.stringify(t[a])}`);
    this._conflict = { before: e, after: t, changes: r }, this._preview = null, this._providerRequest++;
  }
  _beginEdit(e) {
    const t = M(e);
    this._base = structuredClone(e), this._baseArea = K(e, this._devices)?.area_id ?? "", this._edits = { name: e.name, acquired: e.acquired_at ?? "", placement: structuredClone(e.placement), category: e.category ?? "", tagText: e.tags.join(", "), area: this._baseArea, common: e.species?.snapshot.common_name ?? "", latin: e.species?.snapshot.latin_name ?? "", moisture: t ? _t(t) : null }, this._conflict = null, this._areaReview = !1, this._preview = null, this._results = [], this._provider = "manual", this._related = [], this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._thresholdSaved = {}, this._pendingThresholdSwitch = null, this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._sourceSaved = {}, this._pendingSourceSwitch = null, this._allSourceSensors = !1;
    const i = K(e, this._devices), r = this._context;
    i && this.hass && y.related(this.hass, i.id).then((a) => {
      r === this._context && this._base?.id === e.id && (this._related = a);
    }).catch(() => {
      r === this._context && this._base?.id === e.id && (this._notice = "Related automations could not be loaded. Open the native device page to inspect them.");
    });
  }
  _show(e) {
    if (this._context++, this._closeDialog(), this._formBusy = !1, this._providerRequest++, this._view = e, this._error = "", this._notice = "", this._healthError = "", this._careHistory = null, this._careError = "", e.kind === "create" && (this._wizardStarted = !0), e.kind === "detail") {
      this._detailSection = "overview";
      const t = /* @__PURE__ */ new Date();
      this._careDate = new Date(t.getTime() - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 16), this._careNote = "";
      const i = this._plantById(e.plantId);
      i && this._beginEdit(i);
      const r = e.plantId, a = this.hass, o = this._context;
      a && !this._blocked && (this._loadCare(r, o), y.plantHealth(a, r).then((n) => {
        o === this._context && (this._health = { ...this._health, [r]: n }, this._healthError = "");
      }).catch((n) => {
        if (o === this._context) {
          const l = { ...this._health };
          delete l[r], this._health = l, this._healthError = this._friendly(n);
        }
      }));
    } else
      this._base = null, this._edits = null, this._conflict = null;
    this._syncImage(), this.updateComplete.then(() => this.shadowRoot?.querySelector("h1")?.focus());
  }
  _handleMenuAction(e) {
    e.detail.item.value === "add-plant" && this._show({ kind: "create" }), e.detail.item.value === "back-to-overview" && this._show({ kind: "list" });
  }
  async _loadCare(e, t, i) {
    if (!this.hass) return;
    const r = ++this._careRequest;
    try {
      const a = await y.careHistory(this.hass, e);
      r === this._careRequest && t === this._context && (i === void 0 || i === this._request) && this._view.kind === "detail" && this._view.plantId === e && (this._careHistory = a, this._careError = "");
    } catch (a) {
      r === this._careRequest && t === this._context && (i === void 0 || i === this._request) && (this._careHistory = null, this._careError = this._friendly(a));
    }
  }
  _carePayload() {
    const e = this._careNote.trim() || null;
    switch (this._careKind) {
      case "watering":
        return { note: e };
      case "fertilizing": {
        const t = this._careFields.amount?.trim() ? Number(this._careFields.amount) : null;
        return { product: this._careFields.product?.trim() || null, amount: t, unit: t === null ? null : this._careFields.unit || null, note: e };
      }
      case "pruning":
        return { part: this._careFields.part?.trim() || null, note: e };
      case "repotting":
        return { container: this._careFields.container?.trim() || null, medium: this._careFields.medium?.trim() || null, note: e };
      case "note":
        return { text: this._careFields.text?.trim() ?? "" };
    }
  }
  _editCare(e) {
    this._careEditingId = e.id, this._careKind = e.kind, this._careNote = typeof e.payload.note == "string" ? e.payload.note : "";
    const t = new Date(e.occurred_at);
    this._careDate = new Date(t.getTime() - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    const i = e.payload;
    this._careFields = Object.fromEntries(Object.entries(i).map(([r, a]) => [r, a == null ? "" : String(a)])), this._careError = "";
  }
  async _saveCare(e) {
    const t = this._careHistory;
    if (!this.hass || !t || t.revision !== e.revision || this._formBusy || this._blocked || this._conflict) {
      this._careError = "Refresh care history before saving. Your draft is retained.";
      return;
    }
    const i = new Date(this._careDate);
    if (!this._careDate || Number.isNaN(i.getTime()) || i.getTime() > Date.now() || new Date(i.getTime() - i.getTimezoneOffset() * 6e4).toISOString().slice(0, 16) !== this._careDate) {
      this._careError = "Choose a valid local date and time that is not in the future.";
      return;
    }
    const r = this._careFields, a = this._carePayload(), o = typeof a.note == "string" ? a.note : null;
    if ((this._careKind === "watering" || this._careKind === "fertilizing" || this._careKind === "pruning" || this._careKind === "repotting") && o && o.length > 500) {
      this._careError = "Notes must be at most 500 characters.";
      return;
    }
    if (this._careKind === "fertilizing" && a.amount !== null && (!Number.isFinite(a.amount) || Number(a.amount) <= 0 || Number(a.amount) > 1e5 || !a.unit)) {
      this._careError = "Enter a positive amount up to 100000 with a unit.";
      return;
    }
    if (this._careKind === "note" && (!String(a.text).trim() || String(a.text).length > 1e3)) {
      this._careError = "Enter a note of 1 to 1000 characters.";
      return;
    }
    if (Object.values(r).some((m) => m.length > 120)) {
      this._careError = "Care details must be at most 120 characters.";
      return;
    }
    const n = -i.getTimezoneOffset(), l = `${n < 0 ? "-" : "+"}${String(Math.floor(Math.abs(n) / 60)).padStart(2, "0")}:${String(Math.abs(n) % 60).padStart(2, "0")}`, d = `${this._careDate}:00${l}`, h = this.hass;
    this._careError = "", await this._mutate(async () => (this._careEditingId ? await y.editCareEvent(h, e.id, e.revision, this._careEditingId, this._careKind, d, a) : await y.addCareEvent(h, e.id, e.revision, this._careKind, d, a)).plant), this._error || (this._careEditingId = null, this._careKind = "watering", this._careFields = {}, this._careNote = "");
  }
  async _deleteCare(e, t) {
    if (!this.hass || !this._careHistory || this._careHistory.revision !== e.revision) {
      this._careError = "Refresh care history before deleting.";
      return;
    }
    if (!window.confirm(`Delete this ${t.kind} record? This cannot be undone.`)) return;
    const i = this.hass;
    await this._mutate(async () => (await y.deleteCareEvent(i, e.id, e.revision, t.id)).plant);
  }
  _renderCare(e) {
    const t = this._careHistory, i = { fertilizing: ["product", "amount", "unit"], pruning: ["part"], repotting: ["container", "medium"], note: ["text"] }, r = { product: "Product", amount: "Amount", unit: "Unit (g or mL)", part: "Plant part", container: "Container", medium: "Growing medium", text: "Note text" }, a = (n) => ({ watering: "Watering", fertilizing: "Fertilizing", pruning: "Pruning", repotting: "Repotting", note: "Note" })[n], o = (n) => `${n.local_date} · ${n.occurred_at} (recorded offset)`;
    return c`<section aria-labelledby="care-heading"><h2 id="care-heading">Care history</h2>
      ${this._careError ? c`<p class="error" role="alert">${this._careError}</p>` : u}
      ${t ? c`<p role="status">${t.summary.watering_count} watering events. Last watered: ${t.summary.last_watered_local_date ?? "never"}.</p>
        ${t.events.length ? c`<ul aria-label="Plant care events">${t.events.map((n) => c`<li><strong>${a(n.kind)}</strong> <time datetime=${n.occurred_at}>${o(n)}</time>
          ${Object.entries(n.payload).filter(([, l]) => l !== null).map(([l, d]) => c`<p>${r[l] ?? l}: ${d}</p>`)}
          <button type="button" ?disabled=${this._formBusy || !!this._conflict} @click=${() => this._editCare(n)}>Edit ${a(n.kind).toLowerCase()}</button>
          <button type="button" ?disabled=${this._formBusy || !!this._conflict} @click=${() => void this._deleteCare(e, n)}>Delete ${a(n.kind).toLowerCase()}</button></li>`)}</ul>` : c`<p>No care recorded yet.</p>`}` : c`<p>Loading care history or refresh to retry.</p>`}
      <fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict || !t || t.revision !== e.revision}>
        <legend>${this._careEditingId ? `Edit ${a(this._careKind).toLowerCase()}` : "Record care"}</legend>
        <label>Care type<select aria-label="Care type" .value=${this._careKind} @change=${(n) => {
      this._careKind = n.target.value, this._careFields = {};
    }}>${["watering", "fertilizing", "pruning", "repotting", "note"].map((n) => c`<option value=${n}>${a(n)}</option>`)}</select></label>
        <label>When (your local time)<input type="datetime-local" .value=${this._careDate} @input=${(n) => this._careDate = n.target.value}></label>
        ${(i[this._careKind] ?? []).map((n) => c`<label>${r[n]}<input aria-label=${r[n]} type=${n === "amount" ? "number" : "text"} maxlength=${n === "text" ? 1e3 : 120} .value=${this._careFields[n] ?? ""} @input=${(l) => this._careFields = { ...this._careFields, [n]: l.target.value }}></label>`)}
        ${this._careKind !== "note" ? c`<label>Note (optional)<input type="text" maxlength="500" .value=${this._careNote} @input=${(n) => this._careNote = n.target.value}></label>` : u}
        ${this._careKind === "fertilizing" ? c`<label>Unit<select aria-label="Unit" .value=${this._careFields.unit ?? ""} @change=${(n) => this._careFields = { ...this._careFields, unit: n.target.value }}><option value="">No measured amount</option><option value="g">g</option><option value="mL">mL</option></select></label>` : u}
        <button type="button" class="primary" @click=${() => void this._saveCare(e)}>${this._careEditingId ? "Save care changes" : "Record care"}</button>
        ${this._careEditingId ? c`<button type="button" @click=${() => {
      this._careEditingId = null, this._careKind = "watering", this._careFields = {}, this._careNote = "";
    }}>Cancel editing</button>` : u}
      </fieldset><p>Care records do not operate irrigation or change moisture alerts.</p></section>`;
  }
  _edit(e) {
    this._edits && (this._edits = { ...this._edits, ...e });
  }
  _status(e) {
    const t = this._evaluations[e.id];
    return e.lifecycle_state === "disabled" ? "disabled" : !t || !t.computed_available ? "unavailable" : t.needs_water ? "needs water" : t.too_wet ? "too wet" : t.sensor_stale ? "stale" : "healthy";
  }
  _missing(e) {
    return !!M(e)?.sources.some((t) => t.registry_id && !N(t, this._entities));
  }
  _matches(e) {
    const t = this._filters, i = this._status(e), r = this._evaluations[e.id], a = [e.name, e.species?.snapshot.common_name, e.species?.snapshot.latin_name, e.category, ...e.tags].join(" ").toLocaleLowerCase();
    return (!t.search || a.includes(t.search.toLocaleLowerCase())) && (!t.status || (t.status === "problems" ? ["needs water", "too wet", "stale", "unavailable"].includes(i) || this._missing(e) : i === t.status)) && (!t.area || (K(e, this._devices)?.area_id ?? "none") === t.area) && (!t.placement || (e.placement?.mode ?? "none") === t.placement) && (!t.lifecycle || e.lifecycle_state === t.lifecycle) && (!t.species || (e.species?.snapshot.latin_name ?? e.species?.snapshot.common_name ?? "none") === t.species) && (!t.category || (e.category ?? "none") === t.category) && (!t.tag || e.tags.includes(t.tag)) && (!t.sensor || (t.sensor === "missing" ? this._missing(e) : t.sensor === "stale" ? !!r?.sensor_stale : t.sensor === "unavailable" ? !r?.computed_available : this._missing(e) || !!r?.sensor_stale));
  }
  _filter(e, t, i) {
    return T(e, this._filters[t] ?? "", [{ value: "", label: `All ${e.toLowerCase()}` }, ...[...new Set(i)].sort().map((r) => ({ value: r, label: t === "area" ? this._areaName(r === "none" ? "" : r) : r }))], (r) => this._filters = { ...this._filters, [t]: r });
  }
  _renderList() {
    if (this._loading) return c`<p role="status">Loading plants…</p>`;
    const e = this._plants.filter((r) => this._matches(r)), t = this._plants.filter((r) => this._status(r) === "needs water").length, i = this._plants.filter((r) => r.lifecycle_state !== "disabled" && (this._missing(r) || ["too wet", "stale", "unavailable"].includes(this._status(r)))).length;
    return c`<section class="inventory-summary" aria-label="Plant summary"><article><span>Total plants</span><strong>${this._plants.length}</strong></article><article><span>Needs water</span><strong>${t}</strong></article><article><span>Problems</span><strong>${i}</strong></article></section>
      <details class="filter-disclosure"><summary role="button">Filter plants${Object.values(this._filters).filter(Boolean).length ? ` · ${Object.values(this._filters).filter(Boolean).length} active` : ""}</summary><section><div class="grid">${A("Search plants", this._filters.search ?? "", (r) => this._filters = { ...this._filters, search: r })}
      ${this._filter("Status", "status", ["healthy", "needs water", "too wet", "stale", "unavailable", "disabled", "problems"])}
      ${this._filter("Lifecycle", "lifecycle", ["active", "disabled"])}
      ${this._filter("Area", "area", ["none", ...this._areas.map((r) => r.area_id)])}
      ${this._filter("Placement", "placement", this._plants.map((r) => r.placement?.mode ?? "none"))}
      ${this._filter("Species", "species", this._plants.map((r) => r.species?.snapshot.latin_name ?? r.species?.snapshot.common_name ?? "none"))}
      ${this._filter("Category", "category", this._plants.map((r) => r.category ?? "none"))}
      ${this._filter("Sensor condition", "sensor", ["missing", "stale", "unavailable", "missing or stale"])}
      ${this._filter("Tags", "tag", this._plants.flatMap((r) => r.tags))}</div><button @click=${() => this._filters = {}}>Clear filters</button></section></details>
      ${this._plants.length ? e.length ? c`<p class="plant-count" role="status">${e.length === this._plants.length ? `${e.length} plants` : `${e.length} of ${this._plants.length} plants`}</p><ul class="plants">${e.map((r) => c`<li class="plant plant-card"><div class="plant-card-heading"><span class="plant-avatar" aria-hidden="true">${(r.name.trim()[0] ?? "?").toLocaleUpperCase()}</span><div><button class="name" @click=${() => this._show({ kind: "detail", plantId: r.id })}>${r.name}</button><span class="plant-status">${this._status(r)}${this._missing(r) ? " · missing source" : ""}</span></div></div><div class="plant-card-metrics"><div><small>Soil moisture</small><strong>${this._evaluations[r.id]?.computed_percent ?? "—"}<small>%</small></strong></div><div><small>Moisture health</small><strong>${this._evaluations[r.id]?.health_score ?? "—"}<small>/100</small></strong></div></div><small class="plant-meta">${this._areaName(K(r, this._devices)?.area_id ?? "")} · ${r.placement?.mode ?? "No placement"}<br>${r.species?.snapshot.common_name ?? r.species?.snapshot.latin_name ?? "Manual plant"} · ${r.category ?? "Uncategorized"}${r.tags.length ? c`<br>${r.tags.join(" · ")}` : u}</small></li>`)}</ul>` : c`<p role="status">No plants match these filters.</p>` : c`<section class="empty"><h2>A home for every plant</h2><p>Create a lasting plant profile, connect replaceable moisture sensors, and use its entities in native Home Assistant automations. Species and sensors are optional.</p><button class="primary" ?disabled=${this._blocked} @click=${() => this._show({ kind: "create" })}>Add your first plant</button></section>`}`;
  }
  async _save(e) {
    const t = this._base, i = this._edits;
    if (!this.hass || !t || !i || this._formBusy || this._blocked || this._conflict || e === "area" && this._areaReview) return;
    if (e === "area" && (this._registryError || i.area && !this._areas.some((o) => o.area_id === i.area))) {
      this._error = "Reconnect to load current Home Assistant areas, then choose an area or No area.";
      return;
    }
    const r = this.hass, a = { plant_id: t.id, expected_revision: t.revision };
    if (e === "identity") {
      if (!i.name.trim() || i.name.trim().length > 200 || i.acquired && !Number.isFinite(Date.parse(i.acquired))) {
        this._error = "Enter a valid name and acquired ISO date/time.";
        return;
      }
      Object.assign(a, { name: i.name.trim(), acquired_at: i.acquired ? new Date(i.acquired).toISOString() : null, placement: i.placement });
    }
    if (e === "taxonomy") {
      const o = ke(i.category, z(i.tagText));
      if (o) {
        this._error = o;
        return;
      }
      Object.assign(a, { category: i.category.trim() || null, tags: z(i.tagText) });
    }
    if (e === "species" && (a.species = Nt(i.common, i.latin)), e === "moisture") {
      if (!i.moisture) return;
      if (this._registryError) {
        this._error = "Reconnect to load current registry data before saving moisture sources.";
        return;
      }
      const o = ae(i.moisture, this._defaults(t));
      if (o) {
        this._error = o;
        return;
      }
    }
    await this._mutate(async () => e === "area" ? await y.setArea(r, t.id, t.revision, i.area || null) : e === "moisture" && i.moisture ? y.configureMoisture(r, t.id, t.revision, Ot(i.moisture, this._entities)) : y.update(r, a), !1, e);
  }
  async _mutate(e, t = !1, i) {
    if (this._formBusy || this._blocked || this._conflict) return;
    this._formBusy = !0, this._error = "";
    const r = this._context, a = this._base, o = this._edits?.area;
    this._request++;
    try {
      const n = await e();
      if (r !== this._context || !this.isConnected) return;
      if (n) {
        const l = this._plantById(n.id);
        if (l && l.revision > n.revision) {
          await this._refresh(!1);
          return;
        }
        this._plants = this._plants.map((d) => d.id === n.id ? n : d), a && this._base?.id === n.id && this._rebaseEdits(a, n, i), i === "area" && o !== void 0 && (this._baseArea = o, this._edit({ area: o }), this._areaReview = !1), this._syncImage(), this._notice = "Saved.";
      }
      t && this._show({ kind: "list" }), await this._refresh(!1);
    } catch (n) {
      if (r !== this._context || !this.isConnected) return;
      this._error = this._friendly(n), n instanceof E && n.code === "revision_conflict" && await this._refresh(!1), n instanceof E && ["integration_not_loaded", "unauthorized"].includes(n.code) && (this._blocked = !0, this._clearImage());
    } finally {
      r === this._context && (this._formBusy = !1);
    }
  }
  _defaults(e) {
    const t = M(e);
    return t ? { min: t.threshold_defaults.min.value, target: t.threshold_defaults.target.value, max: t.threshold_defaults.max.value } : J;
  }
  _reviewConflict() {
    if (!this._conflict || !this._edits) return;
    const e = this._sourceConflictFields(this._conflict.after);
    this._rebaseEdits(this._conflict.before, this._conflict.after), this._notice = `Changes reviewed. Your edited fields are retained; inspect them and use each Save button to explicitly reapply.${e.length ? ` Both sessions changed ${e.join(", ")} in the sources editor. Saving will replace the refreshed values for those fields.` : ""} Species previews must be requested and reviewed again.`;
  }
  _sourceConflictFields(e) {
    if (!this._sourceRole || !this._sourceEdits || !this._sourceBaseline) return [];
    const t = G(e, this._sourceRole);
    return t ? ["sources", "primary_entity_id", "aggregation", "stale_after_seconds"].filter((i) => JSON.stringify(this._sourceEdits[i]) !== JSON.stringify(this._sourceBaseline[i]) && JSON.stringify(t[i]) !== JSON.stringify(this._sourceBaseline[i])) : [];
  }
  _rebaseEdits(e, t, i) {
    if (!this._edits) return;
    const r = this._edits, a = this._areaReview, o = this._sourceRole, n = this._sourceEdits, l = this._sourceBaseline, d = this._thresholdRole, h = this._thresholdEdits, m = this._thresholdBaseline, _ = {};
    r.name !== e.name && (_.name = r.name), r.acquired !== (e.acquired_at ?? "") && (_.acquired = r.acquired), JSON.stringify(r.placement) !== JSON.stringify(e.placement) && (_.placement = r.placement), r.category !== (e.category ?? "") && (_.category = r.category), JSON.stringify(z(r.tagText)) !== JSON.stringify(e.tags) && (_.tagText = r.tagText), r.area !== this._baseArea && (_.area = r.area), r.common !== (e.species?.snapshot.common_name ?? "") && (_.common = r.common), r.latin !== (e.species?.snapshot.latin_name ?? "") && (_.latin = r.latin);
    const x = M(e), O = M(t);
    if (r.moisture && x && O) {
      const R = _t(O);
      for (const k of ["sources", "primary_entity_id", "aggregation", "stale_after_seconds"])
        JSON.stringify(r.moisture[k]) !== JSON.stringify(x[k]) && Object.assign(R, { [k]: structuredClone(r.moisture[k]) });
      for (const k of q) r.moisture.threshold_overrides[k] !== x.threshold_overrides[k] && (R.threshold_overrides[k] = r.moisture.threshold_overrides[k]);
      _.moisture = R;
    }
    const he = { identity: ["name", "acquired", "placement"], taxonomy: ["category", "tagText"], area: ["area"], species: ["common", "latin"], moisture: ["moisture"] };
    if (i) for (const R of he[i]) delete _[R];
    if (this._beginEdit(t), this._edit(_), this._areaReview = a, o && n && l) {
      const R = G(t, o);
      if (R) {
        const k = mt(R), H = structuredClone(k);
        for (const C of ["sources", "primary_entity_id", "aggregation", "stale_after_seconds"])
          JSON.stringify(n[C]) !== JSON.stringify(l[C]) && Object.assign(H, { [C]: structuredClone(n[C]) });
        this._sourceRole = o, this._sourceBaseline = k, this._sourceEdits = H;
      }
    }
    if (d && h && m) {
      const R = Se[d];
      if (R) {
        const k = R.seed(this._persistedRoleOverrides(R, t)), H = { ...k };
        for (const C of R.keys) h[C] !== m[C] && (H[C] = h[C]);
        this._thresholdRole = d, this._thresholdBaseline = k, this._thresholdEdits = H;
      }
    }
  }
  async _searchSpecies() {
    if (!this.hass || this._formBusy || this._blocked || this._query.trim().length < 3) return;
    const e = this._context, t = ++this._providerRequest;
    this._formBusy = !0, this._error = "", this._preview = null;
    try {
      const i = await y.searchSpecies(this.hass, this._provider, this._query.trim(), this.hass.language ?? "en");
      t === this._providerRequest && (this._results = i, i.length || (this._notice = "No species matches. Try another search or manual entry."));
    } catch (i) {
      t === this._providerRequest && (this._error = this._friendly(i));
    } finally {
      e === this._context && (this._formBusy = !1);
    }
  }
  async _previewSpecies(e) {
    if (!this.hass || !this._base || this._formBusy || this._blocked || this._conflict) return;
    const t = this._context, i = this.shadowRoot?.activeElement, r = ++this._providerRequest, a = this._base;
    this._formBusy = !0, this._error = "", this._preview = null;
    try {
      const o = e ? await y.previewSpecies(this.hass, e.provider, e.provider_ref, this.hass.language ?? "en", a.id) : await y.previewSpeciesRefresh(this.hass, a.id, this.hass.language ?? "en");
      if (!e && (o.provider !== a.species?.provider || o.snapshot.provider_ref !== a.species?.snapshot.provider_ref)) throw new E("invalid_response", "Species refresh returned a different species.");
      r === this._providerRequest && this._base?.revision === a.revision && (this._preview = o, this._openDialog("species", i));
    } catch (o) {
      r === this._providerRequest && (this._error = this._friendly(o));
    } finally {
      t === this._context && (this._formBusy = !1);
    }
  }
  _openDialog(e, t = this.shadowRoot?.activeElement) {
    this._focusReturn = t, this._dialog = e;
    const i = this._context;
    this.updateComplete.then(() => {
      if (i !== this._context || this._dialog !== e) return;
      const r = this.shadowRoot?.querySelector("dialog");
      r && !r.open && r.showModal(), r?.querySelector(e === "species" ? "h2" : "button")?.focus();
    });
  }
  _closeDialog() {
    this.shadowRoot?.querySelector("dialog")?.close(), this._dialog = null, (this._focusReturn?.isConnected && !this._focusReturn.matches(":disabled") ? this._focusReturn : this.shadowRoot?.querySelector("h1"))?.focus(), this._focusReturn = null;
  }
  _renderDialog() {
    if (!this._dialog || !this._base) return u;
    const e = this._base, t = this._preview;
    return c`<dialog aria-labelledby="dialog-title" @cancel=${(i) => {
      i.preventDefault(), this._closeDialog();
    }} @keydown=${(i) => {
      if (i.key !== "Tab") return;
      const r = [...i.currentTarget.querySelectorAll("button:not([disabled]),a[href],input:not([disabled]),summary")], a = r[0], o = r.at(-1);
      i.shiftKey && (this.shadowRoot?.activeElement === a || this.shadowRoot?.activeElement?.matches("#dialog-title")) ? (i.preventDefault(), o?.focus()) : !i.shiftKey && this.shadowRoot?.activeElement === o && (i.preventDefault(), a?.focus());
    }}><h2 id="dialog-title" tabindex="-1">${this._dialog === "delete" ? `Delete ${e.name}?` : "Review species changes"}</h2>
      ${this._dialog === "delete" ? c`<p>This permanently removes the plant, its device, entities, and local photo. This cannot be undone.</p>` : t ? Ae(t.snapshot, t) : c`<p>The preview is no longer valid. Close and request a new preview.</p>`}
      <div class="actions"><button @click=${() => this._closeDialog()}>Cancel</button><button class="primary" ?disabled=${this._formBusy || this._blocked || !!this._conflict || this._dialog === "species" && !t} @click=${() => {
      const i = this._dialog;
      if (this._closeDialog(), !this.hass) return;
      const r = this.hass;
      i === "delete" ? this._mutate(() => y.delete(r, e.id, e.revision), !0) : t && this._mutate(() => y.applySpecies(r, e.id, e.revision, t.preview_token, t.provider, t.operation), !1, "species");
    }}>${this._dialog === "delete" ? "Permanently delete plant" : "Accept and apply reviewed species"}</button></div></dialog>`;
  }
  async _uploadImage(e, t) {
    if (!this.hass || this._formBusy || this._blocked) return;
    const i = this._context;
    this._formBusy = !0;
    try {
      await Ce(t);
    } catch (a) {
      i === this._context && (this._error = a.message);
      return;
    } finally {
      i === this._context && (this._formBusy = !1);
    }
    if (i !== this._context || !this.isConnected || this._view.kind !== "detail" || this._view.plantId !== e.id || this._base?.revision !== e.revision) return;
    const r = this.hass;
    await this._mutate(() => y.uploadImage(r, e.id, e.revision, t));
  }
  _renderImage(e) {
    return c`<section><h2>Plant photo</h2>${e.image ? this._imageLoading ? c`<p role="status">Loading photo…</p>` : this._imageError ? c`<p class="error" role="alert">Photo could not be loaded: ${this._imageError}</p><button @click=${() => {
      this._clearImage(), this._syncImage();
    }}>Retry photo</button>` : this._imageUrl ? c`<img class="preview" alt="Photo of ${e.name}" src=${this._imageUrl} @error=${() => {
      this._imageError = "The stored photo could not be decoded. Retry or replace it with a valid image.";
    }}>` : u : c`<p>No photo yet.</p>`}
      ${e.image ? c`<p>Stored locally: ${e.image.content_type} · ${e.image.width} × ${e.image.height} pixels</p>` : u}
      <label>${e.image ? "Replace photo" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" ?disabled=${this._formBusy || this._blocked || !!this._conflict} @change=${(t) => {
      const i = t.target, r = i.files?.[0];
      i.value = "", r && this._uploadImage(e, r);
    }}></label><small>JPEG, PNG or WebP · max 5 MiB · max 2048 × 2048. Images are authenticated and stored locally.</small>
      ${e.image ? c`<button ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => {
      if (this.hass) {
        const t = this.hass;
        this._mutate(() => y.deleteImage(t, e.id, e.revision));
      }
    }}>Remove photo</button>` : u}</section>`;
  }
  _saveButton(e, t) {
    return c`<button class="primary" @click=${() => void this._save(e)}>${t}</button>`;
  }
  // Small localize shim: reads `hass.localize` when the frontend supplies it
  // and falls back to the exact inline English otherwise. Fallbacks are
  // bit-identical to the previously inline copy so behaviour is unchanged
  // when localize is not provided.
  _t(e, t, i) {
    return Be(this.hass?.localize)(`component.smart_plants.${e}`, t, i);
  }
  _renderOverallHealth(e) {
    const t = this._health[e.id], i = this.hass?.localize, r = this._t("panel.section.overall_health", "Overall health"), a = this._t("panel.section.overall_health_unavailable", "Overall health is unavailable."), o = this._t("panel.section.overall_health_unavailable_detail", "Overall health is unavailable — no configured role is currently reporting a valid value."), n = this._t("panel.section.overall_health_confidence", "Confidence"), l = this._t("panel.section.overall_health_included_roles", "Included roles"), d = this._t("panel.section.overall_health_none_contributing", "No roles are currently contributing to the composite."), h = this._t("panel.section.overall_health_configured_unavailable", "Configured but unavailable"), m = this._t("panel.section.overall_health_all_included", "None — every configured role is currently included.");
    return c`<section aria-labelledby="overall-health-heading"><h2 id="overall-health-heading">${r}</h2>
      ${t ? c`
        <p role="status" aria-live="polite">${t.available && t.health_score !== null ? this._t("panel.section.overall_health_available_summary", "{score} out of 100", { score: t.health_score }) : o}</p>
        <dl class="overall-health">
          <dt>${n}</dt><dd>${t.confidence_label} — ${gi(t.confidence_label, i)}</dd>
          <dt>${l}</dt><dd>${t.contributors.length ? c`<ul class="contributors">${t.contributors.map((_) => c`<li>${st(_, i)}</li>`)}</ul>` : d}</dd>
          <dt>${h}</dt><dd>${(() => {
      const _ = t.configured.filter((x) => !t.contributors.includes(x));
      return _.length ? c`<ul class="configured-unavailable">${_.map((x) => c`<li>${st(x, i)}</li>`)}</ul>` : m;
    })()}</dd>
        </dl>
      ` : c`<p role="status">${this._healthError ? `${a} ${this._healthError}` : a}</p>`}
    </section>`;
  }
  _renderDiagnostics(e) {
    const t = ls(e, this._entities, this._states), i = t.filter((_) => _.status === "on").length, r = (_) => _ === "on" ? this._t("panel.section.advanced_diagnostics_status_problem", "problem detected") : _ === "off" ? this._t("panel.section.advanced_diagnostics_status_ok", "no problem") : _ === "unavailable" ? this._t("panel.section.advanced_diagnostics_status_unavailable", "unavailable") : this._t("panel.section.advanced_diagnostics_status_not_configured", "not configured"), a = this._pendingThresholdSwitch, o = this._thresholdRole ? Se[this._thresholdRole] : null, n = o ? o.problemRole.replaceAll("_", " ") : "", l = a ? a.spec.problemRole.replaceAll("_", " ") : "", d = this._t("panel.section.advanced_diagnostics", "Advanced diagnostics"), h = this._t("panel.section.advanced_diagnostics_description", "Status of the problem indicators for this plant. Threshold editing is available for every role: temperature, humidity, conductivity, CO2, soil temperature stress, low battery, and low light."), m = i === 0 ? this._t("panel.section.advanced_diagnostics_zero_active", "No active problems.") : i === 1 ? this._t("panel.section.advanced_diagnostics_one_active", "1 active problem.") : this._t("panel.section.advanced_diagnostics_many_active", "{count} active problems.", { count: i });
    return c`<section aria-labelledby="diagnostics-heading"><h2 id="diagnostics-heading">${d}</h2>
      <p role="status" aria-live="polite">${m}</p>
      <p>${h}</p>
      ${a ? c`<p class="notice threshold-switch-alert" role="alert">${this._t("panel.section.advanced_diagnostics_switch_prompt", "Unsaved changes in the {current} editor. Discard them and switch to the {pending} editor?", { current: n, pending: l })}
        <button type="button" class="primary" @click=${() => this._confirmDiscardAndSwitch()}>${this._t("panel.section.advanced_diagnostics_switch_discard", "Discard and switch")}</button>
        <button type="button" @click=${() => {
      this._pendingThresholdSwitch = null;
    }}>${this._t("panel.section.advanced_diagnostics_switch_keep", "Keep editing")}</button>
      </p>` : u}
      <dl class="diagnostics">${t.map((_) => {
      const x = _.status === "not_configured" ? [] : os(e, _.role, this._entities, this._states), O = Se[_.role], he = !!O && _.status !== "not_configured", R = he && this._thresholdRole === _.role && this._thresholdEdits !== null, k = O ? this._thresholdSaved[_.role] : "", H = this._t("panel.section.advanced_diagnostics_status_problem", "problem detected");
      return c`<dt>${_.label}</dt><dd class=${"status-" + _.status} aria-label=${_.status === "on" ? `${_.label}: ${H}` : `${_.label}: ${r(_.status)}`}>${r(_.status)}${_.reason ? c` — ${_.reason}` : u}${x.length ? c`<ul class="thresholds" aria-label=${`${_.label} effective thresholds`}>${x.map((C) => c`<li><span class="threshold-label">${C.label}</span>: <span class="threshold-value">${C.value === null ? "—" : `${C.value} ${C.unit}`}</span></li>`)}</ul>` : u}${he && O ? c`<button class="threshold-toggle" type="button" aria-expanded=${R ? "true" : "false"} aria-controls=${`${_.role}-editor`} ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._toggleThresholdEdit(O, e)}>${R ? this._t("panel.section.advanced_diagnostics_cancel_edit", "Cancel") : this._t("panel.section.advanced_diagnostics_edit_thresholds", "Edit thresholds")}</button>${R ? this._renderThresholdEditor(O, e) : u}${k && !R ? c`<p class="notice" role="status">${k}</p>` : u}` : u}</dd>`;
    })}</dl></section>`;
  }
  _persistedRoleOverrides(e, t) {
    const i = t.roles?.[e.configRole];
    if (!i || typeof i != "object") return null;
    const r = i.stress_threshold_overrides;
    if (!r || typeof r != "object") return null;
    const a = {};
    for (const o of e.keys) {
      const n = r[o];
      a[o] = n === null || typeof n == "number" ? n : null;
    }
    return a;
  }
  _toggleThresholdEdit(e, t) {
    if (this._thresholdRole === e.problemRole && this._thresholdEdits !== null) {
      this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._thresholdError = "", this._pendingThresholdSwitch = null;
      return;
    }
    if (this._thresholdRole && this._thresholdRole !== e.problemRole && this._hasUnsavedThresholdChanges()) {
      this._pendingThresholdSwitch = { spec: e, plant: t };
      return;
    }
    this._openThresholdEditor(e, t);
  }
  _openThresholdEditor(e, t) {
    const i = e.seed(this._persistedRoleOverrides(e, t));
    this._thresholdRole = e.problemRole, this._thresholdEdits = i, this._thresholdBaseline = { ...i }, this._thresholdError = "", this._pendingThresholdSwitch = null, this._thresholdSaved = { ...this._thresholdSaved, [e.problemRole]: "" };
  }
  _hasUnsavedThresholdChanges() {
    if (!this._thresholdEdits || !this._thresholdBaseline) return !1;
    for (const e of Object.keys(this._thresholdEdits))
      if ((this._thresholdEdits[e] ?? "") !== (this._thresholdBaseline[e] ?? "")) return !0;
    return !1;
  }
  _confirmDiscardAndSwitch() {
    const e = this._pendingThresholdSwitch;
    e && this._openThresholdEditor(e.spec, e.plant);
  }
  _editThreshold(e) {
    this._thresholdEdits && (this._thresholdEdits = { ...this._thresholdEdits, ...e });
  }
  _renderThresholdEditor(e, t) {
    const i = this._thresholdEdits;
    if (!i) return u;
    const r = (a) => c`<label>${e.labels[a]}<input type="number" step=${e.step} min=${e.min} max=${e.max} inputmode="decimal" .value=${i[a]} @input=${(o) => this._editThreshold({ [a]: o.target.value })}></label><small>Default ${e.defaults[a]} ${e.unit} · effective ${i[a].trim() === "" ? e.defaults[a] : i[a]} ${e.unit}</small><button type="button" @click=${() => this._editThreshold({ [a]: "" })}>Inherit</button>`;
    return c`<div id=${`${e.problemRole}-editor`} class="threshold-editor" role="group" aria-label=${`${e.problemRole.replaceAll("_", " ")} thresholds`}>
      <p>${e.formIntro}</p>
      <fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
        <div class="grid">${e.keys.map((a) => c`<div>${r(a)}</div>`)}</div>
        ${this._thresholdError ? c`<p class="error" role="alert">${this._thresholdError}</p>` : u}
        <div class="actions">
          <button type="button" @click=${() => this._editThreshold(Object.fromEntries(e.keys.map((a) => [a, ""])))}>Inherit all built-in defaults</button>
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
    const { values: i, error: r } = e.validate(this._thresholdEdits);
    if (r) {
      this._thresholdError = r;
      return;
    }
    this._thresholdError = "";
    const a = this.hass;
    await this._mutate(() => y.setThresholdOverrides(a, t.id, t.revision, e.configRole, i)), this._error || (this._thresholdRole = null, this._thresholdEdits = null, this._thresholdBaseline = null, this._pendingThresholdSwitch = null, this._thresholdSaved = { ...this._thresholdSaved, [e.problemRole]: e.successNotice });
  }
  // ---- Sensors section: generic per-role source assignment ----
  _sourceSummary(e, t) {
    const i = G(e, t);
    return i ? i.sources.length ? `${i.sources.length} source${i.sources.length === 1 ? "" : "s"} · ${i.aggregation}${i.primary_entity_id ? ` · primary ${i.primary_entity_id}` : ""}` : "no sources — this role has no computed entity yet" : "role data unavailable";
  }
  _toggleSourceEdit(e, t) {
    if (this._sourceRole === e && this._sourceEdits !== null) {
      this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._pendingSourceSwitch = null;
      return;
    }
    if (this._sourceRole && this._sourceRole !== e && this._hasUnsavedSourceChanges()) {
      this._pendingSourceSwitch = { role: e, plant: t };
      return;
    }
    this._openSourceEditor(e, t);
  }
  _openSourceEditor(e, t) {
    const i = G(t, e);
    if (!i) {
      this._sourceError = "Role source data is missing or incompatible. Refresh or upgrade before editing; defaults will not be guessed.";
      return;
    }
    const r = mt(i);
    this._sourceRole = e, this._sourceEdits = r, this._sourceBaseline = structuredClone(r), this._sourceError = "", this._pendingSourceSwitch = null, this._allSourceSensors = !1, this._sourceSaved = { ...this._sourceSaved, [e]: "" };
  }
  _hasUnsavedSourceChanges() {
    return !this._sourceEdits || !this._sourceBaseline ? !1 : JSON.stringify(this._sourceEdits) !== JSON.stringify(this._sourceBaseline);
  }
  _confirmSourceSwitch() {
    const e = this._pendingSourceSwitch;
    e && this._openSourceEditor(e.role, e.plant);
  }
  _editSource(e) {
    this._sourceEdits && (this._sourceEdits = { ...this._sourceEdits, ...e });
  }
  _renderSensors(e) {
    const t = this._pendingSourceSwitch;
    return c`<section aria-labelledby="sensors-heading"><h2 id="sensors-heading">Sensors</h2>
      <p>Assign Home Assistant sensors to each role. A role's computed sensor and problem binary appear once it has had at least one source. The entity picker is filtered by device class and unit; other sensors are available under "Show all sensors".</p>
      ${t ? c`<div class="notice" role="alert"><p>You have unsaved changes in the ${we(this._sourceRole ?? "")?.label ?? this._sourceRole} sources editor. Switch editors and discard them?</p>
        <button type="button" class="primary" @click=${() => this._confirmSourceSwitch()}>Discard and switch</button>
        <button type="button" @click=${() => {
      this._pendingSourceSwitch = null;
    }}>Keep editing</button></div>` : u}
      <dl class="sensors">${Re.map((i) => {
      const r = this._sourceRole === i.role && this._sourceEdits !== null, a = this._sourceSaved[i.role];
      return c`<dt>${i.label}</dt><dd>${this._sourceSummary(e, i.role)}
          <button class="source-toggle" type="button" aria-expanded=${r ? "true" : "false"} aria-controls=${`${i.role}-sources-editor`} ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._toggleSourceEdit(i.role, e)}>${r ? "Cancel" : "Edit sources"}</button>
          ${r ? this._renderSourceEditor(i.role, e) : u}
          ${a && !r ? c`<p class="notice" role="status">${a}</p>` : u}</dd>`;
    })}</dl></section>`;
  }
  _renderSourceEditor(e, t) {
    const i = we(e), r = this._sourceEdits;
    return !i || !r ? u : c`<div id=${`${e}-sources-editor`} class="editor"><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
      ${_s(i, r, this._entities, this._states, this._allSourceSensors, (a) => this._allSourceSensors = a, (a) => this._editSource(a))}
      ${this._sourceError ? c`<p class="error" role="alert">${this._sourceError}</p>` : u}
      <div class="actions">
        <button type="button" @click=${() => {
      this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._sourceError = "", this._pendingSourceSwitch = null;
    }}>Cancel</button>
        <button type="button" class="primary" @click=${() => void this._saveRoleSources(e, t)}>Save ${i.label.toLowerCase()} sources</button>
      </div></fieldset></div>`;
  }
  async _saveRoleSources(e, t) {
    if (!this.hass || !this._sourceEdits || this._formBusy || this._blocked || this._conflict) return;
    if (this._registryError) {
      this._sourceError = "Reconnect to load current registry data before saving sources.";
      return;
    }
    const i = hs(this._sourceEdits);
    if (i) {
      this._sourceError = i;
      return;
    }
    this._sourceError = "";
    const r = this.hass, a = us(this._sourceEdits, this._entities), o = G(t, e);
    await this._mutate(async () => {
      let n = t.revision, l = t;
      return (!o || JSON.stringify(o.sources) !== JSON.stringify(a.sources)) && (l = await y.setRoleSources(r, t.id, n, e, a.sources), n = l.revision), (!o || o.primary_entity_id !== a.primary_entity_id) && (l = await y.setRolePrimary(r, t.id, n, e, a.primary_entity_id), n = l.revision), (!o || o.aggregation !== a.aggregation) && (l = await y.setRoleAggregation(r, t.id, n, e, a.aggregation), n = l.revision), (!o || o.stale_after_seconds !== a.stale_after_seconds) && (l = await y.setRoleStaleAfter(r, t.id, n, e, a.stale_after_seconds), n = l.revision), l;
    }), this._error || (this._sourceRole = null, this._sourceEdits = null, this._sourceBaseline = null, this._pendingSourceSwitch = null, this._sourceSaved = { ...this._sourceSaved, [e]: `${we(e)?.label ?? e} sources saved.` });
  }
  _renderPlantOverview(e, t) {
    const i = M(e), r = i?.sources.map((n) => N(n, this._entities)?.entity_id ?? n.entity_id) ?? [], a = Re.flatMap((n) => {
      if (n.role === "moisture") return [];
      const l = G(e, n.role);
      return l?.sources.length ? [{ label: n.label, count: l.sources.length }] : [];
    }), o = this._careHistory?.events.slice(0, 3) ?? [];
    return c`<section class="plant-overview-card"><div class="overview-heading">${this._imageUrl ? c`<img class="overview-avatar" src=${this._imageUrl} alt=${`Photo of ${e.name}`}>` : c`<div class="overview-avatar placeholder" aria-hidden="true">${e.name.slice(0, 1).toLocaleUpperCase()}</div>`}<div><p class="eyebrow">PLANT OVERVIEW</p><p>${e.species?.snapshot.common_name ?? e.species?.snapshot.latin_name ?? "No species selected"}</p>${e.category ? c`<span class="muted">${e.category}</span>` : u}<button type="button" @click=${() => this._detailSection = "details"}>Plant details and photo</button></div></div>
      <div class="overview-metrics"><article><span>Soil moisture</span><strong>${t?.computed_percent ?? "—"}${t?.computed_percent === null || t?.computed_percent === void 0 ? "" : "%"}</strong><small>${t?.computed_available ? "Current reading" : "No current reading"}</small></article><article><span>Moisture health</span><strong>${t?.health_score ?? "—"}${t?.health_score === null || t?.health_score === void 0 ? "" : "/100"}</strong><small>Based on moisture readings</small></article><article><span>Moisture sensors</span><strong>${r.length}</strong><small>${i?.aggregation ?? "Not configured"} aggregation</small></article></div>
       <section class="overview-sensors"><h2>Assigned sensors</h2>${r.length || a.length ? c`<ul>${r.map((n) => c`<li>Soil moisture · ${n}${n === i?.primary_entity_id ? c` <span class="muted">Primary</span>` : u}</li>`)}${a.map((n) => c`<li>${n.label} · ${n.count} source${n.count === 1 ? "" : "s"}</li>`)}</ul>` : c`<p>No sensors assigned. You can still use the plant profile and log care.</p>`}<button type="button" @click=${() => this._detailSection = "sensors"}>Manage sensors</button></section>
       <section class="overview-care"><h2>Recent care</h2>${o.length ? c`<ul>${o.map((n) => c`<li><strong>${n.kind}</strong> · ${n.local_date}</li>`)}</ul>` : c`<p>No care events recorded yet.</p>`}<button type="button" @click=${() => this._detailSection = "care"}>Open care history</button></section>
      ${this._health?.[e.id] ? c`<p class="muted">Overall health confidence: ${this._health[e.id]?.confidence_label ?? "unknown"}</p>` : u}
    </section>`;
  }
  _renderDetail(e) {
    const t = this._plantById(e), i = this._edits;
    if (!t || !i) return c`<p>Plant not found — it may have been deleted in another session.</p>`;
    const r = this._evaluations[e], a = M(t), o = K(t, this._devices);
    return c`${this._conflict ? c`<section class="notice" role="alert"><h2>Review changes from another session</h2><p>Revision ${this._conflict.before.revision} → ${this._conflict.after.revision}. Saving is paused. Local edits are retained.</p><ul>${this._conflict.changes.map((n) => c`<li class="prose">${n}</li>`)}</ul>${this._sourceConflictFields(this._conflict.after).length ? c`<p>Both sessions changed these source fields: ${this._sourceConflictFields(this._conflict.after).join(", ")}. Review the refreshed role summary and your draft before retrying; Save will replace the refreshed values for these fields.</p>` : u}<button @click=${() => this._reviewConflict()}>I reviewed changes; retain my edits for reapply</button><button @click=${() => this._beginEdit(t)}>Discard my edits and use refreshed values</button></section>` : u}
       <header class="detail-heading"><div><h2>${t.name}</h2><p>${this._status(t)}</p></div>${o ? c`<a href="/config/devices/device/${encodeURIComponent(o.id)}">Open Home Assistant device</a>` : u}</header>
      <nav class="detail-tabs" aria-label="Plant sections">${[["overview", "Overview"], ["sensors", "Sensors"], ["care", "Care history"], ["details", "Plant details"], ["diagnostics", "Diagnostics"]].map(([n, l]) => c`<button type="button" aria-current=${this._detailSection === n ? "page" : u} @click=${() => this._detailSection = n}>${l}</button>`)}</nav>
        ${this._detailSection === "overview" ? this._renderPlantOverview(t, r) : u}
       ${this._detailSection === "details" ? c`<section><h2>Identity and placement</h2>${this._renderImage(t)}<fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>${A("Name", i.name, (n) => this._edit({ name: n }))}${A("Acquired (ISO date/time, optional)", i.acquired, (n) => this._edit({ acquired: n }))}${Pt(i.placement, (n) => this._edit({ placement: n }))}${this._saveButton("identity", "Save identity")}</fieldset></section>
       <section><h2>Home Assistant area</h2><p>Current: ${this._areaName(o?.area_id ?? "")}. Area belongs to the native device registry.</p>${this._areaReview ? c`<p class="notice">The native area changed. Review current and selected areas before reapplying.</p><button @click=${() => this._areaReview = !1}>I reviewed the native area change</button><button @click=${() => {
      this._edit({ area: this._baseArea }), this._areaReview = !1;
    }}>Use current native area</button>` : u}<fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict || !!this._registryError || this._areaReview}>${It(i.area, this._areas, (n) => this._edit({ area: n }))}${this._saveButton("area", "Save area")}</fieldset></section>
       <section><h2>Taxonomy</h2><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>${A("Category", i.category, (n) => this._edit({ category: n }), "text", 60)}${A("Tags (comma-separated)", i.tagText, (n) => this._edit({ tagText: n }), "text", 2e3)}<p>Smart Plants taxonomy is separate from Home Assistant labels.</p>${this._saveButton("taxonomy", "Save taxonomy")}</fieldset></section>
       <section><h2>Species</h2>${t.species ? Ae(t.species.snapshot) : c`<p>No species assigned.</p>`}<fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
      ${t.species?.snapshot.provider_ref ? c`<button @click=${() => void this._previewSpecies()}>Preview species refresh</button>` : u}
      ${T("Species provider", this._provider, [{ value: "manual", label: "Manual species" }, ...this._capabilities?.providers.filter((n) => n.available && n.search_supported).map((n) => ({ value: n.provider, label: n.provider })) ?? []], (n) => {
      this._providerRequest++, this._provider = n, this._preview = null, this._results = [];
    })}
       ${this._provider === "manual" ? c`${A("Common name", i.common, (n) => this._edit({ common: n }))}${A("Scientific name", i.latin, (n) => this._edit({ latin: n }))}<p>Save replaces the species with user-supplied data. Leave both names blank to clear species.</p>${this._saveButton("species", "Save manual species")}` : c`${A("Search species", this._query, (n) => {
      this._query = n, this._providerRequest++, this._results = [], this._preview = null;
    })}<button @click=${() => void this._searchSpecies()}>Search species</button><ul>${this._results.map((n) => c`<li><button @click=${() => void this._previewSpecies(n)}>${n.common_name ?? n.latin_name} · ${n.latin_name}</button><small>${n.attribution}</small></li>`)}</ul><button @click=${() => {
      this._provider = "manual", this._providerRequest++, this._preview = null;
    }}>Continue manually</button>`}</fieldset></section>
       ` : u}
       ${this._detailSection === "details" ? c`
       <section><h2>Lifecycle</h2><p>Disabling stops plant evaluation and makes its entities unavailable. User-authored automations remain independent.</p><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}><div class="actions"><button @click=${() => {
      if (this.hass) {
        const n = this.hass;
        this._mutate(() => t.lifecycle_state === "active" ? y.disable(n, t.id, t.revision) : y.reenable(n, t.id, t.revision));
      }
    }}>${t.lifecycle_state === "active" ? "Disable" : "Re-enable"}</button><button @click=${() => this._openDialog("delete")}>Delete plant</button></div></fieldset></section>` : u}
       ${this._detailSection === "sensors" ? c`<section><h2>Moisture configuration</h2>${a && i.moisture ? c`<p class="default-summary">Effective thresholds: ${q.map((n) => `${n} ${a.threshold_overrides[n] ?? this._defaults(t)[n]}%`).join(" · ")}</p><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>${ge(i.moisture, this._defaults(t), this._entities, this._states, this._allSensors, (n) => this._allSensors = n, (n) => this._edit({ moisture: n }), "sources")}<details class="advanced-disclosure"><summary>Advanced threshold overrides</summary><p>Blank values inherit the effective default shown above.</p>${ge(i.moisture, this._defaults(t), this._entities, this._states, this._allSensors, (n) => this._allSensors = n, (n) => this._edit({ moisture: n }), "thresholds")}</details>${this._saveButton("moisture", "Save complete moisture configuration")}</fieldset>` : c`<p class="error" role="alert">Moisture role data is missing or incompatible. Refresh or upgrade before editing; defaults will not be guessed.</p>`}</section>${this._renderSensors(t)}` : u}
       ${this._detailSection === "care" ? this._renderCare(t) : u}
       ${this._detailSection === "diagnostics" ? c`<section><h2>Native automations</h2><p>Use the plant's needs-water entity for notifications or reminders in Home Assistant. Dynamic/template references may not appear in related results.</p><a href="/config/automation/dashboard">Open automation editor</a><ul>${this._related.map((n) => c`<li>${n}</li>`)}</ul></section>${this._renderOverallHealth(t)}${this._renderDiagnostics(t)}` : u}
       ${this._renderDialog()}`;
  }
  async _created(e) {
    const { plant: t, photo: i, navigationContext: r } = e.detail, a = this.hass, o = this._view.kind === "create" && r === this._context, n = i && t.revision === 1 && t.image === null;
    this._wizardStarted = !1;
    const l = this._plantById(t.id);
    (!l || l.revision <= t.revision) && (this._plants = [...this._plants.filter((h) => h.id !== t.id), t]), this._createdPlantId = t.id, this._creationNotice = `${t.name} created.${n ? " Uploading its selected photo…" : i ? " The plant changed after creation. The original wizard photo was not uploaded. Review its current photo in the plant detail and explicitly upload a photo if wanted." : ""}`, o && this._show({ kind: "detail", plantId: t.id });
    const d = this._context;
    if (this._refresh(!1), !(!n || !a)) {
      try {
        if (await Ce(i), !this.isConnected || this.hass?.connection !== a.connection || this._blocked) return;
        const h = await y.uploadImage(a, t.id, t.revision, i);
        if (!this.isConnected || this.hass?.connection !== a.connection) return;
        d === this._context && this._base?.id === t.id && this._base.revision === t.revision && !this._formBusy && !this._conflict && this._rebaseEdits(this._base, h), this._createdPlantId === t.id && (this._creationNotice = `${t.name} created. Selected photo uploaded.`);
      } catch (h) {
        if (!this.isConnected || this.hass?.connection !== a.connection) return;
        this._createdPlantId === t.id && (this._creationNotice = `${t.name} created. Selected photo was not uploaded. Open the created plant to upload it again. ${this._friendly(h)}`);
      } finally {
        this._createdPlantId === t.id && this._creationNotice.endsWith("Uploading its selected photo…") && (this._creationNotice = `${t.name} created. Photo upload interrupted. Open the created plant to check its photo before retrying.`);
      }
      await this._refresh(!1);
    }
  }
  render() {
    if (this.hass?.user?.is_admin === !1) return c`<main><div class="panel-content"><p role="alert">Smart Plants requires an admin account.</p></div></main>`;
    const e = this.hass?.localize?.("ui.common.menu") || "Menu";
    return c`<main><ha-top-app-bar-fixed class="panel-appbar" .narrow=${this.narrow}>
       <h1 slot="title" class="page-title" tabindex="-1">Smart Plants</h1>
       <ha-dropdown slot="actionItems" @wa-select=${this._handleMenuAction}>
         <ha-icon-button slot="trigger" .label=${e} .path=${ys}></ha-icon-button>
         ${this._view.kind !== "list" ? c`<ha-dropdown-item value="back-to-overview" ?disabled=${this._formBusy}>Back to overview</ha-dropdown-item>` : u}
         <ha-dropdown-item value="add-plant" ?disabled=${this._blocked}>Add plant<ha-svg-icon slot="icon" .path=${bs}></ha-svg-icon></ha-dropdown-item>
       </ha-dropdown>
       <div class="panel-content">${this._error ? c`<p class="error" role="alert">${this._error}</p>` : u}${this._notice ? c`<p class="notice" role="status">${this._notice}</p>` : u}${this._registryError ? c`<p class="notice" role="alert">Registry/state data unavailable: ${this._registryError}. Reconnect before assigning registered sensors or areas.</p>` : u}
      ${this._creationNotice ? c`<p class="notice" role="status">${this._creationNotice}</p>${this._createdPlantId && !(this._view.kind === "detail" && this._view.plantId === this._createdPlantId) ? c`<button ?disabled=${this._formBusy} @click=${() => {
      this._createdPlantId && this._show({ kind: "detail", plantId: this._createdPlantId });
    }}>Open created plant</button>` : u}` : u}
      ${this._view.kind === "list" ? this._renderList() : this._view.kind === "detail" ? this._renderDetail(this._view.plantId) : u}
      ${this._wizardStarted && this._capabilities ? c`<div ?hidden=${this._view.kind !== "create"}><smart-plants-wizard .hass=${this.hass} .capabilities=${this._capabilities} .areas=${this._areas} .entities=${this._entities} .states=${this._states} .blocked=${this._blocked} .navigationContext=${this._context} @plant-created=${(t) => void this._created(t)} @backend-unavailable=${(t) => {
      this._blocked = !0, this._error = t.detail;
    }}></smart-plants-wizard></div>` : u}
        <p role="status" aria-live="polite">${this._formBusy ? "Saving or loading preview…" : ""}</p></div></ha-top-app-bar-fixed></main>`;
  }
};
Fe.styles = Bt;
let f = Fe;
g([
  I({ attribute: !1 })
], f.prototype, "hass");
g([
  I({ attribute: !1 })
], f.prototype, "panel");
g([
  I({ type: Boolean, reflect: !0 })
], f.prototype, "narrow");
g([
  p()
], f.prototype, "_plants");
g([
  p()
], f.prototype, "_loading");
g([
  p()
], f.prototype, "_error");
g([
  p()
], f.prototype, "_notice");
g([
  p()
], f.prototype, "_view");
g([
  p()
], f.prototype, "_detailSection");
g([
  p()
], f.prototype, "_formBusy");
g([
  p()
], f.prototype, "_capabilities");
g([
  p()
], f.prototype, "_blocked");
g([
  p()
], f.prototype, "_areas");
g([
  p()
], f.prototype, "_entities");
g([
  p()
], f.prototype, "_devices");
g([
  p()
], f.prototype, "_states");
g([
  p()
], f.prototype, "_evaluations");
g([
  p()
], f.prototype, "_health");
g([
  p()
], f.prototype, "_healthError");
g([
  p()
], f.prototype, "_careHistory");
g([
  p()
], f.prototype, "_careError");
g([
  p()
], f.prototype, "_careDate");
g([
  p()
], f.prototype, "_careNote");
g([
  p()
], f.prototype, "_careKind");
g([
  p()
], f.prototype, "_careFields");
g([
  p()
], f.prototype, "_careEditingId");
g([
  p()
], f.prototype, "_registryError");
g([
  p()
], f.prototype, "_areaReview");
g([
  p()
], f.prototype, "_filters");
g([
  p()
], f.prototype, "_edits");
g([
  p()
], f.prototype, "_conflict");
g([
  p()
], f.prototype, "_allSensors");
g([
  p()
], f.prototype, "_preview");
g([
  p()
], f.prototype, "_provider");
g([
  p()
], f.prototype, "_query");
g([
  p()
], f.prototype, "_results");
g([
  p()
], f.prototype, "_related");
g([
  p()
], f.prototype, "_imageUrl");
g([
  p()
], f.prototype, "_imageLoading");
g([
  p()
], f.prototype, "_imageError");
g([
  p()
], f.prototype, "_dialog");
g([
  p()
], f.prototype, "_wizardStarted");
g([
  p()
], f.prototype, "_creationNotice");
g([
  p()
], f.prototype, "_createdPlantId");
g([
  p()
], f.prototype, "_thresholdRole");
g([
  p()
], f.prototype, "_thresholdEdits");
g([
  p()
], f.prototype, "_thresholdBaseline");
g([
  p()
], f.prototype, "_thresholdError");
g([
  p()
], f.prototype, "_thresholdSaved");
g([
  p()
], f.prototype, "_pendingThresholdSwitch");
g([
  p()
], f.prototype, "_sourceRole");
g([
  p()
], f.prototype, "_sourceEdits");
g([
  p()
], f.prototype, "_sourceBaseline");
g([
  p()
], f.prototype, "_sourceError");
g([
  p()
], f.prototype, "_sourceSaved");
g([
  p()
], f.prototype, "_pendingSourceSwitch");
g([
  p()
], f.prototype, "_allSourceSensors");
customElements.get("smart-plants-panel") || customElements.define("smart-plants-panel", f);
export {
  f as SmartPlantsPanel
};

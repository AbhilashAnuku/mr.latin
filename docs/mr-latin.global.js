"use strict";var MrLatin=(()=>{var X=Object.defineProperty;var Ht=Object.getOwnPropertyDescriptor;var jt=Object.getOwnPropertyNames;var Bt=Object.prototype.hasOwnProperty;var _t=(e,t)=>{for(var n in t)X(e,n,{get:t[n],enumerable:!0})},Wt=(e,t,n,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of jt(t))!Bt.call(e,i)&&i!==n&&X(e,i,{get:()=>t[i],enumerable:!(r=Ht(t,i))||r.enumerable});return e};var Gt=e=>Wt(X({},"__esModule",{value:!0}),e);var Be={};_t(Be,{default:()=>je});var Q="mr.latin:v1:",B=class e{constructor(t=!0){this.mem=new Map;this.persist=t&&Kt(),this.persist&&this.hydrate()}static keyFor(t){return`${t.to}\0${t.tone}\0${t.register}\0${t.source}`}get(t){return this.mem.get(e.keyFor(t))}set(t,n){let r=e.keyFor(t);if(this.mem.set(r,n),this.persist)try{localStorage.setItem(Q+r,n)}catch{}}hydrate(){try{for(let t=0;t<localStorage.length;t++){let n=localStorage.key(t);if(n&&n.startsWith(Q)){let r=localStorage.getItem(n);r!=null&&this.mem.set(n.slice(Q.length),r)}}}catch{}}};function Kt(){try{return typeof localStorage!="undefined"}catch{return!1}}var xt=["placeholder","title","alt","aria-label","aria-placeholder"],Jt=new Set(["button","submit","reset"]),zt="mr-latin-widget",Vt=new Set(["SCRIPT","STYLE","NOSCRIPT"]);function Yt(e){let t=e.getAttribute("role");if(t)return t;let n=e.tagName;switch(n){case"BUTTON":return"button";case"A":return"link";case"LABEL":return"label";case"H1":case"H2":case"H3":case"H4":case"H5":case"H6":return"heading";case"LI":return"list item";case"TH":return"table header";case"TD":return"table cell";case"OPTION":return"option";case"SUMMARY":return"summary";case"FIGCAPTION":return"caption";default:return n==="INPUT"||n==="TEXTAREA"||n==="SELECT"?"form field":void 0}}var yt=new Set(["H1","H2","H3","H4","H5","H6"]);function Zt(){var r,i;if(typeof document=="undefined")return;let e=(r=document.title)==null?void 0:r.trim();if(e)return e;let t=document.querySelector('meta[name="description"]');return((i=t==null?void 0:t.getAttribute("content"))==null?void 0:i.trim())||void 0}function q(e){var n;if(!e)return;let t=(n=e.textContent)==null?void 0:n.replace(/\s+/g," ").trim();if(t)return t.length>120?t.slice(0,117)+"\u2026":t}function Xt(e){var r;let t=e.closest("label");if(t&&!yt.has(e.tagName)){let i=q(t);if(i)return i}let n=e;for(;n&&n!==document.body;){let i=n.previousElementSibling;for(;i;){if(yt.has(i.tagName)||i.tagName==="LABEL"){let a=q(i);if(a)return a}let o=(r=i.querySelector)==null?void 0:r.call(i,"h1,h2,h3,h4,h5,h6");if(o){let a=q(o);if(a)return a}i=i.previousElementSibling}n=n.parentElement}}function bt(e,t){let n={},r=Xt(e);r&&(n.near=r),t&&(n.page=t);let i=Yt(e);return i&&(n.role=i),n}var tt=[],_=new WeakSet,et=new WeakSet;function wt(e){tt=e?e.slice():[],_=new WeakSet,et=new WeakSet}function Qt(e){let t=e.tagName;if(t===zt.toUpperCase()||Vt.has(t)||e.getAttribute("translate")==="no"||e.classList.contains("notranslate")||e.hasAttribute("data-mr-latin-skip"))return!0;let n=e.getAttribute("contenteditable");if(n===""||n==="true"||n==="plaintext-only")return!0;if(tt.length)for(let r of tt)try{if(e.matches(r))return!0}catch{}return!1}function D(e){var a;let t=e.nodeType===1?e:(a=e.parentElement)!=null?a:null,n=[],r;for(;t;){if(_.has(t)){r=!0;break}if(et.has(t)){r=!1;break}if(Qt(t)){_.add(t),r=!0;break}n.push(t),t=t.parentElement}let i=r!=null?r:!1,o=i?_:et;for(let c of n)o.add(c);return i}function nt(e){let t=e.nodeValue;return t!=null&&t.trim().length>0}function qt(e){var n;if(e.tagName!=="INPUT")return;let t=((n=e.getAttribute("type"))!=null?n:"text").toLowerCase();return Jt.has(t)?"value":void 0}var rt=new WeakMap,it=new WeakMap;function te(e,t){let n=rt.get(e);return n!==void 0?n:(rt.set(e,t),t)}function ee(e,t,n){let r=it.get(e);r||(r=new Map,it.set(e,r));let i=r.get(t);return i!==void 0?i:(r.set(t,n),n)}function Lt(){rt=new WeakMap,it=new WeakMap}function W(e){let t=new Map;if(typeof document=="undefined")return t;let n=Zt(),r=s=>{let u=t.get(s.original);u?u.push(s):t.set(s.original,[s])},i=(s,u)=>{let m=s.getAttribute(u),p=m==null?void 0:m.trim();p&&r({node:s,kind:"attr",attr:u,original:ee(s,u,p),context:bt(s,n)})},o=s=>{for(let m of xt)i(s,m);let u=qt(s);u&&i(s,u)},a=s=>{var p;let u=((p=s.nodeValue)!=null?p:"").trim();if(!u)return;let m=s.parentElement;r({node:s,kind:"text",original:te(s,u),context:m?bt(m,n):{}})},c=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode(s){return s.nodeType===3?!nt(s)||D(s)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT:D(s)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}});e.nodeType===1&&!D(e)?o(e):e.nodeType===3&&nt(e)&&!D(e)&&a(e);let d=c.nextNode();for(;d;)d.nodeType===3?a(d):d.nodeType===1&&o(d),d=c.nextNode();return t}var at=!1,ot=new Set;function M(e){if(!e&&at)for(let t of ot)t.takeRecords();at=e}function ne(){return at}var vt=[...xt,"value"];function Tt(e,t){if(typeof MutationObserver=="undefined")return()=>{};let n=new Set,r,i=()=>{if(r=void 0,n.size===0)return;let d=Array.from(n);n.clear(),t(d)},o=()=>{r===void 0&&(r=setTimeout(i,60))},a=d=>{D(d)||(n.add(d),o())},c=new MutationObserver(d=>{if(!ne()){for(let s of d)if(s.type==="childList")s.addedNodes.forEach(u=>{(u.nodeType===1||u.nodeType===3)&&a(u)});else if(s.type==="characterData")nt(s.target)&&a(s.target);else if(s.type==="attributes"){let u=s.attributeName;u&&vt.includes(u)&&a(s.target)}}});return c.observe(e,{subtree:!0,childList:!0,characterData:!0,attributes:!0,attributeFilter:vt}),ot.add(c),()=>{r!==void 0&&(clearTimeout(r),r=void 0),n.clear(),c.disconnect(),ot.delete(c)}}var Et=50,G=class{constructor(t){this.controller=null;this.providers=t.providers,this.cache=t.cache,this.dictionary=t.dictionary,this.glossary=t.glossary,this.tone=t.tone,this.register=t.register,this.onBusy=t.onBusy}abort(){var t;(t=this.controller)==null||t.abort(),this.controller=null}async translateUnits(t,n,r,i){var m,p;if(t.size===0||n===r)return;this.abort();let o=new AbortController;this.controller=o,i&&(i.aborted?o.abort():i.addEventListener("abort",()=>o.abort(),{once:!0}));let a=o.signal,c=Array.from(t.keys()),d=new Map,s=(m=this.dictionary)==null?void 0:m[r],u=[];for(let g of c){let h=s==null?void 0:s[g];if(h!=null){d.set(g,h);continue}let b=this.cache.get({source:g,to:r,tone:this.tone,register:this.register});if(b!=null){d.set(g,b);continue}u.push(g)}if(u.length>0&&!a.aborted){let g=await this.pickProvider(n,r);if(g&&!a.aborted){this.setBusy(!0);try{await this.translateViaProvider(g,u,t,n,r,d,a)}catch(h){if(ie(h))return}finally{this.setBusy(!1)}}}if(!a.aborted){M(!0);try{for(let[g,h]of t){let b=(p=d.get(g))!=null?p:g;for(let P of h)re(P,b)}}finally{M(!1)}this.controller===o&&(this.controller=null)}}async pickProvider(t,n){for(let r of this.providers)try{if(await r.isAvailable(t,n))return r}catch{}}async translateViaProvider(t,n,r,i,o,a,c){for(let d=0;d<n.length;d+=Et){if(c.aborted)return;let s=n.slice(d,d+Et),u=s.map(p=>{var g,h;return(h=(g=r.get(p))==null?void 0:g[0])==null?void 0:h.context}),m=await t.translate({texts:s,from:i,to:o,tone:this.tone,register:this.register,contexts:u,glossary:this.glossary,signal:c});for(let p=0;p<s.length;p++){let g=s[p],h=m[p];h!=null&&h!==""&&(a.set(g,h),this.cache.set({source:g,to:o,tone:this.tone,register:this.register},h))}}}setBusy(t){var n;try{(n=this.onBusy)==null||n.call(this,t)}catch{}}};function re(e,t){var o,a,c,d,s;if(e.kind==="attr"&&e.attr){let u=e.node;(u.getAttribute(e.attr)!=null||e.attr==="value")&&u.setAttribute(e.attr,t);return}let n=(o=e.node.nodeValue)!=null?o:"",r=(c=(a=/^\s*/.exec(n))==null?void 0:a[0])!=null?c:"",i=(s=(d=/\s*$/.exec(n))==null?void 0:d[0])!=null?s:"";e.node.textContent=r+t+i}function ie(e){return e instanceof DOMException&&e.name==="AbortError"||typeof e=="object"&&e!==null&&e.name==="AbortError"}var ae=new Set(["ar","he","fa","ur","ps","sd","ug","yi","dv","ckb","arc"]);function oe(e){var n;let t=(n=e.toLowerCase().split(/[-_]/)[0])!=null?n:e.toLowerCase();return ae.has(t)}function K(e,t=document.documentElement){t.setAttribute("lang",e),t.setAttribute("dir",oe(e)?"rtl":"ltr")}function se(e){return e&&e[0].toUpperCase()+e.slice(1)}function w(e){var t;try{let n=new Intl.DisplayNames([e],{type:"language"});return se((t=n.of(e))!=null?t:e)}catch{return e}}var le="0 0 60 40";function x(e){return`<rect width="60" height="40" fill="${e}"/>`}function k(e){let t=40/e.length;return e.map((n,r)=>`<rect x="0" y="${A(r*t)}" width="60" height="${A(t)}" fill="${n}"/>`).join("")}function At(e){let t=60/e.length;return e.map((n,r)=>`<rect x="${A(r*t)}" y="0" width="${A(t)}" height="40" fill="${n}"/>`).join("")}function ce(e,t,n){let a=[x(e)];return n&&a.push(`<rect x="20" y="0" width="12" height="40" fill="${n}"/>`,`<rect x="0" y="14" width="60" height="12" fill="${n}"/>`),a.push(`<rect x="22" y="0" width="8" height="40" fill="${t}"/>`,`<rect x="0" y="16" width="60" height="8" fill="${t}"/>`),a.join("")}function S(e,t,n,r){let i=[];for(let o=0;o<5;o++){let a=Math.PI/180*(o*72-90),c=Math.PI/180*(o*72-90+36);i.push(`${A(e+n*Math.cos(a))},${A(t+n*Math.sin(a))}`),i.push(`${A(e+n*.4*Math.cos(c))},${A(t+n*.4*Math.sin(c))}`)}return`<polygon points="${i.join(" ")}" fill="${r}"/>`}function A(e){return Math.round(e*100)/100}function de(e){let t=e.slice(0,2).toUpperCase()||"?";return['<rect width="60" height="40" fill="var(--ml-accent, #2563eb)"/>','<rect x="1" y="1" width="58" height="38" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/>',`<text x="30" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#ffffff">${Ct(t)}</text>`].join("")}function Ct(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}var J={DE:()=>k(["#000000","#dd0000","#ffce00"]),GB:()=>[x("#012169"),'<path d="M0 0 L60 40 M60 0 L0 40" stroke="#ffffff" stroke-width="8"/>','<path d="M0 0 L60 40 M60 0 L0 40" stroke="#c8102e" stroke-width="3"/>','<rect x="25" y="0" width="10" height="40" fill="#ffffff"/>','<rect x="0" y="15" width="60" height="10" fill="#ffffff"/>','<rect x="27" y="0" width="6" height="40" fill="#c8102e"/>','<rect x="0" y="17" width="60" height="6" fill="#c8102e"/>'].join(""),US:()=>[k(["#b22234","#ffffff","#b22234","#ffffff","#b22234","#ffffff","#b22234"]),'<rect x="0" y="0" width="26" height="22" fill="#3c3b6e"/>',...ue()].join(""),ES:()=>[x("#aa151b"),'<rect x="0" y="10" width="60" height="20" fill="#f1bf00"/>'].join(""),FR:()=>At(["#0055a4","#ffffff","#ef4135"]),IT:()=>At(["#008c45","#ffffff","#cd212a"]),PT:()=>['<rect x="0" y="0" width="24" height="40" fill="#006600"/>','<rect x="24" y="0" width="36" height="40" fill="#ff0000"/>','<circle cx="24" cy="20" r="8" fill="#ffd700" stroke="#ffffff" stroke-width="1"/>','<circle cx="24" cy="20" r="4" fill="#003399"/>'].join(""),BR:()=>[x("#009b3a"),'<polygon points="30,5 55,20 30,35 5,20" fill="#ffdf00"/>','<circle cx="30" cy="20" r="8" fill="#002776"/>','<path d="M22 18 Q30 23 38 18" stroke="#ffffff" stroke-width="1.5" fill="none"/>'].join(""),NL:()=>k(["#ae1c28","#ffffff","#21468b"]),SE:()=>ce("#006aa7","#fecc00"),PL:()=>k(["#ffffff","#dc143c"]),TR:()=>[x("#e30a17"),'<circle cx="26" cy="20" r="9" fill="#ffffff"/>','<circle cx="29" cy="20" r="7.2" fill="#e30a17"/>',S(40,20,4.5,"#ffffff")].join(""),RU:()=>k(["#ffffff","#0039a6","#d52b1e"]),UA:()=>k(["#0057b7","#ffd700"]),AR:()=>[x("#006c35"),'<path d="M10 16 Q20 12 30 16 T50 16" stroke="#ffffff" stroke-width="2" fill="none"/>','<rect x="14" y="24" width="32" height="3" rx="1.5" fill="#ffffff"/>'].join(""),FA:()=>[k(["#239f40","#ffffff","#da0000"]),'<path d="M27 17 L33 17 L30 23 Z" fill="#da0000"/>','<rect x="29" y="13" width="2" height="6" fill="#da0000"/>'].join(""),HE:()=>[x("#ffffff"),'<rect x="0" y="6" width="60" height="4" fill="#0038b8"/>','<rect x="0" y="30" width="60" height="4" fill="#0038b8"/>','<polygon points="30,12 35,21 25,21" fill="none" stroke="#0038b8" stroke-width="1.8"/>','<polygon points="30,28 25,19 35,19" fill="none" stroke="#0038b8" stroke-width="1.8"/>'].join(""),IN:()=>[k(["#ff9933","#ffffff","#138808"]),'<circle cx="30" cy="20" r="6" fill="none" stroke="#000080" stroke-width="1.2"/>',...ge(30,20,6,"#000080")].join(""),TE:()=>[k(["#ff9933","#ffffff","#138808"]),'<circle cx="30" cy="20" r="4" fill="#000080"/>'].join(""),TA:()=>[x("#d50000"),'<rect x="0" y="16" width="60" height="8" fill="#ffd600"/>',S(30,20,4,"#d50000")].join(""),BN:()=>[x("#006a4e"),'<circle cx="27" cy="20" r="9" fill="#f42a41"/>'].join(""),ZH:()=>[x("#de2910"),S(13,12,6,"#ffde00"),S(25,6,2.2,"#ffde00"),S(29,11,2.2,"#ffde00"),S(29,17,2.2,"#ffde00"),S(25,22,2.2,"#ffde00")].join(""),JA:()=>[x("#ffffff"),'<circle cx="30" cy="20" r="11" fill="#bc002d"/>'].join(""),KO:()=>[x("#ffffff"),'<path d="M30 11 A9 9 0 0 1 30 29 A4.5 4.5 0 0 0 30 20 A4.5 4.5 0 0 1 30 11 Z" fill="#cd2e3a"/>','<path d="M30 29 A9 9 0 0 1 30 11 A4.5 4.5 0 0 1 30 20 A4.5 4.5 0 0 0 30 29 Z" fill="#0047a0"/>','<g stroke="#000000" stroke-width="1.2">','<line x1="10" y1="8" x2="16" y2="12"/>','<line x1="44" y1="12" x2="50" y2="8"/>','<line x1="10" y1="32" x2="16" y2="28"/>','<line x1="44" y1="28" x2="50" y2="32"/>',"</g>"].join("")};function ue(){let e=[];for(let t=0;t<4;t++)for(let n=0;n<5;n++)e.push(S(4+n*5,4+t*5,1.6,"#ffffff"));return e}function ge(e,t,n,r){let i=[];for(let o=0;o<12;o++){let a=Math.PI/6*o;i.push(`<line x1="${e}" y1="${t}" x2="${A(e+n*Math.cos(a))}" y2="${A(t+n*Math.sin(a))}" stroke="${r}" stroke-width="0.6"/>`)}return i}var fe={sv:"SE",uk:"UA",hi:"IN"};function pe(e){let t=e.toLowerCase(),[n,r]=t.split(/[-_]/),i=n!=null?n:t;if(i==="en")return r==="us"||r==="ca"?"US":"GB";if(i==="pt")return r==="br"?"BR":"PT";if(i==="zh")return"ZH";let o=fe[i];if(o)return o;let a=i.toUpperCase();return a in J?a:void 0}var Ze=Object.keys(J);function kt(e){var a;let t=e.toLowerCase(),n=(a=t.split(/[-_]/)[0])!=null?a:t,r=pe(e),i=r&&J[r]?J[r]():de(n||e),o=Ct(w(e));return[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${le}" `,`role="img" aria-label="${o}" `,'width="60" height="40" preserveAspectRatio="xMidYMid meet">',i,"</svg>"].join("")}function St(e){var mt,ht;let t=(ht=(mt=e.options)==null?void 0:mt.position)!=null?ht:"bottom-right",n=document.createElement("mr-latin-widget");n.setAttribute("data-mr-latin-skip","");let r=n.attachShadow({mode:"open"}),i=document.createElement("style");i.textContent=he,r.appendChild(i);let o=document.createElement("div");o.className=`ml-wrap ml-${t}`;let a=e.currentLanguage,c=!1,d=e.onSuggest,s=document.createElement("button");s.type="button",s.className="ml-toggle",s.setAttribute("aria-haspopup","listbox"),s.setAttribute("aria-expanded","false");let u=document.createElement("span");u.className="ml-flag ml-flag-current",u.setAttribute("aria-hidden","true");let m=document.createElement("span");m.className="ml-code";let p=document.createElement("span");p.className="ml-spinner",p.setAttribute("aria-hidden","true"),p.hidden=!0,s.append(u,m,p);let g=document.createElement("div");g.className="ml-panel",g.hidden=!0;let h=document.createElement("div");h.className="ml-list",h.setAttribute("role","listbox"),h.setAttribute("aria-label","Choose a language");let b=[];for(let l of e.languages){let f=document.createElement("div");f.className="ml-option",f.setAttribute("role","option"),f.dataset.code=l,f.tabIndex=-1;let y=document.createElement("span");y.className="ml-flag",y.setAttribute("aria-hidden","true"),ft(y,l);let v=document.createElement("span");v.className="ml-name",v.textContent=w(l);let E=document.createElement("span");E.className="ml-shine",E.setAttribute("aria-hidden","true"),f.append(y,v,E),f.addEventListener("click",()=>pt(l)),h.appendChild(f),b.push(f)}g.appendChild(h);let P=document.createElement("div");P.className="ml-suggest";let L=document.createElement("button");L.type="button",L.className="ml-suggest-toggle",L.textContent="Suggest a better phrasing",L.setAttribute("aria-expanded","false");let C=document.createElement("div");C.className="ml-suggest-form",C.hidden=!0;let U=document.createElement("label");U.className="ml-sr-only",U.htmlFor="ml-suggest-input",U.textContent="Your suggested phrasing";let T=document.createElement("input");T.id="ml-suggest-input",T.type="text",T.className="ml-suggest-input",T.placeholder="How would you say it?";let O=document.createElement("button");O.type="button",O.className="ml-suggest-send",O.textContent="Send",C.append(U,T,O),P.append(L,C),d||(P.hidden=!0),L.addEventListener("click",()=>{let l=C.hidden;C.hidden=!l,L.setAttribute("aria-expanded",String(l)),l&&T.focus()}),O.addEventListener("click",()=>gt()),T.addEventListener("keydown",l=>{l.key==="Enter"&&(l.preventDefault(),gt())});function gt(){let l=T.value.trim();if(!l||!d)return;let f={source:"",language:a,current:w(a),suggested:l};d(f),T.value="",C.hidden=!0,L.setAttribute("aria-expanded","false"),j("Thanks \u2014 your suggestion was sent.")}g.appendChild(P);let R=document.createElement("span");R.className="ml-sr-only",R.setAttribute("role","status"),R.setAttribute("aria-live","polite"),o.append(s,g,R),r.appendChild(o),document.body.appendChild(n);function ft(l,f){l.replaceChildren();let y=me(kt(f));y&&l.appendChild(y)}function z(){ft(u,a),m.textContent=Ut(a),s.setAttribute("aria-label",`Language: ${w(a)}. Change language`)}function H(){for(let l of b){let f=l.dataset.code===a;l.setAttribute("aria-selected",String(f)),l.classList.toggle("ml-selected",f)}}function j(l){R.textContent=l}function V(){let l=b.findIndex(f=>f.dataset.code===a);return l===-1?0:l}function I(l){let f=b.length;if(f===0)return;let y=(l%f+f)%f;for(let E of b)E.tabIndex=-1;let v=b[y];v&&(v.tabIndex=0,v.focus())}function $t(){c||(c=!0,g.hidden=!1,s.setAttribute("aria-expanded","true"),H(),document.addEventListener("keydown",Y,!0),document.addEventListener("pointerdown",Z,!0),I(V()))}function $(l=!0){c&&(c=!1,g.hidden=!0,s.setAttribute("aria-expanded","false"),C.hidden=!0,L.setAttribute("aria-expanded","false"),document.removeEventListener("keydown",Y,!0),document.removeEventListener("pointerdown",Z,!0),l&&s.focus())}function pt(l){l!==a&&(a=l,z(),H(),j(`Language: ${w(l)}`),e.onLanguage(l)),$()}s.addEventListener("click",()=>{c?$():$t()}),h.addEventListener("keydown",l=>{let f=Dt();switch(l.key){case"ArrowDown":case"ArrowRight":l.preventDefault(),I(f+1);break;case"ArrowUp":case"ArrowLeft":l.preventDefault(),I(f-1);break;case"Home":l.preventDefault(),I(0);break;case"End":l.preventDefault(),I(b.length-1);break;case"Enter":case" ":case"Spacebar":{l.preventDefault();let y=b[f],v=y==null?void 0:y.dataset.code;v&&pt(v);break}case"Escape":l.preventDefault(),$();break;default:break}});function Dt(){let l=r.activeElement,f=l?b.indexOf(l):-1;return f===-1?V():f}function Y(l){if(c){if(l.key==="Escape"){l.preventDefault(),$();return}if(l.key==="Tab"){let f=Ft();if(f.length===0)return;let y=f[0],v=f[f.length-1],E=r.activeElement;l.shiftKey&&E===y?(l.preventDefault(),v.focus()):(!l.shiftKey&&E===v||E&&!f.includes(E))&&(l.preventDefault(),y.focus())}}}function Z(l){l.composedPath().includes(n)||$(!1)}function Ft(){var y;let l=[],f=(y=b.find(v=>v.tabIndex===0))!=null?y:b[V()];return f&&l.push(f),P.hidden||(l.push(L),C.hidden||l.push(T,O)),l}function Ut(l){var y;return((y=l.toLowerCase().split(/[-_]/)[0])!=null?y:l.toLowerCase()).toUpperCase()}return z(),H(),{setLanguage(l){a=l,z(),H(),j(`Language: ${w(l)}`)},setBusy(l){o.setAttribute("aria-busy",String(l)),o.classList.toggle("ml-busy",l),p.hidden=!l,s.disabled=l,l&&j("Translating\u2026")},destroy(){document.removeEventListener("keydown",Y,!0),document.removeEventListener("pointerdown",Z,!0),d=void 0,n.remove()}}}function me(e){let n=new DOMParser().parseFromString(e,"image/svg+xml").documentElement;return n&&n.localName==="svg"?document.importNode(n,!0):null}var he=`
:host { all: initial; }
* { box-sizing: border-box; }
.ml-wrap {
  position: fixed;
  z-index: 2147483000;
  font-family: var(--ml-font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  font-size: 14px;
  color: var(--ml-fg, #16181d);
}
.ml-bottom-right { bottom: 16px; right: 16px; }
.ml-bottom-left { bottom: 16px; left: 16px; }
.ml-top-right { top: 16px; right: 16px; }
.ml-top-left { top: 16px; left: 16px; }

.ml-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--ml-surface, #f4f5f7);
  color: var(--ml-fg, #16181d);
  border: 1px solid var(--ml-border, #e3e5ea);
  border-radius: var(--ml-radius, 12px);
  padding: 6px 12px 6px 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,.12);
  cursor: pointer;
  line-height: 1.2;
  font: inherit;
}
.ml-toggle:disabled { cursor: progress; opacity: .8; }
.ml-toggle:focus-visible,
.ml-option:focus-visible,
.ml-suggest-toggle:focus-visible,
.ml-suggest-send:focus-visible,
.ml-suggest-input:focus-visible {
  outline: 2px solid var(--ml-accent, #2563eb);
  outline-offset: 2px;
}
.ml-code { font-weight: 600; letter-spacing: .02em; }

.ml-flag {
  display: inline-flex;
  width: 30px;
  height: 20px;
  border-radius: 3px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(0,0,0,.08) inset;
}
.ml-flag svg { width: 100%; height: 100%; display: block; }
.ml-flag-current { width: 33px; height: 22px; }

.ml-panel {
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  min-width: 220px;
  max-width: 280px;
  max-height: 60vh;
  overflow: auto;
  padding: 8px;
  background: var(--ml-surface, #ffffff);
  border: 1px solid var(--ml-border, #e3e5ea);
  border-radius: var(--ml-radius, 12px);
  box-shadow: 0 12px 32px rgba(0,0,0,.18);
}
.ml-top-right .ml-panel,
.ml-top-left .ml-panel { bottom: auto; top: calc(100% + 10px); }
.ml-bottom-left .ml-panel,
.ml-top-left .ml-panel { right: auto; left: 0; }

.ml-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.ml-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  border: 1px solid transparent;
  transition: background-color .15s ease, transform .12s ease, border-color .15s ease;
}
.ml-option:hover { background: var(--ml-hover, rgba(0,0,0,.05)); }
.ml-option:active { transform: scale(.98); }
.ml-selected {
  border-color: var(--ml-accent, #2563eb);
  background: var(--ml-hover, rgba(37,99,235,.08));
}
.ml-selected .ml-flag { width: 36px; height: 24px; }
.ml-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Subtle shine that sweeps across a tile on hover/press. */
.ml-shine {
  position: absolute;
  top: 0;
  left: -60%;
  width: 40%;
  height: 100%;
  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(255,255,255,.55) 50%,
    transparent 100%
  );
  transform: skewX(-18deg);
  pointer-events: none;
  opacity: 0;
}
.ml-option:hover .ml-shine,
.ml-option:active .ml-shine {
  opacity: 1;
  animation: ml-shine .7s ease forwards;
}
@keyframes ml-shine {
  from { left: -60%; }
  to { left: 130%; }
}

.ml-suggest { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--ml-border, #e3e5ea); }
.ml-suggest-toggle {
  background: none;
  border: none;
  color: var(--ml-accent, #2563eb);
  cursor: pointer;
  font: inherit;
  padding: 4px 2px;
  text-align: left;
  width: 100%;
}
.ml-suggest-form { display: flex; gap: 6px; margin-top: 6px; }
.ml-suggest-input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--ml-border, #e3e5ea);
  border-radius: 8px;
  background: var(--ml-bg, #ffffff);
  color: var(--ml-fg, #16181d);
  font: inherit;
}
.ml-suggest-send {
  background: var(--ml-accent, #2563eb);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font: inherit;
}

.ml-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--ml-border, #e3e5ea);
  border-top-color: var(--ml-accent, #2563eb);
  border-radius: 50%;
  animation: ml-spin .8s linear infinite;
}
@keyframes ml-spin { to { transform: rotate(360deg); } }

/* While busy, slow everything down to signal work in progress. */
.ml-busy .ml-spinner { animation-duration: 1.6s; }
.ml-busy .ml-option:hover .ml-shine,
.ml-busy .ml-option:active .ml-shine { animation-duration: 1.4s; }

@media (prefers-reduced-motion: reduce) {
  .ml-option,
  .ml-toggle { transition: none; }
  .ml-shine { display: none; }
  .ml-option:hover .ml-shine,
  .ml-option:active .ml-shine { animation: none; }
  .ml-spinner { animation-duration: 0s; border-top-color: var(--ml-border, #e3e5ea); }
}

.ml-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
`;function Nt(){var i,o;let e=globalThis,t=e.Translator;if(t&&typeof t.create=="function")return t;let n=e.translation;if(n&&typeof n.createTranslator=="function"){let a=n.createTranslator.bind(n);return{availability:(i=n.availability)!=null?i:n.canTranslate,canTranslate:n.canTranslate,create:a,createTranslator:a}}let r=(o=e.ai)==null?void 0:o.translator;if(r&&typeof r.create=="function")return r}function ye(e){return e==="available"||e==="downloadable"||e==="downloading"||e==="readily"||e==="after-download"}async function be(e,t,n){var i;let r=(i=e.availability)!=null?i:e.canTranslate;if(typeof r!="function")return"available";try{return await r.call(e,{sourceLanguage:t,targetLanguage:n})}catch{return"unavailable"}}var F=class{constructor(){this.name="browser";this.factory=Nt();this.availabilityCache=new Map;this.translators=new Map}static isSupported(){return Nt()!==void 0}async isAvailable(t,n){if(t===n||!this.factory)return!1;let r=Pt(t,n),i=this.availabilityCache.get(r);if(i!==void 0)return i;let o=!1;try{let a=await be(this.factory,t,n);o=ye(a)}catch{o=!1}return this.availabilityCache.set(r,o),o}async translate(t){if(t.texts.length===0)return[];if(t.from===t.to||!this.factory)return t.texts.slice();let n;try{n=await this.getTranslator(t.from,t.to,t.signal)}catch{return t.texts.slice()}let r=new Array(t.texts.length),i=0,o=async()=>{var c;for(;;){if((c=t.signal)!=null&&c.aborted)throw ve();let d=i++;if(d>=t.texts.length)return;let s=t.texts[d];r[d]=await this.translateOne(n,s,t.signal)}},a=Math.min(4,t.texts.length);return await Promise.all(Array.from({length:a},()=>o())),r}async translateOne(t,n,r){if(n.trim()==="")return n;try{let i=await t.translate(n,{signal:r});return i&&i.length>0?i:n}catch(i){if(xe(i))throw i;return n}}getTranslator(t,n,r){let i=this.factory,o=Pt(t,n),a=this.translators.get(o);return a||(a=(async()=>{let c=await i.create({sourceLanguage:t,targetLanguage:n,signal:r,monitor:()=>{}});return c.ready&&await c.ready,c})(),a.catch(()=>{this.translators.get(o)===a&&this.translators.delete(o)}),this.translators.set(o,a),a)}};function Pt(e,t){return`${e}->${t}`}function ve(){try{return new DOMException("Aborted","AbortError")}catch{let e=new Error("Aborted");return e.name="AbortError",e}}function xe(e){return typeof e=="object"&&e!==null&&"name"in e&&e.name==="AbortError"}function st(e){var n;let t=(n=e.method)!=null?n:"POST";return{name:"http",isAvailable(){return!!e.endpoint},async translate(r){if(r.texts.length===0)return[];let i=await fetch(e.endpoint,{method:t,headers:{"content-type":"application/json",...e.headers},body:JSON.stringify({texts:r.texts,from:r.from,to:r.to,tone:r.tone,register:r.register,contexts:r.contexts,glossary:r.glossary}),signal:r.signal});if(!i.ok)throw new Error(`http provider ${i.status}`);let o=await i.json(),a=we(o);return r.texts.map((c,d)=>{var s;return(s=a[d])!=null?s:c})}}}function we(e){let t=e&&typeof e=="object"&&"translations"in e?e.translations:e;return Array.isArray(t)?t.map(n=>typeof n=="string"?n:String(n)):[]}function lt(e){return{name:"libretranslate",isAvailable(){return!!e.endpoint},async translate(t){var a;if(t.texts.length===0)return[];let n=Ot(t.from),r=Ot(t.to);if(n===r)return t.texts.slice();let i=Te(e.endpoint,"/translate"),o=[];for(let c=0;c<t.texts.length;c+=25){let d=t.texts.slice(c,c+25),s=await Le(i,d,n,r,e.apiKey,t.signal);for(let u=0;u<d.length;u++)o.push((a=s[u])!=null?a:d[u])}return o}}}async function Le(e,t,n,r,i,o){let a={q:t,source:n,target:r,format:"text"};i&&(a.api_key=i);let c=await fetch(e,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(a),signal:o});if(!c.ok)throw new Error(`libretranslate ${c.status}`);let d=await c.json(),s=d&&typeof d=="object"&&"translatedText"in d?d.translatedText:void 0;return Array.isArray(s)?s.map(u=>typeof u=="string"?u:String(u)):typeof s=="string"?[s]:[]}function Te(e,t){return e.replace(/\/+$/,"")+t}function Ot(e){var t;return(t=e.toLowerCase().split(/[-_]/)[0])!=null?t:e}var Ee={anthropic:"claude-haiku-4-5",openai:"gpt-4o-mini"};function Ae(e){let t=w(e.to),r=["You are an expert translator and transcreator for website UI text.",`Translate each string from ${w(e.from)} (${e.from}) into ${t} (${e.to}).`,"",`Make it sound like a NATIVE ${t} speaker actually talking \u2014 natural,`,`idiomatic and ${e.tone}, at a ${e.register} register. Never word-for-word.`,"Recreate the MEANING and the EMOTIONAL intent; replace idioms with the","closest natural local equivalent rather than translating them literally.","Speak the way people really speak in that language and region.","","Hard rules:","- Keep UI text concise and appropriate to its role (a button stays short).","- Preserve EXACTLY, untranslated: placeholders ({{x}}, %s, {0}), HTML tags,","  &entities;, URLs, emails, numbers, and code.","- Do NOT translate brand names or any provided glossary term.","- Output ONLY a JSON array of strings \u2014 one per input, same order, no prose."].join(`
`),i=e.texts.map((c,d)=>{var m;let s=(m=e.contexts)==null?void 0:m[d],u={text:c};return s!=null&&s.near&&(u.near=s.near),s!=null&&s.page&&(u.page=s.page),s!=null&&s.role&&(u.role=s.role),u}),o=[];e.glossary&&Object.keys(e.glossary).length&&o.push(`Glossary (keep these exact): ${JSON.stringify(e.glossary)}`);let a=e._dialect;return a&&o.push(`Target variety: ${a}.`),o.push(`Translate these ${i.length} strings; "near"/"page"/"role" are context only, do not translate them:`),o.push(JSON.stringify(i,null,0)),{system:r,user:o.join(`

`)}}function ct(e={}){var r,i;let t=(r=e.vendor)!=null?r:"anthropic",n=(i=e.model)!=null?i:Ee[t];return{name:"llm",isAvailable(){return!!(e.endpoint||e.apiKey)},async translate(o){var u,m,p;if(o.texts.length===0)return[];let a=(p=(u=e.dialect)==null?void 0:u[o.to])!=null?p:(m=e.dialect)==null?void 0:m[Pe(o.to)],c=a?{...o,_dialect:a}:o,d;if(e.endpoint)d=await Ce(e,c);else{let{system:g,user:h}=Ae(c);d=t==="openai"?await Se(e,n,g,h,o.signal):await ke(e,n,g,h,o.signal)}let s=Ne(d);return o.texts.map((g,h)=>{var b;return(b=s[h])!=null?b:g})}}}async function Ce(e,t){var i;let n=await fetch(e.endpoint,{method:"POST",headers:{"content-type":"application/json",...e.headers},body:JSON.stringify({texts:t.texts,from:t.from,to:t.to,tone:t.tone,register:t.register,contexts:t.contexts,glossary:t.glossary}),signal:t.signal});if(!n.ok)throw new Error(`llm proxy ${n.status}`);let r=await n.json();return JSON.stringify((i=r.translations)!=null?i:r)}async function ke(e,t,n,r,i){var s,u,m,p,g;let o=(s=e.baseUrl)!=null?s:"https://api.anthropic.com",a={"content-type":"application/json","x-api-key":(u=e.apiKey)!=null?u:"","anthropic-version":"2023-06-01",...e.headers};e.allowBrowser&&(a["anthropic-dangerous-direct-browser-access"]="true");let c=await fetch(`${o}/v1/messages`,{method:"POST",headers:a,body:JSON.stringify({model:t,max_tokens:4096,system:n,messages:[{role:"user",content:r}]}),signal:i});if(!c.ok)throw new Error(`anthropic ${c.status}`);let d=await c.json();return(g=(p=(m=d==null?void 0:d.content)==null?void 0:m[0])==null?void 0:p.text)!=null?g:""}async function Se(e,t,n,r,i){var d,s,u,m,p,g;let o=(d=e.baseUrl)!=null?d:"https://api.openai.com",a=await fetch(`${o}/v1/chat/completions`,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${(s=e.apiKey)!=null?s:""}`,...e.headers},body:JSON.stringify({model:t,temperature:.3,messages:[{role:"system",content:n},{role:"user",content:r}]}),signal:i});if(!a.ok)throw new Error(`openai ${a.status}`);let c=await a.json();return(g=(p=(m=(u=c==null?void 0:c.choices)==null?void 0:u[0])==null?void 0:m.message)==null?void 0:p.content)!=null?g:""}function Ne(e){if(!e)return[];let t=e.indexOf("["),n=e.lastIndexOf("]"),r=t!==-1&&n!==-1?e.slice(t,n+1):e;try{let i=JSON.parse(r);if(Array.isArray(i))return i.map(o=>String(o))}catch{}return[]}function Pe(e){var t;return(t=e.toLowerCase().split(/[-_]/)[0])!=null?t:e}var Oe="1.0.0",Mt="mr.latin:v1:language",Me=["en","es","fr","de","ar","zh","ja","hi"],N=class{constructor(t={}){this.widget=null;this.disconnectObserver=null;this.started=!1;this._busy=!1;this.listeners=new Set;var n,r,i,o,a;this.options=t,this.root=(n=t.root)!=null?n:typeof document!="undefined"?document.body:void 0,this.sourceLanguage=Re(t.sourceLanguage),this.tone=(r=t.tone)!=null?r:"conversational",this.register=(i=t.register)!=null?i:"casual",this.persist=t.persist!==!1,this.language=Ie(t.language,this.sourceLanguage,this.persist),this.languages=De([...(o=t.languages)!=null?o:Me,this.sourceLanguage,this.language]),this.cache=new B(this.persist),this.providers=(a=t.providers)!=null?a:this.defaultProviders(t),wt(t.skipSelectors),this.translator=new G({providers:this.providers,cache:this.cache,dictionary:t.dictionary,glossary:t.glossary,tone:this.tone,register:this.register,onBusy:c=>this.setBusy(c)})}defaultProviders(t){let n=[],r=!!(t.endpoint||t.vendor&&t.apiKey);return r&&n.push(ct({endpoint:t.endpoint,vendor:t.vendor,apiKey:t.apiKey,model:t.model,allowBrowser:t.allowBrowser})),n.push(new F),t.endpoint&&!r&&n.push(st({endpoint:t.endpoint})),t.libreEndpoint&&n.push(lt({endpoint:t.libreEndpoint})),n}async start(){return this.started?this:(this.started=!0,K(this.language),await this.translateRoot(),this.mountWidget(),this.options.autoTranslate!==!1&&this.startObserver(),this)}async setLanguage(t){var n;t!==this.language&&(this.language=t,this.storeLanguage(t),this.notify(),this.translator.abort(),K(t),(n=this.widget)==null||n.setLanguage(t),await this.translateRoot())}async refresh(){await this.translateRoot()}destroy(){var t,n;if((t=this.disconnectObserver)==null||t.call(this),this.disconnectObserver=null,this.translator.abort(),(n=this.widget)==null||n.destroy(),this.widget=null,this.root&&this.language!==this.sourceLanguage){let r=W(this.root);M(!0);try{for(let[,i]of r)for(let o of i)$e(o)}finally{M(!1)}}Lt(),this.language=this.sourceLanguage,K(this.sourceLanguage),this.started=!1}get busy(){return this._busy}subscribe(t){return this.listeners.add(t),()=>this.listeners.delete(t)}notify(){for(let t of this.listeners)t()}setBusy(t){var n;this._busy=t,(n=this.widget)==null||n.setBusy(t),this.notify()}async translateRoot(){if(!this.root||this.language===this.sourceLanguage)return;let t=W(this.root);await this.translator.translateUnits(t,this.sourceLanguage,this.language)}startObserver(){!this.root||this.disconnectObserver||(this.disconnectObserver=Tt(this.root,t=>{this.translateNodes(t)}))}async translateNodes(t){if(this.language===this.sourceLanguage)return;let n=new Map;for(let r of t){let i=W(r);for(let[o,a]of i){let c=n.get(o);c?c.push(...a):n.set(o,a.slice())}}n.size!==0&&await this.translator.translateUnits(n,this.sourceLanguage,this.language)}mountWidget(){if(this.options.widget===!1||typeof document=="undefined")return;let t=typeof this.options.widget=="object"?this.options.widget:void 0,n={languages:this.languages,currentLanguage:this.language,onLanguage:r=>{this.setLanguage(r)},options:t};this.options.onSuggest&&(n.onSuggest=this.options.onSuggest),this.widget=St(n)}storeLanguage(t){if(this.persist)try{localStorage.setItem(Mt,t)}catch{}}};N.BrowserTranslationProvider=F,N.createLLMProvider=ct,N.createHttpProvider=st,N.createLibreTranslateProvider=lt,N.version=Oe;var dt=N;function Re(e){var t;if(e&&e!=="auto")return e;if(typeof document!="undefined"){let n=(t=document.documentElement.getAttribute("lang"))==null?void 0:t.trim();if(n)return n}return typeof navigator!="undefined"&&navigator.language?navigator.language:"en"}function Ie(e,t,n){if(n)try{let r=localStorage.getItem(Mt);if(r)return r}catch{}return e||t}function $e(e){var i,o,a,c,d;if(e.kind==="attr"&&e.attr){e.node.setAttribute(e.attr,e.original);return}let t=(i=e.node.nodeValue)!=null?i:"",n=(a=(o=/^\s*/.exec(t))==null?void 0:o[0])!=null?a:"",r=(d=(c=/\s*$/.exec(t))==null?void 0:c[0])!=null?d:"";e.node.textContent=n+e.original+r}function De(e){let t=new Set,n=[];for(let r of e)r&&!t.has(r)&&(t.add(r),n.push(r));return n}function Rt(e){if(e==null)return;let t=e.split(",").map(n=>n.trim()).filter(n=>n.length>0);return t.length>0?t:void 0}function ut(e){return e==="false"}function Fe(){if(typeof document=="undefined")return null;let e=document.currentScript;return e&&e.hasAttribute("data-mr-latin")?e:document.querySelector("script[data-mr-latin]")}function Ue(e){let t=g=>e.getAttribute(g),n={},r=t("data-source-language");r&&(n.sourceLanguage=r);let i=t("data-language");i&&(n.language=i);let o=Rt(t("data-languages"));o&&(n.languages=o);let a=t("data-tone");a&&(n.tone=a);let c=t("data-register");c&&(n.register=c);let d=t("data-endpoint");d&&(n.endpoint=d);let s=t("data-libre-endpoint");s&&(n.libreEndpoint=s),e.hasAttribute("data-persist")&&(n.persist=!ut(t("data-persist"))),e.hasAttribute("data-auto-translate")&&(n.autoTranslate=!ut(t("data-auto-translate")));let u=Rt(t("data-skip"));u&&(n.skipSelectors=u);let m=e.hasAttribute("data-widget")&&ut(t("data-widget")),p=t("data-position");if(m)n.widget=!1;else if(p){let g={position:p};n.widget=g}return n}function He(e){typeof document!="undefined"&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",e,{once:!0}):e())}var It=Fe();if(It){let e=Ue(It);He(()=>{new dt(e).start()})}var je=dt;return Gt(Be);})();
MrLatin = MrLatin.default;

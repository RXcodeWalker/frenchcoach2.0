// <l-icon name="graduation-cap" size="20" stroke="1.75"> — renders a lucide icon as inline SVG.
(function () {
  const SRC = 'https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js';
  let ready = window.lucide ? Promise.resolve() : new Promise((res) => {
    const s = document.createElement('script'); s.src = SRC; s.onload = res; document.head.appendChild(s);
  });
  const pascal = (n) => n.replace(/(^|-)([a-z0-9])/g, (_, a, b) => b.toUpperCase());
  class LIcon extends HTMLElement {
    static get observedAttributes() { return ['name', 'size', 'stroke']; }
    connectedCallback() { this.style.display = 'inline-flex'; this.style.flexShrink = '0'; this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      const size = this.getAttribute('size') || '16';
      this.style.width = size + 'px'; this.style.height = size + 'px';
      ready.then(() => {
        const node = window.lucide.icons[pascal(this.getAttribute('name') || '')];
        if (!node) { console.warn('l-icon: missing', this.getAttribute('name')); return; }
        const kids = typeof node[0] === 'string' ? node[2] : node;
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        const a = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': this.getAttribute('stroke') || '1.75', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
        for (const k in a) svg.setAttribute(k, a[k]);
        for (const [tag, attrs] of kids) { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); svg.appendChild(el); }
        (this.shadowRoot || this.attachShadow({ mode: 'open' })).replaceChildren(svg);
      });
    }
  }
  if (!customElements.get('l-icon')) customElements.define('l-icon', LIcon);
})();

// ppt-ribbon.js — PPT 风格排列与形状功能区
window.HVE_PPTRibbon = (function () {
  let ribbon = null;
  let openPanel = null;
  let active = false;
  let dragState = null;
  const POSITION_KEY = 'hveRibbonPosition';

  const SHAPES = [
    ['rectangle', '矩形', '▭'], ['rounded', '圆角矩形', '▢'], ['ellipse', '椭圆', '○'],
    ['triangle', '三角形', '△'], ['diamond', '菱形', '◇'], ['parallelogram', '平行四边形', '▱'],
    ['hexagon', '六边形', '⬡'], ['right-arrow', '右箭头', '➜'], ['line', '直线', '╱'],
    ['star', '五角星', '☆'], ['callout', '对话框', '▱'], ['heart', '心形', '♡']
  ];

  function activate() {
    if (active) return;
    active = true;
    createRibbon();
    document.addEventListener('mousedown', onDocumentDown, true);
  }

  function deactivate() {
    active = false;
    closePanel();
    document.removeEventListener('mousedown', onDocumentDown, true);
    stopDragging();
    ribbon?.remove();
    ribbon = null;
  }

  function createRibbon() {
    if (ribbon) return;
    ribbon = document.createElement('div');
    ribbon.setAttribute('data-hve-editor', 'true');
    ribbon.setAttribute('data-hve-ppt-ribbon', 'true');
    ribbon.innerHTML = `
      <div class="hve-ribbon-brand" data-ribbon-drag-handle title="拖动功能区"><b>⠿</b><span>HVE</span><small>拖动</small></div>
      <div class="hve-ribbon-group">
        <button data-ribbon-menu="arrange"><b>▱</b><span>排列</span><i>▾</i></button>
        <div class="hve-ribbon-caption">对象</div>
      </div>
      <div class="hve-ribbon-group">
        <button data-ribbon-menu="align"><b>☷</b><span>对齐与分布</span><i>▾</i></button>
        <div class="hve-ribbon-caption">位置</div>
      </div>
      <div class="hve-ribbon-group">
        <button data-ribbon-menu="rotate"><b>↻</b><span>旋转</span><i>▾</i></button>
        <div class="hve-ribbon-caption">变换</div>
      </div>
      <div class="hve-ribbon-group hve-ribbon-shapes">
        <div class="hve-shape-quick">${SHAPES.slice(0, 5).map(s => `<button data-shape="${s[0]}" title="${s[1]}">${s[2]}</button>`).join('')}</div>
        <button class="hve-more-shapes" data-ribbon-menu="shapes"><span>更多形状</span><i>▾</i></button>
        <div class="hve-ribbon-caption">插入形状</div>
      </div>
      <div class="hve-ribbon-group">
        <button data-ribbon-action="group"><b>⊞</b><span>组合</span></button>
        <button data-ribbon-action="ungroup"><b>⊟</b><span>取消组合</span></button>
        <div class="hve-ribbon-caption">组合对象</div>
      </div>
      <button class="hve-ribbon-collapse" title="收起/展开功能区" aria-label="收起功能区">⌃</button>`;
    ribbon.addEventListener('mousedown', e => e.preventDefault());
    ribbon.addEventListener('pointerdown', onDragStart);
    ribbon.addEventListener('click', onRibbonClick);
    document.body.appendChild(ribbon);
    restorePosition();
  }

  function onDragStart(e) {
    if (e.button !== 0 || !e.target.closest('[data-ribbon-drag-handle]')) return;
    const rect = ribbon.getBoundingClientRect();
    dragState = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
    ribbon.classList.add('dragging');
    closePanel();
    e.preventDefault();
    e.stopPropagation();
    document.addEventListener('pointermove', onDragMove, true);
    document.addEventListener('pointerup', onDragEnd, true);
    document.addEventListener('pointercancel', onDragEnd, true);
  }

  function onDragMove(e) {
    if (!dragState || !ribbon) return;
    const maxLeft = Math.max(0, window.innerWidth - ribbon.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - ribbon.offsetHeight);
    const left = Math.min(maxLeft, Math.max(0, e.clientX - dragState.offsetX));
    const top = Math.min(maxTop, Math.max(0, e.clientY - dragState.offsetY));
    setPosition(left, top);
    e.preventDefault();
  }

  function onDragEnd() {
    if (!dragState) return;
    dragState = null;
    ribbon?.classList.remove('dragging');
    document.removeEventListener('pointermove', onDragMove, true);
    document.removeEventListener('pointerup', onDragEnd, true);
    document.removeEventListener('pointercancel', onDragEnd, true);
    savePosition();
  }

  function stopDragging() {
    dragState = null;
    document.removeEventListener('pointermove', onDragMove, true);
    document.removeEventListener('pointerup', onDragEnd, true);
    document.removeEventListener('pointercancel', onDragEnd, true);
  }

  function setPosition(left, top) {
    if (!ribbon) return;
    ribbon.style.left = `${Math.round(left)}px`;
    ribbon.style.top = `${Math.round(top)}px`;
    ribbon.style.right = 'auto';
    ribbon.style.transform = 'none';
  }

  function savePosition() {
    if (!ribbon || typeof chrome === 'undefined' || !chrome.storage?.local) return;
    const rect = ribbon.getBoundingClientRect();
    chrome.storage.local.set({ [POSITION_KEY]: { left: rect.left, top: rect.top } });
  }

  function restorePosition() {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    chrome.storage.local.get(POSITION_KEY, result => {
      const saved = result?.[POSITION_KEY];
      if (!saved || !ribbon) return;
      const maxLeft = Math.max(0, window.innerWidth - ribbon.offsetWidth);
      const maxTop = Math.max(0, window.innerHeight - ribbon.offsetHeight);
      setPosition(Math.min(maxLeft, Math.max(0, saved.left)), Math.min(maxTop, Math.max(0, saved.top)));
    });
  }
  function onRibbonClick(e) {
    const shape = e.target.closest('[data-shape]');
    if (shape) { insertShape(shape.dataset.shape); closePanel(); return; }
    const action = e.target.closest('[data-ribbon-action]');
    if (action) { runAction(action.dataset.ribbonAction); closePanel(); return; }
    const menu = e.target.closest('[data-ribbon-menu]');
    if (menu) { togglePanel(menu, menu.dataset.ribbonMenu); return; }
    const collapse = e.target.closest('.hve-ribbon-collapse');
    if (collapse) {
      ribbon.classList.toggle('collapsed');
      collapse.textContent = ribbon.classList.contains('collapsed') ? '⌄' : '⌃';
    }
  }

  function togglePanel(anchor, type) {
    if (openPanel?.dataset.panel === type) { closePanel(); return; }
    closePanel();
    const panel = document.createElement('div');
    panel.setAttribute('data-hve-editor', 'true');
    panel.setAttribute('data-hve-ribbon-panel', 'true');
    panel.dataset.panel = type;
    if (type === 'shapes') {
      panel.className = 'hve-shape-gallery';
      panel.innerHTML = `<div class="hve-panel-title">常用形状</div><div class="hve-shape-grid">${SHAPES.map(s => `<button data-shape="${s[0]}" title="${s[1]}"><b>${s[2]}</b><span>${s[1]}</span></button>`).join('')}</div>`;
    } else {
      panel.innerHTML = menuItems(type).map(item => item === '-' ? '<hr>' : `<button data-ribbon-action="${item[0]}"><b>${item[1]}</b><span>${item[2]}</span></button>`).join('');
    }
    panel.addEventListener('mousedown', e => e.preventDefault());
    panel.addEventListener('click', onRibbonClick);
    document.body.appendChild(panel);
    const rect = anchor.getBoundingClientRect();
    panel.style.left = Math.min(rect.left, window.innerWidth - 260) + 'px';
    panel.style.top = (rect.bottom + 5) + 'px';
    openPanel = panel;
  }

  function menuItems(type) {
    if (type === 'arrange') return [
      ['bring-front', '⇈', '置于顶层'], ['bring-forward', '↑', '上移一层'],
      ['send-backward', '↓', '下移一层'], ['send-back', '⇊', '置于底层']
    ];
    if (type === 'align') return [
      ['align-left', '⊢', '左对齐'], ['align-center-x', '↔', '水平居中'], ['align-right', '⊣', '右对齐'], '-',
      ['align-top', '⊤', '顶端对齐'], ['align-center-y', '↕', '垂直居中'], ['align-bottom', '⊥', '底端对齐'], '-',
      ['distribute-x', '⇹', '水平分布'], ['distribute-y', '⇳', '垂直分布']
    ];
    return [
      ['rotate-right', '↻', '向右旋转 90°'], ['rotate-left', '↺', '向左旋转 90°'], '-',
      ['flip-x', '⇆', '水平翻转'], ['flip-y', '⇅', '垂直翻转']
    ];
  }

  function selected() { return window.HVE_Selector?.getSelectedElements?.() || []; }
  function requireSelection(min = 1) {
    const els = selected();
    if (els.length < min) {
      window.HVE_Core?.showToast(min > 1 ? '请先选择至少两个对象' : '请先选择对象', 'info');
      return null;
    }
    return els;
  }

  function runAction(action) {
    if (action === 'group') {
      const els = requireSelection(2); if (els) window.HVE_Core?.groupElements(els); return;
    }
    if (action === 'ungroup') {
      const el = requireSelection(1)?.[0]; if (el) window.HVE_Core?.ungroupElement(el); return;
    }
    if (action.startsWith('align-') || action.startsWith('distribute-')) { alignOrDistribute(action); return; }
    if (action.startsWith('rotate-') || action.startsWith('flip-')) { transformSelected(action); return; }
    orderSelected(action);
  }

  function orderSelected(action) {
    const els = requireSelection(1); if (!els) return;
    els.forEach(el => {
      const parent = el.parentElement; if (!parent) return;
      const before = Array.from(parent.children).indexOf(el);
      if (action === 'bring-front') parent.appendChild(el);
      else if (action === 'send-back') parent.insertBefore(el, parent.firstElementChild);
      else if (action === 'bring-forward' && el.nextElementSibling) parent.insertBefore(el.nextElementSibling, el);
      else if (action === 'send-backward' && el.previousElementSibling) parent.insertBefore(el, el.previousElementSibling);
      const after = Array.from(parent.children).indexOf(el);
      if (before !== after && window.HVE_History) window.HVE_History.record({
        type: 'move-order', element: el,
        before: { parentSelector: window.HVE_History.getUniqueSelector(parent), index: before },
        after: { parentSelector: window.HVE_History.getUniqueSelector(parent), index: after },
        description: '排列对象'
      });
    });
    window.HVE_Core?.showToast('对象层级已调整 ✓', 'success');
  }

  function alignOrDistribute(action) {
    const els = requireSelection(action.startsWith('distribute-') ? 3 : 2); if (!els) return;
    const items = els.map(el => ({ el, rect: el.getBoundingClientRect() }));
    const bounds = {
      left: Math.min(...items.map(i => i.rect.left)), right: Math.max(...items.map(i => i.rect.right)),
      top: Math.min(...items.map(i => i.rect.top)), bottom: Math.max(...items.map(i => i.rect.bottom))
    };
    if (action === 'distribute-x') {
      const sorted = [...items].sort((a,b) => a.rect.left - b.rect.left);
      const gap = (bounds.right - bounds.left - sorted.reduce((n,i) => n + i.rect.width, 0)) / (sorted.length - 1);
      let cursor = bounds.left;
      sorted.forEach(i => { moveBy(i.el, cursor - i.rect.left, 0); cursor += i.rect.width + gap; });
    } else if (action === 'distribute-y') {
      const sorted = [...items].sort((a,b) => a.rect.top - b.rect.top);
      const gap = (bounds.bottom - bounds.top - sorted.reduce((n,i) => n + i.rect.height, 0)) / (sorted.length - 1);
      let cursor = bounds.top;
      sorted.forEach(i => { moveBy(i.el, 0, cursor - i.rect.top); cursor += i.rect.height + gap; });
    } else items.forEach(i => {
      let dx = 0, dy = 0;
      if (action === 'align-left') dx = bounds.left - i.rect.left;
      if (action === 'align-center-x') dx = (bounds.left + bounds.right - i.rect.left - i.rect.right) / 2;
      if (action === 'align-right') dx = bounds.right - i.rect.right;
      if (action === 'align-top') dy = bounds.top - i.rect.top;
      if (action === 'align-center-y') dy = (bounds.top + bounds.bottom - i.rect.top - i.rect.bottom) / 2;
      if (action === 'align-bottom') dy = bounds.bottom - i.rect.bottom;
      moveBy(i.el, dx, dy);
    });
    refreshSelection();
    window.HVE_Core?.showToast('对象已对齐 ✓', 'success');
  }

  function moveBy(el, dx, dy) {
    if (Math.abs(dx) < .1 && Math.abs(dy) < .1) return;
    const before = el.style.translate || '';
    const parts = before.trim().split(/\s+/);
    const tx = (parseFloat(parts[0]) || 0) + dx;
    const ty = (parseFloat(parts[1]) || 0) + dy;
    el.style.translate = `${tx}px ${ty}px`;
    recordStyle(el, { translate: before }, { translate: el.style.translate }, '排列对象');
  }

  function transformSelected(action) {
    const els = requireSelection(1); if (!els) return;
    els.forEach(el => {
      const before = el.style.transform || '';
      let after = before;
      if (action === 'rotate-right') after += ' rotate(90deg)';
      if (action === 'rotate-left') after += ' rotate(-90deg)';
      if (action === 'flip-x') after += ' scaleX(-1)';
      if (action === 'flip-y') after += ' scaleY(-1)';
      el.style.transform = after.trim();
      recordStyle(el, { transform: before }, { transform: el.style.transform }, '旋转对象');
    });
    refreshSelection();
  }

  function recordStyle(el, before, after, description) {
    window.HVE_History?.record({ type: 'style', element: el, before: { style: before }, after: { style: after }, description });
  }

  function insertShape(type) {
    const el = document.createElement('div');
    el.setAttribute('data-hve-shape', type);
    el.setAttribute('aria-label', SHAPES.find(s => s[0] === type)?.[1] || '形状');
    el.style.cssText = 'display:inline-block;width:120px;height:80px;margin:12px;background:#5B9BD5;border:2px solid #2F5597;box-sizing:border-box;vertical-align:middle;';
    applyShapeStyle(el, type);
    const current = window.HVE_Selector?.getSelected();
    const parent = current?.parentElement || document.body;
    if (current?.parentElement) parent.insertBefore(el, current.nextSibling); else parent.appendChild(el);
    window.HVE_History?.record({
      type: 'dom', element: el, before: { action: 'insert' },
      after: { action: 'insert', html: el.outerHTML, parentSelector: window.HVE_History.getUniqueSelector(parent) },
      description: '插入形状'
    });
    window.HVE_Selector?.deselectAll();
    window.HVE_Selector?.select(el);
    window.HVE_Core?.showToast('形状已添加，可拖动和缩放 ✓', 'success');
  }

  function applyShapeStyle(el, type) {
    const clips = {
      triangle: 'polygon(50% 0,100% 100%,0 100%)', diamond: 'polygon(50% 0,100% 50%,50% 100%,0 50%)',
      parallelogram: 'polygon(20% 0,100% 0,80% 100%,0 100%)', hexagon: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)',
      'right-arrow': 'polygon(0 25%,62% 25%,62% 0,100% 50%,62% 100%,62% 75%,0 75%)',
      star: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 92%,50% 70%,21% 92%,32% 57%,2% 35%,39% 35%)',
      callout: 'polygon(0 0,100% 0,100% 75%,35% 75%,20% 100%,20% 75%,0 75%)',
      heart: 'polygon(50% 92%,8% 50%,2% 28%,10% 9%,28% 2%,50% 20%,72% 2%,90% 9%,98% 28%,92% 50%)'
    };
    if (type === 'rounded') el.style.borderRadius = '18px';
    if (type === 'ellipse') el.style.borderRadius = '50%';
    if (clips[type]) { el.style.clipPath = clips[type]; el.style.border = '0'; }
    if (type === 'line') { el.style.width = '150px'; el.style.height = '4px'; el.style.border = '0'; el.style.transform = 'rotate(-15deg)'; }
  }

  function refreshSelection() {
    const el = window.HVE_Selector?.getSelected();
    if (el) window.HVE_Resize?.attachTo(el);
  }

  function closePanel() { openPanel?.remove(); openPanel = null; }
  function onDocumentDown(e) { if (!e.target.closest('[data-hve-ppt-ribbon], [data-hve-ribbon-panel]')) closePanel(); }

  function getElement() { return ribbon; }

  return { activate, deactivate, insertShape, runAction, getElement };
})();

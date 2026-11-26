/* FlyingRoots: dependency-free interaction layer. No analytics, messaging or stored form data. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon = name => `<svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const motions = new WeakMap();
  const animate = (element, frames, options = {}) => {
    motions.get(element)?.cancel();
    if (reduced.matches || !element?.animate) return;
    const motion = element.animate(frames, {duration:180, easing:'cubic-bezier(.22,.8,.2,1)', ...options});
    motions.set(element, motion);
  };
  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    clearTimeout(toastTimer);
    el.textContent = message;
    el.hidden = false;
    animate(el, [{opacity:0},{opacity:1}]);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4200);
  }
  function revealSetup() {
    if (!('IntersectionObserver' in window) || reduced.matches) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), {rootMargin:'0px 0px -20px 0px',threshold:0.02});
    $$('.reveal').forEach(element => observer.observe(element));
    const footer = $('.meadow-footer');
    if (footer) observer.observe(footer);
    document.body.classList.add('motion-ready');
    reduced.addEventListener('change', () => {
      if (reduced.matches) { document.body.classList.remove('motion-ready'); observer.disconnect(); }
    });
  }
  revealSetup();

  /* Header state uses one scheduled frame; section changes use observers. */
  const header = $('#header');
  let headerFrame = false;
  const syncHeader = () => { header.classList.toggle('scrolled', scrollY > 55); headerFrame = false; };
  window.addEventListener('scroll', () => {
    if (!headerFrame) { headerFrame = true; requestAnimationFrame(syncHeader); }
  }, {passive:true});
  syncHeader();
  function activeNav(id) {
    $$('[data-nav-link]').forEach(link => {
      if (link.dataset.navLink === id) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }
  activeNav('top');
  if ('IntersectionObserver' in window) {
    const sections = $$('main > section[id], footer[id]');
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const mapped = {intro:'top',trade:'process',footer:'contact'};
          activeNav(mapped[entry.target.id] || entry.target.id);
        }
      });
    }, {rootMargin:'-20% 0px -60% 0px',threshold:0});
    sections.forEach(section => navObserver.observe(section));
  }

  /* Native dialogs supply a focus trap, Escape handling and inert background. */
  const menu = $('#mobile-menu');
  const menuToggle = $('#menu-toggle');
  const drawer = $('#product-drawer');
  let drawerTrigger;
  function syncModalState() { document.body.classList.toggle('modal-open', menu.open || drawer.open); }
  menuToggle.addEventListener('click', () => {
    menu.showModal(); menuToggle.setAttribute('aria-expanded','true'); syncModalState();
    animate(menu, [{opacity:0,transform:'translateY(-18px)'},{opacity:1,transform:'none'}]);
  });
  $('#menu-close').addEventListener('click', () => menu.close());
  menu.addEventListener('close', () => { menuToggle.setAttribute('aria-expanded','false'); syncModalState(); menuToggle.focus({preventScroll:true}); });
  $$('a', menu).forEach(link => link.addEventListener('click', () => menu.close()));
  $('#drawer-close').addEventListener('click', () => drawer.close());
  drawer.addEventListener('click', event => { if (event.target === drawer) { const rect = drawer.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) drawer.close(); } });
  drawer.addEventListener('close', () => { syncModalState(); drawerTrigger?.focus({preventScroll:true}); });
  window.addEventListener('resize', () => { if (innerWidth > 960 && menu.open) menu.close(); }, {passive:true});

  /* Full-length film with optimized desktop/mobile sources and a matching first-frame preview. */
  const video = $('#hero-video');
  const videoButton = $('#video-control');
  let userPausedVideo = reduced.matches || !!navigator.connection?.saveData;
  let videoInView = true;
  if (userPausedVideo) { video.removeAttribute('autoplay'); video.pause(); }
  function updateVideoControl() {
    videoButton.innerHTML = icon(video.paused ? 'play' : 'pause');
    videoButton.setAttribute('aria-label', video.paused ? 'Play background video' : 'Pause background video');
  }
  async function playVideo() {
    try { await video.play(); } catch { updateVideoControl(); }
  }
  video.addEventListener('playing', () => { video.classList.add('playing'); updateVideoControl(); });
  video.addEventListener('pause', updateVideoControl);
  video.addEventListener('error', () => { video.classList.remove('playing'); updateVideoControl(); toast('The background film could not load. Please refresh to try again.'); });
  videoButton.addEventListener('click', () => {
    if (video.paused) { userPausedVideo = false; playVideo(); }
    else { userPausedVideo = true; video.pause(); }
  });
  function syncVideo() {
    if (document.hidden || !videoInView || userPausedVideo) video.pause();
    else playVideo();
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { videoInView = entry.isIntersecting; syncVideo(); }, {threshold:.05}).observe($('#top'));
  else if (!userPausedVideo) playVideo();
  reduced.addEventListener('change', () => { if (reduced.matches) { userPausedVideo = true; video.pause(); } });

  /* Arrow/Home/End keyboard interaction is consistent across every tab group. */
  function wireTabs(group, selector, activate, vertical = false) {
    group.addEventListener('keydown', event => {
      const buttons = $$(selector, group).filter(button => !button.disabled && !button.hidden);
      const index = buttons.indexOf(event.target);
      if (index < 0) return;
      const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
      const previousKey = vertical ? 'ArrowUp' : 'ArrowLeft';
      let next = index;
      if (event.key === nextKey) next = (index + 1) % buttons.length;
      else if (event.key === previousKey) next = (index - 1 + buttons.length) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else return;
      event.preventDefault(); activate(buttons[next]); buttons[next].focus({preventScroll:true});
      if (group.classList.contains('category-tabs')) revealCategoryTab(buttons[next]);
    });
  }

  const values = ['clear.','traceable.','transparent.','accountable.'];
  const valueTabs = $('.values-tabs');
  function setValue(button) {
    if (button.getAttribute('aria-selected') === 'true') return;
    $$('button',valueTabs).forEach(tab => { const chosen = tab === button; tab.setAttribute('aria-selected',String(chosen)); tab.tabIndex = chosen ? 0 : -1; });
    const word = $('#value-word'); word.textContent = values[Number(button.dataset.value)];
    $('#value-panel').textContent = $('span',button).textContent;
    $('#value-panel').setAttribute('aria-labelledby',button.id);
    animate(word,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}]);
  }
  $$('button',valueTabs).forEach(button => button.addEventListener('click', () => setValue(button)));
  wireTabs(valueTabs,'button',setValue);
  $$('.approach details').forEach(details => details.addEventListener('toggle', () => {
    if (details.open) $$('.approach details').filter(other => other !== details).forEach(other => {other.open = false;});
  }));

  /* Enquiry choices are held in memory only. */
  let selectedProducts = [];
  let currentEnquiry = 'buyer';
  function switchEnquiry(type, focus = false) {
    currentEnquiry = type;
    for (const name of ['buyer','supplier']) {
      const on = name === type;
      $(`#panel-${name}`).hidden = !on;
      $(`#tab-${name}`).setAttribute('aria-selected', String(on));
      $(`#tab-${name}`).tabIndex = on ? 0 : -1;
    }
    if (focus) $(`#${type}-name`).focus({preventScroll:true});
  }
  $$('[data-enquiry-tab]').forEach(button => button.addEventListener('click', () => switchEnquiry(button.dataset.enquiryTab)));
  wireTabs($('.enquiry-tabs'),'button',button => switchEnquiry(button.dataset.enquiryTab));
  function renderChips() {
    $('#selected-products').innerHTML = selectedProducts.map(product => `<span class="product-chip" role="listitem">${escape(product)}<button type="button" data-remove-product="${escape(product)}" aria-label="Remove ${escape(product)}">${icon('close')}</button></span>`).join('');
    if (selectedProducts.length) { $('#buyer-products-error').textContent = ''; $('#product-chips').classList.remove('invalid'); $('#buyer-products-input').removeAttribute('aria-invalid'); }
  }
  function addProducts(products) {
    for (const item of products) {
      const value = item.trim().replace(/\s+/g,' ').slice(0,160);
      if (value && !selectedProducts.some(product => product.toLowerCase() === value.toLowerCase()) && selectedProducts.length < 40) selectedProducts.push(value);
    }
    renderChips();
  }
  $('#selected-products').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-product]');
    if (!button) return;
    selectedProducts = selectedProducts.filter(product => product !== button.dataset.removeProduct);
    renderChips(); $('#buyer-products-input').focus({preventScroll:true});
  });
  const productInput = $('#buyer-products-input');
  function commitTypedProduct() { if (productInput.value.trim()) { addProducts(productInput.value.split(',')); productInput.value = ''; } }
  productInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); commitTypedProduct(); }
  });
  productInput.addEventListener('blur', commitTypedProduct);
  $('#buyer-quick').addEventListener('change', event => { if (event.target.value) addProducts([event.target.value]); event.target.value = ''; });
  function enquire(products, spec = false) {
    if (drawer.open) drawer.close();
    switchEnquiry('buyer');
    $('#buyer-form').hidden = false; $('#buyer-result').hidden = true;
    addProducts(products);
    if (spec) { $('#spec-sheet').checked = true; $('#spec-sheet').closest('details').open = true; }
    $('#enquiry').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
    productInput.focus({preventScroll:true});
    toast(spec ? 'Specification request added to your sample enquiry.' : 'Product added to your sample enquiry.');
  }
  $$('[data-demo-contact]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); toast('These are fictional contact details for the FlyingRoots portfolio concept.');
  }));

  function validateForm(type) {
    const form = $(`#${type}-form`);
    const errors = [];
    $$('.field-error',form).forEach(element => { element.textContent = ''; });
    $$('[aria-invalid]',form).forEach(element => element.removeAttribute('aria-invalid'));
    $('#product-chips').classList.remove('invalid');
    for (const field of $$('[required]',form)) {
      const label = $(`label[for="${field.id}"]`,form)?.textContent.replace('*','').trim() || 'This field';
      let message = '';
      if (!field.value.trim()) message = `Please enter ${label.toLowerCase()}.`;
      else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) message = 'Please enter a valid email address.';
      else if (field.type === 'tel' && (!/^[+\d\s().-]+$/.test(field.value) || field.value.replace(/\D/g,'').length < 6 || field.value.replace(/\D/g,'').length > 15)) message = 'Please enter a phone number with 6–15 digits.';
      if (message) {
        field.setAttribute('aria-invalid','true');
        const error = $(`#${field.id}-error`);
        if (error) { error.textContent = message; field.setAttribute('aria-describedby', error.id); }
        errors.push({id:field.id,message});
      }
    }
    if (type === 'buyer' && !selectedProducts.length) {
      const message = 'Please add at least one product.';
      $('#buyer-products-error').textContent = message; productInput.setAttribute('aria-invalid','true');
      productInput.setAttribute('aria-describedby','buyer-products-error buyer-products-help'); $('#product-chips').classList.add('invalid');
      errors.push({id:'buyer-products-input',message});
    }
    if (type === 'supplier' && !$$('input[name=categories]:checked',form).length) {
      const message = 'Please choose at least one category.';
      $('#supplier-categories-error').textContent = message;
      const first = $('input[name=categories]',form); first.setAttribute('aria-invalid','true'); first.setAttribute('aria-describedby','supplier-categories-error');
      errors.push({id:first.id || 'supplier-categories-error',message});
    }
    const summary = $('.error-summary',form);
    summary.hidden = !errors.length;
    if (errors.length) {
      summary.innerHTML = `<strong>Please check ${errors.length} ${errors.length===1?'field':'fields'}.</strong>` + errors.map(error => `<a href="#${error.id}">${escape(error.message)}</a>`).join('');
      summary.focus();
    }
    return errors.length === 0;
  }
  async function copyText(text, button, fallback) {
    try { await navigator.clipboard.writeText(text); button.innerHTML = `${icon('check')} Copied`; toast('Enquiry preview copied. Nothing has been sent.'); }
    catch { fallback.focus(); fallback.select(); toast('Select and copy the enquiry preview below.'); }
  }
  for (const type of ['buyer','supplier']) {
    const form = $(`#${type}-form`);
    form.addEventListener('submit', event => {
      event.preventDefault(); if (type === 'buyer') commitTypedProduct();
      if (!validateForm(type)) return;
      let lines = [`FlyingRoots — ${type === 'buyer' ? 'Buyer enquiry' : 'Supply partnership'} preview`,'Portfolio demo: not sent.',''];
      $$('input,textarea,select',form).forEach(field => {
        if (field === productInput || field.id === 'buyer-quick' || field.name === 'categories') return;
        if (field.type === 'checkbox') { if (field.checked) lines.push('Specification sheet: requested'); return; }
        if (field.value.trim()) {
          const label = $(`label[for="${field.id}"]`,form)?.textContent.replace('*','').replace('(optional)','').trim() || field.name;
          lines.push(`${label}: ${field.value.trim()}`);
        }
      });
      if (type === 'buyer') lines.push(`Product interest: ${selectedProducts.join(', ')}`);
      else lines.push(`Categories: ${$$('input[name=categories]:checked',form).map(field => field.value).join(', ')}`);
      const text = lines.join('\n');
      const result = $(`#${type}-result`);
      result.innerHTML = `${icon('check')}<h3>Your enquiry preview is ready.</h3><p>This is a portfolio demo. Nothing has been sent, and your details have not been saved.</p><label class="sr-only" for="${type}-preview-text">Your enquiry preview</label><textarea class="enquiry-preview" id="${type}-preview-text" readonly>${escape(text)}</textarea><div class="actions"><button class="button green copy-preview" type="button">${icon('copy')} Copy preview</button><button class="button cream edit-preview" type="button">Edit enquiry</button></div>`;
      form.hidden = true; result.hidden = false; result.focus({preventScroll:true});
      result.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});
      $('.copy-preview',result).addEventListener('click', event => copyText(text,event.currentTarget,$('textarea',result)));
      $('.edit-preview',result).addEventListener('click', () => { result.hidden = true; form.hidden = false; $(`#${type}-name`).focus({preventScroll:true}); });
    });
    form.addEventListener('input', event => {
      const field = event.target;
      if (field.getAttribute('aria-invalid') === 'true') { field.removeAttribute('aria-invalid'); const error = $(`#${field.id}-error`); if (error) error.textContent = ''; }
    });
    $('.error-summary',form).addEventListener('click', event => {
      const link = event.target.closest('a'); if (!link) return;
      const target = document.getElementById(link.getAttribute('href').slice(1));
      if (target) { event.preventDefault(); target.focus(); }
    });
  }

  /* Catalogue: filtering includes product names, processing formats and specifications. */
  const catalogue = JSON.parse($('#catalogue-data').textContent);
  let visible = [...catalogue], selected = 0;
  const deck = $('#catalogue-deck');
  const tabs = $('.category-tabs');
  const search = $('#product-search');
  const fullName = product => product.name + (product.detail ? ` (${product.detail})` : '');
  const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  let queryWords = [];
  const categoryButtons = $$('[data-category]', tabs);
  const categoryCards = $$('[data-card]', deck);
  const categoryPanels = $$('.category-panel');
  const searchIndex = new Map(catalogue.map(category => [category.id, normalize([category.title,category.short,category.summary,category.formats,category.keywords,...category.products.map(fullName)].join(' '))]));
  let activeCategory = '';
  function revealCategoryTab(button) {
    if (tabs.scrollWidth <= tabs.clientWidth) return;
    const left = button.offsetLeft - tabs.offsetLeft;
    if (left < tabs.scrollLeft + 20) tabs.scrollTo({left:Math.max(0,left-20),behavior:reduced.matches?'instant':'smooth'});
    else if (left + button.offsetWidth > tabs.scrollLeft + tabs.clientWidth - 20) tabs.scrollTo({left:left + button.offsetWidth-tabs.clientWidth+20,behavior:reduced.matches?'instant':'smooth'});
  }
  function matchingProducts(category) {
    const found = category.products.filter(product => queryWords.every(word => normalize(fullName(product)).includes(word)));
    return found.length ? found : category.products;
  }
  function selectCategory(index, animatePanel = true) {
    if (!visible.length) return;
    selected = (index + visible.length) % visible.length;
    const category = visible[selected];
    categoryButtons.forEach(button => {
      const chosen = button.dataset.category === category.id;
      button.setAttribute('aria-selected',String(chosen)); button.tabIndex = chosen ? 0 : -1;
    });
    categoryCards.forEach((card, cardIndex) => {
      const product = catalogue[cardIndex];
      const visibleIndex = visible.indexOf(product);
      let position = visibleIndex - selected;
      // Shortest circular route prevents the entire stack sweeping across on wrap.
      if (position > visible.length / 2) position -= visible.length;
      if (position < -visible.length / 2) position += visible.length;
      const onStage = visibleIndex >= 0 && Math.abs(position) <= 1;
      card.style.setProperty('--pos',String(Math.max(-2,Math.min(2,position))));
      card.style.setProperty('--scale',position === 0 ? '1' : '.91');
      card.style.setProperty('--opacity',onStage ? (position === 0 ? '1' : '.75') : '0');
      card.style.setProperty('--z',position === 0 ? '3' : '1');
      card.style.pointerEvents = onStage ? '' : 'none';
      card.tabIndex = position === 0 && onStage ? 0 : -1;
      card.setAttribute('aria-label',`${position === 0?'View details for':'Select'} ${product.title}`);
      card.toggleAttribute('aria-current',position === 0 && onStage);
      if (position === 0 && onStage) card.setAttribute('aria-current','true');
      card.setAttribute('aria-hidden',String(!onStage));
      card.inert = !onStage;
    });
    $('#gallery-count').textContent = `${selected+1} / ${visible.length}`;
    $('#previous-category').disabled = visible.length < 2; $('#next-category').disabled = visible.length < 2;
    categoryPanels.forEach(panel => {
      const chosen = panel.dataset.panel === category.id;
      panel.dataset.active = String(chosen);
      panel.inert = !chosen;
      if (chosen) panel.removeAttribute('aria-hidden'); else panel.setAttribute('aria-hidden','true');
      // Highlight search hits without removing products and changing the layout.
      $$('[data-add-product]',panel).forEach(button => button.classList.toggle('search-match', queryWords.length > 0 && queryWords.every(word => normalize(button.dataset.addProduct).includes(word))));
      if (chosen && activeCategory !== category.id && animatePanel) animate(panel,[{opacity:.65,transform:'translateY(4px)'},{opacity:1,transform:'none'}]);
      else if (!chosen) motions.get(panel)?.cancel();
    });
    activeCategory = category.id;
  }
  function filterCatalogue() {
    const query = search.value.trim(); queryWords = normalize(query).split(/[\s,]+/).filter(Boolean);
    const active = visible[selected]?.id;
    visible = catalogue.filter(category => queryWords.every(word => searchIndex.get(category.id).includes(word)));
    categoryButtons.forEach(button => { button.disabled = !visible.some(category => category.id === button.dataset.category); });
    $('#product-layout').classList.toggle('is-empty',!visible.length); $('#product-layout').inert = !visible.length; $('#product-layout').setAttribute('aria-hidden',String(!visible.length)); $('#empty-state').hidden = !!visible.length;
    $('#empty-query').textContent = `“${query}”`; $('#search-clear').hidden = !query;
    $('#search-status').textContent = query ? `${visible.length} matching ${visible.length===1?'category':'categories'}` : '7 categories to explore';
    selected = Math.max(0,visible.findIndex(category => category.id === active));
    selectCategory(selected,false);
  }
  function clearSearch() { search.value = ''; filterCatalogue(); }
  function chooseId(id) {
    clearSearch(); const index = visible.findIndex(category => category.id === id); if (index >= 0) selectCategory(index);
  }
  function showDrawer(category, trigger) {
    drawerTrigger = trigger || document.activeElement;
    $('#drawer-content').innerHTML = `<img class="drawer-image" src=".${category.image}" width="1536" height="1024" alt="${escape(category.alt)}"><div class="drawer-copy"><p class="eyebrow">The FlyingRoots collection</p><h2 id="drawer-title">${escape(category.title)}</h2><p>${escape(category.summary)}</p><ul class="drawer-products">${category.products.map(product => `<li><button type="button" data-add-product="${escape(fullName(product))}">${escape(fullName(product))}${icon('plus')}</button></li>`).join('')}</ul><div class="spec-copy"><strong>Formats & specifications</strong><p>${escape(category.formats)}</p></div><div class="actions"><button class="button green" type="button" data-drawer-enquire>Enquire about this category</button><button class="button cream" type="button" data-drawer-spec>Request specifications</button></div></div>`;
    drawer.showModal(); syncModalState(); drawer.scrollTop = 0;
    animate(drawer,[{opacity:0,transform:innerWidth<640?'translateY(35px)':'translateX(35px)'},{opacity:1,transform:'none'}],{duration:260});
  }
  search.addEventListener('input',filterCatalogue);
  $('#search-clear').addEventListener('click', () => {clearSearch();search.focus();});
  $('#reset-search').addEventListener('click', () => {clearSearch();search.focus();});
  $('#ask-product').addEventListener('click', () => enquire([search.value.trim()]));
  $('#previous-category').addEventListener('click', () => selectCategory(selected-1));
  $('#next-category').addEventListener('click', () => selectCategory(selected+1));
  tabs.addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (button) selectCategory(visible.findIndex(category => category.id === button.dataset.category)); });
  wireTabs(tabs,'button',button => selectCategory(visible.findIndex(category => category.id === button.dataset.category)));
  deck.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault();selectCategory(selected+(event.key==='ArrowRight'?1:-1));}
  });
  let startX = 0, startY = 0, swiped = false, pointerDown = false;
  deck.addEventListener('pointerdown', event => { if (event.button !== 0) return; startX=event.clientX;startY=event.clientY;swiped=false;pointerDown=true;deck.classList.add('dragging'); });
  deck.addEventListener('pointerup', event => {
    if (!pointerDown) return; pointerDown=false;deck.classList.remove('dragging');
    const x=event.clientX-startX,y=event.clientY-startY;
    if (Math.abs(x)>45 && Math.abs(x)>Math.abs(y)*1.2) {swiped=true;selectCategory(selected+(x<0?1:-1));}
  });
  deck.addEventListener('pointercancel', () => {pointerDown=false;deck.classList.remove('dragging');});
  deck.addEventListener('pointerleave', () => {pointerDown=false;deck.classList.remove('dragging');});
  deck.addEventListener('click', event => {
    if (swiped) {swiped=false;return;}
    const card = event.target.closest('[data-card]'); if (!card) return;
    const category = catalogue[Number(card.dataset.card)], index = visible.indexOf(category);
    if (index < 0) return;
    if (index === selected) showDrawer(category,card); else selectCategory(index);
  });
  document.addEventListener('click', event => {
    const categoryLink = event.target.closest('[data-category-link]'); if (categoryLink) chooseId(categoryLink.dataset.categoryLink);
    const add = event.target.closest('[data-add-product]'); if (add) {enquire([add.dataset.addProduct]);return;}
    if (event.target.closest('[data-add-category],[data-drawer-enquire]')) enquire(matchingProducts(visible[selected]).map(fullName));
    if (event.target.closest('[data-spec-request],[data-drawer-spec]')) enquire(matchingProducts(visible[selected]).map(fullName),true);
    if (event.target.closest('[data-open-details]')) showDrawer(visible[selected],event.target.closest('button'));
  });

  /* Process slideshow pauses offscreen, on hover/focus, when manually selected and for reduced motion. */
  const steps = JSON.parse($('#process-data').textContent);
  let stepIndex = 0, processTimer, processVisible = false, processPaused = reduced.matches, processHovered = false, processFocused = false;
  const processGroup = $('.process-steps'), processLayout = $('.process-layout');
  let processImageRequest = 0;
  const processImages = steps.map(step => {const image = new Image(); image.decoding='async'; image.src=`./images/${step[2]}.webp`; return image;});
  function canCycle() {return steps.length && processVisible && !processPaused && !processHovered && !processFocused && !document.hidden && !reduced.matches;}
  function scheduleProcess() {
    clearTimeout(processTimer);
    if (canCycle()) processTimer = setTimeout(() => {selectStep((stepIndex+1)%steps.length);},5200);
  }
  function processButton() {
    $('#process-pause').innerHTML = icon(processPaused ? 'play' : 'pause');
    $('#process-pause').setAttribute('aria-label',processPaused?'Play process slideshow':'Pause process slideshow');
  }
  function selectStep(index, manual = false) {
    if (!steps.length) return;
    if (manual) processPaused=true;
    if (stepIndex === index) {processButton();scheduleProcess();return;}
    stepIndex=index;
    $$('[data-step]').forEach(button => {const active=Number(button.dataset.step)===index;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    $('#process-panel').setAttribute('aria-labelledby',`step-${index}`);
    const image = $('.process-photo');
    const request = ++processImageRequest;
    const nextImage = processImages[index];
    const showImage = () => {
      if (request !== processImageRequest) return;
      image.src = nextImage.src; image.alt=steps[index][0]+' — FlyingRoots ingredient and trade photography';
      animate(image,[{opacity:.8},{opacity:1}]);
    };
    if (nextImage.complete && nextImage.naturalWidth) showImage();
    else nextImage.decode().then(showImage).catch(() => {});
    $('#process-name').textContent=steps[index][0]; $('#process-count').textContent=`0${index+1} / 05`;

    processButton();scheduleProcess();
  }
  $$('[data-step]').forEach(button => button.addEventListener('click', () => selectStep(Number(button.dataset.step),true)));
  wireTabs(processGroup,'button',button => selectStep(Number(button.dataset.step),true),true);
  $('#process-pause').addEventListener('click', () => {processPaused=!processPaused;processButton();scheduleProcess();});
  processLayout.addEventListener('pointerenter', () => {processHovered=true;scheduleProcess();});
  processLayout.addEventListener('pointerleave', () => {processHovered=false;scheduleProcess();});
  processLayout.addEventListener('focusin', () => {processFocused=true;scheduleProcess();});
  processLayout.addEventListener('focusout', event => {if(!processLayout.contains(event.relatedTarget)){processFocused=false;scheduleProcess();}});
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {processVisible=entry.isIntersecting;scheduleProcess();},{threshold:.25}).observe(processLayout);
  else processVisible=true;
  reduced.addEventListener('change', () => {if(reduced.matches)processPaused=true;processButton();scheduleProcess();});
  document.addEventListener('visibilitychange', () => {syncVideo();scheduleProcess();});

  selectCategory(0,false);
  processButton();
  scheduleProcess();
})();

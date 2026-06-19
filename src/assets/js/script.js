// Toggle chip active state
function toggleChip(inputEl) {
  const label = inputEl.closest('.chip');
  if (!label) return;
  label.classList.toggle('active', inputEl.checked);
  filterClasses();
}

// Filter classes based on selected filters
function filterClasses() {
  const dayFilters = Array.from(document.querySelectorAll('.day-filter:checked')).map(cb => cb.value);
  const gradeFilters = Array.from(document.querySelectorAll('.grade-filter:checked')).map(cb => cb.value);
  const subjectFilters = Array.from(document.querySelectorAll('.subject-filter:checked')).map(cb => cb.value);
  const scheduleFilters = Array.from(document.querySelectorAll('.schedule-filter:checked')).map(cb => cb.value);
  const durationFilters = Array.from(document.querySelectorAll('.duration-filter:checked')).map(cb => cb.value);

  // Split data attribute by '#' and drop empty strings so that
  // missing/empty tags yield an empty array instead of [""]
  function parseTags(attr) {
    return (attr || '').toLowerCase().split('#').filter(function(t) { return t !== ''; });
  }

  const classes = document.querySelectorAll('div[id^="class-"]');
  classes.forEach(classCard => {
    const dayTags = parseTags(classCard.getAttribute('data-day'));
    const gradeTags = parseTags(classCard.getAttribute('data-grade'));
    const subjectTags = parseTags(classCard.getAttribute('data-subject'));
    const scheduleTags = parseTags(classCard.getAttribute('data-schedule'));
    const durationTags = parseTags(classCard.getAttribute('data-duration'));

    // A card matches a filter category when:
    //   - no filters are checked for that category, OR
    //   - the card has no tags for that category (treat as uncategorised → always visible), OR
    //   - at least one checked filter value appears in the card's tags
    const isDayMatch = !dayFilters.length || !dayTags.length || dayFilters.some(filter => dayTags.includes(filter));
    const isGradeMatch = !gradeFilters.length || !gradeTags.length || gradeFilters.some(filter => gradeTags.includes(filter));
    const isSubjectMatch = !subjectFilters.length || !subjectTags.length || subjectFilters.some(filter => subjectTags.includes(filter));
    const isScheduleMatch = !scheduleFilters.length || !scheduleTags.length || scheduleFilters.some(filter => scheduleTags.includes(filter));
    const isDurationMatch = !durationFilters.length || !durationTags.length || durationFilters.some(filter => durationTags.includes(filter));

    classCard.style.display = (isDayMatch && isGradeMatch && isSubjectMatch && isScheduleMatch && isDurationMatch) ? '' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', filterClasses);

// ---------------------------------------------------------------------------
// META Data Helpers
// ---------------------------------------------------------------------------

// Meta / GTM require PII (personally identifiable info) to be hashed
// before it reaches the dataLayer. Input is trimmed + lowercased per Meta
async function sha256hex(str) {
  if (!str) return undefined;
  const normalised = str.trim().toLowerCase();
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalised));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a unique event ID. The SAME id must be sent to both the browser
// Pixel (fbq eventID) and the server CAPI call so Meta can deduplicate the
// two copies of the same event. the fallback covers older/insecure-context cases.
function generateEventId() {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch (e) {}
  return 'eid-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

// Read a cookie value by name; returns null if not found.
function getCookie(name) {
  // Escape regex-special characters in the cookie name
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// Derive _fbc from the URL's fbclid param, e.g. https://example.com/?fbclid=...
// Persists it as a cookie so later pages keep the click ID.
function getFbcFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get('fbclid');
    if (!fbclid) return null;

    // Format required by Meta: version.subdomainIndex.creationTime.<fbclid>
    // Unix in milliseconds
    const fbc = 'fb.1.' + Date.now() + '.' + fbclid;
    document.cookie = '_fbc=' + fbc + '; path=/; max-age=' + (90 * 24 * 60 * 60) + '; SameSite=Lax';
    return fbc;
  } catch (e) { return null; }
}

// Collect Meta click identifiers from cookies / URL. Both may be undefined.
function getMetaClickIds() {
  return {
    fbp: getCookie('_fbp') || undefined,
    fbc: getCookie('_fbc') || getFbcFromUrl() || undefined,
  };
}

// Hash whichever PII fields are supplied; returns { em, ph, fn, ln } subset.
async function hashUserData({ email, phone, firstName, lastName } = {}) {
  const [em, ph, fn_, ln] = await Promise.all([
    sha256hex(email),
    sha256hex(phone ? phone.replace(/\D/g, '') : undefined),
    sha256hex(firstName),
    sha256hex(lastName),
  ]);
  const result = {};
  if (em)  result.em = em;
  if (ph)  result.ph = ph;
  if (fn_) result.fn = fn_;
  if (ln)  result.ln = ln;
  return result;
}

// ---------------------------------------------------------------------------
// FORM OPTION HELPERS (camps / classes)
// ---------------------------------------------------------------------------

function get_radio_selected(formId, name) {
  const form = document.getElementById(formId);
  if (!form) {
    console.error(`Form with ID "${formId}" not found.`);
    return "None";
  }
  const radioButtons = form.querySelectorAll(`input[type="radio"][name="${name}"]`);
  let value = "None";
  for (const radioButton of radioButtons) {
    if (radioButton.checked) {
      value = radioButton.value;
      break;
    }
  }
  return value;
}

function get_camp_options(id) {
  let camp_type = get_radio_selected("camp-" + id, "type-" + id);
  let payment_type = get_radio_selected("camp-" + id, "payment-" + id);
  if (payment_type === "None") payment_type = "Now";
  if (camp_type === "None") camp_type = "Full-Day";
  return { "Payment Type": payment_type, "Type": camp_type };
}

function get_class_options(id) {
  const payment_type = get_radio_selected("class-" + id, "payment-" + id);
  return { "Session": payment_type };
}

// ---------------------------------------------------------------------------
// ECWID -> GTM / dataLayer
// ---------------------------------------------------------------------------

function ecwid2gtm() {
  if (window.__ecwidToGtm) return;
  window.__ecwidToGtm = true;
  window.dataLayer = window.dataLayer || [];

  // Persistent snapshot of the last known cart (for add/remove deltas)
  var __brb_prevCart = null;

  // Push an event to the dataLayer, enriching every payload with Meta click IDs
  // and a unique event_id for Pixel and CAPI dedupe.
  // Pass hashed `userPii` to attach user_data. Returns the event_id for reuse
  function pushEvent(name, detail, userPii, fixedEventId) {
    const { fbp, fbc } = getMetaClickIds();
    const eventId = fixedEventId || generateEventId();

    const metaIds = { event_id: eventId };
    if (fbp) metaIds.fbp = fbp;
    if (fbc) metaIds.fbc = fbc;

    const payload = Object.assign({ event: name }, detail || {}, metaIds);
    if (userPii && Object.keys(userPii).length) {
      payload.user_data = userPii;
    }
    window.dataLayer.push(payload);
    // Legacy duplicate push kept for backward-compat with existing GTM triggers
    // window.dataLayer.push({ event: name, ecwid_event_detail: detail || {} });

    return eventId;
  }

  function toGa4Item(p) {
    const id = p?.sku ?? p?.id ?? p?.productId ?? '';
    const name = p?.name ?? p?.product?.name ?? '';
    // Ecwid sometimes keeps price at p.price; sometimes p.product.price
    const price = Number(p?.price ?? p?.product?.price ?? 0);
    const qty = Number(p?.quantity ?? 1);
    const variant = (p?.selectedOptions || []).map(o => o.name + ': ' + o.value).join(', ');
    return { item_id: String(id), item_name: String(name), quantity: qty, price, item_variant: variant };
  }

  function getCurrency() {
    try { return Ecwid?.getCurrency?.().currency || 'USD'; } catch (e) { return 'USD'; }
  }

  function clearEcommerce() { window.dataLayer.push({ ecommerce: null }); }

  function lineKey(it) {
    const id = it?.id ?? it?.productId ?? it?.sku ?? '';
    const sku = it?.sku ?? '';
    const opts = (it?.selectedOptions || []).map(o => (o.name || '') + '=' + (o.value || '')).join('|');
    return String(id) + '|' + String(sku) + '|' + opts;
  }

  // Convert a cart to a map of lineKey -> quantity
  function cartQtyMap(cart) {
    var map = {};
    var items = (cart && cart.items) ? cart.items : [];
    for (var i = 0; i < items.length; i++) {
      var k = lineKey(items[i]);
      map[k] = (map[k] || 0) + Number(items[i].quantity || 0);
    }
    return map;
  }

  // Find the first matching line by key in a cart
  function findByKey(cart, key) {
    var items = (cart && cart.items) ? cart.items : [];
    for (var i = 0; i < items.length; i++) {
      if (lineKey(items[i]) === key) return items[i];
    }
    return null;
  }

  // Resolve once a given path exists, or null after maxMs
  function waitFor(pathGetter, maxMs = 8000, intervalMs = 100) {
    return new Promise(resolve => {
      const start = Date.now();
      (function tick() {
        let val;
        try { val = pathGetter(); } catch (e) {}
        if (val) return resolve(val);
        if (Date.now() - start >= maxMs) return resolve(null);
        setTimeout(tick, intervalMs);
      })();
    });
  }

  // Fetch the logged-in Ecwid customer and return hashed PII (or {} for guests)
  async function getCustomerPii() {
    try {
      const profile = await new Promise(res => {
        if (Ecwid?.Customer?.get) Ecwid.Customer.get(res);
        else res(null);
      });
      if (profile?.email) {
        const name = profile.billingPerson?.name || '';
        return await hashUserData({
          email: profile.email,
          phone: profile.billingPerson?.phone,
          firstName: name.split(' ')[0],
          lastName: name.split(' ').slice(1).join(' '),
        });
      }
    } catch (e) {}
    return {};
  }

  async function bindEcwid() {
    const ecwid = await waitFor(() => window.Ecwid);
    if (!ecwid) return; // Ecwid not present in this context

    // Seed the previous-cart snapshot once at start
    if (Ecwid.Cart?.get) {
      try {
        Ecwid.Cart.get(function(cart) {
          __brb_prevCart = cart ? JSON.parse(JSON.stringify(cart)) : null;
        });
      } catch (e) {}
    }

    // -----------------------------------------------------------------------
    // Cart changed -> add_to_cart / remove_from_cart (with customer PII)
    // -----------------------------------------------------------------------
    const onCartChanged = await waitFor(() => Ecwid.OnCartChanged && Ecwid.OnCartChanged.add);
    if (onCartChanged) {
      Ecwid.OnCartChanged.add(async function(cart) {
        var oldCart = __brb_prevCart ? JSON.parse(JSON.stringify(__brb_prevCart)) : null;
        // Overwrite the snapshot immediately with the new cart
        __brb_prevCart = cart ? JSON.parse(JSON.stringify(cart)) : null;
        if (!oldCart) return; // nothing to compare yet

        var prevMap = cartQtyMap(oldCart);
        var currMap = cartQtyMap(cart);
        var addedLines = [];
        var removedLines = [];

        // Additions / increases
        Object.keys(currMap).forEach(function(k) {
          var delta = (currMap[k] || 0) - (prevMap[k] || 0);
          if (delta > 0) {
            var base = findByKey(cart, k) || findByKey(oldCart, k) || {};
            addedLines.push(Object.assign({}, base, { quantity: delta }));
          }
        });

        // Removals / decreases
        Object.keys(prevMap).forEach(function(k) {
          var delta = (prevMap[k] || 0) - (currMap[k] || 0);
          if (delta > 0) {
            var base = findByKey(oldCart, k) || findByKey(cart, k) || {};
            removedLines.push(Object.assign({}, base, { quantity: delta }));
          }
        });

        const customerPii = await getCustomerPii();

        if (addedLines.length) {
          var itemsA = addedLines.map(toGa4Item);
          var valueA = addedLines.reduce((s, it) => s + Number(it.price ?? it.product?.price ?? 0) * Number(it.quantity || 1), 0);
          pushEvent('brb_add_to_cart', {
            ecommerce: {
              currency: (cart?.cost && cart.cost.currency) || cart?.currency || getCurrency(),
              value: +valueA.toFixed(2),
              items: itemsA,
            },
          }, customerPii);
          clearEcommerce();
        }

        if (removedLines.length) {
          var itemsR = removedLines.map(toGa4Item);
          var valueR = removedLines.reduce((s, it) => s + Number(it.price ?? it.product?.price ?? 0) * Number(it.quantity || 1), 0);
          pushEvent('brb_remove_from_cart', {
            ecommerce: {
              currency: (cart?.cost && cart.cost.currency) || cart?.currency || getCurrency(),
              value: +valueR.toFixed(2),
              items: itemsR,
            },
          }, customerPii);
          clearEcommerce();
        }
      });
    }

    // -----------------------------------------------------------------------
    // Page-level events. OnPageLoaded returns a page; the switch handles each
    // page type. Up to date with Ecwid as of 06/15/26.
    // -----------------------------------------------------------------------
    const onPageLoaded = await waitFor(() => Ecwid.OnPageLoaded && Ecwid.OnPageLoaded.add);
    if (!onPageLoaded) {
      console.error('Ecwid.OnPageLoaded is not available');
      return;
    }

    Ecwid.OnPageLoaded.add(function(page) {
      switch (page.type) {
        case 'SIGN_IN':
          pushEvent('brb_sign_in', {});
          break;
        case 'ACCOUNT_SETTINGS':
          pushEvent('brb_account_settings', {});
          break;
        case 'ORDERS':
          pushEvent('brb_orders', {});
          break;
        case 'ACCOUNT_SUBSCRIPTION':
          pushEvent('brb_account_subscription', {});
          break;
        case 'ADDRESS_BOOK':
          pushEvent('brb_address_book', {});
          break;
        case 'FAVORITES':
          pushEvent('brb_favorites', {});
          break;
        case 'RESET_PASSWORD':
          pushEvent('brb_reset_password', {});
          break;
        case 'CATEGORY':
          pushEvent('brb_category_loaded', {
            category_id: page.categoryId,
            category_name: page.name,
          });
          break;
        case 'PRODUCT':
          pushEvent('brb_view_item', {
            ecommerce: {
              currency: getCurrency(),
              items: [{ item_id: String(page.productId), item_name: String(page.name || '') }],
            },
          });
          clearEcommerce();
          break;
        case 'SEARCH':
          pushEvent('brb_search', { query: page.query || '' });
          break;
        case 'CART':
          pushEvent('brb_cart_viewed', {});
          break;
        case 'CHECKOUT_ADDRESS':
        case 'CHECKOUT_DELIVERY':
        case 'CHECKOUT_ADDRESS_BOOK':
          pushEvent('brb_checkout_step', { step: page.type });
          break;
        case 'CHECKOUT_PAYMENT_DETAILS':
          pushEvent('brb_payment_details', {});
          break;
        case 'ORDER_CONFIRMATION':
          pushEvent('brb_order_confirmation', {});
          break;
        case 'ORDER_FAILURE':
          pushEvent('brb_order_failure', {});
          break;
        case 'DOWNLOADS_ERROR':
          pushEvent('brb_downloads_error', {});
          break;
        default:
          // Unhandled page type
          break;
      }
    });

    // -----------------------------------------------------------------------
    // Purchase has the richest PII signal. Hash everything available.
    // If a pixel is fired, it must have the same event_id so that
    // deduplication occurs correctly 
    // -----------------------------------------------------------------------
    const onOrderPlaced = await waitFor(() => Ecwid.OnOrderPlaced && Ecwid.OnOrderPlaced.add);
    if (onOrderPlaced) {
      Ecwid.OnOrderPlaced.add(async function(order) {
        const items = (order?.items || []).map(it => ({
          item_id: String(it.sku || it.productId || ''),
          item_name: String(it.name || ''),
          quantity: Number(it.quantity || 1),
          price: Number(it.price || 0),
        }));

        // Ecwid populates billingPerson on the order object
        const billing = order?.billingPerson || {};
        const nameParts = (billing.name || '').trim().split(/\s+/);
        const userPii = await hashUserData({
          email: order?.email || billing.email,
          phone: billing.phone,
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' '),
        });

        // Use transaction ID as event_id unless its missing, then 
        // default to generating a unique one
        const txnId = String(order?.orderNumber || order?.id || '');
        const eventId = pushEvent('brb_purchase', {
          ecommerce: {
            currency: order?.currency || getCurrency(),
            transaction_id: txnId,
            value: Number(order?.total || 0),
            shipping: Number(order?.shippingCost || 0),
            tax: Number(order?.tax || 0),
            items,
          },
          order_raw: order,
        }, userPii, txnId);

        // Uncomment for firing browser side Pixel 
        // if (window.fbq) {
        //   fbq('track', 'Purchase', {
        //     value: Number(order?.total || 0),
        //     currency: order?.currency || getCurrency(),
        //   }, { eventID: eventId });
        // }

        clearEcommerce();
      });
    }
  }

  // Bind on every available readiness signal to avoid race conditions
  document.addEventListener('DOMContentLoaded', bindEcwid);
  document.addEventListener('ecwid-ready', bindEcwid);
  if (window.Ecwid?.OnAPILoaded?.add) {
    try { Ecwid.OnAPILoaded.add(bindEcwid); } catch (e) {}
  }
  // Also kick off immediately
  bindEcwid();
}
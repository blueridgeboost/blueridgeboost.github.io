// Toggle chip active state
  function toggleChip(inputEl) {
    const label = inputEl.closest('.chip');
    if (!label) return;

    // Toggle checkbox checked state
    label.classList.toggle('active', inputEl.checked);

    // Trigger filtering
    filterClasses();
  }

  // Filter classes based on selected filters
  function filterClasses() {
    const dayFilters = Array.from(document.querySelectorAll('.day-filter:checked')).map(cb => cb.value);
    const gradeFilters = Array.from(document.querySelectorAll('.grade-filter:checked')).map(cb => cb.value);
    const subjectFilters = Array.from(document.querySelectorAll('.subject-filter:checked')).map(cb => cb.value);
    const scheduleFilters = Array.from(document.querySelectorAll('.schedule-filter:checked')).map(cb => cb.value);
    const durationFilters = Array.from(document.querySelectorAll('.duration-filter:checked')).map(cb => cb.value);

    const classes = document.querySelectorAll('div[id^="class-"]');
    classes.forEach(classCard => {
      const dayTags = classCard.getAttribute('data-day').toLowerCase().split('#');
      const gradeTags = classCard.getAttribute('data-grade').toLowerCase().split('#');
      const subjectTags = classCard.getAttribute('data-subject').toLowerCase().split('#');
      const scheduleTags = classCard.getAttribute('data-schedule').toLowerCase().split('#');
      const durationTags = classCard.getAttribute('data-duration').toLowerCase().split('#');

      const isDayMatch = !dayFilters.length || dayFilters.some(filter => dayTags.includes(filter));
      const isGradeMatch = !gradeFilters.length || gradeFilters.some(filter => gradeTags.includes(filter));
      const isSubjectMatch = !subjectFilters.length || subjectFilters.some(filter => subjectTags.includes(filter));
      const isScheduleMatch = !scheduleFilters.length || scheduleFilters.some(filter => scheduleTags.includes(filter));
      const isDurationMatch = !durationFilters.length || durationFilters.some(filter => durationTags.includes(filter));

      if (isDayMatch && isGradeMatch && isSubjectMatch && isScheduleMatch && isDurationMatch) {
        classCard.style.display = '';
      } else {
        classCard.style.display = 'none';
      }
    });
  }
  
document.addEventListener('DOMContentLoaded', filterClasses);

// function ecwid_add_product_to_cart( product_id, product_options ) {
//     if (typeof Ecwid == 'undefined' ||  !Ecwid.Cart) {
//         Ecwid.OnAPILoaded.add(function () {
//             aux_ecwid_add_product_to_cart(product_id, product_options);
//         });
//     } else {
//         aux_ecwid_add_product_to_cart(product_id, product_options);
//     }
// }

// function aux_ecwid_add_product_to_cart( product_id, product_options ) {
//     Ecwid.Cart.addProduct({
//         id: product_id,
//         quantity: 1,
//         options: product_options,
//         // categoryIds: [category_id],
//         // defaultCategoryId: category_id,
//         // recurringChargeSettings: undefined,
//         callback(success, product, cart, error) {
//           if (success) {
//             Ecwid.openPage('cart');
//           } else {
//             console.error(error); // error message or null
//           }
//         },
//       });
// }

// function ecwid_add_subscription_to_cart( product_id ) {
//     if (typeof Ecwid == 'undefined' ||  !Ecwid.Cart) {
//         Ecwid.OnPageLoaded.add(function () {
//             aux_ecwid_add_subscription_to_cart(product_id);
//         });
//     } else {
//         aux_ecwid_add_subscription_to_cart(product_id);
//     }
// }

// function aux_ecwid_add_subscription_to_cart( product_id, product_options ) {
//     Ecwid.Cart.addProduct({
//         id: product_id,
//         quantity: 1,   
//         options: product_options, 
//         recurringChargeSettings: { 
//             recurringInterval: "month",
//             recurringIntervalCount: 1,
//             },
//         callback: function(success, product, cart, error){
//             if (!success) {
//                 console.error(error) // error message or null
//             }
//         }
//     });
//     Ecwid.openPage('cart');
// }

function get_radio_selected( formId, name) {
    const form = document.getElementById(formId);
    if (!form) {
        console.error(`Form with ID "${formId}" not found.`);
        return "None";
    }
    // Use querySelectorAll to find all radio buttons with the given name within the form.
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
    camp_type = get_radio_selected( "camp-"+id,"type-"+id);
    payment_type = get_radio_selected("camp-"+id, "payment-"+id);
    if (payment_type == "None") {
        payment_type = "Now";
    }
    if (camp_type == "None") {
        camp_type = "Full-Day";
    }
    var ret_value = {
        "Payment Type": payment_type,
        "Type": camp_type,
    };
    return ret_value;
}

function get_class_options(id) {
    payment_type = get_radio_selected( "class-"+id, "payment-"+id);
    var ret_value = {
        "Session": payment_type,
    };
    return ret_value;
}


function ecwid2gtm() {
  if (window.__ecwidToGtm) return;
  window.__ecwidToGtm = true;
  window.dataLayer = window.dataLayer || [];
  // Persistent snapshot of the last known cart
  var __brb_prevCart = null;

  function pushEvent(name, detail) {
    var payload = Object.assign({ event: name }, detail || {});
    window.dataLayer.push(payload);
    window.dataLayer.push({ event: name, ecwid_event_detail: detail || {} });
  }

  function toItem(p) {
    // Keep original helper used in your other events
    const id = p?.sku ?? p?.id ?? p?.productId ?? '';
    const name = p?.name ?? p?.product?.name ?? '';
    const price = Number(p?.price ?? p?.product?.price ?? 0);
    const qty = Number(p?.quantity ?? 1);
    return {
      item_id: String(id),
      item_name: String(name),
      quantity: qty,
      price: price
    };
  }

  function toGa4Item(p) {
    const id = p?.sku ?? p?.id ?? p?.productId ?? '';
    const name = p?.name ?? p?.product?.name ?? '';
    // Ecwid sometimes keeps price at p.price; sometimes p.product.price
    const price = Number(
      p?.price ??
      p?.product?.price ??
      0
    );
    const qty = Number(p?.quantity ?? 1);
    const variant = (p?.selectedOptions || []).map(o => o.name + ': ' + o.value).join(', ');
    return {
      item_id: String(id),
      item_name: String(name),
      quantity: qty,
      price: price,
      item_variant: variant
    };
  }

  function getCurrency() {
    try { return Ecwid?.getCurrency?.().currency || 'USD'; } catch(e){ return 'USD'; }
  }

  function clearEcommerce(){ window.dataLayer.push({ ecommerce: null }); }

  function lineKey(it){
    const id = it?.id ?? it?.productId ?? it?.sku ?? '';
    const sku = it?.sku ?? '';
    const opts = (it?.selectedOptions || []).map(o => (o.name||'') + '=' + (o.value||'')).join('|');
    return String(id) + '|' + String(sku) + '|' + opts;
  }


  // Convert a cart to a map key -> quantity
  function cartQtyMap(cart){
    var map = {};
    var items = (cart && cart.items) ? cart.items : [];
    for (var i=0;i<items.length;i++){
      var k = lineKey(items[i]);
      var q = Number(items[i].quantity || 0);
      map[k] = (map[k] || 0) + q;
    }
    return map;
  }

  // Find the first matching line by key in a cart
  function findByKey(cart, key){
    var items = (cart && cart.items) ? cart.items : [];
    for (var i=0;i<items.length;i++){
      if (lineKey(items[i]) === key) return items[i];
    }
    return null;
  }

  // Waiter that resolves when a given path exists
  function waitFor(pathGetter, maxMs = 8000, intervalMs = 100) {
    return new Promise(resolve => {
      const start = Date.now();
      (function tick(){
        let val;
        try { val = pathGetter(); } catch(e) {}
        if (val) return resolve(val);
        if (Date.now() - start >= maxMs) return resolve(null);
        setTimeout(tick, intervalMs);
      })();
    });
  }

  async function bindEcwid() {
    const ecwid = await waitFor(() => window.Ecwid);
    if (!ecwid) return; // Ecwid not present in this context

    // // Optionally listen if available (not all stores expose OnAddToCart)
    // const addToCart = await waitFor(() => Ecwid.OnAddToCart && Ecwid.OnAddToCart.add);
    // if (addToCart) {
    //   Ecwid.OnAddToCart.add(function(product){
    //     const item = toItem(product);
    //     pushEvent('brb_add_to_cart', {
    //       ecommerce: { currency: getCurrency(), value: +(item.price * item.quantity).toFixed(2), items: [item] }
    //     });
    //     clearEcommerce();
    //   });
    // }

    // Initialize previous cart snapshot once at start
    if (Ecwid.Cart?.get) {
      try {
        Ecwid.Cart.get(function(cart){
          __brb_prevCart = cart ? JSON.parse(JSON.stringify(cart)) : null;
        });
      } catch(e){}
    }

    const onCartChanged = await waitFor(() => Ecwid.OnCartChanged && Ecwid.OnCartChanged.add);
if (onCartChanged) {
  Ecwid.OnCartChanged.add(function(cart){
    // Take a local copy of the previous cart at the start
    var oldCart = __brb_prevCart ? JSON.parse(JSON.stringify(__brb_prevCart)) : null;

    // Overwrite the global snapshot immediately with the new cart
    __brb_prevCart = cart ? JSON.parse(JSON.stringify(cart)) : null;

    // If there was no previous cart, nothing to compare yet
    if (!oldCart) {
      return;
    }

    // Build qty maps
    var prevMap = cartQtyMap(oldCart);
    var currMap = cartQtyMap(cart);

    // Compute adds and removals as deltas
    var addedLines = [];
    var removedLines = [];

    // Additions/increases
    Object.keys(currMap).forEach(function(k){
      var delta = (currMap[k] || 0) - (prevMap[k] || 0);
      if (delta > 0) {
        var base = findByKey(cart, k) || findByKey(oldCart, k) || {};
        var line = Object.assign({}, base, { quantity: delta });
        addedLines.push(line);
      }
    });

    // Removals/decreases
    Object.keys(prevMap).forEach(function(k){
      var delta = (prevMap[k] || 0) - (currMap[k] || 0);
      if (delta > 0) {
        var base = findByKey(oldCart, k) || findByKey(cart, k) || {};
        var line = Object.assign({}, base, { quantity: delta });
        removedLines.push(line);
      }
    });

    // Push add_to_cart if needed
    if (addedLines.length) {
      var itemsA = addedLines.map(toGa4Item);
      var valueA = addedLines.reduce((s, it) => s + Number(it.price ?? it.product?.price ?? 0) * Number(it.quantity || 1), 0);
      alert('add_to_cart');
      pushEvent('brb_add_to_cart', {
        ecommerce: {
          currency: (cart?.cost && cart.cost.currency) || cart?.currency || getCurrency(),
          value: +valueA.toFixed(2),
          items: itemsA
        }
      });
      clearEcommerce();
    }

    // Push remove_from_cart if needed
    if (removedLines.length) {
      var itemsR = removedLines.map(toGa4Item);
      var valueR = removedLines.reduce((s, it) => s + Number(it.price ?? it.product?.price ?? 0) * Number(it.quantity || 1), 0);
      pushEvent('brb_remove_from_cart', {
        ecommerce: {
          currency: (cart?.cost && cart.cost.currency) || cart?.currency || getCurrency(),
          value: +valueR.toFixed(2),
          items: itemsR
        }
      });
      clearEcommerce();
    }
  });
}

    const onProductViewed = await waitFor(() => Ecwid.OnProductViewed && Ecwid.OnProductViewed.add);
    if (onProductViewed) {
      Ecwid.OnProductViewed.add(function(product){
        pushEvent('brb_view_item', { ecommerce: { currency: getCurrency(), items: [toItem(product)] } });
        clearEcommerce();
      });
    }

    const onCategoryLoaded = await waitFor(() => Ecwid.OnCategoryLoaded && Ecwid.OnCategoryLoaded.add);
    if (onCategoryLoaded) {
      Ecwid.OnCategoryLoaded.add(function(category){
        pushEvent('brb_category_loaded', { category });
      });
    }

    const onCheckoutStep = await waitFor(() => Ecwid.OnCheckoutStepChanged && Ecwid.OnCheckoutStepChanged.add);
    if (onCheckoutStep) {
      Ecwid.OnCheckoutStepChanged.add(function(step){
        pushEvent('brb_checkout_step', { step });
      });
    }

    const onOrderPlaced = await waitFor(() => Ecwid.OnOrderPlaced && Ecwid.OnOrderPlaced.add);
    if (onOrderPlaced) {
      Ecwid.OnOrderPlaced.add(function(order){
        const items = (order?.items || []).map(it => ({
          item_id: String(it.sku || it.productId || ''),
          item_name: String(it.name || ''),
          quantity: Number(it.quantity || 1),
          price: Number(it.price || 0)
        }));
        pushEvent('brb_purchase', {
          ecommerce: {
            currency: order?.currency || getCurrency(),
            transaction_id: String(order?.orderNumber || order?.id || ''),
            value: Number(order?.total || 0),
            shipping: Number(order?.shippingCost || 0),
            tax: Number(order?.tax || 0),
            items
          },
          order_raw: order
        });
        clearEcommerce();
      });
    }
  }

  // Try various readiness signals, plus async wait
  document.addEventListener('DOMContentLoaded', bindEcwid);
  document.addEventListener('ecwid-ready', bindEcwid);
  if (window.Ecwid?.OnAPILoaded?.add) {
    try { Ecwid.OnAPILoaded.add(bindEcwid); } catch(e){}
  }
  // Also kick off immediately
  bindEcwid();
}
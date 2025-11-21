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

// function ecwid2gtm() {
    
//     if (window.__ecwidToGtm) return;
    
//     window.__ecwidToGtm = true;
    
//     window.dataLayer = window.dataLayer || [];
    
//     function pushEvent(name, detail) {
        
//         window.dataLayer.push(Object.assign({ event: name }, detail || {}));
        
//         window.dataLayer.push({ event: 'ecwid_event', ecwid_event_name: name, ecwid_event_detail: detail || {} });
        
//     }
    
//     function toItem(p) {
        
//         return {
            
//             item_id: String(p?.sku || p?.id || ''),
            
//             item_name: String(p?.name || ''),
            
//             quantity: Number(p?.quantity || 1),
            
//             price: Number(p?.price || 0)
            
//         };
        
//     }
    
//     function getCurrency() {
        
//         try { return Ecwid?.getCurrency?.().currency || 'USD'; } catch(e){ return 'USD'; }
        
//     }
    
//     function clearEcommerce(){ window.dataLayer.push({ ecommerce: null }); }
    
//     // Waiter that resolves when a given path exists
    
//     function waitFor(pathGetter, maxMs = 8000, intervalMs = 100) {
        
//         return new Promise(resolve => {
            
//             const start = Date.now();
            
//             (function tick(){
                
//                 let val;
                
//                 try { val = pathGetter(); } catch(e) {}
                
//                 if (val) return resolve(val);
                
//                 if (Date.now() - start >= maxMs) return resolve(null);
                
//                 setTimeout(tick, intervalMs);
                
//             })();
            
//         });
        
//     }
    
//     async function bindEcwid() {
        
//         const ecwid = await waitFor(() => window.Ecwid);
        
//         if (!ecwid) return; // Ecwid not present in this context (likely parent page)
        
//         // Bind each hook only if it exists
        
//         const addToCart = await waitFor(() => Ecwid.OnAddToCart && Ecwid.OnAddToCart.add);
        
//         if (addToCart) {
            
//             Ecwid.OnAddToCart.add(function(product){
                
//                 const item = toItem(product);
                
//                 pushEvent('add_to_cart', {
                    
//                     ecommerce: { currency: getCurrency(), value: +(item.price * item.quantity).toFixed(2), items: [item] }
                    
//                 });
                
//                 clearEcommerce();
                
//             });
            
//         }
        
//         const onCartChanged = await waitFor(() => Ecwid.OnCartChanged && Ecwid.OnCartChanged.add);
        
//         if (onCartChanged) {
            
//             Ecwid.OnCartChanged.add(function(cart){
                
//                 pushEvent('ecwid_cart_changed', { cart });
                
//             });
            
//         }
        
//         const onProductViewed = await waitFor(() => Ecwid.OnProductViewed && Ecwid.OnProductViewed.add);
        
//         if (onProductViewed) {
            
//             Ecwid.OnProductViewed.add(function(product){
                
//                 pushEvent('view_item', { ecommerce: { currency: getCurrency(), items: [toItem(product)] } });
                
//                 clearEcommerce();
                
//             });
            
//         }
        
//         const onCategoryLoaded = await waitFor(() => Ecwid.OnCategoryLoaded && Ecwid.OnCategoryLoaded.add);
        
//         if (onCategoryLoaded) {
            
//             Ecwid.OnCategoryLoaded.add(function(category){
                
//                 pushEvent('ecwid_category_loaded', { category });
                
//             });
            
//         }
        
//         const onCheckoutStep = await waitFor(() => Ecwid.OnCheckoutStepChanged && Ecwid.OnCheckoutStepChanged.add);
        
//         if (onCheckoutStep) {
            
//             Ecwid.OnCheckoutStepChanged.add(function(step){
                
//                 pushEvent('ecwid_checkout_step', { step });
                
//             });
            
//         }
        
//         const onOrderPlaced = await waitFor(() => Ecwid.OnOrderPlaced && Ecwid.OnOrderPlaced.add);
        
//         if (onOrderPlaced) {
            
//             Ecwid.OnOrderPlaced.add(function(order){
                
//                 const items = (order?.items || []).map(it => ({
                    
//                     item_id: String(it.sku || it.productId || ''),
                    
//                     item_name: String(it.name || ''),
                    
//                     quantity: Number(it.quantity || 1),
                    
//                     price: Number(it.price || 0)
                    
//                 }));
                
//                 pushEvent('purchase', {
                    
//                     ecommerce: {
                        
//                         currency: order?.currency || getCurrency(),
                        
//                         transaction_id: String(order?.orderNumber || order?.id || ''),
                        
//                         value: Number(order?.total || 0),
                        
//                         shipping: Number(order?.shippingCost || 0),
                        
//                         tax: Number(order?.tax || 0),
                        
//                         items
                        
//                     },
                    
//                     order_raw: order
                    
//                 });
                
//                 clearEcommerce();
                
//             });
            
//         }
        
//     }
    
//     // Try various readiness signals, plus async wait
    
//     document.addEventListener('DOMContentLoaded', bindEcwid);
    
//     document.addEventListener('ecwid-ready', bindEcwid);
    
//     if (window.Ecwid?.OnAPILoaded?.add) {
        
//         // Some builds expose this signal
        
//         try { Ecwid.OnAPILoaded.add(bindEcwid); } catch(e){}
        
//     }
    
//     // Also kick off immediately
    
//     bindEcwid();
    
// }

function ecwid2gtm() {
    
    if (window.__ecwidToGtm) return;
    
    window.__ecwidToGtm = true;
    
    window.dataLayer = window.dataLayer || [];
    
    function pushEvent(name, detail) {    
        window.dataLayer.push(Object.assign({ event: name }, detail || {}));
        window.dataLayer.push({ event: name, ecwid_event_detail: detail || {} });
    }
    
    function toItem(p) {
        return {
            item_id: String(p?.sku || p?.id || ''),
            item_name: String(p?.name || ''),
            quantity: Number(p?.quantity || 1),
            price: Number(p?.price || 0)
        };
        
    }
    
    function getCurrency() {
        try { return Ecwid?.getCurrency?.().currency || 'USD'; } catch(e){ return 'USD'; }
    }
    
    function clearEcommerce(){ window.dataLayer.push({ ecommerce: null }); }
    
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
        if (!ecwid) return; // Ecwid not present in this context (likely parent page)
        // Bind each hook only if it exists
        const addToCart = await waitFor(() => Ecwid.OnAddToCart && Ecwid.OnAddToCart.add);
        if (addToCart) {
            Ecwid.OnAddToCart.add(function(product){
                const item = toItem(product);
                pushEvent('brb_add_to_cart', {
                    ecommerce: { currency: getCurrency(), value: +(item.price * item.quantity).toFixed(2), items: [item] }
                });
                clearEcommerce();
            });
            
        }
        
        const onCartChanged = await waitFor(() => Ecwid.OnCartChanged && Ecwid.OnCartChanged.add);
        
        if (onCartChanged) {
            
            Ecwid.OnCartChanged.add(function(cart){
                console.log(cart);    
                pushEvent('brb_ecwid_cart_changed', { cart });
                
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
        
        // Some builds expose this signal
        
        try { Ecwid.OnAPILoaded.add(bindEcwid); } catch(e){}
        
    }
    
    // Also kick off immediately
    
    bindEcwid();
    
}
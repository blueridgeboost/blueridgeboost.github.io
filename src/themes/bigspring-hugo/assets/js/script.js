
function filterClasses() {
    const dayFilters = Array.from(document.querySelectorAll('.day-filter:checked')).map(cb => cb.value.toLowerCase());
    const gradeFilters = Array.from(document.querySelectorAll('.grade-filter:checked')).map(cb => cb.value.toLowerCase());
    const subjectFilters = Array.from(document.querySelectorAll('.subject-filter:checked')).map(cb => cb.value.toLowerCase());

    const classes = document.querySelectorAll('div[id^="class-"]');
    for (let i = 0; i < classes.length; i++) {
        const dayTags = classes[i].getAttribute('data-day').toLowerCase().split('#');
        const gradeTags = classes[i].getAttribute('data-grade').toLowerCase().split('#');
        const subjectTags = classes[i].getAttribute('data-subject').toLowerCase().split('#');

        const dayMatch = dayFilters.length === 0 || dayFilters.some(tag => dayTags.includes(tag));
        const gradeMatch = gradeFilters.length === 0 || gradeFilters.some(tag => gradeTags.includes(tag));
        const subjectMatch = subjectFilters.length === 0 || subjectFilters.some(tag => subjectTags.includes(tag));

        if (dayMatch && gradeMatch && subjectMatch) {
            classes[i].style.display = '';
        } else {
            classes[i].style.display = 'NONE';
        }
    }
}
document.addEventListener('DOMContentLoaded', filterClasses);

// function ecwid_add_payment_to_cart( product_id, payment_type ) {
//     if (typeof Ecwid == 'undefined' ||  !Ecwid.OnPageLoaded) {
//         Ecwid.OnPageLoaded.add(function () {
//             aux_ecwid_add_option_to_cart(product_id, payment_type);
//         });
//     } else {
//         aux_ecwid_add_option_to_cart(product_id, payment_type)
//     }
// }

// function aux_ecwid_add_option_to_cart( product_id, payment_type ) {
//     Ecwid.Cart.addProduct({
//         id: product_id,
//         quantity: 1,   
//         options: {
//             "Payment Type": payment_type,
//         }, 
//         selectedPrice: 0, 
//         callback: function(success, product, cart, error){
//             if (!success) {
//                 console.error(error) // error message or null
//             }
//         }
//     });
//     Ecwid.openPage('cart');
// }


// function ecwid_add_option_to_cart( product_id, product_option ) {
//     if (typeof Ecwid == 'undefined' ||  !Ecwid.OnPageLoaded) {
//         Ecwid.OnPageLoaded.add(function () {
//             aux_ecwid_add_option_to_cart(product_id, product_option);
//         });
//     } else {
//         aux_ecwid_add_option_to_cart(product_id, product_option)
//     }
// }

// function aux_ecwid_add_option_to_cart( product_id, product_option ) {
//     Ecwid.Cart.addProduct({
//         id: product_id,
//         quantity: 1,   
//         options: {
//             "Type": product_option,
//             "Payment Type": "Now",
//         }, 
//         selectedPrice: 0, 
//         callback: function(success, product, cart, error){
//             if (!success) {
//                 console.error(error) // error message or null
//             }
//         }
//     });
//     Ecwid.openPage('cart');
// }

function ecwid_add_product_to_cart( product_id, product_options ) {
    if (typeof Ecwid == 'undefined' ||  !Ecwid.Cart) {
        Ecwid.OnPageLoaded.add(function () {
            aux_ecwid_add_product_to_cart(product_id, product_options);
        });
    } else {
        aux_ecwid_add_product_to_cart(product_id, product_options)
    }
}

function aux_ecwid_add_product_to_cart( product_id, product_options ) {
    Ecwid.Cart.addProduct({
        id: product_id,
        quantity: 1,   
        options: product_options, 
        selectedPrice: 0, 
        callback: function(success, product, cart, error){
            if (!success) {
                console.error(error) // error message or null
            }
        }
    });
    Ecwid.openPage('cart');
}

function get_radio_selected(name) {
    const radioButtons = document.querySelectorAll(`input[name="${name}"]`);
    let camp_type = "None";
    for (const radioButton of radioButtons) {
        if (radioButton.checked) {
            camp_type = radioButton.value;
            break;
        }
    }
    return camp_type;
}

function get_camp_options(id) {
    camp_type = get_radio_selected("type-"+id);
    payment_type = get_radio_selected("payment-"+id);
    if (payment_type == "None") {
        payment_type = "Now";
    }
    var ret_value = {
        "Type": camp_type,
        "Payment Type": payment_type,
    };
    return ret_value;
}

function get_class_options(id) {
    payment_type = get_radio_selected("payment-"+id);
    var ret_value = {
        "Payment Type": payment_type,
    };
    return ret_value;
}

// function ecwid_go_to_checkout( ) {
//     if (typeof Ecwid != 'undefined') {
//         Ecwid.OnAPILoaded.add(function () {
//             ecwid_go_to_checkout(product_id, product_options);
//         });
//     } else {
//         ecwid_go_to_checkout(product_id, product_options)
//     }
            
// }

// function aux_ecwid_go_to_checkout() {
//     Ecwid.Cart.gotoCheckout(function(){
//         alert("Checkout process started");
//     });
// }


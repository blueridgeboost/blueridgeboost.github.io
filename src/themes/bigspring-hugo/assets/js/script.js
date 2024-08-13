
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
    // alert("Adding to cart: " + product_id + " with options: " + JSON.stringify(product_options));
    Ecwid.Cart.addProduct({
        id: product_id,
        quantity: 1,   
        options: product_options, 
        callback: function(success, product, cart, error){
            if (!success) {
                console.error(error) // error message or null
            }
        }
    });
    Ecwid.openPage('cart');
}

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
        "Payment Type": payment_type,
    };
    return ret_value;
}


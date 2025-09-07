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

function ecwid_add_product_to_cart( product_id, product_options ) {
    if (typeof Ecwid == 'undefined' ||  !Ecwid.Cart) {
        Ecwid.OnAPILoaded.add(function () {
            aux_ecwid_add_product_to_cart(product_id, product_options);
        });
    } else {
        aux_ecwid_add_product_to_cart(product_id, product_options);
    }
}

function aux_ecwid_add_product_to_cart( product_id, product_options ) {
    Ecwid.Cart.addProduct({
        id: product_id,
        quantity: 1,
        options: product_options,
        // categoryIds: [category_id],
        // defaultCategoryId: category_id,
        // recurringChargeSettings: undefined,
        callback(success, product, cart, error) {
          if (success) {
            Ecwid.openPage('cart');
          } else {
            console.error(error); // error message or null
          }
        },
      });
}

function ecwid_add_subscription_to_cart( product_id ) {
    if (typeof Ecwid == 'undefined' ||  !Ecwid.Cart) {
        Ecwid.OnPageLoaded.add(function () {
            aux_ecwid_add_subscription_to_cart(product_id);
        });
    } else {
        aux_ecwid_add_subscription_to_cart(product_id);
    }
}

function aux_ecwid_add_subscription_to_cart( product_id, product_options ) {
    Ecwid.Cart.addProduct({
        id: product_id,
        quantity: 1,   
        options: product_options, 
        recurringChargeSettings: { 
            recurringInterval: "month",
            recurringIntervalCount: 1,
            },
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
        "Session": payment_type,
    };
    return ret_value;
}


export function location() {
    return ({
            "@type": "Place",
            "name": "Blue Ridge Boost",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "2171 Ivy Rd",
                "addressLocality": "Charlottesville",
                "addressRegion": "VA",
                "postalCode": "22903",
                "addressCountry": "US"
            }
        });
}

export function to24H(time12) {
    // e.g., "4:05 PM", "12:00 am", "7 pm"
    const [_, h, m = "00", ap] = time12.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/i) || [];
    if (!_) throw new Error(`Invalid time: ${time12}`);
    let hour = parseInt(h, 10) % 12 + (ap.toLowerCase() === "pm" ? 12 : 0);
    const min = parseInt(m, 10);
    return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function provider() {
    const d = {
            "@type": "EducationalOrganization",
            "name": "Blue Ridge Boost",
            "sameAs": "https://blueridgeboost.com/",
            "url": "https://blueridgeboost.com/"
        };
    return d;
}

export function organizer() {
    return ({
            "@type": "Organization",
            "name": "Blue Ridge Boost",
            "email": "nora@blueridgeboost.com",
            "telephone": "+1-434-260-0636",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "2171 Ivy Road",
              "addressLocality": "Charlottesville",
              "addressRegion": "VA",
              "postalCode": "22903",
              "addressCountry": "US"
            }
          });
}

export function audience() {
    return ({
        "@type": "Audience",
        "audienceType": "Children",
        "geographicArea": [
            {
            "@type": "AdministrativeArea",
            "name": "Charlottesville, VA",
            "address": {
                "@type": "PostalAddress",
                "addressRegion": "VA",
                "addressCountry": "US"
            }
            },
            {
            "@type": "AdministrativeArea",
            "name": "Albemarle County, VA",
            "address": {
                "@type": "PostalAddress",
                "addressRegion": "VA",
                "addressCountry": "US"
            }
            }
        ]
    });
}

function slugify(str) {
  return str
    .toString()
    .normalize('NFKD')                 // split accents from letters
    .replace(/[\u0300-\u036f]/g, '')   // remove diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')       // replace non-alphanumerics with -
    .replace(/^-+|-+$/g, '');          // trim leading/trailing -
}

function url(product, path ) {
    return "https://blueridgeboost.com/" + path + "/#!/"
        + slugify(product.name)
        + "/p/" + product.id;
}

export function campURL(camp) {
    return url(camp, "1-day-camps");
}

export function gamingURL(camp) {
    return url(camp, "gaming");
}
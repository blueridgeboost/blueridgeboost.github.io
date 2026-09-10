const purgecss = require("@fullhuman/postcss-purgecss")({
  content: ["./hugo_stats.json"],
  defaultExtractor: (content) => {
    const els = JSON.parse(content).htmlElements;
    return [...(els.tags || []), ...(els.classes || []), ...(els.ids || [])];
  },
  safelist: [
    // Existing safelist
    /dark/,
    /^swiper-/,
    /collapsing/,
    /show/,
    /[aria-expanded=true]/,
    /[aria-expanded=false]/,
    /^lb-/,
    /^gl/,
    /^go/,
    /^gc/,
    /^gs/,
    /^gi/,
    /^desc/,
    /^zoom/,
    /dragging/,
    /fullscreen/,
    /loaded/,
    /visible/,
    /current/,
    /active/,

    // FontAwesome — icon glyph classes live on inline <i> tags and are
    // captured by hugo_stats.json, but the base families are shorthand
    // and easy to miss. Keep them.
    /^fa[bsrl]?$/,
    /^fa-/,

    // Ecwid cart widget markup is injected client-side and uses ec-* / ecwid-* prefixes.
    /^ec-/,
    /^ecwid/,
    /^Ecwid/,

    // Mailchimp popup / embedded form classes are also injected.
    /^mc-/,
    /^mce-/,
    /^mc_/,

    // Bootstrap dynamic states not always visible in templates.
    /^modal/,
    /^dropdown-menu/,
    /^dropdown-item/,
    /^nav-sub/,
    /^drawer/,
    /open$/,
    /^is-/,
    /^has-/,
  ],
});

const isProduction =
  process.env.HUGO_ENVIRONMENT === "production" ||
  process.env.NODE_ENV === "production";

console.error(
  "[postcss] HUGO_ENVIRONMENT=" +
    JSON.stringify(process.env.HUGO_ENVIRONMENT) +
    " -> purge=" +
    isProduction
);

module.exports = {
  plugins: [...(isProduction ? [purgecss] : [])],
};

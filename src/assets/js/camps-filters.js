document.addEventListener('DOMContentLoaded', function () {
  var filtersEl = document.getElementById('camp-filters');
  if (!filtersEl) return;

  var ageFilter = 'all';
  var topicFilter = 'all';

  filtersEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.filter-btn');
    if (!btn) return;

    var group = btn.getAttribute('data-group');
    var value = btn.getAttribute('data-filter');

    btn.parentElement.querySelectorAll('.filter-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');

    if (group === 'age') ageFilter = value;
    if (group === 'topic') topicFilter = value;

    applyFilters();
  });

  function matchesAge(subtitle, filter) {
    var match = subtitle.match(/ages?\s+(\d+)[-–]?(\d+)?/i);
    if (!match) return false;

    var lo = parseInt(match[1], 10);
    var hi = match[2] ? parseInt(match[2], 10) : lo;

    switch (filter) {
      case '6-8':   return lo <= 8 && hi >= 6 && lo < 9;
      case '8-10':  return lo <= 10 && hi >= 8 && lo < 11;
      case '10-13': return lo <= 13 && hi >= 10;
      case '13+':   return hi >= 13;
      default:      return true;
    }
  }

  function matchesTopic(title, subtitle, filter) {
    var t = title.toLowerCase();
    var s = subtitle.toLowerCase();
    var text = t + ' ' + s;

    switch (filter) {
      case 'robotics':
        return s.indexOf('robotics') !== -1;
      case 'science':
        return s.indexOf('science') !== -1;
      case 'math':
        return s.indexOf('math') !== -1;
      case 'ai':
        return s.indexOf('ai') !== -1 || text.indexOf('artificial intelligence') !== -1;
      case 'gamedev':
        return t.indexOf('minecraft') !== -1
            || t.indexOf('roblox') !== -1
            || t.indexOf('unity') !== -1
            || s.indexOf('game') !== -1;
      case 'coding':
        return t.indexOf('coding') !== -1
            || s.indexOf('coding') !== -1
            || t.indexOf('minecraft') !== -1;
      default:
        return true;
    }
  }

  function applyFilters() {
    var cards = document.querySelectorAll('.grid-product__wrap-inner');
    var shown = 0;
    var total = cards.length;

    cards.forEach(function (card) {
      var subtitleEl = card.querySelector('.grid-product__subtitle-inner');
      var titleEl = card.querySelector('.grid-product__title-inner');
      var subtitle = subtitleEl ? subtitleEl.textContent : '';
      var title = titleEl ? titleEl.textContent : '';

      var matchA = ageFilter === 'all' || matchesAge(subtitle, ageFilter);
      var matchT = topicFilter === 'all' || matchesTopic(title, subtitle, topicFilter);

      var cell = card.closest('.grid-product') || card.parentElement;
      if (matchA && matchT) {
        cell.style.display = '';
        shown++;
      } else {
        cell.style.display = 'none';
      }
    });

    var status = document.getElementById('filter-status');
    if (ageFilter === 'all' && topicFilter === 'all') {
      status.textContent = '';
    } else if (total === 0) {
      status.textContent = 'Loading camps…';
    } else {
      status.textContent = 'Showing ' + shown + ' of ' + total + ' camps';
    }
  }

  if (window.Ecwid) {
    Ecwid.OnPageLoaded.add(function () {
      setTimeout(applyFilters, 300);
    });
  }
});
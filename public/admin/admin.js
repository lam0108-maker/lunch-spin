(function () {
  'use strict';

  var DATA_BASE = './data/';
  var state = {
    manifest: null,
    bySlug: {},
    tab: 'kept',
    district: '',
    q: '',
    loading: true,
    error: null,
  };

  var el = {
    district: document.getElementById('district'),
    q: document.getElementById('q'),
    counts: document.getElementById('counts'),
    status: document.getElementById('status'),
    list: document.getElementById('list'),
    tabs: document.querySelectorAll('.tab'),
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isClosed(row) {
    var tags = (row.tags || []).join(' ');
    var reason = row.exclude_reason || '';
    var blob = (tags + ' ' + reason).toLowerCase();
    return (
      blob.indexOf('closed') !== -1 ||
      reason.indexOf('已歇業') !== -1 ||
      reason.indexOf('執笠') !== -1 ||
      tags.indexOf('已歇業') !== -1 ||
      tags.indexOf('執笠') !== -1
    );
  }

  function mapsUrl(pid) {
    return 'https://www.google.com/maps/place/?q=place_id:' + encodeURIComponent(pid);
  }

  function hay(row) {
    return [
      row.id,
      row.name_zh,
      row.name_en,
      row.address,
      row.area,
      row.district,
      row.exclude_reason,
      (row.tags || []).join(' '),
    ]
      .join(' ')
      .toLowerCase();
  }

  function loadManifest() {
    return fetch(DATA_BASE + 'manifest.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('manifest.json HTTP ' + r.status);
      return r.json();
    });
  }

  function loadDistrict(file) {
    return fetch(DATA_BASE + file, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(file + ' HTTP ' + r.status);
      return r.json();
    });
  }

  function fillDistrictSelect() {
    var frag = document.createDocumentFragment();
    state.manifest.districts.forEach(function (d) {
      var opt = document.createElement('option');
      opt.value = d.slug;
      opt.textContent =
        d.district + ' · kept ' + d.kept + ' / excl ' + d.excluded + (d.version ? ' (v' + d.version + ')' : '');
      frag.appendChild(opt);
    });
    el.district.appendChild(frag);
  }

  function ensureLoaded(slug) {
    if (state.bySlug[slug]) return Promise.resolve(state.bySlug[slug]);
    var meta = state.manifest.districts.find(function (d) {
      return d.slug === slug;
    });
    if (!meta) return Promise.reject(new Error('unknown district ' + slug));
    return loadDistrict(meta.file).then(function (data) {
      state.bySlug[slug] = {
        slug: slug,
        meta: meta,
        data: data,
        kept: data.restaurants || [],
        excluded: data.excluded || [],
      };
      return state.bySlug[slug];
    });
  }

  function loadNeeded() {
    var slugs = state.district
      ? [state.district]
      : state.manifest.districts.map(function (d) {
          return d.slug;
        });
    el.status.textContent = '載入 ' + slugs.length + ' 個地區…';
    return Promise.all(slugs.map(ensureLoaded));
  }

  function collectRows() {
    var packs = state.district
      ? [state.bySlug[state.district]].filter(Boolean)
      : state.manifest.districts.map(function (d) {
          return state.bySlug[d.slug];
        }).filter(Boolean);

    var q = (state.q || '').trim().toLowerCase();
    var rows = [];
    var keptTotal = 0;
    var exclTotal = 0;
    var perDistrict = [];

    packs.forEach(function (pack) {
      var kept = pack.kept.length;
      var excl = pack.excluded.length;
      keptTotal += kept;
      exclTotal += excl;
      perDistrict.push({
        slug: pack.slug,
        district: pack.meta.district,
        kept: kept,
        excluded: excl,
      });

      var src = state.tab === 'kept' ? pack.kept : pack.excluded;
      src.forEach(function (row) {
        if (q && hay(row).indexOf(q) === -1) return;
        rows.push({
          row: row,
          districtLabel: row.district || pack.meta.district,
          slug: pack.slug,
        });
      });
    });

    return { rows: rows, keptTotal: keptTotal, exclTotal: exclTotal, perDistrict: perDistrict };
  }

  function renderCounts(info) {
    var html = [];
    html.push(
      '<span class="pill">合計 <strong>kept ' +
        info.keptTotal +
        '</strong> / <strong>excluded ' +
        info.exclTotal +
        '</strong></span>'
    );
    html.push(
      '<span class="pill">目前 tab 顯示 <strong>' + info.rows.length + '</strong> 筆' + (state.q ? '（已搜尋）' : '') + '</span>'
    );
    info.perDistrict.forEach(function (d) {
      html.push(
        '<span class="pill">' +
          esc(d.district) +
          ': kept <strong>' +
          d.kept +
          '</strong> / excl <strong>' +
          d.excluded +
          '</strong></span>'
      );
    });
    el.counts.innerHTML = html.join('');
  }

  function renderList(info) {
    if (!info.rows.length) {
      el.list.innerHTML = '<div class="empty">冇符合條件嘅餐廳。</div>';
      return;
    }
    var html = info.rows
      .map(function (item) {
        var r = item.row;
        var closed = isClosed(r);
        var tags = (r.tags || []).slice(0, 12);
        var rating =
          r.google_rating != null
            ? '<span class="rating">★ ' +
              esc(r.google_rating) +
              (r.google_review_count != null ? '（' + esc(r.google_review_count) + '）' : '') +
              '</span>'
            : '<span class="meta">無 rating</span>';
        var map =
          r.google_place_id
            ? '<a class="map" href="' +
              esc(mapsUrl(r.google_place_id)) +
              '" target="_blank" rel="noopener noreferrer">Google Maps</a>'
            : '';
        var tagHtml = tags
          .map(function (t) {
            var c = /closed|已歇業|執笠/i.test(String(t)) ? ' tag closed-tag' : '';
            return '<span class="tag' + c + '">' + esc(t) + '</span>';
          })
          .join('');
        if (closed) tagHtml = '<span class="tag closed-tag">執笠／已歇業</span>' + tagHtml;
        var reason =
          state.tab === 'excluded' && r.exclude_reason
            ? '<div class="reason">' + esc(r.exclude_reason) + '</div>'
            : '';
        return (
          '<article class="item' +
          (closed ? ' closed' : '') +
          '">' +
          '<div class="item-head">' +
          '<h2 class="name">' +
          esc(r.name_zh || r.name_en || r.id) +
          (r.name_en && r.name_zh ? ' <span class="meta">/ ' + esc(r.name_en) + '</span>' : '') +
          '</h2>' +
          '<div>' +
          rating +
          (map ? ' · ' + map : '') +
          '</div>' +
          '</div>' +
          '<div class="meta">' +
          esc(item.districtLabel || '') +
          (r.area ? ' · ' + esc(r.area) : '') +
          (r.address ? ' · ' + esc(r.address) : '') +
          ' · <code>' +
          esc(r.id) +
          '</code></div>' +
          (tagHtml ? '<div class="flags">' + tagHtml + '</div>' : '') +
          reason +
          '</article>'
        );
      })
      .join('');
    el.list.innerHTML = html;
  }

  function refresh() {
    return loadNeeded()
      .then(function () {
        state.loading = false;
        state.error = null;
        var info = collectRows();
        renderCounts(info);
        renderList(info);
        el.status.textContent =
          '就緒 · tab=' +
          state.tab +
          (state.district ? ' · district=' + state.district : ' · all districts');
      })
      .catch(function (err) {
        state.loading = false;
        state.error = String(err && err.message ? err.message : err);
        el.status.textContent = '載入失敗：' + state.error;
        el.list.innerHTML = '';
      });
  }

  el.tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.tab = btn.getAttribute('data-tab') || 'kept';
      el.tabs.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      refresh();
    });
  });

  el.district.addEventListener('change', function () {
    state.district = el.district.value;
    refresh();
  });

  var qTimer = null;
  el.q.addEventListener('input', function () {
    clearTimeout(qTimer);
    qTimer = setTimeout(function () {
      state.q = el.q.value;
      refresh();
    }, 180);
  });

  loadManifest()
    .then(function (m) {
      state.manifest = m;
      fillDistrictSelect();
      return refresh();
    })
    .catch(function (err) {
      el.status.textContent = '無法載入 manifest：' + (err && err.message ? err.message : err);
    });
})();

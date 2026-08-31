/* RTD Bødeligaen — klub-bødekasse. Vanilla JS, ingen afhængigheder. */
(function () {
  'use strict';

  var LS_KEY = 'rtd-boedeliga-v1';
  var MEETINGS_PER_YEAR = 20;

  /* ---------- Seed data ---------- */

  function seedFineTypes() {
    var rows = [
      ['Mobil', 'Viser arrogance for andre og kigger på sin mobil i møde', 30],
      ['Dårlig adfærd', 'Kan være mange forskellige ting — blander ting sammen, siger dumme ting', 30],
      ['Mads bøde', 'Mads’ særskilte bøde', 500],
      ['Diverse bøde', 'Blander flere ting sammen, laver noget dumt etc.', 30],
      ['Afmelding efter frist', 'Afmelding efter 7 dages frist', 150],
      ['Afmelding 24 timer', 'Afmelder sig indenfor 24 timer (sygdom/force majeure kan forhandles)', 300],
      ['Glemt formandskæde', 'Ikke ret til at være formand-adfærd', 500],
      ['Ikke rejse sig', 'Manglende pli — rejser sig ikke op, når man taler', 30],
      ['Afbryde', 'Manglende pli — afbryder når en anden taler', 50],
      ['Mødereferat', 'Overskrider frist for mødereferat med 7 dage', 350],
      ['Ingen fremmøde ved tilmelding på RTD', 'Respektløs adfærd over for mødearrangør og indlægsholder', 800],
      ['Nål', 'Glemmer nål — respektløst for klubben', 30],
      ['Toilet', 'Går på toilet under indlæg (undtagelse ved akut diarré)', 50],
      ['Dårlig pligt', 'Lever ikke op til forventet standard af sine pligter', 150],
      ['To late BIG BET', 'Kommer for sent til møde, dvs. over 15 minutter', 100],
      ['To late SMALL BET', 'Kommer for sent til møde, dvs. under 15 minutter', 50],
      ['Glemt pligt', 'Har glemt sin pligt', 150],
      ['Dårlig planlægning', 'Har ikke planlagt sit møde i god tid (4 uger før)', 50]
    ];
    return rows.map(function (r) {
      return { id: uid(), category: r[0], description: r[1], amount: r[2], active: true };
    });
  }

  var SEED_MEMBERS = [
    'Martin Mollerup', 'Miki Kjeldsen', 'Thomas Jarløv', 'Asger Holmsted',
    'Marco Brøndsted', 'Daniel Kuntkes', 'Steffen Desmond', 'Casper Infeld',
    'Benjamin Rasmussen', 'Toke Suhr', 'Rasmus De Martino'
  ];

  function seedMembers() {
    return SEED_MEMBERS.map(function (n) {
      return { id: uid(), name: n, active: true, createdAt: Date.now() };
    });
  }

  function freshState() {
    var s = {
      version: 3,
      updatedAt: Date.now(),
      clubName: 'RTD',
      formandId: null,
      members: seedMembers(),
      fineTypes: seedFineTypes(),
      clubYears: [],
      meetings: [],
      fines: [],
      payments: []
    };
    ensureYear(s, 2024);
    ensureYear(s, 2025);
    s.clubYears.forEach(function (cy) { topUpMeetings(s, cy); });
    return s;
  }

  /* ---------- Utils ---------- */

  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function kr(n) {
    var neg = n < 0;
    var v = Math.abs(Math.round(n));
    var s = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '−' : '') + s + ' kr.';
  }

  var MONTHS = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];
  function fmtDate(iso) {
    if (!iso) return 'Dato ikke sat';
    var p = iso.split('-');
    if (p.length !== 3) return iso;
    return parseInt(p[2], 10) + '. ' + (MONTHS[parseInt(p[1], 10) - 1] || p[1]) + ' ' + p[0];
  }
  function isoOf(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function todayISO() { return isoOf(new Date()); }

  /* ---------- Klubår ---------- */

  function yearLabel(startYear) {
    return startYear + '/' + String(startYear + 1).slice(2);
  }

  function ensureYear(s, startYear) {
    var cy = s.clubYears.find(function (y) { return y.startYear === startYear; });
    if (!cy) {
      cy = { id: uid(), startYear: startYear, label: yearLabel(startYear) };
      s.clubYears.push(cy);
      s.clubYears.sort(function (a, b) { return a.startYear - b.startYear; });
    }
    return cy;
  }

  /* Placeholder-mødedato: hver 14. dag fra første mandag i september */
  function scheduledDate(startYear, number) {
    var d = new Date(startYear, 8, 1);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    d.setDate(d.getDate() + (number - 1) * 14);
    return isoOf(d);
  }

  function topUpMeetings(s, cy) {
    var mine = s.meetings.filter(function (m) { return m.clubYearId === cy.id; });
    var maxNo = mine.reduce(function (a, m) { return Math.max(a, m.number); }, 0);
    while (mine.length < MEETINGS_PER_YEAR) {
      maxNo++;
      var m = {
        id: uid(), clubYearId: cy.id, number: maxNo,
        title: 'Møde ' + maxNo, date: scheduledDate(cy.startYear, maxNo),
        description: '', links: '', closedAt: null
      };
      s.meetings.push(m);
      mine.push(m);
    }
  }

  function startYearFromDate(iso) {
    var now = new Date();
    var y = now.getFullYear(), mo = now.getMonth();
    if (iso) {
      var p = iso.split('-');
      if (p.length === 3) { y = parseInt(p[0], 10); mo = parseInt(p[1], 10) - 1; }
    }
    return mo >= 6 ? y : y - 1; // klubåret skifter 1. juli
  }

  /* ---------- Migration ---------- */

  function migrate(s) {
    if (s.version === 1) {
      s.clubYears = [];
      (s.meetings || []).forEach(function (m) {
        var cy = ensureYear(s, startYearFromDate(m.date));
        m.clubYearId = cy.id;
        if (!m.title) m.title = 'Møde ' + m.number;
        if (m.description == null) m.description = '';
        if (m.links == null) m.links = '';
      });
      ensureYear(s, 2024);
      ensureYear(s, 2025);
      s.clubYears.forEach(function (cy) { topUpMeetings(s, cy); });
      s.version = 2;
    }
    if (s.version === 2) {
      if (s.formandId == null) s.formandId = null;
      if (!s.members || !s.members.length) s.members = seedMembers();
      s.version = 3;
    }
    return s;
  }

  /* ---------- Storage ---------- */

  var state = null;
  var artifactNS = null;   // claude.use('artifact') namespace, når appen kører som artifact
  var downloadsNS = null;  // claude.use('downloads') — fil-gem inde i artifact-viseren
  var dirty = false;       // ændringer der ikke er publiceret til artifact endnu

  function readEmbedded() {
    try {
      var el = document.getElementById('rtd-state');
      if (el && el.textContent && el.textContent.trim()) {
        var s = JSON.parse(el.textContent);
        if (s && s.version) return migrate(s);
      }
    } catch (e) { /* korrupt embedded state — ignorér */ }
    return null;
  }

  function readLocal() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.version) return migrate(s);
      }
    } catch (e) { /* localStorage utilgængelig eller korrupt */ }
    return null;
  }

  function writeLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* fuld eller blokeret */ }
  }

  function loadState() {
    var embedded = readEmbedded();
    var local = readLocal();
    if (embedded && local) {
      if ((local.updatedAt || 0) > (embedded.updatedAt || 0)) { state = local; dirty = true; }
      else state = embedded;
    } else {
      state = local || embedded || freshState();
    }
  }

  function commit() {
    state.updatedAt = Date.now();
    writeLocal();
    if (artifactNS) dirty = true;
    render();
  }

  /* Gem uden fuld re-render (bruges når en modal skal blive stående) */
  function commitQuiet() {
    state.updatedAt = Date.now();
    writeLocal();
    if (artifactNS) dirty = true;
    renderSaveButtonOnly();
  }

  /* ---------- Artifact-lagring (delt tilstand når appen kører som artifact) ---------- */

  function serializeDocument() {
    var clone = document.documentElement.cloneNode(true);
    var st = clone.querySelector('#rtd-state');
    if (!st) {
      st = document.createElement('script');
      st.type = 'application/json';
      st.id = 'rtd-state';
      (clone.querySelector('body') || clone).appendChild(st);
    }
    st.textContent = JSON.stringify(state).replace(/</g, '\\u003c');
    var app = clone.querySelector('#app');
    if (app) app.innerHTML = '';
    var junk = clone.querySelectorAll('.modal-root, .toast');
    for (var i = 0; i < junk.length; i++) junk[i].parentNode.removeChild(junk[i]);
    return '<!doctype html>\n' + clone.outerHTML;
  }

  function publishShared() {
    if (!artifactNS || !dirty) return;
    var btn = document.getElementById('save-btn');
    if (btn) btn.setAttribute('disabled', 'disabled');
    artifactNS.publish(serializeDocument()).then(function () {
      dirty = false;
      toast('Gemt for alle');
      render();
    }).catch(function (err) {
      if (btn) btn.removeAttribute('disabled');
      if (err && String(err.code || err).indexOf('conflict') !== -1) {
        toast('En anden har gemt — siden opdaterer');
      } else {
        toast('Kunne ikke gemme delt');
      }
    });
  }

  function initArtifact() {
    if (!(window.claude && typeof window.claude.use === 'function')) return;
    window.claude.use('artifact').then(function (ns) {
      if (ns) { artifactNS = ns; render(); }
    }).catch(function () { /* ikke tilgængelig */ });
    window.claude.use('downloads').then(function (ns) {
      if (ns) downloadsNS = ns;
    }).catch(function () { /* ikke tilgængelig */ });
  }

  /* ---------- Afledte tal ---------- */

  function memberFineTotal(mid) {
    return state.fines.reduce(function (a, f) { return f.memberId === mid ? a + f.amount : a; }, 0);
  }
  function memberPaidTotal(mid) {
    return state.payments.reduce(function (a, p) { return p.memberId === mid ? a + p.amount : a; }, 0);
  }
  function memberBalance(mid) { return memberFineTotal(mid) - memberPaidTotal(mid); }
  function memberFineCount(mid) {
    return state.fines.reduce(function (a, f) { return f.memberId === mid ? a + 1 : a; }, 0);
  }
  function potTotal() { return state.payments.reduce(function (a, p) { return a + p.amount; }, 0); }
  function outstandingTotal() {
    return state.members.reduce(function (a, m) { return a + Math.max(0, memberBalance(m.id)); }, 0);
  }
  function findMember(id) { return state.members.find(function (m) { return m.id === id; }); }
  function findMeeting(id) { return state.meetings.find(function (m) { return m.id === id; }); }
  function findYear(id) { return state.clubYears.find(function (y) { return y.id === id; }); }
  function findFineType(id) { return state.fineTypes.find(function (t) { return t.id === id; }); }
  function fineLabel(f) {
    if (f.fineTypeId) { var t = findFineType(f.fineTypeId); return t ? t.category : 'Slettet takst'; }
    return f.label || 'Særbøde';
  }
  function activeMembers() { return state.members.filter(function (m) { return m.active; }); }
  function meetingTotal(meetId) {
    return state.fines.reduce(function (a, f) { return f.meetingId === meetId ? a + f.amount : a; }, 0);
  }
  function meetingFineCount(meetId) {
    return state.fines.reduce(function (a, f) { return f.meetingId === meetId ? a + 1 : a; }, 0);
  }
  function yearMeetings(yearId) {
    return state.meetings.filter(function (m) { return m.clubYearId === yearId; })
      .sort(function (a, b) { return a.number - b.number; });
  }
  function yearTotal(yearId) {
    return yearMeetings(yearId).reduce(function (a, m) { return a + meetingTotal(m.id); }, 0);
  }
  function meetingYearLabel(m) {
    var y = findYear(m.clubYearId);
    return y ? y.label : '';
  }
  function currentClubYear() {
    return state.clubYears.reduce(function (a, y) { return !a || y.startYear > a.startYear ? y : a; }, null);
  }

  /* ---------- Streaks og dyre bøder ---------- */

  var HOT_FINE = 300;  // beløb der markeres som "dyr bøde"
  var MID_FINE = 100;

  function amtClass(amount) {
    if (amount >= HOT_FINE) return ' amt-hot';
    if (amount >= MID_FINE) return ' amt-mid';
    return '';
  }

  /* Afholdte møder = møder med mindst én bøde, kronologisk */
  function heldMeetings() {
    return state.meetings.filter(function (m) { return meetingFineCount(m.id) > 0; })
      .sort(function (a, b) {
        var d = (a.date || '').localeCompare(b.date || '');
        return d !== 0 ? d : a.number - b.number;
      });
  }

  /* Antal afholdte møder i træk (bagfra) hvor medlemmet har fået bøde */
  function memberMeetingStreak(mid) {
    var held = heldMeetings();
    var s = 0;
    for (var i = held.length - 1; i >= 0; i--) {
      var hit = state.fines.some(function (f) { return f.meetingId === held[i].id && f.memberId === mid; });
      if (hit) s++; else break;
    }
    return s;
  }

  /* Mest gentagne bødetype for et medlem: {typeId, count} eller null */
  function memberTopType(mid) {
    var counts = {};
    state.fines.forEach(function (f) {
      if (f.memberId === mid && f.fineTypeId) counts[f.fineTypeId] = (counts[f.fineTypeId] || 0) + 1;
    });
    var best = null;
    Object.keys(counts).forEach(function (k) {
      if (!best || counts[k] > best.count) best = { typeId: k, count: counts[k] };
    });
    return best;
  }

  function memberHotFineCount(mid) {
    return state.fines.reduce(function (a, f) { return f.memberId === mid && f.amount >= HOT_FINE ? a + 1 : a; }, 0);
  }

  function streakTitle(n) {
    if (n >= 6) return 'LEGENDE';
    if (n >= 4) return 'Ustoppelig';
    if (n >= 3) return 'I brand';
    return 'Varm';
  }

  function flames(n) {
    var c = Math.min(3, Math.max(1, Math.floor(n / 2)));
    var out = '';
    for (var i = 0; i < c; i++) out += IC.flame;
    return '<span class="flames">' + out + '</span>';
  }

  function nameIcons(mid) {
    var out = '';
    if (state.formandId === mid) out += '<span class="crown" title="Formand">' + IC.crown + '</span>';
    var hot = memberHotFineCount(mid);
    if (hot > 0) {
      out += '<span class="zaps" title="Dyre bøder (' + HOT_FINE + ' kr.+)">';
      for (var i = 0; i < Math.min(3, hot); i++) out += IC.zap;
      out += '</span>';
    }
    return out;
  }

  /* Forslag til "næste møde" på forsiden: seneste åbne møde med bøder,
     ellers det næste kommende åbne møde i det nyeste klubår. */
  function suggestMeeting() {
    var cy = currentClubYear();
    if (!cy) return null;
    var ms = yearMeetings(cy.id);
    var open = ms.filter(function (m) { return !m.closedAt; });
    var withFines = open.filter(function (m) { return meetingFineCount(m.id) > 0; });
    if (withFines.length) return { meeting: withFines[withFines.length - 1], verb: 'Fortsæt' };
    var today = todayISO();
    var upcoming = open.find(function (m) { return m.date >= today; });
    var pick = upcoming || open[0] || ms[ms.length - 1];
    return pick ? { meeting: pick, verb: 'Åbn' } : null;
  }

  /* ---------- UI-tilstand ---------- */

  var view = { name: 'liga' };
  var pickerMemberId = null; // valgt medlem i bødevælgeren

  /* ---------- Ikoner ---------- */

  var IC = {
    crown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24"><path d="M3 17 2 7l5 3.5L12 4l5 6.5L22 7l-1 10H3z"></path><rect x="3.5" y="18.5" width="17" height="2.5" rx="1"></rect></svg>',
    flame: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.8 3.6-4.5 5.6-4.5 10a4.5 4.5 0 0 0 9 0c0-1.6-.9-2.9-.9-2.9s2.9 1.5 2.9 5.4a6.5 6.5 0 1 1-13 0C5.5 8.6 10.5 7 12 2z"></path></svg>',
    zap: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"></path></svg>',
    x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
    left: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"></path></svg>',
    right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"></path></svg>',
    plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>',
    save: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h11l3 3v15H5V3z"></path><path d="M8 3v5h7V3M8 21v-7h8v7"></path></svg>',
    edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L20 8l-4-4L4 16v4z"></path><path d="M13.5 6.5l4 4"></path></svg>',
    link: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"></path><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"></path></svg>'
  };

  /* ---------- Render ---------- */

  function h(html) { var d = document.createElement('div'); d.innerHTML = html; return d; }

  function render() {
    var app = document.getElementById('app');
    var brand = document.getElementById('brand-name');
    if (brand) brand.firstChild.textContent = state.clubName + ' Bødeligaen';
    document.title = state.clubName + ' Bødeligaen';
    renderSaveButtonOnly();

    var html = '';
    if (view.name === 'liga') html = viewLiga();
    else if (view.name === 'aar') html = viewYears();
    else if (view.name === 'aar-detalje') html = viewYearDetail();
    else if (view.name === 'mode') html = viewMeeting();
    else if (view.name === 'medlemmer') html = viewMembers();
    else if (view.name === 'takster') html = viewFineTypes();
    app.innerHTML = html;

    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i].getAttribute('data-tab');
      var active = (t === view.name) || (t === 'aar' && (view.name === 'aar-detalje' || view.name === 'mode'));
      tabs[i].className = 'tab' + (active ? ' active' : '');
    }
  }

  function renderSaveButtonOnly() {
    var saveWrap = document.getElementById('save-wrap');
    if (!saveWrap) return;
    saveWrap.innerHTML = artifactNS
      ? '<button class="btn small' + (dirty ? '' : ' secondary') + '" id="save-btn" data-action="publish">' + IC.save + (dirty ? 'Gem ændringer' : 'Alt gemt') + '</button>'
      : '';
  }

  function statStrip() {
    var cy = currentClubYear();
    return '<div class="stats">' +
      '<div class="stat"><div class="k">I kassen</div><div class="v green">' + kr(potTotal()) + '</div></div>' +
      '<div class="stat"><div class="k">Udestående</div><div class="v amber">' + kr(outstandingTotal()) + '</div></div>' +
      '<div class="stat"><div class="k">Klubår</div><div class="v">' + (cy ? esc(cy.label) : '–') + '</div></div>' +
      '</div>';
  }

  function viewLiga() {
    var members = activeMembers();
    if (!members.length) {
      return statStrip() +
        '<div class="empty"><div class="big">Ingen spillere endnu</div>' +
        'Tilføj klubbens medlemmer for at starte ligaen.' +
        '<div class="btn-row"><button class="btn" data-action="add-member">' + IC.plus + 'Tilføj medlem</button></div></div>';
    }
    var ranked = members.slice().sort(function (a, b) {
      var d = memberBalance(b.id) - memberBalance(a.id);
      return d !== 0 ? d : a.name.localeCompare(b.name, 'da');
    });
    var rows = '';
    var rank = 0, lastBal = null, shown = 0;
    ranked.forEach(function (m) {
      var bal = memberBalance(m.id);
      shown++;
      if (bal !== lastBal) { rank = shown; lastBal = bal; }
      var cnt = memberFineCount(m.id);
      var streak = memberMeetingStreak(m.id);
      var streakTxt = streak >= 2 ? ' · ' + streak + ' møder i træk' : '';
      if (bal <= 0) {
        rows += '<button class="lb-row clean" data-action="open-member" data-id="' + m.id + '">' +
          '<div class="rank">–</div><div class="who"><div class="name"><span class="nm">' + esc(m.name) + '</span>' + nameIcons(m.id) + '</div>' +
          '<div class="sub">Rent ark' + streakTxt + '</div></div>' +
          '<div class="count">' + cnt + '</div><div class="sum">0</div></button>';
      } else {
        rows += '<button class="lb-row rank-' + rank + '" data-action="open-member" data-id="' + m.id + '">' +
          '<div class="rank">' + rank + '</div>' +
          '<div class="who"><div class="name"><span class="nm">' + esc(m.name) + '</span>' + nameIcons(m.id) + (streak >= 2 ? flames(streak) : '') + '</div>' +
          '<div class="sub">' + cnt + ' bøde' + (cnt === 1 ? '' : 'r') + ' · betalt ' + kr(memberPaidTotal(m.id)) + streakTxt + '</div></div>' +
          '<div class="count">' + cnt + '</div>' +
          '<div class="sum">' + Math.round(bal) + '</div></button>';
      }
    });
    var sm = suggestMeeting();
    return statStrip() +
      streakPanel(members) +
      '<div class="colhead"><div class="c-rank">#</div><div class="c-name">Spiller</div><div class="c-count">Bøder</div><div class="c-sum">Gæld kr.</div></div>' +
      rows +
      (sm
        ? '<div class="actionbar"><button class="btn" data-action="open-meeting" data-id="' + sm.meeting.id + '">' +
          sm.verb + ' ' + esc(sm.meeting.title) + ' · ' + esc(meetingYearLabel(sm.meeting)) + '</button></div>'
        : '');
  }

  /* Gamified streak-oversigt på forsiden */
  function streakPanel(members) {
    var meetStreaks = members.map(function (m) { return { m: m, streak: memberMeetingStreak(m.id) }; })
      .filter(function (x) { return x.streak >= 2; })
      .sort(function (a, b) { return b.streak - a.streak; })
      .slice(0, 3);
    var typeStreaks = members.map(function (m) { return { m: m, top: memberTopType(m.id) }; })
      .filter(function (x) { return x.top && x.top.count >= 2; })
      .sort(function (a, b) { return b.top.count - a.top.count; })
      .slice(0, 3);

    var rows = '';
    meetStreaks.forEach(function (x) {
      rows += '<button class="streak-row" data-action="open-member" data-id="' + x.m.id + '">' +
        flames(x.streak) +
        '<div class="grow"><div class="t">' + esc(x.m.name) + '</div>' +
        '<div class="s">Bøde i ' + x.streak + ' møder i træk</div></div>' +
        '<div class="tag">' + streakTitle(x.streak) + '</div></button>';
    });
    typeStreaks.forEach(function (x) {
      var t = findFineType(x.top.typeId);
      rows += '<button class="streak-row" data-action="open-member" data-id="' + x.m.id + '">' +
        '<span class="mult">' + x.top.count + '×</span>' +
        '<div class="grow"><div class="t">' + esc(x.m.name) + '</div>' +
        '<div class="s">' + x.top.count + ' gange »' + esc(t ? t.category : '?') + '«</div></div>' +
        '<div class="tag">Stamkunde</div></button>';
    });
    return '<div class="streak-panel">' +
      '<div class="streak-head">' + IC.flame + '<span>Streaks</span></div>' +
      (rows || '<div class="note" style="margin: 4px 0 2px">Ingen aktive streaks — klubben opfører sig pænt. Mistænkeligt pænt.</div>') +
      '</div>';
  }

  function viewYears() {
    var years = state.clubYears.slice().sort(function (a, b) { return b.startYear - a.startYear; });
    var rows = years.map(function (y) {
      var ms = yearMeetings(y.id);
      var held = ms.filter(function (m) { return meetingFineCount(m.id) > 0 || m.closedAt; }).length;
      return '<button class="row" data-action="open-year" data-id="' + y.id + '">' +
        '<div class="grow"><div class="t">Klubår ' + esc(y.label) + '</div>' +
        '<div class="s">' + ms.length + ' møder · ' + held + ' afholdt</div></div>' +
        '<div class="amount">' + kr(yearTotal(y.id)) + '</div></button>';
    }).join('');
    var next = state.clubYears.reduce(function (a, y) { return Math.max(a, y.startYear); }, 2023) + 1;
    return '<div class="section-title"><h2>Klubår</h2><div class="hint">' + years.length + ' år</div></div>' +
      rows +
      '<div class="actionbar"><button class="btn" data-action="new-year">' + IC.plus + 'Opret klubår ' + yearLabel(next) + '</button></div>';
  }

  function viewYearDetail() {
    var y = findYear(view.yearId);
    if (!y) { view = { name: 'aar' }; return viewYears(); }
    var today = todayISO();
    var ms = yearMeetings(y.id);
    var open = ms.filter(function (m) { return !m.closedAt; });
    var nextUp = open.find(function (m) { return m.date >= today; });
    var rows = ms.map(function (m) {
      var cnt = meetingFineCount(m.id);
      var badge = m.closedAt ? '<span class="badge">Afsluttet</span>'
        : (cnt > 0 ? '<span class="badge live">I gang</span>'
          : (nextUp && m.id === nextUp.id ? '<span class="badge next">Næste</span>' : ''));
      return '<button class="row" data-action="open-meeting" data-id="' + m.id + '">' +
        '<div class="grow"><div class="t">' + esc(m.title) + '</div>' +
        '<div class="s">' + fmtDate(m.date) + (cnt ? ' · ' + cnt + ' bøde' + (cnt === 1 ? '' : 'r') : '') + '</div></div>' +
        badge +
        (cnt ? '<div class="amount">' + kr(meetingTotal(m.id)) + '</div>' : '<div class="amount" style="color: var(--faint)">–</div>') +
        '</button>';
    }).join('');
    return '<div class="meet-head">' +
      '<button class="iconbtn" data-action="goto" data-view="aar" aria-label="Tilbage">' + IC.left + '</button>' +
      '<div class="grow"><div class="t">Klubår ' + esc(y.label) + '</div><div class="s">' + ms.length + ' møder</div></div>' +
      '<div class="total">' + kr(yearTotal(y.id)) + '</div></div>' +
      rows +
      '<div class="actionbar"><button class="btn secondary" data-action="add-meeting" data-id="' + y.id + '">' + IC.plus + 'Tilføj ekstra møde</button></div>';
  }

  function renderLinks(links) {
    var lines = String(links || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) return '';
    return '<div class="link-list">' + lines.map(function (line) {
      var i = line.indexOf('http');
      if (i === -1) return '<div class="link-line">' + esc(line) + '</div>';
      var label = line.slice(0, i).replace(/[:\-–—]\s*$/, '').trim();
      var url = line.slice(i).trim();
      return '<div class="link-line">' + IC.link + '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(label || url) + '</a></div>';
    }).join('') + '</div>';
  }

  function viewMeeting() {
    var meet = findMeeting(view.meetingId);
    if (!meet) { view = { name: 'aar' }; return viewYears(); }
    var members = activeMembers();
    var meetFines = state.fines.filter(function (f) { return f.meetingId === meet.id; });
    var perMember = {};
    meetFines.forEach(function (f) { perMember[f.memberId] = (perMember[f.memberId] || 0) + f.amount; });

    var grid = members.map(function (m) {
      var sum = perMember[m.id] || 0;
      var n = meetFines.filter(function (f) { return f.memberId === m.id; }).length;
      return '<button class="member-cell' + (sum > 0 ? ' hit' : '') + '" data-action="pick-fines" data-id="' + m.id + '"' + (meet.closedAt ? ' disabled style="opacity:0.55"' : '') + '>' +
        '<div class="name">' + esc(m.name) + (state.formandId === m.id ? '<span class="crown">' + IC.crown + '</span>' : '') + '</div>' +
        '<div class="meta">' + (sum > 0 ? n + ' bøde' + (n === 1 ? '' : 'r') + ' · ' + kr(sum) : 'Ingen bøder') + '</div></button>';
    }).join('');

    var log = meetFines.slice().reverse().map(function (f) {
      var m = findMember(f.memberId);
      return '<div class="log-item">' +
        '<div class="grow"><div class="t">' + esc(m ? m.name : '?') + ' — ' + esc(fineLabel(f)) + '</div></div>' +
        '<div class="amount' + amtClass(f.amount) + '">' + (f.amount >= HOT_FINE ? IC.zap : '') + kr(f.amount) + '</div>' +
        (meet.closedAt ? '' : '<button class="x" data-action="remove-fine" data-id="' + f.id + '" aria-label="Fjern bøde">' + IC.x + '</button>') +
        '</div>';
    }).join('');

    var info = '';
    if (meet.description || (meet.links && meet.links.trim())) {
      info = '<div class="info-card">' +
        (meet.description ? '<div class="desc">' + esc(meet.description) + '</div>' : '') +
        renderLinks(meet.links) + '</div>';
    }

    return '<div class="meet-head">' +
      '<button class="iconbtn" data-action="goto" data-view="aar-detalje" data-id="' + meet.clubYearId + '" aria-label="Tilbage">' + IC.left + '</button>' +
      '<div class="grow"><div class="t">' + esc(meet.title) + '</div><div class="s">' + esc(meetingYearLabel(meet)) + ' · ' + fmtDate(meet.date) + (meet.closedAt ? ' · afsluttet' : '') + '</div></div>' +
      '<button class="iconbtn" data-action="edit-meeting" data-id="' + meet.id + '" aria-label="Rediger møde">' + IC.edit + '</button>' +
      '<div class="total">' + kr(meetingTotal(meet.id)) + '</div></div>' +
      info +
      (members.length
        ? '<div class="section-title"><h2>Klik en spiller</h2><div class="hint">…og derefter bøderne</div></div><div class="member-grid">' + grid + '</div>'
        : '<div class="empty">Tilføj medlemmer under fanen Medlemmer først.</div>') +
      '<div class="section-title"><h2>Mødets bøder</h2><div class="hint">' + meetFines.length + ' stk.</div></div>' +
      (log || '<div class="note">Ingen bøder registreret endnu.</div>') +
      '<div class="btn-row">' +
      (meet.closedAt
        ? '<button class="btn secondary" data-action="reopen-meeting" data-id="' + meet.id + '">Genåbn møde</button>'
        : '<button class="btn secondary" data-action="close-meeting" data-id="' + meet.id + '">Afslut møde</button>') +
      '<button class="btn danger" data-action="delete-meeting" data-id="' + meet.id + '">Slet møde</button></div>';
  }

  function viewMembers() {
    var rows = state.members.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'da'); })
      .map(function (m) {
        var bal = memberBalance(m.id);
        return '<button class="row' + (m.active ? '' : ' inactive') + '" data-action="open-member" data-id="' + m.id + '">' +
          '<div class="grow"><div class="t">' + esc(m.name) + (state.formandId === m.id ? ' <span class="crown">' + IC.crown + '</span>' : '') + '</div>' +
          '<div class="s">' + memberFineCount(m.id) + ' bøder · betalt ' + kr(memberPaidTotal(m.id)) + (m.active ? '' : ' · udmeldt') + '</div></div>' +
          '<div class="amount' + (bal <= 0 ? ' zero' : '') + '">' + kr(Math.max(0, bal)) + '</div></button>';
      }).join('');
    return '<div class="section-title"><h2>Medlemmer</h2><div class="hint">' + activeMembers().length + ' aktive</div></div>' +
      (rows || '<div class="empty"><div class="big">Ingen medlemmer</div>Tilføj klubbens medlemmer her.</div>') +
      '<div class="actionbar"><button class="btn" data-action="add-member">' + IC.plus + 'Tilføj medlem</button></div>';
  }

  function viewFineTypes() {
    var rows = state.fineTypes.filter(function (t) { return t.active; }).map(function (t) {
      return '<button class="row" data-action="edit-finetype" data-id="' + t.id + '">' +
        '<div class="grow"><div class="t">' + esc(t.category) + '</div><div class="s">' + esc(t.description) + '</div></div>' +
        '<div class="amount">' + kr(t.amount) + '</div></button>';
    }).join('');
    return '<div class="section-title"><h2>Takster</h2><div class="hint">Klik for at redigere</div></div>' + rows +
      '<div class="actionbar"><button class="btn" data-action="add-finetype">' + IC.plus + 'Ny takst</button></div>';
  }

  /* ---------- Modals ---------- */

  function openModal(title, bodyHtml, subtitle) {
    closeModal();
    var root = h('<div class="modal-root">' +
      '<div class="scrim" data-action="close-modal"></div>' +
      '<div class="sheet"><div class="sheet-head"><div class="t">' + title + (subtitle ? '<div class="s" style="font-family:var(--body); font-weight:400; text-transform:none; letter-spacing:0">' + subtitle + '</div>' : '') + '</div>' +
      '<button class="sheet-close" data-action="close-modal" aria-label="Luk">' + IC.x + '</button></div>' +
      '<div class="sheet-body">' + bodyHtml + '</div></div></div>').firstChild;
    document.body.appendChild(root);
    var f = root.querySelector('input, textarea');
    if (f && window.matchMedia('(min-width: 900px)').matches) f.focus();
  }
  function closeModal() {
    var m = document.querySelector('.modal-root');
    if (m) m.parentNode.removeChild(m);
  }

  var toastTimer = null;
  function toast(msg) {
    var old = document.querySelector('.toast');
    if (old) old.parentNode.removeChild(old);
    var t = h('<div class="toast">' + esc(msg) + '</div>').firstChild;
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 1600);
  }

  /* Bødevælger: klik bøder af for et medlem i et møde */
  function openFinePicker(memberId) {
    pickerMemberId = memberId;
    var meet = findMeeting(view.meetingId);
    var m = findMember(memberId);
    if (!meet || !m) return;
    var members = activeMembers();
    var idx = members.findIndex(function (x) { return x.id === memberId; });

    var mineFines = state.fines.filter(function (f) { return f.meetingId === meet.id && f.memberId === memberId; });
    var counts = {};
    mineFines.forEach(function (f) { if (f.fineTypeId) counts[f.fineTypeId] = (counts[f.fineTypeId] || 0) + 1; });
    var mySum = mineFines.reduce(function (a, f) { return a + f.amount; }, 0);

    var grid = state.fineTypes.filter(function (t) { return t.active; }).map(function (t) {
      return '<button class="fine-btn' + (t.amount >= HOT_FINE ? ' hot' : '') + '" data-action="give-fine" data-id="' + t.id + '">' +
        (counts[t.id] ? '<span class="n">' + counts[t.id] + '</span>' : '') +
        '<div class="cat">' + esc(t.category) + '</div>' +
        '<div class="amt' + amtClass(t.amount) + '">' + (t.amount >= HOT_FINE ? IC.zap : '') + kr(t.amount) + '</div></button>';
    }).join('') +
      '<button class="fine-btn special" data-action="special-fine">' +
      '<div class="cat">Særbøde</div><div class="desc">Frit beløb og egen beskrivelse</div></button>';

    var body =
      '<div class="picker-nav">' +
      '<button class="navbtn" data-action="picker-nav" data-dir="-1" aria-label="Forrige medlem">' + IC.left + '</button>' +
      '<div class="cur"><div class="name">' + esc(m.name) + '</div>' +
      '<div class="meta">' + (mineFines.length ? mineFines.length + ' bøder i dette møde · ' + kr(mySum) : 'Ingen bøder i dette møde endnu') + '</div></div>' +
      '<button class="navbtn" data-action="picker-nav" data-dir="1" aria-label="Næste medlem">' + IC.right + '</button>' +
      '</div>' +
      '<div class="fine-grid">' + grid + '</div>' +
      '<div class="note">Tryk på en takst for at give bøden — tryk flere gange for flere. Fortryd i mødets bødeliste.</div>';

    openModal('Giv bøder', body, esc(meet.title) + ' · spiller ' + (idx + 1) + ' af ' + members.length);
  }

  function openMemberSheet(memberId) {
    var m = findMember(memberId);
    if (!m) return;
    var bal = memberBalance(m.id);
    var streak = memberMeetingStreak(m.id);
    var topType = memberTopType(m.id);
    var events = [];
    state.fines.forEach(function (f) {
      if (f.memberId !== m.id) return;
      var meet = findMeeting(f.meetingId);
      events.push({ ts: f.ts, html: '<div class="log-item"><div class="grow"><div class="t">' + esc(fineLabel(f)) + '</div>' +
        '<div class="s">' + (meet ? esc(meet.title) + ' · ' + esc(meetingYearLabel(meet)) + ' · ' + fmtDate(meet.date) : '') + '</div></div>' +
        '<div class="amount' + amtClass(f.amount) + '">+' + kr(f.amount) + '</div></div>' });
    });
    state.payments.forEach(function (p) {
      if (p.memberId !== m.id) return;
      events.push({ ts: p.ts, html: '<div class="log-item"><div class="grow"><div class="t">Indbetaling' + (p.note ? ' — ' + esc(p.note) : '') + '</div>' +
        '<div class="s">' + fmtDate(p.date) + '</div></div>' +
        '<div class="amount pay">−' + kr(p.amount) + '</div>' +
        '<button class="x" data-action="remove-payment" data-id="' + p.id + '" aria-label="Slet indbetaling">' + IC.x + '</button></div>' });
    });
    events.sort(function (a, b) { return b.ts - a.ts; });

    var body =
      '<div class="stats" style="grid-template-columns: repeat(3, minmax(0,1fr))">' +
      '<div class="stat"><div class="k">Gæld</div><div class="v amber">' + kr(Math.max(0, bal)) + '</div></div>' +
      '<div class="stat"><div class="k">Bøder i alt</div><div class="v">' + kr(memberFineTotal(m.id)) + '</div></div>' +
      '<div class="stat"><div class="k">Betalt</div><div class="v green">' + kr(memberPaidTotal(m.id)) + '</div></div>' +
      '</div>' +
      (bal < 0 ? '<div class="note">Har ' + kr(-bal) + ' til gode i kassen.</div>' : '') +
      (streak >= 2
        ? '<div class="streak-strip">' + flames(streak) + '<span>' + streakTitle(streak) + '! Bøde i ' + streak + ' møder i træk.</span></div>'
        : '') +
      (topType && topType.count >= 2
        ? '<div class="note">Favoritsynd: ' + topType.count + '× »' + esc((findFineType(topType.typeId) || {}).category || '?') + '«</div>'
        : '') +
      '<div class="btn-row">' +
      '<button class="btn" data-action="pay-form" data-id="' + m.id + '">Registrer indbetaling</button>' +
      '<button class="btn secondary" data-action="rename-member" data-id="' + m.id + '">Omdøb</button>' +
      (m.active
        ? '<button class="btn danger" data-action="retire-member" data-id="' + m.id + '">Udmeld</button>'
        : '<button class="btn secondary" data-action="revive-member" data-id="' + m.id + '">Genindmeld</button>') +
      '</div>' +
      '<div class="btn-row"><button class="btn secondary" data-action="toggle-formand" data-id="' + m.id + '">' +
      (state.formandId === m.id ? 'Fjern som formand' : IC.crown + ' Gør til formand') + '</button></div>' +
      '<div class="section-title"><h2>Historik</h2><div class="hint">' + events.length + ' posteringer</div></div>' +
      '<div class="hist">' + (events.map(function (e) { return e.html; }).join('') || '<div class="note">Ingen posteringer endnu.</div>') + '</div>';

    openModal(esc(m.name) + (state.formandId === m.id ? ' <span class="crown">' + IC.crown + '</span>' : ''), body,
      (state.formandId === m.id ? 'Formand' : '') + (m.active ? '' : (state.formandId === m.id ? ' · udmeldt' : 'Udmeldt')));
  }

  function openPayForm(memberId) {
    var m = findMember(memberId);
    if (!m) return;
    var bal = memberBalance(m.id);
    var body =
      '<label for="pay-amount">Beløb (kr.)</label>' +
      '<input id="pay-amount" type="number" inputmode="numeric" min="1" step="1" value="' + Math.max(0, bal) + '">' +
      '<label for="pay-date">Dato</label>' +
      '<input id="pay-date" type="date" value="' + todayISO() + '">' +
      '<label for="pay-note">Note (valgfri)</label>' +
      '<input id="pay-note" type="text" placeholder="fx MobilePay">' +
      '<div class="btn-row"><button class="btn" data-action="pay-save" data-id="' + m.id + '">Registrer indbetaling</button></div>' +
      (bal > 0 ? '<div class="note">Udfyldt med hele gælden (' + kr(bal) + ') — ret beløbet ved delvis indbetaling.</div>' : '');
    openModal('Indbetaling', body, esc(m.name) + ' · gæld ' + kr(Math.max(0, bal)));
  }

  function openSpecialFineForm() {
    var body =
      '<label for="sp-label">Hvad er synden?</label>' +
      '<input id="sp-label" type="text" placeholder="fx Tabt væddemål">' +
      '<label for="sp-amount">Beløb (kr.)</label>' +
      '<input id="sp-amount" type="number" inputmode="numeric" min="1" step="1" value="50">' +
      '<div class="btn-row"><button class="btn" data-action="special-save">Giv særbøden</button></div>';
    var m = findMember(pickerMemberId);
    openModal('Særbøde', body, m ? 'Til ' + esc(m.name) : '');
  }

  function openMemberForm() {
    var body =
      '<label for="mem-name">Navn</label>' +
      '<input id="mem-name" type="text" placeholder="fx Frederik" autocomplete="off">' +
      '<div class="btn-row"><button class="btn" data-action="member-save">Tilføj</button>' +
      '<button class="btn secondary" data-action="member-save-more">Tilføj og fortsæt</button></div>' +
      '<div class="note">Brug &raquo;Tilføj og fortsæt&laquo; til hurtigt at taste hele klubben ind.</div>';
    openModal('Nyt medlem', body);
  }

  function openMeetingEditForm(meetingId) {
    var m = findMeeting(meetingId);
    if (!m) return;
    var body =
      '<label for="meet-title">Titel</label>' +
      '<input id="meet-title" type="text" value="' + esc(m.title) + '">' +
      '<label for="meet-date">Dato</label>' +
      '<input id="meet-date" type="date" value="' + esc(m.date || '') + '">' +
      '<label for="meet-desc">Beskrivelse</label>' +
      '<textarea id="meet-desc" rows="3" placeholder="Dagsorden, indlægsholder, sted …">' + esc(m.description) + '</textarea>' +
      '<label for="meet-links">Links (ét pr. linje)</label>' +
      '<textarea id="meet-links" rows="3" placeholder="Referat: https://…&#10;Slides: https://…">' + esc(m.links) + '</textarea>' +
      '<div class="btn-row"><button class="btn" data-action="meeting-save" data-id="' + m.id + '">Gem møde</button></div>' +
      '<div class="note">Skriv evt. en etiket før linket, fx &raquo;Referat: https://…&laquo;</div>';
    openModal('Rediger møde', body, esc(meetingYearLabel(m)));
  }

  function openFineTypeForm(typeId) {
    var t = typeId ? findFineType(typeId) : null;
    var body =
      '<label for="ft-cat">Bødekategori</label>' +
      '<input id="ft-cat" type="text" value="' + (t ? esc(t.category) : '') + '" placeholder="fx Mobil">' +
      '<label for="ft-desc">Beskrivelse</label>' +
      '<textarea id="ft-desc" rows="2" placeholder="Hvornår gives bøden?">' + (t ? esc(t.description) : '') + '</textarea>' +
      '<label for="ft-amount">Beløb (kr.)</label>' +
      '<input id="ft-amount" type="number" inputmode="numeric" min="1" step="1" value="' + (t ? t.amount : 50) + '">' +
      '<div class="btn-row"><button class="btn" data-action="finetype-save" data-id="' + (t ? t.id : '') + '">Gem takst</button>' +
      (t ? '<button class="btn danger" data-action="finetype-remove" data-id="' + t.id + '">Fjern</button>' : '') +
      '</div>' +
      (t ? '<div class="note">At fjerne taksten sletter ikke allerede givne bøder.</div>' : '');
    openModal(t ? 'Rediger takst' : 'Ny takst', body);
  }

  function openSettings() {
    var body =
      '<label for="set-club">Klubnavn</label>' +
      '<input id="set-club" type="text" value="' + esc(state.clubName) + '">' +
      '<div class="btn-row"><button class="btn" data-action="settings-save">Gem</button></div>' +
      '<hr class="divider">' +
      '<div class="btn-row"><button class="btn secondary" data-action="export-json">Eksportér data (JSON)</button>' +
      '<button class="btn secondary" data-action="import-json">Importér data</button></div>' +
      '<input id="import-file" type="file" accept="application/json" hidden>' +
      '<hr class="divider">' +
      '<div class="btn-row"><button class="btn danger" data-action="reset-all">Nulstil alt</button></div>' +
      '<div class="note">Data gemmes automatisk i denne browser.' + (artifactNS ? ' Brug &raquo;Gem ændringer&laquo; i toppen for at gemme til den delte side.' : '') + '</div>';
    openModal('Indstillinger', body);
  }

  /* ---------- Handlinger ---------- */

  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function num(id) { var n = parseInt(val(id), 10); return isNaN(n) ? 0 : n; }

  var actions = {
    'goto': function (el) {
      var v = el.getAttribute('data-view');
      view = { name: v };
      if (v === 'aar-detalje') view.yearId = el.getAttribute('data-id');
      render();
    },
    'close-modal': function () { closeModal(); pickerMemberId = null; render(); },
    'publish': function () { publishShared(); },
    'settings': function () { openSettings(); },

    'new-year': function () {
      var next = state.clubYears.reduce(function (a, y) { return Math.max(a, y.startYear); }, 2023) + 1;
      var cy = ensureYear(state, next);
      topUpMeetings(state, cy);
      view = { name: 'aar-detalje', yearId: cy.id };
      commit();
      toast('Klubår ' + cy.label + ' oprettet med ' + MEETINGS_PER_YEAR + ' møder');
    },
    'open-year': function (el) { view = { name: 'aar-detalje', yearId: el.getAttribute('data-id') }; render(); },
    'add-meeting': function (el) {
      var cy = findYear(el.getAttribute('data-id'));
      if (!cy) return;
      var mine = yearMeetings(cy.id);
      var no = mine.reduce(function (a, m) { return Math.max(a, m.number); }, 0) + 1;
      state.meetings.push({
        id: uid(), clubYearId: cy.id, number: no, title: 'Møde ' + no,
        date: scheduledDate(cy.startYear, no), description: '', links: '', closedAt: null
      });
      commit();
      toast('Møde ' + no + ' tilføjet');
    },

    'open-meeting': function (el) { view = { name: 'mode', meetingId: el.getAttribute('data-id') }; render(); },
    'edit-meeting': function (el) { openMeetingEditForm(el.getAttribute('data-id')); },
    'meeting-save': function (el) {
      var m = findMeeting(el.getAttribute('data-id'));
      if (!m) return;
      var title = val('meet-title').trim();
      if (title) m.title = title;
      m.date = val('meet-date') || m.date;
      m.description = val('meet-desc').trim();
      m.links = val('meet-links').trim();
      closeModal();
      commit();
    },
    'close-meeting': function (el) {
      var m = findMeeting(el.getAttribute('data-id'));
      if (m) { m.closedAt = Date.now(); commit(); toast(m.title + ' afsluttet — ' + kr(meetingTotal(m.id)) + ' i bøder'); }
    },
    'reopen-meeting': function (el) {
      var m = findMeeting(el.getAttribute('data-id'));
      if (m) { m.closedAt = null; commit(); }
    },
    'delete-meeting': function (el) {
      var m = findMeeting(el.getAttribute('data-id'));
      if (!m) return;
      var cnt = meetingFineCount(m.id);
      if (!window.confirm('Slet ' + m.title + (cnt ? ' og dets ' + cnt + ' bøder' : '') + '?')) return;
      state.fines = state.fines.filter(function (f) { return f.meetingId !== m.id; });
      state.meetings = state.meetings.filter(function (x) { return x.id !== m.id; });
      view = { name: 'aar-detalje', yearId: m.clubYearId };
      commit();
    },

    'pick-fines': function (el) { openFinePicker(el.getAttribute('data-id')); },
    'picker-nav': function (el) {
      var members = activeMembers();
      var idx = members.findIndex(function (x) { return x.id === pickerMemberId; });
      if (idx === -1) return;
      var next = (idx + parseInt(el.getAttribute('data-dir'), 10) + members.length) % members.length;
      openFinePicker(members[next].id);
    },
    'give-fine': function (el) {
      var t = findFineType(el.getAttribute('data-id'));
      var m = findMember(pickerMemberId);
      var meet = findMeeting(view.meetingId);
      if (!t || !m || !meet || meet.closedAt) return;
      state.fines.push({ id: uid(), meetingId: meet.id, memberId: m.id, fineTypeId: t.id, label: null, amount: t.amount, ts: Date.now() });
      commitQuiet();
      toast(m.name + ': ' + t.category + ' · ' + kr(t.amount));
      openFinePicker(m.id); // genopfrisk vælgeren med nye tællere
    },
    'special-fine': function () { openSpecialFineForm(); },
    'special-save': function () {
      var label = val('sp-label').trim() || 'Særbøde';
      var amount = num('sp-amount');
      var m = findMember(pickerMemberId);
      var meet = findMeeting(view.meetingId);
      if (!m || !meet || amount <= 0) return;
      state.fines.push({ id: uid(), meetingId: meet.id, memberId: m.id, fineTypeId: null, label: label, amount: amount, ts: Date.now() });
      commitQuiet();
      toast(m.name + ': ' + label + ' · ' + kr(amount));
      openFinePicker(m.id);
    },
    'remove-fine': function (el) {
      state.fines = state.fines.filter(function (f) { return f.id !== el.getAttribute('data-id'); });
      commit();
    },

    'open-member': function (el) { openMemberSheet(el.getAttribute('data-id')); },
    'add-member': function () { openMemberForm(); },
    'member-save': function () { saveMember(false); },
    'member-save-more': function () { saveMember(true); },
    'rename-member': function (el) {
      var m = findMember(el.getAttribute('data-id'));
      if (!m) return;
      var name = window.prompt('Nyt navn:', m.name);
      if (name && name.trim()) { m.name = name.trim(); closeModal(); commit(); }
    },
    'retire-member': function (el) {
      var m = findMember(el.getAttribute('data-id'));
      if (m) { m.active = false; closeModal(); commit(); }
    },
    'revive-member': function (el) {
      var m = findMember(el.getAttribute('data-id'));
      if (m) { m.active = true; closeModal(); commit(); }
    },
    'toggle-formand': function (el) {
      var m = findMember(el.getAttribute('data-id'));
      if (!m) return;
      var was = state.formandId === m.id;
      state.formandId = was ? null : m.id;
      commitQuiet();
      toast(was ? m.name + ' er ikke længere formand' : 'Længe leve formand ' + m.name + '!');
      openMemberSheet(m.id);
    },

    'pay-form': function (el) { openPayForm(el.getAttribute('data-id')); },
    'pay-save': function (el) {
      var m = findMember(el.getAttribute('data-id'));
      var amount = num('pay-amount');
      if (!m || amount <= 0) return;
      state.payments.push({ id: uid(), memberId: m.id, amount: amount, date: val('pay-date') || todayISO(), note: val('pay-note').trim(), ts: Date.now() });
      closeModal();
      commit();
      toast(m.name + ' indbetalte ' + kr(amount));
    },
    'remove-payment': function (el) {
      if (!window.confirm('Slet denne indbetaling?')) return;
      var id = el.getAttribute('data-id');
      var p = state.payments.find(function (x) { return x.id === id; });
      state.payments = state.payments.filter(function (x) { return x.id !== id; });
      commit();
      if (p) openMemberSheet(p.memberId);
    },

    'add-finetype': function () { openFineTypeForm(null); },
    'edit-finetype': function (el) { openFineTypeForm(el.getAttribute('data-id')); },
    'finetype-save': function (el) {
      var cat = val('ft-cat').trim();
      var amount = num('ft-amount');
      if (!cat || amount <= 0) { toast('Udfyld kategori og beløb'); return; }
      var id = el.getAttribute('data-id');
      var t = id ? findFineType(id) : null;
      if (t) { t.category = cat; t.description = val('ft-desc').trim(); t.amount = amount; }
      else state.fineTypes.push({ id: uid(), category: cat, description: val('ft-desc').trim(), amount: amount, active: true });
      closeModal();
      commit();
    },
    'finetype-remove': function (el) {
      var t = findFineType(el.getAttribute('data-id'));
      if (t && window.confirm('Fjern taksten »' + t.category + '«?')) { t.active = false; closeModal(); commit(); }
    },

    'settings-save': function () {
      var name = val('set-club').trim();
      if (name) state.clubName = name;
      closeModal();
      commit();
    },
    'export-json': function () {
      var json = JSON.stringify(state, null, 2);
      var fname = state.clubName.toLowerCase().replace(/[^a-z0-9æøå-]+/g, '-') + '-boedeliga-' + todayISO() + '.json';
      if (downloadsNS) {
        downloadsNS.save({ filename: fname, data: json }).then(function () { toast('Fil gemt'); })
          .catch(function () { /* afvist af brugeren — ingen fejl */ });
        return;
      }
      var blob = new Blob([json], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    },
    'import-json': function () {
      var input = document.getElementById('import-file');
      if (!input) return;
      input.onchange = function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var s = JSON.parse(String(reader.result));
            if (!s || (s.version !== 1 && s.version !== 2) || !Array.isArray(s.members)) throw new Error('bad');
            if (!window.confirm('Erstat alle nuværende data med det importerede?')) return;
            state = migrate(s);
            view = { name: 'liga' };
            closeModal();
            commit();
            toast('Data importeret');
          } catch (e) { toast('Kunne ikke læse filen'); }
        };
        reader.readAsText(file);
      };
      input.click();
    },
    'reset-all': function () {
      if (!window.confirm('Slet ALLE medlemmer, møder, bøder og indbetalinger?')) return;
      if (!window.confirm('Helt sikker? Dette kan ikke fortrydes.')) return;
      state = freshState();
      view = { name: 'liga' };
      closeModal();
      commit();
    }
  };

  function saveMember(keepOpen) {
    var name = val('mem-name').trim();
    if (!name) return;
    state.members.push({ id: uid(), name: name, active: true, createdAt: Date.now() });
    if (keepOpen) {
      commitQuiet();
      toast(name + ' tilføjet');
      var f = document.getElementById('mem-name');
      if (f) { f.value = ''; f.focus(); }
    } else {
      closeModal();
      commit();
      toast(name + ' tilføjet');
    }
  }

  /* ---------- Events ---------- */

  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el !== document) {
      if (el.tagName === 'A') return; // links i mødebeskrivelser skal bare virke
      var action = el.getAttribute && el.getAttribute('data-action');
      if (action && actions[action]) {
        if (!el.hasAttribute('disabled')) actions[action](el);
        return;
      }
      var tab = el.getAttribute && el.getAttribute('data-tab');
      if (tab) { view = { name: tab }; render(); return; }
      el = el.parentNode;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeModal(); pickerMemberId = null; render(); }
    if (e.key === 'Enter' && document.querySelector('.modal-root')) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input') {
        var primary = document.querySelector('.modal-root .btn-row .btn:not(.secondary):not(.danger)');
        if (primary) { e.preventDefault(); primary.click(); }
      }
    }
  });

  /* ---------- Start ---------- */

  loadState();
  render();
  initArtifact();
})();

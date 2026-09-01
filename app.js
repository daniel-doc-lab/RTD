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
      version: 4,
      updatedAt: Date.now(),
      clubName: 'RTD',
      formandId: null,
      members: seedMembers(),
      fineTypes: seedFineTypes(),
      clubYears: [],
      meetings: [],
      fines: [],
      payments: [],
      audit: [],
      trash: []
    };
    for (var y = 2024; y <= startYearFromDate(null); y++) ensureYear(s, y);
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

  function nf(n) {
    var neg = n < 0;
    return (neg ? '−' : '') + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function kr(n) { return nf(n) + ' kr.'; }

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
        title: 'Møde ' + maxNo, date: scheduledDate(cy.startYear, mine.length + 1),
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
      for (var y = 2024; y <= startYearFromDate(null); y++) ensureYear(s, y);
      s.clubYears.forEach(function (cy) { topUpMeetings(s, cy); });
      s.version = 2;
    }
    if (s.version === 2) {
      if (!s.members || !s.members.length) s.members = seedMembers();
      s.version = 3;
    }
    if (s.version === 3) {
      s.audit = [];
      s.trash = [];
      s.version = 4;
    }
    return normalize(s);
  }

  /* Gør vilkårlig (fx importeret) state ufarlig: alle arrays findes, tal er tal */
  function normalize(s) {
    ['members', 'fineTypes', 'clubYears', 'meetings', 'fines', 'payments', 'audit', 'trash'].forEach(function (k) {
      if (!Array.isArray(s[k])) s[k] = [];
    });
    s.clubYears.forEach(function (y) { if (y.closedAt === undefined) y.closedAt = null; });
    if (typeof s.clubName !== 'string' || !s.clubName) s.clubName = 'RTD';
    if (s.formandId === undefined) s.formandId = null;
    s.fineTypes.forEach(function (t) { t.amount = Number(t.amount) || 0; if (typeof t.icon !== 'string') t.icon = ''; });
    s.fines.forEach(function (f) { f.amount = Number(f.amount) || 0; if (!f.ts) f.ts = 0; });
    s.payments.forEach(function (p) { p.amount = Number(p.amount) || 0; if (!p.ts) p.ts = 0; });
    s.meetings.forEach(function (m) {
      if (typeof m.title !== 'string' || !m.title) m.title = 'Møde ' + m.number;
      if (m.description == null) m.description = '';
      if (m.links == null) m.links = '';
    });
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
    purgeTrash();
  }

  /* Papirkurv: poster ryddes permanent efter 30 dage */
  var TRASH_DAYS = 30;
  function purgeTrash() {
    var cutoff = Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000;
    state.trash = state.trash.filter(function (t) { return (t.deletedAt || 0) >= cutoff; });
  }

  /* Revisionslog: hvad skete hvornår */
  function log(text) {
    state.audit.unshift({ ts: Date.now(), text: text });
    if (state.audit.length > 800) state.audit.length = 800;
  }
  function fmtDateTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var mi = d.getMinutes();
    return fmtDate(isoOf(d)) + ' kl. ' + d.getHours() + ':' + (mi < 10 ? '0' : '') + mi;
  }

  /* Visningstilstand: skjuler al registrering på denne enhed */
  var VIEWER_KEY = 'rtd-viewer-mode';
  var viewerMode = false;
  try { viewerMode = localStorage.getItem(VIEWER_KEY) === '1'; } catch (e) { /* utilgængelig */ }
  function setViewerMode(on) {
    viewerMode = on;
    try { localStorage.setItem(VIEWER_KEY, on ? '1' : '0'); } catch (e) { /* utilgængelig */ }
  }
  /* Handlinger der ændrer data — blokeres i visningstilstand */
  var MUTATING = {
    'new-year': 1, 'add-meeting': 1, 'edit-meeting': 1, 'meeting-save': 1, 'close-meeting': 1,
    'reopen-meeting': 1, 'delete-meeting': 1, 'season-close': 1, 'season-reopen': 1,
    'pick-fines': 1, 'give-fine': 1, 'special-fine': 1, 'special-save': 1, 'remove-fine': 1,
    'add-member': 1, 'member-save': 1, 'member-save-more': 1, 'rename-member': 1,
    'retire-member': 1, 'revive-member': 1, 'delete-member': 1, 'toggle-formand': 1,
    'pay-form': 1, 'pay-save': 1, 'remove-payment': 1,
    'add-finetype': 1, 'edit-finetype': 1, 'finetype-save': 1, 'finetype-remove': 1,
    'settings-save': 1, 'import-json': 1, 'reset-all': 1, 'trash-restore': 1
  };

  function commit() {
    state.updatedAt = Date.now();
    writeLocal();
    dirty = true;
    render();
  }

  /* Gem uden fuld re-render (bruges når en modal skal blive stående) */
  function commitQuiet() {
    state.updatedAt = Date.now();
    writeLocal();
    dirty = true;
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
    var junk = clone.querySelectorAll('.modal-root, .toast, .tip, .confetti, .bigfine, .report-overlay');
    for (var i = 0; i < junk.length; i++) junk[i].parentNode.removeChild(junk[i]);
    return '<!doctype html>\n' + clone.outerHTML;
  }

  var publishing = false;
  function publishShared() {
    if (!artifactNS || !dirty || publishing) return;
    publishing = true;
    renderSaveButtonOnly();
    artifactNS.publish(serializeDocument()).then(function () {
      publishing = false;
      dirty = false;
      toast('Gemt for alle');
      render();
    }).catch(function (err) {
      publishing = false;
      renderSaveButtonOnly();
      var code = String((err && err.code) || err || '');
      if (code.indexOf('conflict') !== -1) {
        toast('En anden har gemt — indlæser deres version');
      } else if (code.indexOf('not_writer') !== -1 || code.indexOf('not_granted') !== -1) {
        setViewerMode(true);
        toast('Du har kun læseadgang — visningstilstand slået til');
        render();
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


  /* ---------- Bøde-ikoner ---------- */

  /* Ikonbibliotek til takster. Nøgleordene matcher mod kategori + beskrivelse,
     så nye og redigerede bøder automatisk får et passende ikon. */
  var FI = {
    mobil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.2"></rect><path d="M10.5 5.5h3"></path><circle cx="12" cy="18" r="1"></circle><path d="M19.5 6.5c1 1 1 3 0 4M21.5 4.5c2 2 2 6 0 8" opacity="0.7"></path></svg>',
    attitude: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M8.5 15.5c1-1.4 5.5-1.4 7 0"></path><path d="M8 9.5l2 1M16 9.5l-2 1"></path></svg>',
    krone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 17.5 3 7.5l4.5 3L12 4.5l4.5 6 4.5-3-1 10z"></path><path d="M4.5 20.5h15" stroke-linecap="round"></path></svg>',
    kaos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h7M4 12h5M4 18h9"></path><path d="M15 5l5 5M20 5l-5 5"></path><circle cx="17.5" cy="16.5" r="3"></circle></svg>',
    kalender: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2"></rect><path d="M8 3v4M16 3v4M3.5 10h17"></path><path d="M9.5 14.5l5 4M14.5 14.5l-5 4"></path></svg>',
    stopur: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13.5" r="7.5"></circle><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5M18.5 7l1.5-1.5"></path></svg>',
    kaede: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4.5c-1 2.5-1 5 1 7M17 4.5c1 2.5 1 5-1 7"></path><path d="M8 11.5h8"></path><circle cx="12" cy="16.5" r="3.2"></circle><path d="M12 13.3v-1.8"></path></svg>',
    rejsesig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5.5" r="2.5"></circle><path d="M9 8.5v6M6.5 21l2.5-6.5L11.5 21M6 11.5h6"></path><path d="M17.5 14V6M15 8.5l2.5-2.5L20 8.5"></path></svg>',
    afbryd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5h9a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H7l-4 3z"></path><path d="M17 5l4 4M21 5l-4 4"></path></svg>',
    dokument: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v4h4M9 11h6M9 14.5h6M9 18h3.5"></path></svg>',
    ghost: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20V10a7 7 0 0 1 14 0v10l-2.3-2-2.4 2-2.3-2-2.4 2z"></path><path d="M9.5 9.5h.01M14.5 9.5h.01"></path></svg>',
    naal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"></circle><path d="M12 11.5V21M9.5 13.5h5"></path></svg>',
    toilet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4"></path><path d="M4.5 4h15M9.5 17.5 8 21M14.5 17.5 16 21"></path></svg>',
    pligt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4.5h6v2.5H9z"></path><path d="M6 6.5h12v14H6z"></path><path d="M9 12l2 2 4-4"></path></svg>',
    loeb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="4.8" r="2.2"></circle><path d="M12.5 9 9 12l2.5 3 1 5M12.5 9l4 2 1.5 3M9 12l-3.5 1M12 15l-3.5 4"></path></svg>',
    glemsom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0-3 11.2V17h6v-2.8A6 6 0 0 0 12 3z"></path><path d="M9.5 20h5"></path><path d="M10.2 9.5a1.9 1.9 0 1 1 2.3 2c-.5.2-.7.6-.7 1.1"></path></svg>',
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16v13H4z"></path><path d="M4 9.5h16"></path><path d="M8.5 13h2.5M8.5 16h6"></path><path d="M17 13.5l2.5 2.5-2.5 2.5" opacity="0.65"></path></svg>',
    penge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"></circle><path d="M14.5 9c-.7-.9-1.7-1.3-2.8-1.3-1.9 0-3.2 1.2-3.2 3s1.3 3 3.2 3c1.1 0 2.1-.4 2.8-1.3M8 11.2h5M8 13.2h4"></path></svg>',
    hammer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 6.5 17 3l4 4-3.5 3.5z"></path><path d="M15.5 8.5 6 18l-2-2 9.5-9.5"></path><path d="M3 21h8"></path></svg>',
    fest: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20.5 9.5 9l5.5 5.5z"></path><path d="M14 3.5v2M18.5 6l1.5-1.5M17 10.5h2.5M13 8.5l1.5 1.5"></path></svg>',
    stjerne: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3.8 2.5 5.3 5.7.8-4.2 4 1 5.7-5-2.8-5 2.8 1-5.7-4.2-4 5.7-.8z"></path></svg>'
  };

  /* Nøgleord/fraser → ikon (adskilt af |). Første match vinder,
     derfor står de mest specifikke regler øverst. */
  var FINE_ICON_RULES = [
    ['mobil|telefon|skærm|skaerm|sms', 'mobil'],
    ['formandskæde|formandskaede|kæde|kaede', 'kaede'],
    ['formand', 'krone'],
    ['nål|naal|emblem', 'naal'],
    ['toilet|wc|diarré|diarre', 'toilet'],
    ['fremmøde|fremmode|fremmødt|udeblev|udebliver|mødte ikke op|modte ikke op', 'ghost'],
    ['afmelding|afmelder|afbud|framelding', 'kalender'],
    ['for sent|forsinket|forsinkelse|to late|kommer sent', 'stopur'],
    ['referat|rapport|skriftlig|notat', 'dokument'],
    ['rejse sig|rejser sig|oprejst|stå op|staa op', 'rejsesig'],
    ['afbryd|i munden|taler i', 'afbryd'],
    ['planlægning|planlaegning|planlagt|planlægger|planlaegger|god tid', 'plan'],
    ['pligt|tjans|opgave', 'pligt'],
    ['glemt|glemmer|glemsom|husker ikke', 'glemsom'],
    ['adfærd|adfaerd|opførsel|opforsel|arrogance|respektløs|respektlos|dumme', 'attitude'],
    ['diverse|blander|rod', 'kaos'],
    ['væddemål|vaeddemaal|odds|spil om', 'penge'],
    ['bøde|boede|straf', 'hammer'],
    ['fest|øl|oel|drukket|skål|skaal', 'fest'],
    ['løb|loeb|sport|træning|traening|motion', 'loeb']
  ];

  /* Vælger ikon for en takst — matcher på kategori først, derefter beskrivelse.
     Uden match gives et neutralt stjerne-ikon, så alle bøder altid har grafik. */
  function fineIconKey(category, description) {
    var cat = String(category || '').toLowerCase();
    var desc = String(description || '').toLowerCase();
    for (var pass = 0; pass < 2; pass++) {
      var hay = pass === 0 ? cat : cat + ' ' + desc;
      for (var i = 0; i < FINE_ICON_RULES.length; i++) {
        var phrases = FINE_ICON_RULES[i][0].split('|');
        for (var w = 0; w < phrases.length; w++) {
          if (phrases[w] && hay.indexOf(phrases[w]) !== -1) return FINE_ICON_RULES[i][1];
        }
      }
    }
    return 'stjerne';
  }

  function fineIcon(t, cls) {
    var key = (t && t.icon && FI[t.icon]) ? t.icon : fineIconKey(t && t.category, t && t.description);
    return '<span class="fine-ic' + (cls ? ' ' + cls : '') + '">' + FI[key] + '</span>';
  }

  /* Ikon for en given bøde (takstbaseret eller særbøde) */
  function fineIconFor(f) {
    if (f.fineTypeId) {
      var t = findFineType(f.fineTypeId);
      if (t) return fineIcon(t);
    }
    return '<span class="fine-ic">' + FI[fineIconKey(f.label, '')] + '</span>';
  }


  /* ---------- Visuelle byggeklodser ---------- */

  /* #2 Avatar: monogram i en fast farve afledt af medlemmets id */
  var AVATAR_HUES = [12, 32, 48, 96, 145, 172, 196, 214, 250, 280, 315, 340];
  function avatarHue(id) {
    var h = 0, str = String(id || '');
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
    return AVATAR_HUES[h % AVATAR_HUES.length];
  }
  function initials(name) {
    var parts = String(name || '?').trim().split(/\s+/);
    var a = parts[0] ? parts[0].charAt(0) : '?';
    var b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (a + b).toUpperCase();
  }
  function avatar(m, cls) {
    return '<span class="avatar' + (cls ? ' ' + cls : '') + '" style="--av: ' + avatarHue(m.id) + '">' +
      esc(initials(m.name)) + '</span>';
  }

  /* #3 Medalje til top-3 i stedet for et tal */
  var MEDAL_COLS = {
    1: ['#ffe9a8', '#fbbf24', '#a9760a'],
    2: ['#f2f5f8', '#c0c7ce', '#7d868f'],
    3: ['#e6bd92', '#b07b45', '#6f4a26']
  };
  function medal(rank) {
    var c = MEDAL_COLS[rank];
    if (!c) return '<div class="rank">' + rank + '</div>';
    var gid = 'mg' + rank;
    return '<div class="rank medal"><svg viewBox="0 0 34 42" aria-hidden="true">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + c[0] + '"></stop><stop offset="0.55" stop-color="' + c[1] + '"></stop>' +
      '<stop offset="1" stop-color="' + c[2] + '"></stop></linearGradient></defs>' +
      '<path d="M8 1h7l-3.5 12L5 10z" fill="' + c[1] + '" opacity="0.75"></path>' +
      '<path d="M26 1h-7l3.5 12L29 10z" fill="' + c[2] + '" opacity="0.75"></path>' +
      '<circle cx="17" cy="28" r="12" fill="url(#' + gid + ')"></circle>' +
      '<circle cx="17" cy="28" r="12" fill="none" stroke="' + c[2] + '" stroke-width="1.2"></circle>' +
      '<text x="17" y="33.5" text-anchor="middle" class="medal-no">' + rank + '</text>' +
      '</svg></div>';
  }

  /* #4 Mini-sparkline: medlemmets bøder i de seneste afholdte møder */
  function sparkline(mid) {
    var held = heldMeetings().slice(-6);
    if (held.length < 3) return '';
    var vals = held.map(function (mt) {
      return state.fines.reduce(function (a, f) {
        return f.meetingId === mt.id && f.memberId === mid ? a + f.amount : a;
      }, 0);
    });
    var max = vals.reduce(function (a, v) { return Math.max(a, v); }, 0);
    var n = vals.length, bw = 5, gap = 3, hgt = 16, w = n * bw + (n - 1) * gap;
    var out = '<svg class="spark" viewBox="0 0 ' + w + ' ' + hgt + '" aria-hidden="true">';
    vals.forEach(function (v, i) {
      var x = i * (bw + gap);
      if (max === 0 || v === 0) {
        out += '<rect x="' + x.toFixed(1) + '" y="' + (hgt - 2) + '" width="' + bw.toFixed(1) + '" height="2" rx="1" fill="#2c3846"></rect>';
      } else {
        var bh = Math.max(3, Math.round((hgt - 2) * (v / max)));
        out += '<rect x="' + x.toFixed(1) + '" y="' + (hgt - bh) + '" width="' + bw.toFixed(1) + '" height="' + bh + '" rx="1.5" fill="currentColor"></rect>';
      }
    });
    return out + '</svg>';
  }

  /* #5 Fremskridtsbjælke: hvor stor en del af de samlede bøder der er betalt */
  function payBar(mid) {
    var fined = memberFineTotal(mid), paid = memberPaidTotal(mid);
    if (fined <= 0) return '';
    var pct = Math.max(0, Math.min(100, Math.round(100 * paid / fined)));
    return '<span class="paybar"><i style="width: ' + pct + '%"></i></span>';
  }

  /* #8 Fast farve pr. klubår — følger med i lister, headere og grafer */
  var YEAR_COLORS = ['#fbbf24', '#5eead4', '#f3798d', '#a78bfa', '#7dd3fc', '#9fe870'];
  function yearColor(y) {
    if (!y) return '#fbbf24';
    var i = ((y.startYear % YEAR_COLORS.length) + YEAR_COLORS.length) % YEAR_COLORS.length;
    return YEAR_COLORS[i];
  }

  /* ---------- Streaks og dyre bøder ---------- */

  var HOT_FINE = 300;  // beløb der markeres som "dyr bøde"
  var MID_FINE = 100;

  function amtClass(amount) {
    if (amount >= HOT_FINE) return ' amt-hot';
    if (amount >= MID_FINE) return ' amt-mid';
    return '';
  }

  /* Afholdte møder = møder med mindst én bøde eller afsluttet, kronologisk */
  function heldMeetings() {
    return state.meetings.filter(function (m) { return meetingFineCount(m.id) > 0 || m.closedAt; })
      .sort(function (a, b) {
        var d = (a.date || '').localeCompare(b.date || '');
        return d !== 0 ? d : a.number - b.number;
      });
  }

  /* Antal afholdte møder i træk (bagfra) hvor medlemmet har fået bøde.
     Et åbent møde uden bøde til medlemmet bryder ikke streaken endnu. */
  function memberMeetingStreak(mid) {
    var held = heldMeetings();
    var s = 0;
    for (var i = held.length - 1; i >= 0; i--) {
      var mtg = held[i];
      var hit = state.fines.some(function (f) { return f.meetingId === mtg.id && f.memberId === mid; });
      if (hit) s++;
      else if (!mtg.closedAt) continue;
      else break;
    }
    return s;
  }

  /* Mest gentagne bødetype for et medlem: {typeId, count} eller null.
     Ved uafgjort vinder typen med den senest givne bøde. */
  function memberTopType(mid) {
    var counts = {};
    state.fines.forEach(function (f) {
      if (f.memberId === mid && f.fineTypeId) {
        var c = counts[f.fineTypeId] || { count: 0, lastTs: 0 };
        c.count++;
        c.lastTs = Math.max(c.lastTs, f.ts || 0);
        counts[f.fineTypeId] = c;
      }
    });
    var best = null;
    Object.keys(counts).forEach(function (k) {
      var c = counts[k];
      if (!best || c.count > best.count || (c.count === best.count && c.lastTs > best.lastTs)) {
        best = { typeId: k, count: c.count, lastTs: c.lastTs };
      }
    });
    return best;
  }

  /* Bødefri-streak: afsluttede møder i træk (bagfra) uden bøde til medlemmet */
  function memberCleanStreak(mid) {
    var held = heldMeetings();
    var s = 0;
    for (var i = held.length - 1; i >= 0; i--) {
      var mtg = held[i];
      var hit = state.fines.some(function (f) { return f.meetingId === mtg.id && f.memberId === mid; });
      if (hit) break;
      if (mtg.closedAt) s++;
    }
    return s;
  }

  /* Længste bødestreak nogensinde for et medlem */
  function memberLongestStreak(mid) {
    var held = heldMeetings();
    var best = 0, run = 0;
    held.forEach(function (mtg) {
      var hit = state.fines.some(function (f) { return f.meetingId === mtg.id && f.memberId === mid; });
      if (hit) { run++; if (run > best) best = run; }
      else if (mtg.closedAt) run = 0;
    });
    return best;
  }

  function yearFineTotalFor(mid, yearId) {
    var ids = {};
    yearMeetings(yearId).forEach(function (m) { ids[m.id] = 1; });
    return state.fines.reduce(function (a, f) { return ids[f.meetingId] && f.memberId === mid ? a + f.amount : a; }, 0);
  }

  /* Hædersbevisninger til et medlem */
  function computeBadges(mid) {
    var out = [];
    state.clubYears.filter(function (y) { return y.closedAt; }).forEach(function (y) {
      var totals = state.members.map(function (m) { return { id: m.id, sum: yearFineTotalFor(m.id, y.id) }; });
      var max = totals.reduce(function (a, t) { return t.sum > a ? t.sum : a; }, 0);
      if (max > 0 && totals.some(function (t) { return t.id === mid && t.sum === max; })) {
        out.push({ ic: 'trophy', label: 'Årets synder ' + y.label, desc: kr(max) + ' i bøder' });
      }
      var min = totals.reduce(function (a, t) { return t.sum < a ? t.sum : a; }, Infinity);
      if (max > 0 && totals.some(function (t) { return t.id === mid && t.sum === min; })) {
        out.push({ ic: 'shield', label: 'Mest artige ' + y.label, desc: 'Kun ' + kr(min) + ' i bøder' });
      }
    });
    if (memberFineTotal(mid) >= HOT_FINE && memberBalance(mid) <= 0) {
      out.push({ ic: 'star', label: 'Comeback', desc: 'Fra synder til rent ark' });
    }
    var activeTypes = state.fineTypes.filter(function (t) { return t.active; });
    if (activeTypes.length && activeTypes.every(function (t) {
      return state.fines.some(function (f) { return f.memberId === mid && f.fineTypeId === t.id; });
    })) {
      out.push({ ic: 'flame', label: 'Grand Slam', desc: 'Har prøvet samtlige takster' });
    }
    if (memberMeetingStreak(mid) >= 4) {
      out.push({ ic: 'flame', label: streakTitle(memberMeetingStreak(mid)), desc: memberMeetingStreak(mid) + ' møder i træk med bøde' });
    }
    if (memberCleanStreak(mid) >= 3) {
      out.push({ ic: 'shield', label: 'Fredet', desc: memberCleanStreak(mid) + ' møder uden bøde' });
    }
    return out;
  }

  /* Sæsonrekorder på tværs af alle klubår */
  function seasonRecords() {
    var out = [];
    var topMeet = null;
    state.meetings.forEach(function (m) {
      var t = meetingTotal(m.id);
      if (t > 0 && (!topMeet || t > topMeet.t)) topMeet = { m: m, t: t };
    });
    if (topMeet) out.push({ ic: 'zap', label: 'Dyreste møde', value: kr(topMeet.t), desc: esc(topMeet.m.title) + ' · ' + esc(meetingYearLabel(topMeet.m)) });
    var topStreak = null;
    state.members.forEach(function (m) {
      var s = memberLongestStreak(m.id);
      if (s >= 2 && (!topStreak || s > topStreak.s)) topStreak = { m: m, s: s };
    });
    if (topStreak) out.push({ ic: 'flame', label: 'Længste bødestreak', value: topStreak.s + ' møder', desc: esc(topStreak.m.name) });
    var topPay = null;
    state.payments.forEach(function (p) {
      if (!topPay || p.amount > topPay.amount) topPay = p;
    });
    if (topPay) {
      var pm = findMember(topPay.memberId);
      out.push({ ic: 'star', label: 'Største indbetaling', value: kr(topPay.amount), desc: (pm ? esc(pm.name) + ' · ' : '') + fmtDate(topPay.date) });
    }
    return out;
  }

  /* Klubårets tidsvindue (1. juli — 30. juni) til betalinger og grafer */
  function yearWindow(cy) {
    return { from: cy.startYear + '-07-01', to: (cy.startYear + 1) + '-06-30' };
  }

  /* Afbudsforslag ud fra mødedato (#16) */
  function suggestedFineTypeFor(meet) {
    if (!meet.date) return null;
    var days = Math.floor((new Date(meet.date + 'T12:00:00') - new Date(todayISO() + 'T12:00:00')) / 86400000);
    var name = null, reason = null;
    if (days <= 1) { name = 'Afmelding 24 timer'; reason = 'Mødet er om under 24 timer'; }
    else if (days <= 7) { name = 'Afmelding efter frist'; reason = 'Under 7 dage til mødet'; }
    if (!name) return null;
    var t = state.fineTypes.find(function (x) { return x.active && x.category === name; }) ||
      state.fineTypes.find(function (x) { return x.active && x.category.indexOf(name.slice(0, 12)) === 0; });
    return t ? { type: t, reason: reason } : null;
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
    var withFines = state.meetings.filter(function (m) { return !m.closedAt && meetingFineCount(m.id) > 0; })
      .sort(function (a, b) { return (a.date || '').localeCompare(b.date || '') || a.number - b.number; });
    if (withFines.length) return { meeting: withFines[withFines.length - 1], verb: 'Fortsæt' };
    var cy = currentClubYear();
    if (!cy) return null;
    var ms = yearMeetings(cy.id);
    var open = ms.filter(function (m) { return !m.closedAt; });
    var today = todayISO();
    var upcoming = open.find(function (m) { return m.date >= today; });
    var pick = upcoming || open[0] || ms[ms.length - 1];
    return pick ? { meeting: pick, verb: 'Åbn' } : null;
  }

  /* ---------- UI-tilstand ---------- */

  var view = { name: 'liga' };
  var lastRanks = {};   // medlem → seneste placering (til rangskifte-animation)
  var pickerMemberId = null; // valgt medlem i bødevælgeren

  /* ---------- Ikoner ---------- */

  var IC = {
    crown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24"><path d="M3 17 2 7l5 3.5L12 4l5 6.5L22 7l-1 10H3z"></path><rect x="3.5" y="18.5" width="17" height="2.5" rx="1"></rect></svg>',
    flame: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.8 3.6-4.5 5.6-4.5 10a4.5 4.5 0 0 0 9 0c0-1.6-.9-2.9-.9-2.9s2.9 1.5 2.9 5.4a6.5 6.5 0 1 1-13 0C5.5 8.6 10.5 7 12 2z"></path></svg>',
    zap: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"></path></svg>',
    trophy: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0V4z"></path><path d="M8 5H5a3 3 0 0 0 3 5M16 5h3a3 3 0 0 1-3 5"></path><path d="M12 13v4m-4 4h8m-6 0v-4h4v4"></path></svg>',
    shield: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z"></path><path d="m9 12 2 2 4-4"></path></svg>',
    star: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.4l6-.8L12 3z"></path></svg>',
    eye: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"></path><circle cx="12" cy="12" r="2.8"></circle></svg>',
    bin: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14"></path><path d="M10 11v6M14 11v6"></path></svg>',
    clock: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3.5 2"></path></svg>',
    print: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8V3h10v5M5 8h14a2 2 0 0 1 2 2v6h-4v5H7v-5H3v-6a2 2 0 0 1 2-2z"></path><path d="M7 16h10"></path></svg>',
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
    if (viewerMode) {
      html += '<div class="viewer-banner">' + IC.eye + '<span>Visningstilstand — registrering er slået fra på denne enhed</span></div>';
    }
    if (view.name === 'liga') html += viewLiga();
    else if (view.name === 'aar') html += viewYears();
    else if (view.name === 'aar-detalje') html += viewYearDetail();
    else if (view.name === 'mode') html += viewMeeting();
    else if (view.name === 'medlemmer') html += viewMembers();
    else if (view.name === 'takster') html += viewFineTypes();
    else if (view.name === 'statistik') html += viewStats();
    app.innerHTML = html;
    // Flyt CTA-knappen ned i bundbjælken, så den aldrig svæver oven på indholdet
    var slot = document.getElementById('cta-slot');
    if (slot) {
      slot.innerHTML = '';
      var ab = app.querySelector('.actionbar');
      if (ab) slot.appendChild(ab);
    }
    runCountUps();

    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i].getAttribute('data-tab');
      var active = (t === view.name) || (t === 'aar' && (view.name === 'aar-detalje' || view.name === 'mode'));
      tabs[i].className = 'tab' + (active ? ' active' : '');
    }
  }

  /* Pakke A: tal der tæller op ved ændringer */
  var lastCounts = {};
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function runCountUps() {
    var els = document.querySelectorAll('[data-cnt]');
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        var key = el.getAttribute('data-cnt');
        var to = Number(el.getAttribute('data-val')) || 0;
        var fmt = el.getAttribute('data-fmt') === 'nf' ? nf : kr;
        var from = lastCounts[key];
        lastCounts[key] = to;
        if (from === undefined || from === to || reducedMotion) { el.textContent = fmt(to); return; }
        el.classList.remove('cnt-pulse');
        void el.offsetWidth;                 // genstart animationen
        el.classList.add('cnt-pulse');
        var t0 = performance.now();
        function tick(t) {
          var p = Math.min(1, (t - t0) / 300);
          p = 1 - Math.pow(1 - p, 2);
          el.textContent = fmt(Math.round(from + (to - from) * p));
          if (p < 1 && el.isConnected) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      })(els[i]);
    }
  }

  /* #12: fuldskærms-overlay ved rigtig store bøder */
  var BIG_FINE = 500;
  function bigFineOverlay(amount, who, label) {
    if (reducedMotion) return;
    var old = document.querySelector('.bigfine');
    if (old) old.parentNode.removeChild(old);
    var el = h('<div class="bigfine"><div class="bf-inner">' +
      '<div class="bf-word">BØDE!</div>' +
      '<div class="bf-amt">' + esc(kr(amount)) + '</div>' +
      '<div class="bf-who">' + esc(who) + ' — ' + esc(label) + '</div>' +
      '</div></div>').firstChild;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1250);
  }

  /* Pakke A: konfetti ved dyre bøder */
  function spawnConfetti() {
    if (reducedMotion) return;
    var colors = ['#fbbf24', '#ff8a3d', '#ff5d5d', '#c0c7ce', '#5eead4'];
    var root = document.createElement('div');
    root.className = 'confetti';
    for (var i = 0; i < 16; i++) {
      var p = document.createElement('i');
      p.style.left = (8 + Math.random() * 84) + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 0.18) + 's';
      p.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';
      root.appendChild(p);
    }
    document.body.appendChild(root);
    setTimeout(function () { if (root.parentNode) root.parentNode.removeChild(root); }, 1400);
  }

  function renderSaveButtonOnly() {
    var saveWrap = document.getElementById('save-wrap');
    if (!saveWrap) return;
    saveWrap.innerHTML = artifactNS
      ? '<button class="btn small' + (dirty && !publishing ? '' : ' secondary') + '" id="save-btn" data-action="publish"' + (publishing ? ' disabled' : '') + '>' + IC.save +
        (publishing ? 'Gemmer …' : (dirty ? 'Gem ændringer' : 'Alt gemt')) + '</button>'
      : '';
  }

  function statStrip() {
    var cy = currentClubYear();
    return '<div class="stats">' +
      '<div class="stat"><div class="k">I kassen</div><div class="v green" data-cnt="pot" data-val="' + potTotal() + '">' + kr(potTotal()) + '</div></div>' +
      '<div class="stat"><div class="k">Udestående</div><div class="v amber" data-cnt="due" data-val="' + outstandingTotal() + '">' + kr(outstandingTotal()) + '</div></div>' +
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
    var nextRanks = {};
    ranked.forEach(function (m) {
      var bal = memberBalance(m.id);
      shown++;
      if (bal !== lastBal) { rank = shown; lastBal = bal; }
      var cnt = memberFineCount(m.id);
      var streak = memberMeetingStreak(m.id);
      var paid = memberPaidTotal(m.id);
      var streakTxt = streak >= 2 ? ' · ' + streak + ' i træk' : '';
      // #14: markér dem der er rykket op siden sidste visning
      var moved = lastRanks[m.id] !== undefined && bal > 0 && rank < lastRanks[m.id];
      nextRanks[m.id] = bal > 0 ? rank : 999;
      if (bal <= 0) {
        rows += '<button class="lb-row clean" data-action="open-member" data-id="' + esc(m.id) + '">' +
          '<div class="rank">–</div>' + avatar(m) +
          '<div class="who"><div class="name"><span class="nm">' + esc(m.name) + '</span>' + nameIcons(m.id) + '</div>' +
          '<div class="subrow"><div class="sub">Rent ark' + streakTxt + '</div>' + sparkline(m.id) + '</div></div>' +
          '<div class="count">' + cnt + '</div><div class="sum">0</div>' + payBar(m.id) + '</button>';
      } else {
        rows += '<button class="lb-row rank-' + rank + (moved ? ' rank-up' : '') + '" data-action="open-member" data-id="' + esc(m.id) + '">' +
          medal(rank) + avatar(m) +
          '<div class="who"><div class="name"><span class="nm">' + esc(m.name) + '</span>' + nameIcons(m.id) + (streak >= 2 ? flames(streak) : '') + '</div>' +
          '<div class="subrow"><div class="sub">' + cnt + ' bøde' + (cnt === 1 ? '' : 'r') +
          (paid > 0 ? ' · betalt ' + kr(paid) : '') + streakTxt + '</div>' + sparkline(m.id) + '</div></div>' +
          '<div class="count">' + cnt + '</div>' +
          '<div class="sum">' + nf(bal) + '</div>' + payBar(m.id) + '</button>';
      }
    });
    lastRanks = nextRanks;
    var sm = suggestMeeting();
    return statStrip() +
      streakPanel(members) +
      '<div class="colhead"><div class="c-rank">#</div><div class="c-name">Spiller</div><div class="c-count">Bøder</div><div class="c-sum">Gæld kr.</div></div>' +
      rows +
      (sm && !viewerMode
        ? '<div class="actionbar"><button class="btn" data-action="open-meeting" data-id="' + esc(sm.meeting.id) + '">' +
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
      rows += '<button class="streak-row" data-action="open-member" data-id="' + esc(x.m.id) + '">' +
        flames(x.streak) +
        '<div class="grow"><div class="t">' + esc(x.m.name) + '</div>' +
        '<div class="s">Bøde i ' + x.streak + ' møder i træk</div></div>' +
        '<div class="tag">' + streakTitle(x.streak) + '</div></button>';
    });
    typeStreaks.forEach(function (x) {
      var t = findFineType(x.top.typeId);
      rows += '<button class="streak-row" data-action="open-member" data-id="' + esc(x.m.id) + '">' +
        '<span class="mult">' + x.top.count + '×</span>' +
        '<div class="grow"><div class="t">' + esc(x.m.name) + '</div>' +
        '<div class="s">' + x.top.count + ' gange »' + esc(t ? t.category : '?') + '«</div></div>' +
        '<div class="tag">Stamkunde</div></button>';
    });
    var cleanStreaks = members.map(function (m) { return { m: m, streak: memberCleanStreak(m.id) }; })
      .filter(function (x) { return x.streak >= 3; })
      .sort(function (a, b) { return b.streak - a.streak; })
      .slice(0, 2);
    cleanStreaks.forEach(function (x) {
      rows += '<button class="streak-row" data-action="open-member" data-id="' + esc(x.m.id) + '">' +
        '<span class="shield-ic">' + IC.shield + '</span>' +
        '<div class="grow"><div class="t">' + esc(x.m.name) + '</div>' +
        '<div class="s">' + x.streak + ' møder uden bøde</div></div>' +
        '<div class="tag green">Fredet</div></button>';
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
      return '<button class="row year-row" style="--yc: ' + yearColor(y) + '" data-action="open-year" data-id="' + esc(y.id) + '">' +
        '<div class="grow"><div class="t">Klubår ' + esc(y.label) + '</div>' +
        '<div class="s">' + ms.length + ' møder · ' + held + ' afholdt</div></div>' +
        (y.closedAt ? '<span class="badge">Afsluttet</span>' : '') +
        '<div class="amount">' + kr(yearTotal(y.id)) + '</div></button>';
    }).join('');
    var next = state.clubYears.reduce(function (a, y) { return Math.max(a, y.startYear); }, 2023) + 1;
    return '<div class="section-title"><h2>Klubår</h2><div class="hint">' + years.length + ' år</div></div>' +
      rows +
      (viewerMode ? '' : '<div class="actionbar"><button class="btn" data-action="new-year">' + IC.plus + 'Opret klubår ' + yearLabel(next) + '</button></div>');
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
      return '<button class="row" data-action="open-meeting" data-id="' + esc(m.id) + '">' +
        '<div class="grow"><div class="t">' + esc(m.title) + '</div>' +
        '<div class="s">' + fmtDate(m.date) + (cnt ? ' · ' + cnt + ' bøde' + (cnt === 1 ? '' : 'r') : '') + '</div></div>' +
        badge +
        (cnt ? '<div class="amount">' + kr(meetingTotal(m.id)) + '</div>' : '<div class="amount" style="color: var(--faint)">–</div>') +
        '</button>';
    }).join('');
    return '<div class="meet-head year-head" style="--yc: ' + yearColor(y) + '">' +
      '<button class="iconbtn" data-action="goto" data-view="aar" aria-label="Tilbage">' + IC.left + '</button>' +
      '<div class="grow"><div class="t">Klubår ' + esc(y.label) + '</div><div class="s">' + ms.length + ' møder' + (y.closedAt ? ' · sæson afsluttet' : '') + '</div></div>' +
      '<div class="total">' + kr(yearTotal(y.id)) + '</div></div>' +
      rows +
      (viewerMode ? '' :
        '<div class="actionbar">' +
        (y.closedAt
          ? '<button class="btn secondary" data-action="season-reopen" data-id="' + esc(y.id) + '">Genåbn sæson</button>'
          : '<button class="btn secondary" data-action="add-meeting" data-id="' + esc(y.id) + '">' + IC.plus + 'Ekstra møde</button>' +
            '<button class="btn" data-action="season-close" data-id="' + esc(y.id) + '">' + IC.trophy + 'Afslut sæson</button>') +
        '</div>');
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
      return '<button class="member-cell' + (sum > 0 ? ' hit' : '') + '" data-action="pick-fines" data-id="' + esc(m.id) + '"' + (meet.closedAt || viewerMode ? ' disabled style="opacity:0.55"' : '') + '>' +
        '<div class="mc-top">' + avatar(m, 'sm') + '<div class="name">' + esc(m.name) + (state.formandId === m.id ? '<span class="crown">' + IC.crown + '</span>' : '') + '</div></div>' +
        '<div class="meta">' + (sum > 0 ? n + ' bøde' + (n === 1 ? '' : 'r') + ' · ' + kr(sum) : 'Ingen bøder') + '</div></button>';
    }).join('');

    var log = meetFines.slice().reverse().map(function (f) {
      var m = findMember(f.memberId);
      return '<div class="log-item">' +
        fineIconFor(f) +
        '<div class="grow"><div class="t">' + esc(m ? m.name : '?') + ' — ' + esc(fineLabel(f)) + '</div></div>' +
        '<div class="amount' + amtClass(f.amount) + '">' + (f.amount >= HOT_FINE ? IC.zap : '') + kr(f.amount) + '</div>' +
        (meet.closedAt || viewerMode ? '' : '<button class="x" data-action="remove-fine" data-id="' + esc(f.id) + '" aria-label="Fjern bøde">' + IC.x + '</button>') +
        '</div>';
    }).join('');

    var info = '';
    if (meet.description || (meet.links && meet.links.trim())) {
      info = '<div class="info-card">' +
        (meet.description ? '<div class="desc">' + esc(meet.description) + '</div>' : '') +
        renderLinks(meet.links) + '</div>';
    }

    return '<div class="meet-head">' +
      '<button class="iconbtn" data-action="goto" data-view="aar-detalje" data-id="' + esc(meet.clubYearId) + '" aria-label="Tilbage">' + IC.left + '</button>' +
      '<div class="grow"><div class="t">' + esc(meet.title) + '</div><div class="s">' + esc(meetingYearLabel(meet)) + ' · ' + fmtDate(meet.date) + (meet.closedAt ? ' · afsluttet' : '') + '</div></div>' +
      (viewerMode ? '' : '<button class="iconbtn" data-action="edit-meeting" data-id="' + esc(meet.id) + '" aria-label="Rediger møde">' + IC.edit + '</button>') +
      '<div class="total" data-cnt="meet-' + esc(meet.id) + '" data-val="' + meetingTotal(meet.id) + '">' + kr(meetingTotal(meet.id)) + '</div></div>' +
      info +
      (members.length
        ? '<div class="section-title"><h2>Klik en spiller</h2><div class="hint">…og derefter bøderne</div></div><div class="member-grid">' + grid + '</div>'
        : '<div class="empty">Tilføj medlemmer under fanen Medlemmer først.</div>') +
      '<div class="section-title"><h2>Mødets bøder</h2><div class="hint">' + meetFines.length + ' stk.</div></div>' +
      (log || '<div class="note">Ingen bøder registreret endnu.</div>') +
      (viewerMode ? '' :
        '<div class="btn-row">' +
        (meet.closedAt
          ? '<button class="btn secondary" data-action="reopen-meeting" data-id="' + esc(meet.id) + '">Genåbn møde</button>'
          : '<button class="btn secondary" data-action="close-meeting" data-id="' + esc(meet.id) + '">Afslut møde</button>') +
        '<button class="btn danger" data-action="delete-meeting" data-id="' + esc(meet.id) + '">Slet møde</button></div>');
  }

  function viewMembers() {
    var rows = state.members.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'da'); })
      .map(function (m) {
        var bal = memberBalance(m.id);
        return '<button class="row' + (m.active ? '' : ' inactive') + '" data-action="open-member" data-id="' + esc(m.id) + '">' +
          avatar(m) +
          '<div class="grow"><div class="t">' + esc(m.name) + (state.formandId === m.id ? ' <span class="crown">' + IC.crown + '</span>' : '') + '</div>' +
          '<div class="s">' + memberFineCount(m.id) + ' bøder · betalt ' + kr(memberPaidTotal(m.id)) + (m.active ? '' : ' · udmeldt') + '</div></div>' +
          '<div class="amount' + (bal <= 0 ? ' zero' : '') + '">' + kr(Math.max(0, bal)) + '</div></button>';
      }).join('');
    return '<div class="section-title"><h2>Medlemmer</h2><div class="hint">' + activeMembers().length + ' aktive</div></div>' +
      (rows || '<div class="empty"><div class="big">Ingen medlemmer</div>Tilføj klubbens medlemmer her.</div>') +
      (viewerMode ? '' : '<div class="actionbar"><button class="btn" data-action="add-member">' + IC.plus + 'Tilføj medlem</button></div>');
  }

  function viewFineTypes() {
    var rows = state.fineTypes.filter(function (t) { return t.active; }).map(function (t) {
      return '<button class="row" data-action="edit-finetype" data-id="' + esc(t.id) + '">' +
        fineIcon(t, 'big' + (t.amount >= HOT_FINE ? ' hot' : '')) +
        '<div class="grow"><div class="t">' + esc(t.category) + '</div><div class="s">' + esc(t.description) + '</div></div>' +
        '<div class="amount' + amtClass(t.amount) + '">' + kr(t.amount) + '</div></button>';
    }).join('');
    return '<div class="section-title"><h2>Takster</h2><div class="hint">' + (viewerMode ? 'Visning' : 'Klik for at redigere') + '</div></div>' + rows +
      (viewerMode ? '' : '<div class="actionbar"><button class="btn" data-action="add-finetype">' + IC.plus + 'Ny takst</button></div>');
  }

  /* ---------- Statistik (#11, #12, #7) ---------- */

  var statsYearId = null;

  function fineLabelSum(yearId) {
    var ids = {};
    yearMeetings(yearId).forEach(function (m) { ids[m.id] = 1; });
    var agg = {};
    state.fines.forEach(function (f) {
      if (!ids[f.meetingId]) return;
      var key = fineLabel(f);
      var a = agg[key] || { sum: 0, count: 0 };
      a.sum += f.amount; a.count++;
      agg[key] = a;
    });
    return Object.keys(agg).map(function (k) { return { label: k, sum: agg[k].sum, count: agg[k].count }; })
      .sort(function (a, b) { return b.sum - a.sum; });
  }

  /* Søjlediagram: tynde søjler, afrundet datatop, dæmpet grid, tooltip pr. søjle */
  function barChartSVG(points, color) {
    var W = 640, H = 190, padL = 34, padR = 8, padT = 14, padB = 24;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var max = points.reduce(function (a, p) { return Math.max(a, p.v); }, 0) || 1;
    var n = points.length || 1;
    var step = plotW / n;
    var bw = Math.max(3, Math.min(22, step - 2));
    var maxIdx = points.reduce(function (a, p, i) { return p.v > points[a].v ? i : a; }, 0);
    var out = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img">';
    [0, 0.5, 1].forEach(function (g) {
      var y = padT + plotH * (1 - g);
      out += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="#232e3a" stroke-width="1"></line>';
      out += '<text x="' + (padL - 6) + '" y="' + (y + 4) + '" text-anchor="end" class="ax">' + nf(Math.round(max * g)) + '</text>';
    });
    points.forEach(function (p, i) {
      var x = padL + i * step + (step - bw) / 2;
      var bh = Math.round(plotH * (p.v / max));
      var y = padT + plotH - bh;
      if (p.v > 0) {
        var r = Math.min(4, bw / 2, bh);
        out += '<path d="M' + x + ' ' + (padT + plotH) + ' V' + (y + r) + ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
          ' H' + (x + bw - r) + ' Q' + (x + bw) + ' ' + y + ' ' + (x + bw) + ' ' + (y + r) + ' V' + (padT + plotH) + ' Z" fill="' + color + '"></path>';
      }
      out += '<rect x="' + (padL + i * step) + '" y="' + padT + '" width="' + step + '" height="' + plotH + '" fill="transparent" data-tip="' + esc(p.tip) + '"></rect>';
      if (p.v > 0 && i === maxIdx) {
        out += '<text x="' + (x + bw / 2) + '" y="' + (y - 5) + '" text-anchor="middle" class="lbl">' + nf(p.v) + '</text>';
      }
      if (p.x && (n <= 12 || i % Math.ceil(n / 10) === 0)) {
        out += '<text x="' + (padL + i * step + step / 2) + '" y="' + (H - 7) + '" text-anchor="middle" class="ax">' + esc(p.x) + '</text>';
      }
    });
    return out + '</svg>';
  }

  /* Linjediagram: 2px linje, punkter med tooltip, svag flade */
  function lineChartSVG(points, color) {
    var W = 640, H = 190, padL = 40, padR = 12, padT = 14, padB = 24;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    if (points.length < 2) return '<div class="note">For få indbetalinger til en kurve endnu.</div>';
    var max = points.reduce(function (a, p) { return Math.max(a, p.v); }, 0) || 1;
    var xy = points.map(function (p, i) {
      return [padL + plotW * (points.length === 1 ? 0.5 : i / (points.length - 1)), padT + plotH * (1 - p.v / max)];
    });
    var path = xy.map(function (c, i) { return (i ? 'L' : 'M') + c[0].toFixed(1) + ' ' + c[1].toFixed(1); }).join(' ');
    var out = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img">';
    [0, 0.5, 1].forEach(function (g) {
      var y = padT + plotH * (1 - g);
      out += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="#232e3a" stroke-width="1"></line>';
      out += '<text x="' + (padL - 6) + '" y="' + (y + 4) + '" text-anchor="end" class="ax">' + nf(Math.round(max * g)) + '</text>';
    });
    out += '<path d="' + path + ' L' + xy[xy.length - 1][0].toFixed(1) + ' ' + (padT + plotH) + ' L' + xy[0][0].toFixed(1) + ' ' + (padT + plotH) + ' Z" fill="' + color + '" opacity="0.12"></path>';
    out += '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"></path>';
    points.forEach(function (p, i) {
      out += '<circle cx="' + xy[i][0].toFixed(1) + '" cy="' + xy[i][1].toFixed(1) + '" r="4" fill="' + color + '" stroke="#10141a" stroke-width="2" data-tip="' + esc(p.tip) + '"></circle>';
    });
    out += '<text x="' + padL + '" y="' + (H - 7) + '" class="ax">' + esc(points[0].x) + '</text>';
    out += '<text x="' + (W - padR) + '" y="' + (H - 7) + '" text-anchor="end" class="ax">' + esc(points[points.length - 1].x) + '</text>';
    return out + '</svg>';
  }

  function hBars(items, color) {
    var max = items.reduce(function (a, x) { return Math.max(a, x.sum); }, 0) || 1;
    return items.map(function (x) {
      return '<div class="hbar-row" data-tip="' + esc(x.label + ' · ' + x.count + ' stk. · ' + kr(x.sum)) + '">' +
        '<span class="fine-ic">' + FI[fineIconKey(x.label, '')] + '</span>' +
        '<div class="hbar-label">' + esc(x.label) + '</div>' +
        '<div class="hbar-track"><div class="hbar-fill" style="width: ' + Math.max(2, Math.round(100 * x.sum / max)) + '%; background: ' + color + '"></div></div>' +
        '<div class="hbar-val">' + nf(x.sum) + '</div></div>';
    }).join('');
  }

  function viewStats() {
    var years = state.clubYears.slice().sort(function (a, b) { return b.startYear - a.startYear; });
    if (!years.length) return '<div class="empty">Ingen klubår endnu.</div>';
    var sel = findYear(statsYearId) || currentClubYear();
    statsYearId = sel.id;

    var chips = '<div class="chips">' + years.map(function (y) {
      return '<button class="chip year-chip' + (y.id === sel.id ? ' active' : '') + '" style="--yc: ' + yearColor(y) + '" data-action="stats-year" data-id="' + esc(y.id) + '">' + esc(y.label) + '</button>';
    }).join('') + '</div>';
    var yc = yearColor(sel);

    var ms = yearMeetings(sel.id);
    var held = ms.filter(function (m) { return meetingFineCount(m.id) > 0 || m.closedAt; });
    var total = yearTotal(sel.id);
    var fineCount = ms.reduce(function (a, m) { return a + meetingFineCount(m.id); }, 0);
    var w = yearWindow(sel);
    var paidInYear = state.payments.reduce(function (a, p) { return p.date >= w.from && p.date <= w.to ? a + p.amount : a; }, 0);

    var kpis = '<div class="stats kpi4">' +
      '<div class="stat" style="--yc: ' + yc + '"><div class="k">Bøder i alt</div><div class="v yc">' + kr(total) + '</div></div>' +
      '<div class="stat"><div class="k">Antal bøder</div><div class="v">' + fineCount + '</div></div>' +
      '<div class="stat"><div class="k">Gns. pr. møde</div><div class="v">' + kr(held.length ? total / held.length : 0) + '</div></div>' +
      '<div class="stat"><div class="k">Indbetalt</div><div class="v green">' + kr(paidInYear) + '</div></div>' +
      '</div>';

    var barPoints = ms.map(function (m) {
      return { x: String(m.number), v: meetingTotal(m.id), tip: m.title + ' · ' + fmtDate(m.date) + ' · ' + kr(meetingTotal(m.id)) };
    });

    var paysSorted = state.payments.slice().sort(function (a, b) { return (a.date || '').localeCompare(b.date || '') || a.ts - b.ts; });
    var cum = 0;
    var linePoints = paysSorted.map(function (p) {
      cum += p.amount;
      var m = findMember(p.memberId);
      return { x: fmtDate(p.date), v: cum, tip: (m ? m.name + ' · ' : '') + fmtDate(p.date) + ' · +' + kr(p.amount) + ' → ' + kr(cum) };
    });

    var topTypes = fineLabelSum(sel.id).slice(0, 6);

    var recs = seasonRecords();
    var recHtml = recs.length ? recs.map(function (r) {
      return '<div class="rec-row"><span class="rec-ic">' + IC[r.ic] + '</span>' +
        '<div class="grow"><div class="t">' + r.label + '</div><div class="s">' + r.desc + '</div></div>' +
        '<div class="rec-val">' + r.value + '</div></div>';
    }).join('') : '<div class="note">Ingen rekorder endnu — kom i gang med at synde.</div>';

    var cmpRows = years.map(function (y) {
      var yms = yearMeetings(y.id);
      var yheld = yms.filter(function (m) { return meetingFineCount(m.id) > 0 || m.closedAt; }).length;
      var yt = yearTotal(y.id);
      var worst = null;
      state.members.forEach(function (m) {
        var s = yearFineTotalFor(m.id, y.id);
        if (s > 0 && (!worst || s > worst.s)) worst = { m: m, s: s };
      });
      return '<tr><td><span class="ydot" style="background: ' + yearColor(y) + '"></span>' + esc(y.label) + '</td><td>' + yheld + '</td><td>' + nf(yt) + '</td>' +
        '<td>' + nf(yheld ? Math.round(yt / yheld) : 0) + '</td>' +
        '<td>' + (worst ? esc(worst.m.name) : '–') + '</td></tr>';
    }).join('');

    return '<div class="section-title"><h2>Statistik</h2><div class="hint">Klubår ' + esc(sel.label) + '</div></div>' +
      chips + kpis +
      '<div class="chart-card"><div class="chart-title">Bøder pr. møde <span class="chart-sub">' + esc(sel.label) + ' · kr.</span></div>' + barChartSVG(barPoints, yc) + '</div>' +
      '<div class="chart-card"><div class="chart-title">Kassebeholdning over tid <span class="chart-sub">alle år · kr.</span></div>' + lineChartSVG(linePoints, '#3f9e63') + '</div>' +
      '<div class="chart-card"><div class="chart-title">Top bødetyper <span class="chart-sub">' + esc(sel.label) + ' · kr.</span></div>' +
      (topTypes.length ? hBars(topTypes, yc) : '<div class="note">Ingen bøder i dette klubår endnu.</div>') + '</div>' +
      '<div class="chart-card"><div class="chart-title">Sæsonrekorder <span class="chart-sub">alle år</span></div>' + recHtml + '</div>' +
      '<div class="chart-card"><div class="chart-title">Sammenlign klubår</div>' +
      '<div class="tbl-wrap"><table class="cmp"><thead><tr><th>År</th><th>Møder</th><th>Bøder kr.</th><th>Gns./møde</th><th>Værste synder</th></tr></thead><tbody>' + cmpRows + '</tbody></table></div></div>' +
      '<div class="actionbar"><button class="btn secondary" data-action="report-open" data-id="' + esc(sel.id) + '">' + IC.print + 'Kassererrapport ' + esc(sel.label) + '</button></div>';
  }

  /* ---------- Kassererrapport (#13) ---------- */

  function openReport(yearId) {
    var y = findYear(yearId);
    if (!y) return;
    closeReport();
    var ms = yearMeetings(y.id);
    var held = ms.filter(function (m) { return meetingFineCount(m.id) > 0 || m.closedAt; });
    var w = yearWindow(y);
    var paidInYear = state.payments.reduce(function (a, p) { return p.date >= w.from && p.date <= w.to ? a + p.amount : a; }, 0);

    var memRows = state.members.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'da'); }).map(function (m) {
      var ids = {};
      ms.forEach(function (x) { ids[x.id] = 1; });
      var cnt = state.fines.filter(function (f) { return ids[f.meetingId] && f.memberId === m.id; }).length;
      var sum = yearFineTotalFor(m.id, y.id);
      return '<tr><td>' + esc(m.name) + (m.active ? '' : ' (udmeldt)') + '</td><td>' + cnt + '</td><td>' + nf(sum) + '</td><td>' + nf(Math.max(0, memberBalance(m.id))) + '</td></tr>';
    }).join('');

    var meetRows = held.map(function (m) {
      return '<tr><td>' + esc(m.title) + '</td><td>' + fmtDate(m.date) + '</td><td>' + meetingFineCount(m.id) + '</td><td>' + nf(meetingTotal(m.id)) + '</td></tr>';
    }).join('');

    var html =
      '<div class="report-toolbar">' +
      '<button class="btn small" data-action="report-print">' + IC.print + 'Print / Gem som PDF</button>' +
      '<button class="btn small secondary" data-action="report-file">Gem som fil</button>' +
      '<button class="btn small secondary" data-action="report-close">Luk</button></div>' +
      '<div class="report-paper" id="report-paper">' +
      '<h1>' + esc(state.clubName) + ' — Kassererrapport</h1>' +
      '<div class="rp-sub">Klubår ' + esc(y.label) + ' · udarbejdet ' + fmtDate(todayISO()) + (y.closedAt ? ' · sæson afsluttet' : '') + '</div>' +
      '<div class="rp-kpis"><div><b>' + kr(yearTotal(y.id)) + '</b><span>Bøder i året</span></div>' +
      '<div><b>' + kr(paidInYear) + '</b><span>Indbetalt i året</span></div>' +
      '<div><b>' + kr(outstandingTotal()) + '</b><span>Udestående nu</span></div>' +
      '<div><b>' + kr(potTotal()) + '</b><span>Kassebeholdning</span></div></div>' +
      '<h2>Medlemmer</h2>' +
      '<table><thead><tr><th>Navn</th><th>Bøder (stk.)</th><th>Bøder (kr.)</th><th>Saldo nu (kr.)</th></tr></thead><tbody>' + memRows + '</tbody></table>' +
      '<h2>Afholdte møder</h2>' +
      (meetRows ? '<table><thead><tr><th>Møde</th><th>Dato</th><th>Bøder (stk.)</th><th>Kr.</th></tr></thead><tbody>' + meetRows + '</tbody></table>' : '<p>Ingen afholdte møder endnu.</p>') +
      '<div class="rp-sign"><div><div class="rp-line"></div>Kasserer</div><div><div class="rp-line"></div>Formand</div></div>' +
      '</div>';

    var root = h('<div class="report-overlay" data-year="' + esc(y.id) + '">' + html + '</div>').firstChild;
    document.body.appendChild(root);
  }
  function closeReport() {
    var r = document.querySelector('.report-overlay');
    if (r) r.parentNode.removeChild(r);
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

    var suggestion = suggestedFineTypeFor(meet);
    var grid = state.fineTypes.filter(function (t) { return t.active; }).map(function (t) {
      var isSug = suggestion && suggestion.type.id === t.id;
      return '<button class="fine-btn' + (t.amount >= HOT_FINE ? ' hot' : '') + (isSug ? ' suggested' : '') + '" data-action="give-fine" data-id="' + esc(t.id) + '">' +
        (counts[t.id] ? '<span class="n">' + counts[t.id] + '</span>' : '') +
        (isSug ? '<span class="sug-tag">Foreslået</span>' : '') +
        fineIcon(t) +
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
      (suggestion
        ? '<div class="sug-strip">' + IC.clock + '<span>Afbud nu? ' + esc(suggestion.reason) + ' — »' + esc(suggestion.type.category) + '« (' + kr(suggestion.type.amount) + ') er markeret.</span></div>'
        : '') +
      '<div class="fine-grid">' + grid + '</div>' +
      '<div class="note">Tryk på en takst for at give bøden — tryk flere gange for flere. Fortryd i mødets bødeliste.</div>';

    openModal('Giv bøder', body, esc(meet.title) + ' · spiller ' + (idx + 1) + ' af ' + members.length);
  }

  function openMemberSheet(memberId, filterYearId) {
    var m = findMember(memberId);
    if (!m) return;
    var bal = memberBalance(m.id);
    var streak = memberMeetingStreak(m.id);
    var cleanStreak = memberCleanStreak(m.id);
    var topType = memberTopType(m.id);
    var badges = computeBadges(m.id);

    var fy = filterYearId ? findYear(filterYearId) : null;
    var fw = fy ? yearWindow(fy) : null;
    var events = [];
    state.fines.forEach(function (f) {
      if (f.memberId !== m.id) return;
      var meet = findMeeting(f.meetingId);
      if (fy && (!meet || meet.clubYearId !== fy.id)) return;
      events.push({ ts: f.ts, html: '<div class="log-item">' + fineIconFor(f) + '<div class="grow"><div class="t">' + esc(fineLabel(f)) + '</div>' +
        '<div class="s">' + (meet ? esc(meet.title) + ' · ' + esc(meetingYearLabel(meet)) + ' · ' + fmtDate(meet.date) : '') + '</div></div>' +
        '<div class="amount' + amtClass(f.amount) + '">+' + kr(f.amount) + '</div></div>' });
    });
    state.payments.forEach(function (p) {
      if (p.memberId !== m.id) return;
      if (fw && !(p.date >= fw.from && p.date <= fw.to)) return;
      events.push({ ts: p.ts, html: '<div class="log-item"><div class="grow"><div class="t">Indbetaling' + (p.note ? ' — ' + esc(p.note) : '') + '</div>' +
        '<div class="s">' + fmtDate(p.date) + '</div></div>' +
        '<div class="amount pay">−' + kr(p.amount) + '</div>' +
        (viewerMode ? '' : '<button class="x" data-action="remove-payment" data-id="' + esc(p.id) + '" aria-label="Slet indbetaling">' + IC.x + '</button>') + '</div>' });
    });
    events.sort(function (a, b) { return b.ts - a.ts; });

    var histYears = state.clubYears.slice().sort(function (a, b) { return b.startYear - a.startYear; })
      .filter(function (y) {
        var ids = {};
        yearMeetings(y.id).forEach(function (x) { ids[x.id] = 1; });
        return state.fines.some(function (f) { return f.memberId === m.id && ids[f.meetingId]; });
      });
    var histChips = histYears.length
      ? '<div class="chips small">' +
        '<button class="chip' + (fy ? '' : ' active') + '" data-action="member-hist" data-id="' + esc(m.id) + '" data-year="">Alle</button>' +
        histYears.map(function (y) {
          return '<button class="chip' + (fy && fy.id === y.id ? ' active' : '') + '" data-action="member-hist" data-id="' + esc(m.id) + '" data-year="' + esc(y.id) + '">' + esc(y.label) + '</button>';
        }).join('') + '</div>'
      : '';

    var badgeHtml = badges.length
      ? '<div class="badge-row">' + badges.map(function (b) {
          return '<span class="award" data-tip="' + esc(b.desc) + '">' + IC[b.ic] + esc(b.label) + '</span>';
        }).join('') + '</div>'
      : '';

    var body =
      '<div class="stats" style="grid-template-columns: repeat(3, minmax(0,1fr))">' +
      '<div class="stat"><div class="k">Gæld</div><div class="v amber">' + kr(Math.max(0, bal)) + '</div></div>' +
      '<div class="stat"><div class="k">Bøder i alt</div><div class="v">' + kr(memberFineTotal(m.id)) + '</div></div>' +
      '<div class="stat"><div class="k">Betalt</div><div class="v green">' + kr(memberPaidTotal(m.id)) + '</div></div>' +
      '</div>' +
      (bal < 0 ? '<div class="note">Har ' + kr(-bal) + ' til gode i kassen.</div>' : '') +
      badgeHtml +
      (streak >= 2
        ? '<div class="streak-strip">' + flames(streak) + '<span>' + streakTitle(streak) + '! Bøde i ' + streak + ' møder i træk.</span></div>'
        : '') +
      (cleanStreak >= 3
        ? '<div class="streak-strip clean">' + IC.shield + '<span>Fredet — ' + cleanStreak + ' møder uden bøde.</span></div>'
        : '') +
      (topType && topType.count >= 2
        ? '<div class="note">Favoritsynd: ' + topType.count + '× »' + esc((findFineType(topType.typeId) || {}).category || '?') + '«</div>'
        : '') +
      (viewerMode ? '' :
        '<div class="btn-row">' +
        '<button class="btn" data-action="pay-form" data-id="' + esc(m.id) + '">Registrer indbetaling</button>' +
        '<button class="btn secondary" data-action="rename-member" data-id="' + esc(m.id) + '">Omdøb</button>' +
        (m.active
          ? '<button class="btn danger" data-action="retire-member" data-id="' + esc(m.id) + '">Udmeld</button>'
          : '<button class="btn secondary" data-action="revive-member" data-id="' + esc(m.id) + '">Genindmeld</button>') +
        '</div>' +
        '<div class="btn-row"><button class="btn secondary" data-action="toggle-formand" data-id="' + esc(m.id) + '">' +
        (state.formandId === m.id ? 'Fjern som formand' : IC.crown + ' Gør til formand') + '</button>' +
        '<button class="btn danger" data-action="delete-member" data-id="' + esc(m.id) + '">' + IC.bin + 'Slet helt</button></div>') +
      '<div class="section-title"><h2>Historik</h2><div class="hint">' + events.length + ' posteringer</div></div>' +
      histChips +
      '<div class="hist">' + (events.map(function (e) { return e.html; }).join('') || '<div class="note">Ingen posteringer' + (fy ? ' i ' + esc(fy.label) : '') + '.</div>') + '</div>';

    openModal(avatar(m, 'sm') + esc(m.name) + (state.formandId === m.id ? ' <span class="crown">' + IC.crown + '</span>' : ''), body,
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
      '<div class="btn-row"><button class="btn" data-action="pay-save" data-id="' + esc(m.id) + '">Registrer indbetaling</button></div>' +
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
      '<div class="btn-row"><button class="btn" data-action="meeting-save" data-id="' + esc(m.id) + '">Gem møde</button></div>' +
      '<div class="note">Skriv evt. en etiket før linket, fx &raquo;Referat: https://…&laquo;</div>';
    openModal('Rediger møde', body, esc(meetingYearLabel(m)));
  }

  /* Ikonvælger: 'Auto' følger navnet, ellers vælges et fast ikon */
  var pickedIcon = null;
  function iconPicker(t) {
    var auto = fineIconKey(t ? t.category : '', t ? t.description : '');
    var cur = pickedIcon !== null ? pickedIcon : ((t && t.icon) || '');
    var out = '<div class="icon-picker" id="icon-picker">' +
      '<button class="icon-opt' + (cur === '' ? ' active' : '') + '" data-action="pick-icon" data-icon="" title="Automatisk">' +
      '<span class="fine-ic">' + FI[auto] + '</span><span class="io-lbl">Auto</span></button>';
    Object.keys(FI).forEach(function (k) {
      out += '<button class="icon-opt' + (cur === k ? ' active' : '') + '" data-action="pick-icon" data-icon="' + k + '" title="' + k + '">' +
        '<span class="fine-ic">' + FI[k] + '</span></button>';
    });
    return out + '</div>';
  }

  function openFineTypeForm(typeId) {
    pickedIcon = typeId ? null : '';
    var t = typeId ? findFineType(typeId) : null;
    var body =
      '<label for="ft-cat">Bødekategori</label>' +
      '<input id="ft-cat" type="text" value="' + (t ? esc(t.category) : '') + '" placeholder="fx Mobil">' +
      '<label for="ft-desc">Beskrivelse</label>' +
      '<textarea id="ft-desc" rows="2" placeholder="Hvornår gives bøden?">' + (t ? esc(t.description) : '') + '</textarea>' +
      '<label for="ft-amount">Beløb (kr.)</label>' +
      '<input id="ft-amount" type="number" inputmode="numeric" min="1" step="1" value="' + (t ? t.amount : 50) + '">' +
      '<label>Ikon <span class="lbl-hint">(vælges automatisk ud fra navnet — klik for at ændre)</span></label>' +
      iconPicker(t) +
      '<div class="btn-row"><button class="btn" data-action="finetype-save" data-id="' + (t ? esc(t.id) : '') + '">Gem takst</button>' +
      (t ? '<button class="btn danger" data-action="finetype-remove" data-id="' + esc(t.id) + '">Fjern</button>' : '') +
      '</div>' +
      (t ? '<div class="note">At fjerne taksten sletter ikke allerede givne bøder.</div>' : '');
    openModal(t ? 'Rediger takst' : 'Ny takst', body);
  }

  function openSettings() {
    var body =
      (viewerMode
        ? '<div class="btn-row"><button class="btn" data-action="viewer-toggle">' + IC.eye + 'Slå visningstilstand fra</button></div>' +
          '<div class="note">Visningstilstand skjuler al registrering på denne enhed — praktisk når linket deles med medlemmerne.</div>'
        : '<label for="set-club">Klubnavn</label>' +
          '<input id="set-club" type="text" value="' + esc(state.clubName) + '">' +
          '<div class="btn-row"><button class="btn" data-action="settings-save">Gem</button></div>' +
          '<hr class="divider">' +
          '<div class="btn-row"><button class="btn secondary" data-action="viewer-toggle">' + IC.eye + 'Visningstilstand</button>' +
          '<button class="btn secondary" data-action="audit-open">' + IC.clock + 'Revisionslog</button>' +
          '<button class="btn secondary" data-action="trash-open">' + IC.bin + 'Papirkurv (' + state.trash.length + ')</button></div>' +
          '<hr class="divider">' +
          '<div class="btn-row"><button class="btn secondary" data-action="export-json">Eksportér data (JSON)</button>' +
          '<button class="btn secondary" data-action="import-json">Importér data</button></div>' +
          '<input id="import-file" type="file" accept="application/json" hidden>' +
          '<hr class="divider">' +
          '<div class="btn-row"><button class="btn danger" data-action="reset-all">Nulstil alt</button></div>' +
          '<div class="note">Data gemmes automatisk i denne browser.' + (artifactNS ? ' Brug &raquo;Gem ændringer&laquo; i toppen for at gemme til den delte side.' : '') + '</div>');
    openModal('Indstillinger', body);
  }

  /* Sæsonafslutning: kåring af årets syndere (#5) */
  function openSeasonResult(y) {
    var totals = state.members.map(function (m) { return { m: m, sum: yearFineTotalFor(m.id, y.id) }; })
      .sort(function (a, b) { return b.sum - a.sum; });
    var top = totals.filter(function (t) { return t.sum > 0; }).slice(0, 3);
    var nice = totals.filter(function (t) { return t.m.active; }).slice().sort(function (a, b) { return a.sum - b.sum; })[0];
    var medals = ['guld', 'soelv', 'bronze'];
    var titles = ['Årets synder', '2. pladsen', '3. pladsen'];
    var rows = top.map(function (t, i) {
      return '<div class="podium-row ' + medals[i] + '" style="animation-delay: ' + ((top.length - 1 - i) * 0.22) + 's">' +
        '<div class="podium-rank">' + (i + 1) + '</div>' +
        '<div class="grow"><div class="t">' + esc(t.m.name) + '</div><div class="s">' + titles[i] + '</div></div>' +
        '<div class="podium-sum">' + kr(t.sum) + '</div></div>';
    }).join('');
    spawnConfetti();
    openModal(IC.trophy + ' Sæsonen ' + esc(y.label) + ' er slut',
      (rows || '<div class="note">Ingen bøder blev givet i denne sæson. Imponerende. Eller bekymrende.</div>') +
      (nice ? '<div class="streak-strip clean" style="margin-top: 16px">' + IC.shield + '<span>Mest artige: ' + esc(nice.m.name) + ' — kun ' + kr(nice.sum) + ' i bøder.</span></div>' : '') +
      '<div class="note">Samlet for sæsonen: ' + kr(yearTotal(y.id)) + ' i bøder. Alle møder er nu låst — de kan genåbnes enkeltvis.</div>');
  }

  function openTrash() {
    var rows = state.trash.slice().sort(function (a, b) { return b.deletedAt - a.deletedAt; }).map(function (t) {
      var label = t.kind === 'meeting'
        ? (t.meeting.title + ' · ' + yearLabel((findYear(t.meeting.clubYearId) || { startYear: '?' }).startYear || 0))
        : t.member.name;
      var sub = (t.kind === 'meeting' ? (t.fines.length + ' bøder') : (t.fines.length + ' bøder · ' + t.payments.length + ' indbetalinger')) +
        ' · slettet ' + fmtDateTime(t.deletedAt);
      return '<div class="log-item"><span class="rec-ic">' + (t.kind === 'meeting' ? IC.clock : IC.bin) + '</span>' +
        '<div class="grow"><div class="t">' + esc(label) + '</div><div class="s">' + esc(sub) + '</div></div>' +
        '<button class="btn small secondary" data-action="trash-restore" data-id="' + esc(t.id) + '">Gendan</button></div>';
    }).join('');
    openModal('Papirkurv', (rows || '<div class="note">Papirkurven er tom.</div>') +
      '<div class="note">Slettede møder og medlemmer gendannes med alt indhold. Ryddes automatisk efter ' + TRASH_DAYS + ' dage.</div>');
  }

  function openAudit() {
    var rows = state.audit.slice(0, 200).map(function (e) {
      return '<div class="log-item"><div class="grow"><div class="t">' + esc(e.text) + '</div>' +
        '<div class="s">' + fmtDateTime(e.ts) + '</div></div></div>';
    }).join('');
    openModal('Revisionslog', (rows || '<div class="note">Ingen registreringer endnu.</div>') +
      '<div class="note">Viser de seneste 200 hændelser.</div>');
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
      log('Oprettede klubåret ' + cy.label + ' med ' + MEETINGS_PER_YEAR + ' møder');
      view = { name: 'aar-detalje', yearId: cy.id };
      commit();
      toast('Klubår ' + cy.label + ' oprettet med ' + MEETINGS_PER_YEAR + ' møder');
    },
    'open-year': function (el) { view = { name: 'aar-detalje', yearId: el.getAttribute('data-id') }; render(); },
    'add-meeting': function (el) {
      var cy = findYear(el.getAttribute('data-id'));
      if (!cy || cy.closedAt) return;
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
      m.date = val('meet-date');
      m.description = val('meet-desc').trim();
      m.links = val('meet-links').trim();
      log('Redigerede ' + m.title + ' (' + (fmtDate(m.date)) + ')');
      closeModal();
      commit();
    },
    'close-meeting': function (el) {
      var m = findMeeting(el.getAttribute('data-id'));
      if (m) { m.closedAt = Date.now(); log('Afsluttede ' + m.title + ' — ' + kr(meetingTotal(m.id)) + ' i bøder'); commit(); toast(m.title + ' afsluttet — ' + kr(meetingTotal(m.id)) + ' i bøder'); }
    },
    'reopen-meeting': function (el) {
      var m = findMeeting(el.getAttribute('data-id'));
      if (m) { m.closedAt = null; commit(); }
    },
    'delete-meeting': function (el) {
      var m = findMeeting(el.getAttribute('data-id'));
      if (!m) return;
      var cnt = meetingFineCount(m.id);
      if (!window.confirm('Slet ' + m.title + (cnt ? ' og dets ' + cnt + ' bøder' : '') + '? (Kan gendannes fra papirkurven i ' + TRASH_DAYS + ' dage)')) return;
      state.trash.push({
        id: uid(), kind: 'meeting', deletedAt: Date.now(), meeting: m,
        fines: state.fines.filter(function (f) { return f.meetingId === m.id; })
      });
      state.fines = state.fines.filter(function (f) { return f.meetingId !== m.id; });
      state.meetings = state.meetings.filter(function (x) { return x.id !== m.id; });
      log('Slettede ' + m.title + ' (' + cnt + ' bøder) — lagt i papirkurven');
      view = { name: 'aar-detalje', yearId: m.clubYearId };
      commit();
    },
    'delete-member': function (el) {
      var m = findMember(el.getAttribute('data-id'));
      if (!m) return;
      var fines = state.fines.filter(function (f) { return f.memberId === m.id; });
      var pays = state.payments.filter(function (p) { return p.memberId === m.id; });
      if (!window.confirm('Slet ' + m.name + ' helt, inkl. ' + fines.length + ' bøder og ' + pays.length + ' indbetalinger? (Kan gendannes fra papirkurven i ' + TRASH_DAYS + ' dage)')) return;
      state.trash.push({ id: uid(), kind: 'member', deletedAt: Date.now(), member: m, fines: fines, payments: pays, wasFormand: state.formandId === m.id });
      state.members = state.members.filter(function (x) { return x.id !== m.id; });
      state.fines = state.fines.filter(function (f) { return f.memberId !== m.id; });
      state.payments = state.payments.filter(function (p) { return p.memberId !== m.id; });
      if (state.formandId === m.id) state.formandId = null;
      log('Slettede medlemmet ' + m.name + ' — lagt i papirkurven');
      closeModal();
      commit();
    },
    'trash-open': function () { openTrash(); },
    'trash-restore': function (el) {
      var id = el.getAttribute('data-id');
      var t = state.trash.find(function (x) { return x.id === id; });
      if (!t) return;
      if (t.kind === 'meeting') {
        state.meetings.push(t.meeting);
        state.fines = state.fines.concat(t.fines || []);
        log('Gendannede ' + t.meeting.title + ' fra papirkurven');
      } else {
        state.members.push(t.member);
        state.fines = state.fines.concat(t.fines || []);
        state.payments = state.payments.concat(t.payments || []);
        if (t.wasFormand && !state.formandId) state.formandId = t.member.id;
        log('Gendannede medlemmet ' + t.member.name + ' fra papirkurven');
      }
      state.trash = state.trash.filter(function (x) { return x.id !== id; });
      commitQuiet();
      toast('Gendannet');
      openTrash();
    },
    'audit-open': function () { openAudit(); },
    'viewer-toggle': function () {
      setViewerMode(!viewerMode);
      closeModal();
      toast(viewerMode ? 'Visningstilstand slået til' : 'Visningstilstand slået fra');
      render();
    },
    'stats-year': function (el) { statsYearId = el.getAttribute('data-id'); render(); },
    'report-open': function (el) { openReport(el.getAttribute('data-id')); },
    'report-close': function () { closeReport(); },
    'report-print': function () { window.print(); },
    'report-file': function () {
      var paper = document.getElementById('report-paper');
      if (!paper) return;
      var html = '<!doctype html><html lang="da"><head><meta charset="utf-8"><title>' + esc(state.clubName) + ' Kassererrapport</title>' +
        '<style>body{font-family:Georgia,serif;max-width:720px;margin:32px auto;color:#1a1a1a}h1{font-size:26px}h2{font-size:18px;margin-top:28px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{border-bottom:1px solid #ccc;text-align:left;padding:6px 8px}th{border-bottom:2px solid #333}.rp-sub{color:#666}.rp-kpis{display:flex;gap:24px;margin:18px 0}.rp-kpis b{display:block;font-size:20px}.rp-kpis span{color:#666;font-size:12px}.rp-sign{display:flex;gap:60px;margin-top:60px}.rp-line{border-top:1px solid #333;width:200px;margin-bottom:6px}</style>' +
        '</head><body>' + paper.innerHTML + '</body></html>';
      var fname = state.clubName.toLowerCase().replace(/[^a-z0-9æøå-]+/g, '-') + '-rapport-' + todayISO() + '.html';
      if (downloadsNS) {
        downloadsNS.save({ filename: fname, data: html }).then(function () { toast('Rapport gemt'); })
          .catch(function () { /* afvist */ });
        return;
      }
      var blob = new Blob([html], { type: 'text/html' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    },
    'season-close': function (el) {
      var y = findYear(el.getAttribute('data-id'));
      if (!y || y.closedAt) return;
      if (!window.confirm('Afslut sæsonen ' + y.label + '? Alle årets møder låses.')) return;
      y.closedAt = Date.now();
      yearMeetings(y.id).forEach(function (m) { if (!m.closedAt) m.closedAt = y.closedAt; });
      log('Afsluttede sæsonen ' + y.label + ' — ' + kr(yearTotal(y.id)) + ' i bøder');
      commit();
      openSeasonResult(y);
    },
    'season-reopen': function (el) {
      var y = findYear(el.getAttribute('data-id'));
      if (!y || !y.closedAt) return;
      y.closedAt = null;
      log('Genåbnede sæsonen ' + y.label);
      commit();
    },
    'member-hist': function (el) {
      openMemberSheet(el.getAttribute('data-id'), el.getAttribute('data-year') || null);
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
      log(m.name + ' fik »' + t.category + '« (' + kr(t.amount) + ') i ' + meet.title);
      commitQuiet();
      toast(m.name + ': ' + t.category + ' · ' + kr(t.amount));
      if (t.amount >= HOT_FINE) spawnConfetti();
      if (t.amount >= BIG_FINE) bigFineOverlay(t.amount, m.name, t.category);
      openFinePicker(m.id); // genopfrisk vælgeren med nye tællere
    },
    'special-fine': function () { openSpecialFineForm(); },
    'special-save': function () {
      var label = val('sp-label').trim() || 'Særbøde';
      var amount = num('sp-amount');
      var m = findMember(pickerMemberId);
      var meet = findMeeting(view.meetingId);
      if (!m || !meet || meet.closedAt || amount <= 0) return;
      state.fines.push({ id: uid(), meetingId: meet.id, memberId: m.id, fineTypeId: null, label: label, amount: amount, ts: Date.now() });
      log(m.name + ' fik særbøden »' + label + '« (' + kr(amount) + ') i ' + meet.title);
      commitQuiet();
      toast(m.name + ': ' + label + ' · ' + kr(amount));
      if (amount >= HOT_FINE) spawnConfetti();
      if (amount >= BIG_FINE) bigFineOverlay(amount, m.name, label);
      openFinePicker(m.id);
    },
    'remove-fine': function (el) {
      var f = state.fines.find(function (x) { return x.id === el.getAttribute('data-id'); });
      state.fines = state.fines.filter(function (x) { return x.id !== el.getAttribute('data-id'); });
      if (f) {
        var fm = findMember(f.memberId);
        log('Fortrød bøden »' + fineLabel(f) + '« (' + kr(f.amount) + ') til ' + (fm ? fm.name : '?'));
      }
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
      if (!m) return;
      m.active = false;
      if (state.formandId === m.id) { state.formandId = null; toast(m.name + ' udmeldt — klubben mangler en formand'); }
      closeModal();
      commit();
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
      log(was ? m.name + ' er ikke længere formand' : m.name + ' blev kronet som formand');
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
      log(m.name + ' indbetalte ' + kr(amount) + (val('pay-note').trim() ? ' (' + val('pay-note').trim() + ')' : ''));
      closeModal();
      commit();
      toast(m.name + ' indbetalte ' + kr(amount));
    },
    'remove-payment': function (el) {
      if (!window.confirm('Slet denne indbetaling?')) return;
      var id = el.getAttribute('data-id');
      var p = state.payments.find(function (x) { return x.id === id; });
      state.payments = state.payments.filter(function (x) { return x.id !== id; });
      if (p) {
        var pm = findMember(p.memberId);
        log('Slettede indbetaling på ' + kr(p.amount) + ' fra ' + (pm ? pm.name : '?'));
      }
      commit();
      if (p) openMemberSheet(p.memberId);
    },

    'pick-icon': function (el) {
      pickedIcon = el.getAttribute('data-icon');
      var opts = document.querySelectorAll('#icon-picker .icon-opt');
      for (var i = 0; i < opts.length; i++) {
        opts[i].className = 'icon-opt' + (opts[i].getAttribute('data-icon') === pickedIcon ? ' active' : '');
      }
    },
    'add-finetype': function () { openFineTypeForm(null); },
    'edit-finetype': function (el) { openFineTypeForm(el.getAttribute('data-id')); },
    'finetype-save': function (el) {
      var cat = val('ft-cat').trim();
      var amount = num('ft-amount');
      if (!cat || amount <= 0) { toast('Udfyld kategori og beløb'); return; }
      var id = el.getAttribute('data-id');
      var t = id ? findFineType(id) : null;
      var icon = pickedIcon !== null ? pickedIcon : (t && t.icon) || '';
      if (t) {
        t.category = cat; t.description = val('ft-desc').trim(); t.amount = amount; t.icon = icon;
        log('Redigerede taksten »' + cat + '« (' + kr(amount) + ')');
      } else {
        state.fineTypes.push({ id: uid(), category: cat, description: val('ft-desc').trim(), amount: amount, active: true, icon: icon });
        log('Oprettede taksten »' + cat + '« (' + kr(amount) + ')');
      }
      pickedIcon = null;
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
            if (!s || typeof s.version !== 'number' || s.version < 1 || s.version > 4 || !Array.isArray(s.members)) throw new Error('bad');
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
      log('Nulstillede alle data');
      view = { name: 'liga' };
      statsYearId = null;
      closeModal();
      commit();
    }
  };

  function saveMember(keepOpen) {
    var name = val('mem-name').trim();
    if (!name) return;
    state.members.push({ id: uid(), name: name, active: true, createdAt: Date.now() });
    log('Tilføjede medlemmet ' + name);
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
        if (viewerMode && MUTATING[action]) { toast('Visningstilstand — registrering er slået fra'); return; }
        if (!el.hasAttribute('disabled')) actions[action](el);
        return;
      }
      var tab = el.getAttribute && el.getAttribute('data-tab');
      if (tab) { view = { name: tab }; render(); return; }
      el = el.parentNode;
    }
  });

  /* Tooltip for [data-tip]-elementer (grafer, badges) */
  var tipEl = null;
  document.addEventListener('mouseover', function (e) {
    var el = e.target;
    while (el && el.getAttribute) {
      var tip = el.getAttribute('data-tip');
      if (tip) {
        if (!tipEl) {
          tipEl = document.createElement('div');
          tipEl.className = 'tip';
          document.body.appendChild(tipEl);
        }
        tipEl.textContent = tip;
        var r = el.getBoundingClientRect();
        tipEl.style.left = Math.max(8, Math.min(window.innerWidth - 8 - 260, r.left + r.width / 2 - 130)) + 'px';
        tipEl.style.top = Math.max(8, r.top - 40) + 'px';
        tipEl.style.opacity = '1';
        return;
      }
      el = el.parentNode;
    }
    if (tipEl) tipEl.style.opacity = '0';
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (document.querySelector('.report-overlay')) { closeReport(); return; }
      closeModal(); pickerMemberId = null; render();
    }
    if (e.key === 'Enter' && document.querySelector('.modal-root')) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input') {
        // I "Nyt medlem" er Enter = "Tilføj og fortsæt", så hele klubben kan tastes ind i ét stræk
        var target = e.target.id === 'mem-name'
          ? document.querySelector('.modal-root [data-action="member-save-more"]')
          : document.querySelector('.modal-root .btn-row .btn:not(.secondary):not(.danger)');
        if (target) { e.preventDefault(); target.click(); }
      }
    }
  });

  /* ---------- Start ---------- */

  loadState();
  render();
  initArtifact();
})();

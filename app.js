/* RTD Bødeligaen — klub-bødekasse. Vanilla JS, ingen afhængigheder. */
(function () {
  'use strict';

  var LS_KEY = 'rtd-boedeliga-v1';

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

  function freshState() {
    return {
      version: 1,
      updatedAt: Date.now(),
      clubName: 'RTD',
      members: [],
      fineTypes: seedFineTypes(),
      meetings: [],
      fines: [],
      payments: []
    };
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
    if (!iso) return '';
    var p = iso.split('-');
    if (p.length !== 3) return iso;
    return parseInt(p[2], 10) + '. ' + (MONTHS[parseInt(p[1], 10) - 1] || p[1]) + ' ' + p[0];
  }
  function todayISO() {
    var d = new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
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
        if (s && s.version) return s;
      }
    } catch (e) { /* korrupt embedded state — ignorér */ }
    return null;
  }

  function readLocal() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.version) return s;
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
  function findFineType(id) { return state.fineTypes.find(function (t) { return t.id === id; }); }
  function fineLabel(f) {
    if (f.fineTypeId) { var t = findFineType(f.fineTypeId); return t ? t.category : 'Slettet takst'; }
    return f.label || 'Særbøde';
  }
  function activeMembers() { return state.members.filter(function (m) { return m.active; }); }
  function nextMeetingNumber() {
    return state.meetings.reduce(function (a, m) { return Math.max(a, m.number); }, 0) + 1;
  }
  function meetingTotal(meetId) {
    return state.fines.reduce(function (a, f) { return f.meetingId === meetId ? a + f.amount : a; }, 0);
  }

  /* ---------- UI-tilstand ---------- */

  var view = { name: 'liga', meetingId: null };
  var pickerMemberId = null; // valgt medlem i bødevælgeren

  /* ---------- Ikoner ---------- */

  var IC = {
    trophy: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0V4z"></path><path d="M8 5H5a3 3 0 0 0 3 5M16 5h3a3 3 0 0 1-3 5"></path><path d="M12 13v4m-4 4h8m-6 0v-4h4v4"></path></svg>',
    calendar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="5" width="16" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M4 11h16"></path></svg>',
    people: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"></circle><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"></path><path d="M16 9a3 3 0 1 0 2 5.2M21 20c0-2.5-1.5-4.6-3.7-5.5"></path></svg>',
    list: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l3 3v15H6V3z"></path><path d="M9 9h6M9 13h6M9 17h4"></path></svg>',
    gear: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4L9.4 5.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"></path></svg>',
    x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
    left: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"></path></svg>',
    right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"></path></svg>',
    plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>',
    save: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h11l3 3v15H5V3z"></path><path d="M8 3v5h7V3M8 21v-7h8v7"></path></svg>'
  };

  /* ---------- Render ---------- */

  function h(html) { var d = document.createElement('div'); d.innerHTML = html; return d; }

  function render() {
    var app = document.getElementById('app');
    var brand = document.getElementById('brand-name');
    if (brand) brand.textContent = state.clubName + ' Bødeligaen';
    document.title = state.clubName + ' Bødeligaen';

    var saveWrap = document.getElementById('save-wrap');
    if (saveWrap) {
      saveWrap.innerHTML = artifactNS
        ? '<button class="btn small' + (dirty ? '' : ' secondary') + '" id="save-btn" data-action="publish">' + IC.save + (dirty ? 'Gem ændringer' : 'Alt gemt') + '</button>'
        : '';
    }

    var html = '';
    if (view.name === 'liga') html = viewLiga();
    else if (view.name === 'moder') html = viewMeetings();
    else if (view.name === 'mode') html = viewMeeting();
    else if (view.name === 'medlemmer') html = viewMembers();
    else if (view.name === 'takster') html = viewFineTypes();
    app.innerHTML = html;

    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i].getAttribute('data-tab');
      var active = (t === view.name) || (t === 'moder' && view.name === 'mode');
      tabs[i].className = 'tab' + (active ? ' active' : '');
    }
  }

  function statStrip() {
    return '<div class="stats">' +
      '<div class="stat"><div class="k">I kassen</div><div class="v green">' + kr(potTotal()) + '</div></div>' +
      '<div class="stat"><div class="k">Udestående</div><div class="v amber">' + kr(outstandingTotal()) + '</div></div>' +
      '<div class="stat"><div class="k">Møder</div><div class="v">' + state.meetings.length + '</div></div>' +
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
      if (bal <= 0) {
        rows += '<button class="lb-row clean" data-action="open-member" data-id="' + m.id + '">' +
          '<div class="rank">–</div><div class="who"><div class="name">' + esc(m.name) + '</div>' +
          '<div class="sub">Rent ark</div></div>' +
          '<div class="count">' + cnt + '</div><div class="sum">0</div></button>';
      } else {
        rows += '<button class="lb-row rank-' + rank + '" data-action="open-member" data-id="' + m.id + '">' +
          '<div class="rank">' + rank + '</div>' +
          '<div class="who"><div class="name">' + esc(m.name) + '</div>' +
          '<div class="sub">' + cnt + ' bøde' + (cnt === 1 ? '' : 'r') + ' · betalt ' + kr(memberPaidTotal(m.id)) + '</div></div>' +
          '<div class="count">' + cnt + '</div>' +
          '<div class="sum">' + Math.round(bal / 1) + '</div></button>';
      }
    });
    var live = state.meetings.find(function (m) { return !m.closedAt; });
    return statStrip() +
      '<div class="colhead"><div class="c-rank">#</div><div class="c-name">Spiller</div><div class="c-count">Bøder</div><div class="c-sum">Gæld kr.</div></div>' +
      rows +
      '<div class="actionbar">' +
      (live
        ? '<button class="btn" data-action="open-meeting" data-id="' + live.id + '">Fortsæt møde #' + live.number + '</button>'
        : '<button class="btn" data-action="new-meeting">Start møde #' + nextMeetingNumber() + '</button>') +
      '</div>';
  }

  function viewMeetings() {
    var list = state.meetings.slice().sort(function (a, b) { return b.number - a.number; });
    var rows = list.map(function (m) {
      var cnt = state.fines.filter(function (f) { return f.meetingId === m.id; }).length;
      return '<button class="row" data-action="open-meeting" data-id="' + m.id + '">' +
        '<div class="grow"><div class="t">Møde #' + m.number + '</div>' +
        '<div class="s">' + fmtDate(m.date) + ' · ' + cnt + ' bøde' + (cnt === 1 ? '' : 'r') + '</div></div>' +
        (m.closedAt ? '<span class="badge">Afsluttet</span>' : '<span class="badge live">I gang</span>') +
        '<div class="amount">' + kr(meetingTotal(m.id)) + '</div></button>';
    }).join('');
    return '<div class="section-title"><h2>Møder</h2><div class="hint">' + list.length + ' i alt</div></div>' +
      (rows || '<div class="empty"><div class="big">Ingen møder endnu</div>Start det første møde, og del bøder ud.</div>') +
      '<div class="actionbar"><button class="btn" data-action="new-meeting">' + IC.plus + 'Start møde #' + nextMeetingNumber() + '</button></div>';
  }

  function viewMeeting() {
    var meet = findMeeting(view.meetingId);
    if (!meet) { view = { name: 'moder' }; return viewMeetings(); }
    var members = activeMembers();
    var meetFines = state.fines.filter(function (f) { return f.meetingId === meet.id; });
    var perMember = {};
    meetFines.forEach(function (f) { perMember[f.memberId] = (perMember[f.memberId] || 0) + f.amount; });

    var grid = members.map(function (m) {
      var sum = perMember[m.id] || 0;
      var n = meetFines.filter(function (f) { return f.memberId === m.id; }).length;
      return '<button class="member-cell' + (sum > 0 ? ' hit' : '') + '" data-action="pick-fines" data-id="' + m.id + '"' + (meet.closedAt ? ' disabled style="opacity:0.55"' : '') + '>' +
        '<div class="name">' + esc(m.name) + '</div>' +
        '<div class="meta">' + (sum > 0 ? n + ' bøde' + (n === 1 ? '' : 'r') + ' · ' + kr(sum) : 'Ingen bøder') + '</div></button>';
    }).join('');

    var log = meetFines.slice().reverse().map(function (f) {
      var m = findMember(f.memberId);
      return '<div class="log-item">' +
        '<div class="grow"><div class="t">' + esc(m ? m.name : '?') + ' — ' + esc(fineLabel(f)) + '</div></div>' +
        '<div class="amount">' + kr(f.amount) + '</div>' +
        (meet.closedAt ? '' : '<button class="x" data-action="remove-fine" data-id="' + f.id + '" aria-label="Fjern bøde">' + IC.x + '</button>') +
        '</div>';
    }).join('');

    return '<div class="meet-head">' +
      '<button class="iconbtn" data-action="goto" data-view="moder" aria-label="Tilbage">' + IC.left + '</button>' +
      '<div class="grow"><div class="t">Møde #' + meet.number + '</div><div class="s">' + fmtDate(meet.date) + (meet.closedAt ? ' · afsluttet' : '') + '</div></div>' +
      '<div class="total">' + kr(meetingTotal(meet.id)) + '</div></div>' +
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
          '<div class="grow"><div class="t">' + esc(m.name) + '</div>' +
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
      return '<button class="fine-btn" data-action="give-fine" data-id="' + t.id + '">' +
        (counts[t.id] ? '<span class="n">' + counts[t.id] + '</span>' : '') +
        '<div class="cat">' + esc(t.category) + '</div>' +
        '<div class="amt">' + kr(t.amount) + '</div></button>';
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

    openModal('Giv bøder', body, 'Møde #' + meet.number + ' · spiller ' + (idx + 1) + ' af ' + members.length);
  }

  function openMemberSheet(memberId) {
    var m = findMember(memberId);
    if (!m) return;
    var bal = memberBalance(m.id);
    var events = [];
    state.fines.forEach(function (f) {
      if (f.memberId !== m.id) return;
      var meet = findMeeting(f.meetingId);
      events.push({ ts: f.ts, html: '<div class="log-item"><div class="grow"><div class="t">' + esc(fineLabel(f)) + '</div>' +
        '<div class="s">' + (meet ? 'Møde #' + meet.number + ' · ' + fmtDate(meet.date) : '') + '</div></div>' +
        '<div class="amount">+' + kr(f.amount) + '</div></div>' });
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
      '<div class="btn-row">' +
      '<button class="btn" data-action="pay-form" data-id="' + m.id + '">Registrer indbetaling</button>' +
      '<button class="btn secondary" data-action="rename-member" data-id="' + m.id + '">Omdøb</button>' +
      (m.active
        ? '<button class="btn danger" data-action="retire-member" data-id="' + m.id + '">Udmeld</button>'
        : '<button class="btn secondary" data-action="revive-member" data-id="' + m.id + '">Genindmeld</button>') +
      '</div>' +
      '<div class="section-title"><h2>Historik</h2><div class="hint">' + events.length + ' posteringer</div></div>' +
      '<div class="hist">' + (events.map(function (e) { return e.html; }).join('') || '<div class="note">Ingen posteringer endnu.</div>') + '</div>';

    openModal(esc(m.name), body, m.active ? '' : 'Udmeldt');
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
      '<div class="btn-row"><button class="btn" data-action="pay-save" data-id="' + m.id + '">Registrer ' + (bal > 0 ? '' : 'indbetaling') + '</button></div>' +
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
    'goto': function (el) { view = { name: el.getAttribute('data-view') }; render(); },
    'close-modal': function () { closeModal(); pickerMemberId = null; render(); },
    'publish': function () { publishShared(); },
    'settings': function () { openSettings(); },

    'new-meeting': function () {
      var m = { id: uid(), number: nextMeetingNumber(), date: todayISO(), closedAt: null };
      state.meetings.push(m);
      view = { name: 'mode', meetingId: m.id };
      commit();
    },
    'open-meeting': function (el) { view = { name: 'mode', meetingId: el.getAttribute('data-id') }; render(); },
    'close-meeting': function (el) {
      var m = findMeeting(el.getAttribute('data-id'));
      if (m) { m.closedAt = Date.now(); commit(); toast('Møde #' + m.number + ' afsluttet — ' + kr(meetingTotal(m.id)) + ' i bøder'); }
    },
    'reopen-meeting': function (el) {
      var m = findMeeting(el.getAttribute('data-id'));
      if (m) { m.closedAt = null; commit(); }
    },
    'delete-meeting': function (el) {
      var m = findMeeting(el.getAttribute('data-id'));
      if (!m) return;
      var cnt = state.fines.filter(function (f) { return f.meetingId === m.id; }).length;
      if (!window.confirm('Slet møde #' + m.number + (cnt ? ' og dets ' + cnt + ' bøder' : '') + '?')) return;
      state.fines = state.fines.filter(function (f) { return f.meetingId !== m.id; });
      state.meetings = state.meetings.filter(function (x) { return x.id !== m.id; });
      view = { name: 'moder' };
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
      state.updatedAt = Date.now();
      writeLocal();
      if (artifactNS) dirty = true;
      toast(m.name + ': ' + t.category + ' · ' + kr(t.amount));
      openFinePicker(m.id); // genopfrisk vælgeren med nye tællere
      renderSaveButtonOnly();
    },
    'special-fine': function () { openSpecialFineForm(); },
    'special-save': function () {
      var label = val('sp-label').trim() || 'Særbøde';
      var amount = num('sp-amount');
      var m = findMember(pickerMemberId);
      var meet = findMeeting(view.meetingId);
      if (!m || !meet || amount <= 0) return;
      state.fines.push({ id: uid(), meetingId: meet.id, memberId: m.id, fineTypeId: null, label: label, amount: amount, ts: Date.now() });
      toast(m.name + ': ' + label + ' · ' + kr(amount));
      var keep = m.id;
      commit();
      openFinePicker(keep);
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
            if (!s || s.version !== 1 || !Array.isArray(s.members)) throw new Error('bad');
            if (!window.confirm('Erstat alle nuværende data med det importerede?')) return;
            state = s;
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
      state.updatedAt = Date.now();
      writeLocal();
      if (artifactNS) dirty = true;
      toast(name + ' tilføjet');
      var f = document.getElementById('mem-name');
      if (f) { f.value = ''; f.focus(); }
      renderSaveButtonOnly();
    } else {
      closeModal();
      commit();
      toast(name + ' tilføjet');
    }
  }

  /* Opdater kun gem-knappen uden at rive en åben modal ned */
  function renderSaveButtonOnly() {
    var saveWrap = document.getElementById('save-wrap');
    if (saveWrap && artifactNS) {
      saveWrap.innerHTML = '<button class="btn small' + (dirty ? '' : ' secondary') + '" id="save-btn" data-action="publish">' + IC.save + (dirty ? 'Gem ændringer' : 'Alt gemt') + '</button>';
    }
  }

  /* ---------- Events ---------- */

  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el !== document) {
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
    if (e.key === 'Escape') closeModal();
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

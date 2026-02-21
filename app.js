/* ============================================================
   MyBusiness — Enterprise AI Platform
   app.js
   ============================================================ */

var NB = (function () {
  'use strict';

  /* ── Internal state ── */
  var memberCount = 0;

  /* ─────────────────────────────────────────
     NAVIGATION
     ───────────────────────────────────────── */

  /**
   * Navigate to a signup step (1–4).
   * Updates the step panels, progress indicators, and connector lines.
   */
  function goStep(n) {
    /* Hide all steps, show the target */
    document.querySelectorAll('.fstep').forEach(function (s) {
      s.classList.remove('on');
    });
    var el = document.getElementById('step' + n);
    if (el) el.classList.add('on');

    /* Progress step indicators */
    for (var i = 1; i <= 4; i++) {
      var pi = document.getElementById('pi' + i);
      if (!pi) continue;
      pi.classList.remove('active', 'done');
      if (i < n)      pi.classList.add('done');
      else if (i === n) pi.classList.add('active');
    }

    /* Progress connector lines */
    for (var j = 1; j <= 3; j++) {
      var pl = document.getElementById('pl' + j);
      if (!pl) continue;
      if (j < n) pl.classList.add('done');
      else        pl.classList.remove('done');
    }

    /* Populate email display on the verify step */
    if (n === 4) {
      var em   = document.getElementById('email');
      var disp = document.getElementById('emailDisplay');
      if (em && disp) disp.textContent = em.value || 'your@email.com';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ─────────────────────────────────────────
     LOGIN / SIGNUP MODE TOGGLE
     ───────────────────────────────────────── */

  /**
   * Switch between 'login' and 'signup' views.
   * @param {string} mode - 'login' | 'signup'
   */
  function switchMode(mode) {
    var lf = document.getElementById('loginFlow');
    var sf = document.getElementById('signupFlow');
    var tl = document.getElementById('tabLogin');
    var ts = document.getElementById('tabSignup');

    if (mode === 'login') {
      lf.style.display = 'block';
      sf.style.display = 'none';
      tl.classList.add('active');
      ts.classList.remove('active');
    } else {
      lf.style.display = 'none';
      sf.style.display = 'block';
      ts.classList.add('active');
      tl.classList.remove('active');
    }
  }

  /* ─────────────────────────────────────────
     ROLE / SIZE / MFA SELECTORS
     ───────────────────────────────────────── */

  /**
   * Select a role card.
   * @param {HTMLElement} el   - The clicked card element.
   * @param {string}      role - 'manager' | 'member'
   */
  function pickRole(el, role) {
    document.querySelectorAll('.role-card').forEach(function (c) {
      c.classList.remove('sel');
    });
    el.classList.add('sel');
  }

  /**
   * Select a team-size card and toggle the team-members section.
   * @param {HTMLElement} el   - The clicked card element.
   * @param {string}      size - '1' | '2-5' | '6-15' | '16+'
   */
  function pickSize(el, size) {
    document.querySelectorAll('.scard').forEach(function (c) {
      c.classList.remove('sel');
    });
    el.classList.add('sel');

    var tw = document.getElementById('teamWrap');
    if (!tw) return;

    if (size === '1') {
      /* Solo founder — disable team section */
      tw.classList.add('off');
    } else {
      /* Multi-person team — enable section and seed first member card */
      tw.classList.remove('off');
      if (memberCount === 0) addMember();
    }
  }

  /**
   * Select an MFA method card.
   * @param {HTMLElement} el     - The clicked card element.
   * @param {string}      method - 'app' | 'sms' | 'email' | 'skip'
   */
  function pickMFA(el, method) {
    document.querySelectorAll('.mfacard').forEach(function (c) {
      c.classList.remove('sel');
    });
    el.classList.add('sel');
  }

  /* ─────────────────────────────────────────
     TEAM MEMBER CARDS
     ───────────────────────────────────────── */

  /**
   * Dynamically append a new team-member input card to the list.
   */
  function addMember() {
    var list = document.getElementById('membersList');
    if (!list) return;

    var id  = memberCount++;
    var div = document.createElement('div');
    div.className = 'mcard';
    div.id        = 'mem' + id;

    div.innerHTML =
      '<div class="mhead">' +
        '<div class="mlabel">' +
          '<div class="mnum">' + (id + 1) + '</div> Team Member' +
        '</div>' +
        '<button class="rmbtn" onclick="NB.removeMember(' + id + ')" type="button">Remove</button>' +
      '</div>' +

      /* Name + Role row */
      '<div class="mgrid2">' +
        '<div class="field">' +
          '<label style="font-size:11px;font-weight:600;color:var(--muted);">Full Name</label>' +
          '<div class="ishell">' +
            '<span class="picon">' +
              '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' +
              '</svg>' +
            '</span>' +
            '<input type="text" placeholder="Full name" style="font-size:12px;" />' +
          '</div>' +
        '</div>' +
        '<div class="field">' +
          '<label style="font-size:11px;font-weight:600;color:var(--muted);">Role / Title</label>' +
          '<div class="ishell">' +
            '<span class="picon">' +
              '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<rect x="2" y="7" width="20" height="14" rx="2"/>' +
                '<path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>' +
              '</svg>' +
            '</span>' +
            '<input type="text" placeholder="e.g. CTO, Lead Designer" style="font-size:12px;" />' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* LinkedIn + GitHub row */
      '<div class="mgrid2">' +
        '<div class="field">' +
          '<label style="font-size:11px;font-weight:600;color:#0A66C2;">LinkedIn Profile</label>' +
          '<div class="ishell">' +
            '<span class="picon" style="font-size:10px;font-weight:800;color:#0A66C2;font-family:sans-serif;letter-spacing:-0.5px;">in</span>' +
            '<input type="url" placeholder="linkedin.com/in/username" style="font-size:12px;" />' +
          '</div>' +
        '</div>' +
        '<div class="field">' +
          '<label style="font-size:11px;font-weight:600;color:#24292F;">GitHub Profile</label>' +
          '<div class="ishell">' +
            '<span class="picon">' +
              '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>' +
              '</svg>' +
            '</span>' +
            '<input type="url" placeholder="github.com/username" style="font-size:12px;" />' +
          '</div>' +
        '</div>' +
      '</div>';

    list.appendChild(div);
  }

  /**
   * Remove a team-member card by its internal numeric id.
   * @param {number} id
   */
  function removeMember(id) {
    var el = document.getElementById('mem' + id);
    if (el) el.remove();
  }

  /* ─────────────────────────────────────────
     TEXTAREA CHAR COUNTER
     ───────────────────────────────────────── */

  /**
   * Update the character counter for the startup-idea textarea.
   * @param {HTMLTextAreaElement} el
   */
  function updateChar(el) {
    var c = el.value.length;
    if (c > 500) {
      el.value = el.value.slice(0, 500);
      c = 500;
    }
    var cnt = document.getElementById('charCount');
    if (cnt) cnt.textContent = c + ' / 500';
  }

  /* ─────────────────────────────────────────
     PASSWORD STRENGTH METER
     ───────────────────────────────────────── */

  /**
   * Evaluate password strength and update the strength-bar UI.
   * @param {string} val - Current password value.
   */
  function checkPw(val) {
    var meter = document.getElementById('pwMeter');
    if (meter) meter.classList.add('on');

    var bars  = ['sb1','sb2','sb3','sb4'].map(function (id) {
      return document.getElementById(id);
    });
    var label = document.getElementById('pwLabel');

    /* Reset bar classes */
    bars.forEach(function (b) { if (b) b.className = 'sbar'; });

    /* Score: 1 point per criterion */
    var score = 0;
    if (val.length >= 8)          score++;
    if (/[A-Z]/.test(val))        score++;
    if (/[0-9]/.test(val))        score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    var cls    = score <= 1 ? 'w' : score <= 2 ? 'm' : 's';
    var labels = [
      'Weak — add uppercase, numbers and symbols',
      'Moderate — try adding an uppercase letter',
      'Good — add a symbol for maximum strength',
      'Strong password — good to go'
    ];
    var colors = ['#DC2626', '#D97706', '#059669', '#059669'];

    for (var i = 0; i < score; i++) {
      if (bars[i]) bars[i].classList.add(cls);
    }

    if (label) {
      label.textContent = score > 0 ? labels[score - 1] : 'Enter a password';
      label.style.color = score > 0 ? colors[score - 1] : 'var(--muted2)';
    }
  }

  /* ─────────────────────────────────────────
     PASSWORD VISIBILITY TOGGLE
     ───────────────────────────────────────── */

  /**
   * Toggle a password input between visible and hidden.
   * @param {string}      id  - The input element's id.
   * @param {HTMLElement} btn - The toggle button element (unused, kept for API compat).
   */
  function togglePw(id, btn) {
    var inp = document.getElementById(id);
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
  }

  /* ─────────────────────────────────────────
     OTP INPUT HANDLING
     ───────────────────────────────────────── */

  /**
   * Auto-advance focus to the next OTP box on digit entry.
   * @param {HTMLInputElement} el  - Current OTP input.
   * @param {number}           idx - Index (0–5) of the current box.
   */
  function otpMove(el, idx) {
    /* Strip non-numeric characters */
    el.value = el.value.replace(/[^0-9]/g, '');
    if (el.value && idx < 5) {
      var next = document.getElementById('o' + (idx + 1));
      if (next) next.focus();
    }
  }

  /**
   * Move focus to the previous OTP box on Backspace when the current box is empty.
   * @param {KeyboardEvent} e   - Keyboard event.
   * @param {number}        idx - Index (0–5) of the current box.
   */
  function otpBack(e, idx) {
    if (e.key === 'Backspace' && !e.target.value && idx > 0) {
      var prev = document.getElementById('o' + (idx - 1));
      if (prev) prev.focus();
    }
  }

  /* ─────────────────────────────────────────
     OTP VERIFICATION
     ───────────────────────────────────────── */

  /**
   * Collect OTP digits and validate that all 6 have been entered.
   */
  function doVerify() {
    var code = '';
    for (var i = 0; i < 6; i++) {
      var oi = document.getElementById('o' + i);
      if (oi) code += oi.value;
    }

    if (code.length === 6) {
      showToast('Account verified — welcome to MyBusiness!');
    } else {
      showToast('Please enter all 6 digits of your verification code.');
    }
  }

  /* ─────────────────────────────────────────
     TOAST NOTIFICATION
     ───────────────────────────────────────── */

  /**
   * Display a transient toast notification.
   * @param {string} msg - Message text to display.
   */
  function showToast(msg) {
    var toast    = document.getElementById('toast');
    var toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = msg;
    toast.classList.add('on');

    setTimeout(function () {
      toast.classList.remove('on');
    }, 3500);
  }

  /* ─────────────────────────────────────────
     PUBLIC API
     ───────────────────────────────────────── */
  return {
    goStep:       goStep,
    switchMode:   switchMode,
    pickRole:     pickRole,
    pickSize:     pickSize,
    pickMFA:      pickMFA,
    addMember:    addMember,
    removeMember: removeMember,
    updateChar:   updateChar,
    checkPw:      checkPw,
    togglePw:     togglePw,
    otpMove:      otpMove,
    otpBack:      otpBack,
    doVerify:     doVerify,
    showToast:    showToast
  };

})();

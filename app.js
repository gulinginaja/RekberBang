/* ============================================================
   REKBER BANG — REAL ESCROW SYSTEM v2.0
   Production WebApp: Real Supabase DB, Telegram Identity,
   Full Transaction State Machine
   ============================================================ */

'use strict';

// ─── CONFIG ─────────────────────────────────────────────────
const CONFIG = {
  SUPABASE_URL:  'https://jnnisjenjogcgzponmjl.supabase.co',
  SUPABASE_KEY:  'sb_publishable_8oqpmh57DL6l_9KL8RVOgQ_oAcN1S2Q',
  ADMIN_USERNAME: '@swaetczher2',
  ADMIN_DISPLAY:  'Admin Rekber',
  ADMIN_ACCOUNT: {
    method: 'DANA',
    number: '08973814368',
    name:   'Admin Rekber Bang'
  },
  FEE_BUYER:  0.05,   // 5% buyer fee (platform fee)
  FEE_SELLER: 0.025,  // 2.5% seller WD fee
  NUM_ROOMS:  5,
  AUTO_DONE_MINUTES: 120,
};

// ─── SUPABASE CLIENT ────────────────────────────────────────
const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ─── TELEGRAM SDK ────────────────────────────────────────────
const tg = window.Telegram?.WebApp || null;
if (tg) {
  tg.ready();
  tg.expand();
}

// ─── CURRENT USER ────────────────────────────────────────────
const ME = (() => {
  if (tg && tg.initDataUnsafe?.user) {
    const u = tg.initDataUnsafe.user;
    return {
      id:       String(u.id),
      username: u.username ? `@${u.username}` : u.first_name,
      name:     `${u.first_name}${u.last_name ? ' ' + u.last_name : ''}`,
      isAdmin:  u.username === 'swaetczher2',
    };
  }
  // Dev fallback — open in browser
  const saved = localStorage.getItem('rekber_dev_user');
  if (saved) return JSON.parse(saved);
  const devName = prompt('Dev Mode: Masukkan username Anda (tanpa @):') || 'devuser';
  const devUser = { id: 'dev_' + devName, username: '@' + devName, name: devName, isAdmin: devName === 'swaetczher2' };
  localStorage.setItem('rekber_dev_user', JSON.stringify(devUser));
  return devUser;
})();

// ─── APP STATE ────────────────────────────────────────────────
const State = {
  rooms:        [],          // Array of room objects from Supabase
  currentView:  'home',
  currentRoomId: null,
  myRole:       null,        // 'buyer' | 'seller' | 'admin'
  confirmCallback: null,
  pendingRoleRoomId: null,
  historyData:  [],
  realtimeChannel: null,
};

// ─── UTILITY HELPERS ─────────────────────────────────────────
const fmt = {
  currency: (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID'),
  shortCurrency: (n) => {
    n = Number(n || 0);
    if (n >= 1e9) return 'Rp ' + (n / 1e9).toFixed(1) + ' M';
    if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1) + ' Jt';
    if (n >= 1e3) return 'Rp ' + (n / 1e3).toFixed(0) + ' Rb';
    return 'Rp ' + n;
  },
  date: (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  },
  initials: (name) => (name || '?').replace('@','').slice(0,2).toUpperCase(),
};

function toast(msg, type = 'info', duration = 3000) {
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info', warning:'fa-triangle-exclamation' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span class="toast-msg">${msg}</span>`;
  const container = document.getElementById('toast-container');
  container.appendChild(t);
  setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 250); }, duration);
}

function haptic(style = 'light') {
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style);
}

function copyText(text, label = 'Teks') {
  navigator.clipboard.writeText(text).then(() => toast(`${label} berhasil disalin!`, 'success', 2000));
}

function fmtAnon(username) {
  if (!username) return '—';
  const u = username.replace('@', '');
  if (u.length <= 4) return '@' + u + '***';
  return '@' + u.slice(0, 3) + '*'.repeat(Math.min(u.length - 3, 4));
}

// ─── DB HELPERS ───────────────────────────────────────────────
async function fetchRooms() {
  const { data, error } = await supabase
    .from('rekber_rooms')
    .select('*')
    .order('id');
  if (error) { console.error('fetchRooms:', error); return []; }
  return data || [];
}

async function fetchRoom(id) {
  const { data, error } = await supabase
    .from('rekber_rooms')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

async function updateRoom(id, fields) {
  const { error } = await supabase
    .from('rekber_rooms')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error('updateRoom:', error); return false; }
  return true;
}

async function fetchHistory() {
  const { data, error } = await supabase
    .from('rekber_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return [];
  return data || [];
}

async function saveHistory(room) {
  const txId = 'TX-' + Date.now().toString(36).toUpperCase();
  await supabase.from('rekber_history').insert({
    tx_id:     txId,
    room_name: `ROOM ${room.id}`,
    buyer:     fmtAnon(room.buyer),
    seller:    fmtAnon(room.seller),
    nominal:   room.nominal,
    status:    'SUKSES',
  });
  // Update stats
  const { data: stats } = await supabase.from('rekber_stats').select('*').eq('id', 1).single();
  if (stats) {
    await supabase.from('rekber_stats').update({
      total_volume:       (stats.total_volume || 0) + Number(room.nominal),
      total_transactions: (stats.total_transactions || 0) + 1,
    }).eq('id', 1);
  }
}

async function fetchStats() {
  const { data } = await supabase.from('rekber_stats').select('*').eq('id', 1).single();
  return data;
}

// ─── REALTIME ─────────────────────────────────────────────────
function initRealtime() {
  if (State.realtimeChannel) supabase.removeChannel(State.realtimeChannel);
  State.realtimeChannel = supabase
    .channel('rekber_rooms_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rekber_rooms' }, async (payload) => {
      const updated = payload.new;
      const idx = State.rooms.findIndex(r => r.id === updated.id);
      if (idx >= 0) State.rooms[idx] = updated;
      else State.rooms.push(updated);

      if (State.currentView === 'home') renderRooms();
      if (State.currentView === 'room' && State.currentRoomId === updated.id) {
        await renderRoomView(updated);
      }
    })
    .subscribe();
}

// ─── NAVIGATION ───────────────────────────────────────────────
const App = {
  async navigate(view, roomId) {
    State.currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    document.getElementById('view-' + view).classList.add('active');
    const navBtn = document.getElementById('nav-' + view);
    if (navBtn) navBtn.classList.add('active');

    if (view === 'home')    { await renderHomeView(); }
    if (view === 'room')    {
      State.currentRoomId = roomId || State.currentRoomId;
      const room = await fetchRoom(State.currentRoomId);
      if (room) await renderRoomView(room);
    }
    if (view === 'history') { await renderHistoryView(); }
  },

  async openRoom(roomId) {
    const room = await fetchRoom(roomId);
    if (!room) return;

    // Check if user is already in this room
    const myU = ME.username;
    if (room.buyer === myU) {
      State.myRole = 'buyer';
      document.getElementById('nav-room').style.display = '';
      await App.navigate('room', roomId);
      return;
    }
    if (room.seller === myU) {
      State.myRole = 'seller';
      document.getElementById('nav-room').style.display = '';
      await App.navigate('room', roomId);
      return;
    }
    if (ME.isAdmin) {
      State.myRole = 'admin';
      document.getElementById('nav-room').style.display = '';
      await App.navigate('room', roomId);
      return;
    }

    // Room fully locked and user not inside
    if (room.status === 'locked' && !ME.isAdmin) {
      toast('Room ini sudah penuh (2/2)', 'warning');
      return;
    }

    // Show role picker
    State.pendingRoleRoomId = roomId;
    document.getElementById('role-modal-room-title').textContent = `Masuk Room ${roomId}`;

    // Hide seller option if seller slot taken
    const sellerOpt = document.getElementById('role-seller-opt');
    const buyerOpt  = document.getElementById('role-buyer-opt');
    sellerOpt.style.display = room.seller ? 'none' : '';
    buyerOpt.style.display  = room.buyer  ? 'none' : '';

    document.getElementById('role-modal').classList.add('open');
    haptic('medium');
  },

  async selectRole(role) {
    const roomId = State.pendingRoleRoomId;
    if (!roomId) return;
    this.closeRoleModal();

    const room = await fetchRoom(roomId);
    if (!room) return;

    // Validate slot still available
    if (role === 'buyer' && room.buyer) { toast('Slot Pembeli sudah terisi!', 'error'); return; }
    if (role === 'seller' && room.seller) { toast('Slot Penjual sudah terisi!', 'error'); return; }

    State.myRole = role;

    // Join room
    const newData = {};
    if (role === 'buyer')  newData.buyer  = ME.username;
    if (role === 'seller') newData.seller = ME.username;

    // Update status
    const updatedRoom = { ...room, ...newData };
    if (updatedRoom.buyer && updatedRoom.seller) {
      newData.status   = 'locked';
      newData.tx_state = 'waiting_admin_panggilan';
    } else {
      newData.status   = 'half';
      newData.tx_state = 'waiting_member';
    }

    const ok = await updateRoom(roomId, newData);
    if (!ok) { toast('Gagal join room, coba lagi', 'error'); return; }

    toast(`Berhasil masuk sebagai ${role === 'buyer' ? 'Pembeli' : 'Penjual'}!`, 'success');
    haptic('medium');
    State.currentRoomId = roomId;
    document.getElementById('nav-room').style.display = '';
    await App.navigate('room', roomId);
  },

  closeRoleModal() {
    document.getElementById('role-modal').classList.remove('open');
  },

  openConfirm(icon, title, desc, okLabel, okClass, callback) {
    document.getElementById('confirm-icon').textContent = icon;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-desc').textContent = desc;
    const okBtn = document.getElementById('confirm-ok-btn');
    okBtn.textContent = okLabel;
    okBtn.className = `btn ${okClass} btn-sm`;
    State.confirmCallback = callback;
    document.getElementById('confirm-modal').classList.add('open');
  },

  closeConfirm() {
    document.getElementById('confirm-modal').classList.remove('open');
    State.confirmCallback = null;
  },

  doConfirmAction() {
    this.closeConfirm();
    if (State.confirmCallback) State.confirmCallback();
  },

  async leaveRoom() {
    App.openConfirm('🚪', 'Keluar dari Room?',
      'Apakah Anda yakin ingin keluar? Slot Anda akan dikosongkan kembali.',
      'Keluar', 'btn-danger', async () => {
        const room = await fetchRoom(State.currentRoomId);
        if (!room) return;
        const updates = {};
        if (State.myRole === 'buyer')  updates.buyer  = null;
        if (State.myRole === 'seller') updates.seller = null;

        const remaining = (State.myRole === 'buyer' ? room.seller : room.buyer);
        updates.status   = remaining ? 'half' : 'empty';
        updates.tx_state = remaining ? 'waiting_member' : 'select_role';
        updates.nominal  = 0;
        updates.buyer_total = 0;
        updates.seller_total = 0;

        await updateRoom(State.currentRoomId, updates);
        State.myRole = null;
        State.currentRoomId = null;
        document.getElementById('nav-room').style.display = 'none';
        toast('Anda keluar dari room', 'info');
        await App.navigate('home');
      });
  },
};

// ─── RENDER: HOME VIEW ────────────────────────────────────────
async function renderHomeView() {
  // Load stats
  const stats = await fetchStats();
  if (stats) {
    document.getElementById('home-stat-volume').textContent = fmt.shortCurrency(stats.total_volume);
    document.getElementById('home-stat-tx').textContent = Number(stats.total_transactions).toLocaleString('id-ID') + ' Tx';
  }

  // Load rooms
  State.rooms = await fetchRooms();
  renderRooms();
}

function renderRooms() {
  const list = document.getElementById('rooms-list');
  if (!State.rooms.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🚪</div><div class="empty-title">Tidak ada room tersedia</div></div>';
    return;
  }

  list.innerHTML = State.rooms.map(room => {
    const isMine = room.buyer === ME.username || room.seller === ME.username || (ME.isAdmin && room.status !== 'empty');
    const isEmpty   = room.status === 'empty';
    const isHalf    = room.status === 'half';
    const isLocked  = room.status === 'locked';
    const isMyRoom  = isMine;

    let icon = isEmpty ? '🔓' : isHalf ? '⏳' : '🔒';
    let iconClass = isEmpty ? 'empty' : isHalf ? 'half' : 'locked';
    let badgeClass = isEmpty ? 'badge-empty' : isHalf ? 'badge-half' : 'badge-locked';
    let badgeText  = isEmpty ? 'KOSONG' : isHalf ? '1/2 ONLINE' : '2/2 LOCKED';
    let subtitle = '';

    if (isEmpty)  subtitle = 'Siap digunakan — klik untuk bergabung';
    if (isHalf)   subtitle = isMyRoom ? '✅ Room Anda (menunggu lawan)' : 'Menunggu 1 peserta lagi';
    if (isLocked) subtitle = isMyRoom ? `✅ Room Anda • ${room.tx_state?.replace(/_/g,' ')}` : 'Transaksi sedang berlangsung';

    if (isMyRoom) { badgeClass = 'badge-active'; badgeText = 'ROOM SAYA'; }

    const canClick = isEmpty || isMyRoom || (isHalf && !isLocked);
    const lockedClass = (!canClick && !ME.isAdmin) ? 'locked' : '';

    return `
      <div class="room-card ${lockedClass} ${isMyRoom ? 'slide-up' : ''}" onclick="App.openRoom(${room.id})">
        <div class="room-icon ${iconClass}">${icon}</div>
        <div class="room-info">
          <div class="room-name">Room ${room.id}</div>
          <div class="room-status-text">${subtitle}</div>
        </div>
        <span class="room-badge ${badgeClass}">${badgeText}</span>
      </div>`;
  }).join('');
}

// ─── RENDER: ROOM VIEW ───────────────────────────────────────
const TX_STEPS = [
  { key: 'join',     label: 'Join' },
  { key: 'topup',    label: 'Top-Up' },
  { key: 'delivery', label: 'Kirim' },
  { key: 'confirm',  label: 'Terima' },
  { key: 'withdraw', label: 'WD' },
  { key: 'done',     label: 'Done' },
];

function txStateToStep(txState) {
  const map = {
    'select_role': 0, 'waiting_member': 0,
    'waiting_admin_panggilan': 1,
    'topup_menu': 1, 'topup_receipt_pending': 1, 'verifying_topup': 1,
    'waiting_delivery': 2,
    'waiting_delivery_confirmation': 3,
    'disputed': 3,
    'waiting_withdraw': 4, 'withdraw_submitted': 4, 'withdraw_receipt_pending': 4,
    'waiting_done': 5, 'waiting_done_refund': 5,
    'buyer_refund_menu': 4, 'refund_receipt_pending': 4,
  };
  return map[txState] ?? 0;
}

async function renderRoomView(room) {
  // Header
  document.getElementById('room-view-title').textContent = `Room ${room.id}`;

  // Role tag
  const roleTag = document.getElementById('room-view-role-tag');
  const roleMap = { buyer: { text: '👤 PEMBELI', cls: 'badge-active' }, seller: { text: '🏪 PENJUAL', cls: 'badge-success' }, admin: { text: '👑 ADMIN', cls: 'badge-admin' } };
  const roleInfo = roleMap[State.myRole] || { text: '—', cls: 'badge-empty' };
  roleTag.textContent = roleInfo.text;
  roleTag.className = `room-role-tag room-badge ${roleInfo.cls}`;

  // Status badge
  const statusBadge = document.getElementById('room-view-status-badge');
  const statusMap = { empty: ['KOSONG', 'badge-empty'], half: ['1/2 ONLINE', 'badge-half'], locked: ['2/2 LOCKED', 'badge-locked'] };
  const [sTxt, sCls] = statusMap[room.status] || ['—', 'badge-empty'];
  statusBadge.textContent = sTxt;
  statusBadge.className = `room-badge ${sCls}`;

  // Progress steps
  const currentStep = txStateToStep(room.tx_state);
  document.getElementById('tx-progress-bar').innerHTML = `
    <div class="tx-progress-label">Progress Transaksi</div>
    <div class="progress-steps">
      ${TX_STEPS.map((s, i) => `
        <div class="progress-step ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}">
          <div class="step-dot">${i < currentStep ? '✓' : i + 1}</div>
          <div class="step-dot-label">${s.label}</div>
        </div>`).join('')}
    </div>`;

  // Participants
  document.getElementById('participants-row').innerHTML = `
    <div class="participant-chip">
      <div class="participant-dot ${room.buyer ? 'buyer' : 'empty'}">${room.buyer ? fmt.initials(room.buyer) : '?'}</div>
      <span class="participant-name">${room.buyer || 'Menunggu Pembeli...'}</span>
    </div>
    <span class="vs-divider">vs</span>
    <div class="participant-chip">
      <div class="participant-dot ${room.seller ? 'seller' : 'empty'}">${room.seller ? fmt.initials(room.seller) : '?'}</div>
      <span class="participant-name">${room.seller || 'Menunggu Penjual...'}</span>
    </div>
    ${room.admin_joined ? `
    <div style="margin-left:4px;">
      <div class="participant-chip" style="flex:none;">
        <div class="participant-dot admin">👑</div>
        <span class="participant-name">Admin</span>
      </div>
    </div>` : ''}`;

  // Nominal summary
  const nomSection = document.getElementById('nominal-section');
  if (room.nominal > 0) {
    nomSection.style.display = '';
    document.getElementById('nom-base').textContent  = fmt.currency(room.nominal);
    document.getElementById('nom-fee').textContent   = fmt.currency(room.buyer_total - room.nominal);
    document.getElementById('nom-total').textContent = fmt.currency(room.buyer_total);
    const sellerRow = document.getElementById('seller-net-row');
    if (room.seller_total > 0) {
      sellerRow.style.display = '';
      document.getElementById('nom-seller-net').textContent = fmt.currency(room.seller_total);
    }
  } else {
    nomSection.style.display = 'none';
  }

  // State-specific UI
  await renderStateSection(room);
}

async function renderStateSection(room) {
  const section = document.getElementById('tx-state-section');
  const actions = document.getElementById('action-panel');
  const r = State.myRole;
  const state = room.tx_state;

  let stateHTML = '';
  let actionsHTML = '';

  // ── STATE: waiting_member ──────────────────────────
  if (state === 'waiting_member' || state === 'select_role') {
    stateHTML = mkStateCard('waiting', '⏳', 'Menunggu Peserta Lain',
      `${r === 'buyer' ? 'Pembeli' : 'Penjual'} sudah masuk. Menunggu ${r === 'buyer' ? 'penjual' : 'pembeli'} bergabung ke room ini...`);
    actionsHTML = `<button class="btn btn-ghost" onclick="App.leaveRoom()"><i class="fa-solid fa-arrow-right-from-bracket"></i> Keluar dari Room</button>`;
  }

  // ── STATE: waiting_admin_panggilan ─────────────────
  else if (state === 'waiting_admin_panggilan') {
    if (r === 'admin') {
      stateHTML = mkStateCard('admin', '👑', 'Ada Panggilan Admin!',
        `Room ${room.id}: ${room.buyer} & ${room.seller} membutuhkan mediator. Klik Join untuk masuk.`);
      actionsHTML = `
        <button class="btn btn-admin" onclick="AdminActions.joinRoom(${room.id})"><i class="fa-solid fa-shield-halved"></i> Accept & Bergabung sebagai Admin</button>
        <button class="btn btn-ghost" onclick="App.leaveRoom()"><i class="fa-solid fa-xmark"></i> Tolak</button>`;
    } else {
      const alreadyCalled = room.admin_joined;
      stateHTML = mkStateCard(alreadyCalled ? 'active' : 'waiting',
        alreadyCalled ? '✅' : '📞',
        alreadyCalled ? 'Admin Sudah Bergabung!' : 'Siap Bertransaksi?',
        alreadyCalled ? 'Admin telah masuk sebagai mediator. Menunggu pembeli input nominal...' : 'Kedua pihak sudah masuk. Panggil admin sebagai mediator transaksi.');
      if (!alreadyCalled) {
        actionsHTML = `
          <div class="alert warning" style="margin:0;">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div class="alert-text">Pastikan Anda telah <strong>berdiskusi & sepakat</strong> mengenai harga dan item sebelum memanggil admin.</div>
          </div>
          <button class="btn btn-primary" onclick="BuyerActions.callAdmin(${room.id})"><i class="fa-solid fa-phone"></i> Panggil Admin</button>
          <button class="btn btn-ghost" onclick="App.leaveRoom()"><i class="fa-solid fa-arrow-right-from-bracket"></i> Keluar dari Room</button>`;
      }
    }
  }

  // ── STATE: topup_menu ─────────────────────────────
  else if (state === 'topup_menu') {
    if (r === 'buyer') {
      stateHTML = mkStateCard('active', '💰', 'Input Nominal Transaksi',
        'Masukkan harga produk yang disepakati. Sistem akan otomatis menghitung total yang harus Anda transfer.');
      actionsHTML = `
        <div style="padding:0 16px;">
          <div class="form-group">
            <label class="form-label">Harga Produk (Rp)</label>
            <div class="input-with-prefix">
              <span class="input-prefix">Rp</span>
              <input type="number" id="input-nominal" placeholder="Contoh: 500000" min="10000" inputmode="numeric">
            </div>
            <div class="form-hint" id="fee-preview">Masukkan nominal untuk lihat rincian biaya</div>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-ghost" onclick="App.leaveRoom()"><i class="fa-solid fa-xmark"></i> Batal</button>
          <button class="btn btn-primary" onclick="BuyerActions.submitNominal(${room.id})"><i class="fa-solid fa-calculator"></i> Konfirmasi</button>
        </div>`;
      // Attach live preview listener after render
      setTimeout(() => {
        const inp = document.getElementById('input-nominal');
        if (inp) inp.addEventListener('input', () => {
          const n = parseFloat(inp.value) || 0;
          const fee = n * CONFIG.FEE_BUYER;
          const total = n + fee;
          document.getElementById('fee-preview').textContent = n > 0
            ? `Fee Rekber 5%: ${fmt.currency(fee)} → Total Transfer: ${fmt.currency(total)}`
            : 'Masukkan nominal untuk lihat rincian biaya';
        });
      }, 50);
    } else if (r === 'seller') {
      stateHTML = mkStateCard('waiting', '⏳', 'Menunggu Pembeli Input Nominal',
        'Admin sudah bergabung. Menunggu pembeli memasukkan harga produk yang disepakati...');
      actionsHTML = '';
    } else {
      stateHTML = mkStateCard('admin', '👑', 'Admin — Menunggu Input Pembeli',
        `Admin sudah join. Menunggu ${room.buyer} input nominal transaksi.`);
    }
  }

  // ── STATE: topup_receipt_pending ──────────────────
  else if (state === 'topup_receipt_pending') {
    const adminAcc = CONFIG.ADMIN_ACCOUNT;
    if (r === 'buyer') {
      stateHTML = mkStateCard('active', '💳', 'Transfer Dana ke Admin',
        `Silakan transfer sejumlah ${fmt.currency(room.buyer_total)} ke rekening admin di bawah ini, lalu upload bukti transfer.`);
      actionsHTML = `
        <div class="info-box" style="margin:0 16px 12px;">
          <div class="info-box-header"><i class="fa-solid fa-building-columns"></i><span class="info-box-title">Rekening Tujuan</span></div>
          <div class="info-row">
            <span class="info-key">Metode</span>
            <span class="info-val"><strong>${adminAcc.method}</strong></span>
          </div>
          <div class="info-row">
            <span class="info-key">Nomor</span>
            <span class="info-val monospace">${adminAcc.number} <button class="copy-btn" onclick="copyText('${adminAcc.number}','Nomor')"><i class="fa-regular fa-copy"></i></button></span>
          </div>
          <div class="info-row">
            <span class="info-key">Atas Nama</span>
            <span class="info-val">${adminAcc.name}</span>
          </div>
          <div class="info-row">
            <span class="info-key" style="color:var(--red-400);font-weight:700;">Total Transfer</span>
            <span class="info-val green" style="font-size:15px;">${fmt.currency(room.buyer_total)} <button class="copy-btn" onclick="copyText('${room.buyer_total}','Nominal')"><i class="fa-regular fa-copy"></i></button></span>
          </div>
        </div>
        <div style="padding:0 16px;">
          <label class="form-label">Upload Bukti Transfer</label>
          <div class="upload-area" id="upload-area-buyer">
            <input type="file" accept="image/*" id="upload-input-buyer" onchange="BuyerActions.previewReceipt(this)">
            <div class="upload-icon">📸</div>
            <div class="upload-text">Ketuk untuk pilih foto bukti transfer</div>
            <div class="upload-hint">Format: JPG, PNG, WEBP</div>
          </div>
          <div id="receipt-preview-buyer"></div>
        </div>
        <div class="btn-row" style="margin-top:8px;">
          <button class="btn btn-primary" id="btn-kirim-bukti" onclick="BuyerActions.submitReceipt(${room.id})" disabled><i class="fa-solid fa-paper-plane"></i> Kirim Bukti Transfer</button>
        </div>`;
    } else if (r === 'seller') {
      stateHTML = mkStateCard('waiting', '🛡️', 'Menunggu Pembeli Transfer',
        `Pembeli sedang memproses transfer ${fmt.currency(room.buyer_total)} ke admin. Tunggu konfirmasi admin.`);
    } else {
      stateHTML = mkStateCard('admin', '👑', 'Menunggu Bukti Transfer Pembeli',
        `Pembeli harus transfer ${fmt.currency(room.buyer_total)} lalu upload bukti.`);
    }
  }

  // ── STATE: verifying_topup ───────────────────────
  else if (state === 'verifying_topup') {
    if (r === 'admin') {
      stateHTML = mkStateCard('admin', '🔍', 'Verifikasi Pembayaran Pembeli',
        `${room.buyer} sudah upload bukti transfer ${fmt.currency(room.buyer_total)}. Periksa mutasi rekening Anda dan verifikasi.`);
      actionsHTML = `
        <div style="padding:0 16px 12px;" id="admin-receipt-view">
          <div class="form-label">Bukti Transfer Pembeli</div>
          ${room.buyer_uploaded_receipt
            ? `<div class="upload-preview"><img src="${room.buyer_uploaded_receipt}" alt="Bukti Transfer"><span class="upload-preview-badge">Terunggah</span></div>`
            : '<div class="alert info"><i class="fa-solid fa-image"></i><span class="alert-text">Gambar sedang diproses...</span></div>'}
        </div>
        <div class="btn-row">
          <button class="btn btn-danger" onclick="AdminActions.rejectPayment(${room.id})"><i class="fa-solid fa-xmark"></i> Tolak</button>
          <button class="btn btn-success" onclick="AdminActions.approvePayment(${room.id})"><i class="fa-solid fa-check"></i> Verifikasi & Tahan Dana</button>
        </div>`;
    } else {
      const whoWaits = r === 'buyer' ? 'Bukti transfer Anda sedang diperiksa oleh admin.' : 'Menunggu admin memverifikasi pembayaran pembeli.';
      stateHTML = mkStateCard('waiting', '🔍', 'Verifikasi oleh Admin', whoWaits);
    }
  }

  // ── STATE: waiting_delivery ──────────────────────
  else if (state === 'waiting_delivery') {
    if (r === 'seller') {
      stateHTML = mkStateCard('success', '🛡️', 'Dana Aman Ditahan Admin!',
        `${fmt.currency(room.nominal)} telah diamankan oleh admin. Silakan kirimkan produk/jasa Anda ke pembeli sekarang.`);
      actionsHTML = `
        <div class="alert info" style="margin:0 16px 12px;">
          <i class="fa-solid fa-circle-info"></i>
          <div class="alert-text">Kirim produk ke <strong>${room.buyer}</strong> melalui chat Telegram. Setelah selesai, klik tombol di bawah.</div>
        </div>
        <div class="btn-row">
          <button class="btn btn-success" onclick="SellerActions.confirmSent(${room.id})"><i class="fa-solid fa-truck-fast"></i> Produk Sudah Dikirim</button>
        </div>`;
    } else if (r === 'buyer') {
      stateHTML = mkStateCard('success', '🛡️', 'Dana Aman! Menunggu Penjual',
        `Admin menahan ${fmt.currency(room.nominal)} sebagai jaminan. Penjual sedang mempersiapkan produk Anda.`);
    } else {
      stateHTML = mkStateCard('admin', '🛡️', 'Dana Ditahan — Menunggu Pengiriman',
        `${fmt.currency(room.nominal)} ditahan. Menunggu ${room.seller} konfirmasi pengiriman.`);
    }
  }

  // ── STATE: waiting_delivery_confirmation ─────────
  else if (state === 'waiting_delivery_confirmation') {
    if (r === 'buyer') {
      stateHTML = mkStateCard('active', '📦', 'Periksa Produk Anda!',
        `Penjual telah mengirimkan produk. Periksa dengan seksama sebelum mengkonfirmasi. Jika ada masalah, gunakan tombol Dispute.`);
      actionsHTML = `
        <div class="alert warning" style="margin:0 16px 12px;">
          <i class="fa-solid fa-clock"></i>
          <div class="alert-text">Jika tidak ada konfirmasi dalam <strong>2 jam</strong>, dana akan otomatis dilepas ke penjual.</div>
        </div>
        <div class="btn-row">
          <button class="btn btn-danger" style="flex:0.8;" onclick="BuyerActions.raiseDispute(${room.id})"><i class="fa-solid fa-flag"></i> Dispute</button>
          <button class="btn btn-success" onclick="BuyerActions.confirmReceived(${room.id})"><i class="fa-solid fa-circle-check"></i> Produk Diterima ✓</button>
        </div>`;
    } else if (r === 'seller') {
      stateHTML = mkStateCard('waiting', '⏳', 'Menunggu Konfirmasi Pembeli',
        'Produk sudah terkirim. Menunggu pembeli mengkonfirmasi penerimaan. Auto-done aktif dalam 2 jam.');
    } else {
      stateHTML = mkStateCard('admin', '👀', 'Monitor Konfirmasi Penerimaan',
        `${room.buyer} sedang memeriksa produk dari ${room.seller}.`);
    }
  }

  // ── STATE: disputed ──────────────────────────────
  else if (state === 'disputed') {
    if (r === 'admin') {
      stateHTML = mkStateCard('danger', '⚖️', 'DISPUTE — Butuh Mediasi Admin',
        `${room.buyer} mengajukan komplain. Dana dibekukan. Review situasi dan putuskan resolusinya.`);
      actionsHTML = `
        <div class="alert danger" style="margin:0 16px 12px;">
          <i class="fa-solid fa-lock"></i>
          <div class="alert-text"><strong>Dana dibekukan.</strong> Hanya admin yang dapat membuka segel dan memutuskan resolusi.</div>
        </div>
        <div class="btn-row">
          <button class="btn btn-danger" onclick="AdminActions.resolveRefund(${room.id})"><i class="fa-solid fa-rotate-left"></i> Refund ke Pembeli</button>
          <button class="btn btn-success" onclick="AdminActions.resolveRelease(${room.id})"><i class="fa-solid fa-money-bill-transfer"></i> Lepas ke Penjual</button>
        </div>`;
    } else {
      stateHTML = mkStateCard('danger', '⚖️', 'DISPUTE AKTIF — Dana Dibekukan',
        `Dispute sedang diproses admin. Harap tunggu keputusan mediator. Jangan keluar dari room.`);
    }
  }

  // ── STATE: waiting_withdraw ──────────────────────
  else if (state === 'waiting_withdraw') {
    if (r === 'seller') {
      stateHTML = mkStateCard('success', '💸', 'Pembeli Sudah Konfirmasi!',
        `Selamat! Pembeli puas. Ajukan withdraw dan masukkan data rekening untuk pencairan ${fmt.currency(room.seller_total)}.`);
      actionsHTML = `
        <div style="padding:0 16px;">
          <div class="form-group">
            <label class="form-label">Metode Pencairan</label>
            <select class="form-select" id="wd-method">
              <option value="DANA">DANA</option>
              <option value="GoPay">GoPay</option>
              <option value="OVO">OVO</option>
              <option value="ShopeePay">ShopeePay</option>
              <option value="BCA">BCA</option>
              <option value="BRI">BRI</option>
              <option value="BNI">BNI</option>
              <option value="Mandiri">Mandiri</option>
              <option value="BSI">BSI</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Nomor Rekening / No. HP</label>
            <input class="form-input" id="wd-account" type="text" placeholder="Contoh: 08123456789" inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label">Nama Pemilik Rekening</label>
            <input class="form-input" id="wd-name" type="text" placeholder="Sesuai nama di rekening">
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-success" onclick="SellerActions.submitWithdraw(${room.id})"><i class="fa-solid fa-money-bill-transfer"></i> Ajukan Withdraw ${fmt.currency(room.seller_total)}</button>
        </div>`;
    } else if (r === 'buyer') {
      stateHTML = mkStateCard('success', '✅', 'Terima Kasih!',
        'Konfirmasi penerimaan Anda sudah diproses. Dana sedang dicairkan ke penjual.');
    } else {
      stateHTML = mkStateCard('admin', '💸', 'Menunggu Penjual Ajukan Withdraw',
        `${room.seller} belum mengisi data rekening. Total akan dicairkan: ${fmt.currency(room.seller_total)}`);
    }
  }

  // ── STATE: withdraw_receipt_pending ──────────────
  else if (state === 'withdraw_receipt_pending') {
    let wdAcc = {};
    try { wdAcc = JSON.parse(room.wd_account); } catch(e) {}

    if (r === 'admin') {
      stateHTML = mkStateCard('admin', '💸', 'Proses Transfer Manual ke Penjual',
        `Transfer ${fmt.currency(room.seller_total)} ke rekening penjual di bawah, lalu upload bukti.`);
      actionsHTML = `
        <div class="info-box" style="margin:0 16px 12px;">
          <div class="info-box-header"><i class="fa-solid fa-money-bill-wave"></i><span class="info-box-title">Rekening Penjual</span></div>
          <div class="info-row"><span class="info-key">Metode</span><span class="info-val">${wdAcc.method || '—'}</span></div>
          <div class="info-row"><span class="info-key">Nomor</span><span class="info-val monospace">${wdAcc.number || '—'} <button class="copy-btn" onclick="copyText('${wdAcc.number || ''}','Nomor')"><i class="fa-regular fa-copy"></i></button></span></div>
          <div class="info-row"><span class="info-key">Atas Nama</span><span class="info-val">${wdAcc.name || '—'}</span></div>
          <div class="info-row"><span class="info-key" style="color:var(--green-400);font-weight:700;">Jumlah Transfer</span><span class="info-val green">${fmt.currency(room.seller_total)}</span></div>
        </div>
        <div style="padding:0 16px;">
          <label class="form-label">Upload Bukti Transfer ke Penjual</label>
          <div class="upload-area">
            <input type="file" accept="image/*" id="upload-input-wd" onchange="AdminActions.previewWdReceipt(this)">
            <div class="upload-icon">📸</div>
            <div class="upload-text">Ketuk untuk pilih foto bukti transfer</div>
          </div>
          <div id="wd-receipt-preview"></div>
        </div>
        <div class="btn-row" style="margin-top:8px;">
          <button class="btn btn-success" id="btn-submit-wd" onclick="AdminActions.submitWdReceipt(${room.id})" disabled><i class="fa-solid fa-paper-plane"></i> Upload & Konfirmasi Transfer</button>
        </div>`;
    } else if (r === 'seller') {
      stateHTML = mkStateCard('waiting', '⏳', 'Withdraw Sedang Diproses Admin',
        `Admin sedang memproses transfer ${fmt.currency(room.seller_total)} ke rekening Anda. Harap tunggu.`);
    } else {
      stateHTML = mkStateCard('waiting', '⏳', 'Menunggu Konfirmasi Dana Diterima',
        'Admin sedang mencairkan dana ke penjual.');
    }
  }

  // ── STATE: waiting_done ───────────────────────────
  else if (state === 'waiting_done' || state === 'waiting_done_refund') {
    const isDoneRefund = state === 'waiting_done_refund';
    if (r === 'seller' && !isDoneRefund) {
      stateHTML = mkStateCard('success', '🎉', 'Dana Sudah Dikirim Admin!',
        `Admin sudah mentransfer ${fmt.currency(room.seller_total)} ke rekening Anda. Cek saldo Anda, lalu klik DONE untuk menutup room.`);
      actionsHTML = `
        ${room.admin_uploaded_receipt ? `<div style="padding:0 16px 12px;"><div class="form-label">Bukti Transfer dari Admin</div><div class="upload-preview"><img src="${room.admin_uploaded_receipt}" alt="Bukti WD"><span class="upload-preview-badge">✓ Terkirim</span></div></div>` : ''}
        <button class="btn btn-success" onclick="SellerActions.markDone(${room.id})"><i class="fa-solid fa-flag-checkered"></i> ✅ DONE — Dana Diterima!</button>`;
    } else if (r === 'buyer' && isDoneRefund) {
      stateHTML = mkStateCard('success', '🎉', 'Refund Sudah Dikirim!',
        `Admin sudah mentransfer refund ke rekening Anda. Cek saldo Anda, lalu klik DONE untuk menutup room.`);
      actionsHTML = `<button class="btn btn-success" onclick="BuyerActions.markDoneRefund(${room.id})"><i class="fa-solid fa-flag-checkered"></i> ✅ DONE — Refund Diterima!</button>`;
    } else {
      stateHTML = mkStateCard('waiting', '⏳', 'Menunggu Konfirmasi Akhir',
        isDoneRefund ? 'Menunggu pembeli konfirmasi terima refund.' : 'Menunggu penjual konfirmasi terima dana.');
    }
  }

  // ── STATE: buyer_refund_menu ──────────────────────
  else if (state === 'buyer_refund_menu') {
    if (r === 'buyer') {
      stateHTML = mkStateCard('active', '💸', 'Pengajuan Refund Disetujui',
        'Admin telah memutuskan untuk melakukan refund. Masukkan data rekening Anda untuk pencairan.');
      let wdInfo = {};
      try { wdInfo = JSON.parse(room.wd_account); } catch(e) {}
      actionsHTML = `
        <div style="padding:0 16px;">
          <div class="form-group">
            <label class="form-label">Metode Refund</label>
            <select class="form-select" id="ref-method"><option value="DANA">DANA</option><option value="GoPay">GoPay</option><option value="OVO">OVO</option><option value="BCA">BCA</option><option value="BRI">BRI</option><option value="BNI">BNI</option><option value="Mandiri">Mandiri</option></select>
          </div>
          <div class="form-group">
            <label class="form-label">Nomor Rekening / No. HP</label>
            <input class="form-input" id="ref-account" type="text" placeholder="08123456789" inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label">Nama Pemilik</label>
            <input class="form-input" id="ref-name" type="text" placeholder="Nama sesuai rekening">
          </div>
        </div>
        <button class="btn btn-primary" style="margin:0 16px;" onclick="BuyerActions.submitRefundAccount(${room.id})"><i class="fa-solid fa-rotate-left"></i> Ajukan Refund ${fmt.currency(room.buyer_total)}</button>`;
    } else {
      stateHTML = mkStateCard('waiting', '⏳', 'Menunggu Pembeli Isi Data Refund', 'Pembeli sedang memasukkan data rekening untuk pencairan refund.');
    }
  }

  // ── DEFAULT / COMPLETED ───────────────────────────
  else {
    stateHTML = mkStateCard('success', '🎉', 'Transaksi Selesai!',
      'Room ini telah berhasil menyelesaikan satu siklus transaksi. Silakan kembali ke beranda.');
    actionsHTML = `<button class="btn btn-primary" onclick="App.navigate('home')"><i class="fa-solid fa-house"></i> Kembali ke Beranda</button>`;
  }

  section.innerHTML = stateHTML + `<div class="section-gap"></div>`;
  actions.innerHTML = actionsHTML;
}

function mkStateCard(type, icon, heading, subtext) {
  return `
    <div class="tx-state-card state-${type} fade-in">
      <div class="tx-state-banner">
        <div class="tx-state-icon">${icon}</div>
        <div>
          <div class="tx-state-text-heading">${heading}</div>
          <div class="tx-state-text-sub">${subtext}</div>
        </div>
      </div>
    </div>`;
}

// ─── BUYER ACTIONS ────────────────────────────────────────────
const BuyerActions = {
  async callAdmin(roomId) {
    App.openConfirm('📞', 'Panggil Admin?',
      'Admin akan masuk sebagai mediator. Pastikan Anda sudah sepakat dengan penjual mengenai harga dan produk.',
      'Panggil Admin', 'btn-primary', async () => {
        await updateRoom(roomId, { tx_state: 'waiting_admin_panggilan' });
        toast('Admin sudah dipanggil! Mohon tunggu.', 'info');
        haptic('medium');
      });
  },

  async submitNominal(roomId) {
    const inp = document.getElementById('input-nominal');
    const nominal = parseFloat(inp?.value || 0);
    if (!nominal || nominal < 10000) { toast('Minimal nominal Rp 10.000', 'warning'); return; }
    const buyerTotal  = nominal + nominal * CONFIG.FEE_BUYER;
    const sellerTotal = nominal - nominal * CONFIG.FEE_SELLER;
    App.openConfirm('💰', `Total Transfer: ${fmt.currency(buyerTotal)}`,
      `Harga: ${fmt.currency(nominal)}\nFee Rekber (5%): ${fmt.currency(nominal * CONFIG.FEE_BUYER)}\nTotal yang harus Anda transfer: ${fmt.currency(buyerTotal)}`,
      'Setuju, Lanjutkan', 'btn-primary', async () => {
        await updateRoom(roomId, { nominal, buyer_total: buyerTotal, seller_total: sellerTotal, tx_state: 'topup_receipt_pending' });
        toast('Nominal dikonfirmasi. Silakan transfer ke admin.', 'success');
        haptic('medium');
      });
  },

  previewReceipt(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('receipt-preview-buyer').innerHTML =
        `<div class="upload-preview" style="margin-top:10px;"><img src="${e.target.result}" alt="Bukti"><span class="upload-preview-badge">Dipilih ✓</span></div>`;
      document.getElementById('btn-kirim-bukti').disabled = false;
      BuyerActions._receiptData = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  async submitReceipt(roomId) {
    const receipt = BuyerActions._receiptData;
    if (!receipt) { toast('Pilih foto bukti transfer terlebih dahulu', 'warning'); return; }
    const btn = document.getElementById('btn-kirim-bukti');
    btn.innerHTML = '<span class="loading-spinner"></span> Mengunggah...';
    btn.disabled = true;
    await updateRoom(roomId, { buyer_uploaded_receipt: receipt, tx_state: 'verifying_topup' });
    toast('Bukti transfer berhasil dikirim ke admin!', 'success');
    haptic('medium');
  },

  async raiseDispute(roomId) {
    App.openConfirm('⚠️', 'Ajukan Dispute?',
      'Dana akan DIBEKUKAN sampai admin selesai memediasi. Gunakan fitur ini hanya jika ada masalah nyata.',
      'Ya, Ajukan Dispute', 'btn-danger', async () => {
        await updateRoom(roomId, { tx_state: 'disputed' });
        toast('Dispute diajukan. Admin akan segera menghubungi.', 'warning');
        haptic('heavy');
      });
  },

  async confirmReceived(roomId) {
    App.openConfirm('✅', 'Konfirmasi Terima Produk?',
      'Dengan menekan tombol ini, Anda menyatakan produk sudah diterima dengan baik. Dana akan dicairkan ke penjual.',
      'Ya, Produk Diterima', 'btn-success', async () => {
        await updateRoom(roomId, { tx_state: 'waiting_withdraw' });
        toast('Konfirmasi diterima! Penjual bisa ajukan withdraw.', 'success');
        haptic('medium');
      });
  },

  async submitRefundAccount(roomId) {
    const method  = document.getElementById('ref-method')?.value;
    const number  = document.getElementById('ref-account')?.value?.trim();
    const name    = document.getElementById('ref-name')?.value?.trim();
    if (!number || !name) { toast('Isi semua data rekening refund', 'warning'); return; }
    await updateRoom(roomId, { wd_account: JSON.stringify({ method, number, name }), tx_state: 'refund_receipt_pending' });
    toast('Data refund dikirim ke admin!', 'success');
    haptic('medium');
  },

  async markDoneRefund(roomId) {
    App.openConfirm('🎉', 'Konfirmasi Refund Diterima?',
      'Pastikan refund sudah masuk ke rekening Anda sebelum menekan DONE.',
      '✅ DONE', 'btn-success', async () => {
        const room = await fetchRoom(roomId);
        await saveHistory(room);
        await updateRoom(roomId, {
          tx_state: 'select_role', status: 'empty',
          buyer: null, seller: null, admin_joined: false,
          nominal: 0, buyer_total: 0, seller_total: 0,
          buyer_uploaded_receipt: null, admin_uploaded_receipt: null,
          wd_account: '', buyer_done: false, seller_done: false,
        });
        State.myRole = null;
        State.currentRoomId = null;
        document.getElementById('nav-room').style.display = 'none';
        toast('Transaksi selesai! Terima kasih sudah menggunakan Rekber Bang.', 'success', 5000);
        haptic('medium');
        await App.navigate('home');
      });
  },
};

// ─── SELLER ACTIONS ───────────────────────────────────────────
const SellerActions = {
  async confirmSent(roomId) {
    App.openConfirm('📦', 'Konfirmasi Pengiriman?',
      'Pastikan Anda sudah mengirimkan produk ke pembeli. Aksi ini tidak dapat dibatalkan.',
      'Ya, Sudah Dikirim', 'btn-primary', async () => {
        await updateRoom(roomId, { tx_state: 'waiting_delivery_confirmation' });
        toast('Pengiriman terkonfirmasi! Menunggu pembeli konfirmasi terima.', 'info');
        haptic('medium');
      });
  },

  async submitWithdraw(roomId) {
    const method = document.getElementById('wd-method')?.value;
    const number = document.getElementById('wd-account')?.value?.trim();
    const name   = document.getElementById('wd-name')?.value?.trim();
    if (!number || !name) { toast('Isi semua data rekening withdraw', 'warning'); return; }
    const room = await fetchRoom(roomId);
    App.openConfirm('💸', `Ajukan Withdraw ${fmt.currency(room?.seller_total)}?`,
      `Dana akan dikirim ke: ${method} ${number} (${name})`,
      'Ajukan Withdraw', 'btn-success', async () => {
        await updateRoom(roomId, { wd_account: JSON.stringify({ method, number, name }), tx_state: 'withdraw_receipt_pending' });
        toast('Permintaan withdraw dikirim ke admin!', 'success');
        haptic('medium');
      });
  },

  async markDone(roomId) {
    App.openConfirm('🎉', 'Konfirmasi Dana Diterima?',
      'Pastikan dana sudah masuk ke rekening Anda sebelum menekan DONE. Room akan ditutup.',
      '✅ DONE', 'btn-success', async () => {
        const room = await fetchRoom(roomId);
        await saveHistory(room);
        await updateRoom(roomId, {
          tx_state: 'select_role', status: 'empty',
          buyer: null, seller: null, admin_joined: false,
          nominal: 0, buyer_total: 0, seller_total: 0,
          buyer_uploaded_receipt: null, admin_uploaded_receipt: null,
          wd_account: '', buyer_done: false, seller_done: false,
        });
        State.myRole = null;
        State.currentRoomId = null;
        document.getElementById('nav-room').style.display = 'none';
        toast('Transaksi selesai! Terima kasih sudah menggunakan Rekber Bang.', 'success', 5000);
        haptic('medium');
        await App.navigate('home');
      });
  },
};

// ─── ADMIN ACTIONS ────────────────────────────────────────────
const AdminActions = {
  async joinRoom(roomId) {
    await updateRoom(roomId, { admin_joined: true, tx_state: 'topup_menu' });
    State.myRole = 'admin';
    State.currentRoomId = roomId;
    document.getElementById('nav-room').style.display = '';
    toast('Anda sudah bergabung sebagai Admin.', 'success');
    haptic('medium');
    await App.navigate('room', roomId);
  },

  async approvePayment(roomId) {
    App.openConfirm('✅', 'Verifikasi Pembayaran?',
      'Konfirmasi bahwa dana sudah masuk ke rekening Anda dan akan ditahan sebagai escrow.',
      '✅ Dana Masuk & Aman', 'btn-success', async () => {
        await updateRoom(roomId, { tx_state: 'waiting_delivery' });
        toast('Pembayaran diverifikasi. Dana ditahan!', 'success');
        haptic('medium');
      });
  },

  async rejectPayment(roomId) {
    App.openConfirm('❌', 'Tolak Pembayaran?',
      'Bukti transfer tidak valid atau dana belum masuk. Pembeli harus upload ulang.',
      'Tolak & Minta Ulang', 'btn-danger', async () => {
        await updateRoom(roomId, { buyer_uploaded_receipt: null, tx_state: 'topup_receipt_pending' });
        toast('Pembayaran ditolak. Pembeli diminta upload ulang.', 'warning');
      });
  },

  async resolveRefund(roomId) {
    App.openConfirm('💸', 'Refund ke Pembeli?',
      'Dana akan dikembalikan penuh ke pembeli. Penjual tidak akan menerima pembayaran.',
      'Refund ke Pembeli', 'btn-danger', async () => {
        await updateRoom(roomId, { tx_state: 'buyer_refund_menu' });
        toast('Dispute: Refund ke pembeli dipilih.', 'info');
      });
  },

  async resolveRelease(roomId) {
    App.openConfirm('✅', 'Lepas Dana ke Penjual?',
      'Dana akan dicairkan ke penjual. Pastikan Anda sudah meninjau bukti dengan seksama.',
      'Lepas Dana ke Penjual', 'btn-success', async () => {
        await updateRoom(roomId, { tx_state: 'waiting_withdraw' });
        toast('Dispute: Dana dilepas ke penjual.', 'success');
      });
  },

  previewWdReceipt(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('wd-receipt-preview').innerHTML =
        `<div class="upload-preview" style="margin-top:10px;"><img src="${e.target.result}" alt="Bukti WD"><span class="upload-preview-badge">Dipilih ✓</span></div>`;
      document.getElementById('btn-submit-wd').disabled = false;
      AdminActions._wdReceiptData = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  async submitWdReceipt(roomId) {
    const receipt = AdminActions._wdReceiptData;
    if (!receipt) { toast('Pilih foto bukti transfer terlebih dahulu', 'warning'); return; }
    const btn = document.getElementById('btn-submit-wd');
    btn.innerHTML = '<span class="loading-spinner"></span> Mengunggah...';
    btn.disabled = true;
    await updateRoom(roomId, {
      admin_uploaded_receipt: receipt,
      tx_state: room => room.wd_account?.includes('refund') ? 'waiting_done_refund' : 'waiting_done',
    });
    // Re-fetch to decide correct state
    const room = await fetchRoom(roomId);
    const nextState = room.tx_state === 'refund_receipt_pending' || room.status === 'refund'
      ? 'waiting_done_refund' : 'waiting_done';
    await updateRoom(roomId, { admin_uploaded_receipt: receipt, tx_state: nextState });
    toast('Bukti transfer diunggah! Menunggu konfirmasi pihak lain.', 'success');
    haptic('medium');
  },
};

// ─── RENDER: HISTORY VIEW ──────────────────────────────────────
async function renderHistoryView() {
  State.historyData = await fetchHistory();
  renderHistoryList(State.historyData);

  document.getElementById('history-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = State.historyData.filter(h =>
      (h.tx_id || '').toLowerCase().includes(q) ||
      (h.buyer || '').toLowerCase().includes(q) ||
      (h.seller || '').toLowerCase().includes(q)
    );
    renderHistoryList(filtered);
  });
}

function renderHistoryList(items) {
  const list = document.getElementById('history-list');
  if (!items.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">Belum Ada Riwayat</div>
        <div class="empty-desc">Transaksi yang berhasil diselesaikan akan muncul di sini.</div>
      </div>`;
    return;
  }

  list.innerHTML = items.map(h => `
    <div class="history-card fade-in">
      <div class="history-icon">✅</div>
      <div class="history-info">
        <div class="history-id">${h.tx_id}</div>
        <div class="history-parties">${h.buyer} ⇄ ${h.seller}</div>
        <div class="history-room">${h.room_name} • ${h.status}</div>
      </div>
      <div>
        <div class="history-amount">${fmt.currency(h.nominal)}</div>
        <div class="history-date">${fmt.date(h.created_at)}</div>
      </div>
    </div>`).join('');
}

// ─── INIT USER UI ─────────────────────────────────────────────
function initUserUI() {
  const chip = document.getElementById('user-chip');
  const avatarEl = document.getElementById('user-avatar-chip');
  const nameEl   = document.getElementById('user-name-chip');

  avatarEl.textContent = fmt.initials(ME.username);
  nameEl.textContent   = ME.username;

  if (ME.isAdmin) {
    avatarEl.className = 'user-avatar admin';
  } else {
    avatarEl.className = 'user-avatar default';
  }
}

// ─── BACK BUTTON ─────────────────────────────────────────────
document.getElementById('back-to-home-btn').addEventListener('click', () => {
  App.navigate('home');
});

// ─── BOOT ────────────────────────────────────────────────────
(async function init() {
  // Telegram UI integration
  if (tg) {
    document.documentElement.style.setProperty('--bg-base', tg.themeParams?.bg_color || '#07090f');
  }

  initUserUI();
  initRealtime();
  await App.navigate('home');
})();

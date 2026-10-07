// Shared family (server/family.js): share chosen profiles with family members on their own phones.
// Only birth details are shared (shared/sync-policy.js shareableProfile). Private profiles never leave this phone;
// chats, health notes and goals are never shared. Revoking deletes the server copy; other phones drop it on sync.
import {
  state, $, $$, L, esc, api, STATIC, store, go, toast, saveFamily, displayName, nameInLang,
} from './core.js';
import { canShareProfile, shareableProfile, mergeSharedProfiles } from './shared/sync-policy.js';

const JOIN_KEY = 'kj_join_code';
const SEEN_KEY = 'kj_share_seen'; // shareId -> updatedAt of the last copy this phone applied or pushed

// An invite link (…/#join=XXXX-XXXX-XXXX) is remembered before the app clears the address bar.
const takeJoinHash = () => {
  const m = /^#join=([A-Za-z0-9-]{12,20})$/.exec(window.location?.hash || '');
  if (m) store.set(JOIN_KEY, m[1].toUpperCase());
  return Boolean(m);
};
try {
  takeJoinHash();
  // The link opened while the app is already running (same page): go straight to the Family screen.
  window.addEventListener?.('hashchange', () => { if (takeJoinHash()) { history.replaceState(null, '', location.pathname + location.search); go('family'); } });
} catch { /* no location (tests) */ }
export const pendingJoinCode = () => store.get(JOIN_KEY, null);

let last = null; // the latest GET /api/family overview
let syncing = null;

const sameCopy = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);

/**
 * Sync with the server: push my profile changes to my shares (or revoke a share whose profile became private or
 * was deleted), apply edits family members made to my shared profiles, and refresh profiles shared with me.
 * Signed out (or a static build): shared-with-me copies are removed from this phone.
 */
export function syncShares() {
  if (STATIC || !state.user) {
    if (state.family.some((m) => m.shared)) { state.family = mergeSharedProfiles(state.family, []); fixActive(); saveFamily(); }
    last = null;
    return Promise.resolve(null);
  }
  syncing ||= doSync().finally(() => { syncing = null; });
  return syncing;
}

function fixActive() {
  if (!state.family.some((m) => m.id === state.activeId)) state.activeId = state.family.find((m) => !m.shared)?.id || state.family[0]?.id || null;
}

async function doSync() {
  let ov;
  try { ov = await api('/api/family'); } catch { return last; }
  const seen = store.get(SEEN_KEY, {}) || {};
  let changed = false;
  for (const s of ov.myShares || []) {
    const local = state.family.find((m) => m.id === s.profileId && !m.shared);
    if (!local || local.private) {
      await api(`/api/family/shares/${s.id}`, { method: 'DELETE' }).catch(() => {});
      delete seen[s.id];
      continue;
    }
    if (s.editedByOther && s.updatedAt > (seen[s.id] || 0) && s.profile) {
      Object.assign(local, s.profile, { id: local.id }); // a family member with edit permission changed it
      seen[s.id] = s.updatedAt; changed = true;
    } else if (!sameCopy(shareableProfile(local), s.profile)) {
      try { const r = await api(`/api/family/shares/${s.id}/profile`, { method: 'PUT', body: { profile: local } }); seen[s.id] = r.share.updatedAt; } catch { /* next time */ }
    }
  }
  store.set(SEEN_KEY, seen);
  const before = JSON.stringify(state.family.filter((m) => m.shared));
  state.family = mergeSharedProfiles(state.family, ov.sharedWithMe || []);
  if (changed || before !== JSON.stringify(state.family.filter((m) => m.shared))) { fixActive(); saveFamily(); }
  try { ov = await api('/api/family'); } catch { /* keep the first answer */ }
  last = ov;
  return ov;
}

/** After editing a profile someone shared with me (edit permission): send the change to the owner. */
export async function pushSharedEdit(m) {
  if (!m?.shared || m.shared.permission !== 'edit') return;
  try { await api(`/api/family/shares/${m.shared.shareId}/profile`, { method: 'PUT', body: { profile: m } }); }
  catch (e) { toast(e.status === 403 ? L('This profile is now view-only.', 'இந்தச் சுயவிவரம் இப்போது பார்வைக்கு மட்டும்.') : L('Could not send the change — will retry.', 'மாற்றத்தை அனுப்ப முடியவில்லை — மீண்டும் முயலும்.')); }
}

const roleText = (r) => ({ owner: L('Owner', 'உரிமையாளர்'), adult: L('Adult member', 'பெரியவர்'), 'guardian-view': L('Guardian view', 'பாதுகாவலர் பார்வை') }[r] || r);
const dateText = (t) => new Date(t).toLocaleDateString(state.lang === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short' });
const BOUNDARY = () => `<p class="fs-boundary small">💬 ${L('Chats stay on your phone. Only the birth details of the profiles you choose are shared — never chats, health notes or goals. 🔒 Private profiles never leave this phone.', 'உரையாடல்கள் உங்கள் கைப்பேசியிலேயே. நீங்கள் தேர்வு செய்யும் சுயவிவரங்களின் பிறப்பு விவரங்கள் மட்டுமே பகிரப்படும் — உரையாடல், உடல்நலக் குறிப்பு, இலக்குகள் ஒருபோதும் இல்லை. 🔒 தனிப்பட்ட சுயவிவரங்கள் இந்தக் கைப்பேசியை விட்டு வெளியேறாது.')}</p>`;

function css() {
  if (document.getElementById('famShareCss')) return;
  const st = document.createElement('style');
  st.id = 'famShareCss';
  st.textContent = `
  #sharedFamily{margin-top:14px}
  .fs-card h3{margin:0 0 4px;font-size:16px;color:var(--gold)}
  .fs-row{display:flex;gap:10px;align-items:center;padding:10px 0;border-top:1px solid rgba(var(--gold-rgb),.12);flex-wrap:wrap}
  .fs-row:first-of-type{border-top:0}
  .fs-row .fs-main{flex:1 1 160px;min-width:0}
  .fs-row .fs-main b{overflow-wrap:anywhere}
  .fs-row select{width:auto;min-width:140px;margin:0;padding:8px 10px;font-size:14px}
  .fs-code{font:600 22px/1.2 ui-monospace,monospace;letter-spacing:2px;text-align:center;padding:12px;border-radius:12px;background:var(--surface-soft);color:var(--gold2);overflow-wrap:anywhere;margin:8px 0}
  .fs-link{font-size:12px;overflow-wrap:anywhere;color:var(--muted)}
  .fs-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  .fs-boundary{background:rgba(var(--gold-rgb),.08);border-radius:12px;padding:10px 12px;margin:10px 0 0}
  .fs-join{display:flex;gap:8px;align-items:stretch;flex-wrap:wrap}
  .fs-join input{flex:1 1 160px;min-width:0;text-transform:uppercase;letter-spacing:1px}
  .fs-join button{flex:0 0 auto}
  .fs-section{margin-top:14px}
  .fs-section > .small.muted{margin:0 0 4px}`;
  document.head.appendChild(st);
}

/** The "Shared family" card on the Family profiles screen. */
export async function mountSharedFamily(box, { onChange } = {}) {
  if (!box) return;
  css();
  if (STATIC) {
    box.innerHTML = `<div class="card glass fs-card" role="status"><h3>👨‍👩‍👧 ${L('Shared family', 'பகிர்ந்த குடும்பம்')}</h3>
      <p class="small">${L('Family sharing needs the Thunai server — opening soon.', 'குடும்பப் பகிர்வுக்குத் துணை சேவையகம் தேவை — விரைவில் தொடங்கும்.')}</p>${BOUNDARY()}</div>`;
    return;
  }
  if (!state.user) {
    box.innerHTML = `<div class="card glass fs-card"><h3>👨‍👩‍👧 ${L('Shared family', 'பகிர்ந்த குடும்பம்')}</h3>
      <p class="small">${L('Sign in to share chosen profiles with family members on their own phones.', 'தேர்ந்த சுயவிவரங்களைக் குடும்பத்தினரின் கைப்பேசிகளுடன் பகிர உள்நுழையவும்.')}</p>
      <button class="chip-btn" data-go="login">${L('Sign in', 'உள்நுழை')}</button>${BOUNDARY()}</div>`;
    return;
  }
  box.innerHTML = `<div class="card glass fs-card"><h3>👨‍👩‍👧 ${L('Shared family', 'பகிர்ந்த குடும்பம்')}</h3><p class="small muted">${L('Loading…', 'ஏற்றுகிறது…')}</p></div>`;
  const before = JSON.stringify(state.family);
  const ov = await syncShares();
  if (!box.isConnected) return;
  if (before !== JSON.stringify(state.family)) onChange?.();
  render(box, ov, onChange);
}

function render(box, ov, onChange) {
  if (!ov) {
    box.innerHTML = `<div class="card glass fs-card"><h3>👨‍👩‍👧 ${L('Shared family', 'பகிர்ந்த குடும்பம்')}</h3><p class="small">${L('Could not reach the server. Your profiles on this phone still work.', 'சேவையகத்தை அடைய முடியவில்லை. இந்தக் கைப்பேசியிலுள்ள சுயவிவரங்கள் வழக்கம்போல் வேலை செய்யும்.')}</p></div>`;
    return;
  }
  const refresh = async () => { const o = await syncShares(); onChange?.(); if (box.isConnected) render(box, o, onChange); };
  const join = pendingJoinCode();
  const joinForm = `<form class="fs-join" id="fsJoin"><label class="sr-only" for="fsCode">${L('Invite code', 'அழைப்புக் குறியீடு')}</label>
    <input id="fsCode" name="code" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX" value="${esc(join || '')}" required>
    <button class="chip-btn" type="submit">${L('Join', 'சேர்')}</button></form><p class="err" id="fsJoinErr"></p>`;

  if (!ov.group) {
    box.innerHTML = `<div class="card glass fs-card"><h3>👨‍👩‍👧 ${L('Shared family', 'பகிர்ந்த குடும்பம்')}</h3>
      <p class="small">${L('Let family members see chosen charts on their own phones. You decide, per profile, who may view or edit.', 'தேர்ந்த ஜாதகங்களைக் குடும்பத்தினர் தங்கள் கைப்பேசியில் பார்க்கலாம். ஒவ்வொரு சுயவிவரத்துக்கும் பார்க்க / திருத்த யார் என்பதை நீங்களே முடிவு செய்யுங்கள்.')}</p>
      ${ov.canCreate ? `<button class="btn-gold" id="fsCreate">${L('Create a family group', 'குடும்பக் குழுவை உருவாக்கு')}</button>`
        : `<p class="small muted">${L('Creating a family group is part of the Family plan.', 'குடும்பக் குழு உருவாக்குவது குடும்பத் திட்டத்தில் உள்ளது.')}</p><button class="chip-btn" data-go="plans">${L('See the Family plan', 'குடும்பத் திட்டத்தைப் பார்')}</button>`}
      <div class="fs-section"><p class="small muted">${L('Have an invite code from a family member?', 'குடும்பத்தினரிடமிருந்து அழைப்புக் குறியீடு உள்ளதா?')}</p>${joinForm}</div>
      ${BOUNDARY()}</div>`;
    $('#fsCreate', box)?.addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try { await api('/api/family/groups', { method: 'POST', body: { name: L('Our family', 'எங்கள் குடும்பம்') } }); toast(L('Family group created', 'குடும்பக் குழு உருவானது')); }
      catch (err) { toast(err.message); }
      refresh();
    });
    bindJoin(box, refresh);
    return;
  }

  const g = ov.group;
  const owner = g.role === 'owner';
  const shareByProfile = new Map((ov.myShares || []).map((s) => [s.profileId, s]));
  const own = state.family.filter((m) => !m.shared);
  const received = state.family.filter((m) => m.shared);
  box.innerHTML = `<div class="card glass fs-card"><h3>👨‍👩‍👧 ${L('Shared family', 'பகிர்ந்த குடும்பம்')}${g.name ? ` · ${esc(g.name)}` : ''}</h3>
    <div class="fs-section" aria-label="${esc(L('Members', 'உறுப்பினர்கள்'))}"><p class="small muted">${L('Members', 'உறுப்பினர்கள்')} (${g.members.length}/${g.maxMembers})</p>
      ${g.members.map((m) => `<div class="fs-row"><span class="avatar">${esc(([...(nameInLang(m.name) || '?')][0] || '?').toUpperCase())}</span>
        <div class="fs-main"><b>${esc(nameInLang(m.name) || L('Member', 'உறுப்பினர்'))}</b>${m.you ? ` <span class="pill">${L('You', 'நீங்கள்')}</span>` : ''}<div class="small muted">${esc(roleText(m.role))}</div></div>
        ${owner && !m.you ? `<button class="link-btn danger" data-remove="${esc(m.userId)}" data-name="${esc(nameInLang(m.name))}">${L('Remove', 'நீக்கு')}</button>` : ''}</div>`).join('')}
      ${g.members.length < g.maxMembers ? `<button class="btn-gold" id="fsInvite">➕ ${L('Invite an adult', 'பெரியவரை அழை')}</button>` : ''}
      <div id="fsInviteOut"></div>
    </div>
    ${ov.invites.length ? `<div class="fs-section"><p class="small muted">${L('Pending invites', 'நிலுவையிலுள்ள அழைப்புகள்')}</p>
      ${ov.invites.map((i) => `<div class="fs-row"><div class="fs-main small">${L('Invite', 'அழைப்பு')} · ${L('expires', 'காலாவதி')} ${esc(dateText(i.expiresAt))}</div>
        ${i.canRevoke ? `<button class="link-btn danger" data-revoke-invite="${esc(i.id)}">${L('Cancel', 'ரத்து')}</button>` : ''}</div>`).join('')}</div>` : ''}
    <div class="fs-section"><p class="small muted">${L('Share my profiles', 'என் சுயவிவரங்களைப் பகிர்')}</p>
      ${own.length ? own.map((m) => {
        const s = shareByProfile.get(m.id);
        const ok = canShareProfile(m);
        const val = s ? s.permission : 'none';
        const who = s && s.audience.length ? s.audience.map((a) => nameInLang(a.name) || L('Member', 'உறுப்பினர்')).join(', ') : '';
        return `<div class="fs-row"><div class="fs-main"><b>${esc(displayName(m))}</b>${m.private ? ' 🔒' : ''}
          <div class="small muted">${!ok ? L('Private — stays on this phone', 'தனிப்பட்டது — இந்தக் கைப்பேசியில் மட்டும்') : s ? `${L('Visible to', 'பார்க்கக்கூடியவர்')}: ${esc(who || L('no one yet', 'இன்னும் யாரும் இல்லை'))}` : L('Only you', 'நீங்கள் மட்டும்')}</div></div>
          <label class="sr-only" for="fsp-${esc(m.id)}">${L('Sharing for', 'பகிர்வு')} ${esc(displayName(m))}</label>
          <select id="fsp-${esc(m.id)}" data-share="${esc(m.id)}"${ok ? '' : ' disabled'}>
            <option value="none"${val === 'none' ? ' selected' : ''}>${L('Not shared', 'பகிரவில்லை')}</option>
            <option value="view"${val === 'view' ? ' selected' : ''}>${L('Family can view', 'குடும்பம் பார்க்கலாம்')}</option>
            <option value="edit"${val === 'edit' ? ' selected' : ''}>${L('Family can edit', 'குடும்பம் திருத்தலாம்')}</option>
          </select></div>`;
      }).join('') : `<p class="small muted">${L('Add a profile first.', 'முதலில் ஒரு சுயவிவரம் சேர்க்கவும்.')}</p>`}
    </div>
    <div class="fs-section"><p class="small muted">${L('Shared with me', 'எனக்குப் பகிரப்பட்டவை')}</p>
      ${received.length ? received.map((m) => `<div class="fs-row"><div class="fs-main"><b>${esc(displayName(m))}</b>
        <div class="small muted">${L('Shared by', 'பகிர்ந்தவர்')} ${esc(nameInLang(m.shared.by) || L('a member', 'ஒரு உறுப்பினர்'))} · ${m.shared.permission === 'edit' ? L('you can edit', 'நீங்கள் திருத்தலாம்') : L('view only', 'பார்வைக்கு மட்டும்')}</div></div></div>`).join('')
        : `<p class="small muted">${L('Nothing shared with you yet.', 'இன்னும் எதுவும் பகிரப்படவில்லை.')}</p>`}
    </div>
    ${BOUNDARY()}
    <div class="fs-actions">
      <button class="link-btn danger" id="fsLeave">${L('Leave group', 'குழுவிலிருந்து விலகு')}</button>
      ${owner ? `<button class="link-btn danger" id="fsDelete">${L('Delete group', 'குழுவை நீக்கு')}</button>` : ''}
    </div></div>`;

  $('#fsInvite', box)?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const inv = await api(`/api/family/groups/${g.id}/invites`, { method: 'POST' });
      const out = $('#fsInviteOut', box);
      out.innerHTML = `<p class="small">${L('Give this one-time code to an adult family member. It works once and expires in 7 days.', 'இந்த ஒருமுறைக் குறியீட்டைக் குடும்பப் பெரியவருக்குக் கொடுங்கள். ஒருமுறை மட்டும், 7 நாட்களில் காலாவதியாகும்.')}</p>
        <div class="fs-code" id="fsCodeOut">${esc(inv.code)}</div><div class="fs-link">${esc(inv.link)}</div>
        <div class="fs-actions"><button class="chip-btn" id="fsCopy">${L('Copy link', 'இணைப்பை நகலெடு')}</button>${navigator.share ? `<button class="chip-btn" id="fsShare">${L('Share', 'பகிர்')}</button>` : ''}</div>`;
      const text = L(`Join our family on Thunai: ${inv.link} (code ${inv.code})`, `துணையில் எங்கள் குடும்பத்தில் சேருங்கள்: ${inv.link} (குறியீடு ${inv.code})`);
      $('#fsCopy', out).addEventListener('click', async () => { try { await navigator.clipboard.writeText(inv.link); toast(L('Link copied', 'இணைப்பு நகலெடுக்கப்பட்டது')); } catch { toast(inv.code); } });
      $('#fsShare', out)?.addEventListener('click', () => navigator.share({ title: 'Thunai', text }).catch(() => {}));
      const o = await api('/api/family').catch(() => null);
      if (o) last = o;
    } catch (err) { toast(err.message); }
    btn.disabled = false;
  });
  $$('[data-revoke-invite]', box).forEach((b) => b.addEventListener('click', async () => {
    try { await api(`/api/family/invites/${b.dataset.revokeInvite}`, { method: 'DELETE' }); } catch (err) { toast(err.message); }
    refresh();
  }));
  $$('[data-remove]', box).forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(L(`Remove ${b.dataset.name} from the family? Their shared profiles will be removed too.`, `${b.dataset.name} அவர்களைக் குடும்பத்திலிருந்து நீக்கவா? அவர் பகிர்ந்த சுயவிவரங்களும் நீங்கும்.`))) return;
    try { await api(`/api/family/groups/${g.id}/members/${b.dataset.remove}`, { method: 'DELETE' }); } catch (err) { toast(err.message); }
    refresh();
  }));
  $$('[data-share]', box).forEach((sel) => sel.addEventListener('change', async () => {
    const m = state.family.find((x) => x.id === sel.dataset.share && !x.shared);
    const s = shareByProfile.get(sel.dataset.share);
    sel.disabled = true;
    try {
      if (sel.value === 'none') { if (s) { await api(`/api/family/shares/${s.id}`, { method: 'DELETE' }); toast(L('Sharing stopped — removed from the family’s phones', 'பகிர்வு நிறுத்தப்பட்டது — குடும்பத்தினரின் கைப்பேசிகளிலிருந்து நீக்கப்படும்')); } }
      else if (s) await api(`/api/family/shares/${s.id}`, { method: 'PATCH', body: { permission: sel.value } });
      else { await api('/api/family/shares', { method: 'POST', body: { groupId: g.id, permission: sel.value, profile: m } }); toast(L('Shared with your family', 'குடும்பத்துடன் பகிரப்பட்டது')); }
    } catch (err) { toast(err.message); }
    refresh();
  }));
  $('#fsLeave', box).addEventListener('click', async () => {
    if (!confirm(L('Leave this family group? Profiles you shared will be removed from the others’ phones, and theirs from yours.', 'இந்தக் குடும்பக் குழுவிலிருந்து விலகவா? நீங்கள் பகிர்ந்தவை பிறரின் கைப்பேசிகளிலிருந்தும், அவர்கள் பகிர்ந்தவை உங்களுடையதிலிருந்தும் நீங்கும்.'))) return;
    try { await api(`/api/family/groups/${g.id}/leave`, { method: 'POST' }); } catch (err) { toast(err.message); }
    refresh();
  });
  $('#fsDelete', box)?.addEventListener('click', async () => {
    if (!confirm(L('Delete the family group for everyone? All shared copies are deleted from the server.', 'அனைவருக்கும் குடும்பக் குழுவை நீக்கவா? பகிர்ந்த எல்லா நகல்களும் சேவையகத்திலிருந்து நீக்கப்படும்.'))) return;
    try { await api(`/api/family/groups/${g.id}`, { method: 'DELETE' }); } catch (err) { toast(err.message); }
    refresh();
  });
}

function bindJoin(box, refresh) {
  $('#fsJoin', box)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = e.currentTarget.elements.code.value;
    const self = state.family.find((m) => m.relation === 'self' && !m.shared);
    try {
      await api('/api/family/invites/accept', { method: 'POST', body: { code, selfBirthDate: self?.date } });
      store.del(JOIN_KEY);
      toast(L('You joined the family', 'குடும்பத்தில் சேர்ந்தீர்கள்'));
      refresh();
    } catch (err) {
      if (err.status === 410 || err.status === 404) store.del(JOIN_KEY);
      $('#fsJoinErr', box).textContent = err.status === 403 ? L('Family membership is for adults. A parent can share a child’s chart instead.', 'குடும்ப உறுப்பினர் ஆவது பெரியவர்களுக்கு மட்டும். பெற்றோர் குழந்தையின் ஜாதகத்தைப் பகிரலாம்.')
        : err.status === 410 ? L('This invite has expired or was already used — ask for a new one.', 'இந்த அழைப்பு காலாவதியானது அல்லது ஏற்கனவே பயன்படுத்தப்பட்டது — புதியதைக் கேளுங்கள்.')
        : err.status === 404 ? L('This invite code is not valid.', 'இந்த அழைப்புக் குறியீடு செல்லாது.') : err.message;
    }
  });
}

/** A compact line for the Family hub: shared-family status. */
export function sharedHubLine() {
  if (STATIC) return `<p class="small muted">👨‍👩‍👧 ${L('Family sharing needs the Thunai server — opening soon.', 'குடும்பப் பகிர்வுக்குத் துணை சேவையகம் தேவை — விரைவில் தொடங்கும்.')}</p>`;
  const n = state.family.filter((m) => m.shared).length;
  return `<button class="link-btn" data-go="family">👨‍👩‍👧 ${L('Shared family', 'பகிர்ந்த குடும்பம்')}${n ? ` · ${n} ${L('shared with you', 'உங்களுக்குப் பகிரப்பட்டவை')}` : ''}</button>`;
}


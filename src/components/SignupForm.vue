<template>
  <div class="wizard" ref="wizardRef" role="form" aria-label="Create your Zcash payment link">

    <!-- Back arrow -->
    <Transition name="fade">
      <button v-if="step > 0" class="back-arrow" @click="goBack" aria-label="Go back">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </Transition>

    <!-- Step 0: Landing -->
    <Transition name="step" mode="out-in">
      <div v-if="step === 0" key="s0" class="step">
        <div class="top-block">
          <h1 class="hero"><span class="highlight">A</span>ll coins, in<span class="highlight">to</span> <span class="highlight">Z</span>.<span class="highlight">cash</span></h1>
          <p class="body-text">One link, any chain. Someone sends you ETH, BTC, USDC — it arrives as <span class="highlight">shielded Zcash</span>. No "what chain are you on?" No exposed balances. You get a link like <strong>atoz.cash/yao</strong> and never think about it again.</p>
          <div class="how-block">
            <span class="how-label">How it works</span>
            <p class="body-text">When someone opens your link, they pick whichever chain they already have funds on — Ethereum, Solana, Bitcoin, whatever they've got. They send to a deposit address on that chain, and you receive shielded Zcash in your wallet. The sender doesn't need a Zcash wallet or an account. They just send from what they know, and you get paid in what you want.</p>
          </div>
        </div>
        <div class="bottom-block">
          <button class="btn" @click="startFlow">Get my link</button>
        </div>
      </div>
    </Transition>

    <!-- Step 1: Username -->
    <Transition name="step" mode="out-in">
      <div v-if="step === 1" key="s1" class="step">
        <div class="top-block">
          <h2 class="headline">Choose your <span class="hl-inline">username</span>.</h2>
          <p class="body-text">This is your public payment URL.</p>
          <div class="input-block">
            <span class="input-prefix">atoz.cash/</span>
            <input
              ref="usernameRef"
              id="username-input"
              v-model="username"
              type="text"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              placeholder="yourname"
              maxlength="40"
              class="input-underline"
              :style="{ fontSize: dynamicSize }"
              @input="checkUsername"
              @keydown.enter.prevent="goToStep2"
              aria-describedby="username-status"
            />
            <div class="input-line"></div>
          </div>
          <div id="username-status" :class="['status', statusClass]" role="status" aria-live="polite">
            <template v-if="statusText">
              <span class="status-dot" aria-hidden="true"></span>
              {{ statusText }}
            </template>
          </div>
        </div>
        <div class="bottom-block">
          <button class="btn" :disabled="!usernameAvailable" @click="goToStep2">Next</button>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Address -->
    <Transition name="step" mode="out-in">
      <div v-if="step === 2" key="s2" class="step">
        <div class="top-block">
          <h2 class="headline">Paste your <span class="hl-inline">shielded address</span>.</h2>
          <p class="body-text">Unified (u1…) or Sapling (zs1…) addresses only.</p>
          <div class="input-block">
            <textarea
              ref="addressRef"
              v-model="zcashAddress"
              placeholder="u1… or zs1…"
              class="input-area"
              rows="3"
              aria-label="Shielded Zcash address"
            ></textarea>
            <div class="input-line"></div>
          </div>
        </div>
        <div class="bottom-block">
          <button class="btn" :disabled="!validAddress" @click="goToStep3">Next</button>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Confirm -->
    <Transition name="step" mode="out-in">
      <div v-if="step === 3" key="s3" class="step">
        <div class="top-block">
          <h2 class="headline">Confirm your <span class="hl-inline">link</span>.</h2>
          <div class="confirm-row">
            <span class="confirm-label">URL</span>
            <span class="confirm-value">atoz.cash/{{ username }}</span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">Address</span>
            <span class="confirm-value mono">{{ truncAddr }}</span>
          </div>
        </div>
        <div class="bottom-block">
          <button class="btn" :disabled="submitting" @click="handleSubmit">
            <span v-if="!submitting">Create my link</span>
            <span v-else class="spinner" role="status" aria-label="Creating"></span>
          </button>
          <Transition name="fade">
            <div v-if="formError" class="error-msg" role="alert">{{ formError }}</div>
          </Transition>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted } from 'vue';
import { animate, stagger } from 'motion';
import Snd from 'snd-lib';

const snd = new Snd();
snd.load(Snd.KITS.SND02); // piano kit

const step = ref(0);
const username = ref('');
const zcashAddress = ref('');
const usernameAvailable = ref(false);
const statusText = ref('');
const statusClass = ref('');
const formError = ref('');
const submitting = ref(false);
const wizardRef = ref(null);
const usernameRef = ref(null);
const addressRef = ref(null);

const USERNAME_RE = /^[a-zA-Z0-9_]{3,40}$/;
const ZCASH_RE = /^(u1|zs1)/;
let debounceTimer = null;

const validAddress = computed(() => ZCASH_RE.test(zcashAddress.value.trim()));
const truncAddr = computed(() => {
  const a = zcashAddress.value.trim();
  return a.length <= 20 ? a : a.slice(0, 10) + '…' + a.slice(-10);
});
const dynamicSize = computed(() => {
  const l = username.value.length;
  if (l <= 5) return '2.4rem';
  if (l <= 10) return '1.8rem';
  if (l <= 16) return '1.4rem';
  return '1.1rem';
});

// --- Entrance animation ---
onMounted(() => {
  nextTick(() => {
    const hero = wizardRef.value?.querySelector('.hero');
    const bodies = wizardRef.value?.querySelectorAll('.top-block > .body-text');
    const howBlock = wizardRef.value?.querySelector('.how-block');
    const btn = wizardRef.value?.querySelector('.btn');
    const highlights = wizardRef.value?.querySelectorAll('.highlight');
    if (hero) animate(hero, { opacity: [0, 1], y: [20, 0] }, { duration: 0.5, easing: [0.22, 1, 0.36, 1] });
    if (bodies?.length) animate(bodies, { opacity: [0, 1], y: [12, 0] }, { delay: stagger(0.1, { start: 0.15 }), duration: 0.4, easing: [0.22, 1, 0.36, 1] });
    if (howBlock) animate(howBlock, { opacity: [0, 1], y: [10, 0] }, { duration: 0.4, delay: 0.35, easing: [0.22, 1, 0.36, 1] });
    if (btn) animate(btn, { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.5, easing: [0.22, 1, 0.36, 1] });
    if (highlights?.length) {
      animate(highlights, { backgroundSize: ['0% 100%', '100% 100%'] }, {
        delay: stagger(0.08, { start: 0.55 }),
        duration: 0.35,
        easing: [0.22, 1, 0.36, 1],
      });
    }
  });
});

// --- Step animations ---
function animateStepIn() {
  nextTick(() => {
    const headline = wizardRef.value?.querySelector('.step .headline');
    const bodyText = wizardRef.value?.querySelector('.step .body-text');
    const inputBlock = wizardRef.value?.querySelector('.step .input-block');
    const btn = wizardRef.value?.querySelector('.step .btn');
    const confirmRows = wizardRef.value?.querySelectorAll('.step .confirm-row');
    const els = [headline, bodyText, inputBlock, btn].filter(Boolean);
    animate(els, { opacity: [0, 1], y: [14, 0] }, {
      delay: stagger(0.06, { start: 0.05 }),
      duration: 0.35,
      easing: [0.22, 1, 0.36, 1],
    });
    if (confirmRows?.length) {
      animate(confirmRows, { opacity: [0, 1], y: [10, 0] }, {
        delay: stagger(0.08, { start: 0.1 }),
        duration: 0.3,
        easing: [0.22, 1, 0.36, 1],
      });
    }
  });
}

function goBack() { snd.play(Snd.SOUNDS.SWIPE); if (step.value > 0) step.value--; }

async function startFlow() {
  snd.play(Snd.SOUNDS.BUTTON);
  const btn = wizardRef.value?.querySelector('.btn');
  if (btn) {
    // Yellow flash + press
    animate(btn, { scale: [1, 0.95, 1] }, { duration: 0.2 });
    await animate(btn, { backgroundColor: ['#000', '#EEFF00', '#000'] }, { duration: 0.35 }).finished;
  }
  step.value = 1;
  nextTick(() => usernameRef.value?.focus());
}

function checkUsername() {
  usernameAvailable.value = false;
  clearTimeout(debounceTimer);
  const val = username.value.trim();

  // Typing sound
  snd.play(Snd.SOUNDS.TYPE);

  // Micro-bounce the underline
  const line = wizardRef.value?.querySelector('.input-line');
  if (line) animate(line, { scaleX: [0.97, 1] }, { duration: 0.1 });

  if (!val) { statusText.value = ''; statusClass.value = ''; return; }
  if (!USERNAME_RE.test(val)) { statusText.value = '3–40 chars, alphanumeric or _'; statusClass.value = 'warn'; return; }
  statusText.value = 'checking'; statusClass.value = 'checking';
  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/check-username?username=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (username.value.trim() !== val) return;
      if (data.available) {
        statusText.value = 'available'; statusClass.value = 'ok'; usernameAvailable.value = true;
        snd.play(Snd.SOUNDS.TOGGLE);
        // Pop in the status
        const el = document.getElementById('username-status');
        if (el) animate(el, { opacity: [0, 1], y: [6, 0], scale: [0.95, 1] }, { duration: 0.25 });
        // Pulse the button to hint it's enabled
        const btn = wizardRef.value?.querySelector('.btn');
        if (btn) animate(btn, { scale: [1, 1.02, 1] }, { duration: 0.2, delay: 0.1 });
      } else {
        statusText.value = 'taken'; statusClass.value = 'taken';
        snd.play(Snd.SOUNDS.CAUTION);
        // Shake the status
        const el = document.getElementById('username-status');
        if (el) animate(el, { x: [0, -4, 4, -3, 3, 0] }, { duration: 0.3 });
      }
    } catch { statusText.value = 'available'; statusClass.value = 'ok'; }
  }, 300);
}

function goToStep2() {
  if (!usernameAvailable.value) return;
  snd.play(Snd.SOUNDS.TAP);
  step.value = 2;
  nextTick(() => addressRef.value?.focus());
}

function goToStep3() {
  if (!validAddress.value) return;
  snd.play(Snd.SOUNDS.TAP);
  step.value = 3;
}

async function handleSubmit() {
  formError.value = ''; submitting.value = true;
  snd.play(Snd.SOUNDS.BUTTON);
  try {
    const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.value.trim(), zcash_address: zcashAddress.value.trim() }) });
    const data = await res.json();
    if (data.success) {
      snd.play(Snd.SOUNDS.CELEBRATION);
      if (wizardRef.value) await animate(wizardRef.value, { opacity: [1, 0], y: [0, -10] }, { duration: 0.3, easing: [0.4, 0, 1, 1] }).finished;
      window.location.href = `/${data.username}`;
    } else {
      formError.value = data.error || 'Failed';
      snd.play(Snd.SOUNDS.CAUTION);
      submitting.value = false;
    }
  } catch { formError.value = 'Network error'; snd.play(Snd.SOUNDS.CAUTION); submitting.value = false; }
}

// Animate on step change
watch(step, (newStep) => {
  if (newStep > 0) animateStepIn();
  if (newStep === 1) nextTick(() => usernameRef.value?.focus());
});
</script>

<style scoped>
.wizard {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* Back arrow */
.back-arrow {
  position: absolute;
  top: 0;
  left: -0.25rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 2;
  -webkit-tap-highlight-color: transparent;
  opacity: 0.5;
  transition: opacity 0.15s;
}
.back-arrow:hover { opacity: 1; }

/* Layout: top-block grows and pushes button to bottom */
.step {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: 3rem;
  min-height: 0;
}
.top-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  scrollbar-width: none;
}
.top-block::-webkit-scrollbar { display: none; }
.bottom-block {
  padding-top: 2rem;
  padding-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Typography */
.hero {
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.025em;
  color: #000;
}
.highlight {
  background: linear-gradient(#EEFF00, #EEFF00) no-repeat left;
  background-size: 0% 100%;
  padding: 0 0.08em;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.hl-inline {
  background: #EEFF00;
  padding: 0 0.08em;
}

.headline {
  font-size: 1.7rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #000;
}

.body-text {
  font-size: 0.88rem;
  font-weight: 400;
  line-height: 1.6;
  color: #000;
  opacity: 0.45;
}
.body-text strong { font-weight: 400; opacity: 1; color: #000; }

.how-block {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0,0,0,0.08);
}
.how-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.3;
  display: block;
  margin-bottom: 0.5rem;
}

/* Inputs */
.input-block {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.input-prefix {
  font-size: 0.82rem;
  font-weight: 500;
  color: #000;
  opacity: 0.3;
  margin-bottom: 0.25rem;
}

.input-underline {
  width: 100%;
  padding: 0.25rem 0;
  border: none;
  background: transparent;
  color: #000;
  font-family: "Varela Round", sans-serif;
  font-weight: 700;
  outline: none;
  line-height: 1.2;
  border-radius: 0;
  -webkit-appearance: none;
  transition: font-size 0.12s ease;
  caret-color: #000;
}
.input-underline::placeholder { color: #000; opacity: 0.1; font-weight: 400; }

.input-line {
  height: 3px;
  background: #000;
  border-radius: 0;
  width: 100%;
}

.input-area {
  width: 100%;
  padding: 0.5rem 0;
  border: none;
  background: transparent;
  color: #000;
  font-family: "Varela Round", sans-serif;
  font-size: 1rem;
  font-weight: 500;
  outline: none;
  resize: none;
  line-height: 1.5;
  -webkit-appearance: none;
  caret-color: #000;
}
.input-area::placeholder { color: #000; opacity: 0.12; font-weight: 400; }

/* Status */
.status {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 500;
  min-height: 1.2em;
  margin-top: 0.25rem;
}
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.status.ok { color: #22c55e; }
.status.ok .status-dot { background: #22c55e; }
.status.taken { color: #ef4444; }
.status.taken .status-dot { background: #ef4444; }
.status.checking { color: #000; opacity: 0.25; }
.status.checking .status-dot { background: #000; animation: blink 0.8s infinite; }
.status.warn { color: #000; opacity: 0.35; }
.status.warn .status-dot { background: #000; opacity: 0.4; }
@keyframes blink { 50% { opacity: 0.1; } }

/* Confirm */
.confirm-row {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}
.confirm-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.3;
}
.confirm-value {
  font-size: 1.1rem;
  font-weight: 700;
  word-break: break-all;
}
.confirm-value.mono {
  font-family: monospace;
  font-size: 0.82rem;
  font-weight: 400;
  opacity: 0.5;
}

/* Button */
.btn {
  width: 100%;
  padding: 1rem;
  border-radius: 4px;
  border: none;
  background: #000;
  color: #fff;
  font-family: "Varela Round", sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.12s;
  -webkit-tap-highlight-color: transparent;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn:hover:not(:disabled) { opacity: 0.8; }
.btn:active:not(:disabled) { opacity: 0.65; }
.btn:disabled { background: #e5e5e5; color: #999; cursor: default; }

.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.5s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.error-msg { color: #ef4444; font-size: 0.78rem; font-weight: 500; }

/* Transitions */
.step-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.step-leave-active { transition: opacity 0.12s ease; position: absolute; inset: 0; pointer-events: none; }
.step-enter-from { opacity: 0; transform: translateY(6px); }
.step-leave-to { opacity: 0; }
.fade-enter-active { transition: opacity 0.15s; }
.fade-leave-active { transition: opacity 0.1s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (min-width: 640px) {
  .headline { font-size: 2.2rem; }
}
</style>

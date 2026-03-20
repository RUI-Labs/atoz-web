<template>
  <div class="pay" ref="rootRef" role="region" aria-label="Choose payment method">

    <!-- Picker -->
    <Transition name="panel" mode="out-in">
      <div v-if="view === 'picker'" key="picker" class="picker">
        <div class="search-wrap" role="search">
          <input
            ref="searchRef"
            v-model="query"
            type="search"
            placeholder="Search"
            class="search"
            aria-label="Search chains"
            autocomplete="off"
            spellcheck="false"
          />
        </div>

        <div class="list" role="listbox" aria-label="Chains">
          <template v-if="!query.trim()">
            <div class="list-label">Popular</div>
            <button
              v-for="c in popular" :key="c.id"
              :class="['row', { live: c.available }]"
              @click="pick(c)" type="button" role="option"
              :aria-label="`${c.name} (${c.symbol})${c.available ? '' : ', coming soon'}`"
            >
              <span class="row-icon" v-html="icons[c.id]" aria-hidden="true"></span>
              <span class="row-name">{{ c.name }}</span>
              <span class="row-sym">{{ c.symbol }}</span>
              <span v-if="!c.available" class="row-soon">soon</span>
            </button>

            <div class="list-label">All</div>
            <button
              v-for="c in rest" :key="c.id"
              :class="['row', { live: c.available }]"
              @click="pick(c)" type="button" role="option"
              :aria-label="`${c.name} (${c.symbol})${c.available ? '' : ', coming soon'}`"
            >
              <span class="row-icon" v-html="icons[c.id]" aria-hidden="true"></span>
              <span class="row-name">{{ c.name }}</span>
              <span class="row-sym">{{ c.symbol }}</span>
              <span v-if="!c.available" class="row-soon">soon</span>
            </button>
          </template>

          <template v-else>
            <button
              v-for="c in filtered" :key="c.id"
              :class="['row', { live: c.available }]"
              @click="pick(c)" type="button" role="option"
              :aria-label="`${c.name} (${c.symbol})${c.available ? '' : ', coming soon'}`"
            >
              <span class="row-icon" v-html="icons[c.id]" aria-hidden="true"></span>
              <span class="row-name">{{ c.name }}</span>
              <span class="row-sym">{{ c.symbol }}</span>
              <span v-if="!c.available" class="row-soon">soon</span>
            </button>
            <div v-if="!filtered.length" class="empty">No results</div>
          </template>
        </div>
      </div>
    </Transition>

    <!-- Receipt (Zcash direct) -->
    <Transition name="panel" mode="out-in">
      <div v-if="view === 'receipt'" key="receipt" class="receipt">
        <button class="back-btn" @click="backToPicker" type="button" aria-label="Back to chain list">
          <span>&larr;</span>
          <span class="row-icon row-icon-sm" v-html="icons[selected?.id]" aria-hidden="true"></span>
          <span>{{ selected?.name }}</span>
        </button>

        <div class="qr-card" aria-label="QR code">
          <canvas ref="qrCanvas" class="qr" role="img" aria-label="QR code for Zcash address"></canvas>
        </div>

        <button class="addr-card" @click="copyText(props.address)" type="button" aria-label="Copy address">
          <code class="addr-text">{{ props.address }}</code>
          <span class="addr-action">
            <span>{{ copied ? 'Copied' : 'Copy address' }}</span>
          </span>
        </button>
      </div>
    </Transition>

    <!-- Swap Form -->
    <Transition name="panel" mode="out-in">
      <div v-if="view === 'swap-form'" key="swap-form" class="swap-form">
        <button class="back-btn" @click="backToPicker" type="button" aria-label="Back to chain list">
          <span>&larr;</span>
          <span class="row-icon row-icon-sm" v-html="icons[selected?.id]" aria-hidden="true"></span>
          <span>{{ selected?.name }}</span>
        </button>

        <div class="field">
          <label class="field-label">Token</label>
          <select v-model="selectedTokenId" class="field-select" :disabled="tokensLoading">
            <option value="" disabled>{{ tokensLoading ? 'Loading...' : 'Select token' }}</option>
            <option v-for="t in chainTokens" :key="t.assetId" :value="t.assetId">
              {{ t.symbol }}{{ t.price > 0 ? ` ($${t.price.toFixed(2)})` : '' }}
            </option>
          </select>
        </div>

        <div class="field">
          <label class="field-label">Amount</label>
          <div class="amount-wrap">
            <input
              ref="amountRef"
              v-model="swapAmount"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              class="field-input"
              :disabled="!selectedTokenId"
            />
            <span v-if="selectedTokenObj" class="amount-sym">{{ selectedTokenObj.symbol }}</span>
          </div>
        </div>

        <div class="field">
          <label class="field-label">Refund address <span class="field-opt">optional</span></label>
          <input
            v-model="refundAddress"
            type="text"
            placeholder="0x..."
            class="field-input field-input-light"
          />
        </div>

        <button
          class="action-btn"
          :disabled="!canGetQuote || quoteLoading"
          @click="getSwapQuote"
          type="button"
        >
          <span v-if="!quoteLoading">Get Deposit Address</span>
          <span v-else class="spinner"></span>
        </button>
        <div v-if="swapError" class="swap-error">{{ swapError }}</div>
      </div>
    </Transition>

    <!-- Swap Deposit -->
    <Transition name="panel" mode="out-in">
      <div v-if="view === 'swap-deposit'" key="swap-deposit" class="swap-deposit">
        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Send</span>
            <span class="summary-value">{{ currentQuote?.amountInFormatted }} {{ selectedTokenObj?.symbol }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Receive</span>
            <span class="summary-value">~{{ currentQuote?.amountOutFormatted }} ZEC</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Est.</span>
            <span class="summary-value">~{{ Math.round((currentQuote?.timeEstimate || 0) / 60) }} min</span>
          </div>
        </div>

        <p class="deposit-inst">
          Send <strong>{{ currentQuote?.amountInFormatted }} {{ selectedTokenObj?.symbol }}</strong>
          on <strong>{{ selected?.name }}</strong> to:
        </p>

        <div class="qr-card">
          <canvas ref="depositQrCanvas" class="qr" role="img" aria-label="QR code for deposit address"></canvas>
        </div>

        <button class="addr-card" @click="copyText(depositAddr)" type="button">
          <code class="addr-text">{{ depositAddr }}</code>
          <span class="addr-action">
            <span>{{ copied ? 'Copied' : 'Copy address' }}</span>
          </span>
        </button>
        <div class="deposit-meta">
          <span class="deposit-deadline">Expires {{ formatTime(currentQuote?.deadline) }}</span>
        </div>

        <button class="action-btn" @click="confirmPaid" type="button">I've Paid</button>
        <button class="cancel-btn" @click="resetSwap" type="button">Cancel</button>
      </div>
    </Transition>

    <!-- Swap Status -->
    <Transition name="panel" mode="out-in">
      <div v-if="view === 'swap-status'" key="swap-status" class="swap-status">
        <div class="status-icon-wrap" v-html="statusIconHtml"></div>
        <h3 class="status-heading">{{ statusLabel }}</h3>
        <p class="status-desc">{{ statusDesc }}</p>

        <div v-if="statusHasDetails" class="summary" style="margin-top:1rem">
          <div v-if="swapDetails?.amountInFormatted" class="summary-row">
            <span class="summary-label">Sent</span>
            <span class="summary-value">{{ swapDetails.amountInFormatted }} (~${{ swapDetails.amountInUsd }})</span>
          </div>
          <div v-if="swapDetails?.amountOutFormatted" class="summary-row">
            <span class="summary-label">Received</span>
            <span class="summary-value">{{ swapDetails.amountOutFormatted }} ZEC (~${{ swapDetails.amountOutUsd }})</span>
          </div>
          <div v-if="swapDetails?.refundedAmountFormatted" class="summary-row">
            <span class="summary-label">Refunded</span>
            <span class="summary-value">{{ swapDetails.refundedAmountFormatted }} (~${{ swapDetails.refundedAmountUsd }})</span>
          </div>
        </div>

        <a
          v-if="depositAddr"
          :href="`https://explorer.near-intents.org/transactions/${depositAddr}`"
          target="_blank"
          class="explorer-link"
        >View on Explorer &rarr;</a>

        <button v-if="isTerminal" class="action-btn" @click="resetSwap" type="button">New Payment</button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { animate, stagger } from 'motion';
import Snd from 'snd-lib';
import QRCode from 'qrcode';
import * as Web3Icons from '@web3icons/core';

const props = defineProps({ address: String });

const snd = new Snd();
snd.load(Snd.KITS.SND02);

const API = 'https://1click.chaindefuser.com';

const CHAINS = [
  { id: 'zcash',  name: 'Zcash',            symbol: 'ZEC',   key: 'TokenBrandedZEC',   available: true,  popular: true,  defuseChain: null },
  { id: 'eth',    name: 'Ethereum',          symbol: 'ETH',   key: 'TokenBrandedETH',   available: true,  popular: true,  defuseChain: 'eth' },
  { id: 'base',   name: 'Base',              symbol: 'BASE',  key: 'NetworkBrandedBase', available: true,  popular: true,  defuseChain: 'base' },
  { id: 'arb',    name: 'Arbitrum',          symbol: 'ARB',   key: 'TokenBrandedARB',    available: true,  popular: true,  defuseChain: 'arb' },
  { id: 'btc',    name: 'Bitcoin',           symbol: 'BTC',   key: 'TokenBrandedBTC',    available: false, popular: true,  defuseChain: null },
  { id: 'sol',    name: 'Solana',            symbol: 'SOL',   key: 'TokenBrandedSOL',    available: false, popular: true,  defuseChain: null },
  { id: 'usdt',   name: 'Tether',            symbol: 'USDT',  key: 'TokenBrandedUSDT',   available: false, popular: true,  defuseChain: null },
  { id: 'bnb',    name: 'BNB',               symbol: 'BNB',   key: 'TokenBrandedBNB',    available: true,  popular: false, defuseChain: 'bsc' },
  { id: 'xrp',    name: 'XRP',               symbol: 'XRP',   key: 'TokenBrandedXRP',    available: false, popular: false, defuseChain: null },
  { id: 'ada',    name: 'Cardano',           symbol: 'ADA',   key: 'TokenBrandedADA',    available: false, popular: false, defuseChain: null },
  { id: 'doge',   name: 'Dogecoin',          symbol: 'DOGE',  key: 'TokenBrandedDOGE',   available: false, popular: false, defuseChain: null },
  { id: 'dot',    name: 'Polkadot',          symbol: 'DOT',   key: 'TokenBrandedDOT',    available: false, popular: false, defuseChain: null },
  { id: 'matic',  name: 'Polygon',           symbol: 'MATIC', key: 'TokenBrandedMATIC',  available: true,  popular: false, defuseChain: 'pol' },
  { id: 'avax',   name: 'Avalanche',         symbol: 'AVAX',  key: 'TokenBrandedAVAX',   available: true,  popular: false, defuseChain: 'avax' },
  { id: 'op',     name: 'Optimism',          symbol: 'OP',    key: 'TokenBrandedOP',     available: true,  popular: false, defuseChain: 'op' },
  { id: 'ltc',    name: 'Litecoin',          symbol: 'LTC',   key: 'TokenBrandedLTC',    available: false, popular: false, defuseChain: null },
  { id: 'near',   name: 'NEAR',              symbol: 'NEAR',  key: 'TokenBrandedNEAR',   available: false, popular: false, defuseChain: null },
  { id: 'xmr',    name: 'Monero',            symbol: 'XMR',   key: 'TokenBrandedXMR',    available: false, popular: false, defuseChain: null },
  { id: 'xlm',    name: 'Stellar',           symbol: 'XLM',   key: 'TokenBrandedXLM',    available: false, popular: false, defuseChain: null },
  { id: 'link',   name: 'Chainlink',         symbol: 'LINK',  key: 'TokenBrandedLINK',   available: false, popular: false, defuseChain: null },
  { id: 'atom',   name: 'Cosmos',            symbol: 'ATOM',  key: 'TokenBrandedATOM',   available: false, popular: false, defuseChain: null },
  { id: 'trx',    name: 'TRON',              symbol: 'TRX',   key: 'TokenBrandedTRX',    available: false, popular: false, defuseChain: null },
  { id: 'etc',    name: 'Ethereum Classic',   symbol: 'ETC',   key: 'TokenBrandedETC',    available: false, popular: false, defuseChain: null },
];

const icons = {};
for (const c of CHAINS) {
  const mod = Web3Icons[c.key];
  icons[c.id] = mod?.default ?? mod ?? '';
}

// --- View state ---
const view = ref('picker');
const selected = ref(null);
const query = ref('');
const copied = ref(false);
const rootRef = ref(null);
const searchRef = ref(null);
const qrCanvas = ref(null);
const amountRef = ref(null);

// --- Swap state ---
const allTokens = ref([]);
const chainTokens = ref([]);
const selectedTokenId = ref('');
const swapAmount = ref('');
const refundAddress = ref('');
const tokensLoading = ref(false);
const quoteLoading = ref(false);
const swapError = ref('');
const currentQuote = ref(null);
const depositAddr = ref('');
const depositQrCanvas = ref(null);
const swapStatusVal = ref('');
const swapDetails = ref(null);
let pollTimer = null;

// --- Computed ---
const popular = computed(() => CHAINS.filter(c => c.popular));
const rest = computed(() => CHAINS.filter(c => !c.popular));
const filtered = computed(() => {
  const q = query.value.toLowerCase().trim();
  return CHAINS.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
});

const selectedTokenObj = computed(() =>
  chainTokens.value.find(t => t.assetId === selectedTokenId.value)
);

const canGetQuote = computed(() => {
  const amt = parseFloat(swapAmount.value);
  return selectedTokenId.value && swapAmount.value && !isNaN(amt) && amt > 0;
});

const STATUS_LABELS = {
  PENDING_DEPOSIT: 'Waiting for deposit',
  KNOWN_DEPOSIT_TX: 'Deposit detected',
  INCOMPLETE_DEPOSIT: 'Incomplete deposit',
  PROCESSING: 'Processing',
  SUCCESS: 'Complete',
  REFUNDED: 'Refunded',
  FAILED: 'Failed',
};
const STATUS_DESCS = {
  PENDING_DEPOSIT: 'Monitoring the deposit address for your transaction.',
  KNOWN_DEPOSIT_TX: 'Your deposit has been detected.',
  INCOMPLETE_DEPOSIT: 'The deposited amount was less than expected.',
  PROCESSING: 'Your swap is being executed across chains.',
  SUCCESS: 'ZEC has been sent to the recipient.',
  REFUNDED: 'The deposit was refunded to your address.',
  FAILED: 'Something went wrong.',
};

const statusLabel = computed(() => STATUS_LABELS[swapStatusVal.value] || swapStatusVal.value || '');
const statusDesc = computed(() => STATUS_DESCS[swapStatusVal.value] || '');
const isTerminal = computed(() => ['SUCCESS', 'FAILED', 'REFUNDED'].includes(swapStatusVal.value));
const statusHasDetails = computed(() =>
  swapDetails.value && (swapDetails.value.amountInFormatted || swapDetails.value.amountOutFormatted || swapDetails.value.refundedAmountFormatted)
);

const statusIconHtml = computed(() => {
  const s = swapStatusVal.value;
  if (s === 'SUCCESS') {
    return '<div class="si si-ok"><svg width="20" height="20" fill="none" stroke="#fff" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>';
  }
  if (s === 'FAILED' || s === 'REFUNDED') {
    return '<div class="si si-err"><svg width="20" height="20" fill="none" stroke="#fff" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg></div>';
  }
  return '<div class="si si-spin"><div class="spinner-ring"></div></div>';
});

// --- Picker ---
function pick(c) {
  if (!c.available) return;
  snd.play(Snd.SOUNDS.TAP);
  selected.value = c;

  if (c.defuseChain) {
    view.value = 'swap-form';
    loadChainTokens();
  } else {
    view.value = 'receipt';
    nextTick(() => animateReceiptIn());
  }
}

function backToPicker() {
  snd.play(Snd.SOUNDS.SWIPE);
  selected.value = null;
  selectedTokenId.value = '';
  swapAmount.value = '';
  refundAddress.value = '';
  swapError.value = '';
  chainTokens.value = [];
  view.value = 'picker';
  query.value = '';
  nextTick(() => {
    searchRef.value?.focus();
    const rows = rootRef.value?.querySelectorAll('.row');
    if (rows?.length) {
      animate(rows, { opacity: [0, 1], y: [6, 0] }, {
        delay: stagger(0.02, { start: 0.03 }),
        duration: 0.2,
        easing: [0.22, 1, 0.36, 1],
      });
    }
  });
}

function animateReceiptIn() {
  const back = rootRef.value?.querySelector('.back-btn');
  const qr = rootRef.value?.querySelector('.qr-card');
  const addr = rootRef.value?.querySelector('.addr-card');
  const els = [back, qr, addr].filter(Boolean);
  animate(els, { opacity: [0, 1], y: [12, 0] }, {
    delay: stagger(0.08, { start: 0.05 }),
    duration: 0.35,
    easing: [0.22, 1, 0.36, 1],
  });
  if (qr) animate(qr, { scale: [0.9, 1] }, { duration: 0.3, delay: 0.1, easing: [0.22, 1, 0.36, 1] });
}

// --- Copy ---
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    snd.play(Snd.SOUNDS.NOTIFICATION);
    copied.value = true;
    const card = rootRef.value?.querySelector('.addr-card');
    if (card) animate(card, { scale: [1, 0.97, 1] }, { duration: 0.15 });
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {}
}

// --- Swap: load tokens ---
async function fetchAllTokens() {
  if (allTokens.value.length) return;
  const res = await fetch(`${API}/v0/tokens`);
  if (!res.ok) throw new Error('Failed to load tokens');
  allTokens.value = await res.json();
}

async function loadChainTokens() {
  tokensLoading.value = true;
  swapError.value = '';
  try {
    await fetchAllTokens();
    chainTokens.value = allTokens.value
      .filter(t => t.blockchain === selected.value.defuseChain)
      .sort((a, b) => {
        // prioritize stablecoins and major tokens
        const order = ['USDC', 'USDT', 'ETH', 'WETH', 'DAI'];
        const ai = order.indexOf(a.symbol);
        const bi = order.indexOf(b.symbol);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.symbol.localeCompare(b.symbol);
      });
  } catch {
    swapError.value = 'Failed to load tokens';
  }
  tokensLoading.value = false;
}

// --- Swap: get quote ---
async function getSwapQuote() {
  swapError.value = '';
  quoteLoading.value = true;
  snd.play(Snd.SOUNDS.TAP);

  try {
    await fetchAllTokens();
    const token = selectedTokenObj.value;
    const zec = allTokens.value.find(t => t.blockchain === 'zec');
    if (!token || !zec) throw new Error('Token not found');

    const amt = parseFloat(swapAmount.value);
    const smallest = BigInt(Math.round(amt * (10 ** token.decimals))).toString();
    const deadline = new Date(Date.now() + 3600000).toISOString();

    const res = await fetch(`${API}/v0/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dry: false,
        swapType: 'EXACT_INPUT',
        slippageTolerance: 100,
        originAsset: token.assetId,
        depositType: 'ORIGIN_CHAIN',
        destinationAsset: zec.assetId,
        amount: smallest,
        refundTo: refundAddress.value.trim() || '0x0000000000000000000000000000000000000001',
        refundType: 'ORIGIN_CHAIN',
        recipient: props.address,
        recipientType: 'DESTINATION_CHAIN',
        deadline,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Error ${res.status}`);
    }

    const data = await res.json();
    currentQuote.value = data.quote;
    depositAddr.value = data.quote.depositAddress;
    view.value = 'swap-deposit';

    nextTick(() => {
      const els = rootRef.value?.querySelectorAll('.swap-deposit > *');
      if (els?.length) {
        animate(els, { opacity: [0, 1], y: [12, 0] }, {
          delay: stagger(0.06, { start: 0.05 }),
          duration: 0.3,
          easing: [0.22, 1, 0.36, 1],
        });
      }
    });
  } catch (e) {
    swapError.value = e.message || 'Failed to get quote';
    snd.play(Snd.SOUNDS.CAUTION);
  }
  quoteLoading.value = false;
}

// --- Swap: status polling ---
function confirmPaid() {
  snd.play(Snd.SOUNDS.TAP);
  view.value = 'swap-status';
  swapStatusVal.value = 'PENDING_DEPOSIT';
  swapDetails.value = null;
  pollStatus();
  pollTimer = setInterval(pollStatus, 5000);
}

async function pollStatus() {
  try {
    const res = await fetch(`${API}/v0/status?depositAddress=${encodeURIComponent(depositAddr.value)}`);
    if (!res.ok) return;
    const data = await res.json();
    swapStatusVal.value = data.status;
    swapDetails.value = data.swapDetails || null;

    if (data.status === 'SUCCESS') snd.play(Snd.SOUNDS.CELEBRATION);
    if (['SUCCESS', 'FAILED', 'REFUNDED'].includes(data.status)) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  } catch {}
}

function resetSwap() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  selected.value = null;
  selectedTokenId.value = '';
  swapAmount.value = '';
  refundAddress.value = '';
  swapError.value = '';
  currentQuote.value = null;
  depositAddr.value = '';
  swapStatusVal.value = '';
  swapDetails.value = null;
  chainTokens.value = [];
  copied.value = false;
  view.value = 'picker';
  query.value = '';
  nextTick(() => searchRef.value?.focus());
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString();
}

// --- QR rendering ---
watch(qrCanvas, async (canvas) => {
  if (!canvas) return;
  await QRCode.toCanvas(canvas, props.address, {
    width: 220, margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
});

watch(depositQrCanvas, async (canvas) => {
  if (!canvas || !depositAddr.value) return;
  await QRCode.toCanvas(canvas, depositAddr.value, {
    width: 220, margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
});

// Typing sound on search
watch(query, () => { snd.play(Snd.SOUNDS.TYPE); });

onMounted(() => {
  const searchEl = rootRef.value?.querySelector('.search');
  if (searchEl) animate(searchEl, { opacity: [0, 1], y: [8, 0] }, { duration: 0.3, easing: [0.22, 1, 0.36, 1] });

  nextTick(() => {
    const rows = rootRef.value?.querySelectorAll('.row');
    if (rows?.length) {
      animate(rows, { opacity: [0, 1], y: [6, 0] }, {
        delay: stagger(0.025, { start: 0.08 }),
        duration: 0.25,
        easing: [0.22, 1, 0.36, 1],
      });
    }
    searchRef.value?.focus();
  });
});

onUnmounted(() => {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
});
</script>

<style scoped>
.pay {
  position: relative;
  overflow-x: hidden;
  width: 100%;
}

/* Search */
.search-wrap { position: relative; }
.search {
  width: 100%;
  padding: 0.5rem 0;
  border: none;
  border-bottom: 3px solid #000;
  border-radius: 0;
  background: transparent;
  color: #000;
  font-family: "Varela Round", sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  outline: none;
  -webkit-appearance: none;
}
.search::placeholder { color: #000; opacity: 0.15; font-weight: 400; }
.search::-webkit-search-cancel-button { display: none; }

/* List */
.list {
  display: flex;
  flex-direction: column;
  max-height: 50vh;
  overflow-y: auto;
  scrollbar-width: none;
  margin-top: 1rem;
}
.list::-webkit-scrollbar { display: none; }

.list-label {
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #000;
  opacity: 0.25;
  padding: 0.75rem 0 0.25rem;
}

.row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0;
  border: none;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  background: transparent;
  font-family: "Varela Round", sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  color: #000;
  text-align: left;
  width: 100%;
  cursor: default;
  opacity: 0.25;
  transition: opacity 0.1s;
  -webkit-tap-highlight-color: transparent;
  border-radius: 0;
}
.row.live { opacity: 1; cursor: pointer; }
.row.live:hover { opacity: 0.7; }
.row.live:active { opacity: 0.5; }

.row-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  overflow: hidden;
}
.row-icon :deep(svg) { width: 24px; height: 24px; border-radius: 6px; }
.row-icon-sm { width: 18px; height: 18px; border-radius: 4px; }
.row-icon-sm :deep(svg) { width: 18px; height: 18px; border-radius: 4px; }

.row-name { flex: 1; }
.row-sym { font-size: 0.62rem; font-weight: 500; opacity: 0.25; letter-spacing: 0.04em; }
.row-soon { font-size: 0.55rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.15; }

.empty { text-align: center; font-size: 0.82rem; opacity: 0.25; padding: 2rem 0; }

/* Back button */
.back-btn {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: none;
  border: none;
  color: #000;
  opacity: 0.4;
  font-family: "Varela Round", sans-serif;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  margin-bottom: 1.5rem;
  transition: opacity 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.back-btn:hover { opacity: 0.7; }

/* Receipt */
.receipt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.qr-card {
  background: #fff;
  padding: 0;
  display: inline-flex;
}
.qr {
  display: block;
  width: 200px !important;
  height: 200px !important;
}

.addr-card {
  width: 100%;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 1rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: left;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.12s;
}
.addr-card:hover { opacity: 0.85; }
.addr-card:active { opacity: 0.7; }

.addr-text {
  font-size: 0.62rem;
  font-family: monospace;
  line-height: 1.6;
  word-break: break-all;
  opacity: 0.5;
}

.addr-action {
  font-size: 0.75rem;
  font-weight: 600;
  font-family: "Varela Round", sans-serif;
}

/* Swap Form */
.swap-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field-label {
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.35;
}
.field-opt { opacity: 0.5; text-transform: none; letter-spacing: 0; }

.field-select {
  width: 100%;
  padding: 0.5rem 0;
  border: none;
  border-bottom: 2px solid #000;
  border-radius: 0;
  background: transparent;
  color: #000;
  font-family: "Varela Round", sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 12 12'%3E%3Cpath stroke='%23999' stroke-width='1.5' d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 4px center;
  padding-right: 20px;
}
.field-select:disabled { opacity: 0.3; border-color: rgba(0,0,0,0.15); }

.field-input {
  width: 100%;
  padding: 0.5rem 0;
  border: none;
  border-bottom: 2px solid #000;
  border-radius: 0;
  background: transparent;
  color: #000;
  font-family: "Varela Round", sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  outline: none;
  -webkit-appearance: none;
}
.field-input::placeholder { color: #000; opacity: 0.15; font-weight: 400; }
.field-input:disabled { opacity: 0.3; border-color: rgba(0,0,0,0.15); }
.field-input-light { border-color: rgba(0,0,0,0.15); }
.field-input-light:focus { border-color: #000; }

/* hide number spinners */
.field-input[type=number]::-webkit-inner-spin-button,
.field-input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.field-input[type=number] { -moz-appearance: textfield; }

.amount-wrap { position: relative; }
.amount-sym {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.3;
}

.action-btn {
  width: 100%;
  padding: 0.85rem;
  border-radius: 4px;
  border: none;
  background: #000;
  color: #fff;
  font-family: "Varela Round", sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.12s;
  -webkit-tap-highlight-color: transparent;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-btn:hover:not(:disabled) { opacity: 0.8; }
.action-btn:active:not(:disabled) { opacity: 0.65; }
.action-btn:disabled { background: #e5e5e5; color: #999; cursor: default; }

.cancel-btn {
  width: 100%;
  background: none;
  border: none;
  color: #000;
  opacity: 0.25;
  font-family: "Varela Round", sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.6rem;
  transition: opacity 0.12s;
  -webkit-tap-highlight-color: transparent;
}
.cancel-btn:hover { opacity: 0.5; }

.swap-error {
  color: #ef4444;
  font-size: 0.75rem;
  font-weight: 500;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.5s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Swap Deposit */
.swap-deposit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.summary {
  width: 100%;
  border-top: 1px solid rgba(0,0,0,0.08);
  border-bottom: 1px solid rgba(0,0,0,0.08);
  padding: 0.75rem 0;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.82rem;
}
.summary-label { opacity: 0.35; }
.summary-value { font-weight: 600; font-variant-numeric: tabular-nums; }

.deposit-inst {
  font-size: 0.82rem;
  opacity: 0.5;
  text-align: center;
  line-height: 1.5;
}
.deposit-inst strong { opacity: 1; color: #000; font-weight: 600; }

.deposit-meta {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}
.deposit-deadline {
  font-size: 0.6rem;
  opacity: 0.25;
  font-variant-numeric: tabular-nums;
}

/* Swap Status */
.swap-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding-top: 2rem;
}

.status-icon-wrap { margin-bottom: 1rem; }

.si {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.si-ok { background: #000; }
.si-err { background: #ef4444; }
.si-spin { background: transparent; }

.spinner-ring {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0,0,0,0.1);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.status-heading {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-align: center;
}

.status-desc {
  font-size: 0.82rem;
  opacity: 0.4;
  text-align: center;
  max-width: 280px;
}

.explorer-link {
  display: block;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #000;
  opacity: 0.3;
  text-decoration: none;
  margin-top: 1rem;
  transition: opacity 0.15s;
}
.explorer-link:hover { opacity: 0.7; }

/* Transitions */
.panel-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.panel-leave-active { transition: opacity 0.1s ease; position: absolute; inset: 0; pointer-events: none; }
.panel-enter-from { opacity: 0; transform: translateY(6px); }
.panel-leave-to { opacity: 0; }
</style>

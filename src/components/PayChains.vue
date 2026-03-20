<template>
  <div class="pay" ref="rootRef" role="region" aria-label="Choose payment chain">

    <!-- Picker -->
    <Transition name="panel" mode="out-in">
      <div v-if="!selected" key="picker" class="picker">
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

    <!-- Receipt -->
    <Transition name="panel" mode="out-in">
      <div v-if="selected" key="receipt" class="receipt">
        <button class="receipt-back" @click="back" type="button" aria-label="Back to chain list">
          <span>&larr;</span>
          <span class="row-icon row-icon-sm" v-html="icons[selected.id]" aria-hidden="true"></span>
          <span>{{ selected.name }}</span>
        </button>

        <div class="qr-card" aria-label="QR code">
          <canvas ref="qrCanvas" class="qr" role="img" :aria-label="`QR code for ${selected.name} address`"></canvas>
        </div>

        <button class="addr-card" @click="copy" type="button" :aria-label="`Copy address`">
          <code class="addr-text">{{ props.address }}</code>
          <span class="addr-action">
            <span>{{ copied ? 'Copied' : 'Copy address' }}</span>
          </span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { animate, stagger } from 'motion';
import Snd from 'snd-lib';
import QRCode from 'qrcode';
import * as Web3Icons from '@web3icons/core';

const props = defineProps({ address: String });

const snd = new Snd();
snd.load(Snd.KITS.SND02); // piano kit

const CHAINS = [
  { id: 'zcash',  name: 'Zcash',            symbol: 'ZEC',   key: 'TokenBrandedZEC',   available: true,  popular: true  },
  { id: 'btc',    name: 'Bitcoin',           symbol: 'BTC',   key: 'TokenBrandedBTC',   available: false, popular: true  },
  { id: 'eth',    name: 'Ethereum',          symbol: 'ETH',   key: 'TokenBrandedETH',   available: false, popular: true  },
  { id: 'sol',    name: 'Solana',            symbol: 'SOL',   key: 'TokenBrandedSOL',   available: false, popular: true  },
  { id: 'usdt',   name: 'Tether',            symbol: 'USDT',  key: 'TokenBrandedUSDT',  available: false, popular: true  },
  { id: 'bnb',    name: 'BNB',               symbol: 'BNB',   key: 'TokenBrandedBNB',   available: false, popular: false },
  { id: 'xrp',    name: 'XRP',               symbol: 'XRP',   key: 'TokenBrandedXRP',   available: false, popular: false },
  { id: 'ada',    name: 'Cardano',           symbol: 'ADA',   key: 'TokenBrandedADA',   available: false, popular: false },
  { id: 'doge',   name: 'Dogecoin',          symbol: 'DOGE',  key: 'TokenBrandedDOGE',  available: false, popular: false },
  { id: 'dot',    name: 'Polkadot',          symbol: 'DOT',   key: 'TokenBrandedDOT',   available: false, popular: false },
  { id: 'matic',  name: 'Polygon',           symbol: 'MATIC', key: 'TokenBrandedMATIC', available: false, popular: false },
  { id: 'avax',   name: 'Avalanche',         symbol: 'AVAX',  key: 'TokenBrandedAVAX',  available: false, popular: false },
  { id: 'ltc',    name: 'Litecoin',          symbol: 'LTC',   key: 'TokenBrandedLTC',   available: false, popular: false },
  { id: 'near',   name: 'NEAR',              symbol: 'NEAR',  key: 'TokenBrandedNEAR',  available: false, popular: false },
  { id: 'xmr',    name: 'Monero',            symbol: 'XMR',   key: 'TokenBrandedXMR',   available: false, popular: false },
  { id: 'xlm',    name: 'Stellar',           symbol: 'XLM',   key: 'TokenBrandedXLM',   available: false, popular: false },
  { id: 'link',   name: 'Chainlink',         symbol: 'LINK',  key: 'TokenBrandedLINK',  available: false, popular: false },
  { id: 'atom',   name: 'Cosmos',            symbol: 'ATOM',  key: 'TokenBrandedATOM',  available: false, popular: false },
  { id: 'trx',    name: 'TRON',              symbol: 'TRX',   key: 'TokenBrandedTRX',   available: false, popular: false },
  { id: 'etc',    name: 'Ethereum Classic',  symbol: 'ETC',   key: 'TokenBrandedETC',   available: false, popular: false },
];

const icons = {};
for (const c of CHAINS) {
  const mod = Web3Icons[c.key];
  icons[c.id] = mod?.default ?? mod ?? '';
}

const query = ref('');
const selected = ref(null);
const copied = ref(false);
const rootRef = ref(null);
const searchRef = ref(null);
const qrCanvas = ref(null);

const popular = computed(() => CHAINS.filter(c => c.popular));
const rest = computed(() => CHAINS.filter(c => !c.popular));
const filtered = computed(() => {
  const q = query.value.toLowerCase().trim();
  return CHAINS.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
});

function pick(c) {
  if (!c.available) return;
  snd.play(Snd.SOUNDS.TAP);
  selected.value = c;
  // Animate receipt in
  nextTick(() => {
    const receiptBack = rootRef.value?.querySelector('.receipt-back');
    const qr = rootRef.value?.querySelector('.qr-card');
    const addr = rootRef.value?.querySelector('.addr-card');
    const els = [receiptBack, qr, addr].filter(Boolean);
    animate(els, { opacity: [0, 1], y: [12, 0] }, {
      delay: stagger(0.08, { start: 0.05 }),
      duration: 0.35,
      easing: [0.22, 1, 0.36, 1],
    });
    // QR scale pop
    if (qr) animate(qr, { scale: [0.9, 1] }, { duration: 0.3, delay: 0.1, easing: [0.22, 1, 0.36, 1] });
  });
}

function back() {
  snd.play(Snd.SOUNDS.SWIPE);
  selected.value = null;
  query.value = '';
  nextTick(() => {
    searchRef.value?.focus();
    // Re-animate rows
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

// Typing sound on search
watch(query, () => {
  snd.play(Snd.SOUNDS.TYPE);
});

watch(qrCanvas, async (canvas) => {
  if (!canvas) return;
  await QRCode.toCanvas(canvas, props.address, {
    width: 220,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
});

async function copy() {
  await navigator.clipboard.writeText(props.address);
  snd.play(Snd.SOUNDS.NOTIFICATION);
  copied.value = true;
  // Pop the card
  const card = rootRef.value?.querySelector('.addr-card');
  if (card) animate(card, { scale: [1, 0.97, 1] }, { duration: 0.15 });
  setTimeout(() => { copied.value = false; }, 2000);
}

onMounted(() => {
  // Stagger in search + rows
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

/* Receipt */
.receipt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.receipt-back {
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
  transition: opacity 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.receipt-back:hover { opacity: 0.7; }

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

/* Transitions */
.panel-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.panel-leave-active { transition: opacity 0.1s ease; position: absolute; inset: 0; pointer-events: none; }
.panel-enter-from { opacity: 0; transform: translateY(6px); }
.panel-leave-to { opacity: 0; }
</style>

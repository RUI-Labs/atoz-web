import { TokenResponse } from "@defuse-protocol/one-click-sdk-typescript";

export const SUPPORTED_CHAINS: Record<string, TokenResponse.blockchain> = {
  eth: TokenResponse.blockchain.ETH,
  base: TokenResponse.blockchain.BASE,
  arb: TokenResponse.blockchain.ARB,
  bsc: TokenResponse.blockchain.BSC,
  pol: TokenResponse.blockchain.POL,
  op: TokenResponse.blockchain.OP,
  avax: TokenResponse.blockchain.AVAX,
  gnosis: TokenResponse.blockchain.GNOSIS,
  bera: TokenResponse.blockchain.BERA,
  scroll: TokenResponse.blockchain.SCROLL,
  xlayer: TokenResponse.blockchain.XLAYER,
};

export type ChainKey = keyof typeof SUPPORTED_CHAINS;

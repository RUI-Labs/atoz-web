import {
  OneClickService,
  QuoteRequest,
  TokenResponse,
} from "@defuse-protocol/one-click-sdk-typescript";
import { SUPPORTED_CHAINS } from "./chains";

export async function getTokens() {
  return OneClickService.getTokens();
}

export function findAsset(
  tokens: TokenResponse[],
  chain: string,
  currency: string
): TokenResponse | undefined {
  const blockchain = SUPPORTED_CHAINS[chain];
  if (!blockchain) return undefined;

  return tokens.find(
    (t) =>
      t.blockchain === blockchain &&
      t.symbol.toLowerCase() === currency.toLowerCase()
  );
}

export function toSmallestUnit(amount: number, decimals: number): string {
  return BigInt(Math.round(amount * 10 ** decimals)).toString();
}

export async function getQuote(params: {
  originAssetId: string;
  destinationAssetId: string;
  amount: string;
  receiver: string;
  refundTo: string;
  slippageTolerance?: number;
  dry?: boolean;
}) {
  const deadline = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const quoteRequest: QuoteRequest = {
    dry: params.dry ?? false,
    swapType: QuoteRequest.swapType.EXACT_INPUT,
    slippageTolerance: params.slippageTolerance ?? 100,
    originAsset: params.originAssetId,
    depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
    destinationAsset: params.destinationAssetId,
    amount: params.amount,
    refundTo: params.refundTo,
    refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
    recipient: params.receiver,
    recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
    deadline,
  };

  return OneClickService.getQuote(quoteRequest);
}

export async function getStatus(depositAddress: string) {
  return OneClickService.getExecutionStatus(depositAddress);
}

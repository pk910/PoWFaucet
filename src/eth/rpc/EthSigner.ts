import { Hex } from 'viem';
import { privateKeyToAccount, PrivateKeyAccount } from 'viem/accounts';

export interface EthTxFields {
  chainId: number;
  nonce: number;
  gasLimit: bigint;
  to: string;
  value: bigint;
  data: string;
}

export interface EthLegacyTxFields extends EthTxFields {
  gasPrice: bigint;
}

export interface EthFeeMarketTxFields extends EthTxFields {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

/** The faucet wallet: address derivation and offline signing of the two transaction types it sends. */
export class EthSigner {
  private account: PrivateKeyAccount;

  public constructor(privateKey: string) {
    const key = privateKey.startsWith("0x") || privateKey.startsWith("0X") ? "0x" + privateKey.substring(2) : "0x" + privateKey;
    this.account = privateKeyToAccount(key as Hex);
  }

  /** checksummed */
  public get address(): string {
    return this.account.address;
  }

  /** The signed, serialized type 0 transaction (EIP-155), 0x-prefixed. */
  public signLegacyTransaction(tx: EthLegacyTxFields): Promise<Hex> {
    return this.account.signTransaction({
      type: 'legacy',
      chainId: tx.chainId,
      nonce: tx.nonce,
      gas: tx.gasLimit,
      gasPrice: tx.gasPrice,
      to: tx.to.toLowerCase() as Hex,
      value: tx.value,
      data: (tx.data || "0x") as Hex,
    });
  }

  /** The signed, serialized type 2 transaction, 0x-prefixed. */
  public signFeeMarketTransaction(tx: EthFeeMarketTxFields): Promise<Hex> {
    return this.account.signTransaction({
      type: 'eip1559',
      chainId: tx.chainId,
      nonce: tx.nonce,
      gas: tx.gasLimit,
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      to: tx.to.toLowerCase() as Hex,
      value: tx.value,
      data: (tx.data || "0x") as Hex,
    });
  }
}

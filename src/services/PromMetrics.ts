import client from 'prom-client';
import Web3 from "web3";
import { EthWalletManager } from "../eth/EthWalletManager.js";
import { ServiceManager } from "../common/ServiceManager.js";

export class PromMetricsService {
  private initialized: boolean;

  intervalID: NodeJS.Timeout;
  register: client.Registry;
  balanceMetric: client.Gauge;

  public initialize() {
    if(this.initialized)
      return;
    this.initialized = true;

    // Initialize Prometheus metrics
    this.register = new client.Registry();
    client.collectDefaultMetrics({ register: this.register });

    this.balanceMetric = new client.Gauge({
      name: 'wallet_balance',
      help: 'Wallet balance in ETH',
    });

    // Add custom metric to the register
    this.register.registerMetric(this.balanceMetric);

    void this.updateWalletBalance();

    // Update balance every 10 minutes
    this.intervalID = setInterval(() => this.updateWalletBalance(), 10 * 60 * 1000);
  }

  public dispose() {
    if(!this.initialized)
      return;
    this.initialized = false;

    clearTimeout(this.intervalID);
  }

  private async updateWalletBalance() {
    const ethWalletManager = ServiceManager.GetService(EthWalletManager);
    const balanceInWei = await ethWalletManager.getFaucetWalletBalance();
    const balanceInEth = Web3.utils.fromWei(balanceInWei, 'ether');
    this.balanceMetric.set(Number(balanceInEth));
    console.log(`Updated balance for wallet: ${balanceInEth} ETH`);
  }

  public getWalletBalanceMetric() {
    return this.register.metrics();
  }

  public getContentType() {
    return this.register.contentType;
  }
}

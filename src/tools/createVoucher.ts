import { FaucetDatabase } from "../db/FaucetDatabase.js";
import crypto from "crypto";
import { Command } from "commander";
import { basename } from "path";
import { loadFaucetConfig, cliArgs } from "../config/FaucetConfig.js";
import { ServiceManager } from "../common/ServiceManager.js";
import { FaucetProcess } from "../common/FaucetProcess.js";

function generateRandomString(length: number, prefix?: string): string {
  const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
  let result = prefix || "";
  
  while (result.length < (prefix ? prefix.length : 0) + length) {
    const randomByte = crypto.randomBytes(1)[0];
    if (randomByte < 256 - (256 % chars.length)) {
      result += chars[randomByte % chars.length];
    }
  }
  
  return result;
}

// Convert ETH to Wei if needed
function parseAmount(amount: string): string {
  if (amount.toUpperCase().endsWith("ETH")) {
    const ethAmount = parseFloat(amount.slice(0, -3));
    return BigInt(ethAmount * 1e18).toString();
  }
  return amount;
}

export async function createVoucher() {
  const program = new Command();
  var argv = process.argv.slice();
  argv.splice(2, 1);

  ServiceManager.GetService(FaucetProcess).hideLogOutput = true;
  
  program
    .name(basename(process.argv[1]))
    .description('Mass create voucher codes for PoWFaucet')
    .option('-c, --count <number>', 'Number of voucher codes to generate', parseInt)
    .option('-a, --amount [value]', 'Override drop amount (supports ETH as unit, otherwise wei)')
    .option('-p, --prefix [string]', 'Code prefix')
    .parse(argv);
  
  const options = program.opts();
  
  if (!options.count || options.count <= 0) {
    console.error("Error: Count must be a positive number");
    program.help();
    process.exit(1);
  }
  
  // Initialize database
  loadFaucetConfig();
  let faucetDb = ServiceManager.GetService(FaucetDatabase);
  await faucetDb.initialize();
  
  // Add a function to create vouchers directly to the database
  async function addVoucher(code: string, dropAmount: string): Promise<void> {
    const sql = "INSERT INTO Vouchers (Code, DropAmount, SessionId, TargetAddr, StartTime) VALUES (?, ?, NULL, NULL, NULL)";
    await faucetDb.getDatabase().run(sql, [code, dropAmount]);
  }
  
  // Generate vouchers
  const amount = options.amount ? parseAmount(options.amount) : "0";
  const prefix = options.prefix || "";
  const codeLength = Math.max(10, 20 - prefix.length); // Ensure codes are sufficient length
  
  for (let i = 0; i < options.count; i++) {
    let code = generateRandomString(codeLength, prefix);
    try {
      await addVoucher(code, amount.toString() == "0" ? "" : amount);
      code = code.match(/.{1,5}/g).join(" ");
      console.log(code);
    } catch (error) {
      // If code already exists, try again
      i--;
    }
  }

  process.exit(0);
}

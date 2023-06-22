
import crypto from "crypto"

export function sha256(input: string): string {
  let sha256 = crypto.createHash('sha256');
  sha256.update(input);
  return sha256.digest("hex");
}

export function encryptStr(input: string, passphrase: string): string {
  let iv = crypto.randomBytes(16);
  let key = Buffer.from(sha256(passphrase), "hex");
  let cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(input);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  let final = Buffer.concat([iv, encrypted]);
  return final.toString("base64");
}

export function decryptStr(input: string, passphrase: string): string {
  let inputBuf = Buffer.from(input, "base64");
  if(inputBuf.length <= 16)
    return null;
  let iv = inputBuf.slice(0, 16);
  let key = Buffer.from(sha256(passphrase), "hex");
  let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(inputBuf.slice(16));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

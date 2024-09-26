
#include <stdio.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <stdint.h>

#include "../../include/secp256k1.h"
#include "../../include/secp256k1_recovery.h"
#include "keccak256.c"

secp256k1_context *ctx;
unsigned char output[(258 * 2) + 1];
unsigned char createAddrInBuf[23], createAddrOutBuf[32];
unsigned char inputHash[32];
unsigned char inputSigR[32];
unsigned char inputSigV;
unsigned char preimageHash[32];
unsigned char outputSuffix[20];
unsigned char outputPrefix[20];
int outputSuffixLen;
int outputPrefixLen;
int maxRounds;

void miner_init() {
    ctx = secp256k1_context_create(SECP256K1_CONTEXT_VERIFY);
    createAddrInBuf[0] = 0xd6;
    createAddrInBuf[1] = 0x94;
    createAddrInBuf[22] = 0x80;
}

static void hash_keccak256(const char *data, uint16_t length, char *result) {
    SHA3_CTX context;
    keccak_init(&context);
    keccak_update(&context, (const unsigned char*)data, (size_t)length);
    keccak_final(&context, (unsigned char*)result);
}

static void parse_hex_bigendian(unsigned char *hex, unsigned char *buf, size_t len) {
    int hex_len = strlen(hex) / 2;
    memset(buf, 0, len);
    unsigned char *pos = hex;
    size_t offset = len - hex_len;
    if (offset < 0) {
        offset = 0;
    }
    size_t i;
    for(i = 0; i < hex_len; i++) { sscanf(pos, "%2hhx", &buf[i+offset]); pos += 2; }
}

static unsigned char* get_create_addr(unsigned char *deployer) {
    memcpy(createAddrInBuf+2, deployer, 20);
    hash_keccak256(createAddrInBuf, 23, createAddrOutBuf);
    return createAddrOutBuf+12;
}

void miner_set_config(unsigned char *input_hex, unsigned char *input_sigr, int input_sig_v, unsigned char *output_suffix, unsigned char *output_prefix, int max_rounds, unsigned char *preimageHex) {
    unsigned char *pos;
    size_t i;
    int len;

    parse_hex_bigendian(input_hex, inputHash, 32);
    parse_hex_bigendian(input_sigr, inputSigR, 32);
    inputSigV = input_sig_v;
    
    len = strlen(output_suffix) / 2;
    pos = output_suffix;
    for(i = 0; i < len; i++) { sscanf(pos, "%2hhx", &outputSuffix[i]); pos += 2; }
    outputSuffixLen = len;

    len = strlen(output_prefix) / 2;
    pos = output_prefix;
    for(i = 0; i < len; i++) { sscanf(pos, "%2hhx", &outputPrefix[i]); pos += 2; }
    outputPrefixLen = len;

    maxRounds = max_rounds;

    len = strlen(preimageHex) / 2;
    unsigned char preimage_bytes[len];
    pos = preimageHex;
    for(i = 0; i < len; i++) { sscanf(pos, "%2hhx", &preimage_bytes[i]); pos += 2; }
    hash_keccak256(preimage_bytes, len, preimageHash);
}

unsigned char* miner_get_input() {
    unsigned char *pos = output;
    size_t i;
    pos += sprintf(pos, "input: 0x");
    for (i = 0; i < 32; i++) {
        pos += sprintf(pos, "%02x", inputHash[i]);
    }

    return output;
}

unsigned char* miner_get_sigrv() {
    unsigned char *pos = output;
    size_t i;
    pos += sprintf(pos, "sigR: 0x");
    for (i = 0; i < 32; i++) {
        pos += sprintf(pos, "%02x", inputSigR[i]);
    }

    pos += sprintf(pos, ", sigV: 0x%02x (%d)", inputSigV, inputSigV);

    return output;
}

unsigned char* miner_get_suffix() {
    unsigned char *pos = output;
    size_t i;
    pos += sprintf(pos, "suffix: 0x");
    for (i = 0; i < outputSuffixLen; i++) {
        pos += sprintf(pos, "%02x", outputSuffix[i]);
    }

    return output;
}

unsigned char* miner_get_preimage() {
    unsigned char *pos = output;
    size_t i;
    pos += sprintf(pos, "preimage: 0x");
    for (i = 0; i < 32; i++) {
        pos += sprintf(pos, "%02x", inputHash[i]);
    }

    return output;
}

unsigned char* miner_run(unsigned char *nonceHex) {
    unsigned char sigBytes[65];
    memcpy(sigBytes, inputSigR, 32);
    sigBytes[64] = inputSigV - 27;

    /*
    sigBytes:
        0-31: sigR
        32-63: sigS
            32-47: input nonce
            48-61: preimage
            62-63: run nonce
        64: sigV
    */
    parse_hex_bigendian(nonceHex, sigBytes+32, 16);
    memcpy(sigBytes + 48, preimageHash, 16);

    size_t i, j, outputlen, addrpos;
    unsigned char diff, *pos, *addr, bestAddr[20], bestNonce[32], pubkey_out[65], pubkey_hash[32];
    int score, highValue, lowValue, bestScore = 0;
    secp256k1_ecdsa_recoverable_signature sig;
    secp256k1_pubkey pubkey;

    for (i = 0; i < maxRounds; i++) {
        sigBytes[62] = (i >> 8) & 0xff;
        sigBytes[63] = i & 0xff;

        if (!secp256k1_ecdsa_recoverable_signature_parse_compact(ctx, &sig, sigBytes, (int)sigBytes[64])) {
            printf("failed to parse sig\n");
            continue;
        }

        if (!secp256k1_ecdsa_recover(ctx, &pubkey, &sig, inputHash)) {
            printf("failed to recover pubkey\n");
            continue;
        }

        outputlen = 65;
        if(!secp256k1_ec_pubkey_serialize(ctx, pubkey_out, &outputlen, &pubkey, SECP256K1_EC_UNCOMPRESSED)) {
            printf("failed to serialize pubkey\n");
            continue;
        }

        if(outputlen != 65 || pubkey_out[0] != 4) {
            printf("pubkey invalid\n");
            continue;
        }

        hash_keccak256(pubkey_out+1, 64, pubkey_hash);
        addr = get_create_addr(pubkey_hash+12);

        score = 0;
        for (j = 0; j < outputSuffixLen; j++) {
            addrpos = 20 - j - 1;
            diff = addr[addrpos] ^ outputSuffix[outputSuffixLen - j - 1];

            //printf("addrpos: %d - 0x%02x/0x%02x  0x%02x\n", addrpos, addr[addrpos], outputSuffix[outputSuffixLen - j - 1], diff);

            if(diff & 0x01) { break; } else { score++; }
            if(diff & 0x02) { break; } else { score++; }
            if(diff & 0x04) { break; } else { score++; }
            if(diff & 0x08) { break; } else { score++; }
            if(diff & 0x10) { break; } else { score++; }
            if(diff & 0x20) { break; } else { score++; }
            if(diff & 0x40) { break; } else { score++; }
            if(diff & 0x80) { break; } else { score++; }
        }

        if (score == outputSuffixLen * 8) {
            // suffix matches completely, check prefix
            for (j = 0; j < outputPrefixLen; j++) {
                diff = addr[j] ^ outputPrefix[j];
                if(diff & 0x80) { break; } else { score++; }
                if(diff & 0x40) { break; } else { score++; }
                if(diff & 0x20) { break; } else { score++; }
                if(diff & 0x10) { break; } else { score++; }
                if(diff & 0x08) { break; } else { score++; }
                if(diff & 0x04) { break; } else { score++; }
                if(diff & 0x02) { break; } else { score++; }
                if(diff & 0x01) { break; } else { score++; }
            }
        }

        if (score > bestScore) {
            bestScore = score;
            memcpy(bestAddr, addr, 20);
            memcpy(bestNonce, sigBytes+32, 32);
        }
    }

    pos = output;
    pos += sprintf(pos, "0x%02x", bestScore);
    for (i = 0; i < 20; i++) {
        pos += sprintf(pos, "%02x", bestAddr[i]);
    }

    for(i = 0; i < 32; i++) {
        if(bestNonce[i] != 0) {
            break;
        }
    }
    for (; i < 32; i++) {
        pos += sprintf(pos, "%02x", bestNonce[i]);
    }

    return output;
}


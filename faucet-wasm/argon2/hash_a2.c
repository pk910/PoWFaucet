
#include <stdio.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <stdint.h>

#include "./argon2-wasm/src/blake2/blake2b.c"
#include "./argon2-wasm/src/core.c"
#include "./argon2-wasm/src/encoding.c"
#include "./argon2-wasm/src/ref.c"
#include "./argon2-wasm/src/thread.c"
#include "./argon2-wasm/src/argon2.c"
#include "./argon2-wasm/include/argon2.h"

char output[(258 * 2) + 1];

char* hash_a2(char *input_hex, char *salt_hex, int hash_len, int time_cost, int mem_cost, int parallelism, int type, int version)
{
    char *pos;

    int input_len = strlen(input_hex) / 2;
    unsigned char input[input_len];
    pos = input_hex;
    for(size_t i = 0; i < input_len; i++)  { sscanf(pos, "%2hhx", &input[i]); pos += 2; }

    int salt_len = strlen(salt_hex) / 2;
    unsigned char salt[salt_len];
    pos = salt_hex;
    for(size_t i = 0; i < salt_len; i++)  { sscanf(pos, "%2hhx", &salt[i]); pos += 2; }

    if(hash_len > 258)
      hash_len = 258;

    unsigned char hash[hash_len];
    int res = argon2_hash(time_cost, mem_cost, parallelism, input, input_len, salt, salt_len, hash, hash_len, NULL, 0, type, version);
    if(res == 0) {
      char *ptr = &output[0];
      for (size_t i = 0; i < hash_len; i++) { ptr += sprintf (ptr, "%02x",hash[i]); }
    }
    else {
      output[0] = '!';
      strcpy(output+1, argon2_error_message(res));
    }
    
    return &output[0];
}
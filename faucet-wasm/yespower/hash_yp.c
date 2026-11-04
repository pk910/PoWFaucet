/*
 * yespower 1.0 hashing entry point for the PoWFaucet wasm build.
 *
 * hash_yp(input_hex, N, r, pers) hashes the bytes encoded in input_hex with yespower 1.0 and
 * returns the 32 byte result as 64 lowercase hex characters. Any failure returns a string that
 * starts with '!' followed by the reason; callers must treat such a result as "no hash".
 *
 * The scratch memory is held in one region that is allocated on first use and grown when a call
 * asks for more (larger N or r), so steady-state hashing does not allocate.
 */

#include <errno.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>

#include "yespower.h"

#define HASH_YP_MAX_INPUT_BYTES 128
#define HASH_YP_MAX_PERS_BYTES 64

static char output[2 * sizeof(yespower_binary_t) + 1];
static yespower_local_t local;
static int local_ready = 0;

static const char *fail(const char *reason)
{
  output[0] = '!';
  strncpy(output + 1, reason, sizeof(output) - 2);
  output[sizeof(output) - 1] = '\0';
  return output;
}

static int hex_value(char c)
{
  if (c >= '0' && c <= '9')
    return c - '0';
  if (c >= 'a' && c <= 'f')
    return c - 'a' + 10;
  if (c >= 'A' && c <= 'F')
    return c - 'A' + 10;
  return -1;
}

const char *hash_yp(const char *input_hex, uint32_t N, uint32_t r, const char *pers)
{
  static const char hex_digits[] = "0123456789abcdef";
  uint8_t input[HASH_YP_MAX_INPUT_BYTES];
  yespower_binary_t dst;
  size_t hex_len, input_len, pers_len, i;

  if (!input_hex)
    return fail("missing input");
  hex_len = strlen(input_hex);
  if (hex_len == 0 || (hex_len % 2) != 0)
    return fail("input is not hex");
  input_len = hex_len / 2;
  if (input_len > HASH_YP_MAX_INPUT_BYTES)
    return fail("input too long");
  for (i = 0; i < input_len; i++) {
    int hi = hex_value(input_hex[2 * i]);
    int lo = hex_value(input_hex[2 * i + 1]);
    if (hi < 0 || lo < 0)
      return fail("input is not hex");
    input[i] = (uint8_t)((hi << 4) | lo);
  }

  pers_len = pers ? strlen(pers) : 0;
  if (pers_len > HASH_YP_MAX_PERS_BYTES)
    return fail("pers too long");

  if (!local_ready) {
    if (yespower_init_local(&local))
      return fail("init failed");
    local_ready = 1;
  }

  yespower_params_t params = {
    .version = YESPOWER_1_0,
    .N = N,
    .r = r,
    .pers = pers_len ? (const uint8_t *)pers : NULL,
    .perslen = pers_len,
  };
  errno = 0;
  if (yespower(&local, input, input_len, &params, &dst))
    return fail(errno == EINVAL ? "invalid params" : "hashing failed");

  for (i = 0; i < sizeof(dst.uc); i++) {
    output[2 * i] = hex_digits[dst.uc[i] >> 4];
    output[2 * i + 1] = hex_digits[dst.uc[i] & 0x0f];
  }
  output[2 * sizeof(dst.uc)] = '\0';
  return output;
}

import { Field } from "o1js";
import { base64url } from "multiformats/bases/base64";
import { hexToBytes, bytesToHex } from "@noble/hashes/utils";

export function fieldToBytes(n: Field): Uint8Array {
  return hexToBytes(
    n
      .toBigInt()
      .toString(16)
      .padStart(32 * 2, "0"),
  );
}

export function fieldToDigest(n: Field): string {
  const bytes = fieldToBytes(n);
  return base64url.encode(bytes);
}

export function digestToField(digest: string): Field {
  const bytes = base64url.decode(digest);
  const hex = bytesToHex(bytes);
  const bigint = BigInt(`0x${hex}`);
  return Field(bigint);
}

import { sha384 } from "@noble/hashes/sha512";
import { base64urlpad } from "multiformats/bases/base64";

export function integritySHA384(bytes: Uint8Array): string {
  const digest = sha384(bytes);
  const asString = base64urlpad.baseEncode(digest);
  return `sha384-${asString}`;
}

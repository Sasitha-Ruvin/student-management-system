export {
  decryptField,
  decryptFieldSafe,
  decryptOptional,
  decryptOptionalSafe,
} from "@/lib/pii-crypto/decrypt";
export { encryptField, encryptOptional } from "@/lib/pii-crypto/encrypt";
export {
  generateKeyBase64,
  getEncryptionKey,
  getSearchHmacKey,
  hmacSha256,
} from "@/lib/pii-crypto/keys";
export {
  buildNicTrigrams,
  canSearchNicByTrigram,
  hashNicExact,
  hashNicSearchQuery,
  hashNicTrigram,
  maskNic,
} from "@/lib/pii-crypto/nic-search";
export {
  maskAddress,
  maskDob,
  maskEmail,
  maskName,
  maskPhone,
  REDACTED,
} from "@/lib/pii-crypto/masks";

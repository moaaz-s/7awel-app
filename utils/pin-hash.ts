// utils/pin-hash.ts
// Secure PIN hashing & verification using PBKDF2 (Web Crypto).
// Stored format: "<iterations>.<saltBase64>.<hashBase64>"

const ITERATIONS = 100_000;
const SALT_BYTES = 16;

function bufToBase64(buf: BufferSource): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const pinBytes = enc.encode(pin);
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await crypto.subtle.importKey("raw", pinBytes, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  const hashB64 = bufToBase64(bits);
  const saltB64 = bufToBase64(salt);
  return `${ITERATIONS}.${saltB64}.${hashB64}`;
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  console.log('[pin-hash] Verifying PIN using Web Crypto:', { pin, storedHash }); // <-- Log inputs

  try {
    const parts = storedHash.split(".");
    if (parts.length !== 3) {
      console.error('[pin-hash] Invalid stored hash format.');
      return false;
    }
    const [iterStr, saltB64, hashB64] = parts;
    const iterations = parseInt(iterStr, 10);

    if (isNaN(iterations) || !saltB64 || !hashB64) {
      console.error('[pin-hash] Invalid components in stored hash.');
      return false;
    }

    const salt = base64ToBuf(saltB64);
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(pin),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      keyMaterial,
      256 // 256 bits
    );

    const derivedHashB64 = bufToBase64(derivedBits);
    const result = derivedHashB64 === hashB64;

    console.log('[pin-hash] Comparison result:', result, { derivedHashB64, expectedHashB64: hashB64 }); // <-- Log result and hashes
    return result;
  } catch (error) {
    console.error("[pin-hash] Error verifying PIN:", error);
    return false;
  }
}

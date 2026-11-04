import { requireOptionalNativeModule } from 'expo';

interface Pbkdf2NativeApi {
  deriveHexAsync(password: string, saltHex: string, iterations: number, keyLength: number): Promise<string>;
}

// Present on iOS builds that include modules/pbkdf2-native. Null on Android, web, and any build made
// before the module was added, so callers must be ready to fall back to the JavaScript implementation.
const native = requireOptionalNativeModule<Pbkdf2NativeApi>('Pbkdf2Native');

export const hasNativePbkdf2 = native != null;

/**
 * PBKDF2-HMAC-SHA256 through the system crypto library. Returns the derived key as lowercase hex, or
 * null when the native module is not available in this build.
 */
export async function nativePbkdf2Sha256Hex(
  password: string,
  saltHex: string,
  iterations: number,
  keyLength: number
): Promise<string | null> {
  if (native == null) return null;
  return native.deriveHexAsync(password, saltHex, iterations, keyLength);
}

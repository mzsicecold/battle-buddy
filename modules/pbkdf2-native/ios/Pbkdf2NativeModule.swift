import CommonCrypto
import ExpoModulesCore

/// Raised for arguments the key derivation can't use. The message reaches JavaScript.
internal final class InvalidPbkdf2ArgumentException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    param
  }
}

/// PBKDF2-HMAC-SHA256 through the system's CommonCrypto, so the vault key is not derived in JavaScript.
///
/// Inputs and output are plain strings (password as text, salt and result as hex) so no binary
/// bridging is involved. The result is identical to @noble/hashes' pbkdf2(sha256, ...), which is what
/// vaults created before this module were keyed with; vault-crypto.ts relies on that.
public class Pbkdf2NativeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Pbkdf2Native")

    // AsyncFunction runs off the JavaScript thread by default, so the app stays responsive.
    AsyncFunction("deriveHexAsync") { (password: String, saltHex: String, iterations: Int, keyLength: Int) -> String in
      guard iterations >= 1, iterations <= 100_000_000 else {
        throw InvalidPbkdf2ArgumentException("iterations must be between 1 and 100,000,000")
      }
      guard keyLength >= 1, keyLength <= 64 else {
        throw InvalidPbkdf2ArgumentException("keyLength must be between 1 and 64")
      }
      guard let salt = Self.bytes(fromHex: saltHex) else {
        throw InvalidPbkdf2ArgumentException("salt must be an even-length hex string")
      }

      var derived = [UInt8](repeating: 0, count: keyLength)
      let passwordLength = password.utf8.count
      let status = password.withCString { passwordPointer in
        salt.withUnsafeBufferPointer { saltPointer in
          derived.withUnsafeMutableBufferPointer { outPointer in
            CCKeyDerivationPBKDF(
              CCPBKDFAlgorithm(kCCPBKDF2),
              passwordPointer,
              passwordLength,
              saltPointer.baseAddress,
              salt.count,
              CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
              UInt32(iterations),
              outPointer.baseAddress,
              keyLength
            )
          }
        }
      }
      guard status == kCCSuccess else {
        throw InvalidPbkdf2ArgumentException("CommonCrypto returned status \(status)")
      }
      return derived.map { String(format: "%02x", $0) }.joined()
    }
  }

  private static func bytes(fromHex hex: String) -> [UInt8]? {
    let characters = Array(hex.utf8)
    guard characters.count % 2 == 0 else { return nil }
    var result = [UInt8]()
    result.reserveCapacity(characters.count / 2)
    var index = 0
    while index < characters.count {
      guard let high = nibble(characters[index]), let low = nibble(characters[index + 1]) else { return nil }
      result.append(high << 4 | low)
      index += 2
    }
    return result
  }

  private static func nibble(_ character: UInt8) -> UInt8? {
    switch character {
    case 48...57: return character - 48   // 0-9
    case 97...102: return character - 87  // a-f
    case 65...70: return character - 55   // A-F
    default: return nil
    }
  }
}

package com.askdb.security;

import com.askdb.config.AppProperties;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

/**
 * Encrypts the database passwords users save, using AES-256 in GCM mode.
 *
 * Login passwords are hashed (BCrypt) because we never need them back. Database passwords
 * are different: we must send the real password to the database later, so they are
 * encrypted instead, and the key lives in an environment variable, not in the database.
 *
 * Stored format: base64( 12-byte random IV + ciphertext + GCM tag ).
 */
@Service
public class CryptoService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecretKey key;
    private final SecureRandom random = new SecureRandom();

    public CryptoService(AppProperties props) {
        try {
            // SHA-256 turns a secret of any length into exactly the 32 bytes AES-256 needs.
            byte[] keyBytes = MessageDigest.getInstance("SHA-256")
                    .digest(props.encryptionSecret().getBytes(StandardCharsets.UTF_8));
            this.key = new SecretKeySpec(keyBytes, "AES");
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Could not set up encryption.", ex);
        }
    }

    public String encrypt(String plainText) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv); // a fresh IV every time: same password never encrypts the same way twice
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            byte[] out = ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array();
            return Base64.getEncoder().encodeToString(out);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Encryption failed.", ex);
        }
    }

    public String decrypt(String stored) {
        try {
            byte[] in = Base64.getDecoder().decode(stored);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, in, 0, IV_BYTES));
            byte[] plain = cipher.doFinal(in, IV_BYTES, in.length - IV_BYTES);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            // GCM also detects tampering: a modified value fails here instead of decrypting to garbage.
            throw new IllegalStateException("Decryption failed.", ex);
        }
    }
}

package com.askdb;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.askdb.config.AppProperties;
import com.askdb.security.CryptoService;
import com.askdb.security.JwtService;
import org.junit.jupiter.api.Test;

/** Plain unit tests: no Spring, no database. */
class SecurityServicesTest {

    private static final String JWT_SECRET = TestProps.JWT_SECRET;

    private static AppProperties props(String jwtSecret, long expiryMinutes, String encryptionSecret) {
        return TestProps.with(jwtSecret, expiryMinutes, encryptionSecret);
    }

    @Test
    void encryptedPasswordRoundTrips() {
        CryptoService crypto = new CryptoService(props(JWT_SECRET, 60, "secret-one"));
        String stored = crypto.encrypt("p@ssw0rd!");
        assertNotEquals("p@ssw0rd!", stored);
        assertEquals("p@ssw0rd!", crypto.decrypt(stored));
    }

    @Test
    void samePasswordEncryptsDifferentlyEachTime() {
        CryptoService crypto = new CryptoService(props(JWT_SECRET, 60, "secret-one"));
        assertNotEquals(crypto.encrypt("same"), crypto.encrypt("same"));
    }

    @Test
    void wrongKeyCannotDecrypt() {
        String stored = new CryptoService(props(JWT_SECRET, 60, "secret-one")).encrypt("p@ssw0rd!");
        CryptoService other = new CryptoService(props(JWT_SECRET, 60, "secret-two"));
        assertThrows(IllegalStateException.class, () -> other.decrypt(stored));
    }

    @Test
    void tokenCarriesUserId() {
        JwtService jwt = new JwtService(props(JWT_SECRET, 60, "x"));
        assertEquals(42L, jwt.readUserId(jwt.createToken(42L)).orElseThrow());
    }

    @Test
    void tamperedExpiredOrForeignTokensAreRejected() {
        JwtService jwt = new JwtService(props(JWT_SECRET, 60, "x"));
        String token = jwt.createToken(42L);

        assertTrue(jwt.readUserId(token + "x").isEmpty());
        assertTrue(jwt.readUserId("not-a-token").isEmpty());

        JwtService expired = new JwtService(props(JWT_SECRET, -1, "x"));
        assertTrue(jwt.readUserId(expired.createToken(42L)).isEmpty());

        JwtService otherKey = new JwtService(props("a-completely-different-secret-0123456789", 60, "x"));
        assertTrue(otherKey.readUserId(token).isEmpty());
    }

    @Test
    void shortJwtSecretIsRefused() {
        assertThrows(IllegalStateException.class, () -> new JwtService(props("too-short", 60, "x")));
    }
}

package com.askdb.security;

import com.askdb.config.AppProperties;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/** Creates and checks the signed login tokens (JWT, HMAC-SHA256). */
@Service
public class JwtService {

    private final SecretKey key;
    private final Duration expiry;

    public JwtService(AppProperties props) {
        byte[] secret = props.jwt().secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException("askdb.jwt.secret must be at least 32 characters long.");
        }
        this.key = Keys.hmacShaKeyFor(secret);
        this.expiry = Duration.ofMinutes(props.jwt().expiryMinutes());
    }

    public String createToken(Long userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expiry)))
                .signWith(key)
                .compact();
    }

    /** Returns the user id inside the token, or empty if the token is forged, damaged or expired. */
    public Optional<Long> readUserId(String token) {
        try {
            String subject = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .getSubject();
            return Optional.of(Long.parseLong(subject));
        } catch (JwtException | IllegalArgumentException ex) {
            return Optional.empty();
        }
    }
}

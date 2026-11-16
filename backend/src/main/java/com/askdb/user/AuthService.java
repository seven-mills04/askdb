package com.askdb.user;

import com.askdb.common.ApiException;
import com.askdb.security.JwtService;
import com.askdb.user.AuthDtos.AuthResponse;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(String rawEmail, String password) {
        String email = normalize(rawEmail);
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        User user = users.save(new User(email, passwordEncoder.encode(password)));
        return new AuthResponse(jwtService.createToken(user.getId()), user.getEmail());
    }

    public AuthResponse login(String rawEmail, String password) {
        // Same message for "no such user" and "wrong password", so attackers can't
        // use this endpoint to find out which emails have accounts.
        User user = users.findByEmail(normalize(rawEmail))
                .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Wrong email or password."));
        return new AuthResponse(jwtService.createToken(user.getId()), user.getEmail());
    }

    public User getById(Long id) {
        return users.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in."));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}

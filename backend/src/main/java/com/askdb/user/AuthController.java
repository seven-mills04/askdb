package com.askdb.user;

import com.askdb.user.AuthDtos.AuthResponse;
import com.askdb.user.AuthDtos.LoginRequest;
import com.askdb.user.AuthDtos.MeResponse;
import com.askdb.user.AuthDtos.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest body) {
        return authService.register(body.email(), body.password());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest body) {
        return authService.login(body.email(), body.password());
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal Long userId) {
        User user = authService.getById(userId);
        return new MeResponse(user.getId(), user.getEmail());
    }
}

package com.askdb;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.askdb.ai.RateLimiter;
import com.askdb.common.ApiException;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class RateLimiterTest {

    private final AtomicLong now = new AtomicLong(1_000_000);
    private final RateLimiter limiter = new RateLimiter(3, now::get);

    @Test
    void blocksAfterTheLimitAndRecoversInTheNextWindow() {
        limiter.check(1L);
        limiter.check(1L);
        limiter.check(1L);
        ApiException ex = assertThrows(ApiException.class, () -> limiter.check(1L));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());

        now.addAndGet(60_000); // one minute later
        assertDoesNotThrow(() -> limiter.check(1L));
    }

    @Test
    void usersAreCountedSeparately() {
        limiter.check(1L);
        limiter.check(1L);
        limiter.check(1L);
        assertDoesNotThrow(() -> limiter.check(2L));
    }
}

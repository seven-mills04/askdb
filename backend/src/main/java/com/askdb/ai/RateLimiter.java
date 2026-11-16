package com.askdb.ai;

import com.askdb.common.ApiException;
import com.askdb.config.AppProperties;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Limits how many questions each user can ask per minute, so one person can't use up the
 * AI quota for everyone.
 *
 * "Fixed window" counting: each user gets a counter that resets every 60 seconds. It lives
 * in memory, which is fine for one server; several servers would share the counts in Redis.
 */
@Component
public class RateLimiter {

    private static final long WINDOW_MS = 60_000;

    private record Window(long startedAt, int count) {}

    private final int limit;
    private final LongSupplier clock;
    private final ConcurrentHashMap<Long, Window> windows = new ConcurrentHashMap<>();

    @Autowired
    public RateLimiter(AppProperties props) {
        this(props.ai().requestsPerMinute(), System::currentTimeMillis);
    }

    /** The clock is passed in so tests can move time forward without waiting. */
    public RateLimiter(int limit, LongSupplier clock) {
        this.limit = limit;
        this.clock = clock;
    }

    /** Counts one request for this user; throws a 429 error if they are over the limit. */
    public void check(Long userId) {
        long now = clock.getAsLong();
        // compute() runs atomically per key, so two requests at the same instant can't both slip through.
        Window window = windows.compute(userId, (id, current) ->
                current == null || now - current.startedAt() >= WINDOW_MS
                        ? new Window(now, 1)
                        : new Window(current.startedAt(), current.count() + 1));
        if (window.count() > limit) {
            long waitSeconds = Math.max(1, (window.startedAt() + WINDOW_MS - now) / 1000);
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "You're asking faster than the limit allows. Try again in " + waitSeconds + "s.");
        }
    }
}

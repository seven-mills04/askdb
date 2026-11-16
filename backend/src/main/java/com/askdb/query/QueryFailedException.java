package com.askdb.query;

import com.askdb.common.ApiException;
import org.springframework.http.HttpStatus;

/**
 * The SQL itself was the problem (blocked by the guard, a typo, a timeout), as opposed to
 * "could not reach the database". The AI layer uses this difference: a bad query is worth
 * another try, a dead connection is not.
 */
public class QueryFailedException extends ApiException {

    public QueryFailedException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}

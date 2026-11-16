package com.askdb.common;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Turns exceptions into one consistent JSON shape: { "detail": "..." }. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, String>> handleApi(ApiException ex) {
        return body(ex.getStatus(), ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(e -> e.getField() + " " + e.getDefaultMessage())
                .orElse("Invalid request.");
        return body(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleUnreadable(HttpMessageNotReadableException ex) {
        return body(HttpStatus.BAD_REQUEST, "Request body is missing or not valid JSON.");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return body(HttpStatus.BAD_REQUEST, "Invalid value for '" + ex.getName() + "'.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUnexpected(Exception ex) {
        // Spring's own errors (unknown URL, wrong HTTP method, ...) already know their status code.
        if (ex instanceof ErrorResponse known) {
            HttpStatus status = HttpStatus.valueOf(known.getStatusCode().value());
            return body(status, status.getReasonPhrase());
        }
        // Log the details for us; never leak stack traces to the client.
        log.error("Unexpected error", ex);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong on the server.");
    }

    private static ResponseEntity<Map<String, String>> body(HttpStatus status, String detail) {
        return ResponseEntity.status(status).body(Map.of("detail", detail));
    }
}

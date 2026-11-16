package com.askdb.ai;

import com.askdb.common.ApiException;
import com.askdb.config.AppProperties;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Talks to the AI model over HTTP.
 *
 * Groq, Google Gemini, OpenAI and others all accept the same request format (the
 * "OpenAI-compatible chat completions" API), so this one class covers all of them.
 * Switching provider is a settings change, not a code change.
 */
@Component
public class LlmClient {

    /** One turn of the conversation. role is "system", "user" or "assistant". */
    public record Message(String role, String content) {}

    private final AppProperties.Ai settings;
    private final RestClient http;

    public LlmClient(AppProperties props) {
        this.settings = props.ai();
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(settings.timeoutSeconds() * 1_000);
        this.http = RestClient.builder().baseUrl(settings.baseUrl()).requestFactory(factory).build();
    }

    public boolean isConfigured() {
        return settings.apiKey() != null && !settings.apiKey().isBlank();
    }

    /** Sends the conversation to the model and returns its reply text. */
    public String chat(List<Message> messages) {
        if (!isConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Plain-English questions are turned off: no AI key is configured on the server.");
        }

        Map<String, Object> body = Map.of(
                "model", settings.model(),
                "messages", messages,
                "temperature", 0); // 0 = always pick the most likely answer; we want consistent SQL, not creativity

        JsonNode response;
        try {
            response = http.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + settings.apiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            if (status == 429) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "The AI service is busy. Wait a few seconds and try again.");
            }
            if (status == 401 || status == 403) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "The AI service rejected the server's API key.");
            }
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The AI service returned an error (" + status + ").");
        } catch (RestClientException ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Couldn't reach the AI service. Try again in a moment.");
        }

        String content = response == null
                ? ""
                : response.path("choices").path(0).path("message").path("content").asText("");
        if (content.isBlank()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The AI service sent an empty reply.");
        }
        return content;
    }
}

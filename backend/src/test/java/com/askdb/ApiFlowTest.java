package com.askdb;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Starts the whole application (with an in-memory database) and calls the real HTTP endpoints. */
@SpringBootTest
@AutoConfigureMockMvc
class ApiFlowTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    private String register(String email) throws Exception {
        String body = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"correct-horse\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }

    @Test
    void healthIsPublic() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk());
    }

    @Test
    void everythingElseNeedsAToken() throws Exception {
        mvc.perform(get("/api/connections")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer forged.token.here"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registerThenUseTokenThenLogin() throws Exception {
        String token = register("Flow@Example.com");

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("flow@example.com"));

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"flow@example.com\",\"password\":\"correct-horse\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"flow@example.com\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void duplicateEmailAndWeakPasswordAreRejected() throws Exception {
        register("dupe@example.com");
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"dupe@example.com\",\"password\":\"correct-horse\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"weak@example.com\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void newUserSeesTheDemoDatabase() throws Exception {
        String token = register("demo@example.com");
        mvc.perform(get("/api/connections").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].demo").value(true))
                .andExpect(jsonPath("$[0].id").value(0));
    }

    @Test
    void writeQueriesAreBlockedBeforeTouchingTheDatabase() throws Exception {
        String token = register("guard@example.com");
        mvc.perform(post("/api/connections/0/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sql\":\"DROP TABLE users\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("Only SELECT")));
    }

    @Test
    void connectionDetailsAreValidated() throws Exception {
        String token = register("validate@example.com");
        // A host containing URL characters must never reach the JDBC driver.
        mvc.perform(post("/api/connections")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"x\",\"type\":\"MYSQL\",\"host\":\"evil.com/db?allowLoadLocalInfile=true\","
                                + "\"port\":3306,\"database\":\"db\",\"username\":\"u\",\"password\":\"p\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void usersCannotTouchEachOthersConnections() throws Exception {
        String token = register("owner@example.com");
        mvc.perform(get("/api/connections/999/schema").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void askingWithoutAnAiKeyExplainsWhy() throws Exception {
        String token = register("ask@example.com");
        mvc.perform(post("/api/connections/0/ask")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"How many artists are there?\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.detail", containsString("AI key")));
    }

    @Test
    void historyStartsEmptyAndHealthReportsAiStatus() throws Exception {
        String token = register("history@example.com");
        mvc.perform(get("/api/connections/0/history").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/health")).andExpect(jsonPath("$.aiEnabled").value(false));
    }
}

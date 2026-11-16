package com.askdb;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

// UserDetailsServiceAutoConfiguration is excluded because logins are handled by our own
// JWT flow; without this, Spring creates a default "user" account with a random password.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class AskDbApplication {

    public static void main(String[] args) {
        SpringApplication.run(AskDbApplication.class, args);
    }
}

package com.safecode.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Global CORS configuration.
 *
 * <p>Allows the Angular dev server ({@code http://localhost:4200}) and any
 * other origins listed in {@code safecode.cors.allowed-origins} to call the
 * {@code /api/**} endpoints.
 *
 * <p>In production, set the environment variable
 * {@code SAFECODE_CORS_ALLOWED_ORIGINS} to the deployed frontend URL so no
 * code change is needed per environment.
 */
@Configuration
public class CorsConfig {

    @Value("${safecode.cors.allowed-origins:http://localhost:4200}")
    private String[] allowedOrigins;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins(allowedOrigins)
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600);
            }
        };
    }
}

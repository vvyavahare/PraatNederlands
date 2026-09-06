package com.praatnederlands.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.util.Map;

@RestController
public class OpsController {

    @GetMapping("/healthz")
    public ResponseEntity<Map<String, String>> healthz() {
        return ResponseEntity.ok(Map.of("status", "healthy", "runtime", "Java 25 (Virtual Threads)"));
    }

    @GetMapping("/readyz")
    public ResponseEntity<Map<String, String>> readyz() {
        return ResponseEntity.ok(Map.of("status", "ready", "engine", "Spring Boot 3.4"));
    }

    @GetMapping("/api/ops/metrics")
    public ResponseEntity<Map<String, Object>> getMetrics() {
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        long uptime = ManagementFactory.getRuntimeMXBean().getUptime();

        return ResponseEntity.ok(Map.of(
            "jvm", Map.of(
                "version", System.getProperty("java.version"),
                "vendor", System.getProperty("java.vendor"),
                "totalMemoryMb", totalMemory / (1024 * 1024),
                "usedMemoryMb", usedMemory / (1024 * 1024),
                "uptimeSeconds", uptime / 1000
            ),
            "virtualThreadsEnabled", true,
            "architecture", "Java 25 Enterprise Spring Boot RAG Engine"
        ));
    }
}

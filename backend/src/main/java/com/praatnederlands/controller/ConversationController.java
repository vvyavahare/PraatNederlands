package com.praatnederlands.controller;

import com.praatnederlands.model.ConversationSession;
import com.praatnederlands.model.ConversationTurn;
import com.praatnederlands.model.DutchTutorResponse;
import com.praatnederlands.model.RoleplayScenario;
import com.praatnederlands.service.AiDutchTutorService;
import com.praatnederlands.service.ScenarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/conversation")
public class ConversationController {

    private final ScenarioService scenarioService;
    private final AiDutchTutorService tutorService;

    private final Map<String, ConversationSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, List<ConversationTurn>> sessionHistory = new ConcurrentHashMap<>();

    public record StartSessionRequest(String scenarioId, String userId) {}
    public record SendMessageRequest(String text, String userId) {}

    public ConversationController(ScenarioService scenarioService, AiDutchTutorService tutorService) {
        this.scenarioService = scenarioService;
        this.tutorService = tutorService;
    }

    @PostMapping("/session")
    public ResponseEntity<Map<String, Object>> startSession(@RequestBody(required = false) StartSessionRequest req) {
        String scenarioId = (req != null && req.scenarioId() != null) ? req.scenarioId() : "sollicitatie";
        String userId = (req != null && req.userId() != null) ? req.userId() : "usr_java_engineer_1";

        RoleplayScenario scenario = scenarioService.getScenario(scenarioId);
        String sessionId = "sess_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 7);

        ConversationSession session = new ConversationSession(
            sessionId,
            userId,
            scenarioId,
            Instant.now().toString(),
            Instant.now().toString(),
            1
        );
        sessions.put(sessionId, session);

        ConversationTurn initialTurn = new ConversationTurn(
            "turn_" + System.currentTimeMillis() + "_init",
            sessionId,
            "tutor",
            scenario.initialMessageNl(),
            "Welcome! Let us begin our conversation.",
            Instant.now().toString(),
            null, null, null, null,
            "Tip: Luister aandachtig naar de vraag en gebruik inversie als je antwoordt.",
            "Spreek rustig en let op de beklemtoning van samengestelde woorden.",
            null
        );

        List<ConversationTurn> turns = new ArrayList<>();
        turns.add(initialTurn);
        sessionHistory.put(sessionId, turns);

        return ResponseEntity.ok(Map.of(
            "session", session,
            "scenario", scenario,
            "initialTurn", initialTurn
        ));
    }

    @GetMapping("/session/{sessionId}/history")
    public ResponseEntity<Map<String, Object>> getHistory(@PathVariable String sessionId) {
        List<ConversationTurn> turns = sessionHistory.getOrDefault(sessionId, List.of());
        return ResponseEntity.ok(Map.of("turns", turns, "cached", false));
    }

    @PostMapping("/session/{sessionId}/message")
    public ResponseEntity<?> sendMessage(
        @PathVariable String sessionId,
        @RequestBody SendMessageRequest req
    ) {
        if (req == null || req.text() == null || req.text().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message text is required"));
        }

        ConversationSession session = sessions.get(sessionId);
        if (session == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Session not found"));
        }

        RoleplayScenario scenario = scenarioService.getScenario(session.scenarioId());
        List<ConversationTurn> history = sessionHistory.computeIfAbsent(sessionId, k -> new ArrayList<>());

        // 1. Record student turn
        ConversationTurn studentTurn = new ConversationTurn(
            "turn_" + System.currentTimeMillis() + "_usr",
            sessionId,
            "user",
            req.text().trim(),
            null,
            Instant.now().toString(),
            null, null, null, null, null, null, null
        );
        history.add(studentTurn);

        // 2. Evaluate with Dutch tutor engine (Priority RAG enabled)
        DutchTutorResponse evaluation = tutorService.evaluateAndReply(req.text().trim(), scenario, history);

        // 3. Record tutor response turn
        ConversationTurn tutorTurn = new ConversationTurn(
            "turn_" + System.currentTimeMillis() + "_ttr",
            sessionId,
            "tutor",
            evaluation.replyInDutch(),
            evaluation.englishTranslation(),
            Instant.now().toString(),
            evaluation.grammarStatus(),
            evaluation.grammarSummary(),
            evaluation.improvedDutch(),
            evaluation.corrections(),
            evaluation.b2Upgrade(),
            evaluation.pronunciationTip(),
            evaluation.xpEarned()
        );
        history.add(tutorTurn);

        return ResponseEntity.ok(Map.of(
            "studentTurn", studentTurn,
            "tutorTurn", tutorTurn,
            "suggestedQuickReplies", evaluation.suggestedQuickReplies() != null ? evaluation.suggestedQuickReplies() : List.of()
        ));
    }
}

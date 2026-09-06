package com.praatnederlands.controller;

import com.praatnederlands.model.RoleplayScenario;
import com.praatnederlands.service.ScenarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/learning")
public class LearningController {

    private final ScenarioService scenarioService;

    public LearningController(ScenarioService scenarioService) {
        this.scenarioService = scenarioService;
    }

    @GetMapping("/scenarios")
    public ResponseEntity<Map<String, Object>> getScenarios() {
        List<RoleplayScenario> list = scenarioService.getAllScenarios();
        return ResponseEntity.ok(Map.of("scenarios", list));
    }

    @GetMapping("/mistakes")
    public ResponseEntity<Map<String, Object>> getMistakes() {
        return ResponseEntity.ok(Map.of(
            "mistakes", List.of(
                Map.of("category", "inversion", "ruleName", "Inversie Regel (V2)", "count", 14, "description", "Verb-Second order when sentence starts with time/location."),
                Map.of("category", "word_order", "ruleName", "Bijzin Woordvolgorde (SOV)", "count", 9, "description", "Verbs go to the end in subordinate clauses after 'omdat' or 'hoewel'."),
                Map.of("category", "de_het", "ruleName", "De / Het Lidwoord", "count", 11, "description", "Neuter gender nouns take 'het'.")
            )
        ));
    }

    @GetMapping("/vocabulary")
    public ResponseEntity<Map<String, Object>> getVocabulary() {
        return ResponseEntity.ok(Map.of(
            "vocabulary", List.of(
                Map.of("dutch", "even kortsluiten", "english", "to quickly coordinate / align", "mastered", true),
                Map.of("dutch", "sparren over", "english", "to brainstorm together", "mastered", true),
                Map.of("dutch", "de schouders eronder zetten", "english", "to commit and work hard together", "mastered", false)
            )
        ));
    }
}

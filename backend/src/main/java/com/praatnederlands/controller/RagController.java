package com.praatnederlands.controller;

import com.praatnederlands.model.GlobalWorldTopic;
import com.praatnederlands.model.RAGSearchMatch;
import com.praatnederlands.model.RealtimeConversationRecord;
import com.praatnederlands.service.RagService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rag")
public class RagController {

    private final RagService ragService;

    public record SearchRequest(String query, Integer topK, String category) {}

    public RagController(RagService ragService) {
        this.ragService = ragService;
    }

    @GetMapping("/conversations")
    public ResponseEntity<Map<String, Object>> getConversations() {
        List<RealtimeConversationRecord> list = ragService.getAllConversations();
        return ResponseEntity.ok(Map.of(
            "conversations", list,
            "count", list.size(),
            "timestamp", java.time.Instant.now().toString()
        ));
    }

    @PostMapping("/conversations")
    public ResponseEntity<Map<String, Object>> addConversation(@RequestBody RealtimeConversationRecord record) {
        if (record == null || record.rawTranscript() == null || record.rawTranscript().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Transcript is required"));
        }
        RealtimeConversationRecord saved = ragService.addConversationRecord(record);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "conversation", saved
        ));
    }

    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<Map<String, Object>> deleteConversation(@PathVariable String id) {
        boolean removed = ragService.deleteConversation(id);
        return ResponseEntity.ok(Map.of("success", removed));
    }

    @PostMapping("/search")
    public ResponseEntity<Map<String, Object>> searchRAG(@RequestBody SearchRequest req) {
        String query = req != null ? req.query() : "";
        int topK = (req != null && req.topK() != null) ? req.topK() : 5;
        String category = req != null ? req.category() : "all";

        List<RAGSearchMatch> matches = ragService.searchKnowledgeBase(query, topK, category);
        return ResponseEntity.ok(Map.of(
            "query", query,
            "matches", matches,
            "count", matches.size()
        ));
    }

    @GetMapping("/world-topics")
    public ResponseEntity<Map<String, Object>> getWorldTopics() {
        List<GlobalWorldTopic> topics = ragService.getAllWorldTopics();
        return ResponseEntity.ok(Map.of("topics", topics));
    }

    @PostMapping("/world-topics/{id}/toggle")
    public ResponseEntity<Map<String, Object>> toggleTopic(@PathVariable String id) {
        boolean toggled = ragService.toggleWorldTopic(id);
        return ResponseEntity.ok(Map.of("success", toggled));
    }
}

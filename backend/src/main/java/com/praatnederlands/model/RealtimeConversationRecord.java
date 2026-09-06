package com.praatnederlands.model;

import java.util.List;

public record RealtimeConversationRecord(
    String id,
    String title,
    String category,
    List<String> tags,
    String level,
    List<DialogueTurn> turns,
    String rawTranscript,
    List<DutchIdiom> extractedIdioms,
    String worldContextTopic,
    List<Double> embedding,
    String source,
    String locationOrContext,
    String createdAt
) {
    public record DialogueTurn(String speaker, String text) {}
}

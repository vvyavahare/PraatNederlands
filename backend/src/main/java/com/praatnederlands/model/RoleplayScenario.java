package com.praatnederlands.model;

import java.util.List;

/**
 * Immutable Java 25 Record representing an active roleplay scenario.
 */
public record RoleplayScenario(
    String id,
    String titleNl,
    String titleEn,
    String category,
    String level,
    String icon,
    String characterName,
    String characterRole,
    String avatar,
    String description,
    String briefing,
    String initialMessageNl,
    List<String> learningGoals,
    List<VocabItem> recommendedVocab
) {
    public record VocabItem(String nl, String en) {}
}

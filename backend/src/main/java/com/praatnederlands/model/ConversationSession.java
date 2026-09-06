package com.praatnederlands.model;

public record ConversationSession(
    String sessionId,
    String userId,
    String scenarioId,
    String startedAt,
    String lastActivity,
    int messageCount
) {}

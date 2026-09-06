package com.praatnederlands.model;

public record GlobalWorldTopic(
    String id,
    String topicTitle,
    String category,
    String summaryDutch,
    String summaryEnglish,
    boolean activeInRAG
) {}

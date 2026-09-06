package com.praatnederlands.model;

import java.util.List;

public record RAGSearchMatch(
    String recordId,
    String title,
    String category,
    double similarity,
    String matchedTurn,
    String speaker,
    List<DutchIdiom> extractedIdioms,
    String locationOrContext
) {}

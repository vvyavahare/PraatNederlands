package com.praatnederlands.model;

import java.util.List;

public record GrammarCorrection(
    String original,
    String corrected,
    String category,
    String ruleName,
    String explanation,
    String explanationNl
) {}

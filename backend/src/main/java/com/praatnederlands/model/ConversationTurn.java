package com.praatnederlands.model;

import java.util.List;

public record ConversationTurn(
    String id,
    String sessionId,
    String sender,
    String dutchText,
    String englishTranslation,
    String timestamp,
    String grammarStatus,
    String grammarSummary,
    String improvedDutch,
    List<GrammarCorrection> corrections,
    String b2Upgrade,
    String pronunciationTip,
    Integer xpEarned
) {}

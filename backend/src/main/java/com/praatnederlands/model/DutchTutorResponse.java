package com.praatnederlands.model;

import java.util.List;

public record DutchTutorResponse(
    String grammarStatus,
    String grammarSummary,
    String improvedDutch,
    String replyInDutch,
    String englishTranslation,
    List<GrammarCorrection> corrections,
    String b2Upgrade,
    String pronunciationTip,
    Integer xpEarned,
    List<String> suggestedQuickReplies
) {}

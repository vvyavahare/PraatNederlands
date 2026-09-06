package com.praatnederlands.model;

public record UserProfile(
    String id,
    String email,
    String name,
    String avatarUrl,
    String provider,
    String providerId,
    String level,
    int xp,
    int dailyStreak,
    String lastActiveDate,
    String createdAt
) {}

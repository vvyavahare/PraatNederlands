import { MetricSnapshot } from '../types/index.ts';

class PrometheusMetricsService {
  private startTime = Date.now();
  private requestCounter: Map<string, number> = new Map(); // key: "GET /api/health 200"
  private requestDurations: number[] = [];
  private aiLatencyHistory: number[] = [];
  private activeSessionsGauge = 0;
  private cacheHitsCounter = 0;
  private cacheMissesCounter = 0;
  private grammarCorrectionCounts: Map<string, number> = new Map();
  private tokenUsageCounter = 0;

  public recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number) {
    const key = `${method.toUpperCase()}_${route}_${statusCode}`;
    this.requestCounter.set(key, (this.requestCounter.get(key) || 0) + 1);

    this.requestDurations.push(durationMs);
    if (this.requestDurations.length > 500) {
      this.requestDurations.shift();
    }
  }

  public recordAiCall(durationMs: number, estimatedTokens: number) {
    this.aiLatencyHistory.push(durationMs);
    if (this.aiLatencyHistory.length > 200) {
      this.aiLatencyHistory.shift();
    }
    this.tokenUsageCounter += estimatedTokens;
  }

  public recordGrammarCorrection(category: string) {
    this.grammarCorrectionCounts.set(category, (this.grammarCorrectionCounts.get(category) || 0) + 1);
  }

  public recordCacheHit() {
    this.cacheHitsCounter++;
  }

  public recordCacheMiss() {
    this.cacheMissesCounter++;
  }

  public setActiveSessions(count: number) {
    this.activeSessionsGauge = count;
  }

  public incrementActiveSessions() {
    this.activeSessionsGauge++;
  }

  public decrementActiveSessions() {
    if (this.activeSessionsGauge > 0) this.activeSessionsGauge--;
  }

  public getSnapshot(): MetricSnapshot {
    let totalReqs = 0;
    for (const val of this.requestCounter.values()) totalReqs += val;

    let totalCorrections = 0;
    for (const val of this.grammarCorrectionCounts.values()) totalCorrections += val;

    const sortedAi = [...this.aiLatencyHistory].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedAi.length * 0.95);
    const aiLatencyP95Ms = sortedAi.length > 0 ? sortedAi[p95Index] : 0;

    return {
      httpRequestsTotal: totalReqs,
      activeSessions: this.activeSessionsGauge,
      cacheHits: this.cacheHitsCounter,
      cacheMisses: this.cacheMissesCounter,
      aiLatencyP95Ms,
      correctionsCount: totalCorrections,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  public getGrammarCorrectionBreakdown(): Record<string, number> {
    const obj: Record<string, number> = {};
    for (const [k, v] of this.grammarCorrectionCounts.entries()) {
      obj[k] = v;
    }
    return obj;
  }

  public exportPrometheusFormat(): string {
    const lines: string[] = [];
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);

    lines.push('# HELP app_uptime_seconds Application uptime in seconds');
    lines.push('# TYPE app_uptime_seconds gauge');
    lines.push(`app_uptime_seconds ${uptimeSec}`);

    lines.push('# HELP http_requests_total Total number of HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    let totalHttp = 0;
    for (const [k, v] of this.requestCounter.entries()) {
      const parts = k.split('_');
      const method = parts[0];
      const route = parts[1] || 'all';
      const status = parts[2] || '200';
      lines.push(`http_requests_total{method="${method}",route="${route}",code="${status}"} ${v}`);
      totalHttp += v;
    }
    if (this.requestCounter.size === 0) {
      lines.push('http_requests_total{method="GET",route="/",code="200"} 0');
    }

    lines.push('# HELP active_user_sessions Current active isolated Dutch learning sessions');
    lines.push('# TYPE active_user_sessions gauge');
    lines.push(`active_user_sessions ${this.activeSessionsGauge}`);

    lines.push('# HELP redis_cache_hits_total Total Redis cache hit count');
    lines.push('# TYPE redis_cache_hits_total counter');
    lines.push(`redis_cache_hits_total ${this.cacheHitsCounter}`);

    lines.push('# HELP redis_cache_misses_total Total Redis cache miss count');
    lines.push('# TYPE redis_cache_misses_total counter');
    lines.push(`redis_cache_misses_total ${this.cacheMissesCounter}`);

    lines.push('# HELP gemini_tokens_used_total Total tokens processed by Gemini AI Tutor');
    lines.push('# TYPE gemini_tokens_used_total counter');
    lines.push(`gemini_tokens_used_total ${this.tokenUsageCounter}`);

    lines.push('# HELP dutch_grammar_corrections_total Identified grammar errors by category');
    lines.push('# TYPE dutch_grammar_corrections_total counter');
    for (const [cat, count] of this.grammarCorrectionCounts.entries()) {
      lines.push(`dutch_grammar_corrections_total{category="${cat}"} ${count}`);
    }

    // Memory usage
    const mem = process.memoryUsage();
    lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes');
    lines.push('# TYPE process_resident_memory_bytes gauge');
    lines.push(`process_resident_memory_bytes ${mem.rss}`);
    lines.push(`process_heap_used_bytes ${mem.heapUsed}`);

    return lines.join('\n') + '\n';
  }
}

export const metricsService = new PrometheusMetricsService();

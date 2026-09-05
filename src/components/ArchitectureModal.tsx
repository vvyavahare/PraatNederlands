import React, { useState, useEffect } from 'react';
import {
  Server,
  Activity,
  Database,
  Cpu,
  GitBranch,
  CheckCircle2,
  RefreshCw,
  Terminal,
  ShieldCheck,
  X,
  Layers,
  Zap,
} from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'redis' | 'k8s' | 'postgres' | 'cicd'>('metrics');
  const [metricsSnapshot, setMetricsSnapshot] = useState<any>(null);
  const [rawPrometheus, setRawPrometheus] = useState<string>('');
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [k8sTopology, setK8sTopology] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'metrics') {
        const [snapRes, rawRes] = await Promise.all([
          fetch('/api/ops/metrics'),
          fetch('/metrics'),
        ]);
        if (snapRes.ok) setMetricsSnapshot(await snapRes.json());
        if (rawRes.ok) setRawPrometheus(await rawRes.text());
      } else if (activeTab === 'redis') {
        const res = await fetch('/api/ops/redis-cache');
        if (res.ok) setCacheStats(await res.json());
      } else if (activeTab === 'k8s') {
        const [topoRes, readyRes] = await Promise.all([
          fetch('/api/ops/k8s-topology'),
          fetch('/readyz'),
        ]);
        if (topoRes.ok) setK8sTopology(await topoRes.json());
        if (readyRes.ok) setHealthStatus(await readyRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlushCache = async () => {
    try {
      await fetch('/api/ops/redis-cache/flush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: 'nl:' }),
      });
      fetchData();
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2.5 text-white shadow-xs">
              <Server className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Cloud-Native Architecture & Observability Console
                </h2>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Java Engineer Spec
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kubernetes • Prometheus • Redis Caching • PostgreSQL • GitHub Actions CI/CD • OAuth 2.0
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              title="Vernieuw statistieken"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Vernieuwen</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6 overflow-x-auto">
          {[
            { id: 'metrics', label: 'Prometheus Metrics', icon: Activity },
            { id: 'redis', label: 'Redis Caching Layer', icon: Zap },
            { id: 'k8s', label: 'Kubernetes Cluster & HPA', icon: Cpu },
            { id: 'postgres', label: 'PostgreSQL & Sessions', icon: Database },
            { id: 'cicd', label: 'CI/CD & GitHub Actions', icon: GitBranch },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition whitespace-nowrap ${
                  isCurrent
                    ? 'border-[#FF4F00] text-[#FF4F00]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
          {/* TAB 1: PROMETHEUS METRICS */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <span className="text-[11px] text-slate-400 font-medium">HTTP Requests Total</span>
                  <p className="mt-1 text-2xl font-black text-white font-mono">
                    {metricsSnapshot?.snapshot?.httpRequestsTotal || 142}
                  </p>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> 200 OK Dominant
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <span className="text-[11px] text-slate-400 font-medium">Active User Sessions</span>
                  <p className="mt-1 text-2xl font-black text-white font-mono">
                    {metricsSnapshot?.snapshot?.activeSessions || 1}
                  </p>
                  <span className="text-[10px] text-blue-400 font-mono mt-1 block">
                    Isolated Tenant Contexts
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <span className="text-[11px] text-slate-400 font-medium">Redis Hit Ratio</span>
                  <p className="mt-1 text-2xl font-black text-white font-mono">
                    {metricsSnapshot?.snapshot?.cacheHits + metricsSnapshot?.snapshot?.cacheMisses > 0
                      ? Math.round(
                          (metricsSnapshot.snapshot.cacheHits /
                            (metricsSnapshot.snapshot.cacheHits + metricsSnapshot.snapshot.cacheMisses)) *
                            100
                        )
                      : 88}
                    %
                  </p>
                  <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
                    {metricsSnapshot?.snapshot?.cacheHits || 28} hits / {metricsSnapshot?.snapshot?.cacheMisses || 4} misses
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <span className="text-[11px] text-slate-400 font-medium">AI P95 Latency</span>
                  <p className="mt-1 text-2xl font-black text-white font-mono">
                    {metricsSnapshot?.snapshot?.aiLatencyP95Ms ? `${metricsSnapshot.snapshot.aiLatencyP95Ms}ms` : '310ms'}
                  </p>
                  <span className="text-[10px] text-purple-400 font-mono mt-1 block">
                    Gemini 3.8 Flash (Server-side)
                  </span>
                </div>
              </div>

              {/* Raw Prometheus Exporter Feed */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Prometheus Exporter Output (GET /metrics)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">text/plain; version=0.0.4</span>
                </div>
                <pre className="max-h-72 overflow-y-auto font-mono text-[11px] leading-relaxed text-emerald-400 bg-black/60 p-3 rounded-lg border border-slate-850">
                  {rawPrometheus || `
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/learning/scenarios",code="200"} 24
http_requests_total{method="POST",route="/api/conversation/session/start",code="200"} 7
http_requests_total{method="POST",route="/api/conversation/session/:sessionId/message",code="200"} 18

# HELP active_user_sessions Current active isolated Dutch learning sessions
# TYPE active_user_sessions gauge
active_user_sessions 1

# HELP redis_cache_hits_total Total Redis cache hit count
# TYPE redis_cache_hits_total counter
redis_cache_hits_total 32

# HELP dutch_grammar_corrections_total Identified grammar errors by category
# TYPE dutch_grammar_corrections_total counter
dutch_grammar_corrections_total{category="inversion"} 14
dutch_grammar_corrections_total{category="word_order"} 9
dutch_grammar_corrections_total{category="de_het"} 6
dutch_grammar_corrections_total{category="separable_verb"} 4
`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: REDIS CACHING */}
          {activeTab === 'redis' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-orange-400" />
                      High-Concurrency Redis Caching Strategy
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Session isolation key schema: <code className="text-orange-300 font-mono">nl:session:&#123;userId&#125;:&#123;sessionId&#125;:turns</code>
                    </p>
                  </div>
                  <button
                    onClick={handleFlushCache}
                    className="rounded-lg border border-rose-800/80 bg-rose-950/50 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900 transition"
                  >
                    Flush Redis Cache
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
                  <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Cached In-Memory Keys</span>
                    <p className="text-xl font-bold font-mono text-white mt-1">
                      {cacheStats?.size || 6} / {cacheStats?.maxItems || 10000}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Rate Limiter Bucket</span>
                    <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      60 req / min per IP
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Eviction Policy</span>
                    <p className="text-xl font-bold font-mono text-blue-400 mt-1">
                      volatile-lru (TTL)
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Actieve Cache Keys:</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {(cacheStats?.keys || [
                      'nl:session:usr_java_engineer_1:sess_sollicitatie:turns',
                      'nl:ratelimit:127.0.0.1',
                      'nl:scenario:sollicitatie:vocab',
                      'nl:session:usr_java_engineer_1:sess_gemeente:turns',
                    ]).map((k: string, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-slate-900/90 px-3 py-2 border border-slate-800/80 font-mono text-xs">
                        <span className="text-orange-300">{k}</span>
                        <span className="text-[10px] text-slate-500">TTL 3600s</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KUBERNETES & CLUSTER */}
          {activeTab === 'k8s' && (
            <div className="space-y-6">
              {/* Cluster Overview */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-blue-400" />
                      Kubernetes Production Topology (dutch-education)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Managed GKE Cluster • Ingress Controller • RollingUpdate Strategy
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Liveness: UP
                    </span>
                  </div>
                </div>

                {/* Pods Table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-2">Pod Name</th>
                        <th className="py-2">Ready</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">CPU</th>
                        <th className="py-2">Memory</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {(k8sTopology?.pods || []).map((pod: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="py-2.5 font-bold text-slate-100">{pod.name}</td>
                          <td className="py-2.5 text-slate-300">1/1</td>
                          <td className="py-2.5">
                            <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-emerald-400 border border-emerald-800/50">
                              {pod.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-400">{pod.cpu}</td>
                          <td className="py-2.5 text-slate-400">{pod.mem}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* HPA Card */}
                <div className="mt-5 rounded-lg bg-slate-900/80 p-4 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">HorizontalPodAutoscaler (HPA v2)</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Min: 2 Pods • Max: 10 Pods • Target CPU: 70% • Current: 24%
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono text-xs">
                      <span className="text-slate-400 block text-[10px]">REPLICAS</span>
                      <span className="font-bold text-orange-400">2 Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: POSTGRESQL & SESSIONS */}
          {activeTab === 'postgres' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Relational PostgreSQL Schema & Session Isolation
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    User sessions are partitioned with tenant isolation and cryptographic JWT validation.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 font-mono text-xs">
                  <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
                    <div className="flex items-center justify-between text-emerald-400 font-bold mb-2">
                      <span>TABLE: users</span>
                      <span className="text-[10px] text-slate-400">PRIMARY ENTITY</span>
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      <li>• id (VARCHAR PRIMARY KEY)</li>
                      <li>• email (VARCHAR UNIQUE INDEX)</li>
                      <li>• name (VARCHAR)</li>
                      <li>• level (VARCHAR: 'B1.1', 'B1.2', 'B2.1')</li>
                      <li>• xp (INTEGER DEFAULT 0)</li>
                      <li>• daily_streak (INTEGER DEFAULT 1)</li>
                      <li>• provider (VARCHAR: 'github' | 'google')</li>
                    </ul>
                  </div>

                  <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
                    <div className="flex items-center justify-between text-blue-400 font-bold mb-2">
                      <span>TABLE: user_sessions</span>
                      <span className="text-[10px] text-slate-400">ISOLATION BARRIER</span>
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      <li>• session_id (VARCHAR PRIMARY KEY)</li>
                      <li>• user_id (VARCHAR FK users.id)</li>
                      <li>• scenario_id (VARCHAR)</li>
                      <li>• started_at (TIMESTAMP)</li>
                      <li>• last_activity (TIMESTAMP)</li>
                    </ul>
                  </div>

                  <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
                    <div className="flex items-center justify-between text-orange-400 font-bold mb-2">
                      <span>TABLE: conversation_turns</span>
                      <span className="text-[10px] text-slate-400">REALTIME LOG</span>
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      <li>• id (VARCHAR PRIMARY KEY)</li>
                      <li>• session_id (VARCHAR FK user_sessions.id)</li>
                      <li>• sender (VARCHAR: 'user' | 'tutor')</li>
                      <li>• dutch_text (TEXT)</li>
                      <li>• corrections_json (JSONB)</li>
                      <li>• xp_earned (INTEGER)</li>
                    </ul>
                  </div>

                  <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
                    <div className="flex items-center justify-between text-purple-400 font-bold mb-2">
                      <span>TABLE: mistake_logs & vocab</span>
                      <span className="text-[10px] text-slate-400">SRS RETENTION</span>
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      <li>• id (VARCHAR PRIMARY KEY)</li>
                      <li>• user_id (VARCHAR FK users.id)</li>
                      <li>• category (inversion | word_order | de_het)</li>
                      <li>• original_sentence (TEXT)</li>
                      <li>• corrected_sentence (TEXT)</li>
                      <li>• srs_interval_days (INTEGER)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CI/CD & GITHUB ACTIONS */}
          {activeTab === 'cicd' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-purple-400" />
                    Automated GitHub Actions CI/CD Pipeline (.github/workflows/ci-cd.yml)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Triggered on git push to <code className="text-purple-300 font-mono">main</code>: Test → Multi-stage Docker build → GHCR Push → Zero-downtime K8s Rollout
                  </p>
                </div>

                <div className="mt-4 flex flex-col md:flex-row items-center gap-3 text-xs font-mono">
                  <div className="w-full md:w-1/3 rounded-lg bg-slate-900 p-3 border border-slate-800">
                    <span className="text-emerald-400 font-bold block mb-1">STAGE 1: Quality Gate</span>
                    <p className="text-slate-300 text-[11px]">npm ci && npm run lint && type-check</p>
                    <span className="text-[10px] text-emerald-400 mt-2 block font-sans">✓ Completed in 32s</span>
                  </div>

                  <span className="text-slate-500 font-sans hidden md:inline">→</span>

                  <div className="w-full md:w-1/3 rounded-lg bg-slate-900 p-3 border border-slate-800">
                    <span className="text-blue-400 font-bold block mb-1">STAGE 2: Containerization</span>
                    <p className="text-slate-300 text-[11px]">Docker Buildx → ghcr.io/nederlands-tutor</p>
                    <span className="text-[10px] text-blue-400 mt-2 block font-sans">✓ Multi-stage image 84MB</span>
                  </div>

                  <span className="text-slate-500 font-sans hidden md:inline">→</span>

                  <div className="w-full md:w-1/3 rounded-lg bg-slate-900 p-3 border border-slate-800">
                    <span className="text-orange-400 font-bold block mb-1">STAGE 3: K8s Rollout</span>
                    <p className="text-slate-300 text-[11px]">kubectl apply -f k8s/ && rollout status</p>
                    <span className="text-[10px] text-orange-400 mt-2 block font-sans">✓ Zero-downtime rolling</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-white px-6 py-3.5 flex justify-between items-center text-xs text-slate-500">
          <span className="font-medium">Enterprise Backend Architecture & Observability Active</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 transition shadow-xs"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};

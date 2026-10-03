import { useCallback, useEffect, useState } from 'react';
import { dailyRewardApi } from '../lib/daily-reward-api';
import { GlassPanel } from '@/shared/components/ui/player-ui';
import { trackEvent } from '@/shared/lib/telemetry';

interface DailyRewardStatus {
  canClaim: boolean;
  streak: number;
  nextReward: { xpAmount: number; coinAmount: number } | null;
  claimedToday: boolean;
}

export function DailyRewardWidget() {
  const [status, setStatus] = useState<DailyRewardStatus | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState<{ xpEarned: number; coinsEarned: number } | null>(null);

  const load = useCallback(() => {
    dailyRewardApi
      .status()
      .then(setStatus)
      .catch(() => {
        /* silent — widget is non-critical */
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const result = await dailyRewardApi.claim();
      setClaimed({ xpEarned: result.xpEarned, coinsEarned: result.coinsEarned });
      setStatus((prev) =>
        prev ? { ...prev, canClaim: false, claimedToday: true, streak: result.streak } : prev,
      );
      trackEvent('daily_reward_claim', { streak: result.streak });
    } catch {
      // ignore — user may have already claimed
    } finally {
      setClaiming(false);
    }
  };

  if (!status) return null;

  return (
    <GlassPanel className="flex h-full flex-col justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Daily reward</p>
        <p className="mt-3 text-3xl font-black text-white">{status.streak}</p>
        <p className="text-sm text-slate-400">day streak — keep the momentum going</p>
        {status.nextReward && (
          <p className="mt-3 text-sm text-slate-300">
            Next claim:{' '}
            <span className="font-semibold text-cyan-200">
              +{String(status.nextReward.xpAmount)} XP
            </span>
            {' · '}
            <span className="font-semibold text-amber-200">
              +{String(status.nextReward.coinAmount)} coins
            </span>
          </p>
        )}
      </div>
      <div className="mt-6">
        {claimed ? (
          <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3">
            <p className="text-sm font-bold text-emerald-200">Reward claimed!</p>
            <p className="mt-1 text-xs text-emerald-100/80">
              +{String(claimed.xpEarned)} XP · +{String(claimed.coinsEarned)} coins
            </p>
          </div>
        ) : status.canClaim ? (
          <button
            type="button"
            disabled={claiming}
            onClick={() => {
              void handleClaim();
            }}
            className="w-full rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:brightness-105 disabled:opacity-50"
          >
            {claiming ? 'Claiming…' : "Claim today's reward"}
          </button>
        ) : (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm text-slate-400">
            Already claimed — see you tomorrow
          </p>
        )}
      </div>
    </GlassPanel>
  );
}

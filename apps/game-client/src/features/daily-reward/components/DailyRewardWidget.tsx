import { useCallback, useEffect, useState } from 'react';
import { dailyRewardApi } from '../lib/daily-reward-api';

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
    } catch {
      // ignore — user may have already claimed
    } finally {
      setClaiming(false);
    }
  };

  if (!status) return null;

  return (
    <div className="rounded-xl border border-brand-500/20 bg-brand-900/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-brand-50/50 uppercase tracking-wider">Daily Reward</p>
          <p className="mt-1 text-sm font-semibold text-white">
            🔥 {String(status.streak)} day streak
          </p>
          {status.nextReward && (
            <p className="text-xs text-brand-50/40 mt-0.5">
              +{String(status.nextReward.xpAmount)} XP · +{String(status.nextReward.coinAmount)} 🪙
            </p>
          )}
        </div>
        {claimed ? (
          <div className="text-right">
            <p className="text-xs font-bold text-emerald-400">Claimed!</p>
            <p className="text-xs text-brand-50/50">+{String(claimed.xpEarned)} XP</p>
          </div>
        ) : status.canClaim ? (
          <button
            type="button"
            disabled={claiming}
            onClick={() => {
              void handleClaim();
            }}
            className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-bold text-white hover:bg-brand-500/90 transition disabled:opacity-50"
          >
            {claiming ? '…' : 'Claim'}
          </button>
        ) : (
          <p className="text-xs text-brand-50/40">Come back tomorrow</p>
        )}
      </div>
    </div>
  );
}

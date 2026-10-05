import { useEffect, useState } from 'react';
import { PlayerPageShell } from '@/shared/components/layout/PlayerPageShell';
import { socialApi, type SocialUser } from '../lib/social-api';

export function FriendsPage() {
  const [friends, setFriends] = useState<SocialUser[]>([]);
  const [requests, setRequests] = useState<Array<{ id: string; sender: SocialUser }>>([]);
  const [results, setResults] = useState<SocialUser[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    try {
      const [nextFriends, nextRequests] = await Promise.all([
        socialApi.friends(),
        socialApi.requests(),
      ]);
      setFriends(nextFriends);
      setRequests(nextRequests);
    } catch {
      setError('Social data is unavailable.');
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const search = async () => {
    if (query.trim().length < 2) return;
    setResults(await socialApi.search(query.trim()));
  };
  return (
    <PlayerPageShell
      eyebrow="Social"
      title="Friends"
      subtitle="Find fellow runners, accept requests, and compare progress."
      maxWidth="4xl"
    >
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[.05] p-5">
        <h2 className="font-bold text-white">Find players</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Username or email"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={() => {
              void search();
            }}
            className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950"
          >
            Search
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {results.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between rounded-lg bg-black/20 p-3"
            >
              <span className="text-sm text-slate-200">@{player.username}</span>
              <button
                type="button"
                onClick={() => {
                  void socialApi.sendRequest(player.id);
                }}
                className="text-xs font-bold text-cyan-200"
              >
                Add friend
              </button>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-bold text-white">Requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-slate-500">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.035] p-4"
              >
                <span className="text-sm text-slate-200">@{request.sender.username}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void socialApi.respond(request.id, true).then(load);
                    }}
                    className="text-xs font-bold text-emerald-300"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void socialApi.respond(request.id, false).then(load);
                    }}
                    className="text-xs text-rose-300"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-3 font-bold text-white">Friends · {friends.length}</h2>
        <div className="space-y-2">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.035] p-4"
            >
              <div>
                <p className="text-sm font-bold text-white">@{friend.username}</p>
                <p className="text-xs text-slate-400">
                  Level {friend.profile?.level ?? 1} · {friend.profile?.xp ?? 0} XP
                </p>
              </div>
              <span
                className={friend.online ? 'text-xs text-emerald-300' : 'text-xs text-slate-500'}
              >
                {friend.online ? 'Online' : 'Offline'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </PlayerPageShell>
  );
}

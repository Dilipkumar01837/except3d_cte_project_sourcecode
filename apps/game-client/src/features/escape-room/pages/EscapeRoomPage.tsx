import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { worldApi, type WorldDetail } from '@/features/worlds/lib/world-api';
import { EscapeRoom } from '../components/EscapeRoom';

/**
 * Loads the player-scoped world state and renders one room by its level number.
 * Refetches on window focus so returning from the challenge updates the door.
 */
export function EscapeRoomPage() {
  const { worldId = '', levelNumber = '' } = useParams();
  const [searchParams] = useSearchParams();
  const justCleared = searchParams.get('cleared') === '1';
  const [world, setWorld] = useState<WorldDetail>();
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!worldId) return;
    try {
      setWorld(await worldApi.getLevels(worldId));
      setError('');
    } catch {
      setError('This room could not be loaded.');
    }
  }, [worldId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#050816] p-6 text-center text-slate-100">
        <div>
          <p className="text-rose-200">{error}</p>
          <Link to="/worlds" className="mt-4 inline-block font-bold text-cyan-200">
            Return to worlds
          </Link>
        </div>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#050816] text-slate-300">
        Loading room…
      </div>
    );
  }

  const number = Number(levelNumber);
  const level = world.levels.find((entry) => entry.number === number);

  if (!level || !Number.isFinite(number)) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#050816] p-6 text-center text-slate-100">
        <div>
          <p className="text-amber-200">That room does not exist in this world.</p>
          <Link to={`/worlds/${worldId}`} className="mt-4 inline-block font-bold text-cyan-200">
            ← Back to {world.name}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <EscapeRoom
      world={world}
      level={level}
      justCleared={justCleared}
      onRefresh={() => {
        void load();
      }}
    />
  );
}

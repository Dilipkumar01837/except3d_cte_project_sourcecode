import type { Vec2 } from '../lib/room-geometry';
import { percent } from '../lib/room-geometry';
import { ROOM_PLAYER_HALF, type RoomConfig } from '../lib/room-config';

interface PlayerProps {
  player: Vec2;
  config: RoomConfig;
}

/** The player avatar, positioned in room coordinates. */
export function Player({ player, config }: PlayerProps) {
  const size = ROOM_PLAYER_HALF * 2;
  return (
    <div
      role="img"
      aria-label="Your explorer"
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/85"
      style={{
        left: percent(player.x, config.bounds.width),
        top: percent(player.y, config.bounds.height),
        width: percent(size, config.bounds.width),
        height: percent(size, config.bounds.height),
        background: config.theme.player,
        boxShadow: '0 0 22px rgba(253, 224, 71, 0.55)',
      }}
    />
  );
}

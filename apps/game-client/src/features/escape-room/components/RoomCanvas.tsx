import type { Vec2 } from '../lib/room-geometry';
import { percent } from '../lib/room-geometry';
import type { RoomConfig, RoomObjectConfig } from '../lib/room-config';
import type { RoomState } from '../lib/room-state';
import { Door } from './Door';
import { Player } from './Player';
import { RoomObject } from './RoomObject';

interface RoomCanvasProps {
  config: RoomConfig;
  state: RoomState;
  player: Vec2;
  activeObjectId: string | null;
  onActivate: (object: RoomObjectConfig) => void;
}

/** The 2D scene, rendered with plain CSS and SVG at a 5:3 aspect ratio. */
export function RoomCanvas({ config, state, player, activeObjectId, onActivate }: RoomCanvasProps) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border border-white/10"
      style={{ aspectRatio: '5 / 3', background: config.theme.sky }}
    >
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: config.theme.ground, opacity: 0.85 }}
        aria-hidden="true"
      />

      {config.obstacles.map((obstacle, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="absolute rounded-xl border border-white/10 bg-black/30"
          style={{
            left: percent(obstacle.x, config.bounds.width),
            top: percent(obstacle.y, config.bounds.height),
            width: percent(obstacle.width, config.bounds.width),
            height: percent(obstacle.height, config.bounds.height),
          }}
        />
      ))}

      {config.objects.map((object) =>
        object.kind === 'door' ? (
          <Door
            key={object.id}
            object={object}
            config={config}
            unlocked={state.isCompleted}
            active={activeObjectId === object.id}
            onActivate={() => {
              onActivate(object);
            }}
          />
        ) : (
          <RoomObject
            key={object.id}
            object={object}
            config={config}
            active={activeObjectId === object.id}
            locked={!state.isPlayable}
            onActivate={() => {
              onActivate(object);
            }}
          />
        ),
      )}

      <Player player={player} config={config} />
    </div>
  );
}

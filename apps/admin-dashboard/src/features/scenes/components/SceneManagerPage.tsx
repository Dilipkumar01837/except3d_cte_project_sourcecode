import { useEffect, useState } from 'react';
import { adminApi, type AdminScene } from '@/shared/lib/admin-api';

const blankObjects = '[{"id":"terminal","kind":"terminal","position":[0,1,-2],"challengeId":""}]';
export function SceneManagerPage() {
  const [scenes, setScenes] = useState<AdminScene[]>([]);
  const [levelId, setLevelId] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const [objects, setObjects] = useState(blankObjects);
  const [settings, setSettings] = useState('{"theme":"forest","quality":"medium"}');
  const [published, setPublished] = useState(false);
  const [message, setMessage] = useState('');
  const load = () => {
    void adminApi
      .listScenes()
      .then((result) => {
        setScenes(result.scenes);
      })
      .catch(() => {
        setMessage('Unable to load scenes.');
      });
  };
  useEffect(() => {
    load();
  }, []);
  const select = (scene: AdminScene) => {
    setLevelId(scene.levelId);
    setModelUrl(scene.modelUrl ?? '');
    setObjects(JSON.stringify(scene.objects, null, 2));
    setSettings(JSON.stringify(scene.settings ?? {}, null, 2));
    setPublished(scene.isPublished);
  };
  const save = async () => {
    try {
      await adminApi.saveScene(levelId, {
        modelUrl: modelUrl || undefined,
        objects: JSON.parse(objects) as unknown,
        settings: JSON.parse(settings) as unknown,
        isPublished: published,
      });
      setMessage('Scene saved.');
      load();
    } catch {
      setMessage('Check the level ID and JSON fields.');
    }
  };
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-white">3D Scene Manager</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure published level scenes. Model files should be hosted at an approved GLTF/GLB
          URL.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-slate-700/50 bg-slate-900 p-4">
          <h2 className="font-semibold text-white">Published and draft scenes</h2>
          <div className="mt-3 space-y-2">
            {scenes.map((scene) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => {
                  select(scene);
                }}
                className="w-full rounded-lg bg-slate-800 px-3 py-2 text-left text-sm text-slate-200"
              >
                {scene.level.world.name} · {scene.level.title}
                <span className="block text-xs text-slate-500">{scene.levelId}</span>
              </button>
            ))}
          </div>
        </aside>
        <section className="space-y-4 rounded-xl border border-slate-700/50 bg-slate-900 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-400">
              Level ID
              <input
                value={levelId}
                onChange={(event) => {
                  setLevelId(event.target.value);
                }}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="text-xs text-slate-400">
              GLTF/GLB URL
              <input
                value={modelUrl}
                onChange={(event) => {
                  setModelUrl(event.target.value);
                }}
                placeholder="https://.../scene.glb"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
          <label className="block text-xs text-slate-400">
            Object layout JSON
            <textarea
              value={objects}
              onChange={(event) => {
                setObjects(event.target.value);
              }}
              className="mt-1 h-48 w-full rounded border border-slate-700 bg-slate-800 p-3 font-mono text-xs text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Scene settings JSON
            <textarea
              value={settings}
              onChange={(event) => {
                setSettings(event.target.value);
              }}
              className="mt-1 h-24 w-full rounded border border-slate-700 bg-slate-800 p-3 font-mono text-xs text-white"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={published}
              onChange={(event) => {
                setPublished(event.target.checked);
              }}
            />{' '}
            Publish scene
          </label>
          <button
            type="button"
            disabled={!levelId}
            onClick={() => {
              void save();
            }}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            Save scene
          </button>
          {message && <p className="text-sm text-slate-400">{message}</p>}
        </section>
      </div>
    </div>
  );
}

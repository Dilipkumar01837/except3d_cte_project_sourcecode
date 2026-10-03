interface InteractionPromptProps {
  prompt: string | null;
}

/** Bottom-centre "Press E to interact" hint, announced to screen readers. */
export function InteractionPrompt({ prompt }: InteractionPromptProps) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4"
    >
      {prompt ? (
        <span className="flex items-center gap-2 rounded-full border border-white/15 bg-black/75 px-4 py-2 text-sm font-bold text-cyan-100 shadow-xl backdrop-blur">
          <kbd className="rounded border border-white/25 bg-white/10 px-2 py-0.5 text-xs">E</kbd>
          {prompt}
        </span>
      ) : null}
    </div>
  );
}

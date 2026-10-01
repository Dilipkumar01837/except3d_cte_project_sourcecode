-- Hint outcome fields.
--
-- Hints were fire-and-forget: a hint was recorded when revealed, but nothing
-- recorded whether the player went on to solve the challenge or found the hint
-- useful. These are engagement signals only and must not be read as evidence of
-- learning.
--
-- "resolvedAfter" is set by the execution worker when the same player later gets
-- an accepted submission for the challenge. "helpful" is optional and
-- self-reported by the player.

ALTER TABLE "AiHintHistory" ADD COLUMN "resolvedAfter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AiHintHistory" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "AiHintHistory" ADD COLUMN "helpful" BOOLEAN;

ALTER TABLE "PlayerHintReveal" ADD COLUMN "resolvedAfter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlayerHintReveal" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "PlayerHintReveal" ADD COLUMN "helpful" BOOLEAN;

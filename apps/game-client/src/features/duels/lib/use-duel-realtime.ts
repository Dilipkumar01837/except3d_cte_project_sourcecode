import { io, type Socket } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';
import type { Language } from '@/features/challenges/lib/challenge-api';

export interface DuelProgress {
  passed: number;
  total: number;
  elapsedMs: number;
  language: string;
  status: string;
  score?: number;
  submissionStatus?: string;
}

export interface DuelLiveState {
  players: Record<
    string,
    { ready: boolean; code: string; language: string; progress: DuelProgress }
  >;
  spectators: number;
  startedAt: string | null;
}

interface DuelRealtimeApi {
  connected: boolean;
  state: DuelLiveState | undefined;
  opponentCode: string;
  opponentProgress: DuelProgress | undefined;
  countdown: number | undefined;
  messages: Array<{ userId: string; message: string }>;
  emitCode: (code: string, language: Language) => void;
  setReady: (ready: boolean) => void;
  emitProgress: (progress: DuelProgress) => void;
  sendChat: (message: string) => void;
}

export function useDuelRealtime(
  duelId: string,
  userId: string | undefined,
  onResult: (event: { winnerId: string | null; status: string }) => void,
): DuelRealtimeApi {
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const [state, setState] = useState<DuelLiveState>();
  const [opponentCode, setOpponentCode] = useState('');
  const [opponentProgress, setOpponentProgress] = useState<DuelProgress>();
  const [countdown, setCountdown] = useState<number>();
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Array<{ userId: string; message: string }>>([]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token || !duelId) return;
    const socket = io('/duel', { auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('duel:join', { duelId }, (response: { state?: DuelLiveState }) => {
        if (response.state) setState(response.state);
      });
    });
    socket.on('disconnect', () => {
      setConnected(false);
    });
    socket.on('duel:state', (event: { state: DuelLiveState }) => {
      setState(event.state);
      const opponent = Object.entries(event.state.players).find(([id]) => id !== userId)?.[1];
      if (opponent) {
        setOpponentCode(opponent.code);
        setOpponentProgress(opponent.progress);
      }
    });
    socket.on('duel:code-update', (event: { userId: string; code: string }) => {
      if (event.userId !== userId) setOpponentCode(event.code);
    });
    socket.on('duel:progress-update', (event: DuelProgress & { userId: string }) => {
      if (event.userId !== userId) setOpponentProgress(event);
    });
    socket.on('duel:countdown', (event: { seconds: number }) => {
      setCountdown(event.seconds);
    });
    socket.on('duel:started', () => {
      setCountdown(undefined);
    });
    socket.on('duel:result', onResult);
    socket.on('duel:spectator-join', (event: { count: number }) => {
      setState((current) => (current ? { ...current, spectators: event.count } : current));
    });
    socket.on('duel:spectator-leave', (event: { count: number }) => {
      setState((current) => (current ? { ...current, spectators: event.count } : current));
    });
    socket.on('duel:chat-message', (event: { userId: string; message: string }) => {
      setMessages((current) => [...current.slice(-49), event]);
    });
    return () => {
      window.clearTimeout(timerRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [duelId, userId, onResult]);

  const emitCode = (code: string, language: Language) => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      socketRef.current?.emit('duel:code-update', { duelId, code, language });
    }, 100);
  };
  const setReady = (ready: boolean) => socketRef.current?.emit('duel:ready', { duelId, ready });
  const emitProgress = (progress: DuelProgress) =>
    socketRef.current?.emit('duel:progress-update', { duelId, ...progress });
  const sendChat = (message: string) =>
    socketRef.current?.emit('duel:chat-message', { duelId, message });

  return {
    connected,
    state,
    opponentCode,
    opponentProgress,
    countdown,
    messages,
    emitCode,
    setReady,
    emitProgress,
    sendChat,
  };
}

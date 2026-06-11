"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { logPlayEvent } from "@/lib/actions/stats";

export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration?: number;
  coverArt?: string;
  bpm?: number;
  keySignature?: string;
  sourceType?: "song" | "draft";
}

export type LoopMode = "none" | "one" | "all";

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // ── Web Audio API for real-time spectrum ─────────────────────────────
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const sourceNodeRef   = useRef<MediaElementAudioSourceNode | null>(null);

  /** Call once on first user-initiated play to wire up the AnalyserNode. */
  const initWebAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audioContextRef.current) return; // already initialized
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;            // 1024 frequency bins
      analyser.smoothingTimeConstant = 0.80; // built-in browser smoothing
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioContextRef.current = ctx;
      analyserRef.current     = analyser;
      sourceNodeRef.current   = source;
    } catch (e) {
      console.warn("Web Audio API unavailable:", e);
    }
  }, []);

  /** Resume suspended AudioContext (needed after browser autoplay policy). */
  const resumeAudioContext = useCallback(() => {
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }
  }, []);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [commentMarkers, setCommentMarkersState] = useState<number[]>([]);

  // ── Queue state ─────────────────────────────────────────────────────
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [shuffle, setShuffle] = useState(false);
  const [loop, setLoop] = useState<LoopMode>("none");
  const [playbackRate, setPlaybackRateState] = useState(1);
  // Shuffled index order — rebuilt whenever queue or shuffle changes
  const shuffleOrderRef = useRef<number[]>([]);

  // Rebuild shuffle order whenever queue changes
  useEffect(() => {
    if (queue.length === 0) { shuffleOrderRef.current = []; return; }
    const order = Array.from({ length: queue.length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    shuffleOrderRef.current = order;
  }, [queue, shuffle]);

  // ── Audio element init ───────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      // Auto-advance handled via state in a separate effect
      setCurrentTime(0);
    };
    const handleError = () => {
      setIsPlaying(false);
      console.error("Error loading audio:", audio.error?.message);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.src = "";
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Low-level play ────────────────────────────────────────────────────
  const playbackRateRef = useRef(1);
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);

  const _loadAndPlay = useCallback(async (track: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    // Wire up Web Audio API on first play (requires user gesture context)
    initWebAudio();
    resumeAudioContext();
    if (playPromiseRef.current) {
      audio.pause();
    }
    audio.src = track.url;
    audio.playbackRate = playbackRateRef.current;
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(0);
    setCommentMarkersState([]);
    audio.load();
    try {
      playPromiseRef.current = audio.play();
      await playPromiseRef.current;
      resumeAudioContext();
      setIsPlaying(true);
      // Record play event (fire-and-forget, never throws)
      if (track.sourceType === "song") logPlayEvent({ song_id: track.id }).catch(() => {});
      else if (track.sourceType === "draft") logPlayEvent({ draft_id: track.id }).catch(() => {});
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.error("Error playing audio:", e.message);
      }
      setIsPlaying(false);
    } finally {
      playPromiseRef.current = null;
    }
  }, [initWebAudio, resumeAudioContext]);

  // ── Auto-advance on track end ─────────────────────────────────────────
  // We watch isPlaying going false + currentTime == 0 to detect natural end
  const isPlayingRef = useRef(isPlaying);
  const currentTimeRef = useRef(currentTime);
  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  const loopRef = useRef(loop);
  const shuffleRef = useRef(shuffle);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { loopRef.current = loop; }, [loop]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);

  // Listen to "ended" on the audio element to auto-advance
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      const q = queueRef.current;
      const idx = queueIndexRef.current;
      const lp = loopRef.current;
      const sh = shuffleRef.current;

      if (lp === "one") {
        // replay same track
        audio.currentTime = 0;
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
        return;
      }

      if (q.length > 1) {
        let nextIdx: number;
        if (sh) {
          const order = shuffleOrderRef.current;
          const pos = order.indexOf(idx);
          if (pos < order.length - 1) {
            nextIdx = order[pos + 1];
          } else if (lp === "all") {
            nextIdx = order[0];
          } else {
            return;
          }
        } else {
          if (idx < q.length - 1) {
            nextIdx = idx + 1;
          } else if (lp === "all") {
            nextIdx = 0;
          } else {
            return;
          }
        }
        setQueueIndex(nextIdx);
        _loadAndPlay(q[nextIdx]);
      }
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [_loadAndPlay]);

  // ── Public API ────────────────────────────────────────────────────────

  /**
   * Play a single track (no queue), or pass `tracks` array to load a full queue
   * and start at the given track (or index 0 if not found).
   */
  const play = useCallback(
    async (track?: Track, tracks?: Track[]) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (tracks && tracks.length > 0) {
        setQueue(tracks);
        const idx = track ? tracks.findIndex(t => t.id === track.id) : 0;
        const startIdx = idx >= 0 ? idx : 0;
        setQueueIndex(startIdx);
        await _loadAndPlay(tracks[startIdx]);
        return;
      }

      if (track) {
        // Playing a single track without a playlist context
        // If it's already in queue, just jump to it
        const existingIdx = queue.findIndex(t => t.id === track.id);
        if (existingIdx >= 0) {
          setQueueIndex(existingIdx);
          await _loadAndPlay(track);
          return;
        }
        // Otherwise start a new single-item queue
        setQueue([track]);
        setQueueIndex(0);
        await _loadAndPlay(track);
        return;
      }

      // Resume current
      if (!audio.src) return;
      resumeAudioContext();
      try {
        playPromiseRef.current = audio.play();
        await playPromiseRef.current;
        resumeAudioContext();
        setIsPlaying(true);
      } catch { setIsPlaying(false); } finally { playPromiseRef.current = null; }
    },
    [queue, _loadAndPlay]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((level: number) => {
    const clamped = Math.max(0, Math.min(1, level));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  const setCommentMarkers = useCallback((markers: number[]) => {
    setCommentMarkersState(markers);
  }, []);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    let nextIdx: number;
    if (shuffle) {
      const order = shuffleOrderRef.current;
      const pos = order.indexOf(queueIndex);
      if (pos < order.length - 1) nextIdx = order[pos + 1];
      else if (loop === "all") nextIdx = order[0];
      else return;
    } else {
      if (queueIndex < queue.length - 1) nextIdx = queueIndex + 1;
      else if (loop === "all") nextIdx = 0;
      else return;
    }
    setQueueIndex(nextIdx);
    _loadAndPlay(queue[nextIdx]);
  }, [queue, queueIndex, shuffle, loop, _loadAndPlay]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;
    // If we're more than 3s in, restart current track
    if (currentTime > 3) { seek(0); return; }
    let prevIdx: number;
    if (shuffle) {
      const order = shuffleOrderRef.current;
      const pos = order.indexOf(queueIndex);
      if (pos > 0) prevIdx = order[pos - 1];
      else if (loop === "all") prevIdx = order[order.length - 1];
      else { seek(0); return; }
    } else {
      if (queueIndex > 0) prevIdx = queueIndex - 1;
      else if (loop === "all") prevIdx = queue.length - 1;
      else { seek(0); return; }
    }
    setQueueIndex(prevIdx);
    _loadAndPlay(queue[prevIdx]);
  }, [queue, queueIndex, currentTime, shuffle, loop, seek, _loadAndPlay]);

  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => {
      if (prev.find(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  }, []);

  const removeFromQueue = useCallback((trackId: string) => {
    setQueue(prev => {
      const newQ = prev.filter(t => t.id !== trackId);
      setQueueIndex(qi => {
        const removedIdx = prev.findIndex(t => t.id === trackId);
        if (removedIdx < qi) return qi - 1;
        if (removedIdx === qi && qi >= newQ.length) return Math.max(0, newQ.length - 1);
        return qi;
      });
      return newQ;
    });
  }, []);

  const clearQueue = useCallback(() => {
    pause();
    setQueue([]);
    setQueueIndex(-1);
    setCurrentTrack(null);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.src = "";
      audioRef.current.load();
    }
  }, [pause]);

  const toggleShuffle = useCallback(() => setShuffle(s => !s), []);

  const cycleLoop = useCallback(() => {
    setLoop(l => l === "none" ? "all" : l === "all" ? "one" : "none");
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  const hasNext = queue.length > 1 && (loop !== "none" || (shuffle ? shuffleOrderRef.current.indexOf(queueIndex) < shuffleOrderRef.current.length - 1 : queueIndex < queue.length - 1));
  const hasPrev = queue.length > 1 || currentTime > 3;

  return {
    // Playback state
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    commentMarkers,
    // Queue state
    queue,
    queueIndex,
    shuffle,
    loop,
    hasNext,
    hasPrev,
    // Playback actions
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    setCommentMarkers,
    // Queue actions
    playNext,
    playPrev,
    addToQueue,
    removeFromQueue,
    clearQueue,
    toggleShuffle,
    cycleLoop,
    playbackRate,
    setPlaybackRate,
    // Web Audio API
    analyserRef,
    resumeAudioContext,
    // Raw audio element (for WaveSurfer media sync)
    audioRef,
  };
}

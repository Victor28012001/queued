// src/types/game.d.ts
declare global {
  interface Window {
    startGameFromLevel?: (level: number) => void;
    gameInitialized?: boolean;
    // Add any other global game variables/functions your game exposes
    audioContext?: AudioContext;
    _footstepSounds?: HTMLAudioElement[];
    _breathingSounds?: HTMLAudioElement[];
    _footstepIndex?: number;
    _footstepTimer?: number;
    _wasRunning?: boolean;
    _breathIndex?: number;
    _breathTimer?: number;
    _breathInterval?: number;
    _targetBreathInterval?: number;
    _breathVolume?: number;
    _targetBreathVolume?: number;
  }
}

// Module declaration for your game script
declare module '/game.js' {
  export function startGameFromLevel(level: number): void;
  export const audioContext: AudioContext;
}

// Allow importing JavaScript files as modules
declare module '*.js' {
  const content: any;
  export default content;
}

export {};
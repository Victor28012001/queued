// types/global.d.ts
export {};

declare global {
  interface Window {
    achievementTracker: {
      startFloor: () => void;
      recordKill: (isBoss?: boolean) => void;
      recordDamage: (amount: number) => void;
      onFloorComplete: (floorIndex: number, bossKilled: boolean) => void;
      submitAll: () => Promise<void>;
      initialize: (
        suiClient: any,
        address: string,
        statsId: string | null,
        executeTransaction: (tx: any) => Promise<any>
      ) => Promise<void>;
      getPlayerStats: () => Promise<any>;
      createPlayerStats: (name: string) => Promise<string | null>;
      playerStatsObjectId: string | null;
      sessionKills: number;
      sessionDamage: number;
      pendingMints: any[];
    };

    // Contract constants
    PACKAGE_ID: string;
    REGISTRY_ID: string;
    GLOBAL_LEADERBOARD_ID: string;
    FLOOR_LEADERBOARD_IDS: string[];
    ACHIEVEMENTS: Record<string, any>;

    // Transaction class — set by useSuiGame
    SuiTransaction: any;

    // Game
    startGameFromLevel?: (level: number) => void;
    stopGame?: () => void;
    _currentLevel?: number;
    _currentLevelIndex?: number;
    _gameIntentional?: boolean;
    _bossKilled?: boolean;

    // Wallet / chain
    _suiClient?: any;
    _playerStatsObjectId?: string;
    _achievementRegistryObjectId?: string;
    _currentAddress?: string;

    // Audio
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

    // Game helpers
    getZombieInFront?: () => any;
    damageZombie?: (zombie: any, amount: number) => void;
    showMessage?: (message: string) => void;
  }
}
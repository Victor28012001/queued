module achievement_nft::achievement_nft;

use one::clock::{Clock};
use one::event;
use one::table::{Self, Table};
use std::string::{String};

const KILL_POINTS: u64         = 100;
const GHOST_BONUS: u64         = 5000;
const SPEED_BONUS: u64         = 3000;
const DAMAGE_PENALTY: u64      = 10;
const SPEED_THRESHOLD_MS: u64  = 120000;
const MAX_LEADERBOARD_ENTRIES: u64 = 100;

const E_ALREADY_MINTED: u64    = 0;
const E_CONDITION_NOT_MET: u64 = 1;
const E_INVALID_CATEGORY: u64  = 2;
const E_INVALID_FLOOR: u64     = 3;
const E_NOT_OWNER: u64         = 4;

public struct LeaderboardEntry has store, copy, drop {
    player: address,
    display_name: String,
    score: u64,
    kills: u64,
    damage_taken: u64,
    floor_time_ms: u64,
    ghost_run: bool,
    recorded_at: u64,
}

public struct LeaderboardFloor has key {
    id: UID,
    floor_index: u8,
    entries: vector<LeaderboardEntry>,
}

public struct LeaderboardGlobal has key {
    id: UID,
    entries: vector<LeaderboardEntry>,
}

public struct PlayerStats has key {
    id: UID,
    owner: address,
    display_name: String,
    total_kills: u64,
    total_damage_taken: u64,
    floors_completed: u64,
    boss_kills: u64,
    total_survival_ms: u64,
    zero_damage_floors: u64,
    fastest_floor_ms: u64,
    total_score: u64,
    floor_best_scores: vector<u64>,
    floor_best_times: vector<u64>,
    floor_completions: vector<u64>,
}

public struct AchievementRegistry has key {
    id: UID,
    minted: Table<address, Table<String, bool>>,
}

public struct AchievementNFT has key, store {
    id: UID,
    achievement_id: String,
    title: String,
    description: String,
    category: u8,
    rarity: u8,
    floor_index: u8,
    kills_at_mint: u64,
    damage_taken_at_mint: u64,
    time_ms_at_mint: u64,
    score_at_mint: u64,
    image_url: String,
    minted_at: u64,
}

public struct AchievementMinted has copy, drop {
    nft_id: ID,
    recipient: address,
    achievement_id: String,
    category: u8,
    rarity: u8,
    floor_index: u8,
    score_at_mint: u64,
    timestamp: u64,
}

public struct FloorScoreSubmitted has copy, drop {
    player: address,
    floor_index: u8,
    score: u64,
    kills: u64,
    damage_taken: u64,
    floor_time_ms: u64,
    ghost_run: bool,
    is_new_personal_best: bool,
    timestamp: u64,
}

public struct LeaderboardUpdated has copy, drop {
    floor_index: u8,
    player: address,
    new_score: u64,
    rank: u64,
}

fun init(ctx: &mut TxContext) {
    transfer::share_object(AchievementRegistry {
        id: object::new(ctx),
        minted: table::new(ctx),
    });

    let mut i = 0u8;
    while (i < 6) {
        transfer::share_object(LeaderboardFloor {
            id: object::new(ctx),
            floor_index: i,
            entries: vector::empty(),
        });
        i = i + 1;
    };

    transfer::share_object(LeaderboardGlobal {
        id: object::new(ctx),
        entries: vector::empty(),
    });
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) { init(ctx); }

public fun create_player_stats(
    display_name: vector<u8>,
    ctx: &mut TxContext,
) {
    let floor_best_scores = vector[0u64, 0, 0, 0, 0, 0];
    let floor_best_times  = vector[0u64, 0, 0, 0, 0, 0];
    let floor_completions = vector[0u64, 0, 0, 0, 0, 0];

    transfer::transfer(PlayerStats {
        id: object::new(ctx),
        owner: tx_context::sender(ctx),
        display_name: std::string::utf8(display_name),
        total_kills: 0,
        total_damage_taken: 0,
        floors_completed: 0,
        boss_kills: 0,
        total_survival_ms: 0,
        zero_damage_floors: 0,
        fastest_floor_ms: 0,
        total_score: 0,
        floor_best_scores,
        floor_best_times,
        floor_completions,
    }, tx_context::sender(ctx));
}

public fun set_display_name(
    stats: &mut PlayerStats,
    name: vector<u8>,
    ctx: &mut TxContext,
) {
    assert!(stats.owner == tx_context::sender(ctx), E_NOT_OWNER);
    stats.display_name = std::string::utf8(name);
}

public fun calculate_floor_score(
    kills: u64,
    damage_taken: u64,
    floor_time_ms: u64,
): u64 {
    let mut score = kills * KILL_POINTS;

    if (damage_taken == 0) {
        score = score + GHOST_BONUS;
    };

    if (floor_time_ms > 0 && floor_time_ms <= SPEED_THRESHOLD_MS) {
        let speed_factor = (SPEED_THRESHOLD_MS - floor_time_ms)
            * SPEED_BONUS / SPEED_THRESHOLD_MS;
        score = score + speed_factor + 1;
    };

    let penalty = damage_taken * DAMAGE_PENALTY;
    if (penalty >= score) {
        return 0
    };
    score - penalty
}

public fun record_floor_result(
    stats: &mut PlayerStats,
    floor_lb: &mut LeaderboardFloor,
    global_lb: &mut LeaderboardGlobal,
    clock: &Clock,
    floor_index: u8,
    kills: u64,
    damage_taken: u64,
    floor_time_ms: u64,
    boss_killed: bool,
    ctx: &mut TxContext,
) {
    assert!(stats.owner == tx_context::sender(ctx), E_NOT_OWNER);
    assert!(floor_index <= 5, E_INVALID_FLOOR);
    assert!(floor_lb.floor_index == floor_index, E_INVALID_FLOOR);

    let timestamp = one::clock::timestamp_ms(clock);
    let score     = calculate_floor_score(kills, damage_taken, floor_time_ms);
    let ghost_run = damage_taken == 0;
    let fi        = (floor_index as u64);

    stats.total_kills        = stats.total_kills + kills;
    stats.total_damage_taken = stats.total_damage_taken + damage_taken;
    stats.floors_completed   = stats.floors_completed + 1;
    stats.total_survival_ms  = stats.total_survival_ms + floor_time_ms;

    if (boss_killed) { stats.boss_kills = stats.boss_kills + 1; };
    if (ghost_run)   { stats.zero_damage_floors = stats.zero_damage_floors + 1; };

    if (stats.fastest_floor_ms == 0 || floor_time_ms < stats.fastest_floor_ms) {
        stats.fastest_floor_ms = floor_time_ms;
    };

    let current_best = *vector::borrow(&stats.floor_best_scores, fi);
    let is_new_pb    = score > current_best;
    if (is_new_pb) {
        *vector::borrow_mut(&mut stats.floor_best_scores, fi) = score;
    };

    let current_best_time = *vector::borrow(&stats.floor_best_times, fi);
    if (current_best_time == 0 || floor_time_ms < current_best_time) {
        *vector::borrow_mut(&mut stats.floor_best_times, fi) = floor_time_ms;
    };

    let completions = *vector::borrow(&stats.floor_completions, fi);
    *vector::borrow_mut(&mut stats.floor_completions, fi) = completions + 1;

    stats.total_score = sum_best_scores(&stats.floor_best_scores);

    let entry = LeaderboardEntry {
        player:       tx_context::sender(ctx),
        display_name: stats.display_name,
        score,
        kills,
        damage_taken,
        floor_time_ms,
        ghost_run,
        recorded_at: timestamp,
    };
    let floor_rank = upsert_leaderboard(&mut floor_lb.entries, entry);

    let global_entry = LeaderboardEntry {
        player:        tx_context::sender(ctx),
        display_name:  stats.display_name,
        score:         stats.total_score,
        kills:         stats.total_kills,
        damage_taken:  stats.total_damage_taken,
        floor_time_ms: stats.total_survival_ms,
        ghost_run:     stats.zero_damage_floors > 0,
        recorded_at:   timestamp,
    };
    let global_rank = upsert_leaderboard(&mut global_lb.entries, global_entry);

    event::emit(FloorScoreSubmitted {
        player: tx_context::sender(ctx),
        floor_index,
        score,
        kills,
        damage_taken,
        floor_time_ms,
        ghost_run,
        is_new_personal_best: is_new_pb,
        timestamp,
    });

    event::emit(LeaderboardUpdated {
        floor_index,
        player: tx_context::sender(ctx),
        new_score: score,
        rank: floor_rank,
    });

    event::emit(LeaderboardUpdated {
        floor_index: 255,
        player: tx_context::sender(ctx),
        new_score: stats.total_score,
        rank: global_rank,
    });
}

fun insert_at_index(
    entries: &mut vector<LeaderboardEntry>,
    new_entry: LeaderboardEntry,
    index: u64,
) {
    vector::push_back(entries, new_entry);
    let mut i = vector::length(entries) - 1;
    while (i > index) {
        vector::swap(entries, i, i - 1);
        i = i - 1;
    };
}

fun upsert_leaderboard(
    entries: &mut vector<LeaderboardEntry>,
    new_entry: LeaderboardEntry,
): u64 {
    let player  = new_entry.player;
    let mut i   = 0u64;

    while (i < vector::length(entries)) {
        let e = vector::borrow(entries, i);
        if (e.player == player) {
            if (new_entry.score <= e.score) {
                return find_rank(entries, player)
            };
            vector::remove(entries, i);
            break
        };
        i = i + 1;
    };

    let mut insert_at = vector::length(entries);
    let mut j = 0u64;
    while (j < vector::length(entries)) {
        if (new_entry.score > vector::borrow(entries, j).score) {
            insert_at = j;
            break
        };
        j = j + 1;
    };

    insert_at_index(entries, new_entry, insert_at);

    while (vector::length(entries) > MAX_LEADERBOARD_ENTRIES) {
        vector::pop_back(entries);
    };

    insert_at + 1
}

fun find_rank(entries: &vector<LeaderboardEntry>, player: address): u64 {
    let mut i = 0u64;
    while (i < vector::length(entries)) {
        if (vector::borrow(entries, i).player == player) {
            return i + 1
        };
        i = i + 1;
    };
    0
}

fun sum_best_scores(scores: &vector<u64>): u64 {
    let mut total = 0u64;
    let mut i     = 0u64;
    while (i < vector::length(scores)) {
        total = total + *vector::borrow(scores, i);
        i = i + 1;
    };
    total
}

public fun mint_achievement(
    registry: &mut AchievementRegistry,
    stats: &PlayerStats,
    clock: &Clock,
    achievement_id: vector<u8>,
    title: vector<u8>,
    description: vector<u8>,
    category: u8,
    rarity: u8,
    floor_index: u8,
    image_url: vector<u8>,
    required_kills: u64,
    required_damage_ceiling: u64,
    required_floor_count: u64,
    ctx: &mut TxContext,
) {
    let sender             = tx_context::sender(ctx);
    let achievement_id_str = std::string::utf8(achievement_id);

    assert!(stats.owner == sender, E_NOT_OWNER);
    assert!(category <= 7, E_INVALID_CATEGORY);

    if (required_kills > 0) {
        assert!(stats.total_kills >= required_kills, E_CONDITION_NOT_MET);
    };
    if (required_damage_ceiling == 0) {
        assert!(stats.zero_damage_floors >= 1, E_CONDITION_NOT_MET);
    };
    if (required_floor_count > 0) {
        assert!(stats.floors_completed >= required_floor_count, E_CONDITION_NOT_MET);
    };

    if (!table::contains(&registry.minted, sender)) {
        table::add(&mut registry.minted, sender, table::new(ctx));
    };
    let player_table = table::borrow_mut(&mut registry.minted, sender);
    assert!(!table::contains(player_table, achievement_id_str), E_ALREADY_MINTED);
    table::add(player_table, achievement_id_str, true);

    let timestamp     = one::clock::timestamp_ms(clock);
    let score_at_mint = if (floor_index < 6) {
        *vector::borrow(&stats.floor_best_scores, (floor_index as u64))
    } else {
        stats.total_score
    };

    let nft = AchievementNFT {
        id: object::new(ctx),
        achievement_id: achievement_id_str,
        title: std::string::utf8(title),
        description: std::string::utf8(description),
        category,
        rarity,
        floor_index,
        kills_at_mint:        stats.total_kills,
        damage_taken_at_mint: stats.total_damage_taken,
        time_ms_at_mint:      stats.total_survival_ms,
        score_at_mint,
        image_url: std::string::utf8(image_url),
        minted_at: timestamp,
    };

    event::emit(AchievementMinted {
        nft_id:           object::id(&nft),
        recipient:        sender,
        achievement_id:   nft.achievement_id,
        category,
        rarity,
        floor_index,
        score_at_mint,
        timestamp,
    });

    transfer::public_transfer(nft, sender);
}

public fun get_floor_leaderboard(lb: &LeaderboardFloor): &vector<LeaderboardEntry> { &lb.entries }
public fun get_global_leaderboard(lb: &LeaderboardGlobal): &vector<LeaderboardEntry> { &lb.entries }
public fun get_player_rank_floor(lb: &LeaderboardFloor, player: address): u64 { find_rank(&lb.entries, player) }
public fun get_player_rank_global(lb: &LeaderboardGlobal, player: address): u64 { find_rank(&lb.entries, player) }
public fun get_floor_best_score(stats: &PlayerStats, floor_index: u8): u64 { *vector::borrow(&stats.floor_best_scores, (floor_index as u64)) }
public fun get_floor_attempts(stats: &PlayerStats, floor_index: u8): u64 { *vector::borrow(&stats.floor_completions, (floor_index as u64)) }

public fun entry_player(e: &LeaderboardEntry): address { e.player }
public fun entry_name(e: &LeaderboardEntry): String    { e.display_name }
public fun entry_score(e: &LeaderboardEntry): u64      { e.score }
public fun entry_kills(e: &LeaderboardEntry): u64      { e.kills }
public fun entry_ghost(e: &LeaderboardEntry): bool     { e.ghost_run }
public fun entry_time(e: &LeaderboardEntry): u64       { e.floor_time_ms }

public fun achievement_id(n: &AchievementNFT): String { n.achievement_id }
public fun title(n: &AchievementNFT): String          { n.title }
public fun category(n: &AchievementNFT): u8           { n.category }
public fun rarity(n: &AchievementNFT): u8             { n.rarity }
public fun floor_index(n: &AchievementNFT): u8        { n.floor_index }
public fun score_at_mint(n: &AchievementNFT): u64     { n.score_at_mint }
public fun minted_at(n: &AchievementNFT): u64         { n.minted_at }

public fun total_kills(s: &PlayerStats): u64          { s.total_kills }
public fun total_score(s: &PlayerStats): u64          { s.total_score }
public fun floors_completed(s: &PlayerStats): u64     { s.floors_completed }
public fun zero_damage_floors(s: &PlayerStats): u64   { s.zero_damage_floors }
public fun boss_kills(s: &PlayerStats): u64           { s.boss_kills }
public fun fastest_floor_ms(s: &PlayerStats): u64     { s.fastest_floor_ms }

public fun has_achievement(
    registry: &AchievementRegistry,
    player: address,
    achievement_id: String,
): bool {
    if (!table::contains(&registry.minted, player)) return false;
    table::contains(table::borrow(&registry.minted, player), achievement_id)
}

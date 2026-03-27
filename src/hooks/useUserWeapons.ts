import { useState, useEffect, useCallback } from 'react';
import { useOneWallet } from './useOneWallet';
import { Weapon, WeaponType, WeaponRarity } from '../types/game';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x5f3894f6e1bb292ca51e15f3f7d9e9ce2aac138b85171b5eafa21f8c3b2415af';
const WEAPON_NFT_TYPE = `${PACKAGE_ID}::weapon_nft::WeaponNFT`;

export const useUserWeapons = () => {
  const { connected, address, client } = useOneWallet();
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeapons = useCallback(async () => {
    if (!connected || !address || !client) {
      setWeapons([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Get all owned objects of type WeaponNFT
      let hasNextPage = true;
      let nextCursor = null;
      const allObjectIds: string[] = [];

      while (hasNextPage) {
        const response: any = await client.getOwnedObjects({
          owner: address,
          filter: { StructType: WEAPON_NFT_TYPE },
          options: { showType: true },
          cursor: nextCursor,
        });

        const ids = response.data.map((obj: any) => obj.data?.objectId).filter(Boolean);
        allObjectIds.push(...ids);

        hasNextPage = response.hasNextPage;
        nextCursor = response.nextCursor;
      }

      if (allObjectIds.length === 0) {
        setWeapons([]);
        setLoading(false);
        return;
      }

      // 2. Fetch object details (fields)
      // multiGetObjects has a limit (usually 50), so we might need to batch if user has many weapons
      // For now, assume < 50, or implement simple batching
      const objectsResponse = await client.multiGetObjects({
        ids: allObjectIds,
        options: { showContent: true },
      });

      // 3. Map to Weapon interface
      const parsedWeapons: Weapon[] = objectsResponse.reduce<Weapon[]>((acc: Weapon[], objResponse: any) => {
        const content = objResponse.data?.content;
        if (!content || content.dataType !== 'moveObject') return acc;

        const fields = content.fields;
        
        // Map u8 type to Enum
        const typeMap: Record<number, WeaponType> = {
          0: WeaponType.PISTOL,
          1: WeaponType.SHOTGUN,
          2: WeaponType.SWORD,
          3: WeaponType.ASSAULT_RIFLE,
          4: WeaponType.RIFLE,
        };

        // Map u8 rarity to Enum
        const rarityMap: Record<number, WeaponRarity> = {
          1: WeaponRarity.COMMON,
          2: WeaponRarity.UNCOMMON,
          3: WeaponRarity.RARE,
          4: WeaponRarity.EPIC,
          5: WeaponRarity.LEGENDARY,
        };

        // Safe casting/conversion
        // Note: Move numbers come as strings in JSON response usually, or numbers if small
        const damage = Number(fields.base_damage) / 100000;
        const cooldown = Number(fields.cooldown) / 100000;
        const range = Number(fields.range) / 100000;

        acc.push({
          type: typeMap[Number(fields.weapon_type)] || WeaponType.PISTOL,
          rarity: rarityMap[Number(fields.rarity)] || WeaponRarity.COMMON,
          name: fields.name,
          description: fields.description,
          baseDamage: damage,
          cooldown: cooldown,
          range: range,
          id: objResponse.data?.objectId // Keep track of NFT ID if needed later
        });

        return acc;
      }, []);

      setWeapons(parsedWeapons);

    } catch (err: any) {
      console.error("Error fetching weapons:", err);
      setError(err.message || "Failed to fetch weapons");
    } finally {
      setLoading(false);
    }
  }, [connected, address, client]);

  // Initial fetch when wallet connects
  useEffect(() => {
    fetchWeapons();
  }, [fetchWeapons]);

  return { weapons, loading, error, refetch: fetchWeapons };
};


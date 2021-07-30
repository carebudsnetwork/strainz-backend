import { AccessoryType } from './accessory.model';

export interface StrainzModel {
    _id: number;
    owner: string;
    prefix: string;
    postfix: string;
    dna: string;
    generation: number;
    growRate: number;
    lastHarvest: number;
    breedingCost: number;
    lastFertilizer: number;
    accessories: AccessoryType[];
}

import { AccessoryType } from './accessory.model';

export enum StrainPart {
    pot_normal = 'pot_normal', pot_silver = 'pot_silver', pot_gold = 'pot_gold', pot_colorful = 'pot_colorful',
    pot_bottle = 'pot_bottle', pot_shoe_back = 'pot_shoe_back', pot_shoe_front= 'pot_shoe_front', pot_bucket = 'pot_bucket',
    head_3 = 'head_3', head_2 = 'head_2', head_1 = 'head_1', head_rasta = 'head_rasta', hair = 'hair',
    body_thin = 'body_thin', body_bushy = 'body_bushy', body_twisted = 'body_twisted',
    body_flowered = 'body_flowered', body_thick = 'body_thick', body_triple = 'body_triple',
    face_happy = 'face_happy', face_nausea = 'face_nausea', face_funny = 'face_funny',
    face_neutral = 'face_neutral', face_stoned = 'face_stoned',
    sunglasses = 'sunglasses', joint = 'joint', earring = 'earring',
    head_4 = 'head_4', head_5 = 'head_5', head_6 = 'head_6', head_3_hair = 'head_3_hair'
}

export interface Color {
    red: number,
    green: number,
    blue: number
}

export interface StrainMetadata {
    prefix: string,
    postfix: string,
    dna: string,
    generation: string,
    growRate: string,
    lastHarvest: string,
    breedingCost: number;
    accessories?: AccessoryType[];
    lastFertilizer: number;
}

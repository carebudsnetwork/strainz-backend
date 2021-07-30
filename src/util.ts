import { AccessoryType } from './models/accessory.model';

export function setCharAt(str: string, index: number, chr: string) {
    if(index > str.length-1) return str;
    return str.substring(0,index) + chr + str.substring(index+1);
}

export function mapDNA(dna: string, accessories: AccessoryType[]): string {
    dna = setCharAt(dna, 6, accessories.includes(AccessoryType.Earring) ? '1' : '0');
    dna = setCharAt(dna, 5, accessories.includes(AccessoryType.Sunglasses) ? '1' : '0');
    dna = setCharAt(dna, 4, accessories.includes(AccessoryType.Joint) ? '1' : '0');
    return dna;
}

export enum AccessoryType {
    Earring = 1, Sunglasses = 2, Joint = 3
}
export interface AccessoryModel {
    _id: number;
    owner: string;
    type: AccessoryType;
}

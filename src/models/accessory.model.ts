export enum AccessoryType {
    Earring = 1, Sunglasses = 2, Joint = 3
}
export interface AccessoryModel {
    _id: number;
    owner: string;
    type: AccessoryType;
}

export function accessoryName(type: AccessoryType) {
    switch (type) {
        case AccessoryType.Joint:
            return 'Joint';
        case AccessoryType.Sunglasses:
            return 'Sunglasses';
        case AccessoryType.Earring:
            return 'Earring';
    }
}

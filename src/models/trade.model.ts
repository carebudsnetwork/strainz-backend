export interface TradeModel {
    _id: number;
    poster: string;
    nftContractAddress: string;
    tokenId: number;
    strainzTokenPrice: number;
    status: TradeStatus;
    buyer: string;
}

export interface FetchTradeModel {
    id: string;
    poster: string;
    nftContractAddress: string;
    tokenId: string;
    strainzTokenPrice: string;
    status: TradeStatus;
    buyer: string;
}


export enum TradeStatus {
    Open, Closed, Cancelled
}

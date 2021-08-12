import Web3 from 'web3';
import * as config from '../config.json';
import * as contracts from '../contracts.json';

import * as strainzNFTArtifacts from '../contracts/StrainzNFT/StrainzNFT.sol/StrainzNFT.json';
import * as seedzArtifacts from '../contracts/StrainzTokens/SeedzToken.sol/SeedzToken.json';
import * as strainzAccessoryArtifacts from '../contracts/StrainzAccessory.sol/StrainzAccessory.json';
import * as marketplaceArtifacts from '../contracts/StrainzMarketplace.sol/StrainzMarketplace.json';
import * as ierc20Artifacts from '../IERC20/IERC20.json';
import { getOffersCollection, getPoolCollection, getStrainzCollection, getTradeCollection } from './mongodb.service';
import { FetchTradeModel, TradeModel, TradeStatus } from '../models/trade.model';
import { StrainMetadata } from '../models/straindata.model';
import { StrainzModel } from '../models/StrainzModel';
import { PoolModel } from '../models/pool.model';
import { FetchOfferModel, OfferModel } from '../models/offer.model';


export class StrainzManager {

    provider: any = config.prod ? new Web3.providers.WebsocketProvider(`wss://bsc.getblock.io/mainnet/?api_key=${config.getblockKey}`, {
        reconnect: {
            auto: true
        }
    }) : new Web3.providers.HttpProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
    eventProvider: any = config.prod ? new Web3.providers.WebsocketProvider(`wss://bsc.getblock.io/mainnet/?api_key=${config.getblockKey}`, {
        reconnect: {
            auto: true
        }
    }) : null;

    web3 = new Web3(this.provider);
    eventWeb3 = config.prod ? new Web3(this.eventProvider) : null;

    strainzNFT: any = new this.web3.eth.Contract(strainzNFTArtifacts.abi as any, contracts.strainzNFTAddress);
    seedz: any = new this.web3.eth.Contract(seedzArtifacts.abi as any, contracts.seedzTokenAddress);
    marketplace: any = new this.web3.eth.Contract(marketplaceArtifacts.abi as any, contracts.strainzMarketplaceAddress);
    accessory: any = new this.web3.eth.Contract(strainzAccessoryArtifacts.abi as any, contracts.strainzAccessoryAddress);

    // @ts-ignore
    eventStrainzNFT: any = config.prod ? new this.eventWeb3.eth.Contract(strainzNFTArtifacts.abi as any, contracts.strainzNFTAddress) : null;
    // @ts-ignore
    eventSeedz: any = config.prod ? new this.eventWeb3.eth.Contract(seedzArtifacts.abi as any, contracts.seedzTokenAddress) : null;
    // @ts-ignore
    eventMarketplace: any = config.prod ? new this.eventWeb3.eth.Contract(marketplaceArtifacts.abi as any, contracts.strainzMarketplaceAddress) : null;
    // @ts-ignore
    eventAccessory: any = config.prod ? new this.eventWeb3.eth.Contract(strainzAccessoryArtifacts.abi as any, contracts.strainzAccessoryAddress) : null;

    public strainzSupply = 0;
    public seedzSupply = 0;


    async init() {
        console.log('strainmanager started');
        if (config.prod) {
            this.registerEvents();
        }

        await this.loadPools();
        await this.loadAllPlants();
        await this.loadAllTrades();
        await this.loadAllOffers();
        await this.updateSupply();


        setInterval(async () => {
            try {
                await this.updateSupply();

            } catch {
                console.log('supply error');
            }
        }, 600000);

    }

    skipping: number[] = [];

    async loadPools(): Promise<void> {
        await this.loadPool(0);
        await this.loadPool(1);
    }

    async loadPool(id: number): Promise<void> {
        try {
            const pool = await this.getPoolById(id);
            await insertPool(pool);
            console.log('updated pool', id);
        } catch {
            console.log('pool update');
        }

    }

    async loadAllPlants(): Promise<void> {
        const numberOfPlants = await this.strainzNFT.methods.tokenCount().call();
        console.log('get metadata from', numberOfPlants);


        for (let i = 1; i <= numberOfPlants; i++) {
            if (this.skipping.includes(i)) {
                console.log('skipped plant: ', i);
                continue;
            }
            try {
                try {
                    await this.strainzNFT.methods.ownerOf(i).call();
                    const strain = await this.getStrainDataForTokenId(i);
                    await insertStrain(strain);
                    console.log('updated:', i);
                } catch {
                    this.skipping.push(i);
                    console.log('composted:', i);
                    await removeStrainData(i);

                }


            } catch (e) {
                //this.skipping.push(i);
                console.log('could not get:', i);
            }


        }
    }

    async loadAllTrades(): Promise<void> {
        console.log('fetch erc721trades');
        const numberOfERC721Trades = +await this.marketplace.methods.getTradeCount().call();
        console.log('trades:', numberOfERC721Trades);

        for (let i = 1; i <= numberOfERC721Trades; i++) {
            try {
                const existing = await getTradeCollection().findOne({id: i});
                if (existing?.status == TradeStatus.Closed || existing?.status == TradeStatus.Cancelled) {
                    console.log('skipped trade:', i);

                    continue;
                }
                const trade = await this.getTradeById(i);
                await insertTrade(trade);
                console.log('updated trade:', i);

            } catch {
                console.log('could not fetch trade', i);
            }

        }
    }

    async loadAllOffers(): Promise<void> {
        console.log('fetch erc721offers');
        const numberOfERC721Offers = +await this.marketplace.methods.getOfferCount().call();
        console.log('offers:', numberOfERC721Offers);

        for (let i = 1; i <= numberOfERC721Offers; i++) {
            try {
                const existing = await getOffersCollection().findOne({id: i});
                if (existing?.status == TradeStatus.Closed || existing?.status == TradeStatus.Cancelled) {
                    console.log('skipped offer:', i);

                    continue;
                }
                const offer = await this.getOfferById(i);
                await insertOffer(offer);
                console.log('updated offer:', i);

            } catch {
                console.log('could not fetch offer', i);
            }

        }
    }

    registerEvents(): void {
        this.registerStrainEvents();
        console.log('registered nft Events');
        this.registerMarketplaceEvents();
        console.log('registered market Events');

        this.registerSeedzEvents();
        console.log('registered seedz Events');

        this.registerAccessoryEvents();
        console.log('registered accessory Events');

    }


    registerStrainEvents(): void {
        // @ts-ignore
        this.eventStrainzNFT.events.Breed()
            .on('data', async (event: any) => {
                const child = +event?.returnValues?.child;
                const parent1 = +event?.returnValues?.parent1;
                const parent2 = +event?.returnValues?.parent2;

                console.log('new plant breed:', child, 'by:', parent1, parent2);

                setTimeout(async () => {
                    try {
                        const childPlant: StrainzModel = await this.getStrainDataForTokenId(child);
                        await insertStrain(childPlant);
                        console.log('inserted child:', child);

                        const parent1Plant: StrainzModel = await this.getStrainDataForTokenId(parent1);
                        await insertStrain(parent1Plant);
                        console.log('updated parent1:', parent1);

                        const parent2Plant: StrainzModel = await this.getStrainDataForTokenId(parent2);
                        await insertStrain(parent2Plant);
                        console.log('updated parent2:', parent2);


                    } catch {
                        console.log('breed event error:', child, 'by:', parent1, parent2);

                    }

                }, 10000);


            });
        // @ts-ignore
        this.eventStrainzNFT.events.Transfer()
            .on('data', async (event: any) => {
                const tokenId = +event?.returnValues?.tokenId;
                const to = event?.returnValues?.to;

                console.log('new transfer:', tokenId, 'to:', to);

                setTimeout(async () => {
                    try {
                        const plant: StrainzModel = await this.getStrainDataForTokenId(tokenId);
                        await insertStrain(plant);
                        console.log('updated Owner:', tokenId, to);
                    } catch {
                        console.log('transfer event error:', tokenId, 'to:', to);

                    }

                }, 5000);


            });

        // @ts-ignore
        this.eventStrainzNFT.events.Composted()
            .on('data', async (event: any) => {
                const tokenId = +event?.returnValues?.tokenId;

                console.log('composted:', tokenId);

                setTimeout(async () => {
                    try {
                        await removeStrainData(tokenId);
                        console.log('composted:', tokenId);
                    } catch {
                        console.log('composted error:', tokenId);

                    }

                }, 5000);


            });

        // @ts-ignore
        this.eventStrainzNFT.events.StrainModified()
            .on('data', async (event: any) => {
                const tokenId = +event?.returnValues?.tokenId;
                setTimeout(async () => {
                    try {
                        const plant: StrainzModel = await this.getStrainDataForTokenId(tokenId);
                        await insertStrain(plant);
                        console.log('name or color changed of:', tokenId);
                    } catch {
                        console.log('name or color change error:', tokenId);

                    }

                }, 5000);
            });
    }

    async refreshTrade(tradeId: number, numberOfTries = 0) {
        if (numberOfTries < 30) {
            setTimeout(async () => {
                try {
                    const trade: TradeModel = await this.getTradeById(tradeId);
                    await insertTrade(trade);
                    console.log('trade changed: ', trade._id, trade.status);
                } catch {
                    console.log('could not fetch trade', tradeId, '#Tries:', numberOfTries, numberOfTries === 30 ? `stop fetching` : '');
                    await this.refreshTrade(tradeId, ++numberOfTries);
                }
            }, 1000);
        }
    }

    async refreshOffer(offerId: number, numberOfTries = 0) {
        if (numberOfTries < 30) {
            setTimeout(async () => {
                try {
                    const offer: OfferModel = await this.getOfferById(offerId);
                    await insertOffer(offer);
                    console.log('offer changed: ', offer._id, offer.status);
                } catch {
                    console.log('could not fetch offer', offerId, '#Tries:', numberOfTries, numberOfTries === 30 ? `stop fetching` : '');
                    await this.refreshOffer(offerId, ++numberOfTries);
                }
            }, 1000);
        }
    }

    registerMarketplaceEvents(): void {
        // @ts-ignore

        this.eventMarketplace.events.ERC721TradeStatusChange()
            .on('data', async (event: any) => {
                const newId = +event?.returnValues?.tradeId;
                console.log('trade changed:', newId);

                await this.refreshTrade(newId);
            });

        this.eventMarketplace?.events.ERC721OfferStatusChange()
            .on('data', async (event: any) => {
                const newId = +event?.returnValues?.offerId;
                console.log('offer changed:', newId);
                await this.refreshOffer(newId);

            });
    }

    registerSeedzEvents(): void {
        // @ts-ignore

        this.eventSeedz.events.FertilizerBought()
            .on('data', async (event: any) => {
                const plantId = +event?.returnValues?.plantId;
                console.log('fertilizer bought:', plantId);

                setTimeout(async () => {
                    try {
                        const plant: StrainzModel = await this.getStrainDataForTokenId(plantId);
                        await insertStrain(plant);
                    } catch {
                        console.log('fertilizer event error', plantId);
                    }

                }, 5000);
            });
        // @ts-ignore

        this.eventSeedz.events.Deposit()
            .on('data', async (event: any) => {
                const poolId = +event?.returnValues?.pid;
                console.log('pool deposited:', poolId);

                setTimeout(async () => {
                    await this.loadPool(poolId);
                }, 5000);
            });
        // @ts-ignore

        this.eventSeedz.events.Withdraw()
            .on('data', async (event: any) => {
                const poolId = +event?.returnValues?.pid;
                console.log('pool withdrawn:', poolId);

                setTimeout(async () => {
                    await this.loadPool(poolId);
                }, 5000);
            });
    }

    registerAccessoryEvents(): void {
        // @ts-ignore

        this.eventAccessory.events.AccessoryAttached()
            .on('data', async (event: any) => {
                const accessoryId = +event?.returnValues?.accessoryId;
                const strainId = +event?.returnValues?.strainId;
                console.log('accessory attached:', accessoryId, 'on:', strainId);

                setTimeout(async () => {
                    try {
                        const plant: StrainzModel = await this.getStrainDataForTokenId(strainId);
                        await insertStrain(plant);
                    } catch {
                        console.log('accessory attach event error', accessoryId, 'on:', strainId);
                    }
                }, 5000);
            });
    }

    async getTradeById(tradeId: number): Promise<TradeModel> {
        const fetched: FetchTradeModel = await this.marketplace.methods.erc721Trades(tradeId).call();

        return {
            _id: tradeId,
            buyer: fetched.buyer,
            status: +fetched.status,
            nftContractAddress: fetched.nftContractAddress,
            poster: fetched.poster,
            strainzTokenPrice: +fetched.strainzTokenPrice,
            tokenId: +fetched.tokenId
        };

    }

    async getOfferById(offerId: number): Promise<OfferModel> {
        const fetched: FetchOfferModel = await this.marketplace.methods.erc721Offers(offerId).call();

        return {
            _id: offerId,
            offerer: fetched.offerer,
            status: +fetched.status,
            nftContractAddress: fetched.nftContractAddress,
            seller: fetched.seller,
            offerAmount: +fetched.offerAmount,
            tokenId: +fetched.tokenId
        };

    }


    async getStrainDataForTokenId(tokenId: number): Promise<StrainzModel> {
        console.log('----------------------');
        console.log('get strain', tokenId);
        const result: StrainMetadata = await this.strainzNFT.methods.strainData(tokenId).call();
        console.log('get accessories');

        const accessoryIds: number[] = await this.accessory.methods.getAccessoriesByStrainId(tokenId).call();
        console.log('map accessories');

        const accessories = await Promise.all(accessoryIds.map(async id => {
            return +await this.accessory.methods.accessoryTypeByTokenId(+id).call();
        }));
        console.log('get fertilizer');

        const lastFertilizer = +await this.seedz.methods.lastTimeGrowFertilizerUsedOnPlant(tokenId).call();
        //console.log('get owner')


        const owner = await this.strainzNFT.methods.ownerOf(tokenId).call();

        console.log('----------------------');

        return {
            _id: +tokenId,
            dna: result.dna,
            breedingCost: +result.breedingCost,
            generation: +result.generation,
            growRate: +result.growRate,
            lastHarvest: +result.lastHarvest,
            lastFertilizer: +lastFertilizer,
            owner,
            prefix: result.prefix,
            postfix: result.postfix,
            accessories
        };
    }

    async getPoolById(id: number): Promise<PoolModel> {
        const lpTokenContract = new this.web3.eth.Contract(ierc20Artifacts.abi as any, id == 0 ? contracts.pool1 : contracts.pool2);

        const stakedLP = +await lpTokenContract.methods.balanceOf(contracts.seedzTokenAddress).call();
        const totalLP = +await lpTokenContract.methods.totalSupply().call();

        return {
            id,
            stakedLP,
            totalLP,
            balance: 0,
            claimable: 0,
            staked: 0
        };
    }

    async updateSupply(): Promise<void> {
        const strainzTokenContract = new this.web3.eth.Contract(ierc20Artifacts.abi as any, contracts.strainzTokenAddress);
        this.strainzSupply = +await strainzTokenContract.methods.totalSupply().call();

        const seedzTokenContract = new this.web3.eth.Contract(ierc20Artifacts.abi as any, contracts.seedzTokenAddress);
        this.seedzSupply = +await seedzTokenContract.methods.totalSupply().call();
    }


}

export async function insertStrain(strain: StrainzModel): Promise<void> {
    const existing = await getStrainzCollection().findOne({_id: strain._id});
    if (!existing) {
        await getStrainzCollection().insertOne(strain);
    } else {
        await getStrainzCollection().replaceOne({_id: strain._id}, strain);
    }
}

export async function insertTrade(trade: TradeModel): Promise<void> {
    const existing = await getTradeCollection().findOne({_id: trade._id});
    if (!existing) {
        await getTradeCollection().insertOne(trade);
    } else {
        await getTradeCollection().replaceOne({_id: trade._id}, trade);
    }
}

export async function insertPool(pool: PoolModel): Promise<void> {
    const existing = await getPoolCollection().findOne({id: pool.id});
    if (!existing) {
        await getPoolCollection().insertOne(pool);
    } else {
        await getPoolCollection().replaceOne({id: pool.id}, pool);
    }
}

export async function insertOffer(offer: OfferModel): Promise<void> {
    const existing = await getOffersCollection().findOne({_id: offer._id});
    if (!existing) {
        await getOffersCollection().insertOne(offer);
    } else {
        await getOffersCollection().replaceOne({_id: offer._id}, offer);
    }
}

export async function removeStrainData(tokenId: number): Promise<void> {
    await getStrainzCollection().deleteOne({_id: tokenId});
}


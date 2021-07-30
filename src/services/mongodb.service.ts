import * as mongodb from 'mongodb';

let mongoClient: mongodb.MongoClient | undefined;

export async function initMongoDb(): Promise<void> {
    mongoClient = await mongodb.connect("mongodb://localhost:27017", {useUnifiedTopology: true});
    console.log('Connected to mongo.');
}

export function getStrainzCollection(): mongodb.Collection {
    if (!mongoClient) {
        throw new Error('Mongo not connected!');
    }
    return mongoClient.db("strainzv3").collection('strainz');
}

export function getTradeCollection(): mongodb.Collection {
    if (!mongoClient) {
        throw new Error('Mongo not connected!');
    }
    return mongoClient.db("strainzv3").collection('trades');
}

export function getOffersCollection(): mongodb.Collection {
    if (!mongoClient) {
        throw new Error('Mongo not connected!');
    }
    return mongoClient.db("strainzv3").collection('offers');
}

export function getPoolCollection(): mongodb.Collection {
    if (!mongoClient) {
        throw new Error('Mongo not connected!');
    }
    return mongoClient.db("strainzv3").collection('pools');
}

export {mongoClient};

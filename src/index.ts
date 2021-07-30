import {Server} from './server';
import { initStrains } from './services/strain.service';
import { initMongoDb } from './services/mongodb.service';

console.log('Starting server!');

const server = new Server();
setTimeout(async () => {
    try {
        await initMongoDb();
    } catch (err) {
        console.error('Mongo init failed. ', err);
        return;
    }
    await server.start();
    await initStrains();

}, 0);

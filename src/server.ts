import bodyParser = require('body-parser');
import cors = require('cors');
import express = require('express');
import { strainRoutes } from './services/strain.service';

export class Server {
    private app = express();

    public async start(): Promise<void> {


        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: false}));
        this.app.use(cors());

        this.app.use(strainRoutes);



        this.app.listen(3333);
        console.log(`Server started at port 3333`);
    }

}

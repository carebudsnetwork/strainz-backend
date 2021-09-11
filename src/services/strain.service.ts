import { Image } from 'canvas';
import { Color, StrainPart } from '../models/straindata.model';
import { StrainzManager } from './web3.service';
import { getOffersCollection, getPoolCollection, getStrainzCollection, getTradeCollection } from './mongodb.service';
import { ERC721Metadata } from '../models/ERC721Metadata';
import { accessoryName, AccessoryType } from '../models/accessory.model';
import { mapDNA, setCharAt } from '../util';
import express = require('express');
import fs = require('fs');
import { StrainzModel } from '../models/StrainzModel';
import * as config from '../config.json';

const appRoot = require('app-root-path');


const {createCanvas, loadImage} = require('canvas');



export type NameDict = { [partName: string]: string };
const nameDict: NameDict = {};
nameDict[StrainPart.pot_normal] = 'Clay';
nameDict[StrainPart.pot_silver] = 'Silver';
nameDict[StrainPart.pot_gold] = 'Gold';
nameDict[StrainPart.pot_colorful] = 'Colorful';
nameDict[StrainPart.pot_bottle] = 'Bottle';
nameDict[StrainPart.pot_shoe_back] = 'Shoe';
nameDict[StrainPart.pot_bucket] = 'Wooden Bucket';

nameDict[StrainPart.head_1] = 'Small';
nameDict[StrainPart.head_2] = 'Medium';
nameDict[StrainPart.head_3] = 'Large';
nameDict[StrainPart.head_4] = 'Small Double';
nameDict[StrainPart.head_5] = 'Large Double';
nameDict[StrainPart.head_6] = 'Rasta Double';
nameDict[StrainPart.head_rasta] = 'Rasta';

nameDict[StrainPart.body_thin] = 'Thin';
nameDict[StrainPart.body_bushy] = 'Bushy';
nameDict[StrainPart.body_twisted] = 'Twisted';
nameDict[StrainPart.body_flowered] = 'Flowered';
nameDict[StrainPart.body_thick] = 'Thick';
nameDict[StrainPart.body_triple] = '3-Stemed';

nameDict[StrainPart.face_stoned] = 'Stoned';
nameDict[StrainPart.face_neutral] = 'Neutral';
nameDict[StrainPart.face_nausea] = 'Nausea';
nameDict[StrainPart.face_happy] = 'Happy';
nameDict[StrainPart.face_funny] = 'Funny';

nameDict[StrainPart.joint] = 'Joint';
nameDict[StrainPart.sunglasses] = 'Sunglasses';
nameDict[StrainPart.earring] = 'Earring';


const width = 500;
const height = 800;
const colorToReplace: Color = {
    red: 251,
    green: 175,
    blue: 51
};

export type PartDict = { [partName: string]: Image };


let parts: PartDict;
const heads = [
    StrainPart.head_1,
    StrainPart.head_2,
    StrainPart.head_3,
    StrainPart.head_4,
    StrainPart.head_5,
    StrainPart.head_6,
    StrainPart.head_rasta
];
const pots = [
    StrainPart.pot_normal,
    StrainPart.pot_silver,
    StrainPart.pot_gold,
    StrainPart.pot_colorful,
    StrainPart.pot_bottle,
    StrainPart.pot_shoe_back,
    StrainPart.pot_bucket,

];
const bodies = [
    StrainPart.body_thin,
    StrainPart.body_bushy,
    StrainPart.body_twisted,
    StrainPart.body_flowered,
    StrainPart.body_thick,
    StrainPart.body_triple
];
const faces = [
    StrainPart.face_funny,
    StrainPart.face_happy,
    StrainPart.face_nausea,
    StrainPart.face_neutral,
    StrainPart.face_stoned,
];

const miscs = [
    StrainPart.sunglasses,
    StrainPart.joint,
    StrainPart.earring
];


let strainzManager: StrainzManager;


export async function initStrains() {
    strainzManager = new StrainzManager();
    await strainzManager.init();
    parts = await loadStrainParts([
        StrainPart.pot_normal, StrainPart.pot_silver, StrainPart.pot_gold, StrainPart.pot_colorful,
        StrainPart.pot_bottle, StrainPart.pot_shoe_back, StrainPart.pot_shoe_front, StrainPart.pot_bucket,
        StrainPart.head_3, StrainPart.head_2, StrainPart.head_1, StrainPart.head_rasta, StrainPart.hair,
        StrainPart.body_thin, StrainPart.body_bushy, StrainPart.body_twisted, StrainPart.body_flowered, StrainPart.body_triple, StrainPart.body_thick, StrainPart.face_happy, StrainPart.face_nausea, StrainPart.face_funny,
        StrainPart.face_neutral, StrainPart.face_stoned, StrainPart.sunglasses, StrainPart.joint, StrainPart.earring, StrainPart.head_3_hair
    ]);

    // Calc double heads
    parts[StrainPart.head_4] = await combineImages(parts[StrainPart.head_2], parts[StrainPart.head_1]);
    parts[StrainPart.head_5] = await combineImages(parts[StrainPart.head_3], parts[StrainPart.head_1]);
    parts[StrainPart.head_6] = await combineImages(parts[StrainPart.head_2], parts[StrainPart.head_rasta]);


}

async function loadStrainParts(partNames: StrainPart[]): Promise<{ [partName: string]: Image }> {
    const images: { [partName: string]: Image } = {};
    await Promise.all(partNames.map(async name => {
        images[name] = await loadImage(`src/assets/${name}.png`);
    }));
    return images;
}

async function combineImages(image1: Image, image2: Image): Promise<Image> {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image1, 0, 0, width, height);
    ctx.drawImage(image2, 0, 0, width, height);
    return await loadImage(canvas.toDataURL());
}

function serializeImage(image: Image) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.createPNGStream();
}

function componentToHex(c: number) {
    const hex = c.toString(16);
    return hex.length == 1 ? '0' + hex : hex;
}

function rgbToHex(color: Color) {
    return componentToHex(color.red) + componentToHex(color.green) + componentToHex(color.blue);
}

export async function buildStrain(toCombine: StrainPart[], color: Color): Promise<Image> {

    let result: Image = parts[toCombine[0]];

    const hair: Image = parts[StrainPart.hair];
    const dyedHair: Image = await replaceColor(hair, color);

    const now = new Date();
    for (let i = 1; i < toCombine.length; i++) {
        result = await combineImages(result, parts[toCombine[i]]);

        if (toCombine[i] === StrainPart.head_3 || toCombine[i] === StrainPart.head_5) {
            const dyedHair = await replaceColor(parts[StrainPart.head_3_hair], color);
            result = await combineImages(result, dyedHair);
        }
    }

    result = await combineImages(result, dyedHair);

    const took = new Date().getTime() - now.getTime();
    console.log(took);
    return result;
}


export async function replaceColor(image: Image, color: Color): Promise<Image> {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height);

    for (let i = 0; i < data.data.length; i += 4) {
        const tolerance = 210;
        // is this pixel the old rgb?
        if (data.data[i] >= colorToReplace.red - tolerance && data.data[i] <= colorToReplace.red + tolerance &&
            data.data[i + 1] >= colorToReplace.green - tolerance && data.data[i + 1] <= colorToReplace.green + tolerance &&
            data.data[i + 2] >= colorToReplace.blue - tolerance && data.data[i + 2] <= colorToReplace.blue + tolerance
        ) {
            // change to your new rgb
            data.data[i] = color.red;
            data.data[i + 1] = color.green;
            data.data[i + 2] = color.blue;
        }

    }
    ctx.putImageData(data, 0, 0);

    return await loadImage(canvas.toDataURL());
}

export async function getImageForDna(dna: number): Promise<Image> {
        const parsed = parseDNA(dna);
        const image =  await buildStrain(parsed.parts, parsed.color);
        await cacheImage(image, dna);
        return image;
}

async function cacheImage(image: Image, dna: number) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);
    const outstream = canvas.createPNGStream();
    const fstream = fs.createWriteStream(appRoot + '/cache/image/' + dna + '.png');
    outstream.pipe(fstream);
}

function getGene(dna: number, n: number) {
    return Math.floor((dna / (10 ** (15 - n))) % 10);
}

function getBlueGene(dna: number) {
    return dna % 1000;
}

function getGreenGene(dna: number) {
    return (dna % 1000000 - (dna % 1000)) / 1000;
}

function getRedGene(dna: number) {
    return (dna % 1000000000 - (dna % 1000000)) / 1000000;
}

export function parseDNA(dna: number): { parts: StrainPart[], color: Color } {
    const pot = pots[getGene(dna, 0) - 1];
    const head = heads[getGene(dna, 1) - 1];
    const body = bodies[getGene(dna, 2) - 1];
    const face = faces[getGene(dna, 3) - 1];
    const joint = getGene(dna, 4) > 0;
    const sunglasses = getGene(dna, 5) > 0;
    const earring = getGene(dna, 6) > 0;
    const red = getRedGene(dna);
    const green = getGreenGene(dna);
    const blue = getBlueGene(dna);

    const myParts = [
        pot, head, body, face
    ];

    if(pot === StrainPart.pot_bottle) {
        myParts.splice(0,1);
        myParts.push(StrainPart.pot_bottle);
    } else if (pot === StrainPart.pot_shoe_back) {
        myParts.push(StrainPart.pot_shoe_front);
    }



    if (joint) {
        myParts.push(StrainPart.joint);
    }

    if (sunglasses) {
        myParts.push(StrainPart.sunglasses);
    }

    if (earring) {
        myParts.push(StrainPart.earring);
    }



    return {
        parts: myParts,
        color: {
            red, green, blue
        }
    };
}


const strainRoutes = express.Router();


strainRoutes.get('/strain/:id', async (req, res) => {
    let id = Number.parseInt(req.params.id);

    const metadata: StrainzModel = await strainzManager.getStrainDataForTokenId(id);



    const parsedDNA = parseDNA(Number.parseInt(metadata.dna));


    let imageDNA: string = `${metadata.dna}`;

    imageDNA = mapDNA(imageDNA, metadata.accessories);


    const meta: ERC721Metadata = {
        name: `${metadata.prefix ? metadata.prefix : ''} ${metadata.postfix}`,
        image: `${config.imagegenUrl}/image/${imageDNA}`,
        description: 'https://strainz.tech',
        external_url: `https://strainz.tech/strain/${id}`,

        properties: {
            generation: `${metadata.generation}`,
            growRate: `${metadata.growRate}`,
            breedingCost: `${metadata.breedingCost}`,
            pot: nameDict[parsedDNA.parts[0]],
            head: nameDict[parsedDNA.parts[1]],
            body: nameDict[parsedDNA.parts[2]],
            face: nameDict[parsedDNA.parts[3]],
            color: rgbToHex(parsedDNA.color),
            accessories: metadata.accessories.toString()
        },
        attributes: [
            {
                trait_type: 'Head',
                value: nameDict[parsedDNA.parts[1]]
            },
            {
                trait_type: 'Pot',
                value: nameDict[parsedDNA.parts[0]]
            },
            {
                trait_type: 'Body',
                value: nameDict[parsedDNA.parts[2]]
            },
            {
                trait_type: 'Face',
                value: nameDict[parsedDNA.parts[3]]
            },
            {
                trait_type: 'Generation',
                value: metadata.generation,
                display_type: 'number',
            },
            {
                trait_type: 'Grow Rate',
                value: metadata.growRate,
            },
            {
                trait_type: 'Breeding Cost',
                value: metadata.breedingCost,
            }


        ]

    };

    res.json(meta);
});

strainRoutes.get('/supply/strainz', async (req, res) => {
    res.json({supply: strainzManager.strainzSupply});
});
strainRoutes.get('/supply/seedz', async (req, res) => {
    res.json({supply: strainzManager.seedzSupply});
});


strainRoutes.get('/pool/:id', async (req, res) => {
    res.json(await getPoolCollection().findOne({id: +req.params.id}));
});

strainRoutes.get('/strainz', async (req, res) => {
    res.json(await getStrainzCollection().find({}).toArray());
});

strainRoutes.get('/strainz/owned/:address', async (req, res) => {
    res.json(await getStrainzCollection().find({owner: req.params.address}).toArray());
});

strainRoutes.get('/strainz/:id', async (req, res) => {
    res.json(await getStrainzCollection().find({tokenId: +req.params.id}).toArray());
});

strainRoutes.get('/trades', async (req, res) => {
   res.json(await getTradeCollection().find({}).toArray());
});
strainRoutes.get('/trades/:poster', async (req, res) => {
    res.json(await getTradeCollection().find({poster: req.params.poster}).toArray());
});
strainRoutes.get('/offers', async (req, res) => {
    res.json(await getOffersCollection().find({}).toArray());
});
strainRoutes.get('/strainz/:id/offers', async (req, res) => {
    res.json(await getOffersCollection().find({tokenId: +req.params.id}).toArray());
});


export { strainRoutes };

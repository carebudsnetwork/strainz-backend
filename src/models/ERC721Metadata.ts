export interface ERC721Metadata {
    name: string;
    description: string;
    properties?: {
        [key: string]: string;
    };
    attributes: any[];
    external_url: string;
    image: string;
}

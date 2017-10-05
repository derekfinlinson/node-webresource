export declare enum WebResourceType {
    HTML = 1,
    CSS = 2,
    JavaScript = 3,
    XML = 4,
    PNG = 5,
    JPG = 6,
    GIF = 7,
    XAP = 8,
    XSL = 9,
    ICO = 10,
}
export interface Config {
    tenant: string;
    clientId?: string;
    clientSecret?: string;
    server: string;
    username?: string;
    password?: string;
    webResources: WebResource[];
    solution: string;
}
export interface WebResource {
    displayname?: string;
    name?: string;
    type?: WebResourceType;
    content: string;
    path?: string;
}
export interface WebResourceAsset {
    content: string;
    path: string;
}
export declare function upload(config: Config, assets: WebResourceAsset[]): Promise<any>;

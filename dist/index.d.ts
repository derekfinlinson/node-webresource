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
    type?: string;
    content?: string;
    path?: string;
    webresourcetype?: number;
}
export interface WebResourceAsset {
    content: string;
    path: string;
}
export declare function upload(config: Config, assets: WebResourceAsset[]): Promise<any>;

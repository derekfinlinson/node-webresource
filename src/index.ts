import * as CRMWebAPI from 'CRMWebAPI';

const adal: any = require("adal-node");

function getWebResourceType(type: string): number {
    switch (type) {
        case 'HTML':
            return 1;            
        case 'CSS':
            return 2;
        case 'JavaScript':
            return 3;
        case 'XML':
            return 4;
        case 'PNG':
            return 5;
        case 'JPG':
            return 6;
        case 'GIF':
            return 7;
        case 'XAP':
            return 8;
        case 'XSL':
            return 9;
        case 'ICO':
            return 10;
    }
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
    type?: string;
    content: string;
    path?: string;
    webresourcetype?: number;
}

export interface WebResourceAsset {
    content: string;
    path: string;
}

function authenticate (config: Config): Promise<string> {
    return new Promise((resolve, reject) => {
        // authenticate
        const authorityHostUrl: string = `https://login.windows.net/${config.tenant}`;
        const context: any = new adal.AuthenticationContext(authorityHostUrl);
        const clientId: string = config.clientId || "c67c746f-9745-46eb-83bb-5742263736b7";

        // use client id/secret auth
        if (config.clientSecret != null && config.clientSecret !== "") {
            context.acquireTokenWithClientCredentials(config.server, clientId, config.clientSecret,
                (ex: string, token: any) => {
                    if (ex) {
                        reject(ex);
                    } else {
                        resolve(token.accessToken);
                    }
                }
            );
        // username/password authentication
        } else {
            context.acquireTokenWithUsernamePassword(config.server, config.username, config.password, clientId,
                (ex: string, token: any) => {
                    if (ex) {
                        reject(ex);
                    } else {
                        resolve(token.accessToken);
                    }
                }
            );
        }
    });
}

function getUpserts(config: Config, assets: WebResourceAsset[], api: CRMWebAPI): Promise<any>[] {
    return assets.map(async asset => {
        // get web resource from config
        let resource: WebResource[] = config.webResources.filter((wr) => {
            return wr.path === asset.path;
        });

        if (resource.length === 0) {
            console.log("Web resource " + asset.path + " is not configured");
            return Promise.resolve();
        } else {
            // check if web resource already exists
            const options: CRMWebAPI.QueryOptions = {
                Select: ["webresourceid"],
                Filter: `name eq '${resource[0].name}'`
            };

            let result: CRMWebAPI.GetListResponse<any>;

            try {
                result = await api.GetList("webresourceset", options);
            } catch (ex) {
                return Promise.reject(ex);
            }

            // create or update web resource
            let webResource: WebResource = {
                content: new Buffer(asset.content).toString("base64")
            };

            if (result.List.length === 0) {
                console.log(`Creating web resource ${resource[0].name}`);

                webResource.webresourcetype = getWebResourceType(resource[0].type);
                webResource.name = resource[0].name;
                webResource.displayname = resource[0].displayname || resource[0].name;

                return api.Create("webresourceset", webResource);
            } else {
                console.log(`Updating web resource ${resource[0].name}`);

                return api.Update("webresourceset", result.List[0].webresourceid, webResource);
            }
        }
    });
}

export function upload(config: Config, assets: WebResourceAsset[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
        let token: string;

        try {
            token = await authenticate(config);
        } catch (ex) {
            reject(ex);
            return;
        }

        console.log("\r\nUploading web resources...");

        var apiConfig: CRMWebAPI.Config = {
            APIUrl: config.server + `/api/data/v8.0/`,
            AccessToken: token
        };

        const api: CRMWebAPI = new CRMWebAPI(apiConfig);

        // retrieve assets from CRM then create/update
        let upserts: any[] = [];

        try {
            upserts = await Promise.all(getUpserts(config, assets, api));
        } catch (ex) {
            reject(ex);
            return;
        }

        // publish resources
        console.log("Publishing web resources...");

        // get updates and inserts
        const updates: any[] = [];
        const inserts: any[] = [];

        upserts.forEach(u => {
            if (typeof(u) !== "undefined" && u.hasOwnProperty("EntityID")) {
                updates.push(`<webresource>{${u.EntityID}}</webresource>`);
            } else if (typeof(u) !== "undefined") {
                inserts.push(u);
            }
        });

        const tasks: any[] = [];

        // publish all updates at once
        if  (updates.length > 0) {
            tasks.push({
                action: "PublishXml",
                data: {
                    ParameterXml: `<importexportxml><webresources>${updates.join("")}</webresources></importexportxml>`
                }
            });
        }

        // add solution component individually
        inserts.forEach(i => {
            const item: object = {
                action: "AddSolutionComponent",
                data: {
                    ComponentId: i,
                    ComponentType: 61,
                    SolutionUniqueName: config.solution,
                    AddRequiredComponents: false,
                    IncludedComponentSettingsValues: null
                }
            };

            tasks.push(item);
        });

        for (let i: number = 0; i < tasks.length; i++) {
            try {
                await api.ExecuteAction(tasks[i].action, tasks[i].data);
            } catch (ex) {
                reject(ex);
                return;
            }
        }

        console.log("Uploaded and published web resources\r\n");
        resolve();
    });
}
import { WebApi } from 'xrm-webapi';

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

enum UpsertType {
    create,
    update
}

interface Upsert {
    id: string;
    type: UpsertType
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

async function getUpsert(config: Config, asset: WebResourceAsset, api: WebApi): Promise<Upsert> {
    // get web resource from config
    let resource: WebResource[] = config.webResources.filter((wr) => {
        return wr.path === asset.path;
    }); 

    if (resource.length === 0) {
        console.log("Web resource " + asset.path + " is not configured");
        return Promise.resolve(null);
    } else {
        // check if web resource already exists
        const options = `$select=webresourceid&$filter=name eq '${resource[0].name}'`

        try {
            const response = await api.retrieveMultiple("webresourceset", options);

            // create or update web resource
            let webResource: WebResource = {
                content: new Buffer(asset.content).toString("base64")
            };

            if (response.data.value.length === 0) {
                console.log(`Creating web resource ${resource[0].name}`);

                webResource.webresourcetype = getWebResourceType(resource[0].type);
                webResource.name = resource[0].name;
                webResource.displayname = resource[0].displayname || resource[0].name;

                const result = await api.createWithReturnData("webresourceset", webResource, "$select=webresourceid");

                return {
                    id: result.data.value[0].webresourceid,
                    type: UpsertType.create
                };
            } else {
                console.log(`Updating web resource ${resource[0].name}`);

                const result = await api.updateWithReturnData("webresourceset", response.data.value[0].webresourceid, webResource, "$select=webresourceid");

                return {
                    id: result.data.value[0].webresourceid,
                    type: UpsertType.update
                };
            }
        } catch (ex) {
            return Promise.reject(ex);
        }
    }
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

        const api = new WebApi("8.2", token, config.server);

        // retrieve assets from CRM then create/update
        let upserts: Upsert[];

        try {
            const promises = assets.map(asset => {
                return getUpsert(config, asset, api);
            });

            upserts = await Promise.all(promises);
        } catch (ex) {
            reject(ex);
            return;
        }

        // publish resources
        console.log("Publishing web resources...");

        // get updates and inserts
        const updates: string[] = [];
        const inserts: string[] = [];

        for (let u of upserts) {
            if (u != null) {
                if (u.type === UpsertType.update) {
                    updates.push(`<webresource>{${u.id}}</webresource>`);
                } else {
                    inserts.push(u.id);
                }
            }
        }

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
        for (let i of inserts) {
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
        }

        for (let i: number = 0; i < tasks.length; i++) {
            try {
                await api.unboundAction(tasks[i].action, tasks[i].data);
            } catch (ex) {
                reject(ex);
                return;
            }
        }

        console.log("Uploaded and published web resources\r\n");
        resolve();
    });
}
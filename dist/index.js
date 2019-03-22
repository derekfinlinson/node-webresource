"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const xrm_webapi_node_1 = require("xrm-webapi/dist/xrm-webapi-node");
const adal_node_1 = require("adal-node");
function getWebResourceType(type) {
    switch (type) {
        case "HTML":
            return 1;
        case "CSS":
            return 2;
        case "JavaScript":
            return 3;
        case "XML":
            return 4;
        case "PNG":
            return 5;
        case "JPG":
            return 6;
        case "GIF":
            return 7;
        case "XAP":
            return 8;
        case "XSL":
            return 9;
        case "ICO":
            return 10;
    }
}
var UpsertType;
(function (UpsertType) {
    UpsertType[UpsertType["create"] = 0] = "create";
    UpsertType[UpsertType["update"] = 1] = "update";
})(UpsertType || (UpsertType = {}));
function authenticate(config) {
    return new Promise((resolve, reject) => {
        // authenticate
        const authorityHostUrl = `https://login.windows.net/${config.tenant}`;
        const context = new adal_node_1.AuthenticationContext(authorityHostUrl);
        const clientId = config.clientId || "c67c746f-9745-46eb-83bb-5742263736b7";
        // use client id/secret auth
        if (config.clientSecret != null && config.clientSecret !== "") {
            context.acquireTokenWithClientCredentials(config.server, clientId, config.clientSecret, (ex, token) => {
                if (ex) {
                    reject(ex.message);
                }
                else {
                    resolve(token.accessToken);
                }
            });
            // username/password authentication
        }
        else {
            context.acquireTokenWithUsernamePassword(config.server, config.username, config.password, clientId, (ex, token) => {
                if (ex) {
                    reject(ex.message);
                }
                else {
                    resolve(token.accessToken);
                }
            });
        }
    });
}
function getUpsert(config, asset, token) {
    return __awaiter(this, void 0, void 0, function* () {
        // get web resource from config
        let resource = config.webResources.filter((wr) => {
            return wr.path === asset.path;
        });
        if (resource.length === 0) {
            console.log("Web resource " + asset.path + " is not configured");
            return null;
        }
        else {
            const apiConfig = new xrm_webapi_node_1.WebApiConfig("8.2", token, config.server);
            // check if web resource already exists
            const options = `$select=webresourceid&$filter=name eq "${resource[0].name}"`;
            try {
                const response = yield xrm_webapi_node_1.retrieveMultiple(apiConfig, "webresourceset", options);
                // create or update web resource
                let webResource = {
                    content: new Buffer(asset.content).toString("base64")
                };
                if (response.value.length === 0) {
                    console.log(`Creating web resource ${resource[0].name}`);
                    webResource.webresourcetype = getWebResourceType(resource[0].type);
                    webResource.name = resource[0].name;
                    webResource.displayname = resource[0].displayname || resource[0].name;
                    const result = yield xrm_webapi_node_1.createWithReturnData(apiConfig, "webresourceset", webResource, "$select=webresourceid");
                    return {
                        id: result.webresourceid,
                        type: UpsertType.create,
                    };
                }
                else {
                    console.log(`Updating web resource ${resource[0].name}`);
                    yield xrm_webapi_node_1.update(apiConfig, "webresourceset", new xrm_webapi_node_1.Guid(response.value[0].webresourceid), webResource);
                    return {
                        id: response.value[0].webresourceid,
                        type: UpsertType.update,
                    };
                }
            }
            catch (ex) {
                throw new Error(ex);
            }
        }
    });
}
function upload(config, assets) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        let token;
        try {
            token = yield authenticate(config);
        }
        catch (ex) {
            throw new Error(ex);
        }
        console.log("\r\nUploading web resources...");
        // retrieve assets from CRM then create/update
        let upserts;
        const promises = assets.map(asset => {
            return getUpsert(config, asset, token);
        });
        try {
            upserts = yield Promise.all(promises);
        }
        catch (ex) {
            throw new Error(ex);
        }
        // publish resources
        console.log("Publishing web resources...");
        // get updates and inserts
        const updates = [];
        const inserts = [];
        for (let u of upserts) {
            if (u != null) {
                if (u.type === UpsertType.update) {
                    updates.push(`<webresource>{${u.id}}</webresource>`);
                }
                else {
                    inserts.push(u.id);
                }
            }
        }
        const tasks = [];
        // publish all updates at once
        if (updates.length > 0) {
            tasks.push({
                action: "PublishXml",
                data: {
                    ParameterXml: `<importexportxml><webresources>${updates.join("")}</webresources></importexportxml>`
                }
            });
        }
        // add solution component individually
        for (let i of inserts) {
            const item = {
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
        const apiConfig = new xrm_webapi_node_1.WebApiConfig("8.2", token, config.server);
        for (let i = 0; i < tasks.length; i++) {
            try {
                yield xrm_webapi_node_1.unboundAction(apiConfig, tasks[i].action, tasks[i].data);
            }
            catch (ex) {
                throw new Error(ex);
            }
        }
        console.log("Uploaded and published web resources\r\n");
        resolve();
    }));
}
exports.upload = upload;

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
const CRMWebAPI = require("CrmWebAPI");
const adal = require("adal-node");
function getWebResourceType(type) {
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
function authenticate(config) {
    return new Promise((resolve, reject) => {
        // authenticate
        const authorityHostUrl = `https://login.windows.net/${config.tenant}`;
        const context = new adal.AuthenticationContext(authorityHostUrl);
        const clientId = config.clientId || "c67c746f-9745-46eb-83bb-5742263736b7";
        // use client id/secret auth
        if (config.clientSecret != null && config.clientSecret !== "") {
            context.acquireTokenWithClientCredentials(config.server, clientId, config.clientSecret, (ex, token) => {
                if (ex) {
                    reject(ex);
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
                    reject(ex);
                }
                else {
                    resolve(token.accessToken);
                }
            });
        }
    });
}
function getUpserts(config, assets, api) {
    return assets.map((asset) => __awaiter(this, void 0, void 0, function* () {
        // get web resource from config
        let resource = config.webResources.filter((wr) => {
            return wr.path === asset.path;
        });
        if (resource.length === 0) {
            console.log("Web resource " + asset.path + " is not configured");
            return Promise.resolve();
        }
        else {
            // check if web resource already exists
            const options = {
                Select: ["webresourceid"],
                Filter: `name eq '${resource[0].name}'`
            };
            let result;
            try {
                result = yield api.GetList("webresourceset", options);
            }
            catch (ex) {
                return Promise.reject(ex);
            }
            // create or update web resource
            let webResource = {
                content: new Buffer(asset.content).toString("base64")
            };
            if (result.List.length === 0) {
                console.log(`Creating web resource ${resource[0].name}`);
                webResource.webresourcetype = getWebResourceType(resource[0].type);
                webResource.name = resource[0].name;
                webResource.displayname = resource[0].displayname || resource[0].name;
                return api.Create("webresourceset", webResource);
            }
            else {
                console.log(`Updating web resource ${resource[0].name}`);
                return api.Update("webresourceset", result.List[0].webresourceid, webResource);
            }
        }
    }));
}
function upload(config, assets) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        let token;
        try {
            token = yield authenticate(config);
        }
        catch (ex) {
            reject(ex);
            return;
        }
        console.log("\r\nUploading web resources...");
        var apiConfig = {
            APIUrl: config.server + `/api/data/v8.0/`,
            AccessToken: token
        };
        const api = new CRMWebAPI(apiConfig);
        // retrieve assets from CRM then create/update
        let upserts = [];
        try {
            upserts = yield Promise.all(getUpserts(config, assets, api));
        }
        catch (ex) {
            reject(ex);
            return;
        }
        // publish resources
        console.log("Publishing web resources...");
        // get updates and inserts
        const updates = [];
        const inserts = [];
        upserts.forEach(u => {
            if (typeof (u) !== "undefined" && u.hasOwnProperty("EntityID")) {
                updates.push(`<webresource>{${u.EntityID}}</webresource>`);
            }
            else if (typeof (u) !== "undefined") {
                inserts.push(u);
            }
        });
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
        inserts.forEach(i => {
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
        });
        for (let i = 0; i < tasks.length; i++) {
            try {
                yield api.ExecuteAction(tasks[i].action, tasks[i].data);
            }
            catch (ex) {
                reject(ex);
                return;
            }
        }
        console.log("Uploaded and published web resources\r\n");
        resolve();
    }));
}
exports.upload = upload;

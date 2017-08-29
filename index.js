var webApi = require('CRMWebAPI');
var adal = require('adal-node');
var path = require('path');
var fs = require('fs');

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
		default:
			return null;
  }
}

function authenticate (config) {
    return new Promise(function (resolve, reject) {
        // Authenticate
        var authorityHostUrl = 'https://login.windows.net/' + config.tenant;
        var context = new adal.AuthenticationContext(authorityHostUrl);                

        function tokenResponse(err, token) {
            if (err) {
                reject(err);
                return;
            }

            resolve(token.accessToken);
        }

        var clientId = config.clientId || "85e1eea4-b614-40c9-acc8-58c95bb4cdf2";

        if (config.clientSecret != null) {
            context.acquireTokenWithClientCredentials(config.server, clientId, config.clientSecret, tokenResponse);
        } else {
            context.acquireTokenWithUsernamePassword(config.server, config.username, config.password, clientId, tokenResponse);
        }
    });
}

exports.upload = function(config, assets) {
    return new Promise(function (resolve, reject) {
        authenticate(config).then((token) => {
            console.log("\r\nUploading web resources...");

            var apiConfig = {
                APIUrl: config.server + `/api/data/v8.0/`,
                AccessToken: token
            };

            var api = new webApi(apiConfig);

            // Retrieve assets from CRM then create/update
            var resources = Promise.all(assets.map((asset) => {
                // Get web resource from config
                var resource = config.webResources.filter((wr) => {
                    return wr.path === asset.name;
                });
                
                if (resource.length === 0) {
                    console.log("Web resource " + asset.name + " is not configured");
                    return Promise.resolve();
                } else {
                    resource = resource[0];

                    // Check if web resource already exists
                    var option = {
                        Filter: "name eq '" + resource.uniqueName + "'",
                        Select: [ 'webresourceid' ]
                    };

                    return api.GetList("webresourceset", option).then((result) => {
                        // Create or update web resource
                        var webResource = {
                            content: new Buffer(asset.source).toString('base64')
                        };

                        if (result.List.length === 0) {
                            console.log(`Creating web resource ${resource.uniqueName}`);
                            webResource.webresourcetype = getWebResourceType(resource.type);
                            webResource.name = resource.uniqueName;
                            webResource.displayname = resource.displayName || resource.uniqueName

                            return api.Create("webresourceset", webResource);
                        } else {
                            console.log(`Updating web resource ${resource.uniqueName}`);
                            return api.Update("webresourceset", result.List[0].webresourceid, webResource);
                        }
                    });
                }            
            }));
            
            // Publish resources
            resources.then((upserts) => {
                console.log("Publishing web resources...");

                // Get updates
                var updates = upserts.filter((u) => {
                    return typeof(u) !== "undefined" && u.hasOwnProperty("EntityID");
                }).map((u) => `<webresource>{${u.EntityID}}</webresource>`).join("");
                
                // Get inserts
                var inserts = upserts.filter((u) => {
                    return typeof(u) !== "undefined" && !u.hasOwnProperty("EntityID");
                });

                var tasks = [];

                // Publish all updates at once
                if  (updates != "") {
                    tasks.push({
                        action: "PublishXml",
                        data: {
                            ParameterXml: `<importexportxml><webresources>${updates}</webresources></importexportxml>`
                        }
                    });
                }

                // Add solution component individually
                inserts.forEach((i) => {
                    var item = {
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

                tasks.reduce((current, task) => {
                    return current.then(() => {
                        return api.ExecuteAction(task.action, task.data);                        
                    });
                }, Promise.resolve()).then(() => {
                    console.log("Uploaded and published web resources\r\n");
                    resolve();
                }, (error) => {
                    reject(error);
                });
            }, (error) => {
                reject(error);
            });
        }, (error) => {
            reject(error);
        });
    });
}
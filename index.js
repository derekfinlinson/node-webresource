var webApi = require('CRMWebAPI');
var adal = require('adal-node');
var path = require('path');
var fs = require('fs');

var WebResource = function() {};

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

WebResource.prototype.upload = function (config, assets) {
    console.log("\r\nUploading web resources...");

    return new Promise(function (resolve, reject) {
        // Authenticate
        var authorityHostUrl = 'https://login.windows.net/' + config.tenant;
        var context = new adal.AuthenticationContext(authorityHostUrl);                

        context.acquireTokenWithClientCredentials(config.server, config.clientId, config.clientSecret, function (err, token) {
            if (err) {
                reject(err);
                return;
            }

            var apiConfig = {
                APIUrl: config.server + `/api/data/v8.0/`,
                AccessToken: token.accessToken
            };

            var api = new webApi(apiConfig);

            // Retrieve assets from CRM
            const resources = Promise.all(assets.map((asset) => {
                // Get web resource from config
                var resource = config.webResources.filter((wr) => {
                    return wr.path === asset;
                });
                
                if (resource.length === 0) {
                    console.log("Web resource " + asset + " is not configured");
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
                            content: fs.readFileSync(asset).toString()
                        };

                        if (result.List.length === 0) {
                            webResource.webresourcetype = getWebResourceType(resource.type);
                            webResource.name = resource.uniqueName;
                            webResource.displayname = resource.displayName || resource.uniqueName

                            return api.Create("webresourceset", webResource);
                        } else {
                            return api.Update("webresourceset", result.List[0].webresourceid, webResource);
                        }
                    });
                }            
            })).then((upserts) => {
                console.log("Publishing web resources...");

                // Get updates
                var updates = upserts.filter((u) => {
                    return u.hasOwnProperty("EntityID");
                }).map((u) => `<webresource>{${u.EntityID}}</webresource>`).join("");
                
                // Get inserts
                var inserts = upserts.filter((u) => {
                    return !u.hasOwnProperty("EntityID");
                });

                var tasks = [];

                // Publish all updates at once
                tasks.push({
                    action: "PublishXml",
                    data: {
                        ParameterXml: `<importexportxml><webresources>${updates}</webresources></importexportxml>`
                    }
                });

                // Add solution component individually
                inserts.forEach((i) => {
                    var item = {
                        action: "AddSolutionComponent",
                        data: {
                            ComponentId: upsert,
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
        });
    });
};

module.exports = new WebResource();
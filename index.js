var webApi = require('CRMWebAPI');
var adal = require('adal-node');
var path = require('path');

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
    return new Promise(function (resolve, reject) {
        // Authenticate
        var authorityHostUrl = 'https://login.windows.net/' + config.tenant;
        var context = new adal.AuthenticationContext(authorityHostUrl);                

        context.acquireTokenWithClientCredentials(config.server, config.clientId, config.clientSecret, function (err, token) {
            if (err) {
                reject(err);
                return;
            }

            var apiconfig = {
                APIUrl: config.server + '/api/data/v8.0/',
                AccessToken: token.accessToken
            };

            var api = new webApi(apiconfig);

            var promises = assets.map((asset) => {
                // Get web resource from config
                var resource = config.webResources.filter((wr) => {
                    return wr.path === asset.path;
                });
                
                if (resource.length === 0) {
                    reject("Web resource " + file.path + " is not configured");
                    return;
                }

                resource = resource[0];

                // Check if web resource already exists
                var option = {
                    Filter: "name eq '" + resource.uniqueName + "'",
                    Select: [ 'webresourceid' ]
                };

                return api.GetList("webresourceset", option);
            });

            Promise.all(promises).then((results) => {
                results.reduce((result) => {

                });
                
                var updatePromises = results.map((result) => {
                    // Create or update web resource
                    var webResource = {
                        content: file.source
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

                Promise.all(updatePromises).then((upserts) => {
                    for (var upsert of upserts) {
                        if (upsert.hasOwnProperty("id")) {
                            // Add to solution
                            var params = {
                                ComponentId: id,
                                ComponentType: 61,
                                SolutionUniqueName: config.solution,
                                AddRequiredComponents: false,
                                IncludedComponentSettingsValues: null
                            };

                            api.ExecuteAction("AddSolutionComponent", params).then(function () {
                                resolve(file.path + " added to solution " + config.solution);
                            }, function (error) {
                                reject(error);
                            });

                            // Publish
                                var publish = {
                                    ParameterXml: "<importexportxml><webresources><webresource>{" + 
                                    result.List[0].webresourceid + "}</webresource></webresources></importexportxml>"
                                };
                                
                                api.ExecuteAction("PublishXml", publish).then(function () {
                                    resolve(file.path + " published");
                                }, function (error) {
                                    reject(error);
                                }, function (error) {
                                    reject(error);
                                });
                        }
                    }
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
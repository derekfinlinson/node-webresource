# node-webresource
Node module for publishing Dynamics 365 web resources, inspired by [gulp-webresource](https://github.com/davidyack/gulp-webresource)

|Build|NPM|Semantic-Release|
|-----|---|----------------|
|[![Build Status](https://travis-ci.org/derekfinlinson/node-webresource.png?branch=master)](https://travis-ci.org/derekfinlinson/node-webresource)|[![npm](https://img.shields.io/npm/v/npm.svg?style=flat-square)](https://www.npmjs.com/package/node-webresource)|[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)|

## Usage

```javascript
npm install -D node-webresource
```

Sign in [here](https://login.microsoftonline.com/common/oauth2/authorize?%20response_type=code&client_id=c67c746f-9745-46eb-83bb-5742263736b7&redirect_uri=https://github.com/derekfinlinson/node-webresource) to grant access to your Dynamics 365 organization.

## Sample config file and usage

For a more complete sample using webpack, see [generator-xrm-webresource](https://github.com/derekfinlinson/generator-xrm-webresource/blob/master/generators/app/templates/webpack.config.js)

```javascript
var uploadConfig = {
    tenant: "mycompany.onmicrosoft.com",
    server: "https://mycompany.crm.dynamics.com",
    webResources: [
        {
            "path": "path\\to\\file\\formscript.js",
            "name": "new_formscript.js"
        }
    ],
    solution: "MySolution"
};

// Can use username/password or client id/secret
uploadConfig.username: "me@mycompany.onmicrosoft.com";
uploadConfig.password: "MyPassword";
uploadConfig.clientId: "ClientId";
uploadConfig.clientSecret: "ClientSecret";

var assets = [
    {
        path: "path\\to\\file\\formscript.js", // Should match webResources path
        content: "function onLoad() {}"
    };
];

webResource.upload(uploadConfig, assets).then(() => {
    callback();
}, (error) => {
    console.log(error);
    callback();
});
```

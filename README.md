# node-webresource
Node module for publishing Dynamics 365 web resources, inspired by [gulp-webresource](https://github.com/davidyack/gulp-webresource)

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
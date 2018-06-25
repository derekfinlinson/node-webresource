import { WebResourceAsset, Config, upload } from "../src/index";

describe("uploads using username/password", () => {
    const config: any = {
        server: "https://org.crm.dynamics.com",
        username: "user@org.onmicrosoft.com",
        password: "password",
        solution: "CrmSolution",
        tenant: "org.onmicrosoft.com",
        webResources: [
            {
                path: "file.js",
                name: "File"
            }
        ]
    };

    test("uploads new web resource", async () => {
        const assets: any = [
            {
                path: "file.js",
                content: "function() {}"
            }
        ];

        await upload(config, assets);
    });

    test("uploads existing web resource", () => {

    });
});

describe("uploads using client id/secret", () => {
    test("uploads new web resource", () => {

    });

    test("uploads existing web resource", () => {

    });
});


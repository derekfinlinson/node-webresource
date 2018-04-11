import { WebResourceAsset, Config, upload } from '../src/index';
import { AuthenticationContext } from 'adal-node';

jest.mock('AuthenticationContext');

describe('uploads using username/password', () => {
    const config = {
        server: "https://org.crm.dynamics.com",
        username: "user@org.onmicrosoft.com",
        password: "password",
        solution: "CrmSolution",
        tenant: "org.onmicrosoft.com",
        webResources: [
            {
                path: 'file.js',
                name: 'File'
            }
        ]
    };

    test('uploads new web resource', async () => {
        const assets = [
            {
                path: 'file.js',
                content: 'function() {}'
            }
        ];

        const context = new AuthenticationContext('');

        context.acquireTokenWithUsernamePassword.mockResolvedValue({})

        await upload(config, assets);
    });
    
    test('uploads existing web resource', () => {
    
    });    
});

describe('uploads using client id/secret', () => {
    test('uploads new web resource', () => {

    });
    
    test('uploads existing web resource', () => {
    
    });
});


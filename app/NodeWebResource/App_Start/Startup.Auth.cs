using System;
using System.Configuration;
using System.IdentityModel.Tokens;
using System.Threading.Tasks;
using System.Web;
using Microsoft.IdentityModel.Clients.ActiveDirectory;
using Microsoft.Owin.Security;
using Microsoft.Owin.Security.Cookies;
using Microsoft.Owin.Security.OpenIdConnect;
using Owin;

namespace NodeWebResource
{
    public partial class Startup
    {
        private readonly string _clientId = ConfigurationManager.AppSettings["ida:ClientId"];
        private readonly string _authority = ConfigurationManager.AppSettings["ida:AADInstance"] + "common";
        private readonly string _clientSecret = ConfigurationManager.AppSettings["ida:ClientSecret"];
        private readonly string _aadInstance = ConfigurationManager.AppSettings["ida:AADInstance"];
        private readonly string _organizationHostName = ConfigurationManager.AppSettings["ida:OrganizationHostName"];

        public void ConfigureAuth(IAppBuilder app)
        {
            app.SetDefaultSignInAsAuthenticationType(CookieAuthenticationDefaults.AuthenticationType);

            app.UseCookieAuthentication(new CookieAuthenticationOptions());

            app.UseOpenIdConnectAuthentication(
                new OpenIdConnectAuthenticationOptions
                {
                    ClientId = _clientId,
                    Authority = _authority,
                    TokenValidationParameters = new TokenValidationParameters
                    {
                        // instead of using the default validation (validating against a single issuer value, as we do in line of business apps), 
                        // we inject our own multitenant validation logic
                        ValidateIssuer = false,
                        // If the app needs access to the entire organization, then add the logic
                        // of validating the Issuer here.
                        // IssuerValidator
                    },
                    Notifications = new OpenIdConnectAuthenticationNotifications
                    {   
                        SecurityTokenValidated = context => Task.FromResult(0),
                        AuthorizationCodeReceived = (context) =>
                        {
                            var code = context.Code;

                            var credential = new ClientCredential(_clientId, _clientSecret);
                            
                            string tenantId = context
                                .AuthenticationTicket
                                .Identity
                                .FindFirst("http://schemas.microsoft.com/identity/claims/tenantid")
                                .Value;

                            var resource = string.Format(_organizationHostName, '*');

                            var authContext =
                                new Microsoft.IdentityModel.Clients.ActiveDirectory.AuthenticationContext(
                                    _aadInstance + tenantId);

                            authContext.AcquireTokenByAuthorizationCode(
                                code,
                                new Uri(HttpContext.Current.Request.Url.GetLeftPart(UriPartial.Path)),
                                credential,
                                resource);
                        
                            return Task.FromResult(0);
                        },
                        AuthenticationFailed = (context) =>
                        {
                            // Pass in the context back to the app
                            context.OwinContext.Response.Redirect("/Home/Error");
                            context.HandleResponse(); // Suppress the exception
                            return Task.FromResult(0);
                        }
                    }
                });
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;

namespace NodeWebResource.Controllers
{
    [Authorize]
    public class HomeController : Controller
    {
        [AllowAnonymous]
        public ActionResult Index()
        {   
            return View();
        }

        public ActionResult Authenticate()
        {
            return View();
        }

        public async Task<ActionResult> Import()
        {
            ViewBag.Message = "Imported";

            return View("Index");
        }

        public async Task<ActionResult> AddUser()
        {
            ViewBag.Message = "User added";

            return View("Index");
        }
    }
}
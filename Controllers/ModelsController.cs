using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Autodesk.Forge.Client;
using Newtonsoft.Json;
using RestSharp;
using static AuthController;
using System;

[ApiController]
[Route("api/[controller]")]
public class ModelsController : ControllerBase
{
    public record BucketObject(string name, string urn);

    private readonly APS _aps;

    public ModelsController(APS aps)
    {
        _aps = aps;
    }

    public class UploadModelForm
    {
        [FromForm(Name = "model-zip-entrypoint")]
        public string? Entrypoint { get; set; }

        [FromForm(Name = "model-file")]
        public IFormFile File { get; set; }
    }

    [HttpPost()]
    public async Task<BucketObject> UploadAndTranslateModel([FromForm] UploadModelForm form)
    {
        using (var stream = new MemoryStream())
        {
            await form.File.CopyToAsync(stream);
            stream.Position = 0;
            return null;
        }
    }

    [HttpGet("signeds3download")]
    public async Task<string> SignedDownloadURL(string urn, string derivativeUrn)
    {
        string signedDownloadUrl = await _aps.GetSignedDownloadUrl(urn, derivativeUrn);
        return signedDownloadUrl;
    }
}
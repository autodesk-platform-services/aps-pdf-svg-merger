﻿using Autodesk.ModelDerivative;
using Newtonsoft.Json;
using RestSharp;

public record TranslationStatus(string Status, string Progress, IEnumerable<string>? Messages);

public partial class APS
{
    public static string Base64Encode(string plainText)
    {
        var plainTextBytes = System.Text.Encoding.UTF8.GetBytes(plainText);
        return System.Convert.ToBase64String(plainTextBytes).TrimEnd('=');
    }

    public async Task<TranslationStatus> GetTranslationStatus(string urn)
    {
        var auth = await GetInternalToken();
        var modelDerivativeClient = new ModelDerivativeClient(_sdkManager);
        try
        {
            var manifest = await modelDerivativeClient.GetManifestAsync(urn, accessToken: auth.AccessToken);
            var messages = new List<string>();
            // TODO: collect messages from manifest
            return new TranslationStatus(manifest.Status, manifest.Progress, messages);
        }
        catch (ModelDerivativeApiException ex)
        {
            if (ex.HttpResponseMessage.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return new TranslationStatus("n/a", "", null);
            }
            else
            {
                throw;
            }
        }
    }

    public async Task<byte[]> GetByteArrayPDF(string urn, string derivativeUrn)
    {
        var restSharpClient = new RestClient("https://developer.api.autodesk.com");

        Token access_token = await GetInternalToken();

        RestRequest request = new RestRequest("/modelderivative/v2/designdata/{urn}/manifest/{derivativeUrn}/signedcookies", RestSharp.Method.Get);
        request.AddHeader("Authorization", "Bearer " + access_token.AccessToken);
        request.AddUrlSegment("urn", urn);
        request.AddUrlSegment("derivativeUrn", derivativeUrn);

        var response = await restSharpClient.ExecuteAsync(request);

        var cloudFrontPolicyName = "CloudFront-Policy";
        var cloudFrontKeyPairIdName = "CloudFront-Key-Pair-Id";
        var cloudFrontSignatureName = "CloudFront-Signature";

        var cloudFrontCookies = response.Headers
                                .Where(x => x.Name == "Set-Cookie")
                                .Select(x => x.Value)
                                .Cast<string>()
                                .ToList();

        var cloudFrontPolicy = cloudFrontCookies.Where(value => value.Contains(cloudFrontPolicyName)).FirstOrDefault()?.Trim().Substring(cloudFrontPolicyName.Length + 1).Split(";").FirstOrDefault();
        var cloudFrontKeyPairId = cloudFrontCookies.Where(value => value.Contains(cloudFrontKeyPairIdName)).FirstOrDefault()?.Trim().Substring(cloudFrontKeyPairIdName.Length + 1).Split(";").FirstOrDefault();
        var cloudFrontSignature = cloudFrontCookies.Where(value => value.Contains(cloudFrontSignatureName)).FirstOrDefault()?.Trim().Substring(cloudFrontSignatureName.Length + 1).Split(";").FirstOrDefault();

        var result = JsonConvert.DeserializeObject<dynamic>(response.Content);
        var downloadURL = $"{result.url}?Key-Pair-Id={cloudFrontKeyPairId}&Signature={cloudFrontSignature}&Policy={cloudFrontPolicy}";

        RestClient client = new RestClient(downloadURL);
        RestRequest downloadRequest = new RestRequest(downloadURL, Method.Get);
        byte[] pdfByteArray = client.DownloadData(downloadRequest);
        return pdfByteArray;
    }
}
using Autodesk.Oss;
using Autodesk.Oss.Model;

public partial class APS
{
    public async Task<IEnumerable<ObjectDetails>> GetObjects()
    {
        var auth = await GetInternalToken();
        var ossClient = new OssClient(_sdkManager);
        const int PageSize = 64;
        var results = new List<ObjectDetails>();
        var response = await ossClient.GetObjectsAsync(_bucket, PageSize, accessToken: auth.AccessToken);
        results.AddRange(response.Items);
        while (!string.IsNullOrEmpty(response.Next))
        {
            var queryParams = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(new Uri(response.Next).Query);
            response = await ossClient.GetObjectsAsync(_bucket, PageSize, startAt: queryParams["startAt"], accessToken: auth.AccessToken);
            results.AddRange(response.Items);
        }
        return results;
    }
}

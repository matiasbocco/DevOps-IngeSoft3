using System.Net;
using Xunit;

namespace InventarioApi.Tests;

public class HealthTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public HealthTests(CustomWebApplicationFactory factory) => _client = factory.CreateClient();

    [Theory]
    [InlineData("GET")]
    [InlineData("HEAD")]   // el monitor externo gratuito pregunta con HEAD
    public async Task Health_ResponderOk(string metodo)
    {
        var response = await _client.SendAsync(new HttpRequestMessage(new HttpMethod(metodo), "/health"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}

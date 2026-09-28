using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using InventarioApi;
using InventarioApi.Models;
using Xunit;

namespace InventarioApi.Tests;

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private SqliteConnection _connection = null!;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            var dbDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(AppDbContext));
            if (dbDescriptor != null) services.Remove(dbDescriptor);

            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlite(_connection));

            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) _connection?.Dispose();
        base.Dispose(disposing);
    }
}

/// <summary>
/// Factory variante que reemplaza IAlertaReposicionService con un mock para
/// poder verificar interacciones sin efectos secundarios reales.
/// </summary>
public class MockAlertaWebApplicationFactory : CustomWebApplicationFactory
{
    private readonly IAlertaReposicionService _alertaService;

    public MockAlertaWebApplicationFactory(IAlertaReposicionService alertaService)
    {
        _alertaService = alertaService;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureServices(services =>
        {
            var d = services.SingleOrDefault(s => s.ServiceType == typeof(IAlertaReposicionService));
            if (d != null) services.Remove(d);
            services.AddSingleton(_alertaService);
        });
    }
}

// ---------------------------------------------------------------------------
// Tests principales — comparten una sola factory (y su BD en memoria)
// ---------------------------------------------------------------------------

public class StockEndpointTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public StockEndpointTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // -----------------------------------------------------------------------
    // Regla 1: POST /api/items/stock — crear item nuevo
    // -----------------------------------------------------------------------

    [Fact]
    public async Task PostStock_NuevoItem_Returns201YCreaItem()
    {
        var request = new
        {
            Nombre = "Laptop",
            Cantidad = 10,
            Ubicacion = "Deposito A",
            Categoria = "Electronica"
        };

        var response = await _client.PostAsJsonAsync("/api/items/stock", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<Item>();
        Assert.NotNull(item);
        Assert.Equal("Laptop", item!.Nombre);
        Assert.Equal(10, item.Cantidad);
        Assert.Equal("Deposito A", item.Ubicacion);
        Assert.True(item.Id > 0);
    }

    // -----------------------------------------------------------------------
    // Regla 1: POST — suma si el item ya existe (test simple, sin Theory)
    // -----------------------------------------------------------------------

    [Fact]
    public async Task PostStock_ItemExistente_Returns200YSumaCantidad()
    {
        var seed = new { Nombre = "Monitor", Cantidad = 3, Ubicacion = "Sala B", Categoria = "Electronica" };
        var seedResp = await _client.PostAsJsonAsync("/api/items/stock", seed);
        Assert.Equal(HttpStatusCode.Created, seedResp.StatusCode);
        var seeded = await seedResp.Content.ReadFromJsonAsync<Item>();

        var second = new { Nombre = "Monitor", Cantidad = 7, Ubicacion = "Sala B", Categoria = "Electronica" };
        var response = await _client.PostAsJsonAsync("/api/items/stock", second);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<Item>();
        Assert.NotNull(updated);
        Assert.Equal(seeded!.Id, updated!.Id);
        Assert.Equal(10, updated.Cantidad); // 3 + 7
    }

    // -----------------------------------------------------------------------
    // Regla 1: Theory — varios casos sobre la lógica de suma de stock
    //
    //   initialNombre | initialUbicacion | initialCantidad
    //   requestNombre | requestUbicacion | requestCantidad
    //   expectedStatus | expectedCantidad
    // -----------------------------------------------------------------------

    [Theory]
    [InlineData("Theory_Tornillo", "DepZ", 10, "Theory_Tornillo", "DepZ", 5,  200, 15)] // coincide, suma positiva
    [InlineData("Theory_Cable",    "DepZ",  8, "Theory_Cable",    "DepZ", 0,  200,  8)] // coincide, suma cero (sin cambio)
    [InlineData("Theory_Fusible",  "DepZ",  6, "Theory_FusiOtro", "DepZ", 3,  201,  3)] // nombre distinto → nuevo item
    [InlineData("Theory_Relay",    "DepZ",  6, "Theory_Relay",    "DepX", 3,  201,  3)] // ubicacion distinta → nuevo item
    public async Task PostStock_CasosParametrizados_SumaOCreaSegunCoincidencia(
        string initialNombre, string initialUbicacion, int initialCantidad,
        string requestNombre, string requestUbicacion, int requestCantidad,
        int expectedStatus, int expectedCantidad)
    {
        // Seed del item inicial
        var seed = new { Nombre = initialNombre, Cantidad = initialCantidad, Ubicacion = initialUbicacion, Categoria = "TestCat" };
        var seedResp = await _client.PostAsJsonAsync("/api/items/stock", seed);
        Assert.Equal(HttpStatusCode.Created, seedResp.StatusCode);

        // Segunda operación
        var request = new { Nombre = requestNombre, Cantidad = requestCantidad, Ubicacion = requestUbicacion, Categoria = "TestCat" };
        var response = await _client.PostAsJsonAsync("/api/items/stock", request);

        Assert.Equal((HttpStatusCode)expectedStatus, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<Item>();
        Assert.NotNull(result);
        Assert.Equal(expectedCantidad, result!.Cantidad);
    }

    // -----------------------------------------------------------------------
    // Regla 2: Validaciones de entrada — casos de error
    // -----------------------------------------------------------------------

    [Fact]
    public async Task PostStock_NombreVacio_Returns400()
    {
        var request = new { Nombre = "", Cantidad = 5, Ubicacion = "DepA", Categoria = "Test" };
        var response = await _client.PostAsJsonAsync("/api/items/stock", request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostStock_CantidadNegativa_Returns400()
    {
        var request = new { Nombre = "ItemValido", Cantidad = -1, Ubicacion = "DepA", Categoria = "Test" };
        var response = await _client.PostAsJsonAsync("/api/items/stock", request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // -----------------------------------------------------------------------
    // Regla 3: DELETE /api/items/{id}
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Delete_ItemExistente_Returns204()
    {
        var seed = new { Nombre = "ItemAEliminar", Cantidad = 1, Ubicacion = "DepDel", Categoria = "Test" };
        var seedResp = await _client.PostAsJsonAsync("/api/items/stock", seed);
        var created = await seedResp.Content.ReadFromJsonAsync<Item>();

        var response = await _client.DeleteAsync($"/api/items/{created!.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Delete_ItemNoExistente_Returns404()
    {
        var response = await _client.DeleteAsync("/api/items/999999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // -----------------------------------------------------------------------
    // Regla 4: GET /api/items — listado y filtro por categoría
    // -----------------------------------------------------------------------

    [Fact]
    public async Task GetItems_SinFiltro_RetornaTodosLosItems()
    {
        await _client.PostAsJsonAsync("/api/items/stock",
            new { Nombre = "GetAll_Item1", Cantidad = 10, Ubicacion = "DepG", Categoria = "CatX" });
        await _client.PostAsJsonAsync("/api/items/stock",
            new { Nombre = "GetAll_Item2", Cantidad = 20, Ubicacion = "DepG", Categoria = "CatY" });

        var response = await _client.GetAsync("/api/items");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.Content.ReadFromJsonAsync<List<Item>>();
        Assert.NotNull(items);
        Assert.True(items!.Count >= 2);
    }

    [Fact]
    public async Task GetItems_ConFiltroCategoria_RetornaSoloEsaCategoria()
    {
        var catUnica = "CatFiltro_" + Guid.NewGuid().ToString("N")[..8];
        await _client.PostAsJsonAsync("/api/items/stock",
            new { Nombre = "FiltroCat_A", Cantidad = 5, Ubicacion = "DepF", Categoria = catUnica });
        await _client.PostAsJsonAsync("/api/items/stock",
            new { Nombre = "FiltroCat_B", Cantidad = 5, Ubicacion = "DepF", Categoria = "OtraCategoria" });

        var response = await _client.GetAsync($"/api/items?categoria={catUnica}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.Content.ReadFromJsonAsync<List<Item>>();
        Assert.NotNull(items);
        Assert.All(items!, i => Assert.Equal(catUnica.ToLower(), i.Categoria.ToLower()));
        Assert.Contains(items!, i => i.Nombre == "FiltroCat_A");
        Assert.DoesNotContain(items!, i => i.Nombre == "FiltroCat_B");
    }

    // -----------------------------------------------------------------------
    // Regla 4: GET /api/items/{id} — buscar por ID
    // -----------------------------------------------------------------------

    [Fact]
    public async Task GetItemPorId_ItemExistente_Returns200ConItem()
    {
        var seed = new { Nombre = "GetById_Item", Cantidad = 7, Ubicacion = "DepId", Categoria = "Test" };
        var seedResp = await _client.PostAsJsonAsync("/api/items/stock", seed);
        var created = await seedResp.Content.ReadFromJsonAsync<Item>();

        var response = await _client.GetAsync($"/api/items/{created!.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<Item>();
        Assert.NotNull(item);
        Assert.Equal(created.Id, item!.Id);
        Assert.Equal("GetById_Item", item.Nombre);
    }

    [Fact]
    public async Task GetItemPorId_ItemNoExistente_Returns404()
    {
        var response = await _client.GetAsync("/api/items/999998");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // -----------------------------------------------------------------------
    // Mock obligatorio: IAlertaReposicionService se llama cuando stock <= 5
    //
    // Usa MockAlertaWebApplicationFactory para inyectar un Mock<IAlertaReposicionService>
    // y verifica que AlertarAsync fue invocado exactamente una vez.
    // -----------------------------------------------------------------------

    [Fact]
    public async Task PostStock_CuandoStockBajoStockMinimo_LlamaAlertaService()
    {
        var mockAlerta = new Mock<IAlertaReposicionService>();
        mockAlerta
            .Setup(s => s.AlertarAsync(It.IsAny<Item>()))
            .Returns(Task.CompletedTask);

        await using var factory = new MockAlertaWebApplicationFactory(mockAlerta.Object);
        var client = factory.CreateClient();

        // Cantidad = 3, que es <= 5 (StockMinimo), debe disparar la alerta
        var request = new { Nombre = "ItemBajoStock", Cantidad = 3, Ubicacion = "DepMock", Categoria = "Mock" };
        var response = await client.PostAsJsonAsync("/api/items/stock", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        mockAlerta.Verify(
            s => s.AlertarAsync(It.Is<Item>(i => i.Nombre == "ItemBajoStock" && i.Cantidad == 3)),
            Times.Once);
    }
}

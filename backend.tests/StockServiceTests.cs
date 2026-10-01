using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using InventarioApi;
using InventarioApi.Models;
using InventarioApi.Servicios;
using Xunit;

namespace InventarioApi.Tests;

public class StockServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly Mock<IAlertaReposicionService> _mockAlerta;
    private readonly StockService _service;

    public StockServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new AppDbContext(options);
        _db.Database.EnsureCreated();

        _mockAlerta = new Mock<IAlertaReposicionService>();
        _mockAlerta.Setup(s => s.AlertarAsync(It.IsAny<Item>())).Returns(Task.CompletedTask);

        _service = new StockService(_db, _mockAlerta.Object);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    // -----------------------------------------------------------------------
    // Item nuevo con cantidad <= 5 → alerta disparada
    // -----------------------------------------------------------------------

    [Theory]
    [InlineData(1)]
    [InlineData(5)]
    public async Task RegistrarStock_ItemNuevoCantidadBajoUmbral_LlamaAlerta(int cantidad)
    {
        var request = new StockRequest("Tornillo", cantidad, "DepA", null);

        var (item, creado) = await _service.RegistrarStockAsync(request);

        Assert.True(creado);
        _mockAlerta.Verify(s => s.AlertarAsync(It.Is<Item>(i => i.Nombre == "Tornillo")), Times.Once);
    }

    // -----------------------------------------------------------------------
    // Item nuevo con cantidad > 5 → alerta NO disparada
    // -----------------------------------------------------------------------

    [Theory]
    [InlineData(6)]
    [InlineData(100)]
    public async Task RegistrarStock_ItemNuevoCantidadSobreUmbral_NoLlamaAlerta(int cantidad)
    {
        var request = new StockRequest("Cable", cantidad, "DepB", null);

        var (item, creado) = await _service.RegistrarStockAsync(request);

        Assert.True(creado);
        _mockAlerta.Verify(s => s.AlertarAsync(It.IsAny<Item>()), Times.Never);
    }

    // -----------------------------------------------------------------------
    // Item existente: suma baja a <= 5 → alerta disparada
    // -----------------------------------------------------------------------

    [Fact]
    public async Task RegistrarStock_ItemExistenteSumaBajaAUmbral_LlamaAlerta()
    {
        var seed = new StockRequest("Fusible", 4, "DepC", null);
        await _service.RegistrarStockAsync(seed);
        _mockAlerta.Invocations.Clear();

        var request = new StockRequest("Fusible", 1, "DepC", null);
        var (item, creado) = await _service.RegistrarStockAsync(request);

        Assert.False(creado);
        Assert.Equal(5, item.Cantidad);
        _mockAlerta.Verify(s => s.AlertarAsync(It.Is<Item>(i => i.Cantidad == 5)), Times.Once);
    }

    // -----------------------------------------------------------------------
    // Item existente: suma queda > 5 → alerta NO disparada
    // -----------------------------------------------------------------------

    [Fact]
    public async Task RegistrarStock_ItemExistenteSumaQuedaSobreUmbral_NoLlamaAlerta()
    {
        var seed = new StockRequest("Relay", 3, "DepD", null);
        await _service.RegistrarStockAsync(seed);
        _mockAlerta.Invocations.Clear();

        var request = new StockRequest("Relay", 10, "DepD", null);
        var (item, creado) = await _service.RegistrarStockAsync(request);

        Assert.False(creado);
        Assert.Equal(13, item.Cantidad);
        _mockAlerta.Verify(s => s.AlertarAsync(It.IsAny<Item>()), Times.Never);
    }

    // -----------------------------------------------------------------------
    // Validación inválida → lanza ArgumentException
    // -----------------------------------------------------------------------

    [Fact]
    public async Task RegistrarStock_RequestInvalido_LanzaArgumentException()
    {
        var request = new StockRequest("", -1, "", null);

        await Assert.ThrowsAsync<ArgumentException>(() => _service.RegistrarStockAsync(request));
    }

    // -----------------------------------------------------------------------
    // Nombre/ubicacion distintos → crea item separado (no suma)
    // -----------------------------------------------------------------------

    [Fact]
    public async Task RegistrarStock_UbicacionDistinta_CreaItemSeparado()
    {
        await _service.RegistrarStockAsync(new StockRequest("Tuerca", 10, "DepE", null));
        _mockAlerta.Invocations.Clear();

        var (item, creado) = await _service.RegistrarStockAsync(new StockRequest("Tuerca", 10, "DepF", null));

        Assert.True(creado);
        Assert.Equal(10, item.Cantidad);
    }
}

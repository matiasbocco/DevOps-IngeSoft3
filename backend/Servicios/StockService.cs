using Microsoft.EntityFrameworkCore;
using InventarioApi.Logica;
using InventarioApi.Models;

namespace InventarioApi.Servicios;

public class StockService : IStockService
{
    private const int UmbralAlertaReposicion = 5;

    private readonly AppDbContext _db;
    private readonly IAlertaReposicionService _alertaService;

    public StockService(AppDbContext db, IAlertaReposicionService alertaService)
    {
        _db = db;
        _alertaService = alertaService;
    }

    public async Task<(Item Item, bool Creado)> RegistrarStockAsync(StockRequest request)
    {
        var validacion = StockValidator.Validar(request);
        if (!validacion.EsValida)
            throw new ArgumentException(validacion.Error);

        var existing = await _db.Items.FirstOrDefaultAsync(i =>
            i.Nombre.ToLower() == request.Nombre.ToLower() &&
            i.Ubicacion.ToLower() == request.Ubicacion.ToLower());

        if (existing is not null)
        {
            existing.Cantidad += request.Cantidad;
            await _db.SaveChangesAsync();
            if (existing.Cantidad <= UmbralAlertaReposicion)
                await _alertaService.AlertarAsync(existing);
            return (existing, false);
        }

        var newItem = new Item
        {
            Nombre = request.Nombre,
            Cantidad = request.Cantidad,
            Ubicacion = request.Ubicacion,
            Categoria = request.Categoria ?? string.Empty
        };

        _db.Items.Add(newItem);
        await _db.SaveChangesAsync();
        if (newItem.Cantidad <= UmbralAlertaReposicion)
            await _alertaService.AlertarAsync(newItem);

        return (newItem, true);
    }
}

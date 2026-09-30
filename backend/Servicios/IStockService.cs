using InventarioApi.Models;

namespace InventarioApi.Servicios;

public interface IStockService
{
    Task<(Item Item, bool Creado)> RegistrarStockAsync(StockRequest request);
}

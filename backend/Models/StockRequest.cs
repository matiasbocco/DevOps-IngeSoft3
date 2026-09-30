namespace InventarioApi.Models;

public record StockRequest(string Nombre, int Cantidad, string Ubicacion, string? Categoria);

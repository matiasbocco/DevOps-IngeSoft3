using InventarioApi.Models;

namespace InventarioApi.Logica;

public static class StockValidator
{
    public record Resultado(bool EsValida, string? Error);

    public static Resultado Validar(StockRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre) || string.IsNullOrWhiteSpace(request.Ubicacion))
            return new Resultado(false, "Nombre and Ubicacion are required.");

        if (request.Cantidad < 0)
            return new Resultado(false, "Cantidad no puede ser negativa.");

        return new Resultado(true, null);
    }
}

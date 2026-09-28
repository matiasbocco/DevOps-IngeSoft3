using InventarioApi.Models;

namespace InventarioApi;

public interface IAlertaReposicionService
{
    Task AlertarAsync(Item item);
}

public class AlertaReposicionService : IAlertaReposicionService
{
    public Task AlertarAsync(Item item)
    {
        Console.WriteLine($"[ALERTA REPOSICION] '{item.Nombre}' en '{item.Ubicacion}': {item.Cantidad} unidades (bajo stock minimo)");
        return Task.CompletedTask;
    }
}

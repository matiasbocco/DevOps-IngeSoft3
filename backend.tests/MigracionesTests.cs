using Microsoft.EntityFrameworkCore;
using InventarioApi;
using Xunit;

namespace InventarioApi.Tests;

// Los demás tests crean el esquema con EnsureCreated(), que no pasa por las migraciones.
// La app real usa Migrate(): si EF no descubre la migración, la tabla Items nunca se crea
// en QA/PROD aunque todos los otros tests estén en verde.
public class MigracionesTests
{
    [Fact]
    public void La_migracion_inicial_es_descubierta_por_EF()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=inventario")   // no abre conexión
            .Options;

        using var db = new AppDbContext(options);

        Assert.Contains("20240101000000_InitialCreate", db.Database.GetMigrations());
    }
}

using Microsoft.EntityFrameworkCore;
using InventarioApi;
using InventarioApi.Models;
using InventarioApi.Servicios;

var builder = WebApplication.CreateBuilder(args);

var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Database=inventario;Username=postgres;Password=postgres";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(databaseUrl));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<IAlertaReposicionService, AlertaReposicionService>();
builder.Services.AddScoped<IStockService, StockService>();

// TP9: errores y tiempos de cada pedido a Sentry. El DSN llega por el entorno (solo PROD lo tiene):
// sin SENTRY_DSN la librería queda apagada y la app anda igual (local, tests, QA).
builder.WebHost.UseSentry(o =>
{
    o.Dsn = builder.Configuration["SENTRY_DSN"] ?? "";
    o.Environment = "produccion";
    o.TracesSampleRate = 1.0;   // medir todos los pedidos: la app tiene poco tráfico
});

var app = builder.Build();

if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseSwagger();
app.UseSwaggerUI();

// HEAD además de GET: el monitor externo gratuito pregunta con HEAD.
app.MapMethods("/health", new[] { "GET", "HEAD" }, () => Results.Ok(new { status = "ok" }));

// TP9 — TEMPORAL: un error a propósito para verlo llegar a Sentry. Se saca al cerrar el práctico.
app.MapGet("/api/falla", string () => throw new InvalidOperationException("Falla de prueba del TP9"));

app.MapGet("/api/items", async (AppDbContext db, string? categoria) =>
{
    IQueryable<Item> query = db.Items;
    if (!string.IsNullOrWhiteSpace(categoria))
    {
        var cat = categoria.ToLower();
        query = query.Where(i => i.Categoria.ToLower() == cat);
    }
    return Results.Ok(await query.ToListAsync());
});

app.MapGet("/api/items/{id:int}", async (int id, AppDbContext db) =>
{
    var item = await db.Items.FindAsync(id);
    return item is null ? Results.NotFound() : Results.Ok(item);
});

app.MapPost("/api/items/stock", async (StockRequest request, IStockService stockService) =>
{
    try
    {
        var (item, creado) = await stockService.RegistrarStockAsync(request);
        return creado ? Results.Created($"/api/items/{item.Id}", item) : Results.Ok(item);
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.MapDelete("/api/items/{id:int}", async (int id, AppDbContext db) =>
{
    var item = await db.Items.FindAsync(id);
    if (item is null) return Results.NotFound();
    db.Items.Remove(item);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();

[System.Diagnostics.CodeAnalysis.ExcludeFromCodeCoverage]
public partial class Program { }

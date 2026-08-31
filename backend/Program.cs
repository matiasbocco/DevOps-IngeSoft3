using Microsoft.EntityFrameworkCore;
using InventarioApi;
using InventarioApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Database
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Database=inventario;Username=postgres;Password=postgres";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(databaseUrl));

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Apply migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseSwagger();
app.UseSwaggerUI();

// Health check
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// GET /api/items
app.MapGet("/api/items", async (AppDbContext db, string? categoria) =>
{
    IQueryable<Item> query = db.Items;

    if (!string.IsNullOrWhiteSpace(categoria))
    {
        var cat = categoria.ToLower();
        query = query.Where(i => i.Categoria.ToLower() == cat);
    }

    var items = await query.ToListAsync();
    return Results.Ok(items);
});

// GET /api/items/{id}
app.MapGet("/api/items/{id:int}", async (int id, AppDbContext db) =>
{
    var item = await db.Items.FindAsync(id);
    return item is null ? Results.NotFound() : Results.Ok(item);
});

// POST /api/items/stock
app.MapPost("/api/items/stock", async (StockRequest request, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Nombre) || string.IsNullOrWhiteSpace(request.Ubicacion))
        return Results.BadRequest("Nombre and Ubicacion are required.");

    var existing = await db.Items.FirstOrDefaultAsync(i =>
        i.Nombre.ToLower() == request.Nombre.ToLower() &&
        i.Ubicacion.ToLower() == request.Ubicacion.ToLower());

    if (existing is not null)
    {
        existing.Cantidad += request.Cantidad;
        await db.SaveChangesAsync();
        return Results.Ok(existing);
    }

    var newItem = new Item
    {
        Nombre = request.Nombre,
        Cantidad = request.Cantidad,
        Ubicacion = request.Ubicacion,
        Categoria = request.Categoria ?? string.Empty
    };

    db.Items.Add(newItem);
    await db.SaveChangesAsync();
    return Results.Created($"/api/items/{newItem.Id}", newItem);
});

// DELETE /api/items/{id}
app.MapDelete("/api/items/{id:int}", async (int id, AppDbContext db) =>
{
    var item = await db.Items.FindAsync(id);
    if (item is null) return Results.NotFound();

    db.Items.Remove(item);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();

public record StockRequest(string Nombre, int Cantidad, string Ubicacion, string? Categoria);

public partial class Program { }

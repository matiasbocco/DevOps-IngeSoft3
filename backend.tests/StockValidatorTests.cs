using InventarioApi.Logica;
using InventarioApi.Models;
using Xunit;

namespace InventarioApi.Tests;

public class StockValidatorTests
{
    [Theory]
    [InlineData("", "DepA", 5)]
    [InlineData("   ", "DepA", 5)]
    [InlineData("ItemValido", "", 5)]
    [InlineData("ItemValido", "   ", 5)]
    public void Validar_CamposObligatoriosVacios_RetornaInvalida(string nombre, string ubicacion, int cantidad)
    {
        var request = new StockRequest(nombre, cantidad, ubicacion, null);

        var resultado = StockValidator.Validar(request);

        Assert.False(resultado.EsValida);
        Assert.Equal("Nombre and Ubicacion are required.", resultado.Error);
    }

    [Theory]
    [InlineData("ItemValido", "DepA", -1)]
    [InlineData("ItemValido", "DepA", -100)]
    public void Validar_CantidadNegativa_RetornaInvalida(string nombre, string ubicacion, int cantidad)
    {
        var request = new StockRequest(nombre, cantidad, ubicacion, null);

        var resultado = StockValidator.Validar(request);

        Assert.False(resultado.EsValida);
        Assert.Equal("Cantidad no puede ser negativa.", resultado.Error);
    }

    [Theory]
    [InlineData("ItemValido", "DepA", 0)]
    [InlineData("ItemValido", "DepA", 1)]
    [InlineData("ItemValido", "DepA", 100)]
    public void Validar_RequestValido_RetornaValida(string nombre, string ubicacion, int cantidad)
    {
        var request = new StockRequest(nombre, cantidad, ubicacion, "CatTest");

        var resultado = StockValidator.Validar(request);

        Assert.True(resultado.EsValida);
        Assert.Null(resultado.Error);
    }
}

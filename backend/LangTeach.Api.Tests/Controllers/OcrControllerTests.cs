using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.Tests.Fixtures;

namespace LangTeach.Api.Tests.Controllers;

[Collection("ApiTests")]
public class OcrControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public OcrControllerTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private static MultipartFormDataContent CreateFileContent(string fileName, string contentType, byte[]? content = null)
    {
        content ??= new byte[] { 0xFF, 0xD8, 0xFF }; // JPEG header bytes
        var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(content);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(fileContent, "file", fileName);
        return form;
    }

    [Fact]
    public async Task Extract_ValidJpeg_ReturnsOkWithTextAndBlobUrl()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|ocr-valid", "ocr-valid@example.com");
        var form = CreateFileContent("handwriting.jpg", "image/jpeg");

        var res = await client.PostAsync("/api/corrections/ocr", form);

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement;
        json.GetProperty("text").GetString().Should().NotBeNullOrEmpty();
        json.GetProperty("blobUrl").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Extract_UnsupportedContentType_ReturnsBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|ocr-type", "ocr-type@example.com");
        var form = CreateFileContent("document.gif", "image/gif");

        var res = await client.PostAsync("/api/corrections/ocr", form);

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await res.Content.ReadAsStringAsync();
        body.Should().Contain("Formato no compatible");
    }

    [Fact]
    public async Task Extract_FileTooLarge_ReturnsBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|ocr-size", "ocr-size@example.com");
        // 11 MB file -- exceeds default 10 MB OcrOptions.MaxBytes
        var largeContent = new byte[11 * 1024 * 1024];
        var form = CreateFileContent("big.jpg", "image/jpeg", largeContent);

        var res = await client.PostAsync("/api/corrections/ocr", form);

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await res.Content.ReadAsStringAsync();
        body.Should().Contain("tamaño máximo");
    }

    [Fact]
    public async Task Extract_NoFile_ReturnsBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|ocr-nofile", "ocr-nofile@example.com");
        var res = await client.PostAsync("/api/corrections/ocr", new MultipartFormDataContent());

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

}

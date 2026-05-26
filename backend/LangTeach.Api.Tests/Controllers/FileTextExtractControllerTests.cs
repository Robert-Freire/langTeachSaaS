using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.Controllers;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Fixtures;
using LangTeach.Api.Tests.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Tests.Controllers;

public class FileTextExtractControllerResolveTests
{
    private static readonly string[] Accepted = new OcrOptions().AcceptedContentTypes;

    private sealed class FakeFormFile : IFormFile
    {
        private readonly string _fileName;
        public FakeFormFile(string fileName, string contentType)
        {
            _fileName = fileName;
            FileName = fileName;
            ContentType = contentType;
        }
        public string ContentType { get; }
        public string ContentDisposition => $"form-data; name=\"file\"; filename=\"{_fileName}\"";
        public IHeaderDictionary Headers => new HeaderDictionary();
        public long Length => 0;
        public string Name => "file";
        public string FileName { get; }
        public void CopyTo(Stream target) { }
        public Task CopyToAsync(Stream target, CancellationToken ct = default) => Task.CompletedTask;
        public Stream OpenReadStream() => Stream.Null;
    }

    private static IFormFile MakeFile(string fileName, string contentType) =>
        new FakeFormFile(fileName, contentType);

    [Theory]
    [InlineData("photo.jpg",  "application/octet-stream", "image/jpeg")]
    [InlineData("photo.jpeg", "application/octet-stream", "image/jpeg")]
    [InlineData("scan.png",   "application/octet-stream", "image/png")]
    [InlineData("doc.webp",   "application/octet-stream", "image/webp")]
    [InlineData("file.pdf",   "application/octet-stream", "application/pdf")]
    [InlineData("file.docx",  "application/octet-stream", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")]
    [InlineData("photo.jpg",  "image/jpeg",               "image/jpeg")]   // already valid -- passthrough
    public void ResolveEffectiveContentType_KnownExtension_ReturnsMappedMime(
        string fileName, string contentType, string expected)
    {
        var result = FileTextExtractController.ResolveEffectiveContentType(MakeFile(fileName, contentType), Accepted);
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("file.gif",  "image/gif")]          // unsupported extension -- falls through
    [InlineData("file.txt",  "text/plain")]          // unsupported extension -- falls through
    [InlineData("noext",     "application/octet-stream")] // no extension + unknown content-type -- falls through
    public void ResolveEffectiveContentType_UnknownExtension_ReturnsOriginalContentType(
        string fileName, string contentType)
    {
        var result = FileTextExtractController.ResolveEffectiveContentType(MakeFile(fileName, contentType), Accepted);
        result.Should().Be(contentType);
    }
}

[Collection("ApiTests")]
public class FileTextExtractControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public FileTextExtractControllerTests(AuthenticatedWebAppFactory factory)
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

        var res = await client.PostAsync("/api/corrections/extract-text", form);

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement;
        json.GetProperty("text").GetString().Should().NotBeNullOrEmpty();
        json.GetProperty("blobUrl").GetString().Should().NotBeNullOrEmpty();
        json.GetProperty("incomplete").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task Extract_UnsupportedContentType_ReturnsBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|ocr-type", "ocr-type@example.com");
        var form = CreateFileContent("document.gif", "image/gif");

        var res = await client.PostAsync("/api/corrections/extract-text", form);

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await res.Content.ReadAsStringAsync();
        body.Should().Contain("Formato no compatible");
        body.Should().Contain("DOCX");
    }

    [Fact]
    public async Task Extract_ValidDocx_ReturnsOkWithTextAndBlobUrl()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|ocr-docx", "ocr-docx@example.com");
        var form = CreateFileContent(
            "homework.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

        var res = await client.PostAsync("/api/corrections/extract-text", form);

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement;
        json.GetProperty("text").GetString().Should().NotBeNullOrEmpty();
        json.GetProperty("blobUrl").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Extract_FileTooLarge_ReturnsBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|ocr-size", "ocr-size@example.com");
        // 11 MB file -- exceeds default 10 MB OcrOptions.MaxBytes
        var largeContent = new byte[11 * 1024 * 1024];
        var form = CreateFileContent("big.jpg", "image/jpeg", largeContent);

        var res = await client.PostAsync("/api/corrections/extract-text", form);

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await res.Content.ReadAsStringAsync();
        body.Should().Contain("tamaño máximo");
    }

    [Fact]
    public async Task Extract_ValidJpeg_IncompleteFlag_FalseForLongStubText()
    {
        // Stub returns ~120 chars which is well above MinExtractedChars (10) -- incomplete should be false
        var client = _factory.CreateAuthenticatedClient("auth0|ocr-incomplete", "ocr-incomplete@example.com");
        var form = CreateFileContent("handwriting.jpg", "image/jpeg");

        var res = await client.PostAsync("/api/corrections/extract-text", form);

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement;
        json.GetProperty("incomplete").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task Extract_NoFile_ReturnsBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|ocr-nofile", "ocr-nofile@example.com");
        var res = await client.PostAsync("/api/corrections/extract-text", new MultipartFormDataContent());

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Extract_JpegWithOctetStreamContentType_ReturnsOk()
    {
        // Reproduces the reported bug: some upload paths send application/octet-stream for .jpg files
        var client = _factory.CreateAuthenticatedClient("auth0|ocr-octet", "ocr-octet@example.com");
        var form = CreateFileContent("10033.jpg", "application/octet-stream");

        var res = await client.PostAsync("/api/corrections/extract-text", form);

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Extract_UnknownExtensionAndContentType_ReturnsBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|ocr-unknown", "ocr-unknown@example.com");
        var form = CreateFileContent("file.txt", "text/plain");

        var res = await client.PostAsync("/api/corrections/extract-text", form);

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await res.Content.ReadAsStringAsync();
        body.Should().Contain("OCR_FORMAT_UNSUPPORTED");
    }

}

// Direct controller unit tests for the orphan-blob cleanup (#1237). The integration factory
// stubs the Vision client to always succeed, so forcing an OCR failure deterministically requires
// driving the controller with a failing ITextExtractor and an in-memory blob store.
public class FileTextExtractControllerCleanupTests
{
    private sealed class FakeProfileService : IProfileService
    {
        public Task<Guid> UpsertTeacherAsync(string auth0UserId, string email, string name = "")
            => Task.FromResult(Guid.NewGuid());
        public Task<ProfileDto?> GetProfileAsync(string auth0UserId) => throw new NotImplementedException();
        public Task<ProfileDto> UpdateProfileAsync(string auth0UserId, UpdateProfileRequest request) => throw new NotImplementedException();
        public Task<string> GetStoredEmailAsync(string auth0UserId) => throw new NotImplementedException();
        public Task CompleteOnboardingAsync(string auth0UserId) => throw new NotImplementedException();
    }

    private sealed class FakeTextExtractor : ITextExtractor
    {
        private readonly Func<string> _behavior;
        public FakeTextExtractor(Func<string> behavior) => _behavior = behavior;
        public bool CanHandle(string contentType) => true;
        public Task<string> ExtractTextAsync(Stream stream, string contentType, CancellationToken ct = default)
            => Task.FromResult(_behavior());
    }

    private sealed class ContentFormFile : IFormFile
    {
        private readonly byte[] _content;
        public ContentFormFile(string fileName, string contentType, byte[] content)
        {
            FileName = fileName;
            ContentType = contentType;
            _content = content;
        }
        public string ContentType { get; }
        public string ContentDisposition => $"form-data; name=\"file\"; filename=\"{FileName}\"";
        public IHeaderDictionary Headers => new HeaderDictionary();
        public long Length => _content.Length;
        public string Name => "file";
        public string FileName { get; }
        public void CopyTo(Stream target) => target.Write(_content, 0, _content.Length);
        public Task CopyToAsync(Stream target, CancellationToken ct = default)
        {
            target.Write(_content, 0, _content.Length);
            return Task.CompletedTask;
        }
        public Stream OpenReadStream() => new MemoryStream(_content);
    }

    private static (FileTextExtractController ctrl, InMemoryCorrectionsBlobStorage blob) Build(ITextExtractor extractor)
    {
        var blob = new InMemoryCorrectionsBlobStorage();
        var ctrl = new FileTextExtractController(
            new[] { extractor },
            blob,
            new FakeProfileService(),
            Options.Create(new OcrOptions()),
            NullLogger<FileTextExtractController>.Instance);
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "auth0|ocr-unit"),
            new Claim(ClaimTypes.Email, "ocr-unit@example.com"),
        }, "TestAuth"));
        ctrl.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = user } };
        return (ctrl, blob);
    }

    private static IFormFile Jpeg() => new ContentFormFile("hw.jpg", "image/jpeg", new byte[] { 0xFF, 0xD8, 0xFF });

    [Fact]
    public async Task Extract_SuccessfulOcr_KeepsBlob()
    {
        var (ctrl, blob) = Build(new FakeTextExtractor(() => "Texto extraído suficientemente largo."));

        var result = await ctrl.Extract(Jpeg(), CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        blob.DeleteCount.Should().Be(0, "the success path must keep the blob for the 15-min SAS");
    }

    [Fact]
    public async Task Extract_OcrNoText_DeletesOrphanBlob()
    {
        var (ctrl, blob) = Build(new FakeTextExtractor(() => throw new OcrException("no text")));

        var result = await ctrl.Extract(Jpeg(), CancellationToken.None);

        result.Should().BeOfType<UnprocessableEntityObjectResult>();
        blob.DeleteCount.Should().Be(1, "a failed OCR must not leak its uploaded source blob (#1237)");
    }

    [Fact]
    public async Task Extract_OcrServiceError_DeletesOrphanBlob()
    {
        var (ctrl, blob) = Build(new FakeTextExtractor(() => throw new InvalidOperationException("boom")));

        var result = await ctrl.Extract(Jpeg(), CancellationToken.None);

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(500);
        blob.DeleteCount.Should().Be(1, "the 500 failure path must also clean up the orphan blob");
    }
}

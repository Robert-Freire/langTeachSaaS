namespace LangTeach.Api.Services;

public class OcrFallbackException : OcrException
{
    public OcrFallbackException(string message) : base(message) { }
}

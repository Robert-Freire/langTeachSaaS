using System.Text.Json.Serialization;

namespace LangTeach.Api.Data.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TeachingChannel
{
    Preply = 1,
    Meet = 2,
    Presencial = 3,
}

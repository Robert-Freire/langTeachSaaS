using System.Text.Json.Serialization;

namespace LangTeach.Api.Data.Models;

[JsonConverter(typeof(TeachingChannelJsonConverter))]
public enum TeachingChannel
{
    Preply = 1,
    Meet = 2,
    Presencial = 3,
}

public sealed class TeachingChannelJsonConverter : JsonStringEnumConverter
{
    public TeachingChannelJsonConverter() : base(namingPolicy: null, allowIntegerValues: false) { }
}

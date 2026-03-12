FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY LangTeach.Api/*.csproj LangTeach.Api/
RUN dotnet restore LangTeach.Api/LangTeach.Api.csproj
COPY LangTeach.Api/ LangTeach.Api/
RUN dotnet publish LangTeach.Api/LangTeach.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENTRYPOINT ["dotnet", "LangTeach.Api.dll"]

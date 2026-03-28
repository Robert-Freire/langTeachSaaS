FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY backend/LangTeach.Api/*.csproj backend/LangTeach.Api/
RUN dotnet restore backend/LangTeach.Api/LangTeach.Api.csproj
COPY backend/LangTeach.Api/ backend/LangTeach.Api/
COPY data/ data/
RUN dotnet publish backend/LangTeach.Api/LangTeach.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0
RUN apt-get update && apt-get install -y --no-install-recommends curl libfontconfig1 libfreetype6 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app .
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENTRYPOINT ["dotnet", "LangTeach.Api.dll"]

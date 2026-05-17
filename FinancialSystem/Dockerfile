FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["FinancialSystem.csproj", "./"]
RUN dotnet restore "FinancialSystem.csproj"

COPY . .
RUN dotnet publish "FinancialSystem.csproj" -c Release -o /app/publish /p:Configuration=Release

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5192

EXPOSE 5192
ENTRYPOINT ["dotnet", "FinancialSystem.dll"]
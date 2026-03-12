using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
}

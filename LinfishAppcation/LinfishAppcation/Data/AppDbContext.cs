using LinfishAppcation.Entities;
using Microsoft.EntityFrameworkCore;

namespace LinfishAppcation.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Member> Members => Set<Member>();

    public DbSet<AuthSession> AuthSessions => Set<AuthSession>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var member = modelBuilder.Entity<Member>();

        member.ToTable("ogcusr", "cmbase");

        member.HasKey(x => x.Id);

        member.Property(x => x.Id).HasColumnName("id");

        member.Property(x => x.UserNo).HasColumnName("usr_no").HasMaxLength(20);

        member.Property(x => x.UserName).HasColumnName("usr_name").HasMaxLength(100);

        member.Property(x => x.UserPhone).HasColumnName("usr_phone").HasMaxLength(30);

        member.Property(x => x.UserEmail).HasColumnName("usr_mail").HasMaxLength(320);

        member.Property(x => x.PasswordHash).HasColumnName("usr_pass");

        member.Property(x => x.MemberTier).HasColumnName("mem_tier").HasMaxLength(20);

        member.Property(x => x.Status).HasColumnName("stat");

        member.Property(x => x.CreatedAt).HasColumnName("cre_date");

        member.Property(x => x.UpdatedAt).HasColumnName("upd_date");

        member.Property(x => x.EndDate).HasColumnName("end_date");

        member.Property(x => x.DeleteRequestedAt).HasColumnName("delete_re");

        // Email 的大小寫不敏感唯一索引由 DatabaseInitializer 建立。

        var session = modelBuilder.Entity<AuthSession>();

        session.ToTable("ogcsession", "cmbase");
        session.HasKey(x => x.Id);
        session.Property(x => x.Id).HasColumnName("id");
        session.Property(x => x.MemberId).HasColumnName("usr_id");
        session.Property(x => x.RefreshTokenHash).HasColumnName("refresh_token_hash");
        session.Property(x => x.CreatedAt).HasColumnName("cre_date");
        session.Property(x => x.LastSeenAt).HasColumnName("last_seen_date");
        session.Property(x => x.AbsoluteExpiresAt).HasColumnName("absolute_expires_date");
        session.Property(x => x.RevokedAt).HasColumnName("revoked_date");
        session.Property(x => x.IpAddress).HasColumnName("ip_address").HasMaxLength(45);
        session.Property(x => x.UserAgent).HasColumnName("user_agent").HasMaxLength(500);

        session.HasOne(x => x.Member)
            .WithMany()
            .HasForeignKey(x => x.MemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

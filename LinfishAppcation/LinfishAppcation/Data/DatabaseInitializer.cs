using Microsoft.EntityFrameworkCore;

namespace LinfishAppcation.Data;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(
        IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // 完全沿用既有 ogcusr 的 usr_mail 與 usr_pass 欄位名稱。
        // 安全密碼雜湊長度遠超過 30 字元，因此只擴充既有欄位容量，
        // 不建立另一組 Email／密碼欄位，也不保存明碼密碼。
        await dbContext.Database.ExecuteSqlRawAsync(
            """
            -- 舊架構曾要求 ogcusr.id 必須先存在 auth.users，會阻止本站 API
            -- 直接新增會員。現行 ogcusr 是獨立會員主表，因此移除此相依性。
            alter table cmbase.ogcusr
                drop constraint if exists fk_ogcusr_auth_user;

            alter table cmbase.ogcusr
                alter column usr_mail type character varying(320);

            alter table cmbase.ogcusr
                alter column usr_pass type text;

            create unique index if not exists ux_ogcusr_usr_mail
                on cmbase.ogcusr (lower(usr_mail))
                where usr_mail is not null;

            -- 登入狀態獨立於會員主表。Refresh Token 只保存雜湊值，
            -- 登出、閒置逾時或絕對期限到達後，後端可立即撤銷 Session。
            create table if not exists cmbase.ogcsession
            (
                id uuid primary key,
                usr_id uuid not null,
                refresh_token_hash text not null,
                cre_date timestamp with time zone not null,
                last_seen_date timestamp with time zone not null,
                absolute_expires_date timestamp with time zone not null,
                revoked_date timestamp with time zone null,
                ip_address character varying(45) null,
                user_agent character varying(500) null,
                constraint fk_ogcsession_ogcusr
                    foreign key (usr_id)
                    references cmbase.ogcusr(id)
                    on delete cascade
            );

            create index if not exists ix_ogcsession_usr_id
                on cmbase.ogcsession (usr_id);

            create index if not exists ix_ogcsession_active
                on cmbase.ogcsession (absolute_expires_date)
                where revoked_date is null;

            create sequence if not exists cmbase.ogcusr_usr_no_seq;

            do $$
            declare
                max_member_no bigint;
            begin
                select coalesce(
                    max(substring(usr_no from '^LF([0-9]+)$')::bigint),
                    0
                )
                into max_member_no
                from cmbase.ogcusr;

                if max_member_no > 0 then
                    perform setval(
                        'cmbase.ogcusr_usr_no_seq',
                        max_member_no,
                        true
                    );
                else
                    perform setval(
                        'cmbase.ogcusr_usr_no_seq',
                        1,
                        false
                    );
                end if;
            end;
            $$;
            """,
            cancellationToken);
    }
}

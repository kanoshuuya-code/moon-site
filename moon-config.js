/* ═══════════════════════════════════════════════════
   TO YY · 月亮小站 —— 信箱云端同步配置

   配好之后：你写的信她能立刻看到，她写的你也能看到，
   任何手机/电脑打开网站都是同一个信箱。

   怎么填（跟着「云端同步指南.txt」做完会拿到两串东西）：
   1. url 填你的 Supabase Project URL（https:// 开头的一串）
   2. key 填 anon public key（eyJ 开头的很长一串）
   只改引号里的内容，改完保存。

   ★ 没填也不影响使用 —— 信箱会自动退回“只存在本机”模式
   ═══════════════════════════════════════════════════ */
window.MAILBOX_CLOUD = {
  url: "https://ztorjblczijtagdhhpfc.supabase.co",
  key: "sb_publishable_hYP-ZfCLQpQt6iaD_BJEKg_l7Jsee4H",
  table: "moon_letters"
};

/* ═══ 进站口令（可选） ═══
   填上后：打开网站需要先输入口令才能看到内容（只有你和她知道就行）
   留空 "" = 不启用口令，打开直接看
   想改口令：改引号里的字，保存并重新上传 index.html */
window.SITE_PASSWORD = "1026";

<#import "template.ftl" as layout>
<@layout.emailLayout
    eyebrow=msg("dicekeeperEmailVerifyEyebrow")
    title=msg("dicekeeperEmailVerifyTitle")
    intro=msg("dicekeeperEmailVerifyIntro")
    panelTitle=msg("dicekeeperEmailVerifyPanelTitle")
    buttonLabel=msg("dicekeeperEmailVerifyButton")
    link=link
    expiryText=msg("dicekeeperEmailVerifyExpiry", linkExpirationFormatter(linkExpiration))
    ignoreText=msg("dicekeeperEmailVerifyIgnore")
    footerText=msg("dicekeeperEmailFooter")
>
    <p style="margin:0 0 14px 0;">${msg("dicekeeperEmailVerifyBody")}</p>
    <p style="margin:0 0 10px 0;">${msg("dicekeeperEmailVerifyFallback")}</p>
    <p style="margin:0;">
        <a href="${link}" style="color:#86efac; text-decoration:none; word-break:break-all;">${link}</a>
    </p>
</@layout.emailLayout>

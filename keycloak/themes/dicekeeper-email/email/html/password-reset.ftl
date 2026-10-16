<#import "template.ftl" as layout>
<@layout.emailLayout
    eyebrow=msg("dicekeeperEmailPasswordResetEyebrow")
    title=msg("dicekeeperEmailPasswordResetTitle")
    intro=msg("dicekeeperEmailPasswordResetIntro")
    panelTitle=msg("dicekeeperEmailPasswordResetPanelTitle")
    buttonLabel=msg("dicekeeperEmailPasswordResetButton")
    link=link
    expiryText=msg("dicekeeperEmailPasswordResetExpiry", linkExpirationFormatter(linkExpiration))
    ignoreText=msg("dicekeeperEmailPasswordResetIgnore")
    footerText=msg("dicekeeperEmailFooter")
>
    <p style="margin:0 0 14px 0;">${msg("dicekeeperEmailPasswordResetBody", realmName)}</p>
    <p style="margin:0 0 10px 0;">${msg("dicekeeperEmailPasswordResetFallback")}</p>
    <p style="margin:0;">
        <a href="${link}" style="color:#86efac; text-decoration:none; word-break:break-all;">${link}</a>
    </p>
</@layout.emailLayout>

<#assign requiredActionsText = "">
<#if requiredActions??>
    <#list requiredActions as reqActionItem>
        <#assign requiredActionsText = requiredActionsText + msg("requiredAction.${reqActionItem}")>
        <#if reqActionItem_has_next>
            <#assign requiredActionsText = requiredActionsText + ", ">
        </#if>
    </#list>
</#if>
<#import "template.ftl" as layout>
<@layout.emailLayout
    eyebrow=msg("dicekeeperEmailActionsEyebrow")
    title=msg("dicekeeperEmailActionsTitle")
    intro=msg("dicekeeperEmailActionsIntro")
    panelTitle=msg("dicekeeperEmailActionsPanelTitle")
    buttonLabel=msg("dicekeeperEmailActionsButton")
    link=link
    expiryText=msg("dicekeeperEmailActionsExpiry", linkExpirationFormatter(linkExpiration))
    ignoreText=msg("dicekeeperEmailActionsIgnore")
    footerText=msg("dicekeeperEmailFooter")
>
    <p style="margin:0 0 14px 0;">${msg("dicekeeperEmailActionsBody", requiredActionsText)}</p>
    <p style="margin:0 0 10px 0;">${msg("dicekeeperEmailActionsFallback")}</p>
    <p style="margin:0;">
        <a href="${link}" style="color:#86efac; text-decoration:none; word-break:break-all;">${link}</a>
    </p>
</@layout.emailLayout>

<#ftl output_format="plainText">
<#assign requiredActionsText = "">
<#if requiredActions??>
    <#list requiredActions as reqActionItem>
        <#assign requiredActionsText = requiredActionsText + msg("requiredAction.${reqActionItem}")>
        <#if reqActionItem_has_next>
            <#assign requiredActionsText = requiredActionsText + ", ">
        </#if>
    </#list>
</#if>
${msg("dicekeeperEmailActionsTitle")}

${msg("dicekeeperEmailActionsIntro")}

${msg("dicekeeperEmailActionsBody", requiredActionsText)}

${msg("dicekeeperEmailActionsButton")}: ${link}

${msg("dicekeeperEmailActionsExpiry", linkExpirationFormatter(linkExpiration))}

${msg("dicekeeperEmailActionsIgnore")}

Dicekeeper - ${msg("dicekeeperEmailTagline")}

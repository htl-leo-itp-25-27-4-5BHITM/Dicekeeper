<#import "template.ftl" as layout>
<#assign appReturnUrl = properties.dicekeeperAppUrl!'https://dicekeeper.net/'>
<#if client?? && client.baseUrl?? && client.baseUrl?has_content>
    <#assign appReturnUrl = client.baseUrl>
</#if>
<#assign primaryActionUrl = appReturnUrl>
<#assign primaryActionLabel = msg("backToApplication")>
<#if !skipLink?? && pageRedirectUri?? && pageRedirectUri?has_content>
    <#assign primaryActionUrl = pageRedirectUri>
<#elseif !skipLink?? && actionUri?? && actionUri?has_content>
    <#assign primaryActionUrl = actionUri>
    <#assign primaryActionLabel = msg("proceedWithAction")>
</#if>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        <#if messageHeader??>
            ${kcSanitize(msg("${messageHeader}"))?no_esc}
        <#else>
            ${msg("dicekeeperInfoTitle")}
        </#if>
    <#elseif section = "form">
        <div class="dk-auth-copy">
            <p>${kcSanitize(message.summary)?no_esc}</p>
            <#if requiredActions??>
                <p>
                    <#list requiredActions as requiredAction>
                        ${kcSanitize(msg("requiredAction.${requiredAction}"))?no_esc}<#sep>, </#sep>
                    </#list>
                </p>
            </#if>
        </div>

        <div class="dk-auth-actions">
            <a class="dk-auth-button dk-auth-button-primary dk-auth-button-block" href="${primaryActionUrl}">${primaryActionLabel}</a>
            <#if primaryActionUrl != appReturnUrl>
                <a class="dk-auth-button dk-auth-button-secondary dk-auth-button-block" href="${appReturnUrl}">${msg("backToApplication")}</a>
            </#if>
        </div>
    </#if>
</@layout.registrationLayout>

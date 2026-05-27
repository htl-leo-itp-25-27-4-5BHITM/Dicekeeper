<#import "template.ftl" as layout>
<#assign appReturnUrl = properties.dicekeeperAppUrl!'https://dicekeeper.net/'>
<#if client?? && client.baseUrl?? && client.baseUrl?has_content>
    <#assign appReturnUrl = client.baseUrl>
</#if>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        ${msg("dicekeeperErrorTitle")}
    <#elseif section = "form">
        <div class="dk-auth-alert dk-auth-alert-error">
            ${kcSanitize(message.summary)?no_esc}
        </div>

        <div class="dk-auth-actions">
            <a class="dk-auth-button dk-auth-button-primary dk-auth-button-block" href="${appReturnUrl}">${msg("backToApplication")}</a>
        </div>
    </#if>
</@layout.registrationLayout>

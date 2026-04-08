<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        ${msg("dicekeeperErrorTitle")}
    <#elseif section = "form">
        <div class="dk-auth-alert dk-auth-alert-error">
            ${kcSanitize(message.summary)?no_esc}
        </div>

        <#if !skipLink?? && client?? && client.baseUrl?has_content>
            <div class="dk-auth-actions">
                <a class="dk-auth-button dk-auth-button-primary dk-auth-button-block" href="${client.baseUrl}">${msg("backToApplication")}</a>
            </div>
        </#if>
    </#if>
</@layout.registrationLayout>

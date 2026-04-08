<#import "template.ftl" as layout>
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

        <#if !skipLink??>
            <div class="dk-auth-actions">
                <#if pageRedirectUri?has_content>
                    <a class="dk-auth-button dk-auth-button-primary dk-auth-button-block" href="${pageRedirectUri}">${msg("backToApplication")}</a>
                <#elseif actionUri?has_content>
                    <a class="dk-auth-button dk-auth-button-primary dk-auth-button-block" href="${actionUri}">${msg("proceedWithAction")}</a>
                <#elseif client?? && client.baseUrl?has_content>
                    <a class="dk-auth-button dk-auth-button-primary dk-auth-button-block" href="${client.baseUrl}">${msg("backToApplication")}</a>
                </#if>
            </div>
        </#if>
    </#if>
</@layout.registrationLayout>

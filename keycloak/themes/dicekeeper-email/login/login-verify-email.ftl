<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=!isAppInitiatedAction??; section>
    <#if section = "header">
        ${msg("dicekeeperVerifyEmailTitle")}
    <#elseif section = "form">
        <div class="dk-auth-copy">
            <p>
                <#if verifyEmail??>
                    ${msg("emailVerifyInstruction1", verifyEmail)}
                <#else>
                    ${msg("emailVerifyInstruction4", user.email)}
                </#if>
            </p>
        </div>

        <#if isAppInitiatedAction??>
            <form class="dk-auth-form" action="${url.loginAction}" method="post">
                <div class="dk-auth-actions">
                    <#if verifyEmail??>
                        <button class="dk-auth-button dk-auth-button-secondary dk-auth-button-block" type="submit">${msg("emailVerifyResend")}</button>
                    <#else>
                        <button class="dk-auth-button dk-auth-button-primary dk-auth-button-block" type="submit">${msg("emailVerifySend")}</button>
                    </#if>
                    <button class="dk-auth-button dk-auth-button-secondary dk-auth-button-block" type="submit" name="cancel-aia" value="true" formnovalidate>${msg("doCancel")}</button>
                </div>
            </form>
        </#if>
    <#elseif section = "info">
        <p class="dk-auth-info-copy">${msg("emailVerifyInstruction2")}</p>
        <span class="dk-auth-info-inline">
            <a class="dk-auth-inline-link" href="${url.loginAction}">${msg("doClickHere")}</a>
            <span>${msg("emailVerifyInstruction3")}</span>
        </span>
    </#if>
</@layout.registrationLayout>

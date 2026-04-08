<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "header">
        ${msg("dicekeeperResetPasswordTitle")}
    <#elseif section = "form">
        <form id="kc-reset-password-form" class="dk-auth-form" action="${url.loginAction}" method="post">
            <div class="dk-auth-field">
                <label class="dk-auth-label" for="username">
                    <#if !realm.loginWithEmailAllowed>
                        ${msg("username")}
                    <#elseif !realm.registrationEmailAsUsername>
                        ${msg("usernameOrEmail")}
                    <#else>
                        ${msg("email")}
                    </#if>
                </label>
                <input
                    id="username"
                    class="dk-auth-input"
                    name="username"
                    type="text"
                    value="${(auth.attemptedUsername!'')}"
                    autocomplete="username"
                    autofocus
                    aria-invalid="<#if messagesPerField.existsError('username')>true<#else>false</#if>"
                >
                <#if messagesPerField.existsError('username')>
                    <span class="dk-auth-error" aria-live="polite">${kcSanitize(messagesPerField.getFirstError('username'))?no_esc}</span>
                </#if>
            </div>

            <div class="dk-auth-actions">
                <button class="dk-auth-button dk-auth-button-primary dk-auth-button-block" type="submit">${msg("doSubmit")}</button>
            </div>
        </form>
    <#elseif section = "info">
        <p class="dk-auth-info-copy">
            <#if realm.duplicateEmailsAllowed>
                ${msg("emailInstructionUsername")}
            <#else>
                ${msg("emailInstruction")}
            </#if>
        </p>
        <a class="dk-auth-inline-link" href="${url.loginUrl}">${msg("backToLogin")}</a>
    </#if>
</@layout.registrationLayout>

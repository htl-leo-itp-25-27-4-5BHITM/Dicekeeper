<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        ${msg("dicekeeperLoginTitle")}
    <#elseif section = "form">
        <#if realm.password>
            <form id="kc-form-login" class="dk-auth-form" action="${url.loginAction}" method="post">
                <#if !usernameHidden??>
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
                            value="${(login.username!'')}"
                            autocomplete="username"
                            autofocus
                            dir="ltr"
                            aria-invalid="<#if messagesPerField.existsError('username','password')>true<#else>false</#if>"
                        >
                        <#if messagesPerField.existsError('username','password')>
                            <span class="dk-auth-error" aria-live="polite">${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}</span>
                        </#if>
                    </div>
                <#else>
                    <div class="dk-auth-username-card">
                        <span class="dk-auth-username-label">${msg("username")}</span>
                        <strong>${auth.attemptedUsername}</strong>
                    </div>
                </#if>

                <div class="dk-auth-field">
                    <label class="dk-auth-label" for="password">${msg("password")}</label>
                    <input
                        id="password"
                        class="dk-auth-input"
                        name="password"
                        type="password"
                        autocomplete="current-password"
                        dir="ltr"
                        aria-invalid="<#if messagesPerField.existsError('username','password')>true<#else>false</#if>"
                    >
                    <#if usernameHidden?? && messagesPerField.existsError('username','password')>
                        <span class="dk-auth-error" aria-live="polite">${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}</span>
                    </#if>
                </div>

                <div class="dk-auth-utility-row">
                    <#if realm.rememberMe && !usernameHidden??>
                        <label class="dk-auth-checkbox">
                            <input id="rememberMe" name="rememberMe" type="checkbox" <#if login.rememberMe??>checked</#if>>
                            <span>${msg("rememberMe")}</span>
                        </label>
                    </#if>

                    <#if realm.resetPasswordAllowed>
                        <a class="dk-auth-inline-link" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
                    </#if>
                </div>

                <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth?has_content && auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>>

                <div class="dk-auth-actions">
                    <button class="dk-auth-button dk-auth-button-primary dk-auth-button-block" id="kc-login" name="login" type="submit">
                        ${msg("doLogIn")}
                    </button>
                </div>
            </form>
        </#if>
    <#elseif section = "socialProviders">
        <div class="dk-auth-social-list">
            <#list social.providers as provider>
                <a class="dk-auth-social-link" id="social-${provider.alias}" href="${provider.loginUrl}">
                    <span class="dk-auth-social-name">${kcSanitize(provider.displayName)?no_esc}</span>
                </a>
            </#list>
        </div>
    <#elseif section = "info">
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <span>${msg("noAccount")}</span>
            <a class="dk-auth-inline-link" href="${url.registrationUrl}">${msg("doRegister")}</a>
        </#if>
    </#if>
</@layout.registrationLayout>

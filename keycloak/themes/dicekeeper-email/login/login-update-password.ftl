<#import "template.ftl" as layout>
<#import "password-commons.ftl" as passwordCommons>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('password','password-confirm'); section>
    <#if section = "header">
        ${msg("dicekeeperUpdatePasswordTitle")}
    <#elseif section = "form">
        <form id="kc-passwd-update-form" class="dk-auth-form" action="${url.loginAction}" method="post">
            <div class="dk-auth-field">
                <label class="dk-auth-label" for="password-new">${msg("passwordNew")}</label>
                <input
                    id="password-new"
                    class="dk-auth-input"
                    name="password-new"
                    type="password"
                    autocomplete="new-password"
                    autofocus
                    aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true<#else>false</#if>"
                >
                <#if messagesPerField.existsError('password')>
                    <span class="dk-auth-error" aria-live="polite">${kcSanitize(messagesPerField.getFirstError('password'))?no_esc}</span>
                </#if>
            </div>

            <div class="dk-auth-field">
                <label class="dk-auth-label" for="password-confirm">${msg("passwordConfirm")}</label>
                <input
                    id="password-confirm"
                    class="dk-auth-input"
                    name="password-confirm"
                    type="password"
                    autocomplete="new-password"
                    aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true<#else>false</#if>"
                >
                <#if messagesPerField.existsError('password-confirm')>
                    <span class="dk-auth-error" aria-live="polite">${kcSanitize(messagesPerField.getFirstError('password-confirm'))?no_esc}</span>
                </#if>
            </div>

            <@passwordCommons.logoutOtherSessions/>

            <div class="dk-auth-actions">
                <button class="dk-auth-button dk-auth-button-primary dk-auth-button-block" name="login" type="submit">${msg("doSubmit")}</button>
                <#if isAppInitiatedAction??>
                    <button class="dk-auth-button dk-auth-button-secondary dk-auth-button-block" type="submit" name="cancel-aia" value="true">${msg("doCancel")}</button>
                </#if>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>

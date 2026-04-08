<#import "template.ftl" as layout>
<#import "user-profile-commons.ftl" as userProfileCommons>
<#import "register-commons.ftl" as registerCommons>
<@layout.registrationLayout displayMessage=messagesPerField.exists('global') displayRequiredFields=true displayInfo=true; section>
    <#if section = "header">
        <#if messageHeader??>
            ${kcSanitize(msg("${messageHeader}"))?no_esc}
        <#else>
            ${msg("dicekeeperRegisterTitle")}
        </#if>
    <#elseif section = "form">
        <form id="kc-register-form" class="dk-auth-form" action="${url.registrationAction}" method="post">
            <@userProfileCommons.userProfileFormFields; callback, attribute>
                <#if callback = "afterField">
                    <#if passwordRequired?? && (attribute.name == "username" || (attribute.name == "email" && realm.registrationEmailAsUsername))>
                        <div class="dk-auth-field">
                            <label class="dk-auth-label" for="password">${msg("password")}</label>
                            <input
                                id="password"
                                class="dk-auth-input"
                                name="password"
                                type="password"
                                autocomplete="new-password"
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
                    </#if>
                </#if>
            </@userProfileCommons.userProfileFormFields>

            <@registerCommons.termsAcceptance/>

            <#if recaptchaRequired?? && (recaptchaVisible!false)>
                <div class="dk-auth-field">
                    <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}" data-action="${recaptchaAction}"></div>
                </div>
            </#if>

            <#if recaptchaRequired?? && !(recaptchaVisible!false)>
                <script>
                    function onSubmitRecaptcha(token) {
                        document.getElementById("kc-register-form").requestSubmit();
                    }
                </script>
                <div class="dk-auth-actions">
                    <button
                        class="dk-auth-button dk-auth-button-primary dk-auth-button-block g-recaptcha"
                        data-sitekey="${recaptchaSiteKey}"
                        data-callback="onSubmitRecaptcha"
                        data-action="${recaptchaAction}"
                        type="submit"
                    >
                        ${msg("doRegister")}
                    </button>
                </div>
            <#else>
                <div class="dk-auth-actions">
                    <button class="dk-auth-button dk-auth-button-primary dk-auth-button-block" type="submit">${msg("doRegister")}</button>
                </div>
            </#if>
        </form>
    <#elseif section = "info">
        <a class="dk-auth-inline-link" href="${url.loginUrl}">${msg("backToLogin")}</a>
    </#if>
</@layout.registrationLayout>

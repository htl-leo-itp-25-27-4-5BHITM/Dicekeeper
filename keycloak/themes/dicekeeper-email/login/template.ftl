<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<#assign currentLanguageTag = "en">
<#assign textDirection = "ltr">
<#assign supportedLocales = []>
<#if locale??>
    <#if locale.currentLanguageTag?? && locale.currentLanguageTag?has_content>
        <#assign currentLanguageTag = locale.currentLanguageTag>
    </#if>
    <#if locale.rtl?? && locale.rtl>
        <#assign textDirection = "rtl">
    </#if>
    <#if locale.supported??>
        <#assign supportedLocales = locale.supported>
    </#if>
</#if>
<#assign realmName = "Dicekeeper">
<#if realm?? && realm.displayName?? && realm.displayName?has_content>
    <#assign realmName = realm.displayName>
</#if>
<!DOCTYPE html>
<html lang="${currentLanguageTag}" dir="${textDirection}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <#assign metaParts = meta?split('==')>
            <meta name="${metaParts[0]}" content="${metaParts[1]}">
        </#list>
    </#if>
    <title>${msg("loginTitle", realmName)}</title>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet">
        </#list>
    </#if>
</head>
<body class="dk-auth-page ${bodyClass}">
<div class="dk-auth-shell">
    <aside class="dk-auth-showcase">
        <div class="dk-auth-showcase-inner">
            <p class="dk-auth-eyebrow">${msg("dicekeeperLoginEyebrow")}</p>
            <div class="dk-auth-brand">
                <div class="dk-auth-badge">D20</div>
                <div>
                    <div class="dk-auth-brand-name">Dicekeeper</div>
                    <div class="dk-auth-brand-tagline">${msg("dicekeeperLoginTagline")}</div>
                </div>
            </div>
            <h1 class="dk-auth-showcase-title">${msg("dicekeeperLoginShowcaseTitle")}</h1>
            <p class="dk-auth-showcase-body">${msg("dicekeeperLoginShowcaseBody")}</p>
            <div class="dk-auth-feature-list">
                <div class="dk-auth-feature">
                    <h2>${msg("dicekeeperLoginFeatureCampaigns")}</h2>
                    <p>${msg("dicekeeperLoginFeatureCampaignsBody")}</p>
                </div>
                <div class="dk-auth-feature">
                    <h2>${msg("dicekeeperLoginFeatureCharacters")}</h2>
                    <p>${msg("dicekeeperLoginFeatureCharactersBody")}</p>
                </div>
                <div class="dk-auth-feature">
                    <h2>${msg("dicekeeperLoginFeatureTable")}</h2>
                    <p>${msg("dicekeeperLoginFeatureTableBody")}</p>
                </div>
            </div>
        </div>
    </aside>

    <main class="dk-auth-card-wrapper">
        <section class="dk-auth-card">
            <#if realm.internationalizationEnabled && supportedLocales?size gt 1>
                <div class="dk-auth-locale">
                    <#list supportedLocales as supportedLocale>
                        <a href="${supportedLocale.url}" class="<#if supportedLocale.languageTag = currentLanguageTag>is-active</#if>">${supportedLocale.label}</a>
                    </#list>
                </div>
            </#if>

            <#if auth?has_content && auth.showUsername() && !auth.showResetCredentials()>
                <div class="dk-auth-user-chip">
                    <span>${auth.attemptedUsername}</span>
                    <a href="${url.loginRestartFlowUrl}" title="${msg("restartLoginTooltip")}">${msg("restartLoginTooltip")}</a>
                </div>
            </#if>

            <div class="dk-auth-card-header">
                <#if displayRequiredFields>
                    <div class="dk-auth-required">${msg("requiredFields")}</div>
                </#if>
                <h2 class="dk-auth-page-title"><#nested "header"></h2>
                <p class="dk-auth-page-copy">${msg("dicekeeperLoginCardIntro")}</p>
            </div>

            <#if displayMessage && message?has_content && (message.type != "warning" || !isAppInitiatedAction??)>
                <div class="dk-auth-alert dk-auth-alert-${message.type}">
                    ${kcSanitize(message.summary)?no_esc}
                </div>
            </#if>

            <div class="dk-auth-card-body">
                <#nested "form">
            </div>

            <#if social?? && social.providers?? && social.providers?has_content>
                <div class="dk-auth-divider"></div>
                <section class="dk-auth-social-section">
                    <h3>${msg("dicekeeperLoginSocialTitle")}</h3>
                    <#nested "socialProviders">
                </section>
            </#if>

            <#if displayInfo>
                <div class="dk-auth-divider"></div>
                <div class="dk-auth-info">
                    <#nested "info">
                </div>
            </#if>
        </section>

        <p class="dk-auth-footer">${msg("dicekeeperLoginFooter")}</p>
    </main>
</div>
</body>
</html>
</#macro>

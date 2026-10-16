<#ftl output_format="plainText">
${msg("dicekeeperEmailPasswordResetTitle")}

${msg("dicekeeperEmailPasswordResetIntro")}

${msg("dicekeeperEmailPasswordResetBody", realmName)}

${msg("dicekeeperEmailPasswordResetButton")}: ${link}

${msg("dicekeeperEmailPasswordResetExpiry", linkExpirationFormatter(linkExpiration))}

${msg("dicekeeperEmailPasswordResetFallback")}
${link}

${msg("dicekeeperEmailPasswordResetIgnore")}

Dicekeeper - ${msg("dicekeeperEmailTagline")}

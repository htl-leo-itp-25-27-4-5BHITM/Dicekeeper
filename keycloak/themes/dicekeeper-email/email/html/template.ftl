<#macro emailLayout eyebrow title intro panelTitle buttonLabel link expiryText ignoreText footerText>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dicekeeper</title>
</head>
<body style="margin:0; padding:0; background-color:#05150f; font-family:Segoe UI, Arial, Helvetica, sans-serif; color:#e8f5e9;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#05150f;">
    <tr>
        <td align="center" style="padding:32px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px; width:100%;">
                <tr>
                    <td align="center" style="padding:0 0 24px 0;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td align="center" valign="middle" style="width:72px; height:72px; border-radius:18px; border:1px solid #34d399; background:linear-gradient(135deg, #0d9668 0%, #34d399 100%); font-size:26px; font-weight:800; color:#06281d; letter-spacing:1px;">
                                    D20
                                </td>
                            </tr>
                        </table>
                        <div style="padding-top:18px; font-size:34px; font-weight:800; line-height:1; color:#dffcf0;">
                            Dicekeeper
                        </div>
                        <div style="padding-top:8px; font-size:13px; line-height:1.4; letter-spacing:0.6px; text-transform:uppercase; color:#86efac;">
                            ${msg("dicekeeperEmailTagline")}
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#0d231a; border:1px solid #173b2d; border-radius:24px;">
                            <tr>
                                <td style="padding:32px 36px 0 36px; font-size:12px; line-height:1.4; letter-spacing:1.4px; text-transform:uppercase; color:#86efac; font-weight:700;">
                                    ${eyebrow}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:14px 36px 0 36px; font-size:38px; line-height:1.08; font-weight:800; color:#ffffff;">
                                    ${title}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:18px 36px 0 36px; font-size:16px; line-height:1.75; color:#b6c9c0;">
                                    ${intro}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:28px 36px 0 36px;">
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td align="center" bgcolor="#34d399" style="border-radius:14px;">
                                                <a href="${link}" style="display:inline-block; padding:16px 26px; font-size:15px; font-weight:700; line-height:1; color:#06281d; text-decoration:none; border-radius:14px;">
                                                    ${buttonLabel}
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:24px 36px 0 36px;">
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#102b20; border:1px solid #1b4634; border-radius:18px;">
                                        <tr>
                                            <td style="padding:20px 22px 8px 22px; font-size:12px; line-height:1.4; letter-spacing:1.2px; text-transform:uppercase; color:#7ee3b5; font-weight:700;">
                                                ${panelTitle}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:0 22px 22px 22px; font-size:14px; line-height:1.7; color:#cfe5da;">
                                                <#nested>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:22px 36px 0 36px; font-size:13px; line-height:1.7; color:#88a79a;">
                                    ${expiryText}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:12px 36px 0 36px; font-size:13px; line-height:1.7; color:#88a79a;">
                                    ${ignoreText}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:24px 36px 32px 36px; font-size:13px; line-height:1.7; color:#6d8a7f; border-top:1px solid #173b2d;">
                                    ${footerText}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
</#macro>

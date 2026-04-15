package tool;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@ApplicationScoped
public class ImagorUrlSigner {

    @ConfigProperty(name = "imagor.secret")
    String secret;

    @ConfigProperty(name = "imagor.base-path", defaultValue = "/imagor")
    String imagorBasePath;

    @ConfigProperty(name = "imagor.signer-type", defaultValue = "sha256")
    String signerType;

    @ConfigProperty(name = "imagor.signer-truncate", defaultValue = "40")
    int signerTruncate;

    public boolean isConfigured() {
        return secret != null && !secret.isBlank();
    }

    public String buildSignedUrl(String path) {
        if (!isConfigured()) {
            throw new IllegalStateException("imagor.secret is not configured");
        }

        String signature = sign(path, secret);
        String basePath = imagorBasePath.endsWith("/")
                ? imagorBasePath.substring(0, imagorBasePath.length() - 1)
                : imagorBasePath;

        return basePath + "/" + signature + "/" + path;
    }

    private String sign(String path, String secret) {
        try {
            String algorithm = switch (signerType.toLowerCase()) {
                case "sha1" -> "HmacSHA1";
                case "sha512" -> "HmacSHA512";
                default -> "HmacSHA256";
            };

            Mac mac = Mac.getInstance(algorithm);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), algorithm));

            String hash = Base64.getEncoder()
                    .encodeToString(mac.doFinal(path.getBytes(StandardCharsets.UTF_8)));

            if (signerTruncate > 0 && hash.length() > signerTruncate) {
                hash = hash.substring(0, signerTruncate);
            }

            return hash.replace('+', '-').replace('/', '_');
        } catch (Exception exception) {
            throw new IllegalStateException("Could not sign imagor path", exception);
        }
    }
}

package tool;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Resolves public upload paths ("/uploads/maps/file.png") to files on disk.
 *
 * <p>Only paths the server itself generates are accepted: a known sub folder followed by a
 * single plain file name. Anything else (traversal, absolute paths, other folders) is rejected,
 * so a stored path can never make the server touch a file outside its own upload folder.</p>
 */
public final class UploadPaths {

    public static final String PROFILES = "profiles";
    public static final String MAPS = "maps";

    private static final Pattern FILE_NAME = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,200}");

    private UploadPaths() {
    }

    public static String publicPath(String subfolder, String fileName) {
        return "/uploads/" + subfolder + "/" + fileName;
    }

    public static boolean isManagedPath(String publicPath, String subfolder) {
        if (publicPath == null) return false;
        String prefix = "/uploads/" + subfolder + "/";
        if (!publicPath.startsWith(prefix)) return false;
        String fileName = publicPath.substring(prefix.length());
        return FILE_NAME.matcher(fileName).matches() && !fileName.contains("..");
    }

    public static Optional<Path> resolveManagedFile(String uploadDir, String publicPath, String subfolder) {
        if (!isManagedPath(publicPath, subfolder)) return Optional.empty();
        Path folder = Paths.get(uploadDir, subfolder).toAbsolutePath().normalize();
        Path file = folder.resolve(publicPath.substring(("/uploads/" + subfolder + "/").length())).normalize();
        if (!file.getParent().equals(folder)) return Optional.empty();
        return Optional.of(file);
    }
}

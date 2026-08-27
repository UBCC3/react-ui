import java.lang.reflect.Array;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.jmol.api.JmolCallbackListener;
import org.jmol.api.JmolViewer;
import org.jmol.c.CBK;

/** Headless integration check for the orbital viewer's Jmol scripts. */
public final class JmolArtifactVerifier {
  private static final class LoadListener implements JmolCallbackListener {
    private int successfulLoads;
    private int failedLoads;

    @Override
    public void setCallbackFunction(String callbackType, String callbackFunction) {}

    @Override
    public boolean notifyEnabled(CBK type) {
      return type == CBK.LOADSTRUCT;
    }

    @Override
    public void notifyCallback(CBK type, Object[] data) {
      if (type != CBK.LOADSTRUCT || data.length <= 5) return;
      int status = ((Number) data[5]).intValue();
      if (status == 3) successfulLoads++;
      if (status == -1) failedLoads++;
    }
  }

  private static int collectionSize(Object value) {
    if (value instanceof List<?>) return ((List<?>) value).size();
    return value != null && value.getClass().isArray() ? Array.getLength(value) : 0;
  }

  private static void require(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }

  private static void requireSuccessfulScript(String phase, String result) {
    require(
        result != null
            && !result.contains("script ERROR")
            && !result.contains("terminated unsuccessfully"),
        phase + " failed: " + result);
  }

  public static void main(String[] args) throws Exception {
    require(args.length == 2, "usage: JmolArtifactVerifier <molden> <esp-cube>");

    String molden = Files.readString(Path.of(args[0]));
    String esp = Files.readString(Path.of(args[1]));
    String loadScript =
        "load DATA \"model molden\"\n"
            + molden
            + "\nend \"model molden\" FILTER \"*\";\n"
            + "set appendNew true;\n"
            + "load DATA \"append esp\"\n"
            + esp
            + "\nend \"append esp\";";

    JmolViewer viewer = JmolViewer.allocateViewer(null, null);
    LoadListener loadListener = new LoadListener();
    viewer.setJmolCallbackListener(loadListener);
    try {
      viewer.setScreenDimension(600, 600);
      requireSuccessfulScript("inline Molden/ESP load", viewer.scriptWait(loadScript));
      require(loadListener.failedLoads == 0, "Jmol reported a failed model load");
      require(
          loadListener.successfulLoads == 2,
          "expected two successful loadStruct callbacks, got " + loadListener.successfulLoads);

      Map<?, ?> auxiliaryInfo =
          (Map<?, ?>) viewer.getProperty("Java", "auxiliaryInfo", null);
      List<?> models = (List<?>) auxiliaryInfo.get("models");
      require(models != null && models.size() == 2, "expected exactly two loaded models");

      Map<?, ?> moldenModel = (Map<?, ?>) models.get(0);
      Map<?, ?> moData = (Map<?, ?>) moldenModel.get("moData");
      int orbitalCount = moData == null ? 0 : collectionSize(moData.get("mos"));
      require(orbitalCount > 0, "Molden model did not expose molecular orbitals");

      requireSuccessfulScript("MO surface", viewer.scriptWait("frame 1; mo 1;"));
      requireSuccessfulScript(
          "MEP surface",
          viewer.scriptWait("frame 2; isosurface resolution 6 molecular map mep;"));
      requireSuccessfulScript(
          "partial-charge calculation",
          viewer.scriptWait("frame 2; calculate PARTIALCHARGE;"));

      List<?> atoms = (List<?>) viewer.getProperty("Java", "atomInfo", null);
      require(atoms != null && !atoms.isEmpty(), "partial-charge calculation returned no atoms");
      for (Object value : atoms) {
        Object charge = ((Map<?, ?>) value).get("partialCharge");
        require(
            charge instanceof Number && Double.isFinite(((Number) charge).doubleValue()),
            "atom did not expose a finite partial charge");
      }

      System.out.println(
          "PASS: received 2 load callbacks, loaded 2 models and "
              + orbitalCount
              + " orbitals; MO, MEP, and "
              + atoms.size()
              + " partial charges succeeded.");
    } finally {
      viewer.dispose();
    }
  }
}

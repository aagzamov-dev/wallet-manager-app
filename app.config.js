const ARM64_TARGET = "arm64-v8a";

module.exports = ({ config }) => {
  const isArm64Build = process.env.ANDROID_BUILD_TARGET === ARM64_TARGET;
  const plugins = (config.plugins ?? []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== "expo-build-properties";
  });

  return {
    ...config,
    plugins: [
      ...plugins,
      [
        "expo-build-properties",
        {
          android: {
            ...(isArm64Build ? { buildArchs: [ARM64_TARGET] } : {}),
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],
    ],
  };
};

function isPrivateDevelopmentHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

export function getMobileCheckoutServerOrigin(requestUrl: string, configuredSiteUrl: string) {
  const requestOrigin = new URL(requestUrl);
  const configuredOrigin = new URL(configuredSiteUrl);

  if (
    isPrivateDevelopmentHost(configuredOrigin.hostname) &&
    isPrivateDevelopmentHost(requestOrigin.hostname)
  ) {
    return requestOrigin.origin;
  }

  return configuredOrigin.origin;
}

export function getSafeMobileReturnUrl(value: unknown) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (["exp:", "exps:", "harmonylab:"].includes(url.protocol)) {
      return url;
    }

    if (["http:", "https:"].includes(url.protocol)) {
      const configuredOrigin = process.env.MOBILE_APP_URL
        ? new URL(process.env.MOBILE_APP_URL).origin
        : null;

      if (isPrivateDevelopmentHost(url.hostname) || url.origin === configuredOrigin) {
        return url;
      }
    }
  } catch {
    return null;
  }

  return null;
}

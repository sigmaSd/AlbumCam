import { Link } from "expo-router";
import { type ComponentProps } from "react";
import { Linking, Platform } from "react-native";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (Platform.OS !== "web") {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();
          // Open the link in the system browser.
          await Linking.openURL(href);
        }
      }}
    />
  );
}

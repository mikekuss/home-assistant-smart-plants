// The Smart Plants icon for the sidebar: a sprout with a star, drawn as one
// path on Home Assistant's 24 px icon grid, so it takes the sidebar's colour
// like the Material Design icons next to it. The star is cut out of the leaf
// with a small gap, so the path needs no mask. Home Assistant asks
// window.customIcons for icons with a prefix other than mdi, and the panel is
// registered with SIDEBAR_ICON.
export const ICON_PREFIX = "smart-plants";
export const ICON_NAME = "logo";
export const SIDEBAR_ICON = `${ICON_PREFIX}:${ICON_NAME}`;
export const LOGO_PATH =
  "M7.77 22.18C7.84 20.62 7.91 19.18 7.96 17.67C4.59 17.12 2.48 14.76 2.4 11.34C6.71 11.78 8.65 13.89 8.83 16.54"
  + "L8.83 15.83C8.83 12.54 11.17 9.74 15.55 8.96Q15.87 9.45 16.04 10.08C15.54 14.01 13.29 16.54 9.67 17.14"
  + "C9.73 18.85 9.81 20.44 9.89 22.18ZM17.2 2C17.53 4.86 18.74 6.07 21.6 6.41C18.74 6.74 17.53 7.95 17.2 10.81"
  + "C16.87 7.95 15.66 6.74 12.79 6.41C15.66 6.07 16.87 4.86 17.2 2Z";

interface CustomIcon { path: string; viewBox?: string }
interface CustomIconSet { getIcon(name: string): Promise<CustomIcon> }
type IconWindow = { customIcons?: Record<string, CustomIconSet> };

// Adds the icon set unless another copy of this module did so already. Home
// Assistant keeps an existing window.customIcons when its app starts.
export function registerSidebarIcon(target: IconWindow = window as unknown as IconWindow): void {
  const sets = (target.customIcons ??= {});
  if (sets[ICON_PREFIX]) return;
  sets[ICON_PREFIX] = {
    getIcon: async (name: string) => (name === ICON_NAME ? { path: LOGO_PATH, viewBox: "0 0 24 24" } : { path: "" }),
  };
}

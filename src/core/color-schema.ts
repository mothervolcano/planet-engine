export interface ColorSchema {
  /** Lowest visible substrate — bare rock, dominant cloud deck, molten surface */
  base: string;
  /** Outermost layer — cloud deck, atmospheric haze */
  cloud?: string;
  /** Unlit hemisphere — night side color (may glow for lava worlds / hot Jupiters) */
  nightside: string;
  /** Limb scattering — rim light and atmospheric edge glow */
  atmosphere: string;
  /** Content colors — bands, regions, terrain types, tholins */
  palette: string[];
  /** Bright anomalous features — storms, specular glint, cloud streaks */
  highlight?: string;
  /** Thermal emission color — for bodies that glow with their own heat */
  thermal?: string;
  /** Host star illumination tint — modifies how all other colors read */
  starlight?: string;
}

export const silicate: ColorSchema = {
  base: '#ABB8BE',
  nightside: '#7E8F98',
  atmosphere: '#BCCBD1',
  palette: [],
  highlight: '#ffffff',
};

export const sulfur: ColorSchema = {
  base: '#E4C576',
  nightside: '#B58E74',
  atmosphere: '#F2E09C',
  palette: ['#EF767A', '#C16200', '#C8553D', '#E2E4F6'],
  highlight: '#ffffff',
};

export const copper: ColorSchema = {
  base: '#EAA76B',
  nightside: '#563339',
  atmosphere: '#ECCFCB',
  palette: [],
  highlight: '#ffffff',
};

export const malachite: ColorSchema = {
  base: '#489A8F',
  nightside: '#354B4E',
  atmosphere: '#42AFB7',
  palette: [],
  highlight: '#ffffff',
};

export const schemes = {
  silicate,
  sulfur,
  copper,
  malachite,
} as const satisfies Record<string, ColorSchema>;

export type SchemeId = keyof typeof schemes;

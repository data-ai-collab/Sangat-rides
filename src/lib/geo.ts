// Approximate suburb centres for south-west Sydney, used to find pickups on a driver's way.
// Distances are straight-line estimates scaled for roads, not navigation.

export const TEMPLE: [number, number] = [-33.944, 151.013]; // 14–22 The River Rd, Revesby

export const SUBURBS: Record<string, [number, number]> = {
  Auburn: [-33.849, 151.033], Bangor: [-34.017, 151.031], Bankstown: [-33.918, 151.034],
  "Bass Hill": [-33.9, 150.993], Belmore: [-33.917, 151.088], "Beverly Hills": [-33.948, 151.081],
  Birrong: [-33.892, 151.022], Blacktown: [-33.771, 150.906], Bonnyrigg: [-33.893, 150.889],
  Cabramatta: [-33.894, 150.937], Campbelltown: [-34.065, 150.814], Campsie: [-33.912, 151.103],
  "Canley Vale": [-33.886, 150.944], Casula: [-33.95, 150.905], "Chester Hill": [-33.882, 150.996],
  "Chipping Norton": [-33.917, 150.957], "Condell Park": [-33.925, 151.012], "East Hills": [-33.962, 150.988],
  "Edensor Park": [-33.879, 150.876], "Edmondson Park": [-33.958, 150.856], Fairfield: [-33.872, 150.956],
  "Georges Hall": [-33.913, 150.987], Glenwood: [-33.734, 150.925], Granville: [-33.833, 151.012],
  "Green Valley": [-33.903, 150.867], Greenacre: [-33.902, 151.057], Hammondville: [-33.948, 150.952],
  Holsworthy: [-33.955, 150.95], "Hoxton Park": [-33.931, 150.855], Hurstville: [-33.967, 151.102],
  Illawong: [-33.999, 151.04], Ingleburn: [-33.998, 150.865], Kingsgrove: [-33.94, 151.1],
  Lakemba: [-33.919, 151.076], Lansdowne: [-33.895, 150.975], Leppington: [-33.954, 150.81],
  Lidcombe: [-33.864, 151.047], Liverpool: [-33.92, 150.924], Lugarno: [-33.982, 151.045],
  Lurnea: [-33.932, 150.896], Menai: [-34.013, 151.013], Merrylands: [-33.836, 150.991],
  Milperra: [-33.938, 150.986], Minto: [-34.028, 150.845], Moorebank: [-33.94, 150.955],
  Mortdale: [-33.969, 151.08], Narwee: [-33.946, 151.069], Oatley: [-33.98, 151.077],
  Padstow: [-33.952, 151.032], "Padstow Heights": [-33.969, 151.033], Panania: [-33.954, 150.997],
  Parramatta: [-33.815, 151.003], Peakhurst: [-33.959, 151.064], Penshurst: [-33.964, 151.087],
  "Picnic Point": [-33.973, 150.998], Prestons: [-33.943, 150.873], Punchbowl: [-33.928, 151.054],
  Revesby: [-33.952, 151.017], "Revesby Heights": [-33.968, 151.017], Riverwood: [-33.95, 151.052],
  Sefton: [-33.887, 151.01], Strathfield: [-33.873, 151.094], Sutherland: [-34.031, 151.058],
  Villawood: [-33.885, 150.975], "Warwick Farm": [-33.913, 150.937], "Wattle Grove": [-33.961, 150.937],
  Yagoona: [-33.905, 151.025],
};

export const SUBURB_NAMES = Object.keys(SUBURBS).sort();

function km(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(b[0] - a[0]);
  const dLng = r(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Extra kilometres a driver adds by collecting this rider on the way to (or dropping them on the way
 * home from) the Gurdwara: (driver -> rider -> temple) minus (driver -> temple), scaled by 1.3 for roads.
 * Returns null if either suburb is unknown.
 */
export function detourKm(driverSuburb?: string | null, riderSuburb?: string | null): number | null {
  const d = driverSuburb ? SUBURBS[driverSuburb] : undefined;
  const p = riderSuburb ? SUBURBS[riderSuburb] : undefined;
  if (!d || !p) return null;
  return Math.max(0, (km(d, p) + km(p, TEMPLE) - km(d, TEMPLE)) * 1.3);
}

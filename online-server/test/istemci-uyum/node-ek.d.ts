// İstemci uyum testinin kullandığı node:module parçasının elle yazılmış tipi (@types/node kurulmaz).
declare module "node:module" {
  export function createRequire(yol: string): (ad: string) => unknown;
}

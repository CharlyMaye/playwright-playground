import { Type } from './type';

/**
 * Extrait les noms des paramètres du constructeur d'une classe
 * @param constructor La classe dont extraire les paramètres
 * @returns Un tableau des noms de paramètres
 */
export function getConstructorParameterNames<T>(constructor: Type<T>): string[] {
  const constructorString = constructor.toString();

  // Vérifier si la classe a un constructeur explicite
  const hasExplicitConstructor = constructorString.includes('constructor');

  // Si pas de constructeur explicite, retourner un tableau vide
  if (!hasExplicitConstructor) {
    return [];
  }

  // Regex pour extraire les paramètres du constructeur
  const constructorMatch = constructorString.match(/constructor\s*\((.*?)\)/);
  if (!constructorMatch || !constructorMatch[1]) {
    return [];
  }

  const parametersString = constructorMatch[1];

  // Séparer les paramètres et extraire les noms
  const parameters = parametersString
    .split(',')
    .map((param) => param.trim())
    .filter((param) => param.length > 0)
    // Ignorer les paramètres rest (...args)
    .filter((param) => !param.startsWith('...'))
    .map((param) => {
      // Extraire le nom du paramètre (avant le ':' si typé TypeScript)
      const paramMatch = param.match(/(?:public|private|protected)?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      return paramMatch ? paramMatch[1] : '';
    })
    .filter((name) => name.length > 0);

  return parameters;
}

/**
 * Convertit un nom camelCase en PascalCase
 * @param camelCase Le nom en camelCase (ex: fakeService)
 * @returns Le nom en PascalCase (ex: FakeService)
 */
export function camelToPascalCase(camelCase: string): string {
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

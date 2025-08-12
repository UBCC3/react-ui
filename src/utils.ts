import {ComplexNumber} from "./types";

export const capitalizeFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


export const formatComplex = (c: ComplexNumber) =>  {
  const { real, imag } = c;

  if (real === 0 && imag === 0) { return "0"; }
  if (imag === 0) { return `${real.toFixed(2)}`; }
  if (real === 0) { return `${imag.toFixed(2)}i`; }

  const sign = imag >= 0 ? "+" : "-";
  return `${real.toFixed(2)} ${sign} ${Math.abs(imag).toFixed(2)}i`;
}

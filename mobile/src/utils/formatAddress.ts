type AddressLike =
  | string
  | null
  | undefined
  | {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      line1?: string;
      formatted?: string;
    };

/** Normalize profile address objects for display and search queries. */
export function formatUserLocation(
  address?: AddressLike,
  city?: string | null,
  state?: string | null
): string {
  const parts: string[] = [];
  if (city?.trim()) parts.push(city.trim());
  if (state?.trim()) parts.push(state.trim());

  if (typeof address === 'string' && address.trim()) {
    return address.trim();
  }

  if (address && typeof address === 'object') {
    if (address.formatted?.trim()) return address.formatted.trim();
    const street = address.street || address.line1;
    if (street?.trim()) parts.unshift(street.trim());
    if (address.city?.trim() && !parts.includes(address.city.trim())) {
      parts.unshift(address.city.trim());
    }
    if (address.state?.trim() && !parts.includes(address.state.trim())) {
      parts.push(address.state.trim());
    }
    if (address.zipCode?.trim()) parts.push(address.zipCode.trim());
  }

  const joined = parts.filter(Boolean).join(', ');
  return joined || 'Your area';
}

export function formatUserZip(address?: AddressLike): string {
  if (typeof address === 'object' && address?.zipCode?.trim()) {
    return address.zipCode.trim();
  }
  return '';
}

export function formatUserSearchQuery(
  address?: AddressLike,
  city?: string | null
): string {
  const zip = formatUserZip(address);
  if (zip) return zip;
  const location = formatUserLocation(address, city);
  return location === 'Your area' ? '' : location;
}

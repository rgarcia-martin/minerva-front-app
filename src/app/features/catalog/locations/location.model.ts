export interface Location {
  id: string;
  name: string;
  description: string | null;
}

export interface LocationRequest {
  name: string;
  description: string | null;
}

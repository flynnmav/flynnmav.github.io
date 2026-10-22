export interface Publication {
  title: string;
  authors: string[];
  venue: string;
  year: number;
  doi?: string;
  pdf?: string;
  github?: string;
  abstract: string;
}
export const publications: Publication[] = [];

export type GenreBucket =
  | "Fantasy"
  | "Adventure"
  | "Mystery"
  | "Science Fiction"
  | "Historical Fiction"
  | "Fairy Tales"
  | "Humor"
  | "Picture Books"
  | "Animals"
  | "Friendship"
  | "Family"
  | "School"
  | "Sports"
  | "Horror"
  | "Graphic Novels"
  | "Poetry"
  | "Magic"
  | "Dragons"
  | "Space"
  | "Superheroes";

export interface Book {
  workKey: string;
  title: string;
  authorNames: string;
  firstPublishYear: number | null;
  genreBucket: GenreBucket;
  subjectsRaw: string;
  description: string;
  coverId: number | null;
  editionCount: number | null;
  ratingsAverage: number | null;
  ratingsCount: number | null;
  wantToReadCount: number | null;
  alreadyReadCount: number | null;
  openLibraryUrl: string;
}

export type DatasetStatus = "loading" | "ready" | "error";


export type Movie = {
    movieId: number;
    genre_ids: number[];
    original_language : string;
    overview: string;
    popularity: number;
    release_date: string;
    title: string
    video: boolean;
    vote_average: number;
    vote_count: number
  }

  export type MovieCast = {
    movieId: number;
    actorName: string;
    roleName: string;
    roleDescription: string;
  };
  // Used to validate the query string og HTTP Get requests
  export type MovieCastMemberQueryParams = {
    movieId: string;
    actorName?: string;
    roleName?: string
  }

  export type Review = {
    reviewId: string; // id for the review
    movieId: number; // ID of the movie that the review is for
    //userId: string; // 
    userName: string; // Name of the user who wrote the review
    rating: number; // Rating given by the user
    reviewText: string; //review text
    year: string; // the year of when the review was written
  };
  

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
    movieId: number; // ID of the movie that the review is for
    reviewer: string; // Name of the user who wrote the review
    rating: number; // Rating given by the user
    reviewText: string; //review text
    reviewDate: string; // the date of when the review was written
  };
  
  
export type SignUpBody = {
  username: string;
  password: string;
  email: string
}

export type ConfirmSignUpBody = {
  username: string;
  code: string;
}

export type SignInBody = {
  username: string;
  password: string;
}
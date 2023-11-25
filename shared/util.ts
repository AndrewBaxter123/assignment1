import { marshall } from "@aws-sdk/util-dynamodb";
import { Movie, MovieCast, Review } from "./types";

type Entity = Movie | MovieCast;  // NEW
export const generateItem = (entity: Entity) => {
  return {
    PutRequest: {
      Item: marshall(entity),
    },
  };
};

export const generateBatch = (data: Entity[]) => {
  return data.map((e) => {
    return generateItem(e);
  });
};

export const validateMovieId = (movieId: number): boolean => {
  return typeof movieId === 'number' && movieId > 0;
};

// exluding spaces because I was struggling to return a reviewer with a space
export const validateReviewer = (reviewer: string): boolean => {
  return typeof reviewer === 'string' && !reviewer.includes(' ');
};

export const validateRating = (rating: number): boolean => {
  return typeof rating === 'number' && rating >= 1 && rating <= 10;
};

export const validateReviewText = (reviewText: string): boolean => {
  return typeof reviewText === 'string' && reviewText.length > 20;
};

export const validateReviewDate = (reviewDate: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(reviewDate);
};
//needed for year to work
export const validateYear = (year: string): boolean => {
  return /^\d{4}$/.test(year);
};

//making it easier to validate addReview
export const validateReview = (review: Review): boolean => {
  return validateMovieId(review.movieId) &&
         validateReviewer(review.reviewer) &&
         validateRating(review.rating) &&
         validateReviewText(review.reviewText) &&
         validateReviewDate(review.reviewDate);
};


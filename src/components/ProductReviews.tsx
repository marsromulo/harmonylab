import Image from "next/image";

type Review = {
  name: string;
  rating: number;
  avatar: string;
  review: string;
};

const reviewsByProductSlug: Record<string, Review[]> = {
  "retinol-serum": [
    {
      name: "Emily T.",
      rating: 4.5,
      avatar: "/reviewers/emily-tan.webp",
      review: "The formula feels gentle and fits easily into my evening routine. My skin looks smoother and more refreshed in the morning.",
    },
  ],
  "niacinamide-serum": [
    {
      name: "Lea S.",
      rating: 5,
      avatar: "/reviewers/lea-santos.webp",
      review: "It feels lightweight and layers beautifully with my other skincare. My complexion looks calmer and more balanced.",
    },
  ],
  "vitamin-c-serum": [
    {
      name: "Maya C.",
      rating: 5,
      avatar: "/reviewers/maya-chen.webp",
      review: "My skin feels softer and looks noticeably brighter after adding this serum to my morning routine. It absorbs quickly without feeling sticky.",
    },
  ],
  "organic-sunscreen-spf-50-pa": [
    {
      name: "Priya S.",
      rating: 5,
      avatar: "/reviewers/priya-shah.webp",
      review: "The lightweight finish blends smoothly and gives my skin a naturally even look. It stays comfortable throughout the day without feeling heavy.",
    },
    {
      name: "Maya C.",
      rating: 5,
      avatar: "/reviewers/maya-chen.webp",
      review: "I love having sun protection and light coverage in one step. The finish looks fresh and works well for everyday wear.",
    },
    {
      name: "Lea S.",
      rating: 5,
      avatar: "/reviewers/lea-santos.webp",
      review: "It spreads easily and leaves my complexion looking smooth and polished. I especially like that it feels more like skincare than foundation.",
    },
  ],
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="review-rating" aria-label={`${rating} out of 5 stars`} role="img">
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, rating - index));

        return (
          <span className="review-star" aria-hidden="true" key={index}>
            <span className="review-star-empty">★</span>
            <span className="review-star-fill" style={{ width: `${fill * 100}%` }}>
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function ProductReviews({ productSlug }: { productSlug: string }) {
  const reviews = reviewsByProductSlug[productSlug] ?? [];

  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className="product-reviews" aria-labelledby="sample-reviews-heading">
      <div className="product-reviews-heading">
        <div>
          <p className="eyebrow">SHARED EXPERIENCES</p>
          <h2 id="sample-reviews-heading">Customer Reviews</h2>
        </div>
        <p className="product-reviews-disclosure">Illustrative review content</p>
      </div>

      <div className="product-review-grid">
        {reviews.map((review) => (
          <article className="product-review-card" key={review.name}>
            <div className="product-review-author">
              <Image className="product-review-avatar" src={review.avatar} alt="" width={56} height={56} />
              <div>
                <h3>{review.name}</h3>
                <StarRating rating={review.rating} />
              </div>
            </div>
            <p>{review.review}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
